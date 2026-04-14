# 研究报告: src/app/page.tsx

## 概述

该文件是古事平台的首页，展示故事列表和导航入口。包含 Hero 区域、故事卡片列表和页脚。

## 用途

作为用户进入平台后的第一个页面，展示所有已创建的故事，引导用户创建新故事或继续阅读。

## 导出

- `Home` 默认导出页面组件。
- 内部组件：`StoryCard`、`LoadingSkeleton`。

## 依赖

- React（`useState`、`useEffect`）。
- `next/link`（`Link`）。
- 调用 `/api/stories` GET、`/api/stories/[id]/segments` GET、`/api/stories/[id]/tree` GET。

## 核心逻辑

### 数据加载
1. 加载故事列表（`/api/stories`）。
2. 为每个故事并行加载段落数量（`/segments`）和分支信息（`/tree`）。
3. 组装增强的故事数据（包含 `totalSegments`、`totalBranches`、`latestBranch`）。
4. 单个故事加载失败时降级显示基本信息。

### StoryCard 组件
- 内置朝代映射（荆轲→战国、赤壁→三国、玄武门→唐），其他故事默认显示"历史"。
- 显示：朝代标签、创建日期、标题、描述、段落/分支统计、最新分支信息、作者。
- 使用 `animate-fade-in-up` 动画，带延迟效果。

### UI 设计
- Hero 区域：大标题"古事"（5xl/6xl 字号）、副标题、创建按钮。
- 故事列表：三列网格布局。
- 中国风视觉：纸张质感、金色装饰线、CSS 变量驱动的主题色。

## 数据流

```
Home → useEffect → fetch /api/stories → for each story:
→ fetch /segments + /tree → merge data → setStories → render StoryCard[]
```

注意：每个故事都会触发 2 个额外的 API 请求（segments + tree），如果故事数量多会导致 N+1 请求问题。

## ChronosMirror 升级改进点

### 1. 角色建模
- 故事卡片可显示主要角色头像。
- 可添加"角色筛选"功能——按角色查找相关故事。

### 2. 时间轴校验
- 故事卡片可显示时间范围标签。
- 可按朝代/时间排序或筛选故事列表。

### 3. MCP 维基百科
- 故事卡片可显示"历史准确度评分"或"历史偏差度"。
- 可添加"历史知识"板块，展示与故事相关的真实历史事件。

### 4. 节奏控制
- 解决 N+1 请求问题：应在 API 层支持批量查询（如 `/api/stories?include=segments,branches`）。
- 故事列表应支持分页加载（当前一次性加载全部）。
- 可添加搜索功能（按标题、朝代、角色搜索）。
- 可添加"最近更新"排序，让活跃故事排在前面。
- LoadingSkeleton 应在数据加载完成后再渲染，避免闪烁。
