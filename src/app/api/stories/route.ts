import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/auth-helpers';
import { canViewStory } from '@/lib/permissions';
import { STORY_TYPE_TO_GENRE } from '@/lib/genre-config';

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    const { searchParams } = new URL(request.url);
    const feed = searchParams.get('feed');

    let where: any = {};

    if (feed === 'public') {
      where.visibility = 'PUBLIC';
    } else if (userId) {
      where = {
        OR: [
          { ownerId: userId },
          { visibility: 'PUBLIC' },
          { visibility: 'UNLISTED' },
        ],
      };
    } else {
      where.visibility = 'PUBLIC';
    }

    const stories = await prisma.story.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { segments: true } } },
    });

    return NextResponse.json({
      success: true,
      stories,
      total: stories.length,
    });
  } catch (error) {
    console.error('获取故事列表失败:', error);
    return NextResponse.json(
      { error: '获取故事列表失败' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, author, genre, era, storyType } = body;

    if (!title) {
      return NextResponse.json({ error: '故事标题是必填项' }, { status: 400 });
    }

    const effectiveGenre = genre || (storyType ? STORY_TYPE_TO_GENRE[storyType] : undefined);

    const existing = await prisma.story.findFirst({
      where: { title, ownerId: userId },
    });
    if (existing) {
      return NextResponse.json({
        success: true,
        story: existing,
        message: '故事已存在',
      });
    }

    const story = await prisma.story.create({
      data: {
        title,
        description: description || '',
        author: author || '佚名',
        genre: effectiveGenre,
        era,
        ownerId: userId,
        visibility: 'PRIVATE',
      },
    });

    const firstSegment = await prisma.storySegment.create({
      data: {
        title: `${title}·开篇`,
        content: `《${title}》的故事开始了...`,
        isBranchPoint: false,
        storyId: story.id,
        branchId: 'main',
        parentSegmentId: null,
        imageUrls: [],
        visibility: 'PRIVATE',
      },
    });

    await prisma.story.update({
      where: { id: story.id },
      data: { rootSegmentId: firstSegment.id },
    });

    const fullStory = await prisma.story.findUnique({ where: { id: story.id } });

    return NextResponse.json({
      success: true,
      story: fullStory,
      firstSegment,
      message: '故事创建成功，已生成开篇段落',
    }, { status: 201 });
  } catch (error) {
    console.error('创建故事失败:', error);
    return NextResponse.json({ error: '创建故事失败' }, { status: 500 });
  }
}
