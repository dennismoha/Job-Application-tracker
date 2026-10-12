import type { Prisma } from '@prisma/client';
import { CollectionCapability, SourceHealthStatus, SourceType } from '@prisma/client';

import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../../shared/http/http-error.js';
import { prisma } from '../../shared/prisma/prisma-client.js';
import { assertSavableUrl, normalizeHostname, sourceBaseUrl, verifyPublicUrl } from '../../shared/urls/url-integrity.js';
import { recalculateSourceSchedule } from '../profiles/profile-source.service.js';
import { sourceAccessService } from './source-access.service.js';
import { sourceAuditService, type SourceAuditResult } from './source-audit.service.js';

interface CreateSourceInput {
  name: string;
  baseUrl: string;
  careersUrl?: string | null;
  sourceType: Prisma.SourceCreateInput['sourceType'];
  collectionCapability?: CollectionCapability;
  defaultIntervalMinutes: number;
  auditNow: boolean;
}

type UpdateSourceInput = Prisma.SourceUpdateInput;

function slugify(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'source';
}

async function uniqueSlug(name: string): Promise<string> {
  const base = slugify(name);
  let candidate = base;
  let suffix = 2;
  while (await prisma.source.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    candidate = `${base}-${suffix++}`;
  }
  return candidate;
}


const sourceDetailInclude = {
  audits: { orderBy: { auditedAt: 'desc' as const }, take: 10 },
  schedule: true,
  health: true,
  organizationLinks: { include: { company: true }, orderBy: { lastSeenAt: 'desc' as const }, take: 100 },
  _count: { select: { listings: true, runs: true, subscriptions: true, organizationLinks: true } },
};

async function getSource(sourceId: string) {
  const source = await prisma.source.findUnique({ where: { id: sourceId }, include: sourceDetailInclude });
  if (!source) throw new NotFoundError('Job Source not found.');
  return source;
}

async function saveAudit(sourceId: string, result: SourceAuditResult) {
  return prisma.$transaction(async (tx) => {
    const audit = await tx.sourceAudit.create({
      data: {
        sourceId,
        ...(result.httpStatus === undefined ? {} : { httpStatus: result.httpStatus }),
        ...(result.responseTimeMs === undefined ? {} : { responseTimeMs: result.responseTimeMs }),
        ...(result.finalUrl === undefined ? {} : { finalUrl: result.finalUrl }),
        ...(result.robotsAvailable === undefined ? {} : { robotsAvailable: result.robotsAvailable }),
        ...(result.robotsAllows === undefined ? {} : { robotsAllows: result.robotsAllows }),
        ...(result.atsProvider === undefined ? {} : { atsProvider: result.atsProvider }),
        hasApi: result.hasApi,
        hasRss: result.hasRss,
        hasJsonLd: result.hasJsonLd,
        hasJobPosting: result.hasJobPosting,
        isJavascriptHeavy: result.isJavascriptHeavy,
        requiresLogin: result.requiresLogin,
        challengeDetected: result.challengeDetected,
        emailAlertsAvailable: result.emailAlertsAvailable,
        applicationLinksFound: result.applicationLinksFound,
        recommendedCapability: result.recommendedCapability,
        confidence: result.confidence,
        notes: result.notes.join(' '),
        metadata: JSON.parse(JSON.stringify(result.metadata ?? {})) as Prisma.InputJsonValue,
      },
    });
    await tx.source.update({
      where: { id: sourceId },
      data: {
        accessState: result.accessState,
        antiBotObserved: result.challengeDetected,
        requiresLogin: result.requiresLogin,
        emailAlertsAvailable: result.emailAlertsAvailable,
        lastAuditedAt: new Date(),
      },
    });
    return audit;
  });
}

async function ensureUnclassifiedSource() {
  const source = await prisma.source.upsert({
    where: { slug: 'unclassified-source' },
    create: {
      name: 'Unclassified Source',
      slug: 'unclassified-source',
      sourceType: SourceType.UNCLASSIFIED,
      collectionCapability: CollectionCapability.UNKNOWN,
      baseUrl: 'https://unclassified.invalid/',
      systemOwned: true,
      active: true,
    },
    update: { systemOwned: true, active: true },
  });
  await prisma.sourceHealth.upsert({
    where: { sourceId: source.id },
    create: { sourceId: source.id, status: SourceHealthStatus.UNKNOWN },
    update: {},
  });
  return source;
}

async function resolveByUrl(url: string) {
  const targetHost = normalizeHostname(url);
  if (!targetHost) return { source: null, matched: false, hostname: null, suggestedBaseUrl: null };
  const direct = await prisma.source.findFirst({
    where: { active: true, normalizedDomain: targetHost, sourceType: { not: SourceType.UNCLASSIFIED } },
  });
  if (direct) return { source: direct, matched: true, hostname: targetHost, suggestedBaseUrl: sourceBaseUrl(url) };
  const sources = await prisma.source.findMany({ where: { active: true, sourceType: { not: SourceType.UNCLASSIFIED } } });
  const source = sources.find((candidate) => {
    const hosts = [candidate.normalizedDomain, normalizeHostname(candidate.baseUrl), candidate.careersUrl ? normalizeHostname(candidate.careersUrl) : null].filter(Boolean) as string[];
    return hosts.some((host) => host === targetHost || targetHost.endsWith(`.${host}`) || host.endsWith(`.${targetHost}`));
  }) ?? null;
  return { source, matched: Boolean(source), hostname: targetHost, suggestedBaseUrl: sourceBaseUrl(url) };
}

export const sourceService = {
  ensureUnclassifiedSource,
  resolveByUrl,
  async verifyUrl(url: string) { return verifyPublicUrl(url); },

  async list(where: Prisma.SourceWhereInput) {
    return prisma.source.findMany({
      where,
      include: {
        schedule: true,
        health: true,
        _count: { select: { listings: true, subscriptions: true, organizationLinks: true } },
      },
      orderBy: [{ systemOwned: 'asc' }, { active: 'desc' }, { name: 'asc' }],
    });
  },

  async get(sourceId: string) { return getSource(sourceId); },

  async workspace(sourceId: string, userId: string) {
    await sourceAccessService.assertCanUse(sourceId, userId);
    const source = await getSource(sourceId);
    const [listings, applications, configs, runs, organizations] = await Promise.all([
      prisma.jobListing.findMany({
        where: { sourceId },
        include: { job: { include: { company: true, userStates: { where: { userId } }, applications: { where: { userId }, orderBy: { appliedAt: 'desc' } } } } },
        orderBy: { firstSeenAt: 'desc' }, take: 200,
      }),
      prisma.application.findMany({
        where: { userId, OR: [{ foundSourceId: sourceId }, { appliedSourceId: sourceId }, { foundSourceId: null, sourceListing: { sourceId } }] },
        include: {
          job: { include: { company: true } },
          sourceListing: { include: { source: true } },
          foundSource: true,
          appliedSource: true,
          events: { orderBy: { occurredAt: 'asc' } },
        },
        orderBy: { appliedAt: 'desc' },
      }),
      prisma.crawlerConfig.findMany({
        where: { sourceId, createdByUserId: userId },
        include: { _count: { select: { runs: true } }, runs: { orderBy: { createdAt: 'desc' }, take: 5 } },
        orderBy: [{ enabled: 'desc' }, { name: 'asc' }],
      }),
      prisma.acquisitionRun.findMany({
        where: { sourceId }, include: { crawlerConfig: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' }, take: 100,
      }),
      prisma.organizationSource.findMany({ where: { sourceId }, include: { company: true }, orderBy: { lastSeenAt: 'desc' }, take: 200 }),
    ]);

    const foundApplicationRows = applications.filter((application) =>
      application.foundSourceId === sourceId || (!application.foundSourceId && application.sourceListing?.sourceId === sourceId),
    );
    const appliedApplicationRows = applications.filter((application) =>
      application.appliedSourceId === sourceId || (!application.appliedSourceId && application.sourceListing?.sourceId === sourceId),
    );
    const stageCounts = (rows: typeof applications) => rows.reduce<Record<string, number>>((counts, application) => {
      counts[application.stage] = (counts[application.stage] ?? 0) + 1;
      return counts;
    }, {});
    const foundStageCounts = stageCounts(foundApplicationRows);
    const appliedStageCounts = stageCounts(appliedApplicationRows);

    return {
      source,
      listings,
      applications,
      applicationStageCounts: foundStageCounts,
      foundStageCounts,
      appliedStageCounts,
      configs,
      runs,
      organizations,
      attribution: { foundApplications: foundApplicationRows.length, appliedVia: appliedApplicationRows.length },
    };
  },

  async create(userId: string, input: CreateSourceInput) {
    const verification = await assertSavableUrl(input.careersUrl ?? input.baseUrl, 'Job Source URL');
    const normalizedBaseUrl = sourceBaseUrl(verification.finalUrl || input.baseUrl);
    const normalizedDomain = normalizeHostname(normalizedBaseUrl);
    if (!normalizedDomain) throw new BadRequestError('The Job Source domain could not be determined.');
    const resolvedExisting = await resolveByUrl(normalizedBaseUrl);
    const existing = resolvedExisting.source ?? await prisma.source.findFirst({
      where: { OR: [{ normalizedDomain }, { baseUrl: normalizedBaseUrl }] },
      select: { id: true, name: true },
    });
    if (existing) throw new ConflictError(`This Job Source already exists as ${existing.name}.`);

    const auditResult = input.auditNow ? await sourceAuditService.analyze(input.careersUrl ?? input.baseUrl) : null;
    const collectionCapability = input.collectionCapability ?? auditResult?.recommendedCapability ?? CollectionCapability.MANUAL_ONLY;
    const source = await prisma.$transaction(async (tx) => {
      const created = await tx.source.create({
        data: {
          name: input.name,
          slug: await uniqueSlug(input.name),
          sourceType: input.sourceType,
          collectionCapability,
          baseUrl: normalizedBaseUrl,
          normalizedDomain,
          careersUrl: input.careersUrl ?? (verification.redirected ? verification.finalUrl : null),
          createdByUserId: userId,
          defaultIntervalMinutes: input.defaultIntervalMinutes,
          ...(auditResult ? { accessState: auditResult.accessState } : {}),
          requiresLogin: auditResult?.requiresLogin ?? false,
          antiBotObserved: auditResult?.challengeDetected ?? false,
          emailAlertsAvailable: auditResult?.emailAlertsAvailable ?? false,
          lastAuditedAt: auditResult ? new Date() : null,
        },
      });
      await tx.sourceSchedule.create({ data: { sourceId: created.id, enabled: false, intervalMinutes: input.defaultIntervalMinutes, nextRunAt: null } });
      await tx.sourceHealth.create({ data: { sourceId: created.id, status: SourceHealthStatus.UNKNOWN } });
      return created;
    });
    if (auditResult) await saveAudit(source.id, auditResult);
    return getSource(source.id);
  },

  async update(sourceId: string, userId: string, input: UpdateSourceInput) {
    await sourceAccessService.assertCanManage(sourceId, userId);
    const current = await prisma.source.findUnique({ where: { id: sourceId }, select: { systemOwned: true, baseUrl: true } });
    if (!current) throw new NotFoundError('Job Source not found.');
    if (current.systemOwned && (input.name !== undefined || input.sourceType !== undefined || input.active === false)) {
      throw new ForbiddenError('System Job Sources cannot be renamed, retyped or disabled.');
    }
    let data: Prisma.SourceUpdateInput = input;
    if (typeof input.baseUrl === 'string') {
      const verification = await assertSavableUrl(input.baseUrl, 'Job Source URL');
      const normalizedBaseUrl = sourceBaseUrl(verification.finalUrl || input.baseUrl);
      const normalizedDomain = normalizeHostname(normalizedBaseUrl);
      const resolution = await resolveByUrl(normalizedBaseUrl);
      const duplicate = resolution.source && resolution.source.id !== sourceId
        ? resolution.source
        : normalizedDomain ? await prisma.source.findFirst({ where: { normalizedDomain, id: { not: sourceId } }, select: { name: true } }) : null;
      if (duplicate) throw new ConflictError(`That domain already belongs to ${duplicate.name}.`);
      data = { ...input, baseUrl: normalizedBaseUrl, normalizedDomain };
    }
    await prisma.source.update({ where: { id: sourceId }, data });
    if (input.collectionCapability !== undefined || input.defaultIntervalMinutes !== undefined) await recalculateSourceSchedule(sourceId);
    return getSource(sourceId);
  },

  async remove(sourceId: string, userId: string) {
    await sourceAccessService.assertCanManage(sourceId, userId);
    const current = await prisma.source.findUnique({
      where: { id: sourceId },
      include: { _count: { select: { listings: true, runs: true, foundApplications: true, appliedApplications: true, organizationLinks: true } } },
    });
    if (!current) throw new NotFoundError('Job Source not found.');
    if (current.systemOwned) throw new ForbiddenError('System Job Sources cannot be removed.');
    const hasHistory = Object.values(current._count).some((count) => count > 0);
    if (hasHistory) {
      await prisma.$transaction([
        prisma.source.update({ where: { id: sourceId }, data: { active: false } }),
        prisma.sourceSchedule.updateMany({ where: { sourceId }, data: { enabled: false, nextRunAt: null } }),
        prisma.crawlerConfig.updateMany({ where: { sourceId }, data: { enabled: false, nextRunAt: null } }),
      ]);
      return { deleted: false, archived: true, reason: 'Historical jobs, runs or applications reference this Job Source.' };
    }
    await prisma.source.delete({ where: { id: sourceId } });
    return { deleted: true, archived: false };
  },

  async audit(sourceId: string, userId: string) {
    await sourceAccessService.assertCanUse(sourceId, userId);
    const source = await getSource(sourceId);
    const result = await sourceAuditService.analyze(source.careersUrl ?? source.baseUrl);
    const audit = await saveAudit(sourceId, result);
    return { audit, recommendation: result };
  },
};
