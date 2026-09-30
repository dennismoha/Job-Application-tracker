import { AiTaskType } from '@prisma/client';

import { env } from '../../config/env.js';
import type { NormalizedJobCandidate } from '../ingestion/normalization.types.js';
import { aiClient } from './ai-client.js';

interface ExistingCandidateJob {
  id: string;
  title: string;
  locationText: string | null;
  earliestPostedAt: Date | null;
  latestPostedAt: Date | null;
  company: { name: string; normalizedName: string } | null;
  listings: Array<{
    requisitionId: string | null;
    applyUrl: string | null;
    rawDescription: string | null;
  }>;
}

export async function aiDuplicateDecision(
  candidate: NormalizedJobCandidate,
  existing: ExistingCandidateJob,
): Promise<'SAME_JOB' | 'DIFFERENT_JOB' | 'UNCERTAIN'> {
  if (!env.AI_DEDUP_ENABLED || !aiClient.configured()) return 'UNCERTAIN';

  try {
    const result = await aiClient.generateJson<{ decision: 'SAME_JOB' | 'DIFFERENT_JOB' | 'UNCERTAIN'; reasons: string[] }>({
      task: AiTaskType.DEDUPLICATION,
      system: [
        'Determine whether these records describe the same specific vacancy, not merely similar roles.',
        'Return JSON only with decision SAME_JOB, DIFFERENT_JOB or UNCERTAIN and reasons.',
        'Different campuses, cities, requisition IDs, seniority levels or start periods are strong evidence of different jobs.',
      ].join(' '),
      payload: {
        incoming: {
          title: candidate.title,
          company: candidate.companyName,
          location: candidate.locationText,
          requisitionId: candidate.requisitionId,
          applyUrl: candidate.applyUrl,
          postedAt: candidate.postedAt,
          startDate: candidate.startDate,
          description: candidate.description,
        },
        existing: {
          title: existing.title,
          company: existing.company?.name,
          location: existing.locationText,
          earliestPostedAt: existing.earliestPostedAt,
          latestPostedAt: existing.latestPostedAt,
          listings: existing.listings.map((listing) => ({
            requisitionId: listing.requisitionId,
            applyUrl: listing.applyUrl,
            description: listing.rawDescription,
          })),
        },
      },
    });

    return ['SAME_JOB', 'DIFFERENT_JOB', 'UNCERTAIN'].includes(result.decision) ? result.decision : 'UNCERTAIN';
  } catch {
    return 'UNCERTAIN';
  }
}
