user
Analyze all source files in src/app/create/. For each file: purpose, exports, dependencies. Then: architecture overview and ChronosMirror upgrade gaps (character modeling, timeline validation, MCP Wikipedia, pacing control). Write results to /home/pjlab/fbh/fbh_project/gushi/Docs/researches/src_app_create_research.md
codex
I’m analyzing `src/app/create/` end to end and will produce a file-by-file research note in `Docs/researches/src_app_create_research.md`. First I’m enumerating the files and reading the current implementation so the architecture and upgrade-gap sections are grounded in the code.
  → Inventory files under src/app/create and identify the source files to analyze
  • Read each file to capture purpose, exports, and dependencies
  • Synthesize architecture overview and ChronosMirror upgrade gaps
  • Write the research markdown to Docs/researches/src_app_create_research.md
exec
/usr/bin/zsh -lc 'rg --files src/app/create' in /home/pjlab/fbh/fbh_project/gushi
exec
/usr/bin/zsh -lc 'find src/app/create -maxdepth 3 -type d | sort' in /home/pjlab/fbh/fbh_project/gushi
 succeeded in 0ms:
src/app/create/page.tsx

 succeeded in 0ms:
src/app/create

codex
The route is small on disk: `src/app/create/` currently contains a single source file, `page.tsx`. I’m reading that file and then tracing the imported project modules it depends on where that context affects the architecture and ChronosMirror gap analysis.
exec
/usr/bin/zsh -lc "sed -n '1,240p' src/app/create/page.tsx" in /home/pjlab/fbh/fbh_project/gushi
 succeeded in 0ms:
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

exec
/usr/bin/zsh -lc 'rg -n "''^import|''^export|function |const .* =|use client|Timeline|Chronos|mirror|Wikipedia|MCP|pace|character" src/app/create/page.tsx' in /home/pjlab/fbh/fbh_project/gushi
 succeeded in 0ms:
1:'use client';
3:import { useState } from 'react';
4:import { useRouter } from 'next/navigation';
5:import Link from 'next/link';
7:const storyTemplates = [
55:const storyTypes = [
62:export default function CreateStoryPage() {
63:  const router = useRouter();
64:  const [tab, setTab] = useState<'template' | 'custom'>('template');
65:  const [storyType, setStoryType] = useState('historical');
66:  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
67:  const [selectedPrompt, setSelectedPrompt] = useState<string>('');
68:  const [creating, setCreating] = useState(false);
69:  const [customTitle, setCustomTitle] = useState('');
70:  const [customDesc, setCustomDesc] = useState('');
71:  const [customAuthor, setCustomAuthor] = useState('');
72:  const [customPrompt, setCustomPrompt] = useState('');
74:  const handleTemplateCreate = async () => {
76:    const template = storyTemplates.find(t => t.id === selectedTemplate);
81:      const res = await fetch('/api/stories', {
93:      const data = await res.json();
102:  const handleCustomCreate = async (e: React.FormEvent) => {
107:      const res = await fetch('/api/stories', {
119:      const data = await res.json();
273:              <form onSubmit={handleCustomCreate} className="space-y-5">

codex
I have the page structure and creation flow. Next I’m pulling the rest of the component plus the `/api/stories` implementation, because the route’s real behavior and current upgrade limits are defined by that API contract.
exec
/usr/bin/zsh -lc "sed -n '241,420p' src/app/create/page.tsx" in /home/pjlab/fbh/fbh_project/gushi
 succeeded in 0ms:
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

exec
/usr/bin/zsh -lc "rg --files src/app | rg '/api/stories|stories'" in /home/pjlab/fbh/fbh_project/gushi
 succeeded in 0ms:
src/app/api/stories/[id]/continue/route.ts
src/app/api/stories/[id]/segments/route.ts
src/app/api/stories/[id]/route.ts
src/app/api/stories/[id]/branch/route.ts
src/app/api/stories/[id]/tree/route.ts
src/app/api/stories/[id]/stream-continue/route.ts
src/app/api/stories/route.ts

exec
/usr/bin/zsh -lc "sed -n '1,240p' src/app/api/stories/route.ts" in /home/pjlab/fbh/fbh_project/gushi
 succeeded in 0ms:
import { NextRequest, NextResponse } from 'next/server';
import { storiesStore, segmentsStore, type Story, type StorySegment } from '@/lib/simple-db';

export async function GET() {
  try {
    const stories = await storiesStore.load();
    
    // 按创建时间倒序排列
    const sortedStories = stories.sort((a: Story, b: Story) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({
      success: true,
      stories: sortedStories,
      total: sortedStories.length
    });
  } catch (error) {
    console.error('获取故事列表失败:', error);
    return NextResponse.json(
      { 
        error: '获取故事列表失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, author } = body;

    if (!title) {
      return NextResponse.json(
        { error: '故事标题是必填项' },
        { status: 400 }
      );
    }

    const stories = await storiesStore.load();

    // 幂等：标题已存在则返回已有故事
    const existing = stories.find((s: Story) => s.title === title);
    if (existing) {
      return NextResponse.json({
        success: true,
        story: existing,
        message: '故事已存在'
      });
    }

    const newStory: Story = {
      id: `story_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title,
      description: description || '',
      author: author || '佚名',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    stories.push(newStory);
    await storiesStore.save(stories);

    // 自动生成首个段落（故事开篇）
    const firstSegment: StorySegment = {
      id: `seg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: `${title}·开篇`,
      content: `《${title}》的故事开始了...`, // 临时内容，后续通过 AI 生成完整开篇
      isBranchPoint: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      storyId: newStory.id,
      branchId: 'main',
      parentSegmentId: '',
      imageUrls: []
    };

    const segments = await segmentsStore.load();
    segments.push(firstSegment);
    await segmentsStore.save(segments);

    // 更新故事的 rootSegmentId
    newStory.rootSegmentId = firstSegment.id;
    const updatedStories = stories.map((s: Story) => s.id === newStory.id ? newStory : s);
    await storiesStore.save(updatedStories);

    return NextResponse.json({
      success: true,
      story: newStory,
      firstSegment,
      message: '故事创建成功，已生成开篇段落'
    }, { status: 201 });

  } catch (error) {
    console.error('创建故事失败:', error);
    return NextResponse.json(
      { 
        error: '创建故事失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}
exec
/usr/bin/zsh -lc "rg -n \"export interface Story|type Story|model Story|stories\" src lib components prisma -g '"'!node_modules'"'" in /home/pjlab/fbh/fbh_project/gushi
 exited 2 in 0ms:
rg: lib: No such file or directory (os error 2)
rg: components: No such file or directory (os error 2)
prisma/schema.prisma:14:model Story {
prisma/schema.prisma:29:  @@map("stories")
prisma/schema.prisma:33:model StorySegment {
prisma/schema.prisma:57:model StoryBranch {
prisma/enhanced_seed.ts:299:  await fs.writeFile(path.join(DATA_DIR, 'stories.json'), '[]');
src/types/story.ts:2:export type Story = {
src/types/story.ts:12:export type StorySegment = {
src/types/story.ts:25:export type StoryBranch = {
src/types/story.ts:51:export type StoryResponse = {
src/lib/simple-db.ts:71:const storiesStore = new SimpleStore<Story>('stories.json');
src/lib/simple-db.ts:128:  storiesStore,
src/lib/simple-db.ts:135:  type Story,
src/lib/simple-db.ts:136:  type StorySegment,
src/lib/simple-db.ts:137:  type StoryBranch
src/app/page.tsx:123:  const [stories, setStories] = useState<Story[]>([]);
src/app/page.tsx:130:        const storiesRes = await fetch('/api/stories');
src/app/page.tsx:131:        if (!storiesRes.ok) throw new Error('加载故事列表失败');
src/app/page.tsx:132:        const storiesData = await storiesRes.json();
src/app/page.tsx:135:        const storiesWithDetails = await Promise.all(
src/app/page.tsx:136:          (storiesData.stories || []).map(async (story: Story) => {
src/app/page.tsx:138:              const segmentsRes = await fetch(`/api/stories/${story.id}/segments`);
src/app/page.tsx:139:              const treeRes = await fetch(`/api/stories/${story.id}/tree`);
src/app/page.tsx:158:        setStories(storiesWithDetails);
src/app/page.tsx:220:        {!loading && !error && stories.length === 0 && (
src/app/page.tsx:230:        {!loading && !error && stories.length > 0 && (
src/app/page.tsx:232:            {stories.map((story, i) => (
src/app/story/[id]/page.tsx:50:    const segRes = await fetch(`/api/stories/${id}/segments?branchId=${branchId}`);
src/app/story/[id]/page.tsx:58:    const treeRes = await fetch(`/api/stories/${id}/tree`);
src/app/story/[id]/page.tsx:69:          fetch(`/api/stories/${id}`),
src/app/story/[id]/page.tsx:70:          fetch(`/api/stories/${id}/tree`)
src/app/story/[id]/page.tsx:109:      const res = await fetch(`/api/stories/${id}/stream-continue`, {
src/app/story/[id]/page.tsx:174:      const res = await fetch(`/api/stories/${id}/branch`, {
src/app/api/stories/[id]/continue/route.ts:2:import { storiesStore, segmentsStore, getOrderedChain, type StorySegment } from '@/lib/simple-db';
src/app/api/stories/[id]/continue/route.ts:44:    const stories = await storiesStore.load();
src/app/api/stories/[id]/continue/route.ts:45:    const story = stories.find((s: any) => s.id === storyId);
src/app/api/stories/[id]/segments/route.ts:2:import { getOrderedChain, getStorySegments, type StorySegment } from '@/lib/simple-db';
src/app/api/stories/[id]/route.ts:2:import { storiesStore } from '@/lib/simple-db';
src/app/api/stories/[id]/route.ts:9:    const stories = await storiesStore.load();
src/app/api/stories/[id]/route.ts:10:    const story = stories.find((s: any) => s.id === params.id);
src/app/api/stories/[id]/branch/route.ts:2:import { storiesStore, segmentsStore, branchesStore, getOrderedChain, type StorySegment } from '@/lib/simple-db';
src/app/api/stories/[id]/branch/route.ts:13:    const stories = await storiesStore.load();
src/app/api/stories/[id]/branch/route.ts:14:    const story = stories.find((s: any) => s.id === storyId);
src/app/api/stories/[id]/tree/route.ts:2:import { storiesStore, segmentsStore, branchesStore, getOrderedChain, type StorySegment, type StoryBranch } from '@/lib/simple-db';
src/app/api/stories/[id]/tree/route.ts:60:    const stories = await storiesStore.load();
src/app/api/stories/[id]/tree/route.ts:61:    const story = stories.find((s: any) => s.id === storyId);
src/app/api/stories/[id]/stream-continue/route.ts:2:import { storiesStore, segmentsStore, getOrderedChain, type StorySegment } from '@/lib/simple-db';
src/app/api/stories/[id]/stream-continue/route.ts:13:    const stories = await storiesStore.load();
src/app/api/stories/[id]/stream-continue/route.ts:14:    const story = stories.find((s: any) => s.id === storyId);
src/app/api/stories/route.ts:2:import { storiesStore, segmentsStore, type Story, type StorySegment } from '@/lib/simple-db';
src/app/api/stories/route.ts:6:    const stories = await storiesStore.load();
src/app/api/stories/route.ts:9:    const sortedStories = stories.sort((a: Story, b: Story) => 
src/app/api/stories/route.ts:15:      stories: sortedStories,
src/app/api/stories/route.ts:42:    const stories = await storiesStore.load();
src/app/api/stories/route.ts:45:    const existing = stories.find((s: Story) => s.title === title);
src/app/api/stories/route.ts:63:    stories.push(newStory);
src/app/api/stories/route.ts:64:    await storiesStore.save(stories);
src/app/api/stories/route.ts:86:    const updatedStories = stories.map((s: Story) => s.id === newStory.id ? newStory : s);
src/app/api/stories/route.ts:87:    await storiesStore.save(updatedStories);
src/app/create/page.tsx:81:      const res = await fetch('/api/stories', {
src/app/create/page.tsx:107:      const res = await fetch('/api/stories', {

codex
The creation UI is a thin client over `/api/stories`, and the backend schema is minimal. I’m reading the story types and storage layer now so the upgrade-gap section can distinguish UI limits from data-model limits.
exec
/usr/bin/zsh -lc "sed -n '1,220p' src/lib/simple-db.ts" in /home/pjlab/fbh/fbh_project/gushi
exec
/usr/bin/zsh -lc "sed -n '1,120p' prisma/schema.prisma" in /home/pjlab/fbh/fbh_project/gushi
 succeeded in 0ms:
import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

class SimpleStore<T> {
  constructor(private filename: string) {
    this.dataPath = path.join(DATA_DIR, filename);
  }

  private dataPath: string;

  async load(): Promise<T[]> {
    await ensureDataDir();
    try {
      const data = await fs.readFile(this.dataPath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  async save(data: T[]): Promise<void> {
    await ensureDataDir();
    await fs.writeFile(this.dataPath, JSON.stringify(data, null, 2));
  }
}

interface Story {
  id: string;
  title: string;
  description?: string;
  author?: string;
  createdAt: string;
  updatedAt: string;
  rootSegmentId?: string;
}

interface StorySegment {
  id: string;
  title?: string;
  content: string;
  isBranchPoint: boolean;
  createdAt: string;
  updatedAt: string;
  storyId: string;
  branchId: string;
  parentSegmentId?: string;
  imageUrls: string[];
}

interface StoryBranch {
  id: string;
  title: string;
  description?: string;
  sourceSegmentId: string;
  storyId: string;
  userDirection: string;
  createdAt: string;
  updatedAt: string;
}

const storiesStore = new SimpleStore<Story>('stories.json');
const segmentsStore = new SimpleStore<StorySegment>('segments.json');
const branchesStore = new SimpleStore<StoryBranch>('branches.json');

// Get ordered chain for a branch by following parentSegmentId links
async function getOrderedChain(storyId: string, branchId: string): Promise<StorySegment[]> {
  const segments = await segmentsStore.load();
  const storySegments = segments.filter(s => s.storyId === storyId && s.branchId === branchId);

  if (branchId === 'main') {
    // Main branch: start from root (no parentSegmentId)
    const chain: StorySegment[] = [];
    let current = storySegments.find(s => !s.parentSegmentId);
    const visited = new Set<string>();
    while (current && !visited.has(current.id)) {
      visited.add(current.id);
      chain.push(current);
      current = storySegments.find(s => s.parentSegmentId === current!.id);
    }
    return chain;
  } else {
    // Non-main branch: start from the segment whose parent is the sourceSegmentId
    const branches = await branchesStore.load();
    const branch = branches.find(b => b.id === branchId);
    if (!branch) return [];

    const chain: StorySegment[] = [];
    let current = storySegments.find(s => s.parentSegmentId === branch.sourceSegmentId);
    const visited = new Set<string>();
    while (current && !visited.has(current.id)) {
      visited.add(current.id);
      chain.push(current);
      current = storySegments.find(s => s.parentSegmentId === current!.id);
    }
    return chain;
  }
}

// Get the tail segment of a branch chain
async function getTailSegment(storyId: string, branchId: string): Promise<StorySegment | null> {
  const chain = await getOrderedChain(storyId, branchId);
  return chain.length > 0 ? chain[chain.length - 1] : null;
}

// Get all segments for a story
async function getStorySegments(storyId: string): Promise<StorySegment[]> {
  const segments = await segmentsStore.load();
  return segments.filter(s => s.storyId === storyId);
}

// Get branches for a story
async function getStoryBranches(storyId: string): Promise<StoryBranch[]> {
  const branches = await branchesStore.load();
  return branches.filter(b => b.storyId === storyId);
}

export {
  storiesStore,
  segmentsStore,
  branchesStore,
  getOrderedChain,
  getTailSegment,
  getStorySegments,
  getStoryBranches,
  type Story,
  type StorySegment,
  type StoryBranch
};

 succeeded in 0ms:
// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

// 故事主线模型
model Story {
  id              String   @id @default(cuid())
  title           String
  description     String?
  author          String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  // 关联关系
  segments        StorySegment[]
  branches        StoryBranch[]
  rootSegment     StorySegment? @relation("StoryRoot", fields: [rootSegmentId], references: [id])
  
  rootSegmentId   String?
  
  @@map("stories")
}

// 故事段落模型
model StorySegment {
  id          String   @id @default(cuid())
  title       String?
  content     String
  order       Int      @default(0)
  isBranchPoint Boolean @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // 关联关系
  storyId     String
  story       Story    @relation(fields: [storyId], references: [id], onDelete: Cascade)
  
  // 分叉关联
  branches    StoryBranch[]
  parentBranchId String?
  
  // 图片预留字段
  imageUrls   String[] @default([])
  
  @@map("story_segments")
}

// 分叉节点模型
model StoryBranch {
  id          String   @id @default(cuid())
  title       String?
  description String?
  segmentId   String
  segment     StorySegment @relation(fields: [segmentId], references: [id])
  parentStoryId String?
  parentStory  Story?   @relation("StoryBranches", fields: [parentStoryId], references: [id])
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // 关联关系
  segments    StorySegment[]
  
  @@map("story_branches")
}
exec
/usr/bin/zsh -lc "sed -n '1,200p' src/types/story.ts" in /home/pjlab/fbh/fbh_project/gushi
 succeeded in 0ms:
// 故事相关类型定义
export type Story = {
  id: string;
  title: string;
  description?: string;
  author?: string;
  createdAt: string;
  updatedAt: string;
  rootSegmentId?: string;
};

export type StorySegment = {
  id: string;
  title?: string;
  content: string;
  isBranchPoint: boolean;
  createdAt: string;
  updatedAt: string;
  storyId: string;
  branchId: string; // 所属分支 ID，主线的 branchId 为 "main"
  parentSegmentId: string; // 父段落 ID（用于构建分支树）
  imageUrls: string[];
};

export type StoryBranch = {
  id: string;
  title: string;
  description?: string;
  sourceSegmentId: string; // 从哪个段落分叉出来的
  storyId: string;
  userDirection: string; // 用户输入的分叉方向描述
  createdAt: string;
  updatedAt: string;
};

// API 请求/响应类型
export type ContinueStoryRequest = {
  segmentId: string;
  branchId: string; // 当前分支 ID
  content?: string;
  style?: string;
  characters?: string[];
};

export type BranchStoryRequest = {
  segmentId: string;
  userDirection: string; // 用户输入的分叉方向描述
  branchTitle?: string; // 分支标题（可选，可为空让 AI 生成）
};

export type StoryResponse = {
  segments: StorySegment[];
  branches: StoryBranch[];
  currentSegment: StorySegment;
};

// UI 组件类型
export type TreeNode = {
  id: string;
  title?: string;
  content?: string;
  isBranchPoint: boolean;
  children: TreeNode[];
  branchId: string;
  branchTitle?: string;
  parentSegmentId?: string;
};

// 向后兼容的类实现
class StoryClass {
  id!: string;
  title!: string;
  description?: string;
  author?: string;
  createdAt!: string;
  updatedAt!: string;
  rootSegmentId?: string;
  constructor(data: Story) { Object.assign(this, data); }
}

class StorySegmentClass {
  id!: string;
  title?: string;
  content!: string;
  isBranchPoint!: boolean;
  createdAt!: string;
  updatedAt!: string;
  storyId!: string;
  branchId!: string; // 所属分支 ID，主线的 branchId 为 "main"
  parentSegmentId!: string; // 父段落 ID（用于构建分支树）
  imageUrls!: string[];
  constructor(data: StorySegment) { Object.assign(this, data); }
}

class StoryBranchClass {
  id!: string;
  title!: string;
  description?: string;
  sourceSegmentId!: string; // 从哪个段落分叉出来的
  storyId!: string;
  userDirection!: string; // 用户输入的分叉方向描述
  createdAt!: string;
  updatedAt!: string;
  constructor(data: StoryBranch) { Object.assign(this, data); }
}

module.exports = {
  Story: StoryClass,
  StorySegment: StorySegmentClass,
  StoryBranch: StoryBranchClass
};
exec
/usr/bin/zsh -lc "sed -n '1,240p' src/app/api/stories/[id]/continue/route.ts" in /home/pjlab/fbh/fbh_project/gushi
 exited 1 in 0ms:
zsh:1: no matches found: src/app/api/stories/[id]/continue/route.ts

exec
/usr/bin/zsh -lc "sed -n '1,260p' src/app/api/stories/[id]/stream-continue/route.ts" in /home/pjlab/fbh/fbh_project/gushi
 exited 1 in 0ms:
zsh:1: no matches found: src/app/api/stories/[id]/stream-continue/route.ts

exec
/usr/bin/zsh -lc "sed -n '1,240p' src/app/api/stories/[id]/branch/route.ts" in /home/pjlab/fbh/fbh_project/gushi
 exited 1 in 0ms:
zsh:1: no matches found: src/app/api/stories/[id]/branch/route.ts

codex
The first read missed because zsh treated `[id]` as a glob. I’m rerunning those reads with quoted paths; the gap analysis depends on whether continuation/branch generation already carries any character, pacing, or validation hooks.
exec
/usr/bin/zsh -lc "sed -n '1,240p' 'src/app/api/stories/[id]/continue/route.ts'" in /home/pjlab/fbh/fbh_project/gushi
 succeeded in 0ms:
import { NextRequest, NextResponse } from 'next/server';
import { storiesStore, segmentsStore, getOrderedChain, type StorySegment } from '@/lib/simple-db';

async function callAI(prompt: string): Promise<string> {
  const baseUrl = process.env.AI_BASE_URL || 'https://api.openai.com/v1';
  const apiKey = process.env.AI_API_KEY || '';
  const model = process.env.AI_MODEL || 'gpt-3.5-turbo';

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: '你是一位精通中国历史的文学作家，擅长古典文学风格的写作。请用中文回答，保持与前文的风格和情节连续性。' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 2000
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AI API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id: storyId } = params;
    const { branchId = 'main' } = await request.json();

    if (!storyId) {
      return NextResponse.json({ error: '缺少参数' }, { status: 400 });
    }

    const stories = await storiesStore.load();
    const story = stories.find((s: any) => s.id === storyId);
    if (!story) return NextResponse.json({ error: '故事不存在' }, { status: 404 });

    // Get ordered chain to find tail segment
    const chain = await getOrderedChain(storyId, branchId);
    if (chain.length === 0) {
      return NextResponse.json({ error: '该分支没有段落' }, { status: 404 });
    }
    const tailSegment = chain[chain.length - 1];

    // Build context from the ordered chain
    const contextSummary = chain.map((s: StorySegment) =>
      `${s.title ? `【${s.title}】` : ''}${s.content}`
    ).join('\n');

    const prompt = `故事标题：${story.title}
故事背景：${story.description || ''}

当前故事进展：
${contextSummary}

请续写下一段（150-300字），保持古典文学风格，与前文情节连续。`;

    const aiResponse = await callAI(prompt);

    const segments = await segmentsStore.load();
    const newSegment: StorySegment = {
      id: `seg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      storyId,
      title: '故事续写',
      content: aiResponse,
      isBranchPoint: false,
      branchId,
      parentSegmentId: tailSegment.id,
      imageUrls: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    segments.push(newSegment);
    await segmentsStore.save(segments);

    return NextResponse.json({ success: true, segment: newSegment });

  } catch (error) {
    console.error('故事续写失败:', error);
    return NextResponse.json(
      { error: '故事续写失败', details: String(error) },
      { status: 500 }
    );
  }
}

exec
/usr/bin/zsh -lc "sed -n '1,280p' 'src/app/api/stories/[id]/stream-continue/route.ts'" in /home/pjlab/fbh/fbh_project/gushi
 succeeded in 0ms:
import { NextRequest, NextResponse } from 'next/server';
import { storiesStore, segmentsStore, getOrderedChain, type StorySegment } from '@/lib/simple-db';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id: storyId } = params;
    const { branchId = 'main' } = await request.json();

    if (!storyId) {
      return NextResponse.json({ error: '缺少参数' }, { status: 400 });
    }

    const stories = await storiesStore.load();
    const story = stories.find((s: any) => s.id === storyId);
    if (!story) return NextResponse.json({ error: '故事不存在' }, { status: 404 });

    // Get ordered chain to find tail segment
    const chain = await getOrderedChain(storyId, branchId);
    if (chain.length === 0) {
      return NextResponse.json({ error: '该分支没有段落' }, { status: 404 });
    }
    const tailSegment = chain[chain.length - 1];

    // Build context from the ordered chain
    const contextSummary = chain.map((s: StorySegment) =>
      `${s.title ? `【${s.title}】` : ''}${s.content}`
    ).join('\n');

    const prompt = `故事标题：${story.title}
故事背景：${story.description || ''}

当前故事进展：
${contextSummary}

请续写下一段（150-300字），保持古典文学风格，与前文情节连续。`;

    const baseUrl = process.env.AI_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4';
    const apiKey = process.env.AI_API_KEY || '';
    const model = process.env.AI_MODEL || 'glm-5.1';

    const aiResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: '你是一位精通中国历史的文学作家，擅长古典文学风格的写作。请用中文回答。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
        stream: true
      })
    });

    if (!aiResponse.ok) {
      const text = await aiResponse.text();
      return NextResponse.json({ error: `AI API error: ${text}` }, { status: 500 });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let fullContent = '';

        try {
          const reader = aiResponse.body?.getReader();
          if (!reader) throw new Error('No response body');

          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith('data: ')) continue;
              const data = trimmed.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  fullContent += content;
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                }
              } catch {}
            }
          }

          // Save the completed segment
          const allSegments = await segmentsStore.load();
          const newSegment: StorySegment = {
            id: `seg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            storyId,
            title: '故事续写',
            content: fullContent,
            isBranchPoint: false,
            branchId,
            parentSegmentId: tailSegment.id,
            imageUrls: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          allSegments.push(newSegment);
          await segmentsStore.save(allSegments);

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    });

  } catch (error) {
    console.error('流式续写失败:', error);
    return NextResponse.json(
      { error: '流式续写失败', details: String(error) },
      { status: 500 }
    );
  }
}

exec
/usr/bin/zsh -lc "sed -n '1,260p' 'src/app/api/stories/[id]/branch/route.ts'" in /home/pjlab/fbh/fbh_project/gushi
 succeeded in 0ms:
import { NextRequest, NextResponse } from 'next/server';
import { storiesStore, segmentsStore, branchesStore, getOrderedChain, type StorySegment } from '@/lib/simple-db';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id: storyId } = params;
    const { segmentId, userDirection, branchTitle } = await request.json();

    if (!storyId || !segmentId || !userDirection) {
      return NextResponse.json({ error: '缺少必要参数: segmentId, userDirection' }, { status: 400 });
    }

    const stories = await storiesStore.load();
    const story = stories.find((s: any) => s.id === storyId);
    if (!story) return NextResponse.json({ error: '故事不存在' }, { status: 404 });

    const segments = await segmentsStore.load();
    const currentSegment = segments.find((s: any) => s.id === segmentId && s.storyId === storyId);
    if (!currentSegment) return NextResponse.json({ error: '段落不存在' }, { status: 404 });

    // Generate branch ID
    const branchId = `branch_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    // Create branch record
    const newBranch = {
      id: branchId,
      title: branchTitle || `分叉: ${userDirection}`,
      sourceSegmentId: segmentId,
      storyId,
      userDirection,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const branches = await branchesStore.load();
    branches.push(newBranch);
    await branchesStore.save(branches);

    // Mark source segment as branch point
    currentSegment.isBranchPoint = true;
    await segmentsStore.save(segments);

    // Build context: get ordered chain of main branch up to the source segment
    const mainChain = await getOrderedChain(storyId, 'main');
    const contextSegments = mainChain.filter(s => {
      if (s.id === segmentId) return true;
      // Include all ancestors
      let cur: StorySegment | undefined = s;
      while (cur?.parentSegmentId) {
        if (cur.parentSegmentId === segmentId) return false; // after source
        cur = mainChain.find(ms => ms.id === cur!.parentSegmentId);
      }
      return true;
    });
    // Simpler: just include main chain segments up to and including sourceSegment
    const idx = mainChain.findIndex(s => s.id === segmentId);
    const relevantChain = idx >= 0 ? mainChain.slice(0, idx + 1) : mainChain;

    const contextSummary = relevantChain.map((s: StorySegment) =>
      `${s.title ? `【${s.title}】` : ''}${s.content}`
    ).join('\n');

    const prompt = `故事标题：${story.title}
故事背景：${story.description || ''}

当前故事进展：
${contextSummary}

用户希望的故事走向：${userDirection}

请根据用户指定的方向，续写下一段（150-300字），保持古典文学风格，与前文情节连续。`;

    const baseUrl = process.env.AI_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4';
    const apiKey = process.env.AI_API_KEY || '';
    const model = process.env.AI_MODEL || 'glm-5.1';

    const aiResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: '你是一位精通中国历史的文学作家，擅长古典文学风格的写作。请用中文回答。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!aiResponse.ok) {
      const text = await aiResponse.text();
      throw new Error(`AI API error ${aiResponse.status}: ${text}`);
    }

    const data = await aiResponse.json();
    const aiContent = data.choices?.[0]?.message?.content || '';

    // Create new segment on the new branch
    const newSegment: StorySegment = {
      id: `seg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      storyId,
      title: branchTitle || `分叉: ${userDirection}`,
      content: aiContent,
      isBranchPoint: false,
      branchId, // new branch
      parentSegmentId: segmentId,
      imageUrls: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const allSegments = await segmentsStore.load();
    allSegments.push(newSegment);
    await segmentsStore.save(allSegments);

    return NextResponse.json({
      success: true,
      branch: newBranch,
      segment: newSegment,
      message: '分支创建成功'
    });

  } catch (error) {
    console.error('故事分叉失败:', error);
    return NextResponse.json(
      { error: '故事分叉失败', details: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}

codex
I’ve confirmed a key mismatch already: the create UI sends `storyType` and `prompt`, but the current create API only persists `title`, `description`, and `author`. I’m checking whether “ChronosMirror” or any related historical-validation facilities already exist elsewhere in the repo before I write the gap section.
exec
/usr/bin/zsh -lc "rg -n \"ChronosMirror|chronos|timeline|Wikipedia|MCP|pace|pacing|character model|角色|人物设定|时间线|维基\" src Docs prisma data -g '"'!node_modules'"'" in /home/pjlab/fbh/fbh_project/gushi
 succeeded in 0ms:
src/app/page.tsx:110:          <div className="p-6 space-y-4">
src/components/story/StoryImageDisplay.tsx:122:    <div className={`space-y-4 ${className}`}>
src/components/StreamingText.tsx:129:      <div className="space-y-4">
src/app/create/page.tsx:273:              <form onSubmit={handleCustomCreate} className="space-y-5">
src/app/story/[id]/page.tsx:293:            <div className="space-y-2 mb-5">
src/app/story/[id]/page.tsx:434:          <div className="space-y-8">
src/app/globals.css:71:/* 时间线样式 */
src/app/globals.css:72:.timeline-line {
src/app/globals.css:75:.timeline-line::before {
src/app/globals.css:107:  letter-spacing: 0.05em;
Docs/researches/src_app_create_research.md.tmp:13:Analyze all source files in src/app/create/. For each file: purpose, exports, dependencies. Then: architecture overview and ChronosMirror upgrade gaps (character modeling, timeline validation, MCP Wikipedia, pacing control). Write results to /home/pjlab/fbh/fbh_project/gushi/Docs/researches/src_app_create_research.md
Docs/researches/src_app_create_research.md.tmp:18:  • Synthesize architecture overview and ChronosMirror upgrade gaps
Docs/researches/src_app_create_research.md.tmp:31:The route is small on disk: `src/app/create/` currently contains a single source file, `page.tsx`. I’m reading that file and then tracing the imported project modules it depends on where that context affects the architecture and ChronosMirror gap analysis.
Docs/researches/src_app_create_research.md.tmp:277:/usr/bin/zsh -lc 'rg -n "''^import|''^export|function |const .* =|use client|Timeline|Chronos|mirror|Wikipedia|MCP|pace|character" src/app/create/page.tsx' in /home/pjlab/fbh/fbh_project/gushi
Docs/researches/src_app_create_research.md.tmp:303:273:              <form onSubmit={handleCustomCreate} className="space-y-5">
Docs/researches/src_app_create_research.md.tmp:342:              <form onSubmit={handleCustomCreate} className="space-y-5">
Docs/researches/src_app_create_research.md.tmp:951:The first read missed because zsh treated `[id]` as a glob. I’m rerunning those reads with quoted paths; the gap analysis depends on whether continuation/branch generation already carries any character, pacing, or validation hooks.
Docs/researches/src_app_create_research.md.tmp:1337:I’ve confirmed a key mismatch already: the create UI sends `storyType` and `prompt`, but the current create API only persists `title`, `description`, and `author`. I’m checking whether “ChronosMirror” or any related historical-validation facilities already exist elsewhere in the repo before I write the gap section.
Docs/researches/src_app_story_research.md:23:- rendering the timeline-style reading UI
Docs/researches/src_app_story_research.md:103:- main story timeline with segment cards, branch markers, and a bottom continuation button
Docs/researches/src_app_story_research.md:156:- any ChronosMirror expansion that adds character state, validation warnings, citations, or pacing metadata will require changes to both the fetch payloads and this page state model
Docs/researches/src_app_story_research.md:185:This matters because the `src/app/story/[id]/page.tsx` UI is designed around linear chains per branch, not around a richer event graph or a validated historical timeline.
Docs/researches/src_app_story_research.md:205:4. The page renders the chain as a timeline-style reader.
Docs/researches/src_app_story_research.md:237:- The route is branch-centric, not timeline-centric. A branch is modeled as a simple linked list of segments.
Docs/researches/src_app_story_research.md:240:## ChronosMirror upgrade gaps
Docs/researches/src_app_story_research.md:242:ChronosMirror, as described in the request, needs stronger historical reasoning, character state, retrieval, and generation control than the current route stack provides.
Docs/researches/src_app_story_research.md:264:Why this blocks ChronosMirror:
Docs/researches/src_app_story_research.md:275:- Return character-state payloads to the story page so ChronosMirror can expose character consistency indicators and relationship changes per segment.
Docs/researches/src_app_story_research.md:297:Why this blocks ChronosMirror:
Docs/researches/src_app_story_research.md:299:- ChronosMirror needs a validated causal and temporal model, not just parent pointers.
Docs/researches/src_app_story_research.md:313:### 3. MCP Wikipedia gap
Docs/researches/src_app_story_research.md:317:- No file in the story path or story API path imports or calls any MCP client.
Docs/researches/src_app_story_research.md:321:Why this blocks ChronosMirror:
Docs/researches/src_app_story_research.md:331:  - query Wikipedia through MCP
Docs/researches/src_app_story_research.md:357:Why this blocks ChronosMirror:
Docs/researches/src_app_story_research.md:359:- ChronosMirror pacing control requires explicit narrative planning signals, not only prose continuation.
Docs/researches/src_app_story_research.md:365:- Extend request payloads with pacing directives and director controls.
Docs/researches/src_app_story_research.md:371:- Add segment metadata for pacing so the story page can show branch intensity, beat markers, or scene boundaries instead of only raw paragraphs.
Docs/researches/src_app_story_research.md:375:ChronosMirror is not just a UI enhancement for `src/app/story/[id]/page.tsx`. The required changes cut across the full stack:
Docs/researches/src_app_story_research.md:378:  - needs new state, controls, and displays for character, validation, citations, and pacing
Docs/researches/src_app_story_research.md:388:  - is too narrow for robust character graphs, citation bundles, and timeline validators; the current JSON-list store is likely a transitional persistence layer, not a suitable final ChronosMirror backend
Docs/researches/src_app_story_research.md:392:`src/app/story/` is currently a single client page that presents a branch-based reading experience over a simple API and JSON-store backend. It is functional for basic reading, continuation, and forking, but it does not yet have the structured narrative state that ChronosMirror needs.
Docs/researches/src_app_story_research.md:397:- no structured character model
Docs/researches/src_app_story_research.md:398:- no timeline or historical validation pipeline
Docs/researches/src_app_story_research.md:399:- no MCP Wikipedia retrieval
Docs/researches/src_app_story_research.md:400:- no true pacing/director control beyond coarse prompt wording and cosmetic UI steps
Docs/researches/src_app_story_research.md:402:That means the ChronosMirror upgrade should be treated as a data-model and orchestration upgrade first, and only secondarily as a page-level UI enhancement.
Docs/researches/src_app_api_research.md:2:Analyze all source files in src/app/api/. For each file: purpose, exports, dependencies. Then: architecture overview and ChronosMirror upgrade gaps (character modeling, timeline validation, MCP Wikipedia, pacing control). Write results to /home/pjlab/fbh/fbh_project/gushi/Docs/researches/src_app_api_research.md
Docs/researches/src_app_api_research.md:19:/usr/bin/zsh -lc 'pwd && ls -la && rg -n "ChronosMirror|chronos mirror|timeline validation|MCP Wikipedia|pacing control|character modeling" -S .' in /home/pjlab/fbh/fbh_project/gushi
Docs/researches/src_app_api_research.md:57:./Docs/researches/src_app_story_research.md.tmp:14:Research ALL files in the directory 'src/app/story' under this project. For each file found: describe its purpose, key functions/classes/types, exports, and dependencies. Then provide an architecture overview of how files in this directory relate to each other. Finally, note specific areas needing improvement for the ChronosMirror upgrade: character persona modeling (multi-dimensional attributes, speech patterns, dynamic relationships), timeline validation (historical accuracy, temporal consistency), MCP Wikipedia integration (fact-checking historical details), and pacing control (step-by-step generation, director mode). Be thorough and specific — cite actual function names, type definitions, and code patterns.
Docs/researches/src_app_api_research.md:58:./Docs/researches/src_app_story_research.md.tmp:33:  • Synthesize directory architecture and ChronosMirror upgrade gaps
Docs/researches/src_app_api_research.md:59:./Docs/researches/src_app_story_research.md.tmp:55:- ChronosMirror upgrade gaps for persona modeling, timeline validation, MCP Wikipedia fact-checking, and pacing/director-mode control
Docs/researches/src_app_api_research.md:60:./Docs/researches/src_app_story_research.md.tmp:78:- ChronosMirror upgrade gaps for persona modeling, timeline validation, MCP Wikipedia fact-checking, and pacing/director-mode control
Docs/researches/src_app_api_research.md:61:./Docs/researches/src_app_api_research.md.tmp:13:Analyze all source files in src/app/api/. For each file: purpose, exports, dependencies. Then: architecture overview and ChronosMirror upgrade gaps (character modeling, timeline validation, MCP Wikipedia, pacing control). Write results to /home/pjlab/fbh/fbh_project/gushi/Docs/researches/src_app_api_research.md
Docs/researches/src_app_api_research.md:1405:Research ALL files in the directory 'src/app/story' under this project. For each file found: describe its purpose, key functions/classes/types, exports, and dependencies. Then provide an architecture overview of how files in this directory relate to each other. Finally, note specific areas needing improvement for the ChronosMirror upgrade: character persona modeling (multi-dimensional attributes, speech patterns, dynamic relationships), timeline validation (historical accuracy, temporal consistency), MCP Wikipedia integration (fact-checking historical details), and pacing control (step-by-step generation, director mode). Be thorough and specific — cite actual function names, type definitions, and code patterns.
Docs/researches/src_app_api_research.md:1419:The sandbox failure is happening before any command logic runs. I’m checking whether a PTY session avoids that wrapper path; if not, I’ll have to stop and report that the workspace can’t currently be read from this environment.
Docs/researches/src_app_api_research.md:1424:  • Synthesize directory architecture and ChronosMirror upgrade gaps
Docs/researches/src_app_api_research.md:1426:I can’t complete the requested file-by-file research from this session because the workspace shell is failing before any command runs, so I have no reliable way to read `src/app/story`.
Docs/researches/src_app_api_research.md:1438:1. Fix the execution environment so shell commands can run in this workspace, then ask again.
Docs/researches/src_app_api_research.md:1446:- ChronosMirror upgrade gaps for persona modeling, timeline validation, MCP Wikipedia fact-checking, and pacing/director-mode control
Docs/researches/src_app_api_research.md:1448:I can’t complete the requested file-by-file research from this session because the workspace shell is failing before any command runs, so I have no reliable way to read `src/app/story`.
Docs/researches/src_app_api_research.md:1460:1. Fix the execution environment so shell commands can run in this workspace, then ask again.
Docs/researches/src_app_api_research.md:1468:- ChronosMirror upgrade gaps for persona modeling, timeline validation, MCP Wikipedia fact-checking, and pacing/director-mode control
Docs/researches/src_app_api_research.md:1471:I have the route implementations now. Next pass is tracing who calls them and whether the API layer has any deeper model/service abstractions, because that determines whether the ChronosMirror gaps are isolated or systemic.
Docs/researches/src_app_api_research.md:1970:          <div className="p-6 space-y-4">
Docs/researches/src_app_api_research.md:2479:            <div className="space-y-2 mb-5">
Docs/researches/src_app_api_research.md:2652:    <div className={`space-y-4 ${className}`}>
Docs/researches/src_app_api_research.md:2837:      <div className="space-y-4">
Docs/researches/src_app_api_research.md:2942:  → Synthesize per-file purpose, exports, dependencies, architecture, and ChronosMirror upgrade gaps

exec
/usr/bin/zsh -lc "nl -ba src/app/create/page.tsx | sed -n '1,360p'" in /home/pjlab/fbh/fbh_project/gushi
exec
/usr/bin/zsh -lc "nl -ba src/app/api/stories/route.ts | sed -n '1,220p'" in /home/pjlab/fbh/fbh_project/gushi
 succeeded in 0ms:
     1	import { NextRequest, NextResponse } from 'next/server';
     2	import { storiesStore, segmentsStore, type Story, type StorySegment } from '@/lib/simple-db';
     3	
     4	export async function GET() {
     5	  try {
     6	    const stories = await storiesStore.load();
     7	    
     8	    // 按创建时间倒序排列
     9	    const sortedStories = stories.sort((a: Story, b: Story) => 
    10	      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    11	    );
    12	
    13	    return NextResponse.json({
    14	      success: true,
    15	      stories: sortedStories,
    16	      total: sortedStories.length
    17	    });
    18	  } catch (error) {
    19	    console.error('获取故事列表失败:', error);
    20	    return NextResponse.json(
    21	      { 
    22	        error: '获取故事列表失败',
    23	        details: error instanceof Error ? error.message : '未知错误'
    24	      },
    25	      { status: 500 }
    26	    );
    27	  }
    28	}
    29	
    30	export async function POST(request: NextRequest) {
    31	  try {
    32	    const body = await request.json();
    33	    const { title, description, author } = body;
    34	
    35	    if (!title) {
    36	      return NextResponse.json(
    37	        { error: '故事标题是必填项' },
    38	        { status: 400 }
    39	      );
    40	    }
    41	
    42	    const stories = await storiesStore.load();
    43	
    44	    // 幂等：标题已存在则返回已有故事
    45	    const existing = stories.find((s: Story) => s.title === title);
    46	    if (existing) {
    47	      return NextResponse.json({
    48	        success: true,
    49	        story: existing,
    50	        message: '故事已存在'
    51	      });
    52	    }
    53	
    54	    const newStory: Story = {
    55	      id: `story_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    56	      title,
    57	      description: description || '',
    58	      author: author || '佚名',
    59	      createdAt: new Date().toISOString(),
    60	      updatedAt: new Date().toISOString()
    61	    };
    62	
    63	    stories.push(newStory);
    64	    await storiesStore.save(stories);
    65	
    66	    // 自动生成首个段落（故事开篇）
    67	    const firstSegment: StorySegment = {
    68	      id: `seg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    69	      title: `${title}·开篇`,
    70	      content: `《${title}》的故事开始了...`, // 临时内容，后续通过 AI 生成完整开篇
    71	      isBranchPoint: false,
    72	      createdAt: new Date().toISOString(),
    73	      updatedAt: new Date().toISOString(),
    74	      storyId: newStory.id,
    75	      branchId: 'main',
    76	      parentSegmentId: '',
    77	      imageUrls: []
    78	    };
    79	
    80	    const segments = await segmentsStore.load();
    81	    segments.push(firstSegment);
    82	    await segmentsStore.save(segments);
    83	
    84	    // 更新故事的 rootSegmentId
    85	    newStory.rootSegmentId = firstSegment.id;
    86	    const updatedStories = stories.map((s: Story) => s.id === newStory.id ? newStory : s);
    87	    await storiesStore.save(updatedStories);
    88	
    89	    return NextResponse.json({
    90	      success: true,
    91	      story: newStory,
    92	      firstSegment,
    93	      message: '故事创建成功，已生成开篇段落'
    94	    }, { status: 201 });
    95	
    96	  } catch (error) {
    97	    console.error('创建故事失败:', error);
    98	    return NextResponse.json(
    99	      { 
   100	        error: '创建故事失败',
   101	        details: error instanceof Error ? error.message : '未知错误'
   102	      },
   103	      { status: 500 }
   104	    );
   105	  }
   106	}

 succeeded in 0ms:
     1	'use client';
     2	
     3	import { useState } from 'react';
     4	import { useRouter } from 'next/navigation';
     5	import Link from 'next/link';
     6	
     7	const storyTemplates = [
     8	  {
     9	    id: 'history_1',
    10	    title: '荆轲刺秦王',
    11	    description: '战国末期，燕国太子丹派遣荆轲刺杀秦王嬴政。匕首图穷而见，历史在此分叉。',
    12	    era: '战国',
    13	    icon: '🗡️',
    14	    gradient: 'from-amber-800 to-red-900',
    15	    difficulty: 'medium',
    16	    time: '30-45分钟',
    17	    prompts: [
    18	      '如果荆轲成功刺杀秦王，历史将如何改写？',
    19	      '如果秦王提前发现刺杀计划，会有什么后果？',
    20	      '如果太子丹阻止了这次刺杀，燕国的命运如何？'
    21	    ]
    22	  },
    23	  {
    24	    id: 'history_2',
    25	    title: '赤壁之战',
    26	    description: '东汉末年，孙刘联军在赤壁以少胜多大败曹操。东风不与周郎便，铜雀春深锁二乔？',
    27	    era: '三国',
    28	    icon: '🔥',
    29	    gradient: 'from-blue-800 to-indigo-900',
    30	    difficulty: 'hard',
    31	    time: '45-60分钟',
    32	    prompts: [
    33	      '如果东南风没有刮起，赤壁之战的结果会如何？',
    34	      '如果曹操接受了黄盖的投降，三国鼎立的局面会改变吗？',
    35	      '如果周瑜在赤壁之战中阵亡，东吴的命运如何？'
    36	    ]
    37	  },
    38	  {
    39	    id: 'history_3',
    40	    title: '玄武门之变',
    41	    description: '大唐初年，李世民于玄武门伏击太子李建成。手足相残，帝业更替。',
    42	    era: '唐',
    43	    icon: '⚔️',
    44	    gradient: 'from-emerald-800 to-teal-900',
    45	    difficulty: 'medium',
    46	    time: '30-45分钟',
    47	    prompts: [
    48	      '如果李建成提前得知李世民的阴谋，历史会如何发展？',
    49	      '如果李世民在玄武门之变中失败，唐朝的命运如何？',
    50	      '如果李渊出面调解兄弟矛盾，会有什么结果？'
    51	    ]
    52	  }
    53	];
    54	
    55	const storyTypes = [
    56	  { id: 'historical', name: '历史分叉', description: '基于真实历史的关键转折点' },
    57	  { id: 'legend', name: '神话传说', description: '古典神话的另一种可能' },
    58	  { id: 'literary', name: '文学名著', description: '经典文学作品的续写' },
    59	  { id: 'original', name: '原创故事', description: '完全原创的分叉故事' }
    60	];
    61	
    62	export default function CreateStoryPage() {
    63	  const router = useRouter();
    64	  const [tab, setTab] = useState<'template' | 'custom'>('template');
    65	  const [storyType, setStoryType] = useState('historical');
    66	  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
    67	  const [selectedPrompt, setSelectedPrompt] = useState<string>('');
    68	  const [creating, setCreating] = useState(false);
    69	  const [customTitle, setCustomTitle] = useState('');
    70	  const [customDesc, setCustomDesc] = useState('');
    71	  const [customAuthor, setCustomAuthor] = useState('');
    72	  const [customPrompt, setCustomPrompt] = useState('');
    73	
    74	  const handleTemplateCreate = async () => {
    75	    if (!selectedTemplate || !selectedPrompt || creating) return;
    76	    const template = storyTemplates.find(t => t.id === selectedTemplate);
    77	    if (!template) return;
    78	    
    79	    setCreating(true);
    80	    try {
    81	      const res = await fetch('/api/stories', {
    82	        method: 'POST',
    83	        headers: { 'Content-Type': 'application/json' },
    84	        body: JSON.stringify({ 
    85	          title: template.title, 
    86	          description: `${template.description}\n\n思考方向：${selectedPrompt}`,
    87	          author: '佚名',
    88	          storyType,
    89	          prompt: selectedPrompt
    90	        })
    91	      });
    92	      if (!res.ok) throw new Error();
    93	      const data = await res.json();
    94	      if (data.story?.id) router.push(`/story/${data.story.id}`);
    95	    } catch {
    96	      alert('创建失败，请重试');
    97	    } finally {
    98	      setCreating(false);
    99	    }
   100	  };
   101	
   102	  const handleCustomCreate = async (e: React.FormEvent) => {
   103	    e.preventDefault();
   104	    if (!customTitle || creating) return;
   105	    setCreating(true);
   106	    try {
   107	      const res = await fetch('/api/stories', {
   108	        method: 'POST',
   109	        headers: { 'Content-Type': 'application/json' },
   110	        body: JSON.stringify({ 
   111	          title: customTitle, 
   112	          description: customDesc,
   113	          author: customAuthor || '佚名',
   114	          storyType,
   115	          prompt: customPrompt
   116	        })
   117	      });
   118	      if (!res.ok) throw new Error();
   119	      const data = await res.json();
   120	      if (data.story?.id) router.push(`/story/${data.story.id}`);
   121	    } catch {
   122	      alert('创建失败，请重试');
   123	    } finally {
   124	      setCreating(false);
   125	    }
   126	  };
   127	
   128	  return (
   129	    <div className="min-h-screen" style={{ background: 'var(--paper)' }}>
   130	      {/* 导航 */}
   131	      <nav className="sticky top-0 z-10 backdrop-blur-sm border-b border-[var(--border)]" style={{ background: 'rgba(250,246,240,0.9)' }}>
   132	        <div className="max-w-4xl mx-auto px-6 py-3">
   133	          <Link href="/" className="text-sm text-[var(--muted)] hover:text-[var(--ink)] transition-colors">
   134	            ← 故事列表
   135	          </Link>
   136	        </div>
   137	      </nav>
   138	
   139	      <div className="max-w-4xl mx-auto px-6 pt-12 pb-20">
   140	        {/* 标题 */}
   141	        <div className="text-center mb-10">
   142	          <div className="divider-ornament mb-4">
   143	            <span>笔</span>
   144	          </div>
   145	          <h1 className="text-3xl font-bold text-[var(--ink)] tracking-widest mb-2">开启新篇</h1>
   146	          <p className="text-[var(--muted)] text-sm">选择一段历史，或书写你自己的故事</p>
   147	        </div>
   148	
   149	        {/* 故事类型选择 */}
   150	        <div className="mb-10">
   151	          <h3 className="text-lg font-bold text-[var(--ink)] mb-4 text-center">选择故事类型</h3>
   152	          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
   153	            {storyTypes.map((type) => (
   154	              <button
   155	                key={type.id}
   156	                onClick={() => setStoryType(type.id)}
   157	                className={`p-4 rounded-xl border-2 transition-all text-left ${
   158	                  storyType === type.id
   159	                    ? 'border-[var(--gold)] bg-amber-50 shadow-md scale-[1.02]'
   160	                    : 'border-[var(--border)] hover:border-[var(--gold)]/50 hover:shadow-md'
   161	                }`}
   162	              >
   163	                <h4 className="font-bold text-[var(--ink)] mb-2">{type.name}</h4>
   164	                <p className="text-xs text-[var(--muted)]">{type.description}</p>
   165	              </button>
   166	            ))}
   167	          </div>
   168	        </div>
   169	
   170	        {/* Tab 切换 */}
   171	        <div className="flex justify-center mb-10">
   172	          <div className="inline-flex rounded-full border border-[var(--border)] bg-white p-1">
   173	            <button
   174	              onClick={() => { setTab('template'); setSelectedTemplate(null); setSelectedPrompt(''); }}
   175	              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
   176	                tab === 'template'
   177	                  ? 'bg-[var(--ink)] text-white shadow-sm'
   178	                  : 'text-[var(--muted)] hover:text-[var(--ink)]'
   179	              }`}
   180	            >
   181	              模板故事
   182	            </button>
   183	            <button
   184	              onClick={() => setTab('custom')}
   185	              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
   186	                tab === 'custom'
   187	                  ? 'bg-[var(--ink)] text-white shadow-sm'
   188	                  : 'text-[var(--muted)] hover:text-[var(--ink)]'
   189	              }`}
   190	            >
   191	              自定义创作
   192	            </button>
   193	          </div>
   194	        </div>
   195	
   196	        {/* 模板故事选择 */}
   197	        {tab === 'template' && (
   198	          <div>
   199	            <div className="grid gap-6 md:grid-cols-3">
   200	              {storyTemplates.map((template, i) => (
   201	                <div
   202	                  key={template.id}
   203	                  onClick={() => {
   204	                    setSelectedTemplate(template.id);
   205	                    setSelectedPrompt(template.prompts[0]);
   206	                  }}
   207	                  className={`animate-fade-in-up cursor-pointer rounded-xl overflow-hidden border-2 transition-all ${
   208	                    selectedTemplate === template.id
   209	                      ? 'border-[var(--gold)] shadow-lg scale-[1.02]'
   210	                      : 'border-[var(--border)] hover:border-[var(--gold)]/50 hover:shadow-md'
   211	                  }`}
   212	                  style={{ animationDelay: `${i * 100}ms` }}
   213	                >
   214	                  <div className={`h-24 bg-gradient-to-br ${template.gradient} flex items-center justify-center`}>
   215	                    <span className="text-4xl">{template.icon}</span>
   216	                  </div>
   217	                  <div className="p-5 bg-white">
   218	                    <div className="flex items-center justify-between mb-2">
   219	                      <span className="text-xs px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full border border-amber-200">
   220	                        {template.era}
   221	                      </span>
   222	                      <span className="text-xs text-[var(--muted)]">{template.time}</span>
   223	                    </div>
   224	                    <h3 className="text-lg font-bold text-[var(--ink)] mb-2">{template.title}</h3>
   225	                    <p className="text-xs text-[var(--muted)] leading-relaxed line-clamp-3">{template.description}</p>
   226	                  </div>
   227	                </div>
   228	              ))}
   229	            </div>
   230	
   231	            {/* 思考方向选择 */}
   232	            {selectedTemplate && (
   233	              <div className="mt-8 bg-white rounded-xl border border-[var(--border)] p-6">
   234	                <h4 className="font-bold text-[var(--ink)] mb-4">选择思考方向</h4>
   235	                <div className="grid gap-3">
   236	                  {storyTemplates.find(t => t.id === selectedTemplate)?.prompts.map((prompt, idx) => (
   237	                    <button
   238	                      key={idx}
   239	                      onClick={() => setSelectedPrompt(prompt)}
   240	                      className={`text-left p-3 rounded-lg border transition-colors ${
   241	                        selectedPrompt === prompt
   242	                          ? 'border-[var(--accent)] bg-red-50 text-[var(--accent)]'
   243	                          : 'border-[var(--border)] hover:border-[var(--gold)]/50'
   244	                      }`}
   245	                    >
   246	                      <p className="text-sm">{prompt}</p>
   247	                    </button>
   248	                  ))}
   249	                </div>
   250	              </div>
   251	            )}
   252	
   253	            <div className="mt-10 text-center">
   254	              <button
   255	                onClick={handleTemplateCreate}
   256	                disabled={!selectedTemplate || !selectedPrompt || creating}
   257	                className={`inline-flex items-center gap-2 px-10 py-3 rounded-full font-medium transition-all ${
   258	                  selectedTemplate && selectedPrompt && !creating
   259	                    ? 'bg-gradient-to-r from-amber-700 to-red-800 text-white hover:shadow-lg'
   260	                    : 'bg-gray-200 text-[var(--muted)] cursor-not-allowed'
   261	                }`}
   262	              >
   263	                {creating ? '创建中...' : '✦ 开始这个故事'}
   264	              </button>
   265	            </div>
   266	          </div>
   267	        )}
   268	
   269	        {/* 自定义创建 */}
   270	        {tab === 'custom' && (
   271	          <div className="max-w-lg mx-auto">
   272	            <div className="bg-white rounded-xl border border-[var(--border)] p-8 shadow-sm">
   273	              <form onSubmit={handleCustomCreate} className="space-y-5">
   274	                <div>
   275	                  <label className="block text-sm font-medium text-[var(--ink)] mb-2">故事标题 *</label>
   276	                  <input
   277	                    type="text"
   278	                    value={customTitle}
   279	                    onChange={e => setCustomTitle(e.target.value)}
   280	                    placeholder="例：卧龙出山"
   281	                    className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--paper)] text-[var(--ink)] placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)] focus:border-transparent transition-all"
   282	                    required
   283	                  />
   284	                </div>
   285	                <div>
   286	                  <label className="block text-sm font-medium text-[var(--ink)] mb-2">故事描述</label>
   287	                  <textarea
   288	                    value={customDesc}
   289	                    onChange={e => setCustomDesc(e.target.value)}
   290	                    placeholder="描述故事的背景和设定..."
   291	                    rows={4}
   292	                    className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--paper)] text-[var(--ink)] placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)] focus:border-transparent transition-all resize-none"
   293	                  />
   294	                </div>
   295	                <div>
   296	                  <label className="block text-sm font-medium text-[var(--ink)] mb-2">故事类型</label>
   297	                  <select
   298	                    value={storyType}
   299	                    onChange={(e) => setStoryType(e.target.value)}
   300	                    className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)] focus:border-transparent transition-all"
   301	                  >
   302	                    {storyTypes.map(type => (
   303	                      <option key={type.id} value={type.id}>{type.name}</option>
   304	                    ))}
   305	                  </select>
   306	                </div>
   307	                <div>
   308	                  <label className="block text-sm font-medium text-[var(--ink)] mb-2">思考方向/提示词</label>
   309	                  <textarea
   310	                    value={customPrompt}
   311	                    onChange={e => setCustomPrompt(e.target.value)}
   312	                    placeholder="描述你希望故事如何发展，或者提供一些创作思路..."
   313	                    rows={3}
   314	                    className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--paper)] text-[var(--ink)] placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)] focus:border-transparent transition-all resize-none"
   315	                  />
   316	                </div>
   317	                <div>
   318	                  <label className="block text-sm font-medium text-[var(--ink)] mb-2">作者</label>
   319	                  <input
   320	                    type="text"
   321	                    value={customAuthor}
   322	                    onChange={e => setCustomAuthor(e.target.value)}
   323	                    placeholder="你的名字"
   324	                    className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--paper)] text-[var(--ink)] placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)] focus:border-transparent transition-all"
   325	                  />
   326	                </div>
   327	                <button
   328	                  type="submit"
   329	                  disabled={creating}
   330	                  className={`w-full py-3 rounded-full font-medium transition-all ${
   331	                    !creating
   332	                      ? 'bg-gradient-to-r from-amber-700 to-red-800 text-white hover:shadow-lg'
   333	                      : 'bg-gray-200 text-[var(--muted)] cursor-wait'
   334	                  }`}
   335	                >
   336	                  {creating ? '创建中...' : '✦ 创建故事'}
   337	                </button>
   338	              </form>
   339	            </div>
   340	          </div>
   341	        )}
   342	      </div>
   343	    </div>
   344	  );
   345	}

exec
/usr/bin/zsh -lc "nl -ba src/lib/simple-db.ts | sed -n '1,220p'" in /home/pjlab/fbh/fbh_project/gushi
 succeeded in 0ms:
     1	import fs from 'fs/promises';
     2	import path from 'path';
     3	
     4	const DATA_DIR = path.join(process.cwd(), 'data');
     5	
     6	async function ensureDataDir() {
     7	  try {
     8	    await fs.access(DATA_DIR);
     9	  } catch {
    10	    await fs.mkdir(DATA_DIR, { recursive: true });
    11	  }
    12	}
    13	
    14	class SimpleStore<T> {
    15	  constructor(private filename: string) {
    16	    this.dataPath = path.join(DATA_DIR, filename);
    17	  }
    18	
    19	  private dataPath: string;
    20	
    21	  async load(): Promise<T[]> {
    22	    await ensureDataDir();
    23	    try {
    24	      const data = await fs.readFile(this.dataPath, 'utf-8');
    25	      return JSON.parse(data);
    26	    } catch {
    27	      return [];
    28	    }
    29	  }
    30	
    31	  async save(data: T[]): Promise<void> {
    32	    await ensureDataDir();
    33	    await fs.writeFile(this.dataPath, JSON.stringify(data, null, 2));
    34	  }
    35	}
    36	
    37	interface Story {
    38	  id: string;
    39	  title: string;
    40	  description?: string;
    41	  author?: string;
    42	  createdAt: string;
    43	  updatedAt: string;
    44	  rootSegmentId?: string;
    45	}
    46	
    47	interface StorySegment {
    48	  id: string;
    49	  title?: string;
    50	  content: string;
    51	  isBranchPoint: boolean;
    52	  createdAt: string;
    53	  updatedAt: string;
    54	  storyId: string;
    55	  branchId: string;
    56	  parentSegmentId?: string;
    57	  imageUrls: string[];
    58	}
    59	
    60	interface StoryBranch {
    61	  id: string;
    62	  title: string;
    63	  description?: string;
    64	  sourceSegmentId: string;
    65	  storyId: string;
    66	  userDirection: string;
    67	  createdAt: string;
    68	  updatedAt: string;
    69	}
    70	
    71	const storiesStore = new SimpleStore<Story>('stories.json');
    72	const segmentsStore = new SimpleStore<StorySegment>('segments.json');
    73	const branchesStore = new SimpleStore<StoryBranch>('branches.json');
    74	
    75	// Get ordered chain for a branch by following parentSegmentId links
    76	async function getOrderedChain(storyId: string, branchId: string): Promise<StorySegment[]> {
    77	  const segments = await segmentsStore.load();
    78	  const storySegments = segments.filter(s => s.storyId === storyId && s.branchId === branchId);
    79	
    80	  if (branchId === 'main') {
    81	    // Main branch: start from root (no parentSegmentId)
    82	    const chain: StorySegment[] = [];
    83	    let current = storySegments.find(s => !s.parentSegmentId);
    84	    const visited = new Set<string>();
    85	    while (current && !visited.has(current.id)) {
    86	      visited.add(current.id);
    87	      chain.push(current);
    88	      current = storySegments.find(s => s.parentSegmentId === current!.id);
    89	    }
    90	    return chain;
    91	  } else {
    92	    // Non-main branch: start from the segment whose parent is the sourceSegmentId
    93	    const branches = await branchesStore.load();
    94	    const branch = branches.find(b => b.id === branchId);
    95	    if (!branch) return [];
    96	
    97	    const chain: StorySegment[] = [];
    98	    let current = storySegments.find(s => s.parentSegmentId === branch.sourceSegmentId);
    99	    const visited = new Set<string>();
   100	    while (current && !visited.has(current.id)) {
   101	      visited.add(current.id);
   102	      chain.push(current);
   103	      current = storySegments.find(s => s.parentSegmentId === current!.id);
   104	    }
   105	    return chain;
   106	  }
   107	}
   108	
   109	// Get the tail segment of a branch chain
   110	async function getTailSegment(storyId: string, branchId: string): Promise<StorySegment | null> {
   111	  const chain = await getOrderedChain(storyId, branchId);
   112	  return chain.length > 0 ? chain[chain.length - 1] : null;
   113	}
   114	
   115	// Get all segments for a story
   116	async function getStorySegments(storyId: string): Promise<StorySegment[]> {
   117	  const segments = await segmentsStore.load();
   118	  return segments.filter(s => s.storyId === storyId);
   119	}
   120	
   121	// Get branches for a story
   122	async function getStoryBranches(storyId: string): Promise<StoryBranch[]> {
   123	  const branches = await branchesStore.load();
   124	  return branches.filter(b => b.storyId === storyId);
   125	}
   126	
   127	export {
   128	  storiesStore,
   129	  segmentsStore,
   130	  branchesStore,
   131	  getOrderedChain,
   132	  getTailSegment,
   133	  getStorySegments,
   134	  getStoryBranches,
   135	  type Story,
   136	  type StorySegment,
   137	  type StoryBranch
   138	};

exec
/usr/bin/zsh -lc "nl -ba src/types/story.ts | sed -n '1,220p'" in /home/pjlab/fbh/fbh_project/gushi
 succeeded in 0ms:
     1	// 故事相关类型定义
     2	export type Story = {
     3	  id: string;
     4	  title: string;
     5	  description?: string;
     6	  author?: string;
     7	  createdAt: string;
     8	  updatedAt: string;
     9	  rootSegmentId?: string;
    10	};
    11	
    12	export type StorySegment = {
    13	  id: string;
    14	  title?: string;
    15	  content: string;
    16	  isBranchPoint: boolean;
    17	  createdAt: string;
    18	  updatedAt: string;
    19	  storyId: string;
    20	  branchId: string; // 所属分支 ID，主线的 branchId 为 "main"
    21	  parentSegmentId: string; // 父段落 ID（用于构建分支树）
    22	  imageUrls: string[];
    23	};
    24	
    25	export type StoryBranch = {
    26	  id: string;
    27	  title: string;
    28	  description?: string;
    29	  sourceSegmentId: string; // 从哪个段落分叉出来的
    30	  storyId: string;
    31	  userDirection: string; // 用户输入的分叉方向描述
    32	  createdAt: string;
    33	  updatedAt: string;
    34	};
    35	
    36	// API 请求/响应类型
    37	export type ContinueStoryRequest = {
    38	  segmentId: string;
    39	  branchId: string; // 当前分支 ID
    40	  content?: string;
    41	  style?: string;
    42	  characters?: string[];
    43	};
    44	
    45	export type BranchStoryRequest = {
    46	  segmentId: string;
    47	  userDirection: string; // 用户输入的分叉方向描述
    48	  branchTitle?: string; // 分支标题（可选，可为空让 AI 生成）
    49	};
    50	
    51	export type StoryResponse = {
    52	  segments: StorySegment[];
    53	  branches: StoryBranch[];
    54	  currentSegment: StorySegment;
    55	};
    56	
    57	// UI 组件类型
    58	export type TreeNode = {
    59	  id: string;
    60	  title?: string;
    61	  content?: string;
    62	  isBranchPoint: boolean;
    63	  children: TreeNode[];
    64	  branchId: string;
    65	  branchTitle?: string;
    66	  parentSegmentId?: string;
    67	};
    68	
    69	// 向后兼容的类实现
    70	class StoryClass {
    71	  id!: string;
    72	  title!: string;
    73	  description?: string;
    74	  author?: string;
    75	  createdAt!: string;
    76	  updatedAt!: string;
    77	  rootSegmentId?: string;
    78	  constructor(data: Story) { Object.assign(this, data); }
    79	}
    80	
    81	class StorySegmentClass {
    82	  id!: string;
    83	  title?: string;
    84	  content!: string;
    85	  isBranchPoint!: boolean;
    86	  createdAt!: string;
    87	  updatedAt!: string;
    88	  storyId!: string;
    89	  branchId!: string; // 所属分支 ID，主线的 branchId 为 "main"
    90	  parentSegmentId!: string; // 父段落 ID（用于构建分支树）
    91	  imageUrls!: string[];
    92	  constructor(data: StorySegment) { Object.assign(this, data); }
    93	}
    94	
    95	class StoryBranchClass {
    96	  id!: string;
    97	  title!: string;
    98	  description?: string;
    99	  sourceSegmentId!: string; // 从哪个段落分叉出来的
   100	  storyId!: string;
   101	  userDirection!: string; // 用户输入的分叉方向描述
   102	  createdAt!: string;
   103	  updatedAt!: string;
   104	  constructor(data: StoryBranch) { Object.assign(this, data); }
   105	}
   106	
   107	module.exports = {
   108	  Story: StoryClass,
   109	  StorySegment: StorySegmentClass,
   110	  StoryBranch: StoryBranchClass
   111	};

exec
/usr/bin/zsh -lc "test -f Docs/researches/src_app_create_research.md && sed -n '1,240p' Docs/researches/src_app_create_research.md || true" in /home/pjlab/fbh/fbh_project/gushi
 succeeded in 0ms:
codex
I have enough code context now. Before writing, I’m checking the existing research docs style so the new note lands in the same format and doesn’t duplicate noisy scratch output.
exec
/usr/bin/zsh -lc "sed -n '1,240p' Docs/researches/src_app_story_research.md" in /home/pjlab/fbh/fbh_project/gushi
 succeeded in 0ms:
# `src/app/story/` Research

## Scope

Analyzed all source files under `src/app/story/`.

Directory contents:

- `src/app/story/[id]/page.tsx`

There are no sibling route files such as `layout.tsx`, `loading.tsx`, `error.tsx`, or nested helper modules inside `src/app/story/`.

## File-by-file analysis

### `src/app/story/[id]/page.tsx`

#### Purpose

This is the client-side story detail page for a single story route. It is responsible for:

- loading story metadata and branch metadata
- loading the ordered segment chain for the active branch
- rendering the timeline-style reading UI
- streaming continuation text from the backend
- opening a branch dialog and creating a new branch from any segment
- switching between the main line and existing branches

In practice, this file is the entire `src/app/story/` feature surface. The directory has no decomposition into smaller components or hooks.

#### Exports

- `default` export: `StoryDetailPage`

There are no named exports.

#### Local types and internal structures

The file defines three route-local interfaces near the top instead of reusing `src/types/story.ts`:

- `interface Story`
- `interface StorySegment`
- `interface StoryBranch`

Notable consequence:

- The route duplicates data contracts that already exist in `src/types/story.ts`.
- The route-local versions are narrower than the shared types. For example, the shared type layer includes timestamps and optional `characters?: string[]` on `ContinueStoryRequest`, but the page ignores that capability entirely.

#### Key state and control flow

The page keeps all UI state locally with `useState`:

- data state: `story`, `segments`, `branches`
- load/error state: `loading`, `error`
- continuation state: `continuing`, `newContent`
- branch selection state: `currentBranchId`
- branch dialog state: `showBranchDialog`, `branchingSegmentId`, `userDirection`, `customDirection`
- branch generation progress state: `branching`, `branchStep`, `branchPreview`

Main helpers and handlers:

- `loadBranchSegments(branchId)`
  - Fetches `GET /api/stories/${id}/segments?branchId=...`
  - Updates `segments`
- `loadTree()`
  - Fetches `GET /api/stories/${id}/tree`
  - Updates `branches`
- initial `useEffect`
  - Fetches story metadata and tree data in parallel
  - Sets `story`, `branches`, and resets `currentBranchId` to `"main"`
- branch-loading `useEffect`
  - Reloads the current branch chain whenever `currentBranchId` changes after initial load
- `getTailSegment()`
  - Computes a tail candidate from the loaded client-side segment list
  - Currently unused in the render path and unused by any mutation flow
- `handleContinue()`
  - Calls `POST /api/stories/${id}/stream-continue`
  - Reads SSE chunks with `TextDecoder`
  - Appends streamed content into `newContent`
  - Reloads branch segments and branch tree after completion
- `handleBranch(segmentId)`
  - Opens the branch dialog for a specific segment
- `confirmBranch()`
  - Resolves the chosen direction from preset or custom input
  - Shows a staged UI (`thinking`, `generating`, `saving`)
  - Calls `POST /api/stories/${id}/branch`
  - Stores a short preview of the generated branch segment
  - Reloads segments and tree after completion
- `switchBranch(branchId)`
  - Updates `currentBranchId`; actual fetch is delegated to `useEffect`
- `getCurrentBranchPath()`
  - Maps the current branch to a minimal breadcrumb label
- `getBranchCountForSegment(segmentId)`
  - Counts how many branch records point to a source segment

#### Render responsibilities

The render tree has four main UI regions:

- loading and error states
- top navigation and current-path label
- branch switcher
- main story timeline with segment cards, branch markers, and a bottom continuation button

The file also declares an inline `BranchDialog` component inside `StoryDetailPage`. That means modal markup, branching workflow state, and page-level data orchestration all live in one module.

#### Dependencies

External imports:

- `react`
  - `useState`
  - `useEffect`
  - `useCallback`
- `next/link`

Runtime backend dependencies:

- `GET /api/stories/${id}`
- `GET /api/stories/${id}/tree`
- `GET /api/stories/${id}/segments?branchId=...`
- `POST /api/stories/${id}/stream-continue`
- `POST /api/stories/${id}/branch`

Browser/platform APIs:

- `fetch`
- `TextDecoder`
- `ReadableStreamDefaultReader` via `res.body?.getReader()`
- `alert`
- `setTimeout`

Styling dependencies:

- CSS custom properties such as `--paper`, `--muted`, `--gold`, `--accent`, `--border`, `--ink`, `--jade`
- custom classes such as `prose-chinese`, `animate-fade-in-up`, `branch-pulse`, `divider-ornament`

Important non-dependencies:

- It does not import `src/types/story.ts`
- It does not import `src/components/StreamingText.tsx`
- It does not import `src/components/story/StoryImageDisplay.tsx`
- It does not call a shared story service or prompt builder

#### Architectural observations

This route is UI-heavy but data-thin:

- all business operations are delegated to API routes
- all story intelligence lives outside this directory
- there is no reusable view model, domain hook, or shared client data layer

This route is also tightly coupled to backend response shape:

- branch names, branch counts, and current branch labels all assume the `/tree` and `/segments` payload shapes from the current JSON-backed API implementation
- any ChronosMirror expansion that adds character state, validation warnings, citations, or pacing metadata will require changes to both the fetch payloads and this page state model

## Supporting architecture outside `src/app/story/`

Although `src/app/story/` contains only one source file, that page depends on a larger story subsystem.

### API layer used by the page

- `src/app/api/stories/[id]/route.ts`
  - returns story metadata from `storiesStore`
- `src/app/api/stories/[id]/segments/route.ts`
  - returns ordered segments for a branch via `getOrderedChain()`
- `src/app/api/stories/[id]/tree/route.ts`
  - returns branch metadata and a derived tree view
- `src/app/api/stories/[id]/stream-continue/route.ts`
  - streams model output, then appends a new segment to storage
- `src/app/api/stories/[id]/branch/route.ts`
  - creates a branch record, marks the source segment as a branch point, generates the first branch segment, and stores it

### Persistence and traversal layer

`src/lib/simple-db.ts` is the actual story persistence backend:

- `storiesStore` persists `data/stories.json`
- `segmentsStore` persists `data/segments.json`
- `branchesStore` persists `data/branches.json`
- `getOrderedChain(storyId, branchId)` reconstructs a branch by following `parentSegmentId`
- `getTailSegment(storyId, branchId)` derives the last segment of a chain

This matters because the `src/app/story/[id]/page.tsx` UI is designed around linear chains per branch, not around a richer event graph or a validated historical timeline.

### Shared type layer

`src/types/story.ts` contains broader type definitions than the page actually uses:

- story timestamps
- branch timestamps
- `ContinueStoryRequest.characters?: string[]`
- tree node types

The current route does not reuse those types, so contract drift is already possible.

## Architecture overview

### High-level flow

1. User opens `/story/[id]`.
2. `StoryDetailPage` fetches story metadata and branch metadata.
3. After initial load, `StoryDetailPage` fetches the ordered segment chain for the active branch.
4. The page renders the chain as a timeline-style reader.
5. If the user continues the story:
   - the page calls `POST /api/stories/[id]/stream-continue`
   - the API streams model tokens
   - the page appends streamed text to `newContent`
   - the API stores the completed segment in `segments.json`
   - the page refetches branch segments and tree data
6. If the user forks the story:
   - the page opens the inline `BranchDialog`
   - the page posts `segmentId` and `userDirection` to `POST /api/stories/[id]/branch`
   - the API creates a new branch record, generates the first branch segment, and stores both
   - the page refetches segments and tree data

### Effective layering

- Presentation layer: `src/app/story/[id]/page.tsx`
- Route/API orchestration layer: `src/app/api/stories/[id]/*`
- Persistence and graph traversal layer: `src/lib/simple-db.ts`
- Provider integration layer: inline `fetch()` calls inside API routes to OpenAI-compatible chat endpoints

### Architectural strengths

- Very small surface area
- Straightforward branch model using `branchId` plus `parentSegmentId`
- Streaming continuation already exists end to end
- Tree metadata is materialized in a single API route, which gives one clear backend extension point

### Architectural constraints

- The story route is monolithic. UI, modal, branching workflow, and stream handling are all in one client file.
- Prompt construction is duplicated across API routes instead of shared in a single story-generation service.
- Storage is append-only JSON with no transaction model, no versioning, and no normalized character or event tables.
- The route is branch-centric, not timeline-centric. A branch is modeled as a simple linked list of segments.
- README and blueprint claim richer AI controls, Prisma, and character-aware prompting, but the current runtime path is `simple-db.ts` plus direct provider calls.

## ChronosMirror upgrade gaps

exec
/usr/bin/zsh -lc 'ls -la Docs/researches' in /home/pjlab/fbh/fbh_project/gushi
 succeeded in 0ms:
total 252
drwxrwxr-x 2 pjlab pjlab   4096 Apr 14 15:37 .
drwxrwxr-x 3 pjlab pjlab   4096 Apr 12 17:36 ..
-rw------- 1 pjlab pjlab   1420 Apr 14 15:37 blueprint_checklist.md
-rw-rw-r-- 1 pjlab pjlab   3557 Apr 13 22:53 fix_blueprint.md
-rw-rw-r-- 1 pjlab pjlab   2846 Apr 12 18:39 reorganization_blueprint.md
-rw-rw-r-- 1 pjlab pjlab 114674 Apr 14 15:30 src_app_api_research.md
-rw-rw-r-- 1 pjlab pjlab  96127 Apr 14 15:39 src_app_create_research.md.tmp
-rw-rw-r-- 1 pjlab pjlab  16841 Apr 14 15:35 src_app_story_research.md
-rw-rw-r-- 1 pjlab pjlab   1301 Apr 14 15:37 todos_20260414.md

exec
/usr/bin/zsh -lc 'rg -n "storyType|prompt|已存在|existing|title === title|故事已存在" Docs/researches/src_app_api_research.md Docs/researches/src_app_story_research.md' in /home/pjlab/fbh/fbh_project/gushi
 succeeded in 0ms:
Docs/researches/src_app_story_research.md:26:- switching between the main line and existing branches
Docs/researches/src_app_story_research.md:143:- It does not call a shared story service or prompt builder
Docs/researches/src_app_story_research.md:238:- README and blueprint claim richer AI controls, Prisma, and character-aware prompting, but the current runtime path is `simple-db.ts` plus direct provider calls.
Docs/researches/src_app_story_research.md:274:- Build prompts from structured persona cards rather than only from concatenated prose.
Docs/researches/src_app_story_research.md:318:- No story generation route enriches prompts with retrieved historical references.
Docs/researches/src_app_story_research.md:333:- Feed retrieved facts into prompt construction as structured context, not as ad hoc text blobs.
Docs/researches/src_app_story_research.md:346:  - simple prompt instruction like “150-300字”
Docs/researches/src_app_story_research.md:382:  - needs shared prompt assembly, validation, and structured generation settings
Docs/researches/src_app_story_research.md:400:- no true pacing/director control beyond coarse prompt wording and cosmetic UI steps
Docs/researches/src_app_api_research.md:195:    // 幂等：标题已存在则返回已有故事
Docs/researches/src_app_api_research.md:196:    const existing = stories.find((s: Story) => s.title === title);
Docs/researches/src_app_api_research.md:197:    if (existing) {
Docs/researches/src_app_api_research.md:200:        story: existing,
Docs/researches/src_app_api_research.md:201:        message: '故事已存在'
Docs/researches/src_app_api_research.md:267:    const { segmentId, prompt, style, size = '512x512', quality = 'standard' } = body;
Docs/researches/src_app_api_research.md:270:    if (!segmentId || !prompt) {
Docs/researches/src_app_api_research.md:272:        { error: '缺少必要的参数: segmentId 和 prompt' },
Docs/researches/src_app_api_research.md:292:        prompt,
Docs/researches/src_app_api_research.md:611:I hit zsh globbing on the dynamic route paths. I’m re-reading those with quoted paths, then I’ll pull in the README and any existing research notes only where they help explain the API layer’s role.
Docs/researches/src_app_api_research.md:642:async function callAI(prompt: string): Promise<string> {
Docs/researches/src_app_api_research.md:657:        { role: 'user', content: prompt }
Docs/researches/src_app_api_research.md:698:    const prompt = `故事标题：${story.title}
Docs/researches/src_app_api_research.md:706:    const aiResponse = await callAI(prompt);
Docs/researches/src_app_api_research.md:832:    const prompt = `故事标题：${story.title}
Docs/researches/src_app_api_research.md:856:          { role: 'user', content: prompt }
Docs/researches/src_app_api_research.md:1022:    const prompt = `故事标题：${story.title}
Docs/researches/src_app_api_research.md:1044:          { role: 'user', content: prompt }
Docs/researches/src_app_api_research.md:1615:    prompts: [
Docs/researches/src_app_api_research.md:1630:    prompts: [
Docs/researches/src_app_api_research.md:1645:    prompts: [
Docs/researches/src_app_api_research.md:1653:const storyTypes = [
Docs/researches/src_app_api_research.md:1663:  const [storyType, setStoryType] = useState('historical');
Docs/researches/src_app_api_research.md:1686:          storyType,
Docs/researches/src_app_api_research.md:1687:          prompt: selectedPrompt
Docs/researches/src_app_api_research.md:1712:          storyType,
Docs/researches/src_app_api_research.md:1713:          prompt: customPrompt
Docs/researches/src_app_api_research.md:1751:            {storyTypes.map((type) => (
Docs/researches/src_app_api_research.md:1756:                  storyType === type.id
Docs/researches/src_app_api_research.md:1803:                    setSelectedPrompt(template.prompts[0]);
Docs/researches/src_app_api_research.md:1834:                  {storyTemplates.find(t => t.id === selectedTemplate)?.prompts.map((prompt, idx) => (
Docs/researches/src_app_api_research.md:1837:                      onClick={() => setSelectedPrompt(prompt)}
Docs/researches/src_app_api_research.md:1839:                        selectedPrompt === prompt
Docs/researches/src_app_api_research.md:1844:                      <p className="text-sm">{prompt}</p>

exec
/usr/bin/zsh -lc "nl -ba 'src/app/api/stories/[id]/stream-continue/route.ts' | sed -n '1,260p'" in /home/pjlab/fbh/fbh_project/gushi
exec
/usr/bin/zsh -lc "nl -ba 'src/app/api/stories/[id]/branch/route.ts' | sed -n '1,240p'" in /home/pjlab/fbh/fbh_project/gushi
 succeeded in 0ms:
     1	import { NextRequest, NextResponse } from 'next/server';
     2	import { storiesStore, segmentsStore, getOrderedChain, type StorySegment } from '@/lib/simple-db';
     3	
     4	export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
     5	  try {
     6	    const { id: storyId } = params;
     7	    const { branchId = 'main' } = await request.json();
     8	
     9	    if (!storyId) {
    10	      return NextResponse.json({ error: '缺少参数' }, { status: 400 });
    11	    }
    12	
    13	    const stories = await storiesStore.load();
    14	    const story = stories.find((s: any) => s.id === storyId);
    15	    if (!story) return NextResponse.json({ error: '故事不存在' }, { status: 404 });
    16	
    17	    // Get ordered chain to find tail segment
    18	    const chain = await getOrderedChain(storyId, branchId);
    19	    if (chain.length === 0) {
    20	      return NextResponse.json({ error: '该分支没有段落' }, { status: 404 });
    21	    }
    22	    const tailSegment = chain[chain.length - 1];
    23	
    24	    // Build context from the ordered chain
    25	    const contextSummary = chain.map((s: StorySegment) =>
    26	      `${s.title ? `【${s.title}】` : ''}${s.content}`
    27	    ).join('\n');
    28	
    29	    const prompt = `故事标题：${story.title}
    30	故事背景：${story.description || ''}
    31	
    32	当前故事进展：
    33	${contextSummary}
    34	
    35	请续写下一段（150-300字），保持古典文学风格，与前文情节连续。`;
    36	
    37	    const baseUrl = process.env.AI_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4';
    38	    const apiKey = process.env.AI_API_KEY || '';
    39	    const model = process.env.AI_MODEL || 'glm-5.1';
    40	
    41	    const aiResponse = await fetch(`${baseUrl}/chat/completions`, {
    42	      method: 'POST',
    43	      headers: {
    44	        'Content-Type': 'application/json',
    45	        'Authorization': `Bearer ${apiKey}`,
    46	      },
    47	      body: JSON.stringify({
    48	        model,
    49	        messages: [
    50	          { role: 'system', content: '你是一位精通中国历史的文学作家，擅长古典文学风格的写作。请用中文回答。' },
    51	          { role: 'user', content: prompt }
    52	        ],
    53	        temperature: 0.7,
    54	        max_tokens: 2000,
    55	        stream: true
    56	      })
    57	    });
    58	
    59	    if (!aiResponse.ok) {
    60	      const text = await aiResponse.text();
    61	      return NextResponse.json({ error: `AI API error: ${text}` }, { status: 500 });
    62	    }
    63	
    64	    const encoder = new TextEncoder();
    65	    const stream = new ReadableStream({
    66	      async start(controller) {
    67	        let fullContent = '';
    68	
    69	        try {
    70	          const reader = aiResponse.body?.getReader();
    71	          if (!reader) throw new Error('No response body');
    72	
    73	          const decoder = new TextDecoder();
    74	          let buffer = '';
    75	
    76	          while (true) {
    77	            const { done, value } = await reader.read();
    78	            if (done) break;
    79	
    80	            buffer += decoder.decode(value, { stream: true });
    81	            const lines = buffer.split('\n');
    82	            buffer = lines.pop() || '';
    83	
    84	            for (const line of lines) {
    85	              const trimmed = line.trim();
    86	              if (!trimmed || !trimmed.startsWith('data: ')) continue;
    87	              const data = trimmed.slice(6);
    88	              if (data === '[DONE]') continue;
    89	
    90	              try {
    91	                const parsed = JSON.parse(data);
    92	                const content = parsed.choices?.[0]?.delta?.content;
    93	                if (content) {
    94	                  fullContent += content;
    95	                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
    96	                }
    97	              } catch {}
    98	            }
    99	          }
   100	
   101	          // Save the completed segment
   102	          const allSegments = await segmentsStore.load();
   103	          const newSegment: StorySegment = {
   104	            id: `seg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
   105	            storyId,
   106	            title: '故事续写',
   107	            content: fullContent,
   108	            isBranchPoint: false,
   109	            branchId,
   110	            parentSegmentId: tailSegment.id,
   111	            imageUrls: [],
   112	            createdAt: new Date().toISOString(),
   113	            updatedAt: new Date().toISOString()
   114	          };
   115	
   116	          allSegments.push(newSegment);
   117	          await segmentsStore.save(allSegments);
   118	
   119	          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
   120	          controller.close();
   121	        } catch (err) {
   122	          controller.error(err);
   123	        }
   124	      }
   125	    });
   126	
   127	    return new Response(stream, {
   128	      headers: {
   129	        'Content-Type': 'text/event-stream',
   130	        'Cache-Control': 'no-cache',
   131	        'Connection': 'keep-alive',
   132	      }
   133	    });
   134	
   135	  } catch (error) {
   136	    console.error('流式续写失败:', error);
   137	    return NextResponse.json(
   138	      { error: '流式续写失败', details: String(error) },
   139	      { status: 500 }
   140	    );
   141	  }
   142	}

 succeeded in 0ms:
     1	import { NextRequest, NextResponse } from 'next/server';
     2	import { storiesStore, segmentsStore, branchesStore, getOrderedChain, type StorySegment } from '@/lib/simple-db';
     3	
     4	export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
     5	  try {
     6	    const { id: storyId } = params;
     7	    const { segmentId, userDirection, branchTitle } = await request.json();
     8	
     9	    if (!storyId || !segmentId || !userDirection) {
    10	      return NextResponse.json({ error: '缺少必要参数: segmentId, userDirection' }, { status: 400 });
    11	    }
    12	
    13	    const stories = await storiesStore.load();
    14	    const story = stories.find((s: any) => s.id === storyId);
    15	    if (!story) return NextResponse.json({ error: '故事不存在' }, { status: 404 });
    16	
    17	    const segments = await segmentsStore.load();
    18	    const currentSegment = segments.find((s: any) => s.id === segmentId && s.storyId === storyId);
    19	    if (!currentSegment) return NextResponse.json({ error: '段落不存在' }, { status: 404 });
    20	
    21	    // Generate branch ID
    22	    const branchId = `branch_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    23	
    24	    // Create branch record
    25	    const newBranch = {
    26	      id: branchId,
    27	      title: branchTitle || `分叉: ${userDirection}`,
    28	      sourceSegmentId: segmentId,
    29	      storyId,
    30	      userDirection,
    31	      createdAt: new Date().toISOString(),
    32	      updatedAt: new Date().toISOString()
    33	    };
    34	
    35	    const branches = await branchesStore.load();
    36	    branches.push(newBranch);
    37	    await branchesStore.save(branches);
    38	
    39	    // Mark source segment as branch point
    40	    currentSegment.isBranchPoint = true;
    41	    await segmentsStore.save(segments);
    42	
    43	    // Build context: get ordered chain of main branch up to the source segment
    44	    const mainChain = await getOrderedChain(storyId, 'main');
    45	    const contextSegments = mainChain.filter(s => {
    46	      if (s.id === segmentId) return true;
    47	      // Include all ancestors
    48	      let cur: StorySegment | undefined = s;
    49	      while (cur?.parentSegmentId) {
    50	        if (cur.parentSegmentId === segmentId) return false; // after source
    51	        cur = mainChain.find(ms => ms.id === cur!.parentSegmentId);
    52	      }
    53	      return true;
    54	    });
    55	    // Simpler: just include main chain segments up to and including sourceSegment
    56	    const idx = mainChain.findIndex(s => s.id === segmentId);
    57	    const relevantChain = idx >= 0 ? mainChain.slice(0, idx + 1) : mainChain;
    58	
    59	    const contextSummary = relevantChain.map((s: StorySegment) =>
    60	      `${s.title ? `【${s.title}】` : ''}${s.content}`
    61	    ).join('\n');
    62	
    63	    const prompt = `故事标题：${story.title}
    64	故事背景：${story.description || ''}
    65	
    66	当前故事进展：
    67	${contextSummary}
    68	
    69	用户希望的故事走向：${userDirection}
    70	
    71	请根据用户指定的方向，续写下一段（150-300字），保持古典文学风格，与前文情节连续。`;
    72	
    73	    const baseUrl = process.env.AI_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4';
    74	    const apiKey = process.env.AI_API_KEY || '';
    75	    const model = process.env.AI_MODEL || 'glm-5.1';
    76	
    77	    const aiResponse = await fetch(`${baseUrl}/chat/completions`, {
    78	      method: 'POST',
    79	      headers: {
    80	        'Content-Type': 'application/json',
    81	        'Authorization': `Bearer ${apiKey}`,
    82	      },
    83	      body: JSON.stringify({
    84	        model,
    85	        messages: [
    86	          { role: 'system', content: '你是一位精通中国历史的文学作家，擅长古典文学风格的写作。请用中文回答。' },
    87	          { role: 'user', content: prompt }
    88	        ],
    89	        temperature: 0.7,
    90	        max_tokens: 2000
    91	      })
    92	    });
    93	
    94	    if (!aiResponse.ok) {
    95	      const text = await aiResponse.text();
    96	      throw new Error(`AI API error ${aiResponse.status}: ${text}`);
    97	    }
    98	
    99	    const data = await aiResponse.json();
   100	    const aiContent = data.choices?.[0]?.message?.content || '';
   101	
   102	    // Create new segment on the new branch
   103	    const newSegment: StorySegment = {
   104	      id: `seg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
   105	      storyId,
   106	      title: branchTitle || `分叉: ${userDirection}`,
   107	      content: aiContent,
   108	      isBranchPoint: false,
   109	      branchId, // new branch
   110	      parentSegmentId: segmentId,
   111	      imageUrls: [],
   112	      createdAt: new Date().toISOString(),
   113	      updatedAt: new Date().toISOString()
   114	    };
   115	
   116	    const allSegments = await segmentsStore.load();
   117	    allSegments.push(newSegment);
   118	    await segmentsStore.save(allSegments);
   119	
   120	    return NextResponse.json({
   121	      success: true,
   122	      branch: newBranch,
   123	      segment: newSegment,
   124	      message: '分支创建成功'
   125	    });
   126	
   127	  } catch (error) {
   128	    console.error('故事分叉失败:', error);
   129	    return NextResponse.json(
   130	      { error: '故事分叉失败', details: error instanceof Error ? error.message : '未知错误' },
   131	      { status: 500 }
   132	    );
   133	  }
   134	}

codex
I’ve finished the analysis and I’m writing the research note now. The document will call out the contract drift between the create page and `/api/stories`, because that’s the main blocker behind several ChronosMirror gaps.
apply patch
patch: completed
/home/pjlab/fbh/fbh_project/gushi/Docs/researches/src_app_create_research.md
diff --git a/Docs/researches/src_app_create_research.md b/Docs/researches/src_app_create_research.md
new file mode 100644
index 0000000000000000000000000000000000000000..747e0c8f71704d9cad540a7bfad94ee9b39de411
--- /dev/null
+++ b/Docs/researches/src_app_create_research.md
@@ -0,0 +1,447 @@
+# `src/app/create/` Research
+
+## Scope
+
+Analyzed all source files under `src/app/create/`.
+
+Directory contents:
+
+- `src/app/create/page.tsx`
+
+There are no sibling route files such as `layout.tsx`, `loading.tsx`, `error.tsx`, or nested helper modules inside `src/app/create/`.
+
+## File-by-file analysis
+
+### `src/app/create/page.tsx`
+
+#### Purpose
+
+This is the client-side story creation page for the `/create` route.
+
+It is responsible for:
+
+- presenting two creation modes: template-based and custom
+- presenting four high-level story categories through `storyTypes`
+- presenting three built-in historical templates through `storyTemplates`
+- collecting the user’s selected prompt or freeform inputs
+- posting a creation request to `POST /api/stories`
+- redirecting to `/story/[id]` after a successful create
+
+In practice, this file is the entire `src/app/create/` feature surface. There is no decomposition into smaller components, hooks, form schemas, or creation services.
+
+#### Exports
+
+- `default` export: `CreateStoryPage`
+
+There are no named exports.
+
+#### Internal structures and state
+
+The file defines two route-local constants before the component:
+
+- `storyTemplates`
+  - three hard-coded historical seeds: `荆轲刺秦王`, `赤壁之战`, `玄武门之变`
+  - each template carries `id`, `title`, `description`, `era`, `icon`, `gradient`, `difficulty`, `time`, and `prompts`
+  - `difficulty` exists in the data but is not rendered and is not sent to the backend
+- `storyTypes`
+  - four hard-coded categories: `historical`, `legend`, `literary`, `original`
+  - these categories are selectable in the UI but are not persisted by the current create API
+
+`CreateStoryPage` keeps all form and workflow state locally with `useState`:
+
+- `tab`
+  - switches between template mode and custom mode
+- `storyType`
+  - shared selection across both modes
+- `selectedTemplate`
+  - currently selected template card
+- `selectedPrompt`
+  - selected alternate-history prompt from a template
+- `creating`
+  - client-side reentrancy guard for both submit paths
+- `customTitle`
+- `customDesc`
+- `customAuthor`
+- `customPrompt`
+
+Main handlers:
+
+- `handleTemplateCreate()`
+  - validates that a template and prompt are selected
+  - looks up the selected template from `storyTemplates`
+  - posts `title`, composed `description`, `author`, `storyType`, and `prompt` to `/api/stories`
+  - navigates to `/story/${data.story.id}` on success
+- `handleCustomCreate(e)`
+  - prevents default form submission
+  - validates that `customTitle` exists
+  - posts `title`, `description`, `author`, `storyType`, and `prompt` to `/api/stories`
+  - navigates to `/story/${data.story.id}` on success
+
+Important implementation detail:
+
+- In template mode, the selected prompt survives only because it is duplicated into the `description` string as `思考方向：...`.
+- In custom mode, `customPrompt` is sent in the JSON body but not copied into `description`.
+- The current backend ignores `storyType` and `prompt`, so the custom prompt is effectively lost at creation time.
+
+#### Render responsibilities
+
+The render tree has five main regions:
+
+- top navigation back to `/`
+- title block for the creation page
+- story-type picker
+- tab switcher between template and custom creation
+- mode-specific content
+  - template cards, prompt chooser, and create button
+  - or a custom form with title, description, type, prompt, author, and submit button
+
+The UI is stylistically rich but behaviorally simple:
+
+- no async loading state for templates
+- no schema validation beyond required title and button disable logic
+- no preview of the first generated segment
+- no server-fed template catalog
+- no history-specific citations, warnings, or validation feedback
+
+#### Dependencies
+
+Static imports:
+
+- `react`
+  - `useState`
+- `next/navigation`
+  - `useRouter`
+- `next/link`
+  - `Link`
+
+Runtime backend dependency:
+
+- `POST /api/stories`
+
+Navigation dependency:
+
+- redirects to `/story/[id]` after successful creation
+
+Browser/platform APIs:
+
+- `fetch`
+- `alert`
+- form submission events
+
+Styling dependencies:
+
+- CSS custom properties such as `--paper`, `--border`, `--muted`, `--ink`, `--gold`, `--accent`
+- custom classes such as `divider-ornament`, `animate-fade-in-up`, `line-clamp-3`
+
+Important non-dependencies:
+
+- it does not import shared types from `src/types/story.ts`
+- it does not import a shared story-creation client or service
+- it does not import any prompt builder, timeline validator, MCP client, or retrieval layer
+- it does not import any dedicated template configuration module outside the page itself
+
+#### Architectural observations
+
+This route is a thin client over one backend endpoint. The page is mostly UI composition plus a pair of `fetch('/api/stories')` submit handlers.
+
+That thinness has two consequences:
+
+- most creation semantics are actually defined outside `src/app/create/`, especially in `src/app/api/stories/route.ts`
+- the route already has contract drift, because the page submits richer data than the backend stores
+
+The most important contract mismatch is:
+
+- `src/app/create/page.tsx` sends `storyType` and `prompt`
+- `src/app/api/stories/route.ts` only reads `title`, `description`, and `author`
+
+That means the create page currently looks more capable than the system really is.
+
+## Supporting architecture outside `src/app/create/`
+
+Although `src/app/create/` contains only one source file, its behavior depends on a larger story subsystem.
+
+### `src/app/api/stories/route.ts`
+
+This route is the actual creation backend used by the page.
+
+Creation behavior:
+
+- `POST` reads the request body and only destructures `title`, `description`, and `author`
+- it rejects empty titles
+- it performs idempotency by checking whether a story with the same `title` already exists
+- it creates a `Story` record in the JSON store
+- it creates a placeholder first segment with content `《${title}》的故事开始了...`
+- it updates `rootSegmentId`
+- it returns the created story and first segment
+
+Implications for `src/app/create/page.tsx`:
+
+- `storyType` is discarded
+- `prompt` is discarded
+- template variants under the same title collapse into one story because idempotency is title-based
+- the “created” opening is not AI-generated; it is a placeholder seed segment
+
+This title-based dedupe is especially important for the template flow. The page visually suggests multiple alternate-history prompts for the same historical event, but `POST /api/stories` treats them as the same story if the title matches. For example, all `荆轲刺秦王` prompt variants resolve to the same existing story once one has been created.
+
+### `src/lib/simple-db.ts`
+
+This is the runtime persistence layer behind story creation.
+
+Relevant facts:
+
+- stories are persisted to `data/stories.json`
+- segments are persisted to `data/segments.json`
+- branches are persisted to `data/branches.json`
+- the runtime `Story` model contains only:
+  - `id`
+  - `title`
+  - `description?`
+  - `author?`
+  - `createdAt`
+  - `updatedAt`
+  - `rootSegmentId?`
+- the runtime `StorySegment` model contains only:
+  - `id`
+  - `title?`
+  - `content`
+  - `isBranchPoint`
+  - `createdAt`
+  - `updatedAt`
+  - `storyId`
+  - `branchId`
+  - `parentSegmentId?`
+  - `imageUrls`
+
+There are no runtime fields for:
+
+- structured story type
+- creation prompt provenance
+- canonical historical event metadata
+- story-world timeline or event dates
+- character sheets or relationship graphs
+- retrieval citations
+- pacing plans, beat budgets, or director controls
+
+This matters because the create page cannot persist richer ChronosMirror metadata even if the UI is extended. The current store shape would discard it unless the backend model changes first.
+
+### `src/types/story.ts`
+
+The shared type layer is slightly broader than the actual creation flow, but it is still far short of ChronosMirror needs.
+
+Relevant observations:
+
+- `ContinueStoryRequest` includes `characters?: string[]`, which suggests an intent to pass character context into generation later
+- `Story`, `StorySegment`, and `StoryBranch` still lack structured character state, historical facts, citations, or pacing metadata
+- the create page does not import these shared types, so contract drift is already possible
+
+### Runtime continuation and branching routes
+
+The creation page itself does not generate content, but the created story is later continued by:
+
+- `src/app/api/stories/[id]/stream-continue/route.ts`
+- `src/app/api/stories/[id]/branch/route.ts`
+
+Those routes build prompts from concatenated prior prose and `story.description`, then ask the model to continue in 150-300 words. They do not consume structured creation metadata from the create route because that metadata is not currently stored.
+
+That means the limitations in creation directly propagate into later generation quality.
+
+## Architecture overview
+
+### High-level flow
+
+1. User opens `/create`.
+2. `CreateStoryPage` renders hard-coded story types and hard-coded historical templates.
+3. User either:
+   - selects a template plus a prompt, or
+   - fills the custom form
+4. The page sends a `POST` request to `/api/stories`.
+5. The API persists a minimal `Story` plus a placeholder root `StorySegment` in the JSON store.
+6. The page redirects to `/story/[id]`.
+7. Later continuation or branching routes generate prose using only plain-text story context, not structured creation metadata.
+
+### Effective layering
+
+- presentation layer
+  - `src/app/create/page.tsx`
+- route/API orchestration layer
+  - `src/app/api/stories/route.ts`
+- persistence layer
+  - `src/lib/simple-db.ts`
+- downstream generation layer
+  - `src/app/api/stories/[id]/stream-continue/route.ts`
+  - `src/app/api/stories/[id]/branch/route.ts`
+
+### Architectural strengths
+
+- very small and easy-to-follow route surface
+- clear two-path create UX: guided templates or freeform creation
+- static templates give an immediate starting point for historical what-if stories
+- successful creation transitions directly into the story reader route
+
+### Architectural constraints
+
+- the route is monolithic; templates, state, submit handlers, and rendering all live in one file
+- templates and story types are hard-coded in the page, not supplied by configuration or backend data
+- the creation contract is wider in the UI than in the backend
+- create-time prompt intent is only partially preserved for templates and completely lost for custom prompts
+- idempotency is title-based rather than scenario-based, so distinct variants can collapse together
+- the system seeds a placeholder opening segment instead of a planned or validated first scene
+- the runtime data model is too narrow for structured historical storytelling
+
+## ChronosMirror upgrade gaps
+
+ChronosMirror, as described in the request, needs richer narrative state and stronger orchestration than the current create flow provides. The gaps start at story creation, not only during continuation.
+
+### 1. Character modeling gap
+
+Current state:
+
+- `src/app/create/page.tsx` collects only title, description, author, story type, and a prompt-like field.
+- There is no UI for protagonist roster, faction membership, speech style, motivation, relationship map, arc intent, or historical role.
+- `src/lib/simple-db.ts` has no place to persist character cards or dynamic relationships.
+- `src/types/story.ts` hints at character-aware continuation with `ContinueStoryRequest.characters?: string[]`, but the create page does not seed character data and the runtime routes do not build structured persona state from creation.
+
+Why this blocks ChronosMirror:
+
+- character consistency cannot be enforced later if creation never captures who the characters are
+- alternate-history prompts like `如果李建成提前得知李世民的阴谋` need role-aware state at creation time, not only freeform prose
+- the current system stores only text blobs, so later generation has to infer character identity and relationships from narrative text each time
+
+Concrete create-flow gaps:
+
+- no structured character input in the custom form
+- no template-attached character roster for the historical seeds
+- no persistence field for character snapshots
+- no downstream handoff from create route to continuation route for persona state
+
+Recommended upgrade direction:
+
+- add create-time structured character inputs
+  - core cast
+  - historical role
+  - goals
+  - fears
+  - speech/register notes
+  - relationship edges
+- persist those as first-class story metadata or normalized records, not only embedded prose
+- attach template-specific default character cards to each historical scenario
+- feed character state into prompt construction for root-scene generation, continuation, and branching
+
+### 2. Timeline validation gap
+
+Current state:
+
+- template metadata contains only a display-level `era` string such as `战国`, `三国`, or `唐`.
+- the create route persists no canonical historical event ID, no start date, no event window, no causal prerequisites, and no allowed divergence point.
+- the first segment is a placeholder sentence, not a validated opening scene.
+- downstream generation routes use `story.description` plus prior prose as plain text and do not run a historical or temporal validator.
+- the runtime graph model tracks authoring structure with `branchId` and `parentSegmentId`, but not story-world chronology.
+
+Why this blocks ChronosMirror:
+
+- historical what-if stories need an explicit “mirror point” where divergence begins
+- without a structured event anchor, the system cannot check whether generated scenes reference people, places, or consequences too early or too late
+- creation-time intent is ambiguous because prompt direction is not stored as structured timeline metadata
+
+Concrete create-flow gaps:
+
+- no field for canonical divergence moment
+- no field for baseline historical timeline
+- no field for world-time per segment or per branch
+- no validation pass between template selection and story creation
+- no warning surface in the UI when a prompt implies impossible chronology
+
+Recommended upgrade direction:
+
+- extend template definitions with canonical event metadata
+  - source event ID
+  - date range
+  - location
+  - participating historical actors
+  - preconditions
+- persist a structured divergence descriptor when the user creates a story
+- add timeline validation before saving the root story state and before later continuation/branch generation
+- store timeline metadata separately from prose so branches can be compared against historical baseline and against their own internal chronology
+
+### 3. MCP Wikipedia gap
+
+Current state:
+
+- `src/app/create/page.tsx` uses only hard-coded local template copy
+- `src/app/api/stories/route.ts` performs no retrieval at all during story creation
+- no file in the creation path imports or calls an MCP client
+- no story record stores citations, source provenance, or retrieval artifacts
+
+Why this blocks ChronosMirror:
+
+- ChronosMirror historical storytelling needs a factual anchor for the initial scenario, not only hand-authored template blurbs
+- without retrieval, the system cannot verify whether the selected divergence point, participants, or contextual details are historically grounded
+- without persisted provenance, the user cannot inspect what facts the system used when generating later scenes
+
+Concrete create-flow gaps:
+
+- no retrieval step when a template is selected
+- no prefill of canonical event facts from Wikipedia or another source
+- no source list attached to the story at creation time
+- no citations shown in the creation UI or story reader
+
+Recommended upgrade direction:
+
+- add an MCP retrieval step for template-based creation
+  - query Wikipedia for the selected event
+  - extract date, place, actors, and summary
+  - persist the retrieved facts and citations with the story seed
+- allow custom stories to optionally request the same retrieval flow when users reference a known historical event
+- surface source provenance in both create and story views so ChronosMirror can expose fact grounding instead of opaque prompt text
+
+### 4. Pacing control gap
+
+Current state:
+
+- the create page offers only a single prompt or freeform guidance box
+- there is no UI for chapter count, beat plan, act structure, scene length, escalation curve, or director mode
+- `src/app/api/stories/route.ts` does not generate a planned opening; it only seeds a placeholder segment
+- downstream generation routes use simple instructions like `请续写下一段（150-300字）`, which is coarse output sizing rather than real pacing control
+
+Why this blocks ChronosMirror:
+
+- pacing control should begin at story setup, because the opening premise determines branch width, narrative density, and escalation rhythm
+- a single prompt string cannot express beat sequencing or scene-level intent in a durable way
+- if the first saved segment is only a placeholder, there is no initial director plan for later steps to respect
+
+Concrete create-flow gaps:
+
+- no creation-time outline or beat planner
+- no pace profile attached to the story
+- no root-scene generation step that uses structured pacing parameters
+- no persisted target cadence for later continuation routes
+
+Recommended upgrade direction:
+
+- add pacing controls to creation
+  - target length
+  - scene cadence
+  - branch intensity
+  - reveal tempo
+  - director constraints
+- store a structured outline or beat scaffold with the story seed
+- replace the placeholder opening with generated root-scene creation that consumes:
+  - template facts
+  - character state
+  - divergence metadata
+  - pacing plan
+- propagate pacing metadata into continuation and branching APIs so later generation remains consistent with the initial setup
+
+## Cross-cutting conclusions
+
+`src/app/create/` is currently a polished but thin entry page over a minimal story-creation backend. The directory itself is small and understandable, but the feature is more limited than the UI suggests.
+
+The most important current limitations are:
+
+- the page sends richer intent than the backend stores
+- template variants collapse under title-based idempotency
+- custom prompts are not preserved
+- the opening scene is only a placeholder
+- the runtime model has no structured support for characters, timelines, citations, or pacing
+
+For ChronosMirror, the create flow should be treated as a schema and orchestration upgrade first, and only secondarily as a page-level UI enhancement. If creation stays text-only and lossy, the downstream continuation stack will keep inheriting those limits.

diff --git a/Docs/researches/src_app_create_research.md b/Docs/researches/src_app_create_research.md
new file mode 100644
index 0000000000000000000000000000000000000000..747e0c8f71704d9cad540a7bfad94ee9b39de411
--- /dev/null
+++ b/Docs/researches/src_app_create_research.md
@@ -0,0 +1,447 @@
+# `src/app/create/` Research
+
+## Scope
+
+Analyzed all source files under `src/app/create/`.
+
+Directory contents:
+
+- `src/app/create/page.tsx`
+
+There are no sibling route files such as `layout.tsx`, `loading.tsx`, `error.tsx`, or nested helper modules inside `src/app/create/`.
+
+## File-by-file analysis
+
+### `src/app/create/page.tsx`
+
+#### Purpose
+
+This is the client-side story creation page for the `/create` route.
+
+It is responsible for:
+
+- presenting two creation modes: template-based and custom
+- presenting four high-level story categories through `storyTypes`
+- presenting three built-in historical templates through `storyTemplates`
+- collecting the user’s selected prompt or freeform inputs
+- posting a creation request to `POST /api/stories`
+- redirecting to `/story/[id]` after a successful create
+
+In practice, this file is the entire `src/app/create/` feature surface. There is no decomposition into smaller components, hooks, form schemas, or creation services.
+
+#### Exports
+
+- `default` export: `CreateStoryPage`
+
+There are no named exports.
+
+#### Internal structures and state
+
+The file defines two route-local constants before the component:
+
+- `storyTemplates`
+  - three hard-coded historical seeds: `荆轲刺秦王`, `赤壁之战`, `玄武门之变`
+  - each template carries `id`, `title`, `description`, `era`, `icon`, `gradient`, `difficulty`, `time`, and `prompts`
+  - `difficulty` exists in the data but is not rendered and is not sent to the backend
+- `storyTypes`
+  - four hard-coded categories: `historical`, `legend`, `literary`, `original`
+  - these categories are selectable in the UI but are not persisted by the current create API
+
+`CreateStoryPage` keeps all form and workflow state locally with `useState`:
+
+- `tab`
+  - switches between template mode and custom mode
+- `storyType`
+  - shared selection across both modes
+- `selectedTemplate`
+  - currently selected template card
+- `selectedPrompt`
+  - selected alternate-history prompt from a template
+- `creating`
+  - client-side reentrancy guard for both submit paths
+- `customTitle`
+- `customDesc`
+- `customAuthor`
+- `customPrompt`
+
+Main handlers:
+
+- `handleTemplateCreate()`
+  - validates that a template and prompt are selected
+  - looks up the selected template from `storyTemplates`
+  - posts `title`, composed `description`, `author`, `storyType`, and `prompt` to `/api/stories`
+  - navigates to `/story/${data.story.id}` on success
+- `handleCustomCreate(e)`
+  - prevents default form submission
+  - validates that `customTitle` exists
+  - posts `title`, `description`, `author`, `storyType`, and `prompt` to `/api/stories`
+  - navigates to `/story/${data.story.id}` on success
+
+Important implementation detail:
+
+- In template mode, the selected prompt survives only because it is duplicated into the `description` string as `思考方向：...`.
+- In custom mode, `customPrompt` is sent in the JSON body but not copied into `description`.
+- The current backend ignores `storyType` and `prompt`, so the custom prompt is effectively lost at creation time.
+
+#### Render responsibilities
+
+The render tree has five main regions:
+
+- top navigation back to `/`
+- title block for the creation page
+- story-type picker
+- tab switcher between template and custom creation
+- mode-specific content
+  - template cards, prompt chooser, and create button
+  - or a custom form with title, description, type, prompt, author, and submit button
+
+The UI is stylistically rich but behaviorally simple:
+
+- no async loading state for templates
+- no schema validation beyond required title and button disable logic
+- no preview of the first generated segment
+- no server-fed template catalog
+- no history-specific citations, warnings, or validation feedback
+
+#### Dependencies
+
+Static imports:
+
+- `react`
+  - `useState`
+- `next/navigation`
+  - `useRouter`
+- `next/link`
+  - `Link`
+
+Runtime backend dependency:
+
+- `POST /api/stories`
+
+Navigation dependency:
+
+- redirects to `/story/[id]` after successful creation
+
+Browser/platform APIs:
+
+- `fetch`
+- `alert`
+- form submission events
+
+Styling dependencies:
+
+- CSS custom properties such as `--paper`, `--border`, `--muted`, `--ink`, `--gold`, `--accent`
+- custom classes such as `divider-ornament`, `animate-fade-in-up`, `line-clamp-3`
+
+Important non-dependencies:
+
+- it does not import shared types from `src/types/story.ts`
+- it does not import a shared story-creation client or service
+- it does not import any prompt builder, timeline validator, MCP client, or retrieval layer
+- it does not import any dedicated template configuration module outside the page itself
+
+#### Architectural observations
+
+This route is a thin client over one backend endpoint. The page is mostly UI composition plus a pair of `fetch('/api/stories')` submit handlers.
+
+That thinness has two consequences:
+
+- most creation semantics are actually defined outside `src/app/create/`, especially in `src/app/api/stories/route.ts`
+- the route already has contract drift, because the page submits richer data than the backend stores
+
+The most important contract mismatch is:
+
+- `src/app/create/page.tsx` sends `storyType` and `prompt`
+- `src/app/api/stories/route.ts` only reads `title`, `description`, and `author`
+
+That means the create page currently looks more capable than the system really is.
+
+## Supporting architecture outside `src/app/create/`
+
+Although `src/app/create/` contains only one source file, its behavior depends on a larger story subsystem.
+
+### `src/app/api/stories/route.ts`
+
+This route is the actual creation backend used by the page.
+
+Creation behavior:
+
+- `POST` reads the request body and only destructures `title`, `description`, and `author`
+- it rejects empty titles
+- it performs idempotency by checking whether a story with the same `title` already exists
+- it creates a `Story` record in the JSON store
+- it creates a placeholder first segment with content `《${title}》的故事开始了...`
+- it updates `rootSegmentId`
+- it returns the created story and first segment
+
+Implications for `src/app/create/page.tsx`:
+
+- `storyType` is discarded
+- `prompt` is discarded
+- template variants under the same title collapse into one story because idempotency is title-based
+- the “created” opening is not AI-generated; it is a placeholder seed segment
+
+This title-based dedupe is especially important for the template flow. The page visually suggests multiple alternate-history prompts for the same historical event, but `POST /api/stories` treats them as the same story if the title matches. For example, all `荆轲刺秦王` prompt variants resolve to the same existing story once one has been created.
+
+### `src/lib/simple-db.ts`
+
+This is the runtime persistence layer behind story creation.
+
+Relevant facts:
+
+- stories are persisted to `data/stories.json`
+- segments are persisted to `data/segments.json`
+- branches are persisted to `data/branches.json`
+- the runtime `Story` model contains only:
+  - `id`
+  - `title`
+  - `description?`
+  - `author?`
+  - `createdAt`
+  - `updatedAt`
+  - `rootSegmentId?`
+- the runtime `StorySegment` model contains only:
+  - `id`
+  - `title?`
+  - `content`
+  - `isBranchPoint`
+  - `createdAt`
+  - `updatedAt`
+  - `storyId`
+  - `branchId`
+  - `parentSegmentId?`
+  - `imageUrls`
+
+There are no runtime fields for:
+
+- structured story type
+- creation prompt provenance
+- canonical historical event metadata
+- story-world timeline or event dates
+- character sheets or relationship graphs
+- retrieval citations
+- pacing plans, beat budgets, or director controls
+
+This matters because the create page cannot persist richer ChronosMirror metadata even if the UI is extended. The current store shape would discard it unless the backend model changes first.
+
+### `src/types/story.ts`
+
+The shared type layer is slightly broader than the actual creation flow, but it is still far short of ChronosMirror needs.
+
+Relevant observations:
+
+- `ContinueStoryRequest` includes `characters?: string[]`, which suggests an intent to pass character context into generation later
+- `Story`, `StorySegment`, and `StoryBranch` still lack structured character state, historical facts, citations, or pacing metadata
+- the create page does not import these shared types, so contract drift is already possible
+
+### Runtime continuation and branching routes
+
+The creation page itself does not generate content, but the created story is later continued by:
+
+- `src/app/api/stories/[id]/stream-continue/route.ts`
+- `src/app/api/stories/[id]/branch/route.ts`
+
+Those routes build prompts from concatenated prior prose and `story.description`, then ask the model to continue in 150-300 words. They do not consume structured creation metadata from the create route because that metadata is not currently stored.
+
+That means the limitations in creation directly propagate into later generation quality.
+
+## Architecture overview
+
+### High-level flow
+
+1. User opens `/create`.
+2. `CreateStoryPage` renders hard-coded story types and hard-coded historical templates.
+3. User either:
+   - selects a template plus a prompt, or
+   - fills the custom form
+4. The page sends a `POST` request to `/api/stories`.
+5. The API persists a minimal `Story` plus a placeholder root `StorySegment` in the JSON store.
+6. The page redirects to `/story/[id]`.
+7. Later continuation or branching routes generate prose using only plain-text story context, not structured creation metadata.
+
+### Effective layering
+
+- presentation layer
+  - `src/app/create/page.tsx`
+- route/API orchestration layer
+  - `src/app/api/stories/route.ts`
+- persistence layer
+  - `src/lib/simple-db.ts`
+- downstream generation layer
+  - `src/app/api/stories/[id]/stream-continue/route.ts`
+  - `src/app/api/stories/[id]/branch/route.ts`
+
+### Architectural strengths
+
+- very small and easy-to-follow route surface
+- clear two-path create UX: guided templates or freeform creation
+- static templates give an immediate starting point for historical what-if stories
+- successful creation transitions directly into the story reader route
+
+### Architectural constraints
+
+- the route is monolithic; templates, state, submit handlers, and rendering all live in one file
+- templates and story types are hard-coded in the page, not supplied by configuration or backend data
+- the creation contract is wider in the UI than in the backend
+- create-time prompt intent is only partially preserved for templates and completely lost for custom prompts
+- idempotency is title-based rather than scenario-based, so distinct variants can collapse together
+- the system seeds a placeholder opening segment instead of a planned or validated first scene
+- the runtime data model is too narrow for structured historical storytelling
+
+## ChronosMirror upgrade gaps
+
+ChronosMirror, as described in the request, needs richer narrative state and stronger orchestration than the current create flow provides. The gaps start at story creation, not only during continuation.
+
+### 1. Character modeling gap
+
+Current state:
+
+- `src/app/create/page.tsx` collects only title, description, author, story type, and a prompt-like field.
+- There is no UI for protagonist roster, faction membership, speech style, motivation, relationship map, arc intent, or historical role.
+- `src/lib/simple-db.ts` has no place to persist character cards or dynamic relationships.
+- `src/types/story.ts` hints at character-aware continuation with `ContinueStoryRequest.characters?: string[]`, but the create page does not seed character data and the runtime routes do not build structured persona state from creation.
+
+Why this blocks ChronosMirror:
+
+- character consistency cannot be enforced later if creation never captures who the characters are
+- alternate-history prompts like `如果李建成提前得知李世民的阴谋` need role-aware state at creation time, not only freeform prose
+- the current system stores only text blobs, so later generation has to infer character identity and relationships from narrative text each time
+
+Concrete create-flow gaps:
+
+- no structured character input in the custom form
+- no template-attached character roster for the historical seeds
+- no persistence field for character snapshots
+- no downstream handoff from create route to continuation route for persona state
+
+Recommended upgrade direction:
+
+- add create-time structured character inputs
+  - core cast
+  - historical role
+  - goals
+  - fears
+  - speech/register notes
+  - relationship edges
+- persist those as first-class story metadata or normalized records, not only embedded prose
+- attach template-specific default character cards to each historical scenario
+- feed character state into prompt construction for root-scene generation, continuation, and branching
+
+### 2. Timeline validation gap
+
+Current state:
+
+- template metadata contains only a display-level `era` string such as `战国`, `三国`, or `唐`.
+- the create route persists no canonical historical event ID, no start date, no event window, no causal prerequisites, and no allowed divergence point.
+- the first segment is a placeholder sentence, not a validated opening scene.
+- downstream generation routes use `story.description` plus prior prose as plain text and do not run a historical or temporal validator.
+- the runtime graph model tracks authoring structure with `branchId` and `parentSegmentId`, but not story-world chronology.
+
+Why this blocks ChronosMirror:
+
+- historical what-if stories need an explicit “mirror point” where divergence begins
+- without a structured event anchor, the system cannot check whether generated scenes reference people, places, or consequences too early or too late
+- creation-time intent is ambiguous because prompt direction is not stored as structured timeline metadata
+
+Concrete create-flow gaps:
+
+- no field for canonical divergence moment
+- no field for baseline historical timeline
+- no field for world-time per segment or per branch
+- no validation pass between template selection and story creation
+- no warning surface in the UI when a prompt implies impossible chronology
+
+Recommended upgrade direction:
+
+- extend template definitions with canonical event metadata
+  - source event ID
+  - date range
+  - location
+  - participating historical actors
+  - preconditions
+- persist a structured divergence descriptor when the user creates a story
+- add timeline validation before saving the root story state and before later continuation/branch generation
+- store timeline metadata separately from prose so branches can be compared against historical baseline and against their own internal chronology
+
+### 3. MCP Wikipedia gap
+
+Current state:
+
+- `src/app/create/page.tsx` uses only hard-coded local template copy
+- `src/app/api/stories/route.ts` performs no retrieval at all during story creation
+- no file in the creation path imports or calls an MCP client
+- no story record stores citations, source provenance, or retrieval artifacts
+
+Why this blocks ChronosMirror:
+
+- ChronosMirror historical storytelling needs a factual anchor for the initial scenario, not only hand-authored template blurbs
+- without retrieval, the system cannot verify whether the selected divergence point, participants, or contextual details are historically grounded
+- without persisted provenance, the user cannot inspect what facts the system used when generating later scenes
+
+Concrete create-flow gaps:
+
+- no retrieval step when a template is selected
+- no prefill of canonical event facts from Wikipedia or another source
+- no source list attached to the story at creation time
+- no citations shown in the creation UI or story reader
+
+Recommended upgrade direction:
+
+- add an MCP retrieval step for template-based creation
+  - query Wikipedia for the selected event
+  - extract date, place, actors, and summary
+  - persist the retrieved facts and citations with the story seed
+- allow custom stories to optionally request the same retrieval flow when users reference a known historical event
+- surface source provenance in both create and story views so ChronosMirror can expose fact grounding instead of opaque prompt text
+
+### 4. Pacing control gap
+
+Current state:
+
+- the create page offers only a single prompt or freeform guidance box
+- there is no UI for chapter count, beat plan, act structure, scene length, escalation curve, or director mode
+- `src/app/api/stories/route.ts` does not generate a planned opening; it only seeds a placeholder segment
+- downstream generation routes use simple instructions like `请续写下一段（150-300字）`, which is coarse output sizing rather than real pacing control
+
+Why this blocks ChronosMirror:
+
+- pacing control should begin at story setup, because the opening premise determines branch width, narrative density, and escalation rhythm
+- a single prompt string cannot express beat sequencing or scene-level intent in a durable way
+- if the first saved segment is only a placeholder, there is no initial director plan for later steps to respect
+
+Concrete create-flow gaps:
+
+- no creation-time outline or beat planner
+- no pace profile attached to the story
+- no root-scene generation step that uses structured pacing parameters
+- no persisted target cadence for later continuation routes
+
+Recommended upgrade direction:
+
+- add pacing controls to creation
+  - target length
+  - scene cadence
+  - branch intensity
+  - reveal tempo
+  - director constraints
+- store a structured outline or beat scaffold with the story seed
+- replace the placeholder opening with generated root-scene creation that consumes:
+  - template facts
+  - character state
+  - divergence metadata
+  - pacing plan
+- propagate pacing metadata into continuation and branching APIs so later generation remains consistent with the initial setup
+
+## Cross-cutting conclusions
+
+`src/app/create/` is currently a polished but thin entry page over a minimal story-creation backend. The directory itself is small and understandable, but the feature is more limited than the UI suggests.
+
+The most important current limitations are:
+
+- the page sends richer intent than the backend stores
+- template variants collapse under title-based idempotency
+- custom prompts are not preserved
+- the opening scene is only a placeholder
+- the runtime model has no structured support for characters, timelines, citations, or pacing
+
+For ChronosMirror, the create flow should be treated as a schema and orchestration upgrade first, and only secondarily as a page-level UI enhancement. If creation stays text-only and lossy, the downstream continuation stack will keep inheriting those limits.

