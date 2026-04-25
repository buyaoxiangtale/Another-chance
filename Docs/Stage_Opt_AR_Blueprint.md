# Stage Opt AR Blueprint — gushi 故事平台优化

Design philosophy: **Reliable context handoff, visual consistency across segments, robust character appearance tracking, fan-fiction art style fidelity.**

Generated: 2026-04-25

---

## Section A: Context Pipeline Reliability

Worker: `worker_A`

- [x] A1 Wire `EventTracker.processSegment` into `stream-continue/route.ts` and `continue/route.ts` — currently `processSegment` is never called, active events layer is always empty; the 15% token budget slot for events goes unused. Research how to integrate event extraction into the post-generation fire-and-forget pipeline, and produce a concrete patch plan for both route files. Output: `Docs/researches/Stage_Opt_AR/A1_eventtracker_integration.md`

- [x] A2 Route `context-summarizer.ts` AI calls through `ai-client.ts` queue — the summarizer uses raw `fetch()` at line ~83 instead of `callAI`/`callAIText`, bypassing priority queue, concurrency control, and retry logic. Research the refactoring needed to replace the local `callAI` function with the shared `callAIText` from `ai-client.ts`, ensuring the summarizer inherits queue/retry behavior. Output: `Docs/researches/Stage_Opt_AR/A2_summarizer_queue_integration.md`

## Section B: Character & Fact Anchoring

Worker: `worker_B`

- [x] B1 Make `enrichPromptWithFacts` work without pre-registered characters — for first-segment continuation, no characters may be registered yet, so `entities` is empty and the fact anchor prompt is useless. Research a fallback strategy: extract raw names from the current segment content (simple NER or regex) and pass those as entities even before `discoverAndRegisterCharacters` completes. Output: `Docs/researches/Stage_Opt_AR/B1_fact_anchor_fallback.md`

- [x] B2 Add structured `appearance` field to Character model — currently character appearance is stored as a `traits` array entry with `appearance:` prefix, which is fragile and depends on string matching. Research adding a dedicated `appearance` column to the `Character` Prisma model, migrating existing `traits`-prefixed data, and updating `character-engine.ts` and `image-generator.ts` to use the new field. Output: `Docs/researches/Stage_Opt_AR/B2_structured_appearance_field.md`

## Section C: Image Visual Consistency

Worker: `worker_C`

- [x] C1 Fix scene state race condition — `updateSceneState` is fire-and-forget in `stream-continue`, but `images/generate` reads scene state synchronously. The current workaround (read-empty → sync-write → re-read) is fragile. Research making scene state update `await`-able: either await `updateSceneState` before returning the stream, or use a shared cache (Redis/in-memory) with write-through guarantee. Output: `Docs/researches/Stage_Opt_AR/C1_scene_state_race_fix.md`

- [x] C2 Improve seed strategy for image diversity — currently seed is derived solely from character name hash, so same character combinations produce visually similar images across segments. Research incorporating scene content (location/action/emotion) into seed derivation, or using segment-sequence salt to ensure visual diversity while keeping character face consistency. Output: `Docs/researches/Stage_Opt_AR/C2_seed_diversity_strategy.md`

## Section D: Fanfiction Art Reference

Worker: `worker_D`

- [x] D1 Implement fanfiction IP detection and artwork search pipeline — when a story is tagged as 同人 (fanfiction), detect the source IP from genre/description, search for official artwork or iconic character art online, download and cache reference images. Research: IP detection heuristic, image search API options (Google Custom Search, Bing Image API, fandom wikia scraping), safe download and cache strategy for reference images. Output: `Docs/researches/Stage_Opt_AR/D1_fanfiction_art_search.md`

- [x] D2 Integrate reference artwork as style input to image generation — take the cached reference images from D1 and pass them as style guides to the image generation pipeline. Research: how to feed reference images into OpenAI-compatible image generation APIs (image-to-image, style transfer, or as prompt enrichment via vision model description), and update `generateImagesForSegment` to accept optional reference images. Output: `Docs/researches/Stage_Opt_AR/D2_art_reference_integration.md`
