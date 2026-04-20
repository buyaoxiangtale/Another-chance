import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/auth-helpers';
import { canViewStory, canViewBranch } from '@/lib/permissions';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const userId = await getUserIdFromRequest(request);
    const { id: storyId } = params;

    const story = await prisma.story.findUnique({ where: { id: storyId } });
    if (!story) {
      return NextResponse.json({ error: '故事不存在' }, { status: 404 });
    }

    if (!canViewStory(story, userId ?? undefined)) {
      return NextResponse.json({ error: '无权查看' }, { status: 403 });
    }

    const segments = await prisma.storySegment.findMany({
      where: { storyId },
      orderBy: { createdAt: 'asc' },
    });

    const branches = await prisma.storyBranch.findMany({
      where: { storyId },
    });

    // Filter branches by visibility
    const visibleBranches = branches.filter((b) =>
      canViewBranch(b, story, userId ?? undefined),
    );

    // Filter segments: only include segments from visible branches
    const visibleBranchIds = new Set(visibleBranches.map((b) => b.id));
    const visibleSegments = segments.filter((s) => {
      if (s.branchId === 'main') return true;
      return visibleBranchIds.has(s.branchId);
    });

    // Build main line chain
    const mainSegs = visibleSegments.filter((s) => s.branchId === 'main');
    const mainLine: any[] = [];
    const mainSegMap = new Map(mainSegs.map((s) => [s.id, s]));
    const rootSeg = mainSegs.find((s) => !s.parentSegmentId);

    if (rootSeg) {
      const visited = new Set<string>();
      let current: typeof rootSeg | undefined = rootSeg;
      while (current && !visited.has(current.id)) {
        visited.add(current.id);
        mainLine.push({ ...current, children: [] as any[] });
        current = mainSegs.find((s) => s.parentSegmentId === current!.id);
      }
    }

    // Attach branches to main line nodes
    for (const branch of visibleBranches) {
      const sourceIdx = mainLine.findIndex((s) => s.id === branch.sourceSegmentId);
      if (sourceIdx === -1) continue;

      const branchSegs = visibleSegments.filter((s) => s.branchId === branch.id);
      const branchChain: any[] = [];
      const bVisited = new Set<string>();
      let bCur = branchSegs.find((s) => s.parentSegmentId === branch.sourceSegmentId);

      while (bCur && !bVisited.has(bCur.id)) {
        bVisited.add(bCur.id);
        branchChain.push({
          ...bCur,
          branchTitle: branch.title,
          isBranch: true,
          children: [],
        });
        bCur = branchSegs.find((s) => s.parentSegmentId === bCur!.id);
      }

      if (branchChain.length > 0) {
        mainLine[sourceIdx].children.push({
          id: branch.id,
          title: branch.title,
          userDirection: branch.userDirection,
          sourceSegmentId: branch.sourceSegmentId,
          segments: branchChain,
        });
      }
    }

    return NextResponse.json({
      success: true,
      story,
      tree: mainLine,
      branches: visibleBranches,
      totalSegments: visibleSegments.length,
      totalBranches: visibleBranches.length,
    });
  } catch (error) {
    console.error('获取故事树失败:', error);
    return NextResponse.json({ error: '获取故事树失败' }, { status: 500 });
  }
}
