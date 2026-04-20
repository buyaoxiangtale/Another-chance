/**
 * 5.7 DirectorState 持久化
 */

import prisma from '@/lib/prisma';

export class DirectorManager {
  /**
   * 获取故事的导演状态
   */
  async getState(storyId: string) {
    return prisma.directorState.findUnique({ where: { storyId } });
  }

  /**
   * 获取或创建导演状态
   */
  async getOrCreate(storyId: string) {
    const existing = await this.getState(storyId);
    if (existing) return existing;

    return prisma.directorState.create({
      data: {
        id: `dir_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        storyId,
        characterStates: {},
        worldVariables: {},
        activeConstraints: [],
      },
    });
  }

  /**
   * 更新导演状态
   */
  async updateState(storyId: string, updates: any) {
    const existing = await prisma.directorState.findUnique({ where: { storyId } });
    if (!existing) return null;

    const data: any = { updatedAt: new Date() };
    if (updates.characterStates) {
      data.characterStates = { ...(existing.characterStates as any), ...updates.characterStates };
    }
    if (updates.worldVariables) {
      data.worldVariables = { ...(existing.worldVariables as any), ...updates.worldVariables };
    }
    if (updates.activeConstraints) {
      data.activeConstraints = updates.activeConstraints;
    }

    return prisma.directorState.update({
      where: { storyId },
      data,
    });
  }

  /**
   * 构建导演覆盖 prompt 片段
   */
  async buildDirectorPrompt(storyId: string): Promise<string> {
    const state = await this.getState(storyId);
    if (!state) return '';

    const parts: string[] = [];
    const charStates = state.characterStates as Record<string, string> || {};

    if (Object.keys(charStates).length > 0) {
      parts.push('【导演指定角色状态】');
      for (const [charId, charState] of Object.entries(charStates)) {
        parts.push(`- 角色 ${charId}：${charState}`);
      }
    }

    const worldVars = state.worldVariables as Record<string, string> || {};
    if (Object.keys(worldVars).length > 0) {
      parts.push('【导演指定世界变量】');
      for (const [key, value] of Object.entries(worldVars)) {
        parts.push(`- ${key}：${value}`);
      }
    }

    const constraints = state.activeConstraints as string[] || [];
    if (constraints.length > 0) {
      parts.push('【创作约束】');
      for (const constraint of constraints) {
        parts.push(`- ${constraint}`);
      }
    }

    return parts.join('\n');
  }
}

export const directorManager = new DirectorManager();
