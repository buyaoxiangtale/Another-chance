# Docker 部署检查脚本
# 用于检查 Docker 环境配置是否正确

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  古事 (Gushi) - Docker 部署检查" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$allPassed = $true

# 检查 1: Docker 是否运行
Write-Host "检查 1: Docker 是否运行" -ForegroundColor Yellow
try {
    docker info >$null 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Docker 正在运行" -ForegroundColor Green
    } else {
        Write-Host "✗ Docker 未运行" -ForegroundColor Red
        $allPassed = $false
    }
} catch {
    Write-Host "✗ Docker 未安装" -ForegroundColor Red
    $allPassed = $false
}

# 检查 2: .env 文件
Write-Host ""
Write-Host "检查 2: 环境变量配置" -ForegroundColor Yellow
if (Test-Path .env) {
    Write-Host "✓ .env 文件存在" -ForegroundColor Green

    $envContent = Get-Content .env -Raw
    $requiredVars = @(
        @{Name="AUTH_SECRET"; Pattern="AUTH_SECRET=(?!your_)"},
        @{Name="NEXTAUTH_SECRET"; Pattern="NEXTAUTH_SECRET=(?!your_)"},
        @{Name="AUTH_TRUST_HOST"; Pattern="AUTH_TRUST_HOST=true"},
        @{Name="NEXTAUTH_URL"; Pattern="NEXTAUTH_URL="},
        @{Name="AI_API_KEY"; Pattern="AI_API_KEY=(?!your_)"},
        @{Name="AI_BASE_URL"; Pattern="AI_BASE_URL="},
        @{Name="AI_MODEL"; Pattern="AI_MODEL="}
    )

    foreach ($var in $requiredVars) {
        if ($envContent -match $var.Pattern) {
            Write-Host "  ✓ $($var.Name) 已配置" -ForegroundColor Green
        } else {
            Write-Host "  ✗ $($var.Name) 未配置或使用默认值" -ForegroundColor Red
            $allPassed = $false
        }
    }
} else {
    Write-Host "✗ .env 文件不存在" -ForegroundColor Red
    Write-Host "  提示: 运行 quick-start.ps1 创建配置文件" -ForegroundColor Yellow
    $allPassed = $false
}

# 检查 3: 必要的目录
Write-Host ""
Write-Host "检查 3: 必要目录" -ForegroundColor Yellow
$directories = @(
    @{Path="public/generated-images"; Name="生成的图片目录"},
    @{Path="backups"; Name="备份目录"},
    @{Path="data"; Name="数据目录"}
)

foreach ($dir in $directories) {
    if (Test-Path $dir.Path) {
        Write-Host "✓ $($dir.Name) 存在" -ForegroundColor Green
    } else {
        Write-Host "✗ $($dir.Name) 不存在" -ForegroundColor Red
        Write-Host "  提示: 创建目录 $($dir.Path)" -ForegroundColor Yellow
        $allPassed = $false
    }
}

# 检查 4: Docker Compose 配置
Write-Host ""
Write-Host "检查 4: Docker Compose 配置" -ForegroundColor Yellow
if (Test-Path docker-compose.yml) {
    Write-Host "✓ docker-compose.yml 存在" -ForegroundColor Green

    try {
        $config = docker compose config 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ docker-compose.yml 语法正确" -ForegroundColor Green
        } else {
            Write-Host "✗ docker-compose.yml 语法错误" -ForegroundColor Red
            Write-Host $config -ForegroundColor Red
            $allPassed = $false
        }
    } catch {
        Write-Host "✗ 无法解析 docker-compose.yml" -ForegroundColor Red
        $allPassed = $false
    }
} else {
    Write-Host "✗ docker-compose.yml 不存在" -ForegroundColor Red
    $allPassed = $false
}

# 检查 5: Dockerfile
Write-Host ""
Write-Host "检查 5: Dockerfile" -ForegroundColor Yellow
if (Test-Path Dockerfile) {
    Write-Host "✓ Dockerfile 存在" -ForegroundColor Green
} else {
    Write-Host "✗ Dockerfile 不存在" -ForegroundColor Red
    $allPassed = $false
}

# 检查 6: 服务状态（如果正在运行）
Write-Host ""
Write-Host "检查 6: 服务状态" -ForegroundColor Yellow
try {
    $services = docker compose ps 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ 可以查询服务状态" -ForegroundColor Green
        Write-Host ""
        Write-Host "当前服务状态：" -ForegroundColor Cyan
        Write-Host $services
    } else {
        Write-Host "  服务未运行或无法查询状态" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  无法查询服务状态" -ForegroundColor Yellow
}

# 检查 7: 端口占用
Write-Host ""
Write-Host "检查 7: 端口占用" -ForegroundColor Yellow
$ports = @(3000, 5433, 6379, 80, 443)
$portNames = @{
    3000 = "应用服务"
    5433 = "PostgreSQL"
    6379 = "Redis"
    80 = "HTTP"
    443 = "HTTPS"
}

foreach ($port in $ports) {
    $connection = Test-NetConnection -ComputerName localhost -Port $port -InformationLevel Quiet -WarningAction SilentlyContinue
    if ($connection) {
        Write-Host "  ⚠ 端口 $port ($($portNames[$port])) 已被占用" -ForegroundColor Yellow
    } else {
        Write-Host "  ✓ 端口 $port ($($portNames[$port])) 可用" -ForegroundColor Green
    }
}

# 检查 8: 网络连接
Write-Host ""
Write-Host "检查 8: 网络连接" -ForegroundColor Yellow
try {
    $testConnection = Test-Connection google.com -Count 1 -Quiet -ErrorAction SilentlyContinue
    if ($testConnection) {
        Write-Host "✓ 网络连接正常" -ForegroundColor Green
    } else {
        Write-Host "✗ 网络连接异常" -ForegroundColor Red
        $allPassed = $false
    }
} catch {
    Write-Host "⚠ 无法检测网络连接" -ForegroundColor Yellow
}

# 检查 9: Node.js（用于数据库初始化）
Write-Host ""
Write-Host "检查 9: Node.js（用于数据库初始化）" -ForegroundColor Yellow
try {
    $nodeVersion = node --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Node.js 已安装: $nodeVersion" -ForegroundColor Green
    } else {
        Write-Host "✗ Node.js 未安装" -ForegroundColor Red
        Write-Host "  提示: 数据库初始化需要 Node.js" -ForegroundColor Yellow
        $allPassed = $false
    }
} catch {
    Write-Host "✗ Node.js 未安装" -ForegroundColor Red
    Write-Host "  提示: 数据库初始化需要 Node.js" -ForegroundColor Yellow
    $allPassed = $false
}

# 总结
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
if ($allPassed) {
    Write-Host "  ✓ 所有检查通过！" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "您可以开始部署：" -ForegroundColor Green
    Write-Host "  1. 运行 quick-start.ps1 或 quick-start.bat" -ForegroundColor White
    Write-Host "  2. 或手动执行: docker compose up -d postgres gushi-app" -ForegroundColor White
} else {
    Write-Host "  ✗ 部分检查失败" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "请解决上述问题后再次检查" -ForegroundColor Red
}

Write-Host ""
Read-Host "按 Enter 键退出"
