import { NextRequest, NextResponse } from 'next/server';
import { storiesStore, segmentsStore, type Story, type StorySegment } from '@/lib/simple-db';

export async function GET() {
  try {
    const stories = await storiesStore.load();
    
    // 按创建时间倒序排列
    const sortedStories = stories.sort((a: Story, b: Story) => 
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

    const stories = await storiesStore.load();

    // 幂等：标题已存在则返回已有故事
    const existing = stories.find((s: Story) => s.title === title);
    if (existing) {
      return NextResponse.json({
        success: true,
        story: existing,
        message: '故事已存在'
      });
    }

    const newStory: Story = {
      id: `story_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title,
      description: description || '',
      author: author || '佚名',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    stories.push(newStory);
    await storiesStore.save(stories);

    // 自动生成首个段落（故事开篇）
    const firstSegment: StorySegment = {
      id: `seg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: `${title}·开篇`,
      content: `《${title}》的故事开始了...`, // 临时内容，后续通过 AI 生成完整开篇
      isBranchPoint: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      storyId: newStory.id,
      branchId: 'main',
      parentSegmentId: '',
      imageUrls: []
    };

    const segments = await segmentsStore.load();
    segments.push(firstSegment);
    await segmentsStore.save(segments);

    // 更新故事的 rootSegmentId
    newStory.rootSegmentId = firstSegment.id;
    const updatedStories = stories.map((s: Story) => s.id === newStory.id ? newStory : s);
    await storiesStore.save(updatedStories);

    return NextResponse.json({
      success: true,
      story: newStory,
      firstSegment,
      message: '故事创建成功，已生成开篇段落'
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