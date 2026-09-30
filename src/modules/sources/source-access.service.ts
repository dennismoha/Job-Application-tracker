import { ForbiddenError, NotFoundError } from '../../shared/http/http-error.js';
import { prisma } from '../../shared/prisma/prisma-client.js';

async function loadSource(sourceId: string) {
  const source = await prisma.source.findUnique({
    where: { id: sourceId },
    select: { id: true, createdByUserId: true },
  });

  if (!source) {
    throw new NotFoundError('Source not found.');
  }

  return source;
}

export const sourceAccessService = {
  async assertCanUse(sourceId: string, userId: string): Promise<void> {
    const source = await loadSource(sourceId);

    if (source.createdByUserId === userId) {
      return;
    }

    const subscription = await prisma.sourceSubscription.findFirst({
      where: {
        sourceId,
        enabled: true,
        profile: { userId },
      },
      select: { id: true },
    });

    if (!subscription) {
      throw new ForbiddenError('Subscribe one of your search profiles to this source first.');
    }
  },

  async assertCanManage(sourceId: string, userId: string): Promise<void> {
    const source = await loadSource(sourceId);

    if (source.createdByUserId !== userId) {
      throw new ForbiddenError('Only the user who created this source can change its shared configuration.');
    }
  },
};
