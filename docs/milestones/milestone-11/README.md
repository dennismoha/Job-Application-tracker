# Milestone 11 — Trust and Risk Tracking

## Goal

Let users keep evidence-backed trust warnings for sources, companies and jobs without turning one user's judgement into a global accusation.

## Implemented

- Risk reports for exactly one source, company or job.
- GREEN / YELLOW / ORANGE / RED / UNKNOWN levels.
- Structured risk-reason categories plus human explanation and optional evidence URL.
- User-scoped listing and deletion of risk reports.
- Effective per-user risk calculation.
- Job/company trust controls in the job detail panel.
- Source trust action in the source registry.

## Important boundary

`systemRiskLevel` is reserved for administrator/system evidence. User-created `RiskReport` records remain user-specific.

## Process flow

Open `docs/flows/milestone-11-trust-risk.mmd`.

## Manual checklist

- [ ] User can mark a job with a reason.
- [ ] User can mark the hiring company separately.
- [ ] User can mark a source separately.
- [ ] Report requires exactly one target.
- [ ] Another user's risk report is not exposed.
- [ ] Deleting a user report does not change system risk.
