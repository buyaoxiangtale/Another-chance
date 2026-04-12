'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface HistoryStory {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedTime: string;
}

interface CustomStoryTemplate {
  id: string;
  name: string;
  description: string;
  fields: {
    title: boolean;
    description: boolean;
    author: boolean;
    genre: boolean;
  };
}

// 历史故事卡片组件
interface HistoryStoryCardProps {
  story: HistoryStory;
  onSelect: (storyId: string) => void;
  isSelected: boolean;
}

function HistoryStoryCard({ story, onSelect, isSelected }: HistoryStoryCardProps) {
  const difficultyLabels = {
    easy: '简单',
    medium: '中等',
    hard: '困难'
  };

  const difficultyColors = {
    easy: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    hard: 'bg-red-100 text-red-800'
  };

  const categoryColors: { [key: string]: string } = {
    '古代战争': 'bg-blue-100 text-blue-800',
    '宫廷权谋': 'bg-purple-100 text-purple-800',
    '历史悬疑': 'bg-gray-100 text-gray-800',
    '民间传说': 'bg-orange-100 text-orange-800',
    '经典名著': 'bg-indigo-100 text-indigo-800'
  };

  return (
    <div 
      className={`p-6 rounded-lg border-2 cursor-pointer transition-all ${
        isSelected 
          ? 'border-blue-500 bg-blue-50 shadow-md' 
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
      }`}
      onClick={() => onSelect(story.id)}
    >
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-semibold text-gray-900">{story.title}</h3>
        <div className="flex gap-2">
          <span className={`px-2 py-1 text-xs font-medium rounded-full border ${categoryColors[story.category] || 'bg-gray-100 text-gray-800'}`}>
            {story.category}
          </span>
          <span className={`px-2 py-1 text-xs font-medium rounded-full border ${difficultyColors[story.difficulty]}`}>
            {difficultyLabels[story.difficulty]}
          </span>
        </div>
      </div>
      
      <p className="text-gray-600 mb-4 leading-relaxed line-clamp-3">{story.description}</p>
      
      <div className="flex justify-between items-center text-sm text-gray-500">
        <span>预计时长：{story.estimatedTime}</span>
        {isSelected && (
          <div className="flex items-center text-blue-600">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            已选择
          </div>
        )}
      </div>
    </div>
  );
}

// 自定义故事模板组件
interface CustomStoryTemplateCardProps {
  template: CustomStoryTemplate;
  onSelect: (templateId: string) => void;
  isSelected: boolean;
}

function CustomStoryTemplateCard({ template, onSelect, isSelected }: CustomStoryTemplateCardProps) {
  return (
    <div 
      className={`p-6 rounded-lg border-2 cursor-pointer transition-all ${
        isSelected 
          ? 'border-blue-500 bg-blue-50 shadow-md' 
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
      }`}
      onClick={() => onSelect(template.id)}
    >
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{template.name}</h3>
      <p className="text-gray-600 mb-4 leading-relaxed">{template.description}</p>
      
      <div className="space-y-2">
        <p className="text-sm text-gray-500">包含字段：</p>
        <div className="flex gap-2 flex-wrap">
          {template.fields.title && (
            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">标题</span>
          )}
          {template.fields.description && (
            <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">描述</span>
          )}
          {template.fields.author && (
            <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded">作者</span>
          )}
          {template.fields.genre && (
            <span className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded">类型</span>
          )}
        </div>
      </div>
      
      {isSelected && (
        <div className="mt-4 flex items-center text-blue-600">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="text-sm">已选择</span>
        </div>
      )}
    </div>
  );
}

// 自定义故事创建表单
interface CustomStoryFormProps {
  template: CustomStoryTemplate | null;
  onSubmit: (formData: any) => void;
  onCancel: () => void;
}

function CustomStoryForm({ template, onSubmit, onCancel }: CustomStoryFormProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    author: '',
    genre: ''
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  if (!template) return null;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-6">创建自定义故事</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {template.fields.title && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              故事标题 *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="请输入故事标题"
              required
            />
          </div>
        )}

        {template.fields.description && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              故事描述
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={4}
              placeholder="请输入故事背景和简介"
            />
          </div>
        )}

        {template.fields.author && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              作者
            </label>
            <input
              type="text"
              value={formData.author}
              onChange={(e) => handleInputChange('author', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="请输入作者名称"
            />
          </div>
        )}

        {template.fields.genre && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              故事类型
            </label>
            <select
              value={formData.genre}
              onChange={(e) => handleInputChange('genre', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">请选择类型</option>
              <option value="古代战争">古代战争</option>
              <option value="宫廷权谋">宫廷权谋</option>
              <option value="历史悬疑">历史悬疑</option>
              <option value="民间传说">民间传说</option>
              <option value="经典名著">经典名著</option>
              <option value="原创故事">原创故事</option>
            </select>
          </div>
        )}

        <div className="flex gap-4 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            创建故事
          </button>
        </div>
      </form>
    </div>
  );
}

// 加载状态组件
function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="p-6 bg-white rounded-lg border-2 border-gray-200 animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-3"></div>
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      ))}
    </div>
  );
}

export default function CreateStoryPage() {
  const router = useRouter();
  const [selectedTab, setSelectedTab] = useState<'history' | 'custom'>('history');
  const [selectedHistoryStory, setSelectedHistoryStory] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [customFormVisible, setCustomFormVisible] = useState(false);

  // 历史故事数据（实际项目中应该从API获取）
  const historyStories: HistoryStory[] = [
    {
      id: 'history_1',
      title: '荆轲刺秦王',
      description: '战国末期，燕国太子丹派遣荆轲刺杀秦王嬴政。这是一个充满悬念和决断的历史时刻，如果刺杀成功，历史将被改写。',
      category: '古代战争',
      difficulty: 'medium',
      estimatedTime: '30-45分钟'
    },
    {
      id: 'history_2',
      title: '赤壁之战',
      description: '东汉末年，孙刘联军在赤壁大败曹操大军，奠定了三国鼎立的基础。这场战役充满了智谋和巧合。',
      category: '古代战争',
      difficulty: 'hard',
      estimatedTime: '45-60分钟'
    },
    {
      id: 'history_3',
      title: '玄武门之变',
      description: '唐朝初年，李世民在玄武门发动政变，杀死太子李建成和齐王李元吉，最终登基成为唐太宗。',
      category: '宫廷权谋',
      difficulty: 'medium',
      estimatedTime: '30-45分钟'
    }
  ];

  // 自定义故事模板数据
  const customTemplates: CustomStoryTemplate[] = [
    {
      id: 'template_1',
      name: '基础模板',
      description: '包含故事的基本信息：标题、描述、作者',
      fields: {
        title: true,
        description: true,
        author: true,
        genre: false
      }
    },
    {
      id: 'template_2',
      name: '完整模板',
      description: '包含所有可用的字段：标题、描述、作者、类型',
      fields: {
        title: true,
        description: true,
        author: true,
        genre: true
      }
    }
  ];

  useEffect(() => {
    // 模拟加载数据
    setTimeout(() => setLoading(false), 1000);
  }, []);

  // 选择历史故事
  const handleHistoryStorySelect = (storyId: string) => {
    setSelectedHistoryStory(storyId);
    setCustomFormVisible(false);
    setSelectedTemplate(null);
  };

  // 选择自定义模板
  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    setCustomFormVisible(true);
    setSelectedHistoryStory(null);
  };

  // 处理历史故事选择完成
  const handleHistoryStoryComplete = async () => {
    if (!selectedHistoryStory) return;

    try {
      const story = historyStories.find(s => s.id === selectedHistoryStory);
      if (!story) return;

      const response = await fetch('/api/stories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: story.title,
          description: story.description,
          author: '佚名'
        })
      });

      if (!response.ok) {
        throw new Error('创建故事失败');
      }

      const data = await response.json();
      if (data.success) {
        router.push(`/story/${data.story.id}`);
      }
    } catch (err) {
      console.error('创建历史故事失败:', err);
      alert('创建失败，请重试');
    }
  };

  // 处理自定义故事创建
  const handleCustomStoryCreate = async (formData: any) => {
    try {
      const response = await fetch('/api/stories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          author: formData.author || '佚名'
        })
      });

      if (!response.ok) {
        throw new Error('创建故事失败');
      }

      const data = await response.json();
      if (data.success) {
        router.push(`/story/${data.story.id}`);
      }
    } catch (err) {
      console.error('创建自定义故事失败:', err);
      alert('创建失败，请重试');
    }
  };

  // 取消自定义故事创建
  const handleCustomCancel = () => {
    setCustomFormVisible(false);
    setSelectedTemplate(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
      <div className="container mx-auto px-4 py-8">
        {/* 导航栏 */}
        <nav className="mb-6">
          <button 
            onClick={() => router.push('/')}
            className="flex items-center text-blue-600 hover:text-blue-800"
          >
            ← 返回故事列表
          </button>
        </nav>

        {/* 页头 */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">创建新故事</h1>
          <p className="text-gray-600">
            选择开始一个历史故事，或者创建您自己的原创故事
          </p>
        </header>

        {/* 主要内容 */}
        <main className="max-w-4xl mx-auto">
          {/* 选项卡 */}
          <div className="mb-8">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8">
                <button
                  onClick={() => setSelectedTab('history')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    selectedTab === 'history'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  历史故事
                </button>
                <button
                  onClick={() => setSelectedTab('custom')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    selectedTab === 'custom'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  自定义故事
                </button>
              </nav>
            </div>
          </div>

          {/* 历史故事选择 */}
          {selectedTab === 'history' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">选择历史故事</h2>
              
              {loading ? (
                <LoadingSkeleton />
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {historyStories.map((story) => (
                    <HistoryStoryCard
                      key={story.id}
                      story={story}
                      onSelect={handleHistoryStorySelect}
                      isSelected={selectedHistoryStory === story.id}
                    />
                  ))}
                </div>
              )}

              <div className="mt-8 flex justify-center">
                <button
                  onClick={handleHistoryStoryComplete}
                  disabled={!selectedHistoryStory}
                  className={`px-8 py-3 rounded-lg font-medium transition-colors ${
                    selectedHistoryStory
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  开始这个故事
                </button>
              </div>
            </div>
          )}

          {/* 自定义故事创建 */}
          {selectedTab === 'custom' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">选择故事模板</h2>
              
              {!customFormVisible && (
                <div className="grid gap-6 md:grid-cols-2">
                  {customTemplates.map((template) => (
                    <CustomStoryTemplateCard
                      key={template.id}
                      template={template}
                      onSelect={handleTemplateSelect}
                      isSelected={selectedTemplate === template.id}
                    />
                  ))}
                </div>
              )}

              {customFormVisible && selectedTemplate && (
                <CustomStoryForm
                  template={customTemplates.find(t => t.id === selectedTemplate) || null}
                  onSubmit={handleCustomStoryCreate}
                  onCancel={handleCustomCancel}
                />
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}