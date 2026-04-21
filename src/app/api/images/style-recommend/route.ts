import { NextRequest, NextResponse } from 'next/server';
import { analyzeStoryStyle, IMAGE_STYLES, type ImageStyle } from '@/lib/image-generator';

export async function POST(request: NextRequest) {
  try {
    const { content } = await request.json();

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: '缺少 content 参数' }, { status: 400 });
    }

    const { recommendedStyle, reason, confidence } = analyzeStoryStyle(content);

    // 计算各风格匹配分数
    const allStyles = IMAGE_STYLES.map(s => ({
      value: s.value,
      label: s.label,
      matchScore: s.value === recommendedStyle ? confidence : 0,
    }));

    return NextResponse.json({
      recommendedStyle,
      reason,
      confidence,
      allStyles,
    });
  } catch (error) {
    console.error('风格推荐失败:', error);
    return NextResponse.json({ error: '风格推荐失败' }, { status: 500 });
  }
}
