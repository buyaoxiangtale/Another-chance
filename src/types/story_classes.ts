// 故事相关类型定义和类

// 接口定义
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
  // 图片数据增强
  imageMetadata?: Array<{
    id: string;
    url: string;
    description?: string;
    type: 'illustration' | 'scene' | 'character' | 'object';
    width?: number;
    height?: number;
    alt?: string;
  }>;
  hasImages: boolean;
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

// 具体的类实现（用于 require）
class StoryClass implements Story {
  id: string;
  title: string;
  description?: string;
  author?: string;
  createdAt: string;
  updatedAt: string;
  rootSegmentId?: string;

  constructor(data: Omit<Story, 'id' | 'createdAt' | 'updatedAt'>) {
    this.id = '';
    this.title = data.title;
    this.description = data.description;
    this.author = data.author;
    this.createdAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
    this.rootSegmentId = data.rootSegmentId;
  }
}

class StorySegmentClass implements StorySegment {
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
  imageMetadata?: Array<{
    id: string;
    url: string;
    description?: string;
    type: 'illustration' | 'scene' | 'character' | 'object';
    width?: number;
    height?: number;
    alt?: string;
  }>;
  hasImages: boolean;

  constructor(data: Omit<StorySegment, 'id' | 'createdAt' | 'updatedAt'>) {
    this.id = '';
    this.title = data.title;
    this.content = data.content;
    this.order = data.order;
    this.isBranchPoint = data.isBranchPoint;
    this.createdAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
    this.storyId = data.storyId;
    this.parentBranchId = data.parentBranchId;
    this.imageUrls = data.imageUrls || [];
    this.imageMetadata = data.imageMetadata || [];
    this.hasImages = ((data.imageUrls && data.imageUrls.length > 0) || (data.imageMetadata && data.imageMetadata.length > 0)) || false;
  }
}

class StoryBranchClass implements StoryBranch {
  id: string;
  title?: string;
  description?: string;
  segmentId: string;
  parentStoryId?: string;
  createdAt: string;
  updatedAt: string;

  constructor(data: Omit<StoryBranch, 'id' | 'createdAt' | 'updatedAt'>) {
    this.id = '';
    this.title = data.title;
    this.description = data.description;
    this.segmentId = data.segmentId;
    this.parentStoryId = data.parentStoryId;
    this.createdAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
  }
}

// 图片生成相关接口 (P6-2)
interface ImageGenerationRequest {
  segmentId: string;
  prompt: string;
  style?: string;
  size?: '256x256' | '512x512' | '1024x1024' | '1024x1792' | '1792x1024';
  quality?: 'standard' | 'hd';
}

interface ImageGenerationResponse {
  success: boolean;
  imageId?: string;
  imageUrl?: string;
  error?: string;
}

interface ImageMetadata {
  id: string;
  storySegmentId: string;
  url: string;
  description?: string;
  type: 'illustration' | 'scene' | 'character' | 'object';
  width: number;
  height: number;
  alt?: string;
  createdAt: string;
  updatedAt: string;
}

module.exports = {
  Story: StoryClass,
  StorySegment: StorySegmentClass,
  StoryBranch: StoryBranchClass
};