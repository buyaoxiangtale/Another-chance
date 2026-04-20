import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/auth-helpers';
import { canViewStory } from '@/lib/permissions';
import { timelineEngine, buildTimelinePrompt } from '@/lib/timeline-engine';
import { lorebook } from '@/lib/lorebook';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const userId = await getUserIdFromRequest(request);
    const storyId = params.id;
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branch') || 'main';
    const segmentId = searchParams.get('segmentId');
    const format = searchParams.get('format');

    const story = await prisma.story.findUnique({ where: { id: storyId } });
    if (!story) return NextResponse.json({ error: '故事不存在' }, { status: 404 });

    if (!canViewStory(story, userId ?? undefined)) {
      return NextResponse.json({ error: '无权查看' }, { status: 403 });
    }

    const timeline = await timelineEngine.getTimeline(storyId, branchId);
    const violations = await timelineEngine.validateTimeline(storyId, branchId);

    let context = null;
    if (segmentId) {
      context = await timelineEngine.getTimelineContext(storyId, branchId, segmentId);
    }

    if (format === 'prompt') {
      const era = story.era;
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

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const userId = await getUserIdFromRequest(request);
    const storyId = params.id;
    const body = await request.json();
    const branchId = body.branch || 'main';

    const story = await prisma.story.findUnique({ where: { id: storyId } });
    if (!story) return NextResponse.json({ error: '故事不存在' }, { status: 404 });

    if (!canViewStory(story, userId ?? undefined)) {
      return NextResponse.json({ error: '无权查看' }, { status: 403 });
    }

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
