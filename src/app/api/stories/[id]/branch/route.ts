import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/auth-helpers';
import { canViewStory, canCreateBranch } from '@/lib/permissions';
import { getOrderedChain } from '@/lib/chain-helpers';
import { characterManager } from '@/lib/character-engine';
import { buildFullPrompt, correctCharacterNames } from '@/lib/prompt-builder';
import { callAIText } from '@/lib/ai-client';
import { triggerBackup } from '@/lib/auto-backup';
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
    const { segmentId, userDirection, branchTitle, model, visibility } = await request.json();

    if (!storyId || !segmentId || !userDirection) {
      return NextResponse.json({ error: '缺少必要参数: segmentId, userDirection' }, { status: 400 });
    }

    const story = await prisma.story.findUnique({ where: { id: storyId } });
    if (!story) return NextResponse.json({ error: '故事不存在' }, { status: 404 });

    if (!canCreateBranch(story, userId)) {
      return NextResponse.json({ error: '无权创建分支' }, { status: 403 });
    }

    const currentSegment = await prisma.storySegment.findUnique({ where: { id: segmentId } });
    if (!currentSegment || currentSegment.storyId !== storyId) {
      return NextResponse.json({ error: '段落不存在' }, { status: 404 });
    }

    const branchId = `branch_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    // Snapshot character states
    let characterStateSnapshot: any = undefined;
    try {
      characterStateSnapshot = await characterManager.snapshotCharacterStates(storyId, 'main', segmentId);
    } catch (e) {
      console.warn('[branch] 角色快照失败:', e);
    }

    // Create branch record
    const newBranch = await prisma.storyBranch.create({
      data: {
        id: branchId,
        title: branchTitle || `分叉: ${userDirection}`,
        sourceSegmentId: segmentId,
        storyId,
        userDirection,
        characterStateSnapshot,
        ownerId: userId,
        visibility: visibility || 'PRIVATE',
        model: model || null,
      },
    });

    // Mark source segment as branch point
    await prisma.storySegment.update({
      where: { id: segmentId },
      data: { isBranchPoint: true },
    });

    // Build context
    const mainChain = await getOrderedChain(storyId, 'main');
    const idx = mainChain.findIndex((s) => s.id === segmentId);
    const relevantChain = idx >= 0 ? mainChain.slice(0, idx + 1) : mainChain;

    const tailSegment = relevantChain[relevantChain.length - 1];
    const { prompt, registeredCharacterNames } = await buildFullPrompt({
      storyId,
      branchId,
      tailSegment: tailSegment as any,
      chain: relevantChain as any,
      storyTitle: story.title,
      storyDescription: story.description ?? undefined,
      branchMode: 'branchCreation',
      branchDirection: userDirection,
    });

    let aiContent = await callAIText(prompt, { maxTokens: 2000, story: story as any });

    // 角色名自动纠错：仅使用注册角色名，避免启发式提取的误报导致级联替换
    if (aiContent && registeredCharacterNames.length > 0) {
      aiContent = correctCharacterNames(aiContent, registeredCharacterNames);
    }

    if (!aiContent || aiContent.trim().length === 0) {
      await prisma.storyBranch.delete({ where: { id: branchId } });
      return NextResponse.json({ error: 'AI 未生成有效内容，分叉失败，请重试' }, { status: 500 });
    }

    const newSegment = await prisma.storySegment.create({
      data: {
        storyId,
        title: branchTitle || `分叉: ${userDirection}`,
        content: aiContent,
        isBranchPoint: false,
        branchId,
        parentSegmentId: segmentId,
        imageUrls: [],
        visibility: 'PRIVATE',
      },
    });

    // Discover and register characters in the generated content
    let mentionedIds: string[] = [];
    try {
      const mentioned = await characterManager.discoverAndRegisterCharacters(
        storyId,
        aiContent,
        (p: string) => callAIText(p, { maxTokens: 1200, story: story as any }),
        {
          genre: story.genre ?? undefined,
          storyDescription: story.description ?? undefined,
          callAIWithWebSearchFn: (p: string) => callAIText(p, { maxTokens: 1500, story: story as any, webSearch: true }),
        },
      );
      mentionedIds = mentioned.map(c => c.id);
    } catch (e) {
      console.warn('[branch] 角色发现/注册失败:', e);
    }

    // Update segment with character IDs
    if (mentionedIds.length > 0) {
      await prisma.storySegment.update({
        where: { id: newSegment.id },
        data: { characterIds: mentionedIds },
      });
    }

    triggerBackup();
    return NextResponse.json({
      success: true,
      branch: newBranch,
      segment: newSegment,
      message: '分支创建成功',
    });
  } catch (error) {
    console.error('故事分叉失败:', error);
    return NextResponse.json(
      { error: '故事分叉失败', details: error instanceof Error ? error.message : '未知错误' },
      { status: 500 },
    );
  }
}
