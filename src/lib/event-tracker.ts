/**
 * C2: 关键事件提取与追踪 — EventTracker
 * 从段落内容中提取和追踪关键事件
 */

import { segmentsStore, getOrderedChain, type StorySegment } from './simple-db';
import type { KeyEvent, EventType } from '@/types/event-tracker';

const EVENTS_FILE = 'events.json';

// Reuse SimpleStore pattern
import { SimpleStore } from './simple-db';
const eventsStore = new SimpleStore<KeyEvent>(EVENTS_FILE);

function genId(): string {
  return 'evt_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/**
 * 事件关键词映射：事件类型 → 匹配规则
 */
const EVENT_PATTERNS: { type: EventType; patterns: RegExp[]; importance: KeyEvent['importance'] }[] = [
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
 * C2.2: 从段落内容中提取关键事件（规则提取）
 */
export function extractKeyEvents(
  content: string,
  characterIds: string[] = []
): Omit<KeyEvent, 'eventId' | 'storyId' | 'branchId' | 'segmentId' | 'createdAt' | 'resolvedAt' | 'resolvedBySegmentId'>[] {
  const events: Omit<KeyEvent, 'eventId' | 'storyId' | 'branchId' | 'segmentId' | 'createdAt' | 'resolvedAt' | 'resolvedBySegmentId'>[] = [];
  const sentences = content.split(/[。！？\n]+/).filter(s => s.trim().length > 0);

  for (const { type, patterns, importance } of EVENT_PATTERNS) {
    for (const pattern of patterns) {
      for (const sentence of sentences) {
        if (pattern.test(sentence)) {
          // 避免重复：同一句子同一类型只记录一次
          const already = events.some(e => e.type === type && sentence.includes(e.description.slice(0, 10)));
          if (!already) {
            // 清理句子
            const desc = sentence.trim().replace(/^[，、\s]+/, '');
            events.push({
              type,
              description: desc,
              involvedCharacterIds: [...characterIds],
              status: 'active',
              importance,
            });
          }
          pattern.lastIndex = 0; // reset regex
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
  /**
   * 为新段落提取并存储关键事件
   */
  async processSegment(storyId: string, branchId: string, segment: StorySegment): Promise<KeyEvent[]> {
    const extracted = extractKeyEvents(segment.content, segment.characterIds || []);
    const now = new Date().toISOString();

    const events: KeyEvent[] = extracted.map(e => ({
      ...e,
      eventId: genId(),
      storyId,
      branchId,
      segmentId: segment.id,
      createdAt: now,
    }));

    if (events.length > 0) {
      const all = await eventsStore.load();
      all.push(...events);
      await eventsStore.save(all);
    }

    return events;
  }

  /**
   * C2.3: 获取当前活跃事件（未解决的冲突、进行中的情节线）
   */
  async getActiveEvents(storyId: string, branchId: string, currentSegmentId?: string): Promise<KeyEvent[]> {
    const all = await eventsStore.load();
    let active = all.filter(e => e.storyId === storyId && e.branchId === branchId && e.status === 'active');

    if (currentSegmentId) {
      // 只返回当前段落之前的事件
      const chain = await getOrderedChain(storyId, branchId);
      const currentIdx = chain.findIndex(s => s.id === currentSegmentId);
      if (currentIdx >= 0) {
        const chainSegmentIds = new Set(chain.slice(0, currentIdx).map(s => s.id));
        active = active.filter(e => chainSegmentIds.has(e.segmentId));
      }
    }

    // 按重要性排序：critical > major > minor，同级别按时间倒序
    const importanceOrder: Record<string, number> = { critical: 0, major: 1, minor: 2 };
    active.sort((a, b) => {
      const impDiff = importanceOrder[a.importance] - importanceOrder[b.importance];
      return impDiff !== 0 ? impDiff : b.createdAt.localeCompare(a.createdAt);
    });

    return active;
  }

  /**
   * C2.4: 获取已解决的事件
   */
  async getResolvedEvents(storyId: string, branchId: string, beforeSegmentId?: string): Promise<KeyEvent[]> {
    const all = await eventsStore.load();
    let resolved = all.filter(e => e.storyId === storyId && e.branchId === branchId && e.status === 'resolved');

    if (beforeSegmentId) {
      const chain = await getOrderedChain(storyId, branchId);
      const beforeIdx = chain.findIndex(s => s.id === beforeSegmentId);
      if (beforeIdx >= 0) {
        const chainSegmentIds = new Set(chain.slice(0, beforeIdx).map(s => s.id));
        resolved = resolved.filter(e => chainSegmentIds.has(e.segmentId));
      }
    }

    // 按解决时间倒序
    resolved.sort((a, b) => (b.resolvedAt || '').localeCompare(a.resolvedAt || ''));
    return resolved;
  }

  /**
   * 将事件标记为已解决
   */
  async resolveEvent(eventId: string, resolvedBySegmentId: string): Promise<KeyEvent | null> {
    const all = await eventsStore.load();
    const idx = all.findIndex(e => e.eventId === eventId);
    if (idx === -1) return null;

    all[idx].status = 'resolved';
    all[idx].resolvedAt = new Date().toISOString();
    all[idx].resolvedBySegmentId = resolvedBySegmentId;
    await eventsStore.save(all);
    return all[idx];
  }

  /**
   * 获取所有事件（用于调试/管理）
   */
  async getAllEvents(storyId: string, branchId: string): Promise<KeyEvent[]> {
    const all = await eventsStore.load();
    return all.filter(e => e.storyId === storyId && e.branchId === branchId);
  }
}

/**
 * C2.6: 将活跃事件和近期事件格式化为 prompt 片段
 */
export function buildEventPrompt(activeEvents: KeyEvent[], recentEvents?: KeyEvent[]): string {
  if (activeEvents.length === 0 && (!recentEvents || recentEvents.length === 0)) {
    return '';
  }

  const lines: string[] = [];
  lines.push('## 当前活跃事件线');

  if (activeEvents.length > 0) {
    const typeLabels: Record<EventType, string> = {
      death: '💀 死亡', alliance: '🤝 结盟', betrayal: '🗡️ 背叛',
      discovery: '🔍 发现', battle: '⚔️ 战斗', emotional: '💔 情感',
      revelation: '💡 真相', departure: '🚪 离开', arrival: '🌅 登场',
      power_change: '👑 权力', relationship: '💕 关系', other: '📌 其他',
    };

    for (const event of activeEvents) {
      const label = typeLabels[event.type] || '📌 其他';
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
      lines.push(`- ${event.type}：${event.description}`);
    }
  }

  return lines.join('\n');
}

export { eventsStore };
