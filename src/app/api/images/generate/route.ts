import { NextRequest, NextResponse } from 'next/server';
import { generateImagesForSegment, IMAGE_STYLES, type ImageStyle } from '@/lib/image-generator';
import { segmentsStore } from '@/lib/simple-db';

/**
 * POST /api/images/generate
 * 为指定段落生成插图，并更新段落的 imageUrls 字段
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { segmentId, segmentContent, style = 'historical-realistic', maxImages = 3 } = body;

    if (!segmentId || !segmentContent) {
      return NextResponse.json(
        { error: '缺少必要的参数: segmentId 和 segmentContent' },
        { status: 400 }
      );
    }

    // 验证 style 是否合法
    const validStyle: ImageStyle = IMAGE_STYLES.find(s => s.value === style)
      ? style as ImageStyle
      : 'historical-realistic';

    // 调用真实的图片生成模块
    const images = await generateImagesForSegment({
      segmentId,
      segmentContent,
      style: validStyle,
      maxImages,
    });

    // 更新段落的 imageUrls 到数据库
    if (images.length > 0) {
      const segments = await segmentsStore.load();
      const idx = segments.findIndex((s: any) => s.id === segmentId);
      if (idx !== -1) {
        segments[idx].imageUrls = images.map(img => img.url);
        segments[idx].updatedAt = new Date().toISOString();
        await segmentsStore.save(segments);
      }
    }

    return NextResponse.json({
      success: true,
      segmentId,
      images: images.map((img, i) => ({
        id: `img_${segmentId}_${i}`,
        url: img.url,
        description: img.description,
        type: img.type,
        width: 1024,
        height: 1024,
        alt: img.description,
      })),
      totalCount: images.length,
    });
  } catch (error) {
    console.error('图片生成失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: '图片生成失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}

// 支持的图片风格选项
export async function OPTIONS() {
  return NextResponse.json({
    allowedMethods: ['POST'],
    supportedStyles: IMAGE_STYLES.map(s => ({ value: s.value, label: s.label })),
  });
}
