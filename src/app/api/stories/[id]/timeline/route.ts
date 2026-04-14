import { NextRequest, NextResponse } from 'next/server';
import { timelineEngine, buildTimelinePrompt } from '@/lib/timeline-engine';
import { lorebook } from '@/lib/lorebook';

// GET 时间轴 /storyId/branchId
// POST 修正时间轴
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const storyId = params.id;
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branch') || 'main';
    const segmentId = searchParams.get('segmentId');
    const format = searchParams.get('format'); // 'prompt' 返回 AI prompt 片段

    const timeline = await timelineEngine.getTimeline(storyId, branchId);

    // 校验时间单调性
    const violations = await timelineEngine.validateTimeline(storyId, branchId);

    // 时间上下文
    let context = null;
    if (segmentId) {
      context = await timelineEngine.getTimelineContext(storyId, branchId, segmentId);
    }

    // prompt 格式：附带世界观设定
    if (format === 'prompt') {
      const storySegments = (await import('@/lib/simple-db')).segmentsStore;
      const segments = await storySegments.load();
      const story = (await (await import('@/lib/simple-db')).storiesStore.load())
        .find((s: any) => s.id === storyId);

      const era = story?.era;
      const loreEntries = era ? await lorebook.getEntries(era) : [];

      const prompt = buildTimelinePrompt(timeline, loreEntries);
      return NextResponse.json({
        success: true,
        prompt,
        eventCount: timeline.length,
        loreEntriesCount: loreEntries.length,
        violations,
      });
    }

    return NextResponse.json({
      success: true,
      timeline,
      violations,
      context,
      eventCount: timeline.length,
    });

  } catch (error) {
    console.error('获取时间轴失败:', error);
    return NextResponse.json({ error: '获取时间轴失败' }, { status: 500 });
  }
}

// POST 修正时间轴 — 返回校验结果
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const storyId = params.id;
    const body = await request.json();
    const branchId = body.branch || 'main';

    const violations = await timelineEngine.validateTimeline(storyId, branchId);

    return NextResponse.json({
      success: true,
      storyId,
      branchId,
      violations,
      isValid: violations.length === 0,
    });

  } catch (error) {
    console.error('时间轴校验失败:', error);
    return NextResponse.json({ error: '时间轴校验失败' }, { status: 500 });
  }
}
