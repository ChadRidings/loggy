# How AI Works in Loggy

## High-Level Overview

Loggy uses AI to **enrich anomaly detection results**, not to parse logs.

At a high level:

1. The app parses uploaded logs with deterministic parsing logic.
2. It runs deterministic heuristic anomaly detection.
3. It can optionally call an LLM to refine anomaly confidence and add concise analyst-style reasoning.
4. If LLM enrichment is disabled or fails, Loggy falls back to heuristic-only results.

This design keeps ingestion reliable and predictable while still allowing AI-assisted context when enabled.

## AI Purpose in This Application

The AI layer exists to improve analyst usability by:

- Adding a short reasoning summary per anomaly candidate.
- Calibrating heuristic confidence scores (0-10 scale).
- Preserving graceful degradation when model calls are unavailable.

It is **not** used for:

- Log line parsing.
- Event extraction.
- Timeline aggregation.
- Access control or authorization.

## End-to-End AI Flow (from Upload button click)

### 1. User clicks `Upload` in Dashboard

- UI: `components/dashboard-client.tsx`
- The client builds a `FormData` payload with:
  - `file`
  - `sourceType` (`zscaler` or `generic`)
- It sends `POST /api/uploads`.

### 2. API validates and queues ingestion

- Route: `app/api/uploads/route.ts`
- Server validates:
  - authenticated user
  - file extension (`.log` / `.txt`)
  - file size (`1 byte` to `10 MB`)
  - non-empty file contents
  - valid `sourceType`
- It writes DB rows:
  - `uploads` row with status `queued`
  - `ingestion_jobs` row with status `queued`
- It starts async processing via:
  - `enqueueUploadProcessing(upload.id, fileText)`
- API returns `202 Accepted` with `uploadId`, `status`, and `jobId`.

### 3. Async ingestion job starts

- Logic: `lib/ingestion.ts`
- Job status moves to `processing`.
- Migrations are ensured (`runMigrations()`).

### 4. Log parsing runs (deterministic, non-AI)

- Parser: `lib/parser/log-parser.ts`
- `parseLogContent()` attempts:
  - Zscaler-like CSV parsing
  - generic key/value parsing
- Output:
  - normalized event list
  - warnings for unrecognized lines
- Parsed events are inserted into `events` table.

### 5. Timeline summary is built (deterministic, non-AI)

- Logic: `buildTimelineBuckets()` in `lib/ingestion.ts`
- Events are grouped into 15-minute UTC buckets.
- Aggregates include:
  - event count
  - blocked/denied count
  - top source IP
  - top domain
- Buckets are written to `timelines` table.

### 6. Heuristic anomaly detection runs

- Logic: `detectAnomalies()` + `buildHeuristicAnomalies()` in `lib/anomaly.ts`
- Current heuristic detections include:
  - `ip_volume_spike`
  - `high_deny_ratio`
  - `rare_domain_surge`
- Each anomaly includes:
  - `type`
  - `confidenceScore`
  - `explanation`
  - `detectionSource = "heuristic"`

### 7. Optional LLM anomaly enrichment

- Logic: `requestLlmPatches()` in `lib/anomaly.ts`
- LLM is called only when all are true:
  - `ENABLE_LLM_ANOMALY=true`
  - `OPENAI_API_KEY` is set
  - there is at least one heuristic anomaly
- Request details:
  - endpoint: `https://api.openai.com/v1/responses`
  - model: `OPENAI_MODEL` (default `gpt-4.1-mini`)
  - input includes:
    - heuristic anomalies (type, confidence, explanation)
    - bounded event sample (first 40 events, key fields only)
  - response is constrained to a strict JSON schema
- Returned patches may update:
  - `confidenceScore`
  - `llmReasoningSummary`
- If patched, anomaly `detectionSource` becomes `llm_hybrid`.

### 8. Fallback behavior if LLM fails

- Any LLM error is caught.
- Pipeline returns heuristic anomalies unchanged.
- Processing continues without failing the upload.

### 9. Persist anomalies + finalize status

- Ingestion writes anomalies to `anomalies` table.
- Final upload status:
  - `completed` when no parse warnings
  - `partial_success` when warnings exist
  - `failed` on processing exception

### 10. UI retrieval and display

- Upload details UI (`components/upload-details-client.tsx`) polls while status is `queued`/`processing`.
- It loads:
  - `/api/uploads/:id`
  - `/api/uploads/:id/timeline`
  - `/api/uploads/:id/anomalies`
  - `/api/uploads/:id/events`
- Analysts see anomaly cards with confidence, explanation, source, and optional LLM reasoning summary.

## Practical Summary

Loggy’s AI is deliberately scoped as a **post-detection enrichment layer**. The core detection pipeline remains deterministic and resilient, while optional LLM enrichment improves interpretability without becoming a single point of failure.
