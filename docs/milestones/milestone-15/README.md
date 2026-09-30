# Milestone 15 — Browser Companion and UX consolidation

## Goal

Close the gap between jobs found automatically and jobs the user discovers while browsing manually. At the same time, reorganize the web UI around the user's real workflow instead of backend module boundaries.

## User journey

1. **Today** shows the next actions: jobs to review, applications to follow up, and source problems.
2. **Jobs** is the single job workspace. Inbox, saved, applied, expired and wider-web discovery are views of the same collection.
3. **Applications** is a visual pipeline from applied through interview, offer and closure.
4. **Sources** manages where jobs come from and how each site should be monitored.
5. **Insights** explains which sources and application strategies are actually producing results.
6. **Search profiles** define what the user wants.
7. **Browser companion** captures jobs discovered outside the automated system.

## Browser companion

The extension captures the active tab only after the user invokes it. It attempts to read `JobPosting` JSON-LD, selected text and visible page content. The backend then sends the captured job through the normal ingestion, normalization and deduplication pipeline.

### Actions

- **Save job** — captures and bookmarks the job.
- **Save + applied** — captures the job and creates an `APPLIED` application event.
- **Context menu save** — saves the current page, selected text or job link.
- **Existing-job detection** — the popup can show when the current URL is already known or already applied to.

## Security

Browser companion tokens are separate from web sessions. Only a SHA-256 hash is persisted. Tokens can be revoked independently from the web UI. The clear token is returned only once when created.

The extension uses `activeTab` and `scripting` so page content is read after an explicit user action rather than by an always-on content script.

## Checklist

- [x] Task-oriented navigation
- [x] Active search profile selector
- [x] Today action queue
- [x] Unified Jobs workspace
- [x] Discover inside Jobs
- [x] Application Kanban board
- [x] Source mode views
- [x] Browser companion token model
- [x] Browser companion API authentication
- [x] Job capture endpoint
- [x] Application capture action
- [x] Chrome/Edge manifest
- [x] Firefox-compatible WebExtension code path
- [x] Context menu capture
- [x] Companion setup page
- [x] Mermaid flow
