# Job Intelligence Platform

A complete personal job-search intelligence platform for monitoring job sources, combining crawler/email/manual/search acquisition, canonicalizing repeated vacancies, tracking applications, recording trust signals, and measuring which job-search channels actually work.

This repository contains implementation through **Milestone 33 / Job Source Architecture**, merged into the exact v1.7 uploaded-UI baseline.

## Core boundaries

```text
Job Source != Organization
Job != Job Listing
Job != Application
Publishing Source != Acquisition Method
Found via != Applied via
Source Type != Collection Capability
User trust report != System-wide accusation
```

One real vacancy can have many source listings. Every acquisition route enters through `JobIngestion`, normalization, validation and deduplication before a canonical job is created or updated.

## Milestones

- **0 — Source Research:** UAE teaching-source registry and conservative reconnaissance tooling.
- **1 — Foundation:** TypeScript API, PostgreSQL/Prisma, ESLint, Prettier, tests and Mermaid viewer.
- **2 — Users & Profiles:** sessions, user accounts and multi-purpose search profiles.
- **3 — Source Registry:** source analysis, ATS/structured-data signals and acquisition classification.
- **4 — Scheduler:** shared source schedules, queueing, health, backoff and circuit breaking.
- **5 — Collectors:** Greenhouse, Lever, RSS, JSON-LD and static public HTML collectors.
- **6 — Ingestion:** raw staging, normalization, validation, freshness and quarantine.
- **7 — Deduplication:** canonical jobs, cross-source matching evidence and revisions.
- **8 — Core Dashboard:** job feed, filters, notes, manual jobs and source controls.
- **9 — Hybrid Acquisition:** n8n email ingestion, manual source batches and internet search.
- **10 — Applications:** complete application-event lifecycle and interview tracking.
- **11 — Trust & Risk:** user-scoped source/company/job trust evidence.
- **12 — Reporting:** source freshness, duplicates, responses, interviews, offers, risk and health analytics.
- **13 — Optional AI:** profile matching, eligibility/evidence, email extraction, source review and optional borderline deduplication.
- **14 — Production:** health/readiness, logs, rate limiting, worker split, Docker, CI and operations docs.
- **15 — Browser Companion:** Chrome/Edge/Firefox capture, deduplication-aware saving and application capture.
- **16 — Hybrid UI:** uploaded cohesive UI as the presentation baseline while retaining the complete functional surface.
- **17 — CV Intelligence:** CV library/versioning, job requirements, CV comparison, truthful tailoring, preview/export and exact application-CV tracking.
- **18 — Uploaded UI Integration:** user-provided UI becomes the authoritative visual/navigation reference.
- **19 — Live Uploaded UI:** uploaded Dashboard, Jobs, source management, Crawling, Search, Applications, CVs, Extension, Analytics and Settings are connected to real APIs.
- **20 — Full Logic in Uploaded UI:** restores the mature discovery/search/profile/filtering/follow-up logic inside the uploaded UI without adding another navigation model.
- **21 — Job Management:** safe edit/archive/delete rules while retaining application/provenance history.
- **22 — Source Workspace:** source-centric jobs/applications with discovery-vs-application-source reporting.
- **23 — Crawler Lineage:** multiple named crawler configs per source and site → crawler → run → job traceability.
- **24–32 — Career Intelligence:** Application Packs, Evidence Bank, truthful cover letters, interview/follow-up/contacts, job snapshots, skill-gap/market/strategy intelligence, offers, campaigns, priorities and smart notifications.
- **33 — Job Source Architecture:** separates publishing source, organization, listing, acquisition method, collection capability and application attribution so discovery/application analytics are trustworthy.

Every milestone has its own README and Mermaid flow under `docs/milestones/` and `docs/flows/`.

## Repository structure

```text
.
├── docs/
│   ├── flows/
│   ├── milestones/
│   ├── architecture.md
│   ├── api-v1.md
│   ├── deployment.md
│   ├── operations.md
│   └── security.md
├── n8n/
├── prisma/
├── research/source-audit/
├── scripts/
├── src/
│   ├── modules/
│   │   ├── acquisition/
│   │   ├── ai/
│   │   ├── applications/
│   │   ├── auth/
│   │   ├── cvs/
│   │   ├── email-ingestion/
│   │   ├── ingestion/
│   │   ├── jobs/
│   │   ├── profiles/
│   │   ├── reports/
│   │   ├── risk/
│   │   ├── scheduler/
│   │   ├── search/
│   │   ├── source-batches/
│   │   └── sources/
│   └── shared/
├── tests/
├── web/
├── Dockerfile
├── docker-compose.yml
└── docker-compose.production.yml
```

## Local setup

Requirements:

- Node.js 22+
- PostgreSQL 17 or Docker
- npm

```bash
cp .env.example .env
docker compose up -d postgres
npm install
npm run db:generate
npm run db:migrate -- --name initial_complete_schema
npm run db:seed
npm run research:import-sources
npm run dev
```

Frontend:

```bash
cd web
npm install
npm run dev
```

Run the scheduler/collector worker in a separate terminal when ready:

```bash
SCHEDULER_ENABLED=true npm run worker
```

## Optional integrations

### n8n / job-alert email

Set `N8N_INGESTION_SECRET` and follow `n8n/README.md`.

### Internet-wide search

Set `WEB_SEARCH_API_KEY`. Search-only sources and the Tools page then use the configured search provider.

### AI intelligence

Set `AI_API_KEY` to a Google Gemini API key. The model defaults to `gemini-2.5-flash` and can be changed with `AI_MODEL`. The core system does not require AI. `AI_DEDUP_ENABLED=false` is the safe default.

### CV intelligence

CV comparison works deterministically even when AI is disabled. When `AI_API_KEY` is configured, Gemini can improve requirement extraction and suggest truthful rewrites, but the system still requires user confirmation before adding qualifications or experience that are not evidenced in the selected CV. PDF and DOCX uploads use `pdf-parse` and `mammoth`; generated PDF/DOCX downloads are produced locally by the application.

## Mermaid documentation

```bash
npm run docs:dev
```

The viewer automatically loads `.mmd` flows from `docs/flows/`.

## Quality checks

```bash
npm run project:check
npm run db:generate
npm run typecheck
npm run lint
npm run format:check
npm test
npm run docs:build
npm run web:typecheck
npm run web:lint
npm run web:build
```

Or:

```bash
npm run ci
```

## Production

See:

- `docs/deployment.md`
- `docs/operations.md`
- `docs/security.md`
- `docs/validation-v1.0.md`

The production topology keeps the API and scheduler worker separate so scaling the web/API side does not accidentally multiply source crawling. Start from `.env.production.example`; the production Compose file intentionally uses a container-internal PostgreSQL URL rather than the development `localhost` URL.

## UX information hierarchy

The user-provided UI is now the live application shell:

1. **Dashboard** — operational summary and what changed.
2. **Jobs** — canonical vacancies and job-level actions.
3. **Job Sources** — publishing-source registry, source type, collection capability, organizations and source configuration.
4. **Crawling** — acquisition runs and health.
5. **Universal Search** — wider-web discovery.
6. **Applications** — post-application pipeline and history.
7. **CVs** — CV library, versions, matching and tailoring.
8. **Extension** — Browser Companion setup and workflow.
9. **Analytics** — source and application effectiveness.
10. **Settings** — search profiles and workspace preferences.

The complete mapping is documented in `docs/milestones/milestone-19/README.md`.

## v1.9 — Job Source architecture

The domain is now organized around a job seeker’s actual questions:

```text
Job Source → Job Listing → canonical Job → Application
                   ↘ Organization ↗
```

- **Job Source** is where a vacancy is published: LinkedIn, Indeed, an employer careers portal, ATS, recruiter, newsletter, or another publishing source.
- **Source Type** describes what that source is.
- **Collection Capability** describes how JobIntel can monitor it.
- **Organization** is the employer/hiring organization and can appear on many Job Sources.
- **Job Listing** is one occurrence of a canonical Job on one Job Source.
- **Acquisition Method** records how JobIntel discovered that listing: crawler, Universal Search, Browser Companion, email, manual entry, API, or import.
- **Found via** records the Job Source responsible for discovery.
- **Applied via** records the Job Source where the application was actually submitted.

Universal Search and Browser Companion are acquisition methods, not fake publishing sources. Unknown publishing domains are kept under the protected **Unclassified Source** until the user attaches them to an existing or newly created Job Source.

This model lets Analytics answer questions such as applications by period/source, interviews/rejections/feedback/no-response by discovery source, actual submission-source effectiveness, scam/high-risk source history, crawler contribution and Universal Search contribution without conflating those concepts.

See `docs/milestones/milestone-33/README.md` and `docs/flows/milestone-33-job-source-architecture.mmd`.

## v1.8 — v1.7 UI preserved, intelligence extended

The **exact v1.7 UI is the locked visual/navigation baseline**. Milestones 21–23 and 24–32 are integrated inside its existing Dashboard, Jobs, Job Sources, Crawling, Universal Search, Applications, CVs, Extension, Analytics and Settings surfaces. The older Home / Opportunities / Discover shell is not used.

Key additions inside the v1.7 experience:

- Jobs: explainable priority queue, edit/archive/delete for owned jobs, protected shared crawler jobs, and History tab.
- Job Sources: per-source Jobs / Applications / Organizations / Crawlers / Runs / Health workspace with multiple crawler configurations and run-to-job lineage.
- Applications: Application Pack, exact CV, answers, verified evidence, truthful cover letter, recruiter contacts, follow-up, interview prep and offers.
- Analytics: skill gaps, market demand, CV/source outcome comparisons, offer comparison and search-campaign timeline.
- Dashboard: material-change smart notifications while retaining the v1.7 crawler/pipeline dashboard.
- Product tour: contextual onboarding over the existing shell.

`npm run ui:check` guards the v1.7 shell against accidental regression. See `docs/ui-v1.7-lock.md`.

## v1.7 full logic in uploaded UI

The uploaded UI remains the presentation source of truth, but its live pages now expose the broader product behavior developed before the UI migration. Universal Search includes wider-web discovery, email-alert extraction, manual source batches and Browser Companion handoff. Active search profiles scope job retrieval and dashboard/application counts. Jobs retain advanced source/category/freshness/visited/application filters, AI profile fit, CV fit, expiry reminders and trust evidence. Global search opens the exact selected entity, and wider-web results can be handed directly to Job Sources for source analysis and monitoring.

The dashboard combines the uploaded crawler/pipeline view with the earlier personal attention queue: unvisited jobs, saved jobs, stale applications and source issues.

See `docs/milestones/milestone-20/README.md` and `docs/flows/milestone-20-full-logic-ui.mmd`.

## v1.4 CV intelligence

CV preparation is now part of the normal job workflow. **Preferences → CVs & documents** supports uploaded or built CVs, immutable versions, Master/default CVs and PDF/DOCX downloads. Opportunity detail can compare any job with a chosen CV, explain what is evidenced, partially evidenced, not evidenced or needs factual confirmation, and open a dedicated tailoring workspace.

A saved job can remember the exact CV version intended for it, and an application stores the exact CV version actually submitted. Browser Companion keeps its existing Save / Save + Applied actions and adds job-page detection, transient CV comparison, Save job + CV and Improve CV.

See `docs/milestones/milestone-17/README.md` and `docs/flows/milestone-17-cv-intelligence.mmd`.

## v1.3 hybrid UI reconciliation

The web interface now uses the uploaded cohesive UI as the presentation baseline while preserving the complete v1.2 capability set. The primary navigation is **Home → Opportunities → Applications → Discover**, with **Sources / Insights / Preferences** under management and **Browser Companion** as a capture tool.

The UI keeps the uploaded master-detail opportunity review, progressive disclosure and calm visual system, while borrowing the current application's stronger dashboard follow-up signals, application board, source-mode filtering, richer insights, active search context and browser capture.

See `docs/ux/README.md` and `docs/milestones/milestone-16/README.md`.

## v1.2 workflow UI and Browser Companion

The web interface is organized around **Today → Jobs → Applications**. Wider-web discovery is inside the Jobs workspace instead of a separate top-level tool module.

A companion WebExtension is included in `browser-extension/`. It can capture the active job page and either save it or immediately record the application. Create a revocable token from **Browser companion** in the web UI before connecting the extension.

See:

- `docs/ux/README.md`
- `docs/milestones/milestone-15/README.md`
- `docs/flows/milestone-15-browser-companion.mmd`
- `browser-extension/README.md`

## v1.5 uploaded UI integration

The web application now uses the user-provided Job Intelligence Platform UI as its presentation baseline. The existing v1.4 backend, ingestion, deduplication, application tracking, CV intelligence and browser-companion logic remain the functional baseline. See `docs/milestones/milestone-18/README.md` and `docs/ui-uploaded-reference-study.md`.

## v1.6 live uploaded UI

The uploaded prototype is no longer a visual reference layered over another interface: its own page taxonomy and dense operational interaction patterns are connected to the live backend. See `docs/milestones/milestone-19/README.md` and `docs/flows/milestone-19-live-uploaded-ui.mmd`.

## v1.10 — Sharing and URL integrity

v1.10 keeps the locked v1.7/v1.8 UI and builds directly on the v1.9 Job Source architecture. It adds single/multi-job email sharing, editable/deletable Job Sources, exact notification deep-links, application-stage filtering, safe redirect/404 checks for user-saved URLs, normalized Job Source domains, and normalized/unique Job Listing URLs. The Browser Companion checks URL uniqueness before saving and the backend repeats the constraint.

See `docs/v1.10-sharing-url-integrity.md` and `docs/validation-v1.10.md`.
