import type { Job, JobListing } from '@prisma/client';

import { normalizeCompanyName, normalizeTitle } from '../ingestion/normalizer.js';
import type { NormalizedJobCandidate } from '../ingestion/normalization.types.js';

function tokens(value?: string | null): Set<string> {
  return new Set(
    (value ?? '')
      .toLowerCase()
      .split(/[^a-z0-9+#.]+/)
      .map((item) => item.trim())
      .filter((item) => item.length > 1),
  );
}

export function tokenSimilarity(left?: string | null, right?: string | null): number {
  const a = tokens(left);
  const b = tokens(right);
  if (a.size === 0 || b.size === 0) return 0;

  let intersection = 0;
  for (const item of a) {
    if (b.has(item)) intersection += 1;
  }

  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
}

export interface ComparableJob extends Job {
  company?: { normalizedName: string; name: string } | null;
  listings?: JobListing[];
}

export interface DeduplicationScore {
  score: number;
  hardConflict: boolean;
  evidence: Record<string, number | boolean | string | null>;
}

export function scoreCandidate(candidate: NormalizedJobCandidate, job: ComparableJob): DeduplicationScore {
  const jobCompany = job.company?.normalizedName ?? '';
  const companySimilarity = candidate.normalizedCompanyName
    ? tokenSimilarity(candidate.normalizedCompanyName, jobCompany)
    : 0;
  const titleSimilarity = tokenSimilarity(candidate.normalizedTitle, normalizeTitle(job.normalizedTitle));
  const locationSimilarity = candidate.city && job.city
    ? candidate.city.toLowerCase() === job.city.toLowerCase() ? 1 : 0
    : candidate.country && job.country
      ? candidate.country === job.country ? 0.7 : 0
      : 0.4;
  const descriptionSimilarity = tokenSimilarity(candidate.description?.slice(0, 8_000), job.description?.slice(0, 8_000));

  const candidateApply = candidate.applyUrl ?? '';
  const applyMatch = Boolean(candidateApply && job.listings?.some((listing) => listing.applyUrl === candidateApply));
  const requisitionMatch = Boolean(
    candidate.requisitionId && job.listings?.some((listing) => listing.requisitionId === candidate.requisitionId),
  );

  const cityConflict = Boolean(candidate.city && job.city && candidate.city.toLowerCase() !== job.city.toLowerCase());
  const countryConflict = Boolean(candidate.country && job.country && candidate.country !== job.country);
  const hardConflict = cityConflict || countryConflict;

  let dateScore = 0;
  if (candidate.postedAt && job.earliestPostedAt) {
    const days = Math.abs(candidate.postedAt.getTime() - job.earliestPostedAt.getTime()) / 86_400_000;
    dateScore = days <= 3 ? 3 : days <= 7 ? 2 : days <= 14 ? 1 : 0;
  }

  const salaryComparable = candidate.salaryMin !== undefined && job.salaryMin !== null;
  const salaryScore = salaryComparable && Math.abs(candidate.salaryMin! - Number(job.salaryMin)) < 1 ? 2 : 0;

  let score = 0;
  score += companySimilarity * 30;
  score += titleSimilarity * 25;
  score += locationSimilarity * 15;
  score += descriptionSimilarity * 15;
  score += applyMatch ? 10 : 0;
  score += requisitionMatch ? 10 : 0;
  score += dateScore;
  score += salaryScore;

  if (hardConflict) score -= 35;
  score = Math.max(0, Math.min(100, score));

  return {
    score: Math.round(score * 100) / 100,
    hardConflict,
    evidence: {
      companySimilarity,
      titleSimilarity,
      locationSimilarity,
      descriptionSimilarity,
      applyMatch,
      requisitionMatch,
      dateScore,
      salaryScore,
      cityConflict,
      countryConflict,
    },
  };
}

export function companiesEquivalent(left?: string, right?: string): boolean {
  if (!left || !right) return false;
  return normalizeCompanyName(left) === normalizeCompanyName(right);
}
