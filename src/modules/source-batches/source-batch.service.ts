import { CollectionCapability, RunStatus, RunType } from '@prisma/client';

import { BadRequestError, NotFoundError } from '../../shared/http/http-error.js';
import { prisma } from '../../shared/prisma/prisma-client.js';
import { sourceAccessService } from '../sources/source-access.service.js';

async function ownedBatch(userId: string, batchId: string) {
  const batch = await prisma.sourceBatch.findFirst({
    where: { id: batchId, userId },
    include: { items: { include: { source: true }, orderBy: { order: 'asc' } } },
  });
  if (!batch) throw new NotFoundError('Source batch not found.');
  return batch;
}

async function replaceItems(batchId: string, userId: string, sourceIds: string[]) {
  const uniqueIds = [...new Set(sourceIds)];
  for (const sourceId of uniqueIds) await sourceAccessService.assertCanUse(sourceId, userId);

  await prisma.$transaction([
    prisma.sourceBatchItem.deleteMany({ where: { batchId } }),
    ...uniqueIds.map((sourceId, index) =>
      prisma.sourceBatchItem.create({ data: { batchId, sourceId, order: index } }),
    ),
  ]);
}

export const sourceBatchService = {
  list(userId: string) {
    return prisma.sourceBatch.findMany({
      where: { userId },
      include: { items: { include: { source: { select: { id: true, name: true, collectionCapability: true } } }, orderBy: { order: 'asc' } } },
      orderBy: { updatedAt: 'desc' },
    });
  },

  async create(userId: string, input: { name: string; description?: string; sourceIds: string[] }) {
    const batch = await prisma.sourceBatch.create({
      data: { userId, name: input.name, ...(input.description ? { description: input.description } : {}) },
    });
    await replaceItems(batch.id, userId, input.sourceIds);
    return ownedBatch(userId, batch.id);
  },

  async update(userId: string, batchId: string, input: { name?: string; description?: string | null; sourceIds?: string[] }) {
    await ownedBatch(userId, batchId);
    await prisma.sourceBatch.update({
      where: { id: batchId },
      data: {
        ...(input.name ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
      },
    });
    if (input.sourceIds) await replaceItems(batchId, userId, input.sourceIds);
    return ownedBatch(userId, batchId);
  },

  async remove(userId: string, batchId: string) {
    await ownedBatch(userId, batchId);
    await prisma.sourceBatch.delete({ where: { id: batchId } });
  },

  async run(userId: string, batchId: string) {
    const batch = await ownedBatch(userId, batchId);
    const queued = [];
    let delaySeconds = 0;

    for (const item of batch.items.filter((candidate) => candidate.enabled)) {
      const source = item.source;
      if ([CollectionCapability.EMAIL_ONLY, CollectionCapability.RESTRICTED, CollectionCapability.DISABLED].includes(source.collectionCapability)) {
        continue;
      }

      const active = await prisma.acquisitionRun.findFirst({
        where: { sourceId: source.id, status: { in: [RunStatus.QUEUED, RunStatus.RUNNING] } },
      });
      if (active) continue;

      const run = await prisma.acquisitionRun.create({
        data: {
          sourceId: source.id,
          runType: source.collectionCapability === CollectionCapability.SEARCH_ONLY ? RunType.WEB_SEARCH : RunType.MANUAL_CRAWL,
          status: RunStatus.QUEUED,
          scheduledFor: new Date(Date.now() + delaySeconds * 1000),
          metadata: { batchId, batchName: batch.name, requestedByUserId: userId },
        },
      });
      queued.push(run);
      delaySeconds += Math.max(2, Math.ceil(source.minimumRequestDelayMs / 1000));
    }

    if (queued.length === 0) {
      throw new BadRequestError('No runnable sources were available in this batch.');
    }

    return { batchId, queued };
  },
};
