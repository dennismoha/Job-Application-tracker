# Architecture

## Purpose

The platform turns a fragmented job search into one measurable workflow. It monitors suitable public sources, consumes legitimate email alerts for protected sources, supports manual batches and wider-web search, deduplicates repeated advertisements into canonical jobs, tracks the user's application lifecycle, and reports which sources actually generate useful outcomes.

## Core boundaries

1. **Source is not Company.** A job board can publish vacancies for many employers; one employer can expose several source endpoints.
2. **Job is not JobListing.** A canonical vacancy can be advertised on many sites.
3. **Job is not Application.** Application state belongs to a user.
4. **Source schedule is shared.** Ten users following one source do not create ten identical crawls.
5. **Acquisition is not persistence.** Every route produces raw listings and enters one ingestion pipeline.
6. **Recently discovered is not recently posted.** `firstSeenAt` and `postedAt` remain separate.
7. **User risk is not system risk.** User reports are evidence scoped to that user unless separately promoted through a future admin process.
8. **AI is optional.** Deterministic collection, normalization, deduplication, applications and reporting operate without an AI provider.

## End-to-end flow

```text
Sources
├── AUTO: API / ATS / RSS / JSON-LD / static HTML
├── EMAIL: account alerts → Gmail → n8n
├── MANUAL_BATCH: user-triggered source groups
├── SEARCH_ONLY: web-search provider
├── RESTRICTED: no automated direct access
└── MANUAL JOB: user entry
        ↓
RawJobListing
        ↓
JobIngestion
        ↓
Normalization / validation / freshness
        ↓
Deduplication
        ↓
Job + JobListing(s)
        ↓
Search-profile matching / optional AI
        ↓
User job feed
        ↓
Application + ApplicationEvent history
        ↓
Risk evidence + Reports
```

## Scheduler / acquisition

`SourceSchedule` owns actual collection timing. `SourceSubscription` expresses user/profile interest. The system calculates one shared source schedule rather than crawling once per user.

`AcquisitionRun` is the queue/audit record. Workers claim runs independently and failures affect only that source. Source health, retry/backoff and circuit state prevent repeated failing sources from dominating the worker.

## Hybrid acquisition

Protected sources should normally move to EMAIL, MANUAL_BATCH, SEARCH_ONLY or RESTRICTED. Access challenges are classification signals; this project does not implement CAPTCHA solving, fingerprint spoofing, or proxy rotation to defeat site controls.

The email path is:

```text
Site alert → Gmail → n8n → secured webhook → EmailIngestion → JobIngestion
```

The search-only path is:

```text
Source domain → configured search API → result URLs → JobIngestion
```

## Canonical jobs and deduplication

`Job` represents the vacancy. `JobListing` keeps every source advertisement and URL. `JobListingMatch` stores why a listing was attached to a job. Exact identifiers and URLs are strongest; fuzzy matching is conservative. Optional AI may arbitrate borderline matches only when explicitly enabled.

## Applications

`Application.stage` is current state. `ApplicationEvent` retains historical truth. This supports response time, interview conversion, offers, rejection history and no-response analysis without deleting earlier stages.

## Reporting

Reports are derived from operational data:

- freshness: `firstSeenAt - postedAt`;
- duplicate rate: listings vs canonical jobs;
- first discovery: earliest source observation;
- source response/interview/offer conversion: application source listing + application events;
- risk rate: user risk reports relative to observed jobs/listings;
- health: source health and acquisition runs.

Materialized views are intentionally deferred until measured query volume requires them.

## Runtime topology

```text
React web ───────→ Node API ───────→ PostgreSQL
                       ↑                 ↑
                       │                 │
                    n8n webhook      Worker/Scheduler
                       ↑                 │
                    Gmail alerts      Collectors/Search

Optional AI provider ───────────────→ Node API / dedup fallback
```

The production API runs with the scheduler disabled; a dedicated worker owns scheduler/queue execution.
