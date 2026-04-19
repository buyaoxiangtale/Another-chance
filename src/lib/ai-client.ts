/**
 * AI 客户端统一管理模块
 * 统一管理 temperature、top_p、frequency_penalty 等参数
 * 支持 429/5xx 指数退避重试、并发控制优先级队列、全局限流
 */

import { type Story } from '@/lib/simple-db';
import { FICTION_KEYWORDS } from './genre-config';

// ─── 1.1 RetryConfig ────────────────────────────────────────────────

/** 重试配置 */
export interface RetryConfig {
  /** 最大重试次数（默认 3） */
  maxRetries: number;
  /** 基础延迟(ms)，第 n 次重试等待 baseDelay * 2^n（默认 1000） */
  baseDelay: number;
  /** 单次最大延迟(ms)，防止退避过大（默认 30000） */
  maxDelay: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
};

// ─── 1.3 请求优先级 & AIRequestQueue ────────────────────────────────

/** 请求优先级：high=续写主流程, medium=矛盾检测/摘要, low=图片生成 */
export type RequestPriority = 'high' | 'medium' | 'low';

const PRIORITY_ORDER: Record<RequestPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

interface QueuedRequest {
  execute: () => Promise<Response>;
  priority: RequestPriority;
  resolve: (response: Response) => void;
  reject: (error: Error) => void;
}

/** 速率计数器（每分钟滑动窗口） */
interface RateCounter {
  count: number;
  windowStart: number;
  lastThrottledAt: number | null;
}

/**
 * AI 请求队列
 * - 并发控制：同一时间最多 maxConcurrent 个活跃请求
 * - 优先级：high > medium > low
 * - 全局限流：每分钟最多 maxPerMinute 次请求
 * - 间隔控制：两次请求之间至少 minIntervalMs
 */
export class AIRequestQueue {
  private queue: QueuedRequest[] = [];
  private activeCount = 0;
  private readonly maxConcurrent: number;
  private readonly maxPerMinute: number;
  private readonly minIntervalMs: number;
  private rateCounter: RateCounter;
  private lastRequestTime = 0;
  private processing = false;

  constructor(options: {
    maxConcurrent?: number;
    maxPerMinute?: number;
    minIntervalMs?: number;
  } = {}) {
    this.maxConcurrent = options.maxConcurrent ?? 3;
    this.maxPerMinute = options.maxPerMinute ?? 20;
    this.minIntervalMs = options.minIntervalMs ?? 100;
    this.rateCounter = { count: 0, windowStart: Date.now(), lastThrottledAt: null };
  }

  /** 获取队列状态（1.7 暴露队列状态 API） */
  getStatus() {
    this.resetWindowIfNeeded();
    return {
      queued: this.queue.length,
      active: this.activeCount,
      maxConcurrent: this.maxConcurrent,
      rateCount: this.rateCounter.count,
      maxPerMinute: this.maxPerMinute,
      lastThrottledAt: this.rateCounter.lastThrottledAt,
    };
  }

  /** 将请求加入优先级队列 */
  async enqueue(
    execute: () => Promise<Response>,
    priority: RequestPriority = 'medium'
  ): Promise<Response> {
    return new Promise<Response>((resolve, reject) => {
      this.queue.push({ execute, priority, resolve, reject });
      this.queue.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
      this.scheduleProcessing();
    });
  }

  private scheduleProcessing() {
    if (this.processing) return;
    this.processing = true;
    // 使用 microtask 避免阻塞当前调用栈
    Promise.resolve().then(() => this.processQueue());
  }

  private async processQueue() {
    while (this.queue.length > 0 && this.activeCount < this.maxConcurrent) {
      const item = this.queue.shift();
      if (!item) break;

      // 全局限流
      await this.enforceRateLimit();

      this.activeCount++;
      this.recordRequest();

      // 异步执行，不阻塞后续排队
      item.execute()
        .then(response => item.resolve(response))
        .catch(error => item.reject(error))
        .finally(() => {
          this.activeCount--;
          if (this.queue.length > 0) {
            this.scheduleProcessing();
          } else {
            this.processing = false;
          }
        });
    }

    if (this.queue.length === 0) {
      this.processing = false;
    }
  }

  /** 1.4 确保不超过每分钟最大请求数 + 请求间隔控制 */
  private async enforceRateLimit() {
    this.resetWindowIfNeeded();

    // 每分钟限流
    if (this.rateCounter.count >= this.maxPerMinute) {
      const windowElapsed = Date.now() - this.rateCounter.windowStart;
      const waitMs = Math.max(60000 - windowElapsed, 0) + 100;
      console.warn(
        `[AIRequestQueue] 达到每分钟请求上限 (${this.maxPerMinute}/min)，等待 ${Math.round(waitMs)}ms`
      );
      this.rateCounter.lastThrottledAt = Date.now();
      await this.sleep(waitMs);
      this.rateCounter.count = 0;
      this.rateCounter.windowStart = Date.now();
    }

    // 请求间隔控制
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < this.minIntervalMs) {
      await this.sleep(this.minIntervalMs - elapsed);
    }
    this.lastRequestTime = Date.now();
  }

  private recordRequest() {
    this.resetWindowIfNeeded();
    this.rateCounter.count++;
  }

  private resetWindowIfNeeded() {
    if (Date.now() - this.rateCounter.windowStart >= 60000) {
      this.rateCounter.count = 0;
      this.rateCounter.windowStart = Date.now();
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ─── 全局单例 ────────────────────────────────────────────────────────

/** 全局 AI 请求队列实例 */
export const aiRequestQueue = new AIRequestQueue();

// ─── 1.2 callAIWithRetry ─────────────────────────────────────────────

/**
 * 带指数退避重试的 fetch 封装
 * 支持 429 (rate limit) 和 5xx (服务端错误) 的自动重试
 *
 * @param requestFn  返回 Response 的请求函数
 * @param retryConfig 重试配置（可选，使用默认值）
 */
export async function callAIWithRetry(
  requestFn: () => Promise<Response>,
  retryConfig: Partial<RetryConfig> = {}
): Promise<Response> {
  const config = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const response = await requestFn();

      // 成功直接返回
      if (response.ok) {
        return response;
      }

      // 1.5 rate limit 日志
      if (response.status === 429) {
        console.warn(
          `[callAIWithRetry] 触发 Rate Limit (429), ` +
          `第 ${attempt + 1}/${config.maxRetries} 次重试`
        );
      }

      // 429 或 5xx 且还有重试次数 → 指数退避重试
      if ((response.status === 429 || response.status >= 500) && attempt < config.maxRetries) {
        const retryAfter = response.headers.get('Retry-After');
        let delay: number;

        if (retryAfter) {
          // 服务端建议的等待时间
          const parsed = parseInt(retryAfter, 10);
          delay = Number.isFinite(parsed) ? parsed * 1000 : config.baseDelay;
        } else {
          // 指数退避 + ±25% 随机抖动
          delay = Math.min(
            config.baseDelay * Math.pow(2, attempt),
            config.maxDelay
          );
          delay = delay * (0.75 + Math.random() * 0.5);
        }

        console.warn(
          `[callAIWithRetry] 请求失败 (status=${response.status}), ` +
          `等待 ${Math.round(delay)}ms 后重试`
        );

        // 读取错误体用于日志（response body 只能读一次）
        try {
          const cloned = response.clone();
          const text = await cloned.text();
          console.warn(`[callAIWithRetry] 错误响应: ${text.slice(0, 200)}`);
        } catch {}

        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // 其他非成功状态码（如 4xx 客户端错误）直接抛出，不重试
      const text = await response.text();
      throw new Error(`AI API error ${response.status}: ${text}`);

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // 网络错误可以重试
      if (attempt < config.maxRetries) {
        const delay = Math.min(
          config.baseDelay * Math.pow(2, attempt),
          config.maxDelay
        ) * (0.75 + Math.random() * 0.5);

        console.warn(
          `[callAIWithRetry] 网络错误: ${lastError.message}, ` +
          `第 ${attempt + 1}/${config.maxRetries} 次重试, ` +
          `等待 ${Math.round(delay)}ms`
        );

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('callAIWithRetry: 所有重试均失败');
}

// ─── 原有配置接口（保持不变） ────────────────────────────────────────

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
  const isFiction = FICTION_KEYWORDS.some(k => genre.includes(k));
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
    { role: 'system', content: systemPrompt || '你是一位专业的文学作家。请用中文回答，保持与前文的风格和情节连续性。' },
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

// ─── 1.6 改造后的 callAI / callAIText ───────────────────────────────

/**
 * 调用 AI API 的通用函数
 * 经由优先级队列 + 指数退避重试
 *
 * @param priority 请求优先级：high(续写) / medium(矛盾检测/摘要) / low(图片生成)
 */
export async function callAI(prompt: string, options: {
  systemPrompt?: string;
  maxTokens?: number;
  story?: Story;
  stream?: boolean;
  priority?: RequestPriority;
} = {}): Promise<Response> {
  const { priority = 'high', systemPrompt, maxTokens, story } = options;

  return aiRequestQueue.enqueue(
    () => callAIWithRetry(() => {
      const request = buildOpenAIRequest(prompt, systemPrompt, maxTokens, story);
      return fetch(request.url, {
        method: 'POST',
        headers: request.headers,
        body: request.body,
      });
    }),
    priority
  );
}

/**
 * 调用 AI 并返回文本内容（非流式）
 * 经由优先级队列 + 指数退避重试
 *
 * @param priority 请求优先级：high(续写) / medium(矛盾检测/摘要) / low(图片生成)
 */
export async function callAIText(prompt: string, options: {
  systemPrompt?: string;
  maxTokens?: number;
  story?: Story;
  priority?: RequestPriority;
} = {}): Promise<string> {
  const response = await callAI(prompt, options);
  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}
