'use client';

import type { PacingConfig, PacingPace } from '@/types/story';

interface PacingControlsProps {
  config: PacingConfig;
  onChange: (config: PacingConfig) => void;
  onPause?: () => void;
  onResume?: () => void;
  isPaused?: boolean;
  disabled?: boolean;
}

const paceOptions: { value: PacingPace; label: string; desc: string }[] = [
  { value: 'rush', label: '疾风', desc: '快速推进剧情' },
  { value: 'detailed', label: '细述', desc: '详尽描写细节' },
  { value: 'pause', label: '驻足', desc: '停留品味氛围' },
  { value: 'summary', label: '略述', desc: '概括性叙述' },
];

export default function PacingControls({
  config, onChange, onPause, onResume, isPaused = false, disabled = false,
}: PacingControlsProps) {
  return (
    <div
      className={`rounded-xl border border-[var(--border)] bg-white/70 backdrop-blur-sm p-5 space-y-4 shadow-sm ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
    >
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-[var(--ink)] tracking-wide">节奏控制</h4>
        {isPaused !== undefined && (
          <button
            onClick={isPaused ? onResume : onPause}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${
              isPaused
                ? 'bg-[var(--jade)]/10 text-[var(--jade)] border-[var(--jade)]/30 hover:bg-[var(--jade)]/20'
                : 'bg-[var(--gold)]/10 text-[var(--gold)] border-[var(--gold)]/30 hover:bg-[var(--gold)]/20'
            }`}
          >
            {isPaused ? '继续' : '暂停'}
          </button>
        )}
      </div>

      {/* Pace mode selector */}
      <div>
        <label className="text-[11px] text-[var(--muted)] tracking-wider mb-2 block">节奏模式</label>
        <div className="grid grid-cols-4 gap-2">
          {paceOptions.map(opt => {
            const active = config.pace === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => onChange({ ...config, pace: opt.value })}
                title={opt.desc}
                className={`px-2 py-2.5 rounded-lg text-sm font-medium transition-all border ${
                  active
                    ? 'bg-[var(--gold)]/10 text-[var(--gold)] border-[var(--gold)]/50 shadow-sm'
                    : 'bg-white/50 text-[var(--ink)] border-[var(--border)] hover:border-[var(--gold)]/40 hover:bg-white'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Lines per step slider */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[11px] text-[var(--muted)] tracking-wider">每次步进行数</label>
          <span className="text-xs text-[var(--gold)] font-mono">{config.maxLinesPerStep || 5}</span>
        </div>
        <input
          type="range"
          min={1}
          max={10}
          value={config.maxLinesPerStep || 5}
          onChange={e => onChange({ ...config, maxLinesPerStep: parseInt(e.target.value) })}
          className="w-full h-1.5 rounded-full appearance-none bg-[var(--paper-dark)] accent-[var(--gold)] cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-[var(--muted)] mt-1">
          <span>1</span><span>5</span><span>10</span>
        </div>
      </div>

      {/* Mood */}
      <div>
        <label className="text-[11px] text-[var(--muted)] tracking-wider mb-1.5 block">氛围</label>
        <input
          type="text"
          value={config.mood || ''}
          onChange={e => onChange({ ...config, mood: e.target.value })}
          placeholder="紧张、轻松、悲壮……"
          className="w-full text-sm px-3 py-2 rounded-lg bg-white/70 border border-[var(--border)] text-[var(--ink)] placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/40 focus:border-transparent"
        />
      </div>
    </div>
  );
}
