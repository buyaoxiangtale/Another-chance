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
import { contextSummarizer, estimateTokens, callAI } from './context-summarizer';
import { EventTracker, buildEventPrompt } from './event-tracker';
import { branchMemory } from './branch-memory';
import type { PacingConfig, DirectorState, StorySegment } from '@/types/story';
import { storiesStore, getOrderedChain } from './simple-db';
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
 * 3.2 从前文段落中提取关键实体（人名、地名、器物名）
 */
async function extractKeyEntitiesFromRecentContext(chain: StorySegment[], maxTokens: number = 1500): Promise<string[]> {
  if (chain.length === 0) return [];

  // 提取最近 2 个段落的完整文本
  const recentSegments = chain.slice(-2);
  const recentText = recentSegments.map(s => s.content).join('\n\n');
  
  // 使用正则表达式匹配专有名词模式
  const patterns = [
    // 中文人名：2-4字，常见姓氏开头
    /(?<=[^a-zA-Z0-9\u4e00-\u9fff])[李王张刘陈杨赵黄周吴徐孙朱马胡郭林何高梁郑罗宋谢唐韩曹许邓萧冯曾程彭潘袁于董余苏叶吕魏蒋田杜丁沈姜范江傅钟卢汪戴崔任陆廖姚方金邱夏谭韦贾邹石熊孟秦阎薛侯雷白龙段郝孔邵史毛常万顾赖武康贺严尹钱施牛洪龚][^a-zA-Z0-9\u4e00-\u9fff]{1,3}(?=，|。|！|？|是|说|去|来|到|在|把|被|将|和|与|或|但|而|却|且|若|如|像|似|若|如)[^a-zA-Z0-9\u4e00-\u9fff]*/g,
    // 地名：常见地名模式
    /(?<=[^a-zA-Z0-9\u4e00-\u9fff])(北京|上海|广州|深圳|南京|杭州|成都|重庆|武汉|西安|天津|苏州|青岛|大连|厦门|宁波|无锡|济南|长沙|哈尔滨|沈阳|长春|石家庄|太原|呼和浩特|银川|西宁|乌鲁木齐|拉萨|昆明|贵阳|南宁|海口|三亚|福州|南昌|合肥|郑州|兰州|银川|贵阳|昆明|南宁|哈尔滨|长春|沈阳|石家庄|太原|呼和浩特|银川|西宁|乌鲁木齐|拉萨)(?=[，。！？])/g,
    // 地名：朝代/国家/地区
    /(?<=[^a-zA-Z0-9\u4e00-\u9fff])(秦|汉|唐|宋|元|明|清|周|春秋|战国|魏|蜀|吴|晋|南北朝|隋|五代|十国|辽|金|西夏|蒙古|民国|新中国|汉朝|唐朝|宋朝|明朝|清朝)(?=[，。！？])/g,
    // 器物名：具体物品
    /(?<=[^a-zA-Z0-9\u4e00-\u9fff])(剑|刀|枪|弓|箭|盾|甲|马|车|船|旗|印|玺|玉|金|银|铜|铁|酒|茶|药|书|画|琴|棋|笛|箫|鼓|钟|鼎|炉|镜|扇|珠|宝|冠|袍|带|靴|帽|饰|佩|器|物|宝|剑|刀|枪|弓|箭|盾|甲|马|车|船|旗|印|玺|玉|金|银|铜|铁)(?=[，。！？])/g,
  ];

  const entities = new Set<string>();
  
  // 使用正则提取
  for (const pattern of patterns) {
    const matches = recentText.match(pattern);
    if (matches) {
      matches.forEach(match => {
        // 清理匹配结果
        const clean = match.trim();
        if (clean.length >= 2 && clean.length <= 6) {
          entities.add(clean);
        }
      });
    }
  }

  // 使用 AI 进行精确提取（如果文本较长）
  if (recentText.length > 500) {
    try {
      const aiPrompt = `请从以下文本中提取所有专有名词，包括：
1. 人名（2-4字）
2. 地名（城市、国家、地区、朝代）
3. 器物名（具体物品、武器、用品）

文本内容：
${recentText}

请只输出列表，每行一个实体，不要其他解释：`;

      const aiResponse = await callAI(aiPrompt, 300);
      const aiEntities = aiResponse.split('\n')
        .map(line => line.trim())
        .filter(line => line.length >= 2 && line.length <= 6);
      
      aiEntities.forEach(entity => entities.add(entity));
    } catch (error) {
      console.warn('AI 实体提取失败，使用正则结果:', error);
    }
  }

  // 转换为数组并去重
  return Array.from(entities).slice(0, 20); // 限制最多20个实体
}

/**
 * 3.2 构建"已有世界观元素"清单
 */
function buildWorldElementsList(entities: string[]): string {
  if (entities.length === 0) return '';

  const lines: string[] = [];
  lines.push('## 已有世界观元素清单');
  
  // 按类型分组
  const persons = entities.filter(e => /[李王张刘陈杨赵黄周吴徐孙朱马胡郭林何高梁郑罗宋谢唐韩曹许邓萧冯曾程彭潘袁于董余苏叶吕魏蒋田杜丁沈姜范江傅钟卢汪戴崔任陆廖姚方金邱夏谭韦贾邹石熊孟秦阎薛侯雷白龙段郝孔邵史毛常万顾赖武康贺严尹钱施牛洪龚]/.test(e));
  const places = entities.filter(e => /(北京|上海|广州|深圳|南京|杭州|成都|重庆|武汉|西安|天津|苏州|青岛|大连|厦门|宁波|无锡|济南|长沙|哈尔滨|沈阳|长春|石家庄|太原|呼和浩特|银川|西宁|乌鲁木齐|拉萨|昆明|贵阳|南宁|海口|三亚|福州|南昌|合肥|郑州|兰州|银川|贵阳|昆明|南宁|哈尔滨|长春|沈阳|石家庄|太原|呼和浩特|银川|西宁|乌鲁木齐|拉萨|秦|汉|唐|宋|元|明|清|周|春秋|战国|魏|蜀|吴|晋|南北朝|隋|五代|十国|辽|金|西夏|蒙古|民国|新中国|汉朝|唐朝|宋朝|明朝|清朝)/.test(e));
  const items = entities.filter(e => /(剑|刀|枪|弓|箭|盾|甲|马|车|船|旗|印|玺|玉|金|银|铜|铁|酒|茶|药|书|画|琴|棋|笛|箫|鼓|钟|鼎|炉|镜|扇|珠|宝|冠|袍|带|靴|帽|饰|佩|器|物|宝|剑|刀|枪|弓|箭|盾|甲|马|车|船|旗|印|玺|玉|金|银|铜|铁)/.test(e));

  if (persons.length > 0) {
    lines.push(`**人物**：${persons.join('、')}`);
  }
  if (places.length > 0) {
    lines.push(`**地点**：${places.join('、')}`);
  }
  if (items.length > 0) {
    lines.push(`**器物**：${items.join('、')}`);
  }

  return lines.join('\n');
}

/**
 * 5.5 构建"记忆提醒"指令 (Cluster 3.1, 3.3, 3.4)
 */
function buildMemoryReminderPrompt(
  activeEventCount: number,
  hasBranchMemory: boolean,
  characterCount: number,
  foreshadowingList: string[],
  forbiddenItems: string[],
): string {
  const lines: string[] = [];
  lines.push('## 写作注意事项');

  const reminders: string[] = [];
  
  // 3.1 硬约束指令：必须引用前文具体细节
  reminders.push('【硬约束】必须引用前文中已出现的具体细节（人名、地点、事件），不得凭空创造前文中未提及的新角色或新地点');
  
  if (activeEventCount > 0) {
    reminders.push(`当前有 ${activeEventCount} 条活跃事件线，续写时请注意推进或回应这些情节`);
  }
  if (hasBranchMemory) {
    reminders.push('本故事存在多条分支，请保持当前分支的叙事独立性，不要混淆其他分支的情节');
  }
  reminders.push(`当前涉及 ${characterCount} 个角色，请保持角色性格、关系和状态的连贯性`);
  reminders.push('续写内容不得与已建立的剧情事实产生矛盾');
  
  // 3.3 未闭合情节线提醒
  if (foreshadowingList.length > 0) {
    reminders.push(`以下情节线尚未完结，请在续写中合理推进或回应：${foreshadowingList.join('；')}`);
  }
  
  // 3.4 禁止事项清单
  if (forbiddenItems.length > 0) {
    reminders.push('【禁止事项】' + forbiddenItems.join('；'));
  }

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

  // 提前查询 story（多处需要用到）
  const story = (await storiesStore.load()).find((s: any) => s.id === storyId);
  const rawGenre = (story as any)?.genre || '';
  const description = (story as any)?.description || storyDescription || '';

  // 从 description 自动推断 genre（如果用户没填）
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
  const styleInstruction = isFiction
    ? `你是一位擅长历史题材的文学作家。请用现代白话文写作，语言流畅生动，可适度使用古风词汇增加氛围感。保持与前文的风格和情节连续性。`
    : '你是一位精通中国历史的文学作家，擅长古典文学风格的写作。请用半文半白的古风文体写作，保持与前文的风格和情节连续性。';
  parts.push(styleInstruction);

  // 如果自动推断出了 genre，在 prompt 中明确告知 AI
  if (inferredGenre && !rawGenre) {
    parts.push(`【重要】本作品类型为"${inferredGenre}"，请严格遵循故事描述中的世界观设定，不要将其与真实历史混淆。`);
  }

  // ─── 2. 故事元信息 (fixed) ───
  const metaLines = [`故事标题：${storyTitle}`];
  if (storyDescription) metaLines.push(`故事背景：${storyDescription || ''}`);
  parts.push(metaLines.join('\n'));

  // ─── 3. 角色状态 (dynamic budget) ───
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

  // ─── 6.5 前文关键实体清单 (3.2) ───
  let worldElementsText = '';
  try {
    const keyEntities = await extractKeyEntitiesFromRecentContext(chain, 500);
    worldElementsText = buildWorldElementsList(keyEntities);
    if (worldElementsText.trim()) {
      parts.push(worldElementsText);
    }
  } catch {
    // Entity extraction failed, skip gracefully
  }

  // ─── 7. 世界观 — 时间轴 + Lorebook (dynamic budget) ───
  // 同人/玄幻等架空作品不注入历史 Lorebook，避免世界观冲突
  try {
    const timeline = await timelineEngine.getTimeline(storyId, branchId);
    let timelinePrompt = '';
    if (!isFiction) {
      const era = (story as any)?.era;
      const loreEntries = era ? await lorebook.getEntries(era) : await lorebook.getAll();
      timelinePrompt = buildTimelinePrompt(timeline, loreEntries);
    } else if (timeline.length > 0) {
      // 虚构作品只保留时间轴，不注入历史 Lorebook
      timelinePrompt = '## 时间线\n' + timeline.map(e => {
        const season = e.season ? `·${e.season}` : '';
        return `- ${e.description}${season}`;
      }).join('\n');
    }
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

  // ─── 9.5 收集 foreshadowing 和构建禁止事项清单 (3.3, 3.4) ───
  let foreshadowingList: string[] = [];
  let forbiddenItems: string[] = [
    '不得出现与前文矛盾的时间/季节/天气描写',
    '不得让已死亡角色重新活跃', 
    '不得改变已建立的角色性格'
  ];

  try {
    // 从摘要中提取 foreshadowing 信息
    const all = await summariesStore.load();
    const recentSummaries = all
      .filter((s: any) => s.storyId === storyId && s.branchId === branchId)
      .slice(-5); // 取最近5个摘要
    
    for (const summary of recentSummaries) {
      if (summary.foreshadowing && Array.isArray(summary.foreshadowing)) {
        foreshadowingList.push(...summary.foreshadowing);
      }
      if (summary.keyEvents && Array.isArray(summary.keyEvents)) {
        // 将关键事件也作为未闭合情节线
        foreshadowingList.push(...summary.keyEvents.filter((e: string) => e.includes('未') || e.includes('将') || e.includes('计划')));
      }
    }
    foreshadowingList = [...new Set(foreshadowingList)].slice(0, 10); // 去重并限制数量
  } catch {
    // Fallback: 使用简单的关键词检测
    if (chain.length > 0) {
      const recentText = chain.slice(-2).map(s => s.content).join(' ');
      const foreshadowingPatterns = [
        /将[^。]*?[^。]*?[。！？]/g,
        /计划[^。]*?[^。]*?[。！？]/g,
        /准备[^。]*?[^。]*?[。！？]/g,
        /打算[^。]*?[^。]*?[。！？]/g,
        /将要[^。]*?[^。]*?[。！？]/g,
      ];
      
      for (const pattern of foreshadowingPatterns) {
        const matches = recentText.match(pattern);
        if (matches) {
          foreshadowingList.push(...matches.slice(0, 3));
        }
      }
      foreshadowingList = [...new Set(foreshadowingList)].slice(0, 5);
    }
  }

  // 根据故事类型添加额外的禁止事项
  if (!isFiction) {
    forbiddenItems.push('不得与现代事物混淆', '不得与正史记载矛盾');
  } else {
    forbiddenItems.push('不得与原著设定矛盾');
  }

  // ─── 10. 记忆提醒 (5.5 + Cluster 3.1, 3.3, 3.4) ───
  parts.push(buildMemoryReminderPrompt(activeEventsCount, hasBranchMemory, allCharIds.length, foreshadowingList, forbiddenItems));

  // ─── 11. 续写指令 (fixed) ───
  const wordHint = pacingConfig
    ? new PacingEngine(pacingConfig).getWordInstruction()
    : '请续写下一段（150-300字）';
  const styleHint = isFiction
    ? ''
    : '，保持古典文学风格';
  parts.push(`${wordHint}${styleHint}，与前文情节连续。`);

  // ─── Assemble & enrich with facts ───
  const fullPrompt = parts.join('\n\n');

  const entities: Array<{ name: string; type: string }> = [];
  if (story && (story as any).characterIds) {
    for (const cid of (story as any).characterIds) {
      const c = await characterManager.getById(cid);
      if (c) entities.push({ name: c.name, type: 'person' });
    }
  }

  const enriched = await enrichPromptWithFacts(fullPrompt, entities, { genre: effectiveGenre, era: (story as any)?.era });
  return enriched;
}
