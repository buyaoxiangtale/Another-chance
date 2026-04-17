/**
 * Cluster 4: MCP 维基百科集成 — 维基百科 API 客户端
 * 使用中文维基百科 API 检索历史事实
 */

const WIKI_API = 'https://zh.wikipedia.org/w/api.php';

export interface WikiSearchResult {
  title: string;
  snippet: string;
  url: string;
}

export interface WikiArticle {
  title: string;
  extract: string;
  url: string;
}

/**
 * 4.2 搜索维基百科文章
 */
export async function searchWikipedia(query: string, lang: string = 'zh'): Promise<WikiSearchResult[]> {
  try {
    const api = lang === 'zh' ? WIKI_API : `https://${lang}.wikipedia.org/w/api.php`;
    const url = new URL(api);
    url.searchParams.set('action', 'query');
    url.searchParams.set('list', 'search');
    url.searchParams.set('srsearch', query);
    url.searchParams.set('utf8', '1');
    url.searchParams.set('format', 'json');
    url.searchParams.set('srlimit', '5');

    const res = await fetch(url.toString(), { headers: { 'User-Agent': 'ChronosMirror/1.0' } });
    if (!res.ok) throw new Error(`Wikipedia API error: ${res.status}`);

    const data = await res.json();
    const base = `https://${lang}.wikipedia.org/wiki/`;

    return (data.query?.search || []).map((item: any) => ({
      title: item.title,
      snippet: item.snippet?.replace(/<[^>]+>/g, '') || '',
      url: base + encodeURIComponent(item.title.replace(/ /g, '_')),
    }));
  } catch (error) {
    console.error('[mcp-wikipedia] searchWikipedia failed:', error);
    return [];
  }
}

/**
 * 4.3 获取完整维基百科文章
 */
export async function getWikiArticle(title: string, lang: string = 'zh'): Promise<WikiArticle | null> {
  try {
    const api = lang === 'zh' ? WIKI_API : `https://${lang}.wikipedia.org/w/api.php`;
    const url = new URL(api);
    url.searchParams.set('action', 'query');
    url.searchParams.set('titles', title);
    url.searchParams.set('prop', 'extracts');
    url.searchParams.set('explaintext', '1');
    url.searchParams.set('exintro', '0');
    url.searchParams.set('exsectionformat', 'plain');
    url.searchParams.set('exchars', '500'); // 4.1 增加摘要长度：从默认200-300字增加到500字
    url.searchParams.set('format', 'json');

    const res = await fetch(url.toString(), { headers: { 'User-Agent': 'ChronosMirror/1.0' } });
    if (!res.ok) throw new Error(`Wikipedia API error: ${res.status}`);

    const data = await res.json();
    const pages = data.query?.pages;
    if (!pages) return null;

    const page = Object.values(pages)[0] as any;
    if (page.missing || !page.extract) return null;

    const base = `https://${lang}.wikipedia.org/wiki/`;
    return {
      title: page.title,
      extract: page.extract,
      url: base + encodeURIComponent(page.title.replace(/ /g, '_')),
    };
  } catch (error) {
    console.error('[mcp-wikipedia] getWikiArticle failed:', error);
    return null;
  }
}

/**
 * 4.4 从文本中提取历史实体（正则+关键词匹配）
 */
export function extractHistoricalEntities(text: string): Array<{ name: string; type: 'person' | 'event' | 'place' | 'artifact' }> {
  const entities: Array<{ name: string; type: 'person' | 'event' | 'place' | 'artifact' }> = [];

  // 已知历史人名关键词库（常见朝代皇帝/名人）
  const personPatterns = [
    /(?:秦始皇|汉武帝|唐太宗|宋太祖|明太祖|清圣祖|曹操|刘备|诸葛亮|关羽|张飞|赵云|李白|杜甫|苏轼|岳飞|成吉思汗|忽必烈|朱元璋|康熙|雍正|乾隆|武则天|花木兰|司马迁|班超|卫青|霍去病|王昭君|西施|杨贵妃|林黛玉|贾宝玉|孙悟空)/g,
    /[赵钱孙李周吴郑王冯陈褚卫蒋沈韩杨朱秦尤许何吕施张孔曹严华金魏陶姜戚谢邹喻柏水窦章云苏潘葛奚范彭郎鲁韦昌马苗凤花方俞任袁柳酆鲍史唐费廉岑薛雷贺倪汤殷罗毕郝邬安常乐于时傅皮卞齐康伍余元卜顾孟平黄和穆萧尹姚邵湛汪祁毛禹狄米贝明臧计伏成戴谈宋茅庞熊纪舒屈项祝董梁杜阮蓝闵席季麻强贾路娄危江童颜郭梅盛林刁钟徐邱骆高夏蔡田樊胡凌霍虞万支柯昝管卢莫经房裘缪干解应宗丁宣贲邓郁单杭洪包诸左石崔吉钮龚程嵇邢滑裴陆荣翁荀羊於惠甄曲家封芮羿储靳汲邴糜松井段富巫乌焦巴弓牧隗山谷车侯宓蓬全郗班仰秋仲伊宫宁仇栾暴甘钭厉戎祖武符刘景詹束龙叶幸司韶郜黎蓟薄印宿白怀蒲邰从鄂索咸籍赖卓蔺屠蒙池乔阴郁胥能苍双闻莘党翟谭贡劳逄姬申扶堵冉宰郦雍却璩桑桂濮牛寿通边扈燕冀郏浦尚农温别庄晏柴瞿阎充慕连茹习宦艾鱼容向古易慎戈廖庾终暨居衡步都耿满弘匡国文寇广禄阙东欧殳沃利蔚越夔隆师巩厍聂晁勾敖融冷訾辛阚那简饶空曾母沙乜养鞠须丰巢关蒯相查后荆红游竺权逯盖益桓公]/g,
  ];
  // 人名模式：2-4个汉字 + 常见后缀
  const personRegex = /([\u4e00-\u9fff]{2,4})(?:帝|王|皇|后|妃|将军|丞相|大夫|公|侯|伯|子|卿|相|将|帅|僧|道|师|祖|宗|帝)/g;

  // 4.2 N-gram 中文人名识别模式：2-3字中文 + 上下文模式匹配
  const ngramPersonRegex = /(?:[\u4e00-\u9fff]{2,3})(?:[\u4e00-\u9fff]?)(?=[^\u4e00-\u9fff]|，|。|！|？|$)/g;
  
  // N-gram 地名识别模式：常见地名特征词组合
  const ngramPlaceRegex = /(?:[\u4e00-\u9fff]{2,4})(?:[\u4e00-\u9fff]{1,2})(?:城|都|府|州|郡|关|山|水|河|湖|海|岭|原|野|漠|林|岛|镇|村|寨|堡|邑|郭|邑|洲|岛|礁|滩|湾|港|口|峡|谷|坪|原|野|漠|林|海|洋|湖|泊|河|江|渭|淮|济|沅|湘|资|澧|赣|闽|浙|苏|皖|赣|鄂|湘|川|渝|贵|云|藏|青|甘|宁|陕|晋|冀|鲁|豫|鄂|湘|赣|闽|浙|苏|皖|赣|鄂|湘|川|渝|贵|云|藏|青|甘|宁|陕|晋|冀|鲁|豫)(?=[^\u4e00-\u9fff]|，|。|！|？|$)/g;

  // 地名模式
  const placeKeywords = [
    '长安', '洛阳', '汴京', '临安', '南京', '北京', '大都', '咸阳', '邯郸', '成都',
    '荆州', '襄阳', '赤壁', '官渡', '淝水', '虎牢关', '玉门关', '阳关', '雁门关',
    '蜀道', '黄河', '长江', '渭水', '淮河', '珠江', '太湖', '洞庭湖', '鄱阳湖',
    '秦岭', '太行山', '昆仑山', '泰山', '华山', '衡山', '嵩山', '恒山',
    '中原', '塞外', '江南', '岭南', '河西', '关中', '巴蜀',
  ];
  const placeRegex = new RegExp(`(${placeKeywords.join('|')})`, 'g');

  // 事件名模式
  const eventKeywords = [
    '玄武门之变', '安史之乱', '贞观之治', '文景之治', '康乾盛世', '靖康之耻',
    '黄巢起义', '陈胜吴广起义', '赤壁之战', '官渡之战', '淝水之战', '巨鹿之战',
    '楚汉之争', '三国鼎立', '五胡乱华', '王安石变法', '商鞅变法', '张居正改革',
    '焚书坑儒', '独尊儒术', '科举制', '贞观之治', '开元盛世', '靖难之役',
    '土木堡之变', '郑和下西洋', '鸦片战争', '甲午战争', '辛亥革命', '五四运动',
  ];
  const eventRegex = new RegExp(`(${eventKeywords.join('|')})`, 'g');

  // 器物名模式
  const artifactKeywords = [
    '青铜器', '甲骨文', '司母戊鼎', '四羊方尊', '马踏飞燕', '兵马俑',
    '玉璧', '玉玺', '传国玉玺', '青铜剑', '越王勾践剑', '长信宫灯',
    '清明上河图', '兰亭序', '洛神赋', '丝路', '丝绸之路', '青花瓷',
    '司南', '火药', '造纸术', '活字印刷', '指南针', '浑天仪', '地动仪',
  ];
  const artifactRegex = new RegExp(`(${artifactKeywords.join('|')})`, 'g');

  const seen = new Set<string>();

  // 提取人名
  for (const pattern of personPatterns) {
    let m;
    while ((m = pattern.exec(text)) !== null) {
      if (!seen.has(m[0])) { seen.add(m[0]); entities.push({ name: m[0], type: 'person' }); }
    }
  }
  let m;
  while ((m = personRegex.exec(text)) !== null) {
    const name = m[1] + m[2];
    if (!seen.has(name)) { seen.add(name); entities.push({ name, type: 'person' }); }
  }

  // 4.2 使用 N-gram 模式提取人名
  while ((m = ngramPersonRegex.exec(text)) !== null) {
    const name = m[0].trim();
    // 过滤掉太短或太长的名字，且需要是纯汉字
    if (name.length >= 2 && name.length <= 4 && /^[\u4e00-\u9fff]+$/.test(name)) {
      // 检查上下文，确保是一个独立的人名
      const context = text.substring(Math.max(0, m.index - 20), Math.min(text.length, m.index + name.length + 20));
      if (context.includes('说') || context.includes('叫') || context.includes('是') || context.includes('人名') || context.includes('人物')) {
        if (!seen.has(name)) { seen.add(name); entities.push({ name, type: 'person' }); }
      }
    }
  }

  // 4.2 使用 N-gram 模式提取地名
  while ((m = ngramPlaceRegex.exec(text)) !== null) {
    const name = m[0].trim();
    if (name.length >= 2 && name.length <= 6) {
      if (!seen.has(name)) { seen.add(name); entities.push({ name, type: 'place' }); }
    }
  }

  // 提取地名
  while ((m = placeRegex.exec(text)) !== null) {
    if (!seen.has(m[1])) { seen.add(m[1]); entities.push({ name: m[1], type: 'place' }); }
  }

  // 提取事件名
  while ((m = eventRegex.exec(text)) !== null) {
    if (!seen.has(m[1])) { seen.add(m[1]); entities.push({ name: m[1], type: 'event' }); }
  }

  // 提取器物名
  while ((m = artifactRegex.exec(text)) !== null) {
    if (!seen.has(m[1])) { seen.add(m[1]); entities.push({ name: m[1], type: 'artifact' }); }
  }

  return entities;
}

/**
 * 故事上下文，用于智能判断搜索偏好
 */
export interface StoryContext {
  genre?: string;    // 故事类型：正史、演义、架空、同人、玄幻等
  era?: string;      // 朝代/时代
  description?: string; // 故事简介（可选，用于更精确判断）
}

/**
 * 判断故事是否偏向虚构作品（演义/架空/同人等）
 * 返回 true 表示优先搜正史，false 表示保留虚构词条
 */
export function shouldPreferHistory(ctx?: StoryContext): boolean {
  if (!ctx?.genre) return true; // 默认优先正史

  const fictionKeywords = ['演义', '架空', '同人', '玄幻', '仙侠', '魔幻', '穿越', '重生', '武侠', '架空历史', '奇幻', '轻小说', '网文'];
  const isFiction = fictionKeywords.some(k => ctx.genre && ctx.genre.includes(k));

  if (isFiction) return false;

  // 即使是"正史"类型，如果描述中明确提到某部小说/影视，也标记下来
  if (ctx.description) {
    const fictionWorkKeywords = ['三国演义', '水浒传', '西游记', '红楼梦', '封神演义', '隋唐演义', '说岳全传', '东周列国志'];
    const referencesFiction = fictionWorkKeywords.some(k => ctx.description && ctx.description.includes(k));
    if (referencesFiction) return false;
  }

  return true;
}

/**
 * 根据实体类型和故事上下文构建搜索关键词
 */
export function buildSearchQuery(entity: { name: string; type: string }, era?: string, ctx?: StoryContext): string {
  const preferHistory = shouldPreferHistory(ctx);

  switch (entity.type) {
    case 'person':
      // 正史模式：直接搜人名
      // 虚构模式：不加限定，让维基返回最相关的结果（可能含小说人物）
      return entity.name;
    case 'event':
      return `${entity.name} ${era || ''}`;
    case 'place':
      return `${entity.name} ${era || ''}`;
    case 'artifact':
      return entity.name;
    default:
      return entity.name;
  }
}

/**
 * 过滤维基百科搜索结果
 * preferHistory=true 时过滤掉影视/小说词条
 * preferHistory=false 时保留所有结果
 */
const MEDIA_KEYWORDS = ['电影', '电视剧', '游戏', '动漫', '漫画', '电视节目', '专辑', '歌曲', '舞台剧', '音乐剧'];

export function filterResults(results: WikiSearchResult[], preferHistory: boolean): WikiSearchResult[] {
  if (!preferHistory) return results;

  // 正史模式：过滤掉非历史词条
  const filtered = results.filter(r =>
    !MEDIA_KEYWORDS.some(k => r.snippet.includes(k))
  );
  return filtered.length > 0 ? filtered : results;
}

/**
 * 4.5 批量查询实体的历史准确性，返回事实锚点列表
 */
export async function factCheckEntities(
  entities: Array<{ name: string; type: string }>,
  era?: string,
  ctx?: StoryContext
): Promise<Array<{ name: string; type: string; summary: string; url?: string; confidence: number }>> {
  const preferHistory = shouldPreferHistory(ctx);
  const results: Array<{ name: string; type: string; summary: string; url?: string; confidence: number }> = [];

  // 并发查询（限制并发数避免过载）
  const batchSize = 3;
  for (let i = 0; i < entities.length; i += batchSize) {
    const batch = entities.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (entity) => {
        const query = buildSearchQuery(entity, era, ctx);
        let searchResults = await searchWikipedia(query);
        searchResults = filterResults(searchResults, preferHistory);

        // 4.3 当中文搜索结果不足时，自动用英文维基百科补充查询
        if (searchResults.length === 0 || (searchResults.length === 1 && searchResults[0].snippet.length < 50)) {
          const englishQuery = buildSearchQuery(entity, era, { ...ctx, genre: ctx?.genre ? 'en' : ctx?.genre });
          const englishResults = await searchWikipedia(englishQuery, 'en');
          if (englishResults.length > 0) {
            const article = await getWikiArticle(englishResults[0].title, 'en');
            const extract = article?.extract || englishResults[0].snippet;
            const summary = extract.length > 300 ? extract.slice(0, 300) + '...' : extract;

            return {
              ...entity,
              summary,
              url: article?.url || englishResults[0].url,
              confidence: 0.6, // 英文结果置信度略低
            };
          }
        }

        if (searchResults.length === 0) {
          return { ...entity, summary: '', url: undefined, confidence: 0 };
        }

        // 取第一个过滤后的结果
        const article = await getWikiArticle(searchResults[0].title);
        const extract = article?.extract || searchResults[0].snippet;
        // 截取前500字作为摘要（4.1 已增加到500字）
        const summary = extract.length > 500 ? extract.slice(0, 500) + '...' : extract;

        return {
          ...entity,
          summary,
          url: article?.url || searchResults[0].url,
          confidence: summary ? 0.8 : 0.3,
        };
      })
    );
    results.push(...batchResults);
  }

  return results;
}
