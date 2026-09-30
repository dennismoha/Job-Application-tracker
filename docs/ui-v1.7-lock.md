# v1.7 UI Lock

The visual/navigation baseline is the exact `v1.7 Full Logic in Uploaded UI` build.

Future features must be added **inside** this shell. They must not restore the older Home / Opportunities / Discover shell or replace the chosen uploaded UI.

## Locked primary navigation

1. Dashboard
2. Jobs
3. Job Sites
4. Crawling
5. Universal Search
6. Applications
7. CVs
8. Extension
9. Analytics
10. Settings

## Extension rule

New capability should use progressive disclosure inside the existing surface:

- Job intelligence belongs in the existing Jobs table/drawer.
- Site applications/crawlers/runs belong in the existing Job Sites workspace.
- Application Packs, interview prep, contacts and offers belong in Applications.
- Evidence and CV-specific workflows remain connected to CVs/Application Packs.
- Skill-gap, market, strategy, offers and campaign reporting extend Analytics.
- Smart notifications extend Dashboard.
- Guided onboarding overlays the existing shell rather than replacing navigation.

## Regression check

Run:

```bash
npm run ui:check
```

The check verifies the v1.7 shell, page taxonomy and navigation markers and fails if known legacy shell markers return to `web/src/App.tsx`.
