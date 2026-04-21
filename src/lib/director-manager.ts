/**
 * 5.7 DirectorState 持久化 + 滚动场景状态（Scene State）
 */

import prisma from '@/lib/prisma';

/** 滚动场景状态：描述故事当前的"视觉世界快照"，每段增量更新 */
export interface SceneState {
  /** 当前所在地点（中文简短，如 "忍者学校教室"） */
  location?: string;
  /** 时间段（day / dusk / night / dawn） */
  timeOfDay?: string;
  /** 天气（sunny / rainy / snowy / stormy / clear / foggy） */
  weather?: string;
  /** 季节（spring / summer / autumn / winter） */
  season?: string;
  /** 当前在场角色（中文名列表） */
  presentCharacters?: string[];
  /** 氛围（tense / peaceful / somber / joyful / ominous / ...） */
  mood?: string;
  /** 服装/外形备注（如 "带土佩戴新的护目镜，红色" —— 跨段保持一致） */
  clothingNotes?: string;
  /** 更新时间戳 */
  updatedAt?: string;
}

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
   * 读取滚动场景状态（存在 worldVariables.scene_state 里）
   */
  async getSceneState(storyId: string): Promise<SceneState | null> {
    const state = await this.getState(storyId);
    if (!state) return null;
    const wv = (state.worldVariables as any) || {};
    const s = wv.scene_state as SceneState | undefined;
    return s || null;
  }

  /**
   * 用 AI 从最新段落增量更新滚动场景状态（location / time / weather / 在场角色 / 氛围 / 服装）
   */
  async updateSceneState(
    storyId: string,
    segmentContent: string,
    callAIFn: (prompt: string) => Promise<string>,
  ): Promise<SceneState | null> {
    const existing = await this.getOrCreate(storyId);
    const wv = (existing.worldVariables as any) || {};
    const prev: SceneState = (wv.scene_state as SceneState) || {};

    const prevJson = JSON.stringify(prev, null, 2);
    const prompt = `你是故事世界的场景记录员。根据"上一场景状态"和"最新段落内容"，增量更新场景状态。

上一场景状态（JSON）：
${prevJson}

最新段落：
${segmentContent.slice(0, 2000)}

请输出严格 JSON（不要 markdown），字段：
{
  "location": "当前所在地点（中文简短）",
  "timeOfDay": "day|dusk|night|dawn",
  "weather": "sunny|rainy|snowy|stormy|clear|foggy",
  "season": "spring|summer|autumn|winter",
  "presentCharacters": ["在场角色中文名"],
  "mood": "tense|peaceful|somber|joyful|ominous|...",
  "clothingNotes": "本段出现的服装/外形变化备注（无则空串）"
}

规则：
- 如果本段未提到某字段，保留上一状态的值（不要凭空修改）。
- presentCharacters 只保留本段明确出现在当前场景中的角色。
- clothingNotes 重要变化（如带新面具、换装、受伤）必须记录，跨段保持一致。
- 只输出 JSON，不要解释。`;

    let next: SceneState = { ...prev };
    try {
      const raw = await callAIFn(prompt);
      const cleaned = raw.trim().replace(/^```json\s*/i, '').replace(/```$/g, '').trim();
      const m = cleaned.match(/\{[\s\S]*\}/);
      if (m) {
        const parsed = JSON.parse(m[0]);
        next = {
          location: parsed.location || prev.location,
          timeOfDay: parsed.timeOfDay || prev.timeOfDay,
          weather: parsed.weather || prev.weather,
          season: parsed.season || prev.season,
          presentCharacters: Array.isArray(parsed.presentCharacters) ? parsed.presentCharacters : prev.presentCharacters,
          mood: parsed.mood || prev.mood,
          clothingNotes: parsed.clothingNotes || prev.clothingNotes,
          updatedAt: new Date().toISOString(),
        };
      }
    } catch (e) {
      console.warn('[director] updateSceneState AI 解析失败:', e);
      return prev;
    }

    await prisma.directorState.update({
      where: { storyId },
      data: {
        worldVariables: { ...wv, scene_state: next },
        updatedAt: new Date(),
      },
    });
    return next;
  }

  /**
   * 把滚动场景状态格式化成英文描述，注入扩散模型 prompt
   */
  async getSceneStatePromptEnglish(storyId: string): Promise<string> {
    const s = await this.getSceneState(storyId);
    if (!s) return '';

    const timeMap: Record<string, string> = {
      day: 'daytime', dusk: 'dusk golden hour', night: 'night', dawn: 'early dawn',
    };
    const weatherMap: Record<string, string> = {
      sunny: 'sunny', rainy: 'rainy', snowy: 'snowy', stormy: 'stormy', clear: 'clear sky', foggy: 'foggy',
    };
    const seasonMap: Record<string, string> = {
      spring: 'spring', summer: 'summer', autumn: 'autumn', winter: 'winter',
    };

    const parts: string[] = [];
    if (s.location) parts.push(`setting: ${s.location}`);
    if (s.timeOfDay) parts.push(timeMap[s.timeOfDay] || s.timeOfDay);
    if (s.weather) parts.push(weatherMap[s.weather] || s.weather);
    if (s.season) parts.push(seasonMap[s.season] || s.season);
    if (s.mood) parts.push(`${s.mood} mood`);
    if (s.presentCharacters && s.presentCharacters.length > 0) {
      parts.push(`present characters: ${s.presentCharacters.join(', ')}`);
    }
    if (s.clothingNotes) parts.push(`clothing/appearance: ${s.clothingNotes}`);

    return parts.join('; ');
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
