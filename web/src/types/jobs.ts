export interface SourceSummary {
  id: string;
  name: string;
  sourceType?: string;
  collectionCapability?: string;
  systemOwned?: boolean;
  systemRiskLevel?: string;
  health?: { status: string } | null;
  schedule?: { nextRunAt?: string | null; lastSuccessfulRunAt?: string | null } | null;
  _count?: { listings?: number; subscriptions?: number; organizationLinks?: number };
}

export interface JobListingSummary {
  id: string;
  sourceUrl?: string | null;
  applyUrl?: string | null;
  acquisitionMethod?: string;
  postedAt?: string | null;
  firstSeenAt: string;
  isOfficial: boolean;
  status?: string;
  expiresAt?: string | null;
  source: SourceSummary;
}

export interface UserJobState {
  disposition: string;
  firstViewedAt?: string | null;
  lastViewedAt?: string | null;
  customExpiresAt?: string | null;
  preferredCvVersionId?: string | null;
}

export interface JobSummary { 
  id: string;
  title: string;
  locationText?: string | null;
  remoteType?: string;
  salaryText?: string | null;
  country?: string | null;
  status: string;
  freshnessStatus: string;
  firstSeenAt: string;
  earliestPostedAt?: string | null;
  officialApplyUrl?: string | null;
  company?: { id: string; name: string } | null;
  primaryCategory?: { id: string; name: string } | null;
  listings: JobListingSummary[];
  userStates: UserJobState[];
  applications: Array<{ id: string; stage: string; appliedAt: string }>;
  profileMatches?: Array<{
    id: string;
    score?: number | null;
    eligibility: string;
    matchedAt: string;
  }>;
  createdByUserId?: string | null;
  visibility?: string;
  canEdit?: boolean;
  expiresAt?: string | null;
}

export interface JobDetail extends JobSummary {
  description?: string | null;
  salaryText?: string | null;
  employmentType: string;
  remoteType: string;
  notes: Array<{ id: string; note: string; createdAt: string }>;
}

export interface JobsResponse {
  jobs: JobSummary[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

export interface SearchProfileSummary {
  id: string;
  name: string;
  description?: string | null;
  keywords: string[];
  excludedKeywords: string[];
  countries: string[];
  locations: string[];
  remoteOnly: boolean;
  defaultFreshnessDays: number;
  defaultExpiryDays: number;
  enabled: boolean;
  categories?: Array<{ id: string; name: string; slug: string }>;
}

export interface SourceSubscriptionSummary {
  id: string;
  profileId: string;
  sourceId: string;
  enabled: boolean;
  preferredIntervalMinutes?: number | null;
  source: SourceSummary;
}
