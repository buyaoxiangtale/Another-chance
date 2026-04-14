# scripts 目录研究报告

## 概述

`scripts/` 目录包含 2 个运维/迁移脚本。

## 文件清单

| 文件 | 用途 |
|------|------|
| `migrate-data.js` | 数据迁移：从 order 模型迁移到 branchId/parentSegmentId 模型 |
| `init-capacitor.sh` | Capacitor 移动端项目初始化脚本 |

## migrate-data.js 详解

### 核心功能
将段落数据从 **线性 order 模型** 迁移到 **树形 branchId/parentSegmentId 模型**。

### 迁移逻辑
1. 读取 `data/*.json` 三文件
2. 按故事分组，按 order 排序
3. 第一个段落设为 `branchId: 'main', parentSegmentId: ''`
4. 后续段落设为 `branchId: 'main', parentSegmentId: 前一段.id`
5. 分支数据：重命名 `segmentId` → `sourceSegmentId`，新增 `userDirection`
6. 备份原数据到 `*_backup.json`
7. 运行完整性校验

### 依赖
- Node.js fs/path
- 读取 `data/stories.json`、`data/segments.json`、`data/branches.json`

### 导出
- `migrateData()` 函数

## init-capacitor.sh 详解

### 核心功能
为 Next.js 项目添加 Capacitor 移动端支持（iOS/Android）。

### 执行步骤
1. 检查 npx/npm
2. 安装 Capacitor 核心依赖及插件（camera, haptics, notifications 等）
3. `npx cap init` 初始化项目（包名 `com.gushi.mobile`）
4. 创建 `.env.mobile` 环境配置
5. 生成 `MobileLayout.tsx` 组件（底部导航：故事/发现/创作/我的）
6. 生成 `build-mobile.sh` 和 `run-mobile.sh` 脚本

### 依赖
- Node.js、npm、npx
- Capacitor CLI/Core

## ChronosMirror 升级改进点

### 角色建模
- 迁移脚本需扩展：解析段落 content 提取角色，填充新增的 Character 表
- 新增角色关系迁移脚本

### 时间轴校验
- 迁移脚本需为现有段落推断故事内时间（基于历史事件）
- 增加时间连续性校验逻辑

### MCP 维基百科
- 可新增脚本：批量为现有故事查询维基百科，填充历史背景和参考资料

### 节奏控制
- 迁移脚本可基于段落内容长度、分叉点位置自动推断叙事节奏
- Capacitor 移动端布局需支持节奏可视化（如进度条、紧张度指示器）
