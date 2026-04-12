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
  isBranchPoint: boolean;
  createdAt: string;
  updatedAt: string;
  storyId: string;
  branchId: string; // 所属分支 ID，主线的 branchId 为 "main"
  parentSegmentId: string; // 父段落 ID（用于构建分支树）
  imageUrls: string[];
};

export type StoryBranch = {
  id: string;
  title: string;
  description?: string;
  sourceSegmentId: string; // 从哪个段落分叉出来的
  storyId: string;
  userDirection: string; // 用户输入的分叉方向描述
  createdAt: string;
  updatedAt: string;
};

// API 请求/响应类型
export type ContinueStoryRequest = {
  segmentId: string;
  branchId: string; // 当前分支 ID
  content?: string;
  style?: string;
  characters?: string[];
};

export type BranchStoryRequest = {
  segmentId: string;
  userDirection: string; // 用户输入的分叉方向描述
  branchTitle?: string; // 分支标题（可选，可为空让 AI 生成）
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
  branchId: string;
  branchTitle?: string;
  parentSegmentId?: string;
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
  isBranchPoint!: boolean;
  createdAt!: string;
  updatedAt!: string;
  storyId!: string;
  branchId!: string; // 所属分支 ID，主线的 branchId 为 "main"
  parentSegmentId!: string; // 父段落 ID（用于构建分支树）
  imageUrls!: string[];
  constructor(data: StorySegment) { Object.assign(this, data); }
}

class StoryBranchClass {
  id!: string;
  title!: string;
  description?: string;
  sourceSegmentId!: string; // 从哪个段落分叉出来的
  storyId!: string;
  userDirection!: string; // 用户输入的分叉方向描述
  createdAt!: string;
  updatedAt!: string;
  constructor(data: StoryBranch) { Object.assign(this, data); }
}

module.exports = {
  Story: StoryClass,
  StorySegment: StorySegmentClass,
  StoryBranch: StoryBranchClass
};