import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/auth-helpers';

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const stories = await prisma.story.findMany({
      where: { ownerId: userId },
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { segments: true, branches: true } } },
    });

    return NextResponse.json({
      success: true,
      stories,
      total: stories.length,
    });
  } catch (error) {
    console.error('获取我的故事失败:', error);
    return NextResponse.json({ error: '获取我的故事失败' }, { status: 500 });
  }
}
