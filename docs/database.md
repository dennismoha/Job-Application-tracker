# Database Design Notes

The Prisma schema is intentionally broader than the behavior implemented so far. Stable domain boundaries now exist before the collector and ingestion milestones begin.

## Users and authentication

`User` owns private search/application state. `UserSession` stores only a hash of the random session token together with expiry/revocation timestamps. The raw session credential is returned only to the authenticated client cookie/API client.

## Search profiles

`SearchProfile` contains one job-search strategy, for example `UAE Teaching` or `Remote Software Engineering`. Categories are shared taxonomy records. `SourceSubscription` links a profile to a shared source and optionally requests a preferred collection interval.

## Sources

`Source` represents a job board, company careers portal, ATS, recruiter, newsletter, or search source. It is not the same thing as an employer `Company`.

`SourceAudit` is append-only source capability history. Re-auditing does not destroy previous observations.

`SourceSchedule` controls shared network collection. It is deliberately one-to-one with `Source`; users do not get separate crawler schedules. Enabled profile subscriptions are collapsed into one effective shared interval.

`SourceHealth` stores current operational health while `AcquisitionRun` stores individual execution history. Failed/challenged runs can change backoff/circuit state without deleting previous run data.

## Acquisition and ingestion

`AcquisitionRun` is the durable scheduler/worker queue record. The real collectors start in Milestone 5.

`JobIngestion` is already reserved as the raw-data gate for later milestones. Collectors, n8n, web search, and manual imports must enter here rather than creating canonical jobs directly.

## Canonical jobs

`Job` represents the real vacancy. `JobListing` represents one advertisement/observation from one source. `JobListingMatch` records why a listing was attached to a canonical job.

This makes one vacancy advertised by several sites remain one job while preserving all source URLs and source-specific timestamps.

## Application history

`Application.stage` stores the current stage. `ApplicationEvent` stores the timeline. Updating the current application state therefore does not destroy history.

## Risk and reporting

Risk reports remain separate from system risk level so evidence/reasons can be retained.

No report-summary tables are created yet. Initial reporting will be derived from operational tables and PostgreSQL views. Materialized/daily aggregates should only be introduced when query volume justifies them.

## Milestone 6 additions

`JobIngestion` is now actively used as the durable staging record. Raw source payloads and normalized payloads are stored separately, and invalid candidates remain in `QUARANTINED` state rather than being discarded.

## Milestone 7 additions

`JobListingRevision` records content-hash changes for an existing listing. `JobListingMatch` stores deduplication method, confidence, decision, and evidence.

`Job` now also has optional creator/visibility fields. Crawled vacancies are public. User-entered manual jobs are private by default so a private referral or manually tracked opportunity does not automatically become visible to other users.

## Important timestamp meanings

- `JobListing.postedAt`: date claimed by the source.
- `JobListing.firstSeenAt`: when this platform first saw this listing.
- `Job.firstSeenAt`: when this platform first created the canonical job.
- `Job.lastSeenAt`: most recent successful observation of any attached listing.
- `Job.expiresAt`: known expiry date when available.

These fields must not be collapsed into one generic date because source freshness reporting depends on the distinction.
