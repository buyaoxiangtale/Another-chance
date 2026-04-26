/**
 * Prompt 构建
 *
 * 顺序：系统指令 → 故事元信息 → 风格锚点 → 角色状态 → 活跃事件 → 分支记忆 →
 *      导演覆盖 → 前文上下文 → 世界观 → 节奏 → 记忆提醒 → 续写指令
 */

import { characterManager } from './character-engine';
import { timelineEngine, buildTimelinePrompt } from './timeline-engine';
import { lorebook } from './lorebook';
import { directorManager } from './director-manager';
import { PacingEngine } from './pacing-engine';
import { contextSummarizer, estimateTokens } from './context-summarizer';
import { EventTracker, buildEventPrompt } from './event-tracker';
import { branchMemory } from './branch-memory';
import type { PacingConfig, DirectorState, StorySegment } from '@/types/story';

export type BranchMode = 'normal' | 'branchCreation' | 'branchContinuation';
import prisma from '@/lib/prisma';
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
  /** Branch mode: controls character constraints and narrative divergence */
  branchMode?: BranchMode;
  /** User-specified direction for branch creation */
  branchDirection?: string;
}

/**
 * 角色名自动纠错：检测 AI 输出中与已知角色名"形近但不完全相同"的片段并替换。
 * 处理"满穂→满穃"类低频字/形近字错误：同长度、同首字、仅 1 字差异的子串替换为正确名字。
 *
 * 安全措施：
 * - 仅使用从 Character 表注册的角色名（不使用启发式提取的"人名"）
 * - 跳过以指示代词（这/那/此/其等）开头的"名字"
 * - 每个名字最多纠正 3 次，防止级联错误
 * - 纠正后跳过已替换区域，避免重叠替换
 */
export function correctCharacterNames(text: string, knownNames: string[]): string {
  if (!knownNames || knownNames.length === 0) return text;

  let result = text;
  for (const correctName of knownNames) {
    if (!correctName || correctName.length < 2) continue;
    // 跳过以指示代词/常见虚词开头的"名字"——这些几乎不可能是人名
    if (/^[这那此其每各哪什么如何若虽但是而又]/.test(correctName[0])) continue;

    let correctionCount = 0;
    const maxCorrections = 3;

    let i = 0;
    while (i <= result.length - correctName.length && correctionCount < maxCorrections) {
      const candidate = result.slice(i, i + correctName.length);
      if (candidate === correctName) {
        i++;
        continue;
      }
      if (candidate[0] !== correctName[0]) {
        i++;
        continue;
      }
      let diffs = 0;
      for (let j = 0; j < candidate.length; j++) {
        if (candidate[j] !== correctName[j]) diffs++;
        if (diffs > 1) break;
      }
      if (diffs === 1) {
        result = result.slice(0, i) + correctName + result.slice(i + correctName.length);
        console.log(`[name-correct] "${candidate}" → "${correctName}" (pos ${i})`);
        i += correctName.length; // 跳过已替换区域，防止重叠纠正
        correctionCount++;
      } else {
        i++;
      }
    }
  }
  return result;
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
  branchMode?: BranchMode,
  characterNames?: string[],
): string {
  const rules: string[] = [
    '与前文已建立的时间、季节、地点、人物关系保持一致',
    '已死亡或离场的角色不得再次出场',
    '角色性格、动机、口癖与前文保持一致',
  ];
  rules.push(isFiction ? '遵守原著或故事设定，不得与已建立世界观矛盾' : '不得出现与正史或已写情节矛盾的事实');

  if (branchMode === 'branchCreation' || branchMode === 'branchContinuation') {
    rules.push('不要引入前文未出现的新角色，只使用已建立的人物');
  }

  const lines: string[] = [];
  lines.push('## 硬约束');
  lines.push(...rules.map(r => `- ${r}`));

  // 角色名精确约束：防止 AI 写错低频字/形近字
  if (characterNames && characterNames.length > 0) {
    lines.push('');
    lines.push('【角色名精确约束 — 不得写错】');
    lines.push('以下角色名必须逐字原样使用，禁止替换、简写、形近字替代：');
    for (const name of characterNames) {
      lines.push(`- "${name}"（每个字都必须与前文完全相同）`);
    }
  }

  if (foreshadowingList.length > 0) {
    lines.push('');
    lines.push('## 请在本段推进或回应以下悬念');
    lines.push(...foreshadowingList.slice(0, 5).map(f => `- ${f}`));
  }

  return lines.join('\n');
}

/**
 * 从文本中启发式提取人名（2-4字中文人名），用于事实锚点冷启动。
 * 匹配规则：姓 + 1~2 个名，姓氏取自百家姓前120个常见姓。
 */
function extractPersonNames(text: string): string[] {
  const surnames = '赵钱孙李周吴郑王冯陈褚卫蒋沈韩杨朱秦尤许何吕施张孔曹严华金魏陶姜戚谢邹喻柏窦章苏潘葛奚范彭郎鲁韦昌马苗凤花方俞任袁柳鲍史唐费廉岑薛雷贺倪汤滕殷罗毕郝邬安常乐于时傅卞齐康伍余元卜顾孟平黄和穆萧尹姚邵湛汪祁毛禹狄米贝明臧计伏成戴谈宋茅庞熊纪舒屈项祝董梁杜阮蓝闵席季麻强贾路娄危江童颜郭梅盛林刁钟徐邱骆高夏蔡田樊胡凌霍虞万支柯昝管卢莫经房裘缪干解应宗丁宣贲邓郁单杭洪包诸左石崔吉钮龚程嵇邢滑裴陆荣翁荀羊於惠甄曲家封芮羿储靳汲邴糜松井段富巫乌焦巴弓牧隗山谷车侯宓蓬全郗班仰秋仲伊宫宁仇栾暴甘钭厉戎祖武符刘景詹束龙叶幸司韶郜黎蓟薄印宿白怀蒲邰从鄂索咸籍赖卓蔺屠蒙池乔阴郁胥能苍双闻莘党翟谭贡劳逄姬申扶堵冉宰郦雍卻璩桑桂濮牛寿通边扈燕冀郏浦尚农温别庄晏柴瞿阎充慕连茹习宦艾鱼容向古易慎戈廖庾终暨居衡步都耿满弘匡国文寇广禄阙东欧殳沃利蔚越夔隆师巩厍聂晁勾敖融冷訾辛阚那简饶空曾母沙乜养鞠须丰巢关蒯相查后荆红游竺权逯盖益桓公';
  const surnameSet = new Set<string>();
  for (const ch of surnames) surnameSet.add(ch);

  const names = new Set<string>();
  // 匹配 姓+名(1-2字) 且名不是常见虚词/动词
  const nonNameChars = new Set('的了是在有这我你他她它们和与而但就把给对让用都能会要已将又可该当为因为所其地得着');

  for (let i = 0; i < text.length; i++) {
    if (!surnameSet.has(text[i])) continue;
    // 尝试 2 字名（姓+1字）和 3 字名（姓+2字）
    for (const len of [2, 3, 4]) {
      if (i + len > text.length) continue;
      const candidate = text.slice(i, i + len);
      const namePart = candidate.slice(1); // 名的部分
      if (!namePart) continue;
      // 名部分不能包含标点、空格、数字、非中文字符
      if (/[^\u4e00-\u9fff]/.test(namePart)) continue;
      // 名部分每个字不能是虚词
      if ([...namePart].some(ch => nonNameChars.has(ch))) continue;
      names.add(candidate);
    }
  }

  return [...names];
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

export interface BuildFullPromptResult {
  prompt: string;
  /** 所有已知名字（含启发式提取），用于 prompt 提醒 AI 保持一致 */
  knownCharacterNames: string[];
  /** 仅从 Character 表注册的角色名，用于 correctCharacterNames 自动纠错 */
  registeredCharacterNames: string[];
}

export async function buildFullPrompt(options: BuildPromptOptions): Promise<BuildFullPromptResult> {
  const {
    storyId, branchId, tailSegment, chain,
    storyTitle, storyDescription,
    pacingConfig, directorOverrides,
    tokenBudget = 6000,
    branchMode: rawBranchMode,
    branchDirection,
  } = options;

  // 自动推断 branchMode
  const branchMode: BranchMode = rawBranchMode
    || (branchId !== 'main' ? 'branchContinuation' : 'normal');

  const parts: string[] = [];
  const _fandomForbiddenItems: string[] = [];

  const story = await prisma.story.findUnique({ where: { id: storyId } });
  const rawGenre = story?.genre || '';
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
    styleInstruction =
      '你是一位擅长科幻题材的文学作家。请用现代白话文写作，语言流畅生动，注重科学逻辑和想象力。' +
      '善用科技意象与未来感描写，营造宏大的宇宙观或末世氛围。角色对话应有理性思辨色彩。保持与前文的风格和情节连续性。';
  } else if (effectiveGenre === '悬疑') {
    styleInstruction =
      '你是一位擅长悬疑推理题材的文学作家。请用现代白话文写作，语言冷静克制，注重悬念铺设和逻辑推理。' +
      '善用伏笔、暗示和心理描写制造紧张感，每段结尾留有悬念钩子。保持与前文的风格和情节连续性。';
  } else if (effectiveGenre === '都市' || effectiveGenre === '现代') {
    styleInstruction =
      '你是一位擅长现代都市题材的文学作家。请用现代白话文写作，语言贴近当代生活，对话自然口语化。' +
      '注重日常生活细节的真实感和都市人际关系的微妙刻画。保持与前文的风格和情节连续性。';
  } else if (effectiveGenre === '玄幻') {
    styleInstruction =
      '你是一位擅长玄幻题材的文学作家。请用现代白话文写作，语言大气磅礴，注重修炼体系和力量层级的描写。' +
      '善用奇特意象和壮阔场景描写，战斗场面要有画面感和力量感。角色对话可融入修真世界的独特口吻。保持与前文的风格和情节连续性。';
  } else if (effectiveGenre === '仙侠') {
    styleInstruction =
      '你是一位擅长仙侠题材的文学作家。请用半文半白或典雅白话文写作，语言空灵飘逸，注重意境营造和仙道哲思。' +
      '善用诗词意境和自然意象（云海、仙山、灵鹤、飞剑），动作描写兼具武术美感与仙气。保持与前文的风格和情节连续性。';
  } else if (effectiveGenre === '武侠') {
    styleInstruction =
      '你是一位擅长武侠题材的文学作家。请用半文半白或古雅白话文写作，语言豪迈洒脱，注重江湖氛围和侠义精神的刻画。' +
      '武功描写要有招式感和节奏感，善用短句制造动作张力。人物对白应带有江湖气。保持与前文的风格和情节连续性。';
  } else if (effectiveGenre === '穿越') {
    styleInstruction =
      '你是一位擅长穿越题材的文学作家。请用现代白话文写作，语言灵活切换现代思维与古代语境的碰撞感。' +
      '善用主角的现代知识在古代产生的反差与冲突，注重心理描写中"两个身份"的矛盾与融合。保持与前文的风格和情节连续性。';
  } else if (effectiveGenre === '同人') {
    styleInstruction =
      '你是一位擅长同人创作的文学作家。请用现代白话文写作，语言风格贴近原著的叙事语感。' +
      '严格忠于原作的世界观设定、角色性格和人物关系，续写情节应与原作风格无缝衔接。保持与前文的风格和情节连续性。';
  } else if (effectiveGenre === '奇幻') {
    styleInstruction =
      '你是一位擅长奇幻题材的文学作家。请用现代白话文写作，语言瑰丽奇幻，注重魔法体系和种族设定的描写。' +
      '善用史诗感叙事和奇幻世界观细节（魔法、龙、精灵、古堡等），营造沉浸式的异世界氛围。保持与前文的风格和情节连续性。';
  } else if (effectiveGenre === '架空') {
    styleInstruction =
      '你是一位擅长架空历史题材的文学作家。请用半文半白或典雅白话文写作，语言兼具历史厚重感与虚构叙事的自由度。' +
      '注重架空世界观的内部逻辑自洽，在真实历史框架的基础上合理演绎变数。保持与前文的风格和情节连续性。';
  } else if (effectiveGenre === '演义') {
    styleInstruction =
      '你是一位擅长历史演义题材的文学作家。请用章回体或半文半白的叙事风格写作，语言庄重而富有戏剧性。' +
      '善用对仗、铺陈等古典修辞手法，人物出场和战阵描写要有章回小说的仪式感。保持与前文的风格和情节连续性。';
  } else if (effectiveGenre === '军事') {
    styleInstruction =
      '你是一位擅长军事题材的文学作家。请用现代白话文写作，语言硬朗干练，注重战术细节和军事术语的准确运用。' +
      '善用紧张紧凑的叙事节奏描写战场态势，人物刻画突出军人气质和家国情怀。保持与前文的风格和情节连续性。';
  } else if (effectiveGenre === '原创') {
    styleInstruction =
      '你是一位才华横溢的现代文学作家。请用现代白话文写作，语言细腻优美、贴近生活。' +
      '注重人物成长弧线和情感变化的真实刻画，善用细节描写和心理独白展现角色内心世界。' +
      '叙事节奏自然流畅，对话口语化且富有个性。保持与前文的风格和情节连续性。';
  } else if (isFiction) {
    styleInstruction =
      '你是一位擅长虚构文学的文学作家。请用现代白话文写作，语言流畅生动，注重人物内心世界的细腻刻画和情节的层层推进。' +
      '善用意象、隐喻和心理描写增强文学性，叙事节奏张弛有度。保持与前文的风格和情节连续性。';
  } else {
    styleInstruction =
      '你是一位精通中国历史的文学作家，擅长古典文学风格的写作。请用半文半白的古风文体写作，' +
      '注重史实准确性，善用典故和古典修辞。叙事庄重典雅，人物言行符合时代特征。保持与前文的风格和情节连续性。';
  }
  console.log(`  \x1b[35m→ 风格指令:\x1b[0m ${styleInstruction}`);
  parts.push(styleInstruction);

  if (inferredGenre && !rawGenre) {
    parts.push(`【重要】本作品类型为"${inferredGenre}"，请严格遵循故事描述中的世界观设定，不要将其与真实历史混淆。`);
  }

  // ─── 1.5 风格覆盖指令：当明确应使用现代文体的类型却检测到古风时，强制覆盖 ───
  // 武侠/仙侠/玄幻/演义/架空 本身就有古雅风格，不需要覆盖
  const MODERN_VOICE_GENRES = ['科幻', '末世', '悬疑', '都市', '现代', '同人', '穿越', '奇幻', '军事', '原创'];
  let styleOverrideActive = false;
  if (isFiction && MODERN_VOICE_GENRES.includes(effectiveGenre)) {
    // 检测前文是否用了古风文体（抽样最近 2 段）
    const recentText = chain.slice(-2).map(s => s.content).join('');
    const gufengSignals = ['之', '其', '乃', '遂', '亦', '且', '皆', '此', '故', '然', '矣', '焉', '乎', '尔', '者'];
    const gufengCount = gufengSignals.filter(ch => recentText.includes(ch)).length;
    const isGufeng = gufengCount >= 5;

    if (isGufeng) {
      styleOverrideActive = true;
      console.log(`  \x1b[35m→ 前文古风检测:\x1b[0m 检测到 ${gufengCount}/15 古风信号词，注入风格覆盖指令（并跳过 styleAnchor）`);
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
  // 风格覆盖激活时跳过 styleAnchor，避免模型被前文古风"反向模仿"
  if (!styleOverrideActive) {
    const styleAnchor = buildStyleAnchor(chain);
    if (styleAnchor) parts.push(styleAnchor);
  }

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

  // ─── 5.5 分支角色约束与叙事分歧 ───
  if (branchMode === 'branchCreation' || branchMode === 'branchContinuation') {
    let charNames: string[] = [];
    try {
      const chars = await characterManager.buildCharacterPrompt(allCharIds);
      // 从角色 prompt 中提取名字（简单方案：直接用 allCharIds 查库）
      const charRecords = await prisma.character.findMany({ where: { id: { in: allCharIds } } });
      charNames = charRecords.map(c => c.name);
    } catch {}

    if (branchMode === 'branchCreation') {
      parts.push(
        `【分叉续写约束】\n` +
        `这是一个全新的故事分叉。分叉点之前的内容是共享的，但从这里开始，故事可以走向截然不同的方向。\n` +
        `1. 续写中只应使用前文已出现的角色${charNames.length > 0 ? `（${charNames.join('、')}）` : ''}，不要引入任何前文未提及的新角色。\n` +
        `2. 情节应充分体现用户指定的方向："${branchDirection || ''}"\n` +
        `3. 角色可以因不同选择展现出不同面向，但不要凭空创造新人物。`
      );
    } else {
      parts.push(
        `【分支叙事提示】\n` +
        `当前处于故事的分叉分支中。续写只应使用前文已出现的角色${charNames.length > 0 ? `（${charNames.join('、')}）` : ''}，不要引入前文未提及的新角色。`
      );
    }
  }

  // ─── 6. 分支记忆 ───
  if (hasBranchMemory) parts.push(branchPrompt);

  // ─── 7. 导演覆盖（提前到前文之前，用户意图优先级） ───
  try {
    let directorText = '';
    if (directorOverrides) {
      const dm = await directorManager.getOrCreate(storyId);
      if (directorOverrides.characterStates) {
        dm.characterStates = { ...(dm.characterStates as Record<string, any>), ...directorOverrides.characterStates };
      }
      if (directorOverrides.worldVariables) {
        dm.worldVariables = { ...(dm.worldVariables as Record<string, any>), ...directorOverrides.worldVariables };
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
      contextText = await contextSummarizer.getContextForPrompt(chain as any, budgets.contextHistory, effectiveGenre);
    } catch {
      contextText = chain.map(s =>
        `${s.title ? `【${s.title}】` : ''}${s.content}`
      ).join('\n');
    }
  }
  if (contextText.trim()) {
    parts.push(`## 当前故事进展\n${contextText}`);
  }

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
    const recentSummaries = await prisma.segmentSummary.findMany({
      where: { storyId, branchId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    for (const summary of recentSummaries) {
      const meta = summary.metadata as Record<string, any> | null;
      const foreshadowing = meta?.foreshadowing;
      if (foreshadowing && Array.isArray(foreshadowing)) {
        foreshadowingList.push(...foreshadowing);
      }
    }
    foreshadowingList = [...new Set(foreshadowingList)];
  } catch {}

  // ─── 12.5 收集所有已知角色名（注册角色 + chain 文本中出现过的人名） ───
  const knownCharacterNames: string[] = [];
  const registeredCharacterNames: string[] = [];
  // 已注册角色的名字（最可靠，用于纠错）
  if (allCharIds.length > 0) {
    try {
      const chars = await characterManager.buildCharacterPrompt(allCharIds);
      // buildCharacterPrompt 输出格式：## 名字（角色） → 提取 "##" 和 "（" 之间的名字
      const nameMatches = chars.match(/##\s*(.+?)（/g);
      if (nameMatches) {
        for (const m of nameMatches) {
          const name = m.replace(/##\s*/, '').replace(/（.*/, '').trim();
          if (name) {
            knownCharacterNames.push(name);
            registeredCharacterNames.push(name);
          }
        }
      }
    } catch {}
  }
  // 冷启动兜底：从 chain 文本中提取人名
  if (knownCharacterNames.length === 0 && chain.length > 0) {
    const chainText = chain.map(s => (s as any).content || '').filter(Boolean).join('');
    const extracted = extractPersonNames(chainText);
    knownCharacterNames.push(...extracted.slice(0, 8));
  }
  // 从 storyTitle / storyDescription 中也提取
  if (knownCharacterNames.length === 0) {
    const metaText = [storyTitle, storyDescription].filter(Boolean).join(' ');
    const metaNames = extractPersonNames(metaText);
    knownCharacterNames.push(...metaNames.slice(0, 5));
  }

  parts.push(buildMemoryReminderPrompt(isFiction, foreshadowingList, branchMode, knownCharacterNames));

  // ─── 13. 续写指令 ───
  const wordHint = pacingConfig
    ? new PacingEngine(pacingConfig).getWordInstruction()
    : '请续写下一段（150-300字）';
  const styleHint = isFiction
    ? '，使用现代白话文'
    : '，保持古典文学风格';

  let continuationSuffix: string;
  if (branchMode === 'branchCreation') {
    continuationSuffix = `，根据用户指定的方向续写，只使用已有角色。`;
  } else if (branchMode === 'branchContinuation') {
    continuationSuffix = `，延续本分支的独立叙事走向。`;
  } else {
    continuationSuffix = `，与前文情节连续。`;
  }
  parts.push(`${wordHint}${styleHint}${continuationSuffix}`);

  // ─── Assemble prompt ───
  const fullPrompt = parts.join('\n\n');

  // ─── 诊断日志：最终 prompt 预览 ───
  console.log('\n' + '-'.repeat(60));
  console.log('\x1b[33m[prompt-builder]\x1b[0m 最终 Prompt 预览 (前300字):');
  console.log('\x1b[90m' + fullPrompt.slice(0, 300) + '\x1b[0m');
  console.log(`  总长度: ${fullPrompt.length} 字符`);
  console.log(`  已知角色名: ${knownCharacterNames.join(', ') || '(无)'}`);
  console.log('-'.repeat(60) + '\n');

  return { prompt: fullPrompt, knownCharacterNames, registeredCharacterNames };
}
