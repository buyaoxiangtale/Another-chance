const { storiesStore, segmentsStore, branchesStore } = require('./src/lib/simple-db');

class StoryTreeService {
  // 获取完整的故事树结构
  async getStoryTree(storyId) {
    const story = (await storiesStore.load()).find(s => s.id === storyId);
    if (!story) return null;

    const segments = (await segmentsStore.load()).filter(s => s.storyId === storyId);
    const branches = (await branchesStore.load()).filter(b => b.parentStoryId === storyId);

    // 构建树状结构
    const rootSegment = segments.find(s => s.order === 0);
    if (!rootSegment) return null;

    const tree = await this.buildTree(rootSegment, segments, branches);
    return {
      story,
      tree,
      segments,
      branches
    };
  }

  // 递归构建故事树
  async buildTree(segment, allSegments, allBranches, visited = new Set()) {
    if (visited.has(segment.id)) {
      return null; // 防止循环引用
    }
    visited.add(segment.id);

    const node = {
      id: segment.id,
      title: segment.title,
      content: segment.content,
      isBranchPoint: segment.isBranchPoint,
      order: segment.order,
      children: [],
      branches: []
    };

    // 获取该段落的所有分叉
    const segmentBranches = allBranches.filter(b => b.segmentId === segment.id);
    
    for (const branch of segmentBranches) {
      const branchSegments = allSegments.filter(s => s.parentBranchId === branch.id);
      
      for (const branchSegment of branchSegments) {
        const childNode = await this.buildTree(branchSegment, allSegments, allBranches, new Set(visited));
        if (childNode) {
          node.branches.push({
            branchId: branch.id,
            branchTitle: branch.title,
            branchDescription: branch.description,
            children: [childNode]
          });
        }
      }
    }

    // 获取后续的主线段落（非分叉）
    const nextSegments = allSegments
      .filter(s => s.storyId === segment.storyId && s.order > segment.order && !s.parentBranchId)
      .sort((a, b) => a.order - b.order);

    for (const nextSegment of nextSegments) {
      const childNode = await this.buildTree(nextSegment, allSegments, allBranches, new Set(visited));
      if (childNode) {
        node.children.push(childNode);
      }
    }

    return node;
  }

  // 获取故事的所有段落（按顺序）
  async getStorySegments(storyId) {
    const segments = (await segmentsStore.load()).filter(s => s.storyId === storyId);
    return segments.sort((a, b) => a.order - b.order);
  }

  // 获取某个段落的所有分叉
  async getSegmentBranches(segmentId) {
    const branches = (await branchesStore.load()).filter(b => b.segmentId === segmentId);
    
    const result = [];
    for (const branch of branches) {
      const branchSegments = (await segmentsStore.load()).filter(s => s.parentBranchId === branch.id);
      result.push({
        branch,
        segments: branchSegments.sort((a, b) => a.order - b.order)
      });
    }
    
    return result;
  }

  // 创建新的故事分叉
  async createBranch(branchData) {
    const branches = await branchesStore.load();
    
    const newBranch = {
      ...branchData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    branches.push(newBranch);
    await branchesStore.save(branches);
    
    return newBranch;
  }

  // 创建新的故事段落
  async createSegment(segmentData) {
    const segments = await segmentsStore.load();
    
    const newSegment = {
      ...segmentData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    segments.push(newSegment);
    await segmentsStore.save(segments);
    
    return newSegment;
  }

  // 获取分叉点后的所有可能发展路径
  async getBranchingPaths(storyId, fromSegmentId) {
    const allSegments = await segmentsStore.load();
    const allBranches = await branchesStore.load();
    
    const paths = [];
    const startSegment = allSegments.find(s => s.id === fromSegmentId);
    if (!startSegment) return paths;

    // 获取从该分叉点开始的所有路径
    const segmentBranches = allBranches.filter(b => b.segmentId === fromSegmentId);
    
    for (const branch of segmentBranches) {
      const branchSegments = allSegments.filter(s => s.parentBranchId === branch.id);
      const path = branchSegments.map(s => ({
        id: s.id,
        title: s.title,
        content: s.content,
        order: s.order
      }));
      paths.push({
        branchId: branch.id,
        branchTitle: branch.title,
        path
      });
    }

    return paths;
  }
}

module.exports = StoryTreeService;