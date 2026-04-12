import { NextRequest, NextResponse } from 'next/server';
import { storiesStore, segmentsStore, branchesStore, getChildrenSegments, type StorySegment, type StoryBranch } from '@/lib/simple-db';

function buildSegmentTree(segments: StorySegment[], rootSegmentId: string) {
  const segmentMap = new Map<string, StorySegment & { children: StorySegment[] }>();
  const root = segments.find(s => s.id === rootSegmentId);
  
  if (!root) return null;

  // 创建所有段落的映射
  segments.forEach(segment => {
    segmentMap.set(segment.id, {
      ...segment,
      children: []
    });
  });

  // 构建树结构
  const treeRoot = segmentMap.get(rootSegmentId);
  const processed = new Set<string>();

  function addChildren(segmentNode: StorySegment & { children: StorySegment[] }) {
    if (processed.has(segmentNode.id)) return;
    processed.add(segmentNode.id);

    const children = segments
      .filter(s => s.parentSegmentId === segmentNode.id)
      .map(child => segmentMap.get(child.id)!);

    children.forEach(child => {
      segmentNode.children.push(child);
      addChildren(child); // 递归添加子节点
    });
  }

  addChildren(treeRoot!);
  return treeRoot;
}

function addBranchesToTree(treeNode: StorySegment & { children: StorySegment[] }, branches: StoryBranch[], segments: StorySegment[]) {
  // 查找与当前节点相关的分支
  const relatedBranches = branches.filter(branch => 
    branch.sourceSegmentId === treeNode.id
  );

  relatedBranches.forEach(branch => {
    // 查找该分支的段落
    const branchSegments = segments.filter(segment => 
      segment.branchId === branch.id
    );

    if (branchSegments.length > 0) {
      // 为每个分支创建子节点
      branchSegments.forEach(segment => {
        const branchNode = {
          ...segment,
          branchTitle: branch.title,
          branchId: branch.id,
          isBranch: true,
          children: []
        };

        // 递归添加分支的子段落
        addBranchesToTree(branchNode, branches, segments);
        treeNode.children.push(branchNode);
      });
    }
  });
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id: storyId } = params;

    if (!storyId) {
      return NextResponse.json({ error: '缺少故事ID' }, { status: 400 });
    }

    const stories = await storiesStore.load();
    const story = stories.find((s: any) => s.id === storyId);
    
    if (!story) {
      return NextResponse.json({ error: '故事不存在' }, { status: 404 });
    }

    const segments = await segmentsStore.load();
    const branches = await branchesStore.load();

    // 获取主线段落
    const mainSegments = segments.filter((s: StorySegment) => s.storyId === storyId && s.branchId === 'main');
    
    if (mainSegments.length === 0) {
      return NextResponse.json({
        success: true,
        story: story,
        tree: null,
        branches: [],
        message: '故事还没有主线段落'
      });
    }

    // 找到主线根段落（parentSegmentId 为空的段落）
    const rootSegment = mainSegments.find((s: StorySegment) => !s.parentSegmentId || s.parentSegmentId === '');
    
    if (!rootSegment) {
      return NextResponse.json({
        success: true,
        story: story,
        tree: null,
        branches: [],
        message: '无法找到主线根段落'
      });
    }

    // 构建主线树
    const mainTree = buildSegmentTree(mainSegments, rootSegment.id);
    
    // 添加分支到主线树
    addBranchesToTree(mainTree!, branches, segments);

    // 获取所有分支信息
    const storyBranches = branches.filter((b: StoryBranch) => b.storyId === storyId);

    return NextResponse.json({
      success: true,
      story: story,
      tree: mainTree,
      branches: storyBranches,
      totalSegments: segments.filter((s: StorySegment) => s.storyId === storyId).length,
      totalBranches: storyBranches.length
    });

  } catch (error) {
    console.error('获取故事树结构失败:', error);
    return NextResponse.json(
      { 
        error: '获取故事树结构失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}