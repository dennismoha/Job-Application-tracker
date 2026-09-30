import { describe, expect, it } from 'vitest';

import { calculateBackoffMinutes } from '../src/modules/scheduler/source-health.service.js';

describe('source health backoff', () => {
  it('backs off progressively and caps at seven days', () => {
    expect(calculateBackoffMinutes(1)).toBe(60);
    expect(calculateBackoffMinutes(2)).toBe(120);
    expect(calculateBackoffMinutes(3)).toBe(240);
    expect(calculateBackoffMinutes(20)).toBe(10080);
  });
});
