import { segmentsStore, branchesStore, getOrderedChain } from './simple-db';
import type { StorySegment, TimelineEvent } from '../types/story';

type TimelineViolation = {
  segmentId: string;
  segmentIndex: number;
  issue: string;
  currentEvent: TimelineEvent | undefined;
  previousEvent: TimelineEvent | undefined;
};

type TimelineContext = {
  events: (TimelineEvent & { segmentId: string })[];
  current: TimelineEvent | undefined;
  previous: TimelineEvent | undefined;
  next: TimelineEvent | undefined;
};

/**
 * TimelineEngine — 时间轴管理引擎
 * 基于段落链的时间单调性校验与上下文获取
 */
class TimelineEngine {
  /**
   * 校验段落链的时间单调性
   * 时间必须严格递增（同一年份不允许出现季节回退）
   */
  async validateTimeline(storyId: string, branchId: string): Promise<TimelineViolation[]> {
    const chain = await getOrderedChain(storyId, branchId);
    const violations: TimelineViolation[] = [];

    for (let i = 1; i < chain.length; i++) {
      const prev = chain[i - 1];
      const curr = chain[i];

      if (!prev.timeline && !curr.timeline) continue;
      if (!prev.timeline || !curr.timeline) continue;

      const prevT = prev.timeline;
      const currT = curr.timeline;

      // 年份必须递增
      if (currT.year < prevT.year) {
        violations.push({
          segmentId: curr.id,
          segmentIndex: i,
          issue: `年份回退: ${currT.year} < ${prevT.year}`,
          currentEvent: currT,
          previousEvent: prevT,
        });
        continue;
      }

      // 同一年份时，季节不允许回退
      if (currT.year === prevT.year && prevT.season && currT.season) {
        const seasonOrder = ['春', '夏', '秋', '冬'];
        const prevIdx = seasonOrder.indexOf(prevT.season);
        const currIdx = seasonOrder.indexOf(currT.season);
        if (currIdx < prevIdx) {
          violations.push({
            segmentId: curr.id,
            segmentIndex: i,
            issue: `同一年份季节回退: ${currT.season} < ${prevT.season}`,
            currentEvent: currT,
            previousEvent: prevT,
          });
        }
      }
    }

    return violations;
  }

  /**
   * 获取当前时间点附近的历史事件上下文
   */
  async getTimelineContext(storyId: string, branchId: string, currentSegmentId: string): Promise<TimelineContext> {
    const chain = await getOrderedChain(storyId, branchId);
    const events: (TimelineEvent & { segmentId: string })[] = chain
      .filter(s => s.timeline)
      .map(s => ({ ...s.timeline!, segmentId: s.id }));

    const currentIndex = events.findIndex(e => e.segmentId === currentSegmentId);

    return {
      events,
      current: currentIndex >= 0 ? events[currentIndex] : undefined,
      previous: currentIndex > 0 ? events[currentIndex - 1] : undefined,
      next: currentIndex >= 0 && currentIndex < events.length - 1 ? events[currentIndex + 1] : undefined,
    };
  }

  /**
   * 获取完整时间轴（所有段落的事件列表）
   */
  async getTimeline(storyId: string, branchId: string): Promise<(TimelineEvent & { segmentId: string })[]> {
    const chain = await getOrderedChain(storyId, branchId);
    return chain
      .filter(s => s.timeline)
      .map(s => ({ ...s.timeline!, segmentId: s.id }));
  }
}

export const timelineEngine = new TimelineEngine();
export type { TimelineViolation, TimelineContext };

type LorebookEntry = {
  id: string;
  era: string;
  topic: string;
  title: string;
  content: string;
  tags?: string[];
};

/**
 * 将时间轴和世界观信息格式化为中文 AI prompt 片段
 */
export function buildTimelinePrompt(
  events: (import('../types/story').TimelineEvent & { segmentId?: string })[],
  lorebookEntries: LorebookEntry[]
): string {
  const lines: string[] = [];

  lines.push('## 时间线');

  if (events.length === 0) {
    lines.push('（尚无时间线事件）');
  } else {
    for (const e of events) {
      const season = e.season ? `·${e.season}` : '';
      lines.push(`- 公元${e.year}年${season}：${e.description}`);
    }
  }

  if (lorebookEntries.length > 0) {
    lines.push('');
    lines.push('## 世界观设定');

    // 按 topic 分组
    const grouped = new Map<string, LorebookEntry[]>();
    for (const entry of lorebookEntries) {
      const list = grouped.get(entry.topic) || [];
      list.push(entry);
      grouped.set(entry.topic, list);
    }

    for (const [topic, entries] of grouped) {
      lines.push('');
      lines.push(`### ${topic}`);
      for (const e of entries) {
        lines.push(`**${e.title}**：${e.content}`);
      }
    }
  }

  return lines.join('\n');
}
