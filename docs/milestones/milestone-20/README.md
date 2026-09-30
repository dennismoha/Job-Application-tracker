# Milestone 20 — Full Logic in the Uploaded UI

## Goal

Keep the user-provided UI as the product's presentation source of truth while restoring the complete behavior developed before the UI migration. This milestone does not introduce a competing shell or simplify the backend. It makes the uploaded UI the place where the mature product logic is actually used.

## What changed

### Active search profile is real context

Selecting a search profile now changes the Jobs data itself rather than only changing CV suggestions or reports. The backend scopes the canonical job query using the profile's:

- keywords;
- excluded keywords;
- countries;
- locations;
- categories;
- remote-only preference.

Dashboard job counts, recent jobs and Application counts also respect the selected profile.

### Universal Search is again the full discovery workspace

The uploaded Universal Search page now contains the acquisition paths that existed before the UI migration:

1. **Web Search** — searches beyond monitored sources and sends accepted results through normal ingestion/deduplication.
2. **Email Alerts** — reviews n8n/inbox discoveries, shows freshness and can run optional AI extraction on ambiguous messages.
3. **Manual Batches** — creates and runs named source groups for sources intentionally handled on demand.
4. **Browser Capture** — hands off to the existing Browser Companion workflow.

A web-search result can also be handed to **Job Sites → Add Site**. The source URL is pre-filled so the normal audit/classification flow can decide whether it should be AUTO, EMAIL, MANUAL_BATCH, SEARCH_ONLY or RESTRICTED.

### Jobs retains the mature review logic

The uploaded jobs table/drawer keeps its dense visual design while exposing:

- active-profile filtering;
- search;
- source and category filters;
- actual posting freshness;
- recently added window;
- active/expired/scam state;
- visited/unvisited state;
- saved/ignored state;
- applied/not-applied state;
- canonical job + every source listing;
- CV comparison and truthful tailoring;
- AI search-profile fit;
- personal expiry reminder;
- job/company trust evidence;
- exact application URL and source provenance.

### Dashboard combines operations and personal attention

The uploaded operational dashboard remains intact. It now also restores the earlier user-oriented signals:

- review queue / unvisited jobs;
- saved shortlist;
- applications inactive for 7+ days;
- degraded/challenged source count.

The user can therefore see crawler health and personal next actions without maintaining two dashboards.

### Global search opens the exact record

`Search everything` no longer only navigates to a module. Selecting a job, source or application records the selected entity and opens its existing live drawer on the destination page.

## Non-regression rule

The UI migration must not fork business rules. Existing API services remain authoritative for:

- acquisition;
- ingestion;
- normalization;
- freshness;
- deduplication;
- source health/scheduling;
- applications/events;
- risk evidence;
- CV intelligence;
- reporting.

UI additions must call those services rather than recreate their logic client-side.

## Acceptance checklist

- [x] Uploaded UI remains the sole shell/navigation model.
- [x] Active profile scopes canonical job retrieval.
- [x] Dashboard jobs/counts respect the active profile.
- [x] Application navigation counts respect the active profile.
- [x] Universal Search includes web, email, manual batches and Browser Companion.
- [x] Search results can be promoted into source analysis/monitoring.
- [x] Jobs retains the advanced filtering logic from the earlier application.
- [x] Jobs retains CV fit, profile fit, risk and expiry tools.
- [x] Global search opens exact jobs/sites/applications.
- [x] Dashboard retains operational crawl/pipeline visibility.
- [x] Dashboard restores personal review/follow-up signals.
- [x] Existing backend logic is not duplicated in the UI.
