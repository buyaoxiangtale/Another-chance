/**
 * 轻量 Web 搜索适配层
 *
 * 优先级（按 env 自动选择，未配置则跳过）：
 *   1. TAVILY_API_KEY → Tavily（AI-first、简洁 JSON 返回）
 *   2. SERPER_API_KEY → Serper.dev（Google 结果）
 *
 * 返回统一结构；失败时返回 [] 而不是抛异常，调用方可安全用 ?? 降级。
 *
 * 本模块**不依赖** GLM 内置 web_search 工具；那条路径在 ai-client 里通过
 * `callAI({ webSearch: true })` 直接生效，与此互补：
 *   - 显式搜索（此处）：拿到独立 snippet/url，塞进 LLM prompt 当"上下文"
 *   - GLM 内置（ai-client）：模型自己决定是否联网，黑盒但零配置
 */

export interface WebSearchResult {
  title: string;
  snippet: string;
  url: string;
}

export interface WebSearchOptions {
  /** 最多返回几条（默认 5） */
  maxResults?: number;
  /** 搜索时附带的领域提示（如 'fandom.com' / 'wiki'），用于 Tavily include_domains */
  includeDomains?: string[];
}

/** 是否配置了任一可用的显式搜索 provider */
export function hasExplicitWebSearch(): boolean {
  return !!(process.env.TAVILY_API_KEY || process.env.SERPER_API_KEY);
}

/**
 * 显式 Web 搜索。未配置 provider → 返回 []。
 */
export async function webSearch(
  query: string,
  options: WebSearchOptions = {},
): Promise<WebSearchResult[]> {
  const { maxResults = 5, includeDomains } = options;
  const q = query.trim();
  if (!q) return [];

  // ── Tavily ─────────────────────────────────────────────────
  if (process.env.TAVILY_API_KEY) {
    try {
      const resp = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: process.env.TAVILY_API_KEY,
          query: q,
          max_results: maxResults,
          search_depth: 'basic',
          include_domains: includeDomains,
        }),
      });
      if (!resp.ok) throw new Error(`Tavily ${resp.status}`);
      const data = await resp.json();
      const results = Array.isArray(data?.results) ? data.results : [];
      return results.slice(0, maxResults).map((r: any) => ({
        title: String(r?.title ?? '').slice(0, 200),
        snippet: String(r?.content ?? '').slice(0, 500),
        url: String(r?.url ?? ''),
      }));
    } catch (e) {
      console.warn('[web-search] Tavily 失败:', e);
    }
  }

  // ── Serper.dev ────────────────────────────────────────────
  if (process.env.SERPER_API_KEY) {
    try {
      const resp = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': process.env.SERPER_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ q, num: maxResults }),
      });
      if (!resp.ok) throw new Error(`Serper ${resp.status}`);
      const data = await resp.json();
      const organic = Array.isArray(data?.organic) ? data.organic : [];
      return organic.slice(0, maxResults).map((r: any) => ({
        title: String(r?.title ?? '').slice(0, 200),
        snippet: String(r?.snippet ?? '').slice(0, 500),
        url: String(r?.link ?? ''),
      }));
    } catch (e) {
      console.warn('[web-search] Serper 失败:', e);
    }
  }

  return [];
}

/** 把搜索结果拼成一段简洁的 prompt 上下文（给 LLM 看） */
export function formatSearchResultsForPrompt(results: WebSearchResult[]): string {
  if (results.length === 0) return '';
  const lines = results.map((r, i) => {
    const title = r.title || '(无标题)';
    const snippet = r.snippet || '';
    return `[${i + 1}] ${title}\n${snippet}`;
  });
  return `【Web 参考资料】\n${lines.join('\n\n')}`;
}
