/**
 * D1: 同人 IP 参考图搜索管线
 *
 * 功能：
 * - 根据故事 genre / description 检测同人 IP
 * - 分层搜索策略：本地 JSON 缓存 → Serper.dev 图片搜索 → Fandom Wiki MediaWiki API
 * - 下载并缓存参考图到 public/reference-images/
 * - 导出供 images/generate/route.ts 和 image-generator.ts 使用
 */

import { join } from 'path';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';

// ─── 配置 ───────────────────────────────────────────────────────────

const REF_CACHE_DIR = join(process.cwd(), 'public', 'reference-images');
const REF_META_FILE = join(process.cwd(), 'data', 'reference-images-cache.json');
const ENABLED = (process.env.ENABLE_REFERENCE_IMAGE_SEARCH || 'true') === 'true';
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const MAX_IMAGES_PER_IP = 20;
const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB
const SERPER_API_KEY = process.env.SERPER_API_KEY || '';
const SERPER_ENDPOINT = 'https://google.serper.dev/images';

/** 参考图提示信息 */
export interface ReferenceImageHint {
  /** 角色名（可选，若为群像则留空） */
  characterName?: string;
  /** 本地缓存路径（public/... 开头的相对 URL） */
  localPath: string;
  /** 来源 URL */
  sourceUrl: string;
  /** 关联的 IP 名 */
  fandomName: string;
}

// ─── Fandom Wiki 子域名映射 ────────────────────────────────────────

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
  'attack on titan': 'attackontitan',
  'my hero academia': 'bokunoheroacademia',
  'sailor moon': 'sailormoon',
  'one punch man': 'onepunchman',
  'jujutsu kaisen': 'jujutsu-kaisen',
  'spy x family': 'spy-x-family',
  'chainsaw man': 'chainsaw-man',
  'frieren': 'frieren',
};

// ─── 本地缓存读写 ───────────────────────────────────────────────────

interface CacheEntry {
  fandomName: string;
  images: ReferenceImageHint[];
  fetchedAt: number;
}

async function readCache(): Promise<CacheEntry[]> {
  try {
    if (!existsSync(REF_META_FILE)) return [];
    const raw = await readFile(REF_META_FILE, 'utf-8');
    return JSON.parse(raw) as CacheEntry[];
  } catch {
    return [];
  }
}

async function writeCache(entries: CacheEntry[]): Promise<void> {
  const dir = join(process.cwd(), 'data');
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });
  await writeFile(REF_META_FILE, JSON.stringify(entries, null, 2));
}

async function ensureCacheDir(): Promise<void> {
  if (!existsSync(REF_CACHE_DIR)) {
    await mkdir(REF_CACHE_DIR, { recursive: true });
  }
}

// ─── IP 检测 ──────────────────────────────────────────────────────

/**
 * 从 genre/description 检测同人 IP 名称
 */
export function detectFandomIP(genre: string, description: string): string | null {
  if (!genre?.includes('同人') && !description?.includes('同人')) return null;

  // 尝试从 description 中提取 IP 名
  const ipPatterns = [
    /《(.{2,30})》/,
    /「(.{2,30})」/,
    /【(.{2,30})】/,
    /(?:同人|二创|同人创作)[：:]\s*(.{2,30}?)(?:\s|,|，|。|$)/,
  ];

  for (const pat of ipPatterns) {
    const m = description.match(pat);
    if (m && m[1]) return m[1].trim();
  }

  return null;
}

// ─── 搜索策略 1: Serper.dev 图片搜索 ────────────────────────────────

async function searchSerper(query: string): Promise<Array<{ title: string; imageUrl: string }>> {
  if (!SERPER_API_KEY) return [];

  try {
    const resp = await fetch(SERPER_ENDPOINT, {
      method: 'POST',
      headers: {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: query,
        num: 10,
        gl: 'us',
        hl: 'en',
      }),
    });

    if (!resp.ok) return [];
    const data = await resp.json();
    const images = data.images || data.organic || [];
    return images
      .filter((img: any) => img.imageUrl || img.link)
      .slice(0, MAX_IMAGES_PER_IP)
      .map((img: any) => ({
        title: img.title || '',
        imageUrl: img.imageUrl || img.link || '',
      }));
  } catch (e) {
    console.warn('[reference-image-search] Serper search failed:', e);
    return [];
  }
}

// ─── 搜索策略 2: Fandom Wiki MediaWiki API ──────────────────────────

async function searchFandomWiki(
  fandomNameEn: string,
  characters?: string[],
): Promise<Array<{ title: string; imageUrl: string }>> {
  const wikiSubdomain = WIKI_ID_MAP[fandomNameEn.toLowerCase()];
  if (!wikiSubdomain) return [];

  const baseUrl = `https://${wikiSubdomain}.fandom.com`;
  const results: Array<{ title: string; imageUrl: string }> = [];

  try {
    // Search for character pages
    const searchTerms = characters?.slice(0, 5) || [];
    if (searchTerms.length === 0) return [];

    for (const term of searchTerms) {
      // Step 1: Search for the page
      const searchUrl = `${baseUrl}/api.php?action=query&list=search&srsearch=${encodeURIComponent(term)}&format=json&origin=*`;
      const searchResp = await fetch(searchUrl, { signal: AbortSignal.timeout(8000) });
      if (!searchResp.ok) continue;
      const searchData = await searchResp.json();
      const pageId = searchData.query?.search?.[0]?.pageid;
      if (!pageId) continue;

      // Step 2: Get the page image
      const imgUrl = `${baseUrl}/api.php?action=query&pageids=${pageId}&prop=pageimages&piprop=original&format=json&origin=*`;
      const imgResp = await fetch(imgUrl, { signal: AbortSignal.timeout(8000) });
      if (!imgResp.ok) continue;
      const imgData = await imgResp.json();
      const source = imgData.query?.pages?.[pageId]?.original?.source;
      if (source) {
        results.push({ title: term, imageUrl: source });
      }
    }
  } catch (e) {
    console.warn('[reference-image-search] Fandom Wiki search failed:', e);
  }

  return results.slice(0, MAX_IMAGES_PER_IP);
}

// ─── 下载 & 缓存图片 ────────────────────────────────────────────────

async function downloadAndCache(
  imageUrl: string,
  fandomName: string,
  index: number,
): Promise<string | null> {
  try {
    const resp = await fetch(imageUrl, {
      signal: AbortSignal.timeout(15000),
      headers: { 'User-Agent': 'GushiStoryPlatform/1.0' },
    });
    if (!resp.ok) return null;

    const contentType = resp.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) return null;

    const buffer = Buffer.from(await resp.arrayBuffer());
    if (buffer.length > MAX_IMAGE_SIZE) return null;

    const ext = contentType.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
    const safeName = fandomName.replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, '_').slice(0, 30);
    const filename = `ref_${safeName}_${index}_${Date.now()}.${ext}`;

    await ensureCacheDir();
    await writeFile(join(REF_CACHE_DIR, filename), buffer);
    return `/reference-images/${filename}`;
  } catch (e) {
    console.warn('[reference-image-search] Download failed:', e);
    return null;
  }
}

// ─── 主入口 ────────────────────────────────────────────────────────


/**
 * 获取缓存的参考图（不触发搜索）
 * 直接通过 fandomName 查找（由 images/generate/route.ts 传入 worldVariables.fandom_name）
 */
export async function getCachedReferenceImages(fandomName: string): Promise<ReferenceImageHint[]> {
  if (!ENABLED || !fandomName) return [];
  const cache = await readCache();
  const cached = cache.find(c => c.fandomName === fandomName && Date.now() - c.fetchedAt < CACHE_TTL_MS);
  return cached?.images || [];
}

/**
 * 搜索同人 IP 参考图（直接传入 fandom 信息，由 images/generate/route.ts 调用）
 */
export async function searchReferenceImages(
  fandomName: string,
  fandomNameEn: string,
  characters: string[] = [],
): Promise<ReferenceImageHint[]> {
  if (!ENABLED || !fandomName) return [];

  // Check local cache first
  const cache = await readCache();
  const cached = cache.find(c => c.fandomName === fandomName && Date.now() - c.fetchedAt < CACHE_TTL_MS);
  if (cached) return cached.images;

  const results: ReferenceImageHint[] = [];
  let downloadedIndex = 0;

  // Strategy 1: Serper.dev image search
  const serperQuery = `${fandomName} official artwork character design`;
  const serperResults = await searchSerper(serperQuery);
  for (const img of serperResults.slice(0, 6)) {
    const localPath = await downloadAndCache(img.imageUrl, fandomName, downloadedIndex);
    if (localPath) {
      results.push({
        characterName: undefined,
        localPath,
        sourceUrl: img.imageUrl,
        fandomName,
      });
      downloadedIndex++;
    }
  }

  // Strategy 2: Fandom Wiki
  if (fandomNameEn || WIKI_ID_MAP[fandomName.toLowerCase()]) {
    const wikiName = fandomNameEn || WIKI_ID_MAP[fandomName.toLowerCase()] || '';
    const wikiResults = await searchFandomWiki(wikiName, characters);
    for (const img of wikiResults) {
      const localPath = await downloadAndCache(img.imageUrl, fandomName, downloadedIndex);
      if (localPath) {
        results.push({
          characterName: img.title,
          localPath,
          sourceUrl: img.imageUrl,
          fandomName,
        });
        downloadedIndex++;
      }
    }
  }

  // Update cache
  if (results.length > 0) {
    const newEntry: CacheEntry = { fandomName, images: results, fetchedAt: Date.now() };
    const updatedCache = cache.filter(c => c.fandomName !== fandomName);
    updatedCache.push(newEntry);
    await writeCache(updatedCache);
  }

  console.log(`[reference-image-search] Found ${results.length} reference images for "${fandomName}"`);
  return results;
}
