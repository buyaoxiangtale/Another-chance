import prisma from '@/lib/prisma';

export async function getOrderedChain(storyId: string, branchId: string) {
  const segments = await prisma.storySegment.findMany({
    where: { storyId, branchId },
    orderBy: { createdAt: 'asc' },
  });

  if (branchId === 'main') {
    const chain: typeof segments = [];
    let current = segments.find((s) => !s.parentSegmentId);
    const visited = new Set<string>();
    while (current && !visited.has(current.id)) {
      visited.add(current.id);
      chain.push(current);
      current = segments.find((s) => s.parentSegmentId === current!.id);
    }
    return chain;
  } else {
    const branch = await prisma.storyBranch.findUnique({ where: { id: branchId } });
    if (!branch) return [];

    const mainSegs = await prisma.storySegment.findMany({
      where: { storyId, branchId: 'main' },
      orderBy: { createdAt: 'asc' },
    });

    const chain: typeof segments = [];
    let current = mainSegs.find((s) => !s.parentSegmentId);
    const visitedMain = new Set<string>();
    while (current && !visitedMain.has(current.id)) {
      visitedMain.add(current.id);
      chain.push(current);
      if (current.id === branch.sourceSegmentId) break;
      current = mainSegs.find((s) => s.parentSegmentId === current!.id);
    }

    let branchCurrent = segments.find((s) => s.parentSegmentId === branch.sourceSegmentId);
    const visitedBranch = new Set<string>();
    while (branchCurrent && !visitedBranch.has(branchCurrent.id)) {
      visitedBranch.add(branchCurrent.id);
      chain.push(branchCurrent);
      branchCurrent = segments.find((s) => s.parentSegmentId === branchCurrent!.id);
    }
    return chain;
  }
}
