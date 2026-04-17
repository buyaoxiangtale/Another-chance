/**
 * Cluster 5: 反幻觉改进验证测试
 * 
 * 直接测试已有模块的内部逻辑（纯函数），无需外部 AI 调用或复杂 mock
 * 
 * - 5.2 测试正史类故事续写约束
 * - 5.3 测试同人类故事续写约束
 * - 5.4 测试长链续写远端上下文保留
 * - 5.5 测试 AI 摘要质量（规则提取对比）
 * - 5.6 测试降级机制
 */

import { describe, it, expect } from 'vitest';
import { ConsistencyChecker } from '../src/lib/consistency-checker';
import { estimateTokens, extractSummaryFromSegment } from '../src/lib/context-summarizer';

// ── Helper ──
function makeSegment(overrides: Partial<any> = {}): any {
  return {
    id: 'seg_test',
    storyId: 'story_test',
    branchId: 'main',
    title: '测试段落',
    content: '测试内容',
    characterIds: [],
    chainIndex: 0,
    parentSegmentId: null,
    ...overrides,
  };
}

// ──────────────────────────────────────────────
// 5.2 正史类故事续写约束测试
// ──────────────────────────────────────────────
describe('5.2 正史类故事续写', () => {
  const checker = new ConsistencyChecker();

  it('应检测到已死角色的活跃行为', () => {
    const characterStates = [
      {
        characterId: 'meng_tian',
        name: '蒙恬',
        isAlive: false,
        lastKnownLocation: '北方边境',
        relationships: {},
        traits: [],
        stateHistory: [],
      },
    ];

    const newContent = '蒙恬站起身来，对秦始皇说道："陛下，臣有要事禀报。"';
    const issues = checker.checkCharacterConsistency(newContent, characterStates);

    const deadActive = issues.find(i => i.category === 'dead_character_active');
    expect(deadActive).toBeDefined();
    expect(deadActive!.severity).toBe('error');
    expect(deadActive!.description).toContain('蒙恬');
    expect(deadActive!.description).toContain('已死亡');
  });

  it('应检测到跨时代元素（时代混淆）', () => {
    const timeline = { currentEra: '秦', keyDates: [] };
    const newContent = '李斯在长安城中巡视，发现百姓安居乐业。';
    const issues = checker.checkTimelineConsistency(newContent, timeline);

    const anachronism = issues.find(i => i.category === 'era_anachronism');
    expect(anachronism).toBeDefined();
    expect(anachronism!.description).toContain('秦');
  });

  it('应检测到季节矛盾', () => {
    const timeline = { currentEra: '秦', season: '冬', keyDates: [] };
    const newContent = '春风拂面，花园里的荷花盛开，蝉鸣声声入耳。';
    const issues = checker.checkTimelineConsistency(newContent, timeline);

    const seasonIssue = issues.find(i => i.category === 'season_mismatch');
    expect(seasonIssue).toBeDefined();
    expect(seasonIssue!.description).toContain('冬');
  });

  it('应检测到角色性格突变', () => {
    const characterStates = [
      {
        characterId: 'qin_shi_huang',
        name: '秦始皇',
        isAlive: true,
        lastKnownLocation: '咸阳宫',
        relationships: {},
        traits: ['沉稳'],
        stateHistory: [],
      },
    ];

    const newContent = '秦始皇突然变得急躁起来，大声咆哮着，失去了往日的冷静。';
    const issues = checker.checkCharacterConsistency(newContent, characterStates);

    const personality = issues.find(i => i.category === 'personality_shift');
    expect(personality).toBeDefined();
    expect(personality!.description).toContain('秦始皇');
    expect(personality!.description).toContain('沉稳');
  });
});

// ──────────────────────────────────────────────
// 5.3 同人类故事续写约束测试
// ──────────────────────────────────────────────
describe('5.3 同人类故事续写', () => {
  const checker = new ConsistencyChecker();

  it('应检测到同人角色关系矛盾', () => {
    const characterStates = [
      {
        characterId: 'naruto',
        name: '鸣人',
        isAlive: true,
        lastKnownLocation: '木叶村',
        relationships: { '佐助': '友' },
        traits: ['勇猛'],
        stateHistory: [],
      },
    ];

    const newContent = '鸣人将佐助视为死敌，发誓要亲手消灭他。';
    const issues = checker.checkCharacterConsistency(newContent, characterStates);

    const relIssue = issues.find(i => i.category === 'relationship_contradiction');
    expect(relIssue).toBeDefined();
    expect(relIssue!.description).toContain('鸣人');
    expect(relIssue!.description).toContain('佐助');
  });

  it('应检测到世界观变量矛盾', () => {
    const worldVariables = [
      {
        key: '查克拉',
        value: '忍者使用的基本能量',
        description: '查克拉不能凭空获得，必须通过修炼才能使用',
      },
    ];

    const newContent = '鸣人觉得查克拉不能凭空获得是错的，他不需要修炼就能使用查克拉。';
    const issues = checker.checkWorldStateConsistency(newContent, worldVariables);

    expect(issues.length).toBeGreaterThan(0);
  });
});

// ──────────────────────────────────────────────
// 5.4 长链续写远端上下文保留测试
// ──────────────────────────────────────────────
describe('5.4 长链续写远端上下文保留', () => {
  it('estimateTokens 应正确估算中文文本', () => {
    const chineseText = '这是一段中文文本，大约有二十个字。';
    const tokens = estimateTokens(chineseText);
    // 中文约 1.5 字/token
    expect(tokens).toBeGreaterThan(0);
    expect(tokens).toBeLessThanOrEqual(chineseText.length);
  });

  it('extractSummaryFromSegment 应正确提取关键事件', () => {
    const segment = makeSegment({
      id: 'seg_battle',
      content: '蒙恬在北击匈奴的战斗中英勇奋战，最终取得胜利。李斯在朝中推行新政，获得成功。将军发现了一个秘密通道。',
      characterIds: ['蒙恬', '李斯'],
    });

    const summary = extractSummaryFromSegment(segment, [segment]);

    // 应提取到关键事件
    expect(summary.keyEvents.length).toBeGreaterThan(0);
    const allEvents = summary.keyEvents.join(' ');
    expect(allEvents).toMatch(/胜|败|发现|降/);
  });

  it('extractSummaryFromSegment 应正确提取状态变化', () => {
    const segment = makeSegment({
      id: 'seg_timeline',
      content: '秦始皇统一六国后开始治理天下。',
      timeline: { year: -221, season: '春' },
      mood: '庄重',
    });

    const summary = extractSummaryFromSegment(segment, [segment]);

    // 应包含时间线状态变化
    expect(summary.stateChanges.length).toBeGreaterThan(0);
    const allStates = summary.stateChanges.join(' ');
    expect(allStates).toMatch(/春|庄重/);
  });
});

// ──────────────────────────────────────────────
// 5.5 AI 摘要质量测试（规则提取基线）
// ──────────────────────────────────────────────
describe('5.5 AI 摘要质量（规则提取基线）', () => {
  it('规则摘要应提取角色行动', () => {
    const segment = makeSegment({
      id: 'seg_char',
      content: '张三在清晨时分起床，整理好衣冠后前往朝堂。李四已经等候多时，两人商讨了国家大事。王五从边疆归来，带来了重要的军情。',
      characterIds: ['char_a', 'char_b', 'char_c'],
    });

    const summary = extractSummaryFromSegment(segment, [segment]);

    // 规则摘要应包含角色行动
    expect(summary.characterActions.length).toBeGreaterThan(0);
    // 每个角色都应有行动记录
    expect(summary.characterActions.length).toBe(3);
  });

  it('规则摘要应提取死亡事件', () => {
    const segment = makeSegment({
      id: 'seg_death',
      content: '蒙恬在北击匈奴的战斗中死亡。秦始皇痛失良将，悲痛不已。',
      characterIds: ['蒙恬', '秦始皇'],
    });

    const summary = extractSummaryFromSegment(segment, [segment]);

    // 应检测到死亡事件
    const hasDeath = summary.keyEvents.some(e => e.includes('死'));
    expect(hasDeath).toBe(true);
  });

  it('规则摘要应正确记录元数据', () => {
    const segment = makeSegment({
      id: 'seg_meta',
      storyId: 'story_123',
      branchId: 'branch_456',
      chainIndex: 5,
      content: '测试内容',
    });

    const summary = extractSummaryFromSegment(segment, [segment]);

    expect(summary.segmentId).toBe('seg_meta');
    expect(summary.storyId).toBe('story_123');
    expect(summary.branchId).toBe('branch_456');
    // chainIndex comes from findIndex on the chain array
    expect(summary.chainIndex).toBe(0); // segment is at index 0 in the chain
    expect(summary.tokenCount).toBeGreaterThan(0);
    expect(summary.originalTokenCount).toBeGreaterThan(0);
  });
});

// ──────────────────────────────────────────────
// 5.6 降级机制测试
// ──────────────────────────────────────────────
describe('5.6 降级机制', () => {
  it('extractSummaryFromSegment（规则 fallback）应在 AI 不可用时正常工作', () => {
    const segment = makeSegment({
      id: 'seg_fallback',
      content: '测试角色在花园中散步，欣赏着美丽的花朵。他思考着人生的意义，感受着大自然的美好。微风轻拂，花香阵阵。',
      characterIds: ['char_test'],
    });

    // extractSummaryFromSegment 是纯规则方法，不需要 AI
    const summary = extractSummaryFromSegment(segment, [segment]);

    expect(summary.summaryText.length).toBeGreaterThan(0);
    expect(summary.segmentId).toBe('seg_fallback');
    expect(summary.storyId).toBe('story_test');
  });

  it('规则摘要应处理空内容和异常输入', () => {
    const emptySegment = makeSegment({ content: '', characterIds: [] });
    const summary = extractSummaryFromSegment(emptySegment, [emptySegment]);

    expect(summary.summaryText.length).toBeGreaterThan(0);
    expect(summary.keyEvents).toBeDefined();
    expect(summary.characterActions).toBeDefined();
  });

  it('规则摘要应处理超长内容', () => {
    const longContent = '这是一个很长的段落。'.repeat(100);
    const segment = makeSegment({ content: longContent });
    const summary = extractSummaryFromSegment(segment, [segment]);

    expect(summary.summaryText.length).toBeGreaterThan(0);
    // 摘要文本应短于原文
    expect(summary.summaryText.length).toBeLessThan(longContent.length);
  });
});

// ──────────────────────────────────────────────
// 综合测试：ConsistencyChecker 综合检测
// ──────────────────────────────────────────────
describe('ConsistencyChecker 综合检测', () => {
  const checker = new ConsistencyChecker();

  it('应对正史类内容生成完整的约束检查结果', () => {
    const characterStates = [
      {
        characterId: 'qin',
        name: '秦始皇',
        isAlive: true,
        lastKnownLocation: '咸阳宫',
        relationships: { '李斯': '臣' },
        traits: ['沉稳', '果断'],
        stateHistory: [],
      },
      {
        characterId: 'meng',
        name: '蒙恬',
        isAlive: false,
        lastKnownLocation: '北方边境',
        relationships: {},
        traits: ['勇猛'],
        stateHistory: [],
      },
    ];

    const timeline = { currentEra: '秦', season: '冬', keyDates: [] };
    const worldVariables = [
      { key: '国都', value: '咸阳', description: '秦朝国都为咸阳' },
    ];

    // 包含多种矛盾的内容
    const problematicContent = '蒙恬突然站了起来，对秦始皇说道："陛下，长安城的春天真美啊，花开满地。"\n秦始皇变得急躁起来，对李斯说："你是我最好的朋友。"';

    const charIssues = checker.checkCharacterConsistency(problematicContent, characterStates);
    const timelineIssues = checker.checkTimelineConsistency(problematicContent, timeline);
    const worldIssues = checker.checkWorldStateConsistency(problematicContent, worldVariables);

    // 应检测到至少 3 个问题
    const totalIssues = charIssues.length + timelineIssues.length + worldIssues.length;
    expect(totalIssues).toBeGreaterThanOrEqual(3);

    // 验证具体问题类型
    expect(charIssues.some(i => i.category === 'dead_character_active')).toBe(true);
    expect(timelineIssues.some(i => i.category === 'era_anachronism' || i.category === 'season_mismatch')).toBe(true);
  });

  it('应对无问题的内容返回空问题列表', () => {
    const characterStates = [
      {
        characterId: 'qin',
        name: '秦始皇',
        isAlive: true,
        lastKnownLocation: '咸阳宫',
        relationships: {},
        traits: [],
        stateHistory: [],
      },
    ];

    const cleanContent = '秦始皇坐在咸阳宫中，静静地看着窗外的雪景。';
    const issues = checker.checkCharacterConsistency(cleanContent, characterStates);

    expect(issues.length).toBe(0);
  });
});
