import fs from 'fs/promises';
import path from 'path';
import type { Character, HistoricalReference, DirectorState } from '../types/story';

export const DATA_DIR = path.join(process.cwd(), 'data');

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
  // C1: 1.6 扩展
  era?: string;
  genre?: string;
  characterIds?: string[];
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
  // C1: 1.5 扩展
  timeline?: any;
  characterIds?: string[];
  historicalReferences?: any[];
  narrativePace?: 'rush' | 'detailed' | 'pause' | 'summary';
  mood?: string;
}

interface StoryBranch {
  id: string;
  title: string;
  description?: string;
  sourceSegmentId: string;
  storyId: string;
  userDirection: string;
  characterStateSnapshot?: any;
  forkTimeline?: any;
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
    // Non-main branch: include context from main chain up to source segment, then branch segments
    const branches = await branchesStore.load();
    const branch = branches.find(b => b.id === branchId);
    if (!branch) return [];

    const chain: StorySegment[] = [];

    // 1. Get main chain context up to (and including) the source segment
    const mainSegments = segments.filter(s => s.storyId === storyId && s.branchId === 'main');
    const mainChain: StorySegment[] = [];
    let current = mainSegments.find(s => !s.parentSegmentId);
    const visitedMain = new Set<string>();
    while (current && !visitedMain.has(current.id)) {
      visitedMain.add(current.id);
      mainChain.push(current);
      if (current.id === branch.sourceSegmentId) break;
      current = mainSegments.find(s => s.parentSegmentId === current!.id);
    }
    chain.push(...mainChain);

    // 2. Get branch segments
    const branchSegments = segments.filter(s => s.storyId === storyId && s.branchId === branchId);
    let branchCurrent = branchSegments.find(s => s.parentSegmentId === branch.sourceSegmentId);
    const visitedBranch = new Set<string>();
    while (branchCurrent && !visitedBranch.has(branchCurrent.id)) {
      visitedBranch.add(branchCurrent.id);
      chain.push(branchCurrent);
      branchCurrent = branchSegments.find(s => s.parentSegmentId === branchCurrent!.id);
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

// C7: 新增 stores
const charactersStore = new SimpleStore<Character>('characters.json');
const historicalReferencesStore = new SimpleStore<HistoricalReference>('historical-references.json');
const directorStatesStore = new SimpleStore<DirectorState>('director-states.json');
const summariesStore = new SimpleStore<any>('summaries.json');
const eventsStore = new SimpleStore<any>('events.json');

export {
  storiesStore,
  segmentsStore,
  branchesStore,
  charactersStore,
  historicalReferencesStore,
  directorStatesStore,
  summariesStore,
  eventsStore,
  getOrderedChain,
  getTailSegment,
  getStorySegments,
  getStoryBranches,
  type Story,
  type StorySegment,
  type StoryBranch
};

export { SimpleStore, ensureDataDir };
