# Milestone 0 — Source Research

## Goal

Collect evidence about real job sources before deciding how the production acquisition system should access them.

## Included work

The original UAE teaching-source audit has been preserved under:

```text
research/source-audit/
```

It includes the source registry, objective source checks, second-stage AI review prompt, and detector tests.

## Acquisition philosophy

The research tool does not try to bypass CAPTCHA, login requirements, access controls, or rate limiting. If a source resists automation, that becomes classification evidence for EMAIL, MANUAL_BATCH, SEARCH_ONLY, RESTRICTED, or DISABLED.

## Process flow

View `docs/flows/milestone-00-source-research.mmd` with:

```bash
npm run docs:dev
```

## Status

Research package imported. Repeated live audit runs are still required before source classifications should be treated as production decisions.
