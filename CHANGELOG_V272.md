# MedBook AI v2.7.2 — Firebase Auth + Prisma Demo Release

## Added
- Firebase Authentication email/password sign-in for accounts explicitly mapped by Firebase UID to a Prisma `User` record.
- Firebase Admin SDK ID-token verification with revocation checks before creating a PostgreSQL-backed server session.
- Firebase account provisioning for new clinic login accounts when Firebase Admin credentials are configured.
- Firebase password updates, account disabling and refresh-token revocation for Firebase-linked users.
- Owner bootstrap can create or link the seeded Owner to Firebase Authentication.
- Prisma migration adds nullable `User.firebaseUid` and makes `passwordHash` nullable so Firebase-managed users do not store a duplicate password hash.
- Dockerfile and Compose app service for a local full-stack demo.
- GitHub Actions CI workflow for syntax, domain, Jest/API and Prisma checks.
- `.env.example` updated with Firebase public configuration and server-only Admin credentials.

## Preserved
- Existing HTML/CSS/Vanilla JS frontend and Express/Prisma/PostgreSQL backend.
- Existing appointment lifecycle, Actual DOS, clinic roles, provider/branch scoping, encrypted snapshots, audit trail, backups and optimistic save queue.
- Legacy bcrypt sign-in for existing accounts that have not yet been linked to Firebase.

## Important
- Firebase Authentication is used for identity; Prisma continues to use PostgreSQL. Firestore is not used.
- This is a client-demo deployment baseline, not a healthcare compliance certification.
- Apply the new migration and test the live Firebase/PostgreSQL connection before using any non-synthetic data.
