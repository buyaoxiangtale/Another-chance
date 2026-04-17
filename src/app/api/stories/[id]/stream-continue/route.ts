import { NextRequest, NextResponse } from 'next/server';
import { storiesStore, segmentsStore, getOrderedChain, type StorySegment } from '@/lib/simple-db';
import { buildFullPrompt } from '@/lib/prompt-builder';
import { PacingEngine } from '@/lib/pacing-engine';
import { consistencyChecker } from '@/lib/consistency-checker';
import { callAI, buildOpenAIRequest } from '@/lib/ai-client';

/**
 * 5.2 + 5.4 + 5.5 改造 stream-continue route
 * - 支持按行流式输出（每行一个 SSE 事件）
 * - 支持暂停指令
 * - SSE 事件类型：content(原始token)、line(完整行)、pause(暂停信号)、metadata(元数据)、[DONE]
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id: storyId } = params;
    const { branchId = 'main', pacingConfig, directorOverrides } = await request.json();

    if (!storyId) {
      return NextResponse.json({ error: '缺少参数' }, { status: 400 });
    }

    const stories = await storiesStore.load();
    const story = stories.find((s: any) => s.id === storyId);
    if (!story) return NextResponse.json({ error: '故事不存在' }, { status: 404 });

    const chain = await getOrderedChain(storyId, branchId);
    if (chain.length === 0) {
      return NextResponse.json({ error: '该分支没有段落' }, { status: 404 });
    }
    const tailSegment = chain[chain.length - 1];

    // Build prompt — 统一使用 buildFullPrompt，确保所有改进都生效
    const prompt = await buildFullPrompt({
      storyId,
      branchId,
      tailSegment,
      chain,
      storyTitle: story.title,
      storyDescription: story.description,
      pacingConfig,
      directorOverrides,
    });

    const pacingEngine = pacingConfig ? new PacingEngine(pacingConfig) : null;

    // C3: 矛盾检测 — 续写前检测前文矛盾
    let consistencyWarnings: string[] = [];
    try {
      const preIssues = await consistencyChecker.checkChainConsistency(chain);
      if (preIssues.length > 0) {
        consistencyWarnings = preIssues.map(i => `[${i.severity}] ${i.description}`);
        console.warn(`[stream-continue] 前文矛盾检测: ${consistencyWarnings.join('; ')}`);
      }
    } catch (e) {
      console.warn('[stream-continue] 前文矛盾检测失败（非致命）:', e);
    }

    // 5.5 发送 metadata 事件
    const metadataEvent = {
      type: 'metadata',
      storyId,
      branchId,
      pace: pacingConfig?.pace || null,
      mood: pacingConfig?.mood || null,
      warnings: consistencyWarnings.length > 0 ? consistencyWarnings : undefined,
    };

    const maxTokens = pacingConfig?.pace === 'detailed' ? 4000 : 2000;

    // 使用统一的 AI 客户端
    const { url, headers, body } = buildOpenAIRequest(prompt, undefined, maxTokens, story);
    
    const aiResponse = await fetch(url, {
      method: 'POST',
      headers,
      body: body.replace('"stream": false', '"stream": true') // 启用流式响应
    });

    if (!aiResponse.ok) {
      const text = await aiResponse.text();
      return NextResponse.json({ error: `AI API error: ${text}` }, { status: 500 });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let fullContent = '';

        try {
          // 5.5 发送 metadata
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

                  // 5.4/5.5: 检测是否完成一个语义段落（换行符），发送 line 事件
                  if (pacingEngine && (content.includes('\n') || content.includes('。'))) {
                    const completedLines = lineBuffer.split(/\n+/).filter(l => l.trim());
                    // Keep the last potentially incomplete line in buffer
                    lineBuffer = completedLines.pop() || '';

                    const maxLines = pacingEngine.getMaxLinesPerStep();
                    for (let i = 0; i < Math.min(completedLines.length, maxLines); i++) {
                      const lineEvent = { type: 'line', content: completedLines[i], index: i };
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify(lineEvent)}\n\n`));
                    }

                    // 5.5: 如果还有未发送的行，发送 pause 信号
                    if (completedLines.length > maxLines) {
                      const pauseEvent = { type: 'pause', reason: 'line_limit', remaining: completedLines.length - maxLines };
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify(pauseEvent)}\n\n`));
                    }
                  } else {
                    // 向后兼容：无 pacingConfig 时发送原始 content 事件
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                  }
                }
              } catch {}
            }
          }

          // Flush remaining line buffer
          if (lineBuffer.trim() && pacingEngine) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'line', content: lineBuffer.trim(), index: 0 })}\n\n`));
          }

          // Save the completed segment
          const allSegments = await segmentsStore.load();
          const newSegment: StorySegment = {
            id: `seg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            storyId,
            title: '故事续写',
            content: fullContent,
            isBranchPoint: false,
            branchId,
            parentSegmentId: tailSegment.id,
            imageUrls: [],
            narrativePace: pacingConfig?.pace,
            mood: pacingConfig?.mood,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          allSegments.push(newSegment);
          await segmentsStore.save(allSegments);

          // C3: 续写后检测新内容矛盾
          try {
            const postIssues = await consistencyChecker.runConsistencyCheck(newSegment, [...chain, newSegment]);
            if (postIssues.length > 0) {
              const postWarnings = postIssues.map(i => `[${i.severity}] ${i.description}`);
              const warningEvent = { type: 'consistency_warnings', warnings: postWarnings };
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(warningEvent)}\n\n`));
            }
          } catch (e) {
            console.warn('[stream-continue] 新内容矛盾检测失败（非致命）:', e);
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    });

  } catch (error) {
    console.error('流式续写失败:', error);
    return NextResponse.json(
      { error: '流式续写失败', details: String(error) },
      { status: 500 }
    );
  }
}
