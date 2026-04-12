const { storyStore } = require('./src/lib/db');

// 示例历史故事数据
const sampleStories = [
  {
    title: "荆轲刺秦王",
    description: "基于荆轲刺秦王历史事件的故事续写平台",
    author: "历史故事组",
  },
  {
    title: "赤壁之战", 
    description: "基于赤壁之战历史事件的故事续写平台",
    author: "历史故事组",
  },
  {
    title: "玄武门之变",
    description: "基于玄武门之变历史事件的故事续写平台", 
    author: "历史故事组",
  }
];

// 荆轲刺秦王的故事段落数据
const jingkeSegments = [
  {
    title: "序幕",
    content: "公元前227年，燕国太子丹派遣荆轲前往咸阳刺杀秦王嬴政。荆轲带着樊於期的人头和督亢的地图，携带着淬毒的匕首，踏上了前往秦国的旅程。",
    order: 0,
    isBranchPoint: false,
    storyId: "",
    imageUrls: []
  },
  {
    title: "面见秦王",
    content: "荆轲在咸阳宫中见到了秦王嬴政。他恭敬地献上樊於期的人头和督亢地图。当秦王展开地图时，荆轲趁机抽出匕首，向秦王刺去。",
    order: 1,
    isBranchPoint: true,
    storyId: "",
    imageUrls: []
  }
];

// 赤壁之战的故事段落数据  
const chibiSegments = [
  {
    title: "曹操南下",
    content: "东汉末年，曹操统一北方后，率领大军八十万南下，意图一举消灭孙权和刘备，统一天下。",
    order: 0,
    isBranchPoint: false,
    storyId: "",
    imageUrls: []
  },
  {
    title: "联军 formed",
    content: "孙权和刘备决定联合抗曹。诸葛亮出使江东，说服孙权共同对抗曹操。联军在赤壁一带集结。",
    order: 1,
    isBranchPoint: true,
    storyId: "",
    imageUrls: []
  }
];

// 玄武门之变的故事段落数据
const xuanwumenSegments = [
  {
    title: "兄弟矛盾",
    content: "唐朝初年，太子李建成与秦王李世民之间矛盾日益激化。李世民在统一战争中功勋卓著，威胁到太子的地位。",
    order: 0,
    isBranchPoint: false,
    storyId: "",
    imageUrls: []
  },
  {
    title: "玄武门兵变",
    content: "公元626年，李世民在玄武门设下埋伏，杀死了太子李建成和齐王李元吉，逼迫父亲李渊退位。",
    order: 1,
    isBranchPoint: true,
    storyId: "",
    imageUrls: []
  }
];

async function seedData() {
  console.log('开始填充种子数据...');

  // 创建故事
  const createdStories = [];
  for (const storyData of sampleStories) {
    const story = await storyStore.createStory(storyData);
    createdStories.push(story);
    console.log(`创建故事: ${story.title} (${story.id})`);
  }

  // 为每个故事创建段落
  for (let i = 0; i < createdStories.length; i++) {
    const story = createdStories[i];
    let segments = [];

    switch (story.title) {
      case "荆轲刺秦王":
        segments = jingkeSegments.map(s => ({ ...s, storyId: story.id }));
        break;
      case "赤壁之战":
        segments = chibiSegments.map(s => ({ ...s, storyId: story.id }));
        break;
      case "玄武门之变":
        segments = xuanwumenSegments.map(s => ({ ...s, storyId: story.id }));
        break;
    }

    for (const segment of segments) {
      await storyStore.createSegment(segment);
      console.log(`创建段落: ${segment.title} for ${story.title}`);
    }
  }

  console.log('种子数据填充完成！');
}

// 运行种子数据
seedData().catch(console.error);