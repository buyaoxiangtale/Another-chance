# 研究报告: src/components/story/StoryImageDisplay.tsx

## 概述

该组件是故事段落图片展示的前端组件，负责从 API 获取图片数据并以卡片形式展示。支持多种图片类型（插图、场景、人物、物件），提供加载状态、错误处理和空状态展示。

## 用途

嵌入故事阅读页面中，为每个段落展示关联的视觉内容。增强故事的沉浸感和视觉表现力。

## 导出

- `StoryImageDisplay` 默认导出组件。

## 依赖

- React（`useState`、`useEffect`）。
- `next/image`：Next.js 图片优化组件。
- 调用 `/api/images?segmentId=xxx` 接口获取图片数据。

## 核心逻辑

1. **Props 接收**：`segmentId`（必填）、`className`、`maxWidth`、`maxHeight`、`showDescription`。
2. **数据获取**：通过 `useEffect` 在 `segmentId` 变化时调用 API 获取图片。
3. **状态管理**：`images`（图片列表）、`loading`（加载中）、`error`（错误信息）。
4. **图片类型系统**：支持 `illustration`（插图）、`scene`（场景）、`character`（人物）、`object`（物件）四种类型，每种有对应的图标和中文标签。
5. **渲染**：遍历图片列表，每个图片渲染为卡片（图片 + 类型标签 + 描述 + 尺寸信息）。
6. **错误处理**：图片加载失败时显示占位符（通过 `onError` 回调替换 DOM）。
7. **空状态**：无图片时显示"暂无相关图片"的占位提示。

## 数据流

```
StoryImageDisplay(segmentId)
→ useEffect → fetch /api/images?segmentId=xxx
→ setImages → render Image cards
```

## ChronosMirror 升级改进点

### 1. 角色建模
- 图片展示应与角色系统联动。当图片类型为 `character` 时，应显示角色名称和简介。
- 可添加角色头像画廊功能，展示故事中所有出现过的角色。
- 同一角色的不同图片应可对比查看。

### 2. 时间轴校验
- 图片展示应包含时间上下文（该图片描绘的是哪个时间点的事件）。
- 可添加时间轴标签（如"公元前227年·咸阳宫"）。

### 3. MCP 维基百科
- 图片描述可链接到维基百科页面，提供更多历史背景。
- 可添加"历史参考"按钮，点击后展示维基百科中相关的真实图片或描述。

### 4. 节奏控制
- 图片加载应使用 Next.js Image 的 `placeholder="blur"` 和 `blurDataURL` 实现渐进式加载。
- 多张图片应支持轮播或画廊模式，而非垂直堆叠。
- 图片大小应根据叙事节奏自适应——高潮段落的图片更大、更突出。
- 当前组件未在故事页面中实际使用（story/[id]/page.tsx 中未引入），说明图片功能尚未完全集成。
