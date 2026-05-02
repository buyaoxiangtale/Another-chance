import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/auth-helpers';
import { canViewStory } from '@/lib/permissions';
import { getOrderedChain } from '@/lib/chain-helpers';
import { buildFullPrompt, correctCharacterNames } from '@/lib/prompt-builder';
import { PacingEngine } from '@/lib/pacing-engine';
import { consistencyChecker } from '@/lib/consistency-checker';
import { callAIText, buildOpenAIRequest } from '@/lib/ai-client';
import { contextSummarizer } from '@/lib/context-summarizer';
import { characterManager } from '@/lib/character-engine';
import { directorManager } from '@/lib/director-manager';
import { EventTracker } from '@/lib/event-tracker';
import { triggerBackup } from '@/lib/auto-backup';

/**
 * 从推理模型的 reasoning_content 中提取最终答案
 * 推理模型的思考过程通常包含：分析步骤、约束检查、修订文本等
 * 需要过滤掉这些思考内容，只保留最终的正文输出
 */
function extractFinalAnswer(reasoning: string): string {
  const trimmed = reasoning.trim();

  // 策略1：查找 markdown 格式的修订文本块
  // 推理模型常用格式：**修订文本：** 或 **最终文本：**
  const revisionPatterns = [
    /\*{1,2}修订文本[：:]\*{1,2}\s*\n?/,
    /\*{1,2}最终文本[：:]\*{1,2}\s*\n?/,
    /\*{1,2}润色后[：:]\*{1,2}\s*\n?/,
    /\*{1,2}正文[：:]\*{1,2}\s*\n?/,
  ];
  for (const pattern of revisionPatterns) {
    const match = trimmed.match(pattern);
    if (match) {
      const afterMarker = trimmed.slice(match.index! + match[0].length);
      // 提取到下一个 markdown 标记或思考步骤之前
      const nextMarker = afterMarker.search(/\n\s*\d+\.\s+\*{1,2}|$/);
      if (nextMarker > 50) {
        return afterMarker.slice(0, nextMarker).trim();
      }
      return afterMarker.trim();
    }
  }

  // 策略2：过滤掉常见的思考过程标记
  // 如：数字编号步骤、**对照约束检查**、**最终润色** 等
  const thinkingPatterns = [
    /^\d+\.\s+\*{1,2}[^*]+\*{1,2}[：:]/gm,  // 1. **步骤名称**：
    /\*{1,2}对照约束检查\*{1,2}/g,
    /\*{1,2}最终润色\*{1,2}/g,
    /\*{1,2}检查[：:]\*{1,2}/g,
    /\*{1,2}分析[：:]\*{1,2}/g,
    /\*{1,2}思考[：:]\*{1,2}/g,
  ];

  let cleaned = trimmed;
  for (const pattern of thinkingPatterns) {
    cleaned = cleaned.replace(pattern, '');
  }

  // 策略3：提取纯叙事文本段落（不含思考标记）
  // 叙事文本特征：以场景描写或人物动作开头，无编号和 **标记
  const paragraphs = cleaned.split(/\n\n+/).filter(p => {
    const line = p.trim();
    // 过滤掉思考过程段落
    if (line.match(/^\d+\./)) return false;  // 数字编号开头
    if (line.match(/^\*{1,2}/)) return false;  // markdown 强调开头
    if (line.match(/^[（\(]\d+[）\)]/)) return false;  // (1) (2) 等编号
    if (line.length < 30) return false;  // 过短段落
    return true;
  });

  if (paragraphs.length > 0) {
    // 合并所有叙事段落
    return paragraphs.join('\n\n').trim();
  }

  // 策略4：查找常见答案分隔标记
  const markers = ['因此，', '综上所述，', '乃', '于是'];
  for (const marker of markers) {
    const idx = trimmed.lastIndexOf(marker);
    if (idx !== -1 && idx < trimmed.length - 100) {
      // 从标记处取到下一个思考步骤之前
      const afterMarker = trimmed.slice(idx);
      const nextThinking = afterMarker.search(/\n\s*\d+\.\s+\*{1,2}|$/);
      return afterMarker.slice(0, nextThinking).trim();
    }
  }

  // 策略5：取最后一个完整的叙事段落
  const allLines = trimmed.split(/\n+/);
  const narrativeLines: string[] = [];
  for (let i = allLines.length - 1; i >= 0; i--) {
    const line = allLines[i].trim();
    if (line.match(/^\d+\.\s+\*{1,2}/) || line.match(/^[（\(]\d+[）\)]/)) {
      break;  // 遇到思考步骤标记，停止
    }
    if (line.length > 20 && !line.match(/^\*{1,2}/)) {
      narrativeLines.unshift(line);
    }
    if (narrativeLines.length >= 5) break;  // 收集足够内容后停止
  }

  if (narrativeLines.length > 0) {
    return narrativeLines.join('\n').trim();
  }

  return trimmed;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { id: storyId } = params;
    const { branchId = 'main', pacingConfig, directorOverrides } = await request.json();

    if (!storyId) {
      return NextResponse.json({ error: '缺少参数' }, { status: 400 });
    }

    const story = await prisma.story.findUnique({ where: { id: storyId } });
    if (!story) return NextResponse.json({ error: '故事不存在' }, { status: 404 });

    if (!canViewStory(story, userId)) {
      return NextResponse.json({ error: '无权查看' }, { status: 403 });
    }

    const chain = await getOrderedChain(storyId, branchId);
    if (chain.length === 0) {
      return NextResponse.json({ error: '该分支没有段落' }, { status: 404 });
    }
    const tailSegment = chain[chain.length - 1];

    let prompt: string;
    let registeredCharacterNames: string[] = [];

    if (pacingConfig || directorOverrides) {
      const fullResult = await buildFullPrompt({
        storyId,
        branchId,
        tailSegment: tailSegment as any,
        chain: chain as any,
        storyTitle: story.title,
        storyDescription: story.description ?? undefined,
        pacingConfig,
        directorOverrides,
      });
      prompt = fullResult.prompt;
      registeredCharacterNames = fullResult.registeredCharacterNames;
    } else {
      const contextSummary = chain.map((s: any) =>
        `${s.title ? `【${s.title}】` : ''}${s.content}`
      ).join('\n');

      const genre = (story as any)?.genre || '';
      const fictionKeywords = ['同人', '玄幻', '仙侠', '科幻', '都市', '现代', '悬疑', '架空', '穿越', '重生', '武侠', '奇幻', '轻小说', '网文'];
      const isFiction = fictionKeywords.some(k => genre.includes(k));

      const styleHint = isFiction
        ? '请用现代白话文写作，语言流畅自然'
        : '请保持古典文学风格';

      prompt = `故事标题：${story.title}
故事背景：${story.description || ''}

当前故事进展：
${contextSummary}

${styleHint}，续写下一段（150-300字），与前文情节连续。`;
    }

    const pacingEngine = pacingConfig ? new PacingEngine(pacingConfig) : null;

    let consistencyWarnings: string[] = [];
    try {
      const preIssues = await consistencyChecker.checkChainConsistency(chain as any);
      if (preIssues.length > 0) {
        consistencyWarnings = preIssues.map((i: any) => `[${i.severity}] ${i.description}`);
      }
    } catch (e) {
      console.warn('[stream-continue] 矛盾检测失败:', e);
    }

    const metadataEvent = {
      type: 'metadata',
      storyId,
      branchId,
      pace: pacingConfig?.pace || null,
      mood: pacingConfig?.mood || null,
      warnings: consistencyWarnings.length > 0 ? consistencyWarnings : undefined,
    };

    const baseMaxTokens = pacingConfig
      ? new PacingEngine(pacingConfig).getMaxTokens()
      : 2000;
    // 检测推理模型：GLM-5.x、DeepSeek-R1 等会返回 reasoning_content
    // 注意：GLM-4.7 等模型在复杂任务时也可能返回 reasoning_content
    const modelName = (process.env.AI_MODEL || '').toLowerCase();
    const isReasoningModel =
      modelName.includes('5.') ||
      modelName.includes('deepseek-r') ||
      modelName.includes('reasoning') ||
      modelName.includes('glm-4.7');  // GLM-4.7 也会返回推理过程
    // 推理模型的思考 tokens 和正文 tokens 共享 max_tokens 配额，
    // 需要额外余量（思考通常占 1500-3000 tokens）
    const maxTokens = isReasoningModel ? Math.max(baseMaxTokens + 4000, 6000) : baseMaxTokens;
    console.log('[stream-continue] maxTokens:', maxTokens, '(base:', baseMaxTokens, 'reasoning:', isReasoningModel, 'model:', modelName, ')');
    const { url, headers, body } = buildOpenAIRequest(prompt, undefined, maxTokens, story as any);
    const bodyObj = JSON.parse(body);
    bodyObj.stream = true;
    const streamBody = JSON.stringify(bodyObj);

    const aiResponse = await fetch(url, { method: 'POST', headers, body: streamBody });

    if (!aiResponse.ok) {
      const text = await aiResponse.text();
      console.error('[stream-continue] AI API 错误:', aiResponse.status, text.slice(0, 500));
      const status = aiResponse.status === 429 ? 429 : 502;
      return NextResponse.json({ error: `AI API error: ${text}` }, { status });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let fullContent = '';
        let fullReasoning = '';

        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(metadataEvent)}\n\n`));

          let reasoningCount = 0;
          let contentCount = 0;

          const reader = aiResponse.body?.getReader();
          if (!reader) throw new Error('No response body');

          const decoder = new TextDecoder();
          let buffer = '';
          let lineBuffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith('data: ')) continue;
              const data = trimmed.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta;

                // 处理推理模型的思考过程
                const reasoning = delta?.reasoning_content;
                if (reasoning) {
                  reasoningCount++;
                  fullReasoning += reasoning;
                  // 发送思考过程事件，前端可选择性显示
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'reasoning', content: reasoning })}\n\n`));
                }

                // 处理正文内容
                const content = delta?.content;
                if (content) contentCount++;
                if (content) {
                  fullContent += content;
                  lineBuffer += content;

                  if (pacingEngine && (content.includes('\n') || content.includes('。'))) {
                    const completedLines = lineBuffer.split(/\n+/).filter((l: string) => l.trim());
                    lineBuffer = completedLines.pop() || '';

                    const maxLines = pacingEngine.getMaxLinesPerStep();
                    for (let i = 0; i < Math.min(completedLines.length, maxLines); i++) {
                      const lineEvent = { type: 'line', content: completedLines[i], index: i };
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify(lineEvent)}\n\n`));
                    }

                    if (completedLines.length > maxLines) {
                      const pauseEvent = { type: 'pause', reason: 'line_limit', remaining: completedLines.length - maxLines };
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify(pauseEvent)}\n\n`));
                    }
                  } else {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                  }
                }
              } catch {}
            }
          }

          if (lineBuffer.trim() && pacingEngine) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'line', content: lineBuffer.trim(), index: 0 })}\n\n`));
          }

          // 推理模型处理：如果 content 为空但 reasoning_content 有内容，提取正文
          if (!fullContent || fullContent.trim().length === 0) {
            if (fullReasoning && fullReasoning.trim().length > 0) {
              console.log('[stream-continue] 推理模型未返回 content，从 reasoning_content 提取正文，reasoning 长度:', fullReasoning.length);
              // 从思考过程中提取最终答案（通常是最后一段结构化文本）
              fullContent = extractFinalAnswer(fullReasoning);
              console.log('[stream-continue] 提取后正文长度:', fullContent.length, '前100字:', fullContent.slice(0, 100));
            }
          }

          // 如果正文太短（可能被截断），记录警告
          if (fullContent && fullContent.length < 100) {
            console.warn('[stream-continue] 正文过短，可能被截断:', fullContent.length, '字符');
          }

          if (!fullContent || fullContent.trim().length === 0) {
            console.error('[stream-continue] 空内容! reasoning deltas:', reasoningCount, 'content deltas:', contentCount, 'reasoning 长度:', fullReasoning.length);
            const errorEvent = { type: 'error', message: 'AI 未生成有效内容，请重试' };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`));
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
            return;
          }

          // 角色名自动纠错：仅使用注册角色名，避免启发式提取的误报导致级联替换
          if (registeredCharacterNames.length > 0) {
            fullContent = correctCharacterNames(fullContent, registeredCharacterNames);
          }

          // 乐观锁：确认 tail 没有被其他请求抢先追加
          const currentChain = await getOrderedChain(storyId, branchId);
          const currentTail = currentChain[currentChain.length - 1];
          if (currentTail?.id !== tailSegment.id) {
            const conflictEvent = { type: 'error', message: '该分支已有新内容产生，请刷新后重试' };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(conflictEvent)}\n\n`));
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
            return;
          }

          // 先存段落，尽快发 [DONE] 让前端刷新 UI
          const newSegment = await prisma.storySegment.create({
            data: {
              storyId,
              title: '故事续写',
              content: fullContent,
              isBranchPoint: false,
              branchId,
              parentSegmentId: tailSegment.id,
              imageUrls: [],
              narrativePace: pacingConfig?.pace,
              mood: pacingConfig?.mood,
              visibility: story.visibility,
            },
          });

          // 后处理全部 fire-and-forget，不阻塞 [DONE]
          const postProcess = (async () => {
            try {
              // 角色发现与注册
              let mentionedIds: string[] = [];
              try {
                const mentioned = await characterManager.discoverAndRegisterCharacters(
                  storyId,
                  fullContent,
                  (p: string) => callAIText(p, { maxTokens: 1200, story: story as any }),
                  {
                    genre: story.genre ?? undefined,
                    storyDescription: story.description ?? undefined,
                    callAIWithWebSearchFn: (p: string) => callAIText(p, { maxTokens: 1500, story: story as any, webSearch: true }),
                  },
                );
                mentionedIds = mentioned.map(c => c.id);
                // 回写角色 ID 到段落
                if (mentionedIds.length > 0) {
                  await prisma.storySegment.update({
                    where: { id: newSegment.id },
                    data: { characterIds: mentionedIds },
                  });
                }
              } catch (e) {
                console.warn('[stream-continue] 角色发现/注册失败:', e);
              }

              // 摘要预生成
              contextSummarizer.generateSegmentSummary(newSegment as any, [...chain, newSegment] as any, story?.genre ?? undefined)
                .catch((e: any) => console.warn('[stream-continue] 摘要预生成失败:', e));

              // 角色状态更新
              if (mentionedIds.length > 0) {
                characterManager
                  .inferAndUpdateStatesForSegment(storyId, newSegment.id, fullContent, (p: string) =>
                    callAIText(p, { maxTokens: 1200, story: story as any })
                  )
                  .catch((e: any) => console.warn('[stream-continue] 角色状态更新失败:', e));
              }

              // 场景状态更新
              try {
                await directorManager.updateSceneState(storyId, fullContent, (p: string) =>
                  callAIText(p, { maxTokens: 1200, story: story as any })
                );
              } catch (e) {
                console.warn('[stream-continue] 场景状态更新失败:', e);
              }

              // 事件提取
              new EventTracker()
                .processSegment(storyId, branchId, {
                  id: newSegment.id,
                  content: fullContent,
                  characterIds: mentionedIds,
                })
                .catch((e: any) => console.warn('[stream-continue] 事件提取失败:', e));

              // 一致性检查
              try {
                const postIssues = await consistencyChecker.runConsistencyCheck(newSegment as any, [...chain, newSegment] as any);
                if (postIssues.length > 0) {
                  console.warn('[stream-continue] 后处理一致性警告:', postIssues.map((i: any) => i.description));
                }
              } catch (e) {
                console.warn('[stream-continue] 新内容矛盾检测失败:', e);
              }
            } catch (e) {
              console.warn('[stream-continue] 后处理失败:', e);
            }
          })();
          postProcess.catch(() => {});

          triggerBackup();
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('[stream-continue] 流式续写失败:', error);
    if (error instanceof Error) console.error('[stream-continue] stack:', error.stack);
    return NextResponse.json(
      { error: '流式续写失败', details: String(error) },
      { status: 500 },
    );
  }
}
