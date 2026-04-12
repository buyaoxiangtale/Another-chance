'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Story {
  id: string;
  title: string;
  description?: string;
  author?: string;
  createdAt: string;
  updatedAt: string;
  totalSegments?: number;
  totalBranches?: number;
  latestBranch?: {
    id: string;
    title: string;
    userDirection: string;
    createdAt: string;
  };
}

function StoryCard({ story, index }: { story: Story; index: number }) {
  const eraMap: Record<string, { era: string; icon: string; gradient: string }> = {
    '荆轲刺秦王': { era: '战国', icon: '🗡️', gradient: 'from-amber-800 to-red-900' },
    '赤壁之战': { era: '三国', icon: '🔥', gradient: 'from-blue-800 to-indigo-900' },
    '玄武门之变': { era: '唐', icon: '⚔️', gradient: 'from-emerald-800 to-teal-900' },
  };
  const meta = eraMap[story.title] || { era: '历史', icon: '📜', gradient: 'from-gray-700 to-gray-900' };

  return (
    <Link href={`/story/${story.id}`} className="block animate-fade-in-up" style={{ animationDelay: `${index * 100}ms` }}>
      <div className="story-card rounded-xl overflow-hidden">
        {/* 顶部装饰条 */}
        <div className={`h-2 bg-gradient-to-r ${meta.gradient}`} />
        <div className="p-6">
          {/* 朝代标签 */}
          <div className="flex items-center justify-between mb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 text-sm font-medium rounded-full border border-amber-200">
              <span>{meta.icon}</span>
              {meta.era}
            </span>
            <span className="text-xs text-[var(--muted)]">
              {new Date(story.createdAt).toLocaleDateString('zh-CN')}
            </span>
          </div>

          {/* 标题 */}
          <h3 className="text-xl font-bold text-[var(--ink)] mb-2 tracking-wide">
            {story.title}
          </h3>

          {/* 描述 */}
          {story.description && (
            <p className="text-sm text-[var(--muted)] leading-relaxed mb-4 line-clamp-2">
              {story.description}
            </p>
          )}

          {/* 统计信息 */}
          <div className="flex items-center gap-4 mb-4 text-sm">
            <div className="flex items-center gap-1 text-[var(--muted)]">
              <span>📝</span>
              <span>{story.totalSegments || 0} 段落</span>
            </div>
            {story.totalBranches && story.totalBranches > 0 && (
              <div className="flex items-center gap-1 text-[var(--accent)]">
                <span>🌿</span>
                <span>{story.totalBranches} 分支</span>
              </div>
            )}
          </div>

          {/* 最新分支信息 */}
          {story.latestBranch && (
            <div className="mb-4 p-3 bg-red-50/30 border border-red-200/50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-[var(--accent)]">最新分支</span>
                <span className="text-xs text-[var(--muted)]">
                  {new Date(story.latestBranch.createdAt).toLocaleDateString('zh-CN')}
                </span>
              </div>
              <p className="text-xs text-[var(--accent)] font-medium line-clamp-1">
                {story.latestBranch.userDirection || story.latestBranch.title}
              </p>
            </div>
          )}

          {/* 底部 */}
          <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
            <span className="text-xs text-[var(--muted)]">
              {story.author || '佚名'}
            </span>
            <span className="text-sm text-[var(--gold)] font-medium flex items-center gap-1">
              开始阅读 →
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="animate-pulse rounded-xl border border-[var(--border)] overflow-hidden">
          <div className="h-2 bg-gray-200" />
          <div className="p-6 space-y-4">
            <div className="h-6 bg-gray-200 rounded w-16" />
            <div className="h-6 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-200 rounded w-full" />
            <div className="h-4 bg-gray-200 rounded w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStories = async () => {
      try {
        const storiesRes = await fetch('/api/stories');
        if (!storiesRes.ok) throw new Error('加载故事列表失败');
        const storiesData = await storiesRes.json();
        
        // 为每个故事获取详细信息
        const storiesWithDetails = await Promise.all(
          (storiesData.stories || []).map(async (story: Story) => {
            try {
              const segmentsRes = await fetch(`/api/stories/${story.id}/segments`);
              const treeRes = await fetch(`/api/stories/${story.id}/tree`);
              
              const segmentsData = await segmentsRes.json();
              const treeData = await treeRes.json();
              
              return {
                ...story,
                totalSegments: segmentsData.segments?.length || 0,
                totalBranches: treeData.branches?.length || 0,
                latestBranch: treeData.branches?.length > 0 
                  ? treeData.branches[treeData.branches.length - 1]
                  : null
              };
            } catch {
              return story; // 如果获取详细信息失败，返回基本信息
            }
          })
        );
        
        setStories(storiesWithDetails);
      } catch (e) {
        setError('加载故事列表失败');
      } finally {
        setLoading(false);
      }
    };
    
    loadStories();
  }, []);

  return (
    <div className="min-h-screen" style={{ background: 'var(--paper)' }}>
      {/* Hero 区域 */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-900/5 via-transparent to-red-900/5" />
        <div className="relative max-w-5xl mx-auto px-6 pt-16 pb-12 text-center">
          {/* 标题装饰 */}
          <div className="divider-ornament mb-6">
            <span>卷</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold text-[var(--ink)] mb-4 tracking-[0.1em]">
            古事
          </h1>

          <p className="text-lg text-[var(--muted)] max-w-xl mx-auto leading-relaxed mb-2">
            以史为鉴，以文为镜
          </p>
          <p className="text-sm text-[var(--muted)] max-w-lg mx-auto leading-relaxed">
            选择历史关键转折点，探索不同走向，体验分叉剧情的无限可能
          </p>

          <div className="mt-8">
            <Link
              href="/create"
              className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-amber-700 to-red-800 text-white rounded-full font-medium hover:from-amber-800 hover:to-red-900 transition-all shadow-lg hover:shadow-xl"
            >
              ✦ 创建新故事
            </Link>
          </div>
        </div>
      </div>

      {/* 故事列表 */}
      <div className="max-w-5xl mx-auto px-6 pb-20">
        <div className="flex items-center gap-4 mb-8">
          <h2 className="text-2xl font-bold text-[var(--ink)] tracking-wide">故事长卷</h2>
          <div className="flex-1 h-px bg-gradient-to-r from-[var(--border)] to-transparent" />
        </div>

        {loading && <LoadingSkeleton />}

        {error && (
          <div className="text-center py-16">
            <p className="text-[var(--muted)] mb-4">{error}</p>
            <button onClick={() => window.location.reload()} className="text-[var(--gold)] hover:underline">
              重新加载
            </button>
          </div>
        )}

        {!loading && !error && stories.length === 0 && (
          <div className="text-center py-16">
            <p className="text-4xl mb-4">📜</p>
            <p className="text-[var(--muted)] mb-4">暂无故事，开启你的第一段历史旅程</p>
            <Link href="/create" className="text-[var(--gold)] hover:underline">
              创建第一个故事 →
            </Link>
          </div>
        )}

        {!loading && !error && stories.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {stories.map((story, i) => (
              <StoryCard key={story.id} story={story} index={i} />
            ))}
          </div>
        )}
      </div>

      {/* 页脚 */}
      <footer className="border-t border-[var(--border)] py-8 text-center">
        <p className="text-xs text-[var(--muted)]">
          © 2026 古事 · 分叉故事续写平台
        </p>
      </footer>
    </div>
  );
}
