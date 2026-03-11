# How Frontend Queries Work in Loggy

## Purpose

This document is a quick reference for the client-side TanStack Query layer in Loggy:

- Which hooks exist
- What each hook fetches or mutates
- Which query keys are used
- Where the hooks are consumed
- How refresh and invalidation currently work

This is focused on frontend query behavior only. For backend SQL and API query details, see [how_db_works.md](./how_db_works.md).

## Query Key Map

Query keys are defined in `hooks/query-keys.ts`:

- `queryKeys.uploads()` -> `["uploads"]`
- `queryKeys.upload(uploadId)` -> `["upload", uploadId]`
- `queryKeys.timeline(uploadId)` -> `["timeline", uploadId]`
- `queryKeys.anomalies(uploadId)` -> `["anomalies", uploadId]`
- `queryKeys.eventsBase(uploadId)` -> `["events", uploadId]`
- `queryKeys.events(uploadId, filters)` -> `["events", uploadId, filters]`

Intended cache scope:

- Collection cache: all uploads (`["uploads"]`)
- Upload-scoped cache: one upload and its related resources
- Filter-scoped cache: events list includes filters in key so each filter combination caches independently

## Hook Responsibilities

- `useUploadsListQuery` (`hooks/useUploadsListQuery.ts`)
  - Fetches upload list from `GET /api/uploads`
  - Supports optional auto-refresh while any upload is queued/processing
- `useUploadDetailsQuery` (`hooks/useUploadDetailsQuery.ts`)
  - Fetches one upload from `GET /api/uploads/:id`
  - Auto-refreshes while the upload is queued/processing
- `useTimelineQuery` (`hooks/useTimelineQuery.ts`)
  - Fetches timeline buckets from `GET /api/uploads/:id/timeline`
  - Polls while processing; keeps previous data during refetch
- `useAnomaliesQuery` (`hooks/useAnomaliesQuery.ts`)
  - Fetches anomalies from `GET /api/uploads/:id/anomalies`
  - Polls while processing; keeps previous data during refetch
- `useEventsInfiniteQuery` (`hooks/useEventsInfiniteQuery.ts`)
  - Fetches paginated events from `GET /api/uploads/:id/events`
  - Cursor-based infinite query with filter-aware key
  - Polls while processing; keeps previous data during refetch
- `useUploadMutation` (`hooks/useUploadMutation.ts`)
  - Uploads file via `POST /api/uploads`
  - Invalidates `["uploads"]` on success
- `useDeleteUploadMutation` (`hooks/useDeleteUploadMutation.ts`)
  - Deletes upload via `DELETE /api/uploads/:id`
  - Invalidates `["uploads"]` on success

## Current Hook Consumers

- Dashboard (`components/dashboard-client.tsx`)
  - Uses `useUploadsListQuery` for recent upload history
  - Uses `useUploadMutation` for file upload flow
- Archive (`components/archive-client.tsx`)
  - Uses `useUploadsListQuery` for full upload history
  - Uses `useDeleteUploadMutation` for delete flow
- Upload Details (`components/upload-details-client.tsx`)
  - Uses `useUploadDetailsQuery`, `useTimelineQuery`, `useAnomaliesQuery`, `useEventsInfiniteQuery`
  - Invalidates upload-scoped keys when status transitions from queued/processing to terminal state

## Refresh and Invalidation Behavior

- List refresh:
  - Upload list can auto-refresh every 3s while there are running uploads.
- Detail refresh:
  - Upload details poll every 3s while upload is queued/processing.
  - Timeline, anomalies, and events also poll every 3s during processing.
- Completion consistency:
  - On first terminal transition in Upload Details (`completed`, `partial_success`, `failed`), the UI invalidates:
    - `queryKeys.timeline(uploadId)`
    - `queryKeys.anomalies(uploadId)`
    - `queryKeys.eventsBase(uploadId)`
- Mutation consistency:
  - Create/delete upload mutations invalidate `queryKeys.uploads()` so list views stay current.
