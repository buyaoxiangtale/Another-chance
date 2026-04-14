# `src/app/story/` Research

## Scope

Analyzed all source files under `src/app/story/`.

Directory contents:

- `src/app/story/[id]/page.tsx`

There are no sibling route files such as `layout.tsx`, `loading.tsx`, `error.tsx`, or nested helper modules inside `src/app/story/`.

## File-by-file analysis

### `src/app/story/[id]/page.tsx`

#### Purpose

This is the client-side story detail page for a single story route. It is responsible for:

- loading story metadata and branch metadata
- loading the ordered segment chain for the active branch
- rendering the timeline-style reading UI
- streaming continuation text from the backend
- opening a branch dialog and creating a new branch from any segment
- switching between the main line and existing branches

In practice, this file is the entire `src/app/story/` feature surface. The directory has no decomposition into smaller components or hooks.

#### Exports

- `default` export: `StoryDetailPage`

There are no named exports.

#### Local types and internal structures

The file defines three route-local interfaces near the top instead of reusing `src/types/story.ts`:

- `interface Story`
- `interface StorySegment`
- `interface StoryBranch`

Notable consequence:

- The route duplicates data contracts that already exist in `src/types/story.ts`.
- The route-local versions are narrower than the shared types. For example, the shared type layer includes timestamps and optional `characters?: string[]` on `ContinueStoryRequest`, but the page ignores that capability entirely.

#### Key state and control flow

The page keeps all UI state locally with `useState`:

- data state: `story`, `segments`, `branches`
- load/error state: `loading`, `error`
- continuation state: `continuing`, `newContent`
- branch selection state: `currentBranchId`
- branch dialog state: `showBranchDialog`, `branchingSegmentId`, `userDirection`, `customDirection`
- branch generation progress state: `branching`, `branchStep`, `branchPreview`

Main helpers and handlers:

- `loadBranchSegments(branchId)`
  - Fetches `GET /api/stories/${id}/segments?branchId=...`
  - Updates `segments`
- `loadTree()`
  - Fetches `GET /api/stories/${id}/tree`
  - Updates `branches`
- initial `useEffect`
  - Fetches story metadata and tree data in parallel
  - Sets `story`, `branches`, and resets `currentBranchId` to `"main"`
- branch-loading `useEffect`
  - Reloads the current branch chain whenever `currentBranchId` changes after initial load
- `getTailSegment()`
  - Computes a tail candidate from the loaded client-side segment list
  - Currently unused in the render path and unused by any mutation flow
- `handleContinue()`
  - Calls `POST /api/stories/${id}/stream-continue`
  - Reads SSE chunks with `TextDecoder`
  - Appends streamed content into `newContent`
  - Reloads branch segments and branch tree after completion
- `handleBranch(segmentId)`
  - Opens the branch dialog for a specific segment
- `confirmBranch()`
  - Resolves the chosen direction from preset or custom input
  - Shows a staged UI (`thinking`, `generating`, `saving`)
  - Calls `POST /api/stories/${id}/branch`
  - Stores a short preview of the generated branch segment
  - Reloads segments and tree after completion
- `switchBranch(branchId)`
  - Updates `currentBranchId`; actual fetch is delegated to `useEffect`
- `getCurrentBranchPath()`
  - Maps the current branch to a minimal breadcrumb label
- `getBranchCountForSegment(segmentId)`
  - Counts how many branch records point to a source segment

#### Render responsibilities

The render tree has four main UI regions:

- loading and error states
- top navigation and current-path label
- branch switcher
- main story timeline with segment cards, branch markers, and a bottom continuation button

The file also declares an inline `BranchDialog` component inside `StoryDetailPage`. That means modal markup, branching workflow state, and page-level data orchestration all live in one module.

#### Dependencies

External imports:

- `react`
  - `useState`
  - `useEffect`
  - `useCallback`
- `next/link`

Runtime backend dependencies:

- `GET /api/stories/${id}`
- `GET /api/stories/${id}/tree`
- `GET /api/stories/${id}/segments?branchId=...`
- `POST /api/stories/${id}/stream-continue`
- `POST /api/stories/${id}/branch`

Browser/platform APIs:

- `fetch`
- `TextDecoder`
- `ReadableStreamDefaultReader` via `res.body?.getReader()`
- `alert`
- `setTimeout`

Styling dependencies:

- CSS custom properties such as `--paper`, `--muted`, `--gold`, `--accent`, `--border`, `--ink`, `--jade`
- custom classes such as `prose-chinese`, `animate-fade-in-up`, `branch-pulse`, `divider-ornament`

Important non-dependencies:

- It does not import `src/types/story.ts`
- It does not import `src/components/StreamingText.tsx`
- It does not import `src/components/story/StoryImageDisplay.tsx`
- It does not call a shared story service or prompt builder

#### Architectural observations

This route is UI-heavy but data-thin:

- all business operations are delegated to API routes
- all story intelligence lives outside this directory
- there is no reusable view model, domain hook, or shared client data layer

This route is also tightly coupled to backend response shape:

- branch names, branch counts, and current branch labels all assume the `/tree` and `/segments` payload shapes from the current JSON-backed API implementation
- any ChronosMirror expansion that adds character state, validation warnings, citations, or pacing metadata will require changes to both the fetch payloads and this page state model

## Supporting architecture outside `src/app/story/`

Although `src/app/story/` contains only one source file, that page depends on a larger story subsystem.

### API layer used by the page

- `src/app/api/stories/[id]/route.ts`
  - returns story metadata from `storiesStore`
- `src/app/api/stories/[id]/segments/route.ts`
  - returns ordered segments for a branch via `getOrderedChain()`
- `src/app/api/stories/[id]/tree/route.ts`
  - returns branch metadata and a derived tree view
- `src/app/api/stories/[id]/stream-continue/route.ts`
  - streams model output, then appends a new segment to storage
- `src/app/api/stories/[id]/branch/route.ts`
  - creates a branch record, marks the source segment as a branch point, generates the first branch segment, and stores it

### Persistence and traversal layer

`src/lib/simple-db.ts` is the actual story persistence backend:

- `storiesStore` persists `data/stories.json`
- `segmentsStore` persists `data/segments.json`
- `branchesStore` persists `data/branches.json`
- `getOrderedChain(storyId, branchId)` reconstructs a branch by following `parentSegmentId`
- `getTailSegment(storyId, branchId)` derives the last segment of a chain

This matters because the `src/app/story/[id]/page.tsx` UI is designed around linear chains per branch, not around a richer event graph or a validated historical timeline.

### Shared type layer

`src/types/story.ts` contains broader type definitions than the page actually uses:

- story timestamps
- branch timestamps
- `ContinueStoryRequest.characters?: string[]`
- tree node types

The current route does not reuse those types, so contract drift is already possible.

## Architecture overview

### High-level flow

1. User opens `/story/[id]`.
2. `StoryDetailPage` fetches story metadata and branch metadata.
3. After initial load, `StoryDetailPage` fetches the ordered segment chain for the active branch.
4. The page renders the chain as a timeline-style reader.
5. If the user continues the story:
   - the page calls `POST /api/stories/[id]/stream-continue`
   - the API streams model tokens
   - the page appends streamed text to `newContent`
   - the API stores the completed segment in `segments.json`
   - the page refetches branch segments and tree data
6. If the user forks the story:
   - the page opens the inline `BranchDialog`
   - the page posts `segmentId` and `userDirection` to `POST /api/stories/[id]/branch`
   - the API creates a new branch record, generates the first branch segment, and stores both
   - the page refetches segments and tree data

### Effective layering

- Presentation layer: `src/app/story/[id]/page.tsx`
- Route/API orchestration layer: `src/app/api/stories/[id]/*`
- Persistence and graph traversal layer: `src/lib/simple-db.ts`
- Provider integration layer: inline `fetch()` calls inside API routes to OpenAI-compatible chat endpoints

### Architectural strengths

- Very small surface area
- Straightforward branch model using `branchId` plus `parentSegmentId`
- Streaming continuation already exists end to end
- Tree metadata is materialized in a single API route, which gives one clear backend extension point

### Architectural constraints

- The story route is monolithic. UI, modal, branching workflow, and stream handling are all in one client file.
- Prompt construction is duplicated across API routes instead of shared in a single story-generation service.
- Storage is append-only JSON with no transaction model, no versioning, and no normalized character or event tables.
- The route is branch-centric, not timeline-centric. A branch is modeled as a simple linked list of segments.
- README and blueprint claim richer AI controls, Prisma, and character-aware prompting, but the current runtime path is `simple-db.ts` plus direct provider calls.

## ChronosMirror upgrade gaps

ChronosMirror, as described in the request, needs stronger historical reasoning, character state, retrieval, and generation control than the current route stack provides.

### 1. Character modeling gap

Current state:

- The story page has no character-oriented state, controls, or rendering.
- `src/types/story.ts` exposes `ContinueStoryRequest.characters?: string[]`, but the story page never sends it and the story APIs do not consume it.
- Prompt assembly in `continue/route.ts`, `stream-continue/route.ts`, and `branch/route.ts` only uses:
  - story title
  - story description
  - raw chain text
  - optional `userDirection`
- There is no persistent character schema for:
  - role
  - goals
  - relationships
  - loyalties
  - speech register
  - emotional state
  - per-branch evolution

Why this blocks ChronosMirror:

- Character behavior is currently inferred ad hoc by the model from free text.
- Branching does not create updated character state snapshots.
- The UI cannot surface “why this branch is plausible for this character” because that data does not exist.

Recommended upgrade direction:

- Add normalized `CharacterProfile` and `CharacterState` entities keyed by `storyId` and `branchId`.
- Persist relationship edges and branch-local deltas.
- Build prompts from structured persona cards rather than only from concatenated prose.
- Return character-state payloads to the story page so ChronosMirror can expose character consistency indicators and relationship changes per segment.

### 2. Timeline validation gap

Current state:

- The system tracks storage timestamps (`createdAt`, `updatedAt`), not narrative time.
- `getOrderedChain()` validates only graph traversal order, not historical order.
- No API route performs pre-save or post-generation validation against dates, reign periods, locations, or causal constraints.
- No type in the story route or shared types represents:
  - historical date
  - era / dynasty
  - source event
  - temporal dependencies
  - contradiction markers

Important current limitation:

- `src/app/api/stories/[id]/branch/route.ts` always builds branch context from `getOrderedChain(storyId, 'main')`.
- The page allows branching from every segment, including segments already on a branch.
- If the chosen `segmentId` is not on the main line, the branch generator falls back to the full main chain and ignores the actual branch ancestry.

Why this blocks ChronosMirror:

- ChronosMirror needs a validated causal and temporal model, not just parent pointers.
- The current branch generator can lose branch-local context, which undermines temporal consistency immediately.
- Historical alternate fiction still needs explicit “divergence from canon” tracking; the current model has no place to store it.

Recommended upgrade direction:

- Introduce structured event records per segment: canonical date, inferred date range, location, participants, precedent events.
- Add a validation stage before persistence:
  - branch ancestry resolution
  - temporal consistency checks
  - historical entity existence checks
  - divergence tagging
- Store validation output with the segment so the UI can expose warnings or confidence badges.

### 3. MCP Wikipedia gap

Current state:

- No file in the story path or story API path imports or calls any MCP client.
- No story generation route enriches prompts with retrieved historical references.
- No citation, provenance, or fact-check payload is returned to the page.

Why this blocks ChronosMirror:

- Historical writing quality is currently limited to the model’s prior knowledge plus the user-provided story description.
- The system cannot distinguish “inventive alternate-history divergence” from “accidental factual hallucination.”
- The story page has no place to show supporting references because none are collected.

Recommended upgrade direction:

- Add a server-side retrieval step before generation:
  - resolve people, places, battles, dynasties, and dates
  - query Wikipedia through MCP
  - cache normalized reference bundles per story and branch
- Feed retrieved facts into prompt construction as structured context, not as ad hoc text blobs.
- Return citation metadata alongside generated segments so the story page can render fact panels, source links, or “validated against references” badges.

### 4. Pacing control gap

Current state:

- The page has only two narrative actions:
  - continue the current branch
  - fork from a chosen segment
- Generation control is minimal:
  - fixed temperature
  - fixed max token limit
  - simple prompt instruction like “150-300字”
- The branch dialog shows staged labels (`thinking`, `generating`, `saving`), but those states are purely UI choreography plus `setTimeout()`.
- There is no real director-mode schema for:
  - beat count
  - scene objective
  - reveal timing
  - tension curve
  - dialogue density
  - cliffhanger preference
  - multi-step outline-to-prose generation

Why this blocks ChronosMirror:

- ChronosMirror pacing control requires explicit narrative planning signals, not only prose continuation.
- The current SSE continuation streams one flat prose pass.
- The UI cannot request “slow burn,” “battle beat,” “political intrigue,” or “one-step branch seed followed by user confirmation.”

Recommended upgrade direction:

- Extend request payloads with pacing directives and director controls.
- Split generation into stages:
  - plan beats
  - validate beats
  - draft prose
  - optionally revise for style and continuity
- Add segment metadata for pacing so the story page can show branch intensity, beat markers, or scene boundaries instead of only raw paragraphs.

## Cross-cutting upgrade implications

ChronosMirror is not just a UI enhancement for `src/app/story/[id]/page.tsx`. The required changes cut across the full stack:

- `src/app/story/[id]/page.tsx`
  - needs new state, controls, and displays for character, validation, citations, and pacing
- `src/app/api/stories/[id]/branch/route.ts`
  - needs ancestry-aware context building and structured branch metadata
- `src/app/api/stories/[id]/continue/route.ts`
  - needs shared prompt assembly, validation, and structured generation settings
- `src/app/api/stories/[id]/stream-continue/route.ts`
  - needs streaming of richer events than just plain text deltas
- `src/app/api/stories/[id]/tree/route.ts`
  - needs to expose validation and branch metadata, not only basic branch labels
- `src/lib/simple-db.ts`
  - is too narrow for robust character graphs, citation bundles, and timeline validators; the current JSON-list store is likely a transitional persistence layer, not a suitable final ChronosMirror backend

## Bottom line

`src/app/story/` is currently a single client page that presents a branch-based reading experience over a simple API and JSON-store backend. It is functional for basic reading, continuation, and forking, but it does not yet have the structured narrative state that ChronosMirror needs.

The biggest upgrade blockers are:

- duplicated and underspecified story types in the route layer
- no structured character model
- no timeline or historical validation pipeline
- no MCP Wikipedia retrieval
- no true pacing/director control beyond coarse prompt wording and cosmetic UI steps

That means the ChronosMirror upgrade should be treated as a data-model and orchestration upgrade first, and only secondarily as a page-level UI enhancement.
