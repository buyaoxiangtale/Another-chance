import { NextRequest, NextResponse } from 'next/server';
import { storiesStore, segmentsStore, branchesStore } from '@/lib/simple-db';

/**
 * DELETE /api/stories/:id/branch/:branchId
 * 删除分支：
 *   1. 主线（branchId === 'main'）不可删除
 *   2. 级联删除该分支下所有段落（递归删除从该分支再分叉出去的子分支）
 *   3. 若源段落不再有任何分叉，重置其 isBranchPoint 标记
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string; branchId: string } }
) {
  try {
    const { id: storyId, branchId } = params;

    if (!storyId || !branchId) {
      return NextResponse.json({ error: '缺少参数' }, { status: 400 });
    }

    if (branchId === 'main') {
      return NextResponse.json({ error: '主线不可删除' }, { status: 400 });
    }

    const stories = await storiesStore.load();
    const story = stories.find((s: any) => s.id === storyId);
    if (!story) return NextResponse.json({ error: '故事不存在' }, { status: 404 });

    const branches = await branchesStore.load();
    const targetBranch = branches.find(b => b.id === branchId && b.storyId === storyId);
    if (!targetBranch) {
      return NextResponse.json({ error: '分支不存在' }, { status: 404 });
    }

    // 1. 收集所有需要删除的分支 id（递归：当前分支 + 任何以本分支段落为源的子分支）
    const segments = await segmentsStore.load();
    const branchesToDelete = new Set<string>([branchId]);

    let changed = true;
    while (changed) {
      changed = false;
      const segmentsInDeletedBranches = segments.filter(
        s => s.storyId === storyId && branchesToDelete.has(s.branchId)
      );
      const segIds = new Set(segmentsInDeletedBranches.map(s => s.id));
      for (const b of branches) {
        if (
          b.storyId === storyId &&
          !branchesToDelete.has(b.id) &&
          segIds.has(b.sourceSegmentId)
        ) {
          branchesToDelete.add(b.id);
          changed = true;
        }
      }
    }

    // 2. 删除上述分支的所有段落
    const remainingSegments = segments.filter(
      s => !(s.storyId === storyId && branchesToDelete.has(s.branchId))
    );

    // 3. 删除分支记录
    const remainingBranches = branches.filter(
      b => !(b.storyId === storyId && branchesToDelete.has(b.id))
    );

    // 4. 若源段落不再有任何分叉，重置 isBranchPoint
    const sourceSegmentId = targetBranch.sourceSegmentId;
    const stillHasBranches = remainingBranches.some(
      b => b.storyId === storyId && b.sourceSegmentId === sourceSegmentId
    );
    if (!stillHasBranches) {
      const sourceSeg = remainingSegments.find(s => s.id === sourceSegmentId);
      if (sourceSeg && sourceSeg.isBranchPoint) {
        sourceSeg.isBranchPoint = false;
        sourceSeg.updatedAt = new Date().toISOString();
      }
    }

    await segmentsStore.save(remainingSegments);
    await branchesStore.save(remainingBranches);

    return NextResponse.json({
      success: true,
      deletedBranchIds: Array.from(branchesToDelete),
      deletedSegmentCount: segments.length - remainingSegments.length,
      message: '分支删除成功',
    });
  } catch (error) {
    console.error('删除分支失败:', error);
    return NextResponse.json(
      { error: '删除分支失败', details: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}
