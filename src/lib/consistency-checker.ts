/**
 * C3: 矛盾检测引擎 — ConsistencyChecker
 * 检测故事内容中的角色、时间线和世界观矛盾
 */

import { getOrderedChain } from '@/lib/chain-helpers';
import prisma from '@/lib/prisma';
import type { StorySegment } from '@/lib/prisma';
import type { Character, CharacterStateEntry } from '@/types/story';

// === 类型定义 ===

export type ConsistencySeverity = 'error' | 'warning' | 'info';

export type ConsistencyIssue = {
  type: 'character' | 'timeline' | 'worldstate';
  severity: ConsistencySeverity;
  category: string;
  description: string;
  evidence: string;       // 原文证据
  suggestion?: string;    // 修复建议
};

export type CharacterStateForCheck = {
  characterId: string;
  name: string;
  isAlive: boolean;
  lastKnownLocation: string;
  relationships: Record<string, string>;
  traits: string[];
  lastSegmentId?: string;
  stateHistory: CharacterStateEntry[];
};

export type TimelineForCheck = {
  currentEra?: string;
  currentYear?: number;
  season?: string;
  keyDates: Array<{ label: string; segmentId: string; year?: number; season?: string }>;
};

export type WorldVariable = {
  key: string;
  value: string;
  description?: string;
};

export type LorebookEntry = {
  id: string;
  name: string;
  content: string;
  category?: string;
  keywords?: string[];
};

// === 辅助函数 ===

function extractSentences(text: string): string[] {
  return text.split(/[。！？；\n]+/).map(s => s.trim()).filter(s => s.length > 0);
}

function containsAny(text: string, keywords: string[]): boolean {
  return keywords.some(kw => text.includes(kw));
}

function findMatchingSentences(text: string, keywords: string[]): string[] {
  return extractSentences(text).filter(s => containsAny(s, keywords));
}

// === ConsistencyChecker 类 ===

export class ConsistencyChecker {

  // 3.2 检测角色描述矛盾
  checkCharacterConsistency(
    newContent: string,
    characterStates: CharacterStateForCheck[]
  ): ConsistencyIssue[] {
    const issues: ConsistencyIssue[] = [];
    const sentences = extractSentences(newContent);

    for (const cs of characterStates) {
      const name = cs.name;
      if (!name || !containsAny(newContent, [name])) continue;

      const mentions = sentences.filter(s => containsAny(s, [name]));

      // 检查：已死角色重新出现
      if (!cs.isAlive) {
        const deathKeywords = ['说', '笑', '走', '来', '答', '道', '问', '看', '站', '坐', '起身', '挥', '喊'];
        const activeMentions = mentions.filter(m => containsAny(m, deathKeywords));
        if (activeMentions.length > 0) {
          issues.push({
            type: 'character',
            severity: 'error',
            category: 'dead_character_active',
            description: `角色「${name}」已死亡，但在新内容中被描写为活跃状态`,
            evidence: activeMentions.slice(0, 2).join('；'),
            suggestion: `角色「${name}」已死亡，请避免描写其活跃行为，或通过回忆、梦境等方式提及`,
          });
        }
      }

      // 检查：性格突变
      if (cs.traits.length > 0) {
        const traitContradictions: Array<{ trait: string; opposites: string[] }> = [
          { trait: '勇猛', opposites: ['胆怯', '畏缩', '退缩', '恐惧'] },
          { trait: '忠诚', opposites: ['背叛', '反叛', '出卖'] },
          { trait: '仁慈', opposites: ['残忍', '暴虐', '嗜杀'] },
          { trait: '谨慎', opposites: ['鲁莽', '冲动', '冒进'] },
          { trait: '沉稳', opposites: ['急躁', '暴躁', '慌张'] },
          { trait: '狡诈', opposites: ['坦率', '直率', '诚实'] },
          { trait: '懦弱', opposites: ['勇猛', '英勇', '无畏'] },
          { trait: '残忍', opposites: ['仁慈', '善良', '慈悲'] },
        ];

        for (const tc of traitContradictions) {
          if (!cs.traits.includes(tc.trait)) continue;
          const contradictoryMentions = mentions.filter(m => containsAny(m, tc.opposites));
          if (contradictoryMentions.length > 0) {
            issues.push({
              type: 'character',
              severity: 'warning',
              category: 'personality_shift',
              description: `角色「${name}」设定为${tc.trait}，但新内容中出现${tc.opposites[0]}的描写`,
              evidence: contradictoryMentions.slice(0, 2).join('；'),
              suggestion: `如确需改变角色性格，应有充分的情节铺垫和转变过程`,
            });
          }
        }
      }

      // 检查：关系矛盾
      if (cs.relationships) {
        const relationContradictions: Record<string, string[]> = {
          '敌': ['好友', '挚友', '兄弟', '盟', '亲近', '亲密'],
          '友': ['仇敌', '死敌', '誓不两立'],
          '君': ['臣'],
          '臣': ['君'],
          '父': ['子'],
          '子': ['父'],
        };

        for (const [otherName, relation] of Object.entries(cs.relationships)) {
          const opposites = relationContradictions[relation];
          if (!opposites) continue;

          const contradictoryRelationMentions = mentions.filter(m =>
            containsAny(m, [otherName]) && containsAny(m, opposites)
          );
          if (contradictoryRelationMentions.length > 0) {
            issues.push({
              type: 'character',
              severity: 'warning',
              category: 'relationship_contradiction',
              description: `角色「${name}」与「${otherName}」的关系设定为${relation}，但新内容中出现矛盾描写`,
              evidence: contradictoryRelationMentions.slice(0, 2).join('；'),
              suggestion: `请确保角色间关系的一致性，如关系有变化需要明确的情节推动`,
            });
          }
        }
      }
    }

    return issues;
  }

  // 3.3 检测时间线矛盾
  checkTimelineConsistency(
    newContent: string,
    timeline: TimelineForCheck
  ): ConsistencyIssue[] {
    const issues: ConsistencyIssue[] = [];
    const sentences = extractSentences(newContent);

    // 季节矛盾检测
    if (timeline.season) {
      const seasonMap: Record<string, { keywords: string[]; conflicting: string[] }> = {
        '春': { keywords: ['春', '花', '草', '暖', '燕', '柳'], conflicting: ['雪', '冰', '寒', '冬', '霜', '冻'] },
        '夏': { keywords: ['夏', '热', '暑', '蝉', '荷'], conflicting: ['雪', '冰', '霜', '寒风'] },
        '秋': { keywords: ['秋', '叶', '凉', '雁', '霜', '菊'], conflicting: ['蝉鸣', '荷花', '酷暑', '烈日'] },
        '冬': { keywords: ['冬', '雪', '冰', '寒', '炉', '棉'], conflicting: ['花开', '蝉鸣', '荷', '炎热'] },
      };

      const currentSeason = seasonMap[timeline.season];
      if (currentSeason) {
        const conflictingSentences = sentences.filter(s => containsAny(s, currentSeason.conflicting));
        if (conflictingSentences.length > 0) {
          issues.push({
            type: 'timeline',
            severity: 'warning',
            category: 'season_mismatch',
            description: `当前季节为${timeline.season}，但新内容中出现不匹配的季节描写`,
            evidence: conflictingSentences.slice(0, 2).join('；'),
            suggestion: `请确保季节描写的准确性，或通过时间跳跃明确说明时间变化`,
          });
        }
      }
    }

    // 年份/时代顺序矛盾检测
    if (timeline.keyDates.length >= 2) {
      const lastDate = timeline.keyDates[timeline.keyDates.length - 1];
      if (lastDate.year && timeline.currentYear && timeline.currentYear < lastDate.year) {
        issues.push({
          type: 'timeline',
          severity: 'error',
          category: 'chronological_error',
          description: `时间线倒退：当前年份(${timeline.currentYear})早于已记录的事件年份(${lastDate.year})`,
          evidence: `事件「${lastDate.label}」发生在${lastDate.year}年`,
          suggestion: `请检查时间线，确保事件按正确顺序排列`,
        });
      }
    }

    // 时代/朝代混淆检测
    if (timeline.currentEra) {
      const eraKeywords: Record<string, string[]> = {
        '秦': ['秦始皇', '秦王', '咸阳', '郡县', '长城'],
        '汉': ['汉武帝', '长安', '洛阳', '匈奴', '丝绸之路'],
        '三国': ['魏', '蜀', '吴', '曹操', '刘备', '孙权', '赤壁'],
        '唐': ['长安', '李白', '杜甫', '科举', '开元'],
        '宋': ['汴京', '临安', '苏轼', '岳飞', '金'],
        '明': ['朱元璋', '北京', '南京', '锦衣卫', '郑和'],
        '清': ['康熙', '乾隆', '紫禁城', '八旗', '辫子'],
      };

      const currentEraKws = eraKeywords[timeline.currentEra];
      if (currentEraKws) {
        for (const [era, keywords] of Object.entries(eraKeywords)) {
          if (era === timeline.currentEra) continue;
          const anachronisms = sentences.filter(s => containsAny(s, keywords));
          if (anachronisms.length > 0) {
            issues.push({
              type: 'timeline',
              severity: 'warning',
              category: 'era_anachronism',
              description: `当前时代为${timeline.currentEra}，但新内容中出现疑似${era}时代的元素`,
              evidence: anachronisms.slice(0, 2).join('；'),
              suggestion: `请注意时代背景的一致性，避免出现跨时代的元素`,
            });
            break; // 只报告一次时代混淆
          }
        }
      }
    }

    return issues;
  }

  // 3.4 检测世界观矛盾
  checkWorldStateConsistency(
    newContent: string,
    worldVariables: WorldVariable[],
    lorebook?: LorebookEntry[]
  ): ConsistencyIssue[] {
    const issues: ConsistencyIssue[] = [];
    const sentences = extractSentences(newContent);

    // 检查世界观变量
    for (const wv of worldVariables) {
      if (containsAny(newContent, [wv.key])) {
        const relatedSentences = sentences.filter(s => containsAny(s, [wv.key]));
        // 检查是否与已知值矛盾
        // 简单规则：如果世界观变量有明确数值/状态，检查新内容是否包含不同的数值
        if (wv.value && containsAny(newContent, [wv.value])) {
          // 值匹配，OK
        } else if (wv.description) {
          // 检查是否与描述矛盾
          const conflictingPatterns = this.extractConflictingPatterns(wv.description);
          for (const pattern of conflictingPatterns) {
            const conflicts = relatedSentences.filter(s => containsAny(s, [pattern]));
            if (conflicts.length > 0) {
              issues.push({
                type: 'worldstate',
                severity: 'warning',
                category: 'world_variable_contradiction',
                description: `世界观设定「${wv.key}」与新内容存在矛盾（设定：${wv.description}）`,
                evidence: conflicts.slice(0, 2).join('；'),
                suggestion: `请确保与已建立的世界观设定保持一致`,
              });
            }
          }
        }
      }
    }

    // 检查知识库条目
    if (lorebook && lorebook.length > 0) {
      for (const entry of lorebook) {
        const matchKeywords = entry.keywords || [entry.name];
        if (!containsAny(newContent, matchKeywords)) continue;

        const relatedSentences = sentences.filter(s => containsAny(s, matchKeywords));
        // 检查新内容是否与知识库条目冲突
        // 简单规则：提取知识库中的否定/限制信息，检查是否被违反
        const restrictions = this.extractRestrictions(entry.content);
        for (const restriction of restrictions) {
          const violations = relatedSentences.filter(s => containsAny(s, [restriction]));
          if (violations.length > 0) {
            issues.push({
              type: 'worldstate',
              severity: 'info',
              category: 'lorebook_mismatch',
              description: `知识库条目「${entry.name}」可能与新内容不一致`,
              evidence: violations.slice(0, 2).join('；'),
              suggestion: `请参考知识库中「${entry.name}」的设定：${entry.content.slice(0, 50)}...`,
            });
          }
        }
      }
    }

    return issues;
  }

  // 3.5 综合检测
  async runConsistencyCheck(
    newSegment: StorySegment,
    chain: StorySegment[]
  ): Promise<ConsistencyIssue[]> {
    const allIssues: ConsistencyIssue[] = [];
    const storyId = newSegment.storyId;
    const branchId = newSegment.branchId;

    // 构建角色状态快照
    const characterStates = await this.buildCharacterStates(storyId, chain);

    // 构建时间线快照
    const timeline = this.buildTimeline(chain);

    // 构建世界观快照
    const { worldVariables, lorebook } = await this.buildWorldState(storyId);

    // 运行各类检测
    const characterIssues = this.checkCharacterConsistency(newSegment.content, characterStates);
    const timelineIssues = this.checkTimelineConsistency(newSegment.content, timeline);
    const worldIssues = this.checkWorldStateConsistency(newSegment.content, worldVariables, lorebook);

    allIssues.push(...characterIssues, ...timelineIssues, ...worldIssues);

    // 按严重程度排序
    const severityOrder: Record<ConsistencySeverity, number> = { error: 0, warning: 1, info: 2 };
    allIssues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return allIssues;
  }

  // 检测前文已有矛盾（不涉及新内容）
  async checkChainConsistency(chain: StorySegment[]): Promise<ConsistencyIssue[]> {
    const allIssues: ConsistencyIssue[] = [];
    for (let i = 1; i < chain.length; i++) {
      const issues = await this.runConsistencyCheck(chain[i], chain.slice(0, i + 1));
      // 过滤掉涉及最后一段（即当前检测段）之外的问题
      allIssues.push(...issues);
    }
    return allIssues;
  }

  // === 辅助方法 ===

  private async buildCharacterStates(
    storyId: string,
    chain: StorySegment[]
  ): Promise<CharacterStateForCheck[]> {
    try {
      const characters = await prisma.character.findMany({ where: { storyId } });
      const storyCharacters = characters.filter((c: any) =>
        c.storyId === storyId
      );

      return storyCharacters.map((c: any) => {
        const lastState = c.stateHistory?.length > 0
          ? c.stateHistory[c.stateHistory.length - 1]
          : null;

        return {
          characterId: c.id,
          name: c.name,
          isAlive: lastState?.isAlive ?? true,
          lastKnownLocation: lastState?.location ?? '',
          relationships: lastState?.relationships ?? {},
          traits: c.traits ?? [],
          lastSegmentId: lastState?.segmentId,
          stateHistory: c.stateHistory ?? [],
        };
      });
    } catch {
      return [];
    }
  }

  private buildTimeline(chain: StorySegment[]): TimelineForCheck {
    const timeline: TimelineForCheck = {
      keyDates: [],
    };

    // 从段落中提取时间信息
    const seasonKeywords: Record<string, string[]> = {
      '春': ['春', '桃花', '柳绿'],
      '夏': ['夏', '酷暑', '蝉'],
      '秋': ['秋', '落叶', '雁'],
      '冬': ['冬', '雪', '冰', '寒'],
    };

    for (const seg of chain) {
      const content = seg.content;
      let detectedSeason: string | undefined;
      for (const [season, kws] of Object.entries(seasonKeywords)) {
        if (containsAny(content, kws)) {
          detectedSeason = season;
          break;
        }
      }

      if (detectedSeason) {
        timeline.season = detectedSeason;
      }

      // 从 timeline 字段获取
      if (seg.timeline) {
        const tl = seg.timeline as Record<string, any>;
        if (tl.era) timeline.currentEra = tl.era;
        if (tl.year) timeline.currentYear = tl.year;
        if (tl.season) timeline.season = tl.season;

        timeline.keyDates.push({
          label: seg.title || `段落${seg.id}`,
          segmentId: seg.id,
          year: tl.year,
          season: tl.season,
        });
      }
    }

    return timeline;
  }

  private async buildWorldState(storyId: string): Promise<{
    worldVariables: WorldVariable[];
    lorebook: LorebookEntry[];
  }> {
    try {
      const stories = await prisma.story.findMany();
      const story = stories.find((s: any) => s.id === storyId);

      const worldVariables: WorldVariable[] = [];
      const lorebook: LorebookEntry[] = [];

      // 从故事的世界观设定中提取
      if (story && (story as any).worldSettings) {
        const ws = (story as any).worldSettings;
        if (Array.isArray(ws)) {
          for (const item of ws) {
            worldVariables.push({
              key: item.key || item.name || '',
              value: item.value || '',
              description: item.description || '',
            });
          }
        } else if (typeof ws === 'object') {
          for (const [key, value] of Object.entries(ws)) {
            worldVariables.push({
              key,
              value: typeof value === 'string' ? value : JSON.stringify(value),
            });
          }
        }
      }

      return { worldVariables, lorebook };
    } catch {
      return { worldVariables: [], lorebook: [] };
    }
  }

  private extractConflictingPatterns(description: string): string[] {
    // 从描述中提取可能矛盾的否定模式
    const negPatterns = description.match(/[^，。；]*不[^，。；]*/g) || [];
    return negPatterns
      .map(p => p.replace(/^[，。；\s]+/, '').trim())
      .filter(p => p.length > 1 && p.length < 20);
  }

  private extractRestrictions(content: string): string[] {
    // 从知识库内容中提取限制/否定信息
    const restrictions: string[] = [];
    const patterns = [
      /不可[^。；]*/g,
      /不能[^。；]*/g,
      /禁止[^。；]*/g,
      /只有[^。；]*才[^。；]*/g,
      /必须[^。；]*/g,
    ];
    for (const pattern of patterns) {
      const matches = content.match(pattern);
      if (matches) {
        restrictions.push(...matches.slice(0, 3));
      }
    }
    return restrictions;
  }
}

// 导出单例
export const consistencyChecker = new ConsistencyChecker();
