import { CollectionCapability, CircuitState, RunStatus, RunType } from '@prisma/client';

import { BadRequestError, NotFoundError } from '../../shared/http/http-error.js';
import { prisma } from '../../shared/prisma/prisma-client.js';
import { sourceAccessService } from '../sources/source-access.service.js';

function nextRun(intervalMinutes: number): Date {
  return new Date(Date.now() + intervalMinutes * 60_000);
}

async function ownedConfig(configId: string, userId: string) {
  const config = await prisma.crawlerConfig.findFirst({
    where: { id: configId, createdByUserId: userId },
    include: { source: true },
  });
  if (!config) throw new NotFoundError('Crawler configuration not found.');
  return config;
}

export const crawlerConfigService = {
  async listAll(userId: string) {
    return prisma.crawlerConfig.findMany({
      where: { createdByUserId: userId },
      include: { source: { select: { id: true, name: true, sourceType: true, collectionCapability: true, active: true, health: true } }, _count: { select: { runs: true } } },
      orderBy: [{ source: { name: 'asc' } }, { enabled: 'desc' }, { name: 'asc' }],
    });
  },
  async listForSource(sourceId: string, userId: string) {
    await sourceAccessService.assertCanUse(sourceId, userId);
    return prisma.crawlerConfig.findMany({
      where: { sourceId, createdByUserId: userId },
      include: {
        _count: { select: { runs: true } },
        runs: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
      orderBy: [{ enabled: 'desc' }, { name: 'asc' }],
    });
  },

  async create(sourceId: string, userId: string, input: any) {
    await sourceAccessService.assertCanManage(sourceId, userId);
    const source = await prisma.source.findUnique({ where: { id: sourceId } });
    if (!source) throw new NotFoundError('Source not found.');
    if (source.collectionCapability === CollectionCapability.EMAIL_ONLY
      || source.collectionCapability === CollectionCapability.RESTRICTED
      || source.collectionCapability === CollectionCapability.DISABLED) {
      throw new BadRequestError(`${source.collectionCapability} sources cannot use automatic crawler configurations.`);
    }
    return prisma.crawlerConfig.create({
      data: {
        sourceId,
        createdByUserId: userId,
        ...input,
        nextRunAt: input.enabled === false ? null : nextRun(input.intervalMinutes ?? 1440),
      },
    });
  },

  async update(configId: string, userId: string, input: any) {
    const config = await ownedConfig(configId, userId);
    const intervalMinutes = input.intervalMinutes ?? config.intervalMinutes;
    return prisma.crawlerConfig.update({
      where: { id: configId },
      data: {
        ...input,
        ...(input.enabled === false ? { nextRunAt: null } : {}),
        ...(input.enabled === true || input.intervalMinutes !== undefined ? { nextRunAt: nextRun(intervalMinutes) } : {}),
      },
    });
  },

  async pause(configId: string, userId: string, minutes: number) {
    await ownedConfig(configId, userId);
    return prisma.crawlerConfig.update({
      where: { id: configId },
      data: { pausedUntil: new Date(Date.now() + minutes * 60_000), circuitState: CircuitState.OPEN },
    });
  },

  async resume(configId: string, userId: string) {
    const config = await ownedConfig(configId, userId);
    return prisma.crawlerConfig.update({
      where: { id: configId },
      data: { pausedUntil: null, circuitState: CircuitState.CLOSED, consecutiveFailures: 0, nextRunAt: nextRun(config.intervalMinutes) },
    });
  },

  async remove(configId: string, userId: string) {
    await ownedConfig(configId, userId);
    await prisma.crawlerConfig.delete({ where: { id: configId } });
  },

  async queue(configId: string, userId: string) {
    const config = await ownedConfig(configId, userId);
    const existing = await prisma.acquisitionRun.findFirst({
      where: { crawlerConfigId: config.id, status: { in: [RunStatus.QUEUED, RunStatus.RUNNING] } },
    });
    if (existing) return existing;
    return prisma.acquisitionRun.create({
      data: {
        sourceId: config.sourceId,
        crawlerConfigId: config.id,
        runType: config.source.collectionCapability === CollectionCapability.SEARCH_ONLY ? RunType.WEB_SEARCH : RunType.MANUAL_CRAWL,
        status: RunStatus.QUEUED,
        scheduledFor: new Date(),
        metadata: { crawlerConfig: { name: config.name, keywords: config.keywords, locations: config.locations, categories: config.categories, subjects: config.subjects, maximumPages: config.maximumPages, maximumRequests: config.maximumRequests, requestDelayMs: config.requestDelayMs } },
      },
    });
  },

  async queueDue(now = new Date()) {
    const due = await prisma.crawlerConfig.findMany({
      where: {
        enabled: true,
        nextRunAt: { lte: now },
        OR: [{ pausedUntil: null }, { pausedUntil: { lte: now } }],
        source: { active: true, collectionCapability: { in: [CollectionCapability.CRAWLABLE, CollectionCapability.SEARCH_ONLY] } },
      },
      include: { source: true },
      take: 100,
      orderBy: { nextRunAt: 'asc' },
    });
    let queued = 0;
    for (const config of due) {
      const claimed = await prisma.crawlerConfig.updateMany({
        where: { id: config.id, enabled: true, nextRunAt: { lte: now } },
        data: { lastRunAt: now, nextRunAt: new Date(now.getTime() + config.intervalMinutes * 60_000), circuitState: config.circuitState === CircuitState.OPEN ? CircuitState.HALF_OPEN : config.circuitState },
      });
      if (claimed.count !== 1) continue;
      const active = await prisma.acquisitionRun.findFirst({ where: { crawlerConfigId: config.id, status: { in: [RunStatus.QUEUED, RunStatus.RUNNING] } } });
      if (active) continue;
      await prisma.acquisitionRun.create({
        data: {
          sourceId: config.sourceId,
          crawlerConfigId: config.id,
          runType: config.source.collectionCapability === CollectionCapability.SEARCH_ONLY ? RunType.WEB_SEARCH : RunType.SCHEDULED_CRAWL,
          status: RunStatus.QUEUED,
          scheduledFor: now,
          metadata: { crawlerConfig: { name: config.name, keywords: config.keywords, locations: config.locations, categories: config.categories, subjects: config.subjects, maximumPages: config.maximumPages, maximumRequests: config.maximumRequests, requestDelayMs: config.requestDelayMs } },
        },
      });
      queued += 1;
    }
    return queued;
  },
};
