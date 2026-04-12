import { NextRequest, NextResponse } from 'next/server';

// @ts-ignore
const { storiesStore, segmentsStore } = require('@/lib/simple-db');

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id: storyId } = params;
    const { segmentId } = await request.json();

    if (!storyId || !segmentId) {
      return NextResponse.json({ error: '缺少参数' }, { status: 400 });
    }

    const stories = await storiesStore.load();
    const story = stories.find((s: any) => s.id === storyId);
    if (!story) return NextResponse.json({ error: '故事不存在' }, { status: 404 });

    const segments = await segmentsStore.load();
    const currentSegment = segments.find((s: any) => s.id === segmentId && s.storyId === storyId);
    if (!currentSegment) return NextResponse.json({ error: '段落不存在' }, { status: 404 });

    const prevSegments = segments
      .filter((s: any) => s.storyId === storyId && s.order <= currentSegment.order)
      .sort((a: any, b: any) => a.order - b.order);

    const contextSummary = prevSegments.map((s: any) =>
      `${s.title ? `【${s.title}】` : ''}${s.content}`
    ).join('\n');

    const prompt = `故事标题：${story.title}
故事背景：${story.description || ''}

当前故事进展：
${contextSummary}

请续写下一段（150-300字），保持古典文学风格，与前文情节连续。`;

    const baseUrl = process.env.AI_BASE_URL || 'https://api.openai.com/v1';
    const apiKey = process.env.AI_API_KEY || '';
    const model = process.env.AI_MODEL || 'gpt-3.5-turbo';

    const aiResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: '你是一位精通中国历史的文学作家，擅长古典文学风格的写作。请用中文回答。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1000,
        stream: true
      })
    });

    if (!aiResponse.ok) {
      const text = await aiResponse.text();
      return NextResponse.json({ error: `AI API error: ${text}` }, { status: 500 });
    }

    // Stream the response as SSE
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let fullContent = '';

        try {
          const reader = aiResponse.body?.getReader();
          if (!reader) throw new Error('No response body');

          const decoder = new TextDecoder();
          let buffer = '';

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
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                }
              } catch {}
            }
          }

          // Save the completed segment
          const allSegments = await segmentsStore.load();
          const maxOrder = Math.max(...allSegments.filter((s: any) => s.storyId === storyId).map((s: any) => s.order || 0), 0);

          const newSegment = {
            id: `seg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            storyId,
            title: currentSegment.isBranchPoint ? '分叉发展' : '故事续写',
            content: fullContent,
            order: maxOrder + 1,
            isBranchPoint: false,
            parentBranchId: currentSegment.isBranchPoint ? segmentId : undefined,
            imageUrls: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          allSegments.push(newSegment);
          await segmentsStore.save(allSegments);

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
