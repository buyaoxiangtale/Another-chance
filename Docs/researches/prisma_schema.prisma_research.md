# 研究报告：prisma/schema.prisma

## 概述

`prisma/schema.prisma` 是 gushi 项目的数据库 Schema 定义文件，使用 Prisma ORM 定义了 SQLite 数据库的三个核心模型：Story（故事）、StorySegment（故事段落）、StoryBranch（分叉节点）。

## 用途

该文件定义了整个应用的持久化层结构，描述了故事如何被存储、组织和关联。它是数据层的唯一真相来源（Single Source of Truth），所有数据操作都围绕这三个模型展开。

## 模型详解

### Story（故事主线模型）
- **字段**：id（cuid）、title、description（可选）、author（可选）、createdAt、updatedAt、rootSegmentId（可选）
- **关联**：一对多关联 segments 和 branches，一对一关联 rootSegment
- **映射**：`@@map("stories")` 表名映射
- **用途**：作为故事的顶层容器，每个故事包含多条段落和多个分支

### StorySegment（故事段落模型）
- **字段**：id、title（可选）、content（正文）、order（排序）、isBranchPoint（是否分叉点）、imageUrls（图片数组）
- **关联**：belongsTo Story（级联删除）、hasMany StoryBranch
- **映射**：`@@map("story_segments")`
- **用途**：存储故事的每一个文本段落，支持图片附件

### StoryBranch（分叉节点模型）
- **字段**：id、title、description、segmentId、parentStoryId（可选）
- **关联**：belongsTo StorySegment、可选 belongsTo Story、hasMany StorySegment
- **映射**：`@@map("story_branches")`
- **用途**：记录从某个段落分叉出去的分支，实现非线性叙事

## 导出

该文件不直接导出，但通过 Prisma CLI 生成 `@prisma/client` 供应用代码使用。

## 依赖

- Prisma CLI 和 prisma-client-js 运行时
- SQLite 作为数据库引擎

## 核心逻辑与数据流

数据流为：Story → StorySegment（通过 rootSegmentId）→ StoryBranch（通过 segmentId）。故事有一个根段落，段落可以链接分叉节点，分叉节点又可以包含新的段落链。这构成了一个树形结构。

## ChronosMirror 升级改进点

### 1. 角色建模
当前 Schema 完全没有角色（Character）模型。ChronosMirror 需要新增 Character 模型，包含：角色名称、朝代/时期、性格特征、关系网络。应在 Story 和 StorySegment 之间建立多对多关联（一个段落涉及多个角色），并记录角色在段落中的状态变化。

### 2. 时间轴校验
当前模型只有 order 字段表示顺序，没有时间语义。需要新增时间轴相关字段：`era`（朝代）、`year`（年份，可为负数表示公元前）、`season`（季节）、`timeDescription`（时间描述文本）。应添加时间轴校验逻辑，确保同一故事线内的时间单调递进。

### 3. MCP 维基百科集成
当前模型没有外部知识引用机制。建议新增 `HistoricalReference` 模型，记录段落中涉及的历史事件、人物、地点的维基百科引用，包含 wikiUrl、summary、verifiedAt 等字段。

### 4. 节奏控制
当前 `order` 字段仅支持线性排序，无法表达叙事节奏。建议新增 `narrativePace` 枚举字段（RUSH/DETAILED/PAUSE/SUMMARY），以及 `estimatedReadTime` 字段，用于控制不同段落的叙事节奏。还可以添加 `mood` 字段记录情感基调。

### 5. 其他改进
- StorySegment 缺少 `branchId` 字段（simple-db.ts 中有但 schema 中没有），说明两套数据结构不一致，需要统一
- 建议添加 Story 的 `genre`、`era`、`targetAudience` 元数据字段
- StoryBranch 缺少 `userDirection` 字段（types/story.ts 中有），需要补充
- 考虑添加 `StoryVersion` 模型支持版本控制
