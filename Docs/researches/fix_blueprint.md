# 古事 (Gushi) — 完整修复蓝图

## 当前问题

1. **新建故事无法续写/分叉** — 创建故事时不生成初始段落，storyId 没有对应的 segment
2. **分支逻辑不像 Git** — 当前分支直接追加到同一条故事线，没有保留原始线 + 独立分支的概念
3. **用户无法输入分支内容** — 分叉时没有用户输入框，完全由 AI 生成，用户无法控制方向
4. **UI 不贴合人类设计** — 阅读页缺少分支树可视化，创建页缺少引导，整体交互流程不清晰
5. **数据模型需要升级** — StorySegment 缺少 `branchId` 字段区分不同分支线，`order` 无法表达并行分支
6. **冗余代码** — `ai-service.js`、`story-branching.js`、`story-prompt.js`、`db.ts` 已废弃但未清理

## 数据模型改造

### StorySegment 新增字段
- `branchId: string` — 所属分支 ID，主线的 branchId 为 `"main"`
- `parentSegmentId: string` — 父段落 ID（用于构建分支树）
- 移除 `order`，改用 `parentSegmentId` 链式结构

### StoryBranch 改造
- `id: string` — 分支唯一 ID
- `sourceSegmentId: string` — 从哪个段落分叉出来的
- `storyId: string` — 所属故事
- `title: string` — 分支标题（用户输入或 AI 生成）
- `userDirection: string` — 用户输入的分叉方向描述
- `createdAt: string`

## 修复任务清单

### Cluster 1: 数据模型与存储层

- [x] 1.1 更新 `src/types/story.ts` — StorySegment 增加 branchId/parentSegmentId，移除 order；更新 StoryBranch 类型
- [x] 1.2 更新 `src/lib/simple-db.js` — 增加辅助方法：getSegmentsByBranch、getMainBranchSegments、getChildrenSegments
- [x] 1.3 编写数据迁移脚本 `scripts/migrate-data.js` — 将现有数据从 order 模型迁移到 branchId/parentSegmentId 模型
- [x] 1.4 运行迁移脚本，验证数据完整性

### Cluster 2: API 路由修复 ✅ 已完成

- [x] 2.1 修复 `POST /api/stories` — 创建故事时自动生成首个段落（AI 生成故事开篇）
- [x] 2.2 修复 `POST /api/stories/[id]/continue` — 在当前分支末尾续写，传入 branchId 参数
- [x] 2.3 修复 `POST /api/stories/[id]/stream-continue` — 流式续写，支持 branchId
- [x] 2.4 修复 `POST /api/stories/[id]/branch` — Git 风格分叉：保留原线，创建新分支，接受 userDirection 输入
- [x] 2.5 新增 `GET /api/stories/[id]/tree` — 返回分支树结构供前端渲染
- [x] 2.6 修复 `GET /api/stories/[id]/segments` — 支持按 branchId 过滤

### Cluster 3: 前端页面重构

- [x] 3.1 重构 `src/app/story/[id]/page.tsx` — 分支树可视化（主线+分支并行展示），支持切换分支线阅读
- [x] 3.2 添加分叉交互组件 — 分叉点显示用户输入框+预设方向选项，用户可输入自定义方向
- [x] 3.3 重构 `src/app/create/page.tsx` — 优化创建流程，添加故事类型选择、提示词输入
- [x] 3.4 优化 `src/app/page.tsx` — 故事卡片展示最新分支信息、段落数量统计
- [x] 3.5 添加分支切换 UI — 在阅读页顶部显示当前分支路径，支持切换到其他分支

### Cluster 4: 清理与验证

- [x] 4.1 删除废弃文件 — ai-service.js、story-branching.js、story-prompt.js、db.ts、story-tree.js、story_classes.ts、imageGeneration.ts
- [x] 4.2 统一文件格式 — simple-db.js 改为 .ts，API 路由类型标注更新
- [x] 4.3 全流程验证 — 创建故事→续写→分叉→切换分支→继续续写
- [x] 4.4 构建验证 — `npx next build` 无错误
