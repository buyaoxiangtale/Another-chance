'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';

interface ImageMetadata {
  id: string;
  url: string;
  description?: string;
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
}

export default function StoryImageDisplay({
  segmentId,
  className = '',
  maxWidth = 800,
  maxHeight = 600,
  showDescription = true
}: StoryImageDisplayProps) {
  const [images, setImages] = useState<ImageMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 获取段落的图片数据
  useEffect(() => {
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
  }, [segmentId]);

  // 图片类型图标映射
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'illustration':
        return '🎨';
      case 'scene':
        return '🏞️';
      case 'character':
        return '👤';
      case 'object':
        return '🎭';
      default:
        return '🖼️';
    }
  };

  // 图片类型中文映射
  const getTypeText = (type: string) => {
    switch (type) {
      case 'illustration':
        return '插图';
      case 'scene':
        return '场景';
      case 'character':
        return '人物';
      case 'object':
        return '物件';
      default:
        return '图片';
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`}>
        <div className="text-gray-500">加载图片中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="text-red-600">图片加载失败: {error}</div>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className={`bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center ${className}`}>
        <div className="text-gray-400 mb-2">🖼️</div>
        <div className="text-gray-500">暂无相关图片</div>
        <div className="text-sm text-gray-400 mt-1">图片将在故事续写过程中生成</div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {images.map((image) => (
        <div key={image.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* 图片容器 */}
          <div 
            className="relative mx-auto"
            style={{ 
              maxWidth: Math.min(maxWidth, image.width), 
              maxHeight: Math.min(maxHeight, image.height) 
            }}
          >
            <Image
              src={image.url}
              alt={image.alt || image.description || `${getTypeText(image.type)}图片`}
              fill
              className="object-cover"
              onError={(e) => {
                // 图片加载失败时显示占位符
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.parentElement!.innerHTML = `
                  <div class="flex items-center justify-center w-full h-full bg-gray-100">
                    <div class="text-center">
                      <div class="text-4xl mb-2">🖼️</div>
                      <div class="text-gray-500 text-sm">图片加载失败</div>
                    </div>
                  </div>
                `;
              }}
            />
            
            {/* 图片类型标签 */}
            <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
              <span>{getTypeIcon(image.type)}</span>
              <span>{getTypeText(image.type)}</span>
            </div>
          </div>
          
          {/* 图片描述 */}
          {showDescription && (image.description || image.alt) && (
            <div className="p-3 bg-gray-50">
              <p className="text-sm text-gray-700">
                {image.description || image.alt}
              </p>
              <div className="text-xs text-gray-500 mt-1">
                尺寸: {image.width} × {image.height}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}