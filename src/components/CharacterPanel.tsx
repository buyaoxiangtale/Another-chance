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
    const map: Record<string, { label: string; color: string }> = {
      protagonist: { label: '主角', color: 'text-amber-400 bg-amber-400/10 border-amber-400/30' },
      supporting: { label: '配角', color: 'text-blue-400 bg-blue-400/10 border-blue-400/30' },
      antagonist: { label: '反派', color: 'text-red-400 bg-red-400/10 border-red-400/30' },
      narrator: { label: '叙述者', color: 'text-purple-400 bg-purple-400/10 border-purple-400/30' },
    };
    return map[role] || { label: role, color: 'text-gray-400 bg-gray-400/10 border-gray-400/30' };
  };

  const getCurrentState = (char: Character) => {
    if (char.stateHistory && char.stateHistory.length > 0) {
      return char.stateHistory[char.stateHistory.length - 1].state;
    }
    return null;
  };

  const getCharColor = (char: Character) => {
    const map: Record<string, string> = {
      protagonist: 'bg-gradient-to-br from-amber-500 to-amber-700',
      supporting: 'bg-gradient-to-br from-blue-500 to-blue-700',
      antagonist: 'bg-gradient-to-br from-red-500 to-red-700',
      narrator: 'bg-gradient-to-br from-purple-500 to-purple-700',
    };
    return map[char.role] || 'bg-gradient-to-br from-gray-500 to-gray-700';
  };

  // Desktop sidebar
  const PanelContent = () => (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
        <h3 className="text-sm font-bold text-amber-300 tracking-wider flex items-center gap-2">
          <span>🎭</span> 角色面板
        </h3>
        <button onClick={onToggle} className="text-gray-500 hover:text-white text-lg leading-none">&times;</button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading ? (
          <div className="text-center py-8 text-gray-500 text-sm">加载中...</div>
        ) : characters.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            <div className="text-2xl mb-2">🎭</div>
            暂无角色
          </div>
        ) : (
          characters.map(char => {
            const role = getRoleLabel(char.role);
            const state = getCurrentState(char);
            const isActive = activeCharId === char.id;

            return (
              <div key={char.id} className="space-y-1">
                <button
                  onClick={() => setActiveCharId(isActive ? null : char.id)}
                  className={`w-full text-left rounded-lg p-3 transition-all ${
                    isActive
                      ? 'bg-white/10 ring-1 ring-amber-400/30'
                      : 'hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className={`w-10 h-10 rounded-full ${getCharColor(char)} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                      {char.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white text-sm truncate">{char.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${role.color}`}>{role.label}</span>
                      </div>
                      {char.era && <span className="text-[11px] text-gray-400">{char.era}</span>}
                    </div>
                  </div>

                  {/* State */}
                  {state && (
                    <p className="mt-2 text-xs text-gray-300 bg-white/5 rounded px-2 py-1 truncate">{state}</p>
                  )}
                </button>

                {/* Expanded details */}
                {isActive && (
                  <div className="ml-13 pl-13 border-l-2 border-amber-400/20 ml-5 pl-4 space-y-2 animate-fade-in-up">
                    {/* Traits */}
                    {char.traits && char.traits.length > 0 && (
                      <div>
                        <span className="text-[10px] text-gray-500 uppercase tracking-wider">性格</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {char.traits.map((t, i) => (
                            <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-white/5 text-gray-300">{t}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Motivation */}
                    {char.coreMotivation && (
                      <div>
                        <span className="text-[10px] text-gray-500 uppercase tracking-wider">核心动机</span>
                        <p className="text-xs text-gray-300 mt-0.5">{char.coreMotivation}</p>
                      </div>
                    )}
                    {/* Speech patterns */}
                    {char.speechPatterns && (
                      <div>
                        <span className="text-[10px] text-gray-500 uppercase tracking-wider">口癖</span>
                        <p className="text-xs text-gray-300 mt-0.5 italic">"{char.speechPatterns}"</p>
                      </div>
                    )}
                    {/* Relationships */}
                    {char.relationships && char.relationships.length > 0 && (
                      <div>
                        <span className="text-[10px] text-gray-500 uppercase tracking-wider">关系</span>
                        <div className="space-y-1 mt-1">
                          {char.relationships.map((rel, i) => {
                            const target = characters.find(c => c.id === rel.targetId);
                            return (
                              <div key={i} className="flex items-center gap-2 text-xs text-gray-300">
                                <span className="truncate">{target ? target.name : rel.targetId}</span>
                                <span className="text-gray-500">—</span>
                                <span className="text-amber-300/70">{rel.relation}</span>
                                <span className="text-gray-600 text-[10px]">({Math.round(rel.strength * 100)}%)</span>
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

  return (
    <>
      {/* Backdrop */}
      {isOpen && <div className="fixed inset-0 z-20 bg-black/40" onClick={onToggle} />}

      {/* Panel: mobile = bottom drawer, desktop = centered modal */}
      {isOpen && (
        <div className="fixed z-30 transition-all duration-300 bg-gray-900/95 backdrop-blur-sm
          bottom-0 left-0 right-0
          rounded-t-2xl max-h-[60vh] border-t border-white/10
          overflow-hidden
          lg:inset-auto lg:bottom-auto lg:left-auto lg:right-auto
          lg:top-1/2 lg:left-1/2
          lg:-translate-x-1/2 lg:-translate-y-1/2
          lg:w-[480px] lg:max-h-[80vh] lg:rounded-2xl lg:border lg:border-white/10
        ">
          {/* Drag handle (mobile only) */}
          <div className="flex justify-center pt-2 pb-1 lg:hidden">
            <div className="w-10 h-1 rounded-full bg-gray-600" />
          </div>
          <PanelContent />
        </div>
      )}
    </>
  );
}
