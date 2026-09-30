# Milestone 13 — Optional AI Intelligence

## Goal

Use AI only where semantic interpretation improves the system, while keeping deterministic acquisition and persistence fully usable without an AI key.

## Implemented

- Configurable Responses-API client with token-usage logging.
- Profile-to-job analysis with:
  - 0–100 semantic match score;
  - eligibility status;
  - concise summary;
  - matched/missing keywords;
  - evidence and concerns.
- `JobProfileMatch` persistence.
- AI extraction of jobs from stored unstructured alert emails.
- Source-audit interpretation using objective source evidence.
- Optional AI arbitration for borderline 70–89 deduplication matches.
- AI deduplication is disabled by default and failure falls back safely to deterministic behavior.
- React profile-analysis panel on each job.

## AI rules

- Missing facts remain unknown.
- AI never labels geographic/work-authorisation eligibility as known without evidence.
- AI does not automatically bypass source access restrictions.
- AI usage is optional; the core product still functions without it.

## Process flow

Open `docs/flows/milestone-13-ai-intelligence.mmd`.

## Manual checklist

- [ ] Missing AI key produces a clear configuration error.
- [ ] Match analysis persists evidence and eligibility.
- [ ] AI email extraction sends extracted jobs through normal ingestion.
- [ ] Borderline deduplication safely falls back when AI is unavailable.
- [ ] Token usage is recorded.
