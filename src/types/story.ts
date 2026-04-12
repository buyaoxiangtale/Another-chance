// 故事相关类型定义

interface Story {
  id: string;
  title: string;
  description?: string;
  author?: string;
  createdAt: string;
  updatedAt: string;
  rootSegmentId?: string;
}

interface StorySegment {
  id: string;
  title?: string;
  content: string;
  order: number;
  isBranchPoint: boolean;
  createdAt: string;
  updatedAt: string;
  storyId: string;
  parentBranchId?: string;
  imageUrls: string[];
}

interface StoryBranch {
  id: string;
  title?: string;
  description?: string;
  segmentId: string;
  parentStoryId?: string;
  createdAt: string;
  updatedAt: string;
}

// API 请求/响应类型
interface ContinueStoryRequest {
  segmentId: string;
  content?: string;
  style?: string;
  characters?: string[];
}

interface BranchStoryRequest {
  segmentId: string;
  branchPoint: string;
  direction: 'alternate' | 'different' | 'extended';
}

interface StoryResponse {
  segments: StorySegment[];
  branches: StoryBranch[];
  currentSegment: StorySegment;
}

// UI 组件类型
interface TreeNode {
  id: string;
  title?: string;
  content?: string;
  isBranchPoint: boolean;
  children: TreeNode[];
  branchId?: string;
}

module.exports = {
  Story,
  StorySegment,
  StoryBranch,
  ContinueStoryRequest,
  BranchStoryRequest,
  StoryResponse,
  TreeNode
};