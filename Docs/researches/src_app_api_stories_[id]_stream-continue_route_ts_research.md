# 研究报告: src/app/api/stories/[id]/stream-continue/route.ts

## 概述

该文件实现了故事的流式续写 API，是当前项目中技术最复杂的路由之一。它通过 Server-Sent Events (SSE) 将 AI 生成的内容实时推送给前端，提供"边写边看"的沉浸式体验。

## 用途

为故事阅读页提供实时续写能力。用户点击"续写故事"后，AI 生成的内容逐字显示在页面上，模拟"正在书写"的效果，极大提升用户体验和沉浸感。

## 导出

- `POST` 函数：接收 `{ branchId }` 请求体，返回 SSE 流。

## 依赖

- `@/lib/simple-db`：`storiesStore`、`segmentsStore`、`getOrderedChain`、`StorySegment`。
- AI API：与 continue 路由相同的环境变量配置。

## 核心逻辑

1. 加载故事和指定分支的有序段落链，找到尾段落。
2. 构建与 continue 路由相同的 prompt。
3. 调用 AI API 时设置 `stream: true`，获取流式响应。
4. 创建 `ReadableStream`，逐块解析 SSE 数据（`data: {...}` 格式）。
5. 提取 `delta.content`，累积到 `fullContent`，同时通过 `controller.enqueue` 推送给客户端。
6. 流结束后，将完整内容保存为新段落（与 continue 路由相同的段落创建逻辑）。
7. 发送 `[DONE]` 信号关闭流。
8. 响应头设置 `Content-Type: text/event-stream`、`Cache-Control: no-cache`。

## 数据流

```
POST /api/stories/[id]/stream-continue
→ 获取尾段落 → 构建 prompt → AI stream API
→ ReadableStream → 逐 chunk 解析 → SSE 推送给前端
→ 流结束 → 保存完整段落 → [DONE]
```

## ChronosMirror 升级改进点

### 1. 角色建模
- 流式生成过程中，可实时解析新内容中出现的角色名，前端同步更新角色面板。
- AI prompt 应注入角色信息，确保续写中角色行为一致。
- 可在流式输出中嵌入角色状态变更事件（如 `[CHARACTER_UPDATE: 李建成 → status: defeated]`）。

### 2. 时间轴校验
- 续写前应校验时间轴——当前叙事时间是否允许续写（如已到历史事件终点则提示用户）。
- 可在流式输出的开头插入时间推进信息。

### 3. MCP 维基百科
- 在构建 prompt 之前，通过 MCP 查询当前时间点附近的历史事件。
- 流式输出完成后，可异步生成"历史注释"附加到段落元数据中。

### 4. 节奏控制
- 当前实现没有"暂停/恢复"能力。应支持用户中断续写。
- 可添加"续写长度控制"——用户指定想要的续写长度（短/中/长）。
- 流式输出的速度可调节（当前由 AI API 决定，可添加客户端节流）。
- 应添加超时保护，防止 AI 生成时间过长。
