// 故事相关类型定义
export type Story = {
  id: string;
  title: string;
  description?: string;
  author?: string;
  createdAt: string;
  updatedAt: string;
  rootSegmentId?: string;
};

export type StorySegment = {
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
};

export type StoryBranch = {
  id: string;
  title?: string;
  description?: string;
  segmentId: string;
  parentStoryId?: string;
  createdAt: string;
  updatedAt: string;
};

// API 请求/响应类型
export type ContinueStoryRequest = {
  segmentId: string;
  content?: string;
  style?: string;
  characters?: string[];
};

export type BranchStoryRequest = {
  segmentId: string;
  branchPoint: string;
  direction: 'alternate' | 'different' | 'extended';
};

export type StoryResponse = {
  segments: StorySegment[];
  branches: StoryBranch[];
  currentSegment: StorySegment;
};

// UI 组件类型
export type TreeNode = {
  id: string;
  title?: string;
  content?: string;
  isBranchPoint: boolean;
  children: TreeNode[];
  branchId?: string;
};

// 向后兼容的类实现
class StoryClass {
  id!: string;
  title!: string;
  description?: string;
  author?: string;
  createdAt!: string;
  updatedAt!: string;
  rootSegmentId?: string;
  constructor(data: Story) { Object.assign(this, data); }
}

class StorySegmentClass {
  id!: string;
  title?: string;
  content!: string;
  order!: number;
  isBranchPoint!: boolean;
  createdAt!: string;
  updatedAt!: string;
  storyId!: string;
  parentBranchId?: string;
  imageUrls!: string[];
  constructor(data: StorySegment) { Object.assign(this, data); }
}

class StoryBranchClass {
  id!: string;
  title?: string;
  description?: string;
  segmentId!: string;
  parentStoryId?: string;
  createdAt!: string;
  updatedAt!: string;
  constructor(data: StoryBranch) { Object.assign(this, data); }
}

module.exports = {
  Story: StoryClass,
  StorySegment: StorySegmentClass,
  StoryBranch: StoryBranchClass
};