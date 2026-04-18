# Dockerfile 研究报告

## 1. 文件用途

Dockerfile 是"古事"项目的容器镜像构建脚本，使用多阶段构建（multi-stage build）将 Next.js 应用打包为优化的生产环境 Docker 镜像。它确保了从开发到生产环境的一致性。

## 2. 导出

不导出任何内容，声明式构建指令。

## 3. 依赖

- 基础镜像：node:18-alpine
- 构建工具链：npm、npx、prisma
- 运行时依赖由 package.json 定义

## 4. 核心逻辑

三阶段构建流程：

**Stage 1: deps（依赖安装）**
- 仅复制 package.json、package-lock.json 和 prisma/
- `npm ci --only=production` 安装生产依赖
- 利用 Docker 缓存层，依赖不变时跳过重装

**Stage 2: builder（应用构建）**
- 安装全部依赖（含开发依赖）
- 复制完整源代码
- `npx prisma generate` 生成 Prisma 客户端
- `npm run build` 构建 Next.js 应用

**Stage 3: runner（生产运行）**
- 创建非 root 用户 nextjs（安全最佳实践）
- 仅复制必要产物：public/、.next/standalone、.next/static、prisma/
- 设置 `NODE_ENV=production`
- 暴露端口 3002
- 启动命令：`node server.js`（standalone 模式）

## 5. 数据流

源代码 → deps 阶段安装依赖 → builder 阶段编译构建 → runner 阶段仅复制产物 → 最终镜像。运行时：`node server.js` → Next.js standalone 服务器 → 监听 3002 端口 → 处理 HTTP 请求。

## 6. ChronosMirror 升级改进点

### 角色建模
- **构建阶段增加角色数据**：如果角色模型需要预训练数据或嵌入向量，应在 builder 阶段就准备好，避免运行时冷启动。可以在 Dockerfile 中增加角色数据初始化步骤。
- **GPU 镜像变体**：角色 AI 推理可能需要 GPU 支持，建议创建 Dockerfile.gpu 变体，使用 `nvidia/cuda` 基础镜像。同时保持 CPU 版本用于轻量部署。
- **Prisma 迁移**：角色建模新增的数据库表需要在构建时运行 `npx prisma migrate deploy`，当前仅运行 `prisma generate`（生成客户端），缺少迁移步骤。

### 时间轴校验
- **历史数据预加载**：时间轴校验需要的历史时间线数据应在构建阶段或容器启动时（entrypoint 脚本）加载。建议增加 entrypoint.sh 脚本处理数据库迁移和数据初始化。
- **构建缓存优化**：历史知识库更新频率低于应用代码，可以将知识库数据作为单独的 Docker 卷，避免每次重新构建。

### MCP 维基百科
- **MCP 客户端打包**：维基百科 MCP 客户端库需要在构建时正确安装。如果使用 Python MCP SDK，需要多语言构建环境（Node.js + Python），建议使用独立容器或预编译的 WASM 模块。
- **SSL 证书**：维基百科 API 调用需要 HTTPS，alpine 镜像默认包含 ca-certificates，但应显式安装并更新：`RUN apk add --no-cache ca-certificates && update-ca-certificates`。

### 节奏控制
- **流式响应优化**：叙事生成的 SSE 流式传输需要 Nginx 或 Next.js 配置正确的缓冲策略。standalone 模式下需要确保 `server.js` 正确处理长连接。
- **内存限制**：AI 生成可能消耗大量内存，建议在 Dockerfile 文档中注明推荐的内存配置（如 `docker run -m 2g`）。

### 总体改进建议
1. 增加 `.dockerignore` 文件优化构建上下文大小
2. 使用 `npx prisma migrate deploy` 替代仅 generate
3. 增加 healthcheck 指令：`HEALTHCHECK --interval=30s CMD wget -q --spider http://localhost:3002/api/health`
4. 考虑使用 distroless 基础镜像进一步减小攻击面
5. 增加 ENTRYPOINT 脚本处理启动前检查
6. 构建参数化：使用 ARG 指令支持自定义 Node.js 版本
