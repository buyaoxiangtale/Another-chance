import { NextRequest, NextResponse } from 'next/server';

// @ts-ignore
const { storiesStore, segmentsStore } = require('@/lib/simple-db');

async function callAI(prompt: string): Promise<string> {
  const baseUrl = process.env.AI_BASE_URL || 'https://api.openai.com/v1';
  const apiKey = process.env.AI_API_KEY || '';
  const model = process.env.AI_MODEL || 'gpt-3.5-turbo';

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: '你是一位精通中国历史的文学作家，擅长古典文学风格的写作。请用中文回答，保持与前文的风格和情节连续性。' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 1000
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AI API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

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

    // Build context
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

    const aiResponse = await callAI(prompt);

    const maxOrder = Math.max(...segments.filter((s: any) => s.storyId === storyId).map((s: any) => s.order || 0), 0);

    const newSegment = {
      id: `seg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      storyId,
      title: currentSegment.isBranchPoint ? '分叉发展' : '故事续写',
      content: aiResponse,
      order: maxOrder + 1,
      isBranchPoint: false,
      parentBranchId: currentSegment.isBranchPoint ? segmentId : undefined,
      imageUrls: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    segments.push(newSegment);
    await segmentsStore.save(segments);

    return NextResponse.json({ success: true, segment: newSegment });

  } catch (error) {
    console.error('故事续写失败:', error);
    return NextResponse.json(
      { error: '故事续写失败', details: String(error) },
      { status: 500 }
    );
  }
}
