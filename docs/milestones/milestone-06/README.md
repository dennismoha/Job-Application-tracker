# Milestone 6 — Job Ingestion and Normalization

## Goal

Provide one entry gate for every collected job before canonical jobs are written to the database.

## Implemented

- `JobIngestion` lifecycle from `RECEIVED` through `PERSISTED`, `FAILED`, or `QUARANTINED`.
- Original source payload retained for debugging.
- Normalized payload retained separately.
- Deterministic title normalization and common aliases.
- Company-name normalization.
- UAE-aware location normalization without inventing missing locations.
- Exact and inferred date handling.
- Freshness categories: `NEW`, `RECENT`, `AGING`, `OLD`, `VERY_OLD`, `UNKNOWN`.
- Salary text preservation plus basic numeric/currency/period normalization.
- Employment and remote-type normalization.
- Canonical URL cleanup for common tracking parameters.
- Content hash and canonical fingerprint generation.
- Basic category assignment for Teaching, Software Engineering, and Data Annotation.
- Quarantine endpoint for reviewing invalid ingestion records.

## Important rule

`recently added to our system` is derived from `firstSeenAt`. It is not the same as the source's `postedAt` date. A three-week-old vacancy discovered today remains an old vacancy that was newly discovered by us.

## Process flow

Open `docs/flows/milestone-06-ingestion.mmd`.

## Manual checklist

- [ ] `Math Teacher`, `Maths Teacher`, and `Teacher of Mathematics` normalize consistently.
- [ ] Original title remains available.
- [ ] Relative dates such as `3 days ago` are marked inferred.
- [ ] Unknown dates remain unknown rather than being guessed.
- [ ] Invalid records go to quarantine rather than disappearing.
- [ ] Salary text is retained even when numeric parsing is impossible.
- [ ] URL tracking parameters are removed from normalized URLs.
