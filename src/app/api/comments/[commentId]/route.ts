import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/auth-helpers';

// GET /api/comments/[commentId] — Get single comment
export async function GET(
  request: NextRequest,
  { params }: { params: { commentId: string } },
) {
  try {
    const comment = await prisma.comment.findUnique({
      where: { id: params.commentId },
      include: {
        user: { select: { id: true, name: true, image: true } },
        _count: { select: { likes: true } },
      },
    });
    if (!comment) {
      return NextResponse.json({ error: '评论不存在' }, { status: 404 });
    }
    return NextResponse.json({ success: true, comment });
  } catch (error) {
    console.error('获取评论失败:', error);
    return NextResponse.json({ error: '获取评论失败' }, { status: 500 });
  }
}

// DELETE /api/comments/[commentId] — Delete comment (owner only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { commentId: string } },
) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const comment = await prisma.comment.findUnique({
      where: { id: params.commentId },
    });
    if (!comment) {
      return NextResponse.json({ error: '评论不存在' }, { status: 404 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isAdmin: true },
    });
    if (comment.userId !== userId && !user?.isAdmin) {
      return NextResponse.json({ error: '无权删除此评论' }, { status: 403 });
    }

    // Delete replies first (cascade), then the comment
    await prisma.comment.deleteMany({ where: { parentId: params.commentId } });
    await prisma.comment.delete({ where: { id: params.commentId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除评论失败:', error);
    return NextResponse.json({ error: '删除评论失败' }, { status: 500 });
  }
}
