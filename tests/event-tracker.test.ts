/**
 * 6.2: 测试 event-tracker.ts — 事件提取和追踪
 *
 * 运行: npx tsx tests/event-tracker.test.ts
 */

import { extractKeyEvents, buildEventPrompt } from '../src/lib/event-tracker';
import type { KeyEvent } from '../src/types/event-tracker';

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

console.log('\n📦 event-tracker tests\n');

// 1. Extract death events
console.log('extractKeyEvents (death):');
const deathContent = '张飞在战场上英勇作战，最终阵亡。关羽得知后悲痛万分。';
const deathEvents = extractKeyEvents(deathContent, ['char1', 'char2']);
assert(deathEvents.some(e => e.type === 'death'), 'detects death event');
assert(deathEvents.some(e => e.description.includes('阵亡')), 'death description contains keyword');
assert(deathEvents.some(e => e.type === 'emotional'), 'detects emotional event');

// 2. Extract battle events
console.log('\nextractKeyEvents (battle):');
const battleContent = '两军交战，刘备率军攻城。赵云在战场上厮杀。';
const battleEvents = extractKeyEvents(battleContent);
assert(battleEvents.some(e => e.type === 'battle'), 'detects battle event');

// 3. Extract alliance events
console.log('\nextractKeyEvents (alliance):');
const allianceContent = '曹操与孙权结盟，联手对抗刘备。';
const allianceEvents = extractKeyEvents(allianceContent);
assert(allianceEvents.some(e => e.type === 'alliance'), 'detects alliance event');

// 4. Extract betrayal events
console.log('\nextractKeyEvents (betrayal):');
const betrayalContent = '魏延背叛蜀汉，投靠曹操。';
const betrayalEvents = extractKeyEvents(betrayalContent);
assert(betrayalEvents.some(e => e.type === 'betrayal'), 'detects betrayal event');

// 5. Extract power change events
console.log('\nextractKeyEvents (power_change):');
const powerContent = '赵匡胤黄袍加身，登基称帝。';
const powerEvents = extractKeyEvents(powerContent);
assert(powerEvents.some(e => e.type === 'power_change'), 'detects power_change event');
assert(powerEvents.some(e => e.importance === 'critical'), 'power_change is critical importance');

// 6. Extract discovery events
console.log('\nextractKeyEvents (discovery):');
const discoveryContent = '诸葛亮偶然发现了一个秘密通道。';
const discoveryEvents = extractKeyEvents(discoveryContent);
assert(discoveryEvents.some(e => e.type === 'discovery'), 'detects discovery event');

// 7. Extract relationship events
console.log('\nextractKeyEvents (relationship):');
const relationContent = '王子与公主成亲，举国欢庆。';
const relationEvents = extractKeyEvents(relationContent);
assert(relationEvents.some(e => e.type === 'relationship'), 'detects relationship event');

// 8. No events in plain text
console.log('\nextractKeyEvents (no events):');
const plainContent = '今天天气不错，小猫在晒太阳。';
const plainEvents = extractKeyEvents(plainContent);
assert(plainEvents.length === 0, 'no events in plain text');

// 9. Event importance levels
console.log('\nevent importance:');
assert(deathEvents.some(e => e.importance === 'critical'), 'death is critical');
assert(battleEvents.some(e => e.importance === 'major'), 'battle is major');

// 10. Character IDs are propagated
console.log('\ncharacter ID propagation:');
assert(deathEvents.every(e => e.involvedCharacterIds.length === 2), 'character IDs included');

// 11. buildEventPrompt — with events
console.log('\nbuildEventPrompt:');
const activeEvents: KeyEvent[] = [
  {
    eventId: 'e1', storyId: 's1', branchId: 'main', segmentId: 'seg1',
    type: 'death', description: '张飞阵亡', involvedCharacterIds: [],
    status: 'active', importance: 'critical', createdAt: '2024-01-01',
  },
  {
    eventId: 'e2', storyId: 's1', branchId: 'main', segmentId: 'seg2',
    type: 'alliance', description: '刘备与孙权结盟', involvedCharacterIds: [],
    status: 'active', importance: 'major', createdAt: '2024-01-02',
  },
];
const prompt1 = buildEventPrompt(activeEvents);
assert(prompt1.includes('活跃事件线'), 'prompt contains header');
assert(prompt1.includes('张飞阵亡'), 'prompt contains event description');
assert(prompt1.includes('关键'), 'prompt contains critical importance marker');

// 12. buildEventPrompt — empty
console.log('\nbuildEventPrompt (empty):');
const prompt2 = buildEventPrompt([]);
assert(prompt2 === '', 'empty events → empty prompt');

// 13. buildEventPrompt — with resolved events
console.log('\nbuildEventPrompt (with resolved):');
const resolved: KeyEvent[] = [
  {
    eventId: 'e3', storyId: 's1', branchId: 'main', segmentId: 'seg3',
    type: 'battle', description: '赤壁之战', involvedCharacterIds: [],
    status: 'resolved', importance: 'major', createdAt: '2024-01-01',
    resolvedAt: '2024-01-05', resolvedBySegmentId: 'seg5',
  },
];
const prompt3 = buildEventPrompt(activeEvents, resolved);
assert(prompt3.includes('已解决'), 'prompt contains resolved section');
assert(prompt3.includes('赤壁之战'), 'prompt includes resolved event');

console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
