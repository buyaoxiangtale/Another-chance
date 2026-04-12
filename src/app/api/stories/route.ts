import { NextRequest, NextResponse } from 'next/server';
import { storiesStore } from '@/lib/simple-db';

export async function GET() {
  try {
    const stories = await storiesStore.load();
    
    // 按创建时间倒序排列
    const sortedStories = stories.sort((a: any, b: any) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({
      success: true,
      stories: sortedStories,
      total: sortedStories.length
    });
  } catch (error) {
    console.error('获取故事列表失败:', error);
    return NextResponse.json(
      { 
        error: '获取故事列表失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, author } = body;

    if (!title) {
      return NextResponse.json(
        { error: '故事标题是必填项' },
        { status: 400 }
      );
    }

    // 生成新故事
    const newStory = {
      id: `story_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title,
      description: description || '',
      author: author || '佚名',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const stories = await storiesStore.load();
    stories.push(newStory);
    await storiesStore.save(stories);

    return NextResponse.json({
      success: true,
      story: newStory,
      message: '故事创建成功'
    }, { status: 201 });

  } catch (error) {
    console.error('创建故事失败:', error);
    return NextResponse.json(
      { 
        error: '创建故事失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}