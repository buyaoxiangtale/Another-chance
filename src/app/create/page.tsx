'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const storyTemplates = [
  {
    id: 'history_1',
    title: '荆轲刺秦王',
    description: '战国末期，燕国太子丹派遣荆轲刺杀秦王嬴政。匕首图穷而见，历史在此分叉。',
    era: '战国',
    icon: '🗡️',
    gradient: 'from-amber-800 to-red-900',
    difficulty: 'medium',
    time: '30-45分钟',
    prompts: [
      '如果荆轲成功刺杀秦王，历史将如何改写？',
      '如果秦王提前发现刺杀计划，会有什么后果？',
      '如果太子丹阻止了这次刺杀，燕国的命运如何？'
    ]
  },
  {
    id: 'history_2',
    title: '赤壁之战',
    description: '东汉末年，孙刘联军在赤壁以少胜多大败曹操。东风不与周郎便，铜雀春深锁二乔？',
    era: '三国',
    icon: '🔥',
    gradient: 'from-blue-800 to-indigo-900',
    difficulty: 'hard',
    time: '45-60分钟',
    prompts: [
      '如果东南风没有刮起，赤壁之战的结果会如何？',
      '如果曹操接受了黄盖的投降，三国鼎立的局面会改变吗？',
      '如果周瑜在赤壁之战中阵亡，东吴的命运如何？'
    ]
  },
  {
    id: 'history_3',
    title: '玄武门之变',
    description: '大唐初年，李世民于玄武门伏击太子李建成。手足相残，帝业更替。',
    era: '唐',
    icon: '⚔️',
    gradient: 'from-emerald-800 to-teal-900',
    difficulty: 'medium',
    time: '30-45分钟',
    prompts: [
      '如果李建成提前得知李世民的阴谋，历史会如何发展？',
      '如果李世民在玄武门之变中失败，唐朝的命运如何？',
      '如果李渊出面调解兄弟矛盾，会有什么结果？'
    ]
  }
];

const storyTypes = [
  { id: 'historical', name: '历史分叉', description: '基于真实历史的关键转折点' },
  { id: 'legend', name: '神话传说', description: '古典神话的另一种可能' },
  { id: 'literary', name: '文学名著', description: '经典文学作品的续写' },
  { id: 'original', name: '原创故事', description: '完全原创的分叉故事' }
];

export default function CreateStoryPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'template' | 'custom'>('template');
  const [storyType, setStoryType] = useState('historical');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<string>('');
  const [creating, setCreating] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customDesc, setCustomDesc] = useState('');
  const [customAuthor, setCustomAuthor] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');

  const handleTemplateCreate = async () => {
    if (!selectedTemplate || !selectedPrompt || creating) return;
    const template = storyTemplates.find(t => t.id === selectedTemplate);
    if (!template) return;
    
    setCreating(true);
    try {
      const res = await fetch('/api/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: template.title, 
          description: `${template.description}\n\n思考方向：${selectedPrompt}`,
          author: '佚名',
          storyType,
          prompt: selectedPrompt
        })
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
        body: JSON.stringify({ 
          title: customTitle, 
          description: customDesc,
          author: customAuthor || '佚名',
          storyType,
          prompt: customPrompt
        })
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

        {/* 故事类型选择 */}
        <div className="mb-10">
          <h3 className="text-lg font-bold text-[var(--ink)] mb-4 text-center">选择故事类型</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {storyTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => setStoryType(type.id)}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  storyType === type.id
                    ? 'border-[var(--gold)] bg-amber-50 shadow-md scale-[1.02]'
                    : 'border-[var(--border)] hover:border-[var(--gold)]/50 hover:shadow-md'
                }`}
              >
                <h4 className="font-bold text-[var(--ink)] mb-2">{type.name}</h4>
                <p className="text-xs text-[var(--muted)]">{type.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Tab 切换 */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex rounded-full border border-[var(--border)] bg-white p-1">
            <button
              onClick={() => { setTab('template'); setSelectedTemplate(null); setSelectedPrompt(''); }}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                tab === 'template'
                  ? 'bg-[var(--ink)] text-white shadow-sm'
                  : 'text-[var(--muted)] hover:text-[var(--ink)]'
              }`}
            >
              模板故事
            </button>
            <button
              onClick={() => setTab('custom')}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                tab === 'custom'
                  ? 'bg-[var(--ink)] text-white shadow-sm'
                  : 'text-[var(--muted)] hover:text-[var(--ink)]'
              }`}
            >
              自定义创作
            </button>
          </div>
        </div>

        {/* 模板故事选择 */}
        {tab === 'template' && (
          <div>
            <div className="grid gap-6 md:grid-cols-3">
              {storyTemplates.map((template, i) => (
                <div
                  key={template.id}
                  onClick={() => {
                    setSelectedTemplate(template.id);
                    setSelectedPrompt(template.prompts[0]);
                  }}
                  className={`animate-fade-in-up cursor-pointer rounded-xl overflow-hidden border-2 transition-all ${
                    selectedTemplate === template.id
                      ? 'border-[var(--gold)] shadow-lg scale-[1.02]'
                      : 'border-[var(--border)] hover:border-[var(--gold)]/50 hover:shadow-md'
                  }`}
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div className={`h-24 bg-gradient-to-br ${template.gradient} flex items-center justify-center`}>
                    <span className="text-4xl">{template.icon}</span>
                  </div>
                  <div className="p-5 bg-white">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full border border-amber-200">
                        {template.era}
                      </span>
                      <span className="text-xs text-[var(--muted)]">{template.time}</span>
                    </div>
                    <h3 className="text-lg font-bold text-[var(--ink)] mb-2">{template.title}</h3>
                    <p className="text-xs text-[var(--muted)] leading-relaxed line-clamp-3">{template.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* 思考方向选择 */}
            {selectedTemplate && (
              <div className="mt-8 bg-white rounded-xl border border-[var(--border)] p-6">
                <h4 className="font-bold text-[var(--ink)] mb-4">选择思考方向</h4>
                <div className="grid gap-3">
                  {storyTemplates.find(t => t.id === selectedTemplate)?.prompts.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedPrompt(prompt)}
                      className={`text-left p-3 rounded-lg border transition-colors ${
                        selectedPrompt === prompt
                          ? 'border-[var(--accent)] bg-red-50 text-[var(--accent)]'
                          : 'border-[var(--border)] hover:border-[var(--gold)]/50'
                      }`}
                    >
                      <p className="text-sm">{prompt}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-10 text-center">
              <button
                onClick={handleTemplateCreate}
                disabled={!selectedTemplate || !selectedPrompt || creating}
                className={`inline-flex items-center gap-2 px-10 py-3 rounded-full font-medium transition-all ${
                  selectedTemplate && selectedPrompt && !creating
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
                  <label className="block text-sm font-medium text-[var(--ink)] mb-2">故事类型</label>
                  <select
                    value={storyType}
                    onChange={(e) => setStoryType(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)] focus:border-transparent transition-all"
                  >
                    {storyTypes.map(type => (
                      <option key={type.id} value={type.id}>{type.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--ink)] mb-2">思考方向/提示词</label>
                  <textarea
                    value={customPrompt}
                    onChange={e => setCustomPrompt(e.target.value)}
                    placeholder="描述你希望故事如何发展，或者提供一些创作思路..."
                    rows={3}
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
