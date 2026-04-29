import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/auth-helpers';
import { canViewStory, canEditStory } from '@/lib/permissions';
import { getOrderedChain } from '@/lib/chain-helpers';
import { triggerBackup } from '@/lib/auto-backup';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const userId = await getUserIdFromRequest(request);
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId') || 'main';
    const all = searchParams.get('all');

    const story = await prisma.story.findUnique({ where: { id: params.id } });
    if (!story) {
      return NextResponse.json({ error: '故事不存在' }, { status: 404 });
    }
    if (!canViewStory(story, userId ?? undefined)) {
      return NextResponse.json({ error: '无权查看' }, { status: 403 });
    }

    if (all) {
      const segments = await prisma.storySegment.findMany({
        where: { storyId: params.id },
        orderBy: { createdAt: 'asc' },
      });
      return NextResponse.json({ success: true, segments });
    }

    const segments = await getOrderedChain(params.id, branchId);
    return NextResponse.json({ success: true, segments, branchId });
  } catch (error) {
    console.error('获取段落失败:', error);
    return NextResponse.json({ error: '获取段落失败' }, { status: 500 });
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

    const { searchParams } = new URL(request.url);
    const segmentId = searchParams.get('segmentId');
    const body = await request.json();
    const { content, title, mood, narrativePace, imageUrls } = body;

    if (!segmentId) {
      return NextResponse.json({ error: '缺少 segmentId 参数' }, { status: 400 });
    }

    const story = await prisma.story.findUnique({ where: { id: params.id } });
    if (!story || !canEditStory(story, userId)) {
      return NextResponse.json({ error: '无权编辑' }, { status: 403 });
    }

    const segment = await prisma.storySegment.findUnique({ where: { id: segmentId } });
    if (!segment || segment.storyId !== params.id) {
      return NextResponse.json({ error: '段落不存在' }, { status: 404 });
    }

    const data: any = { updatedAt: new Date() };
    if (content !== undefined) data.content = content;
    if (title !== undefined) data.title = title;
    if (mood !== undefined) data.mood = mood;
    if (narrativePace !== undefined) data.narrativePace = narrativePace;

    const updated = await prisma.storySegment.update({
      where: { id: segmentId },
      data,
    });

    triggerBackup();
    return NextResponse.json({ success: true, segment: updated });
  } catch (error) {
    console.error('更新段落失败:', error);
    return NextResponse.json({ error: '更新段落失败' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const segmentId = searchParams.get('segmentId');

    if (!segmentId) {
      return NextResponse.json({ error: '缺少 segmentId 参数' }, { status: 400 });
    }

    const story = await prisma.story.findUnique({ where: { id: params.id } });
    if (!story || !canEditStory(story, userId)) {
      return NextResponse.json({ error: '无权编辑' }, { status: 403 });
    }

    const segment = await prisma.storySegment.findUnique({ where: { id: segmentId } });
    if (!segment || segment.storyId !== params.id) {
      return NextResponse.json({ error: '段落不存在' }, { status: 404 });
    }

    if (!segment.parentSegmentId) {
      return NextResponse.json({ error: '不能删除故事开篇段落' }, { status: 400 });
    }

    // Relink children to parent
    const relinked = await prisma.storySegment.updateMany({
      where: { parentSegmentId: segmentId },
      data: { parentSegmentId: segment.parentSegmentId, updatedAt: new Date() },
    });

    await prisma.storySegment.delete({ where: { id: segmentId } });

    triggerBackup();
    return NextResponse.json({
      success: true,
      message: `段落已删除，${relinked.count} 个后续段落已重新链接`,
      deletedSegmentId: segmentId,
      relinkedTo: segment.parentSegmentId,
      relinkedCount: relinked.count,
    });
  } catch (error) {
    console.error('删除段落失败:', error);
    return NextResponse.json({ error: '删除段落失败' }, { status: 500 });
  }
}
