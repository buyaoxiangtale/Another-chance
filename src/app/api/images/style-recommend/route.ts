import { NextRequest, NextResponse } from 'next/server';
import { analyzeStoryStyle, IMAGE_STYLES, type ImageStyle } from '@/lib/image-generator';

export async function POST(request: NextRequest) {
  try {
    const { content } = await request.json();

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: '缺少 content 参数' }, { status: 400 });
    }

    const { recommendedStyle, reason, confidence, allScores } = analyzeStoryStyle(content);

    // 计算各风格匹配分数，按分数排序
    const allStyles = (allScores || [])
      .map(s => {
        const meta = IMAGE_STYLES.find(st => st.value === s.style);
        return {
          value: s.style,
          label: meta?.label || s.style,
          icon: meta?.icon || '',
          category: meta?.category || '',
          matchScore: s.score,
        };
      })
      .sort((a, b) => b.matchScore - a.matchScore);

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
