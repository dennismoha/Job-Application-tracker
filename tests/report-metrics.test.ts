import { describe, expect, it } from 'vitest';

import { daysBetween, median, rate } from '../src/modules/reports/report-metrics.js';

describe('report metrics', () => {
  it('calculates rates without dividing by zero', () => {
    expect(rate(4, 10)).toBe(0.4);
    expect(rate(1, 0)).toBe(0);
  });

  it('calculates medians for odd and even samples', () => {
    expect(median([7, 1, 3])).toBe(3);
    expect(median([1, 3, 5, 7])).toBe(4);
    expect(median([])).toBeNull();
  });

  it('calculates elapsed days', () => {
    expect(daysBetween(new Date('2026-09-10T00:00:00Z'), new Date('2026-09-08T00:00:00Z'))).toBe(2);
  });
});
