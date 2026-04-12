import { NextRequest, NextResponse } from 'next/server';

// @ts-ignore
const { storiesStore, segmentsStore } = require('@/lib/simple-db');
// @ts-ignore
const AIService = require('@/lib/ai-service');
// @ts-ignore
const StoryBranchingService = require('@/lib/story-branching');

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id: storyId } = params;
    const body = await request.json();
    const { segmentId, branchType = 'alternate', style, tone, userInstructions = '' } = body;

    if (!storyId || !segmentId) {
      return NextResponse.json({ error: '故事ID和段落ID都是必填项' }, { status: 400 });
    }

    const stories = await storiesStore.load();
    const story = stories.find((s: any) => s.id === storyId);
    if (!story) return NextResponse.json({ error: '故事不存在' }, { status: 404 });

    const segments = await segmentsStore.load();
    const currentSegment = segments.find((s: any) => s.id === segmentId && s.storyId === storyId);
    if (!currentSegment) return NextResponse.json({ error: '段落不存在' }, { status: 404 });
    if (!currentSegment.isBranchPoint) return NextResponse.json({ error: '当前段落不是分叉点' }, { status: 400 });

    const aiService = new AIService.default({
      apiKey: process.env.AI_API_KEY,
      baseUrl: process.env.AI_BASE_URL,
      model: process.env.AI_MODEL
    });
    const branchingService = new StoryBranchingService.default(aiService);

    const result = await branchingService.generateBranches(storyId, segmentId, {
      branchType, style: style || '古典文学风格', tone: tone || '严肃', userInstructions
    });

    if (!result.success) {
      return NextResponse.json({ error: '生成分支失败', details: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, branches: result.branches, totalBranches: result.totalBranches });

  } catch (error) {
    console.error('故事分叉失败:', error);
    return NextResponse.json({ error: '故事分叉失败', details: String(error) }, { status: 500 });
  }
}