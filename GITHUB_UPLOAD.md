# Upload MedBook AI to GitHub

GitHub is the source-code repository for this app. It does not run the Express API or host the Prisma/PostgreSQL database.

## Before the first push

1. Create a **private** GitHub repository, for example `medbook-ai-demo`.
2. In this project folder, run `npm install` in a network-enabled environment. Commit the generated `package-lock.json`.
3. Confirm local secrets are ignored:
   - `.env`
   - `.env.production`
   - Firebase service-account JSON files
   - `node_modules/`
4. Never add Firebase Admin credentials, database URLs, session secrets or encryption keys to GitHub.

## First push

Replace the repository URL with your own:

```bash
git init
git add .
git status
git commit -m "MedBook AI v2.7.2 Firebase Auth and Prisma setup"
git branch -M main
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/medbook-ai-demo.git
git push -u origin main
```

If the repository already contains commits, clone it first and copy these project files into that working tree rather than force-pushing over existing history.

## After pushing

- GitHub Actions runs `.github/workflows/ci.yml` on pushes and pull requests.
- Configure deployment secrets on your Node/Docker hosting provider, not in GitHub source files.
- Deploy the app with the included `Dockerfile`.
- Attach a PostgreSQL database and set the Firebase web configuration plus Firebase Admin service-account secret.
- Do not use GitHub Pages for this project; the API, sessions and Prisma database require a running Node.js server.
