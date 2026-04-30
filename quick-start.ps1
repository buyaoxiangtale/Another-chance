# 古事 (Gushi) - 快速启动脚本 (Windows PowerShell)
# 使用方法：右键点击此文件，选择"使用 PowerShell 运行"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  古事 (Gushi) - 快速启动脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查 Docker 是否运行
Write-Host "检查 Docker 状态..." -ForegroundColor Yellow
try {
    $dockerInfo = docker info 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Docker 正在运行" -ForegroundColor Green
    } else {
        Write-Host "✗ Docker 未运行，请先启动 Docker Desktop" -ForegroundColor Red
        Read-Host "按 Enter 键退出"
        exit 1
    }
} catch {
    Write-Host "✗ Docker 未安装或未运行" -ForegroundColor Red
    Read-Host "按 Enter 键退出"
    exit 1
}

# 检查 .env 文件
Write-Host ""
Write-Host "检查配置文件..." -ForegroundColor Yellow
if (-not (Test-Path .env)) {
    Write-Host "✗ .env 文件不存在" -ForegroundColor Red
    Write-Host ""
    Write-Host "正在创建 .env 文件..." -ForegroundColor Yellow

    # 复制模板
    Copy-Item .env.example .env

    # 生成 AUTH_SECRET
    Write-Host "生成 AUTH_SECRET..." -ForegroundColor Yellow
    $secret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})
    $base64Secret = [System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($secret))

    # 更新 .env 文件
    $envContent = Get-Content .env -Raw
    $envContent = $envContent -replace 'AUTH_SECRET=your_auth_secret_here', "AUTH_SECRET=$base64Secret"
    $envContent = $envContent -replace 'NEXTAUTH_SECRET=your_nextauth_secret_here', "NEXTAUTH_SECRET=$base64Secret"
    $envContent = $envContent -replace 'AI_API_KEY=your_ai_api_key_here', "AI_API_KEY=在此处填入你的API密钥"
    $envContent = $envContent -replace 'AI_IMAGE_API_KEY=your_ai_image_api_key_here', "AI_IMAGE_API_KEY=在此处填入你的图片API密钥"
    Set-Content .env $envContent

    Write-Host "✓ .env 文件已创建" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠ 重要：请编辑 .env 文件，填入你的 AI API 密钥" -ForegroundColor Yellow
    Write-Host ""

    $editEnv = Read-Host "是否现在编辑 .env 文件？(Y/N)"
    if ($editEnv -eq "Y" -or $editEnv -eq "y") {
        notepad .env
        Write-Host ""
        Write-Host "编辑完成后请按 Enter 键继续..."
        Read-Host
    }
} else {
    Write-Host "✓ .env 文件已存在" -ForegroundColor Green
}

# 检查 API 密钥配置
Write-Host ""
Write-Host "检查 API 密钥配置..." -ForegroundColor Yellow
$envContent = Get-Content .env -Raw
if ($envContent -match 'AI_API_KEY=your_ai_api_key_here' -or $envContent -match 'AI_API_KEY=在此处填入你的API密钥') {
    Write-Host "✗ AI_API_KEY 未配置" -ForegroundColor Red
    Write-Host ""
    Write-Host "请编辑 .env 文件，填入你的 AI API 密钥" -ForegroundColor Yellow

    $editNow = Read-Host "是否现在编辑？(Y/N)"
    if ($editNow -eq "Y" -or $editNow -eq "y") {
        notepad .env
        Write-Host ""
        Write-Host "编辑完成后请按 Enter 键继续..."
        Read-Host
    } else {
        Write-Host ""
        Read-Host "配置完成后请重新运行此脚本。按 Enter 键退出"
        exit 0
    }
} else {
    Write-Host "✓ API 密钥已配置" -ForegroundColor Green
}

# 创建必要的目录
Write-Host ""
Write-Host "创建必要的目录..." -ForegroundColor Yellow
$directories = @(
    "public/generated-images",
    "backups",
    "data"
)

foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "✓ 创建目录: $dir" -ForegroundColor Green
    } else {
        Write-Host "✓ 目录已存在: $dir" -ForegroundColor Green
    }
}

# 停止现有容器
Write-Host ""
Write-Host "停止现有容器..." -ForegroundColor Yellow
docker compose down 2>$null

# 构建镜像
Write-Host ""
Write-Host "构建 Docker 镜像..." -ForegroundColor Yellow
Write-Host "这可能需要几分钟，请耐心等待..." -ForegroundColor Gray
docker compose build --no-cache gushi-app

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ 镜像构建失败" -ForegroundColor Red
    Read-Host "按 Enter 键退出"
    exit 1
}

Write-Host "✓ 镜像构建成功" -ForegroundColor Green

# 启动服务
Write-Host ""
Write-Host "启动服务..." -ForegroundColor Yellow
docker compose up -d postgres gushi-app

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ 服务启动失败" -ForegroundColor Red
    Read-Host "按 Enter 键退出"
    exit 1
}

# 等待服务健康
Write-Host ""
Write-Host "等待服务启动..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# 检查服务状态
Write-Host ""
Write-Host "检查服务状态..." -ForegroundColor Yellow
$serviceStatus = docker compose ps
Write-Host $serviceStatus

# 等待数据库就绪
Write-Host ""
Write-Host "等待数据库就绪..." -ForegroundColor Yellow
$maxAttempts = 30
$attempt = 0
$dbReady = $false

while ($attempt -lt $maxAttempts) {
    $attempt++
    Write-Host "尝试连接数据库... ($attempt/$maxAttempts)" -ForegroundColor Gray

    try {
        $result = docker compose exec -T postgres pg_isready -U gushi -d gushi_dev 2>&1
        if ($LASTEXITCODE -eq 0) {
            $dbReady = $true
            Write-Host "✓ 数据库已就绪" -ForegroundColor Green
            break
        }
    } catch {
        # 忽略错误，继续尝试
    }

    Start-Sleep -Seconds 2
}

if (-not $dbReady) {
    Write-Host "✗ 数据库启动超时" -ForegroundColor Red
    Write-Host ""
    Write-Host "请检查日志: docker compose logs postgres" -ForegroundColor Yellow
} else {
    # 提示初始化数据库
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  数据库初始化" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "请执行以下命令初始化数据库：" -ForegroundColor Yellow
    Write-Host '$env:DATABASE_URL = "postgresql://gushi:gushi_dev@127.0.0.1:5433/gushi_dev"' -ForegroundColor White
    Write-Host "npx prisma db push --schema=prisma/schema.prisma" -ForegroundColor White
    Write-Host ""

    $initDb = Read-Host "是否现在初始化数据库？(需要已安装 Node.js) (Y/N)"
    if ($initDb -eq "Y" -or $initDb -eq "y") {
        Write-Host ""
        Write-Host "初始化数据库..." -ForegroundColor Yellow
        $env:DATABASE_URL = "postgresql://gushi:gushi_dev@127.0.0.1:5433/gushi_dev"
        npx prisma db push --schema=prisma/schema.prisma

        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ 数据库初始化成功" -ForegroundColor Green
        } else {
            Write-Host "✗ 数据库初始化失败" -ForegroundColor Red
            Write-Host ""
            Write-Host "请稍后手动执行以下命令：" -ForegroundColor Yellow
            Write-Host '$env:DATABASE_URL = "postgresql://gushi:gushi_dev@127.0.0.1:5433/gushi_dev"' -ForegroundColor White
            Write-Host "npx prisma db push --schema=prisma/schema.prisma" -ForegroundColor White
        }
    }
}

# 显示访问信息
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  启动完成！" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "应用已启动，请访问：" -ForegroundColor Green
Write-Host "http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "健康检查：" -ForegroundColor Yellow
Write-Host "http://localhost:3000/api/health" -ForegroundColor White
Write-Host ""
Write-Host "查看日志：" -ForegroundColor Yellow
Write-Host "docker compose logs -f gushi-app" -ForegroundColor White
Write-Host ""
Write-Host "停止服务：" -ForegroundColor Yellow
Write-Host "docker compose down" -ForegroundColor White
Write-Host ""

# 尝试自动打开浏览器
Write-Host "正在打开浏览器..." -ForegroundColor Yellow
Start-Sleep -Seconds 2
try {
    Start-Process "http://localhost:3000"
} catch {
    Write-Host "无法自动打开浏览器，请手动访问 http://localhost:3000" -ForegroundColor Yellow
}

Read-Host "按 Enter 键退出"
