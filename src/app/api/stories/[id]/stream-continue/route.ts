import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/auth-helpers';
import { canViewStory } from '@/lib/permissions';
import { getOrderedChain } from '@/lib/chain-helpers';
import { buildFullPrompt } from '@/lib/prompt-builder';
import { PacingEngine } from '@/lib/pacing-engine';
import { consistencyChecker } from '@/lib/consistency-checker';
import { callAI, callAIText, buildOpenAIRequest, aiRequestQueue } from '@/lib/ai-client';
import { contextSummarizer } from '@/lib/context-summarizer';
import { generateImagesForSegment } from '@/lib/image-generator';
import { characterManager } from '@/lib/character-engine';
import { directorManager } from '@/lib/director-manager';

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

    const prompt = await buildFullPrompt({
      storyId,
      branchId,
      tailSegment: tailSegment as any,
      chain: chain as any,
      storyTitle: story.title,
      storyDescription: story.description ?? undefined,
      pacingConfig,
      directorOverrides,
    });

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

    const maxTokens = pacingConfig?.pace === 'detailed' ? 4000 : 2000;
    const { url, headers, body } = buildOpenAIRequest(prompt, undefined, maxTokens, story as any);
    const bodyObj = JSON.parse(body);
    bodyObj.stream = true;
    const streamBody = JSON.stringify(bodyObj);

    const aiResponse = await fetch(url, { method: 'POST', headers, body: streamBody });

    if (!aiResponse.ok) {
      const text = await aiResponse.text();
      return NextResponse.json({ error: `AI API error: ${text}` }, { status: 500 });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let fullContent = '';

        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(metadataEvent)}\n\n`));

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
                const content = parsed.choices?.[0]?.delta?.content;
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
            const errorEvent = { type: 'error', message: 'AI 未生成有效内容，请重试' };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`));
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
            return;
          }

          // 记忆连贯性：发现并自动注册新角色；返回"段落中所有角色（含新注册）"
          let mentionedIds: string[] = [];
          try {
            const mentioned = await characterManager.discoverAndRegisterCharacters(
              storyId,
              fullContent,
              (p: string) => callAIText(p, { maxTokens: 300, story: story as any }),
              {
                genre: story.genre ?? undefined,
                storyDescription: story.description ?? undefined,
                callAIWithWebSearchFn: (p: string) => callAIText(p, { maxTokens: 600, story: story as any, webSearch: true }),
              },
            );
            mentionedIds = mentioned.map(c => c.id);
          } catch (e) {
            console.warn('[stream-continue] 角色发现/注册失败:', e);
          }

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
              characterIds: mentionedIds,
            },
          });

          contextSummarizer.generateSegmentSummary(newSegment as any, [...chain, newSegment] as any, story?.genre ?? undefined)
            .catch((e: any) => console.warn('[stream-continue] 摘要预生成失败:', e));

          // 更新被提及角色的当前状态（AI 推断 → stateHistory）
          if (mentionedIds.length > 0) {
            characterManager
              .inferAndUpdateStatesForSegment(storyId, newSegment.id, fullContent, (p: string) =>
                callAIText(p, { maxTokens: 300, story: story as any })
              )
              .catch((e: any) => console.warn('[stream-continue] 角色状态更新失败:', e));
          }

          // 方案 A：增量更新滚动场景状态（location/time/weather/在场角色/服装）
          directorManager
            .updateSceneState(storyId, fullContent, (p: string) =>
              callAIText(p, { maxTokens: 400, story: story as any })
            )
            .catch((e: any) => console.warn('[stream-continue] 场景状态更新失败:', e));

          try {
            const postIssues = await consistencyChecker.runConsistencyCheck(newSegment as any, [...chain, newSegment] as any);
            if (postIssues.length > 0) {
              const postWarnings = postIssues.map((i: any) => `[${i.severity}] ${i.description}`);
              const warningEvent = { type: 'consistency_warnings', warnings: postWarnings };
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(warningEvent)}\n\n`));
            }
          } catch (e) {
            console.warn('[stream-continue] 新内容矛盾检测失败:', e);
          }

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
    console.error('流式续写失败:', error);
    return NextResponse.json(
      { error: '流式续写失败', details: String(error) },
      { status: 500 },
    );
  }
}
