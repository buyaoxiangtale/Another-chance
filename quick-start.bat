@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ========================================
echo   古事 (Gushi) - 快速启动脚本
echo ========================================
echo.

:: 检查 Docker 是否运行
echo 检查 Docker 状态...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ✗ Docker 未运行，请先启动 Docker Desktop
    echo.
    pause
    exit /b 1
)
echo ✓ Docker 正在运行
echo.

:: 检查 .env 文件
echo 检查配置文件...
if not exist .env (
    echo ✗ .env 文件不存在
    echo.
    echo 正在创建 .env 文件...
    copy .env.example .env >nul

    echo ✓ .env 文件已创建
    echo.
    echo ⚠ 重要：请编辑 .env 文件，填入你的 AI API 密钥
    echo.
    set /p EDIT_ENV="是否现在编辑 .env 文件？(Y/N): "
    if /i "!EDIT_ENV!"=="Y" (
        notepad .env
        echo.
        echo 编辑完成后请按 Enter 键继续...
        pause >nul
    )
) else (
    echo ✓ .env 文件已存在
)

:: 检查 API 密钥配置
echo.
echo 检查 API 密钥配置...
findstr /C:"your_ai_api_key_here" .env >nul 2>&1
if %errorlevel% equ 0 (
    echo ✗ AI_API_KEY 未配置
    echo.
    echo 请编辑 .env 文件，填入你的 AI API 密钥
    echo.
    set /p EDIT_NOW="是否现在编辑？(Y/N): "
    if /i "!EDIT_NOW!"=="Y" (
        notepad .env
        echo.
        echo 编辑完成后请按 Enter 键继续...
        pause >nul
    ) else (
        echo.
        echo 配置完成后请重新运行此脚本。按 Enter 键退出
        pause >nul
        exit /b 0
    )
) else (
    echo ✓ API 密钥已配置
)

:: 创建必要的目录
echo.
echo 创建必要的目录...
if not exist "public\generated-images" mkdir "public\generated-images"
echo ✓ 创建目录: public\generated-images

if not exist "backups" mkdir "backups"
echo ✓ 创建目录: backups

if not exist "data" mkdir "data"
echo ✓ 创建目录: data

:: 停止现有容器
echo.
echo 停止现有容器...
docker compose down >nul 2>&1

:: 构建镜像
echo.
echo 构建 Docker 镜像...
echo 这可能需要几分钟，请耐心等待...
docker compose build --no-cache gushi-app

if %errorlevel% neq 0 (
    echo ✗ 镜像构建失败
    pause
    exit /b 1
)
echo ✓ 镜像构建成功

:: 启动服务
echo.
echo 启动服务...
docker compose up -d postgres gushi-app

if %errorlevel% neq 0 (
    echo ✗ 服务启动失败
    pause
    exit /b 1
)

:: 等待服务启动
echo.
echo 等待服务启动...
timeout /t 10 /nobreak >nul

:: 检查服务状态
echo.
echo 检查服务状态...
docker compose ps

:: 等待数据库就绪
echo.
echo 等待数据库就绪...
set /a MAX_ATTEMPTS=30
set /a ATTEMPT=0
set DB_READY=0

:WAIT_DB
set /a ATTEMPT+=1
echo 尝试连接数据库... (!ATTEMPT!/!MAX_ATTEMPTS!)

docker compose exec -T postgres pg_isready -U gushi -d gushi_dev >nul 2>&1
if %errorlevel% equ 0 (
    set DB_READY=1
    echo ✓ 数据库已就绪
    goto DB_READY
)

if !ATTEMPT! lss !MAX_ATTEMPTS! (
    timeout /t 2 /nobreak >nul
    goto WAIT_DB
)

if !DB_READY! equ 0 (
    echo ✗ 数据库启动超时
    echo.
    echo 请检查日志: docker compose logs postgres
) else (
:DB_READY
    :: 提示初始化数据库
    echo.
    echo ========================================
    echo   数据库初始化
    echo ========================================
    echo.
    echo 请执行以下命令初始化数据库：
    echo set DATABASE_URL=postgresql://gushi:gushi_dev@127.0.0.1:5433/gushi_dev
    echo npx prisma db push --schema=prisma/schema.prisma
    echo.

    set /p INIT_DB="是否现在初始化数据库？(需要已安装 Node.js) (Y/N): "
    if /i "!INIT_DB!"=="Y" (
        echo.
        echo 初始化数据库...
        set DATABASE_URL=postgresql://gushi:gushi_dev@127.0.0.1:5433/gushi_dev
        npx prisma db push --schema=prisma/schema.prisma

        if %errorlevel% equ 0 (
            echo ✓ 数据库初始化成功
        ) else (
            echo ✗ 数据库初始化失败
            echo.
            echo 请稍后手动执行以下命令：
            echo set DATABASE_URL=postgresql://gushi:gushi_dev@127.0.0.1:5433/gushi_dev
            echo npx prisma db push --schema=prisma/schema.prisma
        )
    )
)

:: 显示访问信息
echo.
echo ========================================
echo   启动完成！
echo ========================================
echo.
echo 应用已启动，请访问：
echo http://localhost:3000
echo.
echo 健康检查：
echo http://localhost:3000/api/health
echo.
echo 查看日志：
echo docker compose logs -f gushi-app
echo.
echo 停止服务：
echo docker compose down
echo.

:: 尝试自动打开浏览器
echo 正在打开浏览器...
timeout /t 2 /nobreak >nul
start http://localhost:3000

echo.
pause
