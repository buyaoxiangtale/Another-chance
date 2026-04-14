/**
 * C7.3-C7.8 种子数据 — 完整角色、时间轴、Lorebook
 */
const { storiesStore, segmentsStore, charactersStore } = require('./src/lib/simple-db');
const fs = require('fs');
const path = require('path');

// ============================================================
// 角色数据
// ============================================================

const JINGKE_CHARACTERS = [
  {
    name: '荆轲', role: 'protagonist',
    traits: ['勇敢', '侠义', '深沉', '善辩', '重诺轻死'],
    speechPatterns: '壮士一去兮不复还，风萧萧兮易水寒。天下之大，知己难求。此行虽死，丹之托不可负。',
    coreMotivation: '报太子丹知遇之恩，以死报知己，刺秦救燕',
    relationships: [
      { targetId: 'char_yandan', relation: '君臣/知己', strength: 0.95 },
      { targetId: 'char_fanyuqi', relation: '刎颈之交', strength: 0.9 },
      { targetId: 'char_yingzheng', relation: '刺客/目标', strength: 0.8 },
      { targetId: 'char_gaojianli', relation: '挚友/同行', strength: 0.85 },
    ],
  },
  {
    name: '秦王嬴政', role: 'antagonist',
    traits: ['雄才大略', '多疑', '威严', '冷酷', '好大喜功'],
    speechPatterns: '朕即天下，六国必灭。凡逆朕者，虽远必诛。寡人要的是四海归一，万世基业。',
    coreMotivation: '统一六国，建立万世基业，成就始皇帝之业',
    relationships: [
      { targetId: 'char_mengjia', relation: '君臣', strength: 0.6 },
      { targetId: 'char_xiawuqie', relation: '君臣', strength: 0.5 },
      { targetId: 'char_jingke', relation: '行刺目标', strength: 0.8 },
      { targetId: 'char_fanyuqi', relation: '仇敌（叛将）', strength: 0.9 },
    ],
  },
  {
    name: '燕太子丹', role: 'supporting',
    traits: ['忧国忧民', '重情义', '急躁', '优柔寡断', '恨秦入骨'],
    speechPatterns: '国仇家恨，丹岂能忘？愿以千金求天下壮士。秦王欺人太甚，此仇不报，丹死不瞑目！',
    coreMotivation: '报质秦之辱，保全燕国，对抗强秦',
    relationships: [
      { targetId: 'char_jingke', relation: '君臣/知己', strength: 0.95 },
      { targetId: 'char_tianguang', relation: '忘年交/师友', strength: 0.8 },
      { targetId: 'char_fanyuqi', relation: '收留/利用', strength: 0.6 },
    ],
  },
  {
    name: '樊於期', role: 'supporting',
    traits: ['忠勇', '刚烈', '悲壮', '亡国之将', '视死如归'],
    speechPatterns: '父母宗族皆为秦戮，於期之恨，深入骨髓！将军之首，愿为壮士之资。',
    coreMotivation: '报仇雪恨，以死助荆轲成事',
    relationships: [
      { targetId: 'char_jingke', relation: '刎颈之交', strength: 0.9 },
      { targetId: 'char_yandan', relation: '被收留/感念', strength: 0.7 },
      { targetId: 'char_yingzheng', relation: '叛将/仇敌', strength: 0.95 },
    ],
  },
  {
    name: '蒙嘉', role: 'supporting',
    traits: ['善于逢迎', '贪婪', '圆滑', '权谋', '短视'],
    speechPatterns: '大王英明神武，何人敢犯？不过燕使求见，或可一看。嘉愿为大王分忧。',
    coreMotivation: '攀附权贵，中饱私囊，在秦廷立足',
    relationships: [
      { targetId: 'char_yingzheng', relation: '君臣（宠臣）', strength: 0.7 },
      { targetId: 'char_jingke', relation: '被贿赂/引荐人', strength: 0.5 },
    ],
  },
  {
    name: '夏无且', role: 'supporting',
    traits: ['医术精湛', '忠心', '临危不乱', '正直'],
    speechPatterns: '臣乃御医，职责所在。药囊在手，可击贼人！',
    coreMotivation: '忠君护主，以医者之心守卫秦王',
    relationships: [
      { targetId: 'char_yingzheng', relation: '君臣（御医）', strength: 0.8 },
      { targetId: 'char_jingke', relation: '对抗（药囊投击）', strength: 0.6 },
    ],
  },
  // 额外角色
  {
    name: '田光', role: 'supporting',
    traits: ['老谋深算', '忠义', '以死明志', '隐忍'],
    speechPatterns: '老朽已衰，不足为用。然太子之托，光必以命报之。请勿泄密，以全老朽之节。',
    coreMotivation: '以死举荐荆轲，报太子知遇',
    relationships: [
      { targetId: 'char_yandan', relation: '忘年交/师友', strength: 0.8 },
      { targetId: 'char_jingke', relation: '举荐人', strength: 0.7 },
    ],
  },
  {
    name: '高渐离', role: 'supporting',
    traits: ['洒脱', '重情', '悲歌慷慨', '击筑名手'],
    speechPatterns: '风萧萧兮易水寒，壮士一去兮不复还！此曲只应天上有，人间能得几回闻。',
    coreMotivation: '以音乐送别知己，继承荆轲遗志',
    relationships: [
      { targetId: 'char_jingke', relation: '挚友/知音', strength: 0.95 },
    ],
  },
];

const CHIBI_CHARACTERS = [
  {
    name: '曹操', role: 'antagonist',
    traits: ['雄才', '奸诈', '自负', '豪迈', '善用权谋', '诗人'],
    speechPatterns: '宁教我负天下人，休教天下人负我。对酒当歌，人生几何！吾有百万雄师，何惧孙刘鼠辈？',
    coreMotivation: '统一天下，成就霸业，建立曹魏基业',
    relationships: [
      { targetId: 'char_liubei_chibi', relation: '对手/轻视', strength: 0.7 },
      { targetId: 'char_sunquan', relation: '敌人', strength: 0.8 },
      { targetId: 'char_jianggan', relation: '利用/轻信', strength: 0.4 },
      { targetId: 'char_caocao_cai Mao', relation: '冤杀', strength: 0.5 },
    ],
  },
  {
    name: '刘备', role: 'protagonist',
    traits: ['仁德', '坚韧', '隐忍', '善用人', '谦逊', '哭术大师'],
    speechPatterns: '备虽不才，愿与诸公共图大业。天下苍生，何辜遭此兵祸？',
    coreMotivation: '匡扶汉室，救苍生于水火，三分天下有其一',
    relationships: [
      { targetId: 'char_zhugeliang', relation: '君臣/知己', strength: 0.95 },
      { targetId: 'char_guanyu', relation: '桃园结义兄弟', strength: 0.95 },
      { targetId: 'char_zhangfei', relation: '桃园结义兄弟', strength: 0.95 },
      { targetId: 'char_sunquan', relation: '盟友/利用', strength: 0.7 },
    ],
  },
  {
    name: '孙权', role: 'supporting',
    traits: ['年轻有为', '果断', '善纳谏', '疑心重', '雄主之姿'],
    speechPatterns: '孤继承父兄基业，岂能拱手让人？曹贼虽众，吾有江东天险。众将意下如何？',
    coreMotivation: '保全江东基业，抗曹自立，三分天下',
    relationships: [
      { targetId: 'char_zhouyu', relation: '君臣/手足', strength: 0.9 },
      { targetId: 'char_luxun', relation: '君臣/后继', strength: 0.7 },
      { targetId: 'char_liubei_chibi', relation: '盟友/猜忌', strength: 0.6 },
      { targetId: 'char_caocao', relation: '敌人', strength: 0.8 },
    ],
  },
  {
    name: '诸葛亮', role: 'supporting',
    traits: ['睿智', '忠诚', '谨慎', '雄辩', '神机妙算', '淡泊'],
    speechPatterns: '亮以为……天下大势，合久必分，分久必合。运筹帷幄之中，决胜千里之外。',
    coreMotivation: '鞠躬尽瘁，死而后已，辅佐刘备匡扶汉室',
    relationships: [
      { targetId: 'char_liubei_chibi', relation: '君臣/三顾之恩', strength: 0.95 },
      { targetId: 'char_zhouyu', relation: '对手/惺惺相惜', strength: 0.7 },
      { targetId: 'char_caocao', relation: '对手/敬佩', strength: 0.6 },
    ],
  },
  {
    name: '周瑜', role: 'supporting',
    traits: ['儒将', '英姿勃发', '心胸狭窄', '才华横溢', '善于用兵'],
    speechPatterns: '既生瑜，何生亮！大江东去，浪淘尽千古风流人物。曹贼远来疲敝，正可一战而破！',
    coreMotivation: '保卫江东，击败曹操，名垂青史',
    relationships: [
      { targetId: 'char_sunquan', relation: '君臣/手足', strength: 0.9 },
      { targetId: 'char_zhugeliang', relation: '对手/嫉妒', strength: 0.8 },
      { targetId: 'char_huanggai', relation: '上下级/苦肉计', strength: 0.85 },
      { targetId: 'char_caocao', relation: '死敌', strength: 0.9 },
    ],
  },
  {
    name: '黄盖', role: 'supporting',
    traits: ['老将', '忠勇', '刚烈', '甘愿受苦', '身经百战'],
    speechPatterns: '老臣虽朽，尚能为吴国效死！苦肉之计，盖愿受之，只为破曹！',
    coreMotivation: '效忠东吴，以苦肉计助周瑜火攻破曹',
    relationships: [
      { targetId: 'char_zhouyu', relation: '上下级/信任', strength: 0.85 },
      { targetId: 'char_sunquan', relation: '三世老臣', strength: 0.8 },
    ],
  },
];

const XUANWM_CHARACTERS = [
  {
    name: '李世民', role: 'protagonist',
    traits: ['英武', '果断', '知人善任', '野心勃勃', '仁厚有度'],
    speechPatterns: '天下者，非一人之天下，乃有德者之天下。朕若不取，必有他人取之。天策府将士，随朕建功立业！',
    coreMotivation: '保全身家性命，开创贞观之治，成为千古一帝',
    relationships: [
      { targetId: 'char_lichengjian', relation: '兄弟/死敌', strength: 0.95 },
      { targetId: 'char_liyuanji', relation: '兄弟/死敌', strength: 0.9 },
      { targetId: 'char_yuchi_jingde', relation: '君臣/生死之交', strength: 0.95 },
      { targetId: 'char_changsun_wuji', relation: '君臣/姻亲', strength: 0.9 },
      { targetId: 'char_weizheng', relation: '君臣/诤臣', strength: 0.8 },
    ],
  },
  {
    name: '李建成', role: 'antagonist',
    traits: ['稳重', '猜忌', '城府深', '优柔寡断', '善结党羽'],
    speechPatterns: '吾乃太子，储君之位天命所归。二弟功高盖主，当早除之，以绝后患。',
    coreMotivation: '巩固太子地位，铲除世民威胁，顺利继位',
    relationships: [
      { targetId: 'char_lishimin', relation: '兄弟/死敌', strength: 0.95 },
      { targetId: 'char_liyuanji', relation: '兄弟/同盟', strength: 0.85 },
      { targetId: 'char_weizheng', relation: '太子府属官', strength: 0.7 },
    ],
  },
  {
    name: '李元吉', role: 'antagonist',
    traits: ['暴躁', '鲁莽', '善妒', '勇猛', '反复无常'],
    speechPatterns: '二哥功高盖主，当除之！我齐王也有三军在手，谁怕谁？大哥，你我联手，先灭世民！',
    coreMotivation: '依附太子，借机除掉世民，自己上位',
    relationships: [
      { targetId: 'char_lishimin', relation: '兄弟/嫉恨', strength: 0.9 },
      { targetId: 'char_lichengjian', relation: '兄弟/同盟', strength: 0.85 },
    ],
  },
  {
    name: '尉迟敬德', role: 'supporting',
    traits: ['勇猛无敌', '忠心耿耿', '直爽', '救驾有功', '铁骨铮铮'],
    speechPatterns: '末将愿为秦王赴汤蹈火！谁敢伤秦王一根毫毛，先问过俺手中这鞭！',
    coreMotivation: '报秦王知遇之恩，誓死追随',
    relationships: [
      { targetId: 'char_lishimin', relation: '君臣/生死之交', strength: 0.95 },
      { targetId: 'char_changsun_wuji', relation: '同僚/战友', strength: 0.8 },
    ],
  },
  {
    name: '长孙无忌', role: 'supporting',
    traits: ['足智多谋', '忠厚', '深谋远虑', '外戚之首', '稳如磐石'],
    speechPatterns: '秦王殿下，此事宜早不宜迟。当断不断，反受其乱。无忌愿为殿下筹谋到底。',
    coreMotivation: '辅佐秦王夺嫡，成为开国功臣，稳固长孙氏地位',
    relationships: [
      { targetId: 'char_lishimin', relation: '君臣/姻亲/知己', strength: 0.95 },
      { targetId: 'char_yuchi_jingde', relation: '同僚', strength: 0.8 },
    ],
  },
  {
    name: '魏征', role: 'supporting',
    traits: ['刚正不阿', '直言敢谏', '博学多识', '忠直', '后归世民'],
    speechPatterns: '殿下若欲成大事，当以仁德服人，不可行悖逆之举！直言逆耳，然利于行。',
    coreMotivation: '忠于社稷，辅佐明主，以直言匡正时弊',
    relationships: [
      { targetId: 'char_lichengjian', relation: '属官/太子洗马', strength: 0.7 },
      { targetId: 'char_lishimin', relation: '后归/诤臣', strength: 0.85 },
    ],
  },
];

// ============================================================
// 时间轴数据
// ============================================================

const JINGKE_TIMELINE = [
  { era: '战国末期', year: -228, season: '冬', description: '秦灭赵，赵国都城邯郸陷落。燕国震动，太子丹恐惧。', narrativeTime: '公元前228年冬' },
  { era: '战国末期', year: -228, season: '冬', description: '太子丹质秦归国，对秦之恨深入骨髓，开始谋划刺秦。', narrativeTime: '公元前228年冬' },
  { era: '战国末期', year: -227, season: '春', description: '太子丹请教田光，田光以死举荐荆轲，以全节义。', narrativeTime: '公元前227年春' },
  { era: '战国末期', year: -227, season: '春', description: '太子丹与荆轲结交，以上宾之礼待之，车骑美食，日日供奉。', narrativeTime: '公元前227年春' },
  { era: '战国末期', year: -227, season: '夏', description: '荆轲请求樊於期自刎以献首级，樊於期慨然自刎。', narrativeTime: '公元前227年夏' },
  { era: '战国末期', year: -227, season: '夏', description: '燕丹求得徐夫人匕首，淬以剧毒，人见血即死。', narrativeTime: '公元前227年夏' },
  { era: '战国末期', year: -227, season: '秋', description: '荆轲出发，易水送别，高渐离击筑，荆轲慷慨悲歌。', narrativeTime: '公元前227年秋' },
  { era: '战国末期', year: -227, season: '冬', description: '荆轲至咸阳，蒙嘉受贿引荐，秦王许见。', narrativeTime: '公元前227年冬' },
  { era: '战国末期', year: -227, season: '冬', description: '图穷匕见！荆轲逐秦王于柱间，群臣惊愕，绕柱而走。', narrativeTime: '公元前227年冬' },
  { era: '战国末期', year: -227, season: '冬', description: '夏无且以药囊投击荆轲，秦王拔剑反杀，荆轲倚柱笑骂而死。', narrativeTime: '公元前227年冬' },
];

const CHIBI_TIMELINE = [
  { era: '东汉末年', year: 208, season: '秋', description: '曹操率大军南下，号称八十万，兵锋直指荆州。刘琮不战而降。', narrativeTime: '建安十三年秋' },
  { era: '东汉末年', year: 208, season: '秋', description: '刘备败走当阳长坂坡，携民渡江，诸葛亮出使江东求援。', narrativeTime: '建安十三年秋' },
  { era: '东汉末年', year: 208, season: '冬', description: '诸葛亮舌战群儒，以三寸不烂之舌说服孙权联刘抗曹。', narrativeTime: '建安十三年冬' },
  { era: '东汉末年', year: 208, season: '冬', description: '周瑜主战，孙权拔剑斩案角以示决心，孙刘联盟正式结成。', narrativeTime: '建安十三年冬' },
  { era: '东汉末年', year: 208, season: '冬', description: '蒋干中计，曹操怒斩蔡瑁张允，水军失去指挥。', narrativeTime: '建安十三年冬' },
  { era: '东汉末年', year: 208, season: '冬', description: '庞统献连环计，曹操将战船以铁索相连，为火攻埋下伏笔。', narrativeTime: '建安十三年冬' },
  { era: '东汉末年', year: 208, season: '冬', description: '黄盖行苦肉计，周瑜打黄盖，一场苦肉戏骗过曹操。', narrativeTime: '建安十三年冬' },
  { era: '东汉末年', year: 208, season: '冬', description: '东风起！黄盖火船冲入曹军水寨，火烧赤壁，曹军大败。', narrativeTime: '建安十三年冬' },
  { era: '东汉末年', year: 208, season: '冬', description: '曹操败走华容道，关羽义释曹操，三分天下之势初成。', narrativeTime: '建安十三年冬' },
];

const XUANWM_TIMELINE = [
  { era: '唐朝初年', year: 618, season: '春', description: '李渊建唐称帝，封李建成为太子，李世民为秦王。', narrativeTime: '武德元年春' },
  { era: '唐朝初年', year: 621, season: '夏', description: '李世民虎牢关一战擒窦建德、降王世充，功勋盖世，封天策上将。', narrativeTime: '武德四年夏' },
  { era: '唐朝初年', year: 622, season: '秋', description: '秦王府人才济济（尉迟敬德、秦叔宝、程咬金等），与太子府矛盾激化。', narrativeTime: '武德五年秋' },
  { era: '唐朝初年', year: 625, season: '冬', description: '突厥入寇，太子与齐王谋夺秦王府兵权。李渊态度摇摆。', narrativeTime: '武德八年冬' },
  { era: '唐朝初年', year: 626, season: '春', description: '太子李建成与齐王李元吉密谋，设毒酒欲害秦王，世民中毒吐血。', narrativeTime: '武德九年春' },
  { era: '唐朝初年', year: 626, season: '夏', description: '长孙无忌、尉迟敬德等力劝秦王先发制人。世民夜占卜得吉。', narrativeTime: '武德九年六月初三' },
  { era: '唐朝初年', year: 626, season: '夏', description: '玄武门之变！李世民率伏兵射杀太子建成，尉迟敬德射杀齐王元吉。', narrativeTime: '武德九年六月初四' },
  { era: '唐朝初年', year: 626, season: '夏', description: '李渊禅位，李世民即位为帝，是为唐太宗，开启贞观之治。', narrativeTime: '武德九年八月' },
];

// ============================================================
// Lorebook 补充数据
// ============================================================

const EXTRA_LOREBOOK = [
  {
    id: 'lore_qin_dukang',
    era: '秦朝', topic: '地理', title: '督亢之地',
    content: '督亢为燕国最肥沃之地，位于今河北涿州一带，是燕国的粮仓。燕太子丹献督亢地图于秦王，实为荆轲刺秦的掩护。地图展开之际，匕首暗藏其中，此即"图穷匕见"之由来。',
    tags: ['地理', '燕国', '刺秦'],
  },
  {
    id: 'lore_qin_weidi',
    era: '秦朝', topic: '宫殿', title: '咸阳宫',
    content: '咸阳宫是秦国的主要宫殿，位于渭水之北。宫中建筑宏伟，殿宇连绵。秦王嬴政在此处理朝政、接见各国使臣。荆轲刺秦即发生在咸阳宫正殿之上。大殿宽阔，列柱林立，秦法规定殿上群臣不得携带兵器。',
    tags: ['宫殿', '建筑', '咸阳'],
  },
  {
    id: 'lore_qin_xushibingshu',
    era: '秦朝', topic: '兵器', title: '徐夫人匕首',
    content: '徐夫人匕首为赵国徐夫人所铸之利刃。燕太子丹以百金购得，命工匠以剧毒淬之。试之以人，血沾缕即死。此匕首藏于督亢地图卷轴之中，为荆轲刺秦之关键武器。',
    tags: ['兵器', '刺秦', '毒器'],
  },
  {
    id: 'lore_han_sanguo_loushang',
    era: '东汉末年', topic: '地理', title: '赤壁',
    content: '赤壁位于今湖北赤壁市西北，长江南岸。赤壁之战即发生于此。此地江面狭窄，水流湍急，北风可转为东南风。周瑜、黄盖利用此地地形和风向，以火攻大破曹军。赤壁之战是中国历史上以少胜多的经典战役。',
    tags: ['地理', '战役', '三国'],
  },
  {
    id: 'lore_han_sanguo_lianjian',
    era: '东汉末年', topic: '军事', title: '连环战船',
    content: '曹操北军不习水战，多有晕船。庞统献连环计，建议以铁索将战船相连，上铺木板，使步兵可在船上如履平地。此计虽解决了晕船问题，却使战船失去机动性，成为火攻的绝佳目标。赤壁之火一起，连环船无法散开，曹军大败。',
    tags: ['军事', '战术', '赤壁'],
  },
  {
    id: 'lore_tang_xuanwumen',
    era: '唐朝初年', topic: '建筑', title: '玄武门',
    content: '玄武门为唐长安城太极宫北门，是宫城的主要出入口之一，常驻禁军。武德九年六月初四，李世民率长孙无忌、尉迟敬德等在此设伏，伏杀太子李建成和齐王李元吉，史称"玄武门之变"。此门由此成为中国历史上最有名的宫门之一。',
    tags: ['建筑', '宫殿', '长安'],
  },
  {
    id: 'lore_tang_tiancefu',
    era: '唐朝初年', topic: '政治', title: '天策府',
    content: '天策府是唐高祖李渊为表彰李世民战功而特设的机构，位列诸府之上。李世民以天策上将身份自置官属，延揽天下英才。天策府实际上成为与太子东宫并立的权力中心，汇聚了尉迟敬德、秦叔宝、程咬金、房玄龄、杜如晦等文武人才，是玄武门之变的核心力量。',
    tags: ['政治', '军政', '李世民'],
  },
];

// ============================================================
// 故事段落
// ============================================================

const JINGKE_SEGMENTS = [
  { title: '序幕', content: '公元前227年，燕国太子丹派遣荆轲前往咸阳刺杀秦王嬴政。荆轲带着樊於期的人头和督亢的地图，携带着淬毒的匕首，踏上了前往秦国的旅程。', isBranchPoint: false, imageUrls: [] },
  { title: '面见秦王', content: '荆轲在咸阳宫中见到了秦王嬴政。他恭敬地献上樊於期的人头和督亢地图。当秦王展开地图时，荆轲趁机抽出匕首，向秦王刺去。', isBranchPoint: true, imageUrls: [] },
];

const CHIBI_SEGMENTS = [
  { title: '曹操南下', content: '东汉末年，曹操统一北方后，率领大军八十万南下，意图一举消灭孙权和刘备，统一天下。', isBranchPoint: false, imageUrls: [] },
  { title: '联盟抗曹', content: '孙权和刘备决定联合抗曹。诸葛亮出使江东，说服孙权共同对抗曹操。联军在赤壁一带集结。', isBranchPoint: true, imageUrls: [] },
];

const XUANWM_SEGMENTS = [
  { title: '兄弟矛盾', content: '唐朝初年，太子李建成与秦王李世民之间矛盾日益激化。李世民在统一战争中功勋卓著，威胁到太子的地位。', isBranchPoint: false, imageUrls: [] },
  { title: '玄武门兵变', content: '公元626年，李世民在玄武门设下埋伏，杀死了太子李建成和齐王李元吉，逼迫父亲李渊退位。', isBranchPoint: true, imageUrls: [] },
];

// ============================================================
// 辅助函数
// ============================================================

function genId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function createCharacter(data, storyId, era, relIdMap) {
  return {
    id: data.name ? relIdMap[data.name] : genId('char'),
    name: data.name,
    era,
    role: data.role,
    traits: data.traits,
    speechPatterns: data.speechPatterns,
    relationships: (data.relationships || []).map(r => ({
      targetId: relIdMap[r.targetId] || r.targetId,
      relation: r.relation,
      strength: r.strength,
    })),
    stateHistory: [],
    coreMotivation: data.coreMotivation,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function createTimelineEvent(data) {
  return {
    era: data.era,
    year: data.year,
    season: data.season,
    description: data.description,
    narrativeTime: data.narrativeTime,
  };
}

// ============================================================
// 主函数
// ============================================================

async function seedData() {
  console.log('🌱 开始填充 C7 种子数据...');

  // 构建故事数据
  const storiesConfig = [
    { title: '荆轲刺秦王', description: '基于荆轲刺秦王历史事件的故事续写平台', author: '历史故事组', era: '战国末期', genre: '刺客列传', characters: JINGKE_CHARACTERS, timeline: JINGKE_TIMELINE, segments: JINGKE_SEGMENTS },
    { title: '赤壁之战', description: '基于赤壁之战历史事件的故事续写平台', author: '历史故事组', era: '东汉末年', genre: '战争史诗', characters: CHIBI_CHARACTERS, timeline: CHIBI_TIMELINE, segments: CHIBI_SEGMENTS },
    { title: '玄武门之变', description: '基于玄武门之变历史事件的故事续写平台', author: '历史故事组', era: '唐朝初年', genre: '宫廷权谋', characters: XUANWM_CHARACTERS, timeline: XUANWM_TIMELINE, segments: XUANWM_SEGMENTS },
  ];

  const stories = await storiesStore.load();
  const allCharacters = await charactersStore.load();
  const allSegments = await segmentsStore.load();

  // 角色名→ID映射（跨故事不冲突）
  const globalCharIdMap = {};
  // 预生成所有角色ID
  for (const cfg of storiesConfig) {
    for (const charDef of cfg.characters) {
      const id = genId('char');
      globalCharIdMap[charDef.name] = id;
      // 内部引用也需要映射
      for (const r of (charDef.relationships || [])) {
        if (r.targetId.startsWith('char_')) continue; // 已经是 ID
        // targetId 就是 name
      }
    }
  }

  for (const cfg of storiesConfig) {
    // 检查是否已存在
    const existing = stories.find(s => s.title === cfg.title);
    if (existing) {
      console.log(`⏭️ 故事已存在: ${cfg.title} (${existing.id})，跳过`);
      continue;
    }

    // 创建故事
    const storyId = genId('story');
    const characterIds = cfg.characters.map(c => globalCharIdMap[c.name]);

    const story = {
      id: storyId,
      title: cfg.title,
      description: cfg.description,
      author: cfg.author,
      era: cfg.era,
      genre: cfg.genre,
      characterIds,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    stories.push(story);
    console.log(`✅ 创建故事: ${cfg.title} (${storyId})`);

    // 创建角色
    for (const charDef of cfg.characters) {
      const char = createCharacter(charDef, storyId, cfg.era, globalCharIdMap);
      allCharacters.push(char);
      console.log(`  👤 角色: ${char.name} [${char.role}]`);
    }

    // 创建时间轴段落
    let parentSegmentId = undefined;
    for (let i = 0; i < cfg.segments.length; i++) {
      const segDef = cfg.segments[i];
      const segId = genId('seg');
      const seg = {
        id: segId,
        title: segDef.title,
        content: segDef.content,
        isBranchPoint: segDef.isBranchPoint,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        storyId,
        branchId: 'main',
        parentSegmentId: parentSegmentId || '',
        imageUrls: [],
        timeline: i === 0 ? cfg.timeline[0] : undefined,
        characterIds,
      };
      allSegments.push(seg);
      console.log(`  📄 段落: ${segDef.title}`);
      parentSegmentId = segId;
    }

    // 为故事设置 rootSegmentId
    story.rootSegmentId = parentSegmentId ? allSegments.find(s => !s.parentSegmentId || s.parentSegmentId === '' && s.storyId === storyId)?.id : undefined;
  }

  await storiesStore.save(stories);
  await charactersStore.save(allCharacters);
  await segmentsStore.save(allSegments);

  // Lorebook 补充
  const lorebookPath = path.join(__dirname, 'data', 'lorebook.preset.json');
  try {
    const lorebook = JSON.parse(fs.readFileSync(lorebookPath, 'utf-8'));
    const existingIds = new Set(lorebook.map(e => e.id));
    let added = 0;
    for (const entry of EXTRA_LOREBOOK) {
      if (!existingIds.has(entry.id)) {
        lorebook.push({ ...entry, createdAt: new Date().toISOString() });
        added++;
      }
    }
    if (added) {
      fs.writeFileSync(lorebookPath, JSON.stringify(lorebook, null, 2));
      console.log(`📚 Lorebook 新增 ${added} 条`);
    } else {
      console.log('⏭️ Lorebook 无需更新');
    }
  } catch (e) {
    console.log('⚠️ Lorebook 更新失败:', e.message);
  }

  console.log('🎉 C7 种子数据填充完成！');
}

seedData().catch(console.error);
