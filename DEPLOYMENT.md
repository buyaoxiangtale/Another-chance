# 古事 (Gushi) - Docker 部署指南

## 快速开始

### Windows 用户部署步骤

#### 1. 前置要求
- Docker Desktop for Windows（已安装并运行）
- Git（可选，用于克隆仓库）
- 编辑器（如 VS Code，用于编辑 `.env` 文件）

#### 2. 克隆或下载项目
```powershell
# 如果使用 Git
git clone <仓库地址>
cd Another-chance

# 或直接下载并解压到文件夹
cd D:\Another-chance
```

#### 3. 配置环境变量
复制 `.env.example` 为 `.env` 并填入必要配置：

```powershell
# PowerShell
Copy-Item .env.example .env
notepad .env
```

**必须填写的配置：**

```env
# 认证密钥（用于 NextAuth）
AUTH_SECRET=随机生成的Base64字符串
NEXTAUTH_SECRET=与AUTH_SECRET相同的字符串
NEXTAUTH_URL=http://localhost:3000
AUTH_TRUST_HOST=true

# AI API 配置
AI_API_KEY=你的OpenAI API密钥或其他兼容API密钥
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4

# 图片生成配置
AI_IMAGE_PROVIDER=openai
AI_IMAGE_API_KEY=你的图片API密钥
AI_IMAGE_MODEL=dall-e-3
```

**生成 AUTH_SECRET（PowerShell）：**
```powershell
$secret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})
$base64Secret = [System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($secret))
Write-Host "AUTH_SECRET=$base64Secret"
```

#### 4. 启动服务
```powershell
# 启动 PostgreSQL 和应用服务
docker compose up -d postgres gushi-app

# 查看服务状态
docker compose ps

# 查看日志（如果启动失败）
docker compose logs -f gushi-app
```

#### 5. 初始化数据库
在 Windows 本地执行 Prisma 迁移（容器内可能有问题）：

```powershell
# 设置数据库连接字符串
$env:DATABASE_URL = "postgresql://gushi:gushi_dev@127.0.0.1:5432/gushi_dev"

# 推送数据库 Schema
npx prisma db push --schema=prisma/schema.prisma
```

#### 6. 验证部署
```powershell
# 检查应用健康状态
curl http://localhost:3000/api/health

# 或用浏览器打开
start http://localhost:3000
```

**预期结果：**
- `docker compose ps` 显示 `gushi-app` 和 `postgres` 都是 `healthy`
- 浏览器访问 `http://localhost:3000` 显示正常页面
- `/api/health` 返回 `200 OK`

## 目录结构

```
Another-chance/
├── docker-compose.yml      # Docker Compose 配置
├── Dockerfile              # 生产环境 Docker 镜像
├── Dockerfile.dev          # 开发环境 Docker 镜像
├── .env.example            # 环境变量模板
├── .env                    # 实际环境变量（需自行创建）
├── .dockerignore           # Docker 构建忽略文件
├── nginx.conf.example      # Nginx 配置示例（可选）
├── public/
│   └── generated-images/   # AI 生成的图片（持久化挂载）
├── backups/                # 数据库备份目录（持久化挂载）
└── data/                   # 运行时数据（持久化挂载）
```

## 服务说明

### 核心服务

| 服务名 | 容器名 | 端口 | 说明 |
|--------|--------|------|------|
| postgres | gushi-postgres | 5433 | PostgreSQL 数据库 |
| gushi-app | gushi-app | 3000 | 主应用服务 |

### 可选服务（需使用 profiles）

| 服务名 | 容器名 | 端口 | 说明 |
|--------|--------|------|------|
| gushi-dev | gushi-dev | 3001 | 开发环境（热重载） |
| gushi-redis | gushi-redis | 6379 | Redis 缓存 |
| gushi-nginx | gushi-nginx | 80/443 | 反向代理 |

**启动可选服务：**
```powershell
# 启动开发环境
docker compose --profile dev up -d

# 启动 Redis
docker compose --profile redis up -d

# 启动 Nginx（需要先配置 nginx.conf）
docker compose --profile nginx up -d
```

## 常用命令

### 服务管理
```powershell
# 启动服务
docker compose up -d postgres gushi-app

# 停止服务
docker compose down

# 重启服务
docker compose restart gushi-app

# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f gushi-app
docker compose logs --tail=100 gushi-app
```

### 构建和更新
```powershell
# 重新构建镜像
docker compose build --no-cache gushi-app

# 重启并重建
docker compose up -d --build gushi-app

# 清理旧镜像
docker image prune -f
```

### 数据库操作
```powershell
# 推送 Schema（在 Windows 本地执行）
$env:DATABASE_URL = "postgresql://gushi:gushi_dev@127.0.0.1:5433/gushi_dev"
npx prisma db push

# 打开 Prisma Studio
npx prisma studio

# 进入 PostgreSQL 容器
docker compose exec postgres psql -U gushi -d gushi_dev
```

### 进入容器
```powershell
# 进入应用容器
docker compose exec gushi-app sh

# 查看容器内文件
docker compose exec gushi-app ls -la /app/public/generated-images
```

## 故障排查

### 1. 服务无法启动

**检查日志：**
```powershell
docker compose logs gushi-app
```

**常见问题：**
- 端口被占用：修改 `docker-compose.yml` 中的端口映射
- 环境变量缺失：检查 `.env` 文件是否完整
- 权限问题：以管理员身份运行 PowerShell

### 2. UntrustedHost 错误

**解决方法：**
确保 `.env` 中包含：
```env
AUTH_TRUST_HOST=true
```

### 3. JWTSessionError

**解决方法：**
清理浏览器 localhost:3000 的 cookies，或使用无痕模式访问。

### 4. Prisma/OpenSSL 错误

**解决方法：**
本项目已使用 `node:18-bookworm-slim` 镜像，包含 OpenSSL。如果仍有问题，重新构建：
```powershell
docker compose build --no-cache gushi-app
```

### 5. 健康检查失败

**检查应用状态：**
```powershell
curl http://localhost:3000/api/health
```

**查看健康检查日志：**
```powershell
docker compose inspect gushi-app | Select-String -Pattern "Health"
```

### 6. 图片无法显示

**检查文件是否存在：**
```powershell
docker compose exec gushi-app ls -la /app/public/generated-images
```

**检查本地挂载目录：**
```powershell
ls .\public\generated-images
```

**测试图片访问：**
```powershell
curl -I http://localhost:3000/generated-images/test.png
```

### 7. 数据库连接失败

**检查 PostgreSQL 状态：**
```powershell
docker compose ps postgres
```

**测试连接：**
```powershell
docker compose exec postgres pg_isready -U gushi -d gushi_dev
```

## 数据持久化

以下目录已配置持久化，数据不会在容器重建后丢失：

- `postgres_data`: PostgreSQL 数据（Docker volume）
- `./public/generated-images`: AI 生成的图片
- `./backups`: 数据库备份
- `./data`: 运行时数据

## 生产环境部署建议

1. **安全性**
   - 修改默认数据库密码
   - 使用强随机密钥作为 AUTH_SECRET
   - 配置 HTTPS（使用 Nginx）

2. **性能优化**
   - 启用 Redis 缓存
   - 配置 CDN 加速静态资源
   - 调整数据库连接池大小

3. **监控和备份**
   - 配置日志收集
   - 设置定期数据库备份
   - 配置健康检查告警

4. **扩展性**
   - 使用 Docker Swarm 或 Kubernetes 部署
   - 配置负载均衡
   - 数据库读写分离

## 开发模式

如果需要开发模式（热重载）：

```powershell
# 启动开发环境
docker compose --profile dev up -d postgres gushi-dev

# 代码修改会自动热重载
# 访问 http://localhost:3001
```

## 更新项目

```powershell
# 拉取最新代码
git pull

# 重新构建并启动
docker compose down
docker compose build --no-cache gushi-app
docker compose up -d postgres gushi-app

# 更新数据库 Schema（如有变更）
$env:DATABASE_URL = "postgresql://gushi:gushi_dev@127.0.0.1:5433/gushi_dev"
npx prisma db push
```

## 清理

```powershell
# 停止并删除容器
docker compose down

# 停止并删除容器、卷
docker compose down -v

# 清理未使用的镜像和容器
docker system prune -a
```

## 许可证

请参考项目根目录的 LICENSE 文件。

## 支持

如遇到问题，请：
1. 查看本文档的故障排查部分
2. 检查 Docker 日志：`docker compose logs -f`
3. 提交 Issue 到项目仓库

---

**注意：**
- 首次部署建议在开发环境测试
- 生产环境部署前请备份重要数据
- 不要将 `.env` 文件提交到版本控制
- 定期更新依赖和安全补丁
