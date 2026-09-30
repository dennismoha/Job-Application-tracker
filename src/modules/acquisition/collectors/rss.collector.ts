import { ExtractionMethod, type Source } from '@prisma/client';

import { fetchPublicText } from './http-client.js';
import { decodeHtml, stripHtml } from './html-utils.js';
import type { CollectorResult, JobSourceCollector, RawJobListing } from './collector.types.js';

function tagValue(xml: string, tags: string[]): string | undefined {
  for (const tag of tags) {
    const pattern = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
    const value = xml.match(pattern)?.[1];
    if (value) return stripHtml(value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')).trim();
  }
  return undefined;
}

async function resolveFeedUrl(
  source: Source,
): Promise<{ feedUrl?: string; pageRequests: number; httpStatus?: number }> {
  const target = source.careersUrl ?? source.baseUrl;
  if (/\.(rss|xml)(?:$|\?)/i.test(target) || /\/(feed|rss)(?:\/|$)/i.test(target)) {
    return { feedUrl: target, pageRequests: 0 };
  }

  const { response, body } = await fetchPublicText(target);
  if (!response.ok) {
    return { pageRequests: 1, httpStatus: response.status };
  }

  const match = body.match(/<link[^>]+type=["']application\/(?:rss\+xml|atom\+xml)["'][^>]+href=["']([^"']+)["'][^>]*>/i)
    ?? body.match(/<link[^>]+href=["']([^"']+)["'][^>]+type=["']application\/(?:rss\+xml|atom\+xml)["'][^>]*>/i);

  if (!match?.[1]) throw new Error('The audit detected a feed, but no public feed URL could be resolved.');
  return { feedUrl: new URL(decodeHtml(match[1]), response.url).toString(), pageRequests: 1 };
}

export class RssCollector implements JobSourceCollector {
  name = 'rss';

  supports(): boolean {
    return true;
  }

  async collect(source: Source): Promise<CollectorResult> {
    const resolved = await resolveFeedUrl(source);
    if (!resolved.feedUrl) {
      return {
        listings: [],
        pagesRequested: resolved.pageRequests,
        httpStatus: resolved.httpStatus,
        metadata: { collector: this.name, reason: 'feed-discovery-unavailable' },
      };
    }

    const { response, body } = await fetchPublicText(resolved.feedUrl, {
      accept: 'application/rss+xml,application/atom+xml,text/xml,application/xml',
    });

    if (!response.ok) {
      return {
        listings: [],
        pagesRequested: resolved.pageRequests + 1,
        httpStatus: response.status,
        metadata: { collector: this.name, feedUrl: resolved.feedUrl },
      };
    }

    const chunks = [...body.matchAll(/<(?:item|entry)\b[^>]*>([\s\S]*?)<\/(?:item|entry)>/gi)].map(
      (match) => match[1] ?? '',
    );

    const listings: RawJobListing[] = chunks.map((chunk) => {
      const link = tagValue(chunk, ['link']);
      const href = chunk.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*\/?\s*>/i)?.[1];
      const url = href ?? link;

      return {
        sourceId: source.id,
        externalId: tagValue(chunk, ['guid', 'id']),
        sourceUrl: url,
        applyUrl: url,
        title: tagValue(chunk, ['title']),
        company: source.name,
        description: tagValue(chunk, ['description', 'summary', 'content']),
        postedAt: tagValue(chunk, ['pubDate', 'published', 'updated']),
        extractionMethod: ExtractionMethod.RSS,
        discoveredAt: new Date(),
        rawPayload: { xml: chunk },
      };
    });

    return {
      listings,
      pagesRequested: resolved.pageRequests + 1,
      httpStatus: response.status,
      metadata: { collector: this.name, feedUrl: resolved.feedUrl },
    };
  }
}
