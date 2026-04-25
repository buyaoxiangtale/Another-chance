import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/auth-helpers';

// POST /api/comments/[commentId]/like — Toggle like on comment
export async function POST(
  request: NextRequest,
  { params }: { params: { commentId: string } },
) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) return NextResponse.json({ error: '请先登录' }, { status: 401 });

    const { commentId } = params;
    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) return NextResponse.json({ error: '评论不存在' }, { status: 404 });

    const existing = await prisma.commentLike.findUnique({
      where: { userId_commentId: { userId, commentId } },
    });

    if (existing) {
      await prisma.commentLike.delete({ where: { id: existing.id } });
      return NextResponse.json({ success: true, liked: false });
    } else {
      await prisma.commentLike.create({ data: { userId, commentId } });
      return NextResponse.json({ success: true, liked: true });
    }
  } catch (error) {
    console.error('评论点赞失败:', error);
    return NextResponse.json({ error: '操作失败' }, { status: 500 });
  }
}
