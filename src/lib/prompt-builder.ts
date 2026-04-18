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

  // 从 description 推断 genre
  const INFER_PATTERNS: Record<string, string[]> = {
    '同人': ['火影', '鸣人', '佐助', '带土', '卡卡西', '写轮眼', '查克拉', '木叶', '轮回眼',
            '海贼', '路飞', '恶魔果实', '七武海',
            '龙珠', '悟空', '贝吉塔', '超级赛亚人',
            '死神', '一护', '斩魄刀', '护廷十三队',
            '柯南', '灰原', '小兰', '毛利',
            '哈利', '波特', '霍格沃茨', '伏地魔',
            '漫威', '钢铁侠', '蜘蛛侠', '复仇者',
            'DC', '蝙蝠侠', '超人', '正义联盟',
            '原神', '钟离', '雷电', '旅行者', '提瓦特'],
    '玄幻': ['修仙', '修真', '灵力', '灵气', '元婴', '金丹', '飞升', '天劫', '仙尊', '魔尊', '剑修', '丹药'],
    '仙侠': ['剑仙', '仙人', '天庭', '妖魔', '渡劫', '法宝', '符箓'],
    '穿越': ['重生', '穿越', '回到', '前世', '来世', '回到过去', '穿越回'],
    '武侠': ['武功', '内力', '轻功', '江湖', '侠客', '门派', '武功秘籍', '掌门'],
    '架空': ['架空', '异世界', '平行世界', '位面', '另一个世界'],
  };

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
  const fictionKeywords = ['演义', '架空', '同人', '玄幻', '仙侠', '魔幻', '穿越', '重生', '武侠', '奇幻', '轻小说', '网文'];
  const isFiction = fictionKeywords.some(k => effectiveGenre.includes(k));

  // ─── 1. 系统指令 ───
  const styleInstruction = isFiction
    ? `你是一位擅长历史题材的文学作家。请用现代白话文写作，语言流畅生动，可适度使用古风词汇增加氛围感。保持与前文的风格和情节连续性。`
    : '你是一位精通中国历史的文学作家，擅长古典文学风格的写作。请用半文半白的古风文体写作，保持与前文的风格和情节连续性。';
  parts.push(styleInstruction);

  if (inferredGenre && !rawGenre) {
    parts.push(`【重要】本作品类型为"${inferredGenre}"，请严格遵循故事描述中的世界观设定，不要将其与真实历史混淆。`);
  }

  // ─── 2. 故事元信息 ───
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
  const styleHint = isFiction ? '' : '，保持古典文学风格';
  parts.push(
    `${wordHint}${styleHint}。请从上一段结尾的场景、情绪、位置自然衔接，不要重新介绍已出场的角色或已交代的背景。`,
  );

  return parts.join('\n\n');
}
