# Research Checklist — gushi 故事平台

研究目标：深入理解项目架构，为文生图功能集成和 API Rate Limit 优化提供全面的技术上下文。

## Phase 1: API Rate Limit 防护层
- [x] 1.1 在 `src/lib/ai-client.ts` 中实现 `RetryConfig` 接口（maxRetries, baseDelay, maxDelay）
- [x] 1.2 实现 `callAIWithRetry` 函数，支持 429/5xx 指数退避重试
- [x] 1.3 实现 `AIRequestQueue` 类，支持并发控制（默认 maxConcurrent=3）和优先级队列
- [x] 1.4 添加全局 AI 请求速率计数器和间隔控制（如每分钟最多 20 次）
- [x] 1.5 添加 rate limit 事件日志（console.warn 级别）
- [x] 1.6 将 `callAI` 和 `callAIText` 改为使用队列+重试

## API 路由层
- [x] [FILE] src/app/api/characters/[id]/route.ts
- [x] [FILE] src/app/api/fandom-lorebook/route.ts
- [x] [FILE] src/app/api/images/generate/route.ts
- [x] [FILE] src/app/api/images/route.ts
- [x] [FILE] src/app/api/knowledge/factcheck/route.ts
- [x] [FILE] src/app/api/knowledge/search/route.ts
- [x] [FILE] src/app/api/lorebook/route.ts
- [x] [FILE] src/app/api/stories/[id]/branch/[branchId]/route.ts
- [ ] [FILE] src/app/api/stories/[id]/branch/route.ts
- [ ] [FILE] src/app/api/stories/[id]/characters/route.ts
- [ ] [FILE] src/app/api/stories/[id]/continue/route.ts
- [ ] [FILE] src/app/api/stories/[id]/director/route.ts
- [ ] [FILE] src/app/api/stories/[id]/route.ts
- [ ] [FILE] src/app/api/stories/[id]/segments/route.ts
- [ ] [FILE] src/app/api/stories/[id]/stream-continue/route.ts
- [ ] [FILE] src/app/api/stories/[id]/timeline/route.ts
- [ ] [FILE] src/app/api/stories/[id]/tree/route.ts
- [ ] [FILE] src/app/api/stories/route.ts

## 核心库 (lib/)
- [ ] [FILE] src/lib/ai-client.ts
- [ ] [FILE] src/lib/branch-memory.ts
- [ ] [FILE] src/lib/character-engine.ts
- [ ] [FILE] src/lib/consistency-checker.ts
- [ ] [FILE] src/lib/context-summarizer.ts
- [ ] [FILE] src/lib/director-manager.ts
- [ ] [FILE] src/lib/event-tracker.ts
- [ ] [FILE] src/lib/fandom-lorebook.ts
- [ ] [FILE] src/lib/genre-config.ts
- [ ] [FILE] src/lib/knowledge-cache.ts
- [ ] [FILE] src/lib/lorebook.ts
- [ ] [FILE] src/lib/mcp-wikipedia.ts
- [ ] [FILE] src/lib/pacing-engine.ts
- [ ] [FILE] src/lib/prompt-builder.ts
- [x] [FILE] src/lib/simple-db.ts
- [ ] [FILE] src/lib/timeline-engine.ts

## 组件层
- [ ] [FILE] src/components/CharacterPanel.tsx
- [ ] [FILE] src/components/DirectorSidebar.tsx
- [ ] [FILE] src/components/PacingControls.tsx
- [ ] [FILE] src/components/story/StoryImageDisplay.tsx
- [ ] [FILE] src/components/StreamingText.tsx
- [ ] [FILE] src/components/TimelineBar.tsx

## 类型定义
- [ ] [FILE] src/types/context-summary.ts
- [ ] [FILE] src/types/event-tracker.ts
- [x] [FILE] src/types/story.ts
