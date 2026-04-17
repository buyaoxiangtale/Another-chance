/**
 * 6.1: 测试 context-summarizer.ts — 摘要生成和分层上下文
 *
 * 运行: npx tsx tests/context-summarizer.test.ts
 */

import { estimateTokens, extractSummaryFromSegment, mergeSummaries } from '../src/lib/context-summarizer';
import type { StorySegment } from '../src/lib/simple-db';
import type { SegmentSummary } from '../src/types/context-summary';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${message}`);
  } else {
    failed++;
    console.error(`  ❌ ${message}`);
  }
}

function makeSegment(overrides: Partial<StorySegment> & { id: string }): StorySegment {
  return {
    title: '测试段落',
    content: '',
    isBranchPoint: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    storyId: 'story1',
    branchId: 'main',
    parentSegmentId: undefined,
    imageUrls: [],
    ...overrides,
  };
}

// --- Tests ---

console.log('\n📦 context-summarizer tests\n');

// 1. estimateTokens
console.log('estimateTokens:');
assert(typeof estimateTokens('') === 'number', 'returns a number');
assert(estimateTokens('') === 0, 'empty string → 0 tokens');
assert(estimateTokens('你好世界') > 0, 'Chinese text → positive tokens');
assert(estimateTokens('Hello World') > 0, 'English text → positive tokens');
assert(estimateTokens('你好') === 2, '2 Chinese chars → ~2 tokens (1.5 per char, ceil)');

// 2. extractSummaryFromSegment — basic
console.log('\nextractSummaryFromSegment (basic):');
const seg1 = makeSegment({ id: 's1', content: '张三在战场上英勇作战，最终战死沙场。' });
const chain1: StorySegment[] = [seg1];
const summary1 = extractSummaryFromSegment(seg1, chain1);
assert(summary1.segmentId === 's1', 'segmentId matches');
assert(summary1.summaryText.includes('张三'), 'summary contains character name');
assert(summary1.keyEvents.length > 0, 'extracts key events (death)');
assert(summary1.tokenCount > 0, 'has positive tokenCount');
assert(summary1.originalTokenCount > 0, 'has positive originalTokenCount');

// 3. extractSummaryFromSegment — with timeline/mood
console.log('\nextractSummaryFromSegment (with timeline/mood):');
const seg2 = makeSegment({
  id: 's2',
  content: '春天来了，万物复苏。李四发现了一个古老的秘密。',
  timeline: { year: 202, season: '春' },
  mood: '宁静',
  narrativePace: 'detailed',
});
const summary2 = extractSummaryFromSegment(seg2, chain1);
assert(summary2.stateChanges.some(s => s.includes('春')), 'stateChanges includes season');
assert(summary2.stateChanges.some(s => s.includes('宁静')), 'stateChanges includes mood');
assert(summary2.keyEvents.some(e => e.includes('发现')), 'extracts discovery event');

// 4. extractSummaryFromSegment — no events
console.log('\nextractSummaryFromSegment (no events):');
const seg3 = makeSegment({ id: 's3', content: '这是一段平淡的描述，没有任何事件发生。' });
const summary3 = extractSummaryFromSegment(seg3, [seg1, seg2, seg3]);
assert(summary3.keyEvents.length === 0, 'no events in plain text');
assert(summary3.summaryText.length > 0, 'still has summaryText');

// 5. mergeSummaries
console.log('\nmergeSummaries:');
const summaries = [summary1, summary2, summary3];
const group = mergeSummaries(summaries, '测试组');
assert(group.label === '测试组', 'label matches');
assert(group.segmentIds.length === 3, 'contains all segment IDs');
assert(group.summaryText.includes('测试组'), 'summaryText starts with label');
assert(group.tokenCount > 0, 'has positive tokenCount');
assert(group.keyEvents.length > 0, 'aggregates keyEvents from children');

// 6. mergeSummaries — empty
console.log('\nmergeSummaries (empty):');
const emptyGroup = mergeSummaries([], '空组');
assert(emptyGroup.segmentIds.length === 0, 'empty segmentIds');
assert(emptyGroup.keyEvents.length === 0, 'empty keyEvents');

// --- Summary ---
console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
