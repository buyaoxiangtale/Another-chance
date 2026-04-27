/**
 * Genre 分类共享配置
 *
 * 集中管理所有体裁分类常量，供 prompt-builder、ai-client、
 * context-summarizer、fandom-lorebook、mcp-wikipedia 等模块共用。
 */

/** 从 description 自动推断 genre 的关键词映射 */
export const INFER_PATTERNS: Record<string, string[]> = {
  '同人': [
    '火影', '鸣人', '佐助', '带土', '卡卡西', '写轮眼', '查克拉', '木叶', '轮回眼',
    '海贼', '路飞', '恶魔果实', '七武海',
    '龙珠', '悟空', '贝吉塔', '超级赛亚人',
    '死神', '一护', '斩魄刀', '护廷十三队',
    '柯南', '灰原', '小兰', '毛利',
    '哈利', '波特', '霍格沃茨', '伏地魔',
    '漫威', '钢铁侠', '蜘蛛侠', '复仇者',
    'DC', '蝙蝠侠', '超人', '正义联盟',
    '原神', '钟离', '雷电', '旅行者', '提瓦特',
  ],
  '玄幻': ['修仙', '修真', '灵力', '灵气', '元婴', '金丹', '飞升', '天劫', '仙尊', '魔尊', '剑修', '丹药'],
  '仙侠': ['剑仙', '仙人', '天庭', '妖魔', '渡劫', '法宝', '符箓'],
  '穿越': ['重生', '穿越', '回到', '前世', '来世', '回到过去', '穿越回'],
  '武侠': ['武功', '内力', '轻功', '江湖', '侠客', '门派', '武功秘籍', '掌门'],
  '架空': ['架空', '异世界', '平行世界', '位面', '另一个世界'],
  '科幻': [
    '三体', '叶文洁', '红岸', '智子', '面壁者', '黑暗森林', '降维打击',
    '流浪地球', '刘慈欣', '外星', '太空', '星际', '赛博', '仿生人',
    '人工智能', '机器人', '宇宙', '银河', '维度', '光年', '飞船',
    '星球大战', '星际迷航', '基地', '沙丘', '银翼杀手', '黑客帝国',
    '克隆', '基因改造', '时间旅行', '时空', '黑洞', '虫洞',
    '基地', '阿西莫夫', '克拉克', '海因莱因',
  ],
  '末世': ['末日', '丧尸', '废土', '核战', '病毒爆发', '生存', '末世'],
  '悬疑': ['推理', '侦探', '谋杀', '案件', '凶手', '密室', '犯罪'],
  '都市': ['都市', '白领', '校园', '职场', '都市言情'],
};

/** 用于判断 isFiction 的关键词 */
export const FICTION_KEYWORDS = [
  '演义', '架空', '同人', '玄幻', '仙侠', '魔幻',
  '穿越', '重生', '武侠', '奇幻', '轻小说', '网文',
  '科幻', '末世', '悬疑', '都市', '架空历史',
  '原创', '现代', '军事',
];

/** 创建页面 storyType → genre 映射 */
export const STORY_TYPE_TO_GENRE: Record<string, string> = {
  historical: '正史',
  legend: '演义',
  literary: '现代',
  original: '原创',
};

/** 分类结果 */
export type GenreClassification = {
  rawGenre: string;
  inferredGenre: string;
  matchedKeyword: string;
  effectiveGenre: string;
  isFiction: boolean;
};

/**
 * 对故事进行体裁分类
 *
 * @param rawGenre     故事对象上的 genre 字段（可能为空）
 * @param description  故事描述文本
 */
export function classifyGenre(rawGenre: string, description: string): GenreClassification {
  let inferredGenre = '';
  let matchedKeyword = '';

  if (!rawGenre) {
    for (const [genre, keywords] of Object.entries(INFER_PATTERNS)) {
      const match = keywords.find(k => description.includes(k));
      if (match) {
        inferredGenre = genre;
        matchedKeyword = match;
        break;
      }
    }
  }

  const effectiveGenre = rawGenre || inferredGenre;
  const isFiction = FICTION_KEYWORDS.some(k => effectiveGenre.includes(k));

  return { rawGenre, inferredGenre, matchedKeyword, effectiveGenre, isFiction };
}

// ─── 分支方向静态模板 ──────────────────────────────────────────

export interface BranchDirectionTemplate {
  icon: string;
  label: string;   // 支持 ${protagonist} / ${antagonist} / ${supporting} 占位符
  desc: string;
}

export const BRANCH_DIRECTION_TEMPLATES: Record<string, BranchDirectionTemplate[]> = {
  '正史': [
    { icon: '🗡️', label: '${protagonist}采取行动', desc: '让${protagonist}改变策略，扭转局面' },
    { icon: '🔄', label: '局势急转', desc: '意外事件打破当前格局' },
    { icon: '🤝', label: '暗中联手', desc: '${protagonist}与${antagonist}达成合作' },
    { icon: '🏛️', label: '朝堂博弈', desc: '将冲突转移至更高层面' },
  ],
  '同人': [
    { icon: '💫', label: '遵循原著走向', desc: '让故事沿着原著的经典轨迹发展' },
    { icon: '🔀', label: '偏离原作剧情', desc: '在关键节点做出不同选择' },
    { icon: '💔', label: '情感爆发', desc: '角色间隐藏的情感浮出水面' },
    { icon: '⚔️', label: '宿命对决', desc: '${protagonist}与${antagonist}的终极碰撞' },
  ],
  '科幻': [
    { icon: '🚀', label: '技术突破', desc: '发现改变局面的新技术或科学原理' },
    { icon: '👽', label: '外部文明介入', desc: '来自未知力量的突然干预' },
    { icon: '🧬', label: '意识变异', desc: '${protagonist}发生根本性转变' },
    { icon: '⏳', label: '时间线分裂', desc: '关键事件导致时间线产生分歧' },
  ],
  '玄幻': [
    { icon: '⚡', label: '突破修炼瓶颈', desc: '${protagonist}在危机中领悟新力量' },
    { icon: '🐉', label: '上古秘境现世', desc: '一处被封印的远古遗迹重现' },
    { icon: '💀', label: '魔族入侵', desc: '来自深渊的威胁打破平静' },
    { icon: '📜', label: '天命之人', desc: '预言中的命运之子身份揭晓' },
  ],
  '仙侠': [
    { icon: '🌟', label: '渡劫飞升', desc: '${protagonist}面临生死天劫' },
    { icon: '🗡️', label: '仙魔大战', desc: '正道与魔道的终极之战一触即发' },
    { icon: '🏔️', label: '秘境探索', desc: '发现一处上古仙人遗留的秘境' },
    { icon: '🌸', label: '情劫降临', desc: '红尘情劫考验修仙者的道心' },
  ],
  '穿越': [
    { icon: '📜', label: '改变历史轨迹', desc: '利用现代知识扭转即将发生的大事件' },
    { icon: '🎭', label: '身份危机', desc: '${protagonist}的双重身份面临暴露' },
    { icon: '🔮', label: '预知未来', desc: '即将发生的历史事件与当前决策产生冲突' },
    { icon: '🚪', label: '归去来兮', desc: '找到可能返回现代世界的线索' },
  ],
  '武侠': [
    { icon: '⚔️', label: '武林大会', desc: '各路高手齐聚争夺武林盟主' },
    { icon: '📜', label: '绝世武功现世', desc: '一本失传的武功秘籍引发江湖震动' },
    { icon: '🤝', label: '门派联盟', desc: '${protagonist}促成江湖各派联手抗敌' },
    { icon: '🗡️', label: '复仇之路', desc: '隐藏多年的灭门真相浮出水面' },
  ],
  '架空': [
    { icon: '🏰', label: '权力更迭', desc: '王朝内部权力斗争白热化' },
    { icon: '🌍', label: '战争爆发', desc: '两个势力的矛盾升级为全面战争' },
    { icon: '💡', label: '变革图新', desc: '${protagonist}推动一场改变格局的改革' },
    { icon: '🔮', label: '超自然力量', desc: '传说中的神秘力量突然降临' },
  ],
  '末世': [
    { icon: '🧟', label: '丧尸潮来袭', desc: '大规模尸潮向避难所逼近' },
    { icon: '🏠', label: '避难所危机', desc: '安全区内部出现分裂与背叛' },
    { icon: '🔬', label: '疫苗线索', desc: '发现可能终结末世的关键线索' },
    { icon: '🚶', label: '幸存者迁徙', desc: '${protagonist}决定带领众人寻找新家园' },
  ],
  '悬疑': [
    { icon: '🔍', label: '关键线索浮现', desc: '一条被忽略的线索揭开真相的一角' },
    { icon: '😱', label: '真相反转', desc: '案件的关键假设被彻底推翻' },
    { icon: '👤', label: '幕后黑手', desc: '真正的幕后操控者露出马脚' },
    { icon: '⏰', label: '倒计时', desc: '${protagonist}必须在限时内破解谜题' },
  ],
  '都市': [
    { icon: '💼', label: '事业转折', desc: '${protagonist}面临改变命运的职业抉择' },
    { icon: '❤️', label: '感情抉择', desc: '多段感情线交汇的十字路口' },
    { icon: '🏠', label: '家庭危机', desc: '表面平静的生活突然被打破' },
    { icon: '🎭', label: '身份转换', desc: '命运的安排让主角进入全新的世界' },
  ],
  '军事': [
    { icon: '⚔️', label: '战术突袭', desc: '${protagonist}策划一场出其不意的军事行动' },
    { icon: '🤝', label: '战时外交', desc: '敌我之间出现谈判的可能性' },
    { icon: '🎖️', label: '孤军深入', desc: '一支小队执行危险的敌后任务' },
    { icon: '📡', label: '情报战', desc: '关键情报的获取将改变战局走向' },
  ],
  '演义': [
    { icon: '⚔️', label: '兵法对决', desc: '两军对垒，智谋与勇气的较量' },
    { icon: '🤝', label: '合纵连横', desc: '${protagonist}游说各方势力结盟' },
    { icon: '🏛️', label: '朝堂风云', desc: '朝堂之上的明争暗斗愈演愈烈' },
    { icon: '🐴', label: '英雄登场', desc: '一位传说中的人物横空出世' },
  ],
  '奇幻': [
    { icon: '🐉', label: '远古巨龙苏醒', desc: '沉睡千年的巨龙打破封印' },
    { icon: '🔮', label: '魔法失控', desc: '一股失控的魔法力量威胁整个世界' },
    { icon: '👑', label: '王座之争', desc: '各方势力为王位展开激烈争夺' },
    { icon: '🗡️', label: '圣器寻踪', desc: '${protagonist}踏上寻找传说圣器的旅途' },
  ],
  '现代': [
    { icon: '💼', label: '职场变故', desc: '一场突如其来的事件改变工作轨迹' },
    { icon: '❤️', label: '感情波折', desc: '亲密关系面临重大考验' },
    { icon: '🏠', label: '生活转折', desc: '人生进入一个全新的阶段' },
    { icon: '🎯', label: '自我突破', desc: '${protagonist}决定挑战自我的极限' },
  ],
  '原创': [
    { icon: '💫', label: '命运转折', desc: '一个意想不到的事件改变一切' },
    { icon: '🔀', label: '路线分歧', desc: '${protagonist}面临改变命运的选择' },
    { icon: '🤝', label: '联手抗敌', desc: '昔日的对手为共同目标合作' },
    { icon: '🔮', label: '真相揭露', desc: '隐藏已久的秘密终于浮出水面' },
  ],
  'generic': [
    { icon: '⚔️', label: '${protagonist}采取行动', desc: '让主角主动出击改变局面' },
    { icon: '🔄', label: '局势急转', desc: '意外事件打破当前格局' },
    { icon: '🤝', label: '结盟合作', desc: '寻求意想不到的盟友' },
    { icon: '🔍', label: '探索真相', desc: '隐藏的真相即将浮出水面' },
  ],
};

/**
 * 根据故事的 genre 和角色列表，返回即时可用的静态分支方向建议。
 * 模板中的 ${protagonist} / ${antagonist} / ${supporting} 会被替换为实际角色名。
 */
export function getStaticBranchDirections(
  genre: string | undefined,
  characters: Array<{ name: string; role: string }>,
): Array<{ icon: string; label: string; desc: string }> {
  const templates: BranchDirectionTemplate[] = BRANCH_DIRECTION_TEMPLATES[genre || ''] ?? BRANCH_DIRECTION_TEMPLATES['generic'];

  const protagonist = characters.find(c => c.role === 'protagonist')?.name || '主角';
  const antagonist = characters.find(c => c.role === 'antagonist')?.name || '对手';
  const supporting = characters.find(c => c.role === 'supporting')?.name || '同伴';

  return templates.map(t => ({
    icon: t.icon,
    label: t.label
      .replace(/\$\{protagonist\}/g, protagonist)
      .replace(/\$\{antagonist\}/g, antagonist)
      .replace(/\$\{supporting\}/g, supporting),
    desc: t.desc
      .replace(/\$\{protagonist\}/g, protagonist)
      .replace(/\$\{antagonist\}/g, antagonist)
      .replace(/\$\{supporting\}/g, supporting),
  }));
}
