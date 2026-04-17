'use client';

import { useState, useEffect, useCallback } from 'react';
import type { DirectorState } from '@/types/story';

interface DirectorSidebarProps {
  storyId: string;
  isOpen: boolean;
  onToggle: () => void;
}

export default function DirectorSidebar({ storyId, isOpen, onToggle }: DirectorSidebarProps) {
  const [state, setState] = useState<DirectorState | null>(null);
  const [loading, setLoading] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editSection, setEditSection] = useState<'characterStates' | 'worldVariables' | null>(null);

  const [addingSection, setAddingSection] = useState<'characterStates' | 'worldVariables' | null>(null);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  const loadState = useCallback(async () => {
    if (!isOpen) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/stories/${storyId}/director`);
      const data = await res.json();
      if (data.success) setState(data.state);
      else console.error('DirectorSidebar load failed:', data);
    } catch (e) { console.error('DirectorSidebar loadState error:', e); }
    setLoading(false);
  }, [storyId, isOpen]);

  useEffect(() => { loadState(); }, [loadState]);

  const handleSave = async (section: 'characterStates' | 'worldVariables', key: string, value: string) => {
    if (!state) return;
    const update: Record<string, any> = { [section]: { ...state[section], [key]: value } };
    try {
      const res = await fetch(`/api/stories/${storyId}/director`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update),
      });
      const data = await res.json();
      if (data.success) setState(data.state);
    } catch {}
    setEditingKey(null);
    setEditSection(null);
  };

  const handleAdd = async (section: 'characterStates' | 'worldVariables') => {
    if (!newKey.trim() || !state) return;
    const update: Record<string, any> = { [section]: { ...state[section], [newKey.trim()]: newValue.trim() || '' } };
    try {
      const res = await fetch(`/api/stories/${storyId}/director`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update),
      });
      const data = await res.json();
      if (data.success) setState(data.state);
    } catch {}
    setNewKey('');
    setNewValue('');
    setAddingSection(null);
  };

  const handleDelete = async (section: 'characterStates' | 'worldVariables', key: string) => {
    if (!state) return;
    const copy = { ...state[section] };
    delete copy[key];
    try {
      const res = await fetch(`/api/stories/${storyId}/director`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [section]: copy }),
      });
      const data = await res.json();
      if (data.success) setState(data.state);
    } catch {}
  };

  const startEdit = (section: 'characterStates' | 'worldVariables', key: string, value: string) => {
    setEditingKey(key);
    setEditSection(section);
    setEditValue(value);
  };

  const Content = () => (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
        <h3 className="text-sm font-bold text-emerald-300 tracking-wider flex items-center gap-2">
          <span>🎬</span> 导演模式
        </h3>
        <button onClick={onToggle} className="text-gray-500 hover:text-white text-lg leading-none">&times;</button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {loading ? (
          <div className="text-center py-8 text-gray-500 text-sm">加载中...</div>
        ) : !state ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            <div className="text-2xl mb-2">🎬</div>
            暂无导演状态
          </div>
        ) : (
          <>
            {/* Character States */}
            <SectionBlock
              title="角色状态"
              icon="👤"
              entries={state.characterStates}
              section="characterStates"
              editingKey={editingKey}
              editSection={editSection}
              editValue={editValue}
              onStartEdit={startEdit}
              onSave={handleSave}
              onAdd={handleAdd}
              onDelete={handleDelete}
              onCancel={() => { setEditingKey(null); setEditSection(null); }}
              onUpdateValue={setEditValue}
              addingSection={addingSection}
              newKey={newKey}
              newValue={newValue}
              onSetNewKey={setNewKey}
              onSetNewValue={setNewValue}
              onSetAddingSection={setAddingSection}
            />

            {/* World Variables */}
            <SectionBlock
              title="世界变量"
              icon="🌍"
              entries={state.worldVariables}
              section="worldVariables"
              editingKey={editingKey}
              editSection={editSection}
              editValue={editValue}
              onStartEdit={startEdit}
              onSave={handleSave}
              onAdd={handleAdd}
              onDelete={handleDelete}
              onCancel={() => { setEditingKey(null); setEditSection(null); }}
              onUpdateValue={setEditValue}
              addingSection={addingSection}
              newKey={newKey}
              newValue={newValue}
              onSetNewKey={setNewKey}
              onSetNewValue={setNewValue}
              onSetAddingSection={setAddingSection}
            />

            {/* Active Constraints */}
            {state.activeConstraints && state.activeConstraints.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-400 flex items-center gap-1">
                    <span>🔒</span> 活跃约束
                  </span>
                </div>
                <div className="space-y-1">
                  {state.activeConstraints.map((c, i) => (
                    <div key={i} className="text-xs text-yellow-300/80 bg-yellow-400/5 rounded px-2 py-1">{c}</div>
                  ))}
                </div>
              </div>
            )}
          </>
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
          <Content />
        </div>
      )}
    </>
  );
}

// Reusable section block
function SectionBlock({
  title, icon, entries, section, editingKey, editSection, editValue,
  onStartEdit, onSave, onAdd, onDelete, onCancel, onUpdateValue,
  addingSection, newKey, newValue, onSetNewKey, onSetNewValue, onSetAddingSection,
}: {
  title: string; icon: string; entries: Record<string, string> | undefined;
  section: 'characterStates' | 'worldVariables';
  editingKey: string | null; editSection: string | null; editValue: string;
  onStartEdit: (s: any, k: string, v: string) => void;
  onSave: (s: any, k: string, v: string) => void;
  onAdd: (s: any) => void;
  onDelete: (s: any, k: string) => void;
  onCancel: () => void;
  onUpdateValue: (v: string) => void;
  addingSection: string | null;
  newKey: string; newValue: string;
  onSetNewKey: (v: string) => void;
  onSetNewValue: (v: string) => void;
  onSetAddingSection: (v: 'characterStates' | 'worldVariables' | null) => void;
}) {
  const keys = entries ? Object.keys(entries) : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-400 flex items-center gap-1">
          <span>{icon}</span> {title}
          <span className="text-gray-600">({keys.length})</span>
        </span>
        <button
          onClick={() => { onSetAddingSection(section as 'characterStates' | 'worldVariables'); onSetNewKey(''); onSetNewValue(''); }}
          className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5"
        >
          + 添加
        </button>
      </div>

      {keys.length === 0 ? (
        <p className="text-xs text-gray-600 italic">暂无数据</p>
      ) : (
        <div className="space-y-1">
          {keys.map(key => {
            const isEditing = editingKey === key && editSection === section;
            return (
              <div key={key} className="group flex items-center gap-2 rounded px-2 py-1 hover:bg-white/5">
                <span className="text-xs text-gray-500 font-mono truncate max-w-[80px]" title={key}>{key}</span>
                <span className="text-gray-600 text-xs">:</span>
                {isEditing ? (
                  <div className="flex-1 flex items-center gap-1">
                    <input
                      value={editValue}
                      onChange={e => onUpdateValue(e.target.value)}
                      className="flex-1 text-xs bg-white/10 text-white px-1.5 py-0.5 rounded border border-emerald-400/30 focus:outline-none"
                      autoFocus
                      onKeyDown={e => {
                        if (e.key === 'Enter') onSave(section, key, editValue);
                        if (e.key === 'Escape') onCancel();
                      }}
                    />
                    <button onClick={() => onSave(section, key, editValue)} className="text-emerald-400 text-xs">✓</button>
                    <button onClick={onCancel} className="text-gray-500 text-xs">✕</button>
                  </div>
                ) : (
                  <>
                    <span className="flex-1 text-xs text-gray-300 truncate">{entries![key]}</span>
                    <div className="flex lg:hidden items-center gap-1">
                      <button onClick={() => onStartEdit(section, key, entries![key])} className="text-gray-500 hover:text-white text-[10px]">✎</button>
                      <button onClick={() => onDelete(section, key)} className="text-gray-500 hover:text-red-400 text-[10px]">✕</button>
                    </div>
                    <div className="hidden lg:group-hover:flex items-center gap-1">
                      <button onClick={() => onStartEdit(section, key, entries![key])} className="text-gray-500 hover:text-white text-[10px]">✎</button>
                      <button onClick={() => onDelete(section, key)} className="text-gray-500 hover:text-red-400 text-[10px]">✕</button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
      {addingSection === section && (
        <div className="mt-2 space-y-1 border-t border-white/5 pt-2">
          <input
            value={newKey}
            onChange={e => onSetNewKey(e.target.value)}
            placeholder={section === 'characterStates' ? '角色名' : '变量名'}
            className="w-full text-xs bg-white/10 text-white px-2 py-1 rounded border border-emerald-400/30 focus:outline-none placeholder-gray-600"
            autoFocus
            onKeyDown={e => { if (e.key === 'Escape') onSetAddingSection(null); }}
          />
          <input
            value={newValue}
            onChange={e => onSetNewValue(e.target.value)}
            placeholder="值"
            className="w-full text-xs bg-white/10 text-white px-2 py-1 rounded border border-emerald-400/30 focus:outline-none placeholder-gray-600"
            onKeyDown={e => {
              if (e.key === 'Enter' && newKey.trim()) { onAdd(section); }
              if (e.key === 'Escape') onSetAddingSection(null);
            }}
          />
          <div className="flex gap-1">
            <button onClick={() => { if (newKey.trim()) onAdd(section); }} className="text-[10px] text-emerald-400 hover:text-emerald-300">✓ 确认</button>
            <button onClick={() => onSetAddingSection(null)} className="text-[10px] text-gray-500 hover:text-gray-400">✕ 取消</button>
          </div>
        </div>
      )}
    </div>
  );
}
