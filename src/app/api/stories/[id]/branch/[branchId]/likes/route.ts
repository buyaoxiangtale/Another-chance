import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/auth-helpers';

// POST /api/stories/[id]/branch/[branchId]/like — Toggle like
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; branchId: string } },
) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) return NextResponse.json({ error: '请先登录' }, { status: 401 });

    const { branchId } = params;
    const branch = await prisma.storyBranch.findUnique({ where: { id: branchId } });
    if (!branch) return NextResponse.json({ error: '分支不存在' }, { status: 404 });

    const existing = await prisma.storyLike.findUnique({
      where: { userId_branchId: { userId, branchId } },
    });

    if (existing) {
      await prisma.storyLike.delete({ where: { id: existing.id } });
      return NextResponse.json({ success: true, liked: false });
    } else {
      await prisma.storyLike.create({ data: { userId, branchId } });
      return NextResponse.json({ success: true, liked: true });
    }
  } catch (error) {
    console.error('分支点赞失败:', error);
    return NextResponse.json({ error: '操作失败' }, { status: 500 });
  }
}

// GET /api/stories/[id]/branch/[branchId]/likes
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; branchId: string } },
) {
  try {
    const userId = await getUserIdFromRequest(request);
    const { branchId } = params;

    const [likes, count, myLike] = await Promise.all([
      prisma.storyLike.findMany({
        where: { branchId },
        include: { user: { select: { id: true, name: true, image: true } } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.storyLike.count({ where: { branchId } }),
      userId
        ? prisma.storyLike.findUnique({
            where: { userId_branchId: { userId, branchId } },
          })
        : null,
    ]);

    return NextResponse.json({ success: true, likes, count, isLiked: !!myLike });
  } catch (error) {
    console.error('获取分支点赞失败:', error);
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}
