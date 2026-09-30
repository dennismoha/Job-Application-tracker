# Milestone 7 — Canonical Jobs and Deduplication

## Goal

Represent one real vacancy as one canonical `Job`, while keeping every website advertisement as a separate `JobListing`.

## Implemented

- Stable source-level listing keys.
- Repeated runs update an existing listing instead of inserting another copy.
- Listing revisions are retained when the content hash changes.
- Canonical company resolution by normalized company name.
- Candidate generation is limited to recent jobs rather than comparing against the whole database.
- Weighted comparison of company, title, location, description, application URL, requisition ID, dates and salary.
- Location contradictions act as hard negative evidence.
- Exact application URL and requisition-reference matches are high-confidence signals.
- Conservative automatic merge threshold.
- `JobListingMatch` records confidence, method, decision and evidence.
- Manual listing regrouping is available only for user-created jobs or sources the user manages.
- Private manual listings use user-scoped listing keys so identical URLs submitted by different users cannot overwrite each other.
- Private and public listings cannot be manually merged, preventing private source metadata from becoming public.

## Safety bias

The automatic deduplicator favors false negatives over false positives. Two temporary copies are preferable to incorrectly merging two separate vacancies and hiding an opportunity from the user.

## Process flow

Open `docs/flows/milestone-07-deduplication.mmd`.

## Manual checklist

- [ ] Same source/external ID remains one listing.
- [ ] Same apply URL across two sources can merge.
- [ ] Similar title at a different city does not merge automatically.
- [ ] Repeated content changes create revisions.
- [ ] Every automatic match stores evidence.
- [ ] User-controlled listings can be regrouped manually.
- [ ] Two users can save the same private manual URL without sharing a listing row.
- [ ] A private manual listing cannot be moved into a public canonical job.
