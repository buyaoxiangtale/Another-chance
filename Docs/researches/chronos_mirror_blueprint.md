# ChronosMirror (时空镜像) — 执行蓝图

> 交互式叙事与出版引擎 — 纯文本 + MCP 维基百科集成

## 项目概述

将现有的"古事"故事分叉平台升级为 ChronosMirror 交互式叙事引擎，新增角色深度建模、时间轴校验、MCP 维基百科事实锚定、节奏步进控制和导演模式。

## 执行检查清单

### Cluster 1: 数据模型与类型系统

- [x] 1.1 在 `src/types/story.ts` 中新增 `Character` 类型（name, era, role, traits[], speechPatterns, relationships[], stateHistory[], coreMotivation）
- [x] 1.2 在 `src/types/story.ts` 中新增 `TimelineEvent` 类型（era, year, season, description, narrativeTime）
- [x] 1.3 在 `src/types/story.ts` 中新增 `HistoricalReference` 类型（entityType, name, wikiUrl, wikiSummary, confidence, verifiedAt）
- [x] 1.4 在 `src/types/story.ts` 中新增 `PacingConfig` 类型（pace, mood, estimatedReadMinutes, maxLinesPerStep）
- [x] 1.5 在 `src/types/story.ts` 中扩展 `StorySegment` 增加 timeline?, characterIds[], historicalReferences[], narrativePace?, mood?
- [x] 1.6 在 `src/types/story.ts` 中扩展 `Story` 增加 era?, genre?, characterIds[]
- [x] 1.7 在 `src/types/story.ts` 中扩展 `StoryBranch` 增加 characterStateSnapshot?, forkTimeline?
- [x] 1.8 在 `src/types/story.ts` 中扩展 `ContinueStoryRequest` 增加 pacingConfig?, directorOverrides?
- [x] 1.9 在 `src/types/story.ts` 中新增 `DirectorState` 类型（characterStates, worldVariables, activeConstraints[]）
- [x] 1.10 更新 `prisma/schema.prisma` 新增 Character, HistoricalReference, PacingConfig 模型，扩展 StorySegment 和 Story 模型

### Cluster 2: 角色深度建模引擎

- [x] 2.1 创建 `src/lib/character-engine.ts` — CharacterManager 类：CRUD 操作、状态管理
- [x] 2.2 实现 `getCharacterContext(storyId, branchId, segmentId)` — 获取当前段落的角色上下文（活跃角色列表、状态、关系）
- [x] 2.3 实现 `updateCharacterState(characterId, segmentId, newState)` — 记录角色状态变化
- [x] 2.4 实现 `getRelationshipGraph(storyId, branchId)` — 返回角色关系网（谁和谁是什么关系、当前关系强度）
- [x] 2.5 实现 `buildCharacterPrompt(characterIds, segmentChain)` — 将角色信息格式化为 AI prompt 片段（含口癖、动机、当前状态）
- [x] 2.6 实现 `snapshotCharacterStates(storyId, branchId, segmentId)` — 分叉时保存角色状态快照
- [x] 2.7 实现 `restoreCharacterStates(snapshot)` — 切换分支时恢复角色状态
- [x] 2.8 新增 `src/app/api/stories/[id]/characters/route.ts` — 角色管理 API（GET 列表、POST 创建、PATCH 更新）
- [x] 2.9 新增 `src/app/api/characters/[id]/route.ts` — 单角色操作 API（GET 详情、DELETE 删除）

### Cluster 3: 时间轴与世界观数据

- [x] 3.1 创建 `src/lib/timeline-engine.ts` — TimelineEngine 类：时间轴管理
- [x] 3.2 实现 `validateTimeline(storyId, branchId)` — 校验段落链的时间单调性，返回违规列表
- [x] 3.3 实现 `getTimelineContext(storyId, branchId, currentSegmentId)` — 获取当前时间点附近的历史事件列表
- [x] 3.4 创建 `src/lib/lorebook.ts` — Lorebook（设定集）管理器：社会制度、官职体系、礼仪规则
- [x] 3.5 实现 `getLorebookEntries(era, topics[])` — 按朝代和主题查询设定条目
- [x] 3.6 创建预设数据 `data/lorebook.json` — 秦朝相关设定（法家逻辑、官职体系、礼仪制度、器物规格）
- [x] 3.7 实现 `buildTimelinePrompt(timeline, lorebook)` — 将时间轴和世界观信息格式化为 AI prompt 片段
- [x] 3.8 新增 `src/app/api/stories/[id]/timeline/route.ts` — 时间轴 API（GET 时间轴、POST 修正）
- [x] 3.9 新增 `src/app/api/lorebook/route.ts` — 设定集 API（GET 查询、POST 新增条目）

### Cluster 4: MCP 维基百科集成与 RAG 知识引擎

- [x] 4.1 创建 `src/lib/mcp-wikipedia.ts` — MCP 客户端封装，通过 Wikipedia API 实时检索历史事实
- [x] 4.2 实现 `searchWikipedia(query, lang?)` — 搜索维基百科文章，返回标题、摘要、URL
- [x] 4.3 实现 `getWikiArticle(title)` — 获取完整维基百科文章内容
- [x] 4.4 实现 `extractHistoricalEntities(text)` — 从文本中提取历史实体（人名、地名、事件名、器物名）
- [x] 4.5 实现 `factCheckEntities(entities, era)` — 批量查询实体的历史准确性，返回事实锚点列表
- [x] 4.6 创建 `src/lib/knowledge-cache.ts` — 知识缓存层：本地 JSON 缓存已查询的维基百科内容，避免重复查询
- [x] 4.7 实现 `enrichPromptWithFacts(prompt, entities)` — 在 AI prompt 中注入事实锚点（"秦始皇，公元前259-210年，秦朝开国皇帝..."）
- [x] 4.8 新增 `src/app/api/knowledge/search/route.ts` — 知识检索 API（GET 搜索、GET 文章详情）
- [x] 4.9 新增 `src/app/api/knowledge/factcheck/route.ts` — 事实校验 API（POST 文本，返回校验结果和修正建议）

### Cluster 5: 节奏控制与导演模式

- [x] 5.1 改造 `src/app/api/stories/[id]/continue/route.ts` — 支持 pacingConfig 参数（行数控制、节奏模式）
- [x] 5.2 改造 `src/app/api/stories/[id]/stream-continue/route.ts` — 支持按行流式输出（每行一个 SSE 事件），支持暂停指令
- [x] 5.3 创建 `src/lib/pacing-engine.ts` — PacingEngine：根据节奏配置控制 AI 生成体量（RUSH=50字/DETAILED=300字/PAUSE=100字/SUMMARY=200字）
- [x] 5.4 实现行级步进生成：AI 生成完整内容后，按语义分段（句号/换行），每次只推送 1-N 行
- [x] 5.5 实现 SSE 消息格式扩展：新增 `pause` 事件类型（用户可暂停生成）、`line` 事件（单行内容）、`metadata` 事件（当前角色/时间/节奏信息）
- [x] 5.6 新增 `src/app/api/stories/[id]/director/route.ts` — 导演模式 API（GET 当前状态、PATCH 修改角色状态/世界变量）
- [x] 5.7 实现 `DirectorState` 持久化：将导演状态存储在 simple-db 中，与 storyId 关联
- [x] 5.8 改造 AI prompt 构建：集成角色上下文 + 时间轴 + Lorebook + 维基事实锚点 + 导演覆盖

### Cluster 6: 前端页面升级

- [x] 6.1 创建 `src/components/CharacterPanel.tsx` — 侧边栏角色面板：显示角色列表、状态、关系网
- [x] 6.2 创建 `src/components/TimelineBar.tsx` — 时间轴可视化组件：显示段落的时间分布
- [x] 6.3 创建 `src/components/DirectorSidebar.tsx` — 导演模式侧边栏：查看/修改角色心理状态和世界观变量
- [x] 6.4 创建 `src/components/PacingControls.tsx` — 节奏控制组件：行数滑块、暂停/继续按钮、节奏模式选择
- [x] 6.5 改造 `src/app/story/[id]/page.tsx` — 集成角色面板、时间轴、导演侧边栏、节奏控制
- [x] 6.6 改造流式文本展示 — 支持行级步进显示、暂停/继续、显示每行的元数据（角色、时间、节奏）
- [x] 6.7 改造 `src/app/story/[id]/page.tsx` 的分支对话框 — 动态生成预设方向（基于当前角色和历史上下文）
- [x] 6.8 优化 `src/app/page.tsx` — 修复 N+1 请求问题，显示故事的角色数和时代标签
- [x] 6.9 改造 `src/app/create/page.tsx` — 支持选择朝代/时代、初始角色设定

### Cluster 7: 数据迁移与种子数据

- [x] 7.1 更新 `src/lib/simple-db.ts` — 新增 charactersStore, historicalReferencesStore, lorebookStore, directorStatesStore
- [x] 7.2 编写迁移脚本 `scripts/migrate-chronosmirror.js` — 为现有故事添加 era、genre 字段，创建默认角色
- [x] 7.3 更新 `seed.js` — 为预置故事（荆轲刺秦、赤壁之战、玄武门之变）添加完整角色数据、时间轴事件、Lorebook 条目
- [x] 7.4 为荆轲刺秦王创建角色：荆轲、秦王嬴政、燕太子丹、樊於期、蒙嘉、夏无且（含口癖、动机、关系）
- [x] 7.5 为荆轲刺秦王创建时间轴：公元前228年-227年关键事件（燕太子丹质秦归国→田光荐荆轲→图穷匕见）
- [x] 7.6 为赤壁之战创建角色和故事时间轴
- [x] 7.7 为玄武门之变创建角色和故事时间轴
- [x] 7.8 创建秦朝 Lorebook 数据：二十等爵制、郡县制、法家思想核心、礼仪制度、兵器规格

### Cluster 8: 验证与文档

- [x] 8.1 运行 `npx next build` 确保构建无错误
- [x] 8.2 端到端测试：创建故事 → 查看角色面板 → 续写（含角色上下文）→ 分叉（含角色快照）→ 切换分支 → 导演模式修改 → 节奏控制
- [x] 8.3 测试 MCP 维基百科集成：续写时自动检索历史实体 → 事实锚点注入 prompt → 生成内容包含历史细节
- [x] 8.4 测试时间轴校验：尝试续写时间倒流的内容 → 系统警告或自动修正
- [x] 8.5 更新 README.md — 添加 ChronosMirror 功能说明、API 文档、角色/时间轴/导演模式使用指南
