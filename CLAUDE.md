# CLAUDE.md - 古事 (Gushi) 项目指南

## 项目概述

古事是一个基于历史/经典故事关键片段的分叉故事续写平台。用户选择历史故事的关键转折点，系统通过 AI 生成连续的分叉故事线。

## 技术栈

- **框架**: Next.js 13 (App Router) + TypeScript + React 18
- **样式**: TailwindCSS
- **数据库**: PostgreSQL (Prisma ORM) + JSON 文件存储 (`data/` 目录，通过 `src/lib/simple-db.ts`)
- **AI**: OpenAI-compatible API（文本续写 + 图片生成）
- **部署**: Docker / Docker Compose（Redis + Nginx）+ Capacitor（iOS/Android）
- **测试**: Vitest
- **认证**: NextAuth.js

## 项目结构

```
src/
├── app/                    # Next.js App Router 页面和 API 路由
│   ├── api/                # API 端点
│   │   ├── stories/        # 故事 CRUD、续写、分叉、时间轴、导演模式
│   │   ├── knowledge/      # 知识搜索与事实核查
│   │   ├── images/         # 图片生成与风格推荐
│   │   ├── auth/           # 认证（注册/NextAuth）
│   │   └── me/             # 用户相关
│   └── page.tsx            # 主页面
├── components/             # React 组件
├── lib/                    # 核心库
│   ├── simple-db.ts        # JSON 文件存储引擎
│   ├── prisma.ts           # Prisma 客户端
│   ├── ai-client.ts        # AI API 客户端
│   ├── prompt-builder.ts   # AI 提示词构建
│   ├── timeline-engine.ts  # 时间轴校验（时间单调性检测）
│   ├── character-engine.ts # 角色系统
│   ├── pacing-engine.ts    # 叙事节奏控制 (rush/detailed/pause/summary)
│   ├── director-manager.ts # 导演模式（角色状态、世界变量、叙事约束）
│   ├── context-summarizer.ts  # 上下文摘要
│   ├── branch-memory.ts    # 分叉记忆
│   ├── consistency-checker.ts # 一致性检查
│   ├── lorebook.ts         # 世界观设定集
│   ├── knowledge-cache.ts  # 知识缓存
│   ├── web-search.ts       # 网络搜索
│   └── mcp-wikipedia.ts    # MCP 维基百科集成
├── types/                  # TypeScript 类型定义
└── middleware.ts           # Next.js 中间件

prisma/
├── schema.prisma           # 数据库 Schema（User, Account, Session, Story, StoryBranch 等）
├── seed.ts                 # 数据库种子
└── migrations/             # 数据库迁移

data/                       # JSON 文件存储（stories, branches, segments, characters 等）
scripts/                    # 工具脚本
tests/                      # Vitest 测试
```

## 常用命令

```bash
npm run dev                 # 启动开发服务器
npm run build               # 构建
npm run db:migrate          # Prisma 迁移
npm run db:push             # Prisma 推送 Schema
npm run db:seed             # 数据库种子
npm run db:studio           # Prisma Studio
npx vitest                  # 运行测试
npm run migrate:json        # JSON → PostgreSQL 迁移
npm run migrate:validate    # 验证迁移
```

## 开发约定

- API 路由遵循 Next.js App Router 约定（`route.ts`）
- 数据层双模式：Prisma（PostgreSQL）和 JSON 文件存储并存，正在从 JSON 迁移到 Prisma
- AI 续写支持流式输出（`stream-continue` 端点）
- 续写时自动通过维基百科检索历史实体注入事实锚点，防止幻觉
- 时间轴引擎会校验叙事时间单调性，自动检测时间倒流
- 环境变量：`AI_API_KEY`, `AI_BASE_URL`, `DATABASE_URL` 等（参考 `.env.example`）

## 注意事项

- `data/` 目录包含 JSON 格式的运行时数据，修改时需谨慎
- Prisma schema 变更后需运行 `npx prisma generate` 和 `npx prisma db push`
- Docker 部署配置见 `docker-compose.yml`
