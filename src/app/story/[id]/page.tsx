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
  order: number;
  isBranchPoint: boolean;
  storyId: string;
  imageUrls: string[];
}

export default function StoryDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [story, setStory] = useState<Story | null>(null);
  const [segments, setSegments] = useState<StorySegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [continuing, setContinuing] = useState(false);
  const [newContent, setNewContent] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [sRes, segRes] = await Promise.all([
          fetch(`/api/stories/${id}`),
          fetch(`/api/stories/${id}/segments`)
        ]);
        if (!sRes.ok || !segRes.ok) throw new Error('加载失败');
        const sData = await sRes.json();
        const segData = await segRes.json();
        setStory(sData.story);
        setSegments((segData.segments || []).sort((a: StorySegment, b: StorySegment) => a.order - b.order));
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
    const lastSeg = segments[segments.length - 1];
    setContinuing(true);
    setNewContent('');

    try {
      const res = await fetch(`/api/stories/${id}/stream-continue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segmentId: lastSeg.id })
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
        setSegments((segData.segments || []).sort((a: StorySegment, b: StorySegment) => a.order - b.order));
        setNewContent('');
      }
    } catch (e) {
      alert('续写失败: ' + (e instanceof Error ? e.message : '请重试'));
    } finally {
      setContinuing(false);
    }
  };

  const handleBranch = async (segmentId: string) => {
    try {
      const res = await fetch(`/api/stories/${id}/branch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segmentId })
      });
      if (!res.ok) throw new Error('分叉失败');
      const segRes = await fetch(`/api/stories/${id}/segments`);
      if (segRes.ok) {
        const segData = await segRes.json();
        setSegments((segData.segments || []).sort((a: StorySegment, b: StorySegment) => a.order - b.order));
      }
    } catch (e) {
      alert('分叉失败: ' + (e instanceof Error ? e.message : '请重试'));
    }
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

  return (
    <div className="min-h-screen" style={{ background: 'var(--paper)' }}>
      {/* 顶部导航 */}
      <nav className="sticky top-0 z-10 backdrop-blur-sm border-b border-[var(--border)]" style={{ background: 'rgba(250,246,240,0.9)' }}>
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/" className="text-sm text-[var(--muted)] hover:text-[var(--ink)] transition-colors flex items-center gap-1">
            ← 故事列表
          </Link>
          <h1 className="text-sm font-bold text-[var(--ink)] tracking-wider">{story.title}</h1>
          <span className="w-16" />
        </div>
      </nav>

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
    </div>
  );
}
