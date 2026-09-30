# Milestone 16 — Hybrid UI reconciliation

## Goal

Reconcile the uploaded cohesive UI with the complete v1.2 application without reducing functionality.

The uploaded UI is the presentation baseline. The current application remains the functional baseline.

## What changed

- Restored the uploaded UI navigation hierarchy: Workspace / Manage / Capture.
- Restored the uploaded master-detail Opportunities workspace.
- Preserved advanced job filtering and added an Expired quick view.
- Preserved the current application's active search context selector.
- Merged the current dashboard's follow-up and strategy signals into the uploaded Home design.
- Added both Timeline and Board views to Applications.
- Added source-mode filtering while keeping source health, trust and shared profile subscriptions.
- Kept Discover as a clear acquisition workspace for web search, email and manual batches.
- Integrated Browser Companion into Discover, Preferences and the Capture navigation group.
- Kept richer source-performance, freshness, duplicate, trust and system-health reporting under Insights.
- Preserved AI fit analysis, personal expiry, notes and trust/risk controls through progressive disclosure.
- Preserved canonical Job → many JobListings presentation and source provenance.

## Functional rule

No working backend feature is removed simply because it is not visible in the uploaded reference UI. Missing capabilities are fitted into that UI's design language at the most natural level.

## Validation checklist

- [ ] Home remains action-oriented rather than becoming a full analytics dashboard.
- [ ] Opportunities remains usable without opening advanced filters.
- [ ] Job detail exposes primary actions before technical controls.
- [ ] Applications can be understood as both a journey and a board.
- [ ] Discover brings jobs into the same canonical ingestion pipeline.
- [ ] Source monitoring details remain available without entering the daily workflow.
- [ ] Insights retains current reporting depth.
- [ ] Search profiles remain usable as active context.
- [ ] Browser Companion setup and revocable tokens remain available.
- [ ] No backend route or data model is removed by this milestone.
