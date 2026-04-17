/**
 * C1: 上下文摘要引擎 — ContextSummarizer
 * 管理段落摘要的生成、存储和检索
 */

import { segmentsStore, summariesStore, type StorySegment } from './simple-db';
import type { SegmentSummary, GroupSummary, ChapterSummary } from '@/types/context-summary';

/**
 * 估算文本的 token 数（中文约 1.5 字/token，英文约 4 字符/token）
 */
function estimateTokens(text: string): number {
  const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const otherChars = text.length - chineseChars;
  return Math.ceil(chineseChars / 1.5 + otherChars / 4);
}

/**
 * 对单个段落生成摘要（提取关键事件、角色行动、状态变化）
 * 使用规则提取，不依赖 AI 调用
 */
function extractSummaryFromSegment(segment: StorySegment, chain: StorySegment[]): SegmentSummary {
  const content = segment.content;
  const chainIndex = chain.findIndex(s => s.id === segment.id);

  // 提取角色行动
  const characterActions: string[] = [];
  if (segment.characterIds && segment.characterIds.length > 0) {
    // 提取涉及角色的关键动作描述（简单规则：取段落首尾各几句）
    const sentences = content.split(/[。！？；\n]+/).filter(s => s.trim().length > 0);
    const keySentences = [
      ...sentences.slice(0, 2),
      ...sentences.slice(-2),
    ];
    for (const charId of segment.characterIds) {
      // 查找角色名（从上下文中）
      // 简单规则：不依赖 character-engine 以避免循环依赖
      characterActions.push(`涉及角色[${charId}]：${keySentences.slice(0, 1).join('。')}`);
    }
  }

  // 提取关键事件（简单规则）
  const events: string[] = [];
  const eventPatterns = [
    /[^。]*?死[^。]*?[。！？]/g,
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
  if (segment.timeline) {
    stateChanges.push(`时间推进至${segment.timeline.year}年${segment.timeline.season || ''}`);
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
    segmentId: segment.id,
    storyId: segment.storyId,
    branchId: segment.branchId,
    chainIndex,
    summaryText,
    characterActions,
    keyEvents: events,
    stateChanges,
    tokenCount: estimateTokens(summaryText),
    originalTokenCount: estimateTokens(content),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * 将段落摘要合并为组摘要
 */
function mergeSummaries(summaries: SegmentSummary[], label: string): GroupSummary {
  const summaryTexts = summaries.map(s => s.summaryText);
  const allEvents = summaries.flatMap(s => s.keyEvents);
  const allStateChanges = summaries.flatMap(s => s.stateChanges);

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
 * ContextSummarizer — 上下文摘要引擎
 */
class ContextSummarizer {
  /**
   * 1.2 对单个段落生成摘要
   */
  async generateSegmentSummary(segment: StorySegment, chain: StorySegment[]): Promise<SegmentSummary> {
    const summary = extractSummaryFromSegment(segment, chain);

    // 持久化
    const all = await summariesStore.load();
    const idx = all.findIndex(
      (s: SegmentSummary) => s.segmentId === segment.id && s.branchId === segment.branchId
    );
    if (idx >= 0) {
      all[idx] = summary;
    } else {
      all.push(summary);
    }
    await summariesStore.save(all);

    return summary;
  }

  /**
   * 1.3 分层上下文构建：最近 N 段保留全文，更早的段落用层级摘要
   * @param recentCount 最近保留全文的段落数
   * @param groupSize 每组包含的段落数（用于组级摘要）
   */
  async buildHierarchicalContext(
    chain: StorySegment[],
    maxTokens: number,
    recentCount: number = 3,
    groupSize: number = 5
  ): Promise<{ fullTextSegments: StorySegment[]; groupSummaries: GroupSummary[]; chapterSummaries: ChapterSummary[] }> {
    const fullTextSegments: StorySegment[] = [];
    const groupSummaries: GroupSummary[] = [];
    const chapterSummaries: ChapterSummary[] = [];

    if (chain.length === 0) return { fullTextSegments, groupSummaries, chapterSummaries };

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
    const olderSummaries: SegmentSummary[] = [];
    for (const seg of older) {
      const all = await summariesStore.load();
      let existing = all.find(
        (s: SegmentSummary) => s.segmentId === seg.id && s.branchId === seg.branchId
      );
      if (!existing) {
        existing = await this.generateSegmentSummary(seg, chain);
      }
      olderSummaries.push(existing);
    }

    // 构建组级摘要
    for (let i = 0; i < olderSummaries.length; i += groupSize) {
      const group = olderSummaries.slice(i, i + groupSize);
      const label = `段落 ${i + 1}-${Math.min(i + groupSize, olderSummaries.length)}`;
      const groupSummary = mergeSummaries(group, label);

      if (remainingTokens >= groupSummary.tokenCount) {
        groupSummaries.push(groupSummary);
        remainingTokens -= groupSummary.tokenCount;
      } else {
        // 剩余空间不够，构建章级摘要（更压缩）
        const allGroupSummaries = groupSummaries.map(gs => gs.summaryText);
        const chapterText = `前文概要：${groupSummaries.length} 组摘要 + ${olderSummaries.length - groupSummaries.length * groupSize} 段`;
        const chapterSummary: ChapterSummary = {
          label: '远端前文概要',
          groupCount: Math.ceil(olderSummaries.length / groupSize),
          summaryText: chapterText,
          keyEvents: olderSummaries.flatMap(s => s.keyEvents).slice(0, 20),
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
   * 1.5 新段落写入后自动更新摘要链
   */
  async updateSummariesAfterNewSegment(storyId: string, branchId: string, newSegment: StorySegment): Promise<void> {
    const segments = await segmentsStore.load();
    const storySegments = segments.filter(s => s.storyId === storyId && s.branchId === branchId);

    // 构建有序链
    const chain = await this.buildChain(storySegments);
    const summary = await this.generateSegmentSummary(newSegment, chain);
  }

  /**
   * 1.6 根据 token 预算返回最优上下文
   */
  async getContextForPrompt(chain: StorySegment[], tokenBudget: number): Promise<string> {
    const { fullTextSegments, groupSummaries, chapterSummaries } =
      await this.buildHierarchicalContext(chain, tokenBudget);

    const parts: string[] = [];

    // 远端压缩摘要
    for (const cs of chapterSummaries) {
      parts.push(`【${cs.label}】`);
      if (cs.keyEvents.length > 0) {
        parts.push(`关键事件：${cs.keyEvents.join('；')}`);
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
export { estimateTokens, extractSummaryFromSegment, mergeSummaries };
