# 研究报告：src/types/story.ts

## 概述

`src/types/story.ts` 是 gushi 项目的核心类型定义文件，定义了故事系统的所有 TypeScript 类型，包括数据模型类型、API 请求/响应类型、UI 组件类型，以及向后兼容的类实现。

## 用途

为整个应用提供类型安全的数据结构定义，确保前后端数据格式一致。同时通过向后兼容的类实现支持旧代码的渐进迁移。

## 导出

### 数据模型类型
- `Story`：故事主体，包含 id、title、description、author、时间戳、rootSegmentId
- `StorySegment`：故事段落，包含内容、分支归属、父段落、图片URL
- `StoryBranch`：分叉节点，包含来源段落、用户方向描述

### API 类型
- `ContinueStoryRequest`：续写请求，支持 segmentId、branchId、content、style、characters
- `BranchStoryRequest`：分叉请求，包含 segmentId 和用户方向描述
- `StoryResponse`：故事响应，包含段落数组、分支数组和当前段落

### UI 类型
- `TreeNode`：树形节点，用于分支可视化，包含 children 递归结构

### 向后兼容类
- `StoryClass`、`StorySegmentClass`、`StoryBranchClass`：通过 `Object.assign` 将类型数据转为类实例

## 依赖

无外部依赖，纯 TypeScript 类型定义文件。

## 核心逻辑

该文件的核心逻辑体现在 `TreeNode` 类型的递归结构设计上。`children: TreeNode[]` 允许构建任意深度的分支树，`branchId` 和 `branchTitle` 用于标识不同分支的归属。`isBranchPoint` 标记哪些节点是分叉点，UI 层据此渲染分叉选择器。

`ContinueStoryRequest` 中的 `style` 和 `characters` 字段暗示了系统曾经计划支持风格控制和角色管理，但在实际代码中可能未完全实现。

## 数据流

类型定义本身不参与数据流，但它约束了数据在以下路径中的格式：
1. API Route 接收请求 → 按 Request 类型校验
2. API Route 查询数据库 → 按 Model 类型返回
3. 前端组件接收响应 → 按 Response 类型渲染
4. 前端构建树形结构 → 按 TreeNode 类型组织

## 与其他文件的一致性问题

**严重不一致**：`story.ts` 中的 `StorySegment` 包含 `branchId` 和 `parentSegmentId` 字段，但 `schema.prisma` 中 StorySegment 模型只有 `parentBranchId`，没有 `branchId`。`simple-db.ts` 中的 StorySegment 接口与 `story.ts` 一致但与 schema 不一致。这说明项目存在双轨数据存储（Prisma + JSON 文件），类型定义以 JSON 文件方案为准。

同样，`StoryBranch` 在 types 中有 `userDirection` 字段，但 schema 中没有。

## ChronosMirror 升级改进点

### 1. 角色建模
当前类型中 `ContinueStoryRequest.characters` 仅为 `string[]`（角色名称数组），过于简陋。需要新增完整的 `Character` 类型：
```typescript
type Character = {
  id: string;
  name: string;
  era: string;          // 朝代
  role: 'protagonist' | 'supporting' | 'antagonist' | 'narrator';
  traits: string[];     // 性格特征
  relationships: { targetId: string; relation: string }[];
  stateHistory: { segmentId: string; state: Record<string, any> }[];
};
```
StorySegment 应新增 `characterIds: string[]` 关联参与角色。

### 2. 时间轴校验
StorySegment 需要新增时间字段：
```typescript
timeline?: {
  era: string;        // 朝代（如"唐"、"宋"）
  year: number;       // 年份（负数表示公元前）
  season?: string;    // 季节
  description: string; // 时间描述（如"贞观三年春"）
};
```
需要添加类型级约束或运行时校验，确保同一线性段落链中的时间单调递进。

### 3. MCP 维基百科集成
新增类型支持历史知识引用：
```typescript
type HistoricalReference = {
  id: string;
  segmentId: string;
  entityType: 'person' | 'event' | 'place' | 'artifact';
  name: string;
  wikiUrl?: string;
  wikiSummary?: string;
  verifiedAt?: string;
  confidence: number;  // AI 置信度
};
```

### 4. 节奏控制
StorySegment 新增节奏相关字段：
```typescript
narrativePace?: 'rush' | 'detailed' | 'pause' | 'summary';
mood?: string;              // 情感基调
estimatedReadMinutes?: number;
```
TreeNode 也应反映节奏信息，UI 层可据此动态调整渲染效果（如快节奏段落用紧凑排版）。

### 5. 架构建议
- 移除向后兼容的 Class 实现，统一使用 TypeScript 类型 + interface
- 将 API 类型与数据模型类型分文件组织
- 添加 Zod schema 用于运行时校验，而不仅是编译时类型检查
