import { NextRequest, NextResponse } from 'next/server';
import { storiesStore } from '@/lib/simple-db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const stories = await storiesStore.load();
    const story = stories.find((s: any) => s.id === params.id);

    if (!story) {
      return NextResponse.json({ error: '故事不存在' }, { status: 404 });
    }

    return NextResponse.json({ success: true, story });
  } catch (error) {
    return NextResponse.json({ error: '获取故事失败' }, { status: 500 });
  }
}
