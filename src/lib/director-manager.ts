/**
 * 5.7 DirectorState 持久化
 */

import type { DirectorState } from '@/types/story';
import { SimpleStore } from './simple-db';

const directorStore = new SimpleStore<DirectorState>('director-state.json');

export class DirectorManager {
  /**
   * 获取故事的导演状态
   */
  async getState(storyId: string): Promise<DirectorState | null> {
    const all = await directorStore.load();
    return all.find(s => s.storyId === storyId) || null;
  }

  /**
   * 获取或创建导演状态
   */
  async getOrCreate(storyId: string): Promise<DirectorState> {
    const existing = await this.getState(storyId);
    if (existing) return existing;

    const state: DirectorState = {
      id: `dir_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      storyId,
      characterStates: {},
      worldVariables: {},
      activeConstraints: [],
      updatedAt: new Date().toISOString(),
    };

    const all = await directorStore.load();
    all.push(state);
    await directorStore.save(all);
    return state;
  }

  /**
   * 更新导演状态
   */
  async updateState(storyId: string, updates: Partial<DirectorState>): Promise<DirectorState | null> {
    const all = await directorStore.load();
    const idx = all.findIndex(s => s.storyId === storyId);
    if (idx === -1) return null;

    const current = all[idx];
    if (updates.characterStates) {
      current.characterStates = { ...current.characterStates, ...updates.characterStates };
    }
    if (updates.worldVariables) {
      current.worldVariables = { ...current.worldVariables, ...updates.worldVariables };
    }
    if (updates.activeConstraints) {
      current.activeConstraints = updates.activeConstraints;
    }
    current.updatedAt = new Date().toISOString();

    all[idx] = current;
    await directorStore.save(all);
    return current;
  }

  /**
   * 构建导演覆盖 prompt 片段
   */
  async buildDirectorPrompt(storyId: string): Promise<string> {
    const state = await this.getState(storyId);
    if (!state) return '';

    const parts: string[] = [];

    if (Object.keys(state.characterStates).length > 0) {
      parts.push('【导演指定角色状态】');
      for (const [charId, charState] of Object.entries(state.characterStates)) {
        parts.push(`- 角色 ${charId}：${charState}`);
      }
    }

    if (Object.keys(state.worldVariables).length > 0) {
      parts.push('【导演指定世界变量】');
      for (const [key, value] of Object.entries(state.worldVariables)) {
        parts.push(`- ${key}：${value}`);
      }
    }

    if (state.activeConstraints.length > 0) {
      parts.push('【创作约束】');
      for (const constraint of state.activeConstraints) {
        parts.push(`- ${constraint}`);
      }
    }

    return parts.join('\n');
  }
}

export const directorManager = new DirectorManager();
