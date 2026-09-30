# Milestone 1 — Project Foundation and Core Database

## Goal

Create a stable Node/TypeScript backend foundation and database model that later milestones can build on without changing the core domain boundaries.

## Scope implemented

- Express 5 API scaffold
- strict TypeScript configuration
- Prisma/PostgreSQL schema
- shared Prisma client
- environment validation with Zod
- central 404 and error handlers
- `/health` endpoint with a real database connectivity check
- Docker Compose PostgreSQL service for local development
- Prisma seed categories
- ESLint flat configuration
- Prettier configuration
- Vitest test scaffold
- Mermaid process-flow viewer
- Milestone documentation convention
- Milestone 0 research imported into the main repository

## Domain model prepared

The schema already reserves the relationships required by later milestones:

- users and search profiles;
- companies and source registries;
- source audits, schedules, subscriptions, health, and runs;
- ingestion staging;
- canonical jobs and source listings;
- listing-to-job deduplication evidence;
- user job state;
- applications and application events;
- notes and risk reports.

These models exist now so later milestones can add behavior without having to rewrite the relationships.

## Local setup

```bash
cp .env.example .env
docker compose up -d postgres
npm install
npm run db:generate
npm run db:migrate -- --name milestone_01_foundation
npm run db:seed
npm run dev
```

Check:

```text
GET http://localhost:4000/health
```

Expected response:

```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "..."
}
```

## Code quality

```bash
npm run typecheck
npm run lint
npm run format:check
npm test
```

## Mermaid viewer

```bash
npm run docs:dev
```

Then open the local Vite URL, normally `http://localhost:4173`.

The viewer automatically loads `.mmd` files under `docs/flows/`.

## Process flow

- `docs/flows/milestone-01-foundation.mmd`
- `docs/flows/core-domain-model.mmd`

## Manual verification checklist

- [ ] `.env` created from `.env.example`
- [ ] PostgreSQL container healthy
- [ ] Prisma client generated
- [ ] first migration applied
- [ ] seed completes successfully
- [ ] API starts without warnings
- [ ] `/` returns the API name/version
- [ ] `/health` confirms database connectivity
- [ ] unknown route returns structured 404 JSON
- [ ] ESLint passes
- [ ] Prettier check passes
- [ ] TypeScript typecheck passes
- [ ] Vitest passes
- [ ] Mermaid viewer renders Milestone 0 and Milestone 1 diagrams

## Known limitations

- No authentication behavior yet. User tables exist only as schema preparation.
- No source-management endpoints yet.
- No scheduler or acquisition workers yet.
- No job ingestion or deduplication behavior yet.
- No frontend application yet.
- The repository was generated in an offline build environment, so dependency installation and Prisma generation must be run in an environment with npm registry access before the full Node test suite can execute.

## Next milestone

Milestone 2 implements users and search profiles while keeping source collection shared rather than user-specific.
