// 故事相关类型定义

export interface Story {
  id: string;
  title: string;
  description?: string;
  author?: string;
  createdAt: string;
  updatedAt: string;
  rootSegmentId?: string;
}

export interface StorySegment {
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

export interface StoryBranch {
  id: string;
  title?: string;
  description?: string;
  segmentId: string;
  parentStoryId?: string;
  createdAt: string;
  updatedAt: string;
}

// API 请求/响应类型
export interface ContinueStoryRequest {
  segmentId: string;
  content?: string;
  style?: string;
  characters?: string[];
}

export interface BranchStoryRequest {
  segmentId: string;
  branchPoint: string;
  direction: 'alternate' | 'different' | 'extended';
}

export interface StoryResponse {
  segments: StorySegment[];
  branches: StoryBranch[];
  currentSegment: StorySegment;
}

// UI 组件类型
export interface TreeNode {
  id: string;
  title?: string;
  content?: string;
  isBranchPoint: boolean;
  children: TreeNode[];
  branchId?: string;
}