# Milestone Documentation Convention

Every implementation milestone gets its own directory:

```text
docs/milestones/milestone-XX/
└── README.md
```

Each milestone README includes:

- goal;
- implemented scope;
- important architecture decisions;
- database/API changes;
- tests;
- manual verification checklist;
- known limitations or milestone boundary;
- link to its Mermaid process flow.

Current milestones:

```text
milestone-00  Source research
milestone-01  Foundation
milestone-02  Users and search profiles
milestone-03  Source registry and audit engine
milestone-04  Scheduler and acquisition orchestration
milestone-05  Automatic collectors v1
milestone-06  Job ingestion and normalization
milestone-07  Canonical jobs and deduplication
milestone-08  Core job dashboard
```

Corresponding Mermaid files live under `docs/flows/` and are automatically picked up by the local viewer.

A milestone is not complete until implementation, tests, documentation, and its process flow are updated together.

- [Milestone 9 — Hybrid Acquisition](./milestone-09/README.md)
- [Milestone 10 — Application Tracker](./milestone-10/README.md)
- [Milestone 11 — Trust & Risk](./milestone-11/README.md)
- [Milestone 12 — Reporting](./milestone-12/README.md)
- [Milestone 13 — AI Intelligence](./milestone-13/README.md)
- [Milestone 14 — Production](./milestone-14/README.md)
- [Milestone 15 — Browser Companion & UX Consolidation](./milestone-15/README.md)
