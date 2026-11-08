# MedBook AI v2.5 changelog

## Backend and data
- Added Express API and Prisma/PostgreSQL schema.
- Added organization, owner, server session, encrypted clinic-state, backup and server audit tables.
- Added AES-256-GCM encryption for state and stored backups.
- Added versioned state saves with optimistic concurrency checks.
- Added server-side trial dates and expired-trial write blocking.
- Added JSON backup export and validated restore with a pre-restore backup.

## Authentication and security
- Added owner sign-in and sign-out.
- Added bcrypt password hashing, server-side sessions, CSRF tokens, same-origin checks and login rate limiting.
- Added Helmet security headers and restricted static-file routes.
- Removed browser role preview and demo reset controls.

## Frontend
- Preserved existing v2.4 screens, specialty color themes and responsive layouts.
- Added sign-in and connection-error screens.
- Added a database save status indicator.
- Replaced simulated lifetime activation with a non-functional contact-admin message; no fake payment status can be set from the UI.

## Testing and docs
- Added Jest/Supertest tests for auth, CSRF, state validation, encryption and trial expiry.
- Added local PostgreSQL Docker Compose, `.env.example`, seed script, migration and security checklist.
