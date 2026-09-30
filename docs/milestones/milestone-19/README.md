# Milestone 19 — Live Uploaded UI

## Goal

Turn the user-provided Job Intelligence Platform UI from a static prototype into the actual live web application without reducing the working v1.4/v1.5 feature set.

The uploaded UI is the **presentation source of truth**. The existing backend, ingestion, normalization, deduplication, applications, CV intelligence, Browser Companion, risk and reporting modules remain the **functional source of truth**.

## Live page map

- **Dashboard** — live jobs, acquisition runs, application pipeline, source health and recent activity.
- **Jobs** — canonical jobs, quick views, details/listings/analysis drawer, save/apply/notes and CV comparison.
- **Job Sites** — source registry, source audit, acquisition mode, schedule, profile subscriptions and health.
- **Crawling** — configurations, active runs, history, failures and run detail.
- **Universal Search** — wider-web search with normal ingestion/deduplication instead of a parallel job store.
- **Applications** — table + pipeline views, exact source/CV used, stage history and notes.
- **CVs** — upload/create, profile defaults, immutable versions, comparison/tailoring, preview/export and source-template reference.
- **Extension** — revocable Browser Companion tokens plus the uploaded extension-state preview; the actual Chrome/Firefox extension remains in `browser-extension/`.
- **Analytics** — source freshness, duplicates, applications, response/interview/offer conversion, risk and system health.
- **Settings** — real search-profile CRUD and local workspace preferences.

## Interaction rule

Operational detail is visible where the uploaded UI expects it, but the system never creates a second set of business rules for the UI. All actions call the existing APIs and all newly discovered jobs still pass through the same ingestion pipeline.

## CV format guard

An uploaded PDF/DOCX is retained as an immutable source document. Tailoring creates a new CV version and never overwrites that source.

The editor exposes:

- content-growth and line-count warnings;
- live content-flow preview;
- factual-confirmation gates for missing qualifications;
- a **Source template** download so the original formatting reference is always recoverable;
- separate generated PDF/DOCX exports for the tailored content.

The current local exporter does not claim pixel-perfect reconstruction of arbitrary uploaded DOCX/PDF formatting. Preserving complex Word layout while applying arbitrary text edits requires a template-aware document engine. The source-format guard prevents silent loss of the original while that capability is extended.

## Acceptance checklist

- [x] Uploaded navigation/page taxonomy is the live shell.
- [x] Dashboard uses real backend metrics.
- [x] Jobs uses canonical jobs and real listing provenance.
- [x] Job Sites uses real source audits/schedules/health.
- [x] Crawling uses real acquisition runs.
- [x] Universal Search uses the real search ingestion endpoint.
- [x] Applications uses real stages, events, source and CV version.
- [x] CV library/tailoring uses real CV APIs.
- [x] Browser Companion token management is live.
- [x] Analytics uses report APIs rather than mock numbers.
- [x] Settings manages real search profiles.
- [x] Original CV source files remain recoverable.
- [x] Existing backend behavior is retained.
