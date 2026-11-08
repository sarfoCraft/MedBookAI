# MedBook AI v2.7.2 — Security Notes and Go-Live Checklist

## Implemented in v2.7, v2.7.1 and v2.7.2

- v2.7.1 validates submitted Doctor clinical records against trusted patient/appointment ownership, scopes Billing invoices by linked appointment branch, enforces doctor-to-branch assignment and pauses auto-save on non-retryable errors.

## Implemented in this release

- Individual Owner/Admin/Doctor/Receptionist/Billing/Auditor/Staff accounts.
- Firebase Authentication for newly provisioned accounts when configured; legacy accounts retain bcrypt password hashes (12 rounds). New account passwords require at least 14 characters.
- Firebase ID-token verification with revocation checks and explicit Firebase UID-to-Prisma user mapping; PostgreSQL-backed server sessions, HttpOnly/SameSite=Lax cookies, Secure cookies in production and session regeneration after sign-in.
- Account deactivation, password changes or role/provider/branch changes revoke existing sessions; Firebase-linked accounts also have Firebase refresh tokens revoked and disabled state synchronized.
- CSRF token validation, same-origin checks, login/API/restore rate limits and Helmet security headers.
- Organization ID is derived from the authenticated session, never from the request body.
- Server-side branch/provider scoping for state reads and role-limited state writes. Doctor access is limited to the assigned provider and related appointments/patients; Receptionist, Billing and Auditor access is branch-scoped.
- Clinic snapshots and stored backups encrypted using AES-256-GCM before database writes.
- Strict state schema, safe JSON checks, 12 MB state limit and 13 MB request-body limit.
- Optimistic version checks, transactional state + audit writes and queued frontend saves with retry/backoff.
- Server-managed trial expiry; uploaded backup JSON cannot alter subscription/trial or user accounts.
- Backup restore requires Owner/Admin authorization, active trial/subscription, validated schema, expected version and a pre-restore snapshot; v2.7.1 backups must include a matching integrity checksum (legacy backups are schema-validated).
- Appointment lifecycle, DOS, invoice/encounter references, duplicate IDs, doctor/branch references and invoice line totals validated on the backend. Legacy v2.6 DOS values are flagged unverified until explicitly verified by an authorized clinician with a reason.
- Existing patients, appointments, invoices, encounters and selected historical records cannot be deleted through a state snapshot update.
- Server-side audit events capture actor ID, organization, role, action, entity, reason, timestamp and safe previous/new values. PostgreSQL triggers reject ordinary application UPDATE/DELETE of audit rows.
- Static serving exposes the frontend assets only; backend source, environment files and Prisma migrations are not served as static files.

## Firebase and database trust boundaries

- Firebase Web configuration (`FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`, `FIREBASE_APP_ID`) is public client configuration. Restrict the API key by authorized domains and APIs.
- `FIREBASE_SERVICE_ACCOUNT_JSON` is a private server credential. Never commit it, expose it to browser code, or send it to a client.
- The backend accepts a Firebase ID token only after Firebase Admin verifies its signature, expiry and revocation status. The decoded UID must match an explicit `User.firebaseUid` mapping in PostgreSQL.
- Firebase Authentication is not the application database. Prisma uses PostgreSQL for organizations, roles, clinic state, sessions, backups and audit events. Firestore is not used by this build.
- Legacy accounts without a Firebase UID continue to authenticate with bcrypt unless production configuration requires Firebase for Owner/Admin accounts. Plan a controlled migration/reset for all legacy accounts before removing the fallback.

## Not implemented / not certified

This package is **not HIPAA-certified** and does not by itself establish HIPAA, HITECH, GDPR or other regulatory compliance. Remaining controls include:

- MFA, password reset/account recovery, password history and step-up authentication.
- PostgreSQL row-level security (RLS), branch-specific timezones and a fully normalized clinical data model. One organization-wide IANA timezone is enforced in this release. Current state remains a single encrypted JSONB snapshot per organization with server-side filtering.
- Independent security architecture review, threat model, penetration test, SAST/DAST and dependency vulnerability scan.
- Managed secrets/KMS, key rotation and formal key custody/recovery procedures.
- HTTPS reverse proxy, HSTS, database TLS/private networking and production monitoring/alerting.
- Immutable/WORM off-site audit retention and external audit export/review controls. Database owners/superusers can still bypass ordinary triggers.
- Secure file upload, malware scanning, encrypted object storage, retention/deletion policies and access logging.
- Off-site encrypted backups, recovery objectives and tested disaster-recovery drills.
- Clinical/legal validation, valid electronic signature workflow, payment processing, payer/claims integration and prescribing controls.

## Before real patient information is entered

- [ ] Have a qualified security engineer review the architecture and perform a threat model.
- [ ] Complete applicable HIPAA/HITECH/GDPR and local healthcare privacy obligations with qualified counsel/compliance staff.
- [ ] Execute BAAs with relevant hosting, database, backup, monitoring and service providers where required.
- [ ] Deploy behind HTTPS only; enable HSTS at the reverse proxy and configure `TRUST_PROXY` correctly.
- [ ] Use a managed private PostgreSQL service; block public database access and require TLS for database connections.
- [ ] Put session and encryption secrets in a secrets manager; establish key custody, rotation, recovery and access logging.
- [ ] Add MFA, secure password reset and step-up authentication.
- [ ] Review role/branch/provider scoping and add database-level RLS; test cross-tenant, cross-branch and cross-doctor access.
- [ ] Normalize patients, encounters, appointments, prescriptions, claims, invoices and documents into relational tables with foreign keys and transactions.
- [ ] Implement secure file upload, malware scanning, access-controlled object storage, retention and deletion policies.
- [ ] Configure encrypted off-site backups, retention, recovery objectives and regularly tested restore drills.
- [ ] Protect audit retention with a separate immutable/WORM store and monitor administrative access.
- [ ] Review all third-party scripts and external CDN dependencies, especially the embedded SnapText tools.
- [ ] Run SAST, dependency scanning, DAST, penetration testing, API authorization tests and browser E2E tests.
- [ ] Replace all synthetic seed records and demo coding/insurance values with validated production data sources.
- [ ] Obtain clinical workflow, coding, prescribing, billing and operational approval before go-live.

## Operational safeguards

- Never commit `.env` or send encryption/session keys in messages.
- Keep the encryption key separate from database backups. Database backups without the matching key cannot be decrypted.
- Downloaded JSON backups are plaintext. Store them encrypted and access-controlled.
- Do not treat the editable `state.auditLogs` UI array as the authoritative audit trail. Use the server-side `/api/audit` endpoint and protect database administration credentials.
- Do not rely on frontend navigation restrictions as authorization. The server enforces role/branch/provider access for clinic state, users, backups and audit events.
- The current JSONB state architecture is a compatibility bridge, not a scalable normalized EHR design.
