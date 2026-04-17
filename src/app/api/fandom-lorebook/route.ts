import { NextRequest, NextResponse } from 'next/server';
import { fandomLorebook } from '@/lib/fandom-lorebook';

/**
 * GET /api/fandom-lorebook?fandom=火影忍者&topic=角色
 * GET /api/fandom-lorebook?search=带土
 * GET /api/fandom-lorebook — 列出所有作品
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fandom = searchParams.get('fandom');
    const topic = searchParams.get('topic');
    const search = searchParams.get('search');

    if (search) {
      const results = await fandomLorebook.search(search);
      return NextResponse.json({ success: true, results });
    }

    if (fandom && topic) {
      const results = await fandomLorebook.getByTopic(fandom, topic);
      return NextResponse.json({ success: true, results });
    }

    if (fandom) {
      const results = await fandomLorebook.getEntries(fandom);
      return NextResponse.json({ success: true, results });
    }

    // 列出所有作品
    const fandoms = await fandomLorebook.getFandoms();
    return NextResponse.json({ success: true, fandoms });
  } catch (error) {
    return NextResponse.json({ error: '查询失败' }, { status: 500 });
  }
}

/**
 * POST /api/fandom-lorebook — 新增条目
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fandom, topic, title, content, tags, keywords } = body;

    if (!fandom || !title || !content) {
      return NextResponse.json({ error: 'fandom、title、content 为必填项' }, { status: 400 });
    }

    const entry = await fandomLorebook.addEntry({
      fandom,
      topic: topic || '其他',
      title,
      content,
      tags: tags || [],
      keywords: keywords || [],
    });

    return NextResponse.json({ success: true, entry }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: '新增失败' }, { status: 500 });
  }
}
