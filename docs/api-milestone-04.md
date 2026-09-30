# API Surface Through Milestone 4

All `/api/*` endpoints below require authentication except registration/login.

## Authentication

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

## Search profiles

```text
GET    /api/profiles/categories
GET    /api/profiles
POST   /api/profiles
GET    /api/profiles/:profileId
PATCH  /api/profiles/:profileId
DELETE /api/profiles/:profileId

GET    /api/profiles/:profileId/sources
PUT    /api/profiles/:profileId/sources/:sourceId
DELETE /api/profiles/:profileId/sources/:sourceId
```

The source-subscription routes control the user's own monitoring preference. The shortest enabled subscription interval becomes the shared network interval for that source.

## Sources

```text
POST   /api/sources/analyze
GET    /api/sources
POST   /api/sources
GET    /api/sources/:sourceId
PATCH  /api/sources/:sourceId
DELETE /api/sources/:sourceId
POST   /api/sources/:sourceId/audit
```

Deleting a source is a soft deactivation so historical audits/runs/listings remain available.

## Scheduler

```text
GET   /api/scheduler/runs
GET   /api/scheduler/sources/:sourceId/schedule
PATCH /api/scheduler/sources/:sourceId/schedule
POST  /api/scheduler/sources/:sourceId/pause
POST  /api/scheduler/sources/:sourceId/resume
POST  /api/scheduler/sources/:sourceId/run
```

Shared source schedule changes are restricted to the source creator. Ordinary subscribers control their desired interval through their `SourceSubscription` instead.
