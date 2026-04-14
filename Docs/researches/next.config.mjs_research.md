# 研究报告：next.config.mjs

## 概述

`next.config.mjs` 是 gushi 项目的 Next.js 框架配置文件，当前为空配置（仅使用默认设置）。

## 用途

配置 Next.js 的构建、路由、部署等行为。当前文件几乎为空，说明项目使用所有默认配置。

## 内容分析

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
};

export default nextConfig;
```

整个配置对象为空，没有自定义任何选项。

## 导出

默认导出一个空的 NextConfig 对象。

## 依赖

无外部依赖，纯配置文件。

## 核心逻辑

无自定义逻辑，完全依赖 Next.js 默认配置。这意味着：
- 使用 App Router（src/app/ 目录结构）
- 默认的 webpack 配置
- 默认的图片优化（Image 组件）
- 默认的 API 路由行为
- 无自定义环境变量前缀
- 无自定义 headers/redirects/rewrites

## 数据流

next.config.mjs 本身不参与数据流，但它影响整个应用的运行方式。空的配置意味着：
1. 所有静态资源默认从 `public/` 目录提供
2. API Routes 默认行为（无 CORS 配置、无速率限制）
3. 无自定义 webpack loader（不能直接导入 .md、.sql 等文件）
4. 无 Turbopack 配置（使用默认 webpack）
5. 无 output 配置（默认 standalone 模式不适合 Docker 部署）

## ChronosMirror 升级改进点

### 1. 角色建模
如果角色数据需要通过 API 提供给外部工具（如 MCP Server），需要配置 CORS 和安全 headers：
```javascript
async headers() {
  return [{ source: '/api/:path*', headers: [
    { key: 'Access-Control-Allow-Origin', value: '*' },
    { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE' },
  ]}];
}
```

### 2. 时间轴校验
时间轴校验可能需要自定义 webpack alias 来共享校验逻辑：
```javascript
webpack: (config) => {
  config.resolve.alias['@timeline'] = path.join(__dirname, 'src/lib/timeline');
  return config;
}
```

### 3. MCP 维基百科集成
如果集成 MCP Server，可能需要：
- 配置 API 路由的 body 大小限制（维基百科返回的数据可能较大）
- 配置外部图片域名白名单（维基百科图片）
```javascript
images: {
  remotePatterns: [{ protocol: 'https', hostname: '**.wikimedia.org' }],
}
```

### 4. 节奏控制
节奏分析可能涉及较重的计算，建议配置：
- API 路由的超时时间
- ISR（增量静态再生）用于预计算节奏分析结果
```javascript
experimental: {
  serverActions: { bodySizeLimit: '2mb' },
}
```

### 5. 部署优化（关键）
当前空配置不适合生产部署，建议添加：
```javascript
const nextConfig = {
  output: 'standalone',        // 优化 Docker 镜像大小
  reactStrictMode: true,       // 开启严格模式
  poweredByHeader: false,      // 移除 X-Powered-By 头
  compress: true,              // 开启 gzip 压缩
  images: {
    remotePatterns: [          // 允许外部图片
      { protocol: 'https', hostname: '**.wikimedia.org' },
    ],
  },
};
```

### 6. 安全建议
- 添加 CSP（Content Security Policy）headers
- 配置速率限制中间件
- 移除默认的 X-Powered-By 响应头
- 配置 HTTPS 重定向（生产环境）
