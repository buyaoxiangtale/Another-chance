# data 目录研究报告

## 概述

`data/` 目录是项目的 **JSON 文件数据库**，存储所有运行时数据（故事、段落、分支）。项目实际使用 `src/lib/simple-db.ts` 进行读写，Prisma Schema 仅作定义参考。

## 文件清单

| 文件 | 用途 | 记录数 |
|------|------|--------|
| `stories.json` | 故事主表 | ~4 条 |
| `segments.json` | 故事段落 | ~15+ 条 |
| `branches.json` | 分叉节点 | ~6 条 |
| `stories_backup.json` | 故事备份 | - |
| `segments_backup.json` | 段落备份 | - |
| `branches_backup.json` | 分支备份 | - |

## 数据结构

### Story（stories.json）
```json
{
  "id": "story_1_荆轲刺秦王",
  "title": "荆轲刺秦王",
  "description": "基于荆轲刺秦王历史事件...",
  "author": "历史故事组",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

### StorySegment（segments.json）
```json
{
  "id": "seg_jk_1",
  "title": "燕国密谋",
  "content": "段落正文...",
  "isBranchPoint": false,
  "storyId": "story_1_荆轲刺秦王",
  "imageUrls": [],
  "branchId": "main",
  "parentSegmentId": "",
  "createdAt": "...",
  "updatedAt": "..."
}
```

### StoryBranch（branches.json）
```json
{
  "id": "branch_jk_1",
  "title": "分叉: 转向外交途径",
  "sourceSegmentId": "seg_jk_3",
  "storyId": "story_1_荆轲刺秦王",
  "userDirection": "转向外交途径"
}
```

## 数据流

```
用户操作 → API Route → simple-db.ts → 读写 data/*.json
种子数据 → enhanced_seed.ts → storyStore → data/*.json
```

## 关键观察

1. **双存储并存**：Prisma Schema 定义了 SQL 模型，但实际运行使用 JSON 文件
2. **ID 命名不一致**：种子用 `jingke-xxx`，运行时用 `story_1_xxx`/`seg_jk_1`/`branch_jk_1`
3. **分支树结构**：通过 `branchId` + `parentSegmentId` 构成树形关系
4. **备份机制**：迁移时自动备份到 `*_backup.json`

## ChronosMirror 升级改进点

### 角色建模
- 新增 `data/characters.json`，存储角色信息
- 段落增加 `characterIds` 数组引用角色
- 种子数据需为每个历史故事预置角色（荆轲/秦王/太子丹等）

### 时间轴校验
- Story 增加 `historicalPeriod`（如"战国末期"）
- Segment 增加 `storyYear`（如 -227）和 `storyMonth`
- 新增 `data/timeline.json` 存储校验规则（如"荆轲刺秦王发生在公元前227年"）
- 续写时校验生成内容的时间合理性

### MCP 维基百科
- 新增 `data/wiki_cache.json` 缓存维基百科查询结果
- Story 增加 `wikiPageId` 关联维基百科条目
- 续写时自动查询角色/事件的维基百科作为上下文

### 节奏控制
- Segment 增加 `pace`（slow/moderate/fast）和 `tension`（1-10）
- 种子数据中标记关键转折点为 high tension
- 续写时根据前文节奏动态调整生成参数
