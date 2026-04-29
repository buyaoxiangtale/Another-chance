# Windows 使用指南

## Windows 用户可以使用 Docker 部署古事平台

✅ **完全支持 Windows 10/11**

## 前置要求

### 1. 安装 Docker Desktop for Windows

**下载地址**: https://www.docker.com/products/docker-desktop/

**安装步骤**:
1. 下载 Docker Desktop Installer
2. 运行安装程序
3. 安装完成后重启计算机
4. 启动 Docker Desktop

**验证安装**:
```powershell
docker --version
docker-compose --version
```

### 2. 启用 WSL2 后端（推荐）

Docker Desktop 默认使用 WSL2 后端，性能更好。

**检查 WSL2 状态**:
```powershell
wsl --list --verbose
```

**如果未安装 WSL2**，在 PowerShell (管理员) 中运行:
```powershell
wsl --install
```

## 快速启动

### 方法 1: 使用 PowerShell（推荐）

```powershell
# 1. 克隆项目（如果还没有 git，先安装: https://git-scm.com/download/win）
git clone https://github.com/buyaoxiangtale/Another-chance.git
cd Another-chance

# 2. 复制环境变量文件
Copy-Item .env.example .env

# 3. 编辑 .env 文件（使用记事本或 VS Code）
notepad .env
# 至少需要配置:
# - AI_API_KEY=your_api_key
# - AI_BASE_URL=https://api.openai.com/v1
# - AI_MODEL=gpt-4

# 4. 启动服务
docker-compose up -d

# 5. 查看日志
docker-compose logs -f gushi-app

# 6. 访问应用
# 浏览器打开 http://localhost:3000
```

### 方法 2: 使用命令提示符 (cmd)

```cmd
git clone https://github.com/buyaoxiangtale/Another-chance.git
cd Another-chance
copy .env.example .env
notepad .env
docker-compose up -d
```

### 方法 3: 使用 Git Bash

如果你安装了 Git for Windows，可以使用 Git Bash：

```bash
git clone https://github.com/buyaoxiangtale/Another-chance.git
cd Another-chance
cp .env.example .env
notepad .env &
docker-compose up -d
```

## 常用命令

### PowerShell 命令

```powershell
# 启动所有服务
docker-compose up -d

# 停止所有服务
docker-compose down

# 查看服务状态
docker-compose ps

# 查看应用日志
docker-compose logs -f gushi-app

# 重启应用
docker-compose restart gushi-app

# 进入容器
docker exec -it gushi-app sh

# 数据库备份（需要 WSL 或 Git Bash）
# 或使用 PowerShell：
docker exec gushi-postgres pg_dump -U gushi gushi_dev > backup.sql
```

## 配置 .env 文件

### Windows 记事本编辑

```powershell
notepad .env
```

### VS Code 编辑（推荐）

```powershell
code .env
```

### 最小配置示例

```env
# AI API 配置（必需）
AI_API_KEY=sk-your_api_key_here
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4

# NextAuth 配置（必需）
NEXTAUTH_SECRET=生成一个随机字符串
NEXTAUTH_URL=http://localhost:3000

# 数据库配置（Docker Compose 会自动配置）
DATABASE_URL=postgresql://gushi:gushi_dev@postgres:5432/gushi_dev
```

### 生成 NEXTAUTH_SECRET

**PowerShell**:
```powershell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})
```

**在线生成**: https://generate-secret.vercel.app/32

## Windows 特定注意事项

### 1. 文件路径问题

Docker 会自动处理路径转换，无需担心：
- ✅ `./data` 会被正确映射
- ✅ 环境文件路径自动处理

### 2. 端口占用

如果端口 3000 被占用，修改 `docker-compose.yml`:

```yaml
services:
  gushi-app:
    ports:
      - "3001:3000"  # 改用 3001 端口
```

### 3. 防火墙提示

首次启动时，Windows 可能会弹出防火墙提示，选择"允许访问"。

### 4. 行尾符 (CRLF vs LF)

Git 可能会自动转换行尾符，建议配置：

```powershell
# 在项目根目录运行
git config core.autocrlf false
```

## Bash 脚本处理

项目中的 `.sh` 脚本（如 `scripts/backup-db.sh`）需要 bash 环境。

### 解决方案

#### 方案 1: 使用 WSL（推荐）

```powershell
# 在 WSL 中运行
wsl bash scripts/backup-db.sh backup
```

#### 方案 2: 使用 Git Bash

```bash
# 在 Git Bash 中运行
bash scripts/backup-db.sh backup
```

#### 方案 3: 转换为 PowerShell（高级）

创建 `scripts/backup-db.ps1`:

```powershell
$BACKUP_DIR = Join-Path $PSScriptRoot "..\backups"
New-Item -ItemType Directory -Force -Path $BACKUP_DIR | Out-Null

$DB_NAME = "gushi_dev"
$DB_USER = "gushi"
$TIMESTAMP = Get-Date -Format "yyyyMMdd_HHmmss"
$BACKUP_FILE = Join-Path $BACKUP_DIR "gushi_${TIMESTAMP}.sql"

# 检测容器
$CONTAINER = docker ps --format "{{.Names}}" | Select-String -Pattern "gushi-postgres" | Select-Object -FirstObject

if (-not $CONTAINER) {
    Write-Host "[ERROR] 未找到 PostgreSQL 容器" -ForegroundColor Red
    exit 1
}

# 备份
Write-Host "[INFO] 开始备份数据库..."
docker exec $CONTAINER pg_dump -U $DB_USER -d $DB_NAME --clean --if-exists | Out-File -Encoding UTF8 $BACKUP_FILE
Write-Host "[OK] 备份完成: $BACKUP_FILE" -ForegroundColor Green
```

运行：
```powershell
powershell -ExecutionPolicy Bypass -File scripts/backup-db.ps1
```

## 性能优化

### 1. 使用 WSL2 后端

Docker Desktop 设置：
- 打开 Docker Desktop
- Settings → General → Use WSL 2 based engine
- 点击 "Apply & Restart"

### 2. 资源分配

Docker Desktop 设置：
- Settings → Resources
- 建议分配至少 4GB 内存
- 建议分配 2+ CPU 核心

### 3. 文件共享

如果使用 WSL2，确保项目在 WSL 文件系统中：

```powershell
# 将项目放在 WSL 文件系统
wsl
cd ~/projects
git clone https://github.com/buyaoxiangtale/Another-chance.git
```

## 故障排查

### 问题 1: Docker Desktop 无法启动

**解决**:
1. 确保 WSL2 已安装: `wsl --install`
2. 更新 Windows 到最新版本
3. 以管理员身份运行 PowerShell: `wsl --update`

### 问题 2: docker-compose 命令不存在

**解决**:
```powershell
# 重新安装 Docker Desktop
# 或使用 docker compose（新语法）
docker compose up -d
```

### 问题 3: 端口已被占用

**解决**:
```powershell
# 查看端口占用
netstat -ano | findstr :3000

# 终止占用进程（使用 PID）
taskkill /PID <PID> /F
```

### 问题 4: 容器启动失败

**解决**:
```powershell
# 查看详细日志
docker-compose logs gushi-app

# 检查环境变量
docker exec gushi-app env | findstr AI_

# 重建容器
docker-compose down
docker-compose up -d --build
```

### 问题 5: 文件监视不工作

**解决**:
Docker Desktop Settings → Resources → File Sharing → 启用项目目录

## 开发环境

如果要在 Windows 上进行开发：

### 使用 WSL2 + VS Code

1. 安装 WSL2
2. 安装 VS Code 和 "WSL" 扩展
3. 在 WSL 中打开项目：

```bash
wsl
cd ~/projects/Another-chance
code .
```

### 使用 Git + npm

1. 安装 Node.js LTS: https://nodejs.org/
2. 安装 Git: https://git-scm.com/download/win
3. 正常开发流程：

```powershell
npm install
npm run dev
```

## 总结

✅ **Windows 完全支持 Docker 部署**
✅ **推荐使用 Docker Desktop + WSL2**
✅ **PowerShell 命令完全兼容**
✅ **所有核心功能正常工作**

有任何问题欢迎提 Issue！
