import { JobStatus, JobStatusEventType, ListingStatus } from '@prisma/client';

import { prisma } from '../../shared/prisma/prisma-client.js';

export const jobLifecycleService = {
  async expireKnownDates(now = new Date()): Promise<{ listings: number; jobs: number }> {
    const expiredListings = await prisma.jobListing.findMany({
      where: {
        status: ListingStatus.ACTIVE,
        expiresAt: { lt: now },
      },
      select: { id: true, jobId: true },
      take: 500,
    });

    if (expiredListings.length > 0) {
      await prisma.jobListing.updateMany({
        where: { id: { in: expiredListings.map((listing) => listing.id) } },
        data: { status: ListingStatus.EXPIRED, closedAt: now },
      });
    }

    const candidateJobIds = [...new Set(expiredListings.map((listing) => listing.jobId))];
    let expiredJobs = 0;

    for (const jobId of candidateJobIds) {
      const activeListings = await prisma.jobListing.count({
        where: { jobId, status: ListingStatus.ACTIVE },
      });

      if (activeListings > 0) continue;

      const updated = await prisma.job.updateMany({
        where: { id: jobId, status: JobStatus.ACTIVE },
        data: { status: JobStatus.EXPIRED, closedAt: now },
      });

      if (updated.count === 1) {
        expiredJobs += 1;
        await prisma.jobStatusEvent.create({
          data: { jobId, type: JobStatusEventType.EXPIRED, occurredAt: now },
        });
      }
    }

    return { listings: expiredListings.length, jobs: expiredJobs };
  },
};
