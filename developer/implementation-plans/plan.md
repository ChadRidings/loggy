# Loggy Implementation Plan

## 1) Baseline Requirements

### Installed stack and versions (from `package.json`)

- Next.js: `16.2.1`
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

- User can register and sign in with credentials-based auth (NextAuth + PostgreSQL users)
- Authenticated user can upload `.log` / `.txt` files
- Backend parses logs, stores normalized events, and computes:
  - Human-readable parsed table
  - SOC-focused summary/timeline
  - Anomaly list with confidence score + explanation
- UI displays upload status, parsed results, timeline, and anomalies

### Proposed architecture

- Single Next.js full-stack app using Route Handlers (`app/api/*`)
- PostgreSQL for users, uploads, parsed events, parser warnings, timelines, anomalies, and ingestion job state
- Asynchronous ingestion in v1:
  - Upload endpoint is non-blocking (`202 Accepted`)
  - Parse/timeline/anomaly processing runs as background job in app runtime (queue-ready design)
- Zod schemas shared between API and parser pipeline

## 3) Log Format and Parsing Strategy

### Chosen log type

- Zscaler-style web proxy log (CSV-like, timestamp/ip/url/action/user-agent fields)
- Fallback support for generic web access log lines where possible

### Parsing pipeline

1. Ingest file and run file validation (type, size, encoding)
2. Store upload metadata and enqueue processing job
3. Line normalization (trim, skip blank lines, track line number)
4. Format detection (zscaler-like vs generic)
5. Parse into canonical event model
6. Enrich fields:
   - Geo/ASN placeholder hook (optional later)
   - URL domain extraction
   - Event severity heuristic
7. Persist events + parser warnings/errors
8. Build timeline aggregates and anomaly scores
9. Mark final upload/job status (`completed`, `partial_success`, or `failed`)

### Processing status and idempotency

- Upload/job statuses: `queued`, `processing`, `completed`, `failed`, `partial_success`
- Reprocess for same `upload_id` is idempotent for derived artifacts:
  - Replace timeline/anomaly outputs in a single transaction boundary
  - Preserve normalized events and parser diagnostics unless explicitly re-ingestion is requested

## 4) Data Model (PostgreSQL)

### Tables

- `users`
  - `id`, `email` (unique), `password_hash`, `role`, timestamps
- `uploads`
  - `id`, `user_id`, `filename`, `source_type`, `status`, `raw_size_bytes`, `uploaded_at`, `failure_reason` (nullable)
- `ingestion_jobs`
  - `id`, `upload_id`, `status`, `attempt_count`, `started_at`, `finished_at`, `last_error` (nullable), timestamps
- `events`
  - `id`, `upload_id`, `line_number`, `timestamp`, `src_ip`, `user_identifier`, `url`, `domain`, `http_method`, `action`, `status_code`, `bytes_out`, `user_agent`, `severity`, `raw_line`, `raw_line_expires_at`, `parse_warning`
- `timelines`
  - `id`, `upload_id`, `bucket_start`, `bucket_end`, `event_count`, `blocked_count`, `top_ip`, `top_domain`
- `anomalies`
  - `id`, `upload_id`, `event_id` (nullable for aggregate anomalies), `type`, `confidence_score`, `explanation`, `detection_source` (`heuristic` | `llm_hybrid`), `llm_reasoning_summary` (nullable), `created_at`

### Indexes

- `events(upload_id, timestamp DESC, id DESC)`
- `events(upload_id, src_ip)`
- `events(upload_id, domain)`
- `anomalies(upload_id, confidence_score DESC)`
- `ingestion_jobs(upload_id, status)`

### Data lifecycle

- `raw_line` retained for 30 days via `raw_line_expires_at` policy marker
- Normalized event fields retained long-term
- `timelines` and `anomalies` are derived and recomputable per upload

## 5) API Design (REST via Next.js Route Handlers)

- `POST /api/auth/register`
  - Self-service registration in v1
  - Zod input validation, duplicate-email protection, bcrypt hashing, basic rate limiting
- NextAuth routes for login/session using credentials provider + DB-backed users
- `POST /api/uploads`
  - Multipart upload, save metadata, enqueue parse, return `202 Accepted` with `uploadId` and `status`
- `GET /api/uploads`
  - List current user uploads
- `GET /api/uploads/:id`
  - Upload metadata and processing status (`queued|processing|completed|failed|partial_success`) plus `failure_reason` when present
- `GET /api/uploads/:id/events`
  - Cursor-paginated parsed events with deterministic order
  - Default sort: `timestamp DESC, id DESC`
  - Default page size: `100`
  - Max page size: `500`
  - Filters: `start_time`, `end_time`, `src_ip`, `domain`, `action`, `status_code`
  - Returns `nextCursor` when more results exist
- `GET /api/uploads/:id/timeline`
  - SOC summary timeline buckets
- `GET /api/uploads/:id/anomalies`
  - Anomalies with reason + confidence score
  - Response includes `detection_source` and optional `llm_reasoning_summary`

All request/response payloads validated with Zod.

## 6) Frontend Plan

### Pages

- `/login`
  - NextAuth credentials login
- `/register`
  - Self-service registration form
- `/dashboard`
  - Upload widget + uploads history + status badges
- `/uploads/[id]`
  - Summary cards
  - Timeline component
  - Event table with filtering/sorting and cursor-based loading
  - Anomaly panel with confidence badges and explanations

### State and data handling

- TanStack Query for server data (`uploads`, `events`, `timeline`, `anomalies`)
- Zustand for UI state (filters, selected anomaly, table display preferences)

### UX requirements

- Responsive layout for desktop/mobile
- Upload progress, async parse status states, and clear error surfaces
- Empty/loading/error states for each data panel

## 7) Anomaly Detection (Assignment + Bonus)

### Two-stage detection pipeline (required)

1. Heuristic stage generates anomaly candidates from parsed events.
2. LLM stage classifies/enriches candidates, generates concise analyst-facing reasoning, and normalizes confidence output.

### Model usage boundaries

- LLM is used for anomaly enrichment/classification only.
- Core parsing and canonical event extraction remain deterministic and non-LLM.
- If LLM is unavailable or disabled, the system falls back to heuristic-only anomalies with deterministic explanations.

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
- LLM stage can calibrate output confidence, but heuristic score remains available for fallback
- Store score and rule contributions to support explanation text

### Explanation generation examples

- `"Unusual request burst: 147 requests from 10.2.1.5 within 5 minutes (6.4x baseline)."`
- `"High deny rate: 92% blocked requests from user alice@corp during 09:00-09:15."`

## 8) Security and Reliability

- Passwords hashed with `bcryptjs`
- Session security via NextAuth JWT/session config
- Route protection middleware for authenticated endpoints
- File upload limits + MIME/extension checks
- Input validation via Zod at API boundary
- Basic audit logging for registration, upload, and parse actions
- Error handling strategy:
  - Parse errors captured per line without failing entire ingestion
  - Surface partial-success results in UI
- Rate limiting on auth-sensitive and upload endpoints

## 9) Delivery Plan (Phased)

### Phase 1: Foundation + Environment

- Set up app structure (`app/`, API routes, shared schemas)
- Add Docker local setup (`docker-compose.yml` for `web` + `db`)
- Wire env vars and PostgreSQL connectivity
- Add schema migrations and DB bootstrap flow
- Configure NextAuth credentials flow with DB-backed users
- Implement registration endpoint (`POST /api/auth/register`)

### Phase 2: Upload + Async Parsing

- Implement upload endpoint with async enqueue semantics (`202`)
- Build parser + canonical model mapping
- Implement ingestion job state transitions and failure handling
- Persist uploads/events/parser diagnostics and expose list/detail APIs

### Phase 3: Analyst Views

- Build dashboard/upload flow with async status polling
- Build event table with filters and cursor pagination
- Build timeline summaries

### Phase 4: Anomaly Detection

- Implement heuristic anomaly engine
- Implement minimal LLM-assisted anomaly enrichment/classification path
- Add feature flag and env var configuration to enable/disable LLM path at runtime
- Persist anomalies with confidence scores/explanations
- Add anomaly UI highlighting and drill-down

### Phase 5: Hardening + Docs + Deployment Bonus

- Add tests with Vitest (parser unit tests + API integration tests)
- Add retention cleanup job for `raw_line` expiration policy
- Add README with architecture, setup, sample logs, anomaly method
- Prepare GCP deployment artifacts

## 10) Testing Strategy

- Framework: Vitest (`vitest run` for CI/non-watch, `vitest` for watch mode)
- Unit tests:
  - Parser tokenization/normalization
  - Anomaly rule scoring and explanations
  - Zod schema validation
- Integration tests (ephemeral PostgreSQL per test run):
  - Register -> login -> protected route access
  - Upload -> queued -> processing -> completed
  - Upload with malformed lines -> `partial_success` + diagnostics persisted
  - Events cursor pagination correctness across pages + filters
  - Reprocess idempotency for derived artifacts
- AI-path acceptance tests:
  - LLM enabled: anomalies include `detection_source=llm_hybrid`, explanation, and confidence score
  - LLM disabled/failure: anomalies return with `detection_source=heuristic` and UI remains functional
- Smoke tests:
  - Login, upload sample log, inspect status transitions, timeline, anomalies

## 11) Docker + GCP Plan

### Local Docker

- `docker-compose.yml` for:
  - `web` (Next.js app)
  - `db` (PostgreSQL)
- Environment variables documented in `.env.example`
- One-command startup for local dev/test

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
  - Where AI is used in the pipeline
  - Prompting/input context shape for AI calls
  - Failure/fallback behavior when AI is unavailable
  - Local demo cost/latency tradeoff notes
- `examples/` sample log files
- API route documentation (brief/gist)
- Basic test suite and run commands

## 13) Risks and Mitigations

- Background processing drift or stuck jobs:
  - Mitigation: explicit job state machine, attempt tracking, and failure_reason visibility
- Log format variability:
  - Mitigation: strict parser mode + fallback parser + parse error reporting
- False positives in anomalies:
  - Mitigation: transparent scoring + tunable thresholds + explainability
- Storage growth from raw payload retention:
  - Mitigation: 30-day `raw_line` retention policy with scheduled cleanup
- External AI call latency/cost variability:
  - Mitigation: feature-flagged LLM path, small prompt context, heuristic fallback

## 14) Assumptions

- LLM integration is allowed via external API key in local `.env` and is optional at runtime.
- If AI access is unavailable during demo, heuristic fallback is acceptable as long as behavior is documented.
- Cloud deployment remains bonus and does not block core assignment completion.
