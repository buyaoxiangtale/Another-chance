/**
 * Prompt 构建
 *
 * 顺序：系统指令 → 故事元信息 → 风格锚点 → 角色状态 → 活跃事件 → 分支记忆 →
 *      导演覆盖 → 前文上下文 → 世界观 → 事实锚点 → 节奏 → 记忆提醒 → 续写指令
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
import { storiesStore } from './simple-db';
import { summariesStore } from './simple-db';
import { INFER_PATTERNS, FICTION_KEYWORDS } from './genre-config';

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

const FIXED_TOKENS = {
  systemInstruction: 80,
  storyMeta: 150,
  styleAnchor: 250,
  pacingInstruction: 120,
  memoryReminder: 120,
  continuationInstruction: 100,
};
const TOTAL_FIXED = Object.values(FIXED_TOKENS).reduce((a, b) => a + b, 0);

/**
 * 动态 token 预算：根据实际可用数据分配，空段不占配额
 */
function allocateTokenBudget(
  totalBudget: number,
  flags: { hasCharacters: boolean; hasEvents: boolean; hasBranchMemory: boolean; hasWorld: boolean },
) {
  const available = totalBudget - TOTAL_FIXED;
  const weights: Record<string, number> = {
    characterContext: flags.hasCharacters ? 0.15 : 0,
    eventTracking:    flags.hasEvents     ? 0.15 : 0,
    branchMemory:     flags.hasBranchMemory ? 0.10 : 0,
    worldAndFacts:    flags.hasWorld      ? 0.20 : 0,
    contextHistory:   0.40,
  };
  const weightSum = Object.values(weights).reduce((a, b) => a + b, 0) || 1;

  const budgets: Record<string, number> = {};
  let allocated = 0;
  for (const [key, w] of Object.entries(weights)) {
    budgets[key] = Math.floor((available * w) / weightSum);
    allocated += budgets[key];
  }
  budgets.contextHistory += available - allocated;
  return budgets;
}

/**
 * 记忆提醒：3-5 条硬约束 + 未闭合悬念（正向）
 */
function buildMemoryReminderPrompt(
  isFiction: boolean,
  foreshadowingList: string[],
): string {
  const rules: string[] = [
    '与前文已建立的时间、季节、地点、人物关系保持一致',
    '已死亡或离场的角色不得再次出场',
    '角色性格、动机、口癖与前文保持一致',
  ];
  rules.push(isFiction ? '遵守原著或故事设定，不得与已建立世界观矛盾' : '不得出现与正史或已写情节矛盾的事实');

  const lines: string[] = [];
  lines.push('## 硬约束');
  lines.push(...rules.map(r => `- ${r}`));

  if (foreshadowingList.length > 0) {
    lines.push('');
    lines.push('## 请在本段推进或回应以下悬念');
    lines.push(...foreshadowingList.slice(0, 5).map(f => `- ${f}`));
  }

  return lines.join('\n');
}

/**
 * 风格锚点：用第一段开头 200 字作为文体参照，比抽象指令有效
 */
function buildStyleAnchor(chain: StorySegment[]): string {
  if (chain.length === 0) return '';
  const first = chain[0];
  if (!first.content) return '';
  const excerpt = first.content.slice(0, 200).trim();
  if (!excerpt) return '';
  return `## 风格参照（请严格对齐以下文体与语感）\n${excerpt}`;
}

export async function buildFullPrompt(options: BuildPromptOptions): Promise<string> {
  const {
    storyId, branchId, tailSegment, chain,
    storyTitle, storyDescription,
    pacingConfig, directorOverrides,
    tokenBudget = 6000,
  } = options;

  const parts: string[] = [];
  const _fandomForbiddenItems: string[] = [];

  const story = (await storiesStore.load()).find((s: any) => s.id === storyId);
  const rawGenre = (story as any)?.genre || '';
  const description = (story as any)?.description || storyDescription || '';

  // 从 description 自动推断 genre（如果用户没填）
  // INFER_PATTERNS 已集中管理在 genre-config.ts

  let inferredGenre = '';
  if (!rawGenre) {
    for (const [genre, keywords] of Object.entries(INFER_PATTERNS)) {
      if (keywords.some(k => description.includes(k))) {
        inferredGenre = genre;
        break;
      }
    }
  }
  const effectiveGenre = rawGenre || inferredGenre;
  const isFiction = FICTION_KEYWORDS.some(k => effectiveGenre.includes(k));

  // ─── 诊断日志：Genre 分类决策 ───
  console.log('\n' + '-'.repeat(60));
  console.log('\x1b[33m[prompt-builder]\x1b[0m Genre 分类决策流程');
  console.log(`  Step 1 rawGenre:      "\x1b[31m${rawGenre}\x1b[0m"`);
  console.log(`  Step 2 inferredGenre:  "\x1b[32m${inferredGenre}\x1b[0m"${inferredGenre ? ` (从description匹配)` : ' (未匹配任何模式)'}`);
  console.log(`  Step 3 effectiveGenre: "\x1b[36m${effectiveGenre || '(空)'}\x1b[0m"`);
  console.log(`  Step 4 isFiction:      \x1b[${isFiction ? '32' : '31'}m${isFiction}\x1b[0m`);
  console.log(`  description 前80字:    "${description.slice(0, 80)}"`);
  console.log('-'.repeat(60));

  // 根据 effectiveGenre 选择风格指令
  let styleInstruction: string;
  if (effectiveGenre === '科幻' || effectiveGenre === '末世') {
    styleInstruction = '你是一位擅长科幻题材的文学作家。请用现代白话文写作，语言流畅生动，注重科学逻辑和想象力。保持与前文的风格和情节连续性。';
  } else if (effectiveGenre === '悬疑') {
    styleInstruction = '你是一位擅长悬疑推理题材的文学作家。请用现代白话文写作，语言流畅生动，注重悬念和逻辑推理。保持与前文的风格和情节连续性。';
  } else if (effectiveGenre === '都市' || effectiveGenre === '现代') {
    styleInstruction = '你是一位擅长现代都市题材的文学作家。请用现代白话文写作，语言流畅生动，贴近当代生活。保持与前文的风格和情节连续性。';
  } else if (isFiction) {
    styleInstruction = '你是一位擅长虚构文学的文学作家。请用现代白话文写作，语言流畅生动，可适度使用古风词汇增加氛围感。保持与前文的风格和情节连续性。';
  } else {
    styleInstruction = '你是一位精通中国历史的文学作家，擅长古典文学风格的写作。请用半文半白的古风文体写作，保持与前文的风格和情节连续性。';
  }
  console.log(`  \x1b[35m→ 风格指令:\x1b[0m ${styleInstruction}`);
  parts.push(styleInstruction);

  if (inferredGenre && !rawGenre) {
    parts.push(`【重要】本作品类型为"${inferredGenre}"，请严格遵循故事描述中的世界观设定，不要将其与真实历史混淆。`);
  }

  // ─── 1.5 风格覆盖指令：当虚构类型的前文却用了古风文体时，强制覆盖 ───
  if (isFiction && effectiveGenre !== '武侠' && effectiveGenre !== '仙侠' && effectiveGenre !== '玄幻') {
    // 检测前文是否用了古风文体（抽样最近 2 段）
    const recentText = chain.slice(-2).map(s => s.content).join('');
    const gufengSignals = ['之', '其', '乃', '遂', '亦', '且', '皆', '此', '故', '然', '矣', '焉', '乎', '尔', '者'];
    const gufengCount = gufengSignals.filter(ch => recentText.includes(ch)).length;
    const isGufeng = gufengCount >= 5;

    if (isGufeng) {
      console.log(`  \x1b[35m→ 前文古风检测:\x1b[0m 检测到 ${gufengCount}/15 古风信号词，注入风格覆盖指令`);
      parts.push(
        `【风格覆盖指令 — 最高优先级】\n` +
        `本作品属于"${effectiveGenre || '虚构'}"类型，必须使用现代白话文写作。\n` +
        `前文因历史原因可能使用了古风半文半白的文体（如"之""其""乃""遂"等文言虚词），` +
        `你必须立即停止模仿前文的古风风格，改用现代白话文续写。\n` +
        `禁止使用文言虚词和古风句式。请用现代汉语的正常表达方式来叙述。`
      );
    }
  }

  // ─── 2. 故事元信息 (fixed) ───
  const metaLines = [`故事标题：${storyTitle}`];
  if (storyDescription) metaLines.push(`故事背景：${storyDescription}`);
  parts.push(metaLines.join('\n'));

  // ─── 3. 风格锚点（少样本） ───
  const styleAnchor = buildStyleAnchor(chain);
  if (styleAnchor) parts.push(styleAnchor);

  // 先计算动态预算所需标记
  const characterIds: string[] = (story as any)?.characterIds || [];
  const activeCharIds = new Set<string>();
  for (const seg of chain) {
    if ((seg as any).characterIds) {
      (seg as any).characterIds.forEach((id: string) => activeCharIds.add(id));
    }
  }
  const allCharIds = [...new Set([...characterIds, ...activeCharIds])];

  // 预查：有无各类可用数据（用于动态预算分配）
  const hasCharacters = allCharIds.length > 0;

  let hasEvents = false;
  let eventPrompt = '';
  try {
    const eventTracker = new EventTracker();
    const activeEvents = await eventTracker.getActiveEvents(storyId, branchId, tailSegment.id);
    const recentEvents = await eventTracker.getResolvedEvents(storyId, branchId, tailSegment.id);
    eventPrompt = buildEventPrompt(activeEvents, recentEvents);
    hasEvents = eventPrompt.trim().length > 0;
  } catch {}

  let hasBranchMemory = false;
  let branchPrompt = '';
  try {
    branchPrompt = await branchMemory.buildBranchMemoryPrompt(storyId, branchId);
    hasBranchMemory = branchPrompt.trim().length > 0;
  } catch {}

  // 世界观暂按"总有"处理（大多数故事都有时间轴或 lorebook 条目）
  const budgets = allocateTokenBudget(tokenBudget, {
    hasCharacters, hasEvents, hasBranchMemory, hasWorld: true,
  });

  // ─── 4. 角色状态 ───
  if (hasCharacters) {
    const charPrompt = await characterManager.buildCharacterPrompt(allCharIds);
    if (charPrompt) parts.push(charPrompt);
  }

  // ─── 5. 活跃事件 ───
  if (hasEvents) parts.push(eventPrompt);

  // ─── 6. 分支记忆 ───
  if (hasBranchMemory) parts.push(branchPrompt);

  // ─── 7. 导演覆盖（提前到前文之前，用户意图优先级） ───
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
    if (directorText) parts.push(directorText);
  } catch {}

  // ─── 8. 前文上下文 ───
  let contextText = '';
  if (chain.length > 0) {
    try {
      contextText = await contextSummarizer.getContextForPrompt(chain, budgets.contextHistory);
    } catch {
      contextText = chain.map(s =>
        `${s.title ? `【${s.title}】` : ''}${s.content}`
      ).join('\n');
    }
  }
  if (contextText.trim()) {
    parts.push(`## 当前故事进展\n${contextText}`);
  }

  // ─── 9. 事实锚点 ───
  try {
    const entities: Array<{ name: string; type: string }> = [];
    if (story && (story as any).characterIds) {
      for (const cid of (story as any).characterIds) {
        const c = await characterManager.getById(cid);
        if (c) entities.push({ name: c.name, type: 'person' });
      }
    }

    if (entities.length > 0) {
      const facts = await enrichPromptWithFacts('', entities, { genre: effectiveGenre, era: (story as any)?.era });
      if (facts && facts.includes('--- 历史事实参考 ---')) {
        const factBlock = facts.split('--- 历史事实参考 ---')[1].split('--- 参考结束 ---')[0];
        if (factBlock.trim()) parts.push(`## 历史事实参考\n${factBlock.trim()}`);
      }
    }
  } catch {}

  // ─── 10. 世界观 ───
  try {
    const timeline = await timelineEngine.getTimeline(storyId, branchId);
    let timelinePrompt = '';
    if (!isFiction) {
      const era = (story as any)?.era;
      const loreEntries = era ? await lorebook.getEntries(era) : await lorebook.getAll();
      timelinePrompt = buildTimelinePrompt(timeline, loreEntries);
    } else if (timeline.length > 0) {
      timelinePrompt = '## 时间线\n' + timeline.map(e => {
        const season = e.season ? `·${e.season}` : '';
        return `- ${e.description}${season}`;
      }).join('\n');
    }
    if (timelinePrompt.trim()) parts.push(timelinePrompt);

    if (isFiction) {
      try {
        const { fandomLorebook } = await import('./fandom-lorebook');
        const storyDesc = (story as any)?.description || storyDescription || '';
        const { entries } = await fandomLorebook.matchFandom(storyDesc, effectiveGenre);
        if (entries.length > 0) {
          const fandomPrompt = fandomLorebook.buildFandomPrompt(entries);
          if (fandomPrompt.trim()) parts.push(fandomPrompt);
          const forbiddenEntries = entries.filter((e: any) => e.topic === '禁止事项');
          for (const fe of forbiddenEntries) {
            const matches = fe.content.match(/【[^】]+】[^。\n]+[。\n]/g);
            if (matches) {
              _fandomForbiddenItems.push(...matches.slice(0, 5).map((m: string) => m.trim()));
            }
          }
        }
      } catch {}
    }
  } catch {}

  // ─── 11. 节奏 ───
  if (pacingConfig) {
    const pacingEngine = new PacingEngine(pacingConfig);
    parts.push(pacingEngine.buildPacingInstruction());
  }

  // ─── 12. 记忆提醒（简化） ───
  // 从缓存摘要提取未闭合悬念
  let foreshadowingList: string[] = [];
  try {
    const all = await summariesStore.load();
    const recentSummaries = all
      .filter((s: any) => s.storyId === storyId && s.branchId === branchId)
      .slice(-5);
    for (const summary of recentSummaries) {
      if (summary.foreshadowing && Array.isArray(summary.foreshadowing)) {
        foreshadowingList.push(...summary.foreshadowing);
      }
    }
    foreshadowingList = [...new Set(foreshadowingList)];
  } catch {}

  parts.push(buildMemoryReminderPrompt(isFiction, foreshadowingList));

  // ─── 13. 续写指令 ───
  const wordHint = pacingConfig
    ? new PacingEngine(pacingConfig).getWordInstruction()
    : '请续写下一段（150-300字）';
  const styleHint = isFiction
    ? '，使用现代白话文'
    : '，保持古典文学风格';
  parts.push(`${wordHint}${styleHint}，与前文情节连续。`);

  // ─── Assemble prompt ───
  const fullPrompt = parts.join('\n\n');

  // ─── 诊断日志：最终 prompt 预览 ───
  console.log('\n' + '-'.repeat(60));
  console.log('\x1b[33m[prompt-builder]\x1b[0m 最终 Prompt 预览 (前300字):');
  console.log('\x1b[90m' + fullPrompt.slice(0, 300) + '\x1b[0m');
  console.log(`  总长度: ${fullPrompt.length} 字符`);
  console.log('-'.repeat(60) + '\n');

  return fullPrompt;
}
