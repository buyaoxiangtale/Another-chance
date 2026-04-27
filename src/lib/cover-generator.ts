/**
 * 封面图生成核心模块
 * 供 API 路由和内部直接调用复用
 */

import prisma from '@/lib/prisma';
import { join } from 'path';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import {
  autoPickStyle,
  enforceNoTextInPrompt,
  STYLE_TEMPLATES,
} from '@/lib/image-generator';
import type { ConcreteImageStyle } from '@/lib/image-styles';

const CACHE_DIR = join(process.cwd(), 'public', 'generated-images');
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 2000;

async function ensureCacheDir() {
  if (!existsSync(CACHE_DIR)) {
    await mkdir(CACHE_DIR, { recursive: true });
  }
}

function getCoverConfig() {
  return {
    apiKey: process.env.AI_IMAGE_API_KEY || '',
    model: process.env.AI_IMAGE_MODEL || 'dall-e-3',
    baseUrl: process.env.AI_IMAGE_BASE_URL || 'https://api.openai.com/v1',
  };
}

function buildCoverPrompt(
  title: string,
  description?: string,
  genre?: string,
  era?: string,
): string {
  const style: ConcreteImageStyle = autoPickStyle(genre, description, `${title} ${era || ''}`);
  const styleTemplate = STYLE_TEMPLATES[style] || STYLE_TEMPLATES['historical-realistic'];

  return `Book cover illustration for a Chinese story. Title theme: ${title}.
${era ? `Historical era: ${era}.` : ''}
${genre ? `Genre: ${genre}.` : ''}
${description ? `Story synopsis: ${description.slice(0, 200)}` : ''}
Style: ${styleTemplate}
Composition: Dramatic centered composition suitable for a novel cover, eye-catching, vivid colors, no text, no letters, no characters, no watermarks, no logos, no borders, cinematic lighting, masterpiece quality, high detail.`;
}

/**
 * 为指定故事生成封面图（可直接在服务端调用，无需 HTTP 请求）
 * @param storyId 故事 ID
 * @param force 强制重新生成（即使已有封面图）
 */
export async function generateCoverImage(
  storyId: string,
  { force = false }: { force?: boolean } = {},
): Promise<{ success: boolean; coverImageUrl?: string; error?: string }> {
  const config = getCoverConfig();
  if (!config.apiKey) {
    console.warn('[cover-generator] 未配置 AI_IMAGE_API_KEY，跳过封面图生成');
    return { success: false, error: '未配置图片生成 API Key' };
  }

  // 获取故事信息
  const story = await prisma.story.findUnique({
    where: { id: storyId },
    select: { id: true, title: true, description: true, genre: true, era: true, coverImageUrl: true },
  });

  if (!story) {
    return { success: false, error: '故事不存在' };
  }

  // 已有封面图且非强制重新生成则跳过
  if (story.coverImageUrl && !force) {
    return { success: true, coverImageUrl: story.coverImageUrl };
  }

  console.log(`[cover-generator] 开始为故事「${story.title}」生成封面图${force ? '（强制重新生成）' : ''}...`);

  // 构建 prompt
  const rawPrompt = buildCoverPrompt(
    story.title,
    story.description || undefined,
    story.genre || undefined,
    story.era || undefined,
  );
  const prompt = enforceNoTextInPrompt(rawPrompt);

  // 带重试的图片生成
  let lastError: Error | undefined;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const imageUrl = await callImageApi(config, prompt, storyId);

      // 更新故事的封面图 URL
      await prisma.story.update({
        where: { id: storyId },
        data: { coverImageUrl: imageUrl },
      });

      console.log(`[cover-generator] 故事「${story.title}」封面图生成成功 (第${attempt}次): ${imageUrl}`);
      return { success: true, coverImageUrl: imageUrl };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`[cover-generator] 第${attempt}/${MAX_RETRIES}次尝试失败: ${lastError.message}`);
      if (attempt < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
      }
    }
  }

  console.error(`[cover-generator] 故事「${story.title}」封面图生成最终失败: ${lastError!.message}`);
  return { success: false, error: lastError!.message };
}

/**
 * 调用图片生成 API 并保存到本地
 */
async function callImageApi(
  config: ReturnType<typeof getCoverConfig>,
  prompt: string,
  storyId: string,
): Promise<string> {
  const endpoint = `${config.baseUrl.replace(/\/+$/, '')}/images/generations`;
  const NEGATIVE_PROMPT = [
    'blurry, low quality, lowres, jpeg artifacts, worst quality, bad anatomy, bad hands, extra fingers, deformed, nsfw',
    'watermark, signature, logo, stamp, copyright',
    'text, words, letters, caption, subtitle, title, label, handwriting, calligraphy, chinese text, chinese characters, english text, speech bubble, dialogue bubble, ui overlay, hud, book page, newspaper',
  ].join(', ');

  const imageBody: Record<string, unknown> = {
    model: config.model,
    prompt,
    n: 1,
    size: '1024x1024',
    response_format: 'b64_json',
    negative_prompt: NEGATIVE_PROMPT,
    num_inference_steps: 30,
    guidance_scale: 5.5,
  };

  if (config.model.includes('dall-e')) {
    imageBody.response_format = 'url';
    delete imageBody.negative_prompt;
    delete imageBody.num_inference_steps;
    delete imageBody.guidance_scale;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(imageBody),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Image API error ${response.status}: ${text}`);
  }

  const json = await response.json();
  const imageData = json.data?.[0] ?? json;

  // 保存图片到本地
  await ensureCacheDir();

  if ('b64_json' in imageData && imageData.b64_json) {
    const buffer = Buffer.from(imageData.b64_json, 'base64');
    const filename = `cover_${storyId}_${Date.now()}.png`;
    await writeFile(join(CACHE_DIR, filename), buffer);
    return `/generated-images/${filename}`;
  } else if ('url' in imageData && imageData.url) {
    const imgResp = await fetch(imageData.url);
    if (!imgResp.ok) throw new Error(`下载封面图失败: ${imgResp.status}`);
    const buffer = Buffer.from(await imgResp.arrayBuffer());
    const filename = `cover_${storyId}_${Date.now()}.png`;
    await writeFile(join(CACHE_DIR, filename), buffer);
    return `/generated-images/${filename}`;
  } else {
    throw new Error('API 返回数据中无有效图片');
  }
}
