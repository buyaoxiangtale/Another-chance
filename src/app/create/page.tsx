'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

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

// C6.9: Dynasty/era options — 古代 + 现代/未来
const eraOptions = [
  { value: '先秦', label: '先秦', icon: '🏛️', group: '古代' },
  { value: '秦', label: '秦', icon: '🐉', group: '古代' },
  { value: '汉', label: '汉', icon: '⚔️', group: '古代' },
  { value: '三国', label: '三国', icon: '🔥', group: '古代' },
  { value: '晋', label: '晋', icon: '📜', group: '古代' },
  { value: '南北朝', label: '南北朝', icon: '🏔️', group: '古代' },
  { value: '隋', label: '隋', icon: '🏗️', group: '古代' },
  { value: '唐', label: '唐', icon: '👑', group: '古代' },
  { value: '宋', label: '宋', icon: '🖌️', group: '古代' },
  { value: '元', label: '元', icon: '🐎', group: '古代' },
  { value: '明', label: '明', icon: '🏰', group: '古代' },
  { value: '清', label: '清', icon: '🏮', group: '古代' },
  { value: '近代', label: '近代', icon: '📰', group: '近现代' },
  { value: '民国', label: '民国', icon: '🎩', group: '近现代' },
  { value: '现代', label: '现代', icon: '🏙️', group: '近现代' },
  { value: '当代', label: '当代', icon: '📱', group: '近现代' },
  { value: '近未来', label: '近未来', icon: '🤖', group: '未来' },
  { value: '未来', label: '未来', icon: '🚀', group: '未来' },
  { value: '架空世界', label: '架空世界', icon: '🌍', group: '虚构' },
  { value: '其他', label: '其他', icon: '🌐', group: '虚构' },
];

/** 细分体裁选项 — 根据故事类型动态展示 */
const genreOptions: Record<string, { value: string; label: string }[]> = {
  historical: [
    { value: '正史', label: '正史' },
    { value: '演义', label: '演义' },
    { value: '架空', label: '架空历史' },
    { value: '穿越', label: '穿越' },
    { value: '军事', label: '军事' },
  ],
  legend: [
    { value: '演义', label: '演义' },
    { value: '武侠', label: '武侠' },
    { value: '仙侠', label: '仙侠' },
    { value: '玄幻', label: '玄幻' },
    { value: '奇幻', label: '奇幻' },
  ],
  literary: [
    { value: '同人', label: '同人' },
    { value: '悬疑', label: '悬疑推理' },
    { value: '都市', label: '都市' },
    { value: '现代', label: '现代文学' },
    { value: '军事', label: '军事' },
  ],
  original: [
    { value: '都市', label: '都市' },
    { value: '悬疑', label: '悬疑推理' },
    { value: '玄幻', label: '玄幻' },
    { value: '仙侠', label: '仙侠' },
    { value: '武侠', label: '武侠' },
    { value: '科幻', label: '科幻' },
    { value: '末世', label: '末世' },
    { value: '穿越', label: '穿越' },
    { value: '奇幻', label: '奇幻' },
    { value: '架空', label: '架空' },
    { value: '同人', label: '同人' },
    { value: '军事', label: '军事' },
    { value: '现代', label: '现代文学' },
    { value: '原创', label: '不指定' },
  ],
};

interface InitialCharacter {
  name: string;
  role: string;
  traits: string;
}

export default function CreateStoryPage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [tab, setTab] = useState<'template' | 'custom'>('template');
  const [storyType, setStoryType] = useState('historical');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<string>('');
  const [creating, setCreating] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customDesc, setCustomDesc] = useState('');
  const [customAuthor, setCustomAuthor] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');

  // C6.9: Era and character fields
  const [selectedEra, setSelectedEra] = useState('');
  const [initialCharacters, setInitialCharacters] = useState<InitialCharacter[]>([
    { name: '', role: 'protagonist', traits: '' },
  ]);
  const [showEraPicker, setShowEraPicker] = useState(false);

  // Auth guard
  if (sessionStatus === 'loading') {
    return <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--paper)' }}><p className="text-[var(--muted)]">加载中...</p></div>;
  }
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--paper)' }}>
        <div className="text-center">
          <p className="text-[var(--muted)] mb-4">请先登录后再创建故事</p>
          <Link href="/login" className="text-[var(--gold)] hover:underline">前往登录 →</Link>
        </div>
      </div>
    );
  }

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
          prompt: selectedPrompt,
          era: template.era,
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
          genre: selectedGenre || undefined,
          prompt: customPrompt,
          era: selectedEra || undefined,
          characters: initialCharacters.filter(c => c.name.trim()).map(c => ({
            name: c.name,
            role: c.role,
            traits: c.traits.split(/[,，、]/).filter(Boolean),
          })),
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

  const addCharacter = () => {
    setInitialCharacters([...initialCharacters, { name: '', role: 'supporting', traits: '' }]);
  };

  const removeCharacter = (idx: number) => {
    if (initialCharacters.length <= 1) return;
    setInitialCharacters(initialCharacters.filter((_, i) => i !== idx));
  };

  const updateCharacter = (idx: number, field: keyof InitialCharacter, value: string) => {
    const updated = [...initialCharacters];
    updated[idx] = { ...updated[idx], [field]: value };
    setInitialCharacters(updated);
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--paper)' }}>
      <nav className="sticky top-0 z-10 backdrop-blur-sm border-b border-[var(--border)]" style={{ background: 'rgba(250,246,240,0.9)' }}>
        <div className="max-w-4xl mx-auto px-6 py-3">
          <Link href="/" className="text-sm text-[var(--muted)] hover:text-[var(--ink)] transition-colors">← 故事列表</Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 pt-12 pb-20">
        <div className="text-center mb-10">
          <div className="divider-ornament mb-4"><span>笔</span></div>
          <h1 className="text-3xl font-bold text-[var(--ink)] tracking-widest mb-2">开启新篇</h1>
          <p className="text-[var(--muted)] text-sm">选择一段历史，或书写你自己的故事</p>
        </div>

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

        <div className="flex justify-center mb-10">
          <div className="inline-flex rounded-full border border-[var(--border)] bg-white p-1">
            <button
              onClick={() => { setTab('template'); setSelectedTemplate(null); setSelectedPrompt(''); }}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                tab === 'template' ? 'bg-[var(--ink)] text-white shadow-sm' : 'text-[var(--muted)] hover:text-[var(--ink)]'
              }`}
            >模板故事</button>
            <button
              onClick={() => setTab('custom')}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                tab === 'custom' ? 'bg-[var(--ink)] text-white shadow-sm' : 'text-[var(--muted)] hover:text-[var(--ink)]'
              }`}
            >自定义创作</button>
          </div>
        </div>

        {tab === 'template' && (
          <div>
            <div className="grid gap-6 md:grid-cols-3">
              {storyTemplates.map((template, i) => (
                <div
                  key={template.id}
                  onClick={() => { setSelectedTemplate(template.id); setSelectedPrompt(template.prompts[0]); }}
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
                      <span className="text-xs px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full border border-amber-200">{template.era}</span>
                      <span className="text-xs text-[var(--muted)]">{template.time}</span>
                    </div>
                    <h3 className="text-lg font-bold text-[var(--ink)] mb-2">{template.title}</h3>
                    <p className="text-xs text-[var(--muted)] leading-relaxed line-clamp-3">{template.description}</p>
                  </div>
                </div>
              ))}
            </div>

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

                {/* C6.9: Era selector */}
                <div>
                  <label className="block text-sm font-medium text-[var(--ink)] mb-2">朝代/时代</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowEraPicker(!showEraPicker)}
                      className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--paper)] text-left flex items-center justify-between hover:border-[var(--gold)]/50 transition-all"
                    >
                      <span className={selectedEra ? 'text-[var(--ink)]' : 'text-[var(--muted)]'}>
                        {selectedEra ? `${eraOptions.find(e => e.value === selectedEra)?.icon} ${selectedEra}` : '选择时代...'}
                      </span>
                      <span className="text-[var(--muted)]">▾</span>
                    </button>
                    {showEraPicker && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg border border-[var(--border)] shadow-lg z-10 max-h-72 overflow-y-auto">
                        {['古代', '近现代', '未来', '虚构'].map(group => {
                          const items = eraOptions.filter(e => e.group === group);
                          if (items.length === 0) return null;
                          return (
                            <div key={group} className="px-2 pt-2 pb-1">
                              <div className="text-[10px] text-[var(--muted)] px-1 mb-1 tracking-wider">{group}</div>
                              <div className="grid grid-cols-4 gap-1">
                                {items.map(era => (
                                  <button
                                    key={era.value}
                                    type="button"
                                    onClick={() => { setSelectedEra(era.value); setShowEraPicker(false); }}
                                    className={`px-2 py-1.5 rounded-lg text-sm text-left transition-all ${
                                      selectedEra === era.value
                                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                        : 'hover:bg-gray-50 text-[var(--ink)]'
                                    }`}
                                  >
                                    <span className="mr-1">{era.icon}</span>{era.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Genre sub-selector */}
                {genreOptions[storyType] && (
                  <div>
                    <label className="block text-sm font-medium text-[var(--ink)] mb-2">细分体裁</label>
                    <div className="flex flex-wrap gap-2">
                      {genreOptions[storyType].map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setSelectedGenre(opt.value === selectedGenre ? '' : opt.value)}
                          className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                            selectedGenre === opt.value
                              ? 'bg-[var(--gold)]/10 text-[var(--gold)] border-[var(--gold)]/50'
                              : 'border-[var(--border)] text-[var(--ink)] hover:border-[var(--gold)]/40'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    {selectedGenre && (
                      <p className="text-xs text-[var(--muted)] mt-1.5">已选：<span className="text-[var(--gold)]">{selectedGenre}</span></p>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-[var(--ink)] mb-2">故事类型</label>
                  <select
                    value={storyType}
                    onChange={(e) => { setStoryType(e.target.value); setSelectedGenre(''); }}
                    className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)] focus:border-transparent transition-all"
                  >
                    {storyTypes.map(type => (
                      <option key={type.id} value={type.id}>{type.name}</option>
                    ))}
                  </select>
                </div>

                {/* C6.9: Initial characters */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-[var(--ink)]">初始角色</label>
                    <button
                      type="button"
                      onClick={addCharacter}
                      className="text-xs text-[var(--gold)] hover:text-amber-700 flex items-center gap-1"
                    >
                      + 添加角色
                    </button>
                  </div>
                  <div className="space-y-3">
                    {initialCharacters.map((char, idx) => (
                      <div key={idx} className="flex gap-2 items-start">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white text-xs font-bold shrink-0 mt-2">
                          {char.name ? char.name.charAt(0) : '?'}
                        </div>
                        <div className="flex-1 space-y-1.5">
                          <input
                            type="text"
                            value={char.name}
                            onChange={e => updateCharacter(idx, 'name', e.target.value)}
                            placeholder="角色名"
                            className="w-full px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--paper)] text-sm text-[var(--ink)] placeholder-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--gold)]"
                          />
                          <div className="flex gap-2">
                            <select
                              value={char.role}
                              onChange={e => updateCharacter(idx, 'role', e.target.value)}
                              className="flex-1 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--paper)] text-sm text-[var(--ink)] focus:outline-none focus:ring-1 focus:ring-[var(--gold)]"
                            >
                              <option value="protagonist">主角</option>
                              <option value="supporting">配角</option>
                              <option value="antagonist">反派</option>
                              <option value="narrator">叙述者</option>
                            </select>
                            <input
                              type="text"
                              value={char.traits}
                              onChange={e => updateCharacter(idx, 'traits', e.target.value)}
                              placeholder="性格特征（逗号分隔）"
                              className="flex-[2] px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--paper)] text-sm text-[var(--ink)] placeholder-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--gold)]"
                            />
                          </div>
                        </div>
                        {initialCharacters.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeCharacter(idx)}
                            className="text-gray-400 hover:text-red-500 mt-2 text-sm"
                          >✕</button>
                        )}
                      </div>
                    ))}
                  </div>
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
