const fs = require('fs/promises');
const path = require('path');
const { Story, StorySegment, StoryBranch } = require('@/types/story_classes');

const DATA_DIR = path.join(process.cwd(), 'data');

// 确保数据目录存在
async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

// 故事存储
export class StoryStore {
  private async loadJsonFile<T>(filename: string): Promise<T[]> {
    await ensureDataDir();
    const filepath = path.join(DATA_DIR, filename);
    try {
      const data = await fs.readFile(filepath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  private async saveJsonFile<T>(filename: string, data: T[]): Promise<void> {
    await ensureDataDir();
    const filepath = path.join(DATA_DIR, filename);
    await fs.writeFile(filepath, JSON.stringify(data, null, 2));
  }

  // 故事相关操作
  async getAllStories(): Promise<Story[]> {
    return this.loadJsonFile<Story>('stories.json');
  }

  async getStory(id: string): Promise<Story | null> {
    const stories = await this.getAllStories();
    return stories.find(s => s.id === id) || null;
  }

  async createStory(story: Omit<Story, 'id' | 'createdAt' | 'updatedAt'>): Promise<Story> {
    const stories = await this.getAllStories();
    const newStory: Story = {
      ...story,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    stories.push(newStory);
    await this.saveJsonFile('stories.json', stories);
    return newStory;
  }

  // 故事段落相关操作
  async getAllSegments(): Promise<StorySegment[]> {
    return this.loadJsonFile<StorySegment>('segments.json');
  }

  async getSegmentsByStoryId(storyId: string): Promise<StorySegment[]> {
    const segments = await this.getAllSegments();
    return segments.filter(s => s.storyId === storyId).sort((a, b) => a.order - b.order);
  }

  async createSegment(segment: Omit<StorySegment, 'id' | 'createdAt' | 'updatedAt'>): Promise<StorySegment> {
    const segments = await this.getAllSegments();
    // 确保 imageUrls 和 imageMetadata 字段存在
    const segmentWithDefaults = {
      ...segment,
      imageUrls: segment.imageUrls || [],
      imageMetadata: segment.imageMetadata || [],
      hasImages: (segment.imageUrls && segment.imageUrls.length > 0) || (segment.imageMetadata && segment.imageMetadata.length > 0) || false
    };
    
    const newSegment: StorySegment = {
      ...segmentWithDefaults,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    segments.push(newSegment);
    await this.saveJsonFile('segments.json', segments);
    return newSegment;
  }

  // 分叉节点相关操作
  async getAllBranches(): Promise<StoryBranch[]> {
    return this.loadJsonFile<StoryBranch>('branches.json');
  }

  async getBranchesBySegmentId(segmentId: string): Promise<StoryBranch[]> {
    const branches = await this.getAllBranches();
    return branches.filter(b => b.segmentId === segmentId);
  }

  async createBranch(branch: Omit<StoryBranch, 'id' | 'createdAt' | 'updatedAt'>): Promise<StoryBranch> {
    const branches = await this.getAllBranches();
    const newBranch: StoryBranch = {
      ...branch,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    branches.push(newBranch);
    await this.saveJsonFile('branches.json', branches);
    return newBranch;
  }
}

export const storyStore = new StoryStore();