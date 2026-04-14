/**
 * 5.8 集成 prompt 构建 — 角色+时间轴+Lorebook+维基事实+导演覆盖+节奏控制
 */

import { characterManager } from './character-engine';
import { timelineEngine, buildTimelinePrompt } from './timeline-engine';
import { lorebook } from './lorebook';
import { enrichPromptWithFacts } from './knowledge-cache';
import { directorManager } from './director-manager';
import { PacingEngine } from './pacing-engine';
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
}

/**
 * 构建完整的 AI prompt
 * 顺序：系统指令 → 角色上下文 → 时间轴+世界观 → 维基事实锚点 → 导演覆盖 → 节奏控制 → 前文摘要 → 续写指令
 */
export async function buildFullPrompt(options: BuildPromptOptions): Promise<string> {
  const {
    storyId, branchId, tailSegment, chain,
    storyTitle, storyDescription,
    pacingConfig, directorOverrides,
  } = options;

  const parts: string[] = [];

  // 1. 系统指令
  parts.push('你是一位精通中国历史的文学作家，擅长古典文学风格的写作。请用中文回答，保持与前文的风格和情节连续性。');

  // 2. 角色上下文
  const story = (await storiesStore.load()).find((s: any) => s.id === storyId);
  const characterIds: string[] = (story as any)?.characterIds || [];
  const activeCharIds = new Set<string>();
  for (const seg of chain) {
    if ((seg as any).characterIds) {
      (seg as any).characterIds.forEach((id: string) => activeCharIds.add(id));
    }
  }
  const charPrompt = await characterManager.buildCharacterPrompt(
    [...new Set([...characterIds, ...activeCharIds])]
  );
  if (charPrompt) {
    parts.push(charPrompt);
  }

  // 3. 时间轴 + Lorebook 世界观
  const timeline = await timelineEngine.getTimeline(storyId, branchId);
  const era = (story as any)?.era;
  const loreEntries = era ? await lorebook.getEntries(era) : await lorebook.getAll();
  const timelinePrompt = buildTimelinePrompt(timeline, loreEntries);
  if (timelinePrompt.trim()) {
    parts.push(timelinePrompt);
  }

  // 4. 导演覆盖（directorOverrides 优先于持久化状态）
  let directorText = '';
  if (directorOverrides) {
    const dm = await directorManager.getOrCreate(storyId);
    // Apply overrides to state temporarily
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

  // 5. 节奏控制
  if (pacingConfig) {
    const pacingEngine = new PacingEngine(pacingConfig);
    parts.push(pacingEngine.buildPacingInstruction());
  }

  // 6. 前文摘要
  const contextSummary = chain.map(s =>
    `${s.title ? `【${s.title}】` : ''}${s.content}`
  ).join('\n');

  // 7. 续写指令
  const wordHint = pacingConfig
    ? new PacingEngine(pacingConfig).getWordInstruction()
    : '请续写下一段（150-300字）';

  const prompt = `故事标题：${storyTitle}
故事背景：${storyDescription || ''}

当前故事进展：
${contextSummary}

${wordHint}，保持古典文学风格，与前文情节连续。`;

  parts.push(prompt);

  // 8. 维基事实锚点（enrich 整个 prompt）
  const fullPrompt = parts.join('\n\n');

  // Extract entity names for fact enrichment
  const entities: Array<{ name: string; type: string }> = [];
  // Extract character names
  if (story && (story as any).characterIds) {
    for (const cid of (story as any).characterIds) {
      const c = await characterManager.getById(cid);
      if (c) entities.push({ name: c.name, type: 'person' });
    }
  }

  const enriched = await enrichPromptWithFacts(fullPrompt, entities);
  return enriched;
}
