# MedBook AI v2.7 — Changelog

## Security and account access

- Added `STAFF` role and individual Owner/Admin/Doctor/Receptionist/Billing/Auditor/Staff account provisioning.
- Added provider and branch assignments to user accounts.
- Added `/api/users` list/create/update endpoints with Owner/Admin authorization, bcrypt password hashing and session revocation on deactivation/permission changes.
- Added role/branch-scoped state filtering and backend write restrictions.
- Added branch-limited Auditor audit feed.
- Added append-only PostgreSQL audit-event trigger and actor role, reason, previous values and new values fields.

## Appointment lifecycle and DOS

- Added lifecycle transition validation and automatic UI No-Show display for past scheduled appointments.
- Added No-Show attendance correction with required reason and history.
- Added appointment cancellation with required reason, retained history and non-billable status.
- Preserved No-Show analytics/audit events when a past missed booking is rescheduled.
- Added server-managed completion timestamps, DOS actor IDs and an explicit DOS verification flag.
- All legacy v2.6 DOS values without the explicit v2.7 verification flag are flagged unverified and remain visible for clinician review; historical dates are preserved but excluded from billing/superbill eligibility until verified with a reason.
- Added clinic timezone storage and clinic-local date validation.
- Added Actual DOS correction with required reason and append-only DOS history.
- Added reschedule/cancellation timestamps and clinic-local event dates.
- Added immutable appointment schedule fields and deletion protection for historical patients, appointments, invoices and clinical records.
- Strengthened invoice/encounter/patient/doctor/branch references and financial validation.

## Billing and dashboard

- New invoices require a completed appointment with a verified Actual DOS.
- Legacy invoices without an appointment link remain visible but cannot be created as new invoices.
- Superbill/doctor dashboard lists identify completed visits missing a verified DOS.
- Doctor Dashboard now includes bookings, completed visits, No-Shows, rescheduled and cancelled appointments with daily, weekly, monthly and all-time ranges.
- Added distinct patient counts alongside appointment/visit counts.

## Reliability and operations

- Added single-flight autosave queue, latest snapshot coalescing, retry/backoff, offline retention, manual retry and version-conflict handling.
- Server returns the canonical role-scoped state after a successful save.
- Backup restore now requires an active trial/subscription, validates checksum/schema/version and writes a pre-restore backup.
- Updated package version, app labels, README, security notes and migration.
- Added Node built-in domain/access tests and expanded Jest/Supertest/state-schema test cases.

## Database migration

`prisma/migrations/202611070002_hardening/migration.sql` adds:

- `STAFF` enum value.
- Organization timezone.
- User provider/branch fields and indexes.
- Audit actor role, reason, previous/new values and resource index.
- Append-only audit trigger.

The migration is additive and does not delete existing database records. Take a verified backup before applying it to an existing clinic database.
