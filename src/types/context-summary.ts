/**
 * 上下文摘要相关类型定义
 */

export type SegmentSummary = {
  segmentId: string;
  storyId: string;
  branchId: string;
  chainIndex: number;
  summaryText: string;
  characterActions: string[];
  keyEvents: string[];
  stateChanges: string[];
  tokenCount: number;
  originalTokenCount: number;
  createdAt: string;
  updatedAt: string;
  aiGenerated?: boolean; // 是否由 AI 生成
};

export type GroupSummary = {
  label: string;
  segmentIds: string[];
  summaryText: string;
  keyEvents: string[];
  stateChanges: string[];
  tokenCount: number;
  createdAt: string;
  aiGenerated?: boolean; // 是否由 AI 生成
};

export type ChapterSummary = {
  label: string;
  groupCount: number;
  summaryText: string;
  keyEvents: string[];
  tokenCount: number;
  createdAt: string;
};
