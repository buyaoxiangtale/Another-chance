import { NextRequest, NextResponse } from 'next/server';
import { lorebook } from '@/lib/lorebook';

// GET 查询设定集条目
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const era = searchParams.get('era') || undefined;
    const topics = searchParams.get('topics')?.split(',').filter(Boolean) || undefined;
    const keyword = searchParams.get('keyword') || undefined;

    let entries;
    if (keyword) {
      entries = await lorebook.search(keyword);
    } else {
      entries = await lorebook.getEntries(era, topics);
    }

    return NextResponse.json({
      success: true,
      entries,
      count: entries.length,
    });

  } catch (error) {
    console.error('查询设定集失败:', error);
    return NextResponse.json({ error: '查询设定集失败' }, { status: 500 });
  }
}

// POST 新增设定条目
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { era, topic, title, content, tags } = body;

    if (!era || !topic || !title || !content) {
      return NextResponse.json(
        { error: '缺少必填字段: era, topic, title, content' },
        { status: 400 }
      );
    }

    const entry = await lorebook.addEntry({ era, topic, title, content, tags });

    return NextResponse.json({ success: true, entry }, { status: 201 });

  } catch (error) {
    console.error('新增设定条目失败:', error);
    return NextResponse.json({ error: '新增设定条目失败' }, { status: 500 });
  }
}
