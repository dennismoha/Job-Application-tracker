# Milestone 3 — Source Registry and Source Audit

## Goal

Make a newly discovered careers/job website a first-class source in the platform and classify how it should be monitored before any crawler is written for it.

## Implemented

- authenticated source registry endpoints;
- transient URL analysis before saving a source;
- public-network URL validation to reduce SSRF risk;
- `robots.txt` availability and simple wildcard-path check;
- ordinary public-page capability request with a hard timeout and response-size limit;
- known ATS fingerprints;
- JSON-LD and `JobPosting` detection;
- RSS/Atom hints;
- JavaScript-heavy page signal;
- login/account signal;
- access-challenge/CAPTCHA/403/429 signal;
- job-alert and application-link hints;
- recommended acquisition mode;
- historical `SourceAudit` records rather than destructive audit updates;
- `SourceSchedule` and `SourceHealth` initialization for every saved source;
- manual acquisition-mode overrides;
- soft source removal that preserves historical audits/runs/listings while stopping future schedules;
- importer for the 46-source research registry.

## Safety boundary

The audit engine does not solve CAPTCHAs, spoof browser fingerprints, rotate proxies, or bypass access controls. A challenge is treated as useful source metadata and can lead to `EMAIL`, `SEARCH_ONLY`, `MANUAL_BATCH`, or `RESTRICTED` classification.

## API

```text
POST   /api/sources/analyze
GET    /api/sources
POST   /api/sources
GET    /api/sources/:sourceId
PATCH  /api/sources/:sourceId
DELETE /api/sources/:sourceId
POST   /api/sources/:sourceId/audit
```

## Import the research registry

After the database migration and category seed:

```bash
# Optional: assign imported shared sources to your account first
# RESEARCH_SOURCE_OWNER_EMAIL=you@example.com

npm run research:import-sources
```

The import creates the source records, their schedules, and health rows but does not aggressively audit all 46 sites automatically.

## Process flow

See `docs/flows/milestone-03-source-registry.mmd`.

## Manual verification checklist

- [ ] transient analysis rejects localhost/private-network targets;
- [ ] known ATS is detected where present;
- [ ] `JobPosting` JSON-LD is detected;
- [ ] challenge page is not classified as a normal crawlable page;
- [ ] one audit request does not attempt challenge bypass;
- [ ] saved source receives schedule and health records;
- [ ] re-auditing appends audit history;
- [ ] acquisition mode can be manually overridden;
- [ ] source list can filter by mode/type/active state;
- [ ] 46 research sources import without duplication;
- [ ] detector unit tests pass;
- [ ] Mermaid flow renders.

## Next milestone

Milestone 4 introduces the scheduler, run queue, source health transitions, circuit breaker, retries/backoff, and manual `Run Now` orchestration. Actual site-specific collectors remain Milestone 5.
