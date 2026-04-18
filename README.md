# 古事 (Gushi) - 分叉故事续写平台

> 基于历史/经典故事的关键片段和人物产生分叉剧情的故事续写平台

## 项目简介

古事是一个创新的故事续写平台，用户可以选择历史故事的关键转折点（如"秦始皇被成功刺杀"），系统将生成连续的分叉故事线。平台支持 AI 续写、角色建模、时间轴校验、导演模式等功能。

### 核心功能

- **故事树状展示** - 以树状结构展示故事发展脉络
- **多路线分叉** - 在关键节点提供不同的故事走向选择
- **AI 续写** - 基于历史背景智能生成故事内容（支持流式输出）
- **角色系统** - 创建角色并自动融入续写上下文
- **时间轴引擎** - 校验叙事时间单调性，自动检测时间倒流
- **导演模式** - 手动控制角色状态、世界变量和叙事约束
- **MCP 维基百科** - 续写时自动检索历史实体，注入事实锚点
- **节奏控制** - 选择叙事节奏（rush/detailed/pause/summary）

## 技术栈

### 前端

- **Next.js 13** (App Router)
- **TypeScript**
- **TailwindCSS**
- **React 18**

### 后端

- **Next.js API Routes**
- **JSON 文件存储** (`src/lib/simple-db.ts`) — 数据存放在 `data/` 目录
- **Prisma** — Schema 定义预留，当前运行时未使用

### AI 集成

- **OpenAI-compatible API** 支持
- 文本续写与图片生成

### 部署

- **Docker** 容器化部署
- **Docker Compose** 编排（含 Redis、Nginx）
- **Capacitor** 移动端支持（iOS/Android）

## 快速开始

### 环境要求

- Node.js 18+
- npm 或 yarn

### 安装步骤

1. **克隆项目**

```bash
git clone https://github.com/buyaoxiangtale/Another-chance.git
cd gushi
```

2. **安装依赖**

```bash
npm install
```

3. **环境配置**

```bash
cp .env.example .env.local
# 编辑 .env.local，填入 AI_API_KEY 和 AI_BASE_URL
```

4. **初始化数据**

```bash
mkdir -p data
npx tsx seed.js          # 基础种子数据（3个故事）
# 或使用更丰富的数据：
# npx tsx prisma/seed.ts  # 含角色、时间轴、设定集的完整数据
```

5. **启动开发服务器**

```bash
npm run dev
```

6. **访问应用**

打开浏览器访问 [http://localhost:3002](http://localhost:3002)

## 项目结构

```
gushi/
├── src/
│   ├── app/                    # Next.js App Router 页面与 API 路由
│   │   ├── api/                # API 路由（17个端点）
│   │   ├── create/             # 创建故事页
│   │   └── story/[id]/         # 故事详情页
│   ├── components/             # React 组件
│   │   ├── CharacterPanel.tsx
│   │   ├── DirectorSidebar.tsx
│   │   ├── PacingControls.tsx
│   │   ├── StreamingText.tsx
│   │   ├── TimelineBar.tsx
│   │   └── story/
│   ├── lib/                    # 核心业务逻辑
│   │   ├── simple-db.ts        # JSON 文件存储引擎
│   │   ├── ai-client.ts        # AI API 客户端
│   │   ├── prompt-builder.ts   # Prompt 构建
│   │   ├── character-engine.ts # 角色系统
│   │   ├── timeline-engine.ts  # 时间轴引擎
│   │   ├── director-manager.ts # 导演模式
│   │   ├── pacing-engine.ts    # 节奏控制
│   │   ├── mcp-wikipedia.ts    # 维基百科集成
│   │   └── ...
│   └── types/                  # TypeScript 类型定义
├── data/                       # JSON 数据文件（运行时数据库）
├── prisma/                     # Prisma Schema（预留）
├── scripts/                    # 工具脚本
│   ├── migrate-data.js         # 数据迁移
│   └── migrate-chronosmirror.js
├── tests/                      # 测试文件（Vitest）
├── Docs/                       # 文档
├── docker-compose.yml
├── Dockerfile
└── Dockerfile.dev
```

## 数据存储

项目使用 JSON 文件存储数据（`src/lib/simple-db.ts`），数据文件位于 `data/` 目录：

| 文件                           | 说明         |
| ------------------------------ | ------------ |
| `stories.json`               | 故事列表     |
| `segments.json`              | 故事段落     |
| `branches.json`              | 分叉节点     |
| `characters.json`            | 角色数据     |
| `historical-references.json` | 历史引用     |
| `director-states.json`       | 导演模式状态 |
| `lorebook.json`              | 设定集       |
| `knowledge-cache.json`       | 知识缓存     |

### 数据模型

#### Story (故事)

```typescript
interface Story {
  id: string;
  title: string;
  description?: string;
  author?: string;
  era?: string;
  genre?: string;
  rootSegmentId?: string;
  createdAt: string;
  updatedAt: string;
}
```

#### StorySegment (故事段落)

```typescript
interface StorySegment {
  id: string;
  title?: string;
  content: string;
  order: number;
  isBranchPoint: boolean;
  storyId: string;
  parentBranchId?: string;
  imageUrls: string[];
  timeline?: string;
  characterIds: string[];
  narrativePace?: 'rush' | 'detailed' | 'pause' | 'summary';
  mood?: string;
  createdAt: string;
  updatedAt: string;
}
```

#### StoryBranch (分叉节点)

```typescript
interface StoryBranch {
  id: string;
  title?: string;
  description?: string;
  segmentId: string;
  parentStoryId?: string;
  createdAt: string;
  updatedAt: string;
}
```

## AI 集成

### 环境变量配置

在 `.env.local` 中配置：

```env
AI_API_KEY=your_api_key
AI_BASE_URL=https://open.bigmodel.cn/api/coding/paas/v4
AI_MODEL=glm-5.1
```

支持任何 OpenAI 兼容的 API 服务（如 DeepSeek、通义千问等），修改 `AI_BASE_URL` 即可。

## API 端点

| 端点                                  | 方法             | 说明                |
| ------------------------------------- | ---------------- | ------------------- |
| `/api/stories`                      | GET/POST         | 故事列表 / 创建故事 |
| `/api/stories/[id]`                 | GET/DELETE       | 获取 / 删除故事     |
| `/api/stories/[id]/segments`        | GET              | 获取段落列表        |
| `/api/stories/[id]/tree`            | GET              | 获取故事树结构      |
| `/api/stories/[id]/branch`          | POST             | 创建分叉            |
| `/api/stories/[id]/continue`        | POST             | AI 续写             |
| `/api/stories/[id]/stream-continue` | POST             | 流式 AI 续写        |
| `/api/stories/[id]/characters`      | GET/POST         | 角色管理            |
| `/api/characters/[id]`              | GET/PATCH/DELETE | 单角色操作          |
| `/api/stories/[id]/timeline`        | GET/POST         | 时间轴操作          |
| `/api/stories/[id]/director`        | GET/PATCH        | 导演模式            |
| `/api/lorebook`                     | GET/POST         | 设定集              |
| `/api/fandom-lorebook`              | GET              | Fandom 设定集       |
| `/api/knowledge/search`             | GET              | 历史知识搜索        |
| `/api/knowledge/factcheck`          | POST             | 事实核查            |
| `/api/images`                       | GET              | 图片列表            |
| `/api/images/generate`              | POST             | 生成图片            |

## 开发脚本

```bash
# 开发服务器
npm run dev

# 构建应用
npm run build

# 启动生产服务器
npm start

# 代码检查
npm run lint
```

### 移动端（Capacitor）

```bash
npm run mobile:setup       # 初始化 Capacitor
npm run mobile:build       # 构建移动端
npm run mobile:run         # 运行移动端
```

## Docker 部署

### 开发环境

```bash
docker-compose up gushi-dev
```

### 生产环境

```bash
docker-compose up -d gushi-app
docker-compose logs -f gushi-app
```

## 使用指南

### 阅读故事

1. 在首页选择一个历史故事
2. 按时间顺序阅读故事段落
3. 在分叉点选择不同的故事走向

### 创建分叉

1. 点击故事中的分叉点
2. 选择分叉方向（alternate/different/extended）
3. 系统自动生成新的故事分支

### ChronosMirror 功能

**创建角色：** 在故事详情页的角色面板中添加角色，填写姓名、朝代、角色定位、性格特质、口癖和核心动机。角色会自动关联到续写 prompt。

**使用导演模式：** 打开故事详情页的导演侧边栏，可以：

- 修改角色当前状态（如"受伤"、"愤怒"）
- 设置世界变量（如"天气：暴雨"、"时间：深夜"）
- 添加叙事约束（如"不得出现火器"）

**控制节奏：** 在续写时选择节奏参数：

- `detailed`：详细叙事，适合高潮场景
- `rush`：快节奏，适合过渡场景
- `pause`：暂停，适合情感沉淀
- `summary`：概述，适合快速推进

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情
