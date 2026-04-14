import { NextRequest, NextResponse } from 'next/server';
import { characterManager } from '@/lib/character-engine';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const character = await characterManager.getById(id);
    if (!character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }
    return NextResponse.json(character);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const deleted = await characterManager.delete(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await request.json();
    const character = await characterManager.update(id, body);
    if (!character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }
    return NextResponse.json(character);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
