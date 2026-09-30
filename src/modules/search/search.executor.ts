import { AcquisitionMethod, ExtractionMethod, RunStatus, RunType, type Source } from '@prisma/client';

import type { RawJobListing } from '../acquisition/collectors/collector.types.js';
import { jobIngestionService } from '../ingestion/ingestion.service.js';
import type { AcquisitionExecutionContext, AcquisitionExecutionResult, AcquisitionExecutor } from '../scheduler/acquisition-dispatcher.js';
import { webSearchProvider } from './web-search.provider.js';

function hostname(url: string): string | null {
  try { return new URL(url).hostname; } catch { return null; }
}

export class SearchSourceExecutor implements AcquisitionExecutor {
  supports(source: Source, runType: RunType): boolean {
    return source.collectionCapability === 'SEARCH_ONLY' || runType === RunType.WEB_SEARCH;
  }

  async execute(source: Source, _runType: RunType, context: AcquisitionExecutionContext): Promise<AcquisitionExecutionResult> {
    if (!webSearchProvider.configured()) {
      return {
        status: RunStatus.SKIPPED,
        errorCode: 'WEB_SEARCH_NOT_CONFIGURED',
        errorMessage: 'WEB_SEARCH_API_KEY is not configured.',
      };
    }

    const domain = hostname(source.careersUrl ?? source.baseUrl);
    if (!domain) {
      return { status: RunStatus.FAILED, errorCode: 'INVALID_SOURCE_URL', errorMessage: 'Source URL is invalid.' };
    }

    const results = await webSearchProvider.search({
      query: [
        `site:${domain}`,
        context.crawlerConfig?.keywords.length ? `(${context.crawlerConfig.keywords.join(' OR ')})` : '(job OR jobs OR career OR careers OR vacancy OR vacancies OR teacher OR engineer)',
        context.crawlerConfig?.subjects.length ? `(${context.crawlerConfig.subjects.join(' OR ')})` : '',
        context.crawlerConfig?.locations.length ? `(${context.crawlerConfig.locations.join(' OR ')})` : '',
      ].filter(Boolean).join(' '),
      limit: Math.min(context.crawlerConfig?.maximumRequests ?? source.maxRequestsPerRun, 20),
    });
    const discoveredAt = new Date();
    const listings: RawJobListing[] = results.map((result) => ({
      sourceId: source.id,
      acquisitionMethod: AcquisitionMethod.CRAWLER,
      sourceUrl: result.link,
      applyUrl: result.link,
      title: result.title,
      ...(result.snippet ? { description: result.snippet } : {}),
      ...(result.date ? { postedAt: result.date } : {}),
      extractionMethod: ExtractionMethod.API,
      discoveredAt,
      rawPayload: result,
    }));

    const summary = await jobIngestionService.processBatch(listings, { acquisitionRunId: context.runId });

    return {
      status: RunStatus.COMPLETED,
      pagesRequested: 1,
      listingsFound: listings.length,
      newListings: summary.newListings,
      updatedListings: summary.updatedListings,
      unchangedListings: summary.unchangedListings,
      newJobs: summary.newJobs,
      duplicates: summary.duplicates,
      quarantined: summary.quarantined,
      metadata: { provider: 'serper', domain },
    };
  }
}
