# Milestone 10 — Application Tracker

## Goal

Track the complete user-specific application lifecycle without mutating the underlying job vacancy.

## Implemented

- Application creation from a canonical job.
- Optional attribution to search profile and exact source listing used to apply.
- Application-stage filtering and search.
- Event-based history for every stage transition.
- Explicit event endpoint for responses/interviews/notes that do not need destructive state changes.
- Application-specific notes.
- React application tracker with stage updates and recent event timeline.
- Job detail action to record an application.

## Core rule

`Application.stage` is the convenient current state. `ApplicationEvent` is the historical source of truth.

## Process flow

Open `docs/flows/milestone-10-application-tracker.mmd`.

## Manual checklist

- [ ] Applying creates both `Application` and `APPLIED` event.
- [ ] Source attribution points to a listing belonging to the same job.
- [ ] Stage changes append history.
- [ ] Interview attendance can be reconstructed from events.
- [ ] Rejection does not delete previous interview history.
- [ ] Applications are private to their user.
