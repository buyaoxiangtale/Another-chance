# prisma 目录研究报告

## 概述

`prisma/` 目录包含数据库 Schema 定义和种子数据脚本，是项目的数据层基础设施。

## 文件清单

| 文件 | 用途 |
|------|------|
| `schema.prisma` | Prisma ORM Schema，定义数据库模型 |
| `seed.ts` | 基础种子数据（3个故事，每故事2段） |
| `enhanced_seed.ts` | 增强种子数据（3个故事，多分支段落） |

## 数据模型（schema.prisma）

使用 **SQLite** 作为数据库，定义了 3 个核心模型：

### Story（故事）
- `id` (cuid)、`title`、`description`、`author`
- 关联 `rootSegment`（可选）
- 一对多关联 `segments`、`branches`

### StorySegment（故事段落）
- `id`、`title`、`content`、`order`、`isBranchPoint`
- `storyId` 外键（级联删除）
- `parentBranchId`（可选，表示分支归属）
- `imageUrls`（字符串数组，预留图片字段）

### StoryBranch（分叉节点）
- `id`、`title`、`description`、`segmentId`（分叉源段落）
- `parentStoryId`（可选，关联父故事）
- 一对多关联 `segments`

## 数据流

```
Story → rootSegment → StorySegment[] → StoryBranch[]
                                      ↓
                              StorySegment[]（分支段落）
```

种子数据流程：`enhanced_seed.ts` → 清空 data/*.json → 通过 storyStore 写入 → 生成 stories/segments/branches

## 依赖

- `prisma-client-js`（Prisma Client 生成器）
- SQLite（数据库）
- `../src/lib/db`（storyStore，实际为 simple-db 的 JSON 文件存储）

## ChronosMirror 升级改进点

### 角色建模
- **现状**：无角色模型，故事仅有 title/description/author，段落数据中角色信息嵌在 content 文本里
- **改进**：新增 `Character` 模型（姓名、身份、性格特征、关系网络），`StorySegment` 增加 `characters` 多对多关联

### 时间轴校验
- **现状**：段落仅有 `order` 排序，无时间概念；`createdAt`/`updatedAt` 是记录时间而非故事内时间
- **改进**：`StorySegment` 增加 `storyTime`（故事内时间点）和 `timeRange`（时间段），Story 增加 `timePeriod`（历史时期）字段

### MCP 维基百科
- **现状**：种子数据中硬编码历史背景，无外部知识源集成
- **改进**：Schema 增加 `wikiReferences` 字段，Story 关联历史事件维基百科条目；种子数据生成时自动查询 MCP

### 节奏控制
- **现状**：段落等权重展示，无节奏/紧张度标记
- **改进**：`StorySegment` 增加 `narrativePace`（叙事节奏）、`tensionLevel`（紧张度 1-10）、`segmentType`（序幕/发展/高潮/尾声）
