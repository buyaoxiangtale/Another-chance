import { NextRequest, NextResponse } from 'next/server';

// @ts-ignore
const { storiesStore, segmentsStore } = require('@/lib/simple-db');

// Simple AI call helper
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
        { role: 'system', content: '你是一位精通中国历史的文学作家，擅长古典文学风格的写作。请用中文回答。' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.8,
      max_tokens: 1500
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

    // Get previous segments for context
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

现在到了一个关键分叉点。请生成2个不同的故事走向分支。

对于每个分支，请输出：
分支标题：xxx
分支内容：一段100-200字的续写内容，风格为古典文学风格，与前文保持连续性。

请用以下格式输出：
【分支一】
标题：xxx
内容：xxx

【分支二】
标题：xxx
内容：xxx`;

    const aiResponse = await callAI(prompt);

    // Parse branches from AI response
    const branchRegex = /【分支[一二二三四五六七八九十]+】\s*标题[：:]\s*(.+?)\s*内容[：:]\s*([\s\S]+?)(?=【分支|$)/g;
    const parsedBranches: any[] = [];
    let match;

    while ((match = branchRegex.exec(aiResponse)) !== null) {
      parsedBranches.push({
        title: match[1].trim(),
        content: match[2].trim()
      });
    }

    // If parsing failed, create a single branch with the full response
    if (parsedBranches.length === 0) {
      parsedBranches.push({
        title: '分叉剧情',
        content: aiResponse.trim()
      });
    }

    // Save branches as new segments
    const newSegments = [];
    const maxOrder = Math.max(...segments.filter((s: any) => s.storyId === storyId).map((s: any) => s.order || 0), 0);

    for (let i = 0; i < parsedBranches.length; i++) {
      const branch = parsedBranches[i];
      const newSegment = {
        id: `seg_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 6)}`,
        storyId,
        title: branch.title,
        content: branch.content,
        order: maxOrder + i + 1,
        isBranchPoint: false,
        parentBranchId: segmentId,
        imageUrls: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      newSegments.push(newSegment);
    }

    const allSegments = [...segments, ...newSegments];
    await segmentsStore.save(allSegments);

    return NextResponse.json({
      success: true,
      branches: newSegments,
      totalBranches: newSegments.length
    });

  } catch (error) {
    console.error('故事分叉失败:', error);
    return NextResponse.json(
      { error: '故事分叉失败', details: String(error) },
      { status: 500 }
    );
  }
}
