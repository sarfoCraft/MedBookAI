# MedBook AI v2.7.2 — Netlify deployment

This configuration deploys the existing HTML/CSS/vanilla-JS frontend to Netlify's static CDN and the existing Express API as a Netlify Function. PostgreSQL remains the application database through Prisma. The app is not converted into a static-only demo.

## Before importing/deploying

1. Commit the Netlify files in this release to the root of the GitHub repository. Do not upload `.env`, Firebase service-account JSON, database passwords, or other secrets to GitHub.
2. Create a PostgreSQL project (the included instructions use Supabase).
3. Add the environment variables listed below in Netlify **Project configuration → Environment variables**. Make sure they are available to both **Builds** and **Functions**.
4. Trigger a new deploy. The build runs Prisma Client generation, database migrations, the idempotent Owner seed, and the static-file preparation script.

## Netlify build settings

The included `netlify.toml` configures these automatically:

- Base directory: repository root (`.` / blank)
- Build command: `npm run netlify:build`
- Publish directory: `public`
- Functions directory: `netlify/functions`
- Node.js: 22

Do not use the AI agent's **Build now** workflow. Import the Git repository and let Netlify read `netlify.toml`.

## Supabase PostgreSQL connection strings

In Supabase, create a project and open **Connect**. For this serverless deployment, use:

- `DATABASE_URL`: the **Transaction pooler** connection string (port `6543`) with `?pgbouncer=true` appended. This is used by Prisma Client at runtime.
- `DIRECT_URL`: the **Session pooler** connection string (port `5432`). This is used by Prisma CLI for migrations. Session mode is suitable when a direct IPv6 database connection is unavailable.

Copy the exact host and username Supabase provides; do not guess the pooler hostname. If the connection string already contains query parameters, append `&pgbouncer=true` instead of a second `?`.

## Required Netlify environment variables

Set these in Netlify's environment-variable UI. Use your own unique values:

| Name | Value |
|---|---|
| `DATABASE_URL` | Supabase Transaction Pooler URL, port 6543, ending in `?pgbouncer=true` |
| `DIRECT_URL` | Supabase Session Pooler URL, port 5432 |
| `SESSION_SECRET` | Random secret, at least 32 characters |
| `DATA_ENCRYPTION_KEY` | Exactly 64 hexadecimal characters (32 random bytes) |
| `SEED_ORG_NAME` | Your clinic/demo organization name |
| `SEED_ORG_TIMEZONE` | IANA timezone, e.g. `Asia/Karachi` |
| `SEED_OWNER_NAME` | Owner's display name |
| `SEED_OWNER_EMAIL` | Owner login email |
| `SEED_OWNER_PASSWORD` | Unique password, at least 14 characters; never use the example password |
| `TRIAL_DAYS` | `30` (or another integer from 1 to 90) |
| `REQUIRE_FIREBASE_AUTH` | `false` for the initial legacy email/password demo login |

The following Firebase variables are optional if you are using the legacy bcrypt login initially: `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`, `FIREBASE_APP_ID`, and `FIREBASE_SERVICE_ACCOUNT_JSON`. To enable Firebase login, configure all web values plus the private service-account JSON as a Netlify secret, then set `REQUIRE_FIREBASE_AUTH=true` only after verifying the Firebase setup. Never place the service-account JSON in GitHub.

Generate secrets locally with Node.js (do not commit the output):

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"  # SESSION_SECRET
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"  # DATA_ENCRYPTION_KEY
```

## What the first deploy does

`npm run netlify:build` performs these steps:

1. `prisma generate` — generates the Prisma Client for the Netlify Linux runtime.
2. `prisma migrate deploy` — applies the committed PostgreSQL migrations using `DIRECT_URL`.
3. `npm run db:seed` — creates the first clinic Owner only if the configured Owner email does not already exist. Re-running the seed is safe for that same email.
4. `scripts/prepare-netlify.js` — copies only the public frontend files into `public/`; server code and secrets are not published as static assets.

After deployment, test `/api/health`. It should return JSON with `status: "ok"` and `database: "connected"`. Then sign in with the `SEED_OWNER_EMAIL` and `SEED_OWNER_PASSWORD` values.

## Important limitations and safety

- Netlify Functions are request-driven serverless functions, not a permanently running Express server. Keep background jobs and long-running work elsewhere.
- Netlify's request/response and execution limits apply. Large backup/state payloads may need to be reduced or moved to object storage.
- A free hosting/database plan is suitable only for a small demo and may pause or impose usage limits. Verify current plan limits before relying on it.
- This app is not certified for HIPAA or other healthcare compliance. Use fictional data only until security, privacy, legal, and compliance requirements have been independently reviewed.
- Do not commit `.env`, credentials, service-account files, or generated secrets.
