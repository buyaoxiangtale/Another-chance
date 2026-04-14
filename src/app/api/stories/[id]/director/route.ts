import { NextRequest, NextResponse } from 'next/server';
import { directorManager } from '@/lib/director-manager';

/**
 * 5.6 导演模式 API
 * GET  — 获取当前导演状态
 * PATCH — 更新角色状态/世界变量/约束
 */

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: storyId } = params;
    if (!storyId) {
      return NextResponse.json({ error: '缺少参数' }, { status: 400 });
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
  { params }: { params: { id: string } }
) {
  try {
    const { id: storyId } = params;
    if (!storyId) {
      return NextResponse.json({ error: '缺少参数' }, { status: 400 });
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
