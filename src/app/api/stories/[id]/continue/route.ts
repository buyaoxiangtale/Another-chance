import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/auth-helpers';
import { canViewStory } from '@/lib/permissions';
import { getOrderedChain } from '@/lib/chain-helpers';
import { buildFullPrompt } from '@/lib/prompt-builder';
import { directorManager } from '@/lib/director-manager';
import { timelineEngine } from '@/lib/timeline-engine';
import { consistencyChecker } from '@/lib/consistency-checker';
import { callAIText } from '@/lib/ai-client';
import { classifyGenre } from '@/lib/genre-config';
import { characterManager } from '@/lib/character-engine';
import { EventTracker } from '@/lib/event-tracker';
import type { StorySegment } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { id: storyId } = params;
    const { branchId = 'main', pacingConfig, directorOverrides } = await request.json();

    if (!storyId) {
      return NextResponse.json({ error: '缺少参数' }, { status: 400 });
    }

    const story = await prisma.story.findUnique({ where: { id: storyId } });
    if (!story) return NextResponse.json({ error: '故事不存在' }, { status: 404 });

    if (!canViewStory(story, userId)) {
      return NextResponse.json({ error: '无权查看' }, { status: 403 });
    }

    const chain = await getOrderedChain(storyId, branchId);
    if (chain.length === 0) {
      return NextResponse.json({ error: '该分支没有段落' }, { status: 404 });
    }
    const tailSegment = chain[chain.length - 1];

    // Consistency check
    let consistencyWarnings: string[] = [];
    try {
      const preIssues = await consistencyChecker.checkChainConsistency(chain as any);
      if (preIssues.length > 0) {
        consistencyWarnings = preIssues.map((i: any) => `[${i.severity}] ${i.description}`);
      }
    } catch (e) {
      console.warn('[continue] 矛盾检测失败:', e);
    }

    // Timeline check
    let timelineWarnings: string[] = [];
    try {
      const violations = await timelineEngine.validateTimeline(storyId, branchId);
      if (violations.length > 0) {
        timelineWarnings = violations.map((v: any) => v.issue);
      }
    } catch (e) {
      console.warn('[continue] 时间轴校验失败:', e);
    }

    // Build prompt
    let prompt: string;
    if (pacingConfig || directorOverrides) {
      prompt = (await buildFullPrompt({
        storyId,
        branchId,
        tailSegment: tailSegment as any,
        chain: chain as any,
        storyTitle: story.title,
        storyDescription: story.description ?? undefined,
        pacingConfig,
        directorOverrides,
      })).prompt;
    } else {
      const genre = story.genre || '';
      const description = story.description || '';
      const { isFiction } = classifyGenre(genre, description);
      const styleHint = isFiction
        ? '请用现代白话文续写'
        : '请用古风文体续写';

      const contextSummary = chain.map((s: StorySegment) =>
        `${s.title ? `【${s.title}】` : ''}${s.content}`,
      ).join('\n');

      const continuityHint = branchId !== 'main'
        ? '，延续本分支的独立叙事，只使用前文已出现的角色'
        : '，与前文情节连续。';

      prompt = `故事标题：${story.title}\n故事背景：${story.description || ''}\n\n当前故事进展：\n${contextSummary}\n\n${styleHint}下一段（150-300字）${continuityHint}`;
    }

    const maxTokens = pacingConfig?.pace === 'detailed' ? 4000 : 2000;

    const _genre = story.genre || '';
    const _desc = story.description || '';
    const { isFiction: _isFiction } = classifyGenre(_genre, _desc);
    const systemPrompt = _isFiction
      ? '你是一位专业的文学作家。请用中文回答，用现代白话文写作，保持与前文的风格和情节连续性。'
      : '你是一位擅长中国历史题材的文学作家。请用中文回答，保持与前文的风格和情节连续性。';

    const aiResponse = await callAIText(prompt, {
      systemPrompt,
      maxTokens,
      story: story as any,
    });

    if (!aiResponse || aiResponse.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: 'AI 未生成有效内容，请重试',
        warnings: { consistency: consistencyWarnings, timeline: timelineWarnings },
      }, { status: 500 });
    }

    let mentionedIds: string[] = [];
    try {
      const mentioned = await characterManager.discoverAndRegisterCharacters(
        storyId,
        aiResponse,
        (p: string) => callAIText(p, { maxTokens: 1200, story: story as any }),
        {
          genre: story.genre ?? undefined,
          storyDescription: story.description ?? undefined,
          callAIWithWebSearchFn: (p: string) => callAIText(p, { maxTokens: 1500, story: story as any, webSearch: true }),
        },
      );
      mentionedIds = mentioned.map(c => c.id);
    } catch (e) {
      console.warn('[continue] 角色发现/注册失败:', e);
    }

    // 乐观锁：确认 tail 没有被其他请求抢先追加
    const currentChain = await getOrderedChain(storyId, branchId);
    const currentTail = currentChain[currentChain.length - 1];
    if (currentTail?.id !== tailSegment.id) {
      return NextResponse.json({
        success: false,
        error: '该分支已有新内容产生，请刷新页面后重试',
      }, { status: 409 });
    }

    const newSegment = await prisma.storySegment.create({
      data: {
        storyId,
        title: '故事续写',
        content: aiResponse,
        isBranchPoint: false,
        branchId,
        parentSegmentId: tailSegment.id,
        imageUrls: [],
        narrativePace: pacingConfig?.pace,
        mood: pacingConfig?.mood,
        visibility: story.visibility,
        characterIds: mentionedIds,
      },
    });

    if (mentionedIds.length > 0) {
      characterManager
        .inferAndUpdateStatesForSegment(storyId, newSegment.id, aiResponse, (p: string) =>
          callAIText(p, { maxTokens: 1200, story: story as any })
        )
        .catch((e: any) => console.warn('[continue] 角色状态更新失败:', e));
    }

    // 场景状态更新必须 await，确保后续 images/generate 能读到最新值
    try {
      await directorManager.updateSceneState(storyId, aiResponse, (p: string) =>
        callAIText(p, { maxTokens: 1200, story: story as any })
      );
    } catch (e) {
      console.warn('[continue] 场景状态更新失败:', e);
    }

    // 关键事件提取与持久化（fire-and-forget）
    new EventTracker()
      .processSegment(storyId, branchId, {
        id: newSegment.id,
        content: aiResponse,
        characterIds: mentionedIds,
      })
      .catch((e: any) => console.warn('[continue] 事件提取失败:', e));

    // Post-write consistency check
    try {
      const postIssues = await consistencyChecker.runConsistencyCheck(newSegment as any, [...chain, newSegment] as any);
      if (postIssues.length > 0) {
        consistencyWarnings.push(...postIssues.map((i: any) => `[${i.severity}] ${i.description}`));
      }
    } catch (e) {
      console.warn('[continue] 新内容矛盾检测失败:', e);
    }

    return NextResponse.json({
      success: true,
      segment: newSegment,
      warnings: { consistency: consistencyWarnings, timeline: timelineWarnings },
    });
  } catch (error) {
    console.error('故事续写失败:', error);
    return NextResponse.json(
      { error: '故事续写失败', details: String(error) },
      { status: 500 },
    );
  }
}
