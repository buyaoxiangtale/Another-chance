import { NextRequest, NextResponse } from 'next/server';
import { storiesStore, segmentsStore, branchesStore } from '@/lib/simple-db';

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
    const { segmentId, userDirection, branchTitle } = await request.json();

    if (!storyId || !segmentId || !userDirection) {
      return NextResponse.json({ error: '缺少必要参数: segmentId, userDirection' }, { status: 400 });
    }

    const stories = await storiesStore.load();
    const story = stories.find((s: any) => s.id === storyId);
    if (!story) return NextResponse.json({ error: '故事不存在' }, { status: 404 });

    const segments = await segmentsStore.load();
    const currentSegment = segments.find((s: any) => s.id === segmentId && s.storyId === storyId);
    if (!currentSegment) return NextResponse.json({ error: '段落不存在' }, { status: 404 });

    // 生成新的分支 ID
    const branchId = `branch_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    
    // 创建分支记录
    const newBranch = {
      id: branchId,
      title: branchTitle || `分叉: ${userDirection}`,
      sourceSegmentId: segmentId,
      storyId: storyId,
      userDirection: userDirection,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const branches = await branchesStore.load();
    branches.push(newBranch);
    await branchesStore.save(branches);

    // 生成分支内容的 AI 提示
    const prevSegments = segments.filter((s: any) => 
      s.storyId === storyId && new Date(s.createdAt) <= new Date(currentSegment.createdAt)
    ).sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    const contextSummary = prevSegments.map((s: any) =>
      `${s.title ? `【${s.title}】` : ''}${s.content}`
    ).join('\n');

    const prompt = `故事标题：${story.title}
故事背景：${story.description || ''}

当前故事进展：
${contextSummary}

用户希望的故事走向：${userDirection}

请根据用户指定的方向，续写下一段（150-300字），保持古典文学风格，与前文情节连续。`;

    // 使用正确的 AI API 配置
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
        max_tokens: 2000
      })
    });

    if (!aiResponse.ok) {
      const text = await aiResponse.text();
      throw new Error(`AI API error ${aiResponse.status}: ${text}`);
    }

    const data = await aiResponse.json();
    // 对于 glm-5.1，content 字段在 choices[0].message.content 中
    const aiContent = data.choices?.[0]?.message?.content || '';

    // 创建新段落
    const newSegment = {
      id: `seg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      storyId,
      title: branchTitle || `分叉: ${userDirection}`,
      content: aiContent,
      isBranchPoint: false,
      branchId: branchId, // 新段落在新分支中
      parentSegmentId: segmentId, // 父段落为当前段落
      imageUrls: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    segments.push(newSegment);
    await segmentsStore.save(segments);

    return NextResponse.json({
      success: true,
      branch: newBranch,
      segment: newSegment,
      message: '分支创建成功'
    });

  } catch (error) {
    console.error('故事分叉失败:', error);
    return NextResponse.json(
      { error: '故事分叉失败', details: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}
