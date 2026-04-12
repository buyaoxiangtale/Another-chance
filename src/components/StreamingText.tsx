'use client';

import { useState, useEffect, useRef } from 'react';

interface StreamingTextProps {
  text: string;
  speed?: number; // 打字速度（毫秒）
  className?: string;
  onComplete?: () => void;
  cursor?: boolean;
  showComplete?: boolean;
}

// 单个文本段落的流式展示组件
function StreamingText({ 
  text, 
  speed = 50, 
  className = "",
  onComplete,
  cursor = true,
  showComplete = false
}: StreamingTextProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // 重置状态
    setDisplayedText('');
    setIsComplete(false);
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    if (!text) return;

    // 模拟打字效果
    let currentIndex = 0;
    intervalRef.current = setInterval(() => {
      if (currentIndex < text.length) {
        setDisplayedText(text.substring(0, currentIndex + 1));
        currentIndex++;
      } else {
        // 完成打字
        setIsComplete(true);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        onComplete?.();
      }
    }, speed);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [text, speed, onComplete]);

  return (
    <div className={className}>
      {displayedText}
      {cursor && !isComplete && (
        <span className="inline-block w-2 h-6 bg-gray-800 animate-pulse ml-1 align-middle"></span>
      )}
      {showComplete && isComplete && (
        <span className="inline-block ml-2 text-green-600">✓ 完成</span>
      )}
    </div>
  );
}

// 多个文本段落的流式展示组件
interface MultiStreamingTextProps {
  texts: string[];
  speed?: number;
  className?: string;
  onComplete?: () => void;
  delayBetween?: number; // �落之间的延迟（毫秒）
  showProgress?: boolean;
}

function MultiStreamingText({ 
  texts, 
  speed = 50, 
  className = "",
  onComplete,
  delayBetween = 1000,
  showProgress = false
}: MultiStreamingTextProps) {
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [allComplete, setAllComplete] = useState(false);

  const handleTextComplete = () => {
    if (currentTextIndex < texts.length - 1) {
      // 还有下一个段落，延迟后开始
      setTimeout(() => {
        setCurrentTextIndex(prev => prev + 1);
      }, delayBetween);
    } else {
      // 所有段落都完成了
      setAllComplete(true);
      onComplete?.();
    }
  };

  const currentText = texts[currentTextIndex];

  return (
    <div className={className}>
      {/* 进度指示器 */}
      {showProgress && (
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>进度: {currentTextIndex + 1} / {texts.length}</span>
            <span>{Math.round(((currentTextIndex + 1) / texts.length) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentTextIndex + 1) / texts.length) * 100}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* 当前段落 */}
      <div className="space-y-4">
        <StreamingText
          text={currentText}
          speed={speed}
          onComplete={handleTextComplete}
          showComplete={texts.length === 1} // 只有单个段落时显示完成状态
        />
      </div>

      {/* 段落导航 */}
      {texts.length > 1 && (
        <div className="mt-6 flex justify-between items-center">
          <button
            onClick={() => setCurrentTextIndex(prev => Math.max(0, prev - 1))}
            disabled={currentTextIndex === 0}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            上一段
          </button>
          
          <span className="text-sm text-gray-500">
            {currentTextIndex + 1} / {texts.length}
          </span>
          
          <button
            onClick={() => setCurrentTextIndex(prev => Math.min(texts.length - 1, prev + 1))}
            disabled={currentTextIndex === texts.length - 1}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            下一段
          </button>
        </div>
      )}
    </div>
  );
}

// 服务器发送事件 (SSE) 流式文本组件
interface SSEStreamingTextProps {
  url: string;
  className?: string;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

function SSEStreamingText({ url, className = "", onComplete, onError }: SSEStreamingTextProps) {
  const [content, setContent] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // 创建 SSE 连接
    eventSourceRef.current = new EventSource(url);

    eventSourceRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'progress') {
          // 更新进度
          setContent(data.content || '');
        } else if (data.type === 'complete') {
          // 完成
          setContent(data.content || '');
          setIsComplete(true);
          onComplete?.();
        } else if (data.type === 'final') {
          // 最终结果
          setContent(data.content || '');
          setIsComplete(true);
          onComplete?.();
        } else if (data.type === 'error') {
          // 错误
          setError(data.error || '未知错误');
          onError?.(new Error(data.error));
          setIsComplete(true);
        }
      } catch (err) {
        console.error('解析 SSE 消息失败:', err);
        setError('解析数据失败');
        onError?.(new Error('解析数据失败'));
        setIsComplete(true);
      }
    };

    eventSourceRef.current.onerror = (event) => {
      console.error('SSE 连接错误:', event);
      setError('连接失败');
      onError?.(new Error('连接失败'));
      setIsComplete(true);
    };

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [url, onComplete, onError]);

  if (error) {
    return (
      <div className={`${className} p-4 bg-red-50 border border-red-200 rounded-lg text-red-600`}>
        {error}
      </div>
    );
  }

  return (
    <div className={className}>
      {content}
      {!isComplete && (
        <span className="inline-block w-2 h-6 bg-blue-600 animate-pulse ml-1 align-middle"></span>
      )}
      {isComplete && (
        <span className="inline-block ml-2 text-green-600">✓ 完成</span>
      )}
    </div>
  );
}

export { StreamingText, MultiStreamingText, SSEStreamingText };