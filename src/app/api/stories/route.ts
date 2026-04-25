import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/auth-helpers';
import { canViewStory } from '@/lib/permissions';

import { characterManager } from '@/lib/character-engine';
import { generateCoverImage } from '@/lib/cover-generator';

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
      include: {
        _count: { select: { segments: true, likes: true, comments: true, branches: true } },
        owner: { select: { id: true, name: true, image: true } },
      },
    });

    // Add isLiked for each story if user is logged in
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
    const { title, description, author, genre, era, storyType, characters } = body;

    if (!title) {
      return NextResponse.json({ error: '故事标题是必填项' }, { status: 400 });
    }

    const effectiveGenre = genre || undefined; // genre only stores sub-genre label

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
        storyType: storyType || undefined,
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

    // 注册前端传入的初始角色
    if (Array.isArray(characters) && characters.length > 0) {
      const characterIds: string[] = [];
      for (const char of characters) {
        if (!char.name || !char.name.trim()) continue;
        // 过滤非中文名
        if (!/[\u4e00-\u9fff]/.test(char.name)) continue;
        try {
          const traits: string[] = [];
          if (Array.isArray(char.traits)) {
            traits.push(...char.traits.filter((t: string) => typeof t === 'string' && t.trim()));
          }
          const role = ['protagonist', 'antagonist', 'supporting', 'narrator'].includes(char.role)
            ? char.role : 'supporting';
          const newChar = await characterManager.create({
            name: char.name.trim(),
            era: era || '',
            role,
            traits,
            storyId: story.id,
          });
          characterIds.push(newChar.id);
        } catch (e) {
          console.warn(`[stories/create] 注册初始角色 "${char.name}" 失败:`, e);
        }
      }
      // 将角色 ID 关联到首段
      if (characterIds.length > 0) {
        await prisma.storySegment.update({
          where: { id: firstSegment.id },
          data: { characterIds },
        });
        await prisma.story.update({
          where: { id: story.id },
          data: { characterIds },
        });
      }
    }

    const fullStory = await prisma.story.findUnique({ where: { id: story.id } });

    // 后台生成封面图：setTimeout 确保脱离请求处理上下文，不会被 Next.js 终止
    const sid = story.id;
    setTimeout(() => {
      generateCoverImage(sid)
        .then(result => {
          if (result.success) {
            console.log(`[stories/create] 封面图生成成功: ${result.coverImageUrl}`);
          } else {
            console.warn(`[stories/create] 封面图生成失败: ${result.error}`);
          }
        })
        .catch(e => console.warn('[stories/create] 封面图生成异常:', e));
    }, 1000);

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
