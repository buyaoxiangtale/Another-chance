import { NextRequest, NextResponse } from 'next/server';
import { storiesStore, segmentsStore, getOrderedChain, type StorySegment } from '@/lib/simple-db';
import { buildFullPrompt } from '@/lib/prompt-builder';
import { directorManager } from '@/lib/director-manager';
import { timelineEngine } from '@/lib/timeline-engine';
import { consistencyChecker } from '@/lib/consistency-checker';
import { callAIText } from '@/lib/ai-client';

/**
 * 5.1 改造 continue route — 支持 pacingConfig 和 directorOverrides 参数
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id: storyId } = params;
    const { branchId = 'main', pacingConfig, directorOverrides } = await request.json();

    if (!storyId) {
      return NextResponse.json({ error: '缺少参数' }, { status: 400 });
    }

    const stories = await storiesStore.load();
    const story = stories.find((s: any) => s.id === storyId);
    if (!story) return NextResponse.json({ error: '故事不存在' }, { status: 404 });

    const chain = await getOrderedChain(storyId, branchId);
    if (chain.length === 0) {
      return NextResponse.json({ error: '该分支没有段落' }, { status: 404 });
    }
    const tailSegment = chain[chain.length - 1];

    // C3: 矛盾检测 — 续写前检测前文矛盾
    let consistencyWarnings: string[] = [];
    try {
      const preIssues = await consistencyChecker.checkChainConsistency(chain);
      if (preIssues.length > 0) {
        consistencyWarnings = preIssues.map(i => `[${i.severity}] ${i.description}`);
        console.warn(`[continue] 前文矛盾检测: ${consistencyWarnings.join('; ')}`);
      }
    } catch (e) {
      console.warn('[continue] 前文矛盾检测失败（非致命）:', e);
    }

    // 8.4 时间轴校验
    let timelineWarnings: string[] = [];
    try {
      const violations = await timelineEngine.validateTimeline(storyId, branchId);
      if (violations.length > 0) {
        timelineWarnings = violations.map(v => v.issue);
        console.warn(`[continue] 时间轴校验警告: ${timelineWarnings.join('; ')}`);
      }
    } catch (e) {
      console.warn('[continue] 时间轴校验失败（非致命）:', e);
    }

    // 5.8 使用集成 prompt 构建
    let prompt: string;
    if (pacingConfig || directorOverrides) {
      prompt = await buildFullPrompt({
        storyId,
        branchId,
        tailSegment,
        chain,
        storyTitle: story.title,
        storyDescription: story.description,
        pacingConfig,
        directorOverrides,
      });
    } else {
      // 向后兼容：不传 pacingConfig 时使用原始逻辑
      const genre = (story as any)?.genre || '';
      const fictionKeywords = ['演义', '架空', '同人', '玄幻', '仙侠', '魔幻', '穿越', '重生', '武侠', '奇幻', '轻小说', '网文'];
      const isFiction = fictionKeywords.some(k => genre.includes(k));
      const styleHint = isFiction
        ? '请用现代白话文续写'
        : '请用古风文体续写';

      const contextSummary = chain.map((s: StorySegment) =>
        `${s.title ? `【${s.title}】` : ''}${s.content}`
      ).join('\n');

      prompt = `故事标题：${story.title}
故事背景：${story.description || ''}

当前故事进展：
${contextSummary}

${styleHint}下一段（150-300字），与前文情节连续。`;
    }

    // 根据 pacingConfig 调整 max_tokens
    const maxTokens = pacingConfig?.pace === 'detailed' ? 4000 : 2000;
    const aiResponse = await callAIText(prompt, {
      systemPrompt: '你是一位擅长中国历史题材的文学作家。请用中文回答，保持与前文的风格和情节连续性。',
      maxTokens,
      story
    });

    const segments = await segmentsStore.load();

    // 检查 AI 返回内容是否为空
    if (!aiResponse || aiResponse.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: 'AI 未生成有效内容，请重试',
        warnings: {
          consistency: consistencyWarnings,
          timeline: timelineWarnings,
        }
      }, { status: 500 });
    }

    const newSegment: StorySegment = {
      id: `seg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      storyId,
      title: '故事续写',
      content: aiResponse,
      isBranchPoint: false,
      branchId,
      parentSegmentId: tailSegment.id,
      imageUrls: [],
      // 5.1 记录节奏和情绪
      narrativePace: pacingConfig?.pace,
      mood: pacingConfig?.mood,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    segments.push(newSegment);
    await segmentsStore.save(segments);

    // C3: 续写后检测新内容矛盾
    try {
      const postIssues = await consistencyChecker.runConsistencyCheck(newSegment, [...chain, newSegment]);
      if (postIssues.length > 0) {
        const newWarnings = postIssues.map(i => `[${i.severity}] ${i.description}`);
        consistencyWarnings.push(...newWarnings);
        console.warn(`[continue] 新内容矛盾检测: ${newWarnings.join('; ')}`);
      }
    } catch (e) {
      console.warn('[continue] 新内容矛盾检测失败（非致命）:', e);
    }

    return NextResponse.json({
      success: true,
      segment: newSegment,
      warnings: {
        consistency: consistencyWarnings,
        timeline: timelineWarnings,
      }
    });

  } catch (error) {
    console.error('故事续写失败:', error);
    return NextResponse.json(
      { error: '故事续写失败', details: String(error) },
      { status: 500 }
    );
  }
}
