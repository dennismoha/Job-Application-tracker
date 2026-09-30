# Milestone 9 — Email, Manual Batch and Internet Search Acquisition

## Goal

Complete the hybrid acquisition model so protected/manual/search-only sources still feed the same canonical job pipeline without bypassing ingestion or access controls.

## Implemented

- Authenticated n8n email-ingestion webhook protected by a shared secret.
- `EmailIngestion` history, duplicate-message protection and recent/old/mixed classification.
- Structured multi-job email payloads feed `JobIngestion` one vacancy at a time.
- Optional later AI extraction for unstructured stored emails.
- User-owned manual source batches with ordered, conservative queueing.
- Internet-wide search through a configured search API.
- `SEARCH_ONLY` source runs search the source domain rather than crawling it directly.
- Search results are filtered conservatively and pass through normalization/deduplication.
- Unknown result domains are returned so the user can decide whether to add them to the source registry.

## Safety / access policy

Search-only and email modes are alternative acquisition routes, not anti-bot bypasses. Restricted/email sources are not silently converted back into crawlers.

## Process flow

Open `docs/flows/milestone-09-hybrid-acquisition.mmd`.

## Manual checklist

- [ ] n8n webhook rejects the wrong ingestion secret.
- [ ] Duplicate Gmail/message IDs are rejected.
- [ ] One email containing several vacancies produces several raw listings.
- [ ] Email freshness distinguishes old jobs from newly received emails.
- [ ] Manual batch queues only runnable sources.
- [ ] Manual batch does not queue EMAIL/RESTRICTED/DISABLED sources.
- [ ] Web search is disabled cleanly when no API key is configured.
- [ ] SEARCH_ONLY never directly crawls the protected target source.
- [ ] Every acquisition path ends at `JobIngestion`.
