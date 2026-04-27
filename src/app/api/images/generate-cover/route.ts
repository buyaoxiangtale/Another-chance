import { NextRequest, NextResponse } from 'next/server';
import { generateCoverImage } from '@/lib/cover-generator';

/**
 * POST /api/images/generate-cover
 * 为故事生成封面图，支持 force 参数强制重新生成
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { storyId, force } = body;

  if (!storyId) {
    return NextResponse.json({ error: '缺少 storyId' }, { status: 400 });
  }

  const result = await generateCoverImage(storyId, { force: !!force });

  if (result.success) {
    return NextResponse.json({ success: true, coverImageUrl: result.coverImageUrl });
  } else {
    return NextResponse.json(
      { error: result.error || '封面图生成失败' },
      { status: 500 },
    );
  }
}
