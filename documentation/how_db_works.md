# How Database and Queries Work in Loggy

## High-Level Database Overview

Loggy uses PostgreSQL (via `pg`) as the system of record for authentication, upload job lifecycle, parsed events, timeline aggregates, and anomaly outputs.

At a high level, the database is designed around one primary unit of work: an **upload**.

- A `user` creates many `uploads`.
- Each `upload` has one or more `ingestion_jobs` (status tracking/retries), many `events`, many `timelines` buckets, and many `anomalies`.
- Most read queries are scoped by both `upload_id` and `user_id` to enforce tenant isolation in SQL.

## Migration and Connection Model

- Connection pooling is handled by `Pool` in `lib/db.ts`.
- `runMigrations()` executes DDL at runtime and is guarded by a process-local singleton promise (`migrationPromise`) to avoid duplicate migration execution in-process.
- `pgcrypto` is enabled for UUID generation (`gen_random_uuid()`).
- Schema evolution currently follows additive/idempotent DDL in code (not versioned migration files).

## Logical Data Model (Table-by-Table)

## ERD (ASCII, Short Form)

```text
users (id PK)
  1 ───< uploads (id PK, user_id FK -> users.id)
            1 ───< ingestion_jobs (id PK, upload_id FK -> uploads.id)
            1 ───< events (id PK, upload_id FK -> uploads.id)
            1 ───< timelines (id PK, upload_id FK -> uploads.id)
            1 ───< anomalies (id PK, upload_id FK -> uploads.id, event_id FK -> events.id NULL)

events.id ──(ON DELETE SET NULL)──> anomalies.event_id
uploads/user delete ──(ON DELETE CASCADE)──> dependent rows
```

### `users`
Purpose:
- Identity store for credential auth.

Key columns:
- `id` UUID PK
- `email` unique
- `password_hash`
- `role`
- timestamps (`created_at`, `updated_at`)

### `uploads`
Purpose:
- Top-level ingestion object and lifecycle state for a user-uploaded file.

Key columns:
- `id` UUID PK
- `user_id` FK -> `users(id)` (`ON DELETE CASCADE`)
- `filename`, `source_type`, `raw_size_bytes`
- `status` (`queued`, `processing`, `completed`, `partial_success`, `failed`)
- `uploaded_at`, `failure_reason`

### `ingestion_jobs`
Purpose:
- Operational job tracking per upload (attempts, timings, failure detail).

Key columns:
- `id` UUID PK
- `upload_id` FK -> `uploads(id)` (`ON DELETE CASCADE`)
- `status`, `attempt_count`
- `started_at`, `finished_at`, `last_error`
- `created_at`, `updated_at`

### `events`
Purpose:
- Normalized parsed log lines.

Key columns:
- `id` UUID PK
- `upload_id` FK -> `uploads(id)` (`ON DELETE CASCADE`)
- log attributes (`timestamp`, `src_ip`, `domain`, `action`, `status_code`, etc.)
- `raw_line` and `raw_line_expires_at`
- `parse_warning`

### `timelines`
Purpose:
- Precomputed 15-minute aggregate buckets for fast timeline rendering.

Key columns:
- `id` UUID PK
- `upload_id` FK -> `uploads(id)` (`ON DELETE CASCADE`)
- `bucket_start`, `bucket_end`
- `event_count`, `blocked_count`, `top_ip`, `top_domain`

### `anomalies`
Purpose:
- Detected anomalies per upload (heuristic and optional LLM-enriched).

Key columns:
- `id` UUID PK
- `upload_id` FK -> `uploads(id)` (`ON DELETE CASCADE`)
- optional `event_id` FK -> `events(id)` (`ON DELETE SET NULL`)
- `type`, `confidence_score`, `explanation`
- `detection_source` (`heuristic` or `llm_hybrid`)
- `llm_reasoning_summary`, `created_at`

## Current Indexing Strategy

- `idx_events_upload_timestamp_id` on `(upload_id, timestamp DESC, id DESC)`
- `idx_events_upload_src_ip` on `(upload_id, src_ip)`
- `idx_events_upload_domain` on `(upload_id, domain)`
- `idx_anomalies_upload_confidence` on `(upload_id, confidence_score DESC)`
- `idx_ingestion_jobs_upload_status` on `(upload_id, status)`

These primarily support upload-scoped reads, event pagination, and common filter dimensions.

## Query Overview (High-Level by Module)

## 1) User/Auth Query Surface (`lib/users.ts`)

### `createUser(email, password)`
Purpose:
- Inserts a new user with bcrypt password hash.

### `findUserByEmail(email)`
Purpose:
- Fetches auth material (`id`, `email`, `password_hash`) by normalized email.

### `verifyUserPassword(email, password)`
Purpose:
- Read-then-verify pattern; not a direct SQL write.

## 2) Upload and Ingestion Query Surface (`lib/uploads.ts`)

### Upload/job creation and state transitions
- `createUpload(...)`: insert upload row with initial `queued` status.
- `createIngestionJob(uploadId)`: insert job row with `queued`.
- `markUploadProcessing(uploadId)`: updates both `uploads` and `ingestion_jobs` to processing state and increments attempt count.
- `markUploadDone(uploadId, status)`: marks upload/job terminal success state.
- `markUploadFailed(uploadId, reason)`: marks upload/job failed state and persists error context.

### Event and derived data writes
- `insertEvents(uploadId, events)`: row-by-row insert of parsed events.
- `replaceTimelines(uploadId, buckets)`: delete-then-reinsert strategy for full timeline refresh per upload.
- `replaceAnomalies(uploadId, anomalies)`: delete-then-reinsert strategy for full anomaly refresh per upload.

### Upload reads/deletes
- `listUploads(userId)`: upload list ordered by newest first.
- `getUploadById(userId, uploadId)`: ownership-scoped point lookup.
- `deleteUploadById(userId, uploadId)`: ownership-scoped delete; cascades remove events/jobs/timelines/anomalies.

## 3) Analytics/API Read Query Surface (Route Handlers)

### `GET /api/uploads/:id/events`
Purpose:
- Upload-scoped event retrieval with filters and cursor pagination.

Core query characteristics:
- joins `events` -> `uploads` for user ownership check.
- optional filters: time range, `src_ip`, `domain`, `action`, `status_code`.
- keyset pagination condition:
  - `(timestamp < cursor.timestamp) OR (timestamp = cursor.timestamp AND id < cursor.id)`
- ordered by `timestamp DESC, id DESC`.

### `GET /api/uploads/:id/timeline`
Purpose:
- Returns pre-aggregated timeline buckets for one upload.
- ordered by `bucket_start ASC`.

### `GET /api/uploads/:id/anomalies`
Purpose:
- Returns anomalies for one upload, highest-confidence first.
- ordered by `confidence_score DESC, created_at DESC`.

## End-to-End Write Flow (Upload to Persisted Results)

1. Create upload + ingestion job rows (`queued`).
2. Transition upload/job to `processing`.
3. Insert parsed event rows.
4. Replace timeline aggregates for that upload.
5. Replace anomalies for that upload.
6. Mark upload/job as `completed` or `partial_success`; on exception, `failed`.

## Consistency and Transaction Notes

- Multi-step ingestion writes are not wrapped in a single SQL transaction.
- As a result, partial intermediate states are possible (for example: events written but timelines/anomalies not yet replaced) until final status transition.
- The app mitigates duplicate in-process work per upload using an in-memory `inFlightJobs` set.

## Data Access and Isolation Model

- API reads enforce ownership by joining with `uploads` and filtering by authenticated `user_id`.
- Writes are similarly scoped to a known upload/user context.
- Cascading FK rules provide predictable cleanup on upload or user deletion.

## Operational Notes for DB Engineers

- Runtime migrations are convenient for local/dev but provide limited migration history/auditability versus versioned migrations.
- `insertEvents` currently inserts one row per statement; bulk insert/COPY would improve throughput for larger files.
- `replaceTimelines` and `replaceAnomalies` use full replacement semantics (delete + reinsert), favoring simplicity over incremental updates.
- `events.raw_line_expires_at` is written but no cleanup job is defined in the current codebase.
