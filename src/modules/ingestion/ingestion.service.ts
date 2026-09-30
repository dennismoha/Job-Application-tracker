import { IngestionStatus, JobVisibility, type Prisma } from '@prisma/client';

import { prisma } from '../../shared/prisma/prisma-client.js';
import type { RawJobListing } from '../acquisition/collectors/collector.types.js';
import { deduplicationService, type PersistCandidateResult } from '../jobs/deduplication.service.js';
import { normalizeRawListing } from './normalizer.js';
import { validateCandidate } from './validator.js';

function jsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
}

function normalizedJson(candidate: ReturnType<typeof normalizeRawListing>): Prisma.InputJsonValue {
  return jsonValue({
    ...candidate,
    postedAt: candidate.postedAt?.toISOString(),
    expiresAt: candidate.expiresAt?.toISOString(),
    startDate: candidate.startDate?.toISOString(),
    discoveredAt: candidate.discoveredAt.toISOString(),
  });
}

export interface IngestionOptions {
  acquisitionRunId?: string | undefined;
  emailIngestionId?: string | undefined;
  createdByUserId?: string | undefined;
  visibility?: JobVisibility | undefined;
}

export interface IngestionOutcome {
  ingestionId: string;
  status: IngestionStatus;
  result?: PersistCandidateResult | undefined;
  reasons?: string[] | undefined;
  errorMessage?: string | undefined;
}

export interface IngestionBatchSummary {
  outcomes: IngestionOutcome[];
  newListings: number;
  updatedListings: number;
  unchangedListings: number;
  newJobs: number;
  duplicates: number;
  quarantined: number;
}

export const jobIngestionService = {
  async processOne(raw: RawJobListing, options: IngestionOptions = {}): Promise<IngestionOutcome> {
    const ingestion = await prisma.jobIngestion.create({
      data: {
        sourceId: raw.sourceId,
        ...(options.acquisitionRunId ? { acquisitionRunId: options.acquisitionRunId } : {}),
        ...(options.emailIngestionId ? { emailIngestionId: options.emailIngestionId } : {}),
        status: IngestionStatus.RECEIVED,
        extractionMethod: raw.extractionMethod,
        ...(raw.externalId ? { externalId: raw.externalId } : {}),
        ...(raw.sourceUrl ? { sourceUrl: raw.sourceUrl } : {}),
        rawPayload: jsonValue(raw.rawPayload),
        discoveredAt: raw.discoveredAt,
      },
    });

    try {
      await prisma.jobIngestion.update({
        where: { id: ingestion.id },
        data: { status: IngestionStatus.EXTRACTING, processingAttempts: { increment: 1 } },
      });

      const candidate = normalizeRawListing(raw);
      await prisma.jobIngestion.update({
        where: { id: ingestion.id },
        data: {
          status: IngestionStatus.NORMALIZED,
          extractedPayload: jsonValue(raw),
          normalizedPayload: normalizedJson(candidate),
        },
      });

      const validation = validateCandidate(candidate);
      if (!validation.valid) {
        await prisma.jobIngestion.update({
          where: { id: ingestion.id },
          data: {
            status: IngestionStatus.QUARANTINED,
            errorMessage: validation.reasons.join(' '),
            processedAt: new Date(),
          },
        });

        return {
          ingestionId: ingestion.id,
          status: IngestionStatus.QUARANTINED,
          reasons: validation.reasons,
        };
      }

      await prisma.jobIngestion.update({
        where: { id: ingestion.id },
        data: { status: IngestionStatus.VALIDATED },
      });

      const result = await deduplicationService.persistCandidate(candidate, {
        ingestionId: ingestion.id,
        ...(options.acquisitionRunId ? { acquisitionRunId: options.acquisitionRunId } : {}),
        ...(options.createdByUserId ? { createdByUserId: options.createdByUserId } : {}),
        ...(options.visibility ? { visibility: options.visibility } : {}),
      });

      await prisma.jobIngestion.update({
        where: { id: ingestion.id },
        data: {
          status: IngestionStatus.PERSISTED,
          processedAt: new Date(),
        },
      });

      return { ingestionId: ingestion.id, status: IngestionStatus.PERSISTED, result };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown ingestion error.';
      await prisma.jobIngestion.update({
        where: { id: ingestion.id },
        data: {
          status: IngestionStatus.FAILED,
          errorMessage: message,
          processedAt: new Date(),
        },
      });

      return { ingestionId: ingestion.id, status: IngestionStatus.FAILED, errorMessage: message };
    }
  },

  async processBatch(rawListings: RawJobListing[], options: IngestionOptions = {}): Promise<IngestionBatchSummary> {
    const outcomes: IngestionOutcome[] = [];

    // Process sequentially so a single source cannot create a burst of database writes.
    // Source-level collection is already concurrent at the worker level when appropriate.
    for (const raw of rawListings) {
      outcomes.push(await jobIngestionService.processOne(raw, options));
    }

    const persisted = outcomes.flatMap((outcome) => (outcome.result ? [outcome.result] : []));

    return {
      outcomes,
      newListings: persisted.filter((item) => item.newListing).length,
      updatedListings: persisted.filter((item) => item.updatedListing).length,
      unchangedListings: persisted.filter((item) => !item.newListing && !item.updatedListing).length,
      newJobs: persisted.filter((item) => item.newJob).length,
      duplicates: persisted.filter((item) => item.duplicate).length,
      quarantined: outcomes.filter((item) => item.status === IngestionStatus.QUARANTINED).length,
    };
  },
};
