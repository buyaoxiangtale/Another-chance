'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';

interface VisibilityToggleProps {
  currentVisibility: 'PRIVATE' | 'PUBLIC' | 'UNLISTED';
  on_change: (visibility: 'PRIVATE' | 'PUBLIC' | 'UNLISTED') => Promise<void>;
  type?: 'story' | 'branch';
}

const visibilityConfig = {
  PRIVATE: { label: '🔒 私有', desc: '仅自己可见', color: 'text-gray-600' },
  PUBLIC: { label: '🌐 公开', desc: '所有人可见', color: 'text-green-600' },
  UNLISTED: { label: '🔗 隐链', desc: '有链接即可访问', color: 'text-yellow-600' },
};

export default function VisibilityToggle({ currentVisibility, on_change, type = 'story' }: VisibilityToggleProps) {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [changing, setChanging] = useState(false);

  const config = visibilityConfig[currentVisibility];

  const handleSelect = async (v: 'PRIVATE' | 'PUBLIC' | 'UNLISTED') => {
    if (v === currentVisibility || changing) return;
    setChanging(true);
    try {
      await on_change(v);
    } catch {}
    setChanging(false);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={!session}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--border)] text-xs transition-colors hover:bg-gray-50 ${!session ? 'opacity-50 cursor-default' : 'cursor-pointer'}`}
      >
        <span>{config.label}</span>
        <span className="text-[var(--muted)]">▾</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
            {(['PUBLIC', 'UNLISTED', 'PRIVATE'] as const).map((v) => {
              const c = visibilityConfig[v];
              return (
                <button
                  key={v}
                  onClick={() => handleSelect(v)}
                  disabled={changing}
                  className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors ${
                    v === currentVisibility ? 'bg-amber-50' : ''
                  }`}
                >
                  <div className="text-sm font-medium">{c.label}</div>
                  <div className="text-xs text-[var(--muted)]">{c.desc}</div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
