# API v1

All `/api/*` endpoints require the authenticated user session unless explicitly described as a machine webhook.

## Authentication

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

## Search profiles

```text
GET    /api/profiles
POST   /api/profiles
GET    /api/profiles/:profileId
PATCH  /api/profiles/:profileId
DELETE /api/profiles/:profileId

GET    /api/profiles/:profileId/sources
PUT    /api/profiles/:profileId/sources/:sourceId
DELETE /api/profiles/:profileId/sources/:sourceId
```

## Sources and scheduler

```text
GET    /api/sources
POST   /api/sources
POST   /api/sources/analyze
GET    /api/sources/:sourceId

GET    /api/scheduler/sources/:sourceId/schedule
PATCH  /api/scheduler/sources/:sourceId/schedule
POST   /api/scheduler/sources/:sourceId/run
POST   /api/scheduler/sources/:sourceId/pause
POST   /api/scheduler/sources/:sourceId/resume
GET    /api/scheduler/runs
```

## Jobs

```text
GET    /api/jobs
POST   /api/jobs/manual
GET    /api/jobs/:jobId
PATCH  /api/jobs/:jobId/state
POST   /api/jobs/:jobId/notes
POST   /api/jobs/listings/:listingId/move
```

Useful job-list filters include `q`, `categoryId`, `sourceId`, `status`, `freshness`, `disposition`, `visited`, `applied`, `addedWithinDays`, `page` and `limit`. `addedWithinDays` is independent from posting freshness: a three-week-old vacancy discovered today can be recently added while still being an old job.

## Hybrid acquisition

Internet-wide search:

```text
POST /api/search
```

Example:

```json
{
  "query": "Mathematics Teacher UAE",
  "countryCode": "AE",
  "languageCode": "en",
  "limit": 10
}
```

Manual source batches:

```text
GET    /api/source-batches
POST   /api/source-batches
PATCH  /api/source-batches/:batchId
DELETE /api/source-batches/:batchId
POST   /api/source-batches/:batchId/run
```

n8n email webhook (machine endpoint, no user cookie):

```text
POST /api/email-ingestions/webhook
x-ingestion-secret: <N8N_INGESTION_SECRET>
```

Example body:

```json
{
  "userId": "user_id",
  "sourceId": "optional_source_id",
  "messageId": "gmail-message-id",
  "sender": "alerts@example.com",
  "subject": "New UAE teaching jobs",
  "receivedAt": "2026-09-24T12:00:00Z",
  "text": "optional original email text",
  "jobs": [
    {
      "title": "Mathematics Teacher",
      "company": "Example School",
      "location": "Dubai, UAE",
      "postedAt": "2026-09-23",
      "sourceUrl": "https://example.com/jobs/123",
      "applyUrl": "https://example.com/jobs/123/apply"
    }
  ]
}
```

User email history:

```text
GET  /api/email-ingestions
POST /api/email-ingestions/:emailId/label-acknowledged
```

## Applications

```text
GET   /api/applications
POST  /api/applications
GET   /api/applications/:applicationId
PATCH /api/applications/:applicationId/stage
POST  /api/applications/:applicationId/events
POST  /api/applications/:applicationId/notes
```

## Risk / trust

```text
GET    /api/risk
POST   /api/risk
DELETE /api/risk/:reportId
```

A report must target exactly one of `sourceId`, `companyId`, or `jobId`.

## Reports

```text
GET /api/reports/overview
GET /api/reports/sources
GET /api/reports/jobs
GET /api/reports/applications
GET /api/reports/risk
GET /api/reports/system-health
```

Common report query parameters:

```text
profileId
categoryId
sourceId
from
to
```

## Optional AI

```text
POST /api/ai/jobs/:jobId/analyze
POST /api/ai/email-ingestions/:emailId/extract
POST /api/ai/sources/:sourceId/review
```

AI endpoints return a clear configuration error when `AI_API_KEY` is absent. The rest of the application remains functional.

## Health

```text
GET /health
GET /health/live
GET /health/ready
```

## CV intelligence

CV library and versions:

```text
GET    /api/cvs
POST   /api/cvs
POST   /api/cvs/upload
GET    /api/cvs/:cvId
PATCH  /api/cvs/:cvId
POST   /api/cvs/:cvId/profile-links
GET    /api/cvs/versions/:versionId
GET    /api/cvs/versions/:versionId/download?format=pdf|docx
```

Job/CV comparison and tailoring:

```text
GET   /api/cvs/jobs/:jobId/matches
POST  /api/cvs/jobs/:jobId/compare
POST  /api/cvs/tailoring
GET   /api/cvs/tailoring/:sessionId
PATCH /api/cvs/tailoring/:sessionId
POST  /api/cvs/tailoring/:sessionId/save
PATCH /api/cvs/tailoring/suggestions/:suggestionId
```

Browser Companion CV additions:

```text
GET  /api/browser-companion/cvs
POST /api/browser-companion/analyze-page
POST /api/browser-companion/compare-page
POST /api/browser-companion/prepare-cv
```

`PATCH /api/jobs/:jobId/state` also accepts `preferredCvVersionId` so a saved job can remember which CV version the user intends to prepare or submit later.

`POST /api/applications` accepts `cvVersionId`, preserving the exact document version used for the application.

A comparison result uses evidence states rather than claiming unsupported facts about the user:

```text
EVIDENCED
PARTIAL
NOT_EVIDENCED
NEEDS_CONFIRMATION
NOT_APPLICABLE
```
