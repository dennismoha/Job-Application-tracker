# Validation — v1.9 Job Source Architecture

This validation record corresponds to the cumulative v1.9 build that preserves the locked v1.7/v1.8 UI shell while restructuring the acquisition/application domain around Job Sources.

## Executed successfully

- `node scripts/check-project.mjs` — passed with 46 research Job Sources.
- `node scripts/check-v17-ui-shell.mjs` — passed. The v1.7 navigation/shell baseline remains intact.
- TypeScript/TSX syntax transpilation with the installed TypeScript compiler API — 151 source files checked; no syntax errors.
- Relative import resolution audit — 366 imports resolved; no missing local imports.
- Browser Companion JavaScript syntax — `background.js`, `options.js`, and `popup.js` passed `node --check`.
- Research source-audit tests — 3/3 passed.
- Prisma structural audit — 52 unique models and 45 unique enums; no duplicate model/enum declarations.
- Job Source schema markers verified: `SourceType`, `CollectionCapability`, `AcquisitionMethod`, `OrganizationSource`, listing acquisition method, and Application `foundSourceId` / `appliedSourceId`.
- Active-code legacy architecture audit — no `AcquisitionMode`, `SEARCH_ENGINE`, `acquisitionMode`, or `recommendedMode` references remain outside the migration that converts the historical database.

## Dependency-aware checks not completed in this environment

A real `npm install` was attempted but timed out before dependencies were installed. Therefore this record does **not** claim that Prisma generation, dependency-aware TypeScript, ESLint, Vitest, or Vite production build passed here.

Run locally after installing dependencies:

```bash
npm install
npm --prefix web install
npm run db:generate
npm run typecheck
npm run lint
npm test
npm run web:typecheck
npm run web:lint
npm run web:build
```

Apply the included Prisma migration before relying on v1.9 database fields in a migrated environment.
