#!/usr/bin/env bash
# Docker 构建设置脚本 - 帮助 Fork 仓库用户快速配置

set -euo pipefail

echo "======================================"
echo "Docker 构建设置助手"
echo "======================================"
echo ""

# 检查 git remote
echo "📋 检测 Git Remote 配置..."
echo "当前 remotes:"
git remote -v
echo ""

# 检测当前分支
CURRENT_BRANCH=$(git branch --show-current)
echo "🌿 当前分支: $CURRENT_BRANCH"
echo ""

# 询问使用哪个 remote
echo "选择要推送到的 remote:"
echo "1) origin (buyaoxiangtale/Another-chance) - 主仓库"
echo "2) myfork (zhending216-hub/Another-chance) - 你的 fork"
read -rp "请输入选项 [1-2]: " choice

case $choice in
  1)
    REMOTE="origin"
    REPO_URL="https://github.com/buyaoxiangtale/Another-chance"
    ;;
  2)
    REMOTE="myfork"
    REPO_URL="https://github.com/zhending216-hub/Another-chance"
    ;;
  *)
    echo "❌ 无效选项"
    exit 1
    ;;
esac

echo ""
echo "✅ 选择的 remote: $REMOTE ($REPO_URL)"
echo ""

# 检查 secrets 是否配置
echo "📝 请确认已在 GitHub 仓库中配置以下 Secrets:"
echo "   仓库设置: ${REPO_URL}/settings/secrets/actions"
echo ""
echo "   需要配置的 Secrets:"
echo "   - DOCKER_USERNAME = dtr12345"
echo "   - DOCKER_PASSWORD = your_docker_hub_token"
echo ""
read -rp "Secrets 是否已配置? [y/N]: " secrets_configured

if [ "$secrets_configured" != "y" ] && [ "$secrets_configured" != "Y" ]; then
  echo ""
  echo "❌ 请先配置 Secrets 后再运行此脚本"
  echo "   详细说明: Docs/FORK_SETUP.md"
  exit 1
fi

echo ""
echo "🚀 准备推送代码并触发 Docker 构建..."
echo ""

# 显示将要执行的命令
echo "将执行以下命令:"
echo "  git push $REMOTE $CURRENT_BRANCH"
echo ""

read -rp "确认继续? [y/N]: " confirm

if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
  echo "❌ 已取消"
  exit 0
fi

# 推送代码
echo ""
echo "⏳ 正在推送代码..."
if git push "$REMOTE" "$CURRENT_BRANCH"; then
  echo ""
  echo "✅ 代码推送成功!"
  echo ""
  echo "📦 Docker 构建将在几分钟内自动开始"
  echo "   查看构建状态: ${REPO_URL}/actions/workflows/docker-publish.yml"
  echo ""
  echo "🐳 构建完成后可以拉取镜像:"
  echo "   docker pull dtr12345/another-chance:latest"
  echo "   docker pull dtr12345/another-chance:${CURRENT_BRANCH}"
else
  echo ""
  echo "❌ 推送失败，请检查网络或权限"
  exit 1
fi
