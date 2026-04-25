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

    // Fetch all comments flat, then build tree for unlimited depth
    const allComments = await prisma.comment.findMany({
      where: { branchId },
      include: {
        user: { select: { id: true, name: true, image: true } },
        _count: { select: { likes: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Build tree from flat list
    const commentMap = new Map<string, any>();
    const roots: any[] = [];
    for (const c of allComments) {
      commentMap.set(c.id, { ...c, replies: [] });
    }
    for (const c of allComments) {
      const node = commentMap.get(c.id)!;
      if (c.parentId && commentMap.has(c.parentId)) {
        commentMap.get(c.parentId)!.replies.push(node);
      } else {
        roots.push(node);
      }
    }

    // Paginate top-level comments
    const total = roots.length;
    const paginatedRoots = roots.slice((page - 1) * limit, page * limit);

    // Get current user's likes
    const userId = await getUserIdFromRequest(request);
    let likedCommentIds = new Set<string>();
    if (userId) {
      const ids = collectCommentIds(paginatedRoots);
      if (ids.length > 0) {
        const likes = await prisma.commentLike.findMany({
          where: { userId, commentId: { in: ids } },
          select: { commentId: true },
        });
        likedCommentIds = new Set(likes.map(l => l.commentId));
      }
    }

    const commentsWithLiked = userId ? markLiked(paginatedRoots, likedCommentIds) : paginatedRoots;

    return NextResponse.json({
      success: true,
      comments: commentsWithLiked,
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
        select: { branchId: true },
      });
      if (!parent || parent.branchId !== branchId) {
        return NextResponse.json({ error: '回复目标不存在' }, { status: 404 });
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

// Helper: collect all comment IDs from nested structure
function collectCommentIds(comments: any[]): string[] {
  const ids: string[] = [];
  for (const c of comments) {
    ids.push(c.id);
    if (c.replies?.length) ids.push(...collectCommentIds(c.replies));
  }
  return ids;
}

// Helper: mark liked status on nested comments
function markLiked(comments: any[], likedIds: Set<string>): any[] {
  return comments.map(c => ({
    ...c,
    liked: likedIds.has(c.id),
    replies: c.replies?.length ? markLiked(c.replies, likedIds) : c.replies,
  }));
}
