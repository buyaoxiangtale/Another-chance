'use client';

interface ForkBadgeProps {
  ownerName?: string;
  model?: string;
  createdAt?: string;
  sourceSegmentTitle?: string;
  sourceSegmentPreview?: string;
  compact?: boolean;
}

export default function ForkBadge({
  ownerName,
  model,
  createdAt,
  sourceSegmentTitle,
  sourceSegmentPreview,
  compact = false,
}: ForkBadgeProps) {
  if (compact) {
    return (
      <div className="inline-flex items-center gap-1.5 text-xs text-[var(--muted)]">
        <span>🌿</span>
        <span>{ownerName || '匿名'}</span>
        {model && (
          <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px]">
            {model}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="p-3 bg-gradient-to-r from-amber-50/50 to-red-50/50 border border-amber-200/50 rounded-lg space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm">🌿</span>
          <span className="text-sm font-medium text-[var(--ink)]">
            {ownerName || '匿名'} 分叉
          </span>
        </div>
        {createdAt && (
          <span className="text-xs text-[var(--muted)]">
            {new Date(createdAt).toLocaleDateString('zh-CN')}
          </span>
        )}
      </div>

      {model && (
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[var(--muted)]">模型</span>
          <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-xs border border-blue-200">
            {model}
          </span>
        </div>
      )}

      {sourceSegmentTitle && (
        <div className="text-xs text-[var(--muted)]">
          <span className="font-medium">来源段落：</span>{sourceSegmentTitle}
        </div>
      )}

      {sourceSegmentPreview && (
        <div className="text-xs text-[var(--muted)] line-clamp-2 italic">
          "{sourceSegmentPreview}..."
        </div>
      )}
    </div>
  );
}
