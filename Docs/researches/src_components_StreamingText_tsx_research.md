# 研究报告: src/components/StreamingText.tsx

## 概述

该文件导出了三个流式文本展示组件，提供"打字机"效果和 SSE 实时文本流展示能力。这是古事平台用户体验的核心组件之一。

## 用途

- `StreamingText`：单段文本的打字机效果展示。
- `MultiStreamingText`：多段文本的顺序打字展示，支持进度指示和段落导航。
- `SSEStreamingText`：基于 Server-Sent Events 的实时文本流展示。

## 导出

- `StreamingText`：单段打字效果组件。
- `MultiStreamingText`：多段打字效果组件。
- `SSEStreamingText`：SSE 流式文本组件。

## 依赖

- React（`useState`、`useEffect`、`useRef`）。

## 核心逻辑

### StreamingText
1. 通过 `setInterval` 模拟打字效果，按 `speed`（默认 50ms）逐字显示。
2. 支持光标动画（闪烁的竖线）。
3. 完成时触发 `onComplete` 回调。
4. 文本变化时自动重置状态。

### MultiStreamingText
1. 管理多段文本的顺序展示，当前段落完成后延迟 `delayBetween`（默认 1000ms）开始下一段。
2. 支持进度条显示（`showProgress`）。
3. 支持段落导航按钮（上一段/下一段）。

### SSEStreamingText
1. 通过 `EventSource` 连接 SSE 端点。
2. 解析 JSON 格式的 SSE 消息，支持 `progress`、`complete`、`final`、`error` 四种消息类型。
3. 实时更新显示内容，完成后显示完成标记。

注意：SSEStreamingText 的消息格式与 stream-continue 路由的输出格式不完全匹配（路由输出 `data: { content }` 格式，组件期望 `data: { type, content }` 格式），说明该组件可能未被实际使用，或需要适配。

## 数据流

```
StreamingText(text, speed) → setInterval → 逐字 setState → 渲染
MultiStreamingText(texts) → 顺序展示 → 进度条 + 导航
SSEStreamingText(url) → EventSource → 解析消息 → 实时渲染
```

## ChronosMirror 升级改进点

### 1. 角色建模
- 流式展示过程中，可实时高亮出现的角色名（如将"荆轲"显示为特殊颜色）。
- 可在角色首次出现时弹出角色卡片。

### 2. 时间轴校验
- 文本中出现时间信息（如"三月后"）时，可自动更新时间轴显示。
- 可在文本中嵌入时间节点标记。

### 3. MCP 维基百科
- 当文本中出现历史专有名词时，可通过 MCP 查询并显示简短注释。
- 可实现"悬停查看"功能——鼠标悬停在历史名词上时显示维基百科摘要。

### 4. 节奏控制
- 打字速度应根据内容类型自适应——描写性段落慢一些，对话快一些。
- 可添加"跳过动画"按钮，让用户直接看到完整内容。
- SSEStreamingText 应适配 stream-continue 路由的实际输出格式。
- 可添加音频配合（如古琴音效），增强沉浸感。
