# v1.0 validation record

Validated on 2026-09-24 in the build environment used to package this repository.

## Completed offline checks

- Project structural checker passes and confirms the 46-source research registry.
- Both root and web `package.json` files parse as valid JSON.
- 128 TypeScript/TSX files parse successfully with the installed TypeScript compiler API.
- Relative TypeScript/JavaScript import targets resolve inside the repository.
- Prisma schema contains 29 models and 29 enums with balanced model/enum blocks.
- 16 Mermaid source diagrams have recognized Mermaid diagram headers.
- Docker Compose, GitHub Actions CI, and the research YAML checklist parse as valid YAML.
- Preserved Python source-audit tests pass: 3/3.
- Final ZIP is tested with `unzip -t` before delivery.

## Dependency-aware checks to run after download

The packaging environment could not complete npm registry access, so dependencies were not available to execute Prisma generation, dependency-aware TypeScript checking, ESLint, Prettier, Vitest, Mermaid/Vite builds, or the React production build here.

Run these after `npm install` and `npm --prefix web install`:

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

The GitHub Actions workflow runs the same quality path and bootstraps a temporary test schema with `prisma db push --skip-generate`.

## Prisma migration baseline

The schema is complete, but a generated Prisma migration is not fabricated without the installed Prisma CLI. See `prisma/migrations/README.md`. The first empty Docker deployment can bootstrap with `db push`; generate and commit the baseline migration before subsequent production schema upgrades.
