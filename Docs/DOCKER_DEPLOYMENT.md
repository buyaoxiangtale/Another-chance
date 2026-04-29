# Docker 部署指南

## 目录

- [快速开始](#快速开始)
- [平台支持](#平台支持)
- [使用预构建镜像](#使用预构建镜像)
- [从源码构建](#从源码构建)
- [GitHub Actions 自动构建](#github-actions-自动构建)
- [环境变量配置](#环境变量配置)
- [生产环境部署](#生产环境部署)

## 快速开始

### 前置要求

- Docker 20.10+
- Docker Compose 2.0+

## 平台支持

✅ **跨平台支持**: Windows, macOS, Linux

### Windows
- 安装 [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/)
- 推荐启用 WSL2 后端以获得更好的性能
- 详细的 Windows 使用指南: [Windows 支持文档](WINDOWS_SUPPORT.md)

### macOS
- 安装 [Docker Desktop for Mac](https://www.docker.com/products/docker-desktop/)
- 支持 Intel 和 Apple Silicon (M1/M2/M3) 芯片

### Linux
```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 启动 Docker 服务
sudo systemctl start docker
sudo systemctl enable docker
```

### 一键启动

```bash
# 1. 克隆仓库
git clone https://github.com/buyaoxiangtale/Another-chance.git
cd Another-chance

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，至少配置以下变量：
# - AI_API_KEY
# - AI_BASE_URL
# - AI_MODEL

# 3. 启动服务
docker-compose up -d

# 4. 访问应用
open http://localhost:3000
```

## 使用预构建镜像

我们提供了预构建的多架构 Docker 镜像，支持 `linux/amd64` 和 `linux/arm64`。

### 拉取镜像

```bash
# 拉取最新版本
docker pull dtr12345/another-chance:latest

# 拉取特定版本
docker pull dtr12345/another-chance:v1.0.0
```

### 运行容器

#### 使用 Docker Compose（推荐）

```bash
docker-compose up -d gushi-app
```

#### 使用 Docker 命令

```bash
docker run -d \
  --name gushi-app \
  -p 3000:3000 \
  -e DATABASE_URL=postgresql://gushi:gushi_dev@postgres:5432/gushi_dev \
  -e AI_API_KEY=your_api_key \
  -e AI_BASE_URL=https://api.openai.com/v1 \
  -e AI_MODEL=gpt-4 \
  -e NEXTAUTH_SECRET=your_secret_key \
  -e NEXTAUTH_URL=http://localhost:3000 \
  dtr12345/another-chance:latest
```

## 从源码构建

### 构建镜像

```bash
# 构建生产镜像
docker build -t gushi-app:local .

# 构建开发镜像
docker build -f Dockerfile.dev -t gushi-dev:local .
```

### 运行构建的镜像

```bash
docker run -d \
  --name gushi-app \
  -p 3000:3000 \
  --env-file .env \
  gushi-app:local
```

## GitHub Actions 自动构建

项目配置了 GitHub Actions workflow，会在以下情况自动构建并推送镜像：

- 推送到 `master` 或 `main` 分支
- 创建 tag（如 `v1.0.0`）
- 手动触发 workflow

### 配置 Docker Hub Secrets

在 GitHub 仓库中配置以下 secrets：

1. 进入仓库设置：`Settings` → `Secrets and variables` → `Actions`
2. 添加以下 secrets：

```
DOCKER_USERNAME=dtr12345
DOCKER_PASSWORD=your_docker_hub_token
```

### 获取 Docker Hub Token

1. 登录 [Docker Hub](https://hub.docker.com/)
2. 进入 `Account Settings` → `Security`
3. 点击 `New Access Token`
4. 输入描述（如 `GitHub Actions`）
5. 复制生成的 token

### 手动触发构建

1. 进入 GitHub 仓库的 `Actions` 标签
2. 选择 `Docker Image Build & Publish` workflow
3. 点击 `Run workflow`
4. 选择分支并点击 `Run workflow`

## 环境变量配置

### 必需配置

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `AI_API_KEY` | AI 服务 API 密钥 | `sk-xxx` |
| `AI_BASE_URL` | AI 服务 API 地址 | `https://api.openai.com/v1` |
| `AI_MODEL` | AI 模型名称 | `gpt-4` |
| `DATABASE_URL` | PostgreSQL 连接字符串 | `postgresql://user:pass@host:5432/db` |
| `NEXTAUTH_SECRET` | NextAuth 密钥 | 随机字符串 |
| `NEXTAUTH_URL` | 应用 URL | `http://localhost:3000` |

### 可选配置

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `AI_IMAGE_PROVIDER` | 图片 AI 服务商 | `openai` |
| `AI_IMAGE_API_KEY` | 图片 AI API 密钥 | - |
| `AI_IMAGE_MODEL` | 图片生成模型 | `dall-e-3` |
| `REDIS_URL` | Redis 连接字符串 | - |

### 生成 NEXTAUTH_SECRET

```bash
# 方法 1: 使用 openssl
openssl rand -base64 32

# 方法 2: 使用 Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## 生产环境部署

### 使用 Docker Compose

1. 修改 `docker-compose.yml` 中的环境变量
2. 启动服务：

```bash
docker-compose up -d
```

### 使用 Nginx 反向代理

项目包含可选的 Nginx 配置，修改 `docker-compose.yml` 启用：

```yaml
services:
  gushi-nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - gushi-app
    restart: unless-stopped
```

### 数据持久化

PostgreSQL 数据存储在 Docker volume 中：

```bash
# 查看 volumes
docker volume ls

# 备份数据
docker run --rm \
  -v gushi_postgres_data:/data \
  -v $(pwd)/backup:/backup \
  alpine tar czf /backup/postgres-backup.tar.gz -C /data .

# 恢复数据
docker run --rm \
  -v gushi_postgres_data:/data \
  -v $(pwd)/backup:/backup \
  alpine tar xzf /backup/postgres-backup.tar.gz -C /data
```

### 日志管理

```bash
# 查看日志
docker-compose logs -f gushi-app

# 查看最近 100 行日志
docker-compose logs --tail=100 gushi-app

# 清理日志
docker-compose logs --tail=0 -f gushi-app
```

## 健康检查

镜像内置健康检查，每 30 秒检查一次服务状态：

```bash
# 查看健康状态
docker ps
docker inspect --format='{{.State.Health.Status}}' gushi-app

# 手动触发健康检查
curl http://localhost:3000/api/health
```

## 故障排查

### 常见问题

1. **容器无法启动**
   ```bash
   # 查看容器日志
   docker logs gushi-app

   # 检查环境变量
   docker exec gushi-app env | grep AI_
   ```

2. **数据库连接失败**
   ```bash
   # 检查 PostgreSQL 是否运行
   docker-compose ps postgres

   # 测试数据库连接
   docker exec -it gushi-postgres psql -U gushi -d gushi_dev
   ```

3. **AI API 调用失败**
   ```bash
   # 检查 API 密钥配置
   docker exec gushi-app env | grep AI_API_KEY

   # 测试 API 连接
   curl -X POST https://api.openai.com/v1/chat/completions \
     -H "Authorization: Bearer $AI_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"model":"gpt-4","messages":[{"role":"user","content":"test"}]}'
   ```

## 更新镜像

```bash
# 拉取最新镜像
docker pull dtr12345/another-chance:latest

# 重新创建容器
docker-compose up -d --force-recreate gushi-app
```

## 架构支持

镜像支持以下架构：

- `linux/amd64` - x86_64 架构（大多数 PC 和服务器）
- `linux/arm64` - ARM 64 位架构（Apple Silicon Mac、ARM 服务器）

Docker 会自动选择适合当前系统的架构。
