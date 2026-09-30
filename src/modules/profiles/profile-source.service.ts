import { CollectionCapability } from '@prisma/client';

import { NotFoundError } from '../../shared/http/http-error.js';
import { prisma } from '../../shared/prisma/prisma-client.js';

async function ensureProfileOwnership(profileId: string, userId: string): Promise<void> {
  const profile = await prisma.searchProfile.findFirst({
    where: { id: profileId, userId },
    select: { id: true },
  });

  if (!profile) {
    throw new NotFoundError('Search profile not found.');
  }
}

export async function recalculateSourceSchedule(sourceId: string): Promise<void> {
  const source = await prisma.source.findUnique({ where: { id: sourceId } });

  if (!source) {
    throw new NotFoundError('Source not found.');
  }

  const subscriptions = await prisma.sourceSubscription.findMany({
    where: { sourceId, enabled: true, profile: { enabled: true } },
    select: { preferredIntervalMinutes: true },
  });

  const requestedIntervals = subscriptions
    .map((subscription) => subscription.preferredIntervalMinutes)
    .filter((value): value is number => value !== null);
  const intervalMinutes =
    requestedIntervals.length > 0 ? Math.min(...requestedIntervals) : source.defaultIntervalMinutes;
  const networkMode =
    source.collectionCapability === CollectionCapability.CRAWLABLE || source.collectionCapability === CollectionCapability.SEARCH_ONLY;
  const enabled = networkMode && subscriptions.length > 0;

  await prisma.sourceSchedule.upsert({
    where: { sourceId },
    create: {
      sourceId,
      enabled,
      intervalMinutes,
      nextRunAt: enabled ? new Date() : null,
    },
    update: {
      enabled,
      intervalMinutes,
      nextRunAt: enabled ? new Date() : null,
    },
  });
}

export const profileSourceService = {
  async list(profileId: string, userId: string) {
    await ensureProfileOwnership(profileId, userId);

    return prisma.sourceSubscription.findMany({
      where: { profileId },
      include: {
        source: {
          include: {
            health: true,
            schedule: true,
          },
        },
      },
      orderBy: { source: { name: 'asc' } },
    });
  },

  async upsert(
    profileId: string,
    sourceId: string,
    userId: string,
    input: { enabled: boolean; preferredIntervalMinutes?: number | null },
  ) {
    await ensureProfileOwnership(profileId, userId);

    const source = await prisma.source.findUnique({ where: { id: sourceId }, select: { id: true } });
    if (!source) throw new NotFoundError('Source not found.');

    const subscription = await prisma.sourceSubscription.upsert({
      where: { profileId_sourceId: { profileId, sourceId } },
      create: {
        profileId,
        sourceId,
        enabled: input.enabled,
        ...(input.preferredIntervalMinutes === undefined
          ? {}
          : { preferredIntervalMinutes: input.preferredIntervalMinutes }),
      },
      update: {
        enabled: input.enabled,
        ...(input.preferredIntervalMinutes === undefined
          ? {}
          : { preferredIntervalMinutes: input.preferredIntervalMinutes }),
      },
      include: { source: true },
    });

    await recalculateSourceSchedule(sourceId);
    return subscription;
  },

  async remove(profileId: string, sourceId: string, userId: string): Promise<void> {
    await ensureProfileOwnership(profileId, userId);

    await prisma.sourceSubscription.deleteMany({ where: { profileId, sourceId } });
    await recalculateSourceSchedule(sourceId);
  },
};
