# Milestone 21 — Job CRUD and Safe Retention

## Delivered

- Edit user-created/manual jobs.
- Archive any accessible job through user state.
- Permanently delete user-created jobs only when they do not have application history.
- Shared crawler-discovered jobs reject destructive edits/deletes so source evidence and deduplication remain trustworthy.
- Application deletion endpoint added for explicit user cleanup.

## Safety rule

If a job has an application, interview, CV history or other application record, deleting the job is blocked with `409 Conflict`. Archive it instead.
