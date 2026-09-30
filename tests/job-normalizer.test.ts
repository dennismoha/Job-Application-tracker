import { ExtractionMethod, FreshnessStatus } from '@prisma/client';
import { describe, expect, it } from 'vitest';

import { normalizeRawListing, normalizeTitle } from '../src/modules/ingestion/normalizer.js';

describe('job normalization', () => {
  it('normalizes common mathematics title variants', () => {
    expect(normalizeTitle('URGENT - Teacher of Maths AY 2026/27')).toContain('mathematics');
    expect(normalizeTitle('Math Teacher')).toBe('mathematics teacher');
  });

  it('keeps discovery date separate from the actual posting date', () => {
    const discoveredAt = new Date('2026-09-24T10:00:00Z');
    const candidate = normalizeRawListing({
      sourceId: 'source-1',
      title: 'Chemistry Teacher',
      company: 'Example International School LLC',
      location: 'Dubai, UAE',
      postedAt: '21 days ago',
      extractionMethod: ExtractionMethod.MANUAL,
      discoveredAt,
      rawPayload: {},
    });

    expect(candidate.country).toBe('AE');
    expect(candidate.city).toBe('Dubai');
    expect(candidate.freshnessStatus).toBe(FreshnessStatus.OLD);
    expect(candidate.discoveredAt).toEqual(discoveredAt);
  });
});
