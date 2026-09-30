import { EmploymentType, FreshnessStatus, RemoteType, SalaryPeriod } from '@prisma/client';
import { describe, expect, it } from 'vitest';

import { scoreCandidate } from '../src/modules/jobs/deduplication.scoring.js';

const candidate = {
  sourceId: 'source-2',
  extractionMethod: 'MANUAL',
  rawTitle: 'Math Teacher',
  title: 'Math Teacher',
  normalizedTitle: 'mathematics teacher',
  companyName: 'ABC International School',
  normalizedCompanyName: 'abc international school',
  rawLocation: 'Dubai, UAE',
  city: 'Dubai',
  country: 'AE',
  locationText: 'Dubai, UAE',
  description: 'Teach IGCSE mathematics to secondary learners.',
  remoteType: RemoteType.ONSITE,
  employmentType: EmploymentType.FULL_TIME,
  salaryPeriod: SalaryPeriod.UNSPECIFIED,
  postedDateConfidence: 'EXACT',
  freshnessStatus: FreshnessStatus.NEW,
  fingerprint: 'fingerprint',
  contentHash: 'content',
  discoveredAt: new Date('2026-09-24T00:00:00Z'),
  rawPayload: {},
} as const;

describe('deduplication scoring', () => {
  it('scores a matching company/title/location strongly', () => {
    const result = scoreCandidate(candidate as never, {
      id: 'job-1',
      companyId: 'company-1',
      createdByUserId: null,
      visibility: 'PUBLIC',
      primaryCategoryId: null,
      title: 'Teacher of Mathematics',
      normalizedTitle: 'mathematics teacher',
      summary: null,
      description: 'Teach IGCSE mathematics to secondary learners.',
      city: 'Dubai',
      country: 'AE',
      locationText: 'Dubai',
      remoteType: RemoteType.ONSITE,
      employmentType: EmploymentType.FULL_TIME,
      salaryMin: null,
      salaryMax: null,
      salaryCurrency: null,
      salaryPeriod: SalaryPeriod.UNSPECIFIED,
      salaryText: null,
      officialApplyUrl: null,
      startDate: null,
      academicYear: null,
      status: 'ACTIVE',
      freshnessStatus: FreshnessStatus.NEW,
      firstSeenAt: new Date(),
      lastSeenAt: new Date(),
      earliestPostedAt: null,
      latestPostedAt: null,
      expiresAt: null,
      closedAt: null,
      fingerprint: null,
      systemRiskLevel: 'UNKNOWN',
      createdAt: new Date(),
      updatedAt: new Date(),
      company: { name: 'ABC International School', normalizedName: 'abc international school' },
      listings: [],
    } as never);

    expect(result.hardConflict).toBe(false);
    expect(result.score).toBeGreaterThan(80);
  });

  it('treats a different city as a hard contradiction', () => {
    const result = scoreCandidate(candidate as never, {
      id: 'job-2',
      normalizedTitle: 'mathematics teacher',
      city: 'Abu Dhabi',
      country: 'AE',
      description: 'Teach IGCSE mathematics to secondary learners.',
      salaryMin: null,
      earliestPostedAt: null,
      company: { name: 'ABC International School', normalizedName: 'abc international school' },
      listings: [],
    } as never);

    expect(result.hardConflict).toBe(true);
  });
});
