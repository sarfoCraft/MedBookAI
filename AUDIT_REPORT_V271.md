# MedBook AI v2.7.1 — Patch Verification Report

## Scope

Applied targeted fixes to the v2.7 project after the independent review identified cross-provider access, cross-branch billing, save retry and No-Show correction weaknesses. Existing UI files, styles, assets, database schema and migration history were retained unless noted below.

## Source files changed

- `src/lib/access.js` — fail-closed branch checks; trusted-record-based array/object merges; provider/patient/appointment ownership checks; invoice scope derived from linked appointment branch.
- `src/lib/snapshot.js` — defense-in-depth validation for Doctor, Receptionist and Billing writes; appointment ownership, encounter/prescription/timeline relationship and branch checks.
- `src/lib/state-schema.js` — appointment doctor/provider must be assigned to the selected branch when an appointment branch is supplied.
- `appointment-domain.js` — No-Show correction now requires the current clinic date to recognize a past scheduled appointment as an effective No-Show.
- `app.js` — clinic date passed to No-Show correction; save queue pauses on non-retryable responses and after retry exhaustion.
- `tests/domain.node.test.cjs` — added authorization and No-Show regression tests.
- `package.json`, `README.md`, `SECURITY.md`, `index.html`, `src/app.js` — patch version metadata and documentation updated to 2.7.1.

## Regression checks

| Check | Result |
|---|---|
| `npm run check` | PASS |
| `npm run test:domain` | PASS — 25/25 |
| Doctor cross-patient prescription write | Rejected |
| Doctor cross-patient timeline write | Rejected |
| Doctor cross-patient encounter write | Rejected |
| Doctor appointment ownership mutation | Rejected |
| Billing cross-branch invoice write | Rejected |
| Billing invoice reassignment | Rejected |
| Receptionist cross-branch doctor booking | Rejected |
| Future appointment No-Show correction | Rejected |
| Past scheduled effective No-Show correction | Accepted with reason |

## Remaining verification requirements

Dependencies were not installed in the working environment; `npm install --ignore-scripts --no-audit --no-fund` timed out. Therefore Jest/Supertest, Prisma generation, migrations and live API/database tests were not run. Browser-based workflows and deployment configuration were not exercised. These are explicitly unverified, not passed.

## Go-live note

Do not use this report as a certification. Before entering real patient information, run dependency installation, Prisma generation and migrations against a backed-up staging database; execute the complete Jest/API suite; test all roles in a browser; review HTTPS, secret management, backups, retention and applicable healthcare privacy/security obligations.
