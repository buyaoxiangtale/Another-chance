# 研究报告: src/app/api/stories/route.ts

## 概述

该文件实现了故事的列表查询和创建 API，是古事平台的入口级接口。GET 返回所有故事列表，POST 创建新故事并自动生成开篇段落。

## 用途

- GET：首页故事列表展示，按创建时间倒序排列。
- POST：创建新故事（模板或自定义），同时自动创建首个段落作为开篇。

## 导出

- `GET` 函数：无参数，返回 `{ success, stories, total }`。
- `POST` 函数：接收 `{ title, description, author }` 请求体，返回 `{ success, story, firstSegment, message }`。

## 依赖

- `@/lib/simple-db`：`storiesStore`、`segmentsStore`、`Story`、`StorySegment`。

## 核心逻辑

### GET
1. 加载所有故事。
2. 按 `createdAt` 倒序排序。
3. 返回排序后的故事列表。

### POST
1. 参数验证：`title` 为必填项。
2. 幂等检查：标题已存在则返回已有故事（避免重复创建）。
3. 创建故事记录（生成唯一 ID）。
4. 自动创建首个段落：标题为"故事名·开篇"，内容为临时占位文本"《故事名》的故事开始了..."。
5. 更新故事的 `rootSegmentId` 字段指向首个段落。
6. 返回故事和首个段落。

注意：首个段落的内容是占位文本，并未通过 AI 生成完整开篇。这意味着用户创建故事后看到的"开篇"只是一句话，需要手动续写才能获得真正的故事内容。

## 数据流

```
GET /api/stories → storiesStore.load() → sort by createdAt desc → return
POST /api/stories → validate → check duplicate → create story
→ create first segment (placeholder) → update rootSegmentId → return
```

## ChronosMirror 升级改进点

### 1. 角色建模
- 创建故事时应初始化角色列表。对于模板故事（如"荆轲刺秦王"），应预置历史人物。
- POST 请求体应支持 `characters` 字段。
- 首个段落生成时应考虑角色设定。

### 2. 时间轴校验
- 故事创建时应记录时间范围（朝代、年份）。
- 模板故事应预置时间信息（如荆轲刺秦王 → 公元前227年）。
- POST 请求体应支持 `era`、`startYear` 等字段。

### 3. MCP 维基百科
- 创建故事时，通过 MCP 查询维基百科获取历史事件的真实背景。
- 首个段落的生成应使用 MCP 注入的历史知识，而非占位文本。
- 可自动生成"历史背景卡片"作为故事元数据的一部分。

### 4. 节奏控制
- 首个段落应由 AI 真正生成，而非使用占位文本。当前实现导致用户创建故事后体验断裂。
- 故事列表应支持分页和搜索（当前返回全部故事）。
- 可添加"最近续写"时间戳，便于用户找到活跃的故事。
