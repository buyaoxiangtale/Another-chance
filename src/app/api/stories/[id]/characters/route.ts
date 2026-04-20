import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/auth-helpers';
import { canViewStory, canEditStory } from '@/lib/permissions';
import { characterManager } from '@/lib/character-engine';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const userId = await getUserIdFromRequest(request);
    const { id: storyId } = params;
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId');
    const segmentId = searchParams.get('segmentId');

    const story = await prisma.story.findUnique({ where: { id: storyId } });
    if (!story) return NextResponse.json({ error: '故事不存在' }, { status: 404 });

    if (!canViewStory(story, userId ?? undefined)) {
      return NextResponse.json({ error: '无权查看' }, { status: 403 });
    }

    if (branchId && segmentId) {
      const context = await characterManager.getCharacterContext(storyId, branchId, segmentId);
      return NextResponse.json(context);
    }

    if (branchId) {
      const graph = await characterManager.getRelationshipGraph(storyId, branchId);
      return NextResponse.json(graph);
    }

    const characters = await characterManager.list(storyId);
    return NextResponse.json(characters);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { id: storyId } = params;
    const story = await prisma.story.findUnique({ where: { id: storyId } });
    if (!story) return NextResponse.json({ error: '故事不存在' }, { status: 404 });

    if (!canEditStory(story, userId)) {
      return NextResponse.json({ error: '无权编辑' }, { status: 403 });
    }

    const body = await request.json();
    const character = await characterManager.create(body);
    return NextResponse.json(character, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { id: storyId } = params;
    const story = await prisma.story.findUnique({ where: { id: storyId } });
    if (!story) return NextResponse.json({ error: '故事不存在' }, { status: 404 });

    if (!canEditStory(story, userId)) {
      return NextResponse.json({ error: '无权编辑' }, { status: 403 });
    }

    const body = await request.json();
    const { characterId, ...updates } = body;
    if (!characterId) {
      return NextResponse.json({ error: 'characterId is required' }, { status: 400 });
    }
    const character = await characterManager.update(characterId, updates);
    if (!character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }
    return NextResponse.json(character);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
