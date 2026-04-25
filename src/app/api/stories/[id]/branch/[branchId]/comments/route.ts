import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/auth-helpers';

// GET /api/stories/[id]/branch/[branchId]/comments
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; branchId: string } },
) {
  try {
    const { branchId } = params;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const comments = await prisma.comment.findMany({
      where: { branchId, parentId: null },
      include: {
        user: { select: { id: true, name: true, image: true } },
        replies: {
          include: {
            user: { select: { id: true, name: true, image: true } },
            replies: {
              include: {
                user: { select: { id: true, name: true, image: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    // 手动统计 likes 数量
    const allCommentIds = new Set<string>();
    comments.forEach(c => {
      allCommentIds.add(c.id);
      c.replies?.forEach(r => {
        allCommentIds.add(r.id);
        r.replies?.forEach(rr => allCommentIds.add(rr.id));
      });
    });

    const likeCounts = allCommentIds.size > 0
      ? await prisma.commentLike.groupBy({
          by: ['commentId'],
          where: { commentId: { in: Array.from(allCommentIds) } },
          _count: { commentId: true },
        }).then(rows => {
            const map: Record<string, number> = {};
            rows.forEach(r => { map[r.commentId] = r._count.commentId; });
            return map;
          })
      : {};

    // 递归添加 _count
    function addLikeCount(comment: any) {
      comment._count = { likes: likeCounts[comment.id] || 0 };
      comment.replies?.forEach(addLikeCount);
      return comment;
    }
    comments.forEach(addLikeCount);

    // Get current user's likes on these comments
    const userId = await getUserIdFromRequest(request);
    let likedCommentIds = new Set<string>();
    if (userId && allCommentIds.size > 0) {
      const likes = await prisma.commentLike.findMany({
        where: { userId, commentId: { in: Array.from(allCommentIds) } },
        select: { commentId: true },
      });
      likedCommentIds = new Set(likes.map(l => l.commentId));
    }

    // Mark liked status
    function markLiked(comment: any) {
      comment.liked = likedCommentIds.has(comment.id);
      comment.replies?.forEach(markLiked);
      return comment;
    }
    if (userId) comments.forEach(markLiked);

    const total = await prisma.comment.count({
      where: { branchId, parentId: null },
    });

    return NextResponse.json({
      success: true,
      comments,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('获取分支评论失败:', error);
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}

// POST /api/stories/[id]/branch/[branchId]/comments
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; branchId: string } },
) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) return NextResponse.json({ error: '请先登录' }, { status: 401 });

    const { branchId } = params;
    const { content, parentId } = await request.json();

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: '评论内容不能为空' }, { status: 400 });
    }
    if (content.length > 2000) {
      return NextResponse.json({ error: '评论内容不能超过2000字' }, { status: 400 });
    }

    if (parentId) {
      const parent = await prisma.comment.findUnique({
        where: { id: parentId },
        select: { parentId: true, branchId: true },
      });
      if (!parent || parent.branchId !== branchId) {
        return NextResponse.json({ error: '回复目标不存在' }, { status: 404 });
      }
      if (parent.parentId) {
        const gp = await prisma.comment.findUnique({
          where: { id: parent.parentId },
          select: { parentId: true },
        });
        if (gp?.parentId) {
          return NextResponse.json({ error: '回复层级最多3层' }, { status: 400 });
        }
      }
    }

    const comment = await prisma.comment.create({
      data: {
        content: content.trim(),
        userId,
        branchId,
        parentId: parentId || null,
      },
      include: {
        user: { select: { id: true, name: true, image: true } },
      },
    });

    return NextResponse.json({ success: true, comment });
  } catch (error) {
    console.error('分支评论失败:', error);
    return NextResponse.json({ error: '评论失败' }, { status: 500 });
  }
}
