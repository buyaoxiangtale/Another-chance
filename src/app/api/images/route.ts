import { NextRequest, NextResponse } from 'next/server';

// 获取指定段落的图片
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

    // 这里预留了从数据库获取图片的逻辑
    // 实际实现时，会从 StorySegment 的 imageUrls 和 imageMetadata 字段中获取图片数据
    
    // 模拟图片数据
    const images = [
      {
        id: `img_${Date.now()}_1`,
        segmentId,
        url: '/api/placeholder/scene-1.jpg',
        description: '历史场景插图',
        type: 'scene' as const,
        width: 800,
        height: 600,
        alt: '历史场景描述',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    return NextResponse.json({
      success: true,
      segmentId,
      images,
      totalCount: images.length
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