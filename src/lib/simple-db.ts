import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

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

// Get ordered chain for a branch by following parentSegmentId links
async function getOrderedChain(storyId: string, branchId: string): Promise<StorySegment[]> {
  const segments = await segmentsStore.load();
  const storySegments = segments.filter(s => s.storyId === storyId && s.branchId === branchId);

  if (branchId === 'main') {
    // Main branch: start from root (no parentSegmentId)
    const chain: StorySegment[] = [];
    let current = storySegments.find(s => !s.parentSegmentId);
    const visited = new Set<string>();
    while (current && !visited.has(current.id)) {
      visited.add(current.id);
      chain.push(current);
      current = storySegments.find(s => s.parentSegmentId === current!.id);
    }
    return chain;
  } else {
    // Non-main branch: start from the segment whose parent is the sourceSegmentId
    const branches = await branchesStore.load();
    const branch = branches.find(b => b.id === branchId);
    if (!branch) return [];

    const chain: StorySegment[] = [];
    let current = storySegments.find(s => s.parentSegmentId === branch.sourceSegmentId);
    const visited = new Set<string>();
    while (current && !visited.has(current.id)) {
      visited.add(current.id);
      chain.push(current);
      current = storySegments.find(s => s.parentSegmentId === current!.id);
    }
    return chain;
  }
}

// Get the tail segment of a branch chain
async function getTailSegment(storyId: string, branchId: string): Promise<StorySegment | null> {
  const chain = await getOrderedChain(storyId, branchId);
  return chain.length > 0 ? chain[chain.length - 1] : null;
}

// Get all segments for a story
async function getStorySegments(storyId: string): Promise<StorySegment[]> {
  const segments = await segmentsStore.load();
  return segments.filter(s => s.storyId === storyId);
}

// Get branches for a story
async function getStoryBranches(storyId: string): Promise<StoryBranch[]> {
  const branches = await branchesStore.load();
  return branches.filter(b => b.storyId === storyId);
}

export {
  storiesStore,
  segmentsStore,
  branchesStore,
  getOrderedChain,
  getTailSegment,
  getStorySegments,
  getStoryBranches,
  type Story,
  type StorySegment,
  type StoryBranch
};
