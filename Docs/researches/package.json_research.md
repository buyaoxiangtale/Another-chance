# 研究报告：package.json

## 概述

`package.json` 是 gushi 项目的包管理配置文件，定义了项目名称（gushi-temp）、版本（0.1.0）、脚本命令和依赖关系。

## 用途

管理项目的 npm 依赖和构建脚本，是项目工程化的核心配置。

## 依赖分析

### 生产依赖
| 包名 | 版本 | 用途 |
|------|------|------|
| next | 13.4.19 | Next.js 框架（App Router） |
| react / react-dom | 18.2.0 | React UI 库 |
| better-sqlite3 | ^12.8.0 | SQLite 同步绑定（高性能） |
| sqlite3 | ^6.0.1 | SQLite 异步绑定 |
| autoprefixer | ^10.4.27 | CSS 自动前缀 |

### 开发依赖
| 包名 | 版本 | 用途 |
|------|------|------|
| typescript | ^5 | TypeScript 编译器 |
| tailwindcss | ^3.4.0 | CSS 工具类框架 |
| eslint / eslint-config-next | ^9 / 13.4.19 | 代码检查 |

### 脚本命令
- **dev/build/start/lint**：标准 Next.js 开发流程
- **cap:***：Capacitor 移动端相关命令（iOS/Android 同步、打开、运行）
- **mobile:***：自定义移动端脚本（setup/build/run），调用 scripts/ 下的 shell 脚本

## 关键发现

### 1. 双 SQLite 驱动并存
同时安装了 `better-sqlite3`（同步）和 `sqlite3`（异步），这是异常配置。better-sqlite3 性能更优但只支持同步操作，sqlite3 支持异步但性能较差。实际代码可能只用其中一个，另一个是冗余依赖。ChronosMirror 升级时应统一为一个。

### 2. 移动端支持
Capacitor 脚本的存在说明项目计划或曾经支持移动端（iOS/Android 原生打包）。这是重要的部署目标，ChronosMirror 的 UI 设计需要考虑移动端适配。

### 3. Next.js 版本较旧
13.4.19 是 2023 年的版本，当前 Next.js 已到 15.x。但考虑到稳定性，不一定是问题。

### 4. 缺失的依赖
- 没有 Prisma 相关依赖（`prisma`、`@prisma/client`），说明 Prisma schema 可能已废弃
- 没有 AI/LLM 相关依赖（如 OpenAI SDK），续写功能可能通过直接 HTTP 调用实现
- 没有测试框架（jest、vitest）
- 没有状态管理库（zustand、redux）
- 没有 UI 组件库（shadcn、ant-design）

## ChronosMirror 升级改进点

### 1. 角色建模
新增依赖需求：可能需要图数据库或关系型数据库的高级特性来存储角色关系网络。如果角色关系复杂，考虑引入 `neo4j-driver` 或在 SQLite 中用 JSON 字段存储关系图。

### 2. 时间轴校验
当前依赖栈足够，不需要额外依赖。时间轴校验逻辑应在业务层实现，可以用 lightweight-charts 或 vis-timeline 做可视化调试（开发依赖）。

### 3. MCP 维基百科集成
需要新增依赖：
- `@modelcontextprotocol/sdk`：MCP 协议 SDK
- 或自行封装 Wikipedia REST API 客户端
- 建议添加 `node-cache` 用于缓存维基百科查询结果

### 4. 节奏控制
节奏分析可能需要 NLP 依赖：
- 考虑添加 `compromise`（轻量 NLP）用于文本情感和节奏分析
- 或依赖 AI 模型返回的结构化元数据

### 5. 工程化建议
- 添加 `vitest` 测试框架
- 添加 `zod` 用于运行时数据校验
- 移除重复的 SQLite 依赖
- 升级 Next.js 到 14.x 或 15.x（App Router 更成熟）
- 添加 `@prisma/client` 和 `prisma` 依赖，统一数据层
- 添加 `husky` + `lint-staged` 保障代码质量
