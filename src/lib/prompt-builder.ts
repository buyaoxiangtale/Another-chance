/**
 * Prompt 构建升级 — Cluster 5
 *
 * 顺序：系统指令 → 故事元信息 → 角色状态 → 活跃事件 → 分支记忆 →
 *        前文上下文 → 世界观 → 事实锚点 → 导演覆盖 → 节奏 → 记忆提醒 → 续写指令
 *
 * 5.1 使用 ContextSummarizer 替代原始 chain 拼接
 * 5.2 集成 EventTracker — 活跃事件和近期事件摘要
 * 5.3 集成 BranchMemory — 分支记忆
 * 5.4 Token 预算管理 — 自动分配各段 token
 * 5.5 "记忆提醒"指令 — 提醒AI注意活跃事件/悬念/角色状态
 * 5.6 优化 prompt 结构顺序
 */

import { characterManager } from './character-engine';
import { timelineEngine, buildTimelinePrompt } from './timeline-engine';
import { lorebook } from './lorebook';
import { enrichPromptWithFacts } from './knowledge-cache';
import { directorManager } from './director-manager';
import { PacingEngine } from './pacing-engine';
import { contextSummarizer, estimateTokens } from './context-summarizer';
import { EventTracker, buildEventPrompt } from './event-tracker';
import { branchMemory } from './branch-memory';
import type { PacingConfig, DirectorState, StorySegment } from '@/types/story';
import { storiesStore, getOrderedChain } from './simple-db';

export interface BuildPromptOptions {
  storyId: string;
  branchId: string;
  tailSegment: StorySegment;
  chain: StorySegment[];
  storyTitle: string;
  storyDescription?: string;
  pacingConfig?: PacingConfig;
  directorOverrides?: Partial<DirectorState>;
  /** Total token budget for the context (default 6000) */
  tokenBudget?: number;
}

/** Fixed-size token allocations (approximate) */
const FIXED_TOKENS = {
  systemInstruction: 80,
  storyMeta: 150,
  pacingInstruction: 120,
  memoryReminder: 200,
  continuationInstruction: 80,
};
const TOTAL_FIXED = Object.values(FIXED_TOKENS).reduce((a, b) => a + b, 0);

/**
 * 5.4 Token 预算管理
 * 根据模型上下文窗口自动分配各段 token
 */
function allocateTokenBudget(totalBudget: number) {
  const available = totalBudget - TOTAL_FIXED;
  // Dynamic allocation ratios
  const ratios = {
    characterContext: 0.15,
    eventTracking: 0.15,
    branchMemory: 0.10,
    contextHistory: 0.40,
    worldAndFacts: 0.20,
  };

  const budgets: Record<string, number> = {};
  let allocated = 0;
  for (const [key, ratio] of Object.entries(ratios)) {
    budgets[key] = Math.floor(available * ratio);
    allocated += budgets[key];
  }
  // Give remainder to contextHistory
  budgets.contextHistory += available - allocated;

  return budgets;
}

/**
 * 5.5 构建"记忆提醒"指令
 */
function buildMemoryReminderPrompt(
  activeEventCount: number,
  hasBranchMemory: boolean,
  characterCount: number,
): string {
  const lines: string[] = [];
  lines.push('## 写作注意事项');

  const reminders: string[] = [];
  if (activeEventCount > 0) {
    reminders.push(`当前有 ${activeEventCount} 条活跃事件线，续写时请注意推进或回应这些情节`);
  }
  if (hasBranchMemory) {
    reminders.push('本故事存在多条分支，请保持当前分支的叙事独立性，不要混淆其他分支的情节');
  }
  reminders.push(`当前涉及 ${characterCount} 个角色，请保持角色性格、关系和状态的连贯性`);
  reminders.push('续写内容不得与已建立的剧情事实产生矛盾');

  lines.push(...reminders.map(r => `- ${r}`));
  return lines.join('\n');
}

/**
 * 构建完整的 AI prompt
 *
 * 5.6 优化结构顺序：
 * 系统指令 → 故事元信息 → 角色状态 → 活跃事件 → 分支记忆 →
 * 前文上下文 → 世界观 → 事实锚点 → 导演覆盖 → 节奏 → 记忆提醒 → 续写指令
 */
export async function buildFullPrompt(options: BuildPromptOptions): Promise<string> {
  const {
    storyId, branchId, tailSegment, chain,
    storyTitle, storyDescription,
    pacingConfig, directorOverrides,
    tokenBudget = 6000,
  } = options;

  const budgets = allocateTokenBudget(tokenBudget);
  const parts: string[] = [];

  // ─── 1. 系统指令 (fixed) ───
  parts.push('你是一位精通中国历史的文学作家，擅长古典文学风格的写作。请用中文回答，保持与前文的风格和情节连续性。');

  // ─── 2. 故事元信息 (fixed) ───
  const metaLines = [`故事标题：${storyTitle}`];
  if (storyDescription) metaLines.push(`故事背景：${storyDescription || ''}`);
  parts.push(metaLines.join('\n'));

  // ─── 3. 角色状态 (dynamic budget) ───
  const story = (await storiesStore.load()).find((s: any) => s.id === storyId);
  const characterIds: string[] = (story as any)?.characterIds || [];
  const activeCharIds = new Set<string>();
  for (const seg of chain) {
    if ((seg as any).characterIds) {
      (seg as any).characterIds.forEach((id: string) => activeCharIds.add(id));
    }
  }
  const allCharIds = [...new Set([...characterIds, ...activeCharIds])];
  const charPrompt = await characterManager.buildCharacterPrompt(allCharIds);
  if (charPrompt) {
    parts.push(charPrompt);
  }

  // ─── 4. 活跃事件 (5.2) (dynamic budget) ───
  let activeEventsCount = 0;
  try {
const eventTracker = new EventTracker();
    const activeEvents = await eventTracker.getActiveEvents(storyId, branchId, tailSegment.id);
    const recentEvents = await eventTracker.getResolvedEvents(storyId, branchId, tailSegment.id);
    activeEventsCount = activeEvents.length;
    const eventPrompt = buildEventPrompt(activeEvents, recentEvents);
    if (eventPrompt.trim()) {
      parts.push(eventPrompt);
    }
  } catch {
    // Events store may not exist yet for new stories; skip gracefully
  }

  // ─── 5. 分支记忆 (5.3) (dynamic budget) ───
  let hasBranchMemory = false;
  try {
    const branchPrompt = await branchMemory.buildBranchMemoryPrompt(storyId, branchId);
    if (branchPrompt.trim()) {
      hasBranchMemory = true;
      parts.push(branchPrompt);
    }
  } catch {
    // No branches yet; skip gracefully
  }

  // ─── 6. 前文上下文 (5.1 — ContextSummarizer) (dynamic budget) ───
  let contextText: string;
  if (chain.length > 0) {
    try {
      contextText = await contextSummarizer.getContextForPrompt(chain, budgets.contextHistory);
    } catch {
      // Fallback to simple concatenation if summarizer fails
      contextText = chain.map(s =>
        `${s.title ? `【${s.title}】` : ''}${s.content}`
      ).join('\n');
    }
  } else {
    contextText = '';
  }
  if (contextText.trim()) {
    parts.push(`## 当前故事进展\n${contextText}`);
  }

  // ─── 7. 世界观 — 时间轴 + Lorebook (dynamic budget) ───
  try {
    const timeline = await timelineEngine.getTimeline(storyId, branchId);
    const era = (story as any)?.era;
    const loreEntries = era ? await lorebook.getEntries(era) : await lorebook.getAll();
    const timelinePrompt = buildTimelinePrompt(timeline, loreEntries);
    if (timelinePrompt.trim()) {
      parts.push(timelinePrompt);
    }
  } catch {
    // skip
  }

  // ─── 8. 导演覆盖 ───
  try {
    let directorText = '';
    if (directorOverrides) {
      const dm = await directorManager.getOrCreate(storyId);
      if (directorOverrides.characterStates) {
        dm.characterStates = { ...dm.characterStates, ...directorOverrides.characterStates };
      }
      if (directorOverrides.worldVariables) {
        dm.worldVariables = { ...dm.worldVariables, ...directorOverrides.worldVariables };
      }
      if (directorOverrides.activeConstraints) {
        dm.activeConstraints = directorOverrides.activeConstraints;
      }
      directorText = await directorManager.buildDirectorPrompt(storyId);
    } else {
      directorText = await directorManager.buildDirectorPrompt(storyId);
    }
    if (directorText) {
      parts.push(directorText);
    }
  } catch {
    // skip
  }

  // ─── 9. 节奏控制 (fixed) ───
  if (pacingConfig) {
    const pacingEngine = new PacingEngine(pacingConfig);
    parts.push(pacingEngine.buildPacingInstruction());
  }

  // ─── 10. 记忆提醒 (5.5) (fixed) ───
  parts.push(buildMemoryReminderPrompt(activeEventsCount, hasBranchMemory, allCharIds.length));

  // ─── 11. 续写指令 (fixed) ───
  const wordHint = pacingConfig
    ? new PacingEngine(pacingConfig).getWordInstruction()
    : '请续写下一段（150-300字）';
  parts.push(`${wordHint}，保持古典文学风格，与前文情节连续。`);

  // ─── Assemble & enrich with facts ───
  const fullPrompt = parts.join('\n\n');

  const entities: Array<{ name: string; type: string }> = [];
  if (story && (story as any).characterIds) {
    for (const cid of (story as any).characterIds) {
      const c = await characterManager.getById(cid);
      if (c) entities.push({ name: c.name, type: 'person' });
    }
  }

  const enriched = await enrichPromptWithFacts(fullPrompt, entities);
  return enriched;
}
