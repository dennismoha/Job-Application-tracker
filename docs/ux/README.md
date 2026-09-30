# UX architecture

The product keeps the current application's full capability set while presenting it through the visual language and interaction model of the uploaded UI reference.

The UI is intentionally simple on the surface and powerful underneath. Backend modules do not define the primary navigation.

## Primary mental model

```text
Home
  ↓
Opportunities
  ↓
Review → Save / Ignore / Apply
                     ↓
               Applications
                     ↓
             Interview / Offer / Close

Need more jobs?
  ↓
Discover
  ↓
Web search / email / manual batch / browser capture
  ↓
Opportunities
```

## Navigation

### Workspace

- **Home** — attention queue, next actions, search performance summary and source exceptions.
- **Opportunities** — master-detail job inbox for reviewing, saving, applying, filtering and inspecting source evidence.
- **Applications** — post-application tracking with timeline and optional pipeline-board view.
- **Discover** — wider-web search, email ingestion, manual monitoring batches and browser-capture entry point.

### Manage

- **Sources** — source library, health, monitoring mode, follow/unfollow, manual runs and trust notes.
- **Insights** — response/interview outcomes, source effectiveness, freshness, duplication, risk and system health.
- **Preferences** — focused search profiles and matching preferences.

### Capture

- **Browser Companion** — capture or mark a job applied while browsing Chrome, Edge or Firefox.

## Interaction principles

1. Preserve all existing functionality; redesign presentation rather than removing capabilities.
2. Use the uploaded UI's spacing, typography, calm visual system and master-detail patterns as the default language.
3. Put everyday actions in the first layer and occasional/technical controls one layer deeper.
4. Home answers "what needs my attention?"; Insights answers "what is working?".
5. Opportunities is the main review workspace and keeps the user in context while moving through many jobs.
6. Keep actual posting age separate from "recently added to this system".
7. One canonical job may expose many source listings; duplicate listings remain evidence rather than being discarded.
8. Application history is separate from job state and remains event-based.
9. Discovery channels converge into the same ingestion, normalization and deduplication pipeline.
10. Source health, scheduler details and crawler behavior belong inside Sources, not in the everyday job-review path.
11. AI matching, personal expiry and risk controls use progressive disclosure in job detail.
12. Browser Companion is an acquisition/capture channel, not a separate job database.
13. Keep powerful advanced filters, but hide them until the user asks for deeper narrowing.
14. Preserve provenance: users can tell whether a job came from crawler, email, web search, manual entry or browser capture.
15. CV preparation is part of opportunity review, not a separate job database: choose a CV, compare evidence, tailor if needed, then apply.
16. “Not evidenced” never means “the user lacks this”; qualification-sensitive gaps require explicit confirmation before adding facts.
17. Saved jobs may remember a preferred CV version, and applications remember the exact version submitted.
18. Browser Companion keeps its existing capture actions and adds CV intelligence progressively rather than replacing them.

## CV workflow

```text
Opportunity / Browser page
        ↓
Choose CV
        ↓
Compare job requirements
        ↓
Evidenced / Partial / Not evidenced / Confirm
        ↓
Use as-is  |  Save job + CV  |  Improve CV
                                  ↓
                           Tailoring workspace
                                  ↓
                         Preview + new version
                                  ↓
                            PDF / DOCX / Apply
```
