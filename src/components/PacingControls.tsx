'use client';

import { useState } from 'react';
import type { PacingConfig, PacingPace } from '@/types/story';

interface PacingControlsProps {
  config: PacingConfig;
  onChange: (config: PacingConfig) => void;
  onPause?: () => void;
  onResume?: () => void;
  isPaused?: boolean;
  disabled?: boolean;
}

const paceOptions: { value: PacingPace; label: string; icon: string; desc: string }[] = [
  { value: 'rush', label: '疾风', icon: '⚡', desc: '快速推进剧情' },
  { value: 'detailed', label: '细述', icon: '📖', desc: '详尽描写细节' },
  { value: 'pause', label: '驻足', icon: '⏸', desc: '停留品味氛围' },
  { value: 'summary', label: '略述', icon: '📝', desc: '概括性叙述' },
];

export default function PacingControls({
  config, onChange, onPause, onResume, isPaused = false, disabled = false,
}: PacingControlsProps) {
  return (
    <div className={`rounded-xl border border-white/10 bg-gray-900/80 backdrop-blur-sm p-4 space-y-3 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
          <span>🎛️</span> 节奏控制
        </h4>
        {isPaused !== undefined && (
          <button
            onClick={isPaused ? onResume : onPause}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              isPaused
                ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-400/30'
                : 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-400/30'
            }`}
          >
            {isPaused ? '▶ 继续' : '⏸ 暂停'}
          </button>
        )}
      </div>

      {/* Pace mode selector */}
      <div>
        <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5 block">节奏模式</label>
        <div className="grid grid-cols-4 gap-1.5">
          {paceOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => onChange({ ...config, pace: opt.value })}
              className={`flex flex-col items-center gap-0.5 px-2 py-2 rounded-lg text-center transition-all ${
                config.pace === opt.value
                  ? 'bg-amber-400/15 ring-1 ring-amber-400/40'
                  : 'hover:bg-white/5'
              }`}
              title={opt.desc}
            >
              <span className="text-sm">{opt.icon}</span>
              <span className={`text-[10px] font-medium ${config.pace === opt.value ? 'text-amber-300' : 'text-gray-400'}`}>
                {opt.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Lines per step slider */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[10px] text-gray-500 uppercase tracking-wider">每次步进行数</label>
          <span className="text-xs text-amber-300 font-mono">{config.maxLinesPerStep || 5}</span>
        </div>
        <input
          type="range"
          min={1}
          max={10}
          value={config.maxLinesPerStep || 5}
          onChange={e => onChange({ ...config, maxLinesPerStep: parseInt(e.target.value) })}
          className="w-full h-1.5 rounded-full appearance-none bg-gray-700 accent-amber-400 cursor-pointer"
        />
        <div className="flex justify-between text-[9px] text-gray-600 mt-0.5">
          <span>1</span><span>5</span><span>10</span>
        </div>
      </div>

      {/* Mood */}
      <div>
        <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 block">氛围</label>
        <input
          type="text"
          value={config.mood || ''}
          onChange={e => onChange({ ...config, mood: e.target.value })}
          placeholder="紧张、轻松、悲壮..."
          className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-amber-400/30"
        />
      </div>
    </div>
  );
}
