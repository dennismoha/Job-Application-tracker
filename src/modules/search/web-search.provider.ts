import { env } from '../../config/env.js';

export interface WebSearchResult {
  title: string;
  link: string;
  snippet?: string | undefined;
  date?: string | undefined;
}

export interface WebSearchRequest {
  query: string;
  countryCode?: string | undefined;
  languageCode?: string | undefined;
  limit?: number | undefined;
}

interface SerperResponse {
  organic?: Array<{
    title?: string;
    link?: string;
    snippet?: string;
    date?: string;
  }>;
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export const webSearchProvider = {
  configured(): boolean {
    return Boolean(env.WEB_SEARCH_API_KEY);
  },

  async search(input: WebSearchRequest): Promise<WebSearchResult[]> {
    if (!env.WEB_SEARCH_API_KEY) {
      throw new Error('WEB_SEARCH_API_KEY is required before internet-wide search can run.');
    }

    const response = await fetch(env.WEB_SEARCH_ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'X-API-KEY': env.WEB_SEARCH_API_KEY,
      },
      body: JSON.stringify({
        q: input.query,
        ...(input.countryCode ? { gl: input.countryCode.toLowerCase() } : {}),
        ...(input.languageCode ? { hl: input.languageCode.toLowerCase() } : {}),
        num: Math.min(input.limit ?? 10, 20),
      }),
      signal: AbortSignal.timeout(20_000),
    });

    if (!response.ok) {
      throw new Error(`Web search provider returned HTTP ${response.status}.`);
    }

    const payload = (await response.json()) as SerperResponse;

    return (payload.organic ?? [])
      .flatMap((item) => {
        if (!item.title || !item.link || !isHttpUrl(item.link)) return [];
        return [{
          title: item.title,
          link: item.link,
          ...(item.snippet ? { snippet: item.snippet } : {}),
          ...(item.date ? { date: item.date } : {}),
        }];
      })
      .slice(0, input.limit ?? 10);
  },
};
