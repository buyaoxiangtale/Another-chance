/**
 * D1: 同人 IP 参考图搜索模块
 *
 * 分层搜索策略：
 * 1. 本地 JSON 缓存（零延迟）
 * 2. Serper.dev 图片搜索（复用已有 API Key）
 * 3. Fandom Wiki MediaWiki API（免费、权威）
 * 4. LLM 文字外观兜底（现有逻辑，不改变）
 */

import { webSearch, hasExplicitWebSearch } from './web-search';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';

// ─── 类型定义 ────────────────────────────────────────────────────

export interface ReferenceImage {
  /** 本地缓存路径（如 /reference-images/naruto/obito_abc123.webp） */
  localPath: string;
  /** 原始 URL */
  sourceUrl: string;
  /** 关联角色名 */
  characterName?: string;
  /** IP 名称 */
  fandomName: string;
  /** 缓存时间 ISO */
  cachedAt: string;
  /** 图片尺寸（字节） */
  size: number;
}

export interface ReferenceImageHint {
  localPath: string;
  characterName?: string;
}

export interface FandomImageCache {
  fandomName: string;
  fandomNameEn: string;
  images: ReferenceImage[];
  searchedAt: string;
}

// ─── 配置 ─────────────────────────────────────────────────────────

const REF_DIR = join(process.cwd(), 'public', 'reference-images');
const CACHE_INDEX_FILE = join(process.cwd(), 'data', 'reference-image-cache.json');
const MAX_IMAGES_PER_IP = 20;
const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB
const CACHE_TTL_DAYS = 30;

/** 是否启用参考图搜索（需显式配置环境变量） */
function isEnabled(): boolean {
  return (process.env.ENABLE_REFERENCE_IMAGE_SEARCH || '').toLowerCase() === 'true';
}

// ─── 核心搜索接口 ─────────────────────────────────────────────────

/**
 * 为指定同人 IP 搜索角色参考图。
 * 优先从本地缓存读取，缓存未命中或过期时在线搜索。
 */
export async function searchReferenceImages(
  fandomName: string,
  fandomNameEn: string,
  characterNames: string[] = [],
): Promise<ReferenceImage[]> {
  if (!isEnabled()) return [];

  // 1. 检查本地缓存
  const cached = await loadCacheIndex();
  const key = fandomName;
  const entry = cached[key];
  if (entry && !isExpired(entry.searchedAt)) {
    return filterByCharacters(entry.images, characterNames);
  }

  // 2. 在线搜索
  const newImages = await doOnlineSearch(fandomName, fandomNameEn, characterNames);
  if (newImages.length === 0) return [];

  // 3. 下载并缓存
  const downloaded: ReferenceImage[] = [];
  for (const img of newImages.slice(0, MAX_IMAGES_PER_IP)) {
    try {
      const local = await downloadAndCache(img, fandomName);
      if (local) downloaded.push(local);
    } catch {
      // 单张失败不阻塞
    }
  }

  // 4. 更新索引
  cached[key] = {
    fandomName,
    fandomNameEn,
    images: downloaded,
    searchedAt: new Date().toISOString(),
  };
  await saveCacheIndex(cached);

  return filterByCharacters(downloaded, characterNames);
}

/**
 * 获取指定 IP 的全部已缓存参考图（不触发在线搜索）
 */
export async function getCachedReferenceImages(
  fandomName: string,
): Promise<ReferenceImage[]> {
  if (!isEnabled()) return [];
  const cached = await loadCacheIndex();
  const entry = cached[fandomName];
  if (!entry) return [];
  if (isExpired(entry.searchedAt)) return [];
  return entry.images;
}

// ─── 搜索策略（分层） ─────────────────────────────────────────────

async function doOnlineSearch(
  fandomName: string,
  fandomNameEn: string,
  characterNames: string[],
): Promise<Array<{ url: string; characterName?: string }>> {
  const results: Array<{ url: string; characterName?: string }> = [];

  // 层1: Serper.dev 图片搜索（如果已配置）
  if (hasExplicitWebSearch()) {
    const serperResults = await searchViaSerper(fandomName, fandomNameEn, characterNames);
    results.push(...serperResults);
  }

  // 层2: Fandom Wiki MediaWiki API
  if (results.length < 10) {
    const wikiResults = await searchViaFandomWiki(fandomNameEn);
    results.push(...wikiResults);
  }

  return results;
}

/**
 * 层1: 通过 Serper.dev 搜索角色参考图
 */
async function searchViaSerper(
  fandomName: string,
  fandomNameEn: string,
  characterNames: string[],
): Promise<Array<{ url: string; characterName?: string }>> {
  const results: Array<{ url: string; characterName?: string }> = [];

  // 按角色名分别搜索，每个角色最多 2 张
  for (const charName of characterNames.slice(0, 8)) {
    const query = `${fandomNameEn} ${charName} official art character design`;
    try {
      const searchResults = await webSearch(query, {
        maxResults: 3,
      });
      for (const r of searchResults) {
        if (/\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(r.url)) {
          results.push({ url: r.url, characterName: charName });
        }
      }
    } catch {
      // 单角色搜索失败跳过
    }
  }

  // 搜一张作品总体角色图
  if (results.length < 3) {
    try {
      const generalResults = await webSearch(
        `${fandomNameEn} main characters official artwork`,
        { maxResults: 3 },
      );
      for (const r of generalResults) {
        if (/\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(r.url)) {
          results.push({ url: r.url });
        }
      }
    } catch {}
  }

  return results;
}

/**
 * 层2: 通过 Fandom Wiki MediaWiki API 获取角色图片
 */
async function searchViaFandomWiki(
  fandomNameEn: string,
): Promise<Array<{ url: string; characterName?: string }>> {
  const wikiId = fandomNameToWikiId(fandomNameEn);
  if (!wikiId) return [];

  const results: Array<{ url: string; characterName?: string }> = [];
  const baseUrl = `https://${wikiId}.fandom.com`;

  try {
    // 获取主要角色分类下的页面列表
    const listUrl = `${baseUrl}/api.php?action=query&list=categorymembers&cmtitle=Category:Characters&cmlimit=20&format=json`;
    const resp = await fetch(listUrl, {
      headers: { 'User-Agent': 'GushiStoryBot/1.0 (fanfiction reference image search)' },
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) return [];
    const data = await resp.json();
    const pages = data?.query?.categorymembers || [];

    // 批量获取页面缩略图
    const pageIds = pages.map((p: any) => p.title).slice(0, 15);
    if (pageIds.length === 0) return [];

    const titles = pageIds.map(encodeURIComponent).join('|');
    const imgUrl = `${baseUrl}/api.php?action=query&titles=${titles}&prop=pageimages&format=json&pithumbsize=500`;
    const imgResp = await fetch(imgUrl, {
      headers: { 'User-Agent': 'GushiStoryBot/1.0' },
      signal: AbortSignal.timeout(8000),
    });
    if (!imgResp.ok) return [];

    const imgData = await imgResp.json();
    const pagesMap = imgData?.query?.pages || {};

    for (const [, page] of Object.entries(pagesMap as Record<string, any>)) {
      if (page.thumbnail?.source) {
        const charName = (page.title || '').replace(/_/g, ' ');
        results.push({ url: page.thumbnail.source, characterName: charName });
      }
    }
  } catch {
    // Fandom Wiki 抓取失败，静默降级
  }

  return results;
}

// ─── 下载与缓存 ────────────────────────────────────────────────────

async function downloadAndCache(
  img: { url: string; characterName?: string },
  fandomName: string,
): Promise<ReferenceImage | null> {
  try {
    const resp = await fetch(img.url, {
      headers: { 'User-Agent': 'GushiStoryBot/1.0' },
      signal: AbortSignal.timeout(15000),
    });
    if (!resp.ok) return null;

    const contentType = resp.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) return null;

    const buffer = Buffer.from(await resp.arrayBuffer());
    if (buffer.length > MAX_IMAGE_SIZE) return null;

    const ext = contentType.includes('webp') ? 'webp'
      : contentType.includes('png') ? 'png'
      : contentType.includes('gif') ? 'gif' : 'jpg';

    const fandomDir = fandomName.replace(/[^\w\u4e00-\u9fff]/g, '_');
    const urlHash = createHash('md5').update(img.url).digest('hex').slice(0, 8);
    const charPart = img.characterName
      ? img.characterName.replace(/[^\w]/g, '_').slice(0, 30)
      : 'group';
    const filename = `${charPart}_${urlHash}.${ext}`;

    const dir = join(REF_DIR, fandomDir);
    if (!existsSync(dir)) await mkdir(dir, { recursive: true });

    const filepath = join(dir, filename);
    await writeFile(filepath, buffer);

    return {
      localPath: `/reference-images/${fandomDir}/${filename}`,
      sourceUrl: img.url,
      characterName: img.characterName,
      fandomName,
      cachedAt: new Date().toISOString(),
      size: buffer.length,
    };
  } catch {
    return null;
  }
}

// ─── 缓存索引管理 ──────────────────────────────────────────────────

async function loadCacheIndex(): Promise<Record<string, FandomImageCache>> {
  try {
    const data = await readFile(CACHE_INDEX_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

async function saveCacheIndex(data: Record<string, FandomImageCache>): Promise<void> {
  const dir = join(CACHE_INDEX_FILE, '..');
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });
  await writeFile(CACHE_INDEX_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function isExpired(isoDate: string): boolean {
  const age = Date.now() - new Date(isoDate).getTime();
  return age > CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;
}

function filterByCharacters(
  images: ReferenceImage[],
  characterNames: string[],
): ReferenceImage[] {
  if (characterNames.length === 0) return images;
  const nameSet = new Set(characterNames.map(n => n.toLowerCase()));
  return images.filter(img =>
    !img.characterName || nameSet.has(img.characterName.toLowerCase()),
  );
}

// ─── 辅助函数 ──────────────────────────────────────────────────────

/** 常见同人 IP 英文名 -> Fandom Wiki 子域名映射 */
const WIKI_ID_MAP: Record<string, string> = {
  'naruto': 'naruto',
  'one piece': 'onepiece',
  'dragon ball': 'dragonball',
  'bleach': 'bleach',
  'detective conan': 'detectiveconan',
  'harry potter': 'harrypotter',
  'marvel': 'marvel',
  'dc': 'dc',
  'genshin impact': 'genshin-impact',
  'demon slayer': 'kimetsu-no-yaiba',
  'jujutsu kaisen': 'jujutsu-kaisen',
  'attack on titan': 'attackontitan',
  'my hero academia': 'myheroacademia',
  'spy x family': 'spy-x-family',
  'chainsaw man': 'chainsaw-man',
  'fullmetal alchemist': 'fma',
  'sword art online': 'swordartonline',
  'three-body': 'three-body-problem',
  'the three-body problem': 'three-body-problem',
};

function fandomNameToWikiId(fandomNameEn: string): string | null {
  const key = (fandomNameEn || '').toLowerCase().trim();
  return WIKI_ID_MAP[key] || null;
}
