import { NextRequest, NextResponse } from 'next/server';
import { storiesStore, segmentsStore } from '@/lib/simple-db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const segments = await segmentsStore.load();
    const storySegments = segments
      .filter((s: any) => s.storyId === params.id)
      .sort((a: any, b: any) => (a.order || 0) - (b.order || 0));

    return NextResponse.json({ success: true, segments: storySegments });
  } catch (error) {
    return NextResponse.json({ error: '获取段落失败' }, { status: 500 });
  }
}
