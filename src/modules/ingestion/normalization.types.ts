import type {
  AcquisitionMethod,
  DateConfidence,
  EmploymentType,
  ExtractionMethod,
  FreshnessStatus,
  RemoteType,
  SalaryPeriod,
} from '@prisma/client';

export interface NormalizedJobCandidate {
  sourceId: string;
  acquisitionMethod: AcquisitionMethod;
  extractionMethod: ExtractionMethod;

  externalId?: string | undefined;
  requisitionId?: string | undefined;
  sourceUrl?: string | undefined;
  applyUrl?: string | undefined;

  rawTitle: string;
  title: string;
  normalizedTitle: string;

  companyName?: string | undefined;
  normalizedCompanyName?: string | undefined;

  rawLocation?: string | undefined;
  city?: string | undefined;
  country?: string | undefined;
  locationText?: string | undefined;

  description?: string | undefined;

  remoteType: RemoteType;
  employmentType: EmploymentType;

  salaryMin?: number | undefined;
  salaryMax?: number | undefined;
  salaryCurrency?: string | undefined;
  salaryPeriod: SalaryPeriod;
  salaryText?: string | undefined;

  postedAt?: Date | undefined;
  postedDateConfidence: DateConfidence;
  expiresAt?: Date | undefined;
  startDate?: Date | undefined;

  academicYear?: string | undefined;
  freshnessStatus: FreshnessStatus;
  categorySlug?: string | undefined;

  fingerprint: string;
  contentHash: string;
  discoveredAt: Date;
  rawPayload: unknown;
}

export interface ValidationResult {
  valid: boolean;
  reasons: string[];
}
