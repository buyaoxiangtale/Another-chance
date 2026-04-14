/**
 * C7.2 迁移脚本 — 幂等，可重复运行
 * - 为现有故事添加 era/genre 字段
 * - 创建默认角色（如果不存在）
 */
const { storiesStore, charactersStore } = require('../src/lib/simple-db');

const ERA_GENRE = {
  '荆轲刺秦王': { era: '战国末期', genre: '刺客列传' },
  '赤壁之战': { era: '东汉末年', genre: '战争史诗' },
  '玄武门之变': { era: '唐朝初年', genre: '宫廷权谋' },
};

const DEFAULT_CHARACTERS = {
  '荆轲刺秦王': [
    { name: '荆轲', role: 'protagonist', traits: ['勇敢', '侠义', '深沉', '善辩'], speechPatterns: '壮士一去兮不复还，风萧萧兮易水寒。天下之大，知己难求。', coreMotivation: '报太子丹知遇之恩，以死报知己，刺秦救燕' },
    { name: '秦王嬴政', role: 'antagonist', traits: ['雄才大略', '多疑', '威严', '冷酷'], speechPatterns: '朕即天下，六国必灭。凡逆朕者，虽远必诛。', coreMotivation: '统一六国，建立万世基业，成就始皇帝之业' },
    { name: '燕太子丹', role: 'supporting', traits: ['忧国忧民', '重情义', '急躁', '优柔'], speechPatterns: '国仇家恨，丹岂能忘？愿以千金求天下壮士。', coreMotivation: '报质秦之辱，保全燕国，对抗强秦' },
  ],
  '赤壁之战': [
    { name: '曹操', role: 'antagonist', traits: ['雄才', '奸诈', '自负', '豪迈'], speechPatterns: '宁教我负天下人，休教天下人负我。', coreMotivation: '统一天下，成就霸业' },
    { name: '刘备', role: 'protagonist', traits: ['仁德', '坚韧', '隐忍', '善用人'], speechPatterns: '备虽不才，愿与诸公共图大业。', coreMotivation: '匡扶汉室，救苍生于水火' },
    { name: '诸葛亮', role: 'supporting', traits: ['睿智', '忠诚', '谨慎', '雄辩'], speechPatterns: '亮以为……天下大势，合久必分，分久必合。', coreMotivation: '鞠躬尽瘁，死而后已，辅佐刘备匡扶汉室' },
  ],
  '玄武门之变': [
    { name: '李世民', role: 'protagonist', traits: ['英武', '果断', '知人善任', '野心勃勃'], speechPatterns: '天下者，非一人之天下，乃有德者之天下。', coreMotivation: '保全身家性命，开创贞观之治' },
    { name: '李建成', role: 'antagonist', traits: ['稳重', '猜忌', '城府深', '优柔'], speechPatterns: '吾乃太子，储君之位天命所归。', coreMotivation: '巩固太子地位，铲除世民威胁' },
    { name: '李元吉', role: 'antagonist', traits: ['暴躁', '鲁莽', '善妒', '勇猛'], speechPatterns: '二哥功高盖主，当除之！', coreMotivation: '依附太子，借机除掉世民，自己上位' },
  ],
};

async function migrate() {
  console.log('🔄 开始 ChronosMirror 数据迁移...');

  // 1. 为现有故事添加 era/genre
  const stories = await storiesStore.load();
  let updated = 0;
  for (const story of stories) {
    const mapping = ERA_GENRE[story.title];
    if (mapping) {
      if (!story.era) story.era = mapping.era;
      if (!story.genre) story.genre = mapping.genre;
      updated++;
    }
  }
  if (updated) {
    await storiesStore.save(stories);
    console.log(`✅ 更新 ${updated} 个故事的 era/genre 字段`);
  } else {
    console.log('⏭️ 所有故事已有 era/genre 字段');
  }

  // 2. 创建默认角色（幂等：按 storyId + name 去重）
  const characters = await charactersStore.load();
  const existingKeys = new Set(characters.map(c => `${c.id}`));

  for (const story of stories) {
    const defaults = DEFAULT_CHARACTERS[story.title];
    if (!defaults) continue;

    if (!story.characterIds) story.characterIds = [];

    for (const def of defaults) {
      // 检查是否已存在同名角色
      const exists = characters.some(c => c.name === def.name && (story.characterIds || []).includes(c.id));
      if (exists) continue;

      const charId = 'char_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      const newChar = {
        id: charId,
        name: def.name,
        era: story.era || '',
        role: def.role,
        traits: def.traits,
        speechPatterns: def.speechPatterns,
        relationships: [],
        stateHistory: [],
        coreMotivation: def.coreMotivation,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      characters.push(newChar);
      story.characterIds.push(charId);
      console.log(`  ✅ 创建角色: ${def.name} (${story.title})`);
    }
  }

  await charactersStore.save(characters);
  await storiesStore.save(stories);
  console.log('🎉 迁移完成！');
}

migrate().catch(console.error);
