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
  | 'auto'                   // 根据 genre 自动选择
  | 'historical-realistic'   // 历史写实（古代中国）
  | 'ink-wash'               // 水墨画
  | 'gongbi'                 // 工笔画
  | 'dunhuang-mural'         // 敦煌壁画
  | 'modern-realistic'       // 现代/都市写实
  | 'sci-fi-cinematic'       // 科幻电影风
  | 'fantasy-epic'           // 玄幻/奇幻
  | 'wuxia'                  // 武侠/仙侠
  | 'anime'                  // 动漫/同人
  | 'noir-thriller';         // 悬疑/暗色

/** 所有可选风格 */
export const IMAGE_STYLES: { value: ImageStyle; label: string }[] = [
  { value: 'auto', label: '自动（按故事类型）' },
  { value: 'historical-realistic', label: '历史写实' },
  { value: 'ink-wash', label: '水墨画' },
  { value: 'gongbi', label: '工笔画' },
  { value: 'dunhuang-mural', label: '敦煌壁画' },
  { value: 'modern-realistic', label: '现代写实' },
  { value: 'sci-fi-cinematic', label: '科幻电影' },
  { value: 'fantasy-epic', label: '玄幻史诗' },
  { value: 'wuxia', label: '武侠/仙侠' },
  { value: 'anime', label: '动漫' },
  { value: 'noir-thriller', label: '悬疑黑色' },
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

// ─── 2.3 风格 Prompt 模板 ────────────────────────────────────────────

const STYLE_TEMPLATES: Record<Exclude<ImageStyle, 'auto'>, string> = {
  'historical-realistic':
    'Chinese historical realistic painting, highly detailed, accurate ancient Chinese architecture and hanfu costumes, warm oil-paint lighting, cinematic composition',

  'ink-wash':
    'Traditional Chinese ink wash painting, elegant brush strokes, monochrome with subtle color accents, vast negative space, poetic atmosphere',

  'gongbi':
    'Chinese Gongbi fine-brush painting, meticulous detail, rich mineral pigments, gold leaf accents, courtly elegance, precise linework',

  'dunhuang-mural':
    'Dunhuang Mogao cave mural style, Buddhist art, flowing celestial robes, mineral pigments, oxidized earth tones, devotional atmosphere',

  'modern-realistic':
    'modern realistic photography, cinematic lighting, shallow depth of field, natural colors, contemporary setting, photorealistic details',

  'sci-fi-cinematic':
    'science fiction cinematic concept art, futuristic technology, volumetric lighting, neon accents, high-tech environment, Blade Runner / Interstellar mood, photorealistic',

  'fantasy-epic':
    'epic fantasy concept art, dramatic lighting, magical atmosphere, grand composition, intricate details, digital painting in the style of Greg Rutkowski',

  'wuxia':
    'Chinese wuxia / xianxia concept art, flowing robes mid-motion, martial arts pose, misty mountain backdrop, ethereal glow, cinematic wide shot, modern digital painting (not traditional ink)',

  'anime':
    'high quality Japanese anime key visual, clean line art, vibrant cel-shading, expressive characters, dynamic composition, Makoto Shinkai lighting',

  'noir-thriller':
    'film noir cinematic style, high-contrast chiaroscuro lighting, cold desaturated palette, dramatic shadows, suspenseful mood, photorealistic',
};

/** 根据故事 genre / 段落内容自动选择风格 */
function autoPickStyle(
  genre?: string,
  description?: string,
  segmentContent?: string,
): Exclude<ImageStyle, 'auto'> {
  const blob = [genre, description, segmentContent].filter(Boolean).join(' ');

  // 科幻：标签 / 常见科幻名词（飞船、星舰、三体、机甲、虫洞、基地、超光速……）
  if (/科幻|末世|赛博|太空|三体|飞船|星舰|星际|机甲|虫洞|曲率|超光速|外星|AI|人工智能|量子|纳米/i.test(blob)) return 'sci-fi-cinematic';
  if (/悬疑|推理|惊悚|恐怖|凶案|密室/.test(blob)) return 'noir-thriller';
  if (/武侠|仙侠|江湖|内力|剑仙|道法/.test(blob)) return 'wuxia';
  if (/玄幻|奇幻|魔幻|法师|巫师|精灵|巨龙|魔法/.test(blob)) return 'fantasy-epic';
  if (/同人|动漫|轻小说|火影|海贼|死神|鬼灭|龙珠|漫画/.test(blob)) return 'anime';
  if (/历史|正史|古代|王朝|皇帝|将军|朝廷|宫廷|帝王/.test(blob)) return 'historical-realistic';
  if (/都市|现代|言情|职场|校园|办公室/.test(blob)) return 'modern-realistic';
  // 默认：没匹配到关键词时倾向于现代写实（更通用），不再默认套古风
  return 'modern-realistic';
}

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
  // 中立的类型提示，不假设故事时代背景；具体风格由 applyStylePrompt 叠加
  const typeHint: Record<SceneDescription['type'], string> = {
    scene: 'A wide cinematic scene depicting',
    character: 'A character-focused portrait depicting',
    object: 'A close-up detailed shot depicting',
  };

  return `${typeHint[type]}: ${scene.slice(0, 200)}`;
}

/**
 * 将风格模板叠加到 prompt 上
 * 若 style 为 'auto'，依据 genre / description 自动挑选风格
 */
function applyStylePrompt(
  prompt: string,
  style: ImageStyle = 'auto',
  ctx?: { genre?: string; description?: string; segmentContent?: string }
): string {
  const resolved: Exclude<ImageStyle, 'auto'> =
    style === 'auto' ? autoPickStyle(ctx?.genre, ctx?.description, ctx?.segmentContent) : style;
  const template = STYLE_TEMPLATES[resolved] || STYLE_TEMPLATES['modern-realistic'];
  return `${prompt}. ${template}`;
}

/**
 * 强力确保图片 prompt 不会让文字出现在画面里。
 * GLM / cogview 系列不支持 negative_prompt 字段，所有抑制指令必须写进 prompt 本体。
 *
 * 策略：
 *  1. 去除任何残留的 CJK 字符 + 假名 + 朝鲜字（AI 偶尔会漏翻译）
 *  2. 剥掉引号包裹的短语（模型容易把 "xxx" 当作要渲染的文本）
 *  3. 在开头注入强抑制指令，让模型在生成早期就确立"无文字"的主方向
 *  4. 在末尾幂等地追加英文 no-text 后缀
 */
function enforceNoTextInPrompt(rawPrompt: string): string {
  let p = rawPrompt || '';

  // 1. 去掉中日韩字符 —— 扩散模型看到中文/日文极易尝试把它"绘制"进画面
  p = p.replace(/[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\u3100-\u312f\u3200-\u32ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af\uf900-\ufaff\uff00-\uffef]+/g, ' ');

  // 2. 剥掉所有成对的引号内容（中英引号）—— 这些最容易被当作"要渲染的文字"
  p = p.replace(/["'“”‘’「」『』《》](.*?)["'“”‘’「」『』《』《》]/g, '$1');

  // 3. 压掉多余空白
  p = p.replace(/\s+/g, ' ').trim();

  // 4. 头部强抑制指令
  const HEAD_DIRECTIVE = 'Pure visual cinematic scene, no written language of any kind anywhere in the frame, no letters, no glyphs, no characters, no captions, no subtitles, no UI elements. ';

  // 5. 幂等 no-text 尾缀（如果 AI 已经补过就不重复）
  const TAIL = ', absolutely no text, no words, no letters, no captions, no subtitles, no speech bubbles, no calligraphy, no handwriting, no signage, no book pages, no screens with text, no watermark, no logo';
  if (!/no\s+text/i.test(p)) {
    p = p + TAIL;
  }

  return HEAD_DIRECTIVE + p;
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
async function callImageAPI(prompt: string, config: ImageGeneratorConfig, seed?: number): Promise<{ url: string } | { b64_json: string }> {
  const endpoint = `${config.baseUrl.replace(/\/+$/, '')}/images/generations`;

  /**
   * 通用 negative prompt：规避常见低质量/不一致问题。
   * 很多厂商会忽略未知字段而不报错，所以可以安全地作为"锦上添花"字段附带。
   */
  const NEGATIVE_PROMPT = [
    // 画质
    'blurry, low quality, lowres, jpeg artifacts, worst quality, bad anatomy, bad hands, extra fingers, mutated hands, deformed, nsfw',
    // 水印/签名
    'watermark, signature, logo, stamp, copyright',
    // 所有文字类元素（强力禁止段落文字出现在画面里）
    'text, words, letters, caption, subtitle, title, label, handwriting, calligraphy, chinese text, chinese characters, english text, japanese text, kanji, hiragana, katakana, speech bubble, dialogue bubble, manga text, comic panel borders, ui overlay, hud, book page, newspaper',
  ].join(', ');

  const body: Record<string, unknown> = {
    model: config.model,
    prompt,
    n: 1,
    size: '1024x1024',
    response_format: 'b64_json', // 优先 b64 以便本地缓存
    // 以下字段部分模型/提供商会用到；其余忽略
    negative_prompt: NEGATIVE_PROMPT,
    num_inference_steps: 30,
    guidance_scale: 5.5,
  };

  if (typeof seed === 'number' && Number.isFinite(seed)) {
    body.seed = seed;
  }

  // DALL-E 3 不支持 response_format=b64_json 时用 url
  if (config.model.includes('dall-e')) {
    body.response_format = 'url';
    // DALL-E 不识别这些字段，移除以免 400
    delete body.negative_prompt;
    delete body.num_inference_steps;
    delete body.guidance_scale;
    delete body.seed;
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
  /** 图片风格（默认 auto：按 genre 自动选择） */
  style?: ImageStyle;
  /** 最大生成数（默认 3） */
  maxImages?: number;
  /** 故事类型（用于 style=auto 时自动挑选风格） */
  genre?: string;
  /** 故事简介（辅助 auto 风格判断） */
  storyDescription?: string;
  /** 可选：AI 文本调用函数，若提供则优先用它提取/翻译场景为高质量英文 prompt */
  callAIFn?: (prompt: string) => Promise<string>;
  /** 可选：已登记角色的视觉速查表，用于 AI 翻译器还原角色造型（尤其是同人 IP） */
  characters?: CharacterVisualHint[];
  /** 可选：近 N 段摘要（中文），注入到场景提取 prompt 里，让镜头更贴近上下文 */
  contextSummary?: string;
  /** 可选：滚动场景状态（英文短句，例如 "dusk, rainy, tense mood"），直接拼到 enPrompt 环境描述里 */
  sceneStateEn?: string;
  /** 可选：图片生成 seed，锁定视觉一致性（同一场景/角色组合下跨段复用） */
  seed?: number;
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
  const { segmentId, segmentContent, style = 'auto', maxImages = 3, genre, storyDescription, callAIFn, characters, contextSummary, sceneStateEn, seed } = options;
  const config = getConfig();

  // 未配置 API Key 时直接返回空，不报错
  if (!config.apiKey) {
    console.warn('[image-generator] 未配置 AI_IMAGE_API_KEY，跳过图片生成');
    return [];
  }

  // 2.2 提取场景描述：有 AI 函数则走 AI（更精准），否则退回启发式
  let scenes = callAIFn
    ? (await extractSceneDescriptionsWithAI(segmentContent, callAIFn, { genre, storyDescription, characters, contextSummary, sceneStateEn })).slice(0, maxImages)
    : extractSceneDescriptions(segmentContent).slice(0, maxImages);

  if (scenes.length === 0) {
    console.warn('[image-generator] 未从段落中提取到有效场景描述');
    return [];
  }

  // 并行生成所有镜头：每个镜头独立重试 + 独立降级，避免一张失败拖累整体
  const renderOne = async (scene: SceneDescription, i: number): Promise<GeneratedImage> => {
    const styledPromptRaw = applyStylePrompt(scene.prompt, style, {
      genre,
      description: storyDescription,
      segmentContent,
    });
    // 强力抑制：去 CJK、去引号短语、强抑制指令（GLM/cogview 无 negative_prompt）
    const styledPrompt = enforceNoTextInPrompt(styledPromptRaw);
    // 同段内 3 张图用不同 seed（sceneSeed = baseSeed + i），保持角色一致但构图各异
    const sceneSeed = typeof seed === 'number' ? seed + i : undefined;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const imageData = await callImageAPI(styledPrompt, config, sceneSeed);
        let imageUrl: string;

        if ('b64_json' in imageData && imageData.b64_json) {
          const buffer = Buffer.from(imageData.b64_json, 'base64');
          const filename = cacheFilename(segmentId, i, 'png');
          imageUrl = await saveToCache(buffer, filename);
        } else if ('url' in imageData && imageData.url) {
          const imgResp = await fetch(imageData.url);
          if (!imgResp.ok) throw new Error(`下载图片失败: ${imgResp.status}`);
          const buffer = Buffer.from(await imgResp.arrayBuffer());
          const filename = cacheFilename(segmentId, i, 'png');
          imageUrl = await saveToCache(buffer, filename);
        } else {
          throw new Error('API 返回数据中无有效图片');
        }

        console.log(`[image-generator] 图片生成成功: ${imageUrl}`);
        return { url: imageUrl, description: scene.description, type: scene.type, prompt: styledPrompt };
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

    // 降级：占位图
    const filename = cacheFilename(segmentId, i, 'svg');
    const placeholderSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#f3f4f6"/>
  <text x="256" y="240" text-anchor="middle" font-size="48" fill="#9ca3af">🎨</text>
  <text x="256" y="290" text-anchor="middle" font-size="14" fill="#6b7280">图片生成失败</text>
  <text x="256" y="316" text-anchor="middle" font-size="12" fill="#9ca3af">${scene.description.slice(0, 20)}...</text>
</svg>`;
    await ensureCacheDir();
    await writeFile(join(CACHE_DIR, filename), placeholderSvg);
    console.warn(`[image-generator] 降级为占位图: ${lastError?.message}`);
    return {
      url: `/generated-images/${filename}`,
      description: scene.description,
      type: scene.type,
      prompt: styledPrompt,
    };
  };

  return Promise.all(scenes.map((s, i) => renderOne(s, i)));
}

/**
 * 使用 AI 提取更精准的场景描述，并直接翻译为信息密度高的英文 diffusion prompt。
 * 失败时回退到启发式 extractSceneDescriptions。
 */
export interface CharacterVisualHint {
  /** 中文名（用于在段落中匹配） */
  name: string;
  /** 规范英文名 / 原作罗马音（可选） */
  canonicalName?: string;
  /** 视觉关键词：发型、服饰、标志性特征 */
  appearance?: string;
  /** 角色定位（主角/反派/配角等，可选） */
  role?: string;
}

export async function extractSceneDescriptionsWithAI(
  segment: string,
  callAIFn: (prompt: string) => Promise<string>,
  ctx?: {
    genre?: string;
    storyDescription?: string;
    characters?: CharacterVisualHint[];
    contextSummary?: string;
    sceneStateEn?: string;
  },
): Promise<SceneDescription[]> {
  const genreHint = ctx?.genre ? `故事类型：${ctx.genre}` : '';
  const descHint = ctx?.storyDescription ? `故事简介：${ctx.storyDescription.slice(0, 200)}` : '';
  const summaryHint = ctx?.contextSummary ? `近 N 段故事摘要（用于上下文衔接，不要原样复制，只用于理解画面走向）：\n${ctx.contextSummary.slice(0, 1200)}` : '';
  const sceneStateHint = ctx?.sceneStateEn ? `已知场景状态（English, 必须保留进 enPrompt 的环境描述里以保证跨段一致）：${ctx.sceneStateEn}` : '';

  // 构建角色视觉速查表：中文名 → 英文名 + 外观关键词
  let characterBlock = '';
  const chars = (ctx?.characters || []).filter(c => c && c.name);
  if (chars.length > 0) {
    const lines = chars.map(c => {
      const parts = [`- ${c.name}`];
      if (c.canonicalName) parts.push(`英文名：${c.canonicalName}`);
      if (c.appearance) parts.push(`外观：${c.appearance}`);
      if (c.role) parts.push(`定位：${c.role}`);
      return parts.join(' | ');
    });
    characterBlock = `\n已登记角色（若出现在镜头中，必须按外观关键词完整描写 — 不要只写 "a boy / a man"，要写清楚发型、发色、服装、年龄段、标志性特征）：\n${lines.join('\n')}\n`;
  }

  const prompt = `你是一位电影分镜与 diffusion 模型 prompt 工程师。
分析下面这段中文故事（"当前段落"），提取 1-3 个最具视觉画面感的镜头，并为每个镜头同时给出：
- description：中文一句话镜头说明（10-40字，给人看）
- enPrompt：英文图片生成 prompt（给 diffusion 模型看），80-140 词，包含：**主体（含具体外观）、动作、环境、光线、镜头景别（wide shot / medium / close-up）、构图、氛围**。
- type：scene | character | object

【关键约束】
1. 镜头必须**只来自"当前段落"**。"近 N 段摘要"和"场景状态"仅用于理解世界观和画面连贯，不得把摘要中的历史事件当镜头。
2. enPrompt 必须是纯英文，不得出现任何中文字符、假名、朝鲜字；不得原样抄写段落里的中文句子。
3. 若镜头里出现"已登记角色"，必须按下方"外观"关键词还原（同人/动漫 IP 请用原作经典造型），不得笼统写 "a boy / a man / a woman"。
4. 若故事类型是动漫/同人/轻小说，在 enPrompt 里保留角色的英文名（如 "Obito Uchiha"），并附带外观描述。
5. 若给出了"已知场景状态"，enPrompt 里的环境/光线/时间描述必须与之一致（例如 scene state 说 dusk rainy，就不能写 sunny morning）。
6. 在 enPrompt 结尾追加固定短语：", no text, no captions, no subtitles, no speech bubbles, no calligraphy, no watermark"。
7. 严格输出 JSON 数组，不要 markdown、不要额外文字。

格式：
[{"description":"...","enPrompt":"...","type":"scene"}]

${genreHint}
${descHint}
${summaryHint}
${sceneStateHint}
${characterBlock}
【当前段落】（镜头必须从这里取）：
${segment.slice(0, 1500)}`;

  try {
    const text = await callAIFn(prompt);
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('无法解析 AI 返回的 JSON');

    const parsed = JSON.parse(jsonMatch[0]) as Array<{
      description: string;
      enPrompt?: string;
      type?: 'scene' | 'character' | 'object';
    }>;

    return parsed.slice(0, 3).map(item => {
      const type = (item.type || 'scene') as SceneDescription['type'];
      const enPrompt = (item.enPrompt || '').trim();
      // 若 AI 没输出英文 prompt，退回模板拼接
      const imgPrompt = enPrompt || buildImagePrompt(item.description || '', type);
      return {
        description: item.description || enPrompt.slice(0, 40),
        type,
        prompt: imgPrompt,
      };
    });
  } catch (error) {
    console.warn(`[image-generator] AI 场景提取失败，回退到启发式方法: ${error}`);
    return extractSceneDescriptions(segment);
  }
}
