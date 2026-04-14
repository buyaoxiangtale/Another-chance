user
Analyze all source files in src/lib/. For each file: purpose, exports, dependencies. Then: architecture overview and ChronosMirror upgrade gaps (character modeling, timeline validation, MCP Wikipedia, pacing control). Write results to /home/pjlab/fbh/fbh_project/gushi/Docs/researches/src_lib_research.md
codex
I’m mapping `src/lib/` first so I can cover every source file and then write a single research document with per-file purpose, exports, dependencies, plus the architecture and ChronosMirror gap analysis.
exec
/usr/bin/zsh -lc 'find src/lib -maxdepth 2 -type d | sort' in /home/pjlab/fbh/fbh_project/gushi
exec
/usr/bin/zsh -lc 'git status --short' in /home/pjlab/fbh/fbh_project/gushi
 succeeded in 0ms:
src/lib

 succeeded in 0ms:
?? .ops/cleanup_research_cron.sh
?? .ops/generate_daily_research_todo.sh
?? .ops/generate_research_blueprint_checklist.sh
?? .ops/research_guard.sh
?? Docs/researches/blueprint_checklist.md
?? Docs/researches/src_app_api_research.md
?? Docs/researches/src_app_create_research.md
?? Docs/researches/src_app_story_research.md
?? Docs/researches/src_components_research.md
?? Docs/researches/src_lib_research.md
?? Docs/researches/src_lib_research.md.tmp
?? Docs/researches/todos_20260414.md

exec
/usr/bin/zsh -lc 'rg --files src/lib' in /home/pjlab/fbh/fbh_project/gushi
 succeeded in 0ms:
src/lib/simple-db.ts

codex
`src/lib/` only contains one source file: `src/lib/simple-db.ts`. I’m reading that file and its call sites next so the write-up reflects both the module internals and how the rest of the app leans on it.
exec
/usr/bin/zsh -lc "sed -n '1,240p' src/lib/simple-db.ts" in /home/pjlab/fbh/fbh_project/gushi
exec
/usr/bin/zsh -lc "sed -n '1,260p' package.json" in /home/pjlab/fbh/fbh_project/gushi
 succeeded in 0ms:
{
  "name": "gushi-temp",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "cap:ios": "npx cap sync ios",
    "cap:android": "npx cap sync android",
    "cap:open:ios": "npx cap open ios",
    "cap:open:android": "npx cap open android",
    "cap:run:ios": "npx cap run ios",
    "cap:run:android": "npx cap run android",
    "mobile:setup": "./scripts/init-capacitor.sh",
    "mobile:build": "./scripts/build-mobile.sh",
    "mobile:run": "./scripts/run-mobile.sh"
  },
  "dependencies": {
    "@types/sqlite3": "^5.1.0",
    "autoprefixer": "^10.4.27",
    "better-sqlite3": "^12.8.0",
    "next": "13.4.19",
    "react": "18.2.0",
    "react-dom": "18.2.0",
    "sqlite3": "^6.0.1"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "13.4.19",
    "tailwindcss": "^3.4.0",
    "typescript": "^5",
    "autoprefixer": "^10.4.0"
  }
}
 succeeded in 0ms:
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

exec
/usr/bin/zsh -lc "rg -n \"from ['\\\"]@?/?.*simple-db|simple-db\" src" in /home/pjlab/fbh/fbh_project/gushi
 succeeded in 0ms:
src/app/api/stories/[id]/continue/route.ts:2:import { storiesStore, segmentsStore, getOrderedChain, type StorySegment } from '@/lib/simple-db';
src/app/api/stories/[id]/segments/route.ts:2:import { getOrderedChain, getStorySegments, type StorySegment } from '@/lib/simple-db';
src/app/api/stories/[id]/route.ts:2:import { storiesStore } from '@/lib/simple-db';
src/app/api/stories/[id]/branch/route.ts:2:import { storiesStore, segmentsStore, branchesStore, getOrderedChain, type StorySegment } from '@/lib/simple-db';
src/app/api/stories/[id]/tree/route.ts:2:import { storiesStore, segmentsStore, branchesStore, getOrderedChain, type StorySegment, type StoryBranch } from '@/lib/simple-db';
src/app/api/stories/[id]/stream-continue/route.ts:2:import { storiesStore, segmentsStore, getOrderedChain, type StorySegment } from '@/lib/simple-db';
src/app/api/stories/route.ts:2:import { storiesStore, segmentsStore, type Story, type StorySegment } from '@/lib/simple-db';

codex
`simple-db` is the persistence backbone for the story APIs, so I’m pulling the story route handlers too. That will let me describe the actual architecture around the library instead of treating the file in isolation.
exec
/usr/bin/zsh -lc 'find src/app/api/stories -type f | sort' in /home/pjlab/fbh/fbh_project/gushi
exec
/usr/bin/zsh -lc 'find src/app -maxdepth 3 -type f | sort' in /home/pjlab/fbh/fbh_project/gushi
exec
/usr/bin/zsh -lc 'find src/components -type f | sort' in /home/pjlab/fbh/fbh_project/gushi
 succeeded in 0ms:
src/app/api/images/route.ts
src/app/api/stories/route.ts
src/app/create/page.tsx
src/app/favicon.ico
src/app/globals.css
src/app/layout.tsx
src/app/page.tsx
src/app/story/[id]/page.tsx

 succeeded in 0ms:
src/components/StreamingText.tsx
src/components/story/StoryImageDisplay.tsx

 succeeded in 0ms:
src/app/api/stories/[id]/branch/route.ts
src/app/api/stories/[id]/continue/route.ts
src/app/api/stories/[id]/route.ts
src/app/api/stories/[id]/segments/route.ts
src/app/api/stories/[id]/stream-continue/route.ts
src/app/api/stories/[id]/tree/route.ts
src/app/api/stories/route.ts

exec
/usr/bin/zsh -lc "sed -n '1,240p' src/app/api/stories/route.ts" in /home/pjlab/fbh/fbh_project/gushi
 succeeded in 0ms:
import { NextRequest, NextResponse } from 'next/server';
import { storiesStore, segmentsStore, type Story, type StorySegment } from '@/lib/simple-db';

export async function GET() {
  try {
    const stories = await storiesStore.load();
    
    // 按创建时间倒序排列
    const sortedStories = stories.sort((a: Story, b: Story) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({
      success: true,
      stories: sortedStories,
      total: sortedStories.length
    });
  } catch (error) {
    console.error('获取故事列表失败:', error);
    return NextResponse.json(
      { 
        error: '获取故事列表失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, author } = body;

    if (!title) {
      return NextResponse.json(
        { error: '故事标题是必填项' },
        { status: 400 }
      );
    }

    const stories = await storiesStore.load();

    // 幂等：标题已存在则返回已有故事
    const existing = stories.find((s: Story) => s.title === title);
    if (existing) {
      return NextResponse.json({
        success: true,
        story: existing,
        message: '故事已存在'
      });
    }

    const newStory: Story = {
      id: `story_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title,
      description: description || '',
      author: author || '佚名',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    stories.push(newStory);
    await storiesStore.save(stories);

    // 自动生成首个段落（故事开篇）
    const firstSegment: StorySegment = {
      id: `seg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: `${title}·开篇`,
      content: `《${title}》的故事开始了...`, // 临时内容，后续通过 AI 生成完整开篇
      isBranchPoint: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      storyId: newStory.id,
      branchId: 'main',
      parentSegmentId: '',
      imageUrls: []
    };

    const segments = await segmentsStore.load();
    segments.push(firstSegment);
    await segmentsStore.save(segments);

    // 更新故事的 rootSegmentId
    newStory.rootSegmentId = firstSegment.id;
    const updatedStories = stories.map((s: Story) => s.id === newStory.id ? newStory : s);
    await storiesStore.save(updatedStories);

    return NextResponse.json({
      success: true,
      story: newStory,
      firstSegment,
      message: '故事创建成功，已生成开篇段落'
    }, { status: 201 });

  } catch (error) {
    console.error('创建故事失败:', error);
    return NextResponse.json(
      { 
        error: '创建故事失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}
exec
/usr/bin/zsh -lc "sed -n '1,260p' src/app/api/stories/[id]/continue/route.ts" in /home/pjlab/fbh/fbh_project/gushi
 exited 1 in 0ms:
zsh:1: no matches found: src/app/api/stories/[id]/continue/route.ts

exec
/usr/bin/zsh -lc "sed -n '1,260p' src/app/api/stories/[id]/branch/route.ts" in /home/pjlab/fbh/fbh_project/gushi
 exited 1 in 0ms:
zsh:1: no matches found: src/app/api/stories/[id]/branch/route.ts

exec
/usr/bin/zsh -lc "sed -n '1,260p' Docs/researches/src_lib_research.md" in /home/pjlab/fbh/fbh_project/gushi
 succeeded in 0ms:
# `src/lib` Research

## Scope

`src/lib/` currently contains one source file:

- `src/lib/simple-db.ts`

Because this directory is a shared library layer rather than a standalone feature, I also traced its direct consumers in `src/app/api/stories/*` to explain the actual architecture and the ChronosMirror upgrade gaps.

## Per-file analysis

### `src/lib/simple-db.ts`

**Purpose**

`src/lib/simple-db.ts` is the project's lightweight persistence and traversal layer for story data. It does three jobs in one file:

1. defines where story data lives on disk via `DATA_DIR`
2. provides a generic JSON-array file store through `SimpleStore<T>`
3. defines the story domain records and branch-chain helper functions used by the story API

This is the only shared backend library under `src/lib/`, so the rest of the story API depends on it directly.

**Key internal constructs**

- `DATA_DIR` (`src/lib/simple-db.ts:4`)
  - resolves storage to `path.join(process.cwd(), 'data')`
- `ensureDataDir()` (`src/lib/simple-db.ts:6`)
  - lazily creates the `data/` directory before reads and writes
- `SimpleStore<T>` (`src/lib/simple-db.ts:14`)
  - wraps a single JSON file
  - `load()` reads the whole file and `JSON.parse`s it into `T[]`
  - `save()` rewrites the whole file with pretty-printed JSON
- `Story` (`src/lib/simple-db.ts:37`)
  - top-level story metadata
- `StorySegment` (`src/lib/simple-db.ts:47`)
  - a unit of generated narrative bound to a story and branch
- `StoryBranch` (`src/lib/simple-db.ts:60`)
  - branch metadata tied to a source segment and user direction
- `getOrderedChain(storyId, branchId)` (`src/lib/simple-db.ts:76`)
  - reconstructs a linear branch by following `parentSegmentId`
  - special-cases `branchId === 'main'`
- `getTailSegment(storyId, branchId)` (`src/lib/simple-db.ts:110`)
  - returns the last segment of a reconstructed branch
- `getStorySegments(storyId)` (`src/lib/simple-db.ts:116`)
  - returns every segment for a story without ordering
- `getStoryBranches(storyId)` (`src/lib/simple-db.ts:122`)
  - returns every branch for a story

**Exports**

- `storiesStore`
  - `SimpleStore<Story>` backed by `data/stories.json`
- `segmentsStore`
  - `SimpleStore<StorySegment>` backed by `data/segments.json`
- `branchesStore`
  - `SimpleStore<StoryBranch>` backed by `data/branches.json`
- `getOrderedChain(storyId: string, branchId: string): Promise<StorySegment[]>`
- `getTailSegment(storyId: string, branchId: string): Promise<StorySegment | null>`
- `getStorySegments(storyId: string): Promise<StorySegment[]>`
- `getStoryBranches(storyId: string): Promise<StoryBranch[]>`
- `type Story`
- `type StorySegment`
- `type StoryBranch`

**Direct dependencies**

- Node `fs/promises`
- Node `path`
- `process.cwd()` and a writable `data/` directory at runtime

**Related dependency context**

- `package.json` includes `better-sqlite3`, `sqlite3`, and `@types/sqlite3`, but `src/lib/simple-db.ts` does not use them.
- In practice, the live persistence layer is still file-backed JSON, not a transactional database-backed repository.

**Downstream consumers**

This file is imported directly by seven story API routes:

- `src/app/api/stories/route.ts`
- `src/app/api/stories/[id]/route.ts`
- `src/app/api/stories/[id]/segments/route.ts`
- `src/app/api/stories/[id]/tree/route.ts`
- `src/app/api/stories/[id]/continue/route.ts`
- `src/app/api/stories/[id]/stream-continue/route.ts`
- `src/app/api/stories/[id]/branch/route.ts`

**Dependency notes and behavioral constraints**

- `SimpleStore<T>.load()` catches every read or parse failure and returns `[]` (`src/lib/simple-db.ts:21-29`).
  - Missing files are handled gracefully.
  - Corrupt JSON, permission issues, and other unexpected failures are also silently flattened into "no records", which can hide real data-loss conditions.
- `SimpleStore<T>.save()` rewrites the whole file (`src/lib/simple-db.ts:31-34`).
  - There is no locking, transaction support, append path, or conflict detection.
- `getOrderedChain()` reconstructs branch order by repeated `.find()` scans over arrays (`src/lib/simple-db.ts:83-104`).
  - This is simple, but it is effectively repeated linear scanning rather than indexed lookup.
- The branch model is a linked list, not a general event graph.
  - Every segment has at most one `parentSegmentId`.
  - Non-main branches are anchored by `StoryBranch.sourceSegmentId`.
- `getTailSegment()` and `getStoryBranches()` are exported but are not currently used by `src/` consumers.
- The file-system dependency means any route importing this module is tied to a Node runtime with writable local storage; this is not an edge-safe persistence layer.

## Architecture overview

### What `src/lib` is doing today

At the moment, `src/lib` is not a broad utility layer. It is effectively the story backend's entire persistence model.

The current shape is:

```text
Next.js story routes
  -> import stores and helpers from src/lib/simple-db.ts
  -> load full JSON arrays from data/*.json
  -> mutate in memory
  -> save full JSON arrays back to disk
```

### Data model

The storage model is split across three JSON files:

- `data/stories.json`
  - one array of `Story`
- `data/segments.json`
  - one array of `StorySegment`
- `data/branches.json`
  - one array of `StoryBranch`

The implicit relational structure is:

- `Story.id`
  - parent key for segments and branches
- `StorySegment.storyId`
  - segment belongs to a story
- `StorySegment.branchId`
  - segment belongs either to the special `"main"` branch or to a branch record id
- `StorySegment.parentSegmentId`
  - single-parent linked-list edge
- `StoryBranch.sourceSegmentId`
  - the main-line segment where a branch diverges

This is enough to support:

- listing stories
- creating a story and initial segment
- continuing a branch
- creating a branch from a segment
- returning branch segments in order
- building a main-line-plus-children tree view

### How the story API depends on this file

- `src/app/api/stories/route.ts`
  - uses `storiesStore` and `segmentsStore` to create a story and its first segment
  - performs multiple full-file writes for one logical operation
- `src/app/api/stories/[id]/continue/route.ts`
  - uses `getOrderedChain()` to build AI prompt context from existing branch text
  - appends a new `StorySegment` to the same branch
- `src/app/api/stories/[id]/stream-continue/route.ts`
  - uses the same chain reconstruction pattern, then saves the generated segment after streaming completes
- `src/app/api/stories/[id]/branch/route.ts`
  - creates a `StoryBranch`
  - marks the source segment as `isBranchPoint = true`
  - uses `getOrderedChain(storyId, 'main')` to gather prompt context up to the split point
  - appends the first segment of the new branch
- `src/app/api/stories/[id]/segments/route.ts`
  - exposes either all story segments or a reconstructed ordered branch via `getOrderedChain()`
- `src/app/api/stories/[id]/tree/route.ts`
  - loads raw stores and re-implements linked-list traversal in `buildTreeData()`
  - notably imports `getOrderedChain` but does not use it

### Structural observations

- Persistence, domain types, and traversal logic all live in one file.
  - There is no repository layer, validation layer, or service layer between route handlers and stored JSON.
- Branch traversal is branch-local.
  - For non-main branches, `getOrderedChain()` starts at the first segment whose parent is `branch.sourceSegmentId`, then follows only branch-owned descendants.
  - That means later continuations on a branch do not automatically include the main-line ancestry in their returned chain; they only include branch-local segments.
- The tree route duplicates graph logic instead of consuming a shared graph service.
- The current model is write-order oriented, not history-model oriented.
  - `createdAt` and `updatedAt` are persistence timestamps.
  - They are not in-story time or historical chronology.
- There is no single shared domain contract.
  - `src/lib/simple-db.ts` defines the runtime story types actually used by the API.
  - `src/types/story.ts` defines a separate type layer that is not imported by the routes.
  - That separate file already hints at future capabilities like `ContinueStoryRequest.characters?: string[]`, but the persistence layer has nowhere to store or enforce them.

## ChronosMirror upgrade gaps

ChronosMirror needs richer narrative state than this library can currently persist or validate. The key issue is not just that `simple-db.ts` is small; it is that the entire persistence contract is too narrow. The current records are optimized for plain text continuation, not for structured historical reasoning.

### 1. Character modeling gap

**Current state**

- `Story` stores only top-level metadata: `id`, `title`, `description`, `author`, timestamps, and optional `rootSegmentId`.
- `StorySegment` stores only prose and a few routing fields: `content`, `branchId`, `parentSegmentId`, `isBranchPoint`, and `imageUrls`.
- `StoryBranch` stores only branch metadata: `title`, `description`, `sourceSegmentId`, `userDirection`, and timestamps.
- `src/types/story.ts` exposes `ContinueStoryRequest.characters?: string[]`, but that field is not wired into `src/lib` or the API routes that persist story state.
- No type in `src/lib` represents:
  - characters
  - persona attributes
  - speech style
  - goals
  - loyalties
  - relationship changes
  - per-segment character state

**Why this blocks ChronosMirror**

- The continuation routes build prompts from raw concatenated prose, not from structured character memory.
- Branch continuations on non-main branches only reconstruct branch-local segments, which weakens long-term persona continuity even further.
- There is nowhere to persist "this segment changed character X's allegiance" or "character Y should keep a distinct speaking style".

**Upgrade direction**

Add first-class character persistence, for example:

- `CharacterProfile`
  - stable identity, role, biography, personality axes, speech markers, historical grounding
- `CharacterStateSnapshot`
  - what each character knows, wants, fears, and believes at a given story event
- `RelationshipEdge`
  - dynamic links between characters with confidence and change history
- segment-level metadata such as:
  - `introducedCharacterIds`
  - `characterStateDeltas`
  - `speakerStyleHints`

This change would push `src/lib` from "raw text store" toward a domain store that can support consistent persona generation.

### 2. Timeline validation gap

**Current state**

- The only built-in ordering mechanism is linked-list traversal by `parentSegmentId`.
- `createdAt` and `updatedAt` describe file persistence time, not historical event time.
- `getOrderedChain()` prevents infinite loops with a `visited` set, but that is traversal safety, not timeline validation.
- There is no schema for:
  - event timestamps inside the story world
  - dynasty or era
  - causal dependencies
  - temporal contradictions
  - validated versus unvalidated history
- `buildTreeData()` in the tree route duplicates traversal logic instead of sharing a single authoritative graph model.

**Why this blocks ChronosMirror**

- ChronosMirror needs temporal consistency and historical accuracy checks.
- The current library can answer "what segment comes next in this branch?" but not:
  - "does this event happen in the correct year?"
  - "did this branch violate an already established causal constraint?"
  - "does this historical figure appear before their recorded lifetime?"

**Upgrade direction**

Add explicit timeline and validation structures, for example:

codex
There’s already a draft research note in `Docs/researches/src_lib_research.md`. I’m checking the rest of the current draft plus the route and type files it references so I can replace it with a complete, source-backed version rather than just append guesses.
exec
/usr/bin/zsh -lc "set -o noglob; sed -n '1,260p' src/app/api/stories/[id]/continue/route.ts" in /home/pjlab/fbh/fbh_project/gushi
exec
/usr/bin/zsh -lc "set -o noglob; sed -n '241,520p' Docs/researches/src_lib_research.md" in /home/pjlab/fbh/fbh_project/gushi
 succeeded in 0ms:
import { NextRequest, NextResponse } from 'next/server';
import { storiesStore, segmentsStore, getOrderedChain, type StorySegment } from '@/lib/simple-db';

async function callAI(prompt: string): Promise<string> {
  const baseUrl = process.env.AI_BASE_URL || 'https://api.openai.com/v1';
  const apiKey = process.env.AI_API_KEY || '';
  const model = process.env.AI_MODEL || 'gpt-3.5-turbo';

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: '你是一位精通中国历史的文学作家，擅长古典文学风格的写作。请用中文回答，保持与前文的风格和情节连续性。' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 2000
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AI API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id: storyId } = params;
    const { branchId = 'main' } = await request.json();

    if (!storyId) {
      return NextResponse.json({ error: '缺少参数' }, { status: 400 });
    }

    const stories = await storiesStore.load();
    const story = stories.find((s: any) => s.id === storyId);
    if (!story) return NextResponse.json({ error: '故事不存在' }, { status: 404 });

    // Get ordered chain to find tail segment
    const chain = await getOrderedChain(storyId, branchId);
    if (chain.length === 0) {
      return NextResponse.json({ error: '该分支没有段落' }, { status: 404 });
    }
    const tailSegment = chain[chain.length - 1];

    // Build context from the ordered chain
    const contextSummary = chain.map((s: StorySegment) =>
      `${s.title ? `【${s.title}】` : ''}${s.content}`
    ).join('\n');

    const prompt = `故事标题：${story.title}
故事背景：${story.description || ''}

当前故事进展：
${contextSummary}

请续写下一段（150-300字），保持古典文学风格，与前文情节连续。`;

    const aiResponse = await callAI(prompt);

    const segments = await segmentsStore.load();
    const newSegment: StorySegment = {
      id: `seg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      storyId,
      title: '故事续写',
      content: aiResponse,
      isBranchPoint: false,
      branchId,
      parentSegmentId: tailSegment.id,
      imageUrls: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    segments.push(newSegment);
    await segmentsStore.save(segments);

    return NextResponse.json({ success: true, segment: newSegment });

  } catch (error) {
    console.error('故事续写失败:', error);
    return NextResponse.json(
      { error: '故事续写失败', details: String(error) },
      { status: 500 }
    );
  }
}

 succeeded in 0ms:
- `getOrderedChain()` prevents infinite loops with a `visited` set, but that is traversal safety, not timeline validation.
- There is no schema for:
  - event timestamps inside the story world
  - dynasty or era
  - causal dependencies
  - temporal contradictions
  - validated versus unvalidated history
- `buildTreeData()` in the tree route duplicates traversal logic instead of sharing a single authoritative graph model.

**Why this blocks ChronosMirror**

- ChronosMirror needs temporal consistency and historical accuracy checks.
- The current library can answer "what segment comes next in this branch?" but not:
  - "does this event happen in the correct year?"
  - "did this branch violate an already established causal constraint?"
  - "does this historical figure appear before their recorded lifetime?"

**Upgrade direction**

Add explicit timeline and validation structures, for example:

- `StoryEvent`
  - stable event id, narrative timestamp, real-world historical date or range, location, participants
- `TimelineEdge`
  - predecessor, successor, divergence, parallel, or dependency relationships
- validation fields such as:
  - `timelineStatus`
  - `validationErrors`
  - `historicalConfidence`
  - `contradictionRefs`

Also split traversal from validation:

- keep repository code focused on loading and saving
- move branch and timeline reconstruction into a graph service
- add a validator that runs before segment persistence or publication

### 3. MCP Wikipedia gap

**Current state**

- None of the exported types can store citations, sources, retrieval sessions, or fact-check results.
- `StorySegment` has `imageUrls`, but it has no place for evidence bundles or claim provenance.
- `src/lib` has no cache or persistence model for external research.
- The AI routes that consume this library save generated prose directly, with no corresponding research artifact.

**Why this blocks ChronosMirror**

- ChronosMirror's Wikipedia-through-MCP workflow needs durable provenance.
- Without stored evidence, the system cannot show:
  - what claims were grounded
  - which Wikipedia pages were consulted
  - whether a segment passed or failed fact-checking
  - which branch introduced a historically risky claim

**Upgrade direction**

Introduce research and provenance records such as:

- `Citation`
  - source title, url, excerpt, access time, claim mapping
- `ResearchArtifact`
  - MCP request, normalized page/entity result, confidence, cached payload
- `FactCheckResult`
  - claim, verdict, evidence refs, unresolved questions
- segment-level provenance fields such as:
  - `citationIds`
  - `researchSessionId`
  - `factCheckStatus`

That would let `src/lib` persist not just generated text, but the evidence chain behind it.

### 4. Pacing control gap

**Current state**

- No type in `src/lib` represents scene plans, beat structure, target tempo, tension ramps, or director controls.
- `StorySegment` stores only the final prose block, not how it was planned.
- The generation routes use fixed prompt templates and basic model controls in the route handlers, but those controls are not persisted in the library data model.
- There is no notion of stepwise generation state such as:
  - outline approved
  - beat plan approved
  - draft generated
  - revision requested

**Why this blocks ChronosMirror**

- ChronosMirror pacing control requires stateful orchestration, not just "append another paragraph".
- A director mode needs to know what beat the story is on, whether the branch should accelerate or decelerate, and what narrative obligation still needs to be satisfied.
- The current library can only save the final result after generation, not the pacing plan or the reasoning checkpoints that produced it.

**Upgrade direction**

Add first-class pacing and orchestration records, for example:

- `PacingPlan`
  - intended tempo, beat count, tension profile, chapter goal
- `SceneBeat`
  - beat order, purpose, focus character, conflict, reveal, exit condition
- `GenerationDirective`
  - user direction, system director note, safety note, validation requirement
- segment metadata such as:
  - `beatIndex`
  - `sceneId`
  - `pacingTags`
  - `generationMode`
  - `draftStatus`

This would let the library persist the structure ChronosMirror needs to do controlled multi-step generation instead of raw one-shot continuation.

## Summary

`src/lib` is currently a single-file JSON persistence layer with a small linked-list traversal helper. It is sufficient for the current app's basic story creation, continuation, and branching flow, but it is not yet a suitable foundation for ChronosMirror.

The main limitations are structural:

- no first-class character state
- no explicit historical timeline model
- no citation or MCP research persistence
- no pacing or director-mode state
- no validation, transaction, or concurrency controls

For ChronosMirror, `src/lib` should evolve from a thin JSON helper into a real domain layer with:

- richer story schemas
- a canonical shared type contract instead of duplicated story models
- separate repositories and graph services
- validation pipelines
- provenance storage
- generation-planning state
- database-backed persistence with transaction boundaries once concurrent editing or validation workflows matter

Without that shift, the rest of the stack will remain constrained to branch-local text continuation rather than historically grounded narrative orchestration.

exec
/usr/bin/zsh -lc "set -o noglob; sed -n '1,320p' src/app/api/stories/[id]/branch/route.ts" in /home/pjlab/fbh/fbh_project/gushi
 succeeded in 0ms:
import { NextRequest, NextResponse } from 'next/server';
import { storiesStore, segmentsStore, branchesStore, getOrderedChain, type StorySegment } from '@/lib/simple-db';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id: storyId } = params;
    const { segmentId, userDirection, branchTitle } = await request.json();

    if (!storyId || !segmentId || !userDirection) {
      return NextResponse.json({ error: '缺少必要参数: segmentId, userDirection' }, { status: 400 });
    }

    const stories = await storiesStore.load();
    const story = stories.find((s: any) => s.id === storyId);
    if (!story) return NextResponse.json({ error: '故事不存在' }, { status: 404 });

    const segments = await segmentsStore.load();
    const currentSegment = segments.find((s: any) => s.id === segmentId && s.storyId === storyId);
    if (!currentSegment) return NextResponse.json({ error: '段落不存在' }, { status: 404 });

    // Generate branch ID
    const branchId = `branch_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    // Create branch record
    const newBranch = {
      id: branchId,
      title: branchTitle || `分叉: ${userDirection}`,
      sourceSegmentId: segmentId,
      storyId,
      userDirection,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const branches = await branchesStore.load();
    branches.push(newBranch);
    await branchesStore.save(branches);

    // Mark source segment as branch point
    currentSegment.isBranchPoint = true;
    await segmentsStore.save(segments);

    // Build context: get ordered chain of main branch up to the source segment
    const mainChain = await getOrderedChain(storyId, 'main');
    const contextSegments = mainChain.filter(s => {
      if (s.id === segmentId) return true;
      // Include all ancestors
      let cur: StorySegment | undefined = s;
      while (cur?.parentSegmentId) {
        if (cur.parentSegmentId === segmentId) return false; // after source
        cur = mainChain.find(ms => ms.id === cur!.parentSegmentId);
      }
      return true;
    });
    // Simpler: just include main chain segments up to and including sourceSegment
    const idx = mainChain.findIndex(s => s.id === segmentId);
    const relevantChain = idx >= 0 ? mainChain.slice(0, idx + 1) : mainChain;

    const contextSummary = relevantChain.map((s: StorySegment) =>
      `${s.title ? `【${s.title}】` : ''}${s.content}`
    ).join('\n');

    const prompt = `故事标题：${story.title}
故事背景：${story.description || ''}

当前故事进展：
${contextSummary}

用户希望的故事走向：${userDirection}

请根据用户指定的方向，续写下一段（150-300字），保持古典文学风格，与前文情节连续。`;

    const baseUrl = process.env.AI_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4';
    const apiKey = process.env.AI_API_KEY || '';
    const model = process.env.AI_MODEL || 'glm-5.1';

    const aiResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: '你是一位精通中国历史的文学作家，擅长古典文学风格的写作。请用中文回答。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!aiResponse.ok) {
      const text = await aiResponse.text();
      throw new Error(`AI API error ${aiResponse.status}: ${text}`);
    }

    const data = await aiResponse.json();
    const aiContent = data.choices?.[0]?.message?.content || '';

    // Create new segment on the new branch
    const newSegment: StorySegment = {
      id: `seg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      storyId,
      title: branchTitle || `分叉: ${userDirection}`,
      content: aiContent,
      isBranchPoint: false,
      branchId, // new branch
      parentSegmentId: segmentId,
      imageUrls: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const allSegments = await segmentsStore.load();
    allSegments.push(newSegment);
    await segmentsStore.save(allSegments);

    return NextResponse.json({
      success: true,
      branch: newBranch,
      segment: newSegment,
      message: '分支创建成功'
    });

  } catch (error) {
    console.error('故事分叉失败:', error);
    return NextResponse.json(
      { error: '故事分叉失败', details: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}

exec
/usr/bin/zsh -lc "rg --files src | rg 'types/story\\.ts|story'" in /home/pjlab/fbh/fbh_project/gushi
 succeeded in 0ms:
src/components/story/StoryImageDisplay.tsx
src/app/story/[id]/page.tsx
src/types/story.ts

exec
/usr/bin/zsh -lc "set -o noglob; sed -n '1,260p' src/app/api/stories/[id]/route.ts" in /home/pjlab/fbh/fbh_project/gushi
 succeeded in 0ms:
import { NextRequest, NextResponse } from 'next/server';
import { storiesStore } from '@/lib/simple-db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const stories = await storiesStore.load();
    const story = stories.find((s: any) => s.id === params.id);

    if (!story) {
      return NextResponse.json({ error: '故事不存在' }, { status: 404 });
    }

    return NextResponse.json({ success: true, story });
  } catch (error) {
    return NextResponse.json({ error: '获取故事失败' }, { status: 500 });
  }
}

exec
/usr/bin/zsh -lc "set -o noglob; sed -n '1,260p' src/app/api/stories/[id]/segments/route.ts" in /home/pjlab/fbh/fbh_project/gushi
 succeeded in 0ms:
import { NextRequest, NextResponse } from 'next/server';
import { getOrderedChain, getStorySegments, type StorySegment } from '@/lib/simple-db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId') || 'main';
    const all = searchParams.get('all');

    if (all) {
      const segments = await getStorySegments(params.id);
      return NextResponse.json({ success: true, segments });
    }

    const segments = await getOrderedChain(params.id, branchId);
    return NextResponse.json({ success: true, segments, branchId });
  } catch (error) {
    console.error('获取段落失败:', error);
    return NextResponse.json({ 
      error: '获取段落失败',
      details: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 });
  }
}

exec
/usr/bin/zsh -lc "set -o noglob; sed -n '1,320p' src/app/api/stories/[id]/tree/route.ts" in /home/pjlab/fbh/fbh_project/gushi
 succeeded in 0ms:
import { NextRequest, NextResponse } from 'next/server';
import { storiesStore, segmentsStore, branchesStore, getOrderedChain, type StorySegment, type StoryBranch } from '@/lib/simple-db';

function buildTreeData(segments: StorySegment[], branches: StoryBranch[], storyId: string) {
  const storySegments = segments.filter(s => s.storyId === storyId);
  const storyBranches = branches.filter(b => b.storyId === storyId);

  // Build main line chain via parentSegmentId
  const mainSegs = storySegments.filter(s => s.branchId === 'main');
  const mainLine: any[] = [];
  let current = mainSegs.find(s => !s.parentSegmentId);
  const visited = new Set<string>();

  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    mainLine.push({ ...current, children: [] as any[] });
    current = mainSegs.find(s => s.parentSegmentId === current!.id);
  }

  // Attach branches to main line nodes
  for (const branch of storyBranches) {
    const sourceIdx = mainLine.findIndex(s => s.id === branch.sourceSegmentId);
    if (sourceIdx === -1) continue;

    // Build branch chain via parentSegmentId
    const branchSegs = storySegments.filter(s => s.branchId === branch.id);
    const branchChain: any[] = [];
    let bCur = branchSegs.find(s => s.parentSegmentId === branch.sourceSegmentId);
    const bVisited = new Set<string>();

    while (bCur && !bVisited.has(bCur.id)) {
      bVisited.add(bCur.id);
      branchChain.push({
        ...bCur,
        branchTitle: branch.title,
        isBranch: true,
        children: []
      });
      bCur = branchSegs.find(s => s.parentSegmentId === bCur!.id);
    }

    if (branchChain.length > 0) {
      mainLine[sourceIdx].children.push({
        id: branch.id,
        title: branch.title,
        userDirection: branch.userDirection,
        sourceSegmentId: branch.sourceSegmentId,
        segments: branchChain
      });
    }
  }

  return { mainLine, branches: storyBranches };
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id: storyId } = params;

    const stories = await storiesStore.load();
    const story = stories.find((s: any) => s.id === storyId);
    if (!story) return NextResponse.json({ error: '故事不存在' }, { status: 404 });

    const segments = await segmentsStore.load();
    const branches = await branchesStore.load();

    const { mainLine, branches: storyBranches } = buildTreeData(segments, branches, storyId);

    return NextResponse.json({
      success: true,
      story,
      tree: mainLine,
      branches: storyBranches,
      totalSegments: segments.filter((s: any) => s.storyId === storyId).length,
      totalBranches: storyBranches.length
    });

  } catch (error) {
    console.error('获取故事树失败:', error);
    return NextResponse.json({ error: '获取故事树失败' }, { status: 500 });
  }
}

exec
/usr/bin/zsh -lc "sed -n '1,260p' src/types/story.ts" in /home/pjlab/fbh/fbh_project/gushi
exec
/usr/bin/zsh -lc "set -o noglob; sed -n '1,320p' src/app/api/stories/[id]/stream-continue/route.ts" in /home/pjlab/fbh/fbh_project/gushi
exec
/usr/bin/zsh -lc "set -o noglob; sed -n '1,320p' src/app/story/[id]/page.tsx" in /home/pjlab/fbh/fbh_project/gushi
 succeeded in 0ms:
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
 succeeded in 0ms:
import { NextRequest, NextResponse } from 'next/server';
import { storiesStore, segmentsStore, getOrderedChain, type StorySegment } from '@/lib/simple-db';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id: storyId } = params;
    const { branchId = 'main' } = await request.json();

    if (!storyId) {
      return NextResponse.json({ error: '缺少参数' }, { status: 400 });
    }

    const stories = await storiesStore.load();
    const story = stories.find((s: any) => s.id === storyId);
    if (!story) return NextResponse.json({ error: '故事不存在' }, { status: 404 });

    // Get ordered chain to find tail segment
    const chain = await getOrderedChain(storyId, branchId);
    if (chain.length === 0) {
      return NextResponse.json({ error: '该分支没有段落' }, { status: 404 });
    }
    const tailSegment = chain[chain.length - 1];

    // Build context from the ordered chain
    const contextSummary = chain.map((s: StorySegment) =>
      `${s.title ? `【${s.title}】` : ''}${s.content}`
    ).join('\n');

    const prompt = `故事标题：${story.title}
故事背景：${story.description || ''}

当前故事进展：
${contextSummary}

请续写下一段（150-300字），保持古典文学风格，与前文情节连续。`;

    const baseUrl = process.env.AI_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4';
    const apiKey = process.env.AI_API_KEY || '';
    const model = process.env.AI_MODEL || 'glm-5.1';

    const aiResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: '你是一位精通中国历史的文学作家，擅长古典文学风格的写作。请用中文回答。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
        stream: true
      })
    });

    if (!aiResponse.ok) {
      const text = await aiResponse.text();
      return NextResponse.json({ error: `AI API error: ${text}` }, { status: 500 });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let fullContent = '';

        try {
          const reader = aiResponse.body?.getReader();
          if (!reader) throw new Error('No response body');

          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith('data: ')) continue;
              const data = trimmed.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  fullContent += content;
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                }
              } catch {}
            }
          }

          // Save the completed segment
          const allSegments = await segmentsStore.load();
          const newSegment: StorySegment = {
            id: `seg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            storyId,
            title: '故事续写',
            content: fullContent,
            isBranchPoint: false,
            branchId,
            parentSegmentId: tailSegment.id,
            imageUrls: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          allSegments.push(newSegment);
          await segmentsStore.save(allSegments);

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    });

  } catch (error) {
    console.error('流式续写失败:', error);
    return NextResponse.json(
      { error: '流式续写失败', details: String(error) },
      { status: 500 }
    );
  }
}

 succeeded in 0ms:
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface Story {
  id: string;
  title: string;
  description?: string;
  author?: string;
}

interface StorySegment {
  id: string;
  title?: string;
  content: string;
  isBranchPoint: boolean;
  storyId: string;
  branchId: string;
  parentSegmentId?: string;
  imageUrls: string[];
}

interface StoryBranch {
  id: string;
  title: string;
  userDirection: string;
  sourceSegmentId: string;
}

export default function StoryDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [story, setStory] = useState<Story | null>(null);
  const [segments, setSegments] = useState<StorySegment[]>([]);
  const [branches, setBranches] = useState<StoryBranch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [continuing, setContinuing] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [currentBranchId, setCurrentBranchId] = useState('main');
  const [showBranchDialog, setShowBranchDialog] = useState(false);
  const [branchingSegmentId, setBranchingSegmentId] = useState<string | null>(null);
  const [userDirection, setUserDirection] = useState('');
  const [customDirection, setCustomDirection] = useState('');
  const [branching, setBranching] = useState(false);
  const [branchStep, setBranchStep] = useState('');
  const [branchPreview, setBranchPreview] = useState('');

  const loadBranchSegments = useCallback(async (branchId: string) => {
    const segRes = await fetch(`/api/stories/${id}/segments?branchId=${branchId}`);
    if (segRes.ok) {
      const segData = await segRes.json();
      setSegments(segData.segments || []);
    }
  }, [id]);

  const loadTree = useCallback(async () => {
    const treeRes = await fetch(`/api/stories/${id}/tree`);
    if (treeRes.ok) {
      const treeData = await treeRes.json();
      setBranches(treeData.branches || []);
    }
  }, [id]);

  useEffect(() => {
    async function load() {
      try {
        const [sRes, treeRes] = await Promise.all([
          fetch(`/api/stories/${id}`),
          fetch(`/api/stories/${id}/tree`)
        ]);
        if (!sRes.ok || !treeRes.ok) throw new Error('加载失败');
        
        const sData = await sRes.json();
        const treeData = await treeRes.json();
        
        setStory(sData.story);
        setBranches(treeData.branches || []);
        setCurrentBranchId('main');
      } catch (e) {
        setError(e instanceof Error ? e.message : '未知错误');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  // Load segments for current branch
  useEffect(() => {
    if (!loading) {
      loadBranchSegments(currentBranchId);
    }
  }, [currentBranchId, loading, loadBranchSegments]);

  // Find tail segment: the one whose id is not referenced as parentSegmentId by any other segment
  const getTailSegment = () => {
    const childIds = new Set(segments.map(s => s.parentSegmentId).filter(Boolean));
    return segments.find(s => !childIds.has(s.id));
  };

  const handleContinue = async () => {
    if (continuing) return;
    
    setContinuing(true);
    setNewContent('');

    try {
      const res = await fetch(`/api/stories/${id}/stream-continue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branchId: currentBranchId })
      });

      if (!res.ok) throw new Error('续写失败');
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let full = '';

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') break;
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                full += parsed.content;
                setNewContent(full);
              }
            } catch {}
          }
        }
      }

      // Reload segments
      await loadBranchSegments(currentBranchId);
      await loadTree();
      setNewContent('');
    } catch (e) {
      alert('续写失败: ' + (e instanceof Error ? e.message : '请重试'));
    } finally {
      setContinuing(false);
    }
  };

  const handleBranch = async (segmentId: string) => {
    setBranchingSegmentId(segmentId);
    setUserDirection('');
    setCustomDirection('');
    setShowBranchDialog(true);
  };

  const confirmBranch = async () => {
    if (!branchingSegmentId) return;
    
    const direction = customDirection.trim() || userDirection;
    if (!direction) {
      alert('请选择或输入分叉方向');
      return;
    }

    setBranching(true);
    setBranchStep('thinking');
    setBranchPreview('');

    try {
      await new Promise(r => setTimeout(r, 800));
      setBranchStep('generating');

      const res = await fetch(`/api/stories/${id}/branch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          segmentId: branchingSegmentId,
          userDirection: direction
        })
      });
      if (!res.ok) throw new Error('分叉失败');
      
      const data = await res.json();
      setBranchStep('saving');
      setBranchPreview(data.segment?.content || '分叉剧情已生成');

      await new Promise(r => setTimeout(r, 500));

      // Refresh
      await loadBranchSegments(currentBranchId);
      await loadTree();
      
      setShowBranchDialog(false);
      setBranchingSegmentId(null);
    } catch (e) {
      alert('分叉失败: ' + (e instanceof Error ? e.message : '请重试'));
    } finally {
      setBranching(false);
      setBranchStep('');
      setBranchPreview('');
    }
  };

  const switchBranch = async (branchId: string) => {
    setCurrentBranchId(branchId);
    // segments will be loaded via useEffect
  };

  const getCurrentBranchPath = () => {
    if (currentBranchId === 'main') return ['主线'];
    const branch = branches.find(b => b.id === currentBranchId);
    if (branch) {
      // Find source segment title from main chain - use tree data
      return [branch.userDirection || branch.title];
    }
    return [currentBranchId];
  };

  // Check how many branches originate from a segment
  const getBranchCountForSegment = (segmentId: string) => {
    return branches.filter(b => b.sourceSegmentId === segmentId).length;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--paper)' }}>
        <div className="text-center">
          <div className="text-4xl mb-4 animate-bounce">📜</div>
          <p className="text-[var(--muted)]">卷轴展开中...</p>
        </div>
      </div>
    );
  }

  if (error || !story) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--paper)' }}>
        <div className="text-center">
          <p className="text-[var(--muted)] mb-4">{error || '故事不存在'}</p>
          <Link href="/" className="text-[var(--gold)] hover:underline">← 返回故事列表</Link>
        </div>
      </div>
    );
  }

  const BranchDialog = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl border border-[var(--border)] p-6 max-w-lg w-full mx-4 shadow-xl">
        {branching ? (
          <div className="text-center py-4">
            <div className="mb-6">
              <div className="flex items-center justify-center gap-2 mb-4">
                {['thinking', 'generating', 'saving'].map((step, i) => {
                  const steps = ['构思分叉方向', 'AI 生成剧情', '保存分支'];
                  const isActive = branchStep === step;
                  const isDone = ['thinking', 'generating', 'saving'].indexOf(branchStep) > i;
                  return (
                    <div key={step} className="flex items-center gap-2">
                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        isActive ? 'bg-[var(--accent)] text-white shadow-md scale-105' :
                        isDone ? 'bg-[var(--jade)] text-white' :
                        'bg-gray-100 text-[var(--muted)]'
                      }`}>
                        {isDone ? '✓' : isActive && <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                        {steps[i]}
                      </div>
                      {i < 2 && <div className={`w-6 h-px ${isDone ? 'bg-[var(--jade)]' : 'bg-gray-200'}`} />}
                    </div>
                  );
                })}
              </div>
            </div>

            {branchPreview && (
              <div className="mt-4 p-4 rounded-lg bg-[var(--paper)] border border-[var(--border)] text-left max-h-40 overflow-y-auto">
                <p className="text-xs text-[var(--muted)] mb-2">生成预览：</p>
                <p className="text-sm text-[var(--ink)] prose-chinese">{branchPreview.slice(0, 200)}{branchPreview.length > 200 ? '...' : ''}</p>
              </div>
            )}

            <p className="text-sm text-[var(--muted)] mt-4 animate-pulse">
              {branchStep === 'thinking' && '🔮 正在分析故事走向...'}
              {branchStep === 'generating' && '✍️ AI 正在书写分叉剧情，请稍候...'}
              {branchStep === 'saving' && '💾 正在保存分支...'}
            </p>
          </div>
        ) : (
          <>
            <h3 className="text-lg font-bold text-[var(--ink)] mb-1">⚔ 分叉剧情</h3>
            <p className="text-sm text-[var(--muted)] mb-4">选择一个方向，或输入你想要的历史走向</p>
            
            <div className="space-y-2 mb-5">
              {[
                { icon: '🗡️', label: '加强战争策略', desc: '以更精妙的战术改写战局' },
                { icon: '🤝', label: '转向外交途径', desc: '以谈判和联盟化解危机' },
                { icon: '🏛️', label: '专注内政发展', desc: '休养生息，积蓄力量' },
                { icon: '🔄', label: '寻求盟友帮助', desc: '联合他人共同应对挑战' },
              ].map((option) => (
                <button
                  key={option.label}
                  onClick={() => { setUserDirection(option.label); setCustomDirection(''); }}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
                    userDirection === option.label
                      ? 'border-[var(--accent)] bg-red-50 shadow-sm'
                      : 'border-[var(--border)] hover:border-[var(--gold)]/50 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>{option.icon}</span>
                    <span className={`font-medium text-sm ${userDirection === option.label ? 'text-[var(--accent)]' : 'text-[var(--ink)]'}`}>
                      {option.label}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--muted)] mt-0.5 ml-7">{option.desc}</p>
                </button>
              ))}
            </div>

            <div className="mb-5">

codex
I have enough context to write this cleanly. I’m pulling line-numbered views of the core files once so the research note can point to exact code locations instead of hand-wavy descriptions.
exec
/usr/bin/zsh -lc "set -o noglob; nl -ba src/app/api/stories/[id]/branch/route.ts | sed -n '1,260p'" in /home/pjlab/fbh/fbh_project/gushi
exec
/usr/bin/zsh -lc "nl -ba src/app/api/stories/route.ts | sed -n '1,220p'" in /home/pjlab/fbh/fbh_project/gushi
 succeeded in 0ms:
     1	import { NextRequest, NextResponse } from 'next/server';
     2	import { storiesStore, segmentsStore, type Story, type StorySegment } from '@/lib/simple-db';
     3	
     4	export async function GET() {
     5	  try {
     6	    const stories = await storiesStore.load();
     7	    
     8	    // 按创建时间倒序排列
     9	    const sortedStories = stories.sort((a: Story, b: Story) => 
    10	      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    11	    );
    12	
    13	    return NextResponse.json({
    14	      success: true,
    15	      stories: sortedStories,
    16	      total: sortedStories.length
    17	    });
    18	  } catch (error) {
    19	    console.error('获取故事列表失败:', error);
    20	    return NextResponse.json(
    21	      { 
    22	        error: '获取故事列表失败',
    23	        details: error instanceof Error ? error.message : '未知错误'
    24	      },
    25	      { status: 500 }
    26	    );
    27	  }
    28	}
    29	
    30	export async function POST(request: NextRequest) {
    31	  try {
    32	    const body = await request.json();
    33	    const { title, description, author } = body;
    34	
    35	    if (!title) {
    36	      return NextResponse.json(
    37	        { error: '故事标题是必填项' },
    38	        { status: 400 }
    39	      );
    40	    }
    41	
    42	    const stories = await storiesStore.load();
    43	
    44	    // 幂等：标题已存在则返回已有故事
    45	    const existing = stories.find((s: Story) => s.title === title);
    46	    if (existing) {
    47	      return NextResponse.json({
    48	        success: true,
    49	        story: existing,
    50	        message: '故事已存在'
    51	      });
    52	    }
    53	
    54	    const newStory: Story = {
    55	      id: `story_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    56	      title,
    57	      description: description || '',
    58	      author: author || '佚名',
    59	      createdAt: new Date().toISOString(),
    60	      updatedAt: new Date().toISOString()
    61	    };
    62	
    63	    stories.push(newStory);
    64	    await storiesStore.save(stories);
    65	
    66	    // 自动生成首个段落（故事开篇）
    67	    const firstSegment: StorySegment = {
    68	      id: `seg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    69	      title: `${title}·开篇`,
    70	      content: `《${title}》的故事开始了...`, // 临时内容，后续通过 AI 生成完整开篇
    71	      isBranchPoint: false,
    72	      createdAt: new Date().toISOString(),
    73	      updatedAt: new Date().toISOString(),
    74	      storyId: newStory.id,
    75	      branchId: 'main',
    76	      parentSegmentId: '',
    77	      imageUrls: []
    78	    };
    79	
    80	    const segments = await segmentsStore.load();
    81	    segments.push(firstSegment);
    82	    await segmentsStore.save(segments);
    83	
    84	    // 更新故事的 rootSegmentId
    85	    newStory.rootSegmentId = firstSegment.id;
    86	    const updatedStories = stories.map((s: Story) => s.id === newStory.id ? newStory : s);
    87	    await storiesStore.save(updatedStories);
    88	
    89	    return NextResponse.json({
    90	      success: true,
    91	      story: newStory,
    92	      firstSegment,
    93	      message: '故事创建成功，已生成开篇段落'
    94	    }, { status: 201 });
    95	
    96	  } catch (error) {
    97	    console.error('创建故事失败:', error);
    98	    return NextResponse.json(
    99	      { 
   100	        error: '创建故事失败',
   101	        details: error instanceof Error ? error.message : '未知错误'
   102	      },
   103	      { status: 500 }
   104	    );
   105	  }
   106	}

 succeeded in 0ms:
     1	import { NextRequest, NextResponse } from 'next/server';
     2	import { storiesStore, segmentsStore, branchesStore, getOrderedChain, type StorySegment } from '@/lib/simple-db';
     3	
     4	export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
     5	  try {
     6	    const { id: storyId } = params;
     7	    const { segmentId, userDirection, branchTitle } = await request.json();
     8	
     9	    if (!storyId || !segmentId || !userDirection) {
    10	      return NextResponse.json({ error: '缺少必要参数: segmentId, userDirection' }, { status: 400 });
    11	    }
    12	
    13	    const stories = await storiesStore.load();
    14	    const story = stories.find((s: any) => s.id === storyId);
    15	    if (!story) return NextResponse.json({ error: '故事不存在' }, { status: 404 });
    16	
    17	    const segments = await segmentsStore.load();
    18	    const currentSegment = segments.find((s: any) => s.id === segmentId && s.storyId === storyId);
    19	    if (!currentSegment) return NextResponse.json({ error: '段落不存在' }, { status: 404 });
    20	
    21	    // Generate branch ID
    22	    const branchId = `branch_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    23	
    24	    // Create branch record
    25	    const newBranch = {
    26	      id: branchId,
    27	      title: branchTitle || `分叉: ${userDirection}`,
    28	      sourceSegmentId: segmentId,
    29	      storyId,
    30	      userDirection,
    31	      createdAt: new Date().toISOString(),
    32	      updatedAt: new Date().toISOString()
    33	    };
    34	
    35	    const branches = await branchesStore.load();
    36	    branches.push(newBranch);
    37	    await branchesStore.save(branches);
    38	
    39	    // Mark source segment as branch point
    40	    currentSegment.isBranchPoint = true;
    41	    await segmentsStore.save(segments);
    42	
    43	    // Build context: get ordered chain of main branch up to the source segment
    44	    const mainChain = await getOrderedChain(storyId, 'main');
    45	    const contextSegments = mainChain.filter(s => {
    46	      if (s.id === segmentId) return true;
    47	      // Include all ancestors
    48	      let cur: StorySegment | undefined = s;
    49	      while (cur?.parentSegmentId) {
    50	        if (cur.parentSegmentId === segmentId) return false; // after source
    51	        cur = mainChain.find(ms => ms.id === cur!.parentSegmentId);
    52	      }
    53	      return true;
    54	    });
    55	    // Simpler: just include main chain segments up to and including sourceSegment
    56	    const idx = mainChain.findIndex(s => s.id === segmentId);
    57	    const relevantChain = idx >= 0 ? mainChain.slice(0, idx + 1) : mainChain;
    58	
    59	    const contextSummary = relevantChain.map((s: StorySegment) =>
    60	      `${s.title ? `【${s.title}】` : ''}${s.content}`
    61	    ).join('\n');
    62	
    63	    const prompt = `故事标题：${story.title}
    64	故事背景：${story.description || ''}
    65	
    66	当前故事进展：
    67	${contextSummary}
    68	
    69	用户希望的故事走向：${userDirection}
    70	
    71	请根据用户指定的方向，续写下一段（150-300字），保持古典文学风格，与前文情节连续。`;
    72	
    73	    const baseUrl = process.env.AI_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4';
    74	    const apiKey = process.env.AI_API_KEY || '';
    75	    const model = process.env.AI_MODEL || 'glm-5.1';
    76	
    77	    const aiResponse = await fetch(`${baseUrl}/chat/completions`, {
    78	      method: 'POST',
    79	      headers: {
    80	        'Content-Type': 'application/json',
    81	        'Authorization': `Bearer ${apiKey}`,
    82	      },
    83	      body: JSON.stringify({
    84	        model,
    85	        messages: [
    86	          { role: 'system', content: '你是一位精通中国历史的文学作家，擅长古典文学风格的写作。请用中文回答。' },
    87	          { role: 'user', content: prompt }
    88	        ],
    89	        temperature: 0.7,
    90	        max_tokens: 2000
    91	      })
    92	    });
    93	
    94	    if (!aiResponse.ok) {
    95	      const text = await aiResponse.text();
    96	      throw new Error(`AI API error ${aiResponse.status}: ${text}`);
    97	    }
    98	
    99	    const data = await aiResponse.json();
   100	    const aiContent = data.choices?.[0]?.message?.content || '';
   101	
   102	    // Create new segment on the new branch
   103	    const newSegment: StorySegment = {
   104	      id: `seg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
   105	      storyId,
   106	      title: branchTitle || `分叉: ${userDirection}`,
   107	      content: aiContent,
   108	      isBranchPoint: false,
   109	      branchId, // new branch
   110	      parentSegmentId: segmentId,
   111	      imageUrls: [],
   112	      createdAt: new Date().toISOString(),
   113	      updatedAt: new Date().toISOString()
   114	    };
   115	
   116	    const allSegments = await segmentsStore.load();
   117	    allSegments.push(newSegment);
   118	    await segmentsStore.save(allSegments);
   119	
   120	    return NextResponse.json({
   121	      success: true,
   122	      branch: newBranch,
   123	      segment: newSegment,
   124	      message: '分支创建成功'
   125	    });
   126	
   127	  } catch (error) {
   128	    console.error('故事分叉失败:', error);
   129	    return NextResponse.json(
   130	      { error: '故事分叉失败', details: error instanceof Error ? error.message : '未知错误' },
   131	      { status: 500 }
   132	    );
   133	  }
   134	}

exec
/usr/bin/zsh -lc "nl -ba src/lib/simple-db.ts | sed -n '1,220p'" in /home/pjlab/fbh/fbh_project/gushi
 succeeded in 0ms:
     1	import fs from 'fs/promises';
     2	import path from 'path';
     3	
     4	const DATA_DIR = path.join(process.cwd(), 'data');
     5	
     6	async function ensureDataDir() {
     7	  try {
     8	    await fs.access(DATA_DIR);
     9	  } catch {
    10	    await fs.mkdir(DATA_DIR, { recursive: true });
    11	  }
    12	}
    13	
    14	class SimpleStore<T> {
    15	  constructor(private filename: string) {
    16	    this.dataPath = path.join(DATA_DIR, filename);
    17	  }
    18	
    19	  private dataPath: string;
    20	
    21	  async load(): Promise<T[]> {
    22	    await ensureDataDir();
    23	    try {
    24	      const data = await fs.readFile(this.dataPath, 'utf-8');
    25	      return JSON.parse(data);
    26	    } catch {
    27	      return [];
    28	    }
    29	  }
    30	
    31	  async save(data: T[]): Promise<void> {
    32	    await ensureDataDir();
    33	    await fs.writeFile(this.dataPath, JSON.stringify(data, null, 2));
    34	  }
    35	}
    36	
    37	interface Story {
    38	  id: string;
    39	  title: string;
    40	  description?: string;
    41	  author?: string;
    42	  createdAt: string;
    43	  updatedAt: string;
    44	  rootSegmentId?: string;
    45	}
    46	
    47	interface StorySegment {
    48	  id: string;
    49	  title?: string;
    50	  content: string;
    51	  isBranchPoint: boolean;
    52	  createdAt: string;
    53	  updatedAt: string;
    54	  storyId: string;
    55	  branchId: string;
    56	  parentSegmentId?: string;
    57	  imageUrls: string[];
    58	}
    59	
    60	interface StoryBranch {
    61	  id: string;
    62	  title: string;
    63	  description?: string;
    64	  sourceSegmentId: string;
    65	  storyId: string;
    66	  userDirection: string;
    67	  createdAt: string;
    68	  updatedAt: string;
    69	}
    70	
    71	const storiesStore = new SimpleStore<Story>('stories.json');
    72	const segmentsStore = new SimpleStore<StorySegment>('segments.json');
    73	const branchesStore = new SimpleStore<StoryBranch>('branches.json');
    74	
    75	// Get ordered chain for a branch by following parentSegmentId links
    76	async function getOrderedChain(storyId: string, branchId: string): Promise<StorySegment[]> {
    77	  const segments = await segmentsStore.load();
    78	  const storySegments = segments.filter(s => s.storyId === storyId && s.branchId === branchId);
    79	
    80	  if (branchId === 'main') {
    81	    // Main branch: start from root (no parentSegmentId)
    82	    const chain: StorySegment[] = [];
    83	    let current = storySegments.find(s => !s.parentSegmentId);
    84	    const visited = new Set<string>();
    85	    while (current && !visited.has(current.id)) {
    86	      visited.add(current.id);
    87	      chain.push(current);
    88	      current = storySegments.find(s => s.parentSegmentId === current!.id);
    89	    }
    90	    return chain;
    91	  } else {
    92	    // Non-main branch: start from the segment whose parent is the sourceSegmentId
    93	    const branches = await branchesStore.load();
    94	    const branch = branches.find(b => b.id === branchId);
    95	    if (!branch) return [];
    96	
    97	    const chain: StorySegment[] = [];
    98	    let current = storySegments.find(s => s.parentSegmentId === branch.sourceSegmentId);
    99	    const visited = new Set<string>();
   100	    while (current && !visited.has(current.id)) {
   101	      visited.add(current.id);
   102	      chain.push(current);
   103	      current = storySegments.find(s => s.parentSegmentId === current!.id);
   104	    }
   105	    return chain;
   106	  }
   107	}
   108	
   109	// Get the tail segment of a branch chain
   110	async function getTailSegment(storyId: string, branchId: string): Promise<StorySegment | null> {
   111	  const chain = await getOrderedChain(storyId, branchId);
   112	  return chain.length > 0 ? chain[chain.length - 1] : null;
   113	}
   114	
   115	// Get all segments for a story
   116	async function getStorySegments(storyId: string): Promise<StorySegment[]> {
   117	  const segments = await segmentsStore.load();
   118	  return segments.filter(s => s.storyId === storyId);
   119	}
   120	
   121	// Get branches for a story
   122	async function getStoryBranches(storyId: string): Promise<StoryBranch[]> {
   123	  const branches = await branchesStore.load();
   124	  return branches.filter(b => b.storyId === storyId);
   125	}
   126	
   127	export {
   128	  storiesStore,
   129	  segmentsStore,
   130	  branchesStore,
   131	  getOrderedChain,
   132	  getTailSegment,
   133	  getStorySegments,
   134	  getStoryBranches,
   135	  type Story,
   136	  type StorySegment,
   137	  type StoryBranch
   138	};

exec
/usr/bin/zsh -lc "set -o noglob; nl -ba src/app/api/stories/[id]/stream-continue/route.ts | sed -n '1,320p'" in /home/pjlab/fbh/fbh_project/gushi
 succeeded in 0ms:
     1	import { NextRequest, NextResponse } from 'next/server';
     2	import { storiesStore, segmentsStore, getOrderedChain, type StorySegment } from '@/lib/simple-db';
     3	
     4	export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
     5	  try {
     6	    const { id: storyId } = params;
     7	    const { branchId = 'main' } = await request.json();
     8	
     9	    if (!storyId) {
    10	      return NextResponse.json({ error: '缺少参数' }, { status: 400 });
    11	    }
    12	
    13	    const stories = await storiesStore.load();
    14	    const story = stories.find((s: any) => s.id === storyId);
    15	    if (!story) return NextResponse.json({ error: '故事不存在' }, { status: 404 });
    16	
    17	    // Get ordered chain to find tail segment
    18	    const chain = await getOrderedChain(storyId, branchId);
    19	    if (chain.length === 0) {
    20	      return NextResponse.json({ error: '该分支没有段落' }, { status: 404 });
    21	    }
    22	    const tailSegment = chain[chain.length - 1];
    23	
    24	    // Build context from the ordered chain
    25	    const contextSummary = chain.map((s: StorySegment) =>
    26	      `${s.title ? `【${s.title}】` : ''}${s.content}`
    27	    ).join('\n');
    28	
    29	    const prompt = `故事标题：${story.title}
    30	故事背景：${story.description || ''}
    31	
    32	当前故事进展：
    33	${contextSummary}
    34	
    35	请续写下一段（150-300字），保持古典文学风格，与前文情节连续。`;
    36	
    37	    const baseUrl = process.env.AI_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4';
    38	    const apiKey = process.env.AI_API_KEY || '';
    39	    const model = process.env.AI_MODEL || 'glm-5.1';
    40	
    41	    const aiResponse = await fetch(`${baseUrl}/chat/completions`, {
    42	      method: 'POST',
    43	      headers: {
    44	        'Content-Type': 'application/json',
    45	        'Authorization': `Bearer ${apiKey}`,
    46	      },
    47	      body: JSON.stringify({
    48	        model,
    49	        messages: [
    50	          { role: 'system', content: '你是一位精通中国历史的文学作家，擅长古典文学风格的写作。请用中文回答。' },
    51	          { role: 'user', content: prompt }
    52	        ],
    53	        temperature: 0.7,
    54	        max_tokens: 2000,
    55	        stream: true
    56	      })
    57	    });
    58	
    59	    if (!aiResponse.ok) {
    60	      const text = await aiResponse.text();
    61	      return NextResponse.json({ error: `AI API error: ${text}` }, { status: 500 });
    62	    }
    63	
    64	    const encoder = new TextEncoder();
    65	    const stream = new ReadableStream({
    66	      async start(controller) {
    67	        let fullContent = '';
    68	
    69	        try {
    70	          const reader = aiResponse.body?.getReader();
    71	          if (!reader) throw new Error('No response body');
    72	
    73	          const decoder = new TextDecoder();
    74	          let buffer = '';
    75	
    76	          while (true) {
    77	            const { done, value } = await reader.read();
    78	            if (done) break;
    79	
    80	            buffer += decoder.decode(value, { stream: true });
    81	            const lines = buffer.split('\n');
    82	            buffer = lines.pop() || '';
    83	
    84	            for (const line of lines) {
    85	              const trimmed = line.trim();
    86	              if (!trimmed || !trimmed.startsWith('data: ')) continue;
    87	              const data = trimmed.slice(6);
    88	              if (data === '[DONE]') continue;
    89	
    90	              try {
    91	                const parsed = JSON.parse(data);
    92	                const content = parsed.choices?.[0]?.delta?.content;
    93	                if (content) {
    94	                  fullContent += content;
    95	                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
    96	                }
    97	              } catch {}
    98	            }
    99	          }
   100	
   101	          // Save the completed segment
   102	          const allSegments = await segmentsStore.load();
   103	          const newSegment: StorySegment = {
   104	            id: `seg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
   105	            storyId,
   106	            title: '故事续写',
   107	            content: fullContent,
   108	            isBranchPoint: false,
   109	            branchId,
   110	            parentSegmentId: tailSegment.id,
   111	            imageUrls: [],
   112	            createdAt: new Date().toISOString(),
   113	            updatedAt: new Date().toISOString()
   114	          };
   115	
   116	          allSegments.push(newSegment);
   117	          await segmentsStore.save(allSegments);
   118	
   119	          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
   120	          controller.close();
   121	        } catch (err) {
   122	          controller.error(err);
   123	        }
   124	      }
   125	    });
   126	
   127	    return new Response(stream, {
   128	      headers: {
   129	        'Content-Type': 'text/event-stream',
   130	        'Cache-Control': 'no-cache',
   131	        'Connection': 'keep-alive',
   132	      }
   133	    });
   134	
   135	  } catch (error) {
   136	    console.error('流式续写失败:', error);
   137	    return NextResponse.json(
   138	      { error: '流式续写失败', details: String(error) },
   139	      { status: 500 }
   140	    );
   141	  }
   142	}

exec
/usr/bin/zsh -lc "nl -ba src/types/story.ts | sed -n '1,240p'" in /home/pjlab/fbh/fbh_project/gushi
exec
/usr/bin/zsh -lc "set -o noglob; nl -ba src/app/api/stories/[id]/continue/route.ts | sed -n '1,240p'" in /home/pjlab/fbh/fbh_project/gushi
 succeeded in 0ms:
     1	// 故事相关类型定义
     2	export type Story = {
     3	  id: string;
     4	  title: string;
     5	  description?: string;
     6	  author?: string;
     7	  createdAt: string;
     8	  updatedAt: string;
     9	  rootSegmentId?: string;
    10	};
    11	
    12	export type StorySegment = {
    13	  id: string;
    14	  title?: string;
    15	  content: string;
    16	  isBranchPoint: boolean;
    17	  createdAt: string;
    18	  updatedAt: string;
    19	  storyId: string;
    20	  branchId: string; // 所属分支 ID，主线的 branchId 为 "main"
    21	  parentSegmentId: string; // 父段落 ID（用于构建分支树）
    22	  imageUrls: string[];
    23	};
    24	
    25	export type StoryBranch = {
    26	  id: string;
    27	  title: string;
    28	  description?: string;
    29	  sourceSegmentId: string; // 从哪个段落分叉出来的
    30	  storyId: string;
    31	  userDirection: string; // 用户输入的分叉方向描述
    32	  createdAt: string;
    33	  updatedAt: string;
    34	};
    35	
    36	// API 请求/响应类型
    37	export type ContinueStoryRequest = {
    38	  segmentId: string;
    39	  branchId: string; // 当前分支 ID
    40	  content?: string;
    41	  style?: string;
    42	  characters?: string[];
    43	};
    44	
    45	export type BranchStoryRequest = {
    46	  segmentId: string;
    47	  userDirection: string; // 用户输入的分叉方向描述
    48	  branchTitle?: string; // 分支标题（可选，可为空让 AI 生成）
    49	};
    50	
    51	export type StoryResponse = {
    52	  segments: StorySegment[];
    53	  branches: StoryBranch[];
    54	  currentSegment: StorySegment;
    55	};
    56	
    57	// UI 组件类型
    58	export type TreeNode = {
    59	  id: string;
    60	  title?: string;
    61	  content?: string;
    62	  isBranchPoint: boolean;
    63	  children: TreeNode[];
    64	  branchId: string;
    65	  branchTitle?: string;
    66	  parentSegmentId?: string;
    67	};
    68	
    69	// 向后兼容的类实现
    70	class StoryClass {
    71	  id!: string;
    72	  title!: string;
    73	  description?: string;
    74	  author?: string;
    75	  createdAt!: string;
    76	  updatedAt!: string;
    77	  rootSegmentId?: string;
    78	  constructor(data: Story) { Object.assign(this, data); }
    79	}
    80	
    81	class StorySegmentClass {
    82	  id!: string;
    83	  title?: string;
    84	  content!: string;
    85	  isBranchPoint!: boolean;
    86	  createdAt!: string;
    87	  updatedAt!: string;
    88	  storyId!: string;
    89	  branchId!: string; // 所属分支 ID，主线的 branchId 为 "main"
    90	  parentSegmentId!: string; // 父段落 ID（用于构建分支树）
    91	  imageUrls!: string[];
    92	  constructor(data: StorySegment) { Object.assign(this, data); }
    93	}
    94	
    95	class StoryBranchClass {
    96	  id!: string;
    97	  title!: string;
    98	  description?: string;
    99	  sourceSegmentId!: string; // 从哪个段落分叉出来的
   100	  storyId!: string;
   101	  userDirection!: string; // 用户输入的分叉方向描述
   102	  createdAt!: string;
   103	  updatedAt!: string;
   104	  constructor(data: StoryBranch) { Object.assign(this, data); }
   105	}
   106	
   107	module.exports = {
   108	  Story: StoryClass,
   109	  StorySegment: StorySegmentClass,
   110	  StoryBranch: StoryBranchClass
   111	};

 succeeded in 0ms:
     1	import { NextRequest, NextResponse } from 'next/server';
     2	import { storiesStore, segmentsStore, getOrderedChain, type StorySegment } from '@/lib/simple-db';
     3	
     4	async function callAI(prompt: string): Promise<string> {
     5	  const baseUrl = process.env.AI_BASE_URL || 'https://api.openai.com/v1';
     6	  const apiKey = process.env.AI_API_KEY || '';
     7	  const model = process.env.AI_MODEL || 'gpt-3.5-turbo';
     8	
     9	  const res = await fetch(`${baseUrl}/chat/completions`, {
    10	    method: 'POST',
    11	    headers: {
    12	      'Content-Type': 'application/json',
    13	      'Authorization': `Bearer ${apiKey}`,
    14	    },
    15	    body: JSON.stringify({
    16	      model,
    17	      messages: [
    18	        { role: 'system', content: '你是一位精通中国历史的文学作家，擅长古典文学风格的写作。请用中文回答，保持与前文的风格和情节连续性。' },
    19	        { role: 'user', content: prompt }
    20	      ],
    21	      temperature: 0.7,
    22	      max_tokens: 2000
    23	    })
    24	  });
    25	
    26	  if (!res.ok) {
    27	    const text = await res.text();
    28	    throw new Error(`AI API error ${res.status}: ${text}`);
    29	  }
    30	
    31	  const data = await res.json();
    32	  return data.choices?.[0]?.message?.content || '';
    33	}
    34	
    35	export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
    36	  try {
    37	    const { id: storyId } = params;
    38	    const { branchId = 'main' } = await request.json();
    39	
    40	    if (!storyId) {
    41	      return NextResponse.json({ error: '缺少参数' }, { status: 400 });
    42	    }
    43	
    44	    const stories = await storiesStore.load();
    45	    const story = stories.find((s: any) => s.id === storyId);
    46	    if (!story) return NextResponse.json({ error: '故事不存在' }, { status: 404 });
    47	
    48	    // Get ordered chain to find tail segment
    49	    const chain = await getOrderedChain(storyId, branchId);
    50	    if (chain.length === 0) {
    51	      return NextResponse.json({ error: '该分支没有段落' }, { status: 404 });
    52	    }
    53	    const tailSegment = chain[chain.length - 1];
    54	
    55	    // Build context from the ordered chain
    56	    const contextSummary = chain.map((s: StorySegment) =>
    57	      `${s.title ? `【${s.title}】` : ''}${s.content}`
    58	    ).join('\n');
    59	
    60	    const prompt = `故事标题：${story.title}
    61	故事背景：${story.description || ''}
    62	
    63	当前故事进展：
    64	${contextSummary}
    65	
    66	请续写下一段（150-300字），保持古典文学风格，与前文情节连续。`;
    67	
    68	    const aiResponse = await callAI(prompt);
    69	
    70	    const segments = await segmentsStore.load();
    71	    const newSegment: StorySegment = {
    72	      id: `seg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    73	      storyId,
    74	      title: '故事续写',
    75	      content: aiResponse,
    76	      isBranchPoint: false,
    77	      branchId,
    78	      parentSegmentId: tailSegment.id,
    79	      imageUrls: [],
    80	      createdAt: new Date().toISOString(),
    81	      updatedAt: new Date().toISOString()
    82	    };
    83	
    84	    segments.push(newSegment);
    85	    await segmentsStore.save(segments);
    86	
    87	    return NextResponse.json({ success: true, segment: newSegment });
    88	
    89	  } catch (error) {
    90	    console.error('故事续写失败:', error);
    91	    return NextResponse.json(
    92	      { error: '故事续写失败', details: String(error) },
    93	      { status: 500 }
    94	    );
    95	  }
    96	}

exec
/usr/bin/zsh -lc "set -o noglob; nl -ba src/app/api/stories/[id]/tree/route.ts | sed -n '1,260p'" in /home/pjlab/fbh/fbh_project/gushi
 succeeded in 0ms:
     1	import { NextRequest, NextResponse } from 'next/server';
     2	import { storiesStore, segmentsStore, branchesStore, getOrderedChain, type StorySegment, type StoryBranch } from '@/lib/simple-db';
     3	
     4	function buildTreeData(segments: StorySegment[], branches: StoryBranch[], storyId: string) {
     5	  const storySegments = segments.filter(s => s.storyId === storyId);
     6	  const storyBranches = branches.filter(b => b.storyId === storyId);
     7	
     8	  // Build main line chain via parentSegmentId
     9	  const mainSegs = storySegments.filter(s => s.branchId === 'main');
    10	  const mainLine: any[] = [];
    11	  let current = mainSegs.find(s => !s.parentSegmentId);
    12	  const visited = new Set<string>();
    13	
    14	  while (current && !visited.has(current.id)) {
    15	    visited.add(current.id);
    16	    mainLine.push({ ...current, children: [] as any[] });
    17	    current = mainSegs.find(s => s.parentSegmentId === current!.id);
    18	  }
    19	
    20	  // Attach branches to main line nodes
    21	  for (const branch of storyBranches) {
    22	    const sourceIdx = mainLine.findIndex(s => s.id === branch.sourceSegmentId);
    23	    if (sourceIdx === -1) continue;
    24	
    25	    // Build branch chain via parentSegmentId
    26	    const branchSegs = storySegments.filter(s => s.branchId === branch.id);
    27	    const branchChain: any[] = [];
    28	    let bCur = branchSegs.find(s => s.parentSegmentId === branch.sourceSegmentId);
    29	    const bVisited = new Set<string>();
    30	
    31	    while (bCur && !bVisited.has(bCur.id)) {
    32	      bVisited.add(bCur.id);
    33	      branchChain.push({
    34	        ...bCur,
    35	        branchTitle: branch.title,
    36	        isBranch: true,
    37	        children: []
    38	      });
    39	      bCur = branchSegs.find(s => s.parentSegmentId === bCur!.id);
    40	    }
    41	
    42	    if (branchChain.length > 0) {
    43	      mainLine[sourceIdx].children.push({
    44	        id: branch.id,
    45	        title: branch.title,
    46	        userDirection: branch.userDirection,
    47	        sourceSegmentId: branch.sourceSegmentId,
    48	        segments: branchChain
    49	      });
    50	    }
    51	  }
    52	
    53	  return { mainLine, branches: storyBranches };
    54	}
    55	
    56	export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    57	  try {
    58	    const { id: storyId } = params;
    59	
    60	    const stories = await storiesStore.load();
    61	    const story = stories.find((s: any) => s.id === storyId);
    62	    if (!story) return NextResponse.json({ error: '故事不存在' }, { status: 404 });
    63	
    64	    const segments = await segmentsStore.load();
    65	    const branches = await branchesStore.load();
    66	
    67	    const { mainLine, branches: storyBranches } = buildTreeData(segments, branches, storyId);
    68	
    69	    return NextResponse.json({
    70	      success: true,
    71	      story,
    72	      tree: mainLine,
    73	      branches: storyBranches,
    74	      totalSegments: segments.filter((s: any) => s.storyId === storyId).length,
    75	      totalBranches: storyBranches.length
    76	    });
    77	
    78	  } catch (error) {
    79	    console.error('获取故事树失败:', error);
    80	    return NextResponse.json({ error: '获取故事树失败' }, { status: 500 });
    81	  }
    82	}

exec
/usr/bin/zsh -lc 'rg -n "getTailSegment|getStoryBranches" src' in /home/pjlab/fbh/fbh_project/gushi
 succeeded in 0ms:
src/lib/simple-db.ts:110:async function getTailSegment(storyId: string, branchId: string): Promise<StorySegment | null> {
src/lib/simple-db.ts:122:async function getStoryBranches(storyId: string): Promise<StoryBranch[]> {
src/lib/simple-db.ts:132:  getTailSegment,
src/lib/simple-db.ts:134:  getStoryBranches,
src/app/story/[id]/page.tsx:97:  const getTailSegment = () => {

exec
/usr/bin/zsh -lc "set -o noglob; nl -ba src/app/api/stories/[id]/segments/route.ts | sed -n '1,220p'" in /home/pjlab/fbh/fbh_project/gushi
 succeeded in 0ms:
     1	import { NextRequest, NextResponse } from 'next/server';
     2	import { getOrderedChain, getStorySegments, type StorySegment } from '@/lib/simple-db';
     3	
     4	export async function GET(
     5	  request: NextRequest,
     6	  { params }: { params: { id: string } }
     7	) {
     8	  try {
     9	    const { searchParams } = new URL(request.url);
    10	    const branchId = searchParams.get('branchId') || 'main';
    11	    const all = searchParams.get('all');
    12	
    13	    if (all) {
    14	      const segments = await getStorySegments(params.id);
    15	      return NextResponse.json({ success: true, segments });
    16	    }
    17	
    18	    const segments = await getOrderedChain(params.id, branchId);
    19	    return NextResponse.json({ success: true, segments, branchId });
    20	  } catch (error) {
    21	    console.error('获取段落失败:', error);
    22	    return NextResponse.json({ 
    23	      error: '获取段落失败',
    24	      details: error instanceof Error ? error.message : '未知错误'
    25	    }, { status: 500 });
    26	  }
    27	}

exec
/usr/bin/zsh -lc "set -o noglob; nl -ba src/app/api/stories/[id]/route.ts | sed -n '1,180p'" in /home/pjlab/fbh/fbh_project/gushi
 succeeded in 0ms:
     1	import { NextRequest, NextResponse } from 'next/server';
     2	import { storiesStore } from '@/lib/simple-db';
     3	
     4	export async function GET(
     5	  request: NextRequest,
     6	  { params }: { params: { id: string } }
     7	) {
     8	  try {
     9	    const stories = await storiesStore.load();
    10	    const story = stories.find((s: any) => s.id === params.id);
    11	
    12	    if (!story) {
    13	      return NextResponse.json({ error: '故事不存在' }, { status: 404 });
    14	    }
    15	
    16	    return NextResponse.json({ success: true, story });
    17	  } catch (error) {
    18	    return NextResponse.json({ error: '获取故事失败' }, { status: 500 });
    19	  }
    20	}

codex
I’m doing one last repo scan for `MCP`, `Wikipedia`, and research/citation hooks. If those are absent, I want the gap section to say “absent in the current codebase” based on evidence, not assumption.
exec
/usr/bin/zsh -lc 'find data -maxdepth 1 -type f | sort' in /home/pjlab/fbh/fbh_project/gushi
 succeeded in 0ms:
data/branches.json
data/branches_backup.json
data/segments.json
data/segments_backup.json
data/stories.json
data/stories_backup.json

exec
/usr/bin/zsh -lc 'rg -n "MCP|Wikipedia|wiki|citation|citations|research|fact.?check|timeline|character" src' in /home/pjlab/fbh/fbh_project/gushi
 succeeded in 0ms:
src/components/story/StoryImageDisplay.tsx:10:  type: 'illustration' | 'scene' | 'character' | 'object';
src/components/story/StoryImageDisplay.tsx:70:      case 'character':
src/components/story/StoryImageDisplay.tsx:86:      case 'character':
src/app/globals.css:72:.timeline-line {
src/app/globals.css:75:.timeline-line::before {
src/types/story.ts:42:  characters?: string[];

exec
/usr/bin/zsh -lc "rg -n \"@/types/story|from '.*types/story|from \\\".*types/story|require\\(.*story\" src" in /home/pjlab/fbh/fbh_project/gushi
 exited 1 in 0ms:
exec
/usr/bin/zsh -lc 'rg -n "better-sqlite3|sqlite3" src package.json' in /home/pjlab/fbh/fbh_project/gushi
 succeeded in 0ms:
package.json:21:    "@types/sqlite3": "^5.1.0",
package.json:23:    "better-sqlite3": "^12.8.0",
package.json:27:    "sqlite3": "^6.0.1"

codex
I’ve finished the source pass. Next I’m replacing `Docs/researches/src_lib_research.md` with a cleaned-up report that reflects the actual `src/lib` inventory, the route-level architecture around it, and the four ChronosMirror gaps with concrete upgrade directions.
apply patch
patch: completed
/home/pjlab/fbh/fbh_project/gushi/Docs/researches/src_lib_research.md
diff --git a/Docs/researches/src_lib_research.md b/Docs/researches/src_lib_research.md
deleted file mode 100644
index 79f3f97df0eacea79c1c750846ae3d60af49edcf..0000000000000000000000000000000000000000
--- a/Docs/researches/src_lib_research.md
+++ /dev/null
@@ -1,373 +0,0 @@
-# `src/lib` Research
-
-## Scope
-
-`src/lib/` currently contains one source file:
-
-- `src/lib/simple-db.ts`
-
-Because this directory is a shared library layer rather than a standalone feature, I also traced its direct consumers in `src/app/api/stories/*` to explain the actual architecture and the ChronosMirror upgrade gaps.
-
-## Per-file analysis
-
-### `src/lib/simple-db.ts`
-
-**Purpose**
-
-`src/lib/simple-db.ts` is the project's lightweight persistence and traversal layer for story data. It does three jobs in one file:
-
-1. defines where story data lives on disk via `DATA_DIR`
-2. provides a generic JSON-array file store through `SimpleStore<T>`
-3. defines the story domain records and branch-chain helper functions used by the story API
-
-This is the only shared backend library under `src/lib/`, so the rest of the story API depends on it directly.
-
-**Key internal constructs**
-
-- `DATA_DIR` (`src/lib/simple-db.ts:4`)
-  - resolves storage to `path.join(process.cwd(), 'data')`
-- `ensureDataDir()` (`src/lib/simple-db.ts:6`)
-  - lazily creates the `data/` directory before reads and writes
-- `SimpleStore<T>` (`src/lib/simple-db.ts:14`)
-  - wraps a single JSON file
-  - `load()` reads the whole file and `JSON.parse`s it into `T[]`
-  - `save()` rewrites the whole file with pretty-printed JSON
-- `Story` (`src/lib/simple-db.ts:37`)
-  - top-level story metadata
-- `StorySegment` (`src/lib/simple-db.ts:47`)
-  - a unit of generated narrative bound to a story and branch
-- `StoryBranch` (`src/lib/simple-db.ts:60`)
-  - branch metadata tied to a source segment and user direction
-- `getOrderedChain(storyId, branchId)` (`src/lib/simple-db.ts:76`)
-  - reconstructs a linear branch by following `parentSegmentId`
-  - special-cases `branchId === 'main'`
-- `getTailSegment(storyId, branchId)` (`src/lib/simple-db.ts:110`)
-  - returns the last segment of a reconstructed branch
-- `getStorySegments(storyId)` (`src/lib/simple-db.ts:116`)
-  - returns every segment for a story without ordering
-- `getStoryBranches(storyId)` (`src/lib/simple-db.ts:122`)
-  - returns every branch for a story
-
-**Exports**
-
-- `storiesStore`
-  - `SimpleStore<Story>` backed by `data/stories.json`
-- `segmentsStore`
-  - `SimpleStore<StorySegment>` backed by `data/segments.json`
-- `branchesStore`
-  - `SimpleStore<StoryBranch>` backed by `data/branches.json`
-- `getOrderedChain(storyId: string, branchId: string): Promise<StorySegment[]>`
-- `getTailSegment(storyId: string, branchId: string): Promise<StorySegment | null>`
-- `getStorySegments(storyId: string): Promise<StorySegment[]>`
-- `getStoryBranches(storyId: string): Promise<StoryBranch[]>`
-- `type Story`
-- `type StorySegment`
-- `type StoryBranch`
-
-**Direct dependencies**
-
-- Node `fs/promises`
-- Node `path`
-- `process.cwd()` and a writable `data/` directory at runtime
-
-**Related dependency context**
-
-- `package.json` includes `better-sqlite3`, `sqlite3`, and `@types/sqlite3`, but `src/lib/simple-db.ts` does not use them.
-- In practice, the live persistence layer is still file-backed JSON, not a transactional database-backed repository.
-
-**Downstream consumers**
-
-This file is imported directly by seven story API routes:
-
-- `src/app/api/stories/route.ts`
-- `src/app/api/stories/[id]/route.ts`
-- `src/app/api/stories/[id]/segments/route.ts`
-- `src/app/api/stories/[id]/tree/route.ts`
-- `src/app/api/stories/[id]/continue/route.ts`
-- `src/app/api/stories/[id]/stream-continue/route.ts`
-- `src/app/api/stories/[id]/branch/route.ts`
-
-**Dependency notes and behavioral constraints**
-
-- `SimpleStore<T>.load()` catches every read or parse failure and returns `[]` (`src/lib/simple-db.ts:21-29`).
-  - Missing files are handled gracefully.
-  - Corrupt JSON, permission issues, and other unexpected failures are also silently flattened into "no records", which can hide real data-loss conditions.
-- `SimpleStore<T>.save()` rewrites the whole file (`src/lib/simple-db.ts:31-34`).
-  - There is no locking, transaction support, append path, or conflict detection.
-- `getOrderedChain()` reconstructs branch order by repeated `.find()` scans over arrays (`src/lib/simple-db.ts:83-104`).
-  - This is simple, but it is effectively repeated linear scanning rather than indexed lookup.
-- The branch model is a linked list, not a general event graph.
-  - Every segment has at most one `parentSegmentId`.
-  - Non-main branches are anchored by `StoryBranch.sourceSegmentId`.
-- `getTailSegment()` and `getStoryBranches()` are exported but are not currently used by `src/` consumers.
-- The file-system dependency means any route importing this module is tied to a Node runtime with writable local storage; this is not an edge-safe persistence layer.
-
-## Architecture overview
-
-### What `src/lib` is doing today
-
-At the moment, `src/lib` is not a broad utility layer. It is effectively the story backend's entire persistence model.
-
-The current shape is:
-
-```text
-Next.js story routes
-  -> import stores and helpers from src/lib/simple-db.ts
-  -> load full JSON arrays from data/*.json
-  -> mutate in memory
-  -> save full JSON arrays back to disk
-```
-
-### Data model
-
-The storage model is split across three JSON files:
-
-- `data/stories.json`
-  - one array of `Story`
-- `data/segments.json`
-  - one array of `StorySegment`
-- `data/branches.json`
-  - one array of `StoryBranch`
-
-The implicit relational structure is:
-
-- `Story.id`
-  - parent key for segments and branches
-- `StorySegment.storyId`
-  - segment belongs to a story
-- `StorySegment.branchId`
-  - segment belongs either to the special `"main"` branch or to a branch record id
-- `StorySegment.parentSegmentId`
-  - single-parent linked-list edge
-- `StoryBranch.sourceSegmentId`
-  - the main-line segment where a branch diverges
-
-This is enough to support:
-
-- listing stories
-- creating a story and initial segment
-- continuing a branch
-- creating a branch from a segment
-- returning branch segments in order
-- building a main-line-plus-children tree view
-
-### How the story API depends on this file
-
-- `src/app/api/stories/route.ts`
-  - uses `storiesStore` and `segmentsStore` to create a story and its first segment
-  - performs multiple full-file writes for one logical operation
-- `src/app/api/stories/[id]/continue/route.ts`
-  - uses `getOrderedChain()` to build AI prompt context from existing branch text
-  - appends a new `StorySegment` to the same branch
-- `src/app/api/stories/[id]/stream-continue/route.ts`
-  - uses the same chain reconstruction pattern, then saves the generated segment after streaming completes
-- `src/app/api/stories/[id]/branch/route.ts`
-  - creates a `StoryBranch`
-  - marks the source segment as `isBranchPoint = true`
-  - uses `getOrderedChain(storyId, 'main')` to gather prompt context up to the split point
-  - appends the first segment of the new branch
-- `src/app/api/stories/[id]/segments/route.ts`
-  - exposes either all story segments or a reconstructed ordered branch via `getOrderedChain()`
-- `src/app/api/stories/[id]/tree/route.ts`
-  - loads raw stores and re-implements linked-list traversal in `buildTreeData()`
-  - notably imports `getOrderedChain` but does not use it
-
-### Structural observations
-
-- Persistence, domain types, and traversal logic all live in one file.
-  - There is no repository layer, validation layer, or service layer between route handlers and stored JSON.
-- Branch traversal is branch-local.
-  - For non-main branches, `getOrderedChain()` starts at the first segment whose parent is `branch.sourceSegmentId`, then follows only branch-owned descendants.
-  - That means later continuations on a branch do not automatically include the main-line ancestry in their returned chain; they only include branch-local segments.
-- The tree route duplicates graph logic instead of consuming a shared graph service.
-- The current model is write-order oriented, not history-model oriented.
-  - `createdAt` and `updatedAt` are persistence timestamps.
-  - They are not in-story time or historical chronology.
-- There is no single shared domain contract.
-  - `src/lib/simple-db.ts` defines the runtime story types actually used by the API.
-  - `src/types/story.ts` defines a separate type layer that is not imported by the routes.
-  - That separate file already hints at future capabilities like `ContinueStoryRequest.characters?: string[]`, but the persistence layer has nowhere to store or enforce them.
-
-## ChronosMirror upgrade gaps
-
-ChronosMirror needs richer narrative state than this library can currently persist or validate. The key issue is not just that `simple-db.ts` is small; it is that the entire persistence contract is too narrow. The current records are optimized for plain text continuation, not for structured historical reasoning.
-
-### 1. Character modeling gap
-
-**Current state**
-
-- `Story` stores only top-level metadata: `id`, `title`, `description`, `author`, timestamps, and optional `rootSegmentId`.
-- `StorySegment` stores only prose and a few routing fields: `content`, `branchId`, `parentSegmentId`, `isBranchPoint`, and `imageUrls`.
-- `StoryBranch` stores only branch metadata: `title`, `description`, `sourceSegmentId`, `userDirection`, and timestamps.
-- `src/types/story.ts` exposes `ContinueStoryRequest.characters?: string[]`, but that field is not wired into `src/lib` or the API routes that persist story state.
-- No type in `src/lib` represents:
-  - characters
-  - persona attributes
-  - speech style
-  - goals
-  - loyalties
-  - relationship changes
-  - per-segment character state
-
-**Why this blocks ChronosMirror**
-
-- The continuation routes build prompts from raw concatenated prose, not from structured character memory.
-- Branch continuations on non-main branches only reconstruct branch-local segments, which weakens long-term persona continuity even further.
-- There is nowhere to persist "this segment changed character X's allegiance" or "character Y should keep a distinct speaking style".
-
-**Upgrade direction**
-
-Add first-class character persistence, for example:
-
-- `CharacterProfile`
-  - stable identity, role, biography, personality axes, speech markers, historical grounding
-- `CharacterStateSnapshot`
-  - what each character knows, wants, fears, and believes at a given story event
-- `RelationshipEdge`
-  - dynamic links between characters with confidence and change history
-- segment-level metadata such as:
-  - `introducedCharacterIds`
-  - `characterStateDeltas`
-  - `speakerStyleHints`
-
-This change would push `src/lib` from "raw text store" toward a domain store that can support consistent persona generation.
-
-### 2. Timeline validation gap
-
-**Current state**
-
-- The only built-in ordering mechanism is linked-list traversal by `parentSegmentId`.
-- `createdAt` and `updatedAt` describe file persistence time, not historical event time.
-- `getOrderedChain()` prevents infinite loops with a `visited` set, but that is traversal safety, not timeline validation.
-- There is no schema for:
-  - event timestamps inside the story world
-  - dynasty or era
-  - causal dependencies
-  - temporal contradictions
-  - validated versus unvalidated history
-- `buildTreeData()` in the tree route duplicates traversal logic instead of sharing a single authoritative graph model.
-
-**Why this blocks ChronosMirror**
-
-- ChronosMirror needs temporal consistency and historical accuracy checks.
-- The current library can answer "what segment comes next in this branch?" but not:
-  - "does this event happen in the correct year?"
-  - "did this branch violate an already established causal constraint?"
-  - "does this historical figure appear before their recorded lifetime?"
-
-**Upgrade direction**
-
-Add explicit timeline and validation structures, for example:
-
-- `StoryEvent`
-  - stable event id, narrative timestamp, real-world historical date or range, location, participants
-- `TimelineEdge`
-  - predecessor, successor, divergence, parallel, or dependency relationships
-- validation fields such as:
-  - `timelineStatus`
-  - `validationErrors`
-  - `historicalConfidence`
-  - `contradictionRefs`
-
-Also split traversal from validation:
-
-- keep repository code focused on loading and saving
-- move branch and timeline reconstruction into a graph service
-- add a validator that runs before segment persistence or publication
-
-### 3. MCP Wikipedia gap
-
-**Current state**
-
-- None of the exported types can store citations, sources, retrieval sessions, or fact-check results.
-- `StorySegment` has `imageUrls`, but it has no place for evidence bundles or claim provenance.
-- `src/lib` has no cache or persistence model for external research.
-- The AI routes that consume this library save generated prose directly, with no corresponding research artifact.
-
-**Why this blocks ChronosMirror**
-
-- ChronosMirror's Wikipedia-through-MCP workflow needs durable provenance.
-- Without stored evidence, the system cannot show:
-  - what claims were grounded
-  - which Wikipedia pages were consulted
-  - whether a segment passed or failed fact-checking
-  - which branch introduced a historically risky claim
-
-**Upgrade direction**
-
-Introduce research and provenance records such as:
-
-- `Citation`
-  - source title, url, excerpt, access time, claim mapping
-- `ResearchArtifact`
-  - MCP request, normalized page/entity result, confidence, cached payload
-- `FactCheckResult`
-  - claim, verdict, evidence refs, unresolved questions
-- segment-level provenance fields such as:
-  - `citationIds`
-  - `researchSessionId`
-  - `factCheckStatus`
-
-That would let `src/lib` persist not just generated text, but the evidence chain behind it.
-
-### 4. Pacing control gap
-
-**Current state**
-
-- No type in `src/lib` represents scene plans, beat structure, target tempo, tension ramps, or director controls.
-- `StorySegment` stores only the final prose block, not how it was planned.
-- The generation routes use fixed prompt templates and basic model controls in the route handlers, but those controls are not persisted in the library data model.
-- There is no notion of stepwise generation state such as:
-  - outline approved
-  - beat plan approved
-  - draft generated
-  - revision requested
-
-**Why this blocks ChronosMirror**
-
-- ChronosMirror pacing control requires stateful orchestration, not just "append another paragraph".
-- A director mode needs to know what beat the story is on, whether the branch should accelerate or decelerate, and what narrative obligation still needs to be satisfied.
-- The current library can only save the final result after generation, not the pacing plan or the reasoning checkpoints that produced it.
-
-**Upgrade direction**
-
-Add first-class pacing and orchestration records, for example:
-
-- `PacingPlan`
-  - intended tempo, beat count, tension profile, chapter goal
-- `SceneBeat`
-  - beat order, purpose, focus character, conflict, reveal, exit condition
-- `GenerationDirective`
-  - user direction, system director note, safety note, validation requirement
-- segment metadata such as:
-  - `beatIndex`
-  - `sceneId`
-  - `pacingTags`
-  - `generationMode`
-  - `draftStatus`
-
-This would let the library persist the structure ChronosMirror needs to do controlled multi-step generation instead of raw one-shot continuation.
-
-## Summary
-
-`src/lib` is currently a single-file JSON persistence layer with a small linked-list traversal helper. It is sufficient for the current app's basic story creation, continuation, and branching flow, but it is not yet a suitable foundation for ChronosMirror.
-
-The main limitations are structural:
-
-- no first-class character state
-- no explicit historical timeline model
-- no citation or MCP research persistence
-- no pacing or director-mode state
-- no validation, transaction, or concurrency controls
-
-For ChronosMirror, `src/lib` should evolve from a thin JSON helper into a real domain layer with:
-
-- richer story schemas
-- a canonical shared type contract instead of duplicated story models
-- separate repositories and graph services
-- validation pipelines
-- provenance storage
-- generation-planning state
-- database-backed persistence with transaction boundaries once concurrent editing or validation workflows matter
-
-Without that shift, the rest of the stack will remain constrained to branch-local text continuation rather than historically grounded narrative orchestration.

diff --git a/Docs/researches/src_lib_research.md b/Docs/researches/src_lib_research.md
deleted file mode 100644
index 79f3f97df0eacea79c1c750846ae3d60af49edcf..0000000000000000000000000000000000000000
--- a/Docs/researches/src_lib_research.md
+++ /dev/null
@@ -1,373 +0,0 @@
-# `src/lib` Research
-
-## Scope
-
-`src/lib/` currently contains one source file:
-
-- `src/lib/simple-db.ts`
-
-Because this directory is a shared library layer rather than a standalone feature, I also traced its direct consumers in `src/app/api/stories/*` to explain the actual architecture and the ChronosMirror upgrade gaps.
-
-## Per-file analysis
-
-### `src/lib/simple-db.ts`
-
-**Purpose**
-
-`src/lib/simple-db.ts` is the project's lightweight persistence and traversal layer for story data. It does three jobs in one file:
-
-1. defines where story data lives on disk via `DATA_DIR`
-2. provides a generic JSON-array file store through `SimpleStore<T>`
-3. defines the story domain records and branch-chain helper functions used by the story API
-
-This is the only shared backend library under `src/lib/`, so the rest of the story API depends on it directly.
-
-**Key internal constructs**
-
-- `DATA_DIR` (`src/lib/simple-db.ts:4`)
-  - resolves storage to `path.join(process.cwd(), 'data')`
-- `ensureDataDir()` (`src/lib/simple-db.ts:6`)
-  - lazily creates the `data/` directory before reads and writes
-- `SimpleStore<T>` (`src/lib/simple-db.ts:14`)
-  - wraps a single JSON file
-  - `load()` reads the whole file and `JSON.parse`s it into `T[]`
-  - `save()` rewrites the whole file with pretty-printed JSON
-- `Story` (`src/lib/simple-db.ts:37`)
-  - top-level story metadata
-- `StorySegment` (`src/lib/simple-db.ts:47`)
-  - a unit of generated narrative bound to a story and branch
-- `StoryBranch` (`src/lib/simple-db.ts:60`)
-  - branch metadata tied to a source segment and user direction
-- `getOrderedChain(storyId, branchId)` (`src/lib/simple-db.ts:76`)
-  - reconstructs a linear branch by following `parentSegmentId`
-  - special-cases `branchId === 'main'`
-- `getTailSegment(storyId, branchId)` (`src/lib/simple-db.ts:110`)
-  - returns the last segment of a reconstructed branch
-- `getStorySegments(storyId)` (`src/lib/simple-db.ts:116`)
-  - returns every segment for a story without ordering
-- `getStoryBranches(storyId)` (`src/lib/simple-db.ts:122`)
-  - returns every branch for a story
-
-**Exports**
-
-- `storiesStore`
-  - `SimpleStore<Story>` backed by `data/stories.json`
-- `segmentsStore`
-  - `SimpleStore<StorySegment>` backed by `data/segments.json`
-- `branchesStore`
-  - `SimpleStore<StoryBranch>` backed by `data/branches.json`
-- `getOrderedChain(storyId: string, branchId: string): Promise<StorySegment[]>`
-- `getTailSegment(storyId: string, branchId: string): Promise<StorySegment | null>`
-- `getStorySegments(storyId: string): Promise<StorySegment[]>`
-- `getStoryBranches(storyId: string): Promise<StoryBranch[]>`
-- `type Story`
-- `type StorySegment`
-- `type StoryBranch`
-
-**Direct dependencies**
-
-- Node `fs/promises`
-- Node `path`
-- `process.cwd()` and a writable `data/` directory at runtime
-
-**Related dependency context**
-
-- `package.json` includes `better-sqlite3`, `sqlite3`, and `@types/sqlite3`, but `src/lib/simple-db.ts` does not use them.
-- In practice, the live persistence layer is still file-backed JSON, not a transactional database-backed repository.
-
-**Downstream consumers**
-
-This file is imported directly by seven story API routes:
-
-- `src/app/api/stories/route.ts`
-- `src/app/api/stories/[id]/route.ts`
-- `src/app/api/stories/[id]/segments/route.ts`
-- `src/app/api/stories/[id]/tree/route.ts`
-- `src/app/api/stories/[id]/continue/route.ts`
-- `src/app/api/stories/[id]/stream-continue/route.ts`
-- `src/app/api/stories/[id]/branch/route.ts`
-
-**Dependency notes and behavioral constraints**
-
-- `SimpleStore<T>.load()` catches every read or parse failure and returns `[]` (`src/lib/simple-db.ts:21-29`).
-  - Missing files are handled gracefully.
-  - Corrupt JSON, permission issues, and other unexpected failures are also silently flattened into "no records", which can hide real data-loss conditions.
-- `SimpleStore<T>.save()` rewrites the whole file (`src/lib/simple-db.ts:31-34`).
-  - There is no locking, transaction support, append path, or conflict detection.
-- `getOrderedChain()` reconstructs branch order by repeated `.find()` scans over arrays (`src/lib/simple-db.ts:83-104`).
-  - This is simple, but it is effectively repeated linear scanning rather than indexed lookup.
-- The branch model is a linked list, not a general event graph.
-  - Every segment has at most one `parentSegmentId`.
-  - Non-main branches are anchored by `StoryBranch.sourceSegmentId`.
-- `getTailSegment()` and `getStoryBranches()` are exported but are not currently used by `src/` consumers.
-- The file-system dependency means any route importing this module is tied to a Node runtime with writable local storage; this is not an edge-safe persistence layer.
-
-## Architecture overview
-
-### What `src/lib` is doing today
-
-At the moment, `src/lib` is not a broad utility layer. It is effectively the story backend's entire persistence model.
-
-The current shape is:
-
-```text
-Next.js story routes
-  -> import stores and helpers from src/lib/simple-db.ts
-  -> load full JSON arrays from data/*.json
-  -> mutate in memory
-  -> save full JSON arrays back to disk
-```
-
-### Data model
-
-The storage model is split across three JSON files:
-
-- `data/stories.json`
-  - one array of `Story`
-- `data/segments.json`
-  - one array of `StorySegment`
-- `data/branches.json`
-  - one array of `StoryBranch`
-
-The implicit relational structure is:
-
-- `Story.id`
-  - parent key for segments and branches
-- `StorySegment.storyId`
-  - segment belongs to a story
-- `StorySegment.branchId`
-  - segment belongs either to the special `"main"` branch or to a branch record id
-- `StorySegment.parentSegmentId`
-  - single-parent linked-list edge
-- `StoryBranch.sourceSegmentId`
-  - the main-line segment where a branch diverges
-
-This is enough to support:
-
-- listing stories
-- creating a story and initial segment
-- continuing a branch
-- creating a branch from a segment
-- returning branch segments in order
-- building a main-line-plus-children tree view
-
-### How the story API depends on this file
-
-- `src/app/api/stories/route.ts`
-  - uses `storiesStore` and `segmentsStore` to create a story and its first segment
-  - performs multiple full-file writes for one logical operation
-- `src/app/api/stories/[id]/continue/route.ts`
-  - uses `getOrderedChain()` to build AI prompt context from existing branch text
-  - appends a new `StorySegment` to the same branch
-- `src/app/api/stories/[id]/stream-continue/route.ts`
-  - uses the same chain reconstruction pattern, then saves the generated segment after streaming completes
-- `src/app/api/stories/[id]/branch/route.ts`
-  - creates a `StoryBranch`
-  - marks the source segment as `isBranchPoint = true`
-  - uses `getOrderedChain(storyId, 'main')` to gather prompt context up to the split point
-  - appends the first segment of the new branch
-- `src/app/api/stories/[id]/segments/route.ts`
-  - exposes either all story segments or a reconstructed ordered branch via `getOrderedChain()`
-- `src/app/api/stories/[id]/tree/route.ts`
-  - loads raw stores and re-implements linked-list traversal in `buildTreeData()`
-  - notably imports `getOrderedChain` but does not use it
-
-### Structural observations
-
-- Persistence, domain types, and traversal logic all live in one file.
-  - There is no repository layer, validation layer, or service layer between route handlers and stored JSON.
-- Branch traversal is branch-local.
-  - For non-main branches, `getOrderedChain()` starts at the first segment whose parent is `branch.sourceSegmentId`, then follows only branch-owned descendants.
-  - That means later continuations on a branch do not automatically include the main-line ancestry in their returned chain; they only include branch-local segments.
-- The tree route duplicates graph logic instead of consuming a shared graph service.
-- The current model is write-order oriented, not history-model oriented.
-  - `createdAt` and `updatedAt` are persistence timestamps.
-  - They are not in-story time or historical chronology.
-- There is no single shared domain contract.
-  - `src/lib/simple-db.ts` defines the runtime story types actually used by the API.
-  - `src/types/story.ts` defines a separate type layer that is not imported by the routes.
-  - That separate file already hints at future capabilities like `ContinueStoryRequest.characters?: string[]`, but the persistence layer has nowhere to store or enforce them.
-
-## ChronosMirror upgrade gaps
-
-ChronosMirror needs richer narrative state than this library can currently persist or validate. The key issue is not just that `simple-db.ts` is small; it is that the entire persistence contract is too narrow. The current records are optimized for plain text continuation, not for structured historical reasoning.
-
-### 1. Character modeling gap
-
-**Current state**
-
-- `Story` stores only top-level metadata: `id`, `title`, `description`, `author`, timestamps, and optional `rootSegmentId`.
-- `StorySegment` stores only prose and a few routing fields: `content`, `branchId`, `parentSegmentId`, `isBranchPoint`, and `imageUrls`.
-- `StoryBranch` stores only branch metadata: `title`, `description`, `sourceSegmentId`, `userDirection`, and timestamps.
-- `src/types/story.ts` exposes `ContinueStoryRequest.characters?: string[]`, but that field is not wired into `src/lib` or the API routes that persist story state.
-- No type in `src/lib` represents:
-  - characters
-  - persona attributes
-  - speech style
-  - goals
-  - loyalties
-  - relationship changes
-  - per-segment character state
-
-**Why this blocks ChronosMirror**
-
-- The continuation routes build prompts from raw concatenated prose, not from structured character memory.
-- Branch continuations on non-main branches only reconstruct branch-local segments, which weakens long-term persona continuity even further.
-- There is nowhere to persist "this segment changed character X's allegiance" or "character Y should keep a distinct speaking style".
-
-**Upgrade direction**
-
-Add first-class character persistence, for example:
-
-- `CharacterProfile`
-  - stable identity, role, biography, personality axes, speech markers, historical grounding
-- `CharacterStateSnapshot`
-  - what each character knows, wants, fears, and believes at a given story event
-- `RelationshipEdge`
-  - dynamic links between characters with confidence and change history
-- segment-level metadata such as:
-  - `introducedCharacterIds`
-  - `characterStateDeltas`
-  - `speakerStyleHints`
-
-This change would push `src/lib` from "raw text store" toward a domain store that can support consistent persona generation.
-
-### 2. Timeline validation gap
-
-**Current state**
-
-- The only built-in ordering mechanism is linked-list traversal by `parentSegmentId`.
-- `createdAt` and `updatedAt` describe file persistence time, not historical event time.
-- `getOrderedChain()` prevents infinite loops with a `visited` set, but that is traversal safety, not timeline validation.
-- There is no schema for:
-  - event timestamps inside the story world
-  - dynasty or era
-  - causal dependencies
-  - temporal contradictions
-  - validated versus unvalidated history
-- `buildTreeData()` in the tree route duplicates traversal logic instead of sharing a single authoritative graph model.
-
-**Why this blocks ChronosMirror**
-
-- ChronosMirror needs temporal consistency and historical accuracy checks.
-- The current library can answer "what segment comes next in this branch?" but not:
-  - "does this event happen in the correct year?"
-  - "did this branch violate an already established causal constraint?"
-  - "does this historical figure appear before their recorded lifetime?"
-
-**Upgrade direction**
-
-Add explicit timeline and validation structures, for example:
-
-- `StoryEvent`
-  - stable event id, narrative timestamp, real-world historical date or range, location, participants
-- `TimelineEdge`
-  - predecessor, successor, divergence, parallel, or dependency relationships
-- validation fields such as:
-  - `timelineStatus`
-  - `validationErrors`
-  - `historicalConfidence`
-  - `contradictionRefs`
-
-Also split traversal from validation:
-
-- keep repository code focused on loading and saving
-- move branch and timeline reconstruction into a graph service
-- add a validator that runs before segment persistence or publication
-
-### 3. MCP Wikipedia gap
-
-**Current state**
-
-- None of the exported types can store citations, sources, retrieval sessions, or fact-check results.
-- `StorySegment` has `imageUrls`, but it has no place for evidence bundles or claim provenance.
-- `src/lib` has no cache or persistence model for external research.
-- The AI routes that consume this library save generated prose directly, with no corresponding research artifact.
-
-**Why this blocks ChronosMirror**
-
-- ChronosMirror's Wikipedia-through-MCP workflow needs durable provenance.
-- Without stored evidence, the system cannot show:
-  - what claims were grounded
-  - which Wikipedia pages were consulted
-  - whether a segment passed or failed fact-checking
-  - which branch introduced a historically risky claim
-
-**Upgrade direction**
-
-Introduce research and provenance records such as:
-
-- `Citation`
-  - source title, url, excerpt, access time, claim mapping
-- `ResearchArtifact`
-  - MCP request, normalized page/entity result, confidence, cached payload
-- `FactCheckResult`
-  - claim, verdict, evidence refs, unresolved questions
-- segment-level provenance fields such as:
-  - `citationIds`
-  - `researchSessionId`
-  - `factCheckStatus`
-
-That would let `src/lib` persist not just generated text, but the evidence chain behind it.
-
-### 4. Pacing control gap
-
-**Current state**
-
-- No type in `src/lib` represents scene plans, beat structure, target tempo, tension ramps, or director controls.
-- `StorySegment` stores only the final prose block, not how it was planned.
-- The generation routes use fixed prompt templates and basic model controls in the route handlers, but those controls are not persisted in the library data model.
-- There is no notion of stepwise generation state such as:
-  - outline approved
-  - beat plan approved
-  - draft generated
-  - revision requested
-
-**Why this blocks ChronosMirror**
-
-- ChronosMirror pacing control requires stateful orchestration, not just "append another paragraph".
-- A director mode needs to know what beat the story is on, whether the branch should accelerate or decelerate, and what narrative obligation still needs to be satisfied.
-- The current library can only save the final result after generation, not the pacing plan or the reasoning checkpoints that produced it.
-
-**Upgrade direction**
-
-Add first-class pacing and orchestration records, for example:
-
-- `PacingPlan`
-  - intended tempo, beat count, tension profile, chapter goal
-- `SceneBeat`
-  - beat order, purpose, focus character, conflict, reveal, exit condition
-- `GenerationDirective`
-  - user direction, system director note, safety note, validation requirement
-- segment metadata such as:
-  - `beatIndex`
-  - `sceneId`
-  - `pacingTags`
-  - `generationMode`
-  - `draftStatus`
-
-This would let the library persist the structure ChronosMirror needs to do controlled multi-step generation instead of raw one-shot continuation.
-
-## Summary
-
-`src/lib` is currently a single-file JSON persistence layer with a small linked-list traversal helper. It is sufficient for the current app's basic story creation, continuation, and branching flow, but it is not yet a suitable foundation for ChronosMirror.
-
-The main limitations are structural:
-
-- no first-class character state
-- no explicit historical timeline model
-- no citation or MCP research persistence
-- no pacing or director-mode state
-- no validation, transaction, or concurrency controls
-
-For ChronosMirror, `src/lib` should evolve from a thin JSON helper into a real domain layer with:
-
-- richer story schemas
-- a canonical shared type contract instead of duplicated story models
-- separate repositories and graph services
-- validation pipelines
-- provenance storage
-- generation-planning state
-- database-backed persistence with transaction boundaries once concurrent editing or validation workflows matter
-
-Without that shift, the rest of the stack will remain constrained to branch-local text continuation rather than historically grounded narrative orchestration.

