# MedBook AI v2.7.2 — Firebase Auth + Prisma Demo Release

MedBook AI v2.7.2 is a Firebase Authentication and production-setup update to the existing MedBook v2.7 clinic workspace. It preserves the current HTML/CSS/Vanilla JavaScript interface and Express/Prisma/PostgreSQL architecture. It does **not** replace the application with a new product or normalize the complete clinical data model.

> **Clinical-data notice:** The included patients, appointments, provider profiles, insurance details, invoices, codes and notes are fictional sample records. This is not a certified EHR/EMR and is not a declaration of HIPAA, HITECH, GDPR or other regulatory compliance. Do not enter real patient information until the remaining security, privacy, clinical, legal and operational controls in `SECURITY.md` have been independently reviewed.

## v2.7 baseline changes (retained)

See `CHANGELOG_V271.md` for the v2.7.1 security and reliability fixes.

### Appointment lifecycle and Actual DOS

- Supported statuses: `scheduled`, `arrived`, `in-consultation`, `completed`, `checked-out`, `no_show`, `rescheduled`, `cancelled`.
- A `scheduled` appointment whose clinic-local scheduled date has passed is displayed as **No-Show**. The persisted status is not silently rewritten just because the calendar date changed.
- A same-day missed appointment can be explicitly marked No-Show after its scheduled end time. A future appointment cannot be marked No-Show.
- Rescheduling preserves the original appointment as `rescheduled`, creates a new `scheduled` appointment and links both records with `rescheduled_from_id` / `rescheduled_to_id`. If the original booking was already missed, its No-Show event remains visible in the No-Show dashboard even after rescheduling.
- Attendance corrections require a reason, are retained in `attendanceCorrectionHistory`, and create a server audit event.
- Scheduled/arrived appointments can be cancelled with a reason; cancelled appointments remain in history and cannot be billed.
- Appointment lifecycle transitions and immutable scheduled details are validated on the backend. Existing appointments cannot be deleted from the state snapshot.
- `actual_date_of_service` is not copied from the booking date. A clinician must confirm the date in the **Complete Consultation** dialog when moving `in-consultation` to `completed`.
- DOS is checked against the clinic's IANA timezone and cannot be in the future. A correction to a finalized or legacy-missing DOS requires a reason and an appended `dosHistory` record.
- The server stamps completion/correction timestamps and actor IDs. The browser cannot authoritatively set those audit fields.
- Invoices and superbills use the linked completed appointment's Actual DOS. New invoices require an appointment with a valid Actual DOS. Legacy unlinked invoices remain visible for reference but cannot be created as new invoices.

### Doctor Dashboard

The Doctor Dashboard separates:

1. **Total New Bookings** — counted by booking-created date.
2. **Visited / Completed** — counted by `actual_date_of_service`.
3. **No-Shows** — counted by scheduled appointment date.
4. **Rescheduled Appointments**.
5. **Cancelled Appointments**.

Daily, weekly, monthly and all-time filters are available. Summary cards also show distinct patient counts so repeat visits are not mistaken for unique patients. Completed visits missing a verified DOS are listed separately and excluded from billing/superbill exports.

### Individual accounts and role-based access

- Roles: `OWNER`, `ADMIN`, `DOCTOR`, `RECEPTIONIST`, `BILLING`, `AUDITOR`, `STAFF`.
- Owner/Admin can create individual accounts from **Team & Roles → Login Accounts**. Staff directory records alone do not grant login access.
- Doctor accounts are assigned to one provider profile and clinic branch. Doctor state views include only their assigned appointments and related patient/encounter records; new bookings must belong to that provider and branch.
- Receptionist accounts are branch-scoped and can manage demographic/administrative patient details, bookings, check-in, rescheduling and attendance correction. They cannot edit clinical encounters, finalize DOS or create invoices.
- Billing accounts are branch-scoped and can manage invoices/insurance records. New invoices must link to a completed appointment with Actual DOS.
- Auditor accounts are branch-scoped and read-only. Their audit feed is limited to appointment/invoice events in their assigned branch.
- Staff accounts are branch-scoped and read-only in this release.
- Backend authorization is authoritative. Frontend navigation restrictions are supplementary only. Role/branch/provider changes and account deactivation revoke existing sessions.

### Backend and data integrity

- Organization/tenant scoping remains enforced by the authenticated session.
- State writes use optimistic version checks and transactional snapshot + audit writes.
- State validation checks duplicate IDs, patient/doctor/branch references, appointment status/date/time/DOS, reschedule links, invoice and encounter relationships, and financial line totals.
- Existing patients, appointments, invoices, encounters, follow-ups, prescriptions, timeline entries and stored patient-document maps cannot be deleted through a snapshot update. Archive/void workflows should be used instead.
- Backup restore validates the backup checksum/schema and clinic state, requires an active trial/subscription and Owner/Admin authorization, checks the expected version, and creates a pre-restore backup before changing the state.
- Expired clinics can sign in read-only and export backups, but cannot restore backups or save clinic changes.
- Server-side audit events include actor, organization, role, action, entity, previous/new safe values, reason and timestamp. PostgreSQL triggers block direct audit-event updates/deletes during ordinary application operations.
- Autosave uses a single-flight queue, latest-snapshot coalescing, optimistic conflict detection, retry with backoff, offline retention and a manual Retry Save control.

## Technology

| Layer | Technology |
|---|---|
| Frontend | Existing HTML, CSS and Vanilla JavaScript |
| API | Node.js 20+, Express 4 |
| ORM | Prisma 6 |
| Database | PostgreSQL 16 |
| Authentication | Firebase Authentication (email/password) + Express server sessions; bcrypt retained for legacy accounts |
| Encryption | Node.js crypto, AES-256-GCM |
| Validation | Zod |
| Automated tests | Jest + Supertest; Node.js built-in test runner for pure domain/access tests |

## Local setup (Windows 10/11, macOS or Linux)

### 1. Prerequisites

- Node.js 20 or newer and npm.
- Docker Desktop for the included local PostgreSQL container, or a PostgreSQL 14+ database.

### 2. Extract the project

Extract the ZIP and open a terminal in the project folder. Keep `assets/` and `snaptext-tools/` in their original locations.

### 3. Configure environment

PowerShell:

```powershell
Copy-Item .env.example .env
npm install
npm run generate:secrets
```

Copy the generated `SESSION_SECRET` and `DATA_ENCRYPTION_KEY` into `.env`. Set unique values for the clinic and owner:

```dotenv
SEED_ORG_NAME="Your Clinic Name"
SEED_ORG_TIMEZONE="America/Los_Angeles"
SEED_OWNER_NAME="Clinic Owner"
SEED_OWNER_EMAIL="owner@yourclinic.com"
SEED_OWNER_PASSWORD="Use-A-Unique-Password-At-Least-14-Chars!"
TRIAL_DAYS=30
```

`SEED_ORG_TIMEZONE` must be a valid IANA timezone such as `America/Los_Angeles`, `Asia/Karachi` or `Europe/London`. It is the authoritative organization-wide timezone used for no-show evaluation, DOS validation and dashboard date boundaries. Branch-specific timezones are not independently enforced in this release; configure one timezone shared by the clinic branches. For Firebase sign-in, also fill `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`, `FIREBASE_APP_ID` and the server-only `FIREBASE_SERVICE_ACCOUNT_JSON`; see the Firebase setup section below. Never commit `.env` or share private credentials. The seed command rejects the example placeholder password.

### 4. Start PostgreSQL

```powershell
docker compose up -d postgres
```

This starts only the local PostgreSQL 16 database on port `5432`, allowing you to run the Node API directly with `npm start` in the next step. Its password is for local development only. Change it before using a remote/shared environment and update `DATABASE_URL` accordingly.

### 5. Apply migrations and create the owner account

```powershell
npx prisma generate
npm run db:deploy
npm run db:seed
```

The seed command creates the clinic organization and one Owner account. When Firebase Admin credentials and Firebase Web config are present, the Owner is created/linked in Firebase Authentication and mapped to the Prisma `User.firebaseUid`. Without Firebase credentials, local development falls back to the legacy bcrypt login. It does not create a universal/default login. Existing clinics should take a verified backup before applying the new migration.

### 6. Start MedBook

```powershell
npm start
```

Open `http://localhost:3000` and sign in with the Owner email/password from `.env`. If Firebase is configured, the browser signs in with Firebase and the Express API verifies the Firebase ID token before creating the server session.

For development with automatic server restart:

```powershell
npm run dev
```

## API endpoints

All write endpoints are same-origin and require the `X-CSRF-Token` returned by `GET /api/auth/session` or a successful sign-in response. The frontend API client handles this automatically.

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | API/database health check |
| GET | `/api/auth/session` | Session status and CSRF token |
| POST | `/api/auth/login` | Individual account sign-in |
| POST | `/api/auth/logout` | End current session |
| GET | `/api/state` | Load role/branch-scoped clinic state |
| PUT | `/api/state` | Validate and save a versioned state snapshot |
| GET | `/api/users` | Owner/Admin list clinic accounts |
| POST | `/api/users` | Owner/Admin create an account |
| PATCH | `/api/users/:id` | Owner/Admin update role, assignment, password or active status |
| GET | `/api/backup/export` | Owner/Admin export clinic JSON backup |
| POST | `/api/backup/restore` | Owner/Admin restore a validated backup (active trial required) |
| GET | `/api/audit` | Owner/Admin audit feed; Auditor sees branch-limited appointment/invoice events |

### Save request

```json
{
  "expectedVersion": 4,
  "reason": "Corrected the recorded Actual DOS after reviewing the signed chart.",
  "state": {
    "patients": [],
    "appointments": [],
    "followups": [],
    "staff": [],
    "providers": [],
    "practices": [],
    "soapTemplates": [],
    "textPatterns": [],
    "invoices": [],
    "auditLogs": [],
    "feedback": [],
    "prescriptions": [],
    "patientTimeline": [],
    "encounters": {},
    "signatures": {},
    "documents": {},
    "insurance": {},
    "intakeConsents": {},
    "nextSoapTemplateId": 1,
    "nextTextPatternId": 1,
    "customAccent": null
  }
}
```

A successful save increments the version and returns the canonical role-scoped state. If another session saved a newer version, the API returns `409 Conflict`; the client retains queued changes and asks the user to reload rather than overwriting newer data. Trial expiry returns `402` for write operations while read and backup export remain available.

## Firebase Authentication + Prisma/PostgreSQL setup

This release uses **Firebase Authentication for identity** and **Prisma + PostgreSQL for application data**. Firestore is not used. Prisma does not connect directly to Firebase Authentication or Firestore; the API verifies Firebase ID tokens and maps the verified UID to a `User` row in PostgreSQL.

### 1. Configure Firebase

1. Create a Firebase project in the Google Firebase Console.
2. Open **Authentication → Sign-in method** and enable **Email/Password**.
3. Register a Firebase Web App and copy its `apiKey`, `authDomain`, `projectId` and `appId` into `.env`.
4. In **Project settings → Service accounts**, generate a private service-account key for the backend. Put the complete JSON in `FIREBASE_SERVICE_ACCOUNT_JSON` as one line, or set `GOOGLE_APPLICATION_CREDENTIALS` to a private local JSON file path.
5. Never commit the service-account JSON or share it with the client. Restrict the Firebase Web API key to your demo domain and required APIs in Google Cloud.

### 2. Configure PostgreSQL and secrets

- Set `DATABASE_URL` to your PostgreSQL connection string. For production, use a managed PostgreSQL database with TLS and private networking where supported.
- Generate `SESSION_SECRET` and `DATA_ENCRYPTION_KEY` with `npm run generate:secrets`.
- Set a unique `SEED_OWNER_EMAIL` and `SEED_OWNER_PASSWORD` (at least 14 characters).
- Set `REQUIRE_FIREBASE_AUTH=true` in production only after the Firebase Web App and Admin SDK credentials are configured.
- Optionally set `FIREBASE_REQUIRE_EMAIL_VERIFIED=true` after enabling and testing email verification.

### 3. Apply the database migration and create the Owner

```bash
npm install
npx prisma generate
npm run db:deploy
npm run db:seed
npm start
```

The seed command creates the clinic Owner in PostgreSQL and, when Firebase Admin is configured, creates or links the matching Firebase Authentication account by email. The verified Firebase UID is stored in `User.firebaseUid`. New accounts created from **Team & Roles → Login Accounts** are also provisioned in Firebase when the Admin SDK is configured. Password updates and account deactivation are synchronized to Firebase, and refresh tokens are revoked when access-affecting account settings change.

Existing accounts without a `firebaseUid` continue to use the legacy bcrypt login until they are explicitly linked/migrated. Do not link a Firebase account to a database user by email alone at runtime; the seed/admin provisioning step performs the explicit mapping.

### 4. Client configuration and hosting

The Firebase Web API key is public client configuration, not a server secret. The Firebase service-account private key, `DATABASE_URL`, `SESSION_SECRET` and `DATA_ENCRYPTION_KEY` are server secrets and must be configured only in the hosting provider's secret/environment settings.

GitHub stores source code and runs CI; it does not host this Express API or PostgreSQL database. See `GITHUB_UPLOAD.md` for the safe first-push commands. Deploy the Node.js app using the included `Dockerfile` on a Docker-capable Node host, and provide a reachable PostgreSQL database. Do not deploy this project to GitHub Pages as a static-only site: the login, Prisma API and session store require a running Node server.

## Docker demo

1. Copy `.env.example` to `.env`.
2. Run `npm run generate:secrets` and paste the generated values into `.env`.
3. Fill the Firebase settings if you want Firebase sign-in. Set `REQUIRE_FIREBASE_AUTH=true` only after testing Firebase login.
4. Run `docker compose up --build` and wait for the PostgreSQL health check and API startup.
5. In a second terminal, run `docker compose exec medbook npm run db:seed` to create the clinic Owner account.
6. Open `http://localhost:3000`.

The Compose file runs a local PostgreSQL container and the MedBook API. Its database password is for local development only. For a hosted demo, replace it with a managed PostgreSQL service and production secrets.

## Database design and current architectural limitation

- `Organization`: clinic identity, trial/subscription dates and timezone.
- `User`: individual account, optional legacy bcrypt password hash, Firebase UID, role, provider and branch assignment.
- `Session`: server-side session data and expiry.
- `ClinicState`: one encrypted JSONB snapshot per organization, with a version number.
- `Backup`: encrypted backup copies, including pre-restore snapshots.
- `AuditEvent`: append-only server-side audit records.

The existing UI uses a large in-memory state object. v2.7 retains that compatibility bridge and adds server-side role/branch filtering around it. It is **not** a fully normalized EHR schema. Before scaling or entering real patient information, migrate patients, appointments, encounters, prescriptions, claims, invoices and documents into relational tables with foreign keys, database row-level security and resource-level authorization. The current JSONB snapshot approach also makes fine-grained concurrent editing more limited than normalized tables. Only one organization-wide timezone is enforced; branch-specific timezone scheduling remains future work.

## Trial and billing

- Trial begins when the clinic is seeded; `TRIAL_DAYS` supports 1–90 days.
- The authoritative expiry is stored in PostgreSQL.
- After expiry, users can sign in read-only and export data. State saves, user provisioning/updates and backup restore are blocked.
- No payment gateway, payer clearinghouse, claims submission or live payment ledger is included.
- The UI does not activate paid status. A verified subscription must be activated by a future billing integration or controlled administrator operation.

## Backup and restore

1. Select **Backup All Data** in the sidebar (Owner/Admin only).
2. Store the downloaded JSON in an access-controlled, encrypted location. The downloaded file is readable JSON; database encryption does not encrypt a copy after download.
3. Select **Restore from Backup** and choose a MedBook JSON export. The server validates checksum/schema/relationships, checks the expected version and active trial, writes a pre-restore backup, then restores the state.
4. Uploaded backup data cannot change the clinic trial, subscription or user accounts.

Do not email backups or store them in a public/shared folder. Off-site encrypted backups and tested recovery drills remain required for production.

## Tests and validation

Run after installing dependencies:

```powershell
npm run check
npm run test:domain
npm test
```

Or run the combined command:

```powershell
npm run test:all
```

- `npm run check` executes Node syntax checks for frontend, backend, seed and domain modules.
- `npm run test:domain` runs dependency-free Node tests for lifecycle transitions, DOS, scoped data access and role boundaries.
- `npm test` runs Jest/Supertest API, state-schema, trial and encryption tests.
- `npx prisma validate` and `npx prisma migrate deploy` require installed Prisma dependencies and a reachable database.

The npm registry was unreachable in the preparation environment, so dependency installation and lockfile generation could not be completed here. Run `npm install` in a network-enabled environment; commit the generated `package-lock.json`, then use `npm ci` for repeatable CI/deployments. Run Prisma validation/generation, migrations and the complete Jest/API suite in a staging environment with PostgreSQL before deployment. See `BUILD_VALIDATION_V272.txt` for the verification status of this package.

## Remaining production work

- MFA, secure password reset and step-up authentication for Firebase and legacy accounts.
- Database-level row-level security and normalized clinical resources.
- Independent penetration test, SAST/DAST and dependency vulnerability scan.
- Managed key storage/rotation, HTTPS reverse proxy, database TLS and off-site recovery drills.
- Full Jest/API and PostgreSQL integration run, browser E2E tests and load/concurrency tests.
- Clinical, coding, billing, prescribing and privacy/legal validation.
- Remove all synthetic demo data before any real deployment.

See `SECURITY.md` for the go-live checklist and `README_v2.4_FRONTEND.md` for the preserved original frontend feature notes.
