import { prisma } from '../../shared/prisma/prisma-client.js';
import { deleteCvOriginal } from './cv-cloudinary.service.js';

let processing = false;

export async function processCvAssetDeletions(): Promise<void> {
  if (processing) return;
  processing = true;
  try {
    const jobs = await prisma.cvAssetDeletion.findMany({
      where: { nextAttemptAt: { lte: new Date() } },
      orderBy: [{ nextAttemptAt: 'asc' }, { createdAt: 'asc' }],
      take: 10,
    });

    for (const job of jobs) {
      try {
        await deleteCvOriginal(job.publicId);
        await prisma.cvAssetDeletion.deleteMany({ where: { id: job.id } });
      } catch (error) {
        const attempts = job.attempts + 1;
        const delayMs = Math.min(24 * 60 * 60 * 1000, 1000 * 2 ** Math.min(attempts, 16));
        const lastError = error instanceof Error ? error.message.slice(0, 1000) : 'Unknown Cloudinary deletion error.';
        await prisma.cvAssetDeletion.updateMany({
          where: { id: job.id },
          data: {
            attempts,
            nextAttemptAt: new Date(Date.now() + delayMs),
            lastError,
          },
        });
        console.error('CV Cloudinary asset deletion failed; retry scheduled.', {
          publicId: job.publicId,
          attempts,
          lastError,
        });
      }
    }
  } finally {
    processing = false;
  }
}
