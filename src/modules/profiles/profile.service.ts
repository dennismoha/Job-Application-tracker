import type { Prisma } from '@prisma/client';

import { NotFoundError } from '../../shared/http/http-error.js';
import { prisma } from '../../shared/prisma/prisma-client.js';
import { recalculateSourceSchedule } from './profile-source.service.js';

interface CreateProfileInput {
  name: string;
  description?: string | null;
  keywords: string[];
  excludedKeywords: string[];
  countries: string[];
  locations: string[];
  remoteOnly: boolean;
  minimumSalary?: number | null;
  salaryCurrency?: string | null;
  defaultFreshnessDays: number;
  defaultExpiryDays: number;
  enabled: boolean;
  categoryIds: string[];
}

type UpdateProfileInput = Partial<CreateProfileInput>;

const profileInclude = {
  categories: true,
  _count: {
    select: {
      subscriptions: true,
      applications: true,
    },
  },
} satisfies Prisma.SearchProfileInclude;

async function ensureOwnedProfile(profileId: string, userId: string) {
  const profile = await prisma.searchProfile.findFirst({
    where: {
      id: profileId,
      userId,
    },
    include: profileInclude,
  });

  if (!profile) {
    throw new NotFoundError('Search profile not found.');
  }

  return profile;
}

export const profileService = {
  async list(userId: string) {
    return prisma.searchProfile.findMany({
      where: { userId },
      include: profileInclude,
      orderBy: { createdAt: 'asc' },
    });
  },

  async get(profileId: string, userId: string) {
    return ensureOwnedProfile(profileId, userId);
  },

  async create(userId: string, input: CreateProfileInput) {
    const { categoryIds, ...data } = input;

    return prisma.searchProfile.create({
      data: {
        ...data,
        userId,
        categories: {
          connect: categoryIds.map((id) => ({ id })),
        },
      },
      include: profileInclude,
    });
  },

  async update(profileId: string, userId: string, input: UpdateProfileInput) {
    await ensureOwnedProfile(profileId, userId);

    const { categoryIds, ...data } = input;

    const updated = await prisma.searchProfile.update({
      where: { id: profileId },
      data: {
        ...data,
        ...(categoryIds
          ? {
              categories: {
                set: categoryIds.map((id) => ({ id })),
              },
            }
          : {}),
      },
      include: profileInclude,
    });

    if (input.enabled !== undefined) {
      const subscriptions = await prisma.sourceSubscription.findMany({
        where: { profileId },
        select: { sourceId: true },
      });

      for (const subscription of subscriptions) {
        await recalculateSourceSchedule(subscription.sourceId);
      }
    }

    return updated;
  },

  async remove(profileId: string, userId: string): Promise<void> {
    await ensureOwnedProfile(profileId, userId);

    const subscriptions = await prisma.sourceSubscription.findMany({
      where: { profileId },
      select: { sourceId: true },
    });

    await prisma.searchProfile.delete({ where: { id: profileId } });

    for (const subscription of subscriptions) {
      await recalculateSourceSchedule(subscription.sourceId);
    }
  },
};
