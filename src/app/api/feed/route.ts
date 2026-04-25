import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/auth-helpers';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const genre = searchParams.get('genre');
    const era = searchParams.get('era');
    const storyType = searchParams.get('storyType');

    const where: any = { visibility: 'PUBLIC' };
    if (genre) where.genre = genre;
    if (era) where.era = era;
    if (storyType) where.storyType = storyType;

    const [stories, total] = await Promise.all([
      prisma.story.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          title: true,
          description: true,
          author: true,
          genre: true,
          era: true,
          visibility: true,
          publishedAt: true,
          createdAt: true,
          updatedAt: true,
          owner: { select: { id: true, name: true } },
          _count: { select: { segments: true, branches: true, likes: true, comments: true } },
        },
      }),
      prisma.story.count({ where }),
    ]);

    // Check if current user liked each story
    const userId = await getUserIdFromRequest(request);
    const storiesWithLikeStatus = userId ? await Promise.all(
      stories.map(async (s) => {
        const like = await prisma.storyLike.findUnique({
          where: { userId_storyId: { userId, storyId: s.id } },
        });
        return { ...s, isLiked: !!like };
      })
    ) : stories;

    return NextResponse.json({
      success: true,
      stories: storiesWithLikeStatus,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('获取公开故事失败:', error);
    return NextResponse.json({ error: '获取公开故事失败' }, { status: 500 });
  }
}
