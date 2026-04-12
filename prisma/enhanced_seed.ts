const { storyStore } = require('../src/lib/db');

// 增强的示例历史故事数据
const sampleStories = [
  {
    id: "jingke-1775987358452",
    title: "荆轲刺秦王",
    description: "基于荆轲刺秦王历史事件的故事续写平台，探索不同历史转折点",
    author: "历史故事组",
  },
  {
    id: "chibi-1775987358454", 
    title: "赤壁之战",
    description: "基于赤壁之战历史事件的故事续写平台，重新演绎三国历史",
    author: "历史故事组",
  },
  {
    id: "xuanwumen-1775987358455",
    title: "玄武门之变",
    description: "基于玄武门之变历史事件的故事续写平台，改变唐朝历史走向", 
    author: "历史故事组",
  }
];

// 荆轲刺秦王的完整故事段落数据（包含多个分支点）
const jingkeSegments = [
  // 第一段：背景和准备
  {
    title: "燕国密谋",
    content: "公元前227年，燕国太子丹眼见秦国日益强大，决定采取极端手段。太子丹找到卫国人荆轲，许以重金和高官，希望他能刺杀秦王嬴政。荆轲是一位勇猛的剑客，在赵国和燕国都颇有声名。",
    order: 0,
    isBranchPoint: false,
    storyId: "jingke-1775987358452",
    imageUrls: []
  },
  // 第二段：准备前往秦国
  {
    title: "燕赵告别",
    content: "荆轲告别燕王和太子丹，带着樊於期的人头和督亢地图，还有淬毒的匕首，踏上了前往咸阳的旅程。在赵国短暂停留时，荆轲遇到了一位神秘的老人，老人送给他一本《孙子兵法》，并叮嘱他'智取不力争取'。",
    order: 1,
    isBranchPoint: true,
    storyId: "jingke-1775987358452",
    imageUrls: []
  },
  // 第三段：不同的行动方案（分支点）
  {
    title: "谋士建议",
    content: "荆轲到达咸阳附近，遇到了一位当地的谋士。谋士分析了秦王嬴政的性格和日常习惯，提出了三种刺杀方案：一是在朝堂上趁秦王不备行刺；二是在秦王出巡时埋伏；三是通过秦王的宠臣接近他。",
    order: 2,
    isBranchPoint: true,
    storyId: "jingke-1775987358452",
    imageUrls: []
  },
  // 第四段：朝堂刺杀路线
  {
    title: "朝堂风云",
    content: "荆轲选择在朝堂上刺杀秦王。他利用献地图的机会接近秦王，但就在他抽出匕首的瞬间，秦王的贴身侍卫反应极快，用长刀挡住了荆轲的攻击。场面大乱，荆轲寡不敌众，最终被当场制服。",
    order: 3,
    isBranchPoint: false,
    storyId: "jingke-1775987358452",
    imageUrls: []
  },
  // 第五段：出巡埋伏路线
  {
    title: "狩猎埋伏",
    content: "荆轲选择了在秦王出巡时埋伏的方案。他在秦王经常狩猎的林中设下陷阱，准备了毒箭和陷阱。当秦王的马队进入林中时，荆轲的箭法精准，一箭射中了秦王的肩膀，但致命的毒箭被秦王的盔甲挡住了一部分。",
    order: 3,
    isBranchPoint: false,
    storyId: "jingke-1775987358452",
    imageUrls: []
  },
  // 第六段：宠臣接近路线
  {
    title: "美人计",
    content: "荆轲通过重金收买了秦王的宠臣赵高，以献美女为名接近秦王。在宫中献艺时，荆轲假装表演剑舞，趁机接近秦王。然而赵高出卖了荆轲，秦王早就得到了密报。荆轲虽然勇猛，但在重围之中还是失败了。",
    order: 3,
    isBranchPoint: false,
    storyId: "jingke-1775987358452",
    imageUrls: []
  },
  // 第七段：结局分支
  {
    title: "历史走向",
    content: "无论荆轲采取何种方式，刺杀秦王的计划都失败了。秦王更加警惕，加快了统一六国的步伐。然而荆轲的壮举激励了后来的反抗者，为秦朝的灭亡埋下了伏笔。",
    order: 4,
    isBranchPoint: false,
    storyId: "jingke-1775987358452",
    imageUrls: []
  }
];

// 赤壁之战的完整故事段落数据（包含多个分支点）
const chibiSegments = [
  // 第一段：曹操南下
  {
    title: "曹军压境",
    content: "东汉末年，曹操经过多年的征战，已经统一了北方。他率领大军八十万，号称百万，南下攻打荆州。荆州牧刘表病死，其子刘琮投降。曹操势如破竹，继续向江东进发。",
    order: 0,
    isBranchPoint: false,
    storyId: "chibi-1775987358454",
    imageUrls: []
  },
  // 第二段：孙刘联盟
  {
    title: "隆中对策",
    content: "面对曹操大军压境，刘备退守夏口，孙权在柴桑忧虑。诸葛亮主动请缨，前往江东游说孙权。诸葛亮分析了曹军的弱点，提出了孙刘联合抗曹的战略。孙权被说服，决定与刘备结盟。",
    order: 1,
    isBranchPoint: true,
    storyId: "chibi-1775987358454",
    imageUrls: []
  },
  // 第三段：战略分歧
  {
    title: "军师争论",
    content: "联军组成后，周瑜和诸葛亮在战略上产生了分歧。周瑜主张速战速决，在赤壁直接决战；诸葛亮则建议采用持久战，先削弱曹军的锐气，再寻找战机。联军将领们各执一词，争论不休。",
    order: 2,
    isBranchPoint: true,
    storyId: "chibi-1775987358454",
    imageUrls: []
  },
  // 第四段：火攻方案（主路线）
  {
    title: "火烧赤壁",
    content: "周瑜采纳了黄盖的苦肉计，让黄盖假装投降曹操，带着火船冲向曹军水寨。东南风起时，火船顺风而下，曹军水寨顿时陷入一片火海。火势蔓延，曹军大乱，损失惨重。",
    order: 3,
    isBranchPoint: false,
    storyId: "chibi-1775987358454",
    imageUrls: []
  },
  // 第五段：水淹方案
  {
    title: "水淹七军",
    content: "诸葛亮利用对地形的了解，建议在长江上游筑坝，然后在适当时机放水。水流冲击曹军后路，导致曹军阵脚大乱。虽然伤亡不如火攻严重，但曹军被迫撤退，联军获得了战略优势。",
    order: 3,
    isBranchPoint: false,
    storyId: "chibi-1775987358454",
    imageUrls: []
  },
  // 第六段：坚守方案
  {
    title: "持久对峙",
    content: "联军选择采取防守策略，在关键隘口设防，不与曹军正面交锋。同时通过小规模骚扰战消耗曹军的有生力量。曹操大军久攻不下，粮草补给困难，最终被迫退兵。",
    order: 3,
    isBranchPoint: false,
    storyId: "chibi-1775987358454",
    imageUrls: []
  },
  // 第七段：决战结局
  {
    title: "三国鼎立",
    content: "赤壁之战奠定了三国鼎立的基础。曹操退回北方，休养生息；刘备趁机夺取荆州，建立自己的根据地；孙权巩固了江东统治。这场战役改变了中国历史的走向，开启了三国时代。",
    order: 4,
    isBranchPoint: false,
    storyId: "chibi-1775987358454",
    imageUrls: []
  }
];

// 玄武门之变的完整故事段落数据（包含多个分支点）
const xuanwumenSegments = [
  // 第一段：兄弟矛盾
  {
    title: "太子之争",
    content: "唐朝初年，太子李建成与秦王李世民之间的矛盾日益激化。李世民在唐朝建立过程中战功赫赫，威望极高，让太子李建成感到威胁。两人各自培植势力，明争暗斗，朝堂之上剑拔弩张。",
    order: 0,
    isBranchPoint: false,
    storyId: "xuanwumen-1775987358455",
    imageUrls: []
  },
  // 第二段：矛盾激化
  {
    title: "暗中较量",
    content: "李建成联合齐王李元吉，不断在皇帝李渊面前诋毁李世民，削减他的兵权。李世民也不甘示弱，暗中培植自己的心腹，收买朝廷重臣。两人都想在关键时刻占据主动，为日后的皇位争夺做准备。",
    order: 1,
    isBranchPoint: true,
    storyId: "xuanwumen-1775987358455",
    imageUrls: []
  },
  // 第三段：玄武门选择
  {
    title: "历史抉择",
    content: "公元626年，矛盾达到顶点。李世民面临选择：是坐以待毙，还是先发制人？他的谋士房玄龄和杜如晦建议他效仿古代圣贤，在玄武门设下埋伏。但也有人劝他采取更温和的方式，避免流血冲突。",
    order: 2,
    isBranchPoint: true,
    storyId: "xuanwumen-1775987358455",
    imageUrls: []
  },
  // 第四段：兵变路线（主路线）
  {
    title: "玄武门血变",
    content: "李世民决定先发制人。在玄武门设下埋伏，杀死了前来上朝的太子李建成和齐王李元吉。随后率兵控制了宫城，逼迫父亲李渊立自己为太子，不久后让位。李世民登基，是为唐太宗。",
    order: 3,
    isBranchPoint: false,
    storyId: "xuanwumen-1775987358455",
    imageUrls: []
  },
  // 第五段：和平路线
  {
    title: "权力交接",
    content: "李世民选择政治斗争而非军事政变。通过朝堂上的政治操作，逐渐削弱李建成和李元吉的势力。在获得大部分朝臣支持后，李渊被迫承认李世民的才能，主动将皇位传给了李世民，避免了流血冲突。",
    order: 3,
    isBranchPoint: false,
    storyId: "xuanwumen-1775987358455",
    imageUrls: []
  },
  // 第六段：海外流亡
  {
    title: "异国为王",
    content: "李世民意识到内部斗争对国家不利，决定放弃皇位争夺。他带着心腹离开长安，前往边疆地区，后来在异国建立了新的政权，成为当地的统治者。而唐朝在李建成和李渊的统治下，走向了不同的发展道路。",
    order: 3,
    isBranchPoint: false,
    storyId: "xuanwumen-1775987358455",
    imageUrls: []
  },
  // 第七段：历史影响
  {
    title: "改写历史",
    content: "不同的选择导致了完全不同的历史走向。无论是军事政变、和平交接还是海外流亡，都改变了唐朝的命运，甚至可能影响了中国历史的整个进程。每个选择都开创了新的可能性，也带来了新的挑战。",
    order: 4,
    isBranchPoint: false,
    storyId: "xuanwumen-1775987358455",
    imageUrls: []
  }
];

// 分叉节点数据
const jingkeBranches = [
  {
    title: "朝堂刺杀路线",
    description: "在朝堂上刺杀秦王",
    segmentId: "jingke-1775987358452-segment-2",
    parentStoryId: "jingke-1775987358452"
  },
  {
    title: "出巡埋伏路线", 
    description: "在秦王出巡时埋伏",
    segmentId: "jingke-1775987358452-segment-2",
    parentStoryId: "jingke-1775987358452"
  },
  {
    title: "宠臣接近路线",
    description: "通过秦王宠臣接近",
    segmentId: "jingke-1775987358452-segment-2",
    parentStoryId: "jingke-1775987358452"
  }
];

const chibiBranches = [
  {
    title: "火攻方案",
    description: "使用火攻击败曹军",
    segmentId: "chibi-1775987358454-segment-2", 
    parentStoryId: "chibi-1775987358454"
  },
  {
    title: "水淹方案",
    description: "利用水攻战术",
    segmentId: "chibi-1775987358454-segment-2",
    parentStoryId: "chibi-1775987358454"
  },
  {
    title: "坚守方案",
    description: "采取防守策略",
    segmentId: "chibi-1775987358454-segment-2",
    parentStoryId: "chibi-1775987358454"
  }
];

const xuanwumenBranches = [
  {
    title: "兵变路线",
    description: "玄武门军事政变",
    segmentId: "xuanwumen-1775987358455-segment-2",
    parentStoryId: "xuanwumen-1775987358455"
  },
  {
    title: "和平路线",
    description: "政治权力交接",
    segmentId: "xuanwumen-1775987358455-segment-2",
    parentStoryId: "xuanwumen-1775987358455"
  },
  {
    title: "海外流亡",
    description: "放弃权力争夺",
    segmentId: "xuanwumen-1775987358455-segment-2", 
    parentStoryId: "xuanwumen-1775987358455"
  }
];

async function seedData() {
  console.log('开始填充增强的种子数据...');

  // 先清空现有数据
  console.log('清空现有数据...');
  const fs = require('fs/promises');
  const path = require('path');
  const DATA_DIR = path.join(process.cwd(), 'data');
  
  await fs.writeFile(path.join(DATA_DIR, 'stories.json'), '[]');
  await fs.writeFile(path.join(DATA_DIR, 'segments.json'), '[]');
  await fs.writeFile(path.join(DATA_DIR, 'branches.json'), '[]');

  // 创建故事
  console.log('创建故事...');
  for (const storyData of sampleStories) {
    const story = await storyStore.createStory(storyData);
    console.log(`创建故事: ${story.title} (${story.id})`);
  }

  // 为每个故事创建段落
  console.log('创建故事段落...');
  const segmentData = [jingkeSegments, chibiSegments, xuanwumenSegments].flat();
  
  for (const segment of segmentData) {
    await storyStore.createSegment(segment);
    console.log(`创建段落: ${segment.title} for ${segment.storyId}`);
  }

  // 创建分叉节点
  console.log('创建分叉节点...');
  const branchData = [jingkeBranches, chibiBranches, xuanwumenBranches].flat();
  
  for (const branch of branchData) {
    await storyStore.createBranch(branch);
    console.log(`创建分叉: ${branch.title}`);
  }

  console.log('增强的种子数据填充完成！');
}

// 如果直接运行此脚本
if (require.main === module) {
  seedData().catch(console.error);
}

module.exports = { 
  seedData, 
  sampleStories, 
  jingkeSegments, 
  chibiSegments, 
  xuanwumenSegments,
  jingkeBranches,
  chibiBranches,
  xuanwumenBranches
};