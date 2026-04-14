# 研究报告：src/lib/simple-db.ts

## 概述

`src/lib/simple-db.ts` 是 gushi 项目的简易数据持久化层，使用 JSON 文件存储数据，完全绕过 Prisma ORM，实现了故事的 CRUD 操作和分支链查询。

## 用途

提供一个轻量级的数据存储方案，无需数据库服务器，直接通过文件系统读写 JSON 文件。这是项目当前实际使用的主要数据访问层。

## 导出

- `storiesStore`：故事数据的 SimpleStore 实例
- `segmentsStore`：段落数据的 SimpleStore 实例
- `branchesStore`：分支数据的 SimpleStore 实例
- `getOrderedChain(storyId, branchId)`：获取有序段落链
- `getTailSegment(storyId, branchId)`：获取分支末尾段落
- `getStorySegments(storyId)`：获取故事所有段落
- `getStoryBranches(storyId)`：获取故事所有分支
- TypeScript 类型：`Story`、`StorySegment`、`StoryBranch`

## 依赖

仅依赖 Node.js 内置模块 `fs/promises` 和 `path`，无第三方依赖。

## 核心逻辑

### SimpleStore<T> 泛型类
核心存储引擎，将数据序列化为 JSON 文件存储在 `data/` 目录下。提供 `load()` 和 `save()` 两个方法，分别读取和写入整个 JSON 数组。这是一种典型的文件数据库模式，简单但性能有限。

### getOrderedChain — 分支链排序
这是整个文件最核心的函数。它通过 `parentSegmentId` 链式查找，将扁平的段落数组组装成有序链：

- **主线（branchId="main"）**：从没有 parentSegmentId 的根段落开始，沿 parentSegmentId 链遍历
- **分支线**：找到对应 branch 记录的 sourceSegmentId，从其子段落开始遍历
- 使用 `visited` Set 防止循环引用导致的无限循环

### 数据结构
三个 JSON 文件（stories.json、segments.json、branches.json）存储所有数据，通过 storyId 关联。每次操作都加载整个文件到内存，修改后写回。

## 数据流

1. API Route 调用 `storiesStore.load()` 加载全部故事列表
2. 根据查询条件过滤（如 storyId）
3. 调用 `getOrderedChain()` 获取有序段落链
4. 返回给前端渲染
5. 写入时调用对应 store 的 `save()` 方法

**性能瓶颈**：每次读写都加载/写入完整 JSON 文件，数据量大时性能急剧下降。无索引、无查询优化。

## 与 Prisma Schema 的差异

simple-db.ts 中的 StorySegment 接口包含 `branchId` 字段，而 Prisma Schema 中没有。这说明项目从 Prisma 迁移到了 JSON 文件方案（或反过来），两套方案并存但未统一。simple-db.ts 是实际运行时使用的方案。

## ChronosMirror 升级改进点

### 1. 角色建模
当前没有任何角色相关存储。需要在 segments.json 的每条记录中添加 `characterIds: string[]`，并新建 `characters.json` 文件存储角色数据。查询时应支持"获取某角色出现的所有段落"的反向查询。

### 2. 时间轴校验
每个 segment 需要新增 `timeline` 对象字段。`getOrderedChain` 函数应在组装链时校验时间单调性，如果发现时间倒流则抛出警告或自动修正。可以添加 `validateTimeline(storyId, branchId)` 函数专门做时间轴完整性校验。

### 3. MCP 维基百科集成
新增 `references.json` 存储历史知识引用。在 `getOrderedChain` 返回结果时可以附带每个段落的历史引用。建议添加 `enrichSegmentWithWiki(segmentId)` 函数，自动为段落中提到的人物/事件查询维基百科并缓存结果。

### 4. 节奏控制
segment 新增 `narrativePace` 和 `mood` 字段。可以添加 `analyzePace(storyId, branchId)` 函数，分析整条分支链的节奏分布，检测是否存在连续多个同类型段落（如连续 5 个 RUSH），给出优化建议。

### 5. 架构改进
- **替换为 Prisma**：当前 JSON 文件方案不适合生产环境，应统一使用 Prisma + SQLite
- **添加缓存层**：在 SimpleStore 之上添加内存缓存，减少文件 I/O
- **添加事务支持**：当前多文件操作无事务保证，可能导致数据不一致
- **添加数据校验**：在 save 前校验数据完整性（如外键引用有效性）
