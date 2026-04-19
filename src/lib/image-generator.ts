/**
 * 文生图核心模块 (P6-2)
 *
 * 功能：
 * - 调用 OpenAI-compatible 图片生成 API（DALL-E / 硅基流动 / 通义万相等）
 * - 从段落内容提取 1-3 个场景描述作为 prompt
 * - 支持中国历史风格 prompt 模板（历史写实、水墨画、工笔画、敦煌壁画）
 * - 重试 & 降级机制（失败返回占位图，不阻塞主流程）
 * - 图片本地缓存（保存到 public/generated-images/）
 */

import { join } from 'path';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';

// ─── 配置 ───────────────────────────────────────────────────────────

/** 图片生成提供商配置 */
export interface ImageGeneratorConfig {
  /** 提供商标识：openai / siliconflow / tongyi / custom */
  provider: string;
  /** API Key */
  apiKey: string;
  /** 模型名（如 dall-e-3、Kolors 等） */
  model: string;
  /** API Base URL */
  baseUrl: string;
}

/** 图片风格 */
export type ImageStyle =
  | 'historical-realistic'   // 历史写实
  | 'ink-wash'               // 水墨画
  | 'gongbi'                 // 工笔画
  | 'dunhuang-mural';        // 敦煌壁画

/** 所有可选风格 */
export const IMAGE_STYLES: { value: ImageStyle; label: string }[] = [
  { value: 'historical-realistic', label: '历史写实' },
  { value: 'ink-wash', label: '水墨画' },
  { value: 'gongbi', label: '工笔画' },
  { value: 'dunhuang-mural', label: '敦煌壁画' },
];

/** 场景描述提取结果 */
export interface SceneDescription {
  /** 英文 prompt（发给图片 API） */
  prompt: string;
  /** 中文描述（用于前端展示） */
  description: string;
  /** 场景类型 */
  type: 'scene' | 'character' | 'object';
}

/** 图片生成结果 */
export interface GeneratedImage {
  /** 本地相对路径（如 /generated-images/xxx.png） */
  url: string;
  /** 场景描述 */
  description: string;
  /** 场景类型 */
  type: 'scene' | 'character' | 'object';
  /** 原始 prompt */
  prompt: string;
}

// ─── 2.3 中国历史风格 Prompt 模板 ─────────────────────────────────────

const STYLE_TEMPLATES: Record<ImageStyle, string> = {
  'historical-realistic':
    'Chinese historical realistic painting style, highly detailed, accurate ancient Chinese architecture and costumes, warm oil-paint lighting, cinematic composition',

  'ink-wash':
    'Traditional Chinese ink wash painting (水墨画), elegant brush strokes, monochrome with subtle color accents, vast negative space, poetic atmosphere',

  'gongbi':
    'Chinese Gongbi (工笔画) fine brush painting style, meticulous detail, rich mineral pigments, gold leaf accents, courtly elegance, precise linework',

  'dunhuang-mural':
    'Dunhuang Mogao cave mural painting style, Buddhist art, flowing celestial robes, mineral pigments, oxidized earth tones, devotional atmosphere, Silk Road aesthetics',
};

// ─── 环境变量读取 ─────────────────────────────────────────────────────

function getConfig(): ImageGeneratorConfig {
  return {
    provider: process.env.AI_IMAGE_PROVIDER || 'openai',
    apiKey: process.env.AI_IMAGE_API_KEY || '',
    model: process.env.AI_IMAGE_MODEL || 'dall-e-3',
    baseUrl: process.env.AI_IMAGE_BASE_URL || 'https://api.openai.com/v1',
  };
}

// ─── 2.2 场景描述提取器 ───────────────────────────────────────────────

/**
 * 从段落内容提取 1-3 个场景描述作为图片 prompt。
 * 策略：按标点分段，选取最富视觉意象的句子，然后翻译为英文 prompt。
 */
export function extractSceneDescriptions(segment: string): SceneDescription[] {
  // 按句号、感叹号、问号、换行分段，过滤过短的片段
  const sentences = segment
    .split(/[。！？\n]+/)
    .map(s => s.trim())
    .filter(s => s.length >= 10);

  if (sentences.length === 0) return [];

  // 简单启发式：给每个句子打视觉意象分
  const visualKeywords = [
    // 景物
    '山', '水', '河', '湖', '海', '天', '月', '日', '星', '云', '雨', '雪', '风', '花', '树', '林', '城', '墙', '宫', '殿', '楼', '亭', '桥', '路', '街',
    // 动作 / 事件
    '战', '斗', '杀', '射', '骑', '跑', '走', '坐', '立', '跪', '拜', '舞', '唱', '奏', '饮', '食',
    // 氛围
    '血', '火', '光', '暗', '烟', '尘', '影', '色', '声', '红', '黑', '白', '金', '银',
    // 人物相关
    '帝', '王', '将', '臣', '兵', '军', '骑', '马', '剑', '弓', '旗', '甲',
  ];

  type ScoredSentence = { text: string; score: number; type: SceneDescription['type'] };

  const scored: ScoredSentence[] = sentences.map(text => {
    let score = 0;
    let type: SceneDescription['type'] = 'scene';

    // 人物关键词 → character 类型
    if (/[帝王子将臣帅侯伯公夫人娘妃妾仆]/.test(text) && /穿|着|披|戴|持|握|面|目|身/.test(text)) {
      type = 'character';
      score += 3;
    }

    // 物件关键词 → object 类型
    if (/[剑刀弓枪戟盾印符卷书简鼎玉佩]/.test(text) && !/[帝王子将臣帅侯伯公夫人娘]/.test(text)) {
      type = 'object';
      score += 2;
    }

    for (const kw of visualKeywords) {
      if (text.includes(kw)) score += 1;
    }

    // 长度适中加分
    if (text.length >= 15 && text.length <= 60) score += 1;

    return { text, score, type };
  });

  // 按得分降序，取前 3，且保证至少有不同类型
  scored.sort((a, b) => b.score - a.score);

  const results: SceneDescription[] = [];
  const usedTypes = new Set<SceneDescription['type']>();

  for (const item of scored) {
    if (results.length >= 3) break;
    if (results.length >= 1 && usedTypes.has(item.type) && scored.length > results.length) {
      // 已有同类型且还有其他候选，跳过以增加多样性
      continue;
    }

    const description = item.text;
    const prompt = buildImagePrompt(description, item.type);
    results.push({ prompt, description, type: item.type });
    usedTypes.add(item.type);
  }

  return results;
}

/**
 * 将中文场景描述转为英文图片生成 prompt
 */
function buildImagePrompt(scene: string, type: SceneDescription['type']): string {
  // 使用 LLM 做 prompt 提取更好，但这里用简单模板确保无外部依赖时的可用性
  const typeHint: Record<SceneDescription['type'], string> = {
    scene: 'A panoramic scene from ancient China',
    character: 'A character portrait from ancient China',
    object: 'A close-up detailed shot of an object',
  };

  return `${typeHint[type]}, depicting: ${scene.slice(0, 200)}`;
}

/**
 * 将风格模板叠加到 prompt 上
 */
function applyStylePrompt(prompt: string, style: ImageStyle = 'historical-realistic'): string {
  const template = STYLE_TEMPLATES[style] || STYLE_TEMPLATES['historical-realistic'];
  return `${prompt}. ${template}`;
}

// ─── 2.4 重试 & 降级机制 ─────────────────────────────────────────────

const MAX_RETRIES = 2;
const RETRY_BASE_DELAY = 2000;

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── 2.5 图片本地缓存 ─────────────────────────────────────────────────

const CACHE_DIR = join(process.cwd(), 'public', 'generated-images');

/** 确保缓存目录存在 */
async function ensureCacheDir(): Promise<void> {
  if (!existsSync(CACHE_DIR)) {
    await mkdir(CACHE_DIR, { recursive: true });
  }
}

/** 生成缓存文件名 */
function cacheFilename(segmentId: string, index: number, ext: string): string {
  return `${segmentId}_${index}_${Date.now()}.${ext}`;
}

/** 将 Buffer 写入缓存目录，返回公开 URL 路径 */
async function saveToCache(data: Buffer, filename: string): Promise<string> {
  await ensureCacheDir();
  const filepath = join(CACHE_DIR, filename);
  await writeFile(filepath, data);
  return `/generated-images/${filename}`;
}

// ─── 核心：调用图片生成 API ───────────────────────────────────────────

/**
 * 调用 OpenAI-compatible 图片生成 API
 * 支持 /v1/images/generations 端点
 */
async function callImageAPI(prompt: string, config: ImageGeneratorConfig): Promise<{ url: string } | { b64_json: string }> {
  const endpoint = `${config.baseUrl.replace(/\/+$/, '')}/images/generations`;

  const body: Record<string, unknown> = {
    model: config.model,
    prompt,
    n: 1,
    size: '1024x1024',
    response_format: 'b64_json', // 优先 b64 以便本地缓存
  };

  // DALL-E 3 不支持 response_format=b64_json 时用 url
  if (config.model.includes('dall-e')) {
    body.response_format = 'url';
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Image API error ${response.status}: ${text}`);
  }

  const json = await response.json();
  return json.data?.[0] ?? json;
}

// ─── 导出接口 ─────────────────────────────────────────────────────────

export interface GenerateImagesOptions {
  /** 段落 ID */
  segmentId: string;
  /** 段落文本内容 */
  segmentContent: string;
  /** 图片风格（默认 historical-realistic） */
  style?: ImageStyle;
  /** 最大生成数（默认 3） */
  maxImages?: number;
}

/**
 * 为一段故事生成插图
 *
 * 2.1 调用 OpenAI-compatible 图片生成 API
 * 2.2 从段落内容提取场景描述
 * 2.3 应用中国历史风格模板
 * 2.4 失败时返回占位图，不抛异常
 * 2.5 成功时将图片缓存到本地
 */
export async function generateImagesForSegment(
  options: GenerateImagesOptions
): Promise<GeneratedImage[]> {
  const { segmentId, segmentContent, style = 'historical-realistic', maxImages = 3 } = options;
  const config = getConfig();

  // 未配置 API Key 时直接返回空，不报错
  if (!config.apiKey) {
    console.warn('[image-generator] 未配置 AI_IMAGE_API_KEY，跳过图片生成');
    return [];
  }

  // 2.2 提取场景描述
  const scenes = extractSceneDescriptions(segmentContent).slice(0, maxImages);

  if (scenes.length === 0) {
    console.warn('[image-generator] 未从段落中提取到有效场景描述');
    return [];
  }

  const results: GeneratedImage[] = [];

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const styledPrompt = applyStylePrompt(scene.prompt, style);

    let lastError: Error | null = null;

    // 2.4 重试机制
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const imageData = await callImageAPI(styledPrompt, config);

        // 2.5 本地缓存
        let imageUrl: string;

        if ('b64_json' in imageData && imageData.b64_json) {
          const buffer = Buffer.from(imageData.b64_json, 'base64');
          const filename = cacheFilename(segmentId, i, 'png');
          imageUrl = await saveToCache(buffer, filename);
        } else if ('url' in imageData && imageData.url) {
          // 远程 URL：下载后缓存到本地
          const imgResp = await fetch(imageData.url);
          if (!imgResp.ok) throw new Error(`下载图片失败: ${imgResp.status}`);
          const buffer = Buffer.from(await imgResp.arrayBuffer());
          const filename = cacheFilename(segmentId, i, 'png');
          imageUrl = await saveToCache(buffer, filename);
        } else {
          throw new Error('API 返回数据中无有效图片');
        }

        results.push({
          url: imageUrl,
          description: scene.description,
          type: scene.type,
          prompt: styledPrompt,
        });

        console.log(`[image-generator] 图片生成成功: ${imageUrl}`);
        break; // 成功，跳出重试循环

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(
          `[image-generator] 图片生成失败 (attempt ${attempt + 1}/${MAX_RETRIES + 1}): ${lastError.message}`
        );

        if (attempt < MAX_RETRIES) {
          const delay = RETRY_BASE_DELAY * Math.pow(2, attempt);
          await sleep(delay);
        }
      }
    }

    // 2.4 降级：所有重试均失败时使用占位图
    if (results.length <= i) {
      // 说明当前场景未成功生成
      const filename = cacheFilename(segmentId, i, 'svg');
      const placeholderSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#f3f4f6"/>
  <text x="256" y="240" text-anchor="middle" font-size="48" fill="#9ca3af">🎨</text>
  <text x="256" y="290" text-anchor="middle" font-size="14" fill="#6b7280">图片生成失败</text>
  <text x="256" y="316" text-anchor="middle" font-size="12" fill="#9ca3af">${scene.description.slice(0, 20)}...</text>
</svg>`;
      await ensureCacheDir();
      const filepath = join(CACHE_DIR, filename);
      await writeFile(filepath, placeholderSvg);

      results.push({
        url: `/generated-images/${filename}`,
        description: scene.description,
        type: scene.type,
        prompt: styledPrompt,
      });

      console.warn(`[image-generator] 降级为占位图: ${lastError?.message}`);
    }
  }

  return results;
}

/**
 * 使用 AI 提取更精准的场景描述（可选增强，依赖 callAI）
 * 如果调用失败则回退到 extractSceneDescriptions 的启发式方法
 */
export async function extractSceneDescriptionsWithAI(
  segment: string,
  callAIFn: (prompt: string) => Promise<string>
): Promise<SceneDescription[]> {
  const prompt = `分析以下故事段落，提取 1-3 个最具视觉画面感的场景描述。
每个场景输出一行 JSON，格式为 {"description":"中文简短描述(10-30字)","type":"scene|character|object"}。
只输出 JSON 数组，不要其他文字。

段落内容：
${segment.slice(0, 1000)}`;

  try {
    const text = await callAIFn(prompt);
    // 尝试解析 JSON
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('无法解析 AI 返回的 JSON');

    const parsed = JSON.parse(jsonMatch[0]) as Array<{
      description: string;
      type: 'scene' | 'character' | 'object';
    }>;

    return parsed.slice(0, 3).map(item => ({
      description: item.description,
      type: item.type || 'scene',
      prompt: buildImagePrompt(item.description, item.type || 'scene'),
    }));
  } catch (error) {
    console.warn(`[image-generator] AI 场景提取失败，回退到启发式方法: ${error}`);
    return extractSceneDescriptions(segment);
  }
}
