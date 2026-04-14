import type { Character, CharacterStateEntry, StorySegment as FullStorySegment } from '@/types/story';
import { SimpleStore, getOrderedChain, storiesStore, type StorySegment } from './simple-db';

const charactersStore = new SimpleStore<Character>('characters.json');

// Generate unique ID
function genId(): string {
  return 'char_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export class CharacterManager {
  // === CRUD ===

  async list(storyId?: string): Promise<Character[]> {
    const all = await charactersStore.load();
    if (storyId) {
      const stories = await storiesStore.load();
      const story = stories.find(s => s.id === storyId);
      const cids = (story as any)?.characterIds;
      if (cids) {
        return all.filter(c => cids.includes(c.id));
      }
      return [];
    }
    return all;
  }

  async getById(id: string): Promise<Character | null> {
    const all = await charactersStore.load();
    return all.find(c => c.id === id) || null;
  }

  async create(data: Omit<Character, 'id' | 'createdAt' | 'updatedAt' | 'stateHistory'>): Promise<Character> {
    const all = await charactersStore.load();
    const now = new Date().toISOString();
    const character: Character = {
      ...data,
      id: genId(),
      stateHistory: [],
      createdAt: now,
      updatedAt: now,
    };
    all.push(character);
    await charactersStore.save(all);
    return character;
  }

  async update(id: string, updates: Partial<Character>): Promise<Character | null> {
    const all = await charactersStore.load();
    const idx = all.findIndex(c => c.id === id);
    if (idx === -1) return null;
    all[idx] = { ...all[idx], ...updates, updatedAt: new Date().toISOString() };
    await charactersStore.save(all);
    return all[idx];
  }

  async delete(id: string): Promise<boolean> {
    const all = await charactersStore.load();
    const filtered = all.filter(c => c.id !== id);
    if (filtered.length === all.length) return false;
    await charactersStore.save(filtered);
    return true;
  }

  // === 2.2 获取当前段落的角色上下文 ===
  async getCharacterContext(storyId: string, branchId: string, segmentId: string) {
    const characters = await this.list(storyId);
    const chain = await getOrderedChain(storyId, branchId);
    const segIdx = chain.findIndex(s => s.id === segmentId);

    // 收集到该段落为止涉及的所有角色ID
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

  // === 2.3 记录角色状态变化 ===
  async updateCharacterState(characterId: string, segmentId: string, newState: string): Promise<Character | null> {
    const all = await charactersStore.load();
    const char = all.find(c => c.id === characterId);
    if (!char) return null;

    // 追加状态记录（不覆盖历史）
    const entry: CharacterStateEntry = { segmentId, state: newState };
    // 如果同一个 segmentId 已有记录，更新它
    const existingIdx = char.stateHistory.findIndex(e => e.segmentId === segmentId);
    if (existingIdx >= 0) {
      char.stateHistory[existingIdx] = entry;
    } else {
      char.stateHistory.push(entry);
    }

    char.updatedAt = new Date().toISOString();
    await charactersStore.save(all);
    return char;
  }

  // === 2.4 获取角色关系网 ===
  async getRelationshipGraph(storyId: string, branchId: string) {
    const characters = await this.list(storyId);
    const nodes = characters.map(c => ({
      id: c.id,
      name: c.name,
      role: c.role,
    }));

    const edges: Array<{ source: string; target: string; relation: string; strength: number }> = [];
    for (const c of characters) {
      for (const rel of c.relationships) {
        if (characters.some(t => t.id === rel.targetId)) {
          edges.push({
            source: c.id,
            target: rel.targetId,
            relation: rel.relation,
            strength: rel.strength,
          });
        }
      }
    }

    return { nodes, edges };
  }

  // === 2.5 构建角色 AI prompt 片段 ===
  async buildCharacterPrompt(characterIds: string[], segmentChain?: FullStorySegment[]): Promise<string> {
    const all = await charactersStore.load();
    const characters = all.filter(c => characterIds.includes(c.id));

    if (characters.length === 0) return '';

    const lines: string[] = ['【角色信息】'];

    for (const c of characters) {
      lines.push(`## ${c.name}（${c.role === 'protagonist' ? '主角' : c.role === 'antagonist' ? '对手' : c.role === 'supporting' ? '配角' : '旁白'}）`);
      lines.push(`时代：${c.era}`);
      if (c.traits.length > 0) {
        lines.push(`性格特征：${c.traits.join('、')}`);
      }
      if (c.coreMotivation) {
        lines.push(`核心动机：${c.coreMotivation}`);
      }
      if (c.speechPatterns) {
        lines.push(`语言风格：${c.speechPatterns}`);
      }
      if (c.stateHistory.length > 0) {
        const latestState = c.stateHistory[c.stateHistory.length - 1];
        lines.push(`当前状态：${latestState.state}`);
      }
      if (c.relationships.length > 0) {
        const relStr = c.relationships.map(r => {
          const target = all.find(t => t.id === r.targetId);
          return `${target?.name || r.targetId}（${r.relation}，亲密度${Math.round(r.strength * 100)}%）`;
        }).join('；');
        lines.push(`人物关系：${relStr}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  // === 2.6 分叉时保存角色状态快照 ===
  async snapshotCharacterStates(storyId: string, branchId: string, segmentId: string): Promise<Record<string, string>> {
    const characters = await this.list(storyId);
    const snapshot: Record<string, string> = {};

    for (const c of characters) {
      if (c.stateHistory.length > 0) {
        snapshot[c.id] = c.stateHistory[c.stateHistory.length - 1].state;
      } else {
        snapshot[c.id] = '正常';
      }
    }

    // 同时保存到分支的 characterStateSnapshot
    const branches = await (await import('./simple-db')).branchesStore.load();
    const branchIdx = branches.findIndex(b => b.id === branchId);
    if (branchIdx >= 0) {
      (branches[branchIdx] as any).characterStateSnapshot = snapshot;
      await (await import('./simple-db')).branchesStore.save(branches);
    }

    return snapshot;
  }

  // === 2.7 恢复角色状态 ===
  async restoreCharacterStates(snapshot: Record<string, string>): Promise<void> {
    const all = await charactersStore.load();
    for (const c of all) {
      if (snapshot[c.id] !== undefined) {
        const existingIdx = c.stateHistory.findIndex(e => e.segmentId === '__restored__');
        const entry: CharacterStateEntry = { segmentId: '__restored__', state: snapshot[c.id] };
        if (existingIdx >= 0) {
          c.stateHistory[existingIdx] = entry;
        } else {
          c.stateHistory.push(entry);
        }
      }
    }
    await charactersStore.save(all);
  }
}

// Singleton
export const characterManager = new CharacterManager();
