# Validation — v1.7 Full Logic in Uploaded UI

## Executed in this environment

The following checks were executed against the packaged source tree:

- `node scripts/check-project.mjs` — passed; the research registry contains 46 sources.
- TypeScript/TSX syntax transpilation using the installed TypeScript compiler API — 139 source files checked with no syntax errors.
- Relative import resolution check — 330 relative imports resolved.
- Browser Companion JavaScript syntax — `background.js`, `options.js`, and `popup.js` passed `node --check`.
- Source-audit tests — 3/3 passed from `research/source-audit`.
- Prisma structural count — 38 models and 34 enums.
- Mermaid documentation structure — 22 flow files present; Milestone 20 flow exists.
- Milestone documentation — 21 milestone READMEs present, including Milestone 20.

## Dependency-aware checks not executed here

This environment does not contain this repository's local npm dependencies. Therefore this validation does **not** claim that the following commands passed in this container:

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

Run these after installing dependencies locally:

```bash
npm install
npm --prefix web install
npm run ci
```

If Prisma migrations have not yet been generated for a fresh environment, generate/apply the appropriate migration before production deployment rather than treating structural schema checks as a substitute for Prisma validation.
