# Milestone 5 — Automatic Collectors v1

## Goal

Turn scheduled source runs into real public job collection without coupling the scheduler to any one website.

## Implemented

- `RawJobListing` as the common collector contract.
- Greenhouse public board collector.
- Lever public postings collector.
- RSS/Atom collector.
- `JobPosting` JSON-LD collector.
- Conservative same-origin static HTML collector.
- Collector registry driven by the latest source audit.
- Source-level request delay and request-count limits.
- Public-URL validation on redirects.
- Response bodies are byte-limited even when a server omits `Content-Length`.
- Explicit stop/skip behavior when the latest audit says robots rules disallow the path or a challenge was observed.
- Scheduler run metrics now include ingestion results.
- Sudden listing-count collapses are treated as structural anomalies instead of silently teaching the health model that zero jobs is normal.

## Intentionally not implemented

- CAPTCHA solving.
- Proxy rotation for bypassing access controls.
- Fingerprint spoofing.
- Login automation.
- Browser stealth plugins.
- Search-only discovery (Milestone 9).

JavaScript-heavy sources that cannot be collected through legitimate public interfaces should remain `EMAIL`, `MANUAL_BATCH`, `SEARCH_ONLY`, or `RESTRICTED` until a suitable route exists.

## Process flow

Open `docs/flows/milestone-05-collectors.mmd` in the Mermaid viewer.

## Manual checklist

- [ ] Greenhouse source returns `RawJobListing[]`.
- [ ] Lever source returns `RawJobListing[]`.
- [ ] RSS feed can be discovered from a public page.
- [ ] JSON-LD `JobPosting` blocks are extracted.
- [ ] Static collector never follows job links to another origin.
- [ ] `maxRequestsPerRun` is respected, including sources configured for a single request.
- [ ] `minimumRequestDelayMs` is respected.
- [ ] Challenged source does not attempt a bypass.
- [ ] A single collector failure does not stop other source runs.
- [ ] 403/429 responses are propagated as challenged/rate-limited outcomes rather than parsed as job pages.
- [ ] An unexpectedly large response is stopped at the configured byte limit.
