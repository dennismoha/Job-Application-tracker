# Milestone 17 — CV Intelligence

Milestone 17 closes the gap between discovering a vacancy and submitting a well-prepared application.

The feature is additive. Existing job discovery, saving, application tracking, Browser Companion capture, source monitoring, email ingestion, web search and reporting continue to work unchanged.

## Goals

- Keep a reusable CV library inside Job Intelligence.
- Upload an existing PDF/DOCX/TXT/Markdown CV or create one in the application.
- Keep immutable CV versions rather than overwriting the document used for a previous application.
- Associate default CVs with search profiles while still allowing any CV to be chosen for any job.
- Extract structured job requirements from a vacancy.
- Compare a selected CV version against those requirements.
- Distinguish **not evidenced in this CV** from **the user does not have this qualification**.
- Require factual confirmation before adding missing qualifications, skills or experience.
- Tailor a CV for a vacancy without changing the original version.
- Preview the tailored CV before saving or downloading it.
- Download PDF or DOCX output.
- Remember the CV selected for a saved job.
- Store the exact CV version used for an application.
- Extend Browser Companion with job-page detection and CV comparison without removing its existing Save / Save + Applied workflow.

## Main domain model

```text
User
├── SearchProfile
│   └── CvProfileLink ──> CV
│
├── CV
│   └── CvVersion
│
└── UserJobState
    └── preferredCvVersion

Job
├── JobRequirement
├── JobCvMatch
│   └── JobCvMatchItem
└── CvTailoringSession
    └── CvTailoringSuggestion

Application
└── cvVersion
```

## CV library

The CV library is available from **Preferences → CVs & documents**.

A user can:

- upload PDF, DOCX, TXT or Markdown;
- create a CV using the built-in builder;
- mark one CV as the Master CV;
- assign a default CV to a search profile;
- preview a CV;
- download PDF or DOCX;
- archive a CV;
- inspect versions.

Uploaded files are converted to text so the application can compare their actual content with a vacancy. Original uploaded bytes are retained on the original CV version.

## Versioning rule

A tailored CV never overwrites the source version.

```text
Teaching CV
├── v1 Original upload
├── v2 UAE general version
├── v3 Tailored for Mathematics Teacher — ABC School
└── v4 Tailored for IB Mathematics — XYZ School
```

Applications reference `CvVersion`, not just `Cv`, so application history always records exactly what was sent.

## Requirement comparison

A job description is converted into structured requirements. Each requirement is compared with the selected CV and receives one of these states:

| State | Meaning |
| --- | --- |
| `EVIDENCED` | The CV clearly demonstrates the requirement. |
| `PARTIAL` | Relevant evidence exists but is weak or indirect. |
| `NOT_EVIDENCED` | The CV does not currently demonstrate it. This does **not** mean the user lacks it. |
| `NEEDS_CONFIRMATION` | The requirement is sensitive enough that the user must confirm the fact before it can be added. |
| `NOT_APPLICABLE` | The item is not useful for CV comparison. |

Qualification-sensitive requirements such as degrees, certifications, licences and years of experience are deliberately conservative.

## Truthfulness rule

CV tailoring may:

- rewrite existing facts;
- shorten or clarify wording;
- reorder evidence;
- make relevant evidence more explicit;
- align factual terminology with the vacancy;
- surface experience that is already present.

It must not invent:

- employers;
- dates;
- qualifications;
- certifications;
- licences;
- years of experience;
- skills;
- projects;
- achievements;
- responsibilities.

When a requirement is not evidenced, the tailoring screen asks the user to confirm and provide the missing fact. The confirmed text then becomes user-provided evidence.

## Saved job + CV

A saved job can now remember a preferred `CvVersion` through `UserJobState.preferredCvVersionId`.

This makes the following workflow reliable:

```text
Review vacancy
    ↓
Choose CV
    ↓
Compare
    ↓
Save job + this CV
    ↓
Return later
    ↓
Continue with the same CV version
```

The association is explicit. It is not inferred from the most recent comparison.

## Opportunity workflow

The existing master-detail Opportunity view now contains a progressive-disclosure CV readiness card:

1. choose CV;
2. compare;
3. inspect evidenced / partial / not-evidenced / confirmation counts;
4. inspect the most important gaps;
5. save job + selected CV for later; or
6. open the tailoring workspace.

The standard Save, Ignore, Open application and Mark as applied actions remain unchanged.

## Browser Companion increment

The extension keeps its existing behavior and adds:

1. inspect the open page;
2. detect whether it appears to be a job page;
3. prefer `JobPosting` JSON-LD when available;
4. extract visible job text as fallback;
5. optionally use AI only when a page is ambiguous and no deterministic job signal is sufficient;
6. choose a CV;
7. compare transiently without automatically filling the job inbox;
8. show CV evidence/gaps;
9. Save job;
10. Save + Applied;
11. Save job + selected CV; or
12. Improve CV, which opens the full web tailoring workspace.

The full CV editor remains in the web application because factual confirmation, preview and document versioning need more room than an extension popup.

## Application history

An `Application` can now reference `cvVersionId`.

Application details therefore answer:

- which job was applied for;
- which listing/application URL was used;
- which search profile was used;
- which exact CV version was submitted;
- how the application progressed afterward.

## API surface

Main CV endpoints:

```text
GET    /api/cvs
POST   /api/cvs
POST   /api/cvs/upload
GET    /api/cvs/:cvId
PATCH  /api/cvs/:cvId
POST   /api/cvs/:cvId/profile-links
GET    /api/cvs/versions/:versionId
GET    /api/cvs/versions/:versionId/download?format=pdf|docx
GET    /api/cvs/jobs/:jobId/matches
POST   /api/cvs/jobs/:jobId/compare
POST   /api/cvs/tailoring
GET    /api/cvs/tailoring/:sessionId
PATCH  /api/cvs/tailoring/:sessionId
POST   /api/cvs/tailoring/:sessionId/save
PATCH  /api/cvs/tailoring/suggestions/:suggestionId
```

Browser Companion additions:

```text
GET  /api/browser-companion/cvs
POST /api/browser-companion/analyze-page
POST /api/browser-companion/compare-page
POST /api/browser-companion/prepare-cv
```

## Manual verification checklist

- [ ] Upload a text-based PDF CV and confirm a version is created.
- [ ] Upload a DOCX and confirm its text is available in preview.
- [ ] Create a CV through the builder.
- [ ] Make a CV the default for a search profile.
- [ ] Compare a job against the profile's default CV.
- [ ] Confirm that an absent degree/certification is shown as `NEEDS_CONFIRMATION` rather than being invented.
- [ ] Save a job together with a CV and reopen it; the same version should be selected.
- [ ] Open tailoring and accept a rewrite of existing evidence.
- [ ] Try to add a missing requirement; the UI must request factual confirmation first.
- [ ] Save tailoring as a new CV version and verify the original version is unchanged.
- [ ] Preview and download PDF.
- [ ] Preview and download DOCX.
- [ ] Mark a job applied with the selected CV and verify Applications shows the exact CV version.
- [ ] Open a normal webpage in Browser Companion and confirm it is not confidently treated as a job.
- [ ] Open a `JobPosting` page and confirm it is detected.
- [ ] Compare a page against a CV without saving the job; the Opportunities inbox should remain unchanged.
- [ ] Use Save job + CV in the extension and confirm the selected version is remembered.
- [ ] Use Improve CV in the extension and confirm the web tailoring workspace opens.

## Process flow

See [`../../flows/milestone-17-cv-intelligence.mmd`](../../flows/milestone-17-cv-intelligence.mmd).
