# Deploy Loggy for Free (GitHub + Vercel + Neon)

This guide deploys Loggy with zero-cost defaults suitable for demos.

## 1) Push to GitHub (Public Repo Recommended)

1. Create a repository on GitHub.
2. Push this project to `main`.
3. Keep secrets out of git (`.env`, `.env.local` are already ignored).

## 2) Create Free Neon Postgres

1. Create a Neon account and a new project.
2. Create/copy the pooled connection string.
3. Ensure SSL is enabled in the URL (Neon defaults are compatible with Vercel).

The connection string should look similar to:

```txt
postgresql://<user>:<password>@<host>/<db>?sslmode=require
```

## 3) Deploy on Vercel (Free Tier)

1. In Vercel, choose **Add New Project** and import your GitHub repo.
2. Framework preset: **Next.js**.
3. Configure environment variables before first deploy:

```txt
DATABASE_URL=<neon-connection-string>
NEXTAUTH_SECRET=<long-random-secret>
NEXTAUTH_URL=https://<your-project>.vercel.app
NEXT_PUBLIC_APP_URL=https://<your-project>.vercel.app
ENABLE_LLM_ANOMALY=false
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
```

4. Deploy.
5. After deploy, confirm the app URL and update `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL` if needed.
6. Redeploy once if you changed any env vars.

## 4) Pre-Deploy Checks (Run Locally)

```bash
npm run typecheck
npm run test
npm run build
```

## 5) Post-Deploy Smoke Test

1. `GET https://<your-project>.vercel.app/api/health` returns success.
2. Register and login work.
3. Upload a sample file from `examples/`.
4. Upload details page shows events, timeline, anomalies.
5. Logout/login roundtrip works.

## 6) Interview Demo Readiness Checklist

- Add the live URL to [`README.md`](../README.md).
- Optionally add temporary credentials in README.
- Keep LLM enrichment off (`ENABLE_LLM_ANOMALY=false`) to avoid external API cost.
