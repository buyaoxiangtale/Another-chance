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
};

export type GroupSummary = {
  label: string;
  segmentIds: string[];
  summaryText: string;
  keyEvents: string[];
  stateChanges: string[];
  tokenCount: number;
  createdAt: string;
};

export type ChapterSummary = {
  label: string;
  groupCount: number;
  summaryText: string;
  keyEvents: string[];
  tokenCount: number;
  createdAt: string;
};
