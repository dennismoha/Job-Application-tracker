import { AcquisitionMethod, CollectionCapability, IngestionStatus, RunStatus, RunType, type Source } from '@prisma/client';

import { prisma } from '../../../shared/prisma/prisma-client.js';
import { jobIngestionService } from '../../ingestion/ingestion.service.js';
import type { AcquisitionExecutionContext, AcquisitionExecutionResult, AcquisitionExecutor } from '../../scheduler/acquisition-dispatcher.js';
import { resolveCollector } from './collector-registry.js';
import type { JobSourceCollector } from './collector.types.js';


function filterByCrawlerConfig(listings: Awaited<ReturnType<JobSourceCollector["collect"]>>["listings"], context: AcquisitionExecutionContext) {
  const config = context.crawlerConfig;
  if (!config) return listings;
  const needles = [...config.keywords, ...config.subjects].map((value) => value.toLowerCase()).filter(Boolean);
  const locations = config.locations.map((value) => value.toLowerCase()).filter(Boolean);
  return listings.filter((listing) => {
    const text = `${listing.title ?? ''} ${listing.description ?? ''} ${listing.company ?? ''}`.toLowerCase();
    const location = (listing.location ?? '').toLowerCase();
    const keywordMatch = needles.length === 0 || needles.some((needle) => text.includes(needle));
    const locationMatch = locations.length === 0 || locations.some((needle) => location.includes(needle));
    return keywordMatch && locationMatch;
  });
}

export class SourceCollectorExecutor implements AcquisitionExecutor {
  supports(source: Source, runType: RunType): boolean {
    const crawlable = source.collectionCapability === CollectionCapability.CRAWLABLE
      || source.collectionCapability === CollectionCapability.MANUAL_ONLY;
    const crawlRun = runType === RunType.SCHEDULED_CRAWL || runType === RunType.MANUAL_CRAWL;
    return crawlable && crawlRun;
  }

  async execute(
    source: Source,
    _runType: RunType,
    context: AcquisitionExecutionContext,
  ): Promise<AcquisitionExecutionResult> {
    const latestAudit = await prisma.sourceAudit.findFirst({
      where: { sourceId: source.id },
      orderBy: { auditedAt: 'desc' },
    });

    if (latestAudit?.robotsAllows === false) {
      return {
        status: RunStatus.SKIPPED,
        pagesRequested: 0,
        listingsFound: 0,
        errorCode: 'ROBOTS_DISALLOWED',
        errorMessage: 'The latest source audit indicates that the public path should not be crawled.',
      };
    }

    if (latestAudit?.challengeDetected) {
      return {
        status: RunStatus.CHALLENGED,
        pagesRequested: 0,
        listingsFound: 0,
        errorCode: 'SOURCE_CHALLENGED',
        errorMessage: 'The latest audit observed an automated-access challenge. No direct crawl was attempted.',
      };
    }

    const collector = await resolveCollector(source);
    const collected = await collector.collect(source);
    const filteredListings = filterByCrawlerConfig(collected.listings, context);

    if (collected.httpStatus && [403, 429].includes(collected.httpStatus)) {
      return {
        status: collected.httpStatus === 429 ? RunStatus.RATE_LIMITED : RunStatus.CHALLENGED,
        httpStatus: collected.httpStatus,
        pagesRequested: collected.pagesRequested,
        listingsFound: 0,
        errorCode: collected.httpStatus === 429 ? 'RATE_LIMITED' : 'ACCESS_CHALLENGED',
        errorMessage: 'The public source did not permit this collection run. No bypass was attempted.',
        metadata: collected.metadata,
      };
    }

    const health = await prisma.sourceHealth.findUnique({ where: { sourceId: source.id } });
    const expectedBeforeRun = health?.expectedListingCount ?? null;
    const listingCount = filteredListings.length;
    const structuralDrop = Boolean(
      expectedBeforeRun !== null &&
      expectedBeforeRun >= 10 &&
      listingCount < Math.max(1, Math.floor(expectedBeforeRun * 0.2)),
    );

    const summary = await jobIngestionService.processBatch(filteredListings, {
      acquisitionRunId: context.runId,
    });

    const failedCount = summary.outcomes.filter((item) => item.status === IngestionStatus.FAILED).length;
    const status = structuralDrop
      ? RunStatus.PARTIAL
      : failedCount > 0 && failedCount < filteredListings.length
        ? RunStatus.PARTIAL
        : failedCount > 0
          ? RunStatus.FAILED
          : RunStatus.COMPLETED;

    const expectedListingCount = expectedBeforeRun === null
      ? listingCount
      : Math.round(expectedBeforeRun * 0.8 + listingCount * 0.2);

    await prisma.sourceHealth.upsert({
      where: { sourceId: source.id },
      create: {
        sourceId: source.id,
        lastListingCount: listingCount,
        expectedListingCount,
      },
      update: {
        lastListingCount: listingCount,
        ...(structuralDrop ? {} : { expectedListingCount }),
      },
    });

    return {
      status,
      httpStatus: collected.httpStatus,
      pagesRequested: collected.pagesRequested,
      listingsFound: filteredListings.length,
      newListings: summary.newListings,
      updatedListings: summary.updatedListings,
      unchangedListings: summary.unchangedListings,
      newJobs: summary.newJobs,
      duplicates: summary.duplicates,
      quarantined: summary.quarantined,
      metadata: {
        ...collected.metadata,
        collector: collector.name,
        failedIngestions: failedCount,
        structuralDrop,
        expectedBeforeRun,
        collectedBeforeConfigFilter: collected.listings.length,
        crawlerConfigId: context.crawlerConfig?.id,
      },
    };
  }
}
