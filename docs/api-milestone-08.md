# API — Milestones 5–8

All endpoints below require an authenticated user unless noted otherwise.

## Jobs

```text
GET    /api/jobs
POST   /api/jobs/manual
GET    /api/jobs/:jobId
PATCH  /api/jobs/:jobId/state
POST   /api/jobs/:jobId/notes
POST   /api/jobs/listings/:listingId/move
```

`GET /api/jobs` supports:

```text
q
categoryId
sourceId
status
freshness
disposition
visited
applied
page
limit
```

## Ingestion review

```text
GET /api/ingestions?status=QUARANTINED
```

The endpoint only returns records attached to sources the user owns or follows.

## Existing scheduler endpoints

```text
GET   /api/scheduler/runs
POST  /api/scheduler/sources/:sourceId/run
PATCH /api/scheduler/sources/:sourceId/schedule
POST  /api/scheduler/sources/:sourceId/pause
POST  /api/scheduler/sources/:sourceId/resume
```

Milestone 5 gives permitted AUTO/MANUAL source runs real collector behavior. `SEARCH_ONLY` remains a Milestone 9 concern.
