'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';

interface CommentFormProps {
  onSubmit: (content: string, parentId?: string) => Promise<void>;
  placeholder?: string;
  parentId?: string;
  replyTo?: string;
  onCancel?: () => void;
}

export default function CommentForm({ onSubmit, placeholder = '写下你的评论...', parentId, replyTo, onCancel }: CommentFormProps) {
  const { data: session } = useSession();
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(content.trim(), parentId);
      setContent('');
      onCancel?.();
    } catch {}
    setSubmitting(false);
  };

  if (!session) {
    return (
      <div className="text-sm text-[var(--muted)] py-3 text-center border border-dashed border-[var(--border)] rounded-lg">
        登录后可以发表评论
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      {replyTo && (
        <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
          <span>回复</span>
          <span className="text-[var(--gold)]">@{replyTo}</span>
          {onCancel && (
            <button type="button" onClick={onCancel} className="ml-auto hover:text-[var(--ink)]">
              ✕
            </button>
          )}
        </div>
      )}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        maxLength={2000}
        rows={parentId ? 2 : 3}
        className="w-full px-4 py-3 bg-white border border-[var(--border)] rounded-lg text-sm text-[var(--ink)] placeholder:text-[var(--muted)] resize-none focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300"
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-[var(--muted)]">{content.length}/2000</span>
        <div className="flex gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1.5 text-xs text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
            >
              取消
            </button>
          )}
          <button
            type="submit"
            disabled={!content.trim() || submitting}
            className="px-4 py-1.5 text-xs bg-gradient-to-r from-amber-700 to-red-800 text-white rounded-full hover:from-amber-800 hover:to-red-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {submitting ? '发送中...' : '发表'}
          </button>
        </div>
      </div>
    </form>
  );
}
