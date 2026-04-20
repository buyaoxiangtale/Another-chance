/**
 * C2: 关键事件提取与追踪 — EventTracker
 * 从段落内容中提取和追踪关键事件
 */

import { getOrderedChain } from '@/lib/chain-helpers';
import prisma from '@/lib/prisma';
import type { EventType } from '@/types/event-tracker';

function genId(): string {
  return 'evt_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/**
 * 事件关键词映射
 */
const EVENT_PATTERNS: { type: EventType; patterns: RegExp[]; importance: string }[] = [
  { type: 'death', patterns: [/(?:阵亡|身亡|战死|去世|死亡|丧命|遇害|陨落|气绝|断气)/, /(?:杀死|击杀|斩杀|赐死|处死|毒死|刺死)/], importance: 'critical' },
  { type: 'alliance', patterns: [/(?:结盟|联盟|联手|合作|归顺|投靠|结为兄弟|歃血为盟)/], importance: 'major' },
  { type: 'betrayal', patterns: [/(?:背叛|出卖|反叛|倒戈|叛变|背弃|投敌)/], importance: 'critical' },
  { type: 'discovery', patterns: [/(?:发现|寻得|找到|偶然得知|意外发现|揭开)/], importance: 'major' },
  { type: 'battle', patterns: [/(?:交战|开战|攻城|大战|厮杀|交锋|围攻|伏击|突击|出击)/], importance: 'major' },
  { type: 'emotional', patterns: [/(?:悲痛|愤怒|震惊|绝望|狂喜|心如刀绞|泪流满面|仰天长啸)/], importance: 'minor' },
  { type: 'revelation', patterns: [/(?:真相|原来|竟是|想不到|没想到|竟然|原来如此)/], importance: 'major' },
  { type: 'departure', patterns: [/(?:离去|离开|远走|辞行|告别|出走|出走|逃走)/], importance: 'minor' },
  { type: 'arrival', patterns: [/(?:到来|抵达|出现|登场|归来|回朝|入城)/], importance: 'minor' },
  { type: 'power_change', patterns: [/(?:登基|称帝|即位|篡位|夺权|罢免|升迁|贬谪|封赏|加封)/], importance: 'critical' },
  { type: 'relationship', patterns: [/(?:成亲|嫁娶|结缡|纳妾|和亲|离婚|休妻|决裂|和解|重归于好)/], importance: 'major' },
];

/**
 * C2.2: 从段落内容中提取关键事件
 */
export function extractKeyEvents(
  content: string,
  characterIds: string[] = []
): Array<{
  type: EventType;
  description: string;
  involvedCharacterIds: string[];
  status: string;
  importance: string;
}> {
  const events: Array<{
    type: EventType;
    description: string;
    involvedCharacterIds: string[];
    status: string;
    importance: string;
  }> = [];
  const sentences = content.split(/[。！？\n]+/).filter(s => s.trim().length > 0);

  for (const { type, patterns, importance } of EVENT_PATTERNS) {
    for (const pattern of patterns) {
      for (const sentence of sentences) {
        if (pattern.test(sentence)) {
          const already = events.some(e => e.type === type && sentence.includes(e.description.slice(0, 10)));
          if (!already) {
            const desc = sentence.trim().replace(/^[，、\s]+/, '');
            events.push({
              type,
              description: desc,
              involvedCharacterIds: [...characterIds],
              status: 'active',
              importance,
            });
          }
          pattern.lastIndex = 0;
        }
      }
    }
  }

  return events;
}

/**
 * C2.1: EventTracker 类
 */
export class EventTracker {
  async processSegment(storyId: string, branchId: string, segment: any): Promise<any[]> {
    const extracted = extractKeyEvents(segment.content, segment.characterIds || []);

    const events: any[] = [];

    for (const e of extracted) {
      const event = await prisma.keyEvent.create({
        data: {
          id: genId(),
          storyId,
          branchId,
          segmentId: segment.id,
          eventType: e.type,
          description: e.description,
          involvedCharacterIds: e.involvedCharacterIds || [],
          status: 'active',
          importance: e.importance,
        },
      });
      events.push(event);
    }

    return events;
  }

  async getActiveEvents(storyId: string, branchId: string, currentSegmentId?: string): Promise<any[]> {
    let active = await prisma.keyEvent.findMany({
      where: { storyId, branchId, status: 'active' },
    });

    if (currentSegmentId) {
      const chain = await getOrderedChain(storyId, branchId);
      const currentIdx = chain.findIndex(s => s.id === currentSegmentId);
      if (currentIdx >= 0) {
        const chainSegmentIds = new Set(chain.slice(0, currentIdx).map(s => s.id));
        active = active.filter(e => e.segmentId && chainSegmentIds.has(e.segmentId));
      }
    }

    const importanceOrder: Record<string, number> = { critical: 0, major: 1, minor: 2 };
    active.sort((a, b) => {
      const impDiff = importanceOrder[a.importance as string] - importanceOrder[b.importance as string];
      return impDiff !== 0 ? impDiff : b.createdAt.getTime() - a.createdAt.getTime();
    });

    return active;
  }

  async getResolvedEvents(storyId: string, branchId: string, beforeSegmentId?: string): Promise<any[]> {
    let resolved = await prisma.keyEvent.findMany({
      where: { storyId, branchId, status: 'resolved' },
    });

    if (beforeSegmentId) {
      const chain = await getOrderedChain(storyId, branchId);
      const beforeIdx = chain.findIndex(s => s.id === beforeSegmentId);
      if (beforeIdx >= 0) {
        const chainSegmentIds = new Set(chain.slice(0, beforeIdx).map(s => s.id));
        resolved = resolved.filter(e => e.segmentId && chainSegmentIds.has(e.segmentId));
      }
    }

    resolved.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    return resolved;
  }

  async resolveEvent(eventId: string, resolvedBySegmentId: string): Promise<any | null> {
    try {
      const event = await prisma.keyEvent.update({
        where: { id: eventId },
        data: {
          status: 'resolved',
          resolvedBySegmentId,
        },
      });
      return event;
    } catch {
      return null;
    }
  }

  async getAllEvents(storyId: string, branchId: string): Promise<any[]> {
    const events = await prisma.keyEvent.findMany({
      where: { storyId, branchId },
    });
    return events;
  }
}

/**
 * C2.6: 将活跃事件和近期事件格式化为 prompt 片段
 */
export function buildEventPrompt(activeEvents: any[], recentEvents?: any[]): string {
  if (activeEvents.length === 0 && (!recentEvents || recentEvents.length === 0)) {
    return '';
  }

  const lines: string[] = [];
  lines.push('## 当前活跃事件线');

  if (activeEvents.length > 0) {
    const typeLabels: Record<string, string> = {
      death: '💀 死亡', alliance: '🤝 结盟', betrayal: '🗡️ 背叛',
      discovery: '🔍 发现', battle: '⚔️ 战斗', emotional: '💔 情感',
      revelation: '💡 真相', departure: '🚪 离开', arrival: '🌅 登场',
      power_change: '👑 权力', relationship: '💕 关系', other: '📌 其他',
    };

    for (const event of activeEvents) {
      const label = typeLabels[event.eventType as string] || typeLabels[event.type as string] || '📌 其他';
      const imp = event.importance === 'critical' ? '【关键】' : event.importance === 'major' ? '【重要】' : '';
      lines.push(`- ${label} ${imp}：${event.description}`);
    }
  } else {
    lines.push('- （暂无活跃事件线）');
  }

  if (recentEvents && recentEvents.length > 0) {
    lines.push('');
    lines.push('### 近期已解决事件');
    for (const event of recentEvents.slice(0, 5)) {
      lines.push(`- ${event.eventType || event.type}：${event.description}`);
    }
  }

  return lines.join('\n');
}
