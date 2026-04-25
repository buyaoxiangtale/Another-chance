'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import LikeButton from '@/components/social/LikeButton';
import { STORY_CATEGORY_TABS } from '@/lib/genre-config';

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
  era?: string;
  genre?: string;
  storyType?: string;
  characterCount?: number;
  visibility?: string;
  ownerId?: string;
  isLiked?: boolean;
  coverImageUrl?: string;
  _count?: { segments: number; likes: number; comments: number; branches: number };
}

function StoryCard({ story, index, onDelete, currentUserId }: { story: Story; index: number; onDelete: (id: string) => void; currentUserId?: string }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [imgError, setImgError] = useState(false);
  const isOwner = currentUserId && story.ownerId === currentUserId;

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`确定要删除故事「${story.title}」吗？此操作不可恢复。`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/stories/${story.id}`, { method: 'DELETE' });
      if (res.ok) {
        onDelete(story.id);
      } else {
        const data = await res.json();
        alert(data.error || '删除失败');
      }
    } catch {
      alert('删除失败');
    } finally {
      setDeleting(false);
      setMenuOpen(false);
    }
  };

  const eraMap: Record<string, { era: string; icon: string; gradient: string }> = {
    '荆轲刺秦王': { era: '战国', icon: '🗡️', gradient: 'from-amber-800 to-red-900' },
    '赤壁之战': { era: '三国', icon: '🔥', gradient: 'from-blue-800 to-indigo-900' },
    '玄武门之变': { era: '唐', icon: '⚔️', gradient: 'from-emerald-800 to-teal-900' },
  };
  const meta = eraMap[story.title] || {
    era: story.era || '历史',
    icon: story.era ? '📜' : '📜',
    gradient: 'from-gray-700 to-gray-900'
  };

  const hasCover = story.coverImageUrl && !imgError;

  return (
    <Link href={`/story/${story.id}`} className="block animate-fade-in-up" style={{ animationDelay: `${index * 100}ms` }}>
      <div className="story-card rounded-xl overflow-hidden">
        <div className="flex">
          {/* 左侧封面图 - 番茄小说风格 */}
          <div className="relative w-28 shrink-0">
            {hasCover ? (
              <img
                src={story.coverImageUrl}
                alt={story.title}
                className="w-full h-full object-cover"
                style={{ minHeight: '180px' }}
                onError={() => setImgError(true)}
              />
            ) : (
              <div className={`w-full h-full bg-gradient-to-br ${meta.gradient} flex flex-col items-center justify-center p-2`} style={{ minHeight: '180px' }}>
                <span className="text-3xl mb-2">{meta.icon}</span>
                <span className="text-white text-xs font-bold text-center leading-tight px-1 line-clamp-3">{story.title}</span>
                <span className="text-white/60 text-[10px] mt-1">{meta.era}</span>
              </div>
            )}
            {/* 封面底部遮罩渐变 */}
            {hasCover && (
              <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/40 to-transparent" />
            )}
          </div>

          {/* 右侧故事信息 */}
          <div className="flex-1 p-4 min-w-0 flex flex-col">
            {/* 顶部：标题 + 菜单 */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="text-lg font-bold text-[var(--ink)] tracking-wide leading-tight line-clamp-2">{story.title}</h3>
              <div className="relative shrink-0">
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen(!menuOpen); }}
                  className="p-1 text-[var(--muted)] hover:text-[var(--ink)] rounded transition-colors"
                  title="更多操作"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <circle cx="8" cy="3" r="1.5"/><circle cx="8" cy="8" r="1.5"/><circle cx="8" cy="13" r="1.5"/>
                  </svg>
                </button>
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen(false); }} />
                    <div className="absolute right-0 top-full mt-1 z-20 w-36 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                      <Link
                        href={`/story/${story.id}?edit=true`}
                        onClick={(e) => e.stopPropagation()}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        ✏️ 编辑信息
                      </Link>
                      <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        {deleting ? '删除中...' : '🗑️ 删除故事'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* 描述 */}
            {story.description && (
              <p className="text-xs text-[var(--muted)] leading-relaxed mb-2 line-clamp-2">{story.description}</p>
            )}

            {/* 标签 */}
            <div className="flex items-center gap-1.5 mb-2 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-medium rounded-full border border-amber-200">
                <span>{meta.icon}</span>{meta.era}
              </span>
              {story.genre && (
                <span className="text-[10px] px-2 py-0.5 bg-purple-50 text-purple-600 rounded-full border border-purple-200">
                  {story.genre}
                </span>
              )}
              {story.visibility === 'PRIVATE' && (
                <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full border border-gray-200">🔒 私有</span>
              )}
              {story.visibility === 'UNLISTED' && (
                <span className="text-[10px] px-2 py-0.5 bg-yellow-50 text-yellow-600 rounded-full border border-yellow-200">🔗 隐链</span>
              )}
            </div>

            {/* 统计数据 */}
            <div className="flex items-center gap-3 text-[11px] text-[var(--muted)] mb-auto">
              <span className="flex items-center gap-0.5">📝 {story.totalSegments || 0} 段</span>
              {story.characterCount !== undefined && story.characterCount > 0 && (
                <span className="flex items-center gap-0.5 text-amber-600">🎭 {story.characterCount} 角色</span>
              )}
              {story.totalBranches && story.totalBranches > 0 && (
                <span className="flex items-center gap-0.5 text-[var(--accent)]">🌿 {story.totalBranches} 分支</span>
              )}
            </div>

            {/* 底部操作栏 */}
            <div className="flex items-center justify-between pt-2 mt-2 border-t border-[var(--border)]">
              <div className="flex items-center gap-2">
                <LikeButton
                  targetId={story.id}
                  type="story"
                  size="sm"
                  initialLiked={story.isLiked || false}
                  initialCount={story._count?.likes || 0}
                />
                {story._count?.comments && story._count.comments > 0 && (
                  <span className="text-[10px] text-[var(--muted)]">💬 {story._count.comments}</span>
                )}
              </div>
              <span className="text-xs text-[var(--gold)] font-medium">开始阅读 →</span>
            </div>
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
          <div className="flex">
            <div className="w-28 bg-gray-200 shrink-0" style={{ minHeight: '180px' }} />
            <div className="flex-1 p-4 space-y-3">
              <div className="h-5 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-200 rounded w-full" />
              <div className="h-3 bg-gray-200 rounded w-2/3" />
              <div className="flex gap-2">
                <div className="h-4 bg-gray-200 rounded w-12" />
                <div className="h-4 bg-gray-200 rounded w-10" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  const { data: session, status: sessionStatus } = useSession();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'all' | 'mine'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const handleDeleteStory = (storyId: string) => {
    setStories(prev => prev.filter(s => s.id !== storyId));
  };

  useEffect(() => {
    const loadStories = async () => {
      try {
        // C6.8: Single API call instead of N+1
        const storiesRes = await fetch('/api/stories');
        if (!storiesRes.ok) throw new Error('加载故事列表失败');
        const storiesData = await storiesRes.json();
        const rawStories = storiesData.stories || [];

        // C6.8: Batch fetch details — use Promise.all but with a combined endpoint if available
        // For backward compat, still fetch per story but batch in parallel
        const storiesWithDetails = await Promise.all(
          rawStories.map(async (story: Story) => {
            try {
              const [segmentsRes, treeRes, charRes] = await Promise.all([
                fetch(`/api/stories/${story.id}/segments`),
                fetch(`/api/stories/${story.id}/tree`),
                fetch(`/api/stories/${story.id}/characters`).catch(() => null),
              ]);
              
              const segmentsData = await segmentsRes.json();
              const treeData = await treeRes.json();
              let characterCount = 0;
              if (charRes && charRes.ok) {
                const charData = await charRes.json();
                characterCount = Array.isArray(charData) ? charData.length : (charData.characters?.length || 0);
              }
              
              return {
                ...story,
                totalSegments: segmentsData.segments?.length || 0,
                totalBranches: treeData.branches?.length || 0,
                latestBranch: treeData.branches?.length > 0 
                  ? treeData.branches[treeData.branches.length - 1]
                  : null,
                characterCount,
              };
            } catch {
              return story;
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
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-900/5 via-transparent to-red-900/5" />
        <div className="relative max-w-5xl mx-auto px-6 pt-16 pb-12 text-center">
          <div className="divider-ornament mb-6"><span>卷</span></div>
          <h1 className="text-5xl md:text-6xl font-bold text-[var(--ink)] mb-4 tracking-[0.1em]">古事</h1>
          <p className="text-lg text-[var(--muted)] max-w-xl mx-auto leading-relaxed mb-2">以史为鉴，以文为镜</p>
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

      <div className="max-w-5xl mx-auto px-6 pb-20">
        <div className="flex items-center gap-4 mb-4">
          <h2 className="text-2xl font-bold text-[var(--ink)] tracking-wide">故事长卷</h2>
          <div className="flex-1 h-px bg-gradient-to-r from-[var(--border)] to-transparent" />
          {session?.user && (
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setTab('all')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${tab === 'all' ? 'bg-white text-[var(--ink)] shadow-sm' : 'text-[var(--muted)] hover:text-[var(--ink)]'}`}
              >
                全部
              </button>
              <button
                onClick={() => setTab('mine')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${tab === 'mine' ? 'bg-white text-[var(--ink)] shadow-sm' : 'text-[var(--muted)] hover:text-[var(--ink)]'}`}
              >
                我的故事
              </button>
            </div>
          )}
        </div>

        <div className="flex gap-2 mb-8 overflow-x-auto pb-1">
          {STORY_CATEGORY_TABS.map(cat => (
            <button
              key={cat.key}
              onClick={() => setCategoryFilter(cat.key)}
              className={`px-4 py-1.5 text-sm rounded-full whitespace-nowrap transition-colors border ${
                categoryFilter === cat.key
                  ? 'bg-amber-700 text-white border-amber-700'
                  : 'bg-white text-[var(--muted)] border-[var(--border)] hover:border-amber-400 hover:text-amber-700'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {loading && <LoadingSkeleton />}

        {error && (
          <div className="text-center py-16">
            <p className="text-[var(--muted)] mb-4">{error}</p>
            <button onClick={() => window.location.reload()} className="text-[var(--gold)] hover:underline">重新加载</button>
          </div>
        )}

        {!loading && !error && stories.length === 0 && (
          <div className="text-center py-16">
            <p className="text-4xl mb-4">📜</p>
            <p className="text-[var(--muted)] mb-4">暂无故事，开启你的第一段历史旅程</p>
            <Link href="/create" className="text-[var(--gold)] hover:underline">创建第一个故事 →</Link>
          </div>
        )}

        {!loading && !error && (() => {
          let filtered = stories;
          // Filter by ownership
          if (tab === 'mine' && session?.user?.id) {
            filtered = filtered.filter(s => s.ownerId === session.user.id);
          }
          // Filter by category (storyType)
          if (categoryFilter !== 'all') {
            filtered = filtered.filter(s => s.storyType === categoryFilter);
          }
          return filtered.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((story, i) => (
                <StoryCard key={story.id} story={story} index={i} onDelete={handleDeleteStory} currentUserId={session?.user?.id} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-4xl mb-4">📜</p>
              <p className="text-[var(--muted)] mb-4">{tab === 'mine' ? '你还没有创建故事' : '暂无故事，开启你的第一段历史旅程'}</p>
              <Link href="/create" className="text-[var(--gold)] hover:underline">创建第一个故事 →</Link>
            </div>
          );
        })()}
      </div>

      <footer className="border-t border-[var(--border)] py-8 text-center">
        <p className="text-xs text-[var(--muted)]">© 2026 古事 · 分叉故事续写平台</p>
      </footer>
    </div>
  );
}
