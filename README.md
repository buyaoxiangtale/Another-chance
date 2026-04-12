# 古事 (Gushi) - 分叉故事续写平台

> 基于历史/经典故事的关键片段和人物产生分叉剧情的故事续写平台

## 📖 项目简介

古事是一个创新的故事续写平台，用户可以选择历史故事的关键转折点（如"秦始皇被成功刺杀"），系统将生成连续的分叉故事线。平台采用纯文本版本先行，后续将支持 AI 生成图片。

### 🎯 核心功能

- **故事树状展示** - 以树状结构展示故事发展脉络
- **多路线分叉** - 在关键节点提供不同的故事走向选择
- **AI 续写** - 基于历史背景智能生成故事内容
- **流式阅读** - 支持打字机效果的故事展示
- **响应式设计** - 适配桌面和移动设备

## 🛠️ 技术栈

### 前端
- **Next.js 14** (App Router)
- **TypeScript**
- **TailwindCSS**
- **React**

### 后端
- **Next.js API Routes**
- **Prisma ORM**
- **SQLite** (开发) / PostgreSQL (生产)

### AI 集成
- **OpenAI-compatible API** 支持
- 可配置的 AI 文本生成
- 图片生成预留接口

### 部署
- **Docker** 容器化部署
- **Docker Compose** 编排
- **Nginx** 反向代理 (可选)

## 🚀 快速开始

### 环境要求

- Node.js 18+ 
- npm 或 yarn
- Git

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
# 复制环境变量模板
cp .env.example .env.local

# 编辑环境变量
nano .env.local
```

4. **数据库初始化**
```bash
# 生成 Prisma 客户端
npx prisma generate

# 运行数据库迁移（如果使用 Prisma Migrate）
npx prisma migrate dev --name init

# 或者使用种子数据填充数据库
npm run db:seed
```

5. **启动开发服务器**
```bash
npm run dev
```

6. **访问应用**
打开浏览器访问 [http://localhost:3000](http://localhost:3000)

### 使用 Docker 部署

#### 开发环境
```bash
# 构建并启动开发环境
docker-compose -f docker-compose.yml up gushi-dev

# 或单独启动开发服务
docker-compose up gushi-dev
```

#### 生产环境
```bash
# 构建并启动生产环境
docker-compose up -d gushi-app

# 查看日志
docker-compose logs -f gushi-app
```

## 📁 项目结构

```
gushi/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── api/            # API 路由
│   │   ├── components/     # React 组件
│   │   ├── lib/            # 工具函数
│   │   └── types/          # TypeScript 类型定义
│   ├── prisma/             # 数据库模式和迁移
│   └── public/             # 静态资源
├── data/                   # 数据存储（JSON 文件）
├── docker-compose.yml      # Docker 编排配置
├── Dockerfile             # 生产环境构建
├── Dockerfile.dev         # 开发环境构建
└── README.md              # 项目说明
```

## 🗄️ 数据库

### 数据模型

#### Story (故事主线)
```typescript
interface Story {
  id: string;
  title: string;
  description?: string;
  author?: string;
  createdAt: string;
  updatedAt: string;
  rootSegmentId?: string;
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
  createdAt: string;
  updatedAt: string;
  storyId: string;
  parentBranchId?: string;
  imageUrls: string[];
  imageMetadata?: Array<{
    id: string;
    url: string;
    description?: string;
    type: 'illustration' | 'scene' | 'character' | 'object';
    width?: number;
    height?: number;
    alt?: string;
  }>;
  hasImages: boolean;
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

### 数据迁移

```bash
# 创建新的迁移
npx prisma migrate dev --name migration-name

# 应用迁移
npx prisma migrate deploy

# 重置数据库（开发环境）
npx prisma migrate reset --force

# 查看数据库状态
npx prisma studio
```

## 🤖 AI 集成

### 环境变量配置

在 `.env.local` 中配置 AI API 相关变量：

```env
AI_API_KEY=your_openai_api_key
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-3.5-turbo
```

### 支持的 AI 服务

- **OpenAI GPT** (默认)
- **兼容 OpenAI 的 API 服务**
- **自定义 API 端点**

### 图片生成预留

平台预留了图片生成功能，支持：

- 多种图片尺寸（256x256 到 1792x1024）
- 图片质量设置（标准/高清）
- 多种艺术风格

## 📱 使用指南

### 阅读故事

1. 在首页选择一个历史故事
2. 按时间顺序阅读故事段落
3. 在分叉点选择不同的故事走向

### 创建分叉

1. 点击故事中的分叉点
2. 选择分叉方向（alternate/different/extended）
3. 系统自动生成新的故事分支

### 故事续写

1. 选择要续写的段落
2. 设置续写风格和人物
3. AI 自动生成后续内容

## 🚀 部署指南

### 生产环境部署

1. **构建应用**
```bash
npm run build
```

2. **使用 Docker 部署**
```bash
docker-compose up -d
```

3. **配置 Nginx（可选）**
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 环境变量

生产环境需要设置以下变量：

```env
NODE_ENV=production
DATABASE_URL=file:./production.db
AI_API_KEY=your_production_api_key
AI_BASE_URL=https://api.openai.com/v1
```

## 📊 开发脚本

```bash
# 开发服务器
npm run dev

# 构建应用
npm run build

# 启动生产服务器
npm start

# 代码检查
npm run lint

# 类型检查
npm run type-check

# 数据库相关
npm run db:generate    # 生成 Prisma 客户端
npm run db:seed      # 填充种子数据
npm run db:studio    # 打开 Prisma Studio
```

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 打开 Pull Request

### 开发规范

- 使用 TypeScript 编写类型安全的代码
- 遵循 ESLint 和 Prettier 规范
- 编写清晰的 commit 消息
- 为新功能编写测试

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🙏 致谢

- [Next.js](https://nextjs.org/) - React 框架
- [Prisma](https://prisma.io/) - 数据库 ORM
- [TailwindCSS](https://tailwindcss.com/) - CSS 框架
- [OpenAI](https://openai.com/) - AI 服务提供商

## 📞 联系我们

- 项目主页: [GitHub Repository]
- 问题反馈: [Issues]
- 开发者邮箱: your-email@example.com

---

**古事** - 让历史故事焕发新的生命力 📚✨
