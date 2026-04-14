import { NextRequest, NextResponse } from 'next/server';
import { characterManager } from '@/lib/character-engine';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id: storyId } = params;
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId');
    const segmentId = searchParams.get('segmentId');

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

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id: storyId } = params;
    const body = await request.json();
    const character = await characterManager.create(body);
    return NextResponse.json(character, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id: storyId } = params;
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
