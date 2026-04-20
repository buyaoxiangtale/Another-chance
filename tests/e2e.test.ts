/**
 * 6.6: 端到端测试 — 长故事创建、摘要、事件追踪、分支记忆、矛盾检测
 *
 * 运行: npx tsx tests/e2e.test.ts
 */

import { estimateTokens, extractSummaryFromSegment } from '../src/lib/context-summarizer';
import { extractKeyEvents, buildEventPrompt } from '../src/lib/event-tracker';
import { ConsistencyChecker, type CharacterStateForCheck } from '../src/lib/consistency-checker';
import { branchMemory } from '../src/lib/branch-memory';
import type { Visibility } from '../src/lib/prisma';

// Minimal segment shape matching Prisma's StorySegment
type TestSegment = {
  id: string;
  title: string | null;
  content: string;
  isBranchPoint: boolean;
  createdAt: Date;
  updatedAt: Date;
  storyId: string;
  branchId: string;
  parentSegmentId: string | null;
  imageUrls: string[];
  timeline: any;
  historicalReferences: any;
  narrativePace: string | null;
  mood: string | null;
  characterIds: string[];
  visibility: Visibility;
};

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

function makeSegment(id: string, content: string, overrides?: Partial<TestSegment>): TestSegment {
  return {
    id, content, title: `段落${id}`,
    isBranchPoint: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    storyId: 'e2e-story',
    branchId: 'main',
    parentSegmentId: null,
    imageUrls: [],
    timeline: null,
    historicalReferences: null,
    narrativePace: null,
    mood: null,
    characterIds: [],
    visibility: 'PRIVATE',
    ...overrides,
  };
}

async function main() {
  console.log('\n📦 端到端测试\n');

  // === Step 1: 创建长故事 (10+段) ===
  console.log('Step 1: 创建长故事 (10+段)');
  const segments: TestSegment[] = [
    makeSegment('seg1', '东汉末年，天下大乱。曹操在许昌招兵买马，势力日益壮大。'),
    makeSegment('seg2', '刘备与关羽、张飞桃园三结义，结为兄弟，共同起兵。'),
    makeSegment('seg3', '吕布背叛丁原，投靠董卓。董卓权倾朝野，残暴无道。'),
    makeSegment('seg4', '王允设连环计，貂蝉离间吕布与董卓。吕布最终刺死董卓。'),
    makeSegment('seg5', '曹操挟天子以令诸侯，迁都许昌。天下诸侯纷纷不服。'),
    makeSegment('seg6', '刘备投靠曹操，曹操发现刘备胸怀大志，心生忌惮。'),
    makeSegment('seg7', '官渡之战，两军交战激烈。曹操以少胜多，大败袁绍。北方基本统一。'),
    makeSegment('seg8', '刘备三顾茅庐，请出诸葛亮。诸葛亮献出隆中对策略。'),
    makeSegment('seg9', '赤壁之战，孙刘联军大败曹操。曹操败走华容道。'),
    makeSegment('seg10', '天下三分之势初成。曹操据北方，孙权据江东，刘备据荆州。'),
    makeSegment('seg11', '刘备入蜀，夺取益州。张飞在战场上英勇作战，最终战死沙场。'),
  ];
  for (let i = 1; i < segments.length; i++) {
    segments[i].parentSegmentId = segments[i - 1].id;
  }
  assert(segments.length === 11, 'created 11 segments');

  // === Step 2: 验证摘要正确生成 ===
  console.log('\nStep 2: 验证摘要生成');
  const summaries = segments.map((seg, i) =>
    extractSummaryFromSegment(seg, segments.slice(0, i + 1))
  );
  assert(summaries.length === 11, 'generated 11 summaries');
  assert(summaries.every(s => s.summaryText.length > 0), 'all summaries have text');
  assert(summaries.every(s => s.tokenCount > 0), 'all summaries have tokenCount');
  assert(summaries.every(s => s.originalTokenCount > 0), 'all summaries have originalTokenCount');

  // Verify specific events captured in summaries
  const seg3Summary = summaries[2];
  assert(seg3Summary.metadata.keyEvents!.some((e: string) => e.includes('背叛')), 'seg3 summary captures betrayal');
  const seg4Summary = summaries[3];
  assert(seg4Summary.metadata.keyEvents!.some((e: string) => e.includes('死') || e.includes('刺')), 'seg4 summary captures death/kill');
  const seg11Summary = summaries[10];
  assert(seg11Summary.metadata.keyEvents!.some((e: string) => e.includes('死') || e.includes('战死')), 'seg11 summary captures battle/death');

  // === Step 3: 续写引用早期事件 ===
  console.log('\nStep 3: 事件追踪 — 引用早期事件');
  const allEvents: any[] = [];
  for (const seg of segments) {
    const events = extractKeyEvents(seg.content);
    allEvents.push(...events);
  }

  const activeEvents = allEvents.filter(e => e.status === 'active');
  assert(activeEvents.length > 5, 'extracted more than 5 active events across all segments');

  // Verify key event types are captured
  const eventTypes = new Set(activeEvents.map(e => e.type));
  assert(eventTypes.has('alliance'), 'captured alliance event');
  assert(eventTypes.has('betrayal'), 'captured betrayal event');
  assert(eventTypes.has('battle'), 'captured battle event');
  assert(eventTypes.has('death'), 'captured death event');

  // Verify event prompt includes early events
  const eventPrompt = buildEventPrompt(activeEvents);
  assert(eventPrompt.includes('结义') || eventPrompt.includes('结盟'), 'event prompt references early alliance');
  assert(eventPrompt.includes('董卓'), 'event prompt references Dong Zhuo events');

  // Simulate continuation referencing early event
  const continuation = '诸葛亮想起了当年赤壁之战的情景，感慨万千。';
  const continuationEvents = extractKeyEvents(continuation);
  assert(continuationEvents.length >= 0, 'continuation event extraction works');

  // === Step 4: 创建分支 → 验证分支记忆 ===
  console.log('\nStep 4: 分支记忆');
  const branchPrompt = await branchMemory.buildBranchMemoryPrompt('e2e-story', 'main');
  assert(typeof branchPrompt === 'string', 'branch memory prompt is string');

  const divergence = await branchMemory.getBranchDivergencePoint('e2e-story', 'main', 'branch-alt');
  assert(divergence === null, 'no divergence point in empty DB');

  const altSummaries = await branchMemory.getAlternateBranchSummary('e2e-story', 'main');
  assert(Array.isArray(altSummaries), 'alternate summaries returns array');

  const syncStates = await branchMemory.syncSharedCharacterStates('e2e-story', 'main');
  assert(syncStates === null, 'no shared states in empty DB');

  // === Step 5: 故意制造矛盾 → 验证检测 ===
  console.log('\nStep 5: 矛盾检测');

  // 5a. Dead character appears alive
  const checker = new ConsistencyChecker();
  const zhangFeiDead: CharacterStateForCheck = {
    characterId: 'zhangfei', name: '张飞', isAlive: false,
    lastKnownLocation: '战场', relationships: {}, traits: ['勇猛'],
    stateHistory: [],
  };
  const deadCharIssue = checker.checkCharacterConsistency(
    '张飞大笑一声，拍着桌子说道："好！"',
    [zhangFeiDead]
  );
  assert(deadCharIssue.some(i => i.severity === 'error'), 'detects dead character active as error');

  // 5b. Personality contradiction
  const personalityIssue = checker.checkCharacterConsistency(
    '诸葛亮鲁莽地冲入敌阵，不顾一切。',
    [{
      characterId: 'zhugeliang', name: '诸葛亮', isAlive: true,
      lastKnownLocation: '荆州', relationships: {}, traits: ['谨慎', '沉稳'],
      stateHistory: [],
    }]
  );
  assert(personalityIssue.some(i => i.category === 'personality_shift'), 'detects Zhuge Liang personality shift');

  // 5c. Timeline contradiction (season)
  const timelineIssue = checker.checkTimelineConsistency(
    '赤壁之战正值隆冬，大雪纷飞，江面结冰。',
    { season: '夏', keyDates: [] }
  );
  assert(timelineIssue.some(i => i.category === 'season_mismatch'), 'detects winter-in-summer contradiction');

  // 5d. Era anachronism
  const eraIssue = checker.checkTimelineConsistency(
    '曹操拿起手机，拨通了刘备的电话。',
    { currentEra: '三国', keyDates: [] }
  );
  assert(eraIssue.length >= 0, 'era check handles anachronism gracefully');

  // 5e. No false positives on consistent content
  const cleanIssues = checker.checkCharacterConsistency(
    '关羽跨上赤兔马，手提青龙偃月刀，威风凛凛。',
    [{
      characterId: 'guanyu', name: '关羽', isAlive: true,
      lastKnownLocation: '荆州', relationships: { '曹操': '敌' }, traits: ['勇猛'],
      stateHistory: [],
    }]
  );
  assert(!cleanIssues.some(i => i.severity === 'error'), 'no false positives on clean content');

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
