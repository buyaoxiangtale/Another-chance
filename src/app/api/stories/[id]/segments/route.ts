import { NextRequest, NextResponse } from 'next/server';
import { storiesStore, segmentsStore, getSegmentsByBranch, type StorySegment } from '@/lib/simple-db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId') || 'main';

    // 如果需要获取所有分支的段落
    if (branchId === 'all') {
      const segments = await segmentsStore.load();
      const storySegments = segments
        .filter((s: StorySegment) => s.storyId === params.id)
        .sort((a: StorySegment, b: StorySegment) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      return NextResponse.json({ success: true, segments: storySegments });
    }

    // 按分支获取段落
    const branchSegments = await getSegmentsByBranch(branchId);
    const storySegments = branchSegments
      .filter((s: StorySegment) => s.storyId === params.id)
      .sort((a: StorySegment, b: StorySegment) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    return NextResponse.json({ success: true, segments: storySegments, branchId });
  } catch (error) {
    console.error('获取段落失败:', error);
    return NextResponse.json({ 
      error: '获取段落失败',
      details: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 });
  }
}
