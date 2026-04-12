import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

// 确保数据目录存在
async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

// 简单的 JSON 文件存储
class SimpleStore<T> {
  constructor(private filename: string) {
    this.dataPath = path.join(DATA_DIR, filename);
  }

  private dataPath: string;

  async load(): Promise<T[]> {
    await ensureDataDir();
    try {
      const data = await fs.readFile(this.dataPath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  async save(data: T[]): Promise<void> {
    await ensureDataDir();
    await fs.writeFile(this.dataPath, JSON.stringify(data, null, 2));
  }
}

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
  isBranchPoint: boolean;
  createdAt: string;
  updatedAt: string;
  storyId: string;
  branchId: string;
  parentSegmentId?: string;
  imageUrls: string[];
}

interface StoryBranch {
  id: string;
  title: string;
  description?: string;
  sourceSegmentId: string;
  storyId: string;
  userDirection: string;
  createdAt: string;
  updatedAt: string;
}

const storiesStore = new SimpleStore<Story>('stories.json');
const segmentsStore = new SimpleStore<StorySegment>('segments.json');
const branchesStore = new SimpleStore<StoryBranch>('branches.json');

// 新增辅助方法
async function getSegmentsByBranch(branchId: string): Promise<StorySegment[]> {
  const segments = await segmentsStore.load();
  return segments.filter(segment => segment.branchId === branchId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

async function getMainBranchSegments(storyId: string): Promise<StorySegment[]> {
  const segments = await segmentsStore.load();
  return segments.filter(segment => 
    segment.storyId === storyId && segment.branchId === 'main'
  ).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

async function getChildrenSegments(parentSegmentId: string): Promise<StorySegment[]> {
  const segments = await segmentsStore.load();
  return segments.filter(segment => segment.parentSegmentId === parentSegmentId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

async function getBranchStory(storyId: string): Promise<any[]> {
  const branches = await branchesStore.load();
  const segments = await segmentsStore.load();
  
  const storyBranches = branches.filter(branch => branch.storyId === storyId);
  
  // 为每个分支添加段落信息
  return storyBranches.map(branch => ({
    ...branch,
    segments: segments.filter(segment => 
      segment.storyId === storyId && 
      (branch.id === segment.branchId || segment.branchId === 'main')
    ).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  }));
}

export {
  storiesStore,
  segmentsStore,
  branchesStore,
  getSegmentsByBranch,
  getMainBranchSegments,
  getChildrenSegments,
  getBranchStory,
  type Story,
  type StorySegment,
  type StoryBranch
};