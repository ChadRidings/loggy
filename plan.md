# Loggy Implementation Plan

## 1) Baseline Confirmed From Current Project

### Installed stack and versions (from `package.json`)

- Next.js: `16.1.6`
- React / React DOM: `19.2.4`
- TypeScript: `5.9.2`
- NextAuth.js (`next-auth`): `4.24.13`
- Zod: `4.3.6`
- Zustand: `5.0.11`
- TanStack Query: `5.90.2`
- Radix Themes: `3.3.0`
- Tailwind CSS: `4.1.12`
- ESLint: `9.7.0`
- Test runner: `vitest@4.0.18`

### Project constraints (from `AGENTS.md`)

- Use Next.js App Router + TypeScript
- Use NextAuth.js for authentication
- Use Radix UI + Tailwind for UI
- Use Zustand for global state
- Use TanStack Query for caching/data fetching
- Use Zod for validation
- Use PostgreSQL for persistence
- Provide Docker local setup
- Bonus target deployment on GCP

## 2) Scope and Architecture

### Functional scope

- User can sign in with basic auth (credentials-based via NextAuth)
- Authenticated user can upload `.log` / `.txt` files
- Backend parses logs, stores normalized events, and computes:
  - Human-readable parsed table
  - SOC-focused summary/timeline
  - Anomaly list with confidence score + explanation
- UI displays upload status, parsed results, timeline, and anomalies

### Proposed architecture

- Single Next.js full-stack app using Route Handlers (`app/api/*`)
- PostgreSQL for users, uploads, parsed events, anomalies
- Background-ish processing in server-side module triggered post-upload (synchronous first, async queue-ready design)
- Zod schemas shared between API and parser pipeline

## 3) Log Format and Parsing Strategy

### Chosen log type

- Zscaler-style web proxy log (CSV-like, timestamp/ip/url/action/user-agent fields)
- Fallback support for generic web access log lines where possible

### Parsing pipeline

1. Ingest file and basic file validation (type, size, encoding)
2. Line normalization (trim, skip blank lines, track line number)
3. Format detection (zscaler-like vs generic)
4. Parse into canonical event model
5. Enrich fields:
   - Geo/ASN placeholder hook (optional later)
   - URL domain extraction
   - Event severity heuristic
6. Persist events + parser errors
7. Build timeline aggregates and anomaly scores

## 4) Data Model (PostgreSQL)

### Tables

- `users`
  - `id`, `email`, `password_hash`, `role`, timestamps
- `uploads`
  - `id`, `user_id`, `filename`, `source_type`, `status`, `raw_size_bytes`, `uploaded_at`
- `events`
  - `id`, `upload_id`, `line_number`, `timestamp`, `src_ip`, `user_identifier`, `url`, `domain`, `http_method`, `action`, `status_code`, `bytes_out`, `user_agent`, `severity`, `raw_line`, `parse_warning`
- `timelines`
  - `id`, `upload_id`, `bucket_start`, `bucket_end`, `event_count`, `blocked_count`, `top_ip`, `top_domain`
- `anomalies`
  - `id`, `upload_id`, `event_id` (nullable for aggregate anomalies), `type`, `confidence_score`, `explanation`, `created_at`

### Indexes

- `events(upload_id, timestamp)`
- `events(upload_id, src_ip)`
- `events(upload_id, domain)`
- `anomalies(upload_id, confidence_score DESC)`

## 5) API Design (REST via Next.js Route Handlers)

- `POST /api/auth/register` (if self-managed sign-up is desired)
- NextAuth routes for login/session
- `POST /api/uploads`
  - Multipart upload, save metadata, trigger parse
- `GET /api/uploads`
  - List current user uploads
- `GET /api/uploads/:id`
  - Upload metadata and processing status
- `GET /api/uploads/:id/events`
  - Paginated parsed events + filters (time range, ip, domain, action)
- `GET /api/uploads/:id/timeline`
  - SOC summary timeline buckets
- `GET /api/uploads/:id/anomalies`
  - Anomalies with reason + confidence score

All request/response payloads validated with Zod.

## 6) Frontend Plan

### Pages

- `/login`
  - NextAuth credentials login
- `/dashboard`
  - Upload widget + uploads history
- `/uploads/[id]`
  - Summary cards
  - Timeline component
  - Event table with filtering/sorting
  - Anomaly panel with confidence badges and explanations

### State and data handling

- TanStack Query for server data (`uploads`, `events`, `timeline`, `anomalies`)
- Zustand for UI state (filters, selected anomaly, table display preferences)

### UX requirements

- Responsive layout for desktop/mobile
- Upload progress, parse status states, and clear error surfaces
- Empty/loading/error states for each data panel

## 7) Anomaly Detection (Bonus)

### Initial heuristic model

- Volume spike by source IP in short window (e.g., z-score or threshold)
- High ratio of blocked/denied actions from same IP or user
- Access to rare/new domains compared to file baseline
- Rapid burst of unique domains from one source (possible beaconing/scanning)
- Off-hours access anomalies (based on majority behavior in file)

### Confidence scoring

- Score range `0.00 - 10.00`
- Weighted combination:
  - Frequency deviation weight
  - Rarity weight
  - Security action severity weight
  - Temporal burstiness weight
- Store both score and rule contributions to support explanation text

### Explanation generation examples

- `"Unusual request burst: 147 requests from 10.2.1.5 within 5 minutes (6.4x baseline)."`
- `"High deny rate: 92% blocked requests from user alice@corp during 09:00-09:15."`

## 8) Security and Reliability

- Passwords hashed with `bcryptjs`
- Session security via NextAuth JWT/session config
- Route protection middleware for authenticated endpoints
- File upload limits + MIME/extension checks
- Input validation via Zod at API boundary
- Basic audit logging for upload and parse actions
- Error handling strategy:
  - Parse errors captured per line without failing entire ingestion
  - Surface partial-success results in UI

## 9) Delivery Plan (Phased)

### Phase 1: Foundation

- Set up app structure (`app/`, API routes, shared schemas)
- Add PostgreSQL integration and schema migrations
- Configure NextAuth credentials flow

### Phase 2: Upload + Parsing

- Implement upload endpoint and storage strategy
- Build parser + canonical model mapping
- Persist uploads/events and expose list/detail APIs

### Phase 3: Analyst Views

- Build dashboard/upload flow
- Build event table with filters and pagination
- Build timeline summaries

### Phase 4: Anomaly Detection

- Implement heuristic anomaly engine
- Persist anomalies with confidence scores/explanations
- Add anomaly UI highlighting and drill-down

### Phase 5: Hardening + Docs

- Add tests with Vitest (parser unit tests + API integration tests)
- Add Docker setup for local run
- Add README with architecture, setup, sample logs, anomaly method
- Prepare GCP deployment artifacts

## 10) Testing Strategy

- Framework: Vitest (`vitest run` for CI/non-watch, `vitest` for watch mode)
- Unit tests:
  - Parser tokenization/normalization
  - Anomaly rule scoring and explanations
  - Zod schema validation
- Integration tests:
  - Upload -> parse -> persist flow
  - Auth-protected route access
- Smoke tests:
  - Login, upload sample log, inspect timeline/anomalies

## 11) Docker + GCP Plan

### Local Docker

- `docker-compose.yml` for:
  - `web` (Next.js app)
  - `db` (PostgreSQL)
- Environment variables documented in `.env.example`
- One command startup for local dev/test

### GCP deployment (bonus)

- Target: Cloud Run + Cloud SQL (PostgreSQL)
- Build container image via Cloud Build or GitHub Actions
- Configure secrets in Secret Manager
- Add deployment guide to README

## 12) Repository Deliverables Checklist

- `README.md`:
  - Local setup instructions (Docker-first)
  - Env var documentation
  - Architecture summary
  - AI/anomaly approach explanation
- `examples/` sample log files
- API route documentation (brief/gist)
- Basic test suite and run commands

## 13) Risks and Mitigations

- Large files may block request thread:
  - Mitigation: enforce size limits now, move parse to async job runner later
- Log format variability:
  - Mitigation: strict parser mode + fallback parser + parse error reporting
- False positives in anomalies:
  - Mitigation: transparent scoring + tunable thresholds + explainability
