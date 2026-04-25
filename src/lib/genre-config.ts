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

/** 首页故事分类 Tab（用于故事列表筛选，key 对应 Story.storyType 字段） */
export const STORY_CATEGORY_TABS = [
  { key: 'all', label: '全部' },
  { key: 'history', label: '历史' },
  { key: 'fantasy', label: '幻想' },
  { key: 'mystery', label: '悬疑' },
  { key: 'fanfic', label: '同人' },
] as const;

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
