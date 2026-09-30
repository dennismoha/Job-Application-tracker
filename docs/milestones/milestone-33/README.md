# Milestone 33 — Job Source Architecture

## Goal

Make one domain model authoritative for acquisition, jobs, applications, crawling, Browser Companion, Universal Search and analytics while preserving the v1.7 visual shell.

The system must answer a job seeker's questions without treating a publishing source, employer, crawler and discovery channel as the same thing.

## Canonical vocabulary

### Job Source

Where a vacancy is published. Examples: LinkedIn, Indeed, GEMS Careers, Workday, a recruiter portal or a newsletter.

### Source Type

What the Job Source is:

- Job Board
- Company Careers
- Organization Website
- ATS
- Recruiter
- Newsletter
- Other
- Unclassified

### Collection Capability

How JobIntel can monitor the Job Source:

- Crawlable
- Restricted
- Manual only
- Email only
- Search only
- Unknown
- Disabled

Source Type and Collection Capability are intentionally independent.

### Organization

The hiring employer/school/company. An Organization can publish through many Job Sources and one Job Source can carry jobs from many Organizations.

### Job

The canonical vacancy.

### Job Listing

One occurrence of a Job on one Job Source. A single Job can have several Listings across LinkedIn, Indeed and an official employer careers portal.

### Acquisition Method

How JobIntel discovered the Listing:

- Crawler
- Browser Companion
- Universal Search
- Email
- Manual
- API
- Import

This does not replace the Job Source. A listing can truthfully be:

```text
Job Source: LinkedIn
Acquisition Method: Universal Search
```

### Found via / Applied via

Applications retain two source attributions:

- **Found via** — where the opportunity was discovered.
- **Applied via** — where the user actually submitted the application.

For example:

```text
Found via: LinkedIn
Applied via: ABC School Careers / Workday
```

## Relationship model

```text
Job Source ───────< Job Listing >────── Job ─────── Application
    │                                      │
    └──────< OrganizationSource >──── Organization

Job Listing ── Acquisition Method
Application ── Found via Job Source
Application ── Applied via Job Source
Job Source ── Crawler Configuration ── Crawl Run
```

## Unclassified Source

The system owns a protected `Unclassified Source`. Universal Search, Browser Companion or manual entry can use it when the publishing domain is not yet known.

The user can later:

- attach the listing to an existing Job Source;
- create a new Job Source and attach it;
- leave it unclassified deliberately.

Universal Search remains the Acquisition Method even after the publishing source is classified.

## Entry-point behavior

### Add Job

1. Parse the supplied URL.
2. Try to identify an existing Job Source.
3. Auto-select it when found.
4. If absent, offer **+ Add Job Source** without losing the job form.
5. Or allow **Use Unclassified**.
6. Save manual entry as `Acquisition Method = MANUAL`.

### Browser Companion

Uses the same source-resolution flow as Add Job. Browser Companion is always the Acquisition Method, never a synthetic Job Source.

### Universal Search

Each accepted result records `Acquisition Method = UNIVERSAL_SEARCH`. The publishing Job Source is resolved from the URL when possible; otherwise it uses Unclassified Source and can be corrected later.

### Crawling

Crawlers belong to Job Sources. Source Type does not decide crawler access; Collection Capability does.

```text
Job Source → Crawler Configuration → Crawl Run → Job Listings → Jobs
```

## Analytics questions now supported

For any date range/profile/category/source, the reporting model can answer:

- How many jobs did I apply for?
- How many received feedback?
- How many reached interview?
- How many were rejected?
- Which discovery Job Source produced the most no-response applications?
- Which Job Source contained scam/high-risk jobs?
- How many applications were actually submitted through each Job Source?
- Which Job Sources are crawlable/restricted/search-only/etc.?
- How many canonical jobs did crawler acquisition produce from Source X?
- How many jobs came through Universal Search, Browser Companion, email or manual entry?
- How many jobs were found on LinkedIn but submitted through another source?

## Compatibility strategy

The physical Prisma model remains `Source` in this milestone to avoid a destructive all-at-once database rename. Product language, service semantics and new relations treat it as `Job Source`. The database table can be renamed in a later dedicated migration if desired.

## UI non-regression

The v1.7 shell stays locked. The visible navigation is:

- Dashboard
- Jobs
- Job Sources
- Crawling
- Universal Search
- Applications
- CVs
- Extension
- Analytics
- Settings

No older Home/Opportunities/Discover shell is reintroduced.

## Acceptance checklist

- [x] Source Type separated from Collection Capability.
- [x] Acquisition Method stored per Job Listing.
- [x] Organization ↔ Job Source is many-to-many.
- [x] Applications retain Found via and Applied via independently.
- [x] Found via and Applied via can be corrected after application.
- [x] Universal Search no longer uses a fake Internet Search publishing source.
- [x] Browser Companion no longer uses a fake Browser Companion publishing source.
- [x] Protected Unclassified Source exists.
- [x] Add Job resolves or creates Job Sources inline.
- [x] Existing Jobs can attach additional Listings/Job Sources.
- [x] Existing Listings can be reassigned to the correct Job Source.
- [x] Crawlers belong to Job Sources and honor Collection Capability.
- [x] Analytics separates discovery-source and submission-source effectiveness.
- [x] Date-scoped Job Search Brain report exists.
- [x] Migration preserves historical attribution where possible.
- [x] v1.7 UI shell guard passes.
