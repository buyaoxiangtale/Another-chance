'use client';

import { useState, useEffect } from 'react';
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

interface TreeNode {
  id: string;
  title?: string;
  content?: string;
  isBranchPoint: boolean;
  branchId: string;
  branchTitle?: string;
  isBranch?: boolean;
  children: TreeNode[];
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
  const [tree, setTree] = useState<TreeNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [continuing, setContinuing] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [currentBranchId, setCurrentBranchId] = useState('main');
  const [showBranchDialog, setShowBranchDialog] = useState(false);
  const [branchingSegmentId, setBranchingSegmentId] = useState<string | null>(null);
  const [userDirection, setUserDirection] = useState('');
  const [customDirection, setCustomDirection] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [sRes, segRes, treeRes] = await Promise.all([
          fetch(`/api/stories/${id}`),
          fetch(`/api/stories/${id}/segments`),
          fetch(`/api/stories/${id}/tree`)
        ]);
        if (!sRes.ok || !segRes.ok || !treeRes.ok) throw new Error('加载失败');
        
        const sData = await sRes.json();
        const segData = await segRes.json();
        const treeData = await treeRes.json();
        
        setStory(sData.story);
        setSegments(segData.segments || []);
        setBranches(treeData.branches || []);
        setTree(treeData.tree);
        
        // 默认显示主线
        if (treeData.tree) {
          setCurrentBranchId('main');
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : '未知错误');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const handleContinue = async () => {
    if (!segments.length || continuing) return;
    const currentSegment = segments.find(s => s.branchId === currentBranchId);
    if (!currentSegment) return;
    
    setContinuing(true);
    setNewContent('');

    try {
      const res = await fetch(`/api/stories/${id}/stream-continue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          segmentId: currentSegment.id,
          branchId: currentBranchId 
        })
      });

      if (!res.ok) throw new Error('续写失败');
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let full = '';

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        // Parse SSE
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

      // Reload segments after completion
      const segRes = await fetch(`/api/stories/${id}/segments`);
      if (segRes.ok) {
        const segData = await segRes.json();
        setSegments(segData.segments || []);
        setNewContent('');
      }
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

    try {
      const res = await fetch(`/api/stories/${id}/branch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          segmentId: branchingSegmentId,
          userDirection: direction
        })
      });
      if (!res.ok) throw new Error('分叉失败');
      
      // Refresh data
      const segRes = await fetch(`/api/stories/${id}/segments`);
      const treeRes = await fetch(`/api/stories/${id}/tree`);
      
      if (segRes.ok && treeRes.ok) {
        const segData = await segRes.json();
        const treeData = await treeRes.json();
        setSegments(segData.segments || []);
        setBranches(treeData.branches || []);
        setTree(treeData.tree);
      }
      
      setShowBranchDialog(false);
      setBranchingSegmentId(null);
    } catch (e) {
      alert('分叉失败: ' + (e instanceof Error ? e.message : '请重试'));
    }
  };

  const switchBranch = (branchId: string, branchTitle?: string) => {
    setCurrentBranchId(branchId);
    // Filter segments for this branch
    const branchSegments = segments.filter(s => s.branchId === branchId);
    if (branchSegments.length > 0) {
      // Sort by parentSegmentId to maintain order
      const sortedSegments = [...branchSegments].sort((a, b) => {
        if (a.parentSegmentId === b.parentSegmentId) return 0;
        if (!a.parentSegmentId) return -1;
        if (!b.parentSegmentId) return 1;
        return 0; // Simple sort for now
      });
      setSegments(sortedSegments);
    }
  };

  const getCurrentBranchPath = () => {
    if (currentBranchId === 'main') return ['主线'];
    
    const branch = branches.find(b => b.id === currentBranchId);
    if (branch) {
      const segment = segments.find(s => s.id === branch.sourceSegmentId);
      const segmentTitle = segment?.title || '段落';
      return [segmentTitle, branch.userDirection || branch.title];
    }
    return [currentBranchId];
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

  // Branch Dialog Component
  const BranchDialog = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl border border-[var(--border)] p-6 max-w-md w-full mx-4 shadow-xl">
        <h3 className="text-lg font-bold text-[var(--ink)] mb-4">选择分叉方向</h3>
        
        <div className="space-y-3 mb-6">
          {['加强战争策略', '转向外交途径', '专注内政发展', '寻求盟友帮助'].map((option) => (
            <button
              key={option}
              onClick={() => setUserDirection(option)}
              className={`w-full text-left px-4 py-2 rounded-lg border transition-colors ${
                userDirection === option
                  ? 'border-[var(--accent)] bg-red-50 text-[var(--accent)]'
                  : 'border-[var(--border)] hover:border-[var(--gold)]/50'
              }`}
            >
              {option}
            </button>
          ))}
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-[var(--ink)] mb-2">自定义方向</label>
          <input
            type="text"
            value={customDirection}
            onChange={(e) => {
              setCustomDirection(e.target.value);
              setUserDirection('');
            }}
            placeholder="输入你想要的故事发展方向..."
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--paper)] text-[var(--ink)] placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)] focus:border-transparent"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setShowBranchDialog(false)}
            className="flex-1 px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
          >
            取消
          </button>
          <button
            onClick={confirmBranch}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-[var(--accent)] to-red-700 text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            生成分叉
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: 'var(--paper)' }}>
      {/* 顶部导航 */}
      <nav className="sticky top-0 z-10 backdrop-blur-sm border-b border-[var(--border)]" style={{ background: 'rgba(250,246,240,0.9)' }}>
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/" className="text-sm text-[var(--muted)] hover:text-[var(--ink)] transition-colors flex items-center gap-1">
            ← 故事列表
          </Link>
          <div className="flex items-center gap-3">
            {/* 分支路径显示 */}
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

      {/* 分支切换栏 */}
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
              {branches.map((branch) => {
                const segment = segments.find(s => s.id === branch.sourceSegmentId);
                const segmentTitle = segment?.title || '段落';
                return (
                  <button
                    key={branch.id}
                    onClick={() => switchBranch(branch.id, branch.title)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      currentBranchId === branch.id
                        ? 'bg-[var(--accent)] text-white'
                        : 'bg-[var(--border)] text-[var(--muted)] hover:bg-[var(--accent)]/20'
                    }`}
                    title={branch.userDirection}
                  >
                    <span className="truncate max-w-32">
                      {segmentTitle} → {branch.userDirection || branch.title}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 故事标题区 */}
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

      {/* 故事正文 - 卷轴风格 */}
      <div className="max-w-3xl mx-auto px-6 pb-20">
        <div className="relative">
          {/* 左侧装饰线 */}
          <div className="absolute left-8 top-0 bottom-0 w-px bg-gradient-to-b from-[var(--gold)] via-[var(--border)] to-transparent" />

          <div className="space-y-8">
            {segments.map((seg, idx) => (
              <div key={seg.id} className="relative pl-16 animate-fade-in-up" style={{ animationDelay: `${idx * 80}ms` }}>
                {/* 时间线节点 */}
                <div className={`absolute left-6 top-2 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  seg.isBranchPoint
                    ? 'border-[var(--accent)] bg-[var(--accent)] branch-pulse'
                    : 'border-[var(--gold)] bg-[var(--paper)]'
                }`}>
                  {seg.isBranchPoint && <span className="text-white text-xs">⚔</span>}
                </div>

                {/* 段落卡片 */}
                <div className="rounded-lg border border-[var(--border)] bg-white p-6 shadow-sm">
                  {/* 分支标识 */}
                  {seg.branchId !== 'main' && (
                    <div className="mb-3 flex items-center gap-2">
                      <span className="text-xs px-2 py-1 bg-[var(--accent)]/10 text-[var(--accent)] rounded-full border border-[var(--accent)]/30">
                        分支
                      </span>
                      {seg.branchId && branches.find(b => b.id === seg.branchId)?.userDirection && (
                        <span className="text-xs text-[var(--muted)]">
                          {branches.find(b => b.id === seg.branchId)?.userDirection}
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

                  {/* 分叉点操作 */}
                  {seg.isBranchPoint && (
                    <div className="mt-4 pt-4 border-t border-dashed border-[var(--border)]">
                      <p className="text-xs text-[var(--accent)] font-medium mb-2 flex items-center gap-1">
                        ⚔ 关键分叉点 — 选择不同的历史走向
                      </p>
                      <button
                        onClick={() => handleBranch(seg.id)}
                        className="px-4 py-2 text-sm bg-gradient-to-r from-[var(--accent)] to-red-700 text-white rounded-lg hover:opacity-90 transition-opacity"
                      >
                        生成分叉剧情
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* 流式新内容 */}
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

        {/* 底部操作栏 */}
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

      {/* Branch Dialog */}
      {showBranchDialog && <BranchDialog />}
    </div>
  );
}
