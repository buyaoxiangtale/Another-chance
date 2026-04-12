# 多阶段构建 - 使用官方 Node.js 镜像作为基础
FROM node:18-alpine AS deps
WORKDIR /app

# 复制 package.json 和 pnpm-lock.yaml 或 package-lock.json
COPY package.json package-lock.json ./
COPY prisma ./prisma/

# 安装依赖
RUN npm ci --only=production

# 构建阶段
FROM node:18-alpine AS builder
WORKDIR /app

# 复制依赖
COPY package.json package-lock.json ./
COPY prisma ./prisma/

# 安装所有依赖（包括开发依赖）
RUN npm ci

# 复制源代码
COPY . .

# 生成 Prisma 客户端
RUN npx prisma generate

# 构建应用
RUN npm run build

# 生产运行阶段
FROM node:18-alpine AS runner
WORKDIR /app

# 设置环境变量
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 复制构建文件
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# 复制 Prisma 相关文件
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma/schema.prisma ./prisma/schema.prisma

# 设置正确的权限
RUN chown -R nextjs:nodejs /app

# 切换到非 root 用户
USER nextjs

# 暴露端口
EXPOSE 3000

# 设置启动命令
CMD ["node", "server.js"]