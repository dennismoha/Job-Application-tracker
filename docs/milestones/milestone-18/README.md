# Milestone 18 — Uploaded UI Integration

## Goal

Adopt the user's uploaded Job Intelligence Platform UI as the authoritative presentation layer while keeping the v1.4 application as the functional baseline.

The milestone does **not** remove working capabilities. It changes how those capabilities are organized and presented.

## UI baseline adopted

The main navigation follows the uploaded prototype:

- Dashboard
- Jobs
  - All Jobs
  - New Today
  - Favorites
  - Scam / Risk
  - Expired
- Job Sites
  - All Sites
  - Crawlable
  - Restricted
  - Scam / Risk
- Crawling
  - Configurations
  - Active Sessions
  - History
  - Failed Crawls
- Universal Search
- Applications
  - All
  - Applied
  - Interviewing
  - Rejected
  - Offers
- CVs
- Extension
- Analytics
- Settings

## Existing product capabilities retained

- canonical Job vs JobListing model;
- source provenance and multiple listings;
- recently-added vs actual posting age;
- advanced job filters;
- application event history and exact CV version used;
- CV library, profile defaults, job/CV comparison and tailoring;
- browser companion token management and capture workflow;
- source health, scheduling and run history;
- web search, email and manual acquisition paths;
- risk/trust data;
- reporting and source effectiveness analytics;
- AI fit and CV analysis where configured.

## Useful uploaded-UI features adopted

### Explicit crawling workspace

The previous product made source monitoring available but visually secondary. The uploaded UI's dedicated Crawling area is useful for users who want to understand or troubleshoot acquisition runs.

### Universal Search

The uploaded UI gives wider-web discovery its own clear destination while still routing results into the existing ingestion, normalization and deduplication pipeline.

### CV workspace

The uploaded CV presentation becomes the visual baseline for the existing CV intelligence domain rather than creating a second CV experience.

### Extension workspace

The extension remains additive: page detection, capture, save/apply, CV comparison and preparation all stay part of one companion workflow.

## CV format protection

The original uploaded CV remains immutable and stored on the original CV version. The editing workspace now includes a **layout guard** that compares the tailored draft with the source content volume and warns when content growth is likely to alter pagination.

This milestone deliberately distinguishes two concepts:

1. **Content intelligence** — compare and improve wording while preserving factual truth.
2. **Document rendering** — preserve template typography, margins, section geometry and pagination.

The UI now treats the document/template as a locked presentation layer. Future document-template rendering should edit structured section content inside that template rather than rebuild uploaded DOCX/PDF documents from plain text.

## Implementation rule

> Uploaded UI = presentation baseline. Existing v1.4 application = functional baseline.

A feature is never removed simply because the prototype did not show it. Missing capabilities are extended using the prototype's spacing, hierarchy, controls and information density.
