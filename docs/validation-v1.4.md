# Validation notes — v1.4 / Milestone 17

This file records what was actually validated in the build environment for the CV Intelligence handoff.

## Executed successfully

- project structure checker (`node scripts/check-project.mjs`);
- TypeScript/TSX syntax transpilation using the available global TypeScript compiler API;
- relative TypeScript import resolution check;
- Chrome/Firefox extension JavaScript syntax checks with `node --check`;
- existing Python source-audit tests (`3 passed`);
- JSON parsing for package/manifest configuration;
- structural Prisma schema checks for expected CV models/enums/relations;
- Mermaid source-file presence/basic directive checks;
- ZIP integrity tests.

## Dependency-aware validation boundary

The environment did not have project `node_modules`. An `npm install --ignore-scripts --no-audit --no-fund` attempt timed out while accessing the registry, so the following are **not claimed as executed here**:

```bash
npm run db:generate
npm run typecheck
npm run lint
npm run format:check
npm test
npm run docs:build
npm run web:typecheck
npm run web:lint
npm run web:build
```

Run these locally after installing dependencies. The CI script already runs the same full sequence.

## Milestone 17 manual checks

Follow `docs/milestones/milestone-17/README.md`, especially the tests for:

- PDF/DOCX upload parsing;
- job requirement extraction;
- `NEEDS_CONFIRMATION` behavior for qualifications not evidenced in the CV;
- save job + exact preferred CV version;
- CV tailoring without overwriting the original;
- PDF/DOCX preview/download;
- application exact CV-version tracking;
- Browser Companion job detection, CV comparison and tailoring handoff.
