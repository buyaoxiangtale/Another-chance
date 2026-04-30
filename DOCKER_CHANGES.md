# Docker 部署修复完成总结

本文档记录了根据详细排查文档修复的所有 Docker 部署相关问题和修改。

## 修复完成时间
2026-04-30

## 修复的问题清单

### 1. Docker Compose 服务名错误 ✓
**问题**: 服务名写错，启动时提示 `no such service: redis`
**修复**: `docker-compose.yml` 中服务名统一为 `gushi-redis`

### 2. 环境变量缺失 ✓
**问题**: `.env` 缺少 `AUTH_SECRET` 和 `AUTH_TRUST_HOST`
**修复**:
- `.env.example` 添加 `AUTH_SECRET` 和 `AUTH_TRUST_HOST=true`
- `.env.production.example` 添加相同配置

### 3. Auth.js UntrustedHost 错误 ✓
**问题**: 认证时出现 `UntrustedHost` 错误
**修复**:
- `docker-compose.yml` 中添加 `AUTH_TRUST_HOST=true`
- `Dockerfile` 中添加 `AUTH_TRUST_HOST=true` 环境变量

### 4. Prisma/OpenSSL 兼容性 ✓
**问题**: `node:18-alpine` 与 Prisma/OpenSSL 不兼容
**修复**: `Dockerfile` 基础镜像从 `node:18-alpine` 改为 `node:18-bookworm-slim`

### 5. 目录权限问题 ✓
**问题**: `/app/data` 目录创建时权限不足
**修复**: `Dockerfile` 中提前创建目录并授权：
```dockerfile
RUN mkdir -p /app/data /app/backups && \
    chown -R nextjs:nodejs /app/data /app/backups
```

### 6. 健康检查失败 ✓
**问题**: 容器健康检查失败
**修复**:
- 修改启动命令：`CMD ["sh", "-c", "HOSTNAME=0.0.0.0 node server.js"]`
- 健康检查指向 `/api/health` 端点

### 7. YAML 格式错误 ✓
**问题**: `docker-compose.yml` YAML 格式错误
**修复**: 所有环境变量统一使用列表格式 `- KEY=value`

### 8. 自动备份失败 ✓
**问题**: `pg_dump ENOENT` 错误
**修复**: `Dockerfile` 中安装 `postgresql-client` 和 `gzip`

### 9. 图片访问 404 ✓
**问题**: `/generated-images/xxx.png` 返回 404
**修复**: 创建动态路由 `src/app/generated-images/[filename]/route.ts`

### 10. 数据持久化 ✓
**问题**: 容器重建后数据丢失
**修复**: `docker-compose.yml` 添加持久化 volume：
```yaml
volumes:
  - ./public/generated-images:/app/public/generated-images
  - ./backups:/app/backups
  - ./data:/app/data
```

### 11. style-recommend 接口错误 ✓
**问题**: 访问不存在的 `meta.icon` 和 `meta.category`
**修复**: `src/app/api/images/style-recommend/route.ts` 改为空字符串

### 12. stories/route.ts 类型错误 ✓
**问题**: 使用 `characterIds` 导致 Prisma 类型错误
**修复**: 改为使用 `characters` 关系更新：
```typescript
data: {
  characters: {
    set: characterIds.map((id: string) => ({ id }))
  }
}
```

## 修改的文件列表

### 配置文件
- `docker-compose.yml` - 完整重构，添加持久化、修复格式错误
- `Dockerfile` - 改用 bookworm-slim、添加运行时依赖、修复权限和健康检查
- `.env.example` - 添加 AUTH_SECRET 和 AUTH_TRUST_HOST
- `.dockerignore` - 已存在，无需修改

### 源代码文件
- `src/app/api/images/style-recommend/route.ts` - 修复 icon/category 访问
- `src/app/api/stories/route.ts` - 修复 characterIds 类型错误
- `src/app/generated-images/[filename]/route.ts` - 新建图片访问路由

### 新建文件
- `nginx.conf.example` - Nginx 配置示例
- `DEPLOYMENT.md` - 详细的部署指南
- `quick-start.ps1` - PowerShell 快速启动脚本
- `quick-start.bat` - 批处理快速启动脚本
- `DockerCheck.ps1` - Docker 环境检查脚本
- `docker-compose.prod.yml` - 生产环境配置
- `.env.production.example` - 生产环境变量模板
- `DOCKER_CHANGES.md` - 本文档

### 目录结构
- `ssl/.gitkeep` - SSL 证书目录占位
- `public/generated-images/.gitkeep` - 生成图片目录占位

## 验证步骤

### 1. 环境检查
```powershell
# Windows PowerShell
.\DockerCheck.ps1

# 或手动检查
docker info  # Docker 是否运行
docker compose config  # 配置文件语法是否正确
```

### 2. 启动服务
```powershell
# 使用快速启动脚本
.\quick-start.ps1

# 或手动启动
docker compose up -d postgres gushi-app

# 查看服务状态
docker compose ps
```

### 3. 初始化数据库
```powershell
$env:DATABASE_URL = "postgresql://gushi:gushi_dev@127.0.0.1:5433/gushi_dev"
npx prisma db push --schema=prisma/schema.prisma
```

### 4. 验证服务
```powershell
# 健康检查
curl http://localhost:3000/api/health

# 主页访问
curl http://localhost:3000

# 浏览器访问
start http://localhost:3000
```

### 5. 测试图片访问
```powershell
# 生成测试图片后
curl -I http://localhost:3000/generated-images/test.png

# 应返回：
# HTTP/1.1 200 OK
# Content-Type: image/png
```

## 可选服务启动

### Redis 缓存
```powershell
docker compose --profile redis up -d
```

### Nginx 反向代理
1. 配置 `nginx.conf`（参考 `nginx.conf.example`）
2. 准备 SSL 证书（放入 `ssl/` 目录）
3. 启动服务：
```powershell
docker compose --profile nginx up -d
```

### 开发环境
```powershell
docker compose --profile dev up -d
# 访问 http://localhost:3001
```

## 生产环境部署

```powershell
# 1. 配置生产环境变量
Copy-Item .env.production.example .env.production
notepad .env.production

# 2. 启动生产服务
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# 3. 启用所有可选服务
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## 常见问题解决

### 问题：Docker 未运行
```powershell
# 启动 Docker Desktop
# 或检查 Docker 服务状态
docker info
```

### 问题：端口被占用
```powershell
# 检查端口占用
netstat -ano | findstr :3000
netstat -ano | findstr :5433

# 修改 docker-compose.yml 中的端口映射
```

### 问题：JWTSessionError
```powershell
# 清理浏览器 cookies
# 或使用无痕模式访问
```

### 问题：图片无法显示
```powershell
# 检查文件是否存在
docker compose exec gushi-app ls -la /app/public/generated-images

# 检查本地目录
ls .\public\generated-images

# 检查日志
docker compose logs -f gushi-app
```

## 数据备份与恢复

### 备份数据库
```powershell
# 在容器内执行
docker compose exec postgres pg_dump -U gushi gushi_dev > backup.sql

# 或使用挂载的备份目录
docker compose exec postgres pg_dump -U gushi gushi_dev > /app/backups/backup_$(date +%Y%m%d_%H%M%S).sql
```

### 恢复数据库
```powershell
docker compose exec -T postgres psql -U gushi gushi_dev < backup.sql
```

## 性能优化建议

1. **资源限制**: 已在 `docker-compose.prod.yml` 中配置
2. **数据库连接池**: 调整 PostgreSQL 连接数
3. **Redis 缓存**: 启用 Redis 缓存减轻数据库压力
4. **Nginx 反向代理**: 配置 gzip 压缩和静态资源缓存

## 安全建议

1. **修改默认密码**: 生产环境务必修改数据库密码
2. **使用 HTTPS**: 配置 Nginx SSL 证书
3. **限制访问**: 配置防火墙规则
4. **定期更新**: 保持 Docker 镜像和依赖更新
5. **密钥管理**: 不要将 `.env` 文件提交到版本控制

## 后续改进

- [ ] 添加数据库自动备份定时任务
- [ ] 配置日志收集和监控
- [ ] 实现 CI/CD 自动化部署
- [ ] 添加 SSL 证书自动续期
- [ ] 配置 CDN 加速静态资源

## 文档参考

- 详细部署指南: `DEPLOYMENT.md`
- Docker Compose 配置: `docker-compose.yml`
- 生产环境配置: `docker-compose.prod.yml`
- Nginx 配置示例: `nginx.conf.example`

---

**修复完成日期**: 2026-04-30
**适用环境**: Windows + Docker Desktop
**测试状态**: ✓ 已验证
