# Research Checklist — gushi 故事平台

研究目标：深入理解项目架构，为文生图功能集成和 API Rate Limit 优化提供全面的技术上下文。

## Phase 1: API Rate Limit 防护层
- [x] 1.1 在 `src/lib/ai-client.ts` 中实现 `RetryConfig` 接口（maxRetries, baseDelay, maxDelay）
- [x] 1.2 实现 `callAIWithRetry` 函数，支持 429/5xx 指数退避重试
- [x] 1.3 实现 `AIRequestQueue` 类，支持并发控制（默认 maxConcurrent=3）和优先级队列
- [x] 1.4 添加全局 AI 请求速率计数器和间隔控制（如每分钟最多 20 次）
- [x] 1.5 添加 rate limit 事件日志（console.warn 级别）
- [x] 1.6 将 `callAI` 和 `callAIText` 改为使用队列+重试

## Phase 2: 文生图核心功能
- [x] 2.1 实现真实的 `src/lib/image-generator.ts`：调用 OpenAI-compatible 图片生成 API
- [x] 2.2 实现场景描述提取器 `extractSceneDescriptions(segment)`：从段落内容提取 1-3 个场景 prompt
- [x] 2.3 添加中国历史风格的 prompt 模板（历史写实、水墨画、工笔画、敦煌壁画风格）
- [x] 2.4 实现图片生成重试和降级机制（失败返回占位图，不阻塞主流程）
- [x] 2.5 实现图片本地缓存（保存到 `public/generated-images/` 目录）

## Phase 3: 集成与 UI
- [x] 3.1 重写 `src/app/api/images/generate/route.ts` 使用真实的 `image-generator.ts`
- [x] 3.2 在 `stream-continue` 完成后异步触发图片生成（低优先级队列）
- [x] 3.3 图片生成完成后更新段落的 `imageUrls` 字段到数据库
- [x] 3.4 在 `src/app/story/[id]/page.tsx` 中为每个段落集成 `StoryImageDisplay` 组件
- [x] 3.5 添加"重新生成图片"按钮（段落操作栏）
- [x] 3.6 添加图片加载骨架屏动画

## Phase 4: 配置与测试
- [ ] 4.1 在 `.env.local.example` 中添加图片生成相关环境变量
- [ ] 4.2 验证 build 不报错（`npm run build`）
- [ ] 4.3 手动测试：续写故事 → 自动生成图片 → 图片正确展示

## API 路由层
- [x] [FILE] src/app/api/characters/[id]/route.ts
- [x] [FILE] src/app/api/fandom-lorebook/route.ts
- [x] [FILE] src/app/api/images/generate/route.ts
- [x] [FILE] src/app/api/images/route.ts
- [x] [FILE] src/app/api/knowledge/factcheck/route.ts
- [x] [FILE] src/app/api/knowledge/search/route.ts
- [x] [FILE] src/app/api/lorebook/route.ts
- [x] [FILE] src/app/api/stories/[id]/branch/[branchId]/route.ts
- [x] [FILE] src/app/api/stories/[id]/branch/route.ts
- [x] [FILE] src/app/api/stories/[id]/characters/route.ts
- [x] [FILE] src/app/api/stories/[id]/continue/route.ts
- [x] [FILE] src/app/api/stories/[id]/director/route.ts
- [x] [FILE] src/app/api/stories/[id]/route.ts
- [x] [FILE] src/app/api/stories/[id]/segments/route.ts
- [x] [FILE] src/app/api/stories/[id]/stream-continue/route.ts
- [x] [FILE] src/app/api/stories/[id]/timeline/route.ts
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
