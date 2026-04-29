import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/auth-helpers';
import { canEditBranch, canViewStory } from '@/lib/permissions';
import { triggerBackup } from '@/lib/auto-backup';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; branchId: string } },
) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) return NextResponse.json({ error: '请先登录' }, { status: 401 });

    const { id: storyId, branchId } = params;
    const { visibility } = await request.json();

    if (!['PRIVATE', 'PUBLIC', 'UNLISTED'].includes(visibility)) {
      return NextResponse.json({ error: '无效的可见性设置' }, { status: 400 });
    }

    const story = await prisma.story.findUnique({ where: { id: storyId } });
    if (!story) return NextResponse.json({ error: '故事不存在' }, { status: 404 });

    const branch = await prisma.storyBranch.findUnique({ where: { id: branchId } });
    if (!branch || branch.storyId !== storyId) {
      return NextResponse.json({ error: '分支不存在' }, { status: 404 });
    }

    if (!canEditBranch(branch, userId)) {
      return NextResponse.json({ error: '无权修改分支' }, { status: 403 });
    }

    // Cannot publish branch if parent story is private
    if (visibility === 'PUBLIC' && story.visibility === 'PRIVATE') {
      return NextResponse.json({ error: '父故事为私有状态，无法公开分支' }, { status: 400 });
    }

    const updated = await prisma.storyBranch.update({
      where: { id: branchId },
      data: { visibility },
    });

    triggerBackup();
    return NextResponse.json({ success: true, branch: updated });
  } catch (error) {
    console.error('更新分支失败:', error);
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; branchId: string } },
) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { id: storyId, branchId } = params;

    if (!storyId || !branchId) {
      return NextResponse.json({ error: '缺少参数' }, { status: 400 });
    }

    if (branchId === 'main') {
      return NextResponse.json({ error: '主线不可删除' }, { status: 400 });
    }

    const story = await prisma.story.findUnique({ where: { id: storyId } });
    if (!story) return NextResponse.json({ error: '故事不存在' }, { status: 404 });

    const targetBranch = await prisma.storyBranch.findUnique({ where: { id: branchId } });
    if (!targetBranch || targetBranch.storyId !== storyId) {
      return NextResponse.json({ error: '分支不存在' }, { status: 404 });
    }

    if (!canEditBranch(targetBranch, userId)) {
      return NextResponse.json({ error: '无权删除分支' }, { status: 403 });
    }

    // Collect all branches to delete (recursive)
    const allBranches = await prisma.storyBranch.findMany({ where: { storyId } });
    const allSegments = await prisma.storySegment.findMany({ where: { storyId } });

    const branchesToDelete = new Set<string>([branchId]);
    let changed = true;
    while (changed) {
      changed = false;
      const segIds = new Set(
        allSegments
          .filter((s) => branchesToDelete.has(s.branchId))
          .map((s) => s.id),
      );
      for (const b of allBranches) {
        if (!branchesToDelete.has(b.id) && segIds.has(b.sourceSegmentId)) {
          branchesToDelete.add(b.id);
          changed = true;
        }
      }
    }

    // Delete segments in those branches
    const deletedSegments = await prisma.storySegment.deleteMany({
      where: { storyId, branchId: { in: Array.from(branchesToDelete) } },
    });

    // Delete branch records
    const deletedBranches = await prisma.storyBranch.deleteMany({
      where: { storyId, id: { in: Array.from(branchesToDelete) } },
    });

    // Check if source segment still has branches
    const remainingBranches = await prisma.storyBranch.findMany({
      where: { storyId, sourceSegmentId: targetBranch.sourceSegmentId },
    });
    if (remainingBranches.length === 0) {
      await prisma.storySegment.update({
        where: { id: targetBranch.sourceSegmentId },
        data: { isBranchPoint: false, updatedAt: new Date() },
      }).catch(() => {});
    }

    triggerBackup();
    return NextResponse.json({
      success: true,
      deletedBranchIds: Array.from(branchesToDelete),
      deletedSegmentCount: deletedSegments.count,
      message: '分支删除成功',
    });
  } catch (error) {
    console.error('删除分支失败:', error);
    return NextResponse.json(
      { error: '删除分支失败' },
      { status: 500 },
    );
  }
}
