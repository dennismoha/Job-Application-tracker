# Milestone 8 — Core Job Dashboard

## Goal

Deliver the first practical end-user version of the platform.

## Backend

- Paginated job feed.
- Search by title, company and description.
- Filters for category, source, status, freshness, disposition, visited state and applied state.
- Job detail including every source listing.
- Per-user visited/saved/ignored/archived state.
- Per-user notes.
- Manual job entry through the same ingestion and deduplication pipeline.
- Private manual jobs by default.
- Source registry listing and permitted `Run now` action.
- Safe API listing projections: raw ingestion payloads remain server-side and are not returned to the job dashboard.
- Per-user custom expiry dates without changing the source-reported closing date.

## React frontend

The `web/` application includes:

- login and registration;
- job feed;
- freshness, job-status, saved/ignored, visited and applied filters;
- visited-state tracking;
- canonical job details;
- all listing/source URLs;
- official application link where known;
- notes;
- manual job entry;
- search-profile management;
- source registry view and new-source analysis;
- follow/unfollow source controls per search profile;
- manual source-run trigger;
- personal job expiry controls.

## Run locally

Backend:

```bash
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Frontend:

```bash
cd web
npm install
npm run dev
```

The Vite development server proxies `/api` to `http://localhost:4000`.

## Process flow

Open `docs/flows/milestone-08-job-dashboard.mmd`.

## Manual checklist

- [ ] User can authenticate.
- [ ] Job feed loads from the backend.
- [ ] Opening a job marks it visited.
- [ ] User can save and ignore a job.
- [ ] User can filter active/expired jobs, visited state and applied state.
- [ ] All source listings remain visible on the canonical job.
- [ ] Official application URL is preferred where available.
- [ ] User can add notes.
- [ ] User can add a private manual job and receives a clear validation error when too little identifying information is supplied.
- [ ] Manual job passes through normalization/deduplication.
- [ ] Raw collector/ingestion payloads are not exposed through the public job-detail API.
- [ ] User can set or clear a personal expiry date for a job.
- [ ] User can create a search profile and follow/unfollow sources for that profile.
- [ ] Source page shows source mode and health.
- [ ] A permitted source can be queued manually.
