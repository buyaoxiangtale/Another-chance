'use client';

import { useState, useEffect } from 'react';
const { Story } = require('@/types/story');

// 故事卡片组件
interface StoryCardProps {
  story: Story;
  onSelect: (story: Story) => void;
}

function StoryCard({ story, onSelect }: StoryCardProps) {
  return (
    <div 
      className="p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer border border-gray-200"
      onClick={() => onSelect(story)}
    >
      <h3 className="text-xl font-bold text-gray-900 mb-2">{story.title}</h3>
      {story.description && (
        <p className="text-gray-600 mb-4 line-clamp-3">{story.description}</p>
      )}
      <div className="flex justify-between items-center text-sm text-gray-500">
        <span>作者：{story.author || '佚名'}</span>
        <span>{new Date(story.createdAt).toLocaleDateString('zh-CN')}</span>
      </div>
    </div>
  );
}

// 加载状态组件
function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="p-6 bg-white rounded-lg shadow-md border border-gray-200">
          <div className="h-6 bg-gray-200 rounded mb-2 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded mb-2 animate-pulse w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2"></div>
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 加载故事列表
  useEffect(() => {
    loadStories();
  }, []);

  const loadStories = async () => {
    try {
      const response = await fetch('/api/stories');
      if (!response.ok) {
        throw new Error('加载故事列表失败');
      }
      const data = await response.json();
      setStories(data.stories || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setLoading(false);
    }
  };

  // 选择故事
  const handleSelectStory = (story: Story) => {
    // 这里可以导航到故事阅读页面，或者设置当前故事
    console.log('选择故事:', story);
    // TODO: 导航到 /story/{story.id}
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
      <div className="container mx-auto px-4 py-8">
        {/* 页头 */}
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            古事 - 分叉故事续写平台
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            选择一个历史故事，在关键转折点体验不同的分叉剧情，探索历史的无限可能
          </p>
        </header>

        {/* 主要内容 */}
        <main className="max-w-4xl mx-auto">
          {/* 创建新故事按钮 */}
          <div className="mb-8">
            <a 
              href="/create"
              className="w-full md:w-auto px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg inline-block text-center"
            >
              创建新故事
            </a>
          </div>

          {/* 故事列表 */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">选择故事</h2>
            
            {loading && <LoadingSkeleton />}
            
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600">{error}</p>
                <button 
                  onClick={loadStories}
                  className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  重试
                </button>
              </div>
            )}
            
            {!loading && !error && stories.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">暂无故事</p>
                <button 
                  onClick={() => {
                    // TODO: 导航到创建故事页面
                    console.log('创建新故事');
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  创建第一个故事
                </button>
              </div>
            )}
            
            {!loading && !error && stories.length > 0 && (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {stories.map((story) => (
                  <StoryCard 
                    key={story.id} 
                    story={story} 
                    onSelect={handleSelectStory}
                  />
                ))}
              </div>
            )}
          </div>
        </main>

        {/* 页脚 */}
        <footer className="mt-16 text-center text-gray-500">
          <p>&copy; 2026 古事 - 分叉故事续写平台</p>
        </footer>
      </div>
    </div>
  );
}