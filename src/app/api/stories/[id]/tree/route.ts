import { NextRequest, NextResponse } from 'next/server';
import { storiesStore, segmentsStore, branchesStore, getOrderedChain, type StorySegment, type StoryBranch } from '@/lib/simple-db';

function buildTreeData(segments: StorySegment[], branches: StoryBranch[], storyId: string) {
  const storySegments = segments.filter(s => s.storyId === storyId);
  const storyBranches = branches.filter(b => b.storyId === storyId);

  // Build main line chain via parentSegmentId
  const mainSegs = storySegments.filter(s => s.branchId === 'main');
  const mainLine: any[] = [];
  let current = mainSegs.find(s => !s.parentSegmentId);
  const visited = new Set<string>();

  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    mainLine.push({ ...current, children: [] as any[] });
    current = mainSegs.find(s => s.parentSegmentId === current!.id);
  }

  // Attach branches to main line nodes
  for (const branch of storyBranches) {
    const sourceIdx = mainLine.findIndex(s => s.id === branch.sourceSegmentId);
    if (sourceIdx === -1) continue;

    // Build branch chain via parentSegmentId
    const branchSegs = storySegments.filter(s => s.branchId === branch.id);
    const branchChain: any[] = [];
    let bCur = branchSegs.find(s => s.parentSegmentId === branch.sourceSegmentId);
    const bVisited = new Set<string>();

    while (bCur && !bVisited.has(bCur.id)) {
      bVisited.add(bCur.id);
      branchChain.push({
        ...bCur,
        branchTitle: branch.title,
        isBranch: true,
        children: []
      });
      bCur = branchSegs.find(s => s.parentSegmentId === bCur!.id);
    }

    if (branchChain.length > 0) {
      mainLine[sourceIdx].children.push({
        id: branch.id,
        title: branch.title,
        userDirection: branch.userDirection,
        sourceSegmentId: branch.sourceSegmentId,
        segments: branchChain
      });
    }
  }

  return { mainLine, branches: storyBranches };
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id: storyId } = params;

    const stories = await storiesStore.load();
    const story = stories.find((s: any) => s.id === storyId);
    if (!story) return NextResponse.json({ error: '故事不存在' }, { status: 404 });

    const segments = await segmentsStore.load();
    const branches = await branchesStore.load();

    const { mainLine, branches: storyBranches } = buildTreeData(segments, branches, storyId);

    return NextResponse.json({
      success: true,
      story,
      tree: mainLine,
      branches: storyBranches,
      totalSegments: segments.filter((s: any) => s.storyId === storyId).length,
      totalBranches: storyBranches.length
    });

  } catch (error) {
    console.error('获取故事树失败:', error);
    return NextResponse.json({ error: '获取故事树失败' }, { status: 500 });
  }
}
