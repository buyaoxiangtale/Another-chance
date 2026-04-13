import { NextRequest, NextResponse } from 'next/server';
import { getOrderedChain, getStorySegments, type StorySegment } from '@/lib/simple-db';

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
