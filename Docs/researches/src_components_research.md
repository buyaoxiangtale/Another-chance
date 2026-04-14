user
Analyze all source files in src/components/. For each file: purpose, exports, dependencies. Then: architecture overview and ChronosMirror upgrade gaps (character modeling, timeline validation, MCP Wikipedia, pacing control). Write results to /home/pjlab/fbh/fbh_project/gushi/Docs/researches/src_components_research.md
codex
I’m reviewing `src/components/` and the surrounding repo context first so the report is grounded in the actual implementation. Next I’ll inventory the files, inspect key dependencies, and then write the research note into `Docs/researches/src_components_research.md`.
exec
/usr/bin/zsh -lc pwd in /home/pjlab/fbh/fbh_project/gushi
 succeeded in 0ms:
/home/pjlab/fbh/fbh_project/gushi

exec
/usr/bin/zsh -lc 'rg --files src/components' in /home/pjlab/fbh/fbh_project/gushi
 succeeded in 0ms:
src/components/story/StoryImageDisplay.tsx
src/components/StreamingText.tsx

exec
/usr/bin/zsh -lc 'rg -n "ChronosMirror|Wikipedia|MCP|timeline|pacing|character" -S .' in /home/pjlab/fbh/fbh_project/gushi
 succeeded in 0ms:
./README.md:163:    type: 'illustration' | 'scene' | 'character' | 'object';
./src/types/story.ts:42:  characters?: string[];
./src/components/story/StoryImageDisplay.tsx:10:  type: 'illustration' | 'scene' | 'character' | 'object';
./src/components/story/StoryImageDisplay.tsx:70:      case 'character':
./src/components/story/StoryImageDisplay.tsx:86:      case 'character':
./Docs/researches/src_components_research.md.tmp:13:Analyze all source files in src/components/. For each file: purpose, exports, dependencies. Then: architecture overview and ChronosMirror upgrade gaps (character modeling, timeline validation, MCP Wikipedia, pacing control). Write results to /home/pjlab/fbh/fbh_project/gushi/Docs/researches/src_components_research.md
./Docs/researches/src_app_api_research.md:2:Analyze all source files in src/app/api/. For each file: purpose, exports, dependencies. Then: architecture overview and ChronosMirror upgrade gaps (character modeling, timeline validation, MCP Wikipedia, pacing control). Write results to /home/pjlab/fbh/fbh_project/gushi/Docs/researches/src_app_api_research.md
./Docs/researches/src_app_api_research.md:19:/usr/bin/zsh -lc 'pwd && ls -la && rg -n "ChronosMirror|chronos mirror|timeline validation|MCP Wikipedia|pacing control|character modeling" -S .' in /home/pjlab/fbh/fbh_project/gushi
./Docs/researches/src_app_api_research.md:57:./Docs/researches/src_app_story_research.md.tmp:14:Research ALL files in the directory 'src/app/story' under this project. For each file found: describe its purpose, key functions/classes/types, exports, and dependencies. Then provide an architecture overview of how files in this directory relate to each other. Finally, note specific areas needing improvement for the ChronosMirror upgrade: character persona modeling (multi-dimensional attributes, speech patterns, dynamic relationships), timeline validation (historical accuracy, temporal consistency), MCP Wikipedia integration (fact-checking historical details), and pacing control (step-by-step generation, director mode). Be thorough and specific — cite actual function names, type definitions, and code patterns.
./Docs/researches/src_app_api_research.md:58:./Docs/researches/src_app_story_research.md.tmp:33:  • Synthesize directory architecture and ChronosMirror upgrade gaps
./Docs/researches/src_app_api_research.md:59:./Docs/researches/src_app_story_research.md.tmp:55:- ChronosMirror upgrade gaps for persona modeling, timeline validation, MCP Wikipedia fact-checking, and pacing/director-mode control
./Docs/researches/src_app_api_research.md:60:./Docs/researches/src_app_story_research.md.tmp:78:- ChronosMirror upgrade gaps for persona modeling, timeline validation, MCP Wikipedia fact-checking, and pacing/director-mode control
./Docs/researches/src_app_api_research.md:61:./Docs/researches/src_app_api_research.md.tmp:13:Analyze all source files in src/app/api/. For each file: purpose, exports, dependencies. Then: architecture overview and ChronosMirror upgrade gaps (character modeling, timeline validation, MCP Wikipedia, pacing control). Write results to /home/pjlab/fbh/fbh_project/gushi/Docs/researches/src_app_api_research.md
./Docs/researches/src_app_api_research.md:398:  characters?: string[];
./Docs/researches/src_app_api_research.md:1302:    type: 'illustration' | 'scene' | 'character' | 'object';
./Docs/researches/src_app_api_research.md:1405:Research ALL files in the directory 'src/app/story' under this project. For each file found: describe its purpose, key functions/classes/types, exports, and dependencies. Then provide an architecture overview of how files in this directory relate to each other. Finally, note specific areas needing improvement for the ChronosMirror upgrade: character persona modeling (multi-dimensional attributes, speech patterns, dynamic relationships), timeline validation (historical accuracy, temporal consistency), MCP Wikipedia integration (fact-checking historical details), and pacing control (step-by-step generation, director mode). Be thorough and specific — cite actual function names, type definitions, and code patterns.
./Docs/researches/src_app_api_research.md:1424:  • Synthesize directory architecture and ChronosMirror upgrade gaps
./Docs/researches/src_app_api_research.md:1446:- ChronosMirror upgrade gaps for persona modeling, timeline validation, MCP Wikipedia fact-checking, and pacing/director-mode control
./Docs/researches/src_app_api_research.md:1468:- ChronosMirror upgrade gaps for persona modeling, timeline validation, MCP Wikipedia fact-checking, and pacing/director-mode control
./Docs/researches/src_app_api_research.md:1471:I have the route implementations now. Next pass is tracing who calls them and whether the API layer has any deeper model/service abstractions, because that determines whether the ChronosMirror gaps are isolated or systemic.
./Docs/researches/src_app_api_research.md:2540:  type: 'illustration' | 'scene' | 'character' | 'object';
./Docs/researches/src_app_api_research.md:2600:      case 'character':
./Docs/researches/src_app_api_research.md:2616:      case 'character':
./Docs/researches/src_app_api_research.md:2942:  → Synthesize per-file purpose, exports, dependencies, architecture, and ChronosMirror upgrade gaps
./Docs/researches/src_app_story_research.md:23:- rendering the timeline-style reading UI
./Docs/researches/src_app_story_research.md:47:- The route-local versions are narrower than the shared types. For example, the shared type layer includes timestamps and optional `characters?: string[]` on `ContinueStoryRequest`, but the page ignores that capability entirely.
./Docs/researches/src_app_story_research.md:103:- main story timeline with segment cards, branch markers, and a bottom continuation button
./Docs/researches/src_app_story_research.md:156:- any ChronosMirror expansion that adds character state, validation warnings, citations, or pacing metadata will require changes to both the fetch payloads and this page state model
./Docs/researches/src_app_story_research.md:185:This matters because the `src/app/story/[id]/page.tsx` UI is designed around linear chains per branch, not around a richer event graph or a validated historical timeline.
./Docs/researches/src_app_story_research.md:193:- `ContinueStoryRequest.characters?: string[]`
./Docs/researches/src_app_story_research.md:205:4. The page renders the chain as a timeline-style reader.
./Docs/researches/src_app_story_research.md:236:- Storage is append-only JSON with no transaction model, no versioning, and no normalized character or event tables.
./Docs/researches/src_app_story_research.md:237:- The route is branch-centric, not timeline-centric. A branch is modeled as a simple linked list of segments.
./Docs/researches/src_app_story_research.md:238:- README and blueprint claim richer AI controls, Prisma, and character-aware prompting, but the current runtime path is `simple-db.ts` plus direct provider calls.
./Docs/researches/src_app_story_research.md:240:## ChronosMirror upgrade gaps
./Docs/researches/src_app_story_research.md:242:ChronosMirror, as described in the request, needs stronger historical reasoning, character state, retrieval, and generation control than the current route stack provides.
./Docs/researches/src_app_story_research.md:248:- The story page has no character-oriented state, controls, or rendering.
./Docs/researches/src_app_story_research.md:249:- `src/types/story.ts` exposes `ContinueStoryRequest.characters?: string[]`, but the story page never sends it and the story APIs do not consume it.
./Docs/researches/src_app_story_research.md:255:- There is no persistent character schema for:
./Docs/researches/src_app_story_research.md:264:Why this blocks ChronosMirror:
./Docs/researches/src_app_story_research.md:267:- Branching does not create updated character state snapshots.
./Docs/researches/src_app_story_research.md:268:- The UI cannot surface “why this branch is plausible for this character” because that data does not exist.
./Docs/researches/src_app_story_research.md:275:- Return character-state payloads to the story page so ChronosMirror can expose character consistency indicators and relationship changes per segment.
./Docs/researches/src_app_story_research.md:297:Why this blocks ChronosMirror:
./Docs/researches/src_app_story_research.md:299:- ChronosMirror needs a validated causal and temporal model, not just parent pointers.
./Docs/researches/src_app_story_research.md:313:### 3. MCP Wikipedia gap
./Docs/researches/src_app_story_research.md:317:- No file in the story path or story API path imports or calls any MCP client.
./Docs/researches/src_app_story_research.md:321:Why this blocks ChronosMirror:
./Docs/researches/src_app_story_research.md:331:  - query Wikipedia through MCP
./Docs/researches/src_app_story_research.md:357:Why this blocks ChronosMirror:
./Docs/researches/src_app_story_research.md:359:- ChronosMirror pacing control requires explicit narrative planning signals, not only prose continuation.
./Docs/researches/src_app_story_research.md:365:- Extend request payloads with pacing directives and director controls.
./Docs/researches/src_app_story_research.md:371:- Add segment metadata for pacing so the story page can show branch intensity, beat markers, or scene boundaries instead of only raw paragraphs.
./Docs/researches/src_app_story_research.md:375:ChronosMirror is not just a UI enhancement for `src/app/story/[id]/page.tsx`. The required changes cut across the full stack:
./Docs/researches/src_app_story_research.md:378:  - needs new state, controls, and displays for character, validation, citations, and pacing
./Docs/researches/src_app_story_research.md:388:  - is too narrow for robust character graphs, citation bundles, and timeline validators; the current JSON-list store is likely a transitional persistence layer, not a suitable final ChronosMirror backend
./Docs/researches/src_app_story_research.md:392:`src/app/story/` is currently a single client page that presents a branch-based reading experience over a simple API and JSON-store backend. It is functional for basic reading, continuation, and forking, but it does not yet have the structured narrative state that ChronosMirror needs.
./Docs/researches/src_app_story_research.md:397:- no structured character model
./Docs/researches/src_app_story_research.md:398:- no timeline or historical validation pipeline
./Docs/researches/src_app_story_research.md:399:- no MCP Wikipedia retrieval
./Docs/researches/src_app_story_research.md:400:- no true pacing/director control beyond coarse prompt wording and cosmetic UI steps
./Docs/researches/src_app_story_research.md:402:That means the ChronosMirror upgrade should be treated as a data-model and orchestration upgrade first, and only secondarily as a page-level UI enhancement.
./src/app/globals.css:72:.timeline-line {
./src/app/globals.css:75:.timeline-line::before {
./src/app/globals.css:107:  letter-spacing: 0.05em;
./Docs/researches/src_app_create_research.md:2:Analyze all source files in src/app/create/. For each file: purpose, exports, dependencies. Then: architecture overview and ChronosMirror upgrade gaps (character modeling, timeline validation, MCP Wikipedia, pacing control). Write results to /home/pjlab/fbh/fbh_project/gushi/Docs/researches/src_app_create_research.md
./Docs/researches/src_app_create_research.md:7:  • Synthesize architecture overview and ChronosMirror upgrade gaps
./Docs/researches/src_app_create_research.md:20:The route is small on disk: `src/app/create/` currently contains a single source file, `page.tsx`. I’m reading that file and then tracing the imported project modules it depends on where that context affects the architecture and ChronosMirror gap analysis.
./Docs/researches/src_app_create_research.md:266:/usr/bin/zsh -lc 'rg -n "''^import|''^export|function |const .* =|use client|Timeline|Chronos|mirror|Wikipedia|MCP|pace|character" src/app/create/page.tsx' in /home/pjlab/fbh/fbh_project/gushi
./Docs/researches/src_app_create_research.md:854:  characters?: string[];
./Docs/researches/src_app_create_research.md:940:The first read missed because zsh treated `[id]` as a glob. I’m rerunning those reads with quoted paths; the gap analysis depends on whether continuation/branch generation already carries any character, pacing, or validation hooks.
./Docs/researches/src_app_create_research.md:1326:I’ve confirmed a key mismatch already: the create UI sends `storyType` and `prompt`, but the current create API only persists `title`, `description`, and `author`. I’m checking whether “ChronosMirror” or any related historical-validation facilities already exist elsewhere in the repo before I write the gap section.
./Docs/researches/src_app_create_research.md:1328:/usr/bin/zsh -lc "rg -n \"ChronosMirror|chronos|timeline|Wikipedia|MCP|pace|pacing|character model|角色|人物设定|时间线|维基\" src Docs prisma data -g '"'!node_modules'"'" in /home/pjlab/fbh/fbh_project/gushi
./Docs/researches/src_app_create_research.md:1337:src/app/globals.css:72:.timeline-line {
./Docs/researches/src_app_create_research.md:1338:src/app/globals.css:75:.timeline-line::before {
./Docs/researches/src_app_create_research.md:1339:src/app/globals.css:107:  letter-spacing: 0.05em;
./Docs/researches/src_app_create_research.md:1340:Docs/researches/src_app_create_research.md.tmp:13:Analyze all source files in src/app/create/. For each file: purpose, exports, dependencies. Then: architecture overview and ChronosMirror upgrade gaps (character modeling, timeline validation, MCP Wikipedia, pacing control). Write results to /home/pjlab/fbh/fbh_project/gushi/Docs/researches/src_app_create_research.md
./Docs/researches/src_app_create_research.md:1341:Docs/researches/src_app_create_research.md.tmp:18:  • Synthesize architecture overview and ChronosMirror upgrade gaps
./Docs/researches/src_app_create_research.md:1342:Docs/researches/src_app_create_research.md.tmp:31:The route is small on disk: `src/app/create/` currently contains a single source file, `page.tsx`. I’m reading that file and then tracing the imported project modules it depends on where that context affects the architecture and ChronosMirror gap analysis.
./Docs/researches/src_app_create_research.md:1343:Docs/researches/src_app_create_research.md.tmp:277:/usr/bin/zsh -lc 'rg -n "''^import|''^export|function |const .* =|use client|Timeline|Chronos|mirror|Wikipedia|MCP|pace|character" src/app/create/page.tsx' in /home/pjlab/fbh/fbh_project/gushi
./Docs/researches/src_app_create_research.md:1346:Docs/researches/src_app_create_research.md.tmp:951:The first read missed because zsh treated `[id]` as a glob. I’m rerunning those reads with quoted paths; the gap analysis depends on whether continuation/branch generation already carries any character, pacing, or validation hooks.
./Docs/researches/src_app_create_research.md:1347:Docs/researches/src_app_create_research.md.tmp:1337:I’ve confirmed a key mismatch already: the create UI sends `storyType` and `prompt`, but the current create API only persists `title`, `description`, and `author`. I’m checking whether “ChronosMirror” or any related historical-validation facilities already exist elsewhere in the repo before I write the gap section.
./Docs/researches/src_app_create_research.md:1348:Docs/researches/src_app_story_research.md:23:- rendering the timeline-style reading UI
./Docs/researches/src_app_create_research.md:1349:Docs/researches/src_app_story_research.md:103:- main story timeline with segment cards, branch markers, and a bottom continuation button
./Docs/researches/src_app_create_research.md:1350:Docs/researches/src_app_story_research.md:156:- any ChronosMirror expansion that adds character state, validation warnings, citations, or pacing metadata will require changes to both the fetch payloads and this page state model
./Docs/researches/src_app_create_research.md:1351:Docs/researches/src_app_story_research.md:185:This matters because the `src/app/story/[id]/page.tsx` UI is designed around linear chains per branch, not around a richer event graph or a validated historical timeline.
./Docs/researches/src_app_create_research.md:1352:Docs/researches/src_app_story_research.md:205:4. The page renders the chain as a timeline-style reader.
./Docs/researches/src_app_create_research.md:1353:Docs/researches/src_app_story_research.md:237:- The route is branch-centric, not timeline-centric. A branch is modeled as a simple linked list of segments.
./Docs/researches/src_app_create_research.md:1354:Docs/researches/src_app_story_research.md:240:## ChronosMirror upgrade gaps
./Docs/researches/src_app_create_research.md:1355:Docs/researches/src_app_story_research.md:242:ChronosMirror, as described in the request, needs stronger historical reasoning, character state, retrieval, and generation control than the current route stack provides.
./Docs/researches/src_app_create_research.md:1356:Docs/researches/src_app_story_research.md:264:Why this blocks ChronosMirror:
./Docs/researches/src_app_create_research.md:1357:Docs/researches/src_app_story_research.md:275:- Return character-state payloads to the story page so ChronosMirror can expose character consistency indicators and relationship changes per segment.
./Docs/researches/src_app_create_research.md:1358:Docs/researches/src_app_story_research.md:297:Why this blocks ChronosMirror:
./Docs/researches/src_app_create_research.md:1359:Docs/researches/src_app_story_research.md:299:- ChronosMirror needs a validated causal and temporal model, not just parent pointers.
./Docs/researches/src_app_create_research.md:1360:Docs/researches/src_app_story_research.md:313:### 3. MCP Wikipedia gap
./Docs/researches/src_app_create_research.md:1361:Docs/researches/src_app_story_research.md:317:- No file in the story path or story API path imports or calls any MCP client.
./Docs/researches/src_app_create_research.md:1362:Docs/researches/src_app_story_research.md:321:Why this blocks ChronosMirror:
./Docs/researches/src_app_create_research.md:1363:Docs/researches/src_app_story_research.md:331:  - query Wikipedia through MCP
./Docs/researches/src_app_create_research.md:1364:Docs/researches/src_app_story_research.md:357:Why this blocks ChronosMirror:
./Docs/researches/src_app_create_research.md:1365:Docs/researches/src_app_story_research.md:359:- ChronosMirror pacing control requires explicit narrative planning signals, not only prose continuation.
./Docs/researches/src_app_create_research.md:1366:Docs/researches/src_app_story_research.md:365:- Extend request payloads with pacing directives and director controls.
./Docs/researches/src_app_create_research.md:1367:Docs/researches/src_app_story_research.md:371:- Add segment metadata for pacing so the story page can show branch intensity, beat markers, or scene boundaries instead of only raw paragraphs.
./Docs/researches/src_app_create_research.md:1368:Docs/researches/src_app_story_research.md:375:ChronosMirror is not just a UI enhancement for `src/app/story/[id]/page.tsx`. The required changes cut across the full stack:
./Docs/researches/src_app_create_research.md:1369:Docs/researches/src_app_story_research.md:378:  - needs new state, controls, and displays for character, validation, citations, and pacing
./Docs/researches/src_app_create_research.md:1370:Docs/researches/src_app_story_research.md:388:  - is too narrow for robust character graphs, citation bundles, and timeline validators; the current JSON-list store is likely a transitional persistence layer, not a suitable final ChronosMirror backend
./Docs/researches/src_app_create_research.md:1371:Docs/researches/src_app_story_research.md:392:`src/app/story/` is currently a single client page that presents a branch-based reading experience over a simple API and JSON-store backend. It is functional for basic reading, continuation, and forking, but it does not yet have the structured narrative state that ChronosMirror needs.
./Docs/researches/src_app_create_research.md:1372:Docs/researches/src_app_story_research.md:397:- no structured character model
./Docs/researches/src_app_create_research.md:1373:Docs/researches/src_app_story_research.md:398:- no timeline or historical validation pipeline
./Docs/researches/src_app_create_research.md:1374:Docs/researches/src_app_story_research.md:399:- no MCP Wikipedia retrieval
./Docs/researches/src_app_create_research.md:1375:Docs/researches/src_app_story_research.md:400:- no true pacing/director control beyond coarse prompt wording and cosmetic UI steps
./Docs/researches/src_app_create_research.md:1376:Docs/researches/src_app_story_research.md:402:That means the ChronosMirror upgrade should be treated as a data-model and orchestration upgrade first, and only secondarily as a page-level UI enhancement.
./Docs/researches/src_app_create_research.md:1377:Docs/researches/src_app_api_research.md:2:Analyze all source files in src/app/api/. For each file: purpose, exports, dependencies. Then: architecture overview and ChronosMirror upgrade gaps (character modeling, timeline validation, MCP Wikipedia, pacing control). Write results to /home/pjlab/fbh/fbh_project/gushi/Docs/researches/src_app_api_research.md
./Docs/researches/src_app_create_research.md:1378:Docs/researches/src_app_api_research.md:19:/usr/bin/zsh -lc 'pwd && ls -la && rg -n "ChronosMirror|chronos mirror|timeline validation|MCP Wikipedia|pacing control|character modeling" -S .' in /home/pjlab/fbh/fbh_project/gushi
./Docs/researches/src_app_create_research.md:1379:Docs/researches/src_app_api_research.md:57:./Docs/researches/src_app_story_research.md.tmp:14:Research ALL files in the directory 'src/app/story' under this project. For each file found: describe its purpose, key functions/classes/types, exports, and dependencies. Then provide an architecture overview of how files in this directory relate to each other. Finally, note specific areas needing improvement for the ChronosMirror upgrade: character persona modeling (multi-dimensional attributes, speech patterns, dynamic relationships), timeline validation (historical accuracy, temporal consistency), MCP Wikipedia integration (fact-checking historical details), and pacing control (step-by-step generation, director mode). Be thorough and specific — cite actual function names, type definitions, and code patterns.
./Docs/researches/src_app_create_research.md:1380:Docs/researches/src_app_api_research.md:58:./Docs/researches/src_app_story_research.md.tmp:33:  • Synthesize directory architecture and ChronosMirror upgrade gaps
./Docs/researches/src_app_create_research.md:1381:Docs/researches/src_app_api_research.md:59:./Docs/researches/src_app_story_research.md.tmp:55:- ChronosMirror upgrade gaps for persona modeling, timeline validation, MCP Wikipedia fact-checking, and pacing/director-mode control
./Docs/researches/src_app_create_research.md:1382:Docs/researches/src_app_api_research.md:60:./Docs/researches/src_app_story_research.md.tmp:78:- ChronosMirror upgrade gaps for persona modeling, timeline validation, MCP Wikipedia fact-checking, and pacing/director-mode control
./Docs/researches/src_app_create_research.md:1383:Docs/researches/src_app_api_research.md:61:./Docs/researches/src_app_api_research.md.tmp:13:Analyze all source files in src/app/api/. For each file: purpose, exports, dependencies. Then: architecture overview and ChronosMirror upgrade gaps (character modeling, timeline validation, MCP Wikipedia, pacing control). Write results to /home/pjlab/fbh/fbh_project/gushi/Docs/researches/src_app_api_research.md
./Docs/researches/src_app_create_research.md:1384:Docs/researches/src_app_api_research.md:1405:Research ALL files in the directory 'src/app/story' under this project. For each file found: describe its purpose, key functions/classes/types, exports, and dependencies. Then provide an architecture overview of how files in this directory relate to each other. Finally, note specific areas needing improvement for the ChronosMirror upgrade: character persona modeling (multi-dimensional attributes, speech patterns, dynamic relationships), timeline validation (historical accuracy, temporal consistency), MCP Wikipedia integration (fact-checking historical details), and pacing control (step-by-step generation, director mode). Be thorough and specific — cite actual function names, type definitions, and code patterns.
./Docs/researches/src_app_create_research.md:1386:Docs/researches/src_app_api_research.md:1424:  • Synthesize directory architecture and ChronosMirror upgrade gaps
./Docs/researches/src_app_create_research.md:1389:Docs/researches/src_app_api_research.md:1446:- ChronosMirror upgrade gaps for persona modeling, timeline validation, MCP Wikipedia fact-checking, and pacing/director-mode control
./Docs/researches/src_app_create_research.md:1392:Docs/researches/src_app_api_research.md:1468:- ChronosMirror upgrade gaps for persona modeling, timeline validation, MCP Wikipedia fact-checking, and pacing/director-mode control
./Docs/researches/src_app_create_research.md:1393:Docs/researches/src_app_api_research.md:1471:I have the route implementations now. Next pass is tracing who calls them and whether the API layer has any deeper model/service abstractions, because that determines whether the ChronosMirror gaps are isolated or systemic.
./Docs/researches/src_app_create_research.md:1398:Docs/researches/src_app_api_research.md:2942:  → Synthesize per-file purpose, exports, dependencies, architecture, and ChronosMirror upgrade gaps
./Docs/researches/src_app_create_research.md:2045:    42	  characters?: string[];
./Docs/researches/src_app_create_research.md:2146:- rendering the timeline-style reading UI
./Docs/researches/src_app_create_research.md:2170:- The route-local versions are narrower than the shared types. For example, the shared type layer includes timestamps and optional `characters?: string[]` on `ContinueStoryRequest`, but the page ignores that capability entirely.
./Docs/researches/src_app_create_research.md:2226:- main story timeline with segment cards, branch markers, and a bottom continuation button
./Docs/researches/src_app_create_research.md:2279:- any ChronosMirror expansion that adds character state, validation warnings, citations, or pacing metadata will require changes to both the fetch payloads and this page state model
./Docs/researches/src_app_create_research.md:2308:This matters because the `src/app/story/[id]/page.tsx` UI is designed around linear chains per branch, not around a richer event graph or a validated historical timeline.
./Docs/researches/src_app_create_research.md:2316:- `ContinueStoryRequest.characters?: string[]`
./Docs/researches/src_app_create_research.md:2328:4. The page renders the chain as a timeline-style reader.
./Docs/researches/src_app_create_research.md:2359:- Storage is append-only JSON with no transaction model, no versioning, and no normalized character or event tables.
./Docs/researches/src_app_create_research.md:2360:- The route is branch-centric, not timeline-centric. A branch is modeled as a simple linked list of segments.
./Docs/researches/src_app_create_research.md:2361:- README and blueprint claim richer AI controls, Prisma, and character-aware prompting, but the current runtime path is `simple-db.ts` plus direct provider calls.
./Docs/researches/src_app_create_research.md:2363:## ChronosMirror upgrade gaps
./Docs/researches/src_app_create_research.md:2384:Docs/researches/src_app_story_research.md:238:- README and blueprint claim richer AI controls, Prisma, and character-aware prompting, but the current runtime path is `simple-db.ts` plus direct provider calls.
./Docs/researches/src_app_create_research.md:2390:Docs/researches/src_app_story_research.md:400:- no true pacing/director control beyond coarse prompt wording and cosmetic UI steps
./Docs/researches/src_app_create_research.md:2711:I’ve finished the analysis and I’m writing the research note now. The document will call out the contract drift between the create page and `/api/stories`, because that’s the main blocker behind several ChronosMirror gaps.
./Docs/researches/src_app_create_research.md:2860:+- it does not import any prompt builder, timeline validator, MCP client, or retrieval layer
./Docs/researches/src_app_create_research.md:2940:+- story-world timeline or event dates
./Docs/researches/src_app_create_research.md:2941:+- character sheets or relationship graphs
./Docs/researches/src_app_create_research.md:2943:+- pacing plans, beat budgets, or director controls
./Docs/researches/src_app_create_research.md:2945:+This matters because the create page cannot persist richer ChronosMirror metadata even if the UI is extended. The current store shape would discard it unless the backend model changes first.
./Docs/researches/src_app_create_research.md:2949:+The shared type layer is slightly broader than the actual creation flow, but it is still far short of ChronosMirror needs.
./Docs/researches/src_app_create_research.md:2953:+- `ContinueStoryRequest` includes `characters?: string[]`, which suggests an intent to pass character context into generation later
./Docs/researches/src_app_create_research.md:2954:+- `Story`, `StorySegment`, and `StoryBranch` still lack structured character state, historical facts, citations, or pacing metadata
./Docs/researches/src_app_create_research.md:3011:+## ChronosMirror upgrade gaps
./Docs/researches/src_app_create_research.md:3013:+ChronosMirror, as described in the request, needs richer narrative state and stronger orchestration than the current create flow provides. The gaps start at story creation, not only during continuation.
./Docs/researches/src_app_create_research.md:3021:+- `src/lib/simple-db.ts` has no place to persist character cards or dynamic relationships.
./Docs/researches/src_app_create_research.md:3022:+- `src/types/story.ts` hints at character-aware continuation with `ContinueStoryRequest.characters?: string[]`, but the create page does not seed character data and the runtime routes do not build structured persona state from creation.
./Docs/researches/src_app_create_research.md:3024:+Why this blocks ChronosMirror:
./Docs/researches/src_app_create_research.md:3026:+- character consistency cannot be enforced later if creation never captures who the characters are
./Docs/researches/src_app_create_research.md:3028:+- the current system stores only text blobs, so later generation has to infer character identity and relationships from narrative text each time
./Docs/researches/src_app_create_research.md:3032:+- no structured character input in the custom form
./Docs/researches/src_app_create_research.md:3033:+- no template-attached character roster for the historical seeds
./Docs/researches/src_app_create_research.md:3034:+- no persistence field for character snapshots
./Docs/researches/src_app_create_research.md:3039:+- add create-time structured character inputs
./Docs/researches/src_app_create_research.md:3047:+- attach template-specific default character cards to each historical scenario
./Docs/researches/src_app_create_research.md:3048:+- feed character state into prompt construction for root-scene generation, continuation, and branching
./Docs/researches/src_app_create_research.md:3060:+Why this blocks ChronosMirror:
./Docs/researches/src_app_create_research.md:3064:+- creation-time intent is ambiguous because prompt direction is not stored as structured timeline metadata
./Docs/researches/src_app_create_research.md:3069:+- no field for baseline historical timeline
./Docs/researches/src_app_create_research.md:3083:+- add timeline validation before saving the root story state and before later continuation/branch generation
./Docs/researches/src_app_create_research.md:3084:+- store timeline metadata separately from prose so branches can be compared against historical baseline and against their own internal chronology
./Docs/researches/src_app_create_research.md:3086:+### 3. MCP Wikipedia gap
./Docs/researches/src_app_create_research.md:3092:+- no file in the creation path imports or calls an MCP client
./Docs/researches/src_app_create_research.md:3095:+Why this blocks ChronosMirror:
./Docs/researches/src_app_create_research.md:3097:+- ChronosMirror historical storytelling needs a factual anchor for the initial scenario, not only hand-authored template blurbs
./Docs/researches/src_app_create_research.md:3104:+- no prefill of canonical event facts from Wikipedia or another source
./Docs/researches/src_app_create_research.md:3110:+- add an MCP retrieval step for template-based creation
./Docs/researches/src_app_create_research.md:3111:+  - query Wikipedia for the selected event
./Docs/researches/src_app_create_research.md:3115:+- surface source provenance in both create and story views so ChronosMirror can expose fact grounding instead of opaque prompt text
./Docs/researches/src_app_create_research.md:3124:+- downstream generation routes use simple instructions like `请续写下一段（150-300字）`, which is coarse output sizing rather than real pacing control
./Docs/researches/src_app_create_research.md:3126:+Why this blocks ChronosMirror:
./Docs/researches/src_app_create_research.md:3128:+- pacing control should begin at story setup, because the opening premise determines branch width, narrative density, and escalation rhythm
./Docs/researches/src_app_create_research.md:3136:+- no root-scene generation step that uses structured pacing parameters
./Docs/researches/src_app_create_research.md:3141:+- add pacing controls to creation
./Docs/researches/src_app_create_research.md:3150:+  - character state
./Docs/researches/src_app_create_research.md:3152:+  - pacing plan
./Docs/researches/src_app_create_research.md:3153:+- propagate pacing metadata into continuation and branching APIs so later generation remains consistent with the initial setup
./Docs/researches/src_app_create_research.md:3165:+- the runtime model has no structured support for characters, timelines, citations, or pacing
./Docs/researches/src_app_create_research.md:3167:+For ChronosMirror, the create flow should be treated as a schema and orchestration upgrade first, and only secondarily as a page-level UI enhancement. If creation stays text-only and lossy, the downstream continuation stack will keep inheriting those limits.
./Docs/researches/src_app_create_research.md:3314:+- it does not import any prompt builder, timeline validator, MCP client, or retrieval layer
./Docs/researches/src_app_create_research.md:3394:+- story-world timeline or event dates
./Docs/researches/src_app_create_research.md:3395:+- character sheets or relationship graphs
./Docs/researches/src_app_create_research.md:3397:+- pacing plans, beat budgets, or director controls
./Docs/researches/src_app_create_research.md:3399:+This matters because the create page cannot persist richer ChronosMirror metadata even if the UI is extended. The current store shape would discard it unless the backend model changes first.
./Docs/researches/src_app_create_research.md:3403:+The shared type layer is slightly broader than the actual creation flow, but it is still far short of ChronosMirror needs.
./Docs/researches/src_app_create_research.md:3407:+- `ContinueStoryRequest` includes `characters?: string[]`, which suggests an intent to pass character context into generation later
./Docs/researches/src_app_create_research.md:3408:+- `Story`, `StorySegment`, and `StoryBranch` still lack structured character state, historical facts, citations, or pacing metadata
./Docs/researches/src_app_create_research.md:3465:+## ChronosMirror upgrade gaps
./Docs/researches/src_app_create_research.md:3467:+ChronosMirror, as described in the request, needs richer narrative state and stronger orchestration than the current create flow provides. The gaps start at story creation, not only during continuation.
./Docs/researches/src_app_create_research.md:3475:+- `src/lib/simple-db.ts` has no place to persist character cards or dynamic relationships.
./Docs/researches/src_app_create_research.md:3476:+- `src/types/story.ts` hints at character-aware continuation with `ContinueStoryRequest.characters?: string[]`, but the create page does not seed character data and the runtime routes do not build structured persona state from creation.
./Docs/researches/src_app_create_research.md:3478:+Why this blocks ChronosMirror:
./Docs/researches/src_app_create_research.md:3480:+- character consistency cannot be enforced later if creation never captures who the characters are
./Docs/researches/src_app_create_research.md:3482:+- the current system stores only text blobs, so later generation has to infer character identity and relationships from narrative text each time
./Docs/researches/src_app_create_research.md:3486:+- no structured character input in the custom form
./Docs/researches/src_app_create_research.md:3487:+- no template-attached character roster for the historical seeds
./Docs/researches/src_app_create_research.md:3488:+- no persistence field for character snapshots
./Docs/researches/src_app_create_research.md:3493:+- add create-time structured character inputs
./Docs/researches/src_app_create_research.md:3501:+- attach template-specific default character cards to each historical scenario
./Docs/researches/src_app_create_research.md:3502:+- feed character state into prompt construction for root-scene generation, continuation, and branching
./Docs/researches/src_app_create_research.md:3514:+Why this blocks ChronosMirror:
./Docs/researches/src_app_create_research.md:3518:+- creation-time intent is ambiguous because prompt direction is not stored as structured timeline metadata
./Docs/researches/src_app_create_research.md:3523:+- no field for baseline historical timeline
./Docs/researches/src_app_create_research.md:3537:+- add timeline validation before saving the root story state and before later continuation/branch generation
./Docs/researches/src_app_create_research.md:3538:+- store timeline metadata separately from prose so branches can be compared against historical baseline and against their own internal chronology
./Docs/researches/src_app_create_research.md:3540:+### 3. MCP Wikipedia gap
./Docs/researches/src_app_create_research.md:3546:+- no file in the creation path imports or calls an MCP client
./Docs/researches/src_app_create_research.md:3549:+Why this blocks ChronosMirror:
./Docs/researches/src_app_create_research.md:3551:+- ChronosMirror historical storytelling needs a factual anchor for the initial scenario, not only hand-authored template blurbs
./Docs/researches/src_app_create_research.md:3558:+- no prefill of canonical event facts from Wikipedia or another source
./Docs/researches/src_app_create_research.md:3564:+- add an MCP retrieval step for template-based creation
./Docs/researches/src_app_create_research.md:3565:+  - query Wikipedia for the selected event
./Docs/researches/src_app_create_research.md:3569:+- surface source provenance in both create and story views so ChronosMirror can expose fact grounding instead of opaque prompt text
./Docs/researches/src_app_create_research.md:3578:+- downstream generation routes use simple instructions like `请续写下一段（150-300字）`, which is coarse output sizing rather than real pacing control
./Docs/researches/src_app_create_research.md:3580:+Why this blocks ChronosMirror:
./Docs/researches/src_app_create_research.md:3582:+- pacing control should begin at story setup, because the opening premise determines branch width, narrative density, and escalation rhythm
./Docs/researches/src_app_create_research.md:3590:+- no root-scene generation step that uses structured pacing parameters
./Docs/researches/src_app_create_research.md:3595:+- add pacing controls to creation
./Docs/researches/src_app_create_research.md:3604:+  - character state
./Docs/researches/src_app_create_research.md:3606:+  - pacing plan
./Docs/researches/src_app_create_research.md:3607:+- propagate pacing metadata into continuation and branching APIs so later generation remains consistent with the initial setup
./Docs/researches/src_app_create_research.md:3619:+- the runtime model has no structured support for characters, timelines, citations, or pacing
./Docs/researches/src_app_create_research.md:3621:+For ChronosMirror, the create flow should be treated as a schema and orchestration upgrade first, and only secondarily as a page-level UI enhancement. If creation stays text-only and lossy, the downstream continuation stack will keep inheriting those limits.

codex
I found only two source files under `src/components/`. I’m reading those plus the directly referenced types and consuming page so the report can describe the real component boundaries instead of just listing imports.
exec
/usr/bin/zsh -lc "sed -n '1,260p' src/components/story/StoryImageDisplay.tsx" in /home/pjlab/fbh/fbh_project/gushi
exec
/usr/bin/zsh -lc "sed -n '1,220p' src/components/StreamingText.tsx" in /home/pjlab/fbh/fbh_project/gushi
 succeeded in 0ms:
'use client';

import { useState, useEffect, useRef } from 'react';

interface StreamingTextProps {
  text: string;
  speed?: number; // 打字速度（毫秒）
  className?: string;
  onComplete?: () => void;
  cursor?: boolean;
  showComplete?: boolean;
}

// 单个文本段落的流式展示组件
function StreamingText({ 
  text, 
  speed = 50, 
  className = "",
  onComplete,
  cursor = true,
  showComplete = false
}: StreamingTextProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // 重置状态
    setDisplayedText('');
    setIsComplete(false);
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    if (!text) return;

    // 模拟打字效果
    let currentIndex = 0;
    intervalRef.current = setInterval(() => {
      if (currentIndex < text.length) {
        setDisplayedText(text.substring(0, currentIndex + 1));
        currentIndex++;
      } else {
        // 完成打字
        setIsComplete(true);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        onComplete?.();
      }
    }, speed);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [text, speed, onComplete]);

  return (
    <div className={className}>
      {displayedText}
      {cursor && !isComplete && (
        <span className="inline-block w-2 h-6 bg-gray-800 animate-pulse ml-1 align-middle"></span>
      )}
      {showComplete && isComplete && (
        <span className="inline-block ml-2 text-green-600">✓ 完成</span>
      )}
    </div>
  );
}

// 多个文本段落的流式展示组件
interface MultiStreamingTextProps {
  texts: string[];
  speed?: number;
  className?: string;
  onComplete?: () => void;
  delayBetween?: number; // �落之间的延迟（毫秒）
  showProgress?: boolean;
}

function MultiStreamingText({ 
  texts, 
  speed = 50, 
  className = "",
  onComplete,
  delayBetween = 1000,
  showProgress = false
}: MultiStreamingTextProps) {
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [allComplete, setAllComplete] = useState(false);

  const handleTextComplete = () => {
    if (currentTextIndex < texts.length - 1) {
      // 还有下一个段落，延迟后开始
      setTimeout(() => {
        setCurrentTextIndex(prev => prev + 1);
      }, delayBetween);
    } else {
      // 所有段落都完成了
      setAllComplete(true);
      onComplete?.();
    }
  };

  const currentText = texts[currentTextIndex];

  return (
    <div className={className}>
      {/* 进度指示器 */}
      {showProgress && (
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>进度: {currentTextIndex + 1} / {texts.length}</span>
            <span>{Math.round(((currentTextIndex + 1) / texts.length) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentTextIndex + 1) / texts.length) * 100}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* 当前段落 */}
      <div className="space-y-4">
        <StreamingText
          text={currentText}
          speed={speed}
          onComplete={handleTextComplete}
          showComplete={texts.length === 1} // 只有单个段落时显示完成状态
        />
      </div>

      {/* 段落导航 */}
      {texts.length > 1 && (
        <div className="mt-6 flex justify-between items-center">
          <button
            onClick={() => setCurrentTextIndex(prev => Math.max(0, prev - 1))}
            disabled={currentTextIndex === 0}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            上一段
          </button>
          
          <span className="text-sm text-gray-500">
            {currentTextIndex + 1} / {texts.length}
          </span>
          
          <button
            onClick={() => setCurrentTextIndex(prev => Math.min(texts.length - 1, prev + 1))}
            disabled={currentTextIndex === texts.length - 1}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            下一段
          </button>
        </div>
      )}
    </div>
  );
}

// 服务器发送事件 (SSE) 流式文本组件
interface SSEStreamingTextProps {
  url: string;
  className?: string;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

function SSEStreamingText({ url, className = "", onComplete, onError }: SSEStreamingTextProps) {
  const [content, setContent] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // 创建 SSE 连接
    eventSourceRef.current = new EventSource(url);

    eventSourceRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'progress') {
          // 更新进度
          setContent(data.content || '');
        } else if (data.type === 'complete') {
          // 完成
          setContent(data.content || '');
          setIsComplete(true);
          onComplete?.();
        } else if (data.type === 'final') {
          // 最终结果
          setContent(data.content || '');
          setIsComplete(true);
          onComplete?.();
        } else if (data.type === 'error') {
          // 错误
          setError(data.error || '未知错误');
          onError?.(new Error(data.error));
          setIsComplete(true);
        }
      } catch (err) {
        console.error('解析 SSE 消息失败:', err);
        setError('解析数据失败');
        onError?.(new Error('解析数据失败'));
        setIsComplete(true);
      }
    };

    eventSourceRef.current.onerror = (event) => {
      console.error('SSE 连接错误:', event);
      setError('连接失败');
      onError?.(new Error('连接失败'));
      setIsComplete(true);
    };

 succeeded in 0ms:
'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';

interface ImageMetadata {
  id: string;
  url: string;
  description?: string;
  type: 'illustration' | 'scene' | 'character' | 'object';
  width: number;
  height: number;
  alt?: string;
}

interface StoryImageDisplayProps {
  segmentId: string;
  className?: string;
  maxWidth?: number;
  maxHeight?: number;
  showDescription?: boolean;
}

export default function StoryImageDisplay({
  segmentId,
  className = '',
  maxWidth = 800,
  maxHeight = 600,
  showDescription = true
}: StoryImageDisplayProps) {
  const [images, setImages] = useState<ImageMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 获取段落的图片数据
  useEffect(() => {
    const fetchImages = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/images?segmentId=${segmentId}`);
        
        if (!response.ok) {
          throw new Error('获取图片失败');
        }
        
        const data = await response.json();
        
        if (data.success) {
          setImages(data.images);
        } else {
          setError(data.error || '获取图片失败');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '获取图片失败');
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, [segmentId]);

  // 图片类型图标映射
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'illustration':
        return '🎨';
      case 'scene':
        return '🏞️';
      case 'character':
        return '👤';
      case 'object':
        return '🎭';
      default:
        return '🖼️';
    }
  };

  // 图片类型中文映射
  const getTypeText = (type: string) => {
    switch (type) {
      case 'illustration':
        return '插图';
      case 'scene':
        return '场景';
      case 'character':
        return '人物';
      case 'object':
        return '物件';
      default:
        return '图片';
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`}>
        <div className="text-gray-500">加载图片中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="text-red-600">图片加载失败: {error}</div>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className={`bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center ${className}`}>
        <div className="text-gray-400 mb-2">🖼️</div>
        <div className="text-gray-500">暂无相关图片</div>
        <div className="text-sm text-gray-400 mt-1">图片将在故事续写过程中生成</div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {images.map((image) => (
        <div key={image.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* 图片容器 */}
          <div 
            className="relative mx-auto"
            style={{ 
              maxWidth: Math.min(maxWidth, image.width), 
              maxHeight: Math.min(maxHeight, image.height) 
            }}
          >
            <Image
              src={image.url}
              alt={image.alt || image.description || `${getTypeText(image.type)}图片`}
              fill
              className="object-cover"
              onError={(e) => {
                // 图片加载失败时显示占位符
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.parentElement!.innerHTML = `
                  <div class="flex items-center justify-center w-full h-full bg-gray-100">
                    <div class="text-center">
                      <div class="text-4xl mb-2">🖼️</div>
                      <div class="text-gray-500 text-sm">图片加载失败</div>
                    </div>
                  </div>
                `;
              }}
            />
            
            {/* 图片类型标签 */}
            <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
              <span>{getTypeIcon(image.type)}</span>
              <span>{getTypeText(image.type)}</span>
            </div>
          </div>
          
          {/* 图片描述 */}
          {showDescription && (image.description || image.alt) && (
            <div className="p-3 bg-gray-50">
              <p className="text-sm text-gray-700">
                {image.description || image.alt}
              </p>
              <div className="text-xs text-gray-500 mt-1">
                尺寸: {image.width} × {image.height}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
exec
/usr/bin/zsh -lc "sed -n '1,240p' src/types/story.ts" in /home/pjlab/fbh/fbh_project/gushi
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
exec
/usr/bin/zsh -lc 'rg -n "StreamingText|StoryImageDisplay" src' in /home/pjlab/fbh/fbh_project/gushi
 succeeded in 0ms:
src/components/story/StoryImageDisplay.tsx:16:interface StoryImageDisplayProps {
src/components/story/StoryImageDisplay.tsx:24:export default function StoryImageDisplay({
src/components/story/StoryImageDisplay.tsx:30:}: StoryImageDisplayProps) {
src/components/StreamingText.tsx:5:interface StreamingTextProps {
src/components/StreamingText.tsx:15:function StreamingText({ 
src/components/StreamingText.tsx:22:}: StreamingTextProps) {
src/components/StreamingText.tsx:75:interface MultiStreamingTextProps {
src/components/StreamingText.tsx:84:function MultiStreamingText({ 
src/components/StreamingText.tsx:91:}: MultiStreamingTextProps) {
src/components/StreamingText.tsx:130:        <StreamingText
src/components/StreamingText.tsx:167:interface SSEStreamingTextProps {
src/components/StreamingText.tsx:174:function SSEStreamingText({ url, className = "", onComplete, onError }: SSEStreamingTextProps) {
src/components/StreamingText.tsx:250:export { StreamingText, MultiStreamingText, SSEStreamingText };

codex
`StreamingText.tsx` contains three related components, and `StoryImageDisplay.tsx` is the only default export in the folder. I’m tracing their callers now because both files expose capabilities that may not actually be wired into the app, which matters for the architecture and upgrade-gap sections.
exec
/usr/bin/zsh -lc "sed -n '220,340p' src/components/StreamingText.tsx" in /home/pjlab/fbh/fbh_project/gushi
 succeeded in 0ms:
    };

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [url, onComplete, onError]);

  if (error) {
    return (
      <div className={`${className} p-4 bg-red-50 border border-red-200 rounded-lg text-red-600`}>
        {error}
      </div>
    );
  }

  return (
    <div className={className}>
      {content}
      {!isComplete && (
        <span className="inline-block w-2 h-6 bg-blue-600 animate-pulse ml-1 align-middle"></span>
      )}
      {isComplete && (
        <span className="inline-block ml-2 text-green-600">✓ 完成</span>
      )}
    </div>
  );
}

export { StreamingText, MultiStreamingText, SSEStreamingText };
exec
/usr/bin/zsh -lc "rg -n \"api/images|EventSource\\(|type === 'progress'|SSEStreamingText|MultiStreamingText|StreamingText\" src/app src/lib src/components" in /home/pjlab/fbh/fbh_project/gushi
 succeeded in 0ms:
src/components/story/StoryImageDisplay.tsx:40:        const response = await fetch(`/api/images?segmentId=${segmentId}`);
src/components/StreamingText.tsx:5:interface StreamingTextProps {
src/components/StreamingText.tsx:15:function StreamingText({ 
src/components/StreamingText.tsx:22:}: StreamingTextProps) {
src/components/StreamingText.tsx:75:interface MultiStreamingTextProps {
src/components/StreamingText.tsx:84:function MultiStreamingText({ 
src/components/StreamingText.tsx:91:}: MultiStreamingTextProps) {
src/components/StreamingText.tsx:130:        <StreamingText
src/components/StreamingText.tsx:167:interface SSEStreamingTextProps {
src/components/StreamingText.tsx:174:function SSEStreamingText({ url, className = "", onComplete, onError }: SSEStreamingTextProps) {
src/components/StreamingText.tsx:182:    eventSourceRef.current = new EventSource(url);
src/components/StreamingText.tsx:188:        if (data.type === 'progress') {
src/components/StreamingText.tsx:250:export { StreamingText, MultiStreamingText, SSEStreamingText };

exec
/usr/bin/zsh -lc "sed -n '1,260p' Docs/researches/src_app_story_research.md" in /home/pjlab/fbh/fbh_project/gushi
 succeeded in 0ms:
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

exec
/usr/bin/zsh -lc 'rg --files src/app/api | sort' in /home/pjlab/fbh/fbh_project/gushi
 succeeded in 0ms:
src/app/api/images/generate/route.ts
src/app/api/images/route.ts
src/app/api/stories/[id]/branch/route.ts
src/app/api/stories/[id]/continue/route.ts
src/app/api/stories/[id]/route.ts
src/app/api/stories/[id]/segments/route.ts
src/app/api/stories/[id]/stream-continue/route.ts
src/app/api/stories/[id]/tree/route.ts
src/app/api/stories/route.ts

codex
I’ve confirmed both component files are effectively leaf modules right now. Next pass is checking the image API and the story page so I can distinguish “implemented” from “actually integrated” in the write-up.
exec
/usr/bin/zsh -lc "sed -n '1,240p' src/app/api/images/route.ts" in /home/pjlab/fbh/fbh_project/gushi
 succeeded in 0ms:
import { NextRequest, NextResponse } from 'next/server';

// 获取指定段落的图片
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const segmentId = searchParams.get('segmentId');

    if (!segmentId) {
      return NextResponse.json(
        { error: '缺少 segmentId 参数' },
        { status: 400 }
      );
    }

    // 这里预留了从数据库获取图片的逻辑
    // 实际实现时，会从 StorySegment 的 imageUrls 和 imageMetadata 字段中获取图片数据
    
    // 模拟图片数据
    const images = [
      {
        id: `img_${Date.now()}_1`,
        segmentId,
        url: '/api/placeholder/scene-1.jpg',
        description: '历史场景插图',
        type: 'scene' as const,
        width: 800,
        height: 600,
        alt: '历史场景描述',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    return NextResponse.json({
      success: true,
      segmentId,
      images,
      totalCount: images.length
    });
  } catch (error) {
    console.error('获取图片失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '获取图片失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}
exec
/usr/bin/zsh -lc "sed -n '1,260p' src/app/story/[id]/page.tsx" in /home/pjlab/fbh/fbh_project/gushi
 exited 1 in 0ms:
zsh:1: no matches found: src/app/story/[id]/page.tsx

exec
/usr/bin/zsh -lc "sed -n '260,620p' src/app/story/[id]/page.tsx" in /home/pjlab/fbh/fbh_project/gushi
 exited 1 in 0ms:
zsh:1: no matches found: src/app/story/[id]/page.tsx

exec
/usr/bin/zsh -lc "sed -n '1,260p' src/app/api/stories/[id]/stream-continue/route.ts" in /home/pjlab/fbh/fbh_project/gushi
 exited 1 in 0ms:
zsh:1: no matches found: src/app/api/stories/[id]/stream-continue/route.ts

codex
The bracketed route paths need shell quoting, so I’m rerunning those reads correctly. After that I have enough to write the report with explicit notes on unused components, stubbed APIs, and where the ChronosMirror work actually has to land.
exec
/usr/bin/zsh -lc "sed -n '1,260p' 'src/app/story/[id]/page.tsx'" in /home/pjlab/fbh/fbh_project/gushi
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

exec
/usr/bin/zsh -lc "sed -n '260,620p' 'src/app/story/[id]/page.tsx'" in /home/pjlab/fbh/fbh_project/gushi
exec
/usr/bin/zsh -lc "sed -n '1,280p' 'src/app/api/stories/[id]/continue/route.ts'" in /home/pjlab/fbh/fbh_project/gushi
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
              <label className="block text-sm font-medium text-[var(--ink)] mb-2">✦ 自定义方向</label>
              <textarea
                value={customDirection}
                onChange={(e) => {
                  setCustomDirection(e.target.value);
                  if (e.target.value.trim()) setUserDirection('');
                }}
                placeholder="例：如果荆轲选择不刺秦王，而是劝说秦王..."
                rows={2}
                className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--paper)] text-[var(--ink)] placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)] focus:border-transparent text-sm resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowBranchDialog(false)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-[var(--border)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-gray-50 transition-all text-sm"
              >
                取消
              </button>
              <button
                onClick={confirmBranch}
                disabled={!customDirection.trim() && !userDirection}
                className={`flex-1 px-4 py-2.5 rounded-lg text-white text-sm font-medium transition-all ${
                  customDirection.trim() || userDirection
                    ? 'bg-gradient-to-r from-[var(--accent)] to-red-700 hover:shadow-lg'
                    : 'bg-gray-200 text-[var(--muted)] cursor-not-allowed'
                }`}
              >
                ⚔ 生成分叉
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: 'var(--paper)' }}>
      {/* Top nav */}
      <nav className="sticky top-0 z-10 backdrop-blur-sm border-b border-[var(--border)]" style={{ background: 'rgba(250,246,240,0.9)' }}>
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/" className="text-sm text-[var(--muted)] hover:text-[var(--ink)] transition-colors flex items-center gap-1">
            ← 故事列表
          </Link>
          <div className="flex items-center gap-3">
            <div className="text-sm">
              <div className="flex items-center gap-1 text-[var(--muted)]">
                <span>当前路径:</span>
                <span className="text-[var(--gold)] font-medium">
                  {getCurrentBranchPath().join(' → ')}
                </span>
              </div>
            </div>
            <h1 className="text-sm font-bold text-[var(--ink)] tracking-wider">{story.title}</h1>
          </div>
        </div>
      </nav>

      {/* Branch switcher */}
      {branches.length > 0 && (
        <div className="sticky top-16 z-10 backdrop-blur-sm border-b border-[var(--border)]" style={{ background: 'rgba(250,246,240,0.95)' }}>
          <div className="max-w-3xl mx-auto px-6 py-3">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => switchBranch('main')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  currentBranchId === 'main'
                    ? 'bg-[var(--gold)] text-[var(--paper)]'
                    : 'bg-[var(--border)] text-[var(--muted)] hover:bg-[var(--gold)]/20'
                }`}
              >
                主线
              </button>
              {branches.map((branch) => (
                <button
                  key={branch.id}
                  onClick={() => switchBranch(branch.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    currentBranchId === branch.id
                      ? 'bg-[var(--accent)] text-white'
                      : 'bg-[var(--border)] text-[var(--muted)] hover:bg-[var(--accent)]/20'
                  }`}
                  title={branch.userDirection}
                >
                  <span className="truncate max-w-32">{branch.userDirection || branch.title}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Story title */}
      <div className="max-w-3xl mx-auto px-6 pt-12 pb-8 text-center">
        <div className="divider-ornament mb-4">
          <span>✦</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-[var(--ink)] tracking-widest mb-3">
          {story.title}
        </h1>
        {story.description && (
          <p className="text-[var(--muted)] text-sm">{story.description}</p>
        )}
      </div>

      {/* Story content */}
      <div className="max-w-3xl mx-auto px-6 pb-20">
        <div className="relative">
          {/* Left decoration line */}
          <div className="absolute left-8 top-0 bottom-0 w-px bg-gradient-to-b from-[var(--gold)] via-[var(--border)] to-transparent" />

          <div className="space-y-8">
            {segments.map((seg, idx) => {
              const branchCount = getBranchCountForSegment(seg.id);
              return (
                <div key={seg.id} className="relative pl-16 animate-fade-in-up" style={{ animationDelay: `${idx * 80}ms` }}>
                  {/* Timeline node */}
                  <div className={`absolute left-6 top-2 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    seg.isBranchPoint
                      ? 'border-[var(--accent)] bg-[var(--accent)] branch-pulse'
                      : 'border-[var(--gold)] bg-[var(--paper)]'
                  }`}>
                    {seg.isBranchPoint && <span className="text-white text-xs">⚔</span>}
                  </div>

                  {/* Segment card */}
                  <div className="rounded-lg border border-[var(--border)] bg-white p-6 shadow-sm">
                    {/* Branch label */}
                    {currentBranchId !== 'main' && (
                      <div className="mb-3 flex items-center gap-2">
                        <span className="text-xs px-2 py-1 bg-[var(--accent)]/10 text-[var(--accent)] rounded-full border border-[var(--accent)]/30">
                          分支
                        </span>
                        {branches.find(b => b.id === currentBranchId)?.userDirection && (
                          <span className="text-xs text-[var(--muted)]">
                            {branches.find(b => b.id === currentBranchId)?.userDirection}
                          </span>
                        )}
                      </div>
                    )}
                    
                    {seg.title && (
                      <h3 className="text-lg font-bold text-[var(--ink)] mb-3 flex items-center gap-2">
                        <span className="text-[var(--gold)]">·</span>
                        {seg.title}
                      </h3>
                    )}
                    <p className="prose-chinese text-[var(--ink)]">
                      {seg.content}
                    </p>

                    {/* Branch point indicator */}
                    {seg.isBranchPoint && branchCount > 0 && (
                      <div className="mt-4 pt-3 border-t border-dashed border-[var(--border)]">
                        <p className="text-xs text-[var(--accent)] font-medium flex items-center gap-1">
                          ⚔ 此处有 {branchCount} 条分叉路线
                        </p>
                      </div>
                    )}

                    {/* Fork button on every segment */}
                    <div className="mt-4 pt-3 border-t border-[var(--border)]/50 flex justify-end">
                      <button
                        onClick={() => handleBranch(seg.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-[var(--muted)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/5 rounded-lg transition-all group"
                        title="从此处分叉"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                        </svg>
                        <span className="hidden group-hover:inline">从此处分叉</span>
                        <span className="group-hover:hidden">分叉</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Streaming new content */}
            {newContent && (
              <div className="relative pl-16 animate-fade-in-up">
                <div className="absolute left-6 top-2 w-5 h-5 rounded-full border-2 border-blue-400 bg-blue-50 flex items-center justify-center">
                  <span className="text-blue-500 text-xs">✦</span>
                </div>
                <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-6 shadow-sm">
                  <p className="prose-chinese text-[var(--ink)]">
                    {newContent}
                    <span className="inline-block w-0.5 h-5 bg-[var(--ink)] animate-pulse ml-0.5 align-text-bottom" />
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom action bar */}
        {segments.length > 0 && (
          <div className="mt-12 text-center">
            <div className="divider-ornament mb-6">
              <span>✦</span>
            </div>
            <button
              onClick={handleContinue}
              disabled={continuing}
              className={`inline-flex items-center gap-2 px-8 py-3 rounded-full font-medium transition-all ${
                continuing
                  ? 'bg-gray-200 text-[var(--muted)] cursor-wait'
                  : 'bg-gradient-to-r from-amber-700 to-red-800 text-white hover:shadow-lg hover:shadow-amber-900/20'
              }`}
            >
              {continuing ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-[var(--muted)] border-t-transparent rounded-full animate-spin" />
                  故事书写中...
                </>
              ) : (
                <>✦ 续写故事</>
              )}
            </button>
          </div>
        )}
      </div>

      {showBranchDialog && <BranchDialog />}
    </div>
  );
}

exec
/usr/bin/zsh -lc "sed -n '1,280p' 'src/app/api/stories/[id]/stream-continue/route.ts'" in /home/pjlab/fbh/fbh_project/gushi
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

codex
The picture is consistent so far: the components folder defines reusable UI primitives, but the current story page reimplements streaming inline and never mounts the image display at all. I’m checking the image-generation route once, then I’ll draft the report and write the markdown file.
exec
/usr/bin/zsh -lc "sed -n '1,320p' src/app/api/images/generate/route.ts" in /home/pjlab/fbh/fbh_project/gushi
 succeeded in 0ms:
import { NextRequest, NextResponse } from 'next/server';

// AI 图片生成 API 接口预留 (P6-2)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { segmentId, prompt, style, size = '512x512', quality = 'standard' } = body;

    // 验证请求参数
    if (!segmentId || !prompt) {
      return NextResponse.json(
        { error: '缺少必要的参数: segmentId 和 prompt' },
        { status: 400 }
      );
    }

    // 这里预留了 AI 图片生成 API 调用
    // 实际调用时会根据环境变量中的 AI API 配置来生成图片
    const imageGenerationConfig = {
      provider: process.env.AI_IMAGE_PROVIDER || 'openai', // 支持 OpenAI-compatible APIs
      apiKey: process.env.AI_IMAGE_API_KEY,
      model: process.env.AI_IMAGE_MODEL || 'dall-e-3',
      baseUrl: process.env.AI_IMAGE_BASE_URL || 'https://api.openai.com/v1'
    };

    // 模拟图片生成过程
    const generatedImage = {
      success: true,
      imageId: `img_${Date.now()}`,
      imageUrl: '/api/placeholder/illustration.jpg', // 实际使用时会是 AI 生成的图片 URL
      metadata: {
        prompt,
        style,
        size,
        quality,
        segmentId,
        generatedAt: new Date().toISOString()
      }
    };

    return NextResponse.json(generatedImage);
  } catch (error) {
    console.error('图片生成失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '图片生成失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}

// 支持的图片尺寸选项
export async function OPTIONS() {
  return NextResponse.json({
    allowedMethods: ['POST'],
    supportedSizes: ['256x256', '512x512', '1024x1024', '1024x1792', '1792x1024'],
    supportedQualities: ['standard', 'hd'],
    supportedStyles: ['realistic', 'artistic', 'cartoon', 'historical', 'fantasy']
  });
}
exec
/usr/bin/zsh -lc 'ls -la Docs/researches' in /home/pjlab/fbh/fbh_project/gushi
 succeeded in 0ms:
total 424
drwxrwxr-x 2 pjlab pjlab   4096 Apr 14 15:48 .
drwxrwxr-x 3 pjlab pjlab   4096 Apr 12 17:36 ..
-rw------- 1 pjlab pjlab   1420 Apr 14 15:42 blueprint_checklist.md
-rw-rw-r-- 1 pjlab pjlab   3557 Apr 13 22:53 fix_blueprint.md
-rw-rw-r-- 1 pjlab pjlab   2846 Apr 12 18:39 reorganization_blueprint.md
-rw-rw-r-- 1 pjlab pjlab 114674 Apr 14 15:30 src_app_api_research.md
-rw-rw-r-- 1 pjlab pjlab 162770 Apr 14 15:42 src_app_create_research.md
-rw-rw-r-- 1 pjlab pjlab  16841 Apr 14 15:35 src_app_story_research.md
-rw-rw-r-- 1 pjlab pjlab 106846 Apr 14 15:49 src_components_research.md.tmp
-rw-rw-r-- 1 pjlab pjlab   1301 Apr 14 15:37 todos_20260414.md

exec
/usr/bin/zsh -lc 'git status --short' in /home/pjlab/fbh/fbh_project/gushi
 succeeded in 0ms:
?? .ops/cleanup_research_cron.sh
?? .ops/generate_daily_research_todo.sh
?? .ops/generate_research_blueprint_checklist.sh
?? .ops/research_guard.sh
?? Docs/researches/blueprint_checklist.md
?? Docs/researches/src_app_api_research.md
?? Docs/researches/src_app_create_research.md
?? Docs/researches/src_app_story_research.md
?? Docs/researches/src_components_research.md.tmp
?? Docs/researches/todos_20260414.md

codex
I have the component code, their actual integration points, and the relevant API context. Plan from here:

1. Summarize each `src/components/` file with purpose, exports, internal types, and real dependencies.
2. Describe the effective component architecture, including the fact that the current story page bypasses these shared components.
3. Map the ChronosMirror gaps specifically onto this layer: character modeling, timeline validation, MCP Wikipedia grounding, and pacing/director controls.
4. Write the result to `Docs/researches/src_components_research.md`, keeping it aligned with the existing research docs but focused on `src/components/`.
  ✓ Inspect src/components files and trace their consumers/dependencies
  → Synthesize per-file analysis, architecture overview, and ChronosMirror upgrade gaps
  • Write Docs/researches/src_components_research.md and verify contents
exec
/usr/bin/zsh -lc "sed -n '1,120p' Docs/researches/src_components_research.md.tmp" in /home/pjlab/fbh/fbh_project/gushi
 succeeded in 0ms:
user
Analyze all source files in src/components/. For each file: purpose, exports, dependencies. Then: architecture overview and ChronosMirror upgrade gaps (character modeling, timeline validation, MCP Wikipedia, pacing control). Write results to /home/pjlab/fbh/fbh_project/gushi/Docs/researches/src_components_research.md
codex
I’m reviewing `src/components/` and the surrounding repo context first so the report is grounded in the actual implementation. Next I’ll inventory the files, inspect key dependencies, and then write the research note into `Docs/researches/src_components_research.md`.
exec
/usr/bin/zsh -lc pwd in /home/pjlab/fbh/fbh_project/gushi
 succeeded in 0ms:
/home/pjlab/fbh/fbh_project/gushi

exec
/usr/bin/zsh -lc 'rg --files src/components' in /home/pjlab/fbh/fbh_project/gushi
 succeeded in 0ms:
src/components/story/StoryImageDisplay.tsx
src/components/StreamingText.tsx

exec
/usr/bin/zsh -lc 'rg -n "ChronosMirror|Wikipedia|MCP|timeline|pacing|character" -S .' in /home/pjlab/fbh/fbh_project/gushi
 succeeded in 0ms:
./README.md:163:    type: 'illustration' | 'scene' | 'character' | 'object';
./src/types/story.ts:42:  characters?: string[];
./src/components/story/StoryImageDisplay.tsx:10:  type: 'illustration' | 'scene' | 'character' | 'object';
./src/components/story/StoryImageDisplay.tsx:70:      case 'character':
./src/components/story/StoryImageDisplay.tsx:86:      case 'character':
./Docs/researches/src_components_research.md.tmp:13:Analyze all source files in src/components/. For each file: purpose, exports, dependencies. Then: architecture overview and ChronosMirror upgrade gaps (character modeling, timeline validation, MCP Wikipedia, pacing control). Write results to /home/pjlab/fbh/fbh_project/gushi/Docs/researches/src_components_research.md
./Docs/researches/src_app_api_research.md:2:Analyze all source files in src/app/api/. For each file: purpose, exports, dependencies. Then: architecture overview and ChronosMirror upgrade gaps (character modeling, timeline validation, MCP Wikipedia, pacing control). Write results to /home/pjlab/fbh/fbh_project/gushi/Docs/researches/src_app_api_research.md
./Docs/researches/src_app_api_research.md:19:/usr/bin/zsh -lc 'pwd && ls -la && rg -n "ChronosMirror|chronos mirror|timeline validation|MCP Wikipedia|pacing control|character modeling" -S .' in /home/pjlab/fbh/fbh_project/gushi
./Docs/researches/src_app_api_research.md:57:./Docs/researches/src_app_story_research.md.tmp:14:Research ALL files in the directory 'src/app/story' under this project. For each file found: describe its purpose, key functions/classes/types, exports, and dependencies. Then provide an architecture overview of how files in this directory relate to each other. Finally, note specific areas needing improvement for the ChronosMirror upgrade: character persona modeling (multi-dimensional attributes, speech patterns, dynamic relationships), timeline validation (historical accuracy, temporal consistency), MCP Wikipedia integration (fact-checking historical details), and pacing control (step-by-step generation, director mode). Be thorough and specific — cite actual function names, type definitions, and code patterns.
./Docs/researches/src_app_api_research.md:58:./Docs/researches/src_app_story_research.md.tmp:33:  • Synthesize directory architecture and ChronosMirror upgrade gaps
./Docs/researches/src_app_api_research.md:59:./Docs/researches/src_app_story_research.md.tmp:55:- ChronosMirror upgrade gaps for persona modeling, timeline validation, MCP Wikipedia fact-checking, and pacing/director-mode control
./Docs/researches/src_app_api_research.md:60:./Docs/researches/src_app_story_research.md.tmp:78:- ChronosMirror upgrade gaps for persona modeling, timeline validation, MCP Wikipedia fact-checking, and pacing/director-mode control
./Docs/researches/src_app_api_research.md:61:./Docs/researches/src_app_api_research.md.tmp:13:Analyze all source files in src/app/api/. For each file: purpose, exports, dependencies. Then: architecture overview and ChronosMirror upgrade gaps (character modeling, timeline validation, MCP Wikipedia, pacing control). Write results to /home/pjlab/fbh/fbh_project/gushi/Docs/researches/src_app_api_research.md
./Docs/researches/src_app_api_research.md:398:  characters?: string[];
./Docs/researches/src_app_api_research.md:1302:    type: 'illustration' | 'scene' | 'character' | 'object';
./Docs/researches/src_app_api_research.md:1405:Research ALL files in the directory 'src/app/story' under this project. For each file found: describe its purpose, key functions/classes/types, exports, and dependencies. Then provide an architecture overview of how files in this directory relate to each other. Finally, note specific areas needing improvement for the ChronosMirror upgrade: character persona modeling (multi-dimensional attributes, speech patterns, dynamic relationships), timeline validation (historical accuracy, temporal consistency), MCP Wikipedia integration (fact-checking historical details), and pacing control (step-by-step generation, director mode). Be thorough and specific — cite actual function names, type definitions, and code patterns.
./Docs/researches/src_app_api_research.md:1424:  • Synthesize directory architecture and ChronosMirror upgrade gaps
./Docs/researches/src_app_api_research.md:1446:- ChronosMirror upgrade gaps for persona modeling, timeline validation, MCP Wikipedia fact-checking, and pacing/director-mode control
./Docs/researches/src_app_api_research.md:1468:- ChronosMirror upgrade gaps for persona modeling, timeline validation, MCP Wikipedia fact-checking, and pacing/director-mode control
./Docs/researches/src_app_api_research.md:1471:I have the route implementations now. Next pass is tracing who calls them and whether the API layer has any deeper model/service abstractions, because that determines whether the ChronosMirror gaps are isolated or systemic.
./Docs/researches/src_app_api_research.md:2540:  type: 'illustration' | 'scene' | 'character' | 'object';
./Docs/researches/src_app_api_research.md:2600:      case 'character':
./Docs/researches/src_app_api_research.md:2616:      case 'character':
./Docs/researches/src_app_api_research.md:2942:  → Synthesize per-file purpose, exports, dependencies, architecture, and ChronosMirror upgrade gaps
./Docs/researches/src_app_story_research.md:23:- rendering the timeline-style reading UI
./Docs/researches/src_app_story_research.md:47:- The route-local versions are narrower than the shared types. For example, the shared type layer includes timestamps and optional `characters?: string[]` on `ContinueStoryRequest`, but the page ignores that capability entirely.
./Docs/researches/src_app_story_research.md:103:- main story timeline with segment cards, branch markers, and a bottom continuation button
./Docs/researches/src_app_story_research.md:156:- any ChronosMirror expansion that adds character state, validation warnings, citations, or pacing metadata will require changes to both the fetch payloads and this page state model
./Docs/researches/src_app_story_research.md:185:This matters because the `src/app/story/[id]/page.tsx` UI is designed around linear chains per branch, not around a richer event graph or a validated historical timeline.
./Docs/researches/src_app_story_research.md:193:- `ContinueStoryRequest.characters?: string[]`
./Docs/researches/src_app_story_research.md:205:4. The page renders the chain as a timeline-style reader.
./Docs/researches/src_app_story_research.md:236:- Storage is append-only JSON with no transaction model, no versioning, and no normalized character or event tables.
./Docs/researches/src_app_story_research.md:237:- The route is branch-centric, not timeline-centric. A branch is modeled as a simple linked list of segments.
./Docs/researches/src_app_story_research.md:238:- README and blueprint claim richer AI controls, Prisma, and character-aware prompting, but the current runtime path is `simple-db.ts` plus direct provider calls.
./Docs/researches/src_app_story_research.md:240:## ChronosMirror upgrade gaps
./Docs/researches/src_app_story_research.md:242:ChronosMirror, as described in the request, needs stronger historical reasoning, character state, retrieval, and generation control than the current route stack provides.
./Docs/researches/src_app_story_research.md:248:- The story page has no character-oriented state, controls, or rendering.
./Docs/researches/src_app_story_research.md:249:- `src/types/story.ts` exposes `ContinueStoryRequest.characters?: string[]`, but the story page never sends it and the story APIs do not consume it.
./Docs/researches/src_app_story_research.md:255:- There is no persistent character schema for:
./Docs/researches/src_app_story_research.md:264:Why this blocks ChronosMirror:
./Docs/researches/src_app_story_research.md:267:- Branching does not create updated character state snapshots.
./Docs/researches/src_app_story_research.md:268:- The UI cannot surface “why this branch is plausible for this character” because that data does not exist.
./Docs/researches/src_app_story_research.md:275:- Return character-state payloads to the story page so ChronosMirror can expose character consistency indicators and relationship changes per segment.
./Docs/researches/src_app_story_research.md:297:Why this blocks ChronosMirror:
./Docs/researches/src_app_story_research.md:299:- ChronosMirror needs a validated causal and temporal model, not just parent pointers.
./Docs/researches/src_app_story_research.md:313:### 3. MCP Wikipedia gap
./Docs/researches/src_app_story_research.md:317:- No file in the story path or story API path imports or calls any MCP client.
./Docs/researches/src_app_story_research.md:321:Why this blocks ChronosMirror:
./Docs/researches/src_app_story_research.md:331:  - query Wikipedia through MCP
./Docs/researches/src_app_story_research.md:357:Why this blocks ChronosMirror:
./Docs/researches/src_app_story_research.md:359:- ChronosMirror pacing control requires explicit narrative planning signals, not only prose continuation.
./Docs/researches/src_app_story_research.md:365:- Extend request payloads with pacing directives and director controls.
./Docs/researches/src_app_story_research.md:371:- Add segment metadata for pacing so the story page can show branch intensity, beat markers, or scene boundaries instead of only raw paragraphs.
./Docs/researches/src_app_story_research.md:375:ChronosMirror is not just a UI enhancement for `src/app/story/[id]/page.tsx`. The required changes cut across the full stack:
./Docs/researches/src_app_story_research.md:378:  - needs new state, controls, and displays for character, validation, citations, and pacing
./Docs/researches/src_app_story_research.md:388:  - is too narrow for robust character graphs, citation bundles, and timeline validators; the current JSON-list store is likely a transitional persistence layer, not a suitable final ChronosMirror backend
./Docs/researches/src_app_story_research.md:392:`src/app/story/` is currently a single client page that presents a branch-based reading experience over a simple API and JSON-store backend. It is functional for basic reading, continuation, and forking, but it does not yet have the structured narrative state that ChronosMirror needs.
./Docs/researches/src_app_story_research.md:397:- no structured character model
./Docs/researches/src_app_story_research.md:398:- no timeline or historical validation pipeline
./Docs/researches/src_app_story_research.md:399:- no MCP Wikipedia retrieval
./Docs/researches/src_app_story_research.md:400:- no true pacing/director control beyond coarse prompt wording and cosmetic UI steps
./Docs/researches/src_app_story_research.md:402:That means the ChronosMirror upgrade should be treated as a data-model and orchestration upgrade first, and only secondarily as a page-level UI enhancement.
./src/app/globals.css:72:.timeline-line {
./src/app/globals.css:75:.timeline-line::before {
./src/app/globals.css:107:  letter-spacing: 0.05em;
./Docs/researches/src_app_create_research.md:2:Analyze all source files in src/app/create/. For each file: purpose, exports, dependencies. Then: architecture overview and ChronosMirror upgrade gaps (character modeling, timeline validation, MCP Wikipedia, pacing control). Write results to /home/pjlab/fbh/fbh_project/gushi/Docs/researches/src_app_create_research.md
./Docs/researches/src_app_create_research.md:7:  • Synthesize architecture overview and ChronosMirror upgrade gaps
./Docs/researches/src_app_create_research.md:20:The route is small on disk: `src/app/create/` currently contains a single source file, `page.tsx`. I’m reading that file and then tracing the imported project modules it depends on where that context affects the architecture and ChronosMirror gap analysis.
./Docs/researches/src_app_create_research.md:266:/usr/bin/zsh -lc 'rg -n "''^import|''^export|function |const .* =|use client|Timeline|Chronos|mirror|Wikipedia|MCP|pace|character" src/app/create/page.tsx' in /home/pjlab/fbh/fbh_project/gushi
./Docs/researches/src_app_create_research.md:854:  characters?: string[];
./Docs/researches/src_app_create_research.md:940:The first read missed because zsh treated `[id]` as a glob. I’m rerunning those reads with quoted paths; the gap analysis depends on whether continuation/branch generation already carries any character, pacing, or validation hooks.
./Docs/researches/src_app_create_research.md:1326:I’ve confirmed a key mismatch already: the create UI sends `storyType` and `prompt`, but the current create API only persists `title`, `description`, and `author`. I’m checking whether “ChronosMirror” or any related historical-validation facilities already exist elsewhere in the repo before I write the gap section.
./Docs/researches/src_app_create_research.md:1328:/usr/bin/zsh -lc "rg -n \"ChronosMirror|chronos|timeline|Wikipedia|MCP|pace|pacing|character model|角色|人物设定|时间线|维基\" src Docs prisma data -g '"'!node_modules'"'" in /home/pjlab/fbh/fbh_project/gushi
./Docs/researches/src_app_create_research.md:1337:src/app/globals.css:72:.timeline-line {
./Docs/researches/src_app_create_research.md:1338:src/app/globals.css:75:.timeline-line::before {
./Docs/researches/src_app_create_research.md:1339:src/app/globals.css:107:  letter-spacing: 0.05em;
./Docs/researches/src_app_create_research.md:1340:Docs/researches/src_app_create_research.md.tmp:13:Analyze all source files in src/app/create/. For each file: purpose, exports, dependencies. Then: architecture overview and ChronosMirror upgrade gaps (character modeling, timeline validation, MCP Wikipedia, pacing control). Write results to /home/pjlab/fbh/fbh_project/gushi/Docs/researches/src_app_create_research.md
./Docs/researches/src_app_create_research.md:1341:Docs/researches/src_app_create_research.md.tmp:18:  • Synthesize architecture overview and ChronosMirror upgrade gaps
./Docs/researches/src_app_create_research.md:1342:Docs/researches/src_app_create_research.md.tmp:31:The route is small on disk: `src/app/create/` currently contains a single source file, `page.tsx`. I’m reading that file and then tracing the imported project modules it depends on where that context affects the architecture and ChronosMirror gap analysis.
./Docs/researches/src_app_create_research.md:1343:Docs/researches/src_app_create_research.md.tmp:277:/usr/bin/zsh -lc 'rg -n "''^import|''^export|function |const .* =|use client|Timeline|Chronos|mirror|Wikipedia|MCP|pace|character" src/app/create/page.tsx' in /home/pjlab/fbh/fbh_project/gushi
./Docs/researches/src_app_create_research.md:1346:Docs/researches/src_app_create_research.md.tmp:951:The first read missed because zsh treated `[id]` as a glob. I’m rerunning those reads with quoted paths; the gap analysis depends on whether continuation/branch generation already carries any character, pacing, or validation hooks.
./Docs/researches/src_app_create_research.md:1347:Docs/researches/src_app_create_research.md.tmp:1337:I’ve confirmed a key mismatch already: the create UI sends `storyType` and `prompt`, but the current create API only persists `title`, `description`, and `author`. I’m checking whether “ChronosMirror” or any related historical-validation facilities already exist elsewhere in the repo before I write the gap section.
./Docs/researches/src_app_create_research.md:1348:Docs/researches/src_app_story_research.md:23:- rendering the timeline-style reading UI
./Docs/researches/src_app_create_research.md:1349:Docs/researches/src_app_story_research.md:103:- main story timeline with segment cards, branch markers, and a bottom continuation button
./Docs/researches/src_app_create_research.md:1350:Docs/researches/src_app_story_research.md:156:- any ChronosMirror expansion that adds character state, validation warnings, citations, or pacing metadata will require changes to both the fetch payloads and this page state model
./Docs/researches/src_app_create_research.md:1351:Docs/researches/src_app_story_research.md:185:This matters because the `src/app/story/[id]/page.tsx` UI is designed around linear chains per branch, not around a richer event graph or a validated historical timeline.
./Docs/researches/src_app_create_research.md:1352:Docs/researches/src_app_story_research.md:205:4. The page renders the chain as a timeline-style reader.
./Docs/researches/src_app_create_research.md:1353:Docs/researches/src_app_story_research.md:237:- The route is branch-centric, not timeline-centric. A branch is modeled as a simple linked list of segments.
./Docs/researches/src_app_create_research.md:1354:Docs/researches/src_app_story_research.md:240:## ChronosMirror upgrade gaps
./Docs/researches/src_app_create_research.md:1355:Docs/researches/src_app_story_research.md:242:ChronosMirror, as described in the request, needs stronger historical reasoning, character state, retrieval, and generation control than the current route stack provides.
./Docs/researches/src_app_create_research.md:1356:Docs/researches/src_app_story_research.md:264:Why this blocks ChronosMirror:

exec
/usr/bin/zsh -lc "sed -n '140,200p' README.md" in /home/pjlab/fbh/fbh_project/gushi
 succeeded in 0ms:
  createdAt: string;
  updatedAt: string;
  rootSegmentId?: string;
}
```

#### StorySegment (故事段落)
```typescript
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
```

#### StoryBranch (分叉节点)
```typescript
interface StoryBranch {
  id: string;
  title?: string;
  description?: string;
  segmentId: string;
  parentStoryId?: string;
  createdAt: string;
  updatedAt: string;
}
```

### 数据迁移

```bash
# 创建新的迁移
npx prisma migrate dev --name migration-name

# 应用迁移
npx prisma migrate deploy

# 重置数据库（开发环境）
npx prisma migrate reset --force

# 查看数据库状态
npx prisma studio
```


exec
/usr/bin/zsh -lc "sed -n '1,260p' src/lib/simple-db.ts" in /home/pjlab/fbh/fbh_project/gushi
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
/usr/bin/zsh -lc 'rg -n "imageUrls|StorySegment|segmentsStore|branchesStore|getOrderedChain" src/lib src/app/api src/app/story src/types' in /home/pjlab/fbh/fbh_project/gushi
 succeeded in 0ms:
src/types/story.ts:12:export type StorySegment = {
src/types/story.ts:22:  imageUrls: string[];
src/types/story.ts:52:  segments: StorySegment[];
src/types/story.ts:54:  currentSegment: StorySegment;
src/types/story.ts:81:class StorySegmentClass {
src/types/story.ts:91:  imageUrls!: string[];
src/types/story.ts:92:  constructor(data: StorySegment) { Object.assign(this, data); }
src/types/story.ts:109:  StorySegment: StorySegmentClass,
src/app/story/[id]/page.tsx:13:interface StorySegment {
src/app/story/[id]/page.tsx:21:  imageUrls: string[];
src/app/story/[id]/page.tsx:34:  const [segments, setSegments] = useState<StorySegment[]>([]);
src/lib/simple-db.ts:47:interface StorySegment {
src/lib/simple-db.ts:57:  imageUrls: string[];
src/lib/simple-db.ts:72:const segmentsStore = new SimpleStore<StorySegment>('segments.json');
src/lib/simple-db.ts:73:const branchesStore = new SimpleStore<StoryBranch>('branches.json');
src/lib/simple-db.ts:76:async function getOrderedChain(storyId: string, branchId: string): Promise<StorySegment[]> {
src/lib/simple-db.ts:77:  const segments = await segmentsStore.load();
src/lib/simple-db.ts:82:    const chain: StorySegment[] = [];
src/lib/simple-db.ts:93:    const branches = await branchesStore.load();
src/lib/simple-db.ts:97:    const chain: StorySegment[] = [];
src/lib/simple-db.ts:110:async function getTailSegment(storyId: string, branchId: string): Promise<StorySegment | null> {
src/lib/simple-db.ts:111:  const chain = await getOrderedChain(storyId, branchId);
src/lib/simple-db.ts:116:async function getStorySegments(storyId: string): Promise<StorySegment[]> {
src/lib/simple-db.ts:117:  const segments = await segmentsStore.load();
src/lib/simple-db.ts:123:  const branches = await branchesStore.load();
src/lib/simple-db.ts:129:  segmentsStore,
src/lib/simple-db.ts:130:  branchesStore,
src/lib/simple-db.ts:131:  getOrderedChain,
src/lib/simple-db.ts:133:  getStorySegments,
src/lib/simple-db.ts:136:  type StorySegment,
src/app/api/images/route.ts:17:    // 实际实现时，会从 StorySegment 的 imageUrls 和 imageMetadata 字段中获取图片数据
src/app/api/stories/[id]/tree/route.ts:2:import { storiesStore, segmentsStore, branchesStore, getOrderedChain, type StorySegment, type StoryBranch } from '@/lib/simple-db';
src/app/api/stories/[id]/tree/route.ts:4:function buildTreeData(segments: StorySegment[], branches: StoryBranch[], storyId: string) {
src/app/api/stories/[id]/tree/route.ts:64:    const segments = await segmentsStore.load();
src/app/api/stories/[id]/tree/route.ts:65:    const branches = await branchesStore.load();
src/app/api/stories/[id]/continue/route.ts:2:import { storiesStore, segmentsStore, getOrderedChain, type StorySegment } from '@/lib/simple-db';
src/app/api/stories/[id]/continue/route.ts:49:    const chain = await getOrderedChain(storyId, branchId);
src/app/api/stories/[id]/continue/route.ts:56:    const contextSummary = chain.map((s: StorySegment) =>
src/app/api/stories/[id]/continue/route.ts:70:    const segments = await segmentsStore.load();
src/app/api/stories/[id]/continue/route.ts:71:    const newSegment: StorySegment = {
src/app/api/stories/[id]/continue/route.ts:79:      imageUrls: [],
src/app/api/stories/[id]/continue/route.ts:85:    await segmentsStore.save(segments);
src/app/api/stories/[id]/stream-continue/route.ts:2:import { storiesStore, segmentsStore, getOrderedChain, type StorySegment } from '@/lib/simple-db';
src/app/api/stories/[id]/stream-continue/route.ts:18:    const chain = await getOrderedChain(storyId, branchId);
src/app/api/stories/[id]/stream-continue/route.ts:25:    const contextSummary = chain.map((s: StorySegment) =>
src/app/api/stories/[id]/stream-continue/route.ts:102:          const allSegments = await segmentsStore.load();
src/app/api/stories/[id]/stream-continue/route.ts:103:          const newSegment: StorySegment = {
src/app/api/stories/[id]/stream-continue/route.ts:111:            imageUrls: [],
src/app/api/stories/[id]/stream-continue/route.ts:117:          await segmentsStore.save(allSegments);
src/app/api/stories/[id]/segments/route.ts:2:import { getOrderedChain, getStorySegments, type StorySegment } from '@/lib/simple-db';
src/app/api/stories/[id]/segments/route.ts:14:      const segments = await getStorySegments(params.id);
src/app/api/stories/[id]/segments/route.ts:18:    const segments = await getOrderedChain(params.id, branchId);
src/app/api/stories/route.ts:2:import { storiesStore, segmentsStore, type Story, type StorySegment } from '@/lib/simple-db';
src/app/api/stories/route.ts:67:    const firstSegment: StorySegment = {
src/app/api/stories/route.ts:77:      imageUrls: []
src/app/api/stories/route.ts:80:    const segments = await segmentsStore.load();
src/app/api/stories/route.ts:82:    await segmentsStore.save(segments);
src/app/api/stories/[id]/branch/route.ts:2:import { storiesStore, segmentsStore, branchesStore, getOrderedChain, type StorySegment } from '@/lib/simple-db';
src/app/api/stories/[id]/branch/route.ts:17:    const segments = await segmentsStore.load();
src/app/api/stories/[id]/branch/route.ts:35:    const branches = await branchesStore.load();
src/app/api/stories/[id]/branch/route.ts:37:    await branchesStore.save(branches);
src/app/api/stories/[id]/branch/route.ts:41:    await segmentsStore.save(segments);
src/app/api/stories/[id]/branch/route.ts:44:    const mainChain = await getOrderedChain(storyId, 'main');
src/app/api/stories/[id]/branch/route.ts:48:      let cur: StorySegment | undefined = s;
src/app/api/stories/[id]/branch/route.ts:59:    const contextSummary = relevantChain.map((s: StorySegment) =>
src/app/api/stories/[id]/branch/route.ts:103:    const newSegment: StorySegment = {
src/app/api/stories/[id]/branch/route.ts:111:      imageUrls: [],
src/app/api/stories/[id]/branch/route.ts:116:    const allSegments = await segmentsStore.load();
src/app/api/stories/[id]/branch/route.ts:118:    await segmentsStore.save(allSegments);

codex
I’m at the write stage now. The markdown will call out two important facts explicitly: the components folder is very small, and both files are partially disconnected from the live story flow, so the ChronosMirror gaps here are mostly about missing UI contracts rather than small local tweaks.
apply patch
patch: completed
/home/pjlab/fbh/fbh_project/gushi/Docs/researches/src_components_research.md
diff --git a/Docs/researches/src_components_research.md b/Docs/researches/src_components_research.md
new file mode 100644
index 0000000000000000000000000000000000000000..4b9c4125c3cc3779f3f164420aad4b06f87be7ef
--- /dev/null
+++ b/Docs/researches/src_components_research.md
@@ -0,0 +1,444 @@
+# `src/components/` Research
+
+## Scope
+
+Analyzed all source files under `src/components/`.
+
+Directory contents:
+
+- `src/components/StreamingText.tsx`
+- `src/components/story/StoryImageDisplay.tsx`
+
+There is no `index.ts`, no component-local hook layer, no context/provider module, and no shared component type module inside this directory.
+
+## File-by-file analysis
+
+### `src/components/StreamingText.tsx`
+
+#### Purpose
+
+This is a client-only text presentation module that packages three related UI behaviors:
+
+- `StreamingText`
+  - typewriter-style reveal for a single string
+- `MultiStreamingText`
+  - sequential display for an array of strings with optional progress UI and previous/next controls
+- `SSEStreamingText`
+  - streaming text display backed by a browser `EventSource`
+
+The file is generic presentation infrastructure. It does not contain story-domain rules, persistence logic, or provider integration.
+
+#### Exports
+
+- named export: `StreamingText`
+- named export: `MultiStreamingText`
+- named export: `SSEStreamingText`
+
+There is no default export.
+
+The props interfaces are local only and are not exported:
+
+- `StreamingTextProps`
+- `MultiStreamingTextProps`
+- `SSEStreamingTextProps`
+
+#### Internal structure and key behaviors
+
+`StreamingText`:
+
+- uses `useState` for `displayedText` and `isComplete`
+- uses `useRef<NodeJS.Timeout | null>` to hold the active interval
+- uses `useEffect` to:
+  - reset local state when `text` or `speed` changes
+  - create a `setInterval()` loop
+  - append one character at a time via `text.substring(0, currentIndex + 1)`
+  - call `onComplete?.()` once the full string has been revealed
+- renders:
+  - the progressively revealed text
+  - an optional blinking cursor while incomplete
+  - an optional completion marker after the reveal finishes
+
+`MultiStreamingText`:
+
+- tracks `currentTextIndex` and `allComplete`
+- delegates the actual typing effect to `StreamingText`
+- advances to the next entry from `texts[]` after `delayBetween`
+- optionally shows a progress bar and progress percentage
+- renders previous/next buttons for manual navigation
+
+Important detail:
+
+- this component only renders the current string, not the already completed history of strings
+- `allComplete` is written but not used in render output
+
+`SSEStreamingText`:
+
+- opens `new EventSource(url)` inside `useEffect`
+- parses `event.data` as JSON
+- expects event payloads with `type` values such as:
+  - `progress`
+  - `complete`
+  - `final`
+  - `error`
+- updates local `content`, `isComplete`, and `error`
+- closes the `EventSource` in the cleanup function
+
+#### Dependencies
+
+External imports:
+
+- `react`
+  - `useState`
+  - `useEffect`
+  - `useRef`
+
+Browser and platform dependencies:
+
+- `setInterval`
+- `clearInterval`
+- `setTimeout`
+- `EventSource`
+- `JSON.parse`
+- `console.error`
+
+Styling dependencies:
+
+- Tailwind-like utility classes for cursor, progress bar, buttons, and status labels
+
+Project-internal dependencies:
+
+- none
+
+#### Important non-dependencies
+
+- does not import `src/types/story.ts`
+- does not import any story route or API helper
+- does not import any prompt builder, validator, MCP client, or narrative model
+- no consumer was found under `src/`; the live story page does not currently import this module
+
+#### Architectural observations
+
+This file looks like a reusable streaming UI utility that was built ahead of integration, but the current application does not route its real story streaming flow through it.
+
+There is also a protocol mismatch with the live continuation route:
+
+- `SSEStreamingText` assumes a browser `EventSource`, which is a `GET`-style SSE consumption pattern
+- `src/app/api/stories/[id]/stream-continue/route.ts` is consumed by `fetch(..., { method: 'POST' })` plus `ReadableStream.getReader()`
+- `SSEStreamingText` expects `{ type, content }` style events
+- the live continuation route emits chunk objects with `content` only and terminates with `[DONE]`
+
+So even if `SSEStreamingText` were imported today, it would not plug directly into the existing story continuation flow without backend and client protocol alignment.
+
+### `src/components/story/StoryImageDisplay.tsx`
+
+#### Purpose
+
+This is a client-only story asset viewer for a single segment. It fetches image metadata for a `segmentId` and renders one or more image cards with type labels and descriptions.
+
+It is clearly intended to support story illustration features such as:
+
+- scene art
+- character images
+- object images
+- general illustrations
+
+#### Exports
+
+- default export: `StoryImageDisplay`
+
+There are no named exports.
+
+The local interfaces are not exported:
+
+- `ImageMetadata`
+- `StoryImageDisplayProps`
+
+#### Internal structure and key behaviors
+
+State:
+
+- `images`
+- `loading`
+- `error`
+
+Effects and helpers:
+
+- `useEffect` with local `fetchImages()`
+  - fetches `/api/images?segmentId=${segmentId}`
+  - reads JSON
+  - expects a payload with `success` and `images`
+  - updates state based on success or failure
+- `getTypeIcon(type)`
+  - maps `illustration | scene | character | object` to emoji labels
+- `getTypeText(type)`
+  - maps the same image type union to Chinese labels
+
+Render modes:
+
+- loading placeholder
+- error state
+- empty state
+- image list with:
+  - `next/image`
+  - per-image type badge
+  - optional description block
+  - width/height metadata display
+
+#### Dependencies
+
+External imports:
+
+- `react`
+  - `useState`
+  - `useEffect`
+- `next/image`
+
+Browser and platform dependencies:
+
+- `fetch`
+
+Runtime backend dependency:
+
+- `GET /api/images?segmentId=...`
+
+Local data contract:
+
+- `ImageMetadata`
+  - `id`
+  - `url`
+  - `description?`
+  - `type: 'illustration' | 'scene' | 'character' | 'object'`
+  - `width`
+  - `height`
+  - `alt?`
+
+Styling dependencies:
+
+- utility classes for loading, empty, error, card, and badge states
+
+#### Important non-dependencies
+
+- does not import `src/types/story.ts`
+- does not import `src/lib/simple-db.ts`
+- does not import any image-generation service or shared media model
+- no consumer was found under `src/`; `src/app/story/[id]/page.tsx` does not currently render this component
+
+#### Architectural observations
+
+This component depends on a richer image metadata shape than the live persistence layer currently provides.
+
+Current contract drift:
+
+- `StoryImageDisplay` expects full metadata objects with `type`, `width`, `height`, `description`, and `alt`
+- `src/types/story.ts` only models `StorySegment.imageUrls: string[]`
+- `src/lib/simple-db.ts` also stores only `imageUrls: string[]`
+- `README.md` documents an `imageMetadata?` shape, but that field is not present in the runtime store types
+- `src/app/api/images/route.ts` is still a stub that returns a single mocked placeholder image
+
+So this component is not backed by a stable end-to-end image data model yet. It is effectively a prototype UI for a future richer media layer.
+
+There is also a rendering risk in the current implementation:
+
+- `next/image` is used with `fill`
+- the parent container only sets `maxWidth` and `maxHeight`
+- there is no explicit intrinsic layout box or aspect-ratio wrapper
+
+That means the component is relying on layout behavior that may not produce a reliable render box in all cases.
+
+The error fallback also mutates DOM with `target.parentElement!.innerHTML = ...`, which bypasses React's normal rendering path and makes this component harder to evolve safely.
+
+## Architecture overview
+
+### What `src/components/` currently is
+
+In the current codebase, `src/components/` is a very small collection of client-side presentation helpers, not the authoritative UI layer for the live story feature.
+
+The directory contains two isolated component groups:
+
+- text-stream presentation in `StreamingText.tsx`
+- segment-image display in `story/StoryImageDisplay.tsx`
+
+They do not import each other, share no local types, and have no common state or composition layer.
+
+### How these components relate to the live app
+
+The active story experience is implemented in `src/app/story/[id]/page.tsx`, but that page does not use either component:
+
+- it implements continuation streaming inline with `fetch()` plus `ReadableStream` parsing
+- it renders plain segment text directly
+- it does not mount `StoryImageDisplay` for `segment.imageUrls`
+
+So the live story route bypasses the components folder instead of being composed from it.
+
+### Effective layering
+
+Current effective flow:
+
+1. Story UI in `src/app/story/[id]/page.tsx`
+2. API routes in `src/app/api/stories/[id]/*`
+3. JSON-backed persistence in `src/lib/simple-db.ts`
+
+`src/components/` is mostly off to the side of that runtime path.
+
+### Type and contract drift
+
+This directory also exposes a broader architecture issue: UI contracts are being defined locally instead of centrally.
+
+Examples:
+
+- `StoryImageDisplay` defines its own `ImageMetadata` interface
+- `StreamingText` defines all of its own props locally
+- `src/app/story/[id]/page.tsx` defines route-local `Story`, `StorySegment`, and `StoryBranch` interfaces
+- `src/types/story.ts` exists, but the component layer does not depend on it
+
+As a result:
+
+- image contracts differ between README, shared types, API stubs, and persistence
+- streaming contracts differ between `SSEStreamingText` and the live `stream-continue` route
+- the components folder does not enforce or even consume the current story-domain schema
+
+### Architectural strengths
+
+- the components themselves are small and easy to read
+- both files are already client-safe and focused on presentation concerns
+- the intended future directions are visible:
+  - reusable streaming UI
+  - reusable segment-image UI
+
+### Architectural constraints
+
+- the components are not integrated into the main story page
+- local type definitions create drift instead of shared contracts
+- there is no component support for structured narrative state
+- there is no shared event model for streaming progress, validation, retrieval, or citations
+- the image path is backed by placeholder API responses rather than real persisted metadata
+
+## ChronosMirror upgrade gaps
+
+ChronosMirror needs stronger narrative-state rendering than this component layer currently offers. The biggest issue here is not that these files are too small; it is that they only accept raw text and ad hoc image metadata, while ChronosMirror needs structured history-aware state.
+
+### 1. Character modeling gap
+
+Current state:
+
+- no component in `src/components/` accepts a structured character object
+- `StoryImageDisplay` includes a `type: 'character'` image label, but that only changes the badge text and emoji
+- `StreamingText`, `MultiStreamingText`, and `SSEStreamingText` only render strings
+- there is no UI primitive for:
+  - character identity
+  - role or allegiance
+  - motivation
+  - speech style
+  - emotional state
+  - evolving relationships
+- `src/types/story.ts` includes `ContinueStoryRequest.characters?: string[]`, but this component layer has no way to surface richer character context even if the backend started sending it
+
+Why this blocks ChronosMirror:
+
+- character consistency would remain hidden in prompts instead of visible in the UI state
+- the reader cannot see why a branch is plausible for a given character
+- the UI cannot distinguish narrator prose from character voice or relationship changes
+
+What the component layer needs:
+
+- shared `CharacterCard` and `CharacterStatePanel` components
+- segment-level cast summaries
+- relationship chips or graph fragments
+- speaker-aware or POV-aware text rendering
+- typed props for character snapshots and diffs rather than raw arrays of names
+
+### 2. Timeline validation gap
+
+Current state:
+
+- no component renders canonical dates, eras, locations, or source events
+- no component can display validation warnings, contradictions, or confidence levels
+- `StreamingText` only reveals prose; it has no support for interleaving structured timeline metadata
+- `StoryImageDisplay` shows image labels and dimensions only; it does not tie an image to a validated historical event or moment
+
+Why this blocks ChronosMirror:
+
+- a historically invalid continuation would look identical to a valid one at the component layer
+- validation results would have nowhere obvious to render
+- the app has a visual timeline style, but not a semantic timeline UI
+
+What the component layer needs:
+
+- event cards or chronology rows
+- validation badges and contradiction callouts
+- date/location metadata surfaces on segments and images
+- props such as:
+  - `historicalDate`
+  - `location`
+  - `canonicalEventId`
+  - `validationStatus`
+  - `warnings[]`
+
+### 3. MCP Wikipedia gap
+
+Current state:
+
+- no component in this directory shows citations, provenance, or retrieved facts
+- `SSEStreamingText` handles only content-completion-error style events
+- no component can render retrieval progress such as:
+  - query issued
+  - source matched
+  - facts extracted
+  - citations attached
+- no file imports an MCP client, retrieval hook, or source model
+
+Why this blocks ChronosMirror:
+
+- even if the backend starts calling Wikipedia through MCP, the UI still cannot show which claims were grounded
+- fact-checking would remain opaque to users
+- historical trust signals would be absent from both text and image presentation
+
+What the component layer needs:
+
+- source badges and citation drawers
+- retrieved-fact panels
+- inline provenance markers next to generated text
+- a streaming event model that can represent retrieval and verification phases, not just text chunks
+
+### 4. Pacing control gap
+
+Current state:
+
+- `StreamingText.speed` controls typing animation speed
+- `MultiStreamingText.delayBetween` controls UI delay between strings
+- those are presentation effects, not narrative pacing controls
+- there is no component for:
+  - beat planning
+  - scene intensity
+  - director mode
+  - pause-and-review generation steps
+  - branch tempo or escalation tracking
+
+Why this blocks ChronosMirror:
+
+- a slower cursor is not the same thing as better pacing
+- the component layer has no place to expose scene plans, beat budgets, or controlled generation stages
+- readers and operators cannot inspect or steer narrative rhythm
+
+What the component layer needs:
+
+- director-mode control surfaces
+- beat and scene progression UI
+- stepwise generation panels for outline, validation, citation, revision, and final prose
+- typed pacing metadata passed with segments and stream events
+
+## Summary
+
+`src/components/` currently contains only two small client-side modules:
+
+- a generic text-streaming utility file
+- a segment-image display component backed by a placeholder image API
+
+Neither file is part of the live story page's main rendering path, and neither one is connected to shared domain types for characters, validated timelines, citations, or pacing plans.
+
+For ChronosMirror, this directory should evolve from a set of isolated UI helpers into a typed presentation layer that can consume structured narrative state from upgraded APIs and storage. Until that happens, the components layer will remain too narrow for:
+
+- character persona modeling
+- timeline validation display
+- MCP Wikipedia provenance
+- true pacing and director-mode control

diff --git a/Docs/researches/src_components_research.md b/Docs/researches/src_components_research.md
new file mode 100644
index 0000000000000000000000000000000000000000..4b9c4125c3cc3779f3f164420aad4b06f87be7ef
--- /dev/null
+++ b/Docs/researches/src_components_research.md
@@ -0,0 +1,444 @@
+# `src/components/` Research
+
+## Scope
+
+Analyzed all source files under `src/components/`.
+
+Directory contents:
+
+- `src/components/StreamingText.tsx`
+- `src/components/story/StoryImageDisplay.tsx`
+
+There is no `index.ts`, no component-local hook layer, no context/provider module, and no shared component type module inside this directory.
+
+## File-by-file analysis
+
+### `src/components/StreamingText.tsx`
+
+#### Purpose
+
+This is a client-only text presentation module that packages three related UI behaviors:
+
+- `StreamingText`
+  - typewriter-style reveal for a single string
+- `MultiStreamingText`
+  - sequential display for an array of strings with optional progress UI and previous/next controls
+- `SSEStreamingText`
+  - streaming text display backed by a browser `EventSource`
+
+The file is generic presentation infrastructure. It does not contain story-domain rules, persistence logic, or provider integration.
+
+#### Exports
+
+- named export: `StreamingText`
+- named export: `MultiStreamingText`
+- named export: `SSEStreamingText`
+
+There is no default export.
+
+The props interfaces are local only and are not exported:
+
+- `StreamingTextProps`
+- `MultiStreamingTextProps`
+- `SSEStreamingTextProps`
+
+#### Internal structure and key behaviors
+
+`StreamingText`:
+
+- uses `useState` for `displayedText` and `isComplete`
+- uses `useRef<NodeJS.Timeout | null>` to hold the active interval
+- uses `useEffect` to:
+  - reset local state when `text` or `speed` changes
+  - create a `setInterval()` loop
+  - append one character at a time via `text.substring(0, currentIndex + 1)`
+  - call `onComplete?.()` once the full string has been revealed
+- renders:
+  - the progressively revealed text
+  - an optional blinking cursor while incomplete
+  - an optional completion marker after the reveal finishes
+
+`MultiStreamingText`:
+
+- tracks `currentTextIndex` and `allComplete`
+- delegates the actual typing effect to `StreamingText`
+- advances to the next entry from `texts[]` after `delayBetween`
+- optionally shows a progress bar and progress percentage
+- renders previous/next buttons for manual navigation
+
+Important detail:
+
+- this component only renders the current string, not the already completed history of strings
+- `allComplete` is written but not used in render output
+
+`SSEStreamingText`:
+
+- opens `new EventSource(url)` inside `useEffect`
+- parses `event.data` as JSON
+- expects event payloads with `type` values such as:
+  - `progress`
+  - `complete`
+  - `final`
+  - `error`
+- updates local `content`, `isComplete`, and `error`
+- closes the `EventSource` in the cleanup function
+
+#### Dependencies
+
+External imports:
+
+- `react`
+  - `useState`
+  - `useEffect`
+  - `useRef`
+
+Browser and platform dependencies:
+
+- `setInterval`
+- `clearInterval`
+- `setTimeout`
+- `EventSource`
+- `JSON.parse`
+- `console.error`
+
+Styling dependencies:
+
+- Tailwind-like utility classes for cursor, progress bar, buttons, and status labels
+
+Project-internal dependencies:
+
+- none
+
+#### Important non-dependencies
+
+- does not import `src/types/story.ts`
+- does not import any story route or API helper
+- does not import any prompt builder, validator, MCP client, or narrative model
+- no consumer was found under `src/`; the live story page does not currently import this module
+
+#### Architectural observations
+
+This file looks like a reusable streaming UI utility that was built ahead of integration, but the current application does not route its real story streaming flow through it.
+
+There is also a protocol mismatch with the live continuation route:
+
+- `SSEStreamingText` assumes a browser `EventSource`, which is a `GET`-style SSE consumption pattern
+- `src/app/api/stories/[id]/stream-continue/route.ts` is consumed by `fetch(..., { method: 'POST' })` plus `ReadableStream.getReader()`
+- `SSEStreamingText` expects `{ type, content }` style events
+- the live continuation route emits chunk objects with `content` only and terminates with `[DONE]`
+
+So even if `SSEStreamingText` were imported today, it would not plug directly into the existing story continuation flow without backend and client protocol alignment.
+
+### `src/components/story/StoryImageDisplay.tsx`
+
+#### Purpose
+
+This is a client-only story asset viewer for a single segment. It fetches image metadata for a `segmentId` and renders one or more image cards with type labels and descriptions.
+
+It is clearly intended to support story illustration features such as:
+
+- scene art
+- character images
+- object images
+- general illustrations
+
+#### Exports
+
+- default export: `StoryImageDisplay`
+
+There are no named exports.
+
+The local interfaces are not exported:
+
+- `ImageMetadata`
+- `StoryImageDisplayProps`
+
+#### Internal structure and key behaviors
+
+State:
+
+- `images`
+- `loading`
+- `error`
+
+Effects and helpers:
+
+- `useEffect` with local `fetchImages()`
+  - fetches `/api/images?segmentId=${segmentId}`
+  - reads JSON
+  - expects a payload with `success` and `images`
+  - updates state based on success or failure
+- `getTypeIcon(type)`
+  - maps `illustration | scene | character | object` to emoji labels
+- `getTypeText(type)`
+  - maps the same image type union to Chinese labels
+
+Render modes:
+
+- loading placeholder
+- error state
+- empty state
+- image list with:
+  - `next/image`
+  - per-image type badge
+  - optional description block
+  - width/height metadata display
+
+#### Dependencies
+
+External imports:
+
+- `react`
+  - `useState`
+  - `useEffect`
+- `next/image`
+
+Browser and platform dependencies:
+
+- `fetch`
+
+Runtime backend dependency:
+
+- `GET /api/images?segmentId=...`
+
+Local data contract:
+
+- `ImageMetadata`
+  - `id`
+  - `url`
+  - `description?`
+  - `type: 'illustration' | 'scene' | 'character' | 'object'`
+  - `width`
+  - `height`
+  - `alt?`
+
+Styling dependencies:
+
+- utility classes for loading, empty, error, card, and badge states
+
+#### Important non-dependencies
+
+- does not import `src/types/story.ts`
+- does not import `src/lib/simple-db.ts`
+- does not import any image-generation service or shared media model
+- no consumer was found under `src/`; `src/app/story/[id]/page.tsx` does not currently render this component
+
+#### Architectural observations
+
+This component depends on a richer image metadata shape than the live persistence layer currently provides.
+
+Current contract drift:
+
+- `StoryImageDisplay` expects full metadata objects with `type`, `width`, `height`, `description`, and `alt`
+- `src/types/story.ts` only models `StorySegment.imageUrls: string[]`
+- `src/lib/simple-db.ts` also stores only `imageUrls: string[]`
+- `README.md` documents an `imageMetadata?` shape, but that field is not present in the runtime store types
+- `src/app/api/images/route.ts` is still a stub that returns a single mocked placeholder image
+
+So this component is not backed by a stable end-to-end image data model yet. It is effectively a prototype UI for a future richer media layer.
+
+There is also a rendering risk in the current implementation:
+
+- `next/image` is used with `fill`
+- the parent container only sets `maxWidth` and `maxHeight`
+- there is no explicit intrinsic layout box or aspect-ratio wrapper
+
+That means the component is relying on layout behavior that may not produce a reliable render box in all cases.
+
+The error fallback also mutates DOM with `target.parentElement!.innerHTML = ...`, which bypasses React's normal rendering path and makes this component harder to evolve safely.
+
+## Architecture overview
+
+### What `src/components/` currently is
+
+In the current codebase, `src/components/` is a very small collection of client-side presentation helpers, not the authoritative UI layer for the live story feature.
+
+The directory contains two isolated component groups:
+
+- text-stream presentation in `StreamingText.tsx`
+- segment-image display in `story/StoryImageDisplay.tsx`
+
+They do not import each other, share no local types, and have no common state or composition layer.
+
+### How these components relate to the live app
+
+The active story experience is implemented in `src/app/story/[id]/page.tsx`, but that page does not use either component:
+
+- it implements continuation streaming inline with `fetch()` plus `ReadableStream` parsing
+- it renders plain segment text directly
+- it does not mount `StoryImageDisplay` for `segment.imageUrls`
+
+So the live story route bypasses the components folder instead of being composed from it.
+
+### Effective layering
+
+Current effective flow:
+
+1. Story UI in `src/app/story/[id]/page.tsx`
+2. API routes in `src/app/api/stories/[id]/*`
+3. JSON-backed persistence in `src/lib/simple-db.ts`
+
+`src/components/` is mostly off to the side of that runtime path.
+
+### Type and contract drift
+
+This directory also exposes a broader architecture issue: UI contracts are being defined locally instead of centrally.
+
+Examples:
+
+- `StoryImageDisplay` defines its own `ImageMetadata` interface
+- `StreamingText` defines all of its own props locally
+- `src/app/story/[id]/page.tsx` defines route-local `Story`, `StorySegment`, and `StoryBranch` interfaces
+- `src/types/story.ts` exists, but the component layer does not depend on it
+
+As a result:
+
+- image contracts differ between README, shared types, API stubs, and persistence
+- streaming contracts differ between `SSEStreamingText` and the live `stream-continue` route
+- the components folder does not enforce or even consume the current story-domain schema
+
+### Architectural strengths
+
+- the components themselves are small and easy to read
+- both files are already client-safe and focused on presentation concerns
+- the intended future directions are visible:
+  - reusable streaming UI
+  - reusable segment-image UI
+
+### Architectural constraints
+
+- the components are not integrated into the main story page
+- local type definitions create drift instead of shared contracts
+- there is no component support for structured narrative state
+- there is no shared event model for streaming progress, validation, retrieval, or citations
+- the image path is backed by placeholder API responses rather than real persisted metadata
+
+## ChronosMirror upgrade gaps
+
+ChronosMirror needs stronger narrative-state rendering than this component layer currently offers. The biggest issue here is not that these files are too small; it is that they only accept raw text and ad hoc image metadata, while ChronosMirror needs structured history-aware state.
+
+### 1. Character modeling gap
+
+Current state:
+
+- no component in `src/components/` accepts a structured character object
+- `StoryImageDisplay` includes a `type: 'character'` image label, but that only changes the badge text and emoji
+- `StreamingText`, `MultiStreamingText`, and `SSEStreamingText` only render strings
+- there is no UI primitive for:
+  - character identity
+  - role or allegiance
+  - motivation
+  - speech style
+  - emotional state
+  - evolving relationships
+- `src/types/story.ts` includes `ContinueStoryRequest.characters?: string[]`, but this component layer has no way to surface richer character context even if the backend started sending it
+
+Why this blocks ChronosMirror:
+
+- character consistency would remain hidden in prompts instead of visible in the UI state
+- the reader cannot see why a branch is plausible for a given character
+- the UI cannot distinguish narrator prose from character voice or relationship changes
+
+What the component layer needs:
+
+- shared `CharacterCard` and `CharacterStatePanel` components
+- segment-level cast summaries
+- relationship chips or graph fragments
+- speaker-aware or POV-aware text rendering
+- typed props for character snapshots and diffs rather than raw arrays of names
+
+### 2. Timeline validation gap
+
+Current state:
+
+- no component renders canonical dates, eras, locations, or source events
+- no component can display validation warnings, contradictions, or confidence levels
+- `StreamingText` only reveals prose; it has no support for interleaving structured timeline metadata
+- `StoryImageDisplay` shows image labels and dimensions only; it does not tie an image to a validated historical event or moment
+
+Why this blocks ChronosMirror:
+
+- a historically invalid continuation would look identical to a valid one at the component layer
+- validation results would have nowhere obvious to render
+- the app has a visual timeline style, but not a semantic timeline UI
+
+What the component layer needs:
+
+- event cards or chronology rows
+- validation badges and contradiction callouts
+- date/location metadata surfaces on segments and images
+- props such as:
+  - `historicalDate`
+  - `location`
+  - `canonicalEventId`
+  - `validationStatus`
+  - `warnings[]`
+
+### 3. MCP Wikipedia gap
+
+Current state:
+
+- no component in this directory shows citations, provenance, or retrieved facts
+- `SSEStreamingText` handles only content-completion-error style events
+- no component can render retrieval progress such as:
+  - query issued
+  - source matched
+  - facts extracted
+  - citations attached
+- no file imports an MCP client, retrieval hook, or source model
+
+Why this blocks ChronosMirror:
+
+- even if the backend starts calling Wikipedia through MCP, the UI still cannot show which claims were grounded
+- fact-checking would remain opaque to users
+- historical trust signals would be absent from both text and image presentation
+
+What the component layer needs:
+
+- source badges and citation drawers
+- retrieved-fact panels
+- inline provenance markers next to generated text
+- a streaming event model that can represent retrieval and verification phases, not just text chunks
+
+### 4. Pacing control gap
+
+Current state:
+
+- `StreamingText.speed` controls typing animation speed
+- `MultiStreamingText.delayBetween` controls UI delay between strings
+- those are presentation effects, not narrative pacing controls
+- there is no component for:
+  - beat planning
+  - scene intensity
+  - director mode
+  - pause-and-review generation steps
+  - branch tempo or escalation tracking
+
+Why this blocks ChronosMirror:
+
+- a slower cursor is not the same thing as better pacing
+- the component layer has no place to expose scene plans, beat budgets, or controlled generation stages
+- readers and operators cannot inspect or steer narrative rhythm
+
+What the component layer needs:
+
+- director-mode control surfaces
+- beat and scene progression UI
+- stepwise generation panels for outline, validation, citation, revision, and final prose
+- typed pacing metadata passed with segments and stream events
+
+## Summary
+
+`src/components/` currently contains only two small client-side modules:
+
+- a generic text-streaming utility file
+- a segment-image display component backed by a placeholder image API
+
+Neither file is part of the live story page's main rendering path, and neither one is connected to shared domain types for characters, validated timelines, citations, or pacing plans.
+
+For ChronosMirror, this directory should evolve from a set of isolated UI helpers into a typed presentation layer that can consume structured narrative state from upgraded APIs and storage. Until that happens, the components layer will remain too narrow for:
+
+- character persona modeling
+- timeline validation display
+- MCP Wikipedia provenance
+- true pacing and director-mode control

codex
The report file is written. I’m doing one verification pass on the saved markdown so I can catch any content drift before closing this out.
exec
/usr/bin/zsh -lc "sed -n '1,260p' Docs/researches/src_components_research.md" in /home/pjlab/fbh/fbh_project/gushi
 succeeded in 0ms:
# `src/components/` Research

## Scope

Analyzed all source files under `src/components/`.

Directory contents:

- `src/components/StreamingText.tsx`
- `src/components/story/StoryImageDisplay.tsx`

There is no `index.ts`, no component-local hook layer, no context/provider module, and no shared component type module inside this directory.

## File-by-file analysis

### `src/components/StreamingText.tsx`

#### Purpose

This is a client-only text presentation module that packages three related UI behaviors:

- `StreamingText`
  - typewriter-style reveal for a single string
- `MultiStreamingText`
  - sequential display for an array of strings with optional progress UI and previous/next controls
- `SSEStreamingText`
  - streaming text display backed by a browser `EventSource`

The file is generic presentation infrastructure. It does not contain story-domain rules, persistence logic, or provider integration.

#### Exports

- named export: `StreamingText`
- named export: `MultiStreamingText`
- named export: `SSEStreamingText`

There is no default export.

The props interfaces are local only and are not exported:

- `StreamingTextProps`
- `MultiStreamingTextProps`
- `SSEStreamingTextProps`

#### Internal structure and key behaviors

`StreamingText`:

- uses `useState` for `displayedText` and `isComplete`
- uses `useRef<NodeJS.Timeout | null>` to hold the active interval
- uses `useEffect` to:
  - reset local state when `text` or `speed` changes
  - create a `setInterval()` loop
  - append one character at a time via `text.substring(0, currentIndex + 1)`
  - call `onComplete?.()` once the full string has been revealed
- renders:
  - the progressively revealed text
  - an optional blinking cursor while incomplete
  - an optional completion marker after the reveal finishes

`MultiStreamingText`:

- tracks `currentTextIndex` and `allComplete`
- delegates the actual typing effect to `StreamingText`
- advances to the next entry from `texts[]` after `delayBetween`
- optionally shows a progress bar and progress percentage
- renders previous/next buttons for manual navigation

Important detail:

- this component only renders the current string, not the already completed history of strings
- `allComplete` is written but not used in render output

`SSEStreamingText`:

- opens `new EventSource(url)` inside `useEffect`
- parses `event.data` as JSON
- expects event payloads with `type` values such as:
  - `progress`
  - `complete`
  - `final`
  - `error`
- updates local `content`, `isComplete`, and `error`
- closes the `EventSource` in the cleanup function

#### Dependencies

External imports:

- `react`
  - `useState`
  - `useEffect`
  - `useRef`

Browser and platform dependencies:

- `setInterval`
- `clearInterval`
- `setTimeout`
- `EventSource`
- `JSON.parse`
- `console.error`

Styling dependencies:

- Tailwind-like utility classes for cursor, progress bar, buttons, and status labels

Project-internal dependencies:

- none

#### Important non-dependencies

- does not import `src/types/story.ts`
- does not import any story route or API helper
- does not import any prompt builder, validator, MCP client, or narrative model
- no consumer was found under `src/`; the live story page does not currently import this module

#### Architectural observations

This file looks like a reusable streaming UI utility that was built ahead of integration, but the current application does not route its real story streaming flow through it.

There is also a protocol mismatch with the live continuation route:

- `SSEStreamingText` assumes a browser `EventSource`, which is a `GET`-style SSE consumption pattern
- `src/app/api/stories/[id]/stream-continue/route.ts` is consumed by `fetch(..., { method: 'POST' })` plus `ReadableStream.getReader()`
- `SSEStreamingText` expects `{ type, content }` style events
- the live continuation route emits chunk objects with `content` only and terminates with `[DONE]`

So even if `SSEStreamingText` were imported today, it would not plug directly into the existing story continuation flow without backend and client protocol alignment.

### `src/components/story/StoryImageDisplay.tsx`

#### Purpose

This is a client-only story asset viewer for a single segment. It fetches image metadata for a `segmentId` and renders one or more image cards with type labels and descriptions.

It is clearly intended to support story illustration features such as:

- scene art
- character images
- object images
- general illustrations

#### Exports

- default export: `StoryImageDisplay`

There are no named exports.

The local interfaces are not exported:

- `ImageMetadata`
- `StoryImageDisplayProps`

#### Internal structure and key behaviors

State:

- `images`
- `loading`
- `error`

Effects and helpers:

- `useEffect` with local `fetchImages()`
  - fetches `/api/images?segmentId=${segmentId}`
  - reads JSON
  - expects a payload with `success` and `images`
  - updates state based on success or failure
- `getTypeIcon(type)`
  - maps `illustration | scene | character | object` to emoji labels
- `getTypeText(type)`
  - maps the same image type union to Chinese labels

Render modes:

- loading placeholder
- error state
- empty state
- image list with:
  - `next/image`
  - per-image type badge
  - optional description block
  - width/height metadata display

#### Dependencies

External imports:

- `react`
  - `useState`
  - `useEffect`
- `next/image`

Browser and platform dependencies:

- `fetch`

Runtime backend dependency:

- `GET /api/images?segmentId=...`

Local data contract:

- `ImageMetadata`
  - `id`
  - `url`
  - `description?`
  - `type: 'illustration' | 'scene' | 'character' | 'object'`
  - `width`
  - `height`
  - `alt?`

Styling dependencies:

- utility classes for loading, empty, error, card, and badge states

#### Important non-dependencies

- does not import `src/types/story.ts`
- does not import `src/lib/simple-db.ts`
- does not import any image-generation service or shared media model
- no consumer was found under `src/`; `src/app/story/[id]/page.tsx` does not currently render this component

#### Architectural observations

This component depends on a richer image metadata shape than the live persistence layer currently provides.

Current contract drift:

- `StoryImageDisplay` expects full metadata objects with `type`, `width`, `height`, `description`, and `alt`
- `src/types/story.ts` only models `StorySegment.imageUrls: string[]`
- `src/lib/simple-db.ts` also stores only `imageUrls: string[]`
- `README.md` documents an `imageMetadata?` shape, but that field is not present in the runtime store types
- `src/app/api/images/route.ts` is still a stub that returns a single mocked placeholder image

So this component is not backed by a stable end-to-end image data model yet. It is effectively a prototype UI for a future richer media layer.

There is also a rendering risk in the current implementation:

- `next/image` is used with `fill`
- the parent container only sets `maxWidth` and `maxHeight`
- there is no explicit intrinsic layout box or aspect-ratio wrapper

That means the component is relying on layout behavior that may not produce a reliable render box in all cases.

The error fallback also mutates DOM with `target.parentElement!.innerHTML = ...`, which bypasses React's normal rendering path and makes this component harder to evolve safely.

## Architecture overview

### What `src/components/` currently is

In the current codebase, `src/components/` is a very small collection of client-side presentation helpers, not the authoritative UI layer for the live story feature.

The directory contains two isolated component groups:

- text-stream presentation in `StreamingText.tsx`
- segment-image display in `story/StoryImageDisplay.tsx`


exec
/usr/bin/zsh -lc "sed -n '260,520p' Docs/researches/src_components_research.md" in /home/pjlab/fbh/fbh_project/gushi
 succeeded in 0ms:

They do not import each other, share no local types, and have no common state or composition layer.

### How these components relate to the live app

The active story experience is implemented in `src/app/story/[id]/page.tsx`, but that page does not use either component:

- it implements continuation streaming inline with `fetch()` plus `ReadableStream` parsing
- it renders plain segment text directly
- it does not mount `StoryImageDisplay` for `segment.imageUrls`

So the live story route bypasses the components folder instead of being composed from it.

### Effective layering

Current effective flow:

1. Story UI in `src/app/story/[id]/page.tsx`
2. API routes in `src/app/api/stories/[id]/*`
3. JSON-backed persistence in `src/lib/simple-db.ts`

`src/components/` is mostly off to the side of that runtime path.

### Type and contract drift

This directory also exposes a broader architecture issue: UI contracts are being defined locally instead of centrally.

Examples:

- `StoryImageDisplay` defines its own `ImageMetadata` interface
- `StreamingText` defines all of its own props locally
- `src/app/story/[id]/page.tsx` defines route-local `Story`, `StorySegment`, and `StoryBranch` interfaces
- `src/types/story.ts` exists, but the component layer does not depend on it

As a result:

- image contracts differ between README, shared types, API stubs, and persistence
- streaming contracts differ between `SSEStreamingText` and the live `stream-continue` route
- the components folder does not enforce or even consume the current story-domain schema

### Architectural strengths

- the components themselves are small and easy to read
- both files are already client-safe and focused on presentation concerns
- the intended future directions are visible:
  - reusable streaming UI
  - reusable segment-image UI

### Architectural constraints

- the components are not integrated into the main story page
- local type definitions create drift instead of shared contracts
- there is no component support for structured narrative state
- there is no shared event model for streaming progress, validation, retrieval, or citations
- the image path is backed by placeholder API responses rather than real persisted metadata

## ChronosMirror upgrade gaps

ChronosMirror needs stronger narrative-state rendering than this component layer currently offers. The biggest issue here is not that these files are too small; it is that they only accept raw text and ad hoc image metadata, while ChronosMirror needs structured history-aware state.

### 1. Character modeling gap

Current state:

- no component in `src/components/` accepts a structured character object
- `StoryImageDisplay` includes a `type: 'character'` image label, but that only changes the badge text and emoji
- `StreamingText`, `MultiStreamingText`, and `SSEStreamingText` only render strings
- there is no UI primitive for:
  - character identity
  - role or allegiance
  - motivation
  - speech style
  - emotional state
  - evolving relationships
- `src/types/story.ts` includes `ContinueStoryRequest.characters?: string[]`, but this component layer has no way to surface richer character context even if the backend started sending it

Why this blocks ChronosMirror:

- character consistency would remain hidden in prompts instead of visible in the UI state
- the reader cannot see why a branch is plausible for a given character
- the UI cannot distinguish narrator prose from character voice or relationship changes

What the component layer needs:

- shared `CharacterCard` and `CharacterStatePanel` components
- segment-level cast summaries
- relationship chips or graph fragments
- speaker-aware or POV-aware text rendering
- typed props for character snapshots and diffs rather than raw arrays of names

### 2. Timeline validation gap

Current state:

- no component renders canonical dates, eras, locations, or source events
- no component can display validation warnings, contradictions, or confidence levels
- `StreamingText` only reveals prose; it has no support for interleaving structured timeline metadata
- `StoryImageDisplay` shows image labels and dimensions only; it does not tie an image to a validated historical event or moment

Why this blocks ChronosMirror:

- a historically invalid continuation would look identical to a valid one at the component layer
- validation results would have nowhere obvious to render
- the app has a visual timeline style, but not a semantic timeline UI

What the component layer needs:

- event cards or chronology rows
- validation badges and contradiction callouts
- date/location metadata surfaces on segments and images
- props such as:
  - `historicalDate`
  - `location`
  - `canonicalEventId`
  - `validationStatus`
  - `warnings[]`

### 3. MCP Wikipedia gap

Current state:

- no component in this directory shows citations, provenance, or retrieved facts
- `SSEStreamingText` handles only content-completion-error style events
- no component can render retrieval progress such as:
  - query issued
  - source matched
  - facts extracted
  - citations attached
- no file imports an MCP client, retrieval hook, or source model

Why this blocks ChronosMirror:

- even if the backend starts calling Wikipedia through MCP, the UI still cannot show which claims were grounded
- fact-checking would remain opaque to users
- historical trust signals would be absent from both text and image presentation

What the component layer needs:

- source badges and citation drawers
- retrieved-fact panels
- inline provenance markers next to generated text
- a streaming event model that can represent retrieval and verification phases, not just text chunks

### 4. Pacing control gap

Current state:

- `StreamingText.speed` controls typing animation speed
- `MultiStreamingText.delayBetween` controls UI delay between strings
- those are presentation effects, not narrative pacing controls
- there is no component for:
  - beat planning
  - scene intensity
  - director mode
  - pause-and-review generation steps
  - branch tempo or escalation tracking

Why this blocks ChronosMirror:

- a slower cursor is not the same thing as better pacing
- the component layer has no place to expose scene plans, beat budgets, or controlled generation stages
- readers and operators cannot inspect or steer narrative rhythm

What the component layer needs:

- director-mode control surfaces
- beat and scene progression UI
- stepwise generation panels for outline, validation, citation, revision, and final prose
- typed pacing metadata passed with segments and stream events

## Summary

`src/components/` currently contains only two small client-side modules:

- a generic text-streaming utility file
- a segment-image display component backed by a placeholder image API

Neither file is part of the live story page's main rendering path, and neither one is connected to shared domain types for characters, validated timelines, citations, or pacing plans.

For ChronosMirror, this directory should evolve from a set of isolated UI helpers into a typed presentation layer that can consume structured narrative state from upgraded APIs and storage. Until that happens, the components layer will remain too narrow for:

- character persona modeling
- timeline validation display
- MCP Wikipedia provenance
- true pacing and director-mode control

diff --git a/Docs/researches/src_components_research.md b/Docs/researches/src_components_research.md
new file mode 100644
index 0000000000000000000000000000000000000000..4b9c4125c3cc3779f3f164420aad4b06f87be7ef
--- /dev/null
+++ b/Docs/researches/src_components_research.md
@@ -0,0 +1,444 @@
+# `src/components/` Research
+
+## Scope
+
+Analyzed all source files under `src/components/`.
+
+Directory contents:
+
+- `src/components/StreamingText.tsx`
+- `src/components/story/StoryImageDisplay.tsx`
+
+There is no `index.ts`, no component-local hook layer, no context/provider module, and no shared component type module inside this directory.
+
+## File-by-file analysis
+
+### `src/components/StreamingText.tsx`
+
+#### Purpose
+
+This is a client-only text presentation module that packages three related UI behaviors:
+
+- `StreamingText`
+  - typewriter-style reveal for a single string
+- `MultiStreamingText`
+  - sequential display for an array of strings with optional progress UI and previous/next controls
+- `SSEStreamingText`
+  - streaming text display backed by a browser `EventSource`
+
+The file is generic presentation infrastructure. It does not contain story-domain rules, persistence logic, or provider integration.
+
+#### Exports
+
+- named export: `StreamingText`
+- named export: `MultiStreamingText`
+- named export: `SSEStreamingText`
+
+There is no default export.
+
+The props interfaces are local only and are not exported:
+
+- `StreamingTextProps`
+- `MultiStreamingTextProps`
+- `SSEStreamingTextProps`
+
+#### Internal structure and key behaviors
+
+`StreamingText`:
+
+- uses `useState` for `displayedText` and `isComplete`
+- uses `useRef<NodeJS.Timeout | null>` to hold the active interval
+- uses `useEffect` to:
+  - reset local state when `text` or `speed` changes
+  - create a `setInterval()` loop
+  - append one character at a time via `text.substring(0, currentIndex + 1)`
+  - call `onComplete?.()` once the full string has been revealed
+- renders:
+  - the progressively revealed text
+  - an optional blinking cursor while incomplete
+  - an optional completion marker after the reveal finishes
+
+`MultiStreamingText`:
+
+- tracks `currentTextIndex` and `allComplete`
+- delegates the actual typing effect to `StreamingText`
+- advances to the next entry from `texts[]` after `delayBetween`
+- optionally shows a progress bar and progress percentage
+- renders previous/next buttons for manual navigation
+
+Important detail:
+
+- this component only renders the current string, not the already completed history of strings
+- `allComplete` is written but not used in render output
+
+`SSEStreamingText`:
+
+- opens `new EventSource(url)` inside `useEffect`
+- parses `event.data` as JSON
+- expects event payloads with `type` values such as:
+  - `progress`
+  - `complete`
+  - `final`
+  - `error`
+- updates local `content`, `isComplete`, and `error`
+- closes the `EventSource` in the cleanup function
+
+#### Dependencies
+
+External imports:
+
+- `react`
+  - `useState`
+  - `useEffect`
+  - `useRef`
+
+Browser and platform dependencies:
+
+- `setInterval`
+- `clearInterval`
+- `setTimeout`
+- `EventSource`
+- `JSON.parse`
+- `console.error`
+
+Styling dependencies:
+
+- Tailwind-like utility classes for cursor, progress bar, buttons, and status labels
+
+Project-internal dependencies:
+
+- none
+
+#### Important non-dependencies
+
+- does not import `src/types/story.ts`
+- does not import any story route or API helper
+- does not import any prompt builder, validator, MCP client, or narrative model
+- no consumer was found under `src/`; the live story page does not currently import this module
+
+#### Architectural observations
+
+This file looks like a reusable streaming UI utility that was built ahead of integration, but the current application does not route its real story streaming flow through it.
+
+There is also a protocol mismatch with the live continuation route:
+
+- `SSEStreamingText` assumes a browser `EventSource`, which is a `GET`-style SSE consumption pattern
+- `src/app/api/stories/[id]/stream-continue/route.ts` is consumed by `fetch(..., { method: 'POST' })` plus `ReadableStream.getReader()`
+- `SSEStreamingText` expects `{ type, content }` style events
+- the live continuation route emits chunk objects with `content` only and terminates with `[DONE]`
+
+So even if `SSEStreamingText` were imported today, it would not plug directly into the existing story continuation flow without backend and client protocol alignment.
+
+### `src/components/story/StoryImageDisplay.tsx`
+
+#### Purpose
+
+This is a client-only story asset viewer for a single segment. It fetches image metadata for a `segmentId` and renders one or more image cards with type labels and descriptions.
+
+It is clearly intended to support story illustration features such as:
+
+- scene art
+- character images
+- object images
+- general illustrations
+
+#### Exports
+
+- default export: `StoryImageDisplay`
+
+There are no named exports.
+
+The local interfaces are not exported:
+
+- `ImageMetadata`
+- `StoryImageDisplayProps`
+
+#### Internal structure and key behaviors
+
+State:
+
+- `images`
+- `loading`
+- `error`
+
+Effects and helpers:
+
+- `useEffect` with local `fetchImages()`
+  - fetches `/api/images?segmentId=${segmentId}`
+  - reads JSON
+  - expects a payload with `success` and `images`
+  - updates state based on success or failure
+- `getTypeIcon(type)`
+  - maps `illustration | scene | character | object` to emoji labels
+- `getTypeText(type)`
+  - maps the same image type union to Chinese labels
+
+Render modes:
+
+- loading placeholder
+- error state
+- empty state
+- image list with:
+  - `next/image`
+  - per-image type badge
+  - optional description block
+  - width/height metadata display
+
+#### Dependencies
+
+External imports:
+
+- `react`
+  - `useState`
+  - `useEffect`
+- `next/image`
+
+Browser and platform dependencies:
+
+- `fetch`
+
+Runtime backend dependency:
+
+- `GET /api/images?segmentId=...`
+
+Local data contract:
+
+- `ImageMetadata`
+  - `id`
+  - `url`
+  - `description?`
+  - `type: 'illustration' | 'scene' | 'character' | 'object'`
+  - `width`
+  - `height`
+  - `alt?`
+
+Styling dependencies:
+
+- utility classes for loading, empty, error, card, and badge states
+
+#### Important non-dependencies
+
+- does not import `src/types/story.ts`
+- does not import `src/lib/simple-db.ts`
+- does not import any image-generation service or shared media model
+- no consumer was found under `src/`; `src/app/story/[id]/page.tsx` does not currently render this component
+
+#### Architectural observations
+
+This component depends on a richer image metadata shape than the live persistence layer currently provides.
+
+Current contract drift:
+
+- `StoryImageDisplay` expects full metadata objects with `type`, `width`, `height`, `description`, and `alt`
+- `src/types/story.ts` only models `StorySegment.imageUrls: string[]`
+- `src/lib/simple-db.ts` also stores only `imageUrls: string[]`
+- `README.md` documents an `imageMetadata?` shape, but that field is not present in the runtime store types
+- `src/app/api/images/route.ts` is still a stub that returns a single mocked placeholder image
+
+So this component is not backed by a stable end-to-end image data model yet. It is effectively a prototype UI for a future richer media layer.
+
+There is also a rendering risk in the current implementation:
+
+- `next/image` is used with `fill`
+- the parent container only sets `maxWidth` and `maxHeight`
+- there is no explicit intrinsic layout box or aspect-ratio wrapper
+
+That means the component is relying on layout behavior that may not produce a reliable render box in all cases.
+
+The error fallback also mutates DOM with `target.parentElement!.innerHTML = ...`, which bypasses React's normal rendering path and makes this component harder to evolve safely.
+
+## Architecture overview
+
+### What `src/components/` currently is
+
+In the current codebase, `src/components/` is a very small collection of client-side presentation helpers, not the authoritative UI layer for the live story feature.
+
+The directory contains two isolated component groups:
+
+- text-stream presentation in `StreamingText.tsx`
+- segment-image display in `story/StoryImageDisplay.tsx`
+
+They do not import each other, share no local types, and have no common state or composition layer.
+
+### How these components relate to the live app
+
+The active story experience is implemented in `src/app/story/[id]/page.tsx`, but that page does not use either component:
+
+- it implements continuation streaming inline with `fetch()` plus `ReadableStream` parsing
+- it renders plain segment text directly
+- it does not mount `StoryImageDisplay` for `segment.imageUrls`
+
+So the live story route bypasses the components folder instead of being composed from it.
+
+### Effective layering
+
+Current effective flow:
+
+1. Story UI in `src/app/story/[id]/page.tsx`
+2. API routes in `src/app/api/stories/[id]/*`
+3. JSON-backed persistence in `src/lib/simple-db.ts`
+
+`src/components/` is mostly off to the side of that runtime path.
+
+### Type and contract drift
+
+This directory also exposes a broader architecture issue: UI contracts are being defined locally instead of centrally.
+
+Examples:
+
+- `StoryImageDisplay` defines its own `ImageMetadata` interface
+- `StreamingText` defines all of its own props locally
+- `src/app/story/[id]/page.tsx` defines route-local `Story`, `StorySegment`, and `StoryBranch` interfaces
+- `src/types/story.ts` exists, but the component layer does not depend on it
+
+As a result:
+
+- image contracts differ between README, shared types, API stubs, and persistence
+- streaming contracts differ between `SSEStreamingText` and the live `stream-continue` route
+- the components folder does not enforce or even consume the current story-domain schema
+
+### Architectural strengths
+
+- the components themselves are small and easy to read
+- both files are already client-safe and focused on presentation concerns
+- the intended future directions are visible:
+  - reusable streaming UI
+  - reusable segment-image UI
+
+### Architectural constraints
+
+- the components are not integrated into the main story page
+- local type definitions create drift instead of shared contracts
+- there is no component support for structured narrative state
+- there is no shared event model for streaming progress, validation, retrieval, or citations
+- the image path is backed by placeholder API responses rather than real persisted metadata
+
+## ChronosMirror upgrade gaps
+
+ChronosMirror needs stronger narrative-state rendering than this component layer currently offers. The biggest issue here is not that these files are too small; it is that they only accept raw text and ad hoc image metadata, while ChronosMirror needs structured history-aware state.
+
+### 1. Character modeling gap
+
+Current state:
+
+- no component in `src/components/` accepts a structured character object
+- `StoryImageDisplay` includes a `type: 'character'` image label, but that only changes the badge text and emoji
+- `StreamingText`, `MultiStreamingText`, and `SSEStreamingText` only render strings
+- there is no UI primitive for:
+  - character identity
+  - role or allegiance
+  - motivation
+  - speech style
+  - emotional state
+  - evolving relationships
+- `src/types/story.ts` includes `ContinueStoryRequest.characters?: string[]`, but this component layer has no way to surface richer character context even if the backend started sending it
+
+Why this blocks ChronosMirror:
+
+- character consistency would remain hidden in prompts instead of visible in the UI state
+- the reader cannot see why a branch is plausible for a given character
+- the UI cannot distinguish narrator prose from character voice or relationship changes
+
+What the component layer needs:
+
+- shared `CharacterCard` and `CharacterStatePanel` components
+- segment-level cast summaries
+- relationship chips or graph fragments
+- speaker-aware or POV-aware text rendering
+- typed props for character snapshots and diffs rather than raw arrays of names
+
+### 2. Timeline validation gap
+
+Current state:
+
+- no component renders canonical dates, eras, locations, or source events
+- no component can display validation warnings, contradictions, or confidence levels
+- `StreamingText` only reveals prose; it has no support for interleaving structured timeline metadata
+- `StoryImageDisplay` shows image labels and dimensions only; it does not tie an image to a validated historical event or moment
+
+Why this blocks ChronosMirror:
+
+- a historically invalid continuation would look identical to a valid one at the component layer
+- validation results would have nowhere obvious to render
+- the app has a visual timeline style, but not a semantic timeline UI
+
+What the component layer needs:
+
+- event cards or chronology rows
+- validation badges and contradiction callouts
+- date/location metadata surfaces on segments and images
+- props such as:
+  - `historicalDate`
+  - `location`
+  - `canonicalEventId`
+  - `validationStatus`
+  - `warnings[]`
+
+### 3. MCP Wikipedia gap
+
+Current state:
+
+- no component in this directory shows citations, provenance, or retrieved facts
+- `SSEStreamingText` handles only content-completion-error style events
+- no component can render retrieval progress such as:
+  - query issued
+  - source matched
+  - facts extracted
+  - citations attached
+- no file imports an MCP client, retrieval hook, or source model
+
+Why this blocks ChronosMirror:
+
+- even if the backend starts calling Wikipedia through MCP, the UI still cannot show which claims were grounded
+- fact-checking would remain opaque to users
+- historical trust signals would be absent from both text and image presentation
+
+What the component layer needs:
+
+- source badges and citation drawers
+- retrieved-fact panels
+- inline provenance markers next to generated text
+- a streaming event model that can represent retrieval and verification phases, not just text chunks
+
+### 4. Pacing control gap
+
+Current state:
+
+- `StreamingText.speed` controls typing animation speed
+- `MultiStreamingText.delayBetween` controls UI delay between strings
+- those are presentation effects, not narrative pacing controls
+- there is no component for:
+  - beat planning
+  - scene intensity
+  - director mode
+  - pause-and-review generation steps
+  - branch tempo or escalation tracking
+
+Why this blocks ChronosMirror:
+
+- a slower cursor is not the same thing as better pacing
+- the component layer has no place to expose scene plans, beat budgets, or controlled generation stages
+- readers and operators cannot inspect or steer narrative rhythm
+
+What the component layer needs:
+
+- director-mode control surfaces
+- beat and scene progression UI
+- stepwise generation panels for outline, validation, citation, revision, and final prose
+- typed pacing metadata passed with segments and stream events
+
+## Summary
+
+`src/components/` currently contains only two small client-side modules:
+
+- a generic text-streaming utility file
+- a segment-image display component backed by a placeholder image API
+
+Neither file is part of the live story page's main rendering path, and neither one is connected to shared domain types for characters, validated timelines, citations, or pacing plans.
+
+For ChronosMirror, this directory should evolve from a set of isolated UI helpers into a typed presentation layer that can consume structured narrative state from upgraded APIs and storage. Until that happens, the components layer will remain too narrow for:
+
+- character persona modeling
+- timeline validation display
+- MCP Wikipedia provenance
+- true pacing and director-mode control

  ✓ Inspect src/components files and trace their consumers/dependencies
  ✓ Synthesize per-file analysis, architecture overview, and ChronosMirror upgrade gaps
  ✓ Write Docs/researches/src_components_research.md and verify contents
diff --git a/Docs/researches/src_components_research.md b/Docs/researches/src_components_research.md
new file mode 100644
index 0000000000000000000000000000000000000000..4b9c4125c3cc3779f3f164420aad4b06f87be7ef
--- /dev/null
+++ b/Docs/researches/src_components_research.md
@@ -0,0 +1,444 @@
+# `src/components/` Research
+
+## Scope
+
+Analyzed all source files under `src/components/`.
+
+Directory contents:
+
+- `src/components/StreamingText.tsx`
+- `src/components/story/StoryImageDisplay.tsx`
+
+There is no `index.ts`, no component-local hook layer, no context/provider module, and no shared component type module inside this directory.
+
+## File-by-file analysis
+
+### `src/components/StreamingText.tsx`
+
+#### Purpose
+
+This is a client-only text presentation module that packages three related UI behaviors:
+
+- `StreamingText`
+  - typewriter-style reveal for a single string
+- `MultiStreamingText`
+  - sequential display for an array of strings with optional progress UI and previous/next controls
+- `SSEStreamingText`
+  - streaming text display backed by a browser `EventSource`
+
+The file is generic presentation infrastructure. It does not contain story-domain rules, persistence logic, or provider integration.
+
+#### Exports
+
+- named export: `StreamingText`
+- named export: `MultiStreamingText`
+- named export: `SSEStreamingText`
+
+There is no default export.
+
+The props interfaces are local only and are not exported:
+
+- `StreamingTextProps`
+- `MultiStreamingTextProps`
+- `SSEStreamingTextProps`
+
+#### Internal structure and key behaviors
+
+`StreamingText`:
+
+- uses `useState` for `displayedText` and `isComplete`
+- uses `useRef<NodeJS.Timeout | null>` to hold the active interval
+- uses `useEffect` to:
+  - reset local state when `text` or `speed` changes
+  - create a `setInterval()` loop
+  - append one character at a time via `text.substring(0, currentIndex + 1)`
+  - call `onComplete?.()` once the full string has been revealed
+- renders:
+  - the progressively revealed text
+  - an optional blinking cursor while incomplete
+  - an optional completion marker after the reveal finishes
+
+`MultiStreamingText`:
+
+- tracks `currentTextIndex` and `allComplete`
+- delegates the actual typing effect to `StreamingText`
+- advances to the next entry from `texts[]` after `delayBetween`
+- optionally shows a progress bar and progress percentage
+- renders previous/next buttons for manual navigation
+
+Important detail:
+
+- this component only renders the current string, not the already completed history of strings
+- `allComplete` is written but not used in render output
+
+`SSEStreamingText`:
+
+- opens `new EventSource(url)` inside `useEffect`
+- parses `event.data` as JSON
+- expects event payloads with `type` values such as:
+  - `progress`
+  - `complete`
+  - `final`
+  - `error`
+- updates local `content`, `isComplete`, and `error`
+- closes the `EventSource` in the cleanup function
+
+#### Dependencies
+
+External imports:
+
+- `react`
+  - `useState`
+  - `useEffect`
+  - `useRef`
+
+Browser and platform dependencies:
+
+- `setInterval`
+- `clearInterval`
+- `setTimeout`
+- `EventSource`
+- `JSON.parse`
+- `console.error`
+
+Styling dependencies:
+
+- Tailwind-like utility classes for cursor, progress bar, buttons, and status labels
+
+Project-internal dependencies:
+
+- none
+
+#### Important non-dependencies
+
+- does not import `src/types/story.ts`
+- does not import any story route or API helper
+- does not import any prompt builder, validator, MCP client, or narrative model
+- no consumer was found under `src/`; the live story page does not currently import this module
+
+#### Architectural observations
+
+This file looks like a reusable streaming UI utility that was built ahead of integration, but the current application does not route its real story streaming flow through it.
+
+There is also a protocol mismatch with the live continuation route:
+
+- `SSEStreamingText` assumes a browser `EventSource`, which is a `GET`-style SSE consumption pattern
+- `src/app/api/stories/[id]/stream-continue/route.ts` is consumed by `fetch(..., { method: 'POST' })` plus `ReadableStream.getReader()`
+- `SSEStreamingText` expects `{ type, content }` style events
+- the live continuation route emits chunk objects with `content` only and terminates with `[DONE]`
+
+So even if `SSEStreamingText` were imported today, it would not plug directly into the existing story continuation flow without backend and client protocol alignment.
+
+### `src/components/story/StoryImageDisplay.tsx`
+
+#### Purpose
+
+This is a client-only story asset viewer for a single segment. It fetches image metadata for a `segmentId` and renders one or more image cards with type labels and descriptions.
+
+It is clearly intended to support story illustration features such as:
+
+- scene art
+- character images
+- object images
+- general illustrations
+
+#### Exports
+
+- default export: `StoryImageDisplay`
+
+There are no named exports.
+
+The local interfaces are not exported:
+
+- `ImageMetadata`
+- `StoryImageDisplayProps`
+
+#### Internal structure and key behaviors
+
+State:
+
+- `images`
+- `loading`
+- `error`
+
+Effects and helpers:
+
+- `useEffect` with local `fetchImages()`
+  - fetches `/api/images?segmentId=${segmentId}`
+  - reads JSON
+  - expects a payload with `success` and `images`
+  - updates state based on success or failure
+- `getTypeIcon(type)`
+  - maps `illustration | scene | character | object` to emoji labels
+- `getTypeText(type)`
+  - maps the same image type union to Chinese labels
+
+Render modes:
+
+- loading placeholder
+- error state
+- empty state
+- image list with:
+  - `next/image`
+  - per-image type badge
+  - optional description block
+  - width/height metadata display
+
+#### Dependencies
+
+External imports:
+
+- `react`
+  - `useState`
+  - `useEffect`
+- `next/image`
+
+Browser and platform dependencies:
+
+- `fetch`
+
+Runtime backend dependency:
+
+- `GET /api/images?segmentId=...`
+
+Local data contract:
+
+- `ImageMetadata`
+  - `id`
+  - `url`
+  - `description?`
+  - `type: 'illustration' | 'scene' | 'character' | 'object'`
+  - `width`
+  - `height`
+  - `alt?`
+
+Styling dependencies:
+
+- utility classes for loading, empty, error, card, and badge states
+
+#### Important non-dependencies
+
+- does not import `src/types/story.ts`
+- does not import `src/lib/simple-db.ts`
+- does not import any image-generation service or shared media model
+- no consumer was found under `src/`; `src/app/story/[id]/page.tsx` does not currently render this component
+
+#### Architectural observations
+
+This component depends on a richer image metadata shape than the live persistence layer currently provides.
+
+Current contract drift:
+
+- `StoryImageDisplay` expects full metadata objects with `type`, `width`, `height`, `description`, and `alt`
+- `src/types/story.ts` only models `StorySegment.imageUrls: string[]`
+- `src/lib/simple-db.ts` also stores only `imageUrls: string[]`
+- `README.md` documents an `imageMetadata?` shape, but that field is not present in the runtime store types
+- `src/app/api/images/route.ts` is still a stub that returns a single mocked placeholder image
+
+So this component is not backed by a stable end-to-end image data model yet. It is effectively a prototype UI for a future richer media layer.
+
+There is also a rendering risk in the current implementation:
+
+- `next/image` is used with `fill`
+- the parent container only sets `maxWidth` and `maxHeight`
+- there is no explicit intrinsic layout box or aspect-ratio wrapper
+
+That means the component is relying on layout behavior that may not produce a reliable render box in all cases.
+
+The error fallback also mutates DOM with `target.parentElement!.innerHTML = ...`, which bypasses React's normal rendering path and makes this component harder to evolve safely.
+
+## Architecture overview
+
+### What `src/components/` currently is
+
+In the current codebase, `src/components/` is a very small collection of client-side presentation helpers, not the authoritative UI layer for the live story feature.
+
+The directory contains two isolated component groups:
+
+- text-stream presentation in `StreamingText.tsx`
+- segment-image display in `story/StoryImageDisplay.tsx`
+
+They do not import each other, share no local types, and have no common state or composition layer.
+
+### How these components relate to the live app
+
+The active story experience is implemented in `src/app/story/[id]/page.tsx`, but that page does not use either component:
+
+- it implements continuation streaming inline with `fetch()` plus `ReadableStream` parsing
+- it renders plain segment text directly
+- it does not mount `StoryImageDisplay` for `segment.imageUrls`
+
+So the live story route bypasses the components folder instead of being composed from it.
+
+### Effective layering
+
+Current effective flow:
+
+1. Story UI in `src/app/story/[id]/page.tsx`
+2. API routes in `src/app/api/stories/[id]/*`
+3. JSON-backed persistence in `src/lib/simple-db.ts`
+
+`src/components/` is mostly off to the side of that runtime path.
+
+### Type and contract drift
+
+This directory also exposes a broader architecture issue: UI contracts are being defined locally instead of centrally.
+
+Examples:
+
+- `StoryImageDisplay` defines its own `ImageMetadata` interface
+- `StreamingText` defines all of its own props locally
+- `src/app/story/[id]/page.tsx` defines route-local `Story`, `StorySegment`, and `StoryBranch` interfaces
+- `src/types/story.ts` exists, but the component layer does not depend on it
+
+As a result:
+
+- image contracts differ between README, shared types, API stubs, and persistence
+- streaming contracts differ between `SSEStreamingText` and the live `stream-continue` route
+- the components folder does not enforce or even consume the current story-domain schema
+
+### Architectural strengths
+
+- the components themselves are small and easy to read
+- both files are already client-safe and focused on presentation concerns
+- the intended future directions are visible:
+  - reusable streaming UI
+  - reusable segment-image UI
+
+### Architectural constraints
+
+- the components are not integrated into the main story page
+- local type definitions create drift instead of shared contracts
+- there is no component support for structured narrative state
+- there is no shared event model for streaming progress, validation, retrieval, or citations
+- the image path is backed by placeholder API responses rather than real persisted metadata
+
+## ChronosMirror upgrade gaps
+
+ChronosMirror needs stronger narrative-state rendering than this component layer currently offers. The biggest issue here is not that these files are too small; it is that they only accept raw text and ad hoc image metadata, while ChronosMirror needs structured history-aware state.
+
+### 1. Character modeling gap
+
+Current state:
+
+- no component in `src/components/` accepts a structured character object
+- `StoryImageDisplay` includes a `type: 'character'` image label, but that only changes the badge text and emoji
+- `StreamingText`, `MultiStreamingText`, and `SSEStreamingText` only render strings
+- there is no UI primitive for:
+  - character identity
+  - role or allegiance
+  - motivation
+  - speech style
+  - emotional state
+  - evolving relationships
+- `src/types/story.ts` includes `ContinueStoryRequest.characters?: string[]`, but this component layer has no way to surface richer character context even if the backend started sending it
+
+Why this blocks ChronosMirror:
+
+- character consistency would remain hidden in prompts instead of visible in the UI state
+- the reader cannot see why a branch is plausible for a given character
+- the UI cannot distinguish narrator prose from character voice or relationship changes
+
+What the component layer needs:
+
+- shared `CharacterCard` and `CharacterStatePanel` components
+- segment-level cast summaries
+- relationship chips or graph fragments
+- speaker-aware or POV-aware text rendering
+- typed props for character snapshots and diffs rather than raw arrays of names
+
+### 2. Timeline validation gap
+
+Current state:
+
+- no component renders canonical dates, eras, locations, or source events
+- no component can display validation warnings, contradictions, or confidence levels
+- `StreamingText` only reveals prose; it has no support for interleaving structured timeline metadata
+- `StoryImageDisplay` shows image labels and dimensions only; it does not tie an image to a validated historical event or moment
+
+Why this blocks ChronosMirror:
+
+- a historically invalid continuation would look identical to a valid one at the component layer
+- validation results would have nowhere obvious to render
+- the app has a visual timeline style, but not a semantic timeline UI
+
+What the component layer needs:
+
+- event cards or chronology rows
+- validation badges and contradiction callouts
+- date/location metadata surfaces on segments and images
+- props such as:
+  - `historicalDate`
+  - `location`
+  - `canonicalEventId`
+  - `validationStatus`
+  - `warnings[]`
+
+### 3. MCP Wikipedia gap
+
+Current state:
+
+- no component in this directory shows citations, provenance, or retrieved facts
+- `SSEStreamingText` handles only content-completion-error style events
+- no component can render retrieval progress such as:
+  - query issued
+  - source matched
+  - facts extracted
+  - citations attached
+- no file imports an MCP client, retrieval hook, or source model
+
+Why this blocks ChronosMirror:
+
+- even if the backend starts calling Wikipedia through MCP, the UI still cannot show which claims were grounded
+- fact-checking would remain opaque to users
+- historical trust signals would be absent from both text and image presentation
+
+What the component layer needs:
+
+- source badges and citation drawers
+- retrieved-fact panels
+- inline provenance markers next to generated text
+- a streaming event model that can represent retrieval and verification phases, not just text chunks
+
+### 4. Pacing control gap
+
+Current state:
+
+- `StreamingText.speed` controls typing animation speed
+- `MultiStreamingText.delayBetween` controls UI delay between strings
+- those are presentation effects, not narrative pacing controls
+- there is no component for:
+  - beat planning
+  - scene intensity
+  - director mode
+  - pause-and-review generation steps
+  - branch tempo or escalation tracking
+
+Why this blocks ChronosMirror:
+
+- a slower cursor is not the same thing as better pacing
+- the component layer has no place to expose scene plans, beat budgets, or controlled generation stages
+- readers and operators cannot inspect or steer narrative rhythm
+
+What the component layer needs:
+
+- director-mode control surfaces
+- beat and scene progression UI
+- stepwise generation panels for outline, validation, citation, revision, and final prose
+- typed pacing metadata passed with segments and stream events
+
+## Summary
+
+`src/components/` currently contains only two small client-side modules:
+
+- a generic text-streaming utility file
+- a segment-image display component backed by a placeholder image API
+
+Neither file is part of the live story page's main rendering path, and neither one is connected to shared domain types for characters, validated timelines, citations, or pacing plans.
+
+For ChronosMirror, this directory should evolve from a set of isolated UI helpers into a typed presentation layer that can consume structured narrative state from upgraded APIs and storage. Until that happens, the components layer will remain too narrow for:
+
+- character persona modeling
+- timeline validation display
+- MCP Wikipedia provenance
+- true pacing and director-mode control

