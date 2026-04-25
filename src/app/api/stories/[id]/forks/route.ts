import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/stories/[id]/forks — List public forks with metadata
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id: storyId } = params;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const [forks, total] = await Promise.all([
      prisma.storyBranch.findMany({
        where: {
          storyId,
          visibility: 'PUBLIC',
        },
        include: {
          owner: { select: { id: true, name: true, image: true } },
          sourceSegment: {
            select: { id: true, title: true, content: true },
          },
          _count: { select: { likes: true, comments: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.storyBranch.count({
        where: { storyId, visibility: 'PUBLIC' },
      }),
    ]);

    return NextResponse.json({
      success: true,
      forks: forks.map((f) => ({
        id: f.id,
        title: f.title,
        description: f.description,
        userDirection: f.userDirection,
        model: f.model,
        sourceSegmentId: f.sourceSegmentId,
        sourceSegmentTitle: f.sourceSegment.title,
        sourceSegmentPreview: f.sourceSegment.content?.slice(0, 100),
        owner: f.owner,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
        likeCount: f._count.likes,
        commentCount: f._count.comments,
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('获取分叉列表失败:', error);
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}
