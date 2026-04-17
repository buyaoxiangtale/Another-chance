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
 * AI 调用方法，复用项目已有的 AI 调用配置
 */
async function callAI(prompt: string, maxTokens: number = 1000, systemPrompt?: string, genre?: string): Promise<string> {
  const baseUrl = process.env.AI_BASE_URL || 'https://api.openai.com/v1';
  const apiKey = process.env.AI_API_KEY || '';
  const model = process.env.AI_MODEL || 'gpt-3.5-turbo';

  // 根据故事类型调整参数 (2.5)
  let temperature = 0.5; // 默认值
  let top_p = 0.85;
  let frequency_penalty = 0.3;

  if (genre) {
    const fictionKeywords = ['演义', '架空', '同人', '玄幻', '仙侠', '魔幻', '穿越', '重生', '武侠', '架空历史', '奇幻', '轻小说', '网文'];
    const isFiction = fictionKeywords.some(k => genre.includes(k));
    
    if (isFiction) {
      // 同人类：允许更多创意
      temperature = 0.6;
      top_p = 0.9;
    } else {
      // 正史类：更严格，减少随机性
      temperature = 0.4;
      top_p = 0.8;
    }
  }

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt || '你是一位擅长文学创作的故事摘要专家。请用中文回答，提取故事段落的关键信息。' },
        { role: 'user', content: prompt }
      ],
      temperature,
      top_p,
      frequency_penalty,
      max_tokens: maxTokens
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AI API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

/**
 * 对单个段落生成摘要（AI 驱动，包含关键事件、角色行动、场景描写、伏笔、情感变化）
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
 * 使用 AI 生成段落摘要（1.2 改造 extractSummaryFromSegment 为 generateAISummary）
 */
async function generateAISummary(segment: StorySegment, chain: StorySegment[], genre?: string): Promise<SegmentSummary> {
  // 先尝试从缓存获取
  const all = await summariesStore.load();
  const cached = all.find(
    (s: SegmentSummary) => s.segmentId === segment.id && s.branchId === segment.branchId
  );
  if (cached && cached.updatedAt > new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) {
    return cached;
  }

  try {
    // 构建AI prompt
    const prompt = AISUMMARY_PROMPT.replace('{{content}}', segment.content);
    
    // 调用 AI 生成结构化摘要
    const aiResponse = await callAI(prompt, 800, undefined, genre);
    
    // 解析 AI 返回的 JSON
    let summary: any;
    try {
      summary = JSON.parse(aiResponse);
    } catch (e) {
      console.warn('AI 摘要 JSON 解析失败，使用 fallback:', e);
      throw new Error('AI response parsing failed');
    }

    // 生成摘要文本
    const summaryParts: string[] = [];
    if (segment.title) summaryParts.push(`【${segment.title}】`);
    summaryParts.push(segment.content.length > 100 ? segment.content.slice(0, 100) + '...' : segment.content);
    
    if (summary.events && summary.events.length > 0) {
      summaryParts.push(`关键事件：${summary.events.join('；')}`);
    }
    if (summary.characterActions && summary.characterActions.length > 0) {
      summaryParts.push(`角色行动：${summary.characterActions.join('；')}`);
    }
    if (summary.scenes && summary.scenes.length > 0) {
      summaryParts.push(`场景描写：${summary.scenes.join('；')}`);
    }
    if (summary.foreshadowing && summary.foreshadowing.length > 0) {
      summaryParts.push(`伏笔：${summary.foreshadowing.join('；')}`);
    }
    if (summary.moodChanges && summary.moodChanges.length > 0) {
      summaryParts.push(`情感变化：${summary.moodChanges.join('；')}`);
    }

    const summaryText = summaryParts.join('\n');

    const result: SegmentSummary = {
      segmentId: segment.id,
      storyId: segment.storyId,
      branchId: segment.branchId,
      chainIndex: chain.findIndex(s => s.id === segment.id),
      summaryText,
      characterActions: summary.characterActions || [],
      keyEvents: summary.events || [],
      stateChanges: [...(summary.scenes || []), ...(summary.moodChanges || [])],
      tokenCount: estimateTokens(summaryText),
      originalTokenCount: estimateTokens(segment.content),
      aiGenerated: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 持久化到缓存
    const idx = all.findIndex(
      (s: SegmentSummary) => s.segmentId === segment.id && s.branchId === segment.branchId
    );
    if (idx >= 0) {
      all[idx] = result;
    } else {
      all.push(result);
    }
    await summariesStore.save(all);

    return result;

  } catch (error) {
    console.warn('AI 摘要生成失败，使用 fallback:', error);
    // AI 调用失败时降级为现有的正则提取（1.5 fallback 机制）
    return extractSummaryFromSegment(segment, chain);
  }
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
   * 1.2 对单个段落生成摘要（AI 驱动）
   */
  async generateSegmentSummary(segment: StorySegment, chain: StorySegment[], genre?: string): Promise<SegmentSummary> {
    return await generateAISummary(segment, chain, genre);
  }

  /**
   * 1.3 分层上下文构建：最近 N 段保留全文，更早的段落用层级摘要
   * @param recentCount 最近保留全文的段落数（已从3增加到5）
   * @param groupSize 每组包含的段落数（用于组级摘要）
   */
  async buildHierarchicalContext(
    chain: StorySegment[],
    maxTokens: number,
    recentCount: number = 5, // 1.6 增加全文保留段落数：从3改为5
    groupSize: number = 5,
    genre?: string
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

    // 1.7 改进组级摘要：每组摘要从简单拼接改为 AI 生成连贯摘要
    const aiGroupSummaries = await this.generateAIGroupSummaries(olderSummaries, groupSize, remainingTokens, genre);

    // 构建组级摘要
    for (const groupSummary of aiGroupSummaries) {
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
   * 1.7 AI 生成连贯的组级摘要
   */
  private async generateAIGroupSummaries(summaries: SegmentSummary[], groupSize: number, tokenBudget: number, genre?: string): Promise<GroupSummary[]> {
    const groups: GroupSummary[] = [];
    
    for (let i = 0; i < summaries.length; i += groupSize) {
      const group = summaries.slice(i, i + groupSize);
      const groupTexts = group.map(s => s.summaryText).join('\n\n');
      
      if (tokenBudget < 500) { // 剩余 token 不足时跳过 AI 处理
        const label = `段落 ${i + 1}-${Math.min(i + groupSize, summaries.length)}`;
        groups.push(this.createSimpleGroupSummary(group, label));
        continue;
      }

      try {
        // AI 生成连贯摘要
        const prompt = `请将以下 ${group.length} 个段落摘要合并为一个连贯的摘要：

${groupTexts}

要求：
1. 保持原有的关键事件、角色行动、伏笔信息
2. 使摘要内容更加连贯流畅
3. 突出重要的人物关系和情节发展
4. 控制在 200 字以内

请只输出合并后的摘要文本：`;

        const aiResponse = await callAI(prompt, 300, undefined, genre);
        
        const label = `段落 ${i + 1}-${Math.min(i + groupSize, summaries.length)}`;
        const groupSummary: GroupSummary = {
          label,
          segmentIds: group.map(s => s.segmentId),
          summaryText: aiResponse,
          keyEvents: group.flatMap(s => s.keyEvents).slice(0, 10),
          stateChanges: group.flatMap(s => s.stateChanges).slice(0, 10),
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
  private createSimpleGroupSummary(summaries: SegmentSummary[], label: string): GroupSummary {
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
   * 1.6 根据 token 预算返回最优上下文（已更新 recentCount=5）
   */
  async getContextForPrompt(chain: StorySegment[], tokenBudget: number): Promise<string> {
    const { fullTextSegments, groupSummaries, chapterSummaries } =
      await this.buildHierarchicalContext(chain, tokenBudget);

    const parts: string[] = [];

    // 1.8 改进远端章级摘要：提取关键伏笔和未闭合的情节线
    if (chapterSummaries.length > 0) {
      for (const cs of chapterSummaries) {
        parts.push(`【${cs.label}】`);
        
        // 提取远端关键伏笔
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
export { estimateTokens, extractSummaryFromSegment, mergeSummaries, generateAISummary, callAI };
