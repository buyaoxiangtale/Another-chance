import { NextRequest, NextResponse } from 'next/server';

// @ts-ignore
const { storiesStore, segmentsStore } = require('@/lib/simple-db');
// @ts-ignore
const AIService = require('@/lib/ai-service');
// @ts-ignore
const StoryPromptService = require('@/lib/story-prompt');

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id: storyId } = params;
    const body = await request.json();
    
    const { segmentId, style, tone, characters, length, userInstructions } = body;

    if (!storyId || !segmentId) {
      return NextResponse.json({ error: '故事ID和段落ID都是必填项' }, { status: 400 });
    }

    const stories = await storiesStore.load();
    const story = stories.find((s: any) => s.id === storyId);
    if (!story) return NextResponse.json({ error: '故事不存在' }, { status: 404 });

    const segments = await segmentsStore.load();
    const currentSegment = segments.find((s: any) => s.id === segmentId && s.storyId === storyId);
    if (!currentSegment) return NextResponse.json({ error: '段落不存在' }, { status: 404 });

    const aiService = new AIService.default({
      apiKey: process.env.AI_API_KEY,
      baseUrl: process.env.AI_BASE_URL,
      model: process.env.AI_MODEL
    });
    const promptService = new StoryPromptService.default(aiService);

    const { prompt } = promptService.generateContinuationPrompt(story, currentSegment, {
      style: style || '古典文学风格',
      tone: tone || '严肃',
      length: length || '中等长度',
      characters: characters || [],
      userInstructions: userInstructions || ''
    });

    const response = await aiService.generateText(prompt, { temperature: 0.7, maxTokens: 1000 });

    const newSegment = {
      title: currentSegment.isBranchPoint ? '分叉发展' : '故事续写',
      content: response,
      order: currentSegment.order + 1,
      isBranchPoint: false,
      storyId, parentBranchId: null, imageUrls: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const allSegments = await segmentsStore.load();
    allSegments.push(newSegment);
    await segmentsStore.save(allSegments);

    return NextResponse.json({ success: true, newSegment, story });

  } catch (error) {
    console.error('故事续写失败:', error);
    return NextResponse.json({ error: '故事续写失败', details: String(error) }, { status: 500 });
  }
}