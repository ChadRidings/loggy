# Loggy

Loggy is a full-stack cybersecurity log analysis platform that lets authenticated users upload raw `.log` and `.txt` network/security logs, process them through an asynchronous ingestion pipeline, normalize and store events in PostgreSQL, and review timeline, anomaly, and filtered event insights through a responsive Next.js dashboard with optional LLM-assisted anomaly enrichment.

## Features

- Credentials authentication (`/login`, `/register`)
- Upload `.log` / `.txt` files
- Asynchronous ingestion with status tracking (`queued`, `processing`, `completed`, `partial_success`, `failed`)
- Parsed event table with filtering and cursor pagination
- SOC-focused timeline summary
- Anomaly detection with confidence scores and explanations
- Optional LLM-assisted anomaly enrichment with graceful heuristic fallback

## Tech Stack

- **Framework**: NEXT.js 16 (App Router) + React 19
- **UI**: Radix UI
- **Language**: TypeScript
- **CSS**: Tailwind CSS 4
- **State Management**: Zustand
- **Authentication**: NextAuth.js
- **Password Security**: bcryptjs
- **Typechecking**: TypeScript (`tsc --noEmit`)
- **Validation**: Zod
- **Caching**: TanStack Query (+ React Query Devtools for local debugging)
- **Database**: PostgreSQL via `pg`
- **Testing**: Vitest
- **Linting**: ESLint + Prettier

## Local Setup

### Option 1: Docker (recommended)

```bash
docker compose up --build
```

`docker compose down` = stop/remove containers and network

`docker compose down -v` = stop/remove containers and also wipe persistent volume storage

App: `http://localhost:3000`

### Option 2: Local Node + Local/Postgres Container

1. Install dependencies:

```bash
npm install
```

2. Copy env vars:

Rename `.env.example` to `.env.local`

3. Start dev server:

```bash
npm run dev
```

4. (Optional) Verify local setup:

```bash
npm run typecheck
npm run test
npm run lint
```

## Environment Variables

Use `.env.local`:
I've included `.env.example` for reference.

```bash
# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Auth.js
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=change-me-to-a-long-random-string

# PostgreSQL
DATABASE_URL=postgres://loggy:loggy@localhost:5432/loggy

# LLM anomaly enrichment (optional)
ENABLE_LLM_ANOMALY=false
OPENAI_API_KEY=add-your-openai-api-key-here
OPENAI_MODEL=gpt-4.1-mini
```

For production hosting on Vercel + Neon, see [deployment_vercel_neon.md](./developer/documentation/deployment_vercel_neon.md).

## AI Usage

For a full end-to-end walkthrough, see [how_ai_works.md](./developer/documentation/how_ai_works.md).

### Where AI is used

AI is used only in anomaly enrichment/classification, not in log parsing.

Pipeline:

1. Deterministic parser + heuristic anomaly detection.
2. Optional LLM enrichment for short reasoning summaries and confidence calibration.

### Prompting and input context shape

The app sends a compact JSON payload containing:

- Existing heuristic anomaly candidates (`type`, baseline `confidenceScore`, explanation)
- A bounded sample of parsed events (`timestamp`, `srcIp`, `action`, `statusCode`, `domain`)

The LLM is asked to return structured JSON with optional per-anomaly confidence calibration and concise reasoning.

### Failure/fallback behavior

If `ENABLE_LLM_ANOMALY=false`, `OPENAI_API_KEY` is unset, or the LLM call fails:

- The app returns deterministic heuristic anomalies only.
- `detection_source` remains `heuristic`.
- UI still renders anomaly results without failure.

### Local demo cost/latency tradeoff

- Heuristic-only mode has no model cost and lowest latency.
- Enabling LLM enrichment adds network/model latency and token cost per processed upload.

## API Overview

- `POST /api/auth/register`
- `POST/GET /api/auth/[...nextauth]`
- `POST /api/uploads` (returns `202`)
- `GET /api/uploads`
- `GET /api/uploads/:id`
- `DELETE /api/uploads/:id`
- `GET /api/uploads/:id/events` (cursor pagination)
- `GET /api/uploads/:id/timeline`
- `GET /api/uploads/:id/anomalies`

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run test
npm run typecheck
npm run lint
```

## Deployment (Free Tier)

Recommended stack for this project:

- GitHub repository (public for easiest reviewer access)
- Vercel (web hosting, free tier)
- Neon Postgres (database, free tier)

Setup guide: [deployment_vercel_neon.md](./developer/documentation/deployment_vercel_neon.md)

### Live Demo

- URL: [https://loggy-theta.vercel.app/](https://loggy-theta.vercel.app/)
- Users can register a new account from [/register](https://loggy-theta.vercel.app/register).

## Database

For a DB-engineering-focused schema/query guide, see [how_db_works.md](./developer/documentation/how_db_works.md).

## TanStack Query

For frontend TanStack Query hook behavior and responsibilities, see [how_queries_work.md](./developer/documentation/how_queries_work.md).

## Example Logs

Some sample logs are located in:

- `examples/zscaler-sample.log` (default)
- `examples/zscaler-sample2.log` (shorter)
- `examples/zscaler-sample3.log` (longer with anomalies)

## Notes

- Database schema is auto-bootstrapped by migration logic on first DB-backed request.
- LLM enrichment is feature-flagged and optional for local development.
- For a DB-engineering-focused schema/query guide, see [how_db_works.md](./developer/documentation/how_db_works.md).
- For frontend TanStack Query hooks and their purpose, see [how_queries_work.md](./developer/documentation/how_queries_work.md).

## Implementation Plans

- Implementation plan is [developer/implementation-plans/plan.md](./developer/implementation-plans/plan.md).
- Archiving plan is [developer/implementation-plans/archiving_plan.md](./developer/implementation-plans/archiving_plan.md).
