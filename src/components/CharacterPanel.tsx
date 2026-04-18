'use client';

import { useState, useEffect } from 'react';
import type { Character, CharacterRelationship } from '@/types/story';

interface CharacterPanelProps {
  storyId: string;
  branchId?: string;
  segmentId?: string;
  isOpen: boolean;
  onToggle: () => void;
}

export default function CharacterPanel({ storyId, branchId, segmentId, isOpen, onToggle }: CharacterPanelProps) {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [relationships, setRelationships] = useState<CharacterRelationship[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeCharId, setActiveCharId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    const params = new URLSearchParams();
    if (branchId) params.set('branchId', branchId);
    if (segmentId) params.set('segmentId', segmentId);

    Promise.all([
      fetch(`/api/stories/${storyId}/characters${params.toString() ? '?' + params : ''}`).then(r => r.json()),
      branchId
        ? fetch(`/api/stories/${storyId}/characters?branchId=${branchId}`).then(r => r.json())
        : Promise.resolve({ relationships: [] }),
    ]).then(([charData, relData]) => {
      setCharacters(Array.isArray(charData) ? charData : charData.characters || []);
      setRelationships(relData.relationships || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [storyId, branchId, segmentId, isOpen]);

  const getRoleLabel = (role: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      protagonist: { label: '主角', cls: 'text-[var(--gold)] bg-[var(--gold)]/10 border-[var(--gold)]/30' },
      supporting: { label: '配角', cls: 'text-[var(--jade)] bg-[var(--jade)]/10 border-[var(--jade)]/30' },
      antagonist: { label: '反派', cls: 'text-[var(--accent)] bg-[var(--accent)]/10 border-[var(--accent)]/30' },
      narrator:   { label: '叙述者', cls: 'text-[var(--ink)] bg-[var(--paper-dark)] border-[var(--border)]' },
    };
    return map[role] || { label: role, cls: 'text-[var(--muted)] bg-[var(--paper-dark)] border-[var(--border)]' };
  };

  const getCurrentState = (char: Character) => {
    if (char.stateHistory && char.stateHistory.length > 0) {
      return char.stateHistory[char.stateHistory.length - 1].state;
    }
    return null;
  };

  const getCharColor = (char: Character) => {
    const map: Record<string, string> = {
      protagonist: 'bg-gradient-to-br from-amber-400 to-amber-700',
      supporting:  'bg-gradient-to-br from-emerald-500 to-emerald-800',
      antagonist:  'bg-gradient-to-br from-red-500 to-red-800',
      narrator:    'bg-gradient-to-br from-stone-500 to-stone-700',
    };
    return map[char.role] || 'bg-gradient-to-br from-stone-400 to-stone-600';
  };

  const panelContent = (
    <div className="flex flex-col h-full">
      <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
        <h3 className="text-base font-semibold text-[var(--ink)] tracking-wide">角色面板</h3>
        <button
          onClick={onToggle}
          className="text-[var(--muted)] hover:text-[var(--ink)] text-xl leading-none w-7 h-7 flex items-center justify-center rounded-full hover:bg-[var(--paper-dark)] transition-colors"
        >
          &times;
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {loading ? (
          <div className="text-center py-8 text-[var(--muted)] text-sm">加载中...</div>
        ) : characters.length === 0 ? (
          <div className="text-center py-8 text-[var(--muted)] text-sm">暂无角色</div>
        ) : (
          characters.map(char => {
            const role = getRoleLabel(char.role);
            const state = getCurrentState(char);
            const isActive = activeCharId === char.id;

            return (
              <div key={char.id} className="space-y-1">
                <button
                  onClick={() => setActiveCharId(isActive ? null : char.id)}
                  className={`w-full text-left rounded-lg p-3 transition-all border ${
                    isActive
                      ? 'bg-white border-[var(--gold)]/50 shadow-sm'
                      : 'bg-white/60 border-[var(--border)] hover:bg-white hover:border-[var(--gold)]/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full ${getCharColor(char)} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                      {char.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[var(--ink)] text-sm truncate">{char.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${role.cls}`}>{role.label}</span>
                      </div>
                      {char.era && <span className="text-[11px] text-[var(--muted)]">{char.era}</span>}
                    </div>
                  </div>

                  {state && (
                    <p className="mt-2 text-xs text-[var(--ink)]/80 bg-[var(--paper-dark)]/60 rounded px-2 py-1 truncate">{state}</p>
                  )}
                </button>

                {isActive && (
                  <div className="ml-5 pl-4 border-l-2 border-[var(--gold)]/30 space-y-2.5 animate-fade-in-up">
                    {char.traits && char.traits.length > 0 && (
                      <div>
                        <span className="text-[11px] text-[var(--muted)] tracking-wider">性格</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {char.traits.map((t, i) => (
                            <span
                              key={i}
                              className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--paper-dark)] text-[var(--ink)] border border-[var(--border)]"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {char.coreMotivation && (
                      <div>
                        <span className="text-[11px] text-[var(--muted)] tracking-wider">核心动机</span>
                        <p className="text-xs text-[var(--ink)]/85 mt-0.5 leading-relaxed">{char.coreMotivation}</p>
                      </div>
                    )}
                    {char.speechPatterns && (
                      <div>
                        <span className="text-[11px] text-[var(--muted)] tracking-wider">口癖</span>
                        <p className="text-xs text-[var(--ink)]/85 mt-0.5 italic">“{char.speechPatterns}”</p>
                      </div>
                    )}
                    {char.relationships && char.relationships.length > 0 && (
                      <div>
                        <span className="text-[11px] text-[var(--muted)] tracking-wider">关系</span>
                        <div className="space-y-1 mt-1">
                          {char.relationships.map((rel, i) => {
                            const target = characters.find(c => c.id === rel.targetId);
                            return (
                              <div key={i} className="flex items-center gap-2 text-xs text-[var(--ink)]/80">
                                <span className="truncate">{target ? target.name : rel.targetId}</span>
                                <span className="text-[var(--muted)]">—</span>
                                <span className="text-[var(--gold)]">{rel.relation}</span>
                                <span className="text-[var(--muted)] text-[10px]">({Math.round(rel.strength * 100)}%)</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-30 flex items-end justify-center lg:items-center bg-black/30"
      onClick={onToggle}
    >
      <div
        className="relative bg-[var(--paper)] shadow-2xl overflow-hidden flex flex-col
          w-full max-h-[60vh] rounded-t-2xl border-t border-[var(--border)]
          lg:w-[480px] lg:max-h-[80vh] lg:rounded-2xl lg:border lg:border-[var(--border)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-2 pb-1 lg:hidden">
          <div className="w-10 h-1 rounded-full bg-[var(--border)]" />
        </div>
        {panelContent}
      </div>
    </div>
  );
}
