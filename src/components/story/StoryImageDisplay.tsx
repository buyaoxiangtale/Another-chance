'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';

interface ImageMetadata {
  id: string;
  url: string;
  description?: string;
  prompt?: string;
  type: 'illustration' | 'scene' | 'character' | 'object';
  width: number;
  height: number;
  alt?: string;
}

interface StoryImageDisplayProps {
  segmentId: string;
  className?: string;
  maxWidth?: number;
  maxHeight?: number;
  showDescription?: boolean;
  /** 直接传入图片 URL 列表（避免额外 API 请求） */
  imageUrls?: string[];
  /** 每张图对应的生成 prompt */
  imagePrompts?: string[];
  /** 重新生成图片回调 */
  onRegenerate?: () => void;
  /** 是否正在生成图片（显示骨架屏） */
  isGenerating?: boolean;
}

/** 骨架屏动画组件 — 带渐变微光效果 */
function ImageSkeleton({ count = 1 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg overflow-hidden border border-gray-200 bg-white">
          {/* 图片区域微光 */}
          <div className="relative w-full overflow-hidden bg-gray-100" style={{ paddingBottom: '56.25%' }}>
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s ease-in-out infinite',
              }}
            />
          </div>
          {/* 描述区域微光 */}
          <div className="p-3 space-y-2">
            <div
              className="h-3 rounded w-3/4"
              style={{
                background: 'linear-gradient(90deg, #e5e7eb 25%, #d1d5db 50%, #e5e7eb 75%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s ease-in-out infinite',
                animationDelay: '0.3s',
              }}
            />
            <div
              className="h-2 rounded w-1/2"
              style={{
                background: 'linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s ease-in-out infinite',
                animationDelay: '0.5s',
              }}
            />
          </div>
        </div>
      ))}
      {/* 内联 keyframes — 不依赖外部 CSS */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}

export default function StoryImageDisplay({
  segmentId,
  className = '',
  maxWidth = 800,
  maxHeight = 600,
  showDescription = true,
  imageUrls,
  imagePrompts,
  onRegenerate,
  isGenerating = false,
}: StoryImageDisplayProps) {
  const [images, setImages] = useState<ImageMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());

  // 使用传入的 imageUrls 或从 API 获取
  useEffect(() => {
    if (imageUrls !== undefined) {
      // 直接使用传入的 URL 列表
      const mapped: ImageMetadata[] = imageUrls.map((url, i) => ({
        id: `img_${segmentId}_${i}`,
        url,
        description: '',
        prompt: imagePrompts?.[i] || '',
        type: 'scene' as const,
        width: 1024,
        height: 1024,
        alt: `插图 ${i + 1}`,
      }));
      setImages(mapped);
      setLoading(false);
      setError(null);
      return;
    }

    // 没有 imageUrls 时从 API 获取
    const fetchImages = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/images?segmentId=${segmentId}`);

        if (!response.ok) {
          throw new Error('获取图片失败');
        }

        const data = await response.json();

        if (data.success) {
          setImages(data.images);
        } else {
          setError(data.error || '获取图片失败');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '获取图片失败');
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, [segmentId, imageUrls]);

  // 图片类型图标映射
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'illustration': return '🎨';
      case 'scene': return '🏞️';
      case 'character': return '👤';
      case 'object': return '🎭';
      default: return '🖼️';
    }
  };

  // 图片类型中文映射
  const getTypeText = (type: string) => {
    switch (type) {
      case 'illustration': return '插图';
      case 'scene': return '场景';
      case 'character': return '人物';
      case 'object': return '物件';
      default: return '图片';
    }
  };

  // 正在生成图片时显示骨架屏
  if (isGenerating) {
    return (
      <div className={className}>
        <ImageSkeleton count={2} />
        <p className="text-xs text-center text-[var(--muted)] animate-pulse mt-3">图片生成中...</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={className}>
        <ImageSkeleton count={1} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center justify-between">
        <div className="text-red-600 text-sm">{error}</div>
        {onRegenerate && (
          <button
            onClick={onRegenerate}
            className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
          >
            重试
          </button>
        )}
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className={`bg-gray-50 border border-dashed border-gray-300 rounded-lg p-4 text-center ${className}`}>
        <div className="text-gray-400 text-sm">暂无插图</div>
        {onRegenerate && (
          <button
            onClick={onRegenerate}
            className="mt-2 text-xs text-[var(--gold)] hover:text-[var(--accent)] transition-colors"
          >
            生成插图
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {images.map((image) => {
        const isLoaded = loadedImages.has(image.id);
        return (
          <div key={image.id} className="rounded-lg overflow-hidden border border-gray-200 bg-white">
            {/* 图片容器 */}
            <div
              className="relative mx-auto"
              style={{
                maxWidth: Math.min(maxWidth, image.width),
                maxHeight: Math.min(maxHeight, image.height),
              }}
            >
              {/* 骨架屏：图片加载中 — 微光效果 */}
              {!isLoaded && (
                <div className="relative w-full overflow-hidden bg-gray-100" style={{ paddingBottom: '100%' }}>
                  <div
                    className="absolute inset-0"
                    style={{
                      background: 'linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%)',
                      backgroundSize: '200% 100%',
                      animation: 'shimmer 1.5s ease-in-out infinite',
                    }}
                  />
                </div>
              )}
              <Image
                src={image.url}
                alt={image.alt || image.description || `${getTypeText(image.type)}图片`}
                width={image.width}
                height={image.height}
                className={`object-cover transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0 absolute inset-0'}`}
                onLoad={() => setLoadedImages(prev => new Set(prev).add(image.id))}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />

              {/* 图片类型标签 */}
              <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                <span>{getTypeIcon(image.type)}</span>
                <span>{getTypeText(image.type)}</span>
              </div>
            </div>

            {/* 图片描述 */}
            {showDescription && image.description && (
              <div className="p-2 bg-gray-50">
                <p className="text-xs text-gray-600">{image.description}</p>
              </div>
            )}
            {/* Prompt 描述（可折叠） */}
            {image.prompt && (
              <details className="px-2 pb-2 bg-gray-50/50">
                <summary className="text-[10px] text-gray-400 cursor-pointer hover:text-gray-600 transition-colors">📝 生成 Prompt</summary>
                <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">{image.prompt}</p>
              </details>
            )}
          </div>
        );
      })}

      {/* 重新生成按钮 */}
      {onRegenerate && (
        <button
          onClick={onRegenerate}
          className="w-full text-center text-xs text-[var(--muted)] hover:text-[var(--gold)] py-1.5 border border-dashed border-gray-200 rounded-lg hover:border-[var(--gold)]/50 transition-all"
        >
          重新生成插图
        </button>
      )}
    </div>
  );
}
