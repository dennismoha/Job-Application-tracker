# Operations

## Daily checks

- `/health/ready` is healthy.
- Worker is running.
- Source-health dashboard has no unexpected increase in CHALLENGED/UNHEALTHY sources.
- Acquisition run failure rate is normal.
- Quarantined ingestion count is not increasing sharply.
- Search and AI provider quotas are not exhausted.

## Source failures

A single source should fail independently. Investigate repeated:

- 403 / access denied;
- 429 / rate limiting;
- CAPTCHA/challenge observations;
- sudden drop from a normal listing count to zero;
- parser validity collapse;
- repeated timeouts.

Do not respond to an access challenge by adding bypass techniques. Move the source to EMAIL, MANUAL_BATCH, SEARCH_ONLY or RESTRICTED when appropriate.

## Backups

Configure managed PostgreSQL backups or a scheduled `pg_dump`. Keep at least one backup outside the primary database host.

Example manual backup:

```bash
pg_dump "$DATABASE_URL" --format=custom --file=job-intelligence.dump
```

Example restore into an empty database:

```bash
pg_restore --clean --if-exists --no-owner --dbname="$DATABASE_URL" job-intelligence.dump
```

Test restore procedures periodically; an untested backup is not a reliable recovery plan.

## Logs

The API emits JSON lines containing request ID, method, path, status and duration. Do not log session tokens, provider API keys, email bodies or passwords.
