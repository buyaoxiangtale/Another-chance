# `src/types/` Research

## Scope

`src/types/` currently contains one source file:

- `src/types/story.ts`

This report covers, for that file:

- purpose
- exports
- dependencies

It also explains how this directory fits into the live architecture and where it falls short for the planned ChronosMirror upgrade.

## Directory summary

`src/types/` is intended to be the shared contract layer for the story domain, but in the current codebase it is not the runtime source of truth. A repo-wide search under `src/` found no imports of `src/types/story.ts`. The live application instead uses:

- duplicated interfaces in `src/lib/simple-db.ts`
- duplicated interfaces in `src/app/story/[id]/page.tsx`
- ad hoc JSON payload shapes in the story API routes

That means `src/types/` is currently more of a design artifact than an enforced boundary.

## File-by-file analysis

### `src/types/story.ts`

**Purpose**

`src/types/story.ts` attempts to centralize three different contract layers in one file:

- core story entities: `Story`, `StorySegment`, `StoryBranch` (`src/types/story.ts:2-34`)
- API DTOs: `ContinueStoryRequest`, `BranchStoryRequest`, `StoryResponse` (`src/types/story.ts:36-55`)
- UI tree data: `TreeNode` (`src/types/story.ts:57-67`)

It also includes three runtime classes plus a `module.exports` object for backward compatibility (`src/types/story.ts:69-111`).

**Exports**

Type exports:

- `Story`
- `StorySegment`
- `StoryBranch`
- `ContinueStoryRequest`
- `BranchStoryRequest`
- `StoryResponse`
- `TreeNode`

Runtime/CommonJS exports:

- `Story` -> `StoryClass`
- `StorySegment` -> `StorySegmentClass`
- `StoryBranch` -> `StoryBranchClass`

Important nuance:

- the `export type ...` declarations are compile-time only
- the only runtime exports come from `module.exports` at `src/types/story.ts:107-111`
- the project TypeScript config is ESM-oriented (`tsconfig.json:14-17`), so this mixed type-export plus CommonJS-export pattern is awkward even before considering that nothing imports the file today

**Dependencies**

External imports:

- none

Internal imports:

- none

Runtime dependencies:

- `Object.assign` in the three constructors (`src/types/story.ts:78`, `src/types/story.ts:92`, `src/types/story.ts:104`)
- CommonJS `module.exports` (`src/types/story.ts:107-111`)

Internal coupling inside the file:

- the compatibility classes depend on the local type aliases as constructor input types

**Observed issues**

1. It is not used by the live `src/` runtime.
2. It mixes domain entities, API DTOs, and UI view models in a single file.
3. It mixes ESM-style type exports with a CommonJS runtime export object.
4. Several declared contracts do not match the live route payloads or persistence layer.

## Contract drift against the live app

The main architectural finding is not that `src/types/story.ts` is small. It is that it is disconnected from the code that actually runs.

### Drift with the persistence layer

`src/lib/simple-db.ts` redeclares `Story`, `StorySegment`, and `StoryBranch` locally (`src/lib/simple-db.ts:37-69`) and exports those versions for all story routes (`src/lib/simple-db.ts:127-138`).

Key mismatches:

1. `StorySegment.parentSegmentId` is required in `src/types/story.ts:21`, but optional in `src/lib/simple-db.ts:56`.
2. The create route writes the root segment with `parentSegmentId: ''` in `src/app/api/stories/route.ts:67-78`, which is neither a clean optional value nor an explicit root marker type.
3. The image route comments mention `imageMetadata` (`src/app/api/images/route.ts:16-18`), but `src/types/story.ts` only models `imageUrls: string[]`.

### Drift with the story page

The story detail page declares its own local `Story`, `StorySegment`, and `StoryBranch` interfaces in `src/app/story/[id]/page.tsx:6-29`.

Key mismatches:

1. The page omits timestamps that exist in the shared type file.
2. The page never imports `TreeNode`, `StoryResponse`, `ContinueStoryRequest`, or `BranchStoryRequest`.
3. The page posts raw JSON objects to the routes:
   - continuation sends only `{ branchId }` (`src/app/story/[id]/page.tsx:108-113`)
   - branching sends only `{ segmentId, userDirection }` (`src/app/story/[id]/page.tsx:174-180`)

### Drift with the story API routes

The routes do not consume the declared request/response DTOs from `src/types/story.ts`.

Examples:

1. `ContinueStoryRequest` declares `segmentId`, `branchId`, `content`, `style`, and `characters` (`src/types/story.ts:37-43`), but the non-streaming continue route reads only `branchId` from the request body (`src/app/api/stories/[id]/continue/route.ts:35-39`).
2. The streaming continue route also reads only `branchId` (`src/app/api/stories/[id]/stream-continue/route.ts:4-8`).
3. `BranchStoryRequest` exists (`src/types/story.ts:45-49`), but the branch route parses raw JSON and does not type it through that DTO (`src/app/api/stories/[id]/branch/route.ts:4-8`).
4. `StoryResponse` expects `{ segments, branches, currentSegment }` (`src/types/story.ts:51-55`), but no live route returns that shape.
5. `TreeNode` does not match the tree route output. The route builds `any[]` structures with nested branch objects that contain `segments` arrays and branch metadata (`src/app/api/stories/[id]/tree/route.ts:4-53`), not the declared recursive `TreeNode` shape.

## Architecture overview

### Intended architecture

If `src/types/story.ts` were authoritative, the flow would look like this:

1. Domain entities define the story graph.
2. API DTOs define request and response payloads.
3. UI view models define renderable tree structures.
4. Routes, storage, and pages all import the same contracts.

That is a sensible direction, especially for a feature like ChronosMirror that needs a strict narrative-state model.

### Actual architecture

The live code follows a different pattern:

1. `src/lib/simple-db.ts` acts as the effective domain contract and persistence layer.
2. `src/app/api/stories/*` imports types from `src/lib/simple-db.ts`, not from `src/types/story.ts`.
3. `src/app/story/[id]/page.tsx` defines another set of local interfaces for client state.
4. The tree route assembles ad hoc response objects with `any[]`.
5. `src/types/story.ts` sits outside that path and is not enforcing anything.

So the real architecture is "duplicated contracts around a JSON-file store", not "shared types drive the app."

### What this means structurally

The current design is workable for a small branching-story prototype, because the runtime only needs:

- a minimal `Story`
- a minimal `StorySegment`
- a minimal `StoryBranch`
- linear parent-link traversal
- one-shot continuation and branching prompts

But it creates three immediate problems:

1. contract drift is easy because there is no single source of truth
2. richer features will require touching multiple incompatible type definitions
3. the type layer is too narrow for historical reasoning, validation, and research provenance

## ChronosMirror upgrade gaps

ChronosMirror needs stronger narrative-state modeling than `src/types/story.ts` currently provides. The main gap is not just missing fields; it is that the types are not yet designed around structured generation and validation workflows.

### 1. Character modeling gap

Current state:

- the only character-related field in `src/types/story.ts` is `characters?: string[]` on `ContinueStoryRequest` (`src/types/story.ts:37-43`)
- `Story`, `StorySegment`, and `StoryBranch` have no typed character state
- the continue route builds prompts from a flat prose chain (`src/app/api/stories/[id]/continue/route.ts:55-68`)
- the branch route does the same plus a raw `userDirection` string (`src/app/api/stories/[id]/branch/route.ts:59-71`)
- the story page has no typed character panel, relationship graph, persona state, or dialogue-style state

Why this blocks ChronosMirror:

- ChronosMirror character modeling needs more than a list of names
- there is no place to represent multi-dimensional persona attributes, speech patterns, motivations, loyalties, or changing relationships
- there is no typed per-segment state delta showing what changed for each character after a branch or continuation

Type additions needed:

- `CharacterProfile`
- `CharacterState`
- `CharacterArc`
- `RelationshipEdge`
- `DialogueStyle`
- `SegmentCharacterDelta`

### 2. Timeline validation gap

Current state:

- `StorySegment` only stores prose plus graph links (`src/types/story.ts:12-23`)
- the only structural timeline signal is `parentSegmentId`
- there is no world-time field, scene date, era marker, event reference, or validation output DTO
- the JSON-store traversal in `getOrderedChain()` is chain reconstruction, not validation (`src/lib/simple-db.ts:75-107`)
- the tree route builds display data, not temporal reasoning data (`src/app/api/stories/[id]/tree/route.ts:4-53`)

Why this blocks ChronosMirror:

- ChronosMirror timeline validation requires typed world-time state and typed validation output
- parent pointers can tell the app which segment follows which; they cannot tell the app whether a claimed event date is wrong, whether two branches violate chronology, or whether a character appears before entering the scene
- the routes currently rely on prompt wording such as "精通中国历史" rather than explicit historical validation state (`src/app/api/stories/[id]/continue/route.ts:17-23`, `src/app/api/stories/[id]/branch/route.ts:83-91`)

Type additions needed:

- `NarrativeClock`
- `TimelineEvent`
- `HistoricalFactClaim`
- `TimelineConstraint`
- `TimelineIssue`
- `TimelineValidationResult`

### 3. MCP Wikipedia gap

Current state:

- `src/types/story.ts` contains no research, citation, source, or provenance models
- `StoryResponse` and `TreeNode` have nowhere to attach evidence bundles
- a repo search under `src/`, `prisma/`, and `data/` found no live MCP, Wikipedia, citation, provenance, or fact-check code

Why this blocks ChronosMirror:

- ChronosMirror's Wikipedia-through-MCP workflow needs durable provenance
- even if a future route queries Wikipedia, there is currently no typed place to store:
  - what was searched
  - which entity/page matched
  - which excerpt grounded which generated claim
  - confidence, timestamps, or cache metadata
- without typed provenance, the UI cannot show grounded claims or validation evidence

Type additions needed:

- `ResearchQuery`
- `WikipediaEntity`
- `EvidenceSource`
- `Citation`
- `GroundedClaim`
- `FactCheckResult`

### 4. Pacing control gap

Current state:

- the closest pacing-related field is `style?: string` on `ContinueStoryRequest` (`src/types/story.ts:40-41`)
- the continue routes generate a single next paragraph from a prompt ending in "请续写下一段（150-300字）" (`src/app/api/stories/[id]/continue/route.ts:60-66`, `src/app/api/stories/[id]/stream-continue/route.ts:29-35`)
- the branch route does the same for a new branch (`src/app/api/stories/[id]/branch/route.ts:63-71`)
- the story page shows branching progress steps like `thinking`, `generating`, and `saving`, but those are UI labels rather than typed generation phases (`src/app/story/[id]/page.tsx:166-186`)

Why this blocks ChronosMirror:

- ChronosMirror pacing control needs planning state, not just final prose
- there is no typed beat plan, scene objective, tension target, reveal schedule, or director-mode instruction
- there is no response type for intermediate planning output, only final segment text

Type additions needed:

- `PacingDirective`
- `ScenePlan`
- `StoryBeat`
- `DirectorInstruction`
- `GenerationPhase`
- `PacingTelemetry`

## Recommended evolution of `src/types/`

The immediate next step should not be "add a few more optional fields to `story.ts`." It should be to turn `src/types/` into the actual contract layer.

Recommended sequence:

1. Make `src/types/` the single source of truth for story domain types.
2. Update `src/lib/simple-db.ts`, story routes, and the story page to import from `src/types/` instead of redeclaring local interfaces.
3. Remove the mixed `module.exports` compatibility layer unless there is a proven runtime consumer that still requires it.
4. Split the types by concern as the model grows, for example:
   - `src/types/story.ts`
   - `src/types/character.ts`
   - `src/types/timeline.ts`
   - `src/types/research.ts`
   - `src/types/pacing.ts`
5. Introduce explicit request/response DTOs that match the live routes and enforce them at route boundaries.
6. Replace ad hoc tree payloads with typed response models.

## Bottom line

`src/types/` currently contains one file that describes the intended story contract, but it is not the contract the app actually uses. The live system is driven by duplicated types in the JSON-store layer, duplicated types in the story page, and route-local payload assumptions.

That is manageable for the current basic branching-story app. It is not sufficient for ChronosMirror. Before adding stronger character modeling, timeline validation, MCP Wikipedia grounding, or pacing control, the project should first turn `src/types/` into the single authoritative contract layer and then expand it into a structured narrative-state model.
