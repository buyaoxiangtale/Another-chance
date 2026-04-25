'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import CommentForm from './CommentForm';
import CommentItem from './CommentItem';

interface CommentSectionProps {
  storyId: string;
  branchId?: string;
}

export default function CommentSection({ storyId, branchId }: CommentSectionProps) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const fetchComments = useCallback(async () => {
    try {
      const url = branchId
        ? `/api/stories/${storyId}/branch/${branchId}/comments`
        : `/api/stories/${storyId}/comments`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
        setTotal(data.pagination?.total || 0);
      }
    } catch {}
    setLoading(false);
  }, [storyId, branchId]);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  const handleSubmit = async (content: string, parentId?: string) => {
    const url = branchId
      ? `/api/stories/${storyId}/branch/${branchId}/comments`
      : `/api/stories/${storyId}/comments`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, parentId }),
    });
    if (res.ok) {
      await fetchComments();
    }
  };

  const handleDelete = async (_commentId: string) => {
    await fetchComments();
  };

  return (
    <div className="mt-8">
      <div className="flex items-center gap-3 mb-6">
        <h3 className="text-lg font-bold text-[var(--ink)]">评论</h3>
        <span className="text-sm text-[var(--muted)]">{total} 条</span>
        <div className="flex-1 h-px bg-[var(--border)]" />
      </div>

      <CommentForm onSubmit={handleSubmit} placeholder="写下你的评论..." />

      <div className="mt-6 divide-y divide-[var(--border)]">
        {loading && (
          <div className="py-8 text-center text-sm text-[var(--muted)]">加载评论中...</div>
        )}

        {!loading && comments.length === 0 && (
          <div className="py-8 text-center text-sm text-[var(--muted)]">
            暂无评论，来说两句吧 ✍️
          </div>
        )}

        {comments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            storyId={storyId}
            branchId={branchId}
            onLike={() => fetchComments()}
            onReply={handleSubmit}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  );
}
