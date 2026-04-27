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
import { generateImagesForSegment } from '@/lib/image-generator';
import { characterManager } from '@/lib/character-engine';
import { directorManager } from '@/lib/director-manager';
import { EventTracker } from '@/lib/event-tracker';

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
    // 推理模型的思考 tokens 和正文 tokens 共享 max_tokens 配额，
    // 需要额外余量（思考通常占 1000-2000 tokens）
    const isReasoningModel = (process.env.AI_MODEL || '').includes('5.1');
    const maxTokens = isReasoningModel ? Math.max(baseMaxTokens + 3000, 4096) : baseMaxTokens;
    console.log('[stream-continue] maxTokens:', maxTokens, '(base:', baseMaxTokens, 'reasoning:', isReasoningModel, ')');
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
                // 只取 content（正文），忽略 reasoning_content（思考过程）
                if (delta?.reasoning_content) reasoningCount++;
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

          if (!fullContent || fullContent.trim().length === 0) {
            console.error('[stream-continue] 空内容! reasoning deltas:', reasoningCount, 'content deltas:', contentCount);
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
