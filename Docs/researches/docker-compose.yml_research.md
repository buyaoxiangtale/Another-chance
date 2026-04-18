# docker-compose.yml 研究报告

## 1. 文件用途

docker-compose.yml 是"古事"项目的容器编排配置文件，定义了完整的服务架构：应用服务、开发环境、数据库、Redis 缓存和 Nginx 反向代理。它使得项目可以一键启动完整的开发和生产环境。

## 2. 导出

不导出任何内容，声明式基础设施配置。

## 3. 依赖

- Docker Engine
- Docker Compose v3.8+
- 外部镜像：node:18-alpine、redis:7-alpine、nginx:alpine、alpine:latest

## 4. 核心逻辑

定义了 5 个服务：

**gushi-app（生产应用）**：
- 端口映射 3002
- 环境变量注入 AI API 密钥
- 挂载 data/ 和 prisma/ 目录
- 依赖 gushi-db 服务

**gushi-dev（开发环境）**：
- 挂载整个项目目录（热重载）
- 运行 `npm run dev`
- 排除 node_modules 和 .next 避免 Docker 覆盖

**gushi-db（SQLite 数据目录）**：
- 使用 alpine 镜像仅做目录初始化
- 创建持久化卷 sqlite_data

**gushi-redis（缓存）**：
- Redis 7 Alpine
- 持久化卷 redis_data
- 端口 6379

**gushi-nginx（反向代理）**：
- 端口 80/443
- 挂载 nginx.conf 和 SSL 证书
- 依赖 gushi-app

两个持久化卷：sqlite_data 和 redis_data。

## 5. 数据流

`docker-compose up` → 按依赖顺序启动服务 → gushi-db 初始化数据目录 → gushi-redis 启动缓存 → gushi-app 构建并启动 → gushi-nginx 代理外部请求。开发环境通过 volume mount 实现代码热重载。

## 6. ChronosMirror 升级改进点

### 角色建模
- **角色服务独立化**：角色建模计算密集，建议拆分为独立服务 `gushi-character-service`，与主应用通过 Redis 或 HTTP 通信。这样可以独立扩展角色推理的计算资源。
- **GPU 支持**：如果角色 AI 推理需要 GPU，需要修改 docker-compose 配置添加 `deploy.resources.reservations.devices` 支持 NVIDIA GPU。
- **角色数据持久化**：当前 SQLite 单文件数据库在角色数据量增大后可能成为瓶颈，建议增加 PostgreSQL 服务选项。

### 时间轴校验
- **校验服务容器化**：时间轴校验可以作为独立微服务运行，通过消息队列与主应用通信。docker-compose 中可增加 RabbitMQ 或 Redis Streams 作为消息中间件。
- **历史数据库服务**：可增加专用的历史知识库服务容器，预加载历史时间线数据，为校验提供快速查询。

### MCP 维基百科
- **MCP 代理服务**：维基百科 API 调用需要代理和缓存层。建议增加 `gushi-mcp-proxy` 服务，负责 API 限流、响应缓存、失败重试。
- **Elasticsearch**：大量历史文本检索可能需要 Elasticsearch 服务支持全文搜索，可在 docker-compose 中添加。

### 节奏控制
- **流式处理支持**：叙事节奏的 AI 生成可能需要 SSE/WebSocket 长连接。Nginx 需要配置 `proxy_buffering off` 和 WebSocket 升级支持，当前 nginx.conf 是外部挂载的，需要确保包含这些配置。
- **Redis 流**：节奏控制的状态管理可利用 Redis Streams 实现事件驱动的叙事引擎。

### 总体改进建议
1. 增加健康检查（healthcheck）配置
2. 增加资源限制（mem_limit、cpus）
3. 使用 Docker secrets 管理敏感信息替代环境变量
4. 增加 Prometheus + Grafana 监控栈
5. 增加 logging 配置统一日志格式
6. 考虑 Kubernetes 编排的兼容性
