import { ExtractionMethod, type Source } from '@prisma/client';

import { fetchPublicText } from './http-client.js';
import type { CollectorResult, JobSourceCollector, RawJobListing } from './collector.types.js';

function tokenFromUrl(rawUrl: string): string | null {
  const url = new URL(rawUrl);
  if (!/greenhouse\.io$|greenhouse\.com$/i.test(url.hostname)) return null;
  const parts = url.pathname.split('/').filter(Boolean);
  return parts[0] ?? null;
}

async function resolveBoardToken(source: Source): Promise<{ token: string | null; discoveryRequests: number; httpStatus?: number }> {
  const rawUrl = source.careersUrl ?? source.baseUrl;
  const direct = tokenFromUrl(rawUrl);
  if (direct) return { token: direct, discoveryRequests: 0 };

  const { response, body } = await fetchPublicText(rawUrl);
  if (!response.ok) return { token: null, discoveryRequests: 1, httpStatus: response.status };
  const match = body.match(/https?:\/\/(?:boards|job-boards)\.greenhouse\.io\/([a-z0-9_-]+)/i)
    ?? body.match(/https?:\/\/boards\.greenhouse\.com\/([a-z0-9_-]+)/i);
  return { token: match?.[1] ?? null, discoveryRequests: 1 };
}

interface GreenhouseJob {
  id: number;
  title: string;
  absolute_url: string;
  content?: string;
  updated_at?: string;
  location?: { name?: string };
  offices?: Array<{ name?: string }>;
}

export class GreenhouseCollector implements JobSourceCollector {
  name = 'greenhouse';

  supports(source: Source, latestAuditProvider?: string | null): boolean {
    const url = source.careersUrl ?? source.baseUrl;
    return latestAuditProvider === 'Greenhouse' || /greenhouse\.io|greenhouse\.com/i.test(url);
  }

  async collect(source: Source): Promise<CollectorResult> {
    const resolved = await resolveBoardToken(source);
    if (!resolved.token) {
      return {
        listings: [],
        pagesRequested: resolved.discoveryRequests,
        httpStatus: resolved.httpStatus,
        metadata: { collector: this.name, reason: 'missing-board-token' },
      };
    }

    const endpoint = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(resolved.token)}/jobs?content=true`;
    const { response, body } = await fetchPublicText(endpoint, { accept: 'application/json' });

    if (!response.ok) {
      return {
        listings: [],
        pagesRequested: resolved.discoveryRequests + 1,
        httpStatus: response.status,
        metadata: { collector: this.name },
      };
    }

    const parsed = JSON.parse(body) as { jobs?: GreenhouseJob[] };
    const listings: RawJobListing[] = (parsed.jobs ?? []).map((job) => ({
      sourceId: source.id,
      externalId: String(job.id),
      sourceUrl: job.absolute_url,
      applyUrl: job.absolute_url,
      title: job.title,
      company: source.name,
      location: job.location?.name ?? job.offices?.map((office) => office.name).filter(Boolean).join(', '),
      description: job.content,
      postedAt: job.updated_at,
      extractionMethod: ExtractionMethod.ATS,
      discoveredAt: new Date(),
      rawPayload: job,
    }));

    return {
      listings,
      pagesRequested: resolved.discoveryRequests + 1,
      httpStatus: response.status,
      metadata: { collector: this.name, boardToken: resolved.token },
    };
  }
}
