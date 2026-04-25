import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/auth-helpers';

// POST /api/stories/[id]/like — Toggle like
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) return NextResponse.json({ error: '请先登录' }, { status: 401 });

    const { id: storyId } = params;
    const story = await prisma.story.findUnique({ where: { id: storyId } });
    if (!story) return NextResponse.json({ error: '故事不存在' }, { status: 404 });

    const existing = await prisma.storyLike.findUnique({
      where: { userId_storyId: { userId, storyId } },
    });

    if (existing) {
      await prisma.storyLike.delete({ where: { id: existing.id } });
      return NextResponse.json({ success: true, liked: false });
    } else {
      await prisma.storyLike.create({ data: { userId, storyId } });
      return NextResponse.json({ success: true, liked: true });
    }
  } catch (error) {
    console.error('点赞操作失败:', error);
    return NextResponse.json({ error: '操作失败' }, { status: 500 });
  }
}

// GET /api/stories/[id]/likes — Get likes
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const userId = await getUserIdFromRequest(request);
    const { id: storyId } = params;

    const [likes, count, myLike] = await Promise.all([
      prisma.storyLike.findMany({
        where: { storyId },
        include: { user: { select: { id: true, name: true, image: true } } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.storyLike.count({ where: { storyId } }),
      userId
        ? prisma.storyLike.findUnique({
            where: { userId_storyId: { userId, storyId } },
          })
        : null,
    ]);

    return NextResponse.json({
      success: true,
      likes,
      count,
      isLiked: !!myLike,
    });
  } catch (error) {
    console.error('获取点赞失败:', error);
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}
