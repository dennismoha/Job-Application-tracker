import { CollectionCapability, CircuitState, RunStatus, RunType } from '@prisma/client';

import { NotFoundError } from '../../shared/http/http-error.js';
import { prisma } from '../../shared/prisma/prisma-client.js';
import { sourceAccessService } from '../sources/source-access.service.js';

function nextRunFrom(now: Date, intervalMinutes: number): Date {
  return new Date(now.getTime() + intervalMinutes * 60_000);
}

async function getSchedule(sourceId: string) {
  const schedule = await prisma.sourceSchedule.findUnique({
    where: { sourceId },
    include: { source: true },
  });

  if (!schedule) {
    throw new NotFoundError('Source schedule not found.');
  }

  return schedule;
}

export const sourceScheduleService = {
  async get(sourceId: string, userId: string) {
    await sourceAccessService.assertCanUse(sourceId, userId);
    return getSchedule(sourceId);
  },

  async update(
    sourceId: string,
    userId: string,
    input: { enabled?: boolean; intervalMinutes?: number },
  ) {
    await sourceAccessService.assertCanManage(sourceId, userId);
    const schedule = await getSchedule(sourceId);
    const now = new Date();
    const intervalMinutes = input.intervalMinutes ?? schedule.intervalMinutes;

    return prisma.sourceSchedule.update({
      where: { sourceId },
      data: {
        ...input,
        nextRunAt: input.enabled === false ? schedule.nextRunAt : nextRunFrom(now, intervalMinutes),
      },
      include: { source: true },
    });
  },

  async pause(sourceId: string, userId: string, minutes: number) {
    await sourceAccessService.assertCanManage(sourceId, userId);
    await getSchedule(sourceId);
    return prisma.sourceSchedule.update({
      where: { sourceId },
      data: {
        pausedUntil: new Date(Date.now() + minutes * 60_000),
        circuitState: CircuitState.OPEN,
      },
    });
  },

  async resume(sourceId: string, userId: string) {
    await sourceAccessService.assertCanManage(sourceId, userId);
    const schedule = await getSchedule(sourceId);
    return prisma.sourceSchedule.update({
      where: { sourceId },
      data: {
        pausedUntil: null,
        circuitState: CircuitState.CLOSED,
        consecutiveFailures: 0,
        nextRunAt: nextRunFrom(new Date(), schedule.intervalMinutes),
      },
    });
  },

  async queueDueSchedules(now = new Date()): Promise<number> {
    const due = await prisma.sourceSchedule.findMany({
      where: {
        enabled: true,
        nextRunAt: { lte: now },
        OR: [{ pausedUntil: null }, { pausedUntil: { lte: now } }],
        source: {
          active: true,
          collectionCapability: { in: [CollectionCapability.CRAWLABLE, CollectionCapability.SEARCH_ONLY] },
        },
      },
      include: { source: true },
      orderBy: { nextRunAt: 'asc' },
      take: 100,
    });

    let queued = 0;

    for (const schedule of due) {
      const nextRunAt = nextRunFrom(now, schedule.intervalMinutes);

      const advanced = await prisma.sourceSchedule.updateMany({
        where: {
          id: schedule.id,
          enabled: true,
          nextRunAt: { lte: now },
        },
        data: {
          nextRunAt,
          lastRunAt: now,
          circuitState:
            schedule.circuitState === CircuitState.OPEN
              ? CircuitState.HALF_OPEN
              : schedule.circuitState,
        },
      });

      if (advanced.count !== 1) continue;

      const existing = await prisma.acquisitionRun.findFirst({
        where: {
          sourceId: schedule.sourceId,
          status: { in: [RunStatus.QUEUED, RunStatus.RUNNING] },
        },
        select: { id: true },
      });

      if (existing) continue;

      await prisma.acquisitionRun.create({
        data: {
          sourceId: schedule.sourceId,
          scheduleId: schedule.id,
          runType:
            schedule.source.collectionCapability === CollectionCapability.SEARCH_ONLY
              ? RunType.WEB_SEARCH
              : RunType.SCHEDULED_CRAWL,
          status: RunStatus.QUEUED,
          scheduledFor: now,
        },
      });

      queued += 1;
    }

    return queued;
  },
};
