'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
const { Story, StorySegment, StoryBranch } = require('@/types/story');

interface BranchOption {
  id: string;
  title: string;
  description: string;
  direction: 'alternate' | 'different' | 'extended';
  preview?: string;
}

interface BranchSelectionPageProps {
  params: { id: string; segmentId: string };
}

// 分支选项组件
interface BranchOptionCardProps {
  option: BranchOption;
  onSelect: (optionId: string) => void;
  isSelected: boolean;
}

function BranchOptionCard({ option, onSelect, isSelected }: BranchOptionCardProps) {
  const directionLabels = {
    alternate: '平行时空',
    different: '关键转折',
    extended: '细节延伸'
  };

  const directionColors = {
    alternate: 'bg-blue-100 text-blue-800 border-blue-200',
    different: 'bg-purple-100 text-purple-800 border-purple-200',
    extended: 'bg-green-100 text-green-800 border-green-200'
  };

  return (
    <div 
      className={`p-6 rounded-lg border-2 cursor-pointer transition-all ${
        isSelected 
          ? 'border-blue-500 bg-blue-50 shadow-md' 
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
      }`}
      onClick={() => onSelect(option.id)}
    >
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-semibold text-gray-900">{option.title}</h3>
        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${directionColors[option.direction]}`}>
          {directionLabels[option.direction]}
        </span>
      </div>
      
      <p className="text-gray-600 mb-4 leading-relaxed">{option.description}</p>
      
      {option.preview && (
        <div className="mt-4 p-3 bg-gray-50 rounded border border-gray-200">
          <p className="text-sm text-gray-700 italic">"{option.preview}"</p>
        </div>
      )}
      
      {isSelected && (
        <div className="mt-4 flex items-center text-blue-600">
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="text-sm font-medium">已选择此分支</span>
        </div>
      )}
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

// AI生成分支建议的模拟（实际项目中应该调用API）
function generateBranchSuggestions(segment: StorySegment): BranchOption[] {
  return [
    {
      id: 'branch_1',
      title: '成功刺杀',
      description: '荆轲成功刺杀秦始皇，改变了秦朝的历史走向，天下局势重新洗牌',
      direction: 'different',
      preview: '秦王嬴政在咸阳宫遭遇刺杀，匕首深深刺入胸膛...'
    },
    {
      id: 'branch_2', 
      title: '刺杀失败',
      description: '荆轲刺杀失败，秦始皇加强了对各国的控制，统一进程加速',
      direction: 'alternate',
      preview: '秦王大怒，立即下令捉拿刺客，燕国面临灭顶之灾...'
    },
    {
      id: 'branch_3',
      title: '历史悬案',
      description: '刺杀过程中出现意外，历史留下悬案，各种阴谋论四起',
      direction: 'extended',
      preview: '就在匕首即将刺中秦王的一刹那，殿外突然传来巨响...'
    }
  ];
}

export default function BranchSelectionPage({ params }: BranchSelectionPageProps) {
  const router = useRouter();
  const [story, setStory] = useState<Story | null>(null);
  const [segment, setSegment] = useState<StorySegment | null>(null);
  const [branchOptions, setBranchOptions] = useState<BranchOption[]>([]);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // 加载故事和段落数据
  useEffect(() => {
    loadStoryData();
  }, [params.id, params.segmentId]);

  const loadStoryData = async () => {
    try {
      const [storyResponse, segmentResponse] = await Promise.all([
        fetch(`/api/stories/${params.id}`),
        fetch(`/api/stories/${params.id}/segments`)
      ]);

      if (!storyResponse.ok || !segmentResponse.ok) {
        throw new Error('加载数据失败');
      }

      const storyData = await storyResponse.json();
      const segmentsData = await segmentResponse.json();
      
      setStory(storyData.story);
      const currentSegment = segmentsData.segments?.find((s: StorySegment) => s.id === params.segmentId);
      setSegment(currentSegment);

      if (currentSegment && currentSegment.isBranchPoint) {
        // 生成分支建议
        const options = generateBranchSuggestions(currentSegment);
        setBranchOptions(options);
      }
    } catch (err) {
      console.error('加载数据失败:', err);
      alert('加载失败，请返回重试');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  // 创建分支
  const handleCreateBranch = async () => {
    if (!selectedOptionId || !story || !segment) return;

    setCreating(true);
    try {
      const selectedOption = branchOptions.find(opt => opt.id === selectedOptionId);
      
      const response = await fetch(`/api/stories/${params.id}/branch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          segmentId: params.segmentId,
          branchType: selectedOption?.direction || 'alternate',
          style: '古典文学风格',
          tone: '严肃',
          userInstructions: `选择${selectedOption?.title}分支`
        })
      });

      if (!response.ok) {
        throw new Error('创建分支失败');
      }

      const data = await response.json();
      if (data.success) {
        // 导航到故事阅读页面
        router.push(`/story/${params.id}`);
      }
    } catch (err) {
      console.error('创建分支失败:', err);
      alert('创建分支失败，请重试');
    } finally {
      setCreating(false);
    }
  };

  // 取消操作
  const handleCancel = () => {
    router.back();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900">选择故事分支</h1>
              <p className="text-gray-600 mt-2">正在加载...</p>
            </div>
            <LoadingSkeleton />
          </div>
        </div>
      </div>
    );
  }

  if (!story || !segment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">页面不存在</h1>
            <button 
              onClick={handleCancel}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              返回
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!segment.isBranchPoint) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">非关键分叉点</h1>
            <p className="text-gray-600 mb-6">
              当前段落不是关键分叉点，无法创建分支。请继续阅读故事或在分叉点再进行分支选择。
            </p>
            <button 
              onClick={() => router.push(`/story/${params.id}`)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              返回故事阅读
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
      <div className="container mx-auto px-4 py-8">
        {/* 导航栏 */}
        <nav className="mb-6">
          <button 
            onClick={() => router.push(`/story/${params.id}`)}
            className="flex items-center text-blue-600 hover:text-blue-800"
          >
            ← 返回故事阅读
          </button>
        </nav>

        {/* 页头 */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">选择故事分支</h1>
          <p className="text-gray-600 mb-4">
            故事发展至关键分叉点，请选择您希望的故事走向
          </p>
          
          {/* 当前段落预览 */}
          <div className="p-4 bg-white rounded-lg border border-gray-200 mb-4">
            <h3 className="font-semibold text-gray-900 mb-2">当前段落</h3>
            <p className="text-gray-700 leading-relaxed">{segment.content}</p>
          </div>
        </header>

        {/* 主要内容 */}
        <main className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">请选择故事发展方向</h2>
            
            {branchOptions.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">暂无分支选项</p>
                <button 
                  onClick={handleCancel}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  返回
                </button>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
                {branchOptions.map((option) => (
                  <BranchOptionCard
                    key={option.id}
                    option={option}
                    onSelect={setSelectedOptionId}
                    isSelected={selectedOptionId === option.id}
                  />
                ))}
              </div>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-4">
            <button
              onClick={handleCancel}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            
            <button
              onClick={handleCreateBranch}
              disabled={!selectedOptionId || creating}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                selectedOptionId && !creating
                  ? 'bg-purple-600 text-white hover:bg-purple-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {creating ? '创建中...' : '创建此分支'}
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}