import { NextRequest, NextResponse } from 'next/server';
import { searchWikipedia, getWikiArticle } from '@/lib/mcp-wikipedia';

/**
 * 4.8 知识检索 API
 * GET /api/knowledge/search?q=xxx&lang=zh
 * GET /api/knowledge/search?title=xxx&lang=zh
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const title = searchParams.get('title');
    const lang = searchParams.get('lang') || 'zh';

    if (query) {
      const results = await searchWikipedia(query, lang);
      return NextResponse.json({ success: true, results });
    }

    if (title) {
      const article = await getWikiArticle(title, lang);
      if (!article) {
        return NextResponse.json({ success: false, error: '未找到文章' }, { status: 404 });
      }
      return NextResponse.json({ success: true, article });
    }

    return NextResponse.json({ success: false, error: '请提供 q（搜索）或 title（文章详情）参数' }, { status: 400 });
  } catch (error) {
    console.error('知识检索失败:', error);
    return NextResponse.json({ error: '知识检索失败', details: error instanceof Error ? error.message : '未知错误' }, { status: 500 });
  }
}
