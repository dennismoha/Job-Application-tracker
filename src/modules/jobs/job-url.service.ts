import { JobVisibility, type Prisma } from '@prisma/client';

import { prisma } from '../../shared/prisma/prisma-client.js';
import { normalizeJobUrl } from '../../shared/urls/url-integrity.js';

function linkedinJobId(normalizedUrl: string): string | null {
  try {
    const url = new URL(normalizedUrl);
    if (url.hostname !== 'linkedin.com') return null;
    const match = url.pathname.match(/\/jobs\/view\/(\d+)/);
    return match?.[1] ?? null;
  } catch { return null; }
}

export const jobUrlService = {
  async findExisting(url: string, userId?: string) {
    const normalizedUrl = normalizeJobUrl(url);
    const access: Prisma.JobListingWhereInput = userId
      ? { job: { OR: [{ visibility: JobVisibility.PUBLIC }, { createdByUserId: userId }] } }
      : {};

    let listing = await prisma.jobListing.findFirst({
      where: {
        ...access,
        OR: [
          { normalizedUrl },
          { sourceUrl: url },
          { applyUrl: url },
          { sourceUrl: normalizedUrl },
          { applyUrl: normalizedUrl },
        ],
      },
      include: { job: { select: { id: true, title: true, visibility: true, createdByUserId: true } }, source: { select: { id: true, name: true } } },
    });

    if (!listing) {
      const linkedInId = linkedinJobId(normalizedUrl);
      if (linkedInId) {
        listing = await prisma.jobListing.findFirst({
          where: {
            ...access,
            OR: [
              { sourceUrl: { contains: `currentJobId=${linkedInId}` } },
              { sourceUrl: { contains: `/jobs/view/${linkedInId}` } },
              { applyUrl: { contains: `currentJobId=${linkedInId}` } },
              { applyUrl: { contains: `/jobs/view/${linkedInId}` } },
            ],
          },
          include: { job: { select: { id: true, title: true, visibility: true, createdByUserId: true } }, source: { select: { id: true, name: true } } },
        });
      }
    }

    if (listing && !listing.normalizedUrl) {
      try { await prisma.jobListing.update({ where: { id: listing.id }, data: { normalizedUrl } }); } catch { /* another row may already own this canonical URL */ }
    }

    return { normalizedUrl, listing };
  },
};
