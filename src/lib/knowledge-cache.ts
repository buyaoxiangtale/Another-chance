/**
 * Cluster 4: 知识缓存层 — 本地 JSON 缓存维基百科查询结果
 */

import fs from 'fs/promises';
import path from 'path';

const CACHE_FILE = path.join(process.cwd(), 'data', 'knowledge-cache.json');

interface CacheEntry {
  query: string;
  type: 'search' | 'article' | 'factcheck';
  result: any;
  cachedAt: string;
  ttl: number; // ms
}

interface KnowledgeCache {
  entries: CacheEntry[];
}

const DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24小时

async function loadCache(): Promise<KnowledgeCache> {
  try {
    const data = await fs.readFile(CACHE_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return { entries: [] };
  }
}

async function saveCache(cache: KnowledgeCache): Promise<void> {
  const dir = path.dirname(CACHE_FILE);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf-8');
}

function cleanExpired(cache: KnowledgeCache): void {
  const now = Date.now();
  cache.entries = cache.entries.filter(e => now - new Date(e.cachedAt).getTime() < e.ttl);
}

/**
 * 从缓存获取
 */
export async function getCached<T>(query: string, type: 'search' | 'article' | 'factcheck'): Promise<T | null> {
  try {
    const cache = await loadCache();
    cleanExpired(cache);
    const entry = cache.entries.find(e => e.query === query && e.type === type);
    return entry ? (entry.result as T) : null;
  } catch {
    return null;
  }
}

/**
 * 写入缓存
 */
export async function setCache(query: string, type: 'search' | 'article' | 'factcheck', result: any, ttl: number = DEFAULT_TTL): Promise<void> {
  try {
    const cache = await loadCache();
    cleanExpired(cache);
    // 移除旧条目
    cache.entries = cache.entries.filter(e => !(e.query === query && e.type === type));
    cache.entries.push({ query, type, result, cachedAt: new Date().toISOString(), ttl });
    // 限制缓存大小
    if (cache.entries.length > 500) {
      cache.entries = cache.entries.slice(-500);
    }
    await saveCache(cache);
  } catch (error) {
    console.error('[knowledge-cache] setCache failed:', error);
  }
}

/**
 * 4.7 enrichPromptWithFacts — 在 AI prompt 中注入事实锚点
 */
export async function enrichPromptWithFacts(
  prompt: string,
  entities: Array<{ name: string; type: string }>
): Promise<string> {
  const { searchWikipedia, getWikiArticle } = await import('./mcp-wikipedia');

  const factLines: string[] = [];

  for (const entity of entities) {
    // 先查缓存
    const cached = await getCached(`fact:${entity.name}`, 'factcheck');
    if (cached) {
      factLines.push(formatFact((cached as any).name, (cached as any).summary));
      continue;
    }

    const results = await searchWikipedia(`${entity.name} 历史`);
    if (results.length > 0) {
      const article = await getWikiArticle(results[0].title);
      const extract = article?.extract || results[0].snippet;
      const summary = extract.length > 200 ? extract.slice(0, 200) + '...' : extract;

      await setCache(`fact:${entity.name}`, 'factcheck', { name: entity.name, summary });
      factLines.push(formatFact(entity.name, summary));
    }
  }

  if (factLines.length === 0) return prompt;

  const factBlock = `\n\n--- 历史事实参考 ---\n${factLines.join('\n')}\n--- 参考结束 ---\n\n`;
  // 注入到 prompt 开头
  return factBlock + prompt;
}

function formatFact(name: string, summary: string): string {
  return `【历史事实】${name}：${summary}`;
}
