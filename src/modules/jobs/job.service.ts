import {
  AcquisitionMethod,
  ApplicationStage,
  ExtractionMethod,
  FreshnessStatus,
  JobStatus,
  JobVisibility,
  RemoteType,
  UserJobDisposition,
  type Prisma,
} from '@prisma/client';

import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../../shared/http/http-error.js';
import { prisma } from '../../shared/prisma/prisma-client.js';
import { assertSavableUrl, normalizeJobUrl } from '../../shared/urls/url-integrity.js';
import type { RawJobListing } from '../acquisition/collectors/collector.types.js';
import { jobIngestionService } from '../ingestion/ingestion.service.js';
import { sourceService } from '../sources/source.service.js';
import { deduplicationService } from './deduplication.service.js';
import { jobLifecycleService } from './job-lifecycle.service.js';

interface ListJobsInput {
  q?: string | undefined;
  profileId?: string | undefined;
  categoryId?: string | undefined;
  sourceId?: string | undefined;
  status?: JobStatus | undefined;
  freshness?: FreshnessStatus | undefined;
  disposition?: UserJobDisposition | undefined;
  visited?: boolean | undefined;
  applied?: boolean | undefined;
  applicationStage?: ApplicationStage | undefined;
  remoteType?: RemoteType | undefined;
  addedWithinDays?: number | undefined;
  page: number;
  limit: number;
}

interface ManualJobInput {
  title: string;
  company?: string | undefined;
  location?: string | undefined;
  description?: string | undefined;
  salary?: string | undefined;
  postedAt?: string | undefined;
  expiresAt?: string | undefined;
  employmentType?: string | undefined;
  url?: string | undefined;
  sourceId?: string | undefined;
  visibility: JobVisibility;
  note?: string | undefined;
}

async function accessibleJob(jobId: string, userId: string) {
  const job = await prisma.job.findFirst({
    where: {
      id: jobId,
      OR: [{ visibility: JobVisibility.PUBLIC }, { createdByUserId: userId }],
    },
  });

  if (!job) throw new NotFoundError('Job not found.');
  return job;
}

async function editableJob(jobId: string, userId: string) {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { listings: true, applications: { where: { userId } } },
  });
  if (!job) throw new NotFoundError('Job not found.');
  if (job.createdByUserId !== userId) {
    throw new ForbiddenError('Crawler-discovered shared jobs cannot be edited directly. Archive or add a personal note instead.');
  }
  return job;
}

export const jobService = {
  async list(userId: string, input: ListJobsInput) {
    await jobLifecycleService.expireKnownDates();
    const and: Prisma.JobWhereInput[] = [];

    const profile = input.profileId
      ? await prisma.searchProfile.findFirst({
          where: { id: input.profileId, userId },
          include: { categories: { select: { id: true } } },
        })
      : null;

    if (input.profileId && !profile) throw new NotFoundError('Search profile not found.');

    if (profile) {
      if (profile.remoteOnly) and.push({ remoteType: RemoteType.REMOTE });
      if (profile.categories.length > 0 && !input.categoryId) {
        and.push({ primaryCategoryId: { in: profile.categories.map((category) => category.id) } });
      }
      if (profile.countries.length > 0) {
        and.push({
          OR: profile.countries.flatMap((country) => [
            { country: { equals: country, mode: 'insensitive' as const } },
            { locationText: { contains: country, mode: 'insensitive' as const } },
          ]),
        });
      }
      if (profile.locations.length > 0) {
        and.push({ OR: profile.locations.map((location) => ({ locationText: { contains: location, mode: 'insensitive' as const } })) });
      }
      if (profile.keywords.length > 0) {
        and.push({ OR: profile.keywords.flatMap((keyword) => [
          { title: { contains: keyword, mode: 'insensitive' as const } },
          { description: { contains: keyword, mode: 'insensitive' as const } },
        ]) });
      }
      if (profile.excludedKeywords.length > 0) {
        and.push({ NOT: { OR: profile.excludedKeywords.flatMap((keyword) => [
          { title: { contains: keyword, mode: 'insensitive' as const } },
          { description: { contains: keyword, mode: 'insensitive' as const } },
        ]) } });
      }
    }

    if (input.q) {
      and.push({
        OR: [
          { title: { contains: input.q, mode: 'insensitive' } },
          { description: { contains: input.q, mode: 'insensitive' } },
          { company: { name: { contains: input.q, mode: 'insensitive' } } },
        ],
      });
    }

    if (input.disposition) {
      and.push({ userStates: { some: { userId, disposition: input.disposition } } });
    }

    if (input.visited === true) {
      and.push({ userStates: { some: { userId, firstViewedAt: { not: null } } } });
    } else if (input.visited === false) {
      and.push({ NOT: { userStates: { some: { userId, firstViewedAt: { not: null } } } } });
    }

    if (input.applied === true) {
      and.push({ applications: { some: { userId } } });
    } else if (input.applied === false) {
      and.push({ NOT: { applications: { some: { userId } } } });
    }

    if (input.applicationStage) and.push({ applications: { some: { userId, stage: input.applicationStage } } });

    const where: Prisma.JobWhereInput = {
      OR: [{ visibility: JobVisibility.PUBLIC }, { createdByUserId: userId }],
      ...(input.addedWithinDays
        ? { firstSeenAt: { gte: new Date(Date.now() - input.addedWithinDays * 86_400_000) } }
        : {}),
      ...(input.categoryId ? { primaryCategoryId: input.categoryId } : {}),
      ...(input.status ? { status: input.status } : {}),
      ...(input.freshness ? { freshnessStatus: input.freshness } : {}),
      ...(input.sourceId ? { listings: { some: { sourceId: input.sourceId } } } : {}),
      ...(input.remoteType ? { remoteType: input.remoteType } : {}),
      ...(and.length ? { AND: and } : {}),
    };

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        include: {
          company: true,
          primaryCategory: true,
          listings: {
            select: {
              id: true,
              sourceUrl: true,
              applyUrl: true,
              postedAt: true,
              firstSeenAt: true,
              expiresAt: true,
              status: true,
              isOfficial: true,
              source: {
                select: { id: true, name: true, collectionCapability: true, systemRiskLevel: true },
              },
            },
            orderBy: { firstSeenAt: 'asc' },
          },
          userStates: { where: { userId } },
          applications: { where: { userId }, orderBy: { appliedAt: 'desc' }, take: 1 },
          profileMatches: input.profileId
            ? { where: { profileId: input.profileId }, select: { id: true, score: true, eligibility: true, matchedAt: true } }
            : false,
        },
        orderBy: [{ firstSeenAt: 'desc' }],
        skip: (input.page - 1) * input.limit,
        take: input.limit,
      }),
      prisma.job.count({ where }),
    ]);

    return {
      jobs,
      pagination: {
        page: input.page,
        limit: input.limit,
        total,
        pages: Math.max(1, Math.ceil(total / input.limit)),
      },
    };
  },

  async get(jobId: string, userId: string) {
    await accessibleJob(jobId, userId);

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        company: true,
        primaryCategory: true,
        tags: true,
        listings: {
          select: {
            id: true,
            acquisitionMethod: true,
            externalId: true,
            requisitionId: true,
            sourceUrl: true,
            applyUrl: true,
            rawTitle: true,
            rawLocation: true,
            postedAt: true,
            postedDateConfidence: true,
            firstSeenAt: true,
            lastSeenAt: true,
            expiresAt: true,
            closedAt: true,
            status: true,
            isOfficial: true,
            isRepost: true,
            source: {
              select: {
                id: true,
                name: true,
                sourceType: true,
                collectionCapability: true,
                systemRiskLevel: true,
              },
            },
            matchEvidence: {
              select: {
                confidence: true,
                method: true,
                decision: true,
                evidence: true,
                manuallyConfirmed: true,
              },
            },
            revisions: {
              select: { id: true, contentHash: true, detectedAt: true },
              orderBy: { detectedAt: 'desc' },
              take: 10,
            },
          },
          orderBy: { firstSeenAt: 'asc' },
        },
        userStates: { where: { userId } },
        applications: {
          where: { userId },
          include: { events: { orderBy: { occurredAt: 'asc' } } },
          orderBy: { appliedAt: 'desc' },
        },
        notes: { where: { userId }, orderBy: { createdAt: 'desc' } },
      },
    });

    return job ? { ...job, canEdit: job.createdByUserId === userId } : null;
  },

  async updateState(jobId: string, userId: string, input: { disposition?: UserJobDisposition; visited?: boolean; customExpiresAt?: Date | null; preferredCvVersionId?: string | null }) {
    await accessibleJob(jobId, userId);
    const now = new Date();

    if (input.preferredCvVersionId) {
      const cvVersion = await prisma.cvVersion.findFirst({
        where: { id: input.preferredCvVersionId, cv: { userId } },
        select: { id: true },
      });
      if (!cvVersion) throw new NotFoundError('CV version not found.');
    }

    const existing = await prisma.userJobState.findUnique({
      where: { userId_jobId: { userId, jobId } },
    });

    return prisma.userJobState.upsert({
      where: { userId_jobId: { userId, jobId } },
      create: {
        userId,
        jobId,
        disposition: input.disposition ?? UserJobDisposition.NONE,
        ...(input.visited ? { firstViewedAt: now, lastViewedAt: now } : {}),
        ...(input.disposition === UserJobDisposition.SAVED ? { savedAt: now } : {}),
        ...(input.disposition === UserJobDisposition.IGNORED ? { ignoredAt: now } : {}),
        ...(input.disposition === UserJobDisposition.ARCHIVED ? { archivedAt: now } : {}),
        ...(input.customExpiresAt !== undefined ? { customExpiresAt: input.customExpiresAt } : {}),
        ...(input.preferredCvVersionId !== undefined ? { preferredCvVersionId: input.preferredCvVersionId } : {}),
      },
      update: {
        ...(input.disposition ? { disposition: input.disposition } : {}),
        ...(input.visited ? { firstViewedAt: existing?.firstViewedAt ?? now, lastViewedAt: now } : {}),
        ...(input.disposition === UserJobDisposition.SAVED ? { savedAt: now } : {}),
        ...(input.disposition === UserJobDisposition.IGNORED ? { ignoredAt: now } : {}),
        ...(input.disposition === UserJobDisposition.ARCHIVED ? { archivedAt: now } : {}),
        ...(input.customExpiresAt !== undefined ? { customExpiresAt: input.customExpiresAt } : {}),
        ...(input.preferredCvVersionId !== undefined ? { preferredCvVersionId: input.preferredCvVersionId } : {}),
      },
    });
  },

  async addNote(jobId: string, userId: string, note: string) {
    await accessibleJob(jobId, userId);
    return prisma.jobNote.create({ data: { userId, jobId, note } });
  },

  async createManual(userId: string, input: ManualJobInput) {
    const verifiedUrl = input.url ? await assertSavableUrl(input.url, 'Job URL') : null;
    const canonicalUrl = input.url ? normalizeJobUrl(verifiedUrl?.finalUrl || input.url) : undefined;
    if (canonicalUrl) {
      const duplicate = await prisma.jobListing.findUnique({ where: { normalizedUrl: canonicalUrl }, select: { jobId: true } });
      if (duplicate) throw new ConflictError('This job URL has already been saved. Open the existing job instead of creating a duplicate.');
    }
    const resolved = input.sourceId
      ? { source: await prisma.source.findUnique({ where: { id: input.sourceId } }) }
      : input.url
        ? await sourceService.resolveByUrl(input.url)
        : { source: null };
    const source = resolved.source ?? await sourceService.ensureUnclassifiedSource();
    const raw: RawJobListing = {
      sourceId: source.id,
      acquisitionMethod: AcquisitionMethod.MANUAL,
      ...(canonicalUrl ? { sourceUrl: canonicalUrl, applyUrl: canonicalUrl } : {}),
      title: input.title,
      ...(input.company ? { company: input.company } : {}),
      ...(input.location ? { location: input.location } : {}),
      ...(input.description ? { description: input.description } : {}),
      ...(input.salary ? { salary: input.salary } : {}),
      ...(input.postedAt ? { postedAt: input.postedAt } : {}),
      ...(input.expiresAt ? { expiresAt: input.expiresAt } : {}),
      ...(input.employmentType ? { employmentType: input.employmentType } : {}),
      extractionMethod: ExtractionMethod.MANUAL,
      discoveredAt: new Date(),
      rawPayload: {
        title: input.title,
        company: input.company,
        location: input.location,
        description: input.description,
        salary: input.salary,
        postedAt: input.postedAt,
        expiresAt: input.expiresAt,
        employmentType: input.employmentType,
        url: input.url,
      },
    };

    const outcome = await jobIngestionService.processOne(raw, {
      createdByUserId: userId,
      visibility: input.visibility,
    });

    if (!outcome.result) {
      throw new BadRequestError(outcome.errorMessage ?? outcome.reasons?.join(' ') ?? 'The manual job could not be saved.');
    }

    await prisma.userJobState.upsert({
      where: { userId_jobId: { userId, jobId: outcome.result.jobId } },
      create: { userId, jobId: outcome.result.jobId, disposition: UserJobDisposition.SAVED, savedAt: new Date() },
      update: { disposition: UserJobDisposition.SAVED, savedAt: new Date() },
    });

    if (input.note) {
      await prisma.jobNote.create({ data: { userId, jobId: outcome.result.jobId, note: input.note } });
    }

    return jobService.get(outcome.result.jobId, userId);
  },

  async updateOwnedJob(jobId: string, userId: string, input: { title?: string; company?: string | null; location?: string | null; description?: string | null; salary?: string | null; postedAt?: string | null; expiresAt?: string | null; employmentType?: string | null; url?: string | null }) {
    const job = await editableJob(jobId, userId);
    let companyId = job.companyId;
    if (input.company !== undefined) {
      if (!input.company) companyId = null;
      else {
        const normalizedName = input.company.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
        const company = await prisma.company.findFirst({ where: { normalizedName } }) ?? await prisma.company.create({ data: { name: input.company.trim(), normalizedName } });
        companyId = company.id;
      }
    }

    const parseDate = (value: string | null): Date | null => value === null ? null : new Date(value);
    let verifiedJobUrl: string | null = input.url ?? null;
    if (typeof input.url === 'string') {
      const verification = await assertSavableUrl(input.url, 'Job URL');
      verifiedJobUrl = normalizeJobUrl(verification.finalUrl || input.url);
      const duplicate = await prisma.jobListing.findFirst({ where: { normalizedUrl: verifiedJobUrl, jobId: { not: jobId } }, select: { jobId: true } });
      if (duplicate) throw new ConflictError('That job URL already belongs to another saved job.');
    }
    await prisma.job.update({
      where: { id: jobId },
      data: {
        ...(input.title !== undefined ? { title: input.title, normalizedTitle: input.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim() } : {}),
        ...(input.company !== undefined ? { companyId } : {}),
        ...(input.location !== undefined ? { locationText: input.location } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.salary !== undefined ? { salaryText: input.salary } : {}),
        ...(input.postedAt !== undefined ? { earliestPostedAt: parseDate(input.postedAt), latestPostedAt: parseDate(input.postedAt) } : {}),
        ...(input.expiresAt !== undefined ? { expiresAt: parseDate(input.expiresAt) } : {}),
        ...(input.employmentType !== undefined ? { employmentType: input.employmentType?.toUpperCase().replace(/[^A-Z]+/g, '_') as any } : {}),
        ...(input.url !== undefined ? { officialApplyUrl: verifiedJobUrl } : {}),
      },
    });
    if (input.company !== undefined && companyId) {
      const listings = await prisma.jobListing.findMany({ where: { jobId }, select: { sourceId: true, isOfficial: true } });
      for (const listing of listings) {
        await prisma.organizationSource.upsert({
          where: { companyId_sourceId: { companyId, sourceId: listing.sourceId } },
          create: { companyId, sourceId: listing.sourceId, isOfficial: listing.isOfficial },
          update: { lastSeenAt: new Date(), ...(listing.isOfficial ? { isOfficial: true } : {}) },
        });
      }
    }
    return jobService.get(jobId, userId);
  },

  async deleteOwnedJob(jobId: string, userId: string) {
    const job = await editableJob(jobId, userId);
    const applicationCount = await prisma.application.count({ where: { jobId, userId } });
    if (applicationCount > 0) {
      throw new ConflictError('This job has application history. Archive it instead so the application, CV and interview record remain intact.');
    }
    await prisma.job.delete({ where: { id: job.id } });
    return { deleted: true };
  },

  async addListing(
    userId: string,
    jobId: string,
    input: { sourceId: string; url?: string; isOfficial: boolean },
  ) {
    const job = await accessibleJob(jobId, userId);
    const verification = input.url ? await assertSavableUrl(input.url, 'Job listing URL') : null;
    const canonicalUrl = input.url ? normalizeJobUrl(verification?.finalUrl || input.url) : undefined;
    if (canonicalUrl) {
      const duplicateUrl = await prisma.jobListing.findUnique({ where: { normalizedUrl: canonicalUrl }, select: { jobId: true } });
      if (duplicateUrl) throw new ConflictError('That job listing URL is already saved.');
    }
    const source = await prisma.source.findUnique({ where: { id: input.sourceId } });
    if (!source) throw new NotFoundError('Job Source not found.');

    const existing = await prisma.jobListing.findFirst({
      where: { jobId, sourceId: input.sourceId, ...(canonicalUrl ? { OR: [{ sourceUrl: canonicalUrl }, { applyUrl: canonicalUrl }] } : {}) },
      select: { id: true },
    });
    if (existing) throw new ConflictError('This Job already has a matching listing on that Job Source.');

    const listingKey = `manual:${jobId}:${input.sourceId}:${Date.now()}`;
    await prisma.jobListing.create({
      data: {
        jobId,
        sourceId: input.sourceId,
        acquisitionMethod: AcquisitionMethod.MANUAL,
        listingKey,
        ...(canonicalUrl ? { sourceUrl: canonicalUrl, normalizedUrl: canonicalUrl, applyUrl: canonicalUrl } : {}),
        isOfficial: input.isOfficial,
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
      },
    });

    if (job.companyId) {
      await prisma.organizationSource.upsert({
        where: { companyId_sourceId: { companyId: job.companyId, sourceId: input.sourceId } },
        create: { companyId: job.companyId, sourceId: input.sourceId, isOfficial: input.isOfficial },
        update: { lastSeenAt: new Date(), ...(input.isOfficial ? { isOfficial: true } : {}) },
      });
    }

    return jobService.get(jobId, userId);
  },

  async changeListingSource(userId: string, listingId: string, sourceId: string) {
    const listing = await prisma.jobListing.findUnique({
      where: { id: listingId },
      include: { job: true },
    });
    if (!listing) throw new NotFoundError('Job listing not found.');
    await accessibleJob(listing.jobId, userId);

    const source = await prisma.source.findUnique({ where: { id: sourceId } });
    if (!source) throw new NotFoundError('Job Source not found.');
    if (sourceId === listing.sourceId) return jobService.get(listing.jobId, userId);

    const alreadyOnSource = await prisma.jobListing.findFirst({
      where: { jobId: listing.jobId, sourceId, id: { not: listingId } },
      select: { id: true },
    });
    if (alreadyOnSource) {
      throw new ConflictError('This Job already has another listing on that Job Source. Keep both source records separate instead of overwriting one.');
    }

    await prisma.jobListing.update({ where: { id: listingId }, data: { sourceId } });
    if (listing.job.companyId) {
      await prisma.organizationSource.upsert({
        where: { companyId_sourceId: { companyId: listing.job.companyId, sourceId } },
        create: { companyId: listing.job.companyId, sourceId, isOfficial: listing.isOfficial },
        update: { lastSeenAt: new Date(), ...(listing.isOfficial ? { isOfficial: true } : {}) },
      });
    }
    return jobService.get(listing.jobId, userId);
  },

  async moveListing(userId: string, listingId: string, targetJobId: string) {
    const listing = await prisma.jobListing.findUnique({
      where: { id: listingId },
      include: { job: true, source: true },
    });

    if (!listing) throw new NotFoundError('Job listing not found.');
    const targetJob = await accessibleJob(targetJobId, userId);

    if (listing.job.visibility !== targetJob.visibility) {
      throw new ForbiddenError('Private and public job listings cannot be merged together.');
    }

    if (
      listing.job.visibility === JobVisibility.PRIVATE &&
      (listing.job.createdByUserId !== userId || targetJob.createdByUserId !== userId)
    ) {
      throw new ForbiddenError('Private jobs can only be regrouped within your own private job collection.');
    }

    const canManage = listing.job.createdByUserId === userId || listing.source.createdByUserId === userId;
    if (!canManage) {
      throw new ForbiddenError('Only a listing you created, or a source you manage, can be regrouped manually.');
    }

    return deduplicationService.moveListing(listingId, targetJobId);
  },
};
