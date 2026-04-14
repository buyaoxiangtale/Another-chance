# 研究报告: src/app/api/stories/[id]/segments/route.ts

## 概述

该文件实现了故事段落的查询 API，支持按分支获取有序段落列表或获取全部段落。

## 用途

前端使用此接口加载故事的具体内容。支持两种模式：按 `branchId` 获取特定分支的有序段落链（默认 main），或通过 `all` 参数获取故事的所有段落。

## 导出

- `GET` 函数：支持查询参数 `branchId`（默认 'main'）和 `all`。

## 依赖

- `@/lib/simple-db`：`getOrderedChain`、`getStorySegments`、`StorySegment`。

## 核心逻辑

1. 解析查询参数：`branchId` 和 `all`。
2. 如果 `all` 为真，调用 `getStorySegments` 获取所有段落（不分分支）。
3. 否则调用 `getOrderedChain` 获取指定分支的有序段落链。
4. 返回段落数组和分支标识。

## 数据流

```
GET /api/stories/[id]/segments?branchId=main → getOrderedChain → 返回有序段落
GET /api/stories/[id]/segments?all → getStorySegments → 返回所有段落
```

## ChronosMirror 升级改进点

### 1. 角色建模
- 段落响应应包含该段落中出现的角色及其状态变更。
- 可添加 `characters` 字段到段落数据中。
- 段落间应能追踪角色状态变化（如"李建成在此段落中被击败"）。

### 2. 时间轴校验
- 段落应有时间戳（叙事时间，非创建时间）。
- 返回的有序链应包含时间轴信息，便于前端可视化。
- 可添加 `narrativeTime` 字段。

### 3. MCP 维基百科
- 可在段落数据中附加历史背景注释（通过 MCP 查询生成）。
- 段落中提及的历史人物、事件可自动链接到维基百科页面。

### 4. 节奏控制
- 段落列表应支持分页加载，避免一次性加载过多内容。
- 可添加 `summary` 字段（段落摘要），用于快速浏览。
- 可按"叙事节奏"标记段落类型（铺垫/发展/高潮/转折/结局）。
