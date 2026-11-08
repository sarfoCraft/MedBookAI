# MedBook AI v2.7.1 — Security & Reliability Fix Release

This maintenance release addresses security and reliability defects found during an independent review of v2.7. It preserves the existing application UI and the Express/Prisma/PostgreSQL architecture.

## Fixed

- **Doctor resource isolation:** incoming prescriptions, patient timeline events and encounters are now checked against trusted server-side patient and appointment relationships. A doctor cannot append or alter records for another provider's patient by forging submitted IDs.
- **Appointment ownership protection:** doctor updates cannot change an appointment's patient, assigned provider or branch. New doctor bookings are limited to patients already assigned to that provider and branch.
- **Billing branch isolation:** invoice reads and writes are scoped through the linked appointment's branch and patient relationship. Unlinked invoices are restricted to patients in the billing user's branch. Invoice patient/appointment reassignment is rejected.
- **Receptionist booking protection:** new appointments must use a doctor assigned to the receptionist's branch and a patient in that branch. Existing appointments cannot be moved to another patient or branch.
- **Server-side branch validation:** appointments with a branch must reference a doctor/provider profile assigned to that same branch.
- **Save queue reliability:** validation, payload-size, expired-trial, authentication and version-conflict responses pause automatic retries rather than causing immediate repeated requests. Network retries stop after five attempts; pending changes remain queued for manual retry.
- **No-Show correction date logic:** attendance correction now uses the actual clinic-local date supplied by the application instead of a far-future sentinel date, so future appointments cannot be treated as missed appointments.
- **Regression coverage:** added tests for cross-doctor prescriptions, timeline entries, encounters, appointment ownership, cross-branch billing, receptionist doctor/branch validation and future No-Show correction.

## Validation performed

- `npm run check` — passed.
- `npm run test:domain` — passed, 25 tests.
- JavaScript syntax checks — passed for all files included in the project check script.

## Not verified in this environment

- Jest/Supertest suite, because project dependencies were not installed; dependency installation did not complete within the available environment.
- Prisma client generation, PostgreSQL migrations, live API/database integration, browser end-to-end testing and production deployment.
- Healthcare regulatory compliance or penetration-test certification.

This release is a source-code hardening update, not a claim of production certification. Complete the database, browser, security and operational checks in the target deployment environment before using real patient information.
