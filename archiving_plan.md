# Archiving Feature Plan

## Summary

Implement archive behavior by recency emphasis: the 5 newest uploads are highlighted on Dashboard, while the Archive page lists all uploads in descending order. Add Radix UI Navigation Menu links for Dashboard and Archive. Add permanent delete for uploads via a three-dots action menu with confirmation.

## Implementation Changes

- **Navigation**
  - Add a shared Radix `NavigationMenu` for authenticated app pages with links: `Dashboard` (`/dashboard`) and `Archive` (`/archive`).
  - Show active-state styling based on current pathname.
- **Archive behavior**
  - Keep upload ordering by `uploaded_at DESC`.
  - Dashboard Upload History renders only `uploads.slice(0, 5)`.
  - Archive page renders all uploads (newest-first), including the latest 5 shown on Dashboard.
  - No new DB column/flag; recency is used only for Dashboard highlighting.
- **Archive page UI**
  - Add `/archive` page (auth-protected, same session guard pattern as dashboard).
  - Render archived uploads list with status, timestamp, file size, and link to analysis.
  - Add right-aligned three-dots trigger per row (Radix menu) with `Delete log` action.
  - Add confirmation dialog before delete (permanent action).
- **Delete API + data layer**
  - Extend `app/api/uploads/[id]/route.ts` with `DELETE`.
  - Add data-layer method in `lib/uploads.ts` to delete upload by `id + user_id`.
  - Rely on existing FK `ON DELETE CASCADE` to remove related events, anomalies, timelines, and ingestion jobs.
  - Return `204` on success, `404` if not found or not owned by user.
- **Client query behavior**
  - Reuse existing uploads query key (`["uploads"]`) in Dashboard and Archive.
  - On archive delete success: invalidate `["uploads"]` so both pages refresh consistently.

## Public API / Interface Changes

- `DELETE /api/uploads/:id`
  - Auth required.
  - Deletes one owned upload and all dependent records via DB cascades.
  - Responses: `204` success, `404` not found, `401` unauthorized.

## Test Plan

- **API route tests**
  - `DELETE` returns `204` for owned upload and removes row.
  - `DELETE` returns `404` for non-existent or non-owned upload.
  - `GET /api/uploads` ordering still newest-first.
- **UI behavior tests**
  - Dashboard shows at most 5 newest uploads.
  - Archive shows all uploads in descending `uploaded_at` order, including uploads shown on Dashboard.
  - Archive row menu opens from three-dots and exposes `Delete log`.
  - Confirming delete removes item from Archive after query invalidation.
  - Canceling confirmation does not delete.

## Assumptions and Defaults

- Dashboard highlights newest 5 uploads by recency; Archive remains a full historical listing.
- Archive listing includes any status (`queued`, `processing`, `completed`, `failed`, `partial_success`).
- Archive page initially lists all uploads without pagination/filtering.
- Deletion is permanent and only available from Archive UI.
