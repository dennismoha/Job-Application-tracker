import {
  AcquisitionMethod,
  ApplicationEventType,
  ApplicationStage,
  FreshnessStatus,
  JobStatus,
  JobVisibility,
  RiskLevel,
  type Prisma,
} from '@prisma/client';

import { NotFoundError } from '../../shared/http/http-error.js';
import { prisma } from '../../shared/prisma/prisma-client.js';
import { daysBetween, median, rate } from './report-metrics.js';

interface Filters {
  profileId?: string;
  categoryId?: string;
  sourceId?: string;
  from: Date;
  to: Date;
}

async function verifyProfile(userId: string, profileId?: string) {
  if (!profileId) return;
  const profile = await prisma.searchProfile.findFirst({ where: { id: profileId, userId }, select: { id: true } });
  if (!profile) throw new NotFoundError('Search profile not found.');
}

function dateRange(from: Date, to: Date): Prisma.DateTimeFilter {
  return { gte: from, lte: to };
}

const responseTypes: ApplicationEventType[] = [
  ApplicationEventType.RESPONSE_RECEIVED,
  ApplicationEventType.SCREENING,
  ApplicationEventType.INTERVIEW_SCHEDULED,
  ApplicationEventType.INTERVIEW_ATTENDED,
  ApplicationEventType.SECOND_INTERVIEW,
  ApplicationEventType.FINAL_INTERVIEW,
  ApplicationEventType.OFFER_RECEIVED,
  ApplicationEventType.REJECTED,
];

const interviewTypes: ApplicationEventType[] = [
  ApplicationEventType.INTERVIEW_ATTENDED,
  ApplicationEventType.SECOND_INTERVIEW,
  ApplicationEventType.FINAL_INTERVIEW,
];

function sourceMetricTemplate(source: { id: string; name: string; sourceType: string; collectionCapability: string }) {
  return {
    source,
    listings: 0,
    uniqueJobs: new Set<string>(),
    firstDiscoveries: 0,
    duplicateListings: 0,
    jobAges: [] as number[],
    oldJobs: 0,
    expiredJobs: 0,
    reposts: 0,
    foundApplications: 0,
    appliedVia: 0,
    responses: 0,
    interviews: 0,
    offers: 0,
    eligibleNoResponse: 0,
    noResponses: 0,
    riskReports: 0,
  };
}

export const reportService = {
  async overview(userId: string, filters: Filters) {
    await verifyProfile(userId, filters.profileId);
    const jobWhere: Prisma.JobWhereInput = {
      firstSeenAt: dateRange(filters.from, filters.to),
      OR: [{ visibility: JobVisibility.PUBLIC }, { createdByUserId: userId }],
      ...(filters.categoryId ? { primaryCategoryId: filters.categoryId } : {}),
      ...(filters.sourceId ? { listings: { some: { sourceId: filters.sourceId } } } : {}),
    };
    const applicationWhere: Prisma.ApplicationWhereInput = {
      userId,
      appliedAt: dateRange(filters.from, filters.to),
      ...(filters.profileId ? { searchProfileId: filters.profileId } : {}),
      ...(filters.sourceId
        ? {
            OR: [
              { foundSourceId: filters.sourceId },
              { appliedSourceId: filters.sourceId },
              { sourceListing: { sourceId: filters.sourceId } },
            ],
          }
        : {}),
    };

    const noResponseCutoff = new Date(Math.min(filters.to.getTime(), Date.now()) - 21 * 86_400_000);

    const [jobs, listings, applications, responses, interviews, offers, eligibleForNoResponse, noResponses, riskReports] = await Promise.all([
      prisma.job.count({ where: jobWhere }),
      prisma.jobListing.count({
        where: {
          firstSeenAt: dateRange(filters.from, filters.to),
          ...(filters.sourceId ? { sourceId: filters.sourceId } : {}),
          job: { OR: [{ visibility: JobVisibility.PUBLIC }, { createdByUserId: userId }] },
        },
      }),
      prisma.application.count({ where: applicationWhere }),
      prisma.application.count({ where: { ...applicationWhere, events: { some: { type: { in: responseTypes } } } } }),
      prisma.application.count({ where: { ...applicationWhere, events: { some: { type: { in: interviewTypes } } } } }),
      prisma.application.count({ where: { ...applicationWhere, events: { some: { type: ApplicationEventType.OFFER_RECEIVED } } } }),
      prisma.application.count({
        where: { ...applicationWhere, appliedAt: { gte: filters.from, lte: noResponseCutoff } },
      }),
      prisma.application.count({
        where: {
          ...applicationWhere,
          appliedAt: { gte: filters.from, lte: noResponseCutoff },
          events: { none: { type: { in: responseTypes } } },
        },
      }),
      prisma.riskReport.count({ where: { userId, createdAt: dateRange(filters.from, filters.to) } }),
    ]);

    const [freshJobs, oldJobs, expiredJobs] = await Promise.all([
      prisma.job.count({ where: { ...jobWhere, freshnessStatus: { in: [FreshnessStatus.NEW, FreshnessStatus.RECENT] } } }),
      prisma.job.count({ where: { ...jobWhere, freshnessStatus: { in: [FreshnessStatus.OLD, FreshnessStatus.VERY_OLD] } } }),
      prisma.job.count({ where: { ...jobWhere, status: JobStatus.EXPIRED } }),
    ]);

    return {
      period: { from: filters.from, to: filters.to },
      jobs,
      listings,
      duplicateListings: Math.max(0, listings - jobs),
      freshJobs,
      oldJobs,
      expiredJobs,
      applications,
      responses,
      interviews,
      offers,
      eligibleForNoResponse,
      noResponses,
      riskReports,
      responseRate: rate(responses, applications),
      interviewRate: rate(interviews, applications),
      offerRate: rate(offers, applications),
      noResponseRate: rate(noResponses, eligibleForNoResponse),
    };
  },

  async sources(userId: string, filters: Filters) {
    await verifyProfile(userId, filters.profileId);

    const [sourceRows, listings, applications] = await Promise.all([
      prisma.source.findMany({
        where: { active: true, ...(filters.sourceId ? { id: filters.sourceId } : {}) },
        select: { id: true, name: true, sourceType: true, collectionCapability: true },
        orderBy: { name: 'asc' },
      }),
      prisma.jobListing.findMany({
        where: {
          firstSeenAt: dateRange(filters.from, filters.to),
          ...(filters.sourceId ? { sourceId: filters.sourceId } : {}),
          ...(filters.categoryId ? { job: { primaryCategoryId: filters.categoryId } } : {}),
        },
        include: {
          source: { select: { id: true, name: true, sourceType: true, collectionCapability: true } },
          job: { select: { id: true, firstSeenAt: true } },
        },
      }),
      prisma.application.findMany({
        where: {
          userId,
          appliedAt: dateRange(filters.from, filters.to),
          ...(filters.profileId ? { searchProfileId: filters.profileId } : {}),
          ...(filters.categoryId ? { job: { primaryCategoryId: filters.categoryId } } : {}),
          ...(filters.sourceId
            ? {
                OR: [
                  { foundSourceId: filters.sourceId },
                  { appliedSourceId: filters.sourceId },
                  { foundSourceId: null, sourceListing: { sourceId: filters.sourceId } },
                ],
              }
            : {}),
        },
        include: {
          sourceListing: { select: { sourceId: true } },
          foundSource: { select: { id: true } },
          appliedSource: { select: { id: true } },
          events: true,
        },
      }),
    ]);

    const metrics = new Map<string, ReturnType<typeof sourceMetricTemplate>>(
      sourceRows.map((source) => [source.id, sourceMetricTemplate(source)]),
    );

    for (const listing of listings) {
      const row = metrics.get(listing.sourceId) ?? sourceMetricTemplate(listing.source);
      row.listings += 1;
      const wasKnown = row.uniqueJobs.has(listing.jobId);
      row.uniqueJobs.add(listing.jobId);
      if (listing.job.firstSeenAt.getTime() === listing.firstSeenAt.getTime()) row.firstDiscoveries += 1;
      if (wasKnown) row.duplicateListings += 1;
      if (listing.postedAt) {
        const age = daysBetween(listing.firstSeenAt, listing.postedAt);
        row.jobAges.push(age);
        if (age > 14) row.oldJobs += 1;
      }
      if (listing.expiresAt && listing.expiresAt <= listing.firstSeenAt) row.expiredJobs += 1;
      if (listing.isRepost) row.reposts += 1;
      metrics.set(listing.sourceId, row);
    }

    const noResponseCutoff = new Date(Math.min(filters.to.getTime(), Date.now()) - 21 * 86_400_000);

    for (const application of applications) {
      // Discovery effectiveness belongs to the source where the opportunity was found.
      // Applied-via effectiveness is counted separately because these sources can differ.
      const foundSourceId = application.foundSourceId ?? application.sourceListing?.sourceId ?? null;
      const appliedSourceId = application.appliedSourceId ?? application.sourceListing?.sourceId ?? null;
      const hasResponse = application.events.some((event) => responseTypes.includes(event.type));

      if (foundSourceId) {
        const row = metrics.get(foundSourceId);
        if (row) {
          row.foundApplications += 1;
          if (hasResponse) row.responses += 1;
          if (application.events.some((event) => interviewTypes.includes(event.type))) row.interviews += 1;
          if (application.events.some((event) => event.type === ApplicationEventType.OFFER_RECEIVED)) row.offers += 1;
          if (application.appliedAt <= noResponseCutoff) {
            row.eligibleNoResponse += 1;
            if (!hasResponse) row.noResponses += 1;
          }
        }
      }

      if (appliedSourceId) {
        const row = metrics.get(appliedSourceId);
        if (row) row.appliedVia += 1;
      }
    }

    const riskRows = await prisma.riskReport.groupBy({
      by: ['sourceId'],
      where: { userId, sourceId: { not: null }, createdAt: dateRange(filters.from, filters.to) },
      _count: { _all: true },
    });
    for (const risk of riskRows) {
      if (!risk.sourceId) continue;
      const row = metrics.get(risk.sourceId);
      if (row) row.riskReports = risk._count._all;
    }

    return [...metrics.values()]
      .map((row) => ({
        source: row.source,
        listings: row.listings,
        uniqueJobs: row.uniqueJobs.size,
        firstDiscoveries: row.firstDiscoveries,
        uniqueContributionRate: rate(row.firstDiscoveries, row.uniqueJobs.size),
        duplicateRate: rate(row.duplicateListings, row.listings),
        medianJobAgeDays: median(row.jobAges),
        oldJobRate: rate(row.oldJobs, row.listings),
        expiredOnDiscoveryRate: rate(row.expiredJobs, row.listings),
        repostRate: rate(row.reposts, row.listings),
        foundApplications: row.foundApplications,
        appliedVia: row.appliedVia,
        // `applications` is retained temporarily for older clients; it means applications from discoveries.
        applications: row.foundApplications,
        responses: row.responses,
        interviews: row.interviews,
        offers: row.offers,
        responseRate: rate(row.responses, row.foundApplications),
        interviewRate: rate(row.interviews, row.foundApplications),
        offerRate: rate(row.offers, row.foundApplications),
        noResponses: row.noResponses,
        noResponseRate: rate(row.noResponses, row.eligibleNoResponse),
        noResponseSample: row.eligibleNoResponse,
        riskReports: row.riskReports,
        riskRate: rate(row.riskReports, row.uniqueJobs.size),
      }))
      .filter((row) => row.listings > 0 || row.foundApplications > 0 || row.appliedVia > 0 || row.riskReports > 0)
      .sort((a, b) => b.uniqueJobs - a.uniqueJobs || b.foundApplications - a.foundApplications);
  },

  async jobs(userId: string, filters: Filters) {
    await verifyProfile(userId, filters.profileId);
    const jobs = await prisma.job.findMany({
      where: {
        firstSeenAt: dateRange(filters.from, filters.to),
        OR: [{ visibility: JobVisibility.PUBLIC }, { createdByUserId: userId }],
        ...(filters.categoryId ? { primaryCategoryId: filters.categoryId } : {}),
      },
      include: {
        company: { select: { name: true } },
        listings: { select: { sourceId: true, isRepost: true } },
      },
      orderBy: { firstSeenAt: 'desc' },
      take: 5000,
    });

    return jobs
      .map((job) => ({
        id: job.id,
        title: job.title,
        company: job.company?.name ?? null,
        sourceCount: new Set(job.listings.map((listing) => listing.sourceId)).size,
        listingCount: job.listings.length,
        repostCount: job.listings.filter((listing) => listing.isRepost).length,
        freshnessStatus: job.freshnessStatus,
        status: job.status,
      }))
      .sort((a, b) => b.listingCount - a.listingCount);
  },

  async applications(userId: string, filters: Filters) {
    await verifyProfile(userId, filters.profileId);
    const applications = await prisma.application.findMany({
      where: {
        userId,
        appliedAt: dateRange(filters.from, filters.to),
        ...(filters.profileId ? { searchProfileId: filters.profileId } : {}),
        ...(filters.sourceId ? { sourceListing: { sourceId: filters.sourceId } } : {}),
      },
      include: { events: { orderBy: { occurredAt: 'asc' } } },
    });

    const responses = applications.filter((app) => app.events.some((event) => responseTypes.includes(event.type)));
    const interviews = applications.filter((app) => app.events.some((event) => interviewTypes.includes(event.type)));
    const offers = applications.filter((app) => app.events.some((event) => event.type === ApplicationEventType.OFFER_RECEIVED));
    const responseDays = responses.flatMap((app) => {
      const event = app.events.find((candidate) => responseTypes.includes(candidate.type));
      return event ? [daysBetween(event.occurredAt, app.appliedAt)] : [];
    });
    const interviewDays = interviews.flatMap((app) => {
      const event = app.events.find((candidate) => interviewTypes.includes(candidate.type));
      return event ? [daysBetween(event.occurredAt, app.appliedAt)] : [];
    });

    return {
      applications: applications.length,
      responses: responses.length,
      interviews: interviews.length,
      offers: offers.length,
      responseRate: rate(responses.length, applications.length),
      interviewRate: rate(interviews.length, applications.length),
      offerRate: rate(offers.length, applications.length),
      medianResponseDays: median(responseDays),
      medianInterviewDays: median(interviewDays),
      stages: await prisma.application.groupBy({
        by: ['stage'],
        where: { userId, appliedAt: dateRange(filters.from, filters.to) },
        _count: { _all: true },
      }),
    };
  },

  async risk(userId: string, filters: Filters) {
    const reports = await prisma.riskReport.findMany({
      where: { userId, createdAt: dateRange(filters.from, filters.to) },
      include: { source: true, company: true, job: true },
    });
    const byReason = new Map<string, number>();
    const byLevel = new Map<string, number>();
    for (const report of reports) {
      byReason.set(report.reasonType, (byReason.get(report.reasonType) ?? 0) + 1);
      byLevel.set(report.level, (byLevel.get(report.level) ?? 0) + 1);
    }
    return {
      total: reports.length,
      highRisk: reports.filter((report) => report.level === RiskLevel.ORANGE || report.level === RiskLevel.RED).length,
      byReason: Object.fromEntries(byReason),
      byLevel: Object.fromEntries(byLevel),
      reports: reports.slice(0, 100),
    };
  },

  async brain(userId: string, filters: Filters) {
    await verifyProfile(userId, filters.profileId);
    const noResponseCutoff = new Date(Math.min(filters.to.getTime(), Date.now()) - 21 * 86_400_000);
    const [sources, listings, applications, riskReports] = await Promise.all([
      prisma.source.findMany({
        where: { active: true },
        select: { id: true, name: true, sourceType: true, collectionCapability: true },
        orderBy: { name: 'asc' },
      }),
      prisma.jobListing.findMany({
        where: {
          firstSeenAt: dateRange(filters.from, filters.to),
          ...(filters.sourceId ? { sourceId: filters.sourceId } : {}),
          ...(filters.categoryId ? { job: { primaryCategoryId: filters.categoryId } } : {}),
        },
        select: { jobId: true, sourceId: true, acquisitionMethod: true, job: { select: { status: true } } },
      }),
      prisma.application.findMany({
        where: {
          userId,
          appliedAt: dateRange(filters.from, filters.to),
          ...(filters.profileId ? { searchProfileId: filters.profileId } : {}),
          ...(filters.categoryId ? { job: { primaryCategoryId: filters.categoryId } } : {}),
          ...(filters.sourceId
            ? {
                OR: [
                  { foundSourceId: filters.sourceId },
                  { appliedSourceId: filters.sourceId },
                  { foundSourceId: null, sourceListing: { sourceId: filters.sourceId } },
                ],
              }
            : {}),
        },
        include: { events: true, sourceListing: { select: { sourceId: true } } },
      }),
      prisma.riskReport.findMany({
        where: { userId, createdAt: dateRange(filters.from, filters.to), ...(filters.sourceId ? { sourceId: filters.sourceId } : {}) },
        select: { sourceId: true, jobId: true, level: true },
      }),
    ]);

    const sourceMap = new Map(sources.map((source) => [source.id, {
      source,
      discoveredJobs: new Set<string>(),
      foundApplications: 0,
      appliedVia: 0,
      responses: 0,
      interviews: 0,
      rejected: 0,
      noResponses: 0,
      eligibleNoResponse: 0,
      scamJobs: new Set<string>(),
      expiredJobs: new Set<string>(),
      crawlJobs: new Set<string>(),
      universalSearchJobs: new Set<string>(),
      stages: {} as Record<string, number>,
    }]));
    const acquisition = new Map<string, Set<string>>();
    for (const listing of listings) {
      const row = sourceMap.get(listing.sourceId);
      if (row) {
        row.discoveredJobs.add(listing.jobId);
        if (listing.acquisitionMethod === AcquisitionMethod.CRAWLER) row.crawlJobs.add(listing.jobId);
        if (listing.acquisitionMethod === AcquisitionMethod.UNIVERSAL_SEARCH) row.universalSearchJobs.add(listing.jobId);
        if (listing.job.status === JobStatus.EXPIRED) row.expiredJobs.add(listing.jobId);
        if (listing.job.status === JobStatus.SCAM) row.scamJobs.add(listing.jobId);
      }
      const set = acquisition.get(listing.acquisitionMethod) ?? new Set<string>();
      set.add(listing.jobId); acquisition.set(listing.acquisitionMethod, set);
    }

    for (const application of applications) {
      const foundId = application.foundSourceId ?? application.sourceListing?.sourceId ?? null;
      const appliedId = application.appliedSourceId ?? null;
      const hasResponse = application.events.some((event) => responseTypes.includes(event.type));
      const hasInterview = application.events.some((event) => interviewTypes.includes(event.type));
      for (const sourceId of new Set([foundId, appliedId].filter(Boolean) as string[])) {
        const row = sourceMap.get(sourceId); if (!row) continue;
        row.stages[application.stage] = (row.stages[application.stage] ?? 0) + 1;
      }
      if (foundId) {
        const row = sourceMap.get(foundId);
        if (row) {
          row.foundApplications += 1;
          if (hasResponse) row.responses += 1;
          if (hasInterview) row.interviews += 1;
          if (application.stage === ApplicationStage.REJECTED) row.rejected += 1;
          if (application.appliedAt <= noResponseCutoff) { row.eligibleNoResponse += 1; if (!hasResponse) row.noResponses += 1; }
        }
      }
      if (appliedId) { const row = sourceMap.get(appliedId); if (row) row.appliedVia += 1; }
    }

    const highRiskReports = riskReports.filter((report) => report.level === RiskLevel.ORANGE || report.level === RiskLevel.RED);
    for (const report of highRiskReports) {
      if (!report.sourceId || !report.jobId) continue;
      sourceMap.get(report.sourceId)?.scamJobs.add(report.jobId);
    }
    const highRiskJobIds = new Set(highRiskReports.flatMap((report) => report.jobId ? [report.jobId] : []));
    for (const listing of listings) {
      if (highRiskJobIds.has(listing.jobId)) sourceMap.get(listing.sourceId)?.scamJobs.add(listing.jobId);
    }

    const sourceRows = [...sourceMap.values()].map((row) => ({
      source: row.source,
      discoveredJobs: row.discoveredJobs.size,
      foundApplications: row.foundApplications,
      appliedVia: row.appliedVia,
      responses: row.responses, interviews: row.interviews, rejected: row.rejected,
      noResponses: row.noResponses, noResponseRate: rate(row.noResponses, row.eligibleNoResponse),
      scams: row.scamJobs.size,
      expiredJobs: row.expiredJobs.size,
      crawlJobs: row.crawlJobs.size,
      universalSearchJobs: row.universalSearchJobs.size,
      stages: row.stages,
    })).filter((row) => row.discoveredJobs || row.foundApplications || row.appliedVia || row.scams);

    return {
      period: { from: filters.from, to: filters.to },
      applications: applications.length,
      responses: applications.filter((app) => app.events.some((event) => responseTypes.includes(event.type))).length,
      interviews: applications.filter((app) => app.events.some((event) => interviewTypes.includes(event.type))).length,
      rejected: applications.filter((app) => app.stage === ApplicationStage.REJECTED).length,
      sources: sourceRows.sort((a,b) => b.foundApplications - a.foundApplications || b.discoveredJobs - a.discoveredJobs),
      acquisitionMethods: [...acquisition.entries()].map(([method, jobs]) => ({ method, jobs: jobs.size })).sort((a,b) => b.jobs-a.jobs),
    };
  },

  async systemHealth() {
    const [health, runs] = await Promise.all([
      prisma.sourceHealth.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.acquisitionRun.groupBy({
        by: ['status'],
        where: { createdAt: { gte: new Date(Date.now() - 24 * 3_600_000) } },
        _count: { _all: true },
      }),
    ]);
    return { sourceHealth: health, runsLast24Hours: runs };
  },
};
