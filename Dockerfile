# 多阶段构建 - 使用官方 Node.js 镜像作为基础
FROM node:18-bookworm-slim AS deps

WORKDIR /app

# 复制 package 文件
COPY package.json package-lock.json ./
COPY prisma ./prisma/

# 安装依赖
RUN npm ci --only=production

# 构建阶段
FROM node:18-bookworm-slim AS builder

WORKDIR /app

# 复制依赖
COPY package.json package-lock.json ./
COPY prisma ./prisma/

# 安装所有依赖（包括开发依赖）
RUN npm ci

# 复制源代码
COPY . .

# 删除不兼容的 prisma.config.ts 并确认
RUN rm -f prisma.config.ts && echo "Deleted prisma.config.ts" && ls -la prisma.config.ts* || echo "No prisma.config.ts files"

# 生成 Prisma 客户端
RUN npx prisma generate

# 构建应用
RUN npm run build

# 生产运行阶段
FROM node:18-bookworm-slim AS runner

WORKDIR /app

# 安装运行时依赖（OpenSSL、ca-certificates、PostgreSQL 客户端）
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    postgresql-client \
    gzip && \
    rm -rf /var/lib/apt/lists/*

# 设置环境变量
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    AUTH_TRUST_HOST=true

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# 复制必要的文件
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 复制 Prisma 相关文件
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json

# 复制 standalone 模式遗漏的运行时依赖
# 这些包被服务端代码使用但 Next.js standalone 没有自动包含
COPY --from=builder /app/node_modules/@prisma/adapter-pg ./node_modules/@prisma/adapter-pg
COPY --from=builder /app/node_modules/bcryptjs ./node_modules/bcryptjs
COPY --from=builder /app/node_modules/next-auth ./node_modules/next-auth
COPY --from=builder /app/node_modules/@auth ./node_modules/@auth
COPY --from=builder /app/node_modules/zod ./node_modules/zod

# 创建数据目录并授权
RUN mkdir -p /app/data /app/backups && \
    chown -R nextjs:nodejs /app/data /app/backups

# 切换到非 root 用户
USER nextjs

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=5 \
    CMD node -e "require('http').get('http://127.0.0.1:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)}).on('error', () => process.exit(1))"

# 启动应用
CMD ["sh", "-c", "HOSTNAME=0.0.0.0 node server.js"]
