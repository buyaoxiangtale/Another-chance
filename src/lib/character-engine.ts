import type { Character as PrismaCharacter, StorySegment as PrismaSegment, StoryBranch as PrismaBranch } from '@/lib/prisma';
import prisma from '@/lib/prisma';
import { getOrderedChain } from '@/lib/chain-helpers';

type StorySegment = PrismaSegment;
type Character = PrismaCharacter;

// Generate unique ID
function genId(): string {
  return 'char_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export class CharacterManager {
  // === CRUD ===

  async list(storyId?: string): Promise<Character[]> {
    if (storyId) {
      return prisma.character.findMany({ where: { storyId } });
    }
    return prisma.character.findMany();
  }

  async getById(id: string): Promise<Character | null> {
    return prisma.character.findUnique({ where: { id } });
  }

  async create(data: {
    name: string;
    era?: string;
    role?: string;
    traits?: string[];
    speechPatterns?: string;
    relationships?: any[];
    stateHistory?: any[];
    coreMotivation?: string;
    storyId: string;
  }): Promise<Character> {
    return prisma.character.create({
      data: {
        id: genId(),
        name: data.name,
        era: data.era || '',
        role: data.role || 'supporting',
        traits: data.traits || [],
        speechPatterns: data.speechPatterns || '',
        relationships: data.relationships || [],
        stateHistory: data.stateHistory || [],
        coreMotivation: data.coreMotivation || '',
        storyId: data.storyId,
      },
    });
  }

  async update(id: string, updates: Partial<Character>): Promise<Character | null> {
    try {
      const { id: _id, createdAt: _ca, storyId: _sid, ...safeUpdates } = updates as any;
      return await prisma.character.update({
        where: { id },
        data: { ...safeUpdates, updatedAt: new Date() },
      });
    } catch {
      return null;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await prisma.character.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  // === Character context for a segment ===
  async getCharacterContext(storyId: string, branchId: string, segmentId: string) {
    const characters = await this.list(storyId);
    const chain = await getOrderedChain(storyId, branchId);
    const segIdx = chain.findIndex(s => s.id === segmentId);

    const involvedIds = new Set<string>();
    for (let i = 0; i <= segIdx && i < chain.length; i++) {
      if ((chain[i] as any).characterIds) {
        ((chain[i] as any).characterIds as string[]).forEach(id => involvedIds.add(id));
      }
    }

    const activeCharacters = characters.filter(c => involvedIds.has(c.id));
    return {
      activeCharacters,
      segmentId,
      totalCharacters: characters.length,
      activeCount: activeCharacters.length,
    };
  }

  // === Update character state ===
  async updateCharacterState(characterId: string, segmentId: string, newState: string): Promise<Character | null> {
    const char = await prisma.character.findUnique({ where: { id: characterId } });
    if (!char) return null;

    const stateHistory: any[] = Array.isArray(char.stateHistory) ? [...char.stateHistory] : [];
    const existingIdx = stateHistory.findIndex((e: any) => e.segmentId === segmentId);
    const entry = { segmentId, state: newState };
    if (existingIdx >= 0) {
      stateHistory[existingIdx] = entry;
    } else {
      stateHistory.push(entry);
    }

    return prisma.character.update({
      where: { id: characterId },
      data: { stateHistory, updatedAt: new Date() },
    });
  }

  // === Relationship graph ===
  async getRelationshipGraph(storyId: string, branchId: string) {
    const characters = await this.list(storyId);
    const nodes = characters.map(c => ({
      id: c.id,
      name: c.name,
      role: c.role,
    }));

    const edges: Array<{ source: string; target: string; relation: string; strength: number }> = [];
    for (const c of characters) {
      const relationships = Array.isArray(c.relationships) ? c.relationships : [];
      for (const rel of relationships) {
        const r = rel as any;
        if (characters.some(t => t.id === r.targetId)) {
          edges.push({
            source: c.id,
            target: r.targetId,
            relation: r.relation,
            strength: r.strength,
          });
        }
      }
    }

    return { nodes, edges };
  }

  // === Build character AI prompt ===
  async buildCharacterPrompt(characterIds: string[], segmentChain?: any[]): Promise<string> {
    const characters = await prisma.character.findMany({
      where: { id: { in: characterIds } },
    });

    if (characters.length === 0) return '';

    const lines: string[] = ['【角色信息】'];

    for (const c of characters) {
      lines.push(`## ${c.name}（${c.role === 'protagonist' ? '主角' : c.role === 'antagonist' ? '对手' : c.role === 'supporting' ? '配角' : '旁白'}）`);
      lines.push(`时代：${c.era}`);
      const traits = Array.isArray(c.traits) ? (c.traits as string[]) : [];
      if (traits.length > 0) {
        lines.push(`性格特征：${traits.join('、')}`);
      }
      if (c.coreMotivation) {
        lines.push(`核心动机：${c.coreMotivation}`);
      }
      if (c.speechPatterns) {
        lines.push(`语言风格：${c.speechPatterns}`);
      }
      const stateHistory = Array.isArray(c.stateHistory) ? c.stateHistory : [];
      if (stateHistory.length > 0) {
        const latestState = stateHistory[stateHistory.length - 1] as any;
        lines.push(`当前状态：${latestState.state}`);
      }
      const relationships = Array.isArray(c.relationships) ? c.relationships : [];
      if (relationships.length > 0) {
        const relStr = relationships.map((r: any) => {
          const target = characters.find(t => t.id === r.targetId);
          return `${target?.name || r.targetId}（${r.relation}，亲密度${Math.round(r.strength * 100)}%）`;
        }).join('；');
        lines.push(`人物关系：${relStr}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  // === Snapshot character states at branch point ===
  async snapshotCharacterStates(storyId: string, branchId: string, segmentId: string): Promise<Record<string, string>> {
    const characters = await this.list(storyId);
    const snapshot: Record<string, string> = {};

    for (const c of characters) {
      const stateHistory = Array.isArray(c.stateHistory) ? c.stateHistory : [];
      if (stateHistory.length > 0) {
        snapshot[c.id] = (stateHistory[stateHistory.length - 1] as any).state;
      } else {
        snapshot[c.id] = '正常';
      }
    }

    // Save to branch's characterStateSnapshot
    try {
      await prisma.storyBranch.update({
        where: { id: branchId },
        data: { characterStateSnapshot: snapshot },
      });
    } catch {}

    return snapshot;
  }

  // === Restore character states ===
  async restoreCharacterStates(snapshot: Record<string, string>): Promise<void> {
    for (const [charId, state] of Object.entries(snapshot)) {
      const char = await prisma.character.findUnique({ where: { id: charId } });
      if (!char) continue;

      const stateHistory: any[] = Array.isArray(char.stateHistory) ? [...char.stateHistory] : [];
      const existingIdx = stateHistory.findIndex((e: any) => e.segmentId === '__restored__');
      const entry = { segmentId: '__restored__', state };
      if (existingIdx >= 0) {
        stateHistory[existingIdx] = entry;
      } else {
        stateHistory.push(entry);
      }

      await prisma.character.update({
        where: { id: charId },
        data: { stateHistory, updatedAt: new Date() },
      });
    }
  }
}

// Singleton
export const characterManager = new CharacterManager();
