# capacitor.config.json 研究报告

## 1. 文件用途

capacitor.config.json 是 Capacitor 跨平台移动应用的配置文件，定义了"古事"项目如何打包为 iOS 和 Android 原生应用。Capacitor 将 Next.js 构建的 Web 应用嵌入原生 WebView，实现一套代码、多平台运行。

## 2. 导出

不导出任何内容，纯配置文件。但作为 Capacitor CLI 的输入配置。

## 3. 依赖

- `@capacitor/core ^5.0.0`：核心运行时
- `@capacitor/cli ^5.0.0`：命令行工具
- 多个原生插件：camera、browser、haptics、local-notifications、network、preferences、splash-screen、status-bar

## 4. 核心逻辑

**iOS 配置**：
- bundleId: `com.gushi.mobile`
- minimumSystemVersion: iOS 14.0
- 权限：相机、照片库、本地通知
- URL Scheme: `gushi://`

**Android 配置**：
- packageId: `com.gushi.mobile`
- minSdkVersion: 22（Android 5.0+）
- 权限：相机、存储读写

**脚本命令**：
- `cap:sync` 同步 Web 资源到原生项目
- `cap:open` 打开原生 IDE
- `cap:run` 在设备/模拟器上运行

## 5. 数据流

Next.js 构建 → dist/ 目录 → `npx cap sync` → 复制到 ios/App 和 android/ 目录 → 原生编译 → 安装到设备。运行时：WebView 加载本地 Web 资源 → Capacitor Bridge 调用原生插件 → JavaScript ↔ Native 双向通信。

## 6. ChronosMirror 升级改进点

### 角色建模
- **离线角色缓存**：角色数据需要在移动端离线可用。Capacitor Preferences 插件可用于存储角色模型数据，但需要设计合理的缓存策略（角色状态同步、冲突解决）。
- **角色图片本地存储**：相机插件已集成，可用于角色头像拍摄/上传。建议增加角色表情包/立绘的本地缓存机制。
- **触觉反馈**：已配置 `@capacitor/haptics`，角色交互（如选择对话选项）可添加触觉反馈增强沉浸感。

### 时间轴校验
- **离线时间轴**：时间轴校验在无网络时需要降级为本地校验。Network 插件（已配置）可检测网络状态，在线时同步最新校验规则，离线时使用缓存版本。
- **推送通知**：已配置 `@capacitor/local-notifications`，可用于通知用户时间线更新（如新发现的史实修正、其他用户的时间线分支建议）。

### MCP 维基百科
- **WebView 内容加载**：维基百科内容需要适配移动端 WebView。Capacitor Browser 插件可用于外部链接跳转，但 MCP 集成的内容应直接在 WebView 内渲染，需要优化移动端排版。
- **预加载策略**：历史背景知识的预加载对于移动体验至关重要。建议在故事开始前预加载相关维基百科条目，使用 Capacitor Preferences 缓存已加载内容。

### 节奏控制
- **移动端阅读体验**：节奏控制在移动端需要特别关注屏幕尺寸限制。段落长度、字体大小、翻页间隔都需要针对手机屏幕优化。建议使用 StatusBar 插件实现沉浸式阅读（全屏模式）。
- **后台续读**：Capacitor App 插件支持应用状态监听，可以在用户回到应用时恢复阅读进度和叙事节奏状态。

### 总体改进建议
1. 配置 Capacitor Live Update 实现无需应用商店审核的热更新
2. 增加 `server` 配置指向开发/生产 API 端点
3. 考虑深色模式支持（通过 StatusBar 插件动态切换）
4. 增加应用版本号与 Next.js 版本的同步机制
5. 配置 ProGuard 规则（Android）和 App Transport Security（iOS）
