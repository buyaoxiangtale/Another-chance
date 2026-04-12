'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const historyStories = [
  {
    id: 'history_1',
    title: '荆轲刺秦王',
    description: '战国末期，燕国太子丹派遣荆轲刺杀秦王嬴政。匕首图穷而见，历史在此分叉。',
    era: '战国',
    icon: '🗡️',
    gradient: 'from-amber-800 to-red-900',
    difficulty: 'medium',
    time: '30-45分钟'
  },
  {
    id: 'history_2',
    title: '赤壁之战',
    description: '东汉末年，孙刘联军在赤壁以少胜多大败曹操。东风不与周郎便，铜雀春深锁二乔？',
    era: '三国',
    icon: '🔥',
    gradient: 'from-blue-800 to-indigo-900',
    difficulty: 'hard',
    time: '45-60分钟'
  },
  {
    id: 'history_3',
    title: '玄武门之变',
    description: '大唐初年，李世民于玄武门伏击太子李建成。手足相残，帝业更替。',
    era: '唐',
    icon: '⚔️',
    gradient: 'from-emerald-800 to-teal-900',
    difficulty: 'medium',
    time: '30-45分钟'
  }
];

export default function CreateStoryPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'history' | 'custom'>('history');
  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customDesc, setCustomDesc] = useState('');
  const [customAuthor, setCustomAuthor] = useState('');

  const handleSelectHistory = async () => {
    if (!selected || creating) return;
    const story = historyStories.find(s => s.id === selected);
    if (!story) return;
    setCreating(true);
    try {
      const res = await fetch('/api/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: story.title, description: story.description, author: '佚名' })
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.story?.id) router.push(`/story/${data.story.id}`);
    } catch {
      alert('创建失败，请重试');
    } finally {
      setCreating(false);
    }
  };

  const handleCustomCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle || creating) return;
    setCreating(true);
    try {
      const res = await fetch('/api/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: customTitle, description: customDesc, author: customAuthor || '佚名' })
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.story?.id) router.push(`/story/${data.story.id}`);
    } catch {
      alert('创建失败，请重试');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--paper)' }}>
      {/* 导航 */}
      <nav className="sticky top-0 z-10 backdrop-blur-sm border-b border-[var(--border)]" style={{ background: 'rgba(250,246,240,0.9)' }}>
        <div className="max-w-4xl mx-auto px-6 py-3">
          <Link href="/" className="text-sm text-[var(--muted)] hover:text-[var(--ink)] transition-colors">
            ← 故事列表
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 pt-12 pb-20">
        {/* 标题 */}
        <div className="text-center mb-10">
          <div className="divider-ornament mb-4">
            <span>笔</span>
          </div>
          <h1 className="text-3xl font-bold text-[var(--ink)] tracking-widest mb-2">开启新篇</h1>
          <p className="text-[var(--muted)] text-sm">选择一段历史，或书写你自己的故事</p>
        </div>

        {/* Tab 切换 */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex rounded-full border border-[var(--border)] bg-white p-1">
            <button
              onClick={() => { setTab('history'); setSelected(null); }}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                tab === 'history'
                  ? 'bg-[var(--ink)] text-white shadow-sm'
                  : 'text-[var(--muted)] hover:text-[var(--ink)]'
              }`}
            >
              历史故事
            </button>
            <button
              onClick={() => setTab('custom')}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                tab === 'custom'
                  ? 'bg-[var(--ink)] text-white shadow-sm'
                  : 'text-[var(--muted)] hover:text-[var(--ink)]'
              }`}
            >
              自定义
            </button>
          </div>
        </div>

        {/* 历史故事选择 */}
        {tab === 'history' && (
          <div>
            <div className="grid gap-6 md:grid-cols-3">
              {historyStories.map((story, i) => (
                <div
                  key={story.id}
                  onClick={() => setSelected(story.id)}
                  className={`animate-fade-in-up cursor-pointer rounded-xl overflow-hidden border-2 transition-all ${
                    selected === story.id
                      ? 'border-[var(--gold)] shadow-lg scale-[1.02]'
                      : 'border-[var(--border)] hover:border-[var(--gold)]/50 hover:shadow-md'
                  }`}
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div className={`h-24 bg-gradient-to-br ${story.gradient} flex items-center justify-center`}>
                    <span className="text-4xl">{story.icon}</span>
                  </div>
                  <div className="p-5 bg-white">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full border border-amber-200">
                        {story.era}
                      </span>
                      <span className="text-xs text-[var(--muted)]">{story.time}</span>
                    </div>
                    <h3 className="text-lg font-bold text-[var(--ink)] mb-2">{story.title}</h3>
                    <p className="text-xs text-[var(--muted)] leading-relaxed line-clamp-3">{story.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10 text-center">
              <button
                onClick={handleSelectHistory}
                disabled={!selected || creating}
                className={`inline-flex items-center gap-2 px-10 py-3 rounded-full font-medium transition-all ${
                  selected && !creating
                    ? 'bg-gradient-to-r from-amber-700 to-red-800 text-white hover:shadow-lg'
                    : 'bg-gray-200 text-[var(--muted)] cursor-not-allowed'
                }`}
              >
                {creating ? '创建中...' : '✦ 开始这个故事'}
              </button>
            </div>
          </div>
        )}

        {/* 自定义创建 */}
        {tab === 'custom' && (
          <div className="max-w-lg mx-auto">
            <div className="bg-white rounded-xl border border-[var(--border)] p-8 shadow-sm">
              <form onSubmit={handleCustomCreate} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-[var(--ink)] mb-2">故事标题 *</label>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={e => setCustomTitle(e.target.value)}
                    placeholder="例：卧龙出山"
                    className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--paper)] text-[var(--ink)] placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)] focus:border-transparent transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--ink)] mb-2">故事描述</label>
                  <textarea
                    value={customDesc}
                    onChange={e => setCustomDesc(e.target.value)}
                    placeholder="描述故事的背景和设定..."
                    rows={4}
                    className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--paper)] text-[var(--ink)] placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)] focus:border-transparent transition-all resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--ink)] mb-2">作者</label>
                  <input
                    type="text"
                    value={customAuthor}
                    onChange={e => setCustomAuthor(e.target.value)}
                    placeholder="你的名字"
                    className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--paper)] text-[var(--ink)] placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)] focus:border-transparent transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={creating}
                  className={`w-full py-3 rounded-full font-medium transition-all ${
                    !creating
                      ? 'bg-gradient-to-r from-amber-700 to-red-800 text-white hover:shadow-lg'
                      : 'bg-gray-200 text-[var(--muted)] cursor-wait'
                  }`}
                >
                  {creating ? '创建中...' : '✦ 创建故事'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
