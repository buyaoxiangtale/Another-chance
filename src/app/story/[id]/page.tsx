'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import CharacterPanel from '@/components/CharacterPanel';
import TimelineBar from '@/components/TimelineBar';
import DirectorSidebar from '@/components/DirectorSidebar';
import PacingControls from '@/components/PacingControls';
import StoryImageDisplay from '@/components/story/StoryImageDisplay';
import { IMAGE_STYLES, type ImageStyle, type ConcreteImageStyle } from '@/lib/image-styles';
import type { PacingConfig, Character, StorySegment, StoryBranch } from '@/types/story';
import { getStaticBranchDirections } from '@/lib/genre-config';
import LikeButton from '@/components/social/LikeButton';
import CommentSection from '@/components/social/CommentSection';
import VisibilityToggle from '@/components/social/VisibilityToggle';
import ForkBadge from '@/components/social/ForkBadge';

interface Story {
  id: string;
  title: string;
  description?: string;
  author?: string;
  era?: string;
  genre?: string;
  characterIds?: string[];
  visibility?: string;
  ownerId?: string;
  likeCount?: number;
  isLiked?: boolean;
}

export default function StoryDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { data: session } = useSession();
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

  // C6 new state
  const [showCharacterPanel, setShowCharacterPanel] = useState(false);
  const [showDirectorSidebar, setShowDirectorSidebar] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', description: '', genre: '', era: '', author: '', visibility: 'PRIVATE' });
  const [saving, setSaving] = useState(false);
  // 段落编辑/删除
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [editingTitle, setEditingTitle] = useState('');
  const [savingSegment, setSavingSegment] = useState(false);
  const [pacingConfig, setPacingConfig] = useState<PacingConfig>({ pace: 'detailed', maxLinesPerStep: 5 });
  const [isPaused, setIsPaused] = useState(false);
  const [suggestedDirections, setSuggestedDirections] = useState<Array<{ icon: string; label: string; desc: string }>>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [displayedLines, setDisplayedLines] = useState<string[]>([]);
  const [lineStep, setLineStep] = useState(0);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  // P6-2: 图片生成状态
  const [regeneratingImageForSeg, setRegeneratingImageForSeg] = useState<string | null>(null);
  const [imageStyle, setImageStyle] = useState<ImageStyle>('ink-wash');
  const [styleRecommendation, setStyleRecommendation] = useState<{style: string, reason: string} | null>(null);

  const isOwner = !!session?.user?.id && story?.ownerId === session.user.id;

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
        setEditForm({
          title: sData.story.title || '',
          description: sData.story.description || '',
          genre: sData.story.genre || '',
          era: sData.story.era || '',
          author: sData.story.author || '',
          visibility: sData.story.visibility || 'PRIVATE',
        });
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

  // 加载风格推荐
  useEffect(() => {
    setImageStyle('auto');
    setStyleRecommendation(null);
  }, [id]);

  useEffect(() => {
    if (!story || segments.length === 0) return;
    const content = story.title + segments.slice(0, 5).map(s => s.content).join('');
    if (content.length < 50) return;
    fetch('/api/images/style-recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.recommendedStyle && data.recommendedStyle !== 'auto') {
          setStyleRecommendation({ style: data.recommendedStyle, reason: data.reason });
        }
      })
      .catch(() => {});
  }, [story, segments]);

  useEffect(() => {
    if (!loading) loadBranchSegments(currentBranchId);
  }, [currentBranchId, loading, loadBranchSegments]);

  // C6.6: Streaming with line-level stepping
  useEffect(() => {
    if (!newContent) { setDisplayedLines([]); setLineStep(0); return; }
    const lines = newContent.split('\n').filter(l => l.trim());
    setDisplayedLines(lines);
    const max = pacingConfig.maxLinesPerStep || 5;
    if (!isPaused) {
      setLineStep(Math.min(lines.length, max));
    }
  }, [newContent, isPaused, pacingConfig.maxLinesPerStep]);

  const advanceLines = () => {
    const max = pacingConfig.maxLinesPerStep || 5;
    setLineStep(prev => Math.min(prev + max, displayedLines.length));
  };

  const handlePause = () => setIsPaused(true);
  const handleResume = () => {
    setIsPaused(false);
    const max = pacingConfig.maxLinesPerStep || 5;
    setLineStep(prev => Math.min(prev + max, displayedLines.length));
  };

  const getTailSegment = () => {
    const childIds = new Set(segments.map(s => s.parentSegmentId).filter(Boolean));
    return segments.find(s => !childIds.has(s.id));
  };

  const handleContinue = async () => {
    if (continuing) return;
    setContinuing(true);
    setNewContent('');
    setLineStep(0);
    setIsPaused(false);

    try {
      const res = await fetch(`/api/stories/${id}/stream-continue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId: currentBranchId,
          pacingConfig,
        })
      });

      if (!res.ok) throw new Error('续写失败');
      const reader = res.body?.getReader();
      readerRef.current = reader || null;
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
              // 只累积原始流式 content，忽略 line 事件（后端发 line 时不再发原始 content）
              if (parsed.content && parsed.type !== 'line') {
                full += parsed.content;
                setNewContent(full);
              }
              if (parsed.type === 'pause') {
                setIsPaused(true);
              }
              if (parsed.type === 'error' && parsed.message) {
                alert(parsed.message);
                await loadBranchSegments(currentBranchId);
                return;
              }
              if (parsed.type === 'metadata' && parsed.data) {
                // Could update UI with metadata
              }
            } catch {}
          }
        }
      }

      await loadBranchSegments(currentBranchId);
      await loadTree();
      setNewContent('');
      setDisplayedLines([]);
    } catch (e) {
      alert('续写失败: ' + (e instanceof Error ? e.message : '请重试'));
    } finally {
      setContinuing(false);
      readerRef.current = null;
    }
  };

  // P6-2: 重新生成段落图片
  const handleRegenerateImages = async (segmentId: string, content: string) => {
    setRegeneratingImageForSeg(segmentId);
    try {
      const storyContent = story ? story.title + segments.slice(0, 5).map(s => s.content).join('') : '';
      // 收集前后各2段作为上下文
      const currentIdx = segments.findIndex(s => s.id === segmentId);
      const prevSegs = segments.slice(Math.max(0, currentIdx - 2), currentIdx).map(s => s.content);
      const nextSegs = segments.slice(currentIdx + 1, currentIdx + 3).map(s => s.content);

      const res = await fetch('/api/images/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          segmentId, segmentContent: content, style: imageStyle, storyContent,
          storyTitle: story?.title,
          storyDescription: story?.description,
          storyType: story?.genre,
          previousSegments: prevSegs,
          nextSegments: nextSegs,
        }),
      });
      if (!res.ok) throw new Error('图片生成失败');
      // 刷新段落列表以获取更新后的 imageUrls
      await loadBranchSegments(currentBranchId);
    } catch (e) {
      alert('图片生成失败: ' + (e instanceof Error ? e.message : '请重试'));
    } finally {
      setRegeneratingImageForSeg(null);
    }
  };

  // C6.7: Dynamic branch directions (混合方案：静态模板 + AI 生成)
  const handleBranch = async (segmentId: string) => {
    setBranchingSegmentId(segmentId);
    setUserDirection('');
    setCustomDirection('');

    // Phase 1: 立即展示 genre 对应的静态方向
    try {
      const charRes = await fetch(`/api/stories/${id}/characters`);
      let chars: Array<{ name: string; role: string }> = [];
      if (charRes.ok) {
        const raw = await charRes.json();
        const arr: Character[] = Array.isArray(raw) ? raw : (raw.characters || []);
        chars = arr.map(c => ({ name: c.name, role: c.role }));
      }
      setSuggestedDirections(getStaticBranchDirections(story?.genre, chars));
    } catch {
      setSuggestedDirections(getStaticBranchDirections('', []));
    }
    setShowBranchDialog(true);

    // Phase 2: 后台异步获取 AI 生成的精准建议
    setSuggestionsLoading(true);
    try {
      const res = await fetch(`/api/stories/${id}/branch-suggestions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segmentId, branchId: currentBranchId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.suggestions?.length > 0) {
          setSuggestedDirections(data.suggestions);
        }
      }
    } catch {
      // 静默失败，静态方向保持展示
    } finally {
      setSuggestionsLoading(false);
    }
  };

  const confirmBranch = async () => {
    if (!branchingSegmentId) return;
    const direction = customDirection.trim() || userDirection;
    if (!direction) { alert('请选择或输入分叉方向'); return; }

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
          userDirection: direction,
          visibility: (document.getElementById('fork-visibility') as HTMLSelectElement)?.value || 'PRIVATE',
          model: (document.getElementById('fork-model') as HTMLSelectElement)?.value || undefined,
        })
      });
      if (!res.ok) throw new Error('分叉失败');
      
      const data = await res.json();
      setBranchStep('saving');
      setBranchPreview(data.segment?.content || '分叉剧情已生成');
      await new Promise(r => setTimeout(r, 500));

      // 自动切换到新分支
      if (data.branch?.id) {
        setCurrentBranchId(data.branch.id);
      }
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
  };

  const handleDeleteBranch = async (branchId: string, branchLabel: string) => {
    if (branchId === 'main') return;
    const ok = confirm(`确定要删除分支「${branchLabel}」吗？\n该分支下的所有段落（包括从此分支再分叉的子分支）都将被永久删除，无法恢复。`);
    if (!ok) return;

    try {
      const res = await fetch(`/api/stories/${id}/branch/${branchId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || '删除失败');
      }

      // 若当前正在查看被删除的分支，先切回主线
      if (currentBranchId === branchId) {
        setCurrentBranchId('main');
      }
      await loadTree();
      await loadBranchSegments(currentBranchId === branchId ? 'main' : currentBranchId);
    } catch (e) {
      alert('删除分支失败: ' + (e instanceof Error ? e.message : '请重试'));
    }
  };

  const getCurrentBranchPath = () => {
    if (currentBranchId === 'main') return ['主线'];
    const branch = branches.find(b => b.id === currentBranchId);
    return branch ? [branch.userDirection || branch.title] : [currentBranchId];
  };

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

  const tailSegment = getTailSegment();

  const branchDialog = (
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
              {suggestedDirections.map((option) => (
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
              {suggestionsLoading && (
                <div className="flex items-center gap-2 px-4 py-2 text-xs text-[var(--muted)]">
                  <span className="inline-block w-3 h-3 border-2 border-[var(--gold)] border-t-transparent rounded-full animate-spin" />
                  AI 正在生成更精准的建议...
                </div>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-[var(--ink)] mb-2">✦ 自定义方向</label>
              <textarea
                value={customDirection}
                onChange={(e) => { setCustomDirection(e.target.value); if (e.target.value.trim()) setUserDirection(''); }}
                placeholder="例：如果荆轲选择不刺秦王，而是劝说秦王..."
                rows={2}
                className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--paper)] text-[var(--ink)] placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)] focus:border-transparent text-sm resize-none"
              />
            </div>

            {/* Fork visibility & model options */}
            <div className="flex items-center gap-4 mb-5 p-3 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <label className="block text-xs font-medium text-[var(--muted)] mb-1">可见性</label>
                <select
                  className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-300"
                  defaultValue="PRIVATE"
                  id="fork-visibility"
                >
                  <option value="PRIVATE">🔒 私有</option>
                  <option value="PUBLIC">🌐 公开</option>
                  <option value="UNLISTED">🔗 隐链</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-[var(--muted)] mb-1">AI 模型</label>
                <select
                  className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-300"
                  defaultValue=""
                  id="fork-model"
                >
                  <option value="">默认模型</option>
                  <option value="gpt-4o">GPT-4o</option>
                  <option value="gpt-4o-mini">GPT-4o Mini</option>
                  <option value="deepseek-chat">DeepSeek Chat</option>
                  <option value="glm-4">GLM-4</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowBranchDialog(false)} className="flex-1 px-4 py-2.5 rounded-lg border border-[var(--border)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-gray-50 transition-all text-sm">
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
      {/* C6 panels */}
      <CharacterPanel
        storyId={id}
        branchId={currentBranchId}
        segmentId={tailSegment?.id}
        isOpen={showCharacterPanel}
        onToggle={() => setShowCharacterPanel(!showCharacterPanel)}
      />
      <DirectorSidebar
        storyId={id}
        isOpen={showDirectorSidebar}
        onToggle={() => setShowDirectorSidebar(!showDirectorSidebar)}
      />

      {/* Top nav */}
      <nav className="sticky top-0 z-10 backdrop-blur-sm border-b border-[var(--border)]" style={{ background: 'rgba(250,246,240,0.9)' }}>
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm text-[var(--muted)] hover:text-[var(--ink)] transition-colors">
              ← 故事列表
            </Link>
            {/* C6: Panel toggles */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowCharacterPanel(!showCharacterPanel)}
                className={`p-1.5 rounded-lg text-xs transition-all ${showCharacterPanel ? 'bg-amber-100 text-amber-700' : 'text-[var(--muted)] hover:bg-gray-100'}`}
                title="角色面板"
              >🎭</button>
              <button
                onClick={() => setShowDirectorSidebar(!showDirectorSidebar)}
                className={`p-1.5 rounded-lg text-xs transition-all ${showDirectorSidebar ? 'bg-emerald-100 text-emerald-700' : 'text-[var(--muted)] hover:bg-gray-100'}`}
                title="导演模式"
              >🎬</button>
              <button
                onClick={() => setShowTimeline(!showTimeline)}
                className={`p-1.5 rounded-lg text-xs transition-all ${showTimeline ? 'bg-blue-100 text-blue-700' : 'text-[var(--muted)] hover:bg-gray-100'}`}
                title="时间轴"
              >⏳</button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm">
              <div className="flex items-center gap-1 text-[var(--muted)]">
                <span>当前路径:</span>
                <span className="text-[var(--gold)] font-medium">{getCurrentBranchPath().join(' → ')}</span>
              </div>
            </div>
            <h1 className="text-sm font-bold text-[var(--ink)] tracking-wider">{story.title}</h1>
            {isOwner && (
              <button
                onClick={() => setShowEditModal(true)}
                className="p-1.5 rounded-lg text-xs text-[var(--muted)] hover:bg-gray-100 transition-all"
                title="编辑故事信息"
              >✏️</button>
            )}
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
                  currentBranchId === 'main' ? 'bg-[var(--gold)] text-[var(--paper)]' : 'bg-[var(--border)] text-[var(--muted)] hover:bg-[var(--gold)]/20'
                }`}
              >主线</button>
              {branches.map((branch) => {
                const isActive = currentBranchId === branch.id;
                const label = branch.userDirection || branch.title;
                return (
                  <div
                    key={branch.id}
                    className={`group inline-flex items-center rounded-lg overflow-hidden transition-colors ${
                      isActive ? 'bg-[var(--accent)] text-white' : 'bg-[var(--border)] text-[var(--muted)] hover:bg-[var(--accent)]/20'
                    }`}
                  >
                    <button
                      onClick={() => switchBranch(branch.id)}
                      className="px-3 py-1.5 text-sm font-medium"
                      title={branch.userDirection}
                    >
                      <span className="truncate max-w-32 inline-block align-middle">{label}</span>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteBranch(branch.id, label); }}
                      className={`px-1.5 py-1.5 text-xs leading-none transition-opacity ${
                        isActive
                          ? 'text-white/80 hover:text-white hover:bg-black/15'
                          : 'opacity-0 group-hover:opacity-100 text-[var(--muted)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/10'
                      }`}
                      title="删除此分支"
                      aria-label={`删除分支 ${label}`}
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Story title */}
      <div className="max-w-3xl mx-auto px-6 pt-12 pb-8 text-center">
        <div className="divider-ornament mb-4"><span>✦</span></div>
        <h1 className="text-3xl md:text-4xl font-bold text-[var(--ink)] tracking-widest mb-3">{story.title}</h1>
        {story.description && <p className="text-[var(--muted)] text-sm">{story.description}</p>}
        {story.era && (
          <div className="mt-2">
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-50 text-amber-800 text-xs font-medium rounded-full border border-amber-200">
              📜 {story.era}
            </span>
          </div>
        )}
        {/* Social actions bar */}
        <div className="flex items-center justify-center gap-4 mt-4">
          <LikeButton targetId={id} type="story" initialLiked={story.isLiked || false} initialCount={story.likeCount || 0} />
          {isOwner && (
            <VisibilityToggle
              currentVisibility={(story as any).visibility || 'PRIVATE'}
              on_change={async (v) => {
                const res = await fetch(`/api/stories/${id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ ...editForm, visibility: v }),
                });
                if (res.ok) {
                  const data = await res.json();
                  setStory(data.story);
                  setEditForm((f: any) => ({ ...f, visibility: v }));
                } else {
                  const err = await res.json().catch(() => ({}));
                  alert(err.error || '修改可见性失败');
                }
              }}
            />
          )}
        </div>
      </div>

      {/* Story content */}
      <div className="max-w-3xl mx-auto px-6 pb-20">
        <div className="flex gap-6">
          {/* Main content */}
          <div className="flex-1 min-w-0">
            <div className="relative">
              <div className="absolute left-8 top-0 bottom-0 w-px bg-gradient-to-b from-[var(--gold)] via-[var(--border)] to-transparent" />

              <div className="space-y-8">
                {segments.map((seg, idx) => {
                  const branchCount = getBranchCountForSegment(seg.id);
                  return (
                    <div key={seg.id} className="relative pl-16 animate-fade-in-up" style={{ animationDelay: `${idx * 80}ms` }}>
                      <div className={`absolute left-6 top-2 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        seg.isBranchPoint ? 'border-[var(--accent)] bg-[var(--accent)] branch-pulse' : 'border-[var(--gold)] bg-[var(--paper)]'
                      }`}>
                        {seg.isBranchPoint && <span className="text-white text-xs">⚔</span>}
                      </div>

                      <div className="rounded-lg border border-[var(--border)] bg-white p-6 shadow-sm">
                        {currentBranchId !== 'main' && (
                          <div className="mb-3 flex items-center gap-2">
                            <span className="text-xs px-2 py-1 bg-[var(--accent)]/10 text-[var(--accent)] rounded-full border border-[var(--accent)]/30">分支</span>
                            {branches.find(b => b.id === currentBranchId)?.userDirection && (
                              <span className="text-xs text-[var(--muted)]">{branches.find(b => b.id === currentBranchId)?.userDirection}</span>
                            )}
                          </div>
                        )}
                        
                        {seg.title && (
                          <h3 className="text-lg font-bold text-[var(--ink)] mb-3 flex items-center gap-2">
                            <span className="text-[var(--gold)]">·</span>{seg.title}
                          </h3>
                        )}
                        <p className="prose-chinese text-[var(--ink)]">{seg.content}</p>

                        {/* P6-2: 段落插图 */}
                        <div className="mt-4">
                          {/* 图片风格选择器 */}
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className="text-xs text-[var(--muted)]">画风：</span>
                            {IMAGE_STYLES.map(s => (
                              <button
                                key={s.value}
                                onClick={() => setImageStyle(s.value)}
                                className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                                  imageStyle === s.value
                                    ? 'bg-[var(--gold)]/10 border-[var(--gold)] text-[var(--gold)] font-medium'
                                    : 'border-[var(--border)] text-[var(--muted)] hover:border-[var(--gold)]/50 hover:text-[var(--gold)]'
                                }`}
                              >
                                {s.label}
                                {styleRecommendation?.style === s.value && (
                                  <span className="ml-1 text-[10px]">⭐</span>
                                )}
                              </button>
                            ))}
                          </div>
                          {styleRecommendation && imageStyle === styleRecommendation.style && (
                            <p className="text-[10px] text-[var(--muted)] mb-2 italic">💡 {styleRecommendation.reason}</p>
                          )}
                          <StoryImageDisplay
                            segmentId={seg.id}
                            imageUrls={seg.imageUrls}
                            imagePrompts={seg.imagePrompts}
                            onRegenerate={() => handleRegenerateImages(seg.id, seg.content)}
                            isGenerating={regeneratingImageForSeg === seg.id}
                            maxWidth={640}
                            maxHeight={480}
                            showDescription={false}
                          />
                        </div>

                        {/* C6: Segment metadata */}
                        {seg.mood && (
                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-200">
                              氛围: {seg.mood}
                            </span>
                            {seg.narrativePace && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200">
                                节奏: {seg.narrativePace}
                              </span>
                            )}
                          </div>
                        )}

                        {seg.isBranchPoint && branchCount > 0 && (
                          <div className="mt-4 pt-3 border-t border-dashed border-[var(--border)]">
                            <p className="text-xs text-[var(--accent)] font-medium flex items-center gap-1">
                              ⚔ 此处有 {branchCount} 条分叉路线
                            </p>
                          </div>
                        )}

                        <div className="mt-4 pt-3 border-t border-[var(--border)]/50 flex justify-between">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => { setEditingSegmentId(seg.id); setEditingContent(seg.content); setEditingTitle(seg.title || ''); }}
                              className="p-1.5 text-xs text-[var(--muted)] hover:text-[var(--gold)] hover:bg-[var(--gold)]/5 rounded-lg transition-all"
                              title="编辑段落"
                            >✏️</button>
                            <button
                              onClick={() => handleRegenerateImages(seg.id, seg.content)}
                              disabled={regeneratingImageForSeg === seg.id}
                              className={`p-1.5 text-xs rounded-lg transition-all ${
                                regeneratingImageForSeg === seg.id
                                  ? 'text-[var(--gold)] animate-pulse cursor-wait'
                                  : 'text-[var(--muted)] hover:text-[var(--gold)] hover:bg-[var(--gold)]/5'
                              }`}
                              title="重新生成图片"
                            >🖼️</button>
                            {idx > 0 && (
                              <button
                                onClick={async () => {
                                  if (!confirm(`确定删除这段内容吗？后续段落将重新链接到上一段。`)) return;
                                  try {
                                    const res = await fetch(`/api/stories/${id}/segments?segmentId=${seg.id}`, { method: 'DELETE' });
                                    if (res.ok) {
                                      loadBranchSegments(currentBranchId);
                                    } else {
                                      const data = await res.json();
                                      alert(data.error || '删除失败');
                                    }
                                  } catch { alert('删除失败'); }
                                }}
                                className="p-1.5 text-xs text-[var(--muted)] hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                title="删除段落"
                              >🗑️</button>
                            )}
                          </div>
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

                {/* C6.6: Line-stepped streaming */}
                {newContent && (
                  <div className="relative pl-16 animate-fade-in-up">
                    <div className="absolute left-6 top-2 w-5 h-5 rounded-full border-2 border-blue-400 bg-blue-50 flex items-center justify-center">
                      <span className="text-blue-500 text-xs">✦</span>
                    </div>
                    <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-6 shadow-sm">
                      {displayedLines.slice(0, lineStep).map((line, i) => (
                        <p key={i} className="prose-chinese text-[var(--ink)]">{line}</p>
                      ))}
                      
                      {/* Paused indicator */}
                      {isPaused && lineStep < displayedLines.length && (
                        <div className="mt-3 flex items-center gap-2 text-xs text-amber-600 bg-amber-50 rounded px-3 py-1.5">
                          <span>⏸</span> 已暂停 · 还有 {displayedLines.length - lineStep} 行未显示
                          <button onClick={advanceLines} className="ml-auto px-2 py-0.5 bg-amber-100 rounded text-amber-700 hover:bg-amber-200">
                            显示更多
                          </button>
                        </div>
                      )}

                      {/* Auto-advance indicator */}
                      {!isPaused && continuing && lineStep < displayedLines.length && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-blue-500">
                          <span className="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                          显示中 {lineStep}/{displayedLines.length}
                        </div>
                      )}

                      {!continuing && lineStep < displayedLines.length && !isPaused && (
                        <div className="mt-2">
                          <button onClick={advanceLines} className="text-xs text-blue-500 hover:text-blue-700">
                            显示更多 ({displayedLines.length - lineStep} 行剩余)
                          </button>
                        </div>
                      )}

                      {continuing && (
                        <span className="inline-block w-0.5 h-5 bg-[var(--ink)] animate-pulse ml-0.5 align-text-bottom" />
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Pacing controls — always visible when segments exist, before the continue button */}
            {segments.length > 0 && (
              <div className="mt-8">
                <PacingControls
                  config={pacingConfig}
                  onChange={setPacingConfig}
                  onPause={handlePause}
                  onResume={handleResume}
                  isPaused={isPaused}
                  isContinuing={continuing}
                />
              </div>
            )}

            {/* Bottom action bar */}
            {segments.length > 0 && (
              <div className="mt-6 text-center">
                <div className="divider-ornament mb-6"><span>✦</span></div>
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
                    <><span className="inline-block w-4 h-4 border-2 border-[var(--muted)] border-t-transparent rounded-full animate-spin" />故事书写中...</>
                  ) : (
                    <>✦ 续写故事</>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* C6: Timeline sidebar (inline on desktop) */}
          {showTimeline && (
            <div className="hidden lg:block w-64 shrink-0">
              <div className="sticky top-36 rounded-xl border border-[var(--border)] bg-white p-4 shadow-sm">
                <TimelineBar
                  storyId={id}
                  branchId={currentBranchId}
                  currentSegmentId={tailSegment?.id}
                  segments={segments}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {showBranchDialog && branchDialog}

      {/* 评论区 */}
      <div className="max-w-3xl mx-auto px-6">
        <CommentSection storyId={id} branchId={currentBranchId !== 'main' ? currentBranchId : undefined} />
      </div>

      {/* 编辑故事信息弹窗 */}
      {isOwner && showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowEditModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-[var(--ink)] mb-4">编辑故事信息</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">标题</label>
                <input
                  value={editForm.title}
                  onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <textarea
                  value={editForm.description}
                  onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">类型</label>
                  <select
                    value={editForm.genre}
                    onChange={e => setEditForm(f => ({ ...f, genre: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                  >
                    <option value="">自动识别</option>
                    <option value="正史">正史</option>
                    <option value="演义">演义</option>
                    <option value="同人">同人</option>
                    <option value="架空">架空</option>
                    <option value="玄幻">玄幻</option>
                    <option value="仙侠">仙侠</option>
                    <option value="穿越">穿越</option>
                    <option value="武侠">武侠</option>
                    <option value="奇幻">奇幻</option>
                    <option value="科幻">科幻</option>
                    <option value="末世">末世</option>
                    <option value="悬疑">悬疑</option>
                    <option value="都市">都市</option>
                    <option value="军事">军事</option>
                    <option value="现代">现代</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">时代</label>
                  <input
                    value={editForm.era}
                    onChange={e => setEditForm(f => ({ ...f, era: e.target.value }))}
                    placeholder="如：战国、三国"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">作者</label>
                <input
                  value={editForm.author}
                  onChange={e => setEditForm(f => ({ ...f, author: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">可见性</label>
                <select
                  value={editForm.visibility}
                  onChange={e => setEditForm(f => ({ ...f, visibility: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                >
                  <option value="PRIVATE">🔒 私有 — 仅自己可见</option>
                  <option value="UNLISTED">🔗 隐链 — 有链接即可访问</option>
                  <option value="PUBLIC">🌐 公开 — 所有人可见</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >取消</button>
              <button
                onClick={async () => {
                  setSaving(true);
                  try {
                    const res = await fetch(`/api/stories/${id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(editForm),
                    });
                    if (res.ok) {
                      const data = await res.json();
                      setStory(data.story);
                      setShowEditModal(false);
                    } else {
                      alert('保存失败');
                    }
                  } catch { alert('保存失败'); }
                  finally { setSaving(false); }
                }}
                disabled={saving}
                className="px-4 py-2 text-sm bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition-colors disabled:opacity-50"
              >{saving ? '保存中...' : '保存'}</button>
            </div>
          </div>
        </div>
      )}

      {/* 段落编辑弹窗 */}
      {editingSegmentId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setEditingSegmentId(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 p-6 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-[var(--ink)] mb-4">编辑段落</h2>
            <div className="space-y-4 flex-1 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">标题</label>
                <input
                  value={editingTitle}
                  onChange={e => setEditingTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">内容</label>
                <textarea
                  value={editingContent}
                  onChange={e => setEditingContent(e.target.value)}
                  rows={12}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setEditingSegmentId(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >取消</button>
              <button
                onClick={async () => {
                  if (!editingContent.trim()) { alert('内容不能为空'); return; }
                  setSavingSegment(true);
                  try {
                    const res = await fetch(`/api/stories/${id}/segments?segmentId=${editingSegmentId}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ content: editingContent, title: editingTitle }),
                    });
                    if (res.ok) {
                      setEditingSegmentId(null);
                      loadBranchSegments(currentBranchId);
                    } else {
                      alert('保存失败');
                    }
                  } catch { alert('保存失败'); }
                  finally { setSavingSegment(false); }
                }}
                disabled={savingSegment || !editingContent.trim()}
                className="px-4 py-2 text-sm bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition-colors disabled:opacity-50"
              >{savingSegment ? '保存中...' : '保存'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
