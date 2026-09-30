import { ExtractionMethod, type Source } from '@prisma/client';

import { fetchPublicText } from './http-client.js';
import type { CollectorResult, JobSourceCollector, RawJobListing } from './collector.types.js';

function tokenFromUrl(rawUrl: string): string | null {
  const url = new URL(rawUrl);
  if (!/jobs\.lever\.co$/i.test(url.hostname)) return null;
  const parts = url.pathname.split('/').filter(Boolean);
  return parts[0] ?? null;
}

async function resolveSiteToken(source: Source): Promise<{ token: string | null; discoveryRequests: number; httpStatus?: number }> {
  const rawUrl = source.careersUrl ?? source.baseUrl;
  const direct = tokenFromUrl(rawUrl);
  if (direct) return { token: direct, discoveryRequests: 0 };

  const { response, body } = await fetchPublicText(rawUrl);
  if (!response.ok) return { token: null, discoveryRequests: 1, httpStatus: response.status };
  const match = body.match(/https?:\/\/jobs\.lever\.co\/([a-z0-9_-]+)/i);
  return { token: match?.[1] ?? null, discoveryRequests: 1 };
}

interface LeverPosting {
  id: string;
  text: string;
  hostedUrl: string;
  applyUrl?: string;
  descriptionPlain?: string;
  createdAt?: number;
  categories?: {
    location?: string;
    commitment?: string;
    team?: string;
  };
}

export class LeverCollector implements JobSourceCollector {
  name = 'lever';

  supports(source: Source, latestAuditProvider?: string | null): boolean {
    const url = source.careersUrl ?? source.baseUrl;
    return latestAuditProvider === 'Lever' || /jobs\.lever\.co/i.test(url);
  }

  async collect(source: Source): Promise<CollectorResult> {
    const resolved = await resolveSiteToken(source);
    if (!resolved.token) {
      return {
        listings: [],
        pagesRequested: resolved.discoveryRequests,
        httpStatus: resolved.httpStatus,
        metadata: { collector: this.name, reason: 'missing-site-token' },
      };
    }

    const endpoint = `https://api.lever.co/v0/postings/${encodeURIComponent(resolved.token)}?mode=json`;
    const { response, body } = await fetchPublicText(endpoint, { accept: 'application/json' });

    if (!response.ok) {
      return {
        listings: [],
        pagesRequested: resolved.discoveryRequests + 1,
        httpStatus: response.status,
        metadata: { collector: this.name },
      };
    }

    const parsed = JSON.parse(body) as LeverPosting[];
    const listings: RawJobListing[] = parsed.map((job) => ({
      sourceId: source.id,
      externalId: job.id,
      sourceUrl: job.hostedUrl,
      applyUrl: job.applyUrl ?? job.hostedUrl,
      title: job.text,
      company: source.name,
      location: job.categories?.location,
      description: job.descriptionPlain,
      postedAt: job.createdAt ? new Date(job.createdAt).toISOString() : undefined,
      employmentType: job.categories?.commitment,
      extractionMethod: ExtractionMethod.ATS,
      discoveredAt: new Date(),
      rawPayload: job,
    }));

    return {
      listings,
      pagesRequested: resolved.discoveryRequests + 1,
      httpStatus: response.status,
      metadata: { collector: this.name, siteToken: resolved.token },
    };
  }
}
