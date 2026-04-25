/**
 * C1: 上下文摘要引擎 — ContextSummarizer
 * 管理段落摘要的生成、存储和检索
 */

import prisma from '@/lib/prisma';
import { FICTION_KEYWORDS } from './genre-config';
import { callAIText } from './ai-client';

type StorySegment = NonNullable<Awaited<ReturnType<typeof prisma.storySegment.findUnique>>>;

/** Metadata stored in SegmentSummary.metadata JSON field */
type SummaryMetadata = {
  characterActions?: string[];
  keyEvents?: string[];
  stateChanges?: string[];
  foreshadowing?: string[];
};

/** Local type for group-level summaries (not stored in DB) */
type GroupSummary = {
  label: string;
  segmentIds: string[];
  summaryText: string;
  keyEvents: string[];
  stateChanges: string[];
  tokenCount: number;
  createdAt: string;
  aiGenerated?: boolean;
};

/** Local type for chapter-level summaries (not stored in DB) */
type ChapterSummary = {
  label: string;
  groupCount: number;
  summaryText: string;
  keyEvents: string[];
  tokenCount: number;
  createdAt: string;
};

/**
 * 估算文本的 token 数（中文约 1.5 字/token，英文约 4 字符/token）
 */
function estimateTokens(text: string): number {
  const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const otherChars = text.length - chineseChars;
  return Math.ceil(chineseChars / 1.5 + otherChars / 4);
}

/**
 * 解析 AI 返回的 JSON（容忍 ```json ``` 代码块包裹）
 */
function parseAIJson(response: string): any {
  let cleaned = response.trim();
  const codeBlockMatch = cleaned.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (codeBlockMatch) cleaned = codeBlockMatch[1].trim();
  return JSON.parse(cleaned);
}

/**
 * AI 调用方法，委托给 ai-client.ts 的队列+重试机制
 */
async function callAI(prompt: string, maxTokens: number = 1000, systemPrompt?: string, genre?: string): Promise<string> {
  return callAIText(prompt, {
    systemPrompt: systemPrompt || '你是一位擅长文学创作的故事摘要专家。请用中文回答，提取故事段落的关键信息。',
    maxTokens,
    priority: 'low',
  });
}

/**
 * 对单个段落生成摘要（规则驱动，不依赖 AI）
 */
function extractSummaryFromSegment(segment: StorySegment, chain: StorySegment[]): {
  summaryText: string;
  metadata: SummaryMetadata;
  tokenCount: number;
  originalTokenCount: number;
} {
  const content = segment.content;

  // 提取角色行动
  const characterActions: string[] = [];
  if (segment.characterIds && segment.characterIds.length > 0) {
    const sentences = content.split(/[。！？；\n]+/).filter(s => s.trim().length > 0);
    const keySentences = [...sentences.slice(0, 2), ...sentences.slice(-2)];
    for (const charId of segment.characterIds) {
      characterActions.push(`涉及角色[${charId}]：${keySentences.slice(0, 1).join('。')}`);
    }
  }

  // 提取关键事件（简单规则）
  const events: string[] = [];
  const eventPatterns = [
    /[^。]*?死[^。]*?[。！？]/g,
    /[^。]*?亡[^。]*?[。！？]/g,
    /[^。]*?伤[^。]*?[。！？]/g,
    /[^。]*?败[^。]*?[。！？]/g,
    /[^。]*?胜[^。]*?[。！？]/g,
    /[^。]*?结盟[^。]*?[。！？]/g,
    /[^。]*?背叛[^。]*?[。！？]/g,
    /[^。]*?发现[^。]*?[。！？]/g,
    /[^。]*?逃[^。]*?[。！？]/g,
    /[^。]*?降[^。]*?[。！？]/g,
  ];
  for (const pattern of eventPatterns) {
    const matches = content.match(pattern);
    if (matches) {
      events.push(...matches.slice(0, 2).map(m => m.trim()));
    }
  }

  // 提取状态变化
  const stateChanges: string[] = [];
  const tl = segment.timeline as Record<string, any> | null;
  if (tl) {
    if (tl.year) stateChanges.push(`时间推进至${tl.year}年${tl.season || ''}`);
  }
  if (segment.mood) {
    stateChanges.push(`氛围：${segment.mood}`);
  }
  if (segment.narrativePace) {
    stateChanges.push(`节奏：${segment.narrativePace}`);
  }

  // 生成摘要文本
  const summaryParts: string[] = [];
  if (segment.title) summaryParts.push(`【${segment.title}】`);
  summaryParts.push(content.length > 100 ? content.slice(0, 100) + '...' : content);
  if (events.length > 0) summaryParts.push(`关键事件：${events.join('；')}`);
  if (stateChanges.length > 0) summaryParts.push(stateChanges.join('，'));

  const summaryText = summaryParts.join('\n');

  return {
    summaryText,
    metadata: {
      characterActions,
      keyEvents: events,
      stateChanges,
    },
    tokenCount: estimateTokens(summaryText),
    originalTokenCount: estimateTokens(content),
  };
}

/**
 * AI 摘要 prompt 模板
 */
const AISUMMARY_PROMPT = `你是一位专业的故事摘要专家，擅长从文学作品中提取关键信息。

请根据以下段落内容，生成结构化的故事摘要。要求：
1. 准确提取关键事件、人物行动、场景描写
2. 识别情节伏笔和情感变化
3. 保持客观准确的表述风格
4. 输出必须是有效的 JSON 格式

段落内容：
{{content}}

请按以下 JSON 格式输出：
{
  "events": ["关键事件1", "关键事件2", ...],
  "characterActions": ["角色行动1", "角色行动2", ...],
  "scenes": ["场景描写1", "场景描写2", ...],
  "foreshadowing": ["伏笔1", "伏笔2", ...],
  "moodChanges": ["情感变化1", "情感变化2", ...]
}

只返回 JSON，不要添加其他解释。`;

/**
 * 使用 AI 生成段落摘要
 */
async function generateAISummary(segment: StorySegment, chain: StorySegment[], genre?: string): Promise<{
  summaryText: string;
  metadata: SummaryMetadata;
  tokenCount: number;
  originalTokenCount: number;
  aiGenerated: boolean;
}> {
  // 段落内容写入后不会变，摘要永久缓存
  const cached = await prisma.segmentSummary.findFirst({
    where: { segmentId: segment.id },
  });
  if (cached) {
    const meta = (cached.metadata as SummaryMetadata | null) || {};
    return {
      summaryText: cached.summary,
      metadata: meta,
      tokenCount: cached.tokenCount || 0,
      originalTokenCount: cached.originalTokenCount || 0,
      aiGenerated: cached.aiGenerated,
    };
  }

  try {
    const prompt = AISUMMARY_PROMPT.replace('{{content}}', segment.content);
    const aiResponse = await callAI(prompt, 2000, undefined, genre);

    let summary: any;
    try {
      summary = parseAIJson(aiResponse);
    } catch (e) {
      console.warn('AI 摘要 JSON 解析失败，使用 fallback:', e);
      throw new Error('AI response parsing failed');
    }

    const summaryParts: string[] = [];
    if (segment.title) summaryParts.push(`【${segment.title}】`);
    summaryParts.push(segment.content.length > 100 ? segment.content.slice(0, 100) + '...' : segment.content);

    if (summary.events?.length > 0) summaryParts.push(`关键事件：${summary.events.join('；')}`);
    if (summary.characterActions?.length > 0) summaryParts.push(`角色行动：${summary.characterActions.join('；')}`);
    if (summary.scenes?.length > 0) summaryParts.push(`场景描写：${summary.scenes.join('；')}`);
    if (summary.foreshadowing?.length > 0) summaryParts.push(`伏笔：${summary.foreshadowing.join('；')}`);
    if (summary.moodChanges?.length > 0) summaryParts.push(`情感变化：${summary.moodChanges.join('；')}`);

    const summaryText = summaryParts.join('\n');
    const metadata: SummaryMetadata = {
      characterActions: summary.characterActions || [],
      keyEvents: summary.events || [],
      stateChanges: [...(summary.scenes || []), ...(summary.moodChanges || [])],
      foreshadowing: summary.foreshadowing || [],
    };
    const tokenCount = estimateTokens(summaryText);
    const originalTokenCount = estimateTokens(segment.content);
    const chainIndex = chain.findIndex(s => s.id === segment.id);

    // 持久化到缓存
    await prisma.segmentSummary.upsert({
      where: { segmentId_branchId: { segmentId: segment.id, branchId: segment.branchId } },
      create: {
        segmentId: segment.id,
        storyId: segment.storyId,
        branchId: segment.branchId,
        chainIndex,
        summary: summaryText,
        tokenCount,
        originalTokenCount,
        aiGenerated: true,
        metadata: metadata as any,
      },
      update: {
        summary: summaryText,
        tokenCount,
        originalTokenCount,
        metadata: metadata as any,
      },
    });

    return { summaryText, metadata, tokenCount, originalTokenCount, aiGenerated: true };
  } catch (error) {
    console.warn('AI 摘要生成失败，使用 fallback:', error);
    const fallback = extractSummaryFromSegment(segment, chain);
    return { ...fallback, aiGenerated: false };
  }
}

/**
 * ContextSummarizer — 上下文摘要引擎
 */
class ContextSummarizer {
  /**
   * 1.2 对单个段落生成摘要（AI 驱动）
   */
  async generateSegmentSummary(segment: StorySegment, chain: StorySegment[], genre?: string) {
    return await generateAISummary(segment, chain, genre);
  }

  /**
   * 1.3 分层上下文构建
   */
  async buildHierarchicalContext(
    chain: StorySegment[],
    maxTokens: number,
    recentCount: number = 5,
    groupSize: number = 5,
    genre?: string
  ): Promise<{ fullTextSegments: StorySegment[]; groupSummaries: GroupSummary[]; chapterSummaries: ChapterSummary[] }> {
    const fullTextSegments: StorySegment[] = [];
    const groupSummaries: GroupSummary[] = [];
    const chapterSummaries: ChapterSummary[] = [];

    if (chain.length === 0) return { fullTextSegments, groupSummaries, chapterSummaries };

    const storyId = chain[0].storyId;
    const branchId = chain[0].branchId;

    // 最近 N 段保留全文
    const recent = chain.slice(-recentCount);
    const older = chain.slice(0, -recentCount);

    fullTextSegments.push(...recent);

    // 计算剩余 token 预算
    const recentTokens = recent.reduce((sum, s) => sum + estimateTokens(s.content), 0);
    let remainingTokens = maxTokens - recentTokens;

    if (older.length === 0 || remainingTokens <= 0) {
      return { fullTextSegments, groupSummaries, chapterSummaries };
    }

    // 为较早段落生成/获取摘要
    const olderSummaries: Array<{ summaryText: string; metadata: SummaryMetadata; tokenCount: number; segmentId: string }> = [];
    for (const seg of older) {
      const existing = await prisma.segmentSummary.findFirst({
        where: { segmentId: seg.id, branchId: seg.branchId },
      });
      if (existing) {
        const meta = (existing.metadata as SummaryMetadata | null) || {};
        olderSummaries.push({
          summaryText: existing.summary,
          metadata: meta,
          tokenCount: existing.tokenCount || 0,
          segmentId: existing.segmentId,
        });
      } else {
        const result = await this.generateSegmentSummary(seg, chain, genre);
        olderSummaries.push({
          summaryText: result.summaryText,
          metadata: result.metadata,
          tokenCount: result.tokenCount,
          segmentId: seg.id,
        });
      }
    }

    // 1.7 AI 生成连贯的组级摘要
    const aiGroupSummaries = await this.generateAIGroupSummaries(olderSummaries, groupSize, remainingTokens, genre);

    // 构建组级摘要
    for (const groupSummary of aiGroupSummaries) {
      if (remainingTokens >= groupSummary.tokenCount) {
        groupSummaries.push(groupSummary);
        remainingTokens -= groupSummary.tokenCount;
      } else {
        const allGroupEvents = olderSummaries.flatMap(s => s.metadata.keyEvents || []);
        const chapterText = `前文概要：${groupSummaries.length} 组摘要 + ${olderSummaries.length - groupSummaries.length * groupSize} 段`;
        const chapterSummary: ChapterSummary = {
          label: '远端前文概要',
          groupCount: Math.ceil(olderSummaries.length / groupSize),
          summaryText: chapterText,
          keyEvents: allGroupEvents.slice(0, 20),
          tokenCount: estimateTokens(chapterText),
          createdAt: new Date().toISOString(),
        };
        chapterSummaries.push(chapterSummary);
        break;
      }
    }

    return { fullTextSegments, groupSummaries, chapterSummaries };
  }

  /**
   * 1.7 AI 生成连贯的组级摘要
   */
  private async generateAIGroupSummaries(
    summaries: Array<{ summaryText: string; metadata: SummaryMetadata; tokenCount: number; segmentId: string }>,
    groupSize: number,
    tokenBudget: number,
    genre?: string
  ): Promise<GroupSummary[]> {
    const groups: GroupSummary[] = [];

    for (let i = 0; i < summaries.length; i += groupSize) {
      const group = summaries.slice(i, i + groupSize);
      const groupTexts = group.map(s => s.summaryText).join('\n\n');

      if (tokenBudget < 500) {
        const label = `段落 ${i + 1}-${Math.min(i + groupSize, summaries.length)}`;
        groups.push(this.createSimpleGroupSummary(group, label));
        continue;
      }

      try {
        const prompt = `请将以下 ${group.length} 个段落摘要合并为一个连贯的摘要：

${groupTexts}

要求：
1. 保持原有的关键事件、角色行动、伏笔信息
2. 使摘要内容更加连贯流畅
3. 突出重要的人物关系和情节发展
4. 控制在 200 字以内

请只输出合并后的摘要文本：`;

        const aiResponse = await callAI(prompt, 1200, undefined, genre);
        const label = `段落 ${i + 1}-${Math.min(i + groupSize, summaries.length)}`;
        const groupSummary: GroupSummary = {
          label,
          segmentIds: group.map(s => s.segmentId),
          summaryText: aiResponse,
          keyEvents: group.flatMap(s => s.metadata.keyEvents || []).slice(0, 10),
          stateChanges: group.flatMap(s => s.metadata.stateChanges || []).slice(0, 10),
          aiGenerated: true,
          tokenCount: estimateTokens(aiResponse),
          createdAt: new Date().toISOString(),
        };

        groups.push(groupSummary);
        tokenBudget -= groupSummary.tokenCount;
      } catch (error) {
        console.warn('AI 组级摘要生成失败，使用简单合并:', error);
        const label = `段落 ${i + 1}-${Math.min(i + groupSize, summaries.length)}`;
        groups.push(this.createSimpleGroupSummary(group, label));
      }
    }

    return groups;
  }

  /**
   * 创建简单的组级摘要（fallback）
   */
  private createSimpleGroupSummary(
    summaries: Array<{ summaryText: string; metadata: SummaryMetadata; tokenCount: number; segmentId: string }>,
    label: string
  ): GroupSummary {
    const summaryTexts = summaries.map(s => s.summaryText);
    const allEvents = summaries.flatMap(s => s.metadata.keyEvents || []);
    const allStateChanges = summaries.flatMap(s => s.metadata.stateChanges || []);

    const text = `${label}\n${summaryTexts.join('\n')}`;

    return {
      label,
      segmentIds: summaries.map(s => s.segmentId),
      summaryText: text,
      keyEvents: allEvents.slice(0, 10),
      stateChanges: allStateChanges.slice(0, 10),
      tokenCount: estimateTokens(text),
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * 1.5 新段落写入后自动更新摘要链
   */
  async updateSummariesAfterNewSegment(storyId: string, branchId: string, newSegment: StorySegment): Promise<void> {
    const segments = await prisma.storySegment.findMany({
      where: { storyId, branchId },
      orderBy: { createdAt: 'asc' },
    });

    const chain = await this.buildChain(segments);
    await this.generateSegmentSummary(newSegment, chain);
  }

  /**
   * 1.6 根据 token 预算返回最优上下文
   */
  async getContextForPrompt(chain: StorySegment[], tokenBudget: number, genre?: string): Promise<string> {
    const { fullTextSegments, groupSummaries, chapterSummaries } =
      await this.buildHierarchicalContext(chain, tokenBudget, 5, 5, genre);

    const parts: string[] = [];

    // 远端章级摘要
    if (chapterSummaries.length > 0) {
      for (const cs of chapterSummaries) {
        parts.push(`【${cs.label}】`);
        const allForeshadowing = groupSummaries.flatMap(gs => gs.keyEvents).slice(0, 15);
        if (allForeshadowing.length > 0) {
          parts.push(`关键伏笔：${allForeshadowing.join('；')}`);
        }
        if (cs.keyEvents.length > 0) {
          parts.push(`重要事件：${cs.keyEvents.join('；')}`);
        }
      }
    }

    // 组级摘要
    for (const gs of groupSummaries) {
      parts.push(gs.summaryText);
    }

    // 分隔符
    if (groupSummaries.length > 0 || chapterSummaries.length > 0) {
      parts.push('--- 以下为近期完整内容 ---');
    }

    // 最近段全文
    for (const seg of fullTextSegments) {
      const title = seg.title ? `【${seg.title}】` : '';
      parts.push(`${title}${seg.content}`);
    }

    return parts.join('\n\n');
  }

  /**
   * 构建有序链（按 parentSegmentId 排序）
   */
  private async buildChain(segments: StorySegment[]): Promise<StorySegment[]> {
    const chain: StorySegment[] = [];
    let current = segments.find(s => !s.parentSegmentId);
    const visited = new Set<string>();
    while (current && !visited.has(current.id)) {
      visited.add(current.id);
      chain.push(current);
      current = segments.find(s => s.parentSegmentId === current!.id);
    }
    return chain;
  }
}

export const contextSummarizer = new ContextSummarizer();
export { estimateTokens, extractSummaryFromSegment, callAI };
