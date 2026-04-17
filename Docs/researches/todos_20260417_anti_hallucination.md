# Anti-Hallucination Todos — 2026-04-17

Progress: 8 / 30 items completed

## Current Focus
Cluster 2

## Remaining Items
- [ ] 2.1 在 `continue/route.ts` 中将 `temperature` 从 0.7 降到 0.5
- [ ] 2.2 在 `stream-continue/route.ts` 中同步降低 temperature
- [ ] 2.3 添加 `top_p` 参数，设为 0.85，进一步限制随机性
- [ ] 2.4 在 `prompt-builder.ts` 中添加 `frequency_penalty: 0.3`，减少重复内容
- [ ] 2.5 根据故事类型调整参数：正史类 temperature=0.4（更严格），同人类 temperature=0.6（允许更多创意）
- [ ] 2.6 将 AI 调用配置抽取为共享的 `ai-client.ts` 模块，统一管理 temperature/model/params

## Stall Status
Streak: 0 | Stalled: none
