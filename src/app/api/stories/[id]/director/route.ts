import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth-helpers';
import { canViewStory, canEditStory } from '@/lib/permissions';
import prisma from '@/lib/prisma';
import { directorManager } from '@/lib/director-manager';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { id: storyId } = params;
    if (!storyId) {
      return NextResponse.json({ error: '缺少参数' }, { status: 400 });
    }

    const story = await prisma.story.findUnique({ where: { id: storyId } });
    if (!story) return NextResponse.json({ error: '故事不存在' }, { status: 404 });

    if (!canViewStory(story, userId)) {
      return NextResponse.json({ error: '无权查看' }, { status: 403 });
    }

    const state = await directorManager.getOrCreate(storyId);
    return NextResponse.json({ success: true, state });
  } catch (error) {
    console.error('获取导演状态失败:', error);
    return NextResponse.json({ error: '获取导演状态失败' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { id: storyId } = params;
    if (!storyId) {
      return NextResponse.json({ error: '缺少参数' }, { status: 400 });
    }

    const story = await prisma.story.findUnique({ where: { id: storyId } });
    if (!story) return NextResponse.json({ error: '故事不存在' }, { status: 404 });

    if (!canEditStory(story, userId)) {
      return NextResponse.json({ error: '无权编辑' }, { status: 403 });
    }

    const body = await request.json();
    const { characterStates, worldVariables, activeConstraints } = body;

    const updates: any = {};
    if (characterStates) updates.characterStates = characterStates;
    if (worldVariables) updates.worldVariables = worldVariables;
    if (activeConstraints) updates.activeConstraints = activeConstraints;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: '无有效更新字段' }, { status: 400 });
    }

    const state = await directorManager.updateState(storyId, updates);
    if (!state) {
      return NextResponse.json({ error: '更新失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true, state });
  } catch (error) {
    console.error('更新导演状态失败:', error);
    return NextResponse.json({ error: '更新导演状态失败' }, { status: 500 });
  }
}
