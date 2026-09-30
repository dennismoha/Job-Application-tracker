# Milestones 24–32 — Career Intelligence Layer

## Goal

Extend the existing discovery → evaluation → CV → application → tracking product into a complete feedback loop without replacing the established UI or duplicating business rules.

The core object is the **Application Pack**. Every serious application can now retain the vacancy snapshot, exact CV-version reference, cover letter, application answers, source URL, contacts, follow-up state, interview workspace and offer record.

## Milestone 24 — Application Packs + snapshots

- Application Pack created automatically when an application is created/opened.
- Captures an immutable job snapshot so the vacancy survives after the external page changes/disappears.
- Stores exact `cvVersionId`, source URL, application answers and notes.
- `Open application + prepare CV` launch contract returns the external apply URL and selected CV download path.
- Existing listing revisions are exposed beside pack snapshots as job change history.

## Milestone 25 — Evidence Bank + cover-letter intelligence

Evidence entries are verified career facts:

- achievements;
- projects;
- responsibilities;
- certifications;
- technologies;
- teaching achievements;
- measurable outcomes;
- education/languages/other evidence.

Cover-letter generation is constrained to verified evidence. The AI instruction explicitly forbids invention; when AI is unavailable a deterministic evidence-based fallback is used.

## Milestone 26 — Interview + follow-up + contact CRM

- Interview schedule, location/meeting URL and preparation notes.
- Likely interview areas derived from job/profile requirements.
- STAR-example prompts built from verified Evidence Bank entries.
- Questions-to-ask list and post-interview outcome/questions history.
- Recruiter/contact CRM with application linking.
- Next-action engine: WAIT / FOLLOW_UP / THANK_YOU / PREPARE_INTERVIEW / DECIDE_OFFER.
- Stage changes automatically recalculate a suggested next action.

## Milestone 27 — Skill-gap + market intelligence

Skill-gap intelligence aggregates `JobProfileMatch` data across the selected period and reports:

- requirement frequency;
- matched count;
- missing/not-evidenced count;
- whether the Evidence Bank currently contains evidence for the requirement.

Market intelligence aggregates:

- repeated employers;
- categories;
- job volume by month;
- sources carrying the jobs;
- observed salary data.

## Milestone 28 — Offer management

Offers now retain factual terms including:

- salary/currency;
- bonus;
- housing;
- transport;
- medical cover;
- visa;
- school fees;
- leave;
- contract duration;
- start date;
- probation;
- notice period;
- remote policy;
- other benefits and notes.

Active offers can be compared side-by-side. The system does not select a winner.

## Milestone 29 — Existing guided onboarding remains extensible

Milestones 21–23 introduced the product-tour foundation. These features are designed as contextual panels inside existing Applications/Jobs/Insights screens so the same tour system can later attach steps without creating a new navigation model.

## Milestone 30 — Browser application assistant

`browser-extension-assistant/application-assistant.js` is an additive helper for the existing Browser Companion:

- drafts common application fields from verified evidence only;
- returns `requiresUserInput` for salary expectation, notice period/current availability and current location rather than guessing;
- downloads the CV attached to the Application Pack before opening the application URL from an explicit user click;
- never submits an external application automatically.

## Milestone 31 — Strategy analytics

Application outcomes can be grouped descriptively by:

- exact CV version ID;
- actual application source.

For each group the API returns applications, responses, interviews and offers. These are descriptive outcomes and are not presented as causal claims or a magical “best CV”.

## Milestone 32 — Priority queue + campaigns + smart notifications

### Explainable opportunity priority

Priority buckets:

- HIGH_ATTENTION;
- REVIEW;
- LATER;
- LOW_PRIORITY.

Reasons are always returned with the score (profile fit, closing soon, shortlist state, trust/risk level, posting age). No unexplained AI-only score is shown.

### Search campaign timeline

A user can create a named search period such as `UAE Teaching · Sep–Dec 2026` and later review discovered jobs, saved jobs, applications, responses, interviews and offers for that period.

### Smart notifications

Refresh generates material-change notifications for:

- strong-match jobs;
- saved jobs closing soon;
- due follow-ups;
- upcoming interviews;
- active offers needing attention;
- saved job changes;
- monitored sources recovering after failure.

## API surface

All new APIs live under `/api/career` so existing modules stay stable.

Key endpoints:

```text
GET/POST/PATCH/DELETE /api/career/evidence
GET/PATCH              /api/career/applications/:id/pack
POST                   /api/career/applications/:id/snapshots
POST                   /api/career/applications/:id/cover-letter
PATCH                  /api/career/cover-letters/:id
GET/PATCH              /api/career/applications/:id/interview
POST                   /api/career/applications/:id/interview/prepare
GET/POST/PATCH/DELETE  /api/career/contacts
POST                   /api/career/applications/:id/contacts
POST                   /api/career/applications/:id/follow-up/evaluate
GET/PATCH              /api/career/follow-ups
PUT                    /api/career/applications/:id/offer
GET                    /api/career/offers
GET                    /api/career/jobs/:jobId/history
GET                    /api/career/intelligence/skill-gaps
GET                    /api/career/intelligence/market
GET                    /api/career/intelligence/strategy
GET                    /api/career/intelligence/priorities
GET/POST/PATCH         /api/career/campaigns
GET/POST/PATCH         /api/career/notifications
POST                   /api/career/assistant/field
GET                    /api/career/applications/:id/launch
```

## Truthfulness and automation rules

1. Evidence Bank entries are user-owned factual records.
2. Generated cover letters/application answers may use only verified evidence.
3. Missing facts are surfaced as missing or `requiresUserInput`; they are never invented.
4. External job applications are never submitted automatically.
5. CV download + external-page opening only occurs after an explicit user action.
6. Priority reasons remain visible.
7. Offer comparisons are factual and do not choose for the user.

## v1.7 UI integration rule

In the corrected v1.8 build these capabilities are integrated into the exact v1.7 uploaded-UI baseline rather than the older shell:

- Application intelligence opens from the existing Applications drawer.
- Priority intelligence sits above the existing Jobs table and opens the existing job drawer.
- Job snapshots/revisions appear in the existing job drawer's History tab.
- Site applications/crawlers/runs open from the existing Job Sites table.
- Career intelligence extends the existing Analytics page.
- Smart notifications extend the existing Dashboard.
- The product tour overlays the existing v1.7 shell.

See `docs/ui-v1.7-lock.md` and run `npm run ui:check` to guard this baseline.
