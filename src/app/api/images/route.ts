import { NextRequest, NextResponse } from 'next/server';
import { segmentsStore } from '@/lib/simple-db';

/**
 * GET /api/images?segmentId=xxx
 * 获取指定段落的图片数据（从 segment.imageUrls 字段读取）
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const segmentId = searchParams.get('segmentId');

    if (!segmentId) {
      return NextResponse.json(
        { error: '缺少 segmentId 参数' },
        { status: 400 }
      );
    }

    const segments = await segmentsStore.load();
    const segment = segments.find((s: any) => s.id === segmentId);

    if (!segment) {
      return NextResponse.json(
        { error: '段落不存在' },
        { status: 404 }
      );
    }

    const imageUrls: string[] = segment.imageUrls || [];
    const images = imageUrls.map((url, i) => ({
      id: `img_${segmentId}_${i}`,
      url,
      description: '',
      type: 'scene' as const,
      width: 1024,
      height: 1024,
      alt: `插图 ${i + 1}`,
    }));

    return NextResponse.json({
      success: true,
      segmentId,
      images,
      totalCount: images.length,
    });
  } catch (error) {
    console.error('获取图片失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: '获取图片失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}
