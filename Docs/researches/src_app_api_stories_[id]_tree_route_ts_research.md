# 研究报告: src/app/api/stories/[id]/tree/route.ts

## 概述

该文件实现了故事树结构查询 API，将故事的线性段落和分支关系组织为树形数据结构，是"分叉叙事"可视化的数据基础。

## 用途

为故事详情页提供完整的分支拓扑结构。前端使用此数据渲染分支切换器、分叉点标记等 UI 元素，让用户直观了解故事的"分叉地图"。

## 导出

- `buildTreeData` 内部函数：将扁平的段落数组和分支记录转换为树形结构。
- `GET` 函数：返回 `{ story, tree, branches, totalSegments, totalBranches }`。

## 依赖

- `@/lib/simple-db`：`storiesStore`、`segmentsStore`、`branchesStore`、`getOrderedChain`、`StorySegment`、`StoryBranch`。

## 核心逻辑

`buildTreeData` 函数是核心算法：
1. **筛选**：从所有段落和分支中筛选出当前故事的数据。
2. **构建主线**：从 `branchId === 'main'` 的段落中，通过 `parentSegmentId` 链式遍历构建有序主线（从无 parent 的根节点开始，依次找子节点）。
3. **附加分支**：遍历所有分支记录，找到源段落在主线中的位置，然后递归构建该分支的段落链，作为源段落的 `children`。
4. 防环机制：通过 `visited` Set 防止循环引用。

返回的树结构中，每个主线节点包含 `children` 数组（分支列表），每个分支包含 `segments`（分支段落链）。

## 数据流

```
GET /api/stories/[id]/tree
→ 加载 stories, segments, branches
→ buildTreeData: 筛选 → 构建主线 → 附加分支 → 返回树
→ { mainLine, branches, totalSegments, totalBranches }
```

## ChronosMirror 升级改进点

### 1. 角色建模
- 树结构应包含每个分支的角色状态快照，便于用户了解"在这个分支中，角色处于什么状态"。
- 可在分支节点上显示关键角色的状态变更（如"秦王在此分支中被刺杀"）。

### 2. 时间轴校验
- 树结构的每个节点应有叙事时间标注。
- 不同分支可能有不同的时间进度，树可视化应反映这种差异。
- 可添加"时间线视图"——以时间为横轴展示各分支的时间进度。

### 3. MCP 维基百科
- 分支标题和描述可通过 MCP 维基百科补充历史背景。
- 可在树结构中附加"历史偏差度"——该分支偏离真实历史的程度。

### 4. 节奏控制
- 树结构可视化应支持折叠/展开，避免分支过多时信息过载。
- 可添加"推荐阅读路径"标记，引导用户体验最佳叙事顺序。
- 分支深度应有限制（建议最多 3-5 层），过深的分支结构不利于用户体验。
