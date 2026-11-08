# MedBook AI v2.7 — Project Audit Report

**Target:** Existing MedBook AI v2.6 Appointment & DOS Tracking project  
**Release name:** MedBook AI v2.7 — Production Hardening Release  
**Audit approach:** Source inspection, targeted implementation, static syntax checks and dependency-free domain/access tests.

## Executive result

The project has been updated in-place. The existing HTML/CSS/Vanilla JavaScript interface and Express/Prisma/PostgreSQL structure are retained. The v2.7 work focuses on the appointment lifecycle, Actual DOS, role/branch scoping, backup restore protection, server audit events, snapshot validation and autosave reliability.

**The dependency-free domain test suite contains 16 passing tests. This release is not verified production-ready.** The current environment could not install npm dependencies or run PostgreSQL, so Jest/Supertest, Prisma validation/migration, database integration and browser E2E tests remain unverified. Do not enter real patient data until the remaining controls in `SECURITY.md` are completed and independently reviewed.

## Findings and fixes

| Priority | Finding | v2.7 action | Status |
|---|---|---|---|
| Critical | Backup restore did not enforce an active trial/subscription | Added Owner/Admin authorization, active-trial middleware, checksum/schema validation, optimistic version check and pre-restore backup | Fixed in source; integration test added, not executed |
| Critical | Browser role restrictions were not real authorization | Added individual account provisioning and server-side role/branch/provider-scoped state access | Implemented; full API integration not executed |
| Critical | Doctor/branch data could be exposed through a shared clinic snapshot | Added server-side scope projection and role-specific write merge | Implemented; requires cross-tenant/branch penetration testing |
| High | DOS could be inferred from scheduled date/client date; v2.6 values may have been auto-filled from scheduled date | Completion dialog requires explicit Actual DOS; server validates clinic-local date, stamps actor/time and flags all legacy v2.6 values without an explicit v2.7 verification flag as unverified while preserving them | Implemented; browser/database integration not executed |
| High | DOS corrections had no reason/history controls | Added correction dialog, required reason, append-only history checks and audit event | Implemented; full API test not executed |
| High | Appointment status transitions were not centrally enforced | Added lifecycle transition matrix, same-day No-Show cutoff, cancellation reason and correction reason checks; retains missed event when rescheduled | Implemented; domain tests pass |
| High | Invoices/superbills could rely on appointment date rather than Actual DOS | New invoices require completed appointment + matching Actual DOS; state validation checks patient/appointment/DOS and line totals | Implemented; database integration not executed |
| High | State validation did not adequately verify references/duplicates/financial totals | Added duplicate ID, patient/doctor/branch, invoice/encounter/reschedule and financial integrity checks | Implemented in schema; Jest not executed |
| High | Concurrent autosaves could overwrite pending changes | Added single-flight save queue, coalescing, retry/backoff, conflict state, offline retention and canonical server response | Implemented in frontend; browser E2E not executed |
| High | Audit records could be changed/deleted through ordinary SQL updates | Added append-only trigger and actor/role/reason/previous/new fields | Migration written; not applied to a live database |
| Medium | Clinic date logic depended on browser timezone | Added organization IANA timezone, server clinic date/time and timezone-aware frontend clock | Implemented; timezone boundary tests still required |
| Medium | Version references and documentation were stale | Updated package/app labels, README, security notes and changelog to v2.7 | Fixed |
| Medium | Dependency lockfile was missing | Attempted dependency installation; registry was unreachable, so a valid lockfile could not be generated | Remaining |

## Detailed implementation map

### Backend and validation

- `src/app.js` — authentication, scoped state, save transaction, user endpoints, backup restore/export, audit feed and active-trial checks.
- `src/lib/state-schema.js` — strict snapshot schema and relationship/financial validation.
- `src/lib/access.js` — role/branch/provider scope projection and role-specific snapshot merge.
- `src/lib/snapshot.js` — lifecycle/role transition validation, server-managed appointment metadata and audit diff creation.
- `src/lib/time.js` — IANA timezone validation and clinic-local date helper.
- `src/lib/prisma-session-store.js` — existing PostgreSQL-backed session store retained.
- `src/lib/crypto.js` — existing AES-256-GCM snapshot encryption retained.

### Frontend

- `app.js` — existing UI retained; adds explicit DOS completion/correction dialogs, No-Show correction, Doctor Dashboard sections, account manager UI, role-specific actions and save queue.
- `api.js` — adds user account API methods and reason-aware state save.
- `appointment-domain.js` — central lifecycle transitions, automatic No-Show presentation, completion and correction rules.
- `styles.css` — existing styling retained; no full redesign performed.

### Database

- `prisma/schema.prisma` — STAFF role, organization timezone, user provider/branch assignment and audit fields/indexes.
- `prisma/migrations/202611070002_hardening/migration.sql` — additive migration and append-only audit trigger.
- `prisma/seed.js` — timezone-aware clinic seed configuration.

## Role permission summary

| Role | Scope | Main access |
|---|---|---|
| Owner | Whole clinic | All clinic features, user provisioning, backup/restore, audit |
| Admin | Whole clinic | Clinic operations, user provisioning, backup/restore, audit; cannot create Admin/Auditor accounts |
| Doctor | Assigned provider and related patients/appointments | Clinical workspace, encounters, prescriptions, follow-ups, Actual DOS and Doctor Dashboard |
| Receptionist | Assigned branch | Demographics, bookings, check-in, reschedule and attendance correction; no clinical encounter/DOS/invoice writes |
| Billing | Assigned branch | Billing and insurance; invoices must link to completed visits with Actual DOS |
| Auditor | Assigned branch | Read-only branch appointment/invoice audit events |
| Staff | Assigned branch | Read-only staff workspace in this release |

The role-scoped JSONB snapshot remains a compatibility layer. It is not equivalent to PostgreSQL RLS or row-level foreign-key authorization.

## Data preservation

- The new migration adds columns, indexes, an enum value and a trigger; it does not drop existing tables/columns or delete patient data.
- Snapshot writes reject deletion of existing patients, appointments, invoices, encounters, follow-ups, prescriptions, timeline records and stored patient maps.
- Rescheduling preserves the original appointment and creates a linked replacement.
- DOS and attendance correction histories are append-only at the application validation layer.
- Backup restore creates a pre-restore snapshot before replacing clinic state.

**Before applying the migration to an existing database, take and verify an encrypted database backup.**

## Remaining risks / limitations

1. The main clinical data remains one encrypted JSONB snapshot per clinic. It is not normalized for large-scale concurrent use.
2. PostgreSQL row-level security is not configured; authorization is enforced in the Express service layer.
3. MFA, password reset, step-up authentication and formal account recovery are not implemented.
4. No independent penetration test, dependency vulnerability scan, SAST/DAST, load test or threat-model review was run.
5. The new migration was not applied to PostgreSQL in this environment.
6. Full Jest/Supertest tests and state-schema tests were authored/updated but not executed because dependencies could not be installed.
7. Browser UI flows, print/PDF superbill output, concurrent browser sessions and timezone boundaries still need end-to-end verification.
8. Payment processing, claims submission, payer integration, file upload/storage and legally valid e-signatures are not included.
9. The project is not HIPAA-certified and must not be represented as compliant without independent assessment.

## Recommended verification before clinic use

1. Run `npm install` in a network-enabled environment and commit the generated `package-lock.json`.
2. Run `npm run check`, `npm run test:domain`, `npm test` and `npx prisma validate`.
3. Start PostgreSQL, apply migrations, seed a non-production clinic and run all API tests.
4. Create Owner/Admin/Doctor/Receptionist/Billing/Auditor/Staff test accounts across two branches.
5. Verify cross-branch, cross-doctor and cross-tenant access is denied.
6. Test booking → check-in → start → complete with a different Actual DOS → invoice → superbill.
7. Test past scheduled No-Show, same-day manual No-Show, attendance correction, rescheduling, cancellation and no-DOS billing rejection.
8. Test backup restore with active/expired trial, invalid checksum, malformed state and concurrent version conflict.
9. Test offline autosave, retry, queued latest snapshot and concurrent browser edits.
10. Complete independent security, privacy, clinical and regulatory review before real patient data is used.
