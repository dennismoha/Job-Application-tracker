import { ExtractionMethod, type Source } from '@prisma/client';

import { fetchPublicText, sleepForSource } from './http-client.js';
import { extractHeading, extractLikelyJobLinks, extractMetaContent, stripHtml } from './html-utils.js';
import { extractJobPostingNodes, jobPostingToRaw } from './json-ld.collector.js';
import type { CollectorResult, JobSourceCollector, RawJobListing } from './collector.types.js';

function pageToRaw(source: Source, url: string, html: string): RawJobListing | null {
  const nodes = extractJobPostingNodes(html);
  if (nodes[0]) return jobPostingToRaw(source, nodes[0], url);

  const title = extractHeading(html);
  const description = extractMetaContent(html, ['description', 'og:description']) ?? stripHtml(html).slice(0, 20_000);

  if (!title || description.length < 80) return null;
  if (/^(careers?|jobs?|vacancies|join us|work with us)$/i.test(title.trim())) return null;

  const jobEvidence = `${url} ${title} ${description.slice(0, 3000)}`;
  if (!/(apply|responsibilit|requirement|qualification|teacher|engineer|developer|position|vacanc|employment)/i.test(jobEvidence)) {
    return null;
  }

  return {
    sourceId: source.id,
    sourceUrl: url,
    applyUrl: url,
    title,
    company: source.name,
    description,
    extractionMethod: ExtractionMethod.GENERIC_HTML,
    discoveredAt: new Date(),
    rawPayload: { title, description },
  };
}

export class StaticHtmlCollector implements JobSourceCollector {
  name = 'static-html';

  supports(): boolean {
    return true;
  }

  async collect(source: Source): Promise<CollectorResult> {
    const targetUrl = source.careersUrl ?? source.baseUrl;
    const root = await fetchPublicText(targetUrl);
    if (!root.response.ok) {
      return {
        listings: [],
        pagesRequested: 1,
        httpStatus: root.response.status,
        metadata: { collector: this.name, discoveredLinks: 0 },
      };
    }

    const rootNodes = extractJobPostingNodes(root.body);

    if (rootNodes.length > 0) {
      return {
        listings: rootNodes.map((node) => jobPostingToRaw(source, node, root.response.url)),
        pagesRequested: 1,
        httpStatus: root.response.status,
        metadata: { collector: this.name, usedRootJsonLd: true },
      };
    }

    const maximumJobPages = Math.max(0, Math.min(source.maxRequestsPerRun - 1, 12));
    const rootOrigin = new URL(root.response.url).origin;
    const rootCanonical = root.response.url.replace(/#.*$/, '');
    const links = extractLikelyJobLinks(root.body, root.response.url)
      .filter((link) => new URL(link).origin === rootOrigin)
      .filter((link) => link !== rootCanonical)
      .slice(0, maximumJobPages);
    const listings: RawJobListing[] = [];
    let pagesRequested = 1;

    for (const link of links) {
      await sleepForSource(source.minimumRequestDelayMs);
      const page = await fetchPublicText(link);
      pagesRequested += 1;
      if (!page.response.ok) continue;
      const listing = pageToRaw(source, page.response.url, page.body);
      if (listing) listings.push(listing);
    }

    return {
      listings,
      pagesRequested,
      httpStatus: root.response.status,
      metadata: { collector: this.name, discoveredLinks: links.length },
    };
  }
}
