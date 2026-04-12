#!/bin/bash

# 古事移动应用 Capacitor 项目初始化脚本
# 这个脚本会为现有的 Next.js 应用添加 Capacitor 支持

set -e

echo "📱 开始初始化 Capacitor 项目..."

# 检查必要依赖
echo "🔍 检查依赖..."
if ! command -v npx &> /dev/null; then
    echo "❌ npx 未安装，请先安装 Node.js"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm 未安装，请先安装 Node.js"
    exit 1
fi

# 安装 Capacitor 依赖
echo "📦 安装 Capacitor 依赖..."
npm install @capacitor/core @capacitor/cli @capacitor/app @capacitor/browser @capacitor/camera @capacitor/haptics @capacitor/local-notifications @capacitor/network @capacitor/preferences @capacitor/splash-screen @capacitor/status-bar

# 创建 Capacitor 项目
echo "🏗️ 创建 Capacitor 项目..."
npx cap init "古事" "com.gushi.mobile" --web-dir=dist

echo "✅ Capacitor 项目初始化完成！"

# 创建移动端特定配置文件
echo "📝 创建移动端配置..."

# 创建移动端环境变量文件
cat > .env.mobile << EOF
# 移动端环境配置
NODE_ENV=production
VITE_API_URL=https://api.gushi.app
VITE_WS_URL=wss://api.gushi.app
VITE_APP_NAME=古事
VITE_APP_VERSION=1.0.0
VITE_ENABLE_ANALYTICS=false
EOF

# 创建移动端首页组件
mkdir -p src/components/mobile
cat > src/components/mobile/MobileLayout.tsx << 'EOF'
'use client';

import { CapacitorStatusBar } from '@capacitor/status-bar';
import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';

interface MobileLayoutProps {
  children?: React.ReactNode;
}

export default function MobileLayout({ children }: MobileLayoutProps) {
  useEffect(() => {
    // 设置状态栏样式
    CapacitorStatusBar.setStyle({
      style: 'dark'
    });
    
    CapacitorStatusBar.setOverlaysWebView({
      overlay: true
    });
  }, []);

  return (
    <div className="mobile-layout h-screen flex flex-col">
      <header className="bg-white shadow-sm border-b">
        <div className="px-4 py-3">
          <h1 className="text-lg font-semibold text-gray-800">古事</h1>
        </div>
      </header>
      
      <main className="flex-1 overflow-auto">
        {children || <Outlet />}
      </main>
      
      <footer className="bg-white border-t">
        <nav className="flex justify-around py-2">
          <button className="flex flex-col items-center p-2 text-blue-600">
            <span className="text-xl">📚</span>
            <span className="text-xs mt-1">故事</span>
          </button>
          <button className="flex flex-col items-center p-2 text-gray-600">
            <span className="text-xl">🔍</span>
            <span className="text-xs mt-1">发现</span>
          </button>
          <button className="flex flex-col items-center p-2 text-gray-600">
            <span className="text-xl">✍️</span>
            <span className="text-xs mt-1">创作</span>
          </button>
          <button className="flex flex-col items-center p-2 text-gray-600">
            <span className="text-xl">👤</span>
            <span className="text-xs mt-1">我的</span>
          </button>
        </nav>
      </footer>
    </div>
  );
}
EOF

# 创建移动端构建脚本
cat > scripts/build-mobile.sh << 'EOF'
#!/bin/bash

echo "🚀 开始构建移动端应用..."

# 构建前端应用
echo "📦 构建前端..."
npm run build

# 检查构建结果
if [ ! -d "dist" ]; then
    echo "❌ 前端构建失败，dist 目录不存在"
    exit 1
fi

echo "✅ 移动端构建完成！"
EOF

# 创建移动端运行脚本
cat > scripts/run-mobile.sh << 'EOF'
#!/bin/bash

echo "📱 启动移动端开发服务器..."

# 构建前端
npm run build

# 启动 Capacitor 开发服务器
echo "🔄 同步到移动设备..."
npx cap sync ios

echo "🚀 打开 iOS 模拟器..."
npx cap open ios

echo "📱 也可以运行以下命令在真实设备上运行："
echo "   npm run cap:run:ios"
echo "   npm run cap:run:android"
EOF

# 给脚本添加执行权限
chmod +x scripts/build-mobile.sh
chmod +x scripts/run-mobile.sh

echo "📱 移动端配置已完成！"
echo ""
echo "🎯 下一步操作："
echo "   1. 运行开发服务器: npm run dev"
echo "   2. 构建移动端: npm run build"
echo "   3. 打开 iOS 项目: npx cap open ios"
echo "   4. 在 iOS 模拟器中运行: npx cap run ios"
echo ""
echo "📚 更多信息请查看 README.md 中的移动端开发指南"