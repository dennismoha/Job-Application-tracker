import type { AcquisitionMethod, ExtractionMethod, Source } from '@prisma/client';

export interface RawJobListing {
  sourceId: string;
  acquisitionMethod?: AcquisitionMethod | undefined;
  externalId?: string | undefined;
  requisitionId?: string | undefined;
  sourceUrl?: string | undefined;
  applyUrl?: string | undefined;
  title?: string | undefined;
  company?: string | undefined;
  location?: string | undefined;
  description?: string | undefined;
  salary?: string | undefined;
  postedAt?: string | undefined;
  expiresAt?: string | undefined;
  startDate?: string | undefined;
  employmentType?: string | undefined;
  extractionMethod: ExtractionMethod;
  discoveredAt: Date;
  rawPayload: unknown;
}

export interface CollectorResult {
  listings: RawJobListing[];
  pagesRequested: number;
  httpStatus?: number | undefined;
  metadata?: Record<string, unknown> | undefined;
}

export interface JobSourceCollector {
  name: string;
  supports(source: Source, latestAuditProvider?: string | null): boolean;
  collect(source: Source): Promise<CollectorResult>;
}
