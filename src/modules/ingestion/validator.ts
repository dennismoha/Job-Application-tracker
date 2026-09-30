import type { NormalizedJobCandidate, ValidationResult } from './normalization.types.js';

export function validateCandidate(candidate: NormalizedJobCandidate): ValidationResult {
  const reasons: string[] = [];

  if (!candidate.normalizedTitle || candidate.normalizedTitle.length < 3) {
    reasons.push('The normalized title is missing or too short.');
  }

  if (!candidate.companyName && !candidate.description && !candidate.applyUrl) {
    reasons.push('The listing has no company, meaningful description, or application URL.');
  }

  if (candidate.description && candidate.description.length < 30 && !candidate.applyUrl) {
    reasons.push('The listing content is too small to confidently represent a job.');
  }

  return { valid: reasons.length === 0, reasons };
}
