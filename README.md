# Loggy

Loggy is a full-stack cybersecurity log analysis app built with Next.js, PostgreSQL, NextAuth, TanStack Query, and Zustand.

## Features

- Credentials authentication (`/login`, `/register`)
- Upload `.log` / `.txt` files
- Asynchronous ingestion with status tracking (`queued`, `processing`, `completed`, `partial_success`, `failed`)
- Parsed event table with filtering and cursor pagination
- SOC-focused timeline summary
- Anomaly detection with confidence scores and explanations
- Optional LLM-assisted anomaly enrichment with graceful heuristic fallback

## Tech Stack

- Next.js 16 + React 19 + TypeScript
- NextAuth (credentials)
- PostgreSQL + `pg`
- Zod validation
- TanStack Query + Zustand
- Tailwind CSS
- Vitest

## Local Setup

### Option 1: Docker (recommended)

```bash
docker compose up --build
```

App: `http://localhost:3000`

### Option 2: Local Node + Local/Postgres Container

1. Install dependencies:

```bash
npm install
```

2. Copy env vars:

```bash
cp .env.example .env.local
```

3. Start dev server:

```bash
npm run dev
```

## Environment Variables

Use `.env.local`:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=replace-with-random-secret
DATABASE_URL=postgres://loggy:loggy@localhost:5432/loggy
ENABLE_LLM_ANOMALY=false
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
```

## AI Usage

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
```

## Example Logs

Sample logs are in:

- `examples/zscaler-sample.log`

## Notes

- Database schema is auto-bootstrapped by migration logic on first DB-backed request.
- LLM enrichment is feature-flagged and optional for local development.
