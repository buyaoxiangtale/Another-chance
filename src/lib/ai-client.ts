/**
 * AI 客户端统一管理模块
 * 统一管理 temperature、top_p、frequency_penalty 等参数
 */

import { type Story } from '@/lib/simple-db';

/**
 * AI 模型配置
 */
export interface AIModelConfig {
  model: string;
  baseUrl: string;
  apiKey?: string;
}

/**
 * AI 生成参数配置
 */
export interface GenerationParams {
  temperature: number;
  top_p: number;
  frequency_penalty: number;
  max_tokens: number;
}

/**
 * 根据故事类型生成参数配置
 */
export function getGenerationParams(story: Story): GenerationParams {
  const genre = story.genre || '';
  const fictionKeywords = ['演义', '架空', '同人', '玄幻', '仙侠', '魔幻', '穿越', '重生', '武侠', '奇幻', '轻小说', '网文'];
  const isFiction = fictionKeywords.some(k => genre.includes(k));
  const isHistory = genre.includes('正史') || genre.includes('历史') || !isFiction;
  
  // 根据故事类型设置temperature：正史类更严格（0.4），同人类允许更多创意（0.6），其他类型默认（0.5）
  const temperature = isHistory ? 0.4 : (isFiction ? 0.6 : 0.5);
  
  return {
    temperature,
    top_p: 0.85,  // 进一步限制随机性
    frequency_penalty: 0.3,  // 减少重复内容
    max_tokens: 2000  // 默认值，可根据具体需求调整
  };
}

/**
 * 获取默认模型配置
 */
export function getDefaultModelConfig(): AIModelConfig {
  return {
    model: process.env.AI_MODEL || 'gpt-3.5-turbo',
    baseUrl: process.env.AI_BASE_URL || 'https://api.openai.com/v1',
    apiKey: process.env.AI_API_KEY || ''
  };
}

/**
 * 生成完整的 OpenAI API 请求数据
 */
export function buildOpenAIRequest(
  prompt: string,
  systemPrompt?: string,
  maxTokens?: number,
  story?: Story
) {
  const config = getDefaultModelConfig();
  const params = story ? getGenerationParams(story) : getGenerationParams({} as Story);
  
  const messages = [
    { role: 'system', content: systemPrompt || '你是一位擅长中国历史题材的文学作家。请用中文回答，保持与前文的风格和情节连续性。' },
    { role: 'user', content: prompt }
  ];
  
  const requestBody = {
    model: config.model,
    messages,
    temperature: params.temperature,
    top_p: params.top_p,
    frequency_penalty: params.frequency_penalty,
    max_tokens: maxTokens || params.max_tokens
  };
  
  return {
    url: `${config.baseUrl}/chat/completions`,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`
    },
    body: JSON.stringify(requestBody)
  };
}

/**
 * 调用 AI API 的通用函数
 */
export async function callAI(prompt: string, options: {
  systemPrompt?: string;
  maxTokens?: number;
  story?: Story;
  stream?: boolean;
} = {}): Promise<Response> {
  const { systemPrompt, maxTokens, story, stream = false } = options;
  const request = buildOpenAIRequest(prompt, systemPrompt, maxTokens, story);
  
  const response = await fetch(request.url, {
    method: 'POST',
    headers: request.headers,
    body: request.body
  });
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`AI API error ${response.status}: ${text}`);
  }
  
  return response;
}

/**
 * 调用 AI 并返回文本内容（非流式）
 */
export async function callAIText(prompt: string, options: {
  systemPrompt?: string;
  maxTokens?: number;
  story?: Story;
} = {}): Promise<string> {
  const response = await callAI(prompt, options);
  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}