# Milestone 22 — Site Workspace

Each source can now expose a workspace containing:

- Overview;
- jobs/listings discovered on the source;
- applications associated with the source;
- application-stage counts;
- crawler configurations;
- acquisition run history;
- source health.

## Discovery source vs application source

`Application.appliedSourceId` records the site where the application was actually submitted. It is intentionally separate from `sourceListingId`, which preserves where the vacancy listing came from.

This enables reports such as:

- LinkedIn discovered 42 jobs;
- 17 applications were submitted through LinkedIn;
- 9 LinkedIn discoveries were submitted on official employer sites;
- official employer sites produced 5 interviews.
