import { NextRequest, NextResponse } from 'next/server';
import { storiesStore, segmentsStore, branchesStore, getOrderedChain, type StorySegment } from '@/lib/simple-db';
import { characterManager } from '@/lib/character-engine';

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

    // Generate branch ID
    const branchId = `branch_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    // Snapshot character states at fork point
    let characterStateSnapshot: any = undefined;
    try {
      characterStateSnapshot = await characterManager.snapshotCharacterStates(storyId, 'main', segmentId);
    } catch (e) {
      console.warn('[branch] 角色快照失败（非致命）:', e);
    }

    // Create branch record
    const newBranch = {
      id: branchId,
      title: branchTitle || `分叉: ${userDirection}`,
      sourceSegmentId: segmentId,
      storyId,
      userDirection,
      characterStateSnapshot,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const branches = await branchesStore.load();
    branches.push(newBranch);
    await branchesStore.save(branches);

    // Mark source segment as branch point
    currentSegment.isBranchPoint = true;
    await segmentsStore.save(segments);

    // Build context: get ordered chain of main branch up to the source segment
    const mainChain = await getOrderedChain(storyId, 'main');
    const contextSegments = mainChain.filter(s => {
      if (s.id === segmentId) return true;
      // Include all ancestors
      let cur: StorySegment | undefined = s;
      while (cur?.parentSegmentId) {
        if (cur.parentSegmentId === segmentId) return false; // after source
        cur = mainChain.find(ms => ms.id === cur!.parentSegmentId);
      }
      return true;
    });
    // Simpler: just include main chain segments up to and including sourceSegment
    const idx = mainChain.findIndex(s => s.id === segmentId);
    const relevantChain = idx >= 0 ? mainChain.slice(0, idx + 1) : mainChain;

    const contextSummary = relevantChain.map((s: StorySegment) =>
      `${s.title ? `【${s.title}】` : ''}${s.content}`
    ).join('\n');

    const prompt = `故事标题：${story.title}
故事背景：${story.description || ''}

当前故事进展：
${contextSummary}

用户希望的故事走向：${userDirection}

请根据用户指定的方向，续写下一段（150-300字），保持古典文学风格，与前文情节连续。`;

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
    const aiContent = data.choices?.[0]?.message?.content || '';

    // Create new segment on the new branch
    const newSegment: StorySegment = {
      id: `seg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      storyId,
      title: branchTitle || `分叉: ${userDirection}`,
      content: aiContent,
      isBranchPoint: false,
      branchId, // new branch
      parentSegmentId: segmentId,
      imageUrls: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const allSegments = await segmentsStore.load();
    allSegments.push(newSegment);
    await segmentsStore.save(allSegments);

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
