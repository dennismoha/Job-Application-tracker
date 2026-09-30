# Deployment

## Recommended production topology

Run the API and acquisition scheduler as separate processes:

```text
TLS / reverse proxy
    ├── web frontend
    └── API

API ────────────────┐
                    ├── PostgreSQL
Acquisition worker ─┘

n8n ───────────────→ API webhook
Search provider ───→ worker/API
Optional AI ───────→ API/worker
```

The included `docker-compose.production.yml` follows this layout.

## Before deployment

1. Copy `.env.production.example` to `.env.production` and replace every secret.
2. Set `POSTGRES_USER`, `POSTGRES_PASSWORD` and `POSTGRES_DB`; Compose builds the internal `DATABASE_URL` using the `postgres` service hostname.
3. Set `CORS_ORIGIN` and `VITE_API_BASE_URL` to the real HTTPS browser/API origins for your deployment.
4. Generate a long random `N8N_INGESTION_SECRET`.
5. Add `WEB_SEARCH_API_KEY` only if internet-wide search is wanted.
6. Add `AI_API_KEY` only if optional AI features are wanted.
7. For a brand-new v1 database, allow the included Compose `schema` service to bootstrap the schema once with `prisma db push --skip-generate`.
8. After dependencies are installed, generate and commit the baseline Prisma migration before making later production schema changes.
9. Run the complete CI/quality command.

## Docker Compose

```bash
docker compose --env-file .env.production -f docker-compose.production.yml build
docker compose --env-file .env.production -f docker-compose.production.yml up -d
```

The production worker enables the scheduler. The API explicitly disables it so API replicas do not accidentally create multiple scheduler loops.

## Reverse proxy

Terminate HTTPS before the API/web containers. Forward the real client IP only from trusted proxy infrastructure. Apply a shared rate limit at the edge if running more than one API replica.

## Database migrations

The repository ships the complete schema, but it does not fabricate a generated migration history without the installed Prisma CLI. For the first empty database, the included production Compose file uses:

```bash
npx prisma db push --skip-generate
```

After installing dependencies, create the initial migration once and commit it:

```bash
npm run db:generate
npx prisma migrate dev --name initial_complete_schema
```

From that point onward, development schema changes use:

```bash
npm run db:migrate -- --name descriptive_change
```

and production upgrades use:

```bash
npm run db:deploy
```

Replace the Compose `schema` command with `prisma migrate deploy` once that migration history is committed. Never use `prisma db push --accept-data-loss` as the normal production upgrade mechanism.
