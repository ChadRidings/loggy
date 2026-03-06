import { query } from "@/lib/db";
import type { ParsedEventInput } from "@/lib/parser/log-parser";

export type UploadRow = {
  id: string;
  user_id: string;
  filename: string;
  source_type: string;
  status: string;
  raw_size_bytes: number;
  uploaded_at: string;
  failure_reason: string | null;
};

export type IngestionJobRow = {
  id: string;
  upload_id: string;
  status: string;
  attempt_count: number;
  started_at: string | null;
  finished_at: string | null;
  last_error: string | null;
};

export async function createUpload(args: {
  userId: string;
  filename: string;
  sourceType: string;
  rawSizeBytes: number;
}): Promise<UploadRow> {
  const result = await query<UploadRow>(
    `
      INSERT INTO uploads (user_id, filename, source_type, status, raw_size_bytes)
      VALUES ($1, $2, $3, 'queued', $4)
      RETURNING id, user_id, filename, source_type, status, raw_size_bytes, uploaded_at, failure_reason
    `,
    [args.userId, args.filename, args.sourceType, args.rawSizeBytes]
  );

  return result.rows[0];
}

export async function createIngestionJob(uploadId: string): Promise<IngestionJobRow> {
  const result = await query<IngestionJobRow>(
    `
      INSERT INTO ingestion_jobs (upload_id, status)
      VALUES ($1, 'queued')
      RETURNING id, upload_id, status, attempt_count, started_at, finished_at, last_error
    `,
    [uploadId]
  );

  return result.rows[0];
}

export async function markUploadProcessing(uploadId: string): Promise<void> {
  await query(
    `
      UPDATE uploads
      SET status = 'processing', failure_reason = NULL
      WHERE id = $1
    `,
    [uploadId]
  );

  await query(
    `
      UPDATE ingestion_jobs
      SET status = 'processing',
          started_at = NOW(),
          updated_at = NOW(),
          attempt_count = attempt_count + 1
      WHERE upload_id = $1
    `,
    [uploadId]
  );
}

export async function markUploadFailed(uploadId: string, reason: string): Promise<void> {
  await query(
    `
      UPDATE uploads
      SET status = 'failed', failure_reason = $2
      WHERE id = $1
    `,
    [uploadId, reason]
  );

  await query(
    `
      UPDATE ingestion_jobs
      SET status = 'failed',
          finished_at = NOW(),
          updated_at = NOW(),
          last_error = $2
      WHERE upload_id = $1
    `,
    [uploadId, reason]
  );
}

export async function markUploadDone(uploadId: string, status: "completed" | "partial_success"): Promise<void> {
  await query(
    `
      UPDATE uploads
      SET status = $2,
          failure_reason = NULL
      WHERE id = $1
    `,
    [uploadId, status]
  );

  await query(
    `
      UPDATE ingestion_jobs
      SET status = $2,
          finished_at = NOW(),
          updated_at = NOW(),
          last_error = NULL
      WHERE upload_id = $1
    `,
    [uploadId, status]
  );
}

export async function insertEvents(uploadId: string, events: ParsedEventInput[]): Promise<void> {
  if (events.length === 0) {
    return;
  }

  for (const event of events) {
    await query(
      `
        INSERT INTO events (
          upload_id,
          line_number,
          timestamp,
          src_ip,
          user_identifier,
          url,
          domain,
          http_method,
          action,
          status_code,
          bytes_out,
          user_agent,
          severity,
          raw_line,
          raw_line_expires_at,
          parse_warning
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW() + INTERVAL '30 days', $15)
      `,
      [
        uploadId,
        event.lineNumber,
        event.timestamp,
        event.srcIp,
        event.userIdentifier,
        event.url,
        event.domain,
        event.httpMethod,
        event.action,
        event.statusCode,
        event.bytesOut,
        event.userAgent,
        event.severity,
        event.rawLine,
        event.parseWarning
      ]
    );
  }
}

type TimelineInput = {
  bucketStart: string;
  bucketEnd: string;
  eventCount: number;
  blockedCount: number;
  topIp: string | null;
  topDomain: string | null;
};

export async function replaceTimelines(uploadId: string, buckets: TimelineInput[]): Promise<void> {
  await query("DELETE FROM timelines WHERE upload_id = $1", [uploadId]);

  for (const bucket of buckets) {
    await query(
      `
        INSERT INTO timelines (upload_id, bucket_start, bucket_end, event_count, blocked_count, top_ip, top_domain)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [uploadId, bucket.bucketStart, bucket.bucketEnd, bucket.eventCount, bucket.blockedCount, bucket.topIp, bucket.topDomain]
    );
  }
}

export async function listUploads(userId: string): Promise<UploadRow[]> {
  const result = await query<UploadRow>(
    `
      SELECT id, user_id, filename, source_type, status, raw_size_bytes, uploaded_at, failure_reason
      FROM uploads
      WHERE user_id = $1
      ORDER BY uploaded_at DESC
    `,
    [userId]
  );

  return result.rows;
}

export async function getUploadById(userId: string, uploadId: string): Promise<UploadRow | null> {
  const result = await query<UploadRow>(
    `
      SELECT id, user_id, filename, source_type, status, raw_size_bytes, uploaded_at, failure_reason
      FROM uploads
      WHERE id = $1 AND user_id = $2
      LIMIT 1
    `,
    [uploadId, userId]
  );

  return result.rows[0] ?? null;
}
