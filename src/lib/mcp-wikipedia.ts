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
 * 4.5 批量查询实体的历史准确性，返回事实锚点列表
 */
export async function factCheckEntities(
  entities: Array<{ name: string; type: string }>,
  era?: string
): Promise<Array<{ name: string; type: string; summary: string; url?: string; confidence: number }>> {
  const results: Array<{ name: string; type: string; summary: string; url?: string; confidence: number }> = [];

  // 并发查询（限制并发数避免过载）
  const batchSize = 3;
  for (let i = 0; i < entities.length; i += batchSize) {
    const batch = entities.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (entity) => {
        const searchResults = await searchWikipedia(`${entity.name} ${era || ''} 历史`);
        if (searchResults.length === 0) {
          return { ...entity, summary: '', url: undefined, confidence: 0 };
        }

        // 取第一个结果的详细内容
        const article = await getWikiArticle(searchResults[0].title);
        const extract = article?.extract || searchResults[0].snippet;
        // 截取前300字作为摘要
        const summary = extract.length > 300 ? extract.slice(0, 300) + '...' : extract;

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
