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

  const content = (
    <div className="flex flex-col h-full">
      <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
        <h3 className="text-base font-semibold text-[var(--ink)] tracking-wide">导演模式</h3>
        <button
          onClick={onToggle}
          className="text-[var(--muted)] hover:text-[var(--ink)] text-xl leading-none w-7 h-7 flex items-center justify-center rounded-full hover:bg-[var(--paper-dark)] transition-colors"
        >
          &times;
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {loading ? (
          <div className="text-center py-8 text-[var(--muted)] text-sm">加载中...</div>
        ) : !state ? (
          <div className="text-center py-8 text-[var(--muted)] text-sm">暂无导演状态</div>
        ) : (
          <>
            <SectionBlock
              title="角色状态"
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

            <SectionBlock
              title="世界变量"
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

            {state.activeConstraints && state.activeConstraints.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-[var(--muted)] tracking-wider">活跃约束</span>
                </div>
                <div className="space-y-1">
                  {state.activeConstraints.map((c, i) => (
                    <div
                      key={i}
                      className="text-xs text-[var(--gold)] bg-[var(--gold)]/10 border border-[var(--gold)]/20 rounded px-2.5 py-1.5"
                    >
                      {c}
                    </div>
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
      {isOpen && (
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
            {content}
          </div>
        </div>
      )}
    </>
  );
}

function SectionBlock({
  title, entries, section, editingKey, editSection, editValue,
  onStartEdit, onSave, onAdd, onDelete, onCancel, onUpdateValue,
  addingSection, newKey, newValue, onSetNewKey, onSetNewValue, onSetAddingSection,
}: {
  title: string; entries: Record<string, string> | undefined;
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

  const inputClass =
    'w-full text-sm bg-white border border-[var(--border)] text-[var(--ink)] placeholder-[var(--muted)] px-2.5 py-1.5 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/40 focus:border-transparent';

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-[var(--muted)] tracking-wider">
          {title} <span className="opacity-60">({keys.length})</span>
        </span>
        <button
          onClick={() => { onSetAddingSection(section as 'characterStates' | 'worldVariables'); onSetNewKey(''); onSetNewValue(''); }}
          className="text-xs text-[var(--gold)] hover:text-[var(--gold-light)] font-medium"
        >
          + 添加
        </button>
      </div>

      {keys.length === 0 ? (
        <p className="text-xs text-[var(--muted)]/70 italic">暂无数据</p>
      ) : (
        <div className="space-y-1">
          {keys.map(key => {
            const isEditing = editingKey === key && editSection === section;
            return (
              <div
                key={key}
                className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-[var(--paper-dark)] transition-colors"
              >
                <span className="text-xs text-[var(--muted)] font-mono truncate max-w-[90px]" title={key}>
                  {key}
                </span>
                <span className="text-[var(--muted)]/60 text-xs">:</span>
                {isEditing ? (
                  <div className="flex-1 flex items-center gap-1">
                    <input
                      value={editValue}
                      onChange={e => onUpdateValue(e.target.value)}
                      className={inputClass}
                      autoFocus
                      onKeyDown={e => {
                        if (e.key === 'Enter') onSave(section, key, editValue);
                        if (e.key === 'Escape') onCancel();
                      }}
                    />
                    <button onClick={() => onSave(section, key, editValue)} className="text-[var(--jade)] text-xs px-1">✓</button>
                    <button onClick={onCancel} className="text-[var(--muted)] text-xs px-1">✕</button>
                  </div>
                ) : (
                  <>
                    <span className="flex-1 text-xs text-[var(--ink)] truncate">{entries![key]}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onStartEdit(section, key, entries![key])}
                        className="text-[var(--muted)] hover:text-[var(--ink)] text-[11px] px-1"
                        title="编辑"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => onDelete(section, key)}
                        className="text-[var(--muted)] hover:text-[var(--accent)] text-[11px] px-1"
                        title="删除"
                      >
                        删除
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {addingSection === section && (
        <div className="mt-3 space-y-2 border-t border-[var(--border)] pt-3">
          <input
            value={newKey}
            onChange={e => onSetNewKey(e.target.value)}
            placeholder={section === 'characterStates' ? '角色名' : '变量名'}
            className={inputClass}
            autoFocus
            onKeyDown={e => { if (e.key === 'Escape') onSetAddingSection(null); }}
          />
          <input
            value={newValue}
            onChange={e => onSetNewValue(e.target.value)}
            placeholder="值"
            className={inputClass}
            onKeyDown={e => {
              if (e.key === 'Enter' && newKey.trim()) { onAdd(section); }
              if (e.key === 'Escape') onSetAddingSection(null);
            }}
          />
          <div className="flex gap-2">
            <button
              onClick={() => { if (newKey.trim()) onAdd(section); }}
              className="text-xs px-3 py-1 rounded-md bg-[var(--gold)]/10 text-[var(--gold)] border border-[var(--gold)]/30 hover:bg-[var(--gold)]/20"
            >
              确认
            </button>
            <button
              onClick={() => onSetAddingSection(null)}
              className="text-xs px-3 py-1 rounded-md text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-dark)]"
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
