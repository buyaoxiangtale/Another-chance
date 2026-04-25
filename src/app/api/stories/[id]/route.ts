import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/auth-helpers';
import { canViewStory, canEditStory, canDeleteStory } from '@/lib/permissions';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const userId = await getUserIdFromRequest(request);
    const story = await prisma.story.findUnique({ where: { id: params.id } });

    if (!story) {
      return NextResponse.json({ error: '故事不存在' }, { status: 404 });
    }

    if (!canViewStory(story, userId ?? undefined)) {
      return NextResponse.json({ error: '无权查看' }, { status: 403 });
    }

    // Fetch like count and user's like status
    const [likeCount, myLike] = await Promise.all([
      prisma.storyLike.count({ where: { storyId: params.id } }),
      userId
        ? prisma.storyLike.findUnique({
            where: { userId_storyId: { userId, storyId: params.id } },
          })
        : null,
    ]);

    return NextResponse.json({
      success: true,
      story: {
        ...story,
        likeCount,
        isLiked: !!myLike,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: '获取故事失败' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const story = await prisma.story.findUnique({ where: { id: params.id } });
    if (!story) {
      return NextResponse.json({ error: '故事不存在' }, { status: 404 });
    }

    if (!canEditStory(story, userId)) {
      return NextResponse.json({ error: '无权编辑' }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, genre, era, author, visibility, publishedAt } = body;

    const data: any = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (genre !== undefined) data.genre = genre;
    if (era !== undefined) data.era = era;
    if (author !== undefined) data.author = author;
    if (visibility !== undefined) {
      data.visibility = visibility;
      if (visibility === 'PUBLIC' && !story.publishedAt) {
        data.publishedAt = new Date();
      }
    }
    if (publishedAt !== undefined) data.publishedAt = publishedAt ? new Date(publishedAt) : null;
    data.updatedAt = new Date();

    const updated = await prisma.story.update({
      where: { id: params.id },
      data,
    });

    return NextResponse.json({ success: true, story: updated });
  } catch (error) {
    console.error('更新故事失败:', error);
    return NextResponse.json({ error: '更新故事失败' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const story = await prisma.story.findUnique({ where: { id: params.id } });
    if (!story) {
      return NextResponse.json({ error: '故事不存在' }, { status: 404 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!canDeleteStory(story, user ? { id: user.id, isAdmin: user.isAdmin } : null)) {
      return NextResponse.json({ error: '无权删除' }, { status: 403 });
    }

    // Cascade delete via Prisma (segments, branches, characters, director states)
    await prisma.story.delete({ where: { id: params.id } });

    return NextResponse.json({
      success: true,
      message: `故事「${story.title}」已删除`,
    });
  } catch (error) {
    console.error('删除故事失败:', error);
    return NextResponse.json({ error: '删除故事失败' }, { status: 500 });
  }
}
