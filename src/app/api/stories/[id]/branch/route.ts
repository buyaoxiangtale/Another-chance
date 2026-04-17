import { NextRequest, NextResponse } from 'next/server';
import { storiesStore, segmentsStore, branchesStore, getOrderedChain, type StorySegment } from '@/lib/simple-db';
import { characterManager } from '@/lib/character-engine';
import { buildFullPrompt } from '@/lib/prompt-builder';
import { callAIText } from '@/lib/ai-client';

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

    // 使用 buildFullPrompt 构建完整的上下文 prompt
    const tailSegment = relevantChain[relevantChain.length - 1];
    const prompt = await buildFullPrompt({
      storyId,
      branchId: 'main', // 分叉点在主线
      tailSegment,
      chain: relevantChain,
      storyTitle: story.title,
      storyDescription: story.description,
    });

    // 在 prompt 末尾追加用户分叉方向
    const finalPrompt = `${prompt}\n\n用户希望的故事走向：${userDirection}\n\n请根据用户指定的方向，续写下一段（150-300字），与前文情节连续。`;

    // 使用统一的 AI 客户端调用
    const aiContent = await callAIText(finalPrompt, { maxTokens: 2000, story });

    // 检查 AI 返回内容是否为空
    if (!aiContent || aiContent.trim().length === 0) {
      // 清理已创建的分支记录
      const existingBranches = await branchesStore.load();
      await branchesStore.save(existingBranches.filter(b => b.id !== branchId));
      return NextResponse.json({ error: 'AI 未生成有效内容，分叉失败，请重试' }, { status: 500 });
    }

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
