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

  // Merge segment nodes with timeline events
  const nodes = segments.map(seg => ({
    id: seg.id,
    title: seg.title || `段落`,
    isBranchPoint: seg.isBranchPoint,
    event: events.find(e => {
      // Rough match by description content
      return true; // Display all events alongside segments
    }),
  }));

  return (
    <div className="py-4">
      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
        <span>⏳</span> 时间轴
      </h4>

      {loading ? (
        <div className="text-center py-4 text-gray-600 text-xs">加载中...</div>
      ) : nodes.length === 0 && events.length === 0 ? (
        <div className="text-center py-4 text-gray-600 text-xs">暂无时间轴事件</div>
      ) : (
        <div className="relative pl-6">
          {/* Vertical line */}
          <div className="absolute left-[9px] top-2 bottom-2 w-px bg-gradient-to-b from-amber-400/50 via-gray-600 to-transparent" />

          <div className="space-y-4">
            {events.map((event, idx) => {
              const isBranch = nodes[idx]?.isBranchPoint;
              const isCurrent = nodes[idx]?.id === currentSegmentId;

              return (
                <div key={`${event.era}-${event.year}-${idx}`} className="relative">
                  {/* Dot */}
                  <div className={`absolute -left-6 top-1 w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center ${
                    isBranch
                      ? 'border-red-400 bg-red-500 shadow-sm shadow-red-500/30'
                      : isCurrent
                      ? 'border-amber-400 bg-amber-500 shadow-sm shadow-amber-500/30'
                      : 'border-gray-500 bg-gray-800'
                  }`}>
                    {isBranch && <span className="text-white text-[8px]">⚔</span>}
                  </div>

                  {/* Content */}
                  <div className={`rounded-lg p-2.5 transition-all ${
                    isCurrent ? 'bg-amber-400/10 ring-1 ring-amber-400/20' : 'hover:bg-white/5'
                  }`}>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[11px] font-medium text-amber-300">
                        {event.era} · {event.year}年{event.season ? ` · ${event.season}` : ''}
                      </span>
                    </div>
                    <p className="text-xs text-gray-300 leading-relaxed">{event.description}</p>
                    {event.narrativeTime && (
                      <span className="text-[10px] text-gray-600 mt-1 block">叙事时间: {event.narrativeTime}</span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Fallback: show segment nodes if no events */}
            {events.length === 0 && nodes.map((node, idx) => {
              const isCurrent = node.id === currentSegmentId;
              return (
                <div key={node.id} className="relative">
                  <div className={`absolute -left-6 top-1 w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center ${
                    node.isBranchPoint
                      ? 'border-red-400 bg-red-500'
                      : isCurrent
                      ? 'border-amber-400 bg-amber-500'
                      : 'border-gray-500 bg-gray-800'
                  }`}>
                    {node.isBranchPoint && <span className="text-white text-[8px]">⚔</span>}
                  </div>
                  <div className={`rounded-lg p-2 ${isCurrent ? 'bg-amber-400/10' : ''}`}>
                    <span className="text-xs text-gray-300">{node.title}</span>
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
