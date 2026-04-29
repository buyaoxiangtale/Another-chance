# Fork 仓库 Docker 构建配置指南

## 你的仓库情况

从 git 配置看，你有：
- **主仓库**: `buyaoxiangtale/Another-chance` (origin)
- **你的 Fork**: `zhending216-hub/Another-chance` (myfork)
- **当前分支**: `fix/name-correction-and-misc-fixes`

## Docker Hub Secrets 配置

### 情况 1: 你是主仓库的协作者

如果你有 `buyaoxiangtale/Another-chance` 的写权限：

1. 进入主仓库设置
   - 访问: https://github.com/buyaoxiangtale/Another-chance/settings/secrets/actions
   - 添加 secrets:
     ```
     DOCKER_USERNAME=dtr12345
     DOCKER_PASSWORD=your_docker_hub_token
     ```

2. 推送到主仓库的 master 分支触发构建
   ```bash
   git checkout master
   git pull origin master
   git merge fix/name-correction-and-misc-fixes
   git push origin master
   ```

### 情况 2: 使用你自己的 Fork 仓库（推荐）

如果你没有主仓库的写权限，使用你自己的 fork：

#### 1. 更新 GitHub Actions workflow

修改 `.github/workflows/docker-publish.yml`，让它支持你的分支：

```yaml
on:
  push:
    branches:
      - master
      - main
      - fix/name-correction-and-misc-fixes  # 添加你的分支
    tags:
      - 'v*.*.*'
  pull_request:
    branches:
      - master
      - main
  workflow_dispatch:
```

#### 2. 推送到你的 fork

```bash
# 推送到你的 fork
git push myfork fix/name-correction-and-misc-fixes

# 或合并到你的 fork 的 master
git checkout master
git pull myfork master
git merge fix/name-correction-and-misc-fixes
git push myfork master
```

#### 3. 在你的 fork 中配置 secrets

1. 访问: https://github.com/zhending216-hub/Another-chance/settings/secrets/actions
2. 添加 secrets:
   ```
   DOCKER_USERNAME=dtr12345
   DOCKER_PASSWORD=your_docker_hub_token
   ```

#### 4. 在你的 fork 中启用 Actions

1. 访问: https://github.com/zhending216-hub/Another-chance/actions
2. 如果提示需要启用，点击 "I understand my workflows, go ahead and enable them"
3. 选择 "Allow all actions and reusable workflows"

### 情况 3: 手动触发构建（最简单）

不管哪个仓库，都可以手动触发：

1. 访问你仓库的 Actions 页面（主仓库或你的 fork）
2. 选择 "Docker Image Build & Publish" workflow
3. 点击 "Run workflow"
4. 选择分支（如 `fix/name-correction-and-misc-fixes`）
5. 点击 "Run workflow"

## 获取 Docker Hub Token

1. 登录 https://hub.docker.com/
2. 点击头像 → "Account Settings" → "Security"
3. 点击 "New Access Token"
4. 输入描述（如 "GitHub Actions"）
5. 点击 "Generate"
6. 复制生成的 token（只显示一次）

## 验证配置

### 检查 secrets 是否配置正确

```bash
# 查看当前 remote
git remote -v

# 如果推送到自己的 fork，确保使用正确的 remote
git push myfork fix/name-correction-and-misc-fixes
```

### 检查 workflow 是否触发

访问 Actions 页面查看运行状态：
- 主仓库: https://github.com/buyaoxiangtale/Another-chance/actions
- 你的 fork: https://github.com/zhending216-hub/Another-chance/actions

## 推荐方案

对于你的情况，我推荐使用 **情况 2**（使用自己的 fork）：

```bash
# 1. 推送到你的 fork
git push myfork fix/name-correction-and-misc-fixes

# 2. 在你的 fork 仓库中配置 secrets
# https://github.com/zhending216-hub/Another-chance/settings/secrets/actions

# 3. 手动触发或等待自动触发
# https://github.com/zhending216-hub/Another-chance/actions/workflows/docker-publish.yml
```

## 修改后的 workflow

我已经帮你更新了 workflow，添加了对你的分支的支持：

```yaml
on:
  push:
    branches:
      - master
      - main
      - 'fix/*'        # 支持所有 fix/* 分支
      - 'feature/*'    # 支持所有 feature/* 分支
    tags:
      - 'v*.*.*'
  pull_request:
    branches:
      - master
      - main
  workflow_dispatch:   # 允许手动触发
```

这样你在任何分支推送都会触发构建（仅在你的 fork 中）。

## 镜像名称

不管使用哪个仓库，镜像都会推送到：
- Docker Hub: `dtr12345/another-chance`
- 支持的 tags: `latest`, `分支名`, `版本号`

## 下一步

1. 确定使用哪个仓库（主仓库或你的 fork）
2. 在对应仓库中配置 secrets
3. 推送代码或手动触发 workflow
4. 等待构建完成（约 5-10 分钟）
5. 测试拉取镜像：
   ```bash
   docker pull dtr12345/another-chance:latest
   ```
