/**
 * C4: 分支记忆管理 — BranchMemory
 * 管理跨分支的记忆，让 AI 在续写时了解其他分支发生了什么
 */

import {
  branchesStore,
  segmentsStore,
  getOrderedChain,
  getStoryBranches,
  getStorySegments,
  summariesStore,
  type StorySegment,
  type StoryBranch,
} from './simple-db';

/**
 * 找到两个分支的分叉点
 * 通过回溯 parentSegmentId 链找到最近公共祖先
 */
async function findDivergencePoint(
  storyId: string,
  branchId1: string,
  branchId2: string
): Promise<StorySegment | null> {
  // 获取两条分支的完整段链
  const chain1 = await getOrderedChain(storyId, branchId1);
  const chain2 = await getOrderedChain(storyId, branchId2);

  if (chain1.length === 0 || chain2.length === 0) return null;

  // 构建 chain2 的 parent chain（包含分叉点之前的所有祖先）
  // chain1 和 chain2 各自的 parent 链: 从第一个 segment 开始回溯 parentSegmentId
  const buildAncestorChain = async (startSegment: StorySegment): Promise<StorySegment[]> => {
    const ancestors: StorySegment[] = [];
    const allSegments = await segmentsStore.load();
    let current: StorySegment | undefined = startSegment;

    while (current) {
      ancestors.push(current);
      if (!current.parentSegmentId) break;
      current = allSegments.find(s => s.id === current!.parentSegmentId);
    }

    return ancestors; // from newest to oldest
  };

  const ancestors1 = await buildAncestorChain(chain1[0]);
  const ancestors2 = await buildAncestorChain(chain2[0]);

  // 找最近公共祖先（两个祖先链中 id 相同且最靠近新段落的）
  const set2 = new Set(ancestors2.map(s => s.id));
  for (const seg of ancestors1) {
    if (set2.has(seg.id)) return seg;
  }

  return null;
}

/**
 * 获取其他分支的摘要
 * 返回当前分支以外的所有分支的摘要信息
 */
async function getAlternateBranchSummaries(
  storyId: string,
  currentBranchId: string
): Promise<Array<{ branch: StoryBranch; summary: string; segmentCount: number }>> {
  const branches = await getStoryBranches(storyId);
  const summaries = await summariesStore.load();
  const result: Array<{ branch: StoryBranch; summary: string; segmentCount: number }> = [];

  for (const branch of branches) {
    if (branch.id === currentBranchId) continue;

    const chain = await getOrderedChain(storyId, branch.id);
    if (chain.length === 0) continue;

    // 尝试获取该分支的摘要（取最新的摘要）
    const lastSegment = chain[chain.length - 1];
    const branchSummaries = summaries.filter(
      (s: any) => s.segmentId === lastSegment.id
    );

    let summaryText = '';
    if (branchSummaries.length > 0) {
      const latest = branchSummaries[branchSummaries.length - 1];
      summaryText = latest.summary || latest.content || '';
    }

    // 如果没有摘要，用分支描述 + 最后一段的内容前200字作为简要摘要
    if (!summaryText) {
      const lastContent = lastSegment.content || '';
      summaryText = lastContent.slice(0, 200) + (lastContent.length > 200 ? '...' : '');
    }

    result.push({
      branch,
      summary: summaryText,
      segmentCount: chain.length,
    });
  }

  return result;
}

/**
 * 同步分叉前的共享角色状态到当前分支
 * 找到分叉点，返回分叉点处的角色状态快照（如果存在）
 */
async function syncSharedCharacterStates(
  storyId: string,
  branchId: string
): Promise<Record<string, any> | null> {
  const branches = await getStoryBranches(storyId);
  const currentBranch = branches.find(b => b.id === branchId);
  if (!currentBranch) return null;

  // 获取源分支（从哪里分叉出来的）
  // 通过 sourceSegmentId 找到源段落，再找到源段落所在的分支
  const sourceSegmentId = currentBranch.sourceSegmentId;
  if (!sourceSegmentId) return null;

  // 查找源段落
  const segments = await segmentsStore.load();
  const sourceSegment = segments.find(s => s.id === sourceSegmentId);
  if (!sourceSegment) return null;

  // 获取分叉点的角色状态
  // 从分支的 characterStateSnapshot 获取（如果创建分支时保存了）
  const branchState = currentBranch.characterStateSnapshot;
  if (branchState) return branchState;

  // 回退：查看源段落中的角色信息
  if (sourceSegment.characterIds && sourceSegment.characterIds.length > 0) {
    const result: Record<string, any> = {};
    for (const charId of sourceSegment.characterIds) {
      result[charId] = { knownAtFork: true };
    }
    return result;
  }

  return null;
}

/**
 * 格式化分支记忆为 prompt 片段
 * "此故事有N条分支，在XX处分叉..."
 */
async function buildBranchMemoryPrompt(
  storyId: string,
  currentBranchId: string
): Promise<string> {
  const branches = await getStoryBranches(storyId);
  if (branches.length <= 1) return ''; // 只有主分支，无需分支记忆

  const lines: string[] = [];
  lines.push('【分支记忆】');
  lines.push(`此故事共有 ${branches.length + 1} 条分支（含主分支），当前处于分支「${branches.find(b => b.id === currentBranchId)?.title || '主分支'}」。`);

  // 获取其他分支的摘要
  const altSummaries = await getAlternateBranchSummaries(storyId, currentBranchId);

  if (altSummaries.length > 0) {
    lines.push('其他分支的情况：');

    for (const { branch, summary, segmentCount } of altSummaries) {
      lines.push(`- 「${branch.title}」（${segmentCount}段）：${summary.slice(0, 150)}${summary.length > 150 ? '...' : ''}`);
    }

    // 找到与第一个其他分支的分叉点
    if (altSummaries.length > 0) {
      const divPoint = await findDivergencePoint(storyId, currentBranchId, altSummaries[0].branch.id);
      if (divPoint) {
        lines.push(`分支从段落「${divPoint.title || divPoint.id}」处分叉。`);
      }
    }
  }

  // 同步共享角色状态提示
  const sharedStates = await syncSharedCharacterStates(storyId, currentBranchId);
  if (sharedStates && Object.keys(sharedStates).length > 0) {
    const charCount = Object.keys(sharedStates).length;
    lines.push(`分叉前共享 ${charCount} 个角色的状态。`);
  }

  return lines.join('\n');
}

/**
 * BranchMemory — 分支记忆管理类
 * 管理跨分支的记忆，让 AI 在续写时了解其他分支发生了什么
 */
class BranchMemory {
  /**
   * 找到两个分支的分叉点
   * 通过回溯 parentSegmentId 链找到最近公共祖先
   */
  async getBranchDivergencePoint(
    storyId: string,
    branchId1: string,
    branchId2: string
  ): Promise<StorySegment | null> {
    return findDivergencePoint(storyId, branchId1, branchId2);
  }

  /**
   * 获取其他分支的摘要（让AI知道"在另一条路线上发生了什么"）
   */
  async getAlternateBranchSummary(
    storyId: string,
    currentBranchId: string
  ): Promise<Array<{ branch: StoryBranch; summary: string; segmentCount: number }>> {
    return getAlternateBranchSummaries(storyId, currentBranchId);
  }

  /**
   * 同步分叉前的共享角色状态到当前分支
   */
  async syncSharedCharacterStates(
    storyId: string,
    branchId: string
  ): Promise<Record<string, any> | null> {
    return syncSharedCharacterStates(storyId, branchId);
  }

  /**
   * 格式化分支记忆为 prompt（"此故事有N条分支，在XX处分叉..."）
   */
  async buildBranchMemoryPrompt(
    storyId: string,
    currentBranchId: string
  ): Promise<string> {
    return buildBranchMemoryPrompt(storyId, currentBranchId);
  }
}

export const branchMemory = new BranchMemory();
export {
  findDivergencePoint,
  getAlternateBranchSummaries,
  syncSharedCharacterStates,
  buildBranchMemoryPrompt,
};
