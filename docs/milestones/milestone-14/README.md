# Milestone 14 — Production Hardening and Hosting

## Goal

Package the complete platform so it can be tested, deployed and operated continuously without hiding collector failures or coupling API availability to the scheduler worker.

## Implemented

- API liveness and database readiness endpoints.
- Per-request IDs and structured JSON request logs.
- Basic per-process API rate limiting.
- Dedicated compiled acquisition worker entrypoint.
- Graceful shutdown for API and worker.
- Environment validation for n8n, search and optional AI integrations.
- Production multi-stage Dockerfiles for API/worker and React frontend.
- Production Docker Compose with PostgreSQL, first-run schema bootstrap, API, worker and web services.
- CI workflow for Prisma generation, project checks, TypeScript, ESLint, Prettier, Vitest, Mermaid build and React build.
- Deployment, operations and security documentation.
- n8n workflow contract and extraction prompt.

## Production note

The included in-process rate limiter protects a single API replica. Put a shared edge/reverse-proxy rate limiter in front of multiple replicas.

The v1 Compose file bootstraps an empty database with `prisma db push --skip-generate`. After installing dependencies, generate and commit `initial_complete_schema` and change production upgrades to `prisma migrate deploy`; see `prisma/migrations/README.md`.

## Process flow

Open `docs/flows/milestone-14-production.mmd`.

## Manual checklist

- [ ] `/health/live` answers without database access.
- [ ] `/health/ready` returns 503 when PostgreSQL is unavailable.
- [ ] API and worker are separate production processes.
- [ ] Only one scheduler/worker deployment is enabled unless queue concurrency is intentionally configured.
- [ ] n8n webhook secret is long and private.
- [ ] Search and AI API keys are stored as deployment secrets.
- [ ] Production CORS origin is not `*`.
- [ ] Database backups are configured and restore procedure is tested.
- [ ] CI passes before deployment.
