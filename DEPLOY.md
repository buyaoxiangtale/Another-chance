# Windows Docker 部署快速指南

## 前置要求

- Docker Desktop for Windows 已安装并运行
- PowerShell 或 Git Bash

## 快速部署步骤

### 1. 克隆项目

```powershell
git clone <repository-url>
cd Another-chance
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并填写必要配置：

```powershell
copy .env.example .env
```

**必须配置的项目：**

```env
# 认证密钥（必须修改为随机字符串，可用 openssl rand -base64 32 生成）
AUTH_SECRET=your_random_secret_here
NEXTAUTH_SECRET=your_random_secret_here

# AI API 配置
AI_API_KEY=your_api_key
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4

# 图片生成配置
AI_IMAGE_API_KEY=your_api_key
AI_IMAGE_BASE_URL=https://api.openai.com/v1
AI_IMAGE_MODEL=dall-e-3
```

### 3. 创建必要目录

```powershell
# 创建图片存储目录
mkdir public\generated-images -ErrorAction SilentlyContinue
# 创建备份目录
mkdir backups -ErrorAction SilentlyContinue
# 创建数据目录
mkdir data -ErrorAction SilentlyContinue
```

### 4. 构建并启动

```powershell
# 构建镜像
docker compose build gushi-app

# 启动服务
docker compose up -d postgres gushi-app

# 等待服务健康（约 30-60 秒）
docker compose ps
```

### 5. 初始化数据库

```powershell
# 进入容器执行数据库迁移
docker compose exec gushi-app npx prisma db push --schema=prisma/schema.prisma
```

### 6. 验证部署

```powershell
# 检查服务状态
docker compose ps

# 测试主页
curl http://localhost:3000

# 测试健康检查
curl http://localhost:3000/api/health
```

## 常见问题排查

### 问题 1：容器 unhealthy

**症状：** `docker compose ps` 显示 `(unhealthy)`

**排查：**

```powershell
# 查看日志
docker compose logs --tail=100 gushi-app

# 常见原因：
# 1. AUTH_SECRET 未配置
# 2. 数据库未就绪
# 3. 端口被占用
```

### 问题 2：数据库连接失败

**症状：** 日志显示 `Can't reach database server`

**解决：**

```powershell
# 确认数据库健康
docker compose ps postgres

# 重启服务
docker compose restart gushi-app
```

### 问题 3：图片 404

**症状：** 生成的图片无法显示

**解决：**

```powershell
# 检查图片目录权限
docker compose exec gushi-app ls -la /app/public/generated-images

# 确保目录存在且有权限
mkdir public\generated-images -ErrorAction SilentlyContinue
docker compose restart gushi-app
```

### 问题 4：登录后 JWTSessionError

**症状：** `no matching decryption secret`

**解决：** 清除浏览器 localhost:3000 的 Cookie，或使用无痕窗口。

## 端口说明

| 服务 | 端口 | 说明 |
|------|------|------|
| gushi-app | 3000 | 主应用 |
| postgres | 5433 | 数据库（映射到宿主机） |

## 停止服务

```powershell
# 停止服务
docker compose down

# 停止并删除数据卷（注意：会清空数据库）
docker compose down -v
```

## 更新部署

```powershell
# 拉取最新代码
git pull

# 重新构建并启动
docker compose build --no-cache gushi-app
docker compose up -d postgres gushi-app
```
