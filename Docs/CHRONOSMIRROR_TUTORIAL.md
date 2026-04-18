# ChronosMirror 使用教程

> 从零开始体验角色建模、时间轴、导演模式、节奏控制和维基百科集成

## 快速开始

```bash
cd /home/pjlab/fbh/fbh_project/gushi
npm run dev
# 打开 http://localhost:3000
```

如果想要带预设数据的体验：
```bash
node scripts/migrate-chronosmirror.js  # 迁移现有数据
node seed.js                            # 填充角色和时间轴
```

---

## 一、创建一个新故事（带角色）

### 1. 点击"创建故事"

进入创建页面，你会看到比之前多出两个区域：

**朝代选择器** — 下拉选择故事发生的朝代（如"秦朝"、"三国"）

**初始角色设定** — 可以在创建故事时就设定角色：
- 输入角色名称（如"诸葛亮"）
- 选择角色定位（主角/配角/反派/旁白）
- 填写性格特征（如"睿智、谨慎、忠诚"）

### 2. 填写故事信息

- 标题："赤壁之战"
- 朝代：三国
- 描述："建安十三年，曹操率八十万大军南下..."
- 角色：诸葛亮（主角，睿智/谨慎/忠诚）

点击创建，系统会用 AI 生成故事开篇段落。

---

## 二、角色系统 🎭

### 2.1 查看角色面板

打开任意故事详情页，右侧（桌面端）或底部（移动端）会出现**角色面板**。

面板显示：
- 角色头像（名字首字的圆形占位）
- 角色名字和定位标签（主角/反派等）
- 当前状态（如"健康"、"愤怒"）
- 关系网（谁和谁是什么关系）

### 2.2 创建角色

**方式一：前端操作**
在角色面板中点击"添加角色"，填写表单。

**方式二：API 调用**
```bash
curl -X POST http://localhost:3000/api/stories/[storyId]/characters \
  -H "Content-Type: application/json" \
  -d '{
    "name": "周瑜",
    "era": "三国",
    "role": "supporting",
    "traits": ["英姿勃发", "多谋善断", "心胸狭窄"],
    "speechPatterns": "周郎之志，在于破曹。万事俱备，只欠东风。",
    "coreMotivation": "保卫江东，击败曹操，成就一代名将",
    "relationships": [
      {"targetId": "[诸葛亮id]", "relation": "亦敌亦友", "strength": 0.7}
    ]
  }'
```

### 2.3 角色的关键概念

**口癖（speechPatterns）**：AI 续写时会模仿角色的说话方式。比如给荆轲设了"壮士一去兮不复还"，AI 写荆轲的台词时就会带这种悲壮感。

**关系网（relationships）**：角色之间的关系会影响 AI 续写的情节。如果诸葛亮和周瑜关系设为"亦敌亦友(0.7)"，AI 会在两人互动时体现这种微妙关系。

**状态历史（stateHistory）**：每个段落结束后，角色的状态会被记录。比如第3段荆轲"入秦廷"，状态变为"紧张/伪装"；第5段"图穷匕见"，状态变为"暴露/决绝"。不同分支中角色可以处于完全不同的状态。

### 2.4 API 端点

| 操作 | 端点 | 说明 |
|------|------|------|
| 获取角色列表 | `GET /api/stories/[id]/characters` | 支持 `?context=true` 获取角色上下文 |
| 获取关系图 | `GET /api/stories/[id]/characters?graph=true` | 返回节点和边，用于可视化 |
| 创建角色 | `POST /api/stories/[id]/characters` | |
| 更新角色 | `PATCH /api/characters/[id]` | |
| 删除角色 | `DELETE /api/characters/[id]` | |

---

## 三、时间轴 📅

### 3.1 时间轴在哪里

故事详情页左侧有一个**竖向时间轴**（TimelineBar），用圆点标记每个段落。分叉点用红色圆点。

### 3.2 时间轴如何工作

每个段落现在都有一个可选的 `timeline` 字段：
```json
{
  "era": "秦朝",
  "year": -227,
  "season": "冬",
  "description": "荆轲献督亢地图，图穷匕见"
}
```

AI 续写时会自动参考时间轴上下文，确保不会出现时间倒流。

### 3.3 时间轴校验

系统会自动校验段落链的时间单调性：
- 年份是否递增
- 同年季节是否回退

如果发现违规（比如公元前228年的段落后面出现了公元前230年的内容），系统会发出警告。

**手动校验 API：**
```bash
curl -X POST http://localhost:3000/api/stories/[id]/timeline
```

**获取时间轴：**
```bash
# 普通格式
curl http://localhost:3000/api/stories/[id]/timeline

# 直接获取 AI prompt 片段（包含 Lorebook 设定）
curl "http://localhost:3000/api/stories/[id]/timeline?format=prompt"
```

---

## 四、导演模式 🎬

### 4.1 什么是导演模式

导演模式让你像电影导演一样控制故事走向，而不是被动看 AI 写。

### 4.2 打开导演侧边栏

故事详情页左侧有导演侧边栏（DirectorSidebar），点击导航栏的导演图标打开。

### 4.3 你可以控制什么

**角色心理状态**（characterStates）
```
嬴政 → 多疑程度：极高
     → 当前情绪：愤怒
荆轲 → 暴露风险：高
     → 内心冲突：使命 vs 恐惧
```

AI 续写时会参考这些状态。比如"嬴政多疑程度：极高"，AI 可能会让嬴政提前起疑。

**世界变量**（worldVariables）
```
天气：暴雨
时间：深夜
地点：咸阳宫大殿
秦军距燕国边境：100里
```

**叙事约束**（activeConstraints）
```
荆轲不得提前暴露身份
不得出现火器
对话必须保持文言文风格
```

### 4.4 如何使用

1. 在导演侧边栏中，点击"添加变量"
2. 输入 key（如"天气"）和 value（如"暴雨"）
3. 点击保存
4. 点击"续写故事"，AI 就会在暴雨的设定下生成内容

**API 操作：**
```bash
# 获取导演状态
curl http://localhost:3000/api/stories/[id]/director

# 修改导演状态
curl -X PATCH http://localhost:3000/api/stories/[id]/director \
  -H "Content-Type: application/json" \
  -d '{
    "characterStates": {
      "嬴政": {"多疑": "极高", "情绪": "愤怒"}
    },
    "worldVariables": {
      "天气": "暴雨",
      "时间": "深夜"
    },
    "activeConstraints": ["荆轲不得暴露身份"]
  }'
```

---

## 五、节奏控制 🎵

### 5.1 什么是节奏控制

以前 AI 续写每次固定 150-300 字，现在你可以控制 AI 的写作节奏。

### 5.2 四种节奏模式

| 模式 | 字数 | 风格 | 适用场景 |
|------|------|------|----------|
| `rush` | 50-100 | 短句、快速、紧张 | 战斗、追逐、突发危机 |
| `detailed` | 250-400 | 长句、细腻、沉浸 | 重要对话、环境描写、心理活动 |
| `pause` | 80-150 | 抒情、缓慢、沉思 | 回忆、抒情、过渡 |
| `summary` | 150-250 | 概括、叙述 | 时间跳跃、背景交代 |

### 5.3 如何使用

故事详情页底部有**节奏控制条**（PacingControls）：

1. **选择节奏模式**：点击 RUSH / DETAILED / PAUSE / SUMMARY
2. **设置行数**：拖动滑块选择每次生成几行（1-10）
3. **设置氛围**：输入当前氛围（如"紧张"、"温馨"）
4. **暂停/继续**：AI 生成过程中可以随时暂停

### 5.4 流式续写的行级步进

开启节奏控制后，AI 生成的内容会**按行推送**而不是一次全出：
- 每推送一行，你可以看到内容逐行出现
- 到达你设置的行数上限时自动暂停
- 点击"继续"按钮继续生成下一批

### 5.5 API 使用

```bash
# 带节奏控制的续写
curl -X POST http://localhost:3000/api/stories/[id]/continue \
  -H "Content-Type: application/json" \
  -d '{
    "branchId": "main",
    "pacingConfig": {
      "pace": "rush",
      "mood": "紧张",
      "maxLinesPerStep": 3
    }
  }'

# 流式续写（SSE）
curl -X POST http://localhost:3000/api/stories/[id]/stream-continue \
  -H "Content-Type: application/json" \
  -d '{
    "branchId": "main",
    "pacingConfig": {
      "pace": "detailed",
      "maxLinesPerStep": 5
    }
  }'
```

---

## 六、MCP 维基百科集成 📚

### 6.1 它做什么

当 AI 续写涉及历史人物、地点、事件时，系统会：
1. 自动从文本中提取历史实体（人名、地名等）
2. 查询中文维基百科获取真实历史信息
3. 将事实锚点注入 AI 的 prompt
4. 缓存查询结果（24小时），避免重复查询

### 6.2 效果示例

**没有维基集成时：**
> "荆轲手持匕首，直刺秦王。秦王大惊，绕柱而走。"

**有维基集成时：**
> "荆轲右手持徐夫人匕首——此匕首长八寸，以毒药淬之，见血封喉——左手抓秦王衣袖，直扑过去。秦王大惊，猛然挣断衣袖，绕青铜柱而走。殿上群臣皆惊慌失措，唯有夏无且以药囊投击荆轲。"

AI 因为看到了维基百科关于"徐夫人匕首"的规格（长八寸、淬毒）和咸阳宫的布局（青铜柱），写出了更真实、更具体的细节。

### 6.3 手动使用

**搜索历史知识：**
```bash
# 搜索
curl "http://localhost:3000/api/knowledge/search?query=荆轲"

# 获取维基百科文章
curl "http://localhost:3000/api/knowledge/search?article=荆轲"
```

**事实核查：**
```bash
curl -X POST http://localhost:3000/api/knowledge/factcheck \
  -H "Content-Type: application/json" \
  -d '{
    "text": "荆轲于公元前227年在咸阳宫刺杀秦王嬴政，以徐夫人匕首行刺失败"
  }'
```

返回结果会标注每个实体的维基百科信息和置信度。

---

## 七、世界观设定集（Lorebook）📖

### 7.1 什么是 Lorebook

Lorebook 是一个按朝代组织的知识库，存储社会制度、官职体系、礼仪规则等信息。AI 续写时会参考这些设定，确保内容符合历史背景。

### 7.2 预设内容

系统预设了秦朝相关的设定（`data/lorebook.preset.json`）：

- **二十等爵制**：公士 → 公乘 → … → 彻侯
- **郡县制**：郡守 → 县令 → 乡 → 里 → 什 → 伍
- **法家思想核心**：以法治国、重农抑商、焚书坑儒
- **礼仪制度**：朝觐礼仪、祭祀制度、丧葬制度
- **兵器规格**：青铜剑、戈、矛、弩的规格参数
- **官职体系**：丞相、御史大夫、太尉、郡守等
- **重要地点**：督亢之地、咸阳宫、徐夫人匕首等

### 7.3 API 使用

```bash
# 查询秦朝的所有设定
curl "http://localhost:3000/api/lorebook?era=秦朝"

# 按主题查询
curl "http://localhost:3000/api/lorebook?topics=官职,礼仪"

# 关键词搜索
curl "http://localhost:3000/api/lorebook?keyword=爵制"

# 新增设定
curl -X POST http://localhost:3000/api/lorebook \
  -H "Content-Type: application/json" \
  -d '{
    "era": "三国",
    "topic": "军事",
    "name": "连环战船",
    "content": "曹操将战船用铁索相连，以应对长江风浪。此举虽解决了晕船问题，却成为火烧赤壁的致命弱点。",
    "source": "《三国志·周瑜传》"
  }'
```

---

## 八、完整使用流程示例

### 场景：体验"荆轲刺秦王"

1. **打开首页** → 点击"荆轲刺秦王"
2. **查看角色面板**（右侧）→ 看到 8 个角色及其关系网
3. **查看时间轴**（左侧）→ 从"秦灭赵"到"图穷匕见"的完整时间线
4. **打开导演模式**（左侧）→ 设置"嬴政多疑程度：低"（让荆轲更容易接近）
5. **选择节奏** → 设为 `detailed`（细节描写模式），行数设为 5
6. **点击续写** → AI 会：
   - 参考角色口癖（荆轲说"壮士一去兮..."）
   - 参考时间轴（当前是公元前227年冬）
   - 参考维基百科（咸阳宫布局、徐夫人匕首规格）
   - 参考导演设定（嬴政多疑程度低）
   - 按 detailed 模式生成 250-400 字的细腻内容
   - 按行推送，每 5 行暂停
7. **在分叉点分叉** → 选择"荆轲成功刺杀秦王"
   - 系统自动保存所有角色的状态快照
   - AI 根据你的选择生成平行时空的续写
   - 切回主线时，角色状态自动恢复

---

## 九、API 完整参考

### 角色
```
GET    /api/stories/[id]/characters          # 角色列表（?context / ?graph）
POST   /api/stories/[id]/characters          # 创建角色
GET    /api/characters/[id]                  # 角色详情
PATCH  /api/characters/[id]                  # 更新角色
DELETE /api/characters/[id]                  # 删除角色
```

### 时间轴
```
GET    /api/stories/[id]/timeline            # 时间轴（?format=prompt）
POST   /api/stories/[id]/timeline            # 校验时间轴
```

### 导演
```
GET    /api/stories/[id]/director            # 获取导演状态
PATCH  /api/stories/[id]/director            # 更新导演状态
```

### 节奏
```
POST   /api/stories/[id]/continue            # 同步续写（支持 pacingConfig）
POST   /api/stories/[id]/stream-continue     # 流式续写（支持 pacingConfig + 行级步进）
```

### 世界观
```
GET    /api/lorebook                         # 查询设定集（?era / ?topics / ?keyword）
POST   /api/lorebook                         # 新增设定
```

### 知识
```
GET    /api/knowledge/search                 # 搜索维基百科（?query / ?article）
POST   /api/knowledge/factcheck              # 事实核查
```

---

## 十、向后兼容

所有新功能都是**可选的**。不传新参数时，行为与升级前完全一致：

```bash
# 这和升级前一样工作
curl -X POST /api/stories/[id]/continue -d '{"branchId": "main"}'

# 这会启用所有新功能
curl -X POST /api/stories/[id]/continue -d '{
  "branchId": "main",
  "pacingConfig": {"pace": "detailed", "mood": "紧张"},
  "directorOverrides": {
    "characterStates": {"嬴政": {"多疑": "高"}},
    "worldVariables": {"天气": "暴雨"}
  }
}'
```
