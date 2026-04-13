import { NextRequest, NextResponse } from 'next/server';
import { storiesStore, segmentsStore, getOrderedChain, type StorySegment } from '@/lib/simple-db';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id: storyId } = params;
    const { branchId = 'main' } = await request.json();

    if (!storyId) {
      return NextResponse.json({ error: '缺少参数' }, { status: 400 });
    }

    const stories = await storiesStore.load();
    const story = stories.find((s: any) => s.id === storyId);
    if (!story) return NextResponse.json({ error: '故事不存在' }, { status: 404 });

    // Get ordered chain to find tail segment
    const chain = await getOrderedChain(storyId, branchId);
    if (chain.length === 0) {
      return NextResponse.json({ error: '该分支没有段落' }, { status: 404 });
    }
    const tailSegment = chain[chain.length - 1];

    // Build context from the ordered chain
    const contextSummary = chain.map((s: StorySegment) =>
      `${s.title ? `【${s.title}】` : ''}${s.content}`
    ).join('\n');

    const prompt = `故事标题：${story.title}
故事背景：${story.description || ''}

当前故事进展：
${contextSummary}

请续写下一段（150-300字），保持古典文学风格，与前文情节连续。`;

    const baseUrl = process.env.AI_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4';
    const apiKey = process.env.AI_API_KEY || '';
    const model = process.env.AI_MODEL || 'glm-5.1';

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
        max_tokens: 2000,
        stream: true
      })
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
          const newSegment: StorySegment = {
            id: `seg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            storyId,
            title: '故事续写',
            content: fullContent,
            isBranchPoint: false,
            branchId,
            parentSegmentId: tailSegment.id,
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
