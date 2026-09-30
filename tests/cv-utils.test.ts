import { CvMatchStatus } from '@prisma/client';
import { describe, expect, it } from 'vitest';

import {
  compareRequirementToCv,
  extractRequirementsFromDescription,
  scoreRequirementMatches,
} from '../src/modules/cvs/cv.utils.js';

describe('CV requirement intelligence', () => {
  it('extracts explicit required and preferred requirements from a vacancy', () => {
    const requirements = extractRequirementsFromDescription(`
      Requirements
      Must hold a bachelor's degree in Mathematics.
      At least three years of secondary teaching experience is required.
      IB curriculum experience is preferred.
      Strong classroom management and assessment skills are desirable.
    `);

    expect(requirements.length).toBeGreaterThanOrEqual(3);
    expect(requirements.some((item) => item.text.toLowerCase().includes('degree'))).toBe(true);
    expect(requirements.some((item) => item.text.toLowerCase().includes('ib curriculum'))).toBe(true);
  });

  it('uses needs-confirmation for a qualification that is not evidenced instead of claiming the user lacks it', () => {
    const result = compareRequirementToCv(
      'Experienced secondary Mathematics teacher. Curriculum planning and assessment design.',
      "Must hold a bachelor's degree in Mathematics.",
    );

    expect(result.status).toBe(CvMatchStatus.NEEDS_CONFIRMATION);
    expect(result.suggestion?.toLowerCase()).toContain('confirm');
  });

  it('marks clearly present evidence as evidenced', () => {
    const result = compareRequirementToCv(
      'Bachelor of Education in Mathematics. Five years of secondary Mathematics teaching experience.',
      'Bachelor degree Mathematics qualification required.',
    );

    expect([CvMatchStatus.EVIDENCED, CvMatchStatus.PARTIAL]).toContain(result.status);
  });

  it('calculates a weighted evidence score without treating confirmation as full evidence', () => {
    const score = scoreRequirementMatches([
      { status: CvMatchStatus.EVIDENCED, priority: 100 },
      { status: CvMatchStatus.PARTIAL, priority: 70 },
      { status: CvMatchStatus.NEEDS_CONFIRMATION, priority: 100 },
    ]);

    expect(score.score).toBeGreaterThan(40);
    expect(score.score).toBeLessThan(90);
    expect(score.evidenced).toBe(1);
    expect(score.partial).toBe(1);
    expect(score.needsConfirmation).toBe(1);
  });
});
