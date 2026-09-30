# Validation Notes — Milestones 5–8

Validation performed before packaging the cumulative Milestone 8 repository on 2026-09-24.

## Completed in the build environment

- Project structure check: passed with 46 research sources.
- Preserved Python reconnaissance tests: 3 passed.
- TypeScript/TSX syntax transpilation: 88 implementation/test files, 0 syntax diagnostics (`.d.ts` declarations excluded from transpile-only checking).
- Relative TypeScript import resolution: 0 missing local imports.
- Prisma schema structural check: 26 models and 28 enums.
- Mermaid source check: 10 diagrams present, including Milestones 5, 6, 7 and 8.

## Package-dependent checks

The build environment could not complete `npm install` because npm registry access timed out, and the required packages were not available in the local npm cache. Therefore the following dependency-aware checks are intentionally **not** reported as passing:

```bash
npm run db:generate
npm run typecheck
npm run lint
npm run format:check
npm test
npm run web:typecheck
npm run web:lint
npm run web:build
```

Run those commands after installing the root and `web/` dependencies locally. Prisma generation should be run before dependency-aware TypeScript checks because the backend imports generated Prisma models and enums.

## Local verification order

```bash
npm install
npm run db:generate
npm run typecheck
npm run lint
npm run format:check
npm test

cd web
npm install
npm run typecheck
npm run lint
npm run build
```
