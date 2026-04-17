/**
 * 6.4: 测试 branch-memory.ts — 分支记忆管理
 *
 * 运行: npx tsx tests/branch-memory.test.ts
 */

import {
  findDivergencePoint,
  getAlternateBranchSummaries,
  syncSharedCharacterStates,
  buildBranchMemoryPrompt,
  branchMemory,
} from '../src/lib/branch-memory';

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

async function main() {
  console.log('\n📦 branch-memory tests\n');

  // 1. Module exports
  console.log('module exports:');
  assert(typeof findDivergencePoint === 'function', 'findDivergencePoint exported');
  assert(typeof getAlternateBranchSummaries === 'function', 'getAlternateBranchSummaries exported');
  assert(typeof syncSharedCharacterStates === 'function', 'syncSharedCharacterStates exported');
  assert(typeof buildBranchMemoryPrompt === 'function', 'buildBranchMemoryPrompt exported');
  assert(typeof branchMemory === 'object', 'branchMemory singleton exported');

  // 2. BranchMemory instance methods exist
  console.log('\nBranchMemory instance:');
  const bm = branchMemory;
  assert(typeof bm.getBranchDivergencePoint === 'function', 'has getBranchDivergencePoint');
  assert(typeof bm.getAlternateBranchSummary === 'function', 'has getAlternateBranchSummary');
  assert(typeof bm.syncSharedCharacterStates === 'function', 'has syncSharedCharacterStates');
  assert(typeof bm.buildBranchMemoryPrompt === 'function', 'has buildBranchMemoryPrompt');

  // 3. findDivergencePoint — no data
  console.log('\nfindDivergencePoint (empty db):');
  const divResult = await findDivergencePoint('nonexistent', 'b1', 'b2');
  assert(divResult === null, 'returns null when no data exists');

  // 4. getAlternateBranchSummaries — no data
  console.log('\ngetAlternateBranchSummaries (empty db):');
  const altResult = await getAlternateBranchSummaries('nonexistent', 'main');
  assert(Array.isArray(altResult), 'returns an array');
  assert(altResult.length === 0, 'empty array when no data');

  // 5. syncSharedCharacterStates — no data
  console.log('\nsyncSharedCharacterStates (empty db):');
  const syncResult = await syncSharedCharacterStates('nonexistent', 'main');
  assert(syncResult === null, 'returns null when no data');

  // 6. buildBranchMemoryPrompt — no data
  console.log('\nbuildBranchMemoryPrompt (single branch):');
  const promptResult = await buildBranchMemoryPrompt('nonexistent', 'main');
  assert(typeof promptResult === 'string', 'returns a string');
  assert(promptResult === '', 'empty prompt for single/no branches');

  // 7. BranchMemory class delegation
  console.log('\nBranchMemory class delegation:');
  const classDivResult = await bm.getBranchDivergencePoint('nonexistent', 'b1', 'b2');
  assert(classDivResult === null, 'class method delegates to findDivergencePoint');

  const classAltResult = await bm.getAlternateBranchSummary('nonexistent', 'main');
  assert(Array.isArray(classAltResult) && classAltResult.length === 0, 'class method delegates to getAlternateBranchSummaries');

  const classSyncResult = await bm.syncSharedCharacterStates('nonexistent', 'main');
  assert(classSyncResult === null, 'class method delegates to syncSharedCharacterStates');

  const classPromptResult = await bm.buildBranchMemoryPrompt('nonexistent', 'main');
  assert(typeof classPromptResult === 'string', 'class method delegates to buildBranchMemoryPrompt');

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
