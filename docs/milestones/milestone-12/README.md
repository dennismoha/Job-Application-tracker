# Milestone 12 — Reporting and Analytics

## Goal

Measure whether sources and application strategies actually produce useful opportunities, responses and interviews.

## Implemented

- Overview metrics for unique jobs, listings, freshness, applications, responses, interviews, offers and risk reports.
- Source effectiveness metrics:
  - unique jobs;
  - first discoveries;
  - duplicate rate;
  - median job age at discovery;
  - old-job rate;
  - expired-on-discovery rate;
  - repost rate;
  - response/interview/offer conversion with sample counts;
  - user risk-report rate.
- Most repeated / multi-source job view.
- Application funnel metrics and median time to response/interview.
- Risk breakdown.
- Source-health and acquisition-run status reporting.
- React reporting dashboard.
- Pure unit helpers for rate, median and elapsed-day calculations.

## Reporting rule

Operational tables remain the source of truth. No mutable report-summary table is required for the first production version. Materialized views can be introduced later if query volume justifies them.

## Process flow

Open `docs/flows/milestone-12-reporting.mmd`.

## Manual checklist

- [ ] Duplicate rate uses listings vs canonical jobs.
- [ ] Job age uses `firstSeenAt - postedAt`.
- [ ] Response rate counts an employer response, including a rejection.
- [ ] Interview conversion uses application events, not job state.
- [ ] Reports show counts alongside percentages.
- [ ] Profile and date filters do not expose another user's applications.

## No-feedback definition

A source's no-feedback rate excludes recent applications. An application only enters the no-feedback denominator after 21 days without an employer response event, preventing yesterday's applications from being counted as failures.
