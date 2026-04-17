# ChronosMirror — 故事上下文记忆连贯性蓝图

> 确保AI续写时正确记忆和连贯引用前文剧情、角色状态、世界观设定和历史事实

## 问题分析

当前 `prompt-builder.ts` 存在以下上下文记忆问题：

1. **前文直接拼接**：将整条 segment chain 原文拼入 prompt，长故事会超出 token 限制
2. **无摘要机制**：远处的段落没有压缩，AI 无法感知早期关键剧情
3. **角色状态传播弱**：跨分支的角色快照/恢复存在但 prompt 中缺乏"剧情记忆"
4. **无矛盾检测**：角色在段落间出现矛盾描述时不会预警
5. **无关键事件提取**：无法自动识别和保留对后续剧情有影响的事件
6. **分支记忆不完整**：切换分支后，AI 不知道其他分支发生了什么

## 执行检查清单

### Cluster 1: 上下文摘要引擎

- [x] 1.1 创建 `src/lib/context-summarizer.ts` — ContextSummarizer 类：管理段落摘要的生成、存储和检索
- [x] 1.2 实现 `generateSegmentSummary(segment, chain)` — 对单个段落生成摘要（提取关键事件、角色行动、状态变化）
- [x] 1.3 实现 `buildHierarchicalContext(chain, maxTokens)` — 分层上下文构建：最近 N 段保留全文，更早的段落用层级摘要（段→组→章）
- [x] 1.4 在 `src/lib/simple-db.ts` 新增 `summariesStore` — 存储每个 segment 的摘要和层级摘要
- [x] 1.5 实现 `updateSummariesAfterNewSegment(storyId, branchId, newSegment)` — 新段落写入后自动更新摘要链
- [x] 1.6 实现 `getContextForPrompt(chain, tokenBudget)` — 根据 token 预算返回最优上下文（最近段全文 + 中间段摘要 + 远端段压缩摘要）

### Cluster 2: 关键事件提取与追踪

- [x] 2.1 创建 `src/lib/event-tracker.ts` — EventTracker 类：从段落内容中提取和追踪关键事件
- [x] 2.2 实现 `extractKeyEvents(content, characters)` — 使用规则+AI提取关键事件（死亡、结盟、背叛、发现、战斗、情感转折等）
- [x] 2.3 实现 `getActiveEvents(storyId, branchId, currentSegmentId)` — 获取当前仍然有效的事件（未解决的冲突、进行中的情节线）
- [x] 2.4 实现 `getResolvedEvents(storyId, branchId, beforeSegmentId)` — 获取已解决的事件
- [x] 2.5 在 `src/lib/simple-db.ts` 新增 `eventsStore` — 存储关键事件（eventId, type, description, involvedCharacterIds, status, segmentId, resolvedAt?）
- [x] 2.6 实现 `buildEventPrompt(activeEvents, recentEvents)` — 将活跃事件和近期事件格式化为 prompt 片段，帮助AI保持剧情连贯

### Cluster 3: 矛盾检测引擎

- [x] 3.1 创建 `src/lib/consistency-checker.ts` — ConsistencyChecker 类：检测上下文矛盾
- [x] 3.2 实现 `checkCharacterConsistency(newContent, characterStates)` — 检测角色描述矛盾（如：已死的角色重新出现、性格突变、关系矛盾）
- [x] 3.3 实现 `checkTimelineConsistency(newContent, timeline)` — 检测时间线矛盾（如：季节错误、时代混淆、事件顺序颠倒）
- [x] 3.4 实现 `checkWorldStateConsistency(newContent, worldVariables, lorebook)` — 检测世界观矛盾（如：官职体系错误、器物时代错误）
- [x] 3.5 实现 `runConsistencyCheck(newSegment, chain)` — 综合检测，返回矛盾列表（严重/警告/提示三级）
- [x] 3.6 在 continue/stream-continue API 中集成矛盾检测 — 续写前检测前文矛盾，续写后检测新内容矛盾，在响应中返回 warnings

### Cluster 4: 分支记忆管理

- [x] 4.1 创建 `src/lib/branch-memory.ts` — BranchMemory 类：管理跨分支的记忆
- [x] 4.2 实现 `getBranchDivergencePoint(storyId, branchId1, branchId2)` — 找到两个分支的分叉点
- [x] 4.3 实现 `getAlternateBranchSummary(storyId, currentBranchId)` — 获取其他分支的摘要（让AI知道"在另一条路线上发生了什么"）
- [x] 4.4 实现 `syncSharedCharacterStates(storyId, branchId)` — 同步分叉前的共享角色状态到当前分支
- [x] 4.5 实现 `buildBranchMemoryPrompt(storyId, currentBranchId)` — 格式化分支记忆为 prompt（"此故事有N条分支，在XX处分叉..."）

### Cluster 5: Prompt 构建升级

- [x] 5.1 改造 `src/lib/prompt-builder.ts` — 使用 ContextSummarizer 替代原始 chain 拼接
- [x] 5.2 集成 EventTracker — 在 prompt 中注入活跃事件和近期事件摘要
- [x] 5.3 集成 BranchMemory — 在 prompt 中注入分支记忆（当存在多个分支时）
- [x] 5.4 实现 token 预算管理 — 根据模型上下文窗口自动分配：系统指令(固定) + 角色上下文(动态) + 事件追踪(动态) + 前文(动态) + 续写指令(固定)
- [x] 5.5 实现"记忆提醒"指令 — 在 prompt 末尾添加明确指令要求AI注意：活跃事件、未解决的悬念、角色当前状态
- [x] 5.6 优化 prompt 结构顺序 — 系统指令 → 故事元信息 → 角色状态 → 活跃事件 → 分支记忆 → 前文上下文 → 世界观 → 事实锚点 → 导演覆盖 → 节奏 → 记忆提醒 → 续写指令

### Cluster 6: 验证与测试

- [x] 6.1 编写 `tests/context-summarizer.test.ts` — 测试摘要生成和分层上下文
- [x] 6.2 编写 `tests/event-tracker.test.ts` — 测试事件提取和追踪
- [x] 6.3 编写 `tests/consistency-checker.test.ts` — 测试矛盾检测（角色、时间线、世界观）
- [x] 6.4 编写 `tests/branch-memory.test.ts` — 测试分支记忆管理
- [x] 6.5 运行 `npx next build` 确保构建无错误
- [x] 6.6 端到端测试：创建长故事(10+段) → 验证摘要正确生成 → 续写引用早期事件 → 创建分支 → 验证分支记忆 → 故意制造矛盾 → 验证检测
