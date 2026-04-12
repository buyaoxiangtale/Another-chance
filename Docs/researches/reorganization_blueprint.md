# 古事 (Gushi) - 分叉故事续写平台 蓝图

## 项目概述
一个故事续写平台，基于历史/经典故事的关键片段和人物产生分叉剧情。用户可以选择历史转折点（如"秦始皇被成功刺杀"），系统生成连续的分叉故事线。纯文本版本先行，后续加入AI生成图片。

## 技术选型
- **前端**: Next.js 14 (App Router) + TailwindCSS + TypeScript
- **后端**: Next.js API Routes (同项目)
- **数据库**: SQLite (本地开发) / Prisma ORM
- **AI**: OpenAI-compatible API (文本生成)
- **后续**: 转换为 iOS App (React Native 或 Capacitor)

## 执行检查清单

### Phase 1: 项目初始化
- [x] P1-1: 初始化 Next.js 14 项目 (TypeScript + TailwindCSS)
- [x] P1-2: 配置 Prisma + SQLite 数据库 schema
- [x] P1-3: 创建基础目录结构 (src/app, src/lib, src/components, src/types)

### Phase 2: 数据模型与核心逻辑
- [x] P2-1: 设计并实现 Story (故事主线) 数据模型
- [x] P2-2: 设计并实现 StoryBranch (分叉节点) 数据模型
- [x] P2-3: 设计并实现 StorySegment (故事段落) 数据模型
- [x] P2-4: 创建 Prisma seed 脚本，插入示例历史故事数据
- [x] P2-5: 实现故事树的递归查询和分叉逻辑

### Phase 3: AI 文本生成
- [x] P3-1: 封装 AI API 调用模块 (支持 OpenAI-compatible 接口)
- [x] P3-2: 实现故事续写 prompt 模板 (含上下文、人物、风格控制)
- [x] P3-3: 实现分叉生成逻辑 (基于关键转折点生成多条分支)
- [x] P3-4: 实现 API Route: POST /api/stories/[id]/continue (续写)
- [x] P3-5: 实现 API Route: POST /api/stories/[id]/branch (分叉)
- [x] P3-6: 实现流式响应 (SSE) 支持打字机效果

### Phase 4: 前端页面
- [x] P4-1: 首页 - 故事列表/选择页
- [x] P4-2: 故事阅读页 - 树状故事线展示
- [x] P4-3: 分叉选择页 - 关键节点交互
- [x] P4-4: 故事创建页 - 选择历史故事/自定义
- [x] P4-5: 流式文本展示组件 (打字机效果)

### Phase 5: 预置故事数据
- [x] P5-1: 编写荆轲刺秦王分叉故事数据
- [x] P5-2: 编写赤壁之战分叉故事数据
- [x] P5-3: 编写玄武门之变分叉故事数据

### Phase 6: 图片生成预留
- [x] P6-1: 设计图片数据模型 (StorySegment 关联图片)
- [x] P6-2: 预留 AI 图片生成 API 接口
- [x] P6-3: 前端图片展示位置预留

### Phase 7: 部署与iOS转换准备
- [ ] P7-1: 配置 Dockerfile 用于本地部署
- [ ] P7-2: 编写 README.md (项目说明、运行方式)
- [ ] P7-3: 添加 Capacitor 配置预留 (iOS 转换)
- [ ] P7-4: 本地运行验证通过

## 画风与情节一致性规则
- 每次续写时，将前文摘要 + 人物列表 + 画风要求注入 prompt
- 分叉生成时，明确标注分叉点及其与原文的差异
- 同一故事线的所有段落共享同一"风格上下文"
