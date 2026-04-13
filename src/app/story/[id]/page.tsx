'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface Story {
  id: string;
  title: string;
  description?: string;
  author?: string;
}

interface StorySegment {
  id: string;
  title?: string;
  content: string;
  isBranchPoint: boolean;
  storyId: string;
  branchId: string;
  parentSegmentId?: string;
  imageUrls: string[];
}

interface StoryBranch {
  id: string;
  title: string;
  userDirection: string;
  sourceSegmentId: string;
}

export default function StoryDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [story, setStory] = useState<Story | null>(null);
  const [segments, setSegments] = useState<StorySegment[]>([]);
  const [branches, setBranches] = useState<StoryBranch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [continuing, setContinuing] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [currentBranchId, setCurrentBranchId] = useState('main');
  const [showBranchDialog, setShowBranchDialog] = useState(false);
  const [branchingSegmentId, setBranchingSegmentId] = useState<string | null>(null);
  const [userDirection, setUserDirection] = useState('');
  const [customDirection, setCustomDirection] = useState('');
  const [branching, setBranching] = useState(false);
  const [branchStep, setBranchStep] = useState('');
  const [branchPreview, setBranchPreview] = useState('');

  const loadBranchSegments = useCallback(async (branchId: string) => {
    const segRes = await fetch(`/api/stories/${id}/segments?branchId=${branchId}`);
    if (segRes.ok) {
      const segData = await segRes.json();
      setSegments(segData.segments || []);
    }
  }, [id]);

  const loadTree = useCallback(async () => {
    const treeRes = await fetch(`/api/stories/${id}/tree`);
    if (treeRes.ok) {
      const treeData = await treeRes.json();
      setBranches(treeData.branches || []);
    }
  }, [id]);

  useEffect(() => {
    async function load() {
      try {
        const [sRes, treeRes] = await Promise.all([
          fetch(`/api/stories/${id}`),
          fetch(`/api/stories/${id}/tree`)
        ]);
        if (!sRes.ok || !treeRes.ok) throw new Error('加载失败');
        
        const sData = await sRes.json();
        const treeData = await treeRes.json();
        
        setStory(sData.story);
        setBranches(treeData.branches || []);
        setCurrentBranchId('main');
      } catch (e) {
        setError(e instanceof Error ? e.message : '未知错误');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  // Load segments for current branch
  useEffect(() => {
    if (!loading) {
      loadBranchSegments(currentBranchId);
    }
  }, [currentBranchId, loading, loadBranchSegments]);

  // Find tail segment: the one whose id is not referenced as parentSegmentId by any other segment
  const getTailSegment = () => {
    const childIds = new Set(segments.map(s => s.parentSegmentId).filter(Boolean));
    return segments.find(s => !childIds.has(s.id));
  };

  const handleContinue = async () => {
    if (continuing) return;
    
    setContinuing(true);
    setNewContent('');

    try {
      const res = await fetch(`/api/stories/${id}/stream-continue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branchId: currentBranchId })
      });

      if (!res.ok) throw new Error('续写失败');
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let full = '';

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') break;
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                full += parsed.content;
                setNewContent(full);
              }
            } catch {}
          }
        }
      }

      // Reload segments
      await loadBranchSegments(currentBranchId);
      await loadTree();
      setNewContent('');
    } catch (e) {
      alert('续写失败: ' + (e instanceof Error ? e.message : '请重试'));
    } finally {
      setContinuing(false);
    }
  };

  const handleBranch = async (segmentId: string) => {
    setBranchingSegmentId(segmentId);
    setUserDirection('');
    setCustomDirection('');
    setShowBranchDialog(true);
  };

  const confirmBranch = async () => {
    if (!branchingSegmentId) return;
    
    const direction = customDirection.trim() || userDirection;
    if (!direction) {
      alert('请选择或输入分叉方向');
      return;
    }

    setBranching(true);
    setBranchStep('thinking');
    setBranchPreview('');

    try {
      await new Promise(r => setTimeout(r, 800));
      setBranchStep('generating');

      const res = await fetch(`/api/stories/${id}/branch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          segmentId: branchingSegmentId,
          userDirection: direction
        })
      });
      if (!res.ok) throw new Error('分叉失败');
      
      const data = await res.json();
      setBranchStep('saving');
      setBranchPreview(data.segment?.content || '分叉剧情已生成');

      await new Promise(r => setTimeout(r, 500));

      // Refresh
      await loadBranchSegments(currentBranchId);
      await loadTree();
      
      setShowBranchDialog(false);
      setBranchingSegmentId(null);
    } catch (e) {
      alert('分叉失败: ' + (e instanceof Error ? e.message : '请重试'));
    } finally {
      setBranching(false);
      setBranchStep('');
      setBranchPreview('');
    }
  };

  const switchBranch = async (branchId: string) => {
    setCurrentBranchId(branchId);
    // segments will be loaded via useEffect
  };

  const getCurrentBranchPath = () => {
    if (currentBranchId === 'main') return ['主线'];
    const branch = branches.find(b => b.id === currentBranchId);
    if (branch) {
      // Find source segment title from main chain - use tree data
      return [branch.userDirection || branch.title];
    }
    return [currentBranchId];
  };

  // Check how many branches originate from a segment
  const getBranchCountForSegment = (segmentId: string) => {
    return branches.filter(b => b.sourceSegmentId === segmentId).length;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--paper)' }}>
        <div className="text-center">
          <div className="text-4xl mb-4 animate-bounce">📜</div>
          <p className="text-[var(--muted)]">卷轴展开中...</p>
        </div>
      </div>
    );
  }

  if (error || !story) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--paper)' }}>
        <div className="text-center">
          <p className="text-[var(--muted)] mb-4">{error || '故事不存在'}</p>
          <Link href="/" className="text-[var(--gold)] hover:underline">← 返回故事列表</Link>
        </div>
      </div>
    );
  }

  const BranchDialog = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl border border-[var(--border)] p-6 max-w-lg w-full mx-4 shadow-xl">
        {branching ? (
          <div className="text-center py-4">
            <div className="mb-6">
              <div className="flex items-center justify-center gap-2 mb-4">
                {['thinking', 'generating', 'saving'].map((step, i) => {
                  const steps = ['构思分叉方向', 'AI 生成剧情', '保存分支'];
                  const isActive = branchStep === step;
                  const isDone = ['thinking', 'generating', 'saving'].indexOf(branchStep) > i;
                  return (
                    <div key={step} className="flex items-center gap-2">
                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        isActive ? 'bg-[var(--accent)] text-white shadow-md scale-105' :
                        isDone ? 'bg-[var(--jade)] text-white' :
                        'bg-gray-100 text-[var(--muted)]'
                      }`}>
                        {isDone ? '✓' : isActive && <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                        {steps[i]}
                      </div>
                      {i < 2 && <div className={`w-6 h-px ${isDone ? 'bg-[var(--jade)]' : 'bg-gray-200'}`} />}
                    </div>
                  );
                })}
              </div>
            </div>

            {branchPreview && (
              <div className="mt-4 p-4 rounded-lg bg-[var(--paper)] border border-[var(--border)] text-left max-h-40 overflow-y-auto">
                <p className="text-xs text-[var(--muted)] mb-2">生成预览：</p>
                <p className="text-sm text-[var(--ink)] prose-chinese">{branchPreview.slice(0, 200)}{branchPreview.length > 200 ? '...' : ''}</p>
              </div>
            )}

            <p className="text-sm text-[var(--muted)] mt-4 animate-pulse">
              {branchStep === 'thinking' && '🔮 正在分析故事走向...'}
              {branchStep === 'generating' && '✍️ AI 正在书写分叉剧情，请稍候...'}
              {branchStep === 'saving' && '💾 正在保存分支...'}
            </p>
          </div>
        ) : (
          <>
            <h3 className="text-lg font-bold text-[var(--ink)] mb-1">⚔ 分叉剧情</h3>
            <p className="text-sm text-[var(--muted)] mb-4">选择一个方向，或输入你想要的历史走向</p>
            
            <div className="space-y-2 mb-5">
              {[
                { icon: '🗡️', label: '加强战争策略', desc: '以更精妙的战术改写战局' },
                { icon: '🤝', label: '转向外交途径', desc: '以谈判和联盟化解危机' },
                { icon: '🏛️', label: '专注内政发展', desc: '休养生息，积蓄力量' },
                { icon: '🔄', label: '寻求盟友帮助', desc: '联合他人共同应对挑战' },
              ].map((option) => (
                <button
                  key={option.label}
                  onClick={() => { setUserDirection(option.label); setCustomDirection(''); }}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
                    userDirection === option.label
                      ? 'border-[var(--accent)] bg-red-50 shadow-sm'
                      : 'border-[var(--border)] hover:border-[var(--gold)]/50 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>{option.icon}</span>
                    <span className={`font-medium text-sm ${userDirection === option.label ? 'text-[var(--accent)]' : 'text-[var(--ink)]'}`}>
                      {option.label}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--muted)] mt-0.5 ml-7">{option.desc}</p>
                </button>
              ))}
            </div>

            <div className="mb-5">
              <label className="block text-sm font-medium text-[var(--ink)] mb-2">✦ 自定义方向</label>
              <textarea
                value={customDirection}
                onChange={(e) => {
                  setCustomDirection(e.target.value);
                  if (e.target.value.trim()) setUserDirection('');
                }}
                placeholder="例：如果荆轲选择不刺秦王，而是劝说秦王..."
                rows={2}
                className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--paper)] text-[var(--ink)] placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)] focus:border-transparent text-sm resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowBranchDialog(false)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-[var(--border)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-gray-50 transition-all text-sm"
              >
                取消
              </button>
              <button
                onClick={confirmBranch}
                disabled={!customDirection.trim() && !userDirection}
                className={`flex-1 px-4 py-2.5 rounded-lg text-white text-sm font-medium transition-all ${
                  customDirection.trim() || userDirection
                    ? 'bg-gradient-to-r from-[var(--accent)] to-red-700 hover:shadow-lg'
                    : 'bg-gray-200 text-[var(--muted)] cursor-not-allowed'
                }`}
              >
                ⚔ 生成分叉
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: 'var(--paper)' }}>
      {/* Top nav */}
      <nav className="sticky top-0 z-10 backdrop-blur-sm border-b border-[var(--border)]" style={{ background: 'rgba(250,246,240,0.9)' }}>
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/" className="text-sm text-[var(--muted)] hover:text-[var(--ink)] transition-colors flex items-center gap-1">
            ← 故事列表
          </Link>
          <div className="flex items-center gap-3">
            <div className="text-sm">
              <div className="flex items-center gap-1 text-[var(--muted)]">
                <span>当前路径:</span>
                <span className="text-[var(--gold)] font-medium">
                  {getCurrentBranchPath().join(' → ')}
                </span>
              </div>
            </div>
            <h1 className="text-sm font-bold text-[var(--ink)] tracking-wider">{story.title}</h1>
          </div>
        </div>
      </nav>

      {/* Branch switcher */}
      {branches.length > 0 && (
        <div className="sticky top-16 z-10 backdrop-blur-sm border-b border-[var(--border)]" style={{ background: 'rgba(250,246,240,0.95)' }}>
          <div className="max-w-3xl mx-auto px-6 py-3">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => switchBranch('main')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  currentBranchId === 'main'
                    ? 'bg-[var(--gold)] text-[var(--paper)]'
                    : 'bg-[var(--border)] text-[var(--muted)] hover:bg-[var(--gold)]/20'
                }`}
              >
                主线
              </button>
              {branches.map((branch) => (
                <button
                  key={branch.id}
                  onClick={() => switchBranch(branch.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    currentBranchId === branch.id
                      ? 'bg-[var(--accent)] text-white'
                      : 'bg-[var(--border)] text-[var(--muted)] hover:bg-[var(--accent)]/20'
                  }`}
                  title={branch.userDirection}
                >
                  <span className="truncate max-w-32">{branch.userDirection || branch.title}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Story title */}
      <div className="max-w-3xl mx-auto px-6 pt-12 pb-8 text-center">
        <div className="divider-ornament mb-4">
          <span>✦</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-[var(--ink)] tracking-widest mb-3">
          {story.title}
        </h1>
        {story.description && (
          <p className="text-[var(--muted)] text-sm">{story.description}</p>
        )}
      </div>

      {/* Story content */}
      <div className="max-w-3xl mx-auto px-6 pb-20">
        <div className="relative">
          {/* Left decoration line */}
          <div className="absolute left-8 top-0 bottom-0 w-px bg-gradient-to-b from-[var(--gold)] via-[var(--border)] to-transparent" />

          <div className="space-y-8">
            {segments.map((seg, idx) => {
              const branchCount = getBranchCountForSegment(seg.id);
              return (
                <div key={seg.id} className="relative pl-16 animate-fade-in-up" style={{ animationDelay: `${idx * 80}ms` }}>
                  {/* Timeline node */}
                  <div className={`absolute left-6 top-2 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    seg.isBranchPoint
                      ? 'border-[var(--accent)] bg-[var(--accent)] branch-pulse'
                      : 'border-[var(--gold)] bg-[var(--paper)]'
                  }`}>
                    {seg.isBranchPoint && <span className="text-white text-xs">⚔</span>}
                  </div>

                  {/* Segment card */}
                  <div className="rounded-lg border border-[var(--border)] bg-white p-6 shadow-sm">
                    {/* Branch label */}
                    {currentBranchId !== 'main' && (
                      <div className="mb-3 flex items-center gap-2">
                        <span className="text-xs px-2 py-1 bg-[var(--accent)]/10 text-[var(--accent)] rounded-full border border-[var(--accent)]/30">
                          分支
                        </span>
                        {branches.find(b => b.id === currentBranchId)?.userDirection && (
                          <span className="text-xs text-[var(--muted)]">
                            {branches.find(b => b.id === currentBranchId)?.userDirection}
                          </span>
                        )}
                      </div>
                    )}
                    
                    {seg.title && (
                      <h3 className="text-lg font-bold text-[var(--ink)] mb-3 flex items-center gap-2">
                        <span className="text-[var(--gold)]">·</span>
                        {seg.title}
                      </h3>
                    )}
                    <p className="prose-chinese text-[var(--ink)]">
                      {seg.content}
                    </p>

                    {/* Branch point indicator */}
                    {seg.isBranchPoint && branchCount > 0 && (
                      <div className="mt-4 pt-3 border-t border-dashed border-[var(--border)]">
                        <p className="text-xs text-[var(--accent)] font-medium flex items-center gap-1">
                          ⚔ 此处有 {branchCount} 条分叉路线
                        </p>
                      </div>
                    )}

                    {/* Fork button on every segment */}
                    <div className="mt-4 pt-3 border-t border-[var(--border)]/50 flex justify-end">
                      <button
                        onClick={() => handleBranch(seg.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-[var(--muted)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/5 rounded-lg transition-all group"
                        title="从此处分叉"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                        </svg>
                        <span className="hidden group-hover:inline">从此处分叉</span>
                        <span className="group-hover:hidden">分叉</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Streaming new content */}
            {newContent && (
              <div className="relative pl-16 animate-fade-in-up">
                <div className="absolute left-6 top-2 w-5 h-5 rounded-full border-2 border-blue-400 bg-blue-50 flex items-center justify-center">
                  <span className="text-blue-500 text-xs">✦</span>
                </div>
                <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-6 shadow-sm">
                  <p className="prose-chinese text-[var(--ink)]">
                    {newContent}
                    <span className="inline-block w-0.5 h-5 bg-[var(--ink)] animate-pulse ml-0.5 align-text-bottom" />
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom action bar */}
        {segments.length > 0 && (
          <div className="mt-12 text-center">
            <div className="divider-ornament mb-6">
              <span>✦</span>
            </div>
            <button
              onClick={handleContinue}
              disabled={continuing}
              className={`inline-flex items-center gap-2 px-8 py-3 rounded-full font-medium transition-all ${
                continuing
                  ? 'bg-gray-200 text-[var(--muted)] cursor-wait'
                  : 'bg-gradient-to-r from-amber-700 to-red-800 text-white hover:shadow-lg hover:shadow-amber-900/20'
              }`}
            >
              {continuing ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-[var(--muted)] border-t-transparent rounded-full animate-spin" />
                  故事书写中...
                </>
              ) : (
                <>✦ 续写故事</>
              )}
            </button>
          </div>
        )}
      </div>

      {showBranchDialog && <BranchDialog />}
    </div>
  );
}
