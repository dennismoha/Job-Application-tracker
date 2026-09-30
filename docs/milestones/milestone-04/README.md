# Milestone 4 — Scheduler and Acquisition Orchestration

## Goal

Create the reliable execution layer that decides when a source should run, isolates source failures, records every run, and prepares clean extension points for the real collectors in Milestone 5.

## Implemented

- profile-to-source subscriptions;
- profile disable/delete automatically recalculates affected shared schedules;
- shared schedule management is restricted to the source creator while subscribers control their own preferred interval;
- one shared source schedule no matter how many users subscribe;
- effective schedule interval derived from the shortest enabled profile preference;
- source schedules with intervals, pause/resume, and next-run timestamps;
- scheduler tick that only queues due `AUTO` and `SEARCH_ONLY` sources;
- atomic schedule advancement so two scheduler processes do not intentionally queue the same due schedule;
- one active run per source guard;
- durable `AcquisitionRun` queue in PostgreSQL;
- worker claiming using compare-and-update locking;
- worker identifiers and lock timestamps;
- stale worker-lock recovery so abandoned RUNNING jobs do not remain stuck forever;
- acquisition dispatcher interface for pluggable collectors;
- explicit placeholder collector until Milestone 5;
- manual `Run Now` queueing;
- run statuses for success, partial, failure, rate limiting, challenges, skipping, and cancellation;
- source-health updates from run outcomes;
- exponential failure backoff;
- challenge cooldown;
- circuit-breaker state and pause windows;
- schedule/run API;
- scheduler/worker runtime that is **disabled by default** until collectors are installed.

## Important Milestone 4 boundary

This milestone does not pretend to crawl production sites yet. `AUTO`, `MANUAL_BATCH`, and `SEARCH_ONLY` runs reach a placeholder executor unless a test/injected executor is supplied. Real source adapters begin in Milestone 5.

For this reason:

```env
SCHEDULER_ENABLED=false
```

is the safe default.

## API

```text
GET    /api/profiles/:profileId/sources
PUT    /api/profiles/:profileId/sources/:sourceId
DELETE /api/profiles/:profileId/sources/:sourceId

GET    /api/scheduler/runs
GET    /api/scheduler/sources/:sourceId/schedule
PATCH  /api/scheduler/sources/:sourceId/schedule
POST   /api/scheduler/sources/:sourceId/pause
POST   /api/scheduler/sources/:sourceId/resume
POST   /api/scheduler/sources/:sourceId/run
```

## Environment

```env
SCHEDULER_ENABLED=false
SCHEDULER_TICK_MS=60000
WORKER_TICK_MS=2000
WORKER_ID=local-worker
RUN_STALE_MINUTES=15
```

## Process flow

See `docs/flows/milestone-04-scheduler.mmd`.

## Failure policy

- one source failure does not stop another source;
- a first ordinary failure causes backoff but does not immediately permanently disable the source;
- repeated failures can open the source circuit;
- challenge results open the circuit more aggressively;
- `EMAIL`, `RESTRICTED`, and `DISABLED` sources are not directly crawled;
- a source can be paused and resumed manually;
- a failed page does not mutate jobs because job ingestion is a later stage.

## Manual verification checklist

- [ ] first enabled profile subscription activates an AUTO/SEARCH_ONLY source schedule;
- [ ] several profiles share one network schedule instead of crawling the same source repeatedly;
- [ ] shortest preferred interval becomes the shared collection interval;
- [ ] removing the final subscription disables the network schedule;
- [ ] due schedule produces one queued run;
- [ ] repeated scheduler tick does not queue a second active run for the same source;
- [ ] two workers cannot both claim one queued run;
- [ ] stale RUNNING locks are recovered as failed runs and influence source health;
- [ ] manual run returns HTTP 202 and a queued run;
- [ ] `EMAIL`/`RESTRICTED` direct runs are rejected;
- [ ] completion resets consecutive failures;
- [ ] failures increase backoff;
- [ ] repeated failures open the circuit;
- [ ] challenged source is paused rather than hammered with retries;
- [ ] pause/resume endpoints update schedule state;
- [ ] scheduler remains off by default before Milestone 5 collectors;
- [ ] Mermaid scheduler flow renders;
- [ ] unit tests for backoff and injected dispatcher pass.

## Next milestone

Milestone 5 registers real API/ATS/feed/JSON-LD/static-HTML collectors behind the acquisition-dispatcher interface created here.
