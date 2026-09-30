# AI review prompt for one audit run

Use this only after `inspect_all.py` has produced JSON. The Python checker is responsible for objective signals; AI should interpret the evidence without inventing missing facts.

## Instructions

For every source in the attached audit JSON:

1. Read the HTTP, structure, ATS, JSON-LD, login, challenge, alert, and subject signals.
2. Do not interpret a failed request or zero visible jobs as proof that the source has no vacancies.
3. Do not recommend bypassing CAPTCHA, login controls, rate limits, robots restrictions, or anti-bot protections.
4. Recommend exactly one primary acquisition mode from:
   - AUTO
   - EMAIL
   - ACCOUNT
   - MANUAL_BATCH
   - SEARCH_ONLY
   - RESTRICTED
   - DISABLED
5. Optionally provide one fallback mode.
6. State the evidence supporting the decision.
7. Flag any source requiring a manual browser check.
8. Flag sources where the canonical employer/ATS source should replace an aggregator.
9. Evaluate relevance for Mathematics, Chemistry, Science, and Homeroom/Primary roles.
10. Assign confidence: HIGH, MEDIUM, or LOW.

## Required output fields

- source_id
- name
- primary_mode
- fallback_mode
- confidence
- subject_relevance
- canonical_source_assessment
- manual_browser_check
- evidence
- notes
