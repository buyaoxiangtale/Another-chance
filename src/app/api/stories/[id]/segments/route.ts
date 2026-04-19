import { NextRequest, NextResponse } from 'next/server';
import { segmentsStore, getOrderedChain, getStorySegments, type StorySegment } from '@/lib/simple-db';

/**
 * GET /api/stories/[id]/segments?branchId=main&all=true
 * 获取段落列表
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId') || 'main';
    const all = searchParams.get('all');

    if (all) {
      const segments = await getStorySegments(params.id);
      return NextResponse.json({ success: true, segments });
    }

    const segments = await getOrderedChain(params.id, branchId);
    return NextResponse.json({ success: true, segments, branchId });
  } catch (error) {
    console.error('获取段落失败:', error);
    return NextResponse.json({ 
      error: '获取段落失败',
      details: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 });
  }
}

/**
 * PATCH /api/stories/[id]/segments?segmentId=xxx
 * 编辑段落内容
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const segmentId = searchParams.get('segmentId');
    const body = await request.json();
    const { content, title, mood, narrativePace, imageUrls } = body;

    if (!segmentId) {
      return NextResponse.json({ error: '缺少 segmentId 参数' }, { status: 400 });
    }

    const segments = await segmentsStore.load();
    const idx = segments.findIndex((s: any) => s.id === segmentId && s.storyId === params.id);
    if (idx === -1) {
      return NextResponse.json({ error: '段落不存在' }, { status: 404 });
    }

    // 只更新传入的字段
    if (content !== undefined) segments[idx].content = content;
    if (title !== undefined) segments[idx].title = title;
    if (mood !== undefined) segments[idx].mood = mood;
    if (narrativePace !== undefined) segments[idx].narrativePace = narrativePace;
    if (imageUrls !== undefined) segments[idx].imageUrls = imageUrls;
    segments[idx].updatedAt = new Date().toISOString();

    await segmentsStore.save(segments);
    return NextResponse.json({ success: true, segment: segments[idx] });
  } catch (error) {
    console.error('更新段落失败:', error);
    return NextResponse.json({ error: '更新段落失败' }, { status: 500 });
  }
}

/**
 * DELETE /api/stories/[id]/segments?segmentId=xxx
 * 删除段落，后续段落重新链接到被删除段落的父段落
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const segmentId = searchParams.get('segmentId');

    if (!segmentId) {
      return NextResponse.json({ error: '缺少 segmentId 参数' }, { status: 400 });
    }

    const segments = await segmentsStore.load();
    const idx = segments.findIndex((s: any) => s.id === segmentId && s.storyId === params.id);
    if (idx === -1) {
      return NextResponse.json({ error: '段落不存在' }, { status: 404 });
    }

    const deletedSegment = segments[idx];
    const deletedParentId = deletedSegment.parentSegmentId;

    // 不允许删除根段落（故事开篇）
    if (!deletedParentId) {
      return NextResponse.json({ error: '不能删除故事开篇段落' }, { status: 400 });
    }

    // 将后续段落的 parentSegmentId 重新链接到被删除段落的父段落
    let relinkedCount = 0;
    for (const seg of segments) {
      if (seg.parentSegmentId === segmentId) {
        seg.parentSegmentId = deletedParentId;
        seg.updatedAt = new Date().toISOString();
        relinkedCount++;
      }
    }

    // 删除目标段落
    segments.splice(idx, 1);
    await segmentsStore.save(segments);

    return NextResponse.json({
      success: true,
      message: `段落已删除，${relinkedCount} 个后续段落已重新链接`,
      deletedSegmentId: segmentId,
      relinkedTo: deletedParentId,
      relinkedCount,
    });
  } catch (error) {
    console.error('删除段落失败:', error);
    return NextResponse.json({ error: '删除段落失败' }, { status: 500 });
  }
}
