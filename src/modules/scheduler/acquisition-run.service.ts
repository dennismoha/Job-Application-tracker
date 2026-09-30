import { CollectionCapability, CircuitState, RunStatus, RunType } from '@prisma/client';

import { BadRequestError, NotFoundError } from '../../shared/http/http-error.js';
import { prisma } from '../../shared/prisma/prisma-client.js';
import { sourceAccessService } from '../sources/source-access.service.js';
import { AcquisitionDispatcher } from './acquisition-dispatcher.js';
import { sourceHealthService } from './source-health.service.js';

const ACTIVE_STATUSES = [RunStatus.QUEUED, RunStatus.RUNNING];

export const acquisitionRunService = {
  async queueSourceRun(sourceId: string, userId: string, runType?: RunType) {
    await sourceAccessService.assertCanUse(sourceId, userId);
    const source = await prisma.source.findUnique({
      where: { id: sourceId },
      include: { schedule: true },
    });

    if (!source) {
      throw new NotFoundError('Source not found.');
    }

    if ([CollectionCapability.EMAIL_ONLY, CollectionCapability.RESTRICTED, CollectionCapability.DISABLED].includes(source.collectionCapability)) {
      throw new BadRequestError(`${source.collectionCapability} sources cannot be started as direct network runs.`);
    }

    const existingRun = await prisma.acquisitionRun.findFirst({
      where: {
        sourceId,
        status: { in: ACTIVE_STATUSES },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existingRun) {
      return existingRun;
    }

    const effectiveRunType =
      runType ?? (source.collectionCapability === CollectionCapability.SEARCH_ONLY ? RunType.WEB_SEARCH : RunType.MANUAL_CRAWL);

    return prisma.acquisitionRun.create({
      data: {
        sourceId,
        scheduleId: source.schedule?.id,
        runType: effectiveRunType,
        status: RunStatus.QUEUED,
        scheduledFor: new Date(),
      },
    });
  },

  async list(userId: string, input: { sourceId?: string; status?: RunStatus; limit: number }) {
    return prisma.acquisitionRun.findMany({
      where: {
        ...(input.sourceId ? { sourceId: input.sourceId } : {}),
        ...(input.status ? { status: input.status } : {}),
        source: {
          OR: [
            { createdByUserId: userId },
            { subscriptions: { some: { profile: { userId } } } },
          ],
        },
      },
      include: {
        source: { select: { id: true, name: true, collectionCapability: true } },
        crawlerConfig: { select: { id: true, name: true, enabled: true, intervalMinutes: true, pausedUntil: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: input.limit,
    });
  },

  async getDetail(runId: string, userId: string) {
    const run = await prisma.acquisitionRun.findFirst({
      where: {
        id: runId,
        source: { OR: [{ createdByUserId: userId }, { subscriptions: { some: { profile: { userId } } } }] },
      },
      include: {
        source: { select: { id: true, name: true, collectionCapability: true } },
        crawlerConfig: true,
        listings: {
          include: {
            job: { include: { company: true, applications: { where: { userId }, orderBy: { appliedAt: 'desc' }, take: 1 } } },
          },
          orderBy: { firstSeenAt: 'desc' },
        },
      },
    });
    if (!run) throw new NotFoundError('Acquisition run not found.');
    return run;
  },

  async recoverStaleRuns(staleBefore: Date) {
    const staleRuns = await prisma.acquisitionRun.findMany({
      where: {
        status: RunStatus.RUNNING,
        lockedAt: { lt: staleBefore },
      },
      select: { id: true, sourceId: true },
      take: 100,
    });

    for (const run of staleRuns) {
      const recovered = await prisma.acquisitionRun.updateMany({
        where: {
          id: run.id,
          status: RunStatus.RUNNING,
          lockedAt: { lt: staleBefore },
        },
        data: {
          status: RunStatus.FAILED,
          finishedAt: new Date(),
          errorCode: 'STALE_WORKER_LOCK',
          errorMessage: 'The worker stopped updating this run before it completed.',
        },
      });

      if (recovered.count === 1 && run.sourceId) {
        await sourceHealthService.recordRunResult(run.sourceId, RunStatus.FAILED);
      }
    }

    return staleRuns.length;
  },

  async claimNext(workerId: string) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const candidate = await prisma.acquisitionRun.findFirst({
        where: { status: RunStatus.QUEUED },
        orderBy: [{ scheduledFor: 'asc' }, { createdAt: 'asc' }],
      });

      if (!candidate) return null;

      const claimed = await prisma.acquisitionRun.updateMany({
        where: {
          id: candidate.id,
          status: RunStatus.QUEUED,
        },
        data: {
          status: RunStatus.RUNNING,
          startedAt: new Date(),
          lockedAt: new Date(),
          lockedBy: workerId,
        },
      });

      if (claimed.count === 1) {
        return prisma.acquisitionRun.findUnique({
          where: { id: candidate.id },
          include: { source: true },
        });
      }
    }

    return null;
  },

  async executeClaimedRun(runId: string, dispatcher = new AcquisitionDispatcher()) {
    const run = await prisma.acquisitionRun.findUnique({
      where: { id: runId },
      include: { source: true, crawlerConfig: true },
    });

    if (!run?.source || run.status !== RunStatus.RUNNING) {
      throw new NotFoundError('Claimed acquisition run not found.');
    }

    let result;

    try {
      result = await dispatcher.dispatch(run.source, run.runType, {
        runId: run.id,
        ...(run.crawlerConfig ? { crawlerConfig: {
          id: run.crawlerConfig.id,
          name: run.crawlerConfig.name,
          keywords: run.crawlerConfig.keywords,
          locations: run.crawlerConfig.locations,
          categories: run.crawlerConfig.categories,
          subjects: run.crawlerConfig.subjects,
          maximumPages: run.crawlerConfig.maximumPages,
          maximumRequests: run.crawlerConfig.maximumRequests,
          requestDelayMs: run.crawlerConfig.requestDelayMs,
        } } : {}),
      });
    } catch (error) {
      result = {
        status: RunStatus.FAILED,
        errorCode: 'UNHANDLED_RUNNER_ERROR',
        errorMessage: error instanceof Error ? error.message : 'Unknown acquisition worker error.',
      };
    }

    const finished = await prisma.acquisitionRun.update({
      where: { id: run.id },
      data: {
        status: result.status,
        finishedAt: new Date(),
        pagesRequested: result.pagesRequested ?? 0,
        listingsFound: result.listingsFound ?? 0,
        newListings: result.newListings ?? 0,
        updatedListings: result.updatedListings ?? 0,
        unchangedListings: result.unchangedListings ?? 0,
        newJobs: result.newJobs ?? 0,
        duplicates: result.duplicates ?? 0,
        quarantined: result.quarantined ?? 0,
        ...(result.httpStatus === undefined ? {} : { httpStatus: result.httpStatus }),
        ...(result.errorCode === undefined ? {} : { errorCode: result.errorCode }),
        ...(result.errorMessage === undefined ? {} : { errorMessage: result.errorMessage }),
        ...(result.metadata === undefined ? {} : { metadata: result.metadata }),
      },
    });

    await sourceHealthService.recordRunResult(run.source.id, result.status);

    if (run.crawlerConfigId) {
      const failed = [RunStatus.FAILED, RunStatus.CHALLENGED, RunStatus.RATE_LIMITED].includes(result.status);
      await prisma.crawlerConfig.updateMany({
        where: { id: run.crawlerConfigId },
        data: failed
          ? { consecutiveFailures: { increment: 1 }, circuitState: result.status === RunStatus.CHALLENGED ? CircuitState.OPEN : undefined }
          : { consecutiveFailures: 0, circuitState: CircuitState.CLOSED },
      });
    }

    return finished;
  },
};
