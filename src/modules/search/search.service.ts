import { AcquisitionMethod, ExtractionMethod, JobVisibility } from '@prisma/client';

import { BadRequestError, NotFoundError } from '../../shared/http/http-error.js';
import { prisma } from '../../shared/prisma/prisma-client.js';
import type { RawJobListing } from '../acquisition/collectors/collector.types.js';
import { jobIngestionService } from '../ingestion/ingestion.service.js';
import { sourceService } from '../sources/source.service.js';
import { webSearchProvider, type WebSearchResult } from './web-search.provider.js';

function looksLikeJobResult(result: WebSearchResult): boolean {
  const value = `${result.title} ${result.link} ${result.snippet ?? ''}`.toLowerCase();
  return /\b(job|jobs|career|careers|vacancy|vacancies|position|teacher|engineer|developer|apply)\b/.test(value);
}

export const searchService = {
  async search(
    userId: string,
    input: { query: string; profileId?: string; countryCode?: string; languageCode: string; limit: number },
  ) {
    if (!webSearchProvider.configured()) {
      throw new BadRequestError('Internet search is not configured. Add WEB_SEARCH_API_KEY first.');
    }

    if (input.profileId) {
      const profile = await prisma.searchProfile.findFirst({ where: { id: input.profileId, userId }, select: { id: true } });
      if (!profile) throw new NotFoundError('Search profile not found.');
    }

    const results = await webSearchProvider.search({
      query: input.query,
      ...(input.countryCode ? { countryCode: input.countryCode } : {}),
      languageCode: input.languageCode,
      // limit: input.limit,
    });

    const discoveredAt = new Date();
    const accepted = results.filter(looksLikeJobResult);
    const unclassified = await sourceService.ensureUnclassifiedSource();
    const resolutions = await Promise.all(accepted.map(async (result) => ({ result, resolution: await sourceService.resolveByUrl(result.link) })));
    const raw: RawJobListing[] = resolutions.map(({ result, resolution }) => ({
      sourceId: resolution.source?.id ?? unclassified.id,
      acquisitionMethod: AcquisitionMethod.UNIVERSAL_SEARCH,
      sourceUrl: result.link,
      applyUrl: result.link,
      title: result.title,
      ...(result.snippet ? { description: result.snippet } : {}),
      ...(result.date ? { postedAt: result.date } : {}),
      extractionMethod: ExtractionMethod.API,
      discoveredAt,
      rawPayload: {
        ...result,
        acquisitionChannel: 'UNIVERSAL_SEARCH',
        detectedHostname: resolution.hostname,
        sourceMatched: resolution.matched,
      },
    }));

    const summary = await jobIngestionService.processBatch(raw, { createdByUserId: userId, visibility: JobVisibility.PUBLIC });
    const knownSources = [...new Map(
      resolutions.flatMap(({ resolution }) => resolution.source ? [[resolution.source.id, resolution.source]] : []),
    ).values()].map((source) => ({ id: source.id, name: source.name, baseUrl: source.baseUrl }));
    const domains = [...new Set(resolutions.flatMap(({ resolution }) => resolution.hostname ? [resolution.hostname] : []))];

    return {
      query: input.query,
      results: accepted.map((result, index) => ({
        ...result,
        ingestion: summary.outcomes[index],
        detectedSource: resolutions[index]?.resolution.source ? {
          id: resolutions[index]!.resolution.source!.id,
          name: resolutions[index]!.resolution.source!.name,
        } : null,
        sourceClassification: resolutions[index]?.resolution.matched ? 'MATCHED' : 'UNCLASSIFIED',
        acquisitionMethod: AcquisitionMethod.UNIVERSAL_SEARCH,
      })),
      domains,
      knownSources,
      unclassifiedSource: { id: unclassified.id, name: unclassified.name },
      ingestion: summary,
    };
  },
};
