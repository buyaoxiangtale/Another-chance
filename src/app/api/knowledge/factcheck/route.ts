import { NextRequest, NextResponse } from 'next/server';
import { extractHistoricalEntities, factCheckEntities } from '@/lib/mcp-wikipedia';

/**
 * 4.9 事实校验 API
 * POST /api/knowledge/factcheck
 * Body: { text: string, era?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, era } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ success: false, error: '请提供 text 字段' }, { status: 400 });
    }

    // 提取实体
    const entities = extractHistoricalEntities(text);

    // 事实校验
    const factResults = await factCheckEntities(entities, era);

    return NextResponse.json({
      success: true,
      entities,
      facts: factResults,
      suggestions: generateSuggestions(factResults),
    });
  } catch (error) {
    console.error('事实校验失败:', error);
    return NextResponse.json({ error: '事实校验失败', details: error instanceof Error ? error.message : '未知错误' }, { status: 500 });
  }
}

function generateSuggestions(facts: Array<{ name: string; summary: string; confidence: number }>): string[] {
  return facts
    .filter(f => f.summary && f.confidence >= 0.5)
    .map(f => `${f.name}：${f.summary}`);
}
