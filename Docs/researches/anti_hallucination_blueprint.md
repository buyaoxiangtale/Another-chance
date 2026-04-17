# ChronosMirror 反幻觉改进蓝图

> 解决 AI 续写中的幻觉问题，提升故事连续性和事实准确性

## 问题概述

AI 续写时出现幻觉，主要原因：
1. 上下文压缩太激进，远端信息丢失
2. 摘要引擎纯规则匹配，质量差
3. Temperature 偏高（0.7）
4. 维基百科事实锚点薄弱
5. Prompt 软约束，没有强制引用前文细节

## 执行检查清单

### Cluster 1: 摘要引擎升级（AI 驱动）

- [x] 1.1 在 `context-summarizer.ts` 中新增 `callAI()` 方法，复用项目已有的 AI 调用配置（AI_BASE_URL, AI_API_KEY, AI_MODEL）
- [x] 1.2 改造 `extractSummaryFromSegment()` 为 `generateAISummary()`，调用 AI 对段落内容生成结构化摘要（包含关键事件、角色行动、场景描写、伏笔、情感变化）
- [x] 1.3 为 AI 摘要设计 prompt 模板：要求输出 JSON 格式 `{events, characterActions, scenes, foreshadowing, moodChanges}`
- [x] 1.4 添加摘要缓存：已生成的摘要持久化到 `summariesStore`，避免重复调用 AI
- [x] 1.5 添加 fallback 机制：AI 调用失败时降级为现有的正则提取
- [x] 1.6 增加全文保留段落数：从 `recentCount=3` 改为 `recentCount=5`，确保更多近期上下文完整可见
- [x] 1.7 改进组级摘要：每组摘要从简单拼接改为 AI 生成连贯摘要
- [x] 1.8 改进远端章级摘要：提取关键伏笔和未闭合的情节线，确保 AI 续写时能看到远端的重要线索

### Cluster 2: 生成参数优化

- [x] 2.1 在 `continue/route.ts` 中将 `temperature` 从 0.7 降到 0.5
- [x] 2.2 在 `stream-continue/route.ts` 中同步降低 temperature
- [x] 2.3 添加 `top_p` 参数，设为 0.85，进一步限制随机性
- [x] 2.4 在 `prompt-builder.ts` 中添加 `frequency_penalty: 0.3`，减少重复内容
- [x] 2.5 根据故事类型调整参数：正史类 temperature=0.4（更严格），同人类 temperature=0.6（允许更多创意）
- [x] 2.6 将 AI 调用配置抽取为共享的 `ai-client.ts` 模块，统一管理 temperature/model/params

### Cluster 3: Prompt 约束强化

- [x] 3.1 在 `prompt-builder.ts` 的记忆提醒部分添加硬约束指令：「必须引用前文中已出现的具体细节（人名、地点、事件），不得凭空创造前文中未提及的新角色或新地点」
- [x] 3.2 在 prompt 中注入前文关键实体列表：从最近段落的全文中提取所有专有名词（人名、地名、器物名），作为「已有世界观元素」清单
- [x] 3.3 在 prompt 中标注未闭合的情节线：从摘要中提取 `foreshadowing` 和未完成的事件，提醒 AI 「以下情节线尚未完结，请在续写中合理推进或回应」
- [x] 3.4 添加禁止事项清单：「不得出现与前文矛盾的时间/季节/天气描写」「不得让已死亡角色重新活跃」「不得改变已建立的角色性格」

### Cluster 4: 事实锚点增强

- [x] 4.1 在 `mcp-wikipedia.ts` 中增加维基百科摘要长度：从 200-300 字增加到 500 字
- [x] 4.2 在 `mcp-wikipedia.ts` 中改进 `extractHistoricalEntities()`：除硬编码词库外，增加基于 N-gram 的中文人名/地名通用识别模式（2-3字中文 + 上下文模式匹配）
- [x] 4.3 在 `mcp-wikipedia.ts` 中增加多语言查询：对中文搜索结果不足的实体，自动用英文维基百科补充查询
- [x] 4.4 在 `knowledge-cache.ts` 中延长缓存 TTL：从 24 小时增加到 7 天（历史事实不变）
- [x] 4.5 在 `enrichPromptWithFacts()` 中增加上下文相关度过滤：只注入与当前段落内容相关的实体事实，避免无关事实干扰
- [x] 4.6 在 `prompt-builder.ts` 中将事实锚点注入位置从 prompt 开头调整到「前文上下文」之后，让 AI 先看故事再看事实

### Cluster 5: 验证与测试

- [x] 5.1 运行 `npx next build` 确保构建无错误
- [x] 5.2 测试正史类故事续写：创建秦朝故事 → 续写 5 段 → 检查是否出现幻觉（跨时代元素、已死角色复活、情节矛盾）
- [x] 5.3 测试同人类故事续写：创建火影同人故事 → 续写 5 段 → 检查是否保持原著世界观一致性
- [x] 5.4 测试长链续写（10+段落）：检查远端上下文是否被正确保留和引用
- [x] 5.5 测试 AI 摘要质量：对比规则摘要和 AI 摘要的信息完整度
- [x] 5.6 测试降级机制：模拟 AI 调用失败，确认 fallback 到正则提取正常工作
