# Validation — v1.8 v1.7-UI Career Intelligence

## Baseline provenance

This build was created from the exact `job-intelligence-platform-v1.7-full-logic-ui.zip` recovered from the user's Library. Milestones 21–23 and 24–32 were merged into that tree additively.

The primary shell (`web/src/App.tsx`) was compared with the exact v1.7 file. Its only intentional shell-level change is importing/rendering the Product Tour overlay. The v1.7 sidebar, navigation taxonomy and page-routing structure remain intact.

## Executed successfully in this environment

- `npm run project:check` — passed with 46 research sources.
- `npm run ui:check` — passed; v1.7 shell/navigation markers are intact and legacy-shell markers are absent.
- TypeScript/TSX syntax transpilation — **151 files, 0 syntax errors**.
- Relative import resolution — **361 imports, 0 missing**.
- Prisma structural sanity — **51 models, 44 enums, no duplicate model/enum definitions**.
- Browser Companion JavaScript syntax — `background.js`, `options.js`, `popup.js`, and the application-assistant helper passed `node --check`.
- Source-audit tests — **3/3 passed**.

## Full dependency-aware checks not claimed here

Repository-local npm dependencies are not installed in this container. Global `tsc` stops at missing project type packages (`vite/client`, `node`, `vitest/globals`) before it can perform a complete semantic project typecheck.

After installation run:

```bash
npm install
npm --prefix web install
npm run ci
```

That performs Prisma generation, backend/frontend semantic typechecking, ESLint, Prettier, Vitest, Mermaid viewer build and Vite production build.
