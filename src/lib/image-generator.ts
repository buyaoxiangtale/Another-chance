/**
 * 文生图核心模块 (P6-2)
 *
 * 功能：
 * - 调用 OpenAI-compatible 图片生成 API（DALL-E / 硅基流动 / 通义万相等）
 * - 从段落内容提取 1-3 个场景描述作为 prompt
 * - 支持 10 种图片风格（历史/水墨/工笔/敦煌/现代/科幻/玄幻/武侠/动漫/悬疑）
 * - 智能风格检测（同人/动漫/仙侠/西幻/现代等）
 * - 重试 & 降级机制（失败返回占位图，不阻塞主流程）
 * - 图片本地缓存（保存到 public/generated-images/）
 * - 强力文字抑制（enforceNoTextInPrompt，兼容 GLM/cogview）
 * - 角色视觉一致性（seed + CharacterVisualHint）
 * - AI 上下文感知场景提取（extractSceneDescriptionsWithAI）
 */

import { join } from 'path';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import type { ReferenceImageHint } from './reference-image-search';
import {
  IMAGE_STYLES,
  type ImageStyle,
  type ConcreteImageStyle,
  type SceneDescription,
  type GeneratedImage,
} from './image-styles';

// Re-export for convenience
export {
  IMAGE_STYLES,
  type ImageStyle,
  type ConcreteImageStyle,
  type SceneDescription,
  type GeneratedImage,
} from './image-styles';

// ─── 配置 ───────────────────────────────────────────────────────────

/** 图片生成提供商配置 */
export interface ImageGeneratorConfig {
  provider: string;
  apiKey: string;
  model: string;
  baseUrl: string;
}

// ─── 2.3 风格 Prompt 模板 ────────────────────────────────────────────

const STYLE_TEMPLATES: Record<ConcreteImageStyle, string> = {
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
): ConcreteImageStyle {
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

// ─── 场景描述提取器 ──────────────────────────────────────────────────

/**
 * 从段落内容提取 1-3 个场景描述作为图片 prompt。
 */
export function extractSceneDescriptions(segment: string): SceneDescription[] {
  const sentences = segment
    .split(/[。！？\n]+/)
    .map(s => s.trim())
    .filter(s => s.length >= 10);

  if (sentences.length === 0) return [];

  const visualKeywords = [
    '山', '水', '河', '湖', '海', '天', '月', '日', '星', '云', '雨', '雪', '风', '花', '树', '林', '城', '墙', '宫', '殿', '楼', '亭', '桥', '路', '街',
    '战', '斗', '杀', '射', '骑', '跑', '走', '坐', '立', '跪', '拜', '舞', '唱', '奏', '饮', '食',
    '血', '火', '光', '暗', '烟', '尘', '影', '色', '声', '红', '黑', '白', '金', '银',
    '帝', '王', '将', '臣', '兵', '军', '骑', '马', '剑', '弓', '旗', '甲',
  ];

  type ScoredSentence = { text: string; score: number; type: SceneDescription['type'] };

  const scored: ScoredSentence[] = sentences.map(text => {
    let score = 0;
    let type: SceneDescription['type'] = 'scene';

    if (/[帝王子将臣帅侯伯公夫人娘妃妾仆]/.test(text) && /穿|着|披|戴|持|握|面|目|身/.test(text)) {
      type = 'character';
      score += 3;
    }

    if (/[剑刀弓枪戟盾印符卷书简鼎玉佩]/.test(text) && !/[帝王子将臣帅侯伯公夫人娘]/.test(text)) {
      type = 'object';
      score += 2;
    }

    for (const kw of visualKeywords) {
      if (text.includes(kw)) score += 1;
    }

    if (text.length >= 15 && text.length <= 60) score += 1;

    return { text, score, type };
  });

  scored.sort((a, b) => b.score - a.score);

  const results: SceneDescription[] = [];
  const usedTypes = new Set<SceneDescription['type']>();

  for (const item of scored) {
    if (results.length >= 3) break;
    if (results.length >= 1 && usedTypes.has(item.type) && scored.length > results.length) {
      continue;
    }

    const description = item.text;
    const prompt = buildImagePrompt(description, item.type);
    results.push({ prompt, description, type: item.type });
    usedTypes.add(item.type);
  }

  return results;
}

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
  const resolved: ConcreteImageStyle =
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
  p = p.replace(/["'""''「」『』《》](.*?)["'""''「」『』《』《》]/g, '$1');

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

// ─── 重试 & 降级机制 ──────────────────────────────────────────────────

const MAX_RETRIES = 2;
const RETRY_BASE_DELAY = 2000;

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── 图片本地缓存 ─────────────────────────────────────────────────────

const CACHE_DIR = join(process.cwd(), 'public', 'generated-images');

async function ensureCacheDir(): Promise<void> {
  if (!existsSync(CACHE_DIR)) {
    await mkdir(CACHE_DIR, { recursive: true });
  }
}

function cacheFilename(segmentId: string, index: number, ext: string): string {
  return `${segmentId}_${index}_${Date.now()}.${ext}`;
}

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

// ─── 风格分析（启发式） ────────────────────────────────────────────────

const STYLE_RULES: { keywords: string[]; style: ConcreteImageStyle; reason: string }[] = [
  { keywords: ['宫廷', '贵族', '后宫', '妃嫔', '皇后', '太子', '朝堂', '殿上', '锦衣', '华服', '玉玺', '龙袍', '御膳', '御花园', '金銮殿'], style: 'gongbi', reason: '宫廷贵族题材，工笔画风格更能展现华美细节' },
  { keywords: ['战争', '沙场', '攻城', '征伐', '铁骑', '战马', '烽火', '刀兵', '甲胄', '兵马', '兵临城下', '调兵', '兵符'], style: 'historical-realistic', reason: '战争军事题材，写实风格更具史诗感' },
  { keywords: ['隐逸', '山水', '田园', '诗酒', '竹林', '垂钓', '归隐', '悠然', '琴棋', '煮茶', '渔舟', '采菊'], style: 'ink-wash', reason: '山水田园题材，水墨画最能表达诗意' },
  { keywords: ['宗教', '佛教', '道教', '道士', '道观', '西域', '丝绸之路', '敦煌', '飞天', '梵文', '僧人', '袈裟', '石窟', '胡人', '佛寺', '佛经', '佛法', '寺庙', '和尚', '菩萨', '罗汉', '金刚'], style: 'dunhuang-mural', reason: '宗教西域题材，敦煌壁画风格最为贴切' },
];

function countKeywordMatches(text: string, keywords: string[]): number {
  let score = 0;
  for (const kw of keywords) {
    score += text.split(kw).length - 1;
  }
  return score;
}

/**
 * 分析故事整体风格
 */
export function analyzeStoryStyle(storyContent: string): {
  recommendedStyle: ConcreteImageStyle;
  reason: string;
  confidence: number;
  allScores: { style: ImageStyle; score: number }[];
} {
  const text = storyContent.slice(0, 2000);

  let bestScore = 0;
  let bestRule = STYLE_RULES[STYLE_RULES.length - 1];

  for (const rule of STYLE_RULES) {
    const score = countKeywordMatches(text, rule.keywords);
    if (score > bestScore) {
      bestScore = score;
      bestRule = rule;
    }
  }

  if (bestScore === 0) {
    const autoStyle = autoPickStyle(undefined, undefined, text);
    return {
      recommendedStyle: autoStyle,
      reason: '未检测到强烈的细分历史风格信号，按故事题材自动推荐',
      confidence: 0.4,
      allScores: computeAllScores(text),
    };
  }

  const confidence = Math.min(bestScore / 5, 1);
  return {
    recommendedStyle: bestRule.style,
    reason: bestRule.reason,
    confidence,
    allScores: computeAllScores(text),
  };
}

/** 计算所有风格的匹配分数 */
function computeAllScores(text: string): { style: ImageStyle; score: number }[] {
  const allStyles: ImageStyle[] = [
    'auto', 'historical-realistic', 'ink-wash', 'gongbi', 'dunhuang-mural',
    'modern-realistic', 'sci-fi-cinematic', 'fantasy-epic', 'wuxia', 'anime', 'noir-thriller',
  ];

  return allStyles.map(style => {
    let score = 0;
    for (const rule of STYLE_RULES) {
      if (rule.style === style) {
        for (const kw of rule.keywords) {
          score += text.split(kw).length - 1;
        }
        break;
      }
    }
    return { style, score };
  });
}

/**
 * 分析单个段落风格，可覆盖故事整体风格
 */
export function analyzeSegmentStyle(
  segmentContent: string,
  context?: {
    storyStyle?: ConcreteImageStyle;
    genre?: string;
    storyDescription?: string;
  }
): {
  style: ConcreteImageStyle;
  reason: string;
  isAutoOverride: boolean;
} {
  const fallbackStyle: ConcreteImageStyle =
    context?.storyStyle ??
    autoPickStyle(context?.genre, context?.storyDescription, segmentContent);

  // 先检测段落是否有强烈的特殊风格信号
  for (const rule of STYLE_RULES) {
    const matchCount = rule.keywords.filter(kw => segmentContent.includes(kw)).length;
    if (matchCount >= 2) {
      // 段落有明确风格信号，且与故事风格不同 → 覆盖
      if (rule.style !== fallbackStyle) {
        return { style: rule.style, reason: rule.reason, isAutoOverride: true };
      }
      return { style: rule.style, reason: rule.reason, isAutoOverride: false };
    }
  }

  // 无明确信号，跟随故事整体画风；若没有整体风格，则按题材自动推断
  return {
    style: fallbackStyle,
    reason: context?.storyStyle ? '跟随故事整体画风' : '根据故事题材自动推荐',
    isAutoOverride: false,
  };
}

// ─── 导出接口 ─────────────────────────────────────────────────────────

export interface GenerateImagesOptions {
  segmentId: string;
  segmentContent: string;
  /** 图片风格（默认 auto：按 genre 自动选择） */
  style?: ImageStyle;
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
  /** 可选：同人 IP 参考图路径列表，注入场景提取 prompt */
  referenceImages?: ReferenceImageHint[];
}

/**
 * 为一段故事生成插图
 */
export async function generateImagesForSegment(
  options: GenerateImagesOptions
): Promise<GeneratedImage[]> {
  const { segmentId, segmentContent, style = 'auto', maxImages = 3, genre, storyDescription, callAIFn, characters, contextSummary, sceneStateEn, seed, referenceImages } = options;
  const config = getConfig();

  if (!config.apiKey) {
    console.warn('[image-generator] 未配置 AI_IMAGE_API_KEY，跳过图片生成');
    return [];
  }

  // 2.2 提取场景描述：有 AI 函数则走 AI（更精准），否则退回启发式
  let scenes = callAIFn
    ? (await extractSceneDescriptionsWithAI(segmentContent, callAIFn, { genre, storyDescription, characters, contextSummary, sceneStateEn, referenceImages })).slice(0, maxImages)
    : extractSceneDescriptions(segmentContent).slice(0, maxImages);

  if (scenes.length === 0) {
    console.warn('[image-generator] 未从段落中提取到有效场景描述');
    return [];
  }

  // 2.3 如果场景 prompt 含中文（启发式回退），用 AI 翻译为英文 diffusion prompt，
  //     避免后续 enforceNoTextInPrompt 把场景内容全部剥掉导致只剩风格模板
  const scenesHaveCJK = scenes.some(s => /[\u4e00-\u9fff]/.test(s.prompt));
  if (scenesHaveCJK) {
    let translated = false;

    // 优先：用 AI 翻译
    if (callAIFn) {
      try {
        const descList = scenes.map((s, i) => `[${i}] (${s.type}) ${s.description}`).join('\n');
        const translatePrompt =
          `Translate the Chinese scene descriptions below into English diffusion prompts (60-100 words each: subject, action, environment, lighting, camera angle, mood). Output ONLY a JSON array of strings, same order, no markdown.\n\n${descList}`;

        const transText = await callAIFn(translatePrompt);
        if (transText && transText.trim()) {
          const transMatch = transText.match(/\[[\s\S]*\]/);
          if (transMatch) {
            const enPrompts: unknown[] = JSON.parse(transMatch[0]);
            if (Array.isArray(enPrompts) && enPrompts.some(p => typeof p === 'string')) {
              scenes = scenes.map((s, i) => ({
                ...s,
                prompt: typeof enPrompts[i] === 'string'
                  ? (enPrompts[i] as string).trim()
                  : s.prompt,
              }));
              translated = true;
              console.log('[image-generator] 启发式场景已翻译为英文 prompt');
            }
          }
        } else {
          console.warn('[image-generator] AI 翻译返回空响应');
        }
      } catch (e) {
        console.warn('[image-generator] heuristic 场景翻译失败:', e);
      }
    }

    // 兜底：AI 翻译也失败时，用 sceneStateEn + genre + segmentContent 拼接英文 prompt
    // 比 enforceNoTextInPrompt 剥光所有中文后只剩风格模板要好得多
    if (!translated) {
      console.warn('[image-generator] AI 翻译失败，使用 sceneStateEn + genre 兜底构建英文 prompt');
      scenes = scenes.map((scene) => {
        const parts: string[] = [];
        // 类型镜头前缀
        const typeHint: Record<string, string> = {
          scene: 'A wide cinematic scene',
          character: 'A character portrait',
          object: 'A close-up detailed shot',
        };
        parts.push(typeHint[scene.type] || 'A cinematic scene');

        // 用 sceneStateEn 补充环境描述
        if (sceneStateEn && sceneStateEn.trim()) {
          parts.push(`environment: ${sceneStateEn.trim()}`);
        }

        // 用 genre 补充题材
        if (genre) {
          parts.push(`genre: ${genre}`);
        }

        // 用 storyDescription 补充故事背景
        if (storyDescription) {
          // 取前100字符的英文概要
          parts.push(`story context: ${storyDescription.slice(0, 100)}`);
        }

        // 用段落内容的前80字作为粗略场景参考（会被 enforceNoTextInPrompt 剥掉中文，
        // 但英文部分会保留）
        const segSnippet = segmentContent.slice(0, 80);

        return {
          ...scene,
          prompt: `${parts.join(', ')}, ${segSnippet}`,
        };
      });
    }
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
    referenceImages?: ReferenceImageHint[];
  },
): Promise<SceneDescription[]> {
  const genreHint = ctx?.genre ? `故事类型：${ctx.genre}` : '';
  const descHint = ctx?.storyDescription ? `故事简介：${ctx.storyDescription.slice(0, 200)}` : '';
  const summaryHint = ctx?.contextSummary ? `近 N 段故事摘要（用于上下文衔接，不要原样复制，只用于理解画面走向）：\n${ctx.contextSummary.slice(0, 1200)}` : '';
  const sceneStateHint = ctx?.sceneStateEn ? `已知场景状态（English, 必须保留进 enPrompt 的环境描述里以保证跨段一致）：${ctx.sceneStateEn}` : '';

  // D2: 同人 IP 参考图视觉锚点
  let referenceBlock = '';
  if (ctx?.referenceImages && ctx.referenceImages.length > 0) {
    const imageList = ctx.referenceImages
      .map((img, i) => `[${i + 1}] ${img.characterName ? `角色: ${img.characterName}` : '群像'} → ${img.localPath}`)
      .join('\n');
    referenceBlock = `
【IP 参考图】（以下图片是该同人 IP 的官方/经典角色设定图，生成 enPrompt 时必须严格遵循这些参考图的视觉风格和角色外观）：
${imageList}
约束：enPrompt 中的角色外观描述必须与参考图一致，不得凭空创造新设计。
`;
  }

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
${referenceBlock}
【当前段落】（镜头必须从这里取）：
${segment.slice(0, 1500)}`;

  try {
    const text = await callAIFn(prompt);

    // ── 健壮 JSON 解析：兼容 markdown 包裹、截断响应等 ──
    let jsonStr: string | null = null;

    // 1. 直接正则匹配
    const directMatch = text.match(/\[[\s\S]*\]/);
    if (directMatch) {
      jsonStr = directMatch[0];
    }

    // 2. 剥离 markdown 代码块后再匹配（```json ... ```）
    if (!jsonStr) {
      const stripped = text
        .replace(/^```(?:json)?\s*\n?/i, '')
        .replace(/\n?```\s*$/i, '')
        .trim();
      const strippedMatch = stripped.match(/\[[\s\S]*\]/);
      if (strippedMatch) {
        jsonStr = strippedMatch[0];
      }
    }

    // 3. 尝试修复截断 JSON（找到 [ 和最后一个 }，手动闭合 ]
    if (!jsonStr) {
      const startIdx = text.indexOf('[');
      const lastObjClose = text.lastIndexOf('}');
      if (startIdx >= 0 && lastObjClose > startIdx) {
        const candidate = text.slice(startIdx, lastObjClose + 1) + ']';
        try {
          JSON.parse(candidate);
          jsonStr = candidate;
        } catch {
          // 修复失败，继续
        }
      }
    }

    if (!jsonStr) {
      console.warn(`[image-generator] AI 返回内容无法解析为 JSON，前200字: ${text.slice(0, 200)}`);
      throw new Error('无法解析 AI 返回的 JSON');
    }

    const parsed = JSON.parse(jsonStr) as Array<{
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
