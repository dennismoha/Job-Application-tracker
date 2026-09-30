import {
  DeduplicationDecision,
  DeduplicationMethod,
  JobStatus,
  JobStatusEventType,
  JobVisibility,
  ListingStatus,
  SourceType,
  type Prisma,
} from '@prisma/client';

import { NotFoundError } from '../../shared/http/http-error.js';
import { prisma } from '../../shared/prisma/prisma-client.js';
import { normalizeJobUrl } from '../../shared/urls/url-integrity.js';
import { aiDuplicateDecision } from '../ai/ai-deduplication.js';
import type { NormalizedJobCandidate } from '../ingestion/normalization.types.js';
import { scoreCandidate } from './deduplication.scoring.js';

export interface PersistCandidateOptions {
  ingestionId: string;
  acquisitionRunId?: string | undefined;
  createdByUserId?: string | undefined;
  visibility?: JobVisibility | undefined;
}

export interface PersistCandidateResult {
  jobId: string;
  listingId: string;
  newJob: boolean;
  newListing: boolean;
  updatedListing: boolean;
  duplicate: boolean;
  confidence: number;
}

function jsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
}

function normalizedListingUrl(candidate: NormalizedJobCandidate): string | null {
  const value = candidate.sourceUrl ?? candidate.applyUrl;
  if (!value) return null;
  try { return normalizeJobUrl(value); } catch { return null; }
}

function listingKey(candidate: NormalizedJobCandidate, options: PersistCandidateOptions): string {
  const baseKey = candidate.externalId
    ? `external:${candidate.externalId}`
    : normalizedListingUrl(candidate)
      ? `url:${normalizedListingUrl(candidate)}`
      : candidate.requisitionId
        ? `req:${candidate.requisitionId}`
        : `content:${candidate.contentHash}`;

  // Private manual entries share the system's Manual Entry source, so the user
  // scope must be part of the listing key. Without this, two users submitting
  // the same URL could update each other's private listing.
  if (options.visibility === JobVisibility.PRIVATE && options.createdByUserId) {
    return `user:${options.createdByUserId}:${baseKey}`;
  }

  return baseKey;
}

async function findOrCreateCompany(candidate: NormalizedJobCandidate) {
  if (!candidate.companyName || !candidate.normalizedCompanyName) return null;

  const existing = await prisma.company.findFirst({
    where: { normalizedName: candidate.normalizedCompanyName },
  });

  if (existing) return existing;

  return prisma.company.create({
    data: {
      name: candidate.companyName,
      normalizedName: candidate.normalizedCompanyName,
      ...(candidate.country ? { country: candidate.country } : {}),
      ...(candidate.city ? { city: candidate.city } : {}),
    },
  });
}

async function categoryIdFor(slug?: string): Promise<string | null> {
  if (!slug) return null;
  const category = await prisma.jobCategory.findUnique({ where: { slug }, select: { id: true } });
  return category?.id ?? null;
}

async function updateExistingListing(
  listingId: string,
  candidate: NormalizedJobCandidate,
  options: PersistCandidateOptions,
): Promise<PersistCandidateResult> {
  const listing = await prisma.jobListing.findUnique({
    where: { id: listingId },
    include: { job: true },
  });

  if (!listing) throw new NotFoundError('Existing listing was not found.');

  if (listing.contentHash && listing.contentHash !== candidate.contentHash) {
    await prisma.jobListingRevision.create({
      data: {
        listingId: listing.id,
        contentHash: candidate.contentHash,
        snapshot: jsonValue(candidate),
      },
    });
  }

  await prisma.$transaction([
    prisma.jobListing.update({
      where: { id: listing.id },
      data: {
        ...(candidate.externalId ? { externalId: candidate.externalId } : {}),
        ...(candidate.requisitionId ? { requisitionId: candidate.requisitionId } : {}),
        ...(candidate.sourceUrl ? { sourceUrl: normalizeJobUrl(candidate.sourceUrl), normalizedUrl: normalizeJobUrl(candidate.sourceUrl) } : {}),
        ...(candidate.applyUrl ? { applyUrl: normalizeJobUrl(candidate.applyUrl) } : {}),
        rawTitle: candidate.rawTitle,
        ...(candidate.description ? { rawDescription: candidate.description } : {}),
        ...(candidate.rawLocation ? { rawLocation: candidate.rawLocation } : {}),
        ...(candidate.postedAt ? { postedAt: candidate.postedAt } : {}),
        postedDateConfidence: candidate.postedDateConfidence,
        ...(candidate.expiresAt ? { expiresAt: candidate.expiresAt } : {}),
        lastSeenAt: candidate.discoveredAt,
        status: ListingStatus.ACTIVE,
        contentHash: candidate.contentHash,
        rawPayload: jsonValue(candidate.rawPayload),
        ingestionId: options.ingestionId,
        ...(options.acquisitionRunId ? { acquisitionRunId: options.acquisitionRunId } : {}),
      },
    }),
    prisma.job.update({
      where: { id: listing.jobId },
      data: {
        lastSeenAt: candidate.discoveredAt,
        status: JobStatus.ACTIVE,
        ...(candidate.postedAt && (!listing.job.earliestPostedAt || candidate.postedAt < listing.job.earliestPostedAt)
          ? { earliestPostedAt: candidate.postedAt }
          : {}),
        ...(candidate.postedAt && (!listing.job.latestPostedAt || candidate.postedAt > listing.job.latestPostedAt)
          ? { latestPostedAt: candidate.postedAt }
          : {}),
        ...(listing.isOfficial && candidate.applyUrl ? { officialApplyUrl: candidate.applyUrl } : {}),
      },
    }),
  ]);

  return {
    jobId: listing.jobId,
    listingId: listing.id,
    newJob: false,
    newListing: false,
    updatedListing: listing.contentHash !== candidate.contentHash,
    duplicate: true,
    confidence: 1,
  };
}

async function createListing(
  jobId: string,
  candidate: NormalizedJobCandidate,
  options: PersistCandidateOptions,
  method: DeduplicationMethod,
  decision: DeduplicationDecision,
  confidence: number,
  evidence: Record<string, unknown>,
): Promise<string> {
  const source = await prisma.source.findUnique({ where: { id: candidate.sourceId } });
  if (!source) throw new NotFoundError('Source not found while persisting the listing.');

  const official = [SourceType.COMPANY_CAREERS, SourceType.ATS].includes(source.sourceType);
  const listing = await prisma.jobListing.create({
    data: {
      jobId,
      sourceId: candidate.sourceId,
      acquisitionMethod: candidate.acquisitionMethod,
      ingestionId: options.ingestionId,
      ...(options.acquisitionRunId ? { acquisitionRunId: options.acquisitionRunId } : {}),
      ...(candidate.externalId ? { externalId: candidate.externalId } : {}),
      ...(candidate.requisitionId ? { requisitionId: candidate.requisitionId } : {}),
      listingKey: listingKey(candidate, options),
      ...(candidate.sourceUrl ? { sourceUrl: normalizeJobUrl(candidate.sourceUrl), normalizedUrl: normalizeJobUrl(candidate.sourceUrl) } : {}),
      ...(candidate.applyUrl ? { applyUrl: normalizeJobUrl(candidate.applyUrl) } : {}),
      rawTitle: candidate.rawTitle,
      ...(candidate.description ? { rawDescription: candidate.description } : {}),
      ...(candidate.rawLocation ? { rawLocation: candidate.rawLocation } : {}),
      ...(candidate.postedAt ? { postedAt: candidate.postedAt } : {}),
      postedDateConfidence: candidate.postedDateConfidence,
      ...(candidate.expiresAt ? { expiresAt: candidate.expiresAt } : {}),
      status: ListingStatus.ACTIVE,
      contentHash: candidate.contentHash,
      isOfficial: official,
      rawPayload: jsonValue(candidate.rawPayload),
    },
  });

  const jobOrganization = await prisma.job.findUnique({ where: { id: jobId }, select: { companyId: true } });
  if (jobOrganization?.companyId) {
    await prisma.organizationSource.upsert({
      where: { companyId_sourceId: { companyId: jobOrganization.companyId, sourceId: candidate.sourceId } },
      create: { companyId: jobOrganization.companyId, sourceId: candidate.sourceId, isOfficial: official },
      update: { lastSeenAt: new Date(), ...(official ? { isOfficial: true } : {}) },
    });
  }

  await prisma.jobListingMatch.create({
    data: {
      jobId,
      listingId: listing.id,
      confidence,
      method,
      decision,
      evidence: jsonValue(evidence),
    },
  });

  if (official && candidate.applyUrl) {
    await prisma.job.update({
      where: { id: jobId },
      data: { officialApplyUrl: candidate.applyUrl },
    });
  }

  return listing.id;
}

async function candidateJobs(
  candidate: NormalizedJobCandidate,
  companyId: string | null,
  userId?: string,
  visibility: JobVisibility = JobVisibility.PUBLIC,
) {
  const cutoff = new Date(candidate.discoveredAt.getTime() - 120 * 86_400_000);
  const firstToken = candidate.normalizedTitle.split(' ')[0] ?? candidate.normalizedTitle;

  return prisma.job.findMany({
    where: {
      ...(visibility === JobVisibility.PRIVATE && userId
        ? { visibility: JobVisibility.PRIVATE, createdByUserId: userId }
        : { visibility: JobVisibility.PUBLIC }),
      firstSeenAt: { gte: cutoff },
      ...(companyId
        ? { companyId }
        : { normalizedTitle: { contains: firstToken, mode: 'insensitive' } }),
    },
    include: {
      company: { select: { name: true, normalizedName: true } },
      listings: true,
    },
    orderBy: { firstSeenAt: 'desc' },
    take: 50,
  });
}

export const deduplicationService = {
  async persistCandidate(candidate: NormalizedJobCandidate, options: PersistCandidateOptions): Promise<PersistCandidateResult> {
    const normalizedUrl = normalizedListingUrl(candidate);
    if (normalizedUrl) {
      const byUrl = await prisma.jobListing.findUnique({ where: { normalizedUrl }, select: { id: true } });
      if (byUrl) return updateExistingListing(byUrl.id, candidate, options);
    }
    const key = listingKey(candidate, options);
    const existingListing = await prisma.jobListing.findUnique({
      where: { sourceId_listingKey: { sourceId: candidate.sourceId, listingKey: key } },
      select: { id: true },
    });

    if (existingListing) {
      return updateExistingListing(existingListing.id, candidate, options);
    }

    const company = await findOrCreateCompany(candidate);
    const categoryId = await categoryIdFor(candidate.categorySlug);
    const candidates = await candidateJobs(
      candidate,
      company?.id ?? null,
      options.createdByUserId,
      options.visibility ?? JobVisibility.PUBLIC,
    );

    let selected = candidates
      .map((job) => ({ job, match: scoreCandidate(candidate, job) }))
      .filter(({ match }) => !match.hardConflict)
      .sort((left, right) => right.match.score - left.match.score)[0];

    let method = DeduplicationMethod.FUZZY_MATCH;
    let confidence = selected ? selected.match.score / 100 : 0;
    let decision = DeduplicationDecision.UNCERTAIN;

    if (selected && candidate.applyUrl && selected.job.listings.some((listing) => listing.applyUrl === candidate.applyUrl)) {
      method = DeduplicationMethod.APPLY_URL;
      confidence = 1;
      decision = DeduplicationDecision.SAME_JOB;
    } else if (
      selected &&
      candidate.requisitionId &&
      selected.job.listings.some((listing) => listing.requisitionId === candidate.requisitionId)
    ) {
      method = DeduplicationMethod.JOB_REFERENCE;
      confidence = 1;
      decision = DeduplicationDecision.SAME_JOB;
    } else if (selected && selected.match.score >= 90) {
      method = DeduplicationMethod.FUZZY_MATCH;
      decision = DeduplicationDecision.SAME_JOB;
    } else if (selected && selected.match.score >= 70) {
      const aiDecision = await aiDuplicateDecision(candidate, selected.job);
      if (aiDecision === 'SAME_JOB') {
        method = DeduplicationMethod.LLM;
        decision = DeduplicationDecision.SAME_JOB;
        confidence = Math.max(confidence, 0.85);
      } else {
        selected = undefined;
        decision = aiDecision === 'DIFFERENT_JOB'
          ? DeduplicationDecision.DIFFERENT_JOB
          : DeduplicationDecision.UNCERTAIN;
      }
    } else {
      selected = undefined;
      decision = DeduplicationDecision.DIFFERENT_JOB;
    }

    if (selected) {
      const listingId = await createListing(
        selected.job.id,
        candidate,
        options,
        method,
        decision,
        confidence,
        selected.match.evidence,
      );

      await prisma.job.update({
        where: { id: selected.job.id },
        data: {
          lastSeenAt: candidate.discoveredAt,
          status: JobStatus.ACTIVE,
          freshnessStatus: candidate.freshnessStatus,
          ...(candidate.postedAt && (!selected.job.earliestPostedAt || candidate.postedAt < selected.job.earliestPostedAt)
            ? { earliestPostedAt: candidate.postedAt }
            : {}),
          ...(candidate.postedAt && (!selected.job.latestPostedAt || candidate.postedAt > selected.job.latestPostedAt)
            ? { latestPostedAt: candidate.postedAt }
            : {}),
        },
      });

      return {
        jobId: selected.job.id,
        listingId,
        newJob: false,
        newListing: true,
        updatedListing: false,
        duplicate: true,
        confidence,
      };
    }

    const createdJob = await prisma.job.create({
      data: {
        ...(company ? { companyId: company.id } : {}),
        ...(options.createdByUserId ? { createdByUserId: options.createdByUserId } : {}),
        visibility: options.visibility ?? JobVisibility.PUBLIC,
        ...(categoryId ? { primaryCategoryId: categoryId } : {}),
        title: candidate.title,
        normalizedTitle: candidate.normalizedTitle,
        ...(candidate.description ? { description: candidate.description } : {}),
        ...(candidate.city ? { city: candidate.city } : {}),
        ...(candidate.country ? { country: candidate.country } : {}),
        ...(candidate.locationText ? { locationText: candidate.locationText } : {}),
        remoteType: candidate.remoteType,
        employmentType: candidate.employmentType,
        ...(candidate.salaryMin !== undefined ? { salaryMin: candidate.salaryMin } : {}),
        ...(candidate.salaryMax !== undefined ? { salaryMax: candidate.salaryMax } : {}),
        ...(candidate.salaryCurrency ? { salaryCurrency: candidate.salaryCurrency } : {}),
        salaryPeriod: candidate.salaryPeriod,
        ...(candidate.salaryText ? { salaryText: candidate.salaryText } : {}),
        // `officialApplyUrl` is intentionally left empty here. `createListing`
        // only promotes an application URL when the listing comes from the
        // employer or an ATS. Aggregator/search URLs remain source evidence.
        ...(candidate.startDate ? { startDate: candidate.startDate } : {}),
        ...(candidate.academicYear ? { academicYear: candidate.academicYear } : {}),
        status: JobStatus.ACTIVE,
        freshnessStatus: candidate.freshnessStatus,
        firstSeenAt: candidate.discoveredAt,
        lastSeenAt: candidate.discoveredAt,
        ...(candidate.postedAt ? { earliestPostedAt: candidate.postedAt, latestPostedAt: candidate.postedAt } : {}),
        ...(candidate.expiresAt ? { expiresAt: candidate.expiresAt } : {}),
        fingerprint: candidate.fingerprint,
      },
    });

    const listingId = await createListing(
      createdJob.id,
      candidate,
      options,
      DeduplicationMethod.FINGERPRINT,
      DeduplicationDecision.SAME_JOB,
      1,
      { reason: 'A new canonical job was created because no existing job exceeded the conservative automatic-merge threshold.' },
    );

    await prisma.jobStatusEvent.create({
      data: {
        jobId: createdJob.id,
        type: JobStatusEventType.DISCOVERED,
        metadata: jsonValue({ sourceId: candidate.sourceId, listingId }),
      },
    });

    return {
      jobId: createdJob.id,
      listingId,
      newJob: true,
      newListing: true,
      updatedListing: false,
      duplicate: false,
      confidence: 1,
    };
  },

  async moveListing(listingId: string, targetJobId: string) {
    const [listing, job] = await Promise.all([
      prisma.jobListing.findUnique({ where: { id: listingId } }),
      prisma.job.findUnique({ where: { id: targetJobId } }),
    ]);

    if (!listing) throw new NotFoundError('Job listing not found.');
    if (!job) throw new NotFoundError('Target job not found.');

    const previousJobId = listing.jobId;

    await prisma.$transaction([
      prisma.jobListing.update({ where: { id: listingId }, data: { jobId: targetJobId } }),
      prisma.jobListingMatch.upsert({
        where: { listingId },
        create: {
          listingId,
          jobId: targetJobId,
          confidence: 1,
          method: DeduplicationMethod.MANUAL,
          decision: DeduplicationDecision.SAME_JOB,
          manuallyConfirmed: true,
          evidence: { reason: 'User manually moved the listing to this canonical job.' },
        },
        update: {
          jobId: targetJobId,
          confidence: 1,
          method: DeduplicationMethod.MANUAL,
          decision: DeduplicationDecision.SAME_JOB,
          manuallyConfirmed: true,
          evidence: { reason: 'User manually moved the listing to this canonical job.' },
        },
      }),
    ]);

    if (previousJobId !== targetJobId) {
      const previous = await prisma.job.findUnique({
        where: { id: previousJobId },
        include: {
          _count: { select: { listings: true, applications: true, notes: true, userStates: true } },
        },
      });

      if (previous && previous._count.listings === 0) {
        const hasUserHistory = previous._count.applications + previous._count.notes + previous._count.userStates > 0;
        if (hasUserHistory) {
          await prisma.job.update({ where: { id: previousJobId }, data: { status: JobStatus.CLOSED } });
        } else {
          await prisma.job.delete({ where: { id: previousJobId } });
        }
      }
    }

    return prisma.job.findUnique({ where: { id: targetJobId }, include: { listings: true } });
  },
};
