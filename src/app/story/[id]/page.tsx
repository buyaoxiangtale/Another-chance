'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Story, StorySegment, StoryBranch } from '@/types/story';

interface StoryTreeNode {
  id: string;
  title?: string;
  content?: string;
  isBranchPoint: boolean;
  children: StoryTreeNode[];
  branchId?: string;
  parentId?: string;
  order: number;
}

// 故事段落组件
interface StorySegmentProps {
  segment: StorySegment;
  onSelectBranch?: (branchId: string) => void;
  isSelected?: boolean;
}

function StorySegmentComponent({ segment, onSelectBranch, isSelected }: StorySegmentProps) {
  return (
    <div className={`p-4 rounded-lg border-2 transition-all ${
      isSelected 
        ? 'border-blue-500 bg-blue-50 shadow-md' 
        : 'border-gray-200 bg-white'
    }`}>
      {segment.title && (
        <h3 className="font-bold text-lg text-gray-900 mb-2">
          {segment.title}
        </h3>
      )}
      <p className="text-gray-700 leading-relaxed mb-3">
        {segment.content}
      </p>
      
      {segment.isBranchPoint && (
        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded">
          <p className="text-sm text-amber-800 font-medium mb-2">
            🎯 关键分叉点 - 选择故事走向
          </p>
          {/* 这里应该显示分支选项，由父组件处理 */}
        </div>
      )}
      
      {segment.imageUrls && segment.imageUrls.length > 0 && (
        <div className="mt-3 space-y-2">
          {segment.imageUrls.map((url, index) => (
            <div key={index} className="text-sm text-gray-500">
              <span className="mr-2">🖼️</span>
              <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                图片 {index + 1}
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// 树状结构组件
interface StoryTreeProps {
  story: Story;
  segments: StorySegment[];
  branches: StoryBranch[];
  onSegmentSelect: (segmentId: string) => void;
  selectedSegmentId?: string;
}

function StoryTree({ story, segments, branches, onSegmentSelect, selectedSegmentId }: StoryTreeProps) {
  // 构建树状结构
  const buildTree = (): StoryTreeNode[] => {
    const segmentMap = new Map<string, StorySegment>();
    const treeMap = new Map<string, StoryTreeNode>();
    const rootNodes: StoryTreeNode[] = [];

    // 创建所有节点
    segments.forEach(segment => {
      const treeNode: StoryTreeNode = {
        id: segment.id,
        title: segment.title,
        content: segment.content,
        isBranchPoint: segment.isBranchPoint,
        children: [],
        order: segment.order,
        parentId: segment.parentBranchId
      };
      segmentMap.set(segment.id, segment);
      treeMap.set(segment.id, treeNode);
    });

    // 构建树结构
    segments.forEach(segment => {
      const treeNode = treeMap.get(segment.id)!;
      
      if (segment.parentBranchId) {
        // 如果有父分支，查找父分支的段落的节点
        const parentSegments = segments.filter(s => s.id === segment.parentBranchId);
        if (parentSegments.length > 0) {
          const parentNode = treeMap.get(parentSegments[0].id);
          if (parentNode) {
            parentNode.children.push(treeNode);
          }
        }
      } else if (!segment.parentBranchId) {
        // 根段落
        rootNodes.push(treeNode);
      }
    });

    // 按order排序
    rootNodes.sort((a, b) => a.order - b.order);
    rootNodes.forEach(node => {
      node.children.sort((a, b) => a.order - b.order);
    });

    return rootNodes;
  };

  const treeNodes = buildTree();

  // 递归渲染树节点
  const renderTreeNode = (node: StoryTreeNode, level: number = 0) => {
    const isSelected = selectedSegmentId === node.id;
    const segment = segments.find(s => s.id === node.id);
    
    if (!segment) return null;

    return (
      <div key={node.id} className={`${level > 0 ? 'ml-6 mt-2' : ''}`}>
        <StorySegmentComponent
          segment={segment}
          isSelected={isSelected}
          onSelectBranch={() => node.branchId && onSegmentSelect(node.branchId)}
        />
        
        {node.children.length > 0 && (
          <div className="mt-3 space-y-2">
            {node.children.map(child => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (treeNodes.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">暂无故事内容</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {treeNodes.map(node => renderTreeNode(node))}
    </div>
  );
}

// 加载状态组件
function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="p-4 bg-white rounded-lg border border-gray-200 animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded mb-1"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      ))}
    </div>
  );
}

interface StoryDetailPageProps {
  params: { id: string };
}

export default function StoryDetailPage({ params }: StoryDetailPageProps) {
  const router = useRouter();
  const [story, setStory] = useState<Story | null>(null);
  const [segments, setSegments] = useState<StorySegment[]>([]);
  const [branches, setBranches] = useState<StoryBranch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | undefined>();

  // 加载故事数据
  useEffect(() => {
    loadStoryData();
  }, [params.id]);

  const loadStoryData = async () => {
    try {
      const [storyResponse, segmentsResponse, branchesResponse] = await Promise.all([
        fetch(`/api/stories/${params.id}`),
        fetch(`/api/stories/${params.id}/segments`),
        fetch(`/api/stories/${params.id}/branches`)
      ]);

      if (!storyResponse.ok || !segmentsResponse.ok || !branchesResponse.ok) {
        throw new Error('加载数据失败');
      }

      const storyData = await storyResponse.json();
      const segmentsData = await segmentsResponse.json();
      const branchesData = await branchesResponse.json();

      setStory(storyData.story);
      setSegments(segmentsData.segments || []);
      setBranches(branchesData.branches || []);
      
      // 自动选择第一个段落
      if (segmentsData.segments && segmentsData.segments.length > 0) {
        setSelectedSegmentId(segmentsData.segments[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setLoading(false);
    }
  };

  // 处理段落选择
  const handleSegmentSelect = (segmentId: string) => {
    setSelectedSegmentId(segmentId);
  };

  // 续写故事
  const handleContinueStory = async () => {
    if (!selectedSegmentId) return;
    
    try {
      const response = await fetch(`/api/stories/${params.id}/continue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          segmentId: selectedSegmentId,
          style: '古典文学风格',
          tone: '严肃',
          length: '中等长度'
        })
      });

      if (!response.ok) {
        throw new Error('续写失败');
      }

      const data = await response.json();
      if (data.success) {
        // 重新加载数据
        loadStoryData();
      }
    } catch (err) {
      console.error('续写失败:', err);
      alert('续写失败，请重试');
    }
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{story?.title || '故事详情'}</h1>
          {story?.description && (
            <p className="text-gray-600">{story.description}</p>
          )}
        </header>

        {/* 主要内容 */}
        <main className="max-w-4xl mx-auto">
          {loading && <LoadingSkeleton />}
          
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 mb-2">{error}</p>
              <button 
                onClick={loadStoryData}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                重试
              </button>
            </div>
          )}

          {!loading && !error && story && (
            <div className="space-y-6">
              {/* 故事树 */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">故事发展</h2>
                <StoryTree
                  story={story}
                  segments={segments}
                  branches={branches}
                  onSegmentSelect={handleSegmentSelect}
                  selectedSegmentId={selectedSegmentId}
                />
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-4">
                <button
                  onClick={handleContinueStory}
                  disabled={!selectedSegmentId}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                    selectedSegmentId
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  续写故事
                </button>
                
                {selectedSegmentId && (
                  <button
                    onClick={() => {
                      // TODO: 实现分叉功能
                      console.log('创建分叉');
                    }}
                    className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
                  >
                    创建分叉
                  </button>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}