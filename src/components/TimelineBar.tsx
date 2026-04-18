'use client';

import { useState, useEffect } from 'react';
import type { TimelineEvent } from '@/types/story';

interface TimelineBarProps {
  storyId: string;
  branchId?: string;
  currentSegmentId?: string;
  segments: Array<{ id: string; isBranchPoint: boolean; title?: string }>;
}

export default function TimelineBar({ storyId, branchId, currentSegmentId, segments }: TimelineBarProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams({ branch: branchId || 'main' });
    setLoading(true);
    fetch(`/api/stories/${storyId}/timeline?${params}`)
      .then(r => r.json())
      .then(data => setEvents(data.timeline || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [storyId, branchId]);

  const nodes = segments.map(seg => ({
    id: seg.id,
    title: seg.title || `段落`,
    isBranchPoint: seg.isBranchPoint,
    event: events.find(() => true),
  }));

  const dotClass = (isBranch: boolean, isCurrent: boolean) =>
    `absolute -left-6 top-1 w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center text-[9px] ${
      isBranch
        ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
        : isCurrent
        ? 'border-[var(--gold)] bg-[var(--gold)] text-white'
        : 'border-[var(--border)] bg-white'
    }`;

  return (
    <div className="py-4">
      <h4 className="text-xs font-semibold text-[var(--muted)] tracking-wider mb-3">时间轴</h4>

      {loading ? (
        <div className="text-center py-4 text-[var(--muted)] text-xs">加载中...</div>
      ) : nodes.length === 0 && events.length === 0 ? (
        <div className="text-center py-4 text-[var(--muted)] text-xs">暂无时间轴事件</div>
      ) : (
        <div className="relative pl-6">
          <div className="absolute left-[9px] top-2 bottom-2 w-px bg-gradient-to-b from-[var(--gold)]/50 via-[var(--border)] to-transparent" />

          <div className="space-y-4">
            {events.map((event, idx) => {
              const isBranch = !!nodes[idx]?.isBranchPoint;
              const isCurrent = nodes[idx]?.id === currentSegmentId;

              return (
                <div key={`${event.era}-${event.year}-${idx}`} className="relative">
                  <div className={dotClass(isBranch, isCurrent)}>
                    {isBranch && <span>✦</span>}
                  </div>

                  <div
                    className={`rounded-lg p-2.5 transition-all border ${
                      isCurrent
                        ? 'bg-[var(--gold)]/5 border-[var(--gold)]/30'
                        : 'bg-white/60 border-transparent hover:border-[var(--border)]'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[11px] font-medium text-[var(--gold)]">
                        {event.era} · {event.year}年{event.season ? ` · ${event.season}` : ''}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--ink)]/85 leading-relaxed">{event.description}</p>
                    {event.narrativeTime && (
                      <span className="text-[10px] text-[var(--muted)] mt-1 block">叙事时间：{event.narrativeTime}</span>
                    )}
                  </div>
                </div>
              );
            })}

            {events.length === 0 && nodes.map((node) => {
              const isCurrent = node.id === currentSegmentId;
              return (
                <div key={node.id} className="relative">
                  <div className={dotClass(node.isBranchPoint, isCurrent)}>
                    {node.isBranchPoint && <span>✦</span>}
                  </div>
                  <div className={`rounded-lg p-2 ${isCurrent ? 'bg-[var(--gold)]/5' : ''}`}>
                    <span className="text-xs text-[var(--ink)]/85">{node.title}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
