'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import CommentForm from './CommentForm';

interface CommentItemType {
  id: string;
  content: string;
  createdAt: string;
  user: { id: string; name: string; image?: string };
  _count?: { likes: number };
  liked?: boolean;
  replies?: CommentItemType[];
}

interface CommentItemProps {
  comment: CommentItemType;
  storyId: string;
  branchId?: string;
  depth?: number;
  onLike?: (commentId: string) => void;
  onReply?: (content: string, parentId: string) => Promise<void>;
  onDelete?: (commentId: string) => void;
}

export default function CommentItem({ comment, storyId, branchId, depth = 0, onLike, onReply, onDelete }: CommentItemProps) {
  const { data: session } = useSession();
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [liked, setLiked] = useState(comment.liked || false);
  const [likeCount, setLikeCount] = useState(comment._count?.likes || 0);

  const handleLike = async () => {
    try {
      const res = await fetch(`/api/comments/${comment.id}/like`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setLiked(data.liked);
        setLikeCount(prev => data.liked ? prev + 1 : Math.max(0, prev - 1));
        onLike?.(comment.id);
      }
    } catch {}
  };

  const handleDelete = async () => {
    if (!confirm('确定要删除这条评论吗？')) return;
    try {
      const res = await fetch(`/api/comments/${comment.id}`, { method: 'DELETE' });
      if (res.ok) {
        onDelete?.(comment.id);
      }
    } catch {}
  };

  const handleReply = async (content: string) => {
    if (onReply) {
      await onReply(content, comment.id);
    } else {
      const url = branchId
        ? `/api/stories/${storyId}/branch/${branchId}/comments`
        : `/api/stories/${storyId}/comments`;
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, parentId: comment.id }),
      });
    }
    setShowReplyForm(false);
  };

  const ml = depth * 24;
  const maxDepth = 3;
  const isOwner = session?.user?.id === comment.user.id;

  return (
    <div style={{ marginLeft: depth > 0 ? ml : 0 }} className="group">
      <div className="flex gap-3 py-3">
        {/* Avatar */}
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-amber-200 to-red-300 flex items-center justify-center text-xs font-bold text-white">
          {comment.user.name?.[0] || '?'}
        </div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-[var(--ink)]">{comment.user.name || '匿名'}</span>
            <span className="text-xs text-[var(--muted)]">
              {new Date(comment.createdAt).toLocaleDateString('zh-CN', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
            {isOwner && (
              <button
                onClick={handleDelete}
                className="text-xs text-[var(--muted)] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                title="删除评论"
              >
                删除
              </button>
            )}
          </div>

          {/* Content */}
          <p className="text-sm text-[var(--ink)] leading-relaxed whitespace-pre-wrap break-words">
            {comment.content}
          </p>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={handleLike}
              className={`text-xs transition-colors ${
                liked ? 'text-red-500' : 'text-[var(--muted)] hover:text-red-400'
              }`}
            >
              {liked ? '❤️' : '🤍'} {likeCount}
            </button>
            {depth < maxDepth && session && (
              <button
                onClick={() => setShowReplyForm(!showReplyForm)}
                className="text-xs text-[var(--muted)] hover:text-[var(--gold)] transition-colors"
              >
                回复
              </button>
            )}
          </div>

          {/* Reply Form */}
          {showReplyForm && (
            <div className="mt-3">
              <CommentForm
                onSubmit={handleReply}
                placeholder={`回复 ${comment.user.name}...`}
                parentId={comment.id}
                replyTo={comment.user.name}
                onCancel={() => setShowReplyForm(false)}
              />
            </div>
          )}

          {/* Nested Replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-1 border-l-2 border-amber-100 pl-0">
              {comment.replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  storyId={storyId}
                  branchId={branchId}
                  depth={depth + 1}
                  onLike={onLike}
                  onReply={onReply}
                  onDelete={onDelete}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
