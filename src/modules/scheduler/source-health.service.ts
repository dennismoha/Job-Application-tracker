import { CircuitState, RunStatus, SourceHealthStatus } from '@prisma/client';

import { prisma } from '../../shared/prisma/prisma-client.js';

export function calculateBackoffMinutes(consecutiveFailures: number): number {
  const exponent = Math.max(0, consecutiveFailures - 1);
  return Math.min(60 * 24 * 7, 60 * 2 ** exponent);
}

async function calculateSuccessRate(sourceId: string): Promise<number | null> {
  const recentRuns = await prisma.acquisitionRun.findMany({
    where: {
      sourceId,
      status: {
        in: [RunStatus.COMPLETED, RunStatus.PARTIAL, RunStatus.FAILED, RunStatus.CHALLENGED],
      },
    },
    select: { status: true },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  if (recentRuns.length === 0) {
    return null;
  }

  const successful = recentRuns.filter((run) => run.status === RunStatus.COMPLETED).length;
  return successful / recentRuns.length;
}

export const sourceHealthService = {
  async recordRunResult(sourceId: string, status: RunStatus): Promise<void> {
    const health = await prisma.sourceHealth.findUnique({ where: { sourceId } });
    const schedule = await prisma.sourceSchedule.findUnique({ where: { sourceId } });

    if (!health || !schedule) {
      return;
    }

    const now = new Date();
    const successRate = await calculateSuccessRate(sourceId);

    if (status === RunStatus.COMPLETED) {
      await prisma.$transaction([
        prisma.sourceHealth.update({
          where: { sourceId },
          data: {
            status: SourceHealthStatus.HEALTHY,
            successRate,
            consecutiveFailures: 0,
            lastSuccessAt: now,
            reason: null,
          },
        }),
        prisma.sourceSchedule.update({
          where: { sourceId },
          data: {
            consecutiveFailures: 0,
            circuitState: CircuitState.CLOSED,
            pausedUntil: null,
            lastSuccessfulRunAt: now,
          },
        }),
      ]);
      return;
    }

    if (status === RunStatus.SKIPPED || status === RunStatus.CANCELLED) {
      return;
    }

    const failures = health.consecutiveFailures + 1;
    const challenge = status === RunStatus.CHALLENGED;
    const pauseMinutes = challenge ? 24 * 60 : calculateBackoffMinutes(failures);
    const pausedUntil = new Date(now.getTime() + pauseMinutes * 60_000);
    const shouldOpenCircuit = challenge || failures >= 3;

    let healthStatus: SourceHealthStatus = SourceHealthStatus.DEGRADED;
    if (challenge) healthStatus = SourceHealthStatus.CHALLENGED;
    if (failures >= 5) healthStatus = SourceHealthStatus.UNHEALTHY;

    await prisma.$transaction([
      prisma.sourceHealth.update({
        where: { sourceId },
        data: {
          status: healthStatus,
          successRate,
          consecutiveFailures: failures,
          lastFailureAt: now,
          ...(challenge ? { lastChallengeAt: now } : {}),
          reason: `Last acquisition run ended as ${status}.`,
        },
      }),
      prisma.sourceSchedule.update({
        where: { sourceId },
        data: {
          consecutiveFailures: failures,
          circuitState: shouldOpenCircuit ? CircuitState.OPEN : schedule.circuitState,
          pausedUntil: shouldOpenCircuit || status === RunStatus.RATE_LIMITED ? pausedUntil : schedule.pausedUntil,
        },
      }),
    ]);
  },
};
