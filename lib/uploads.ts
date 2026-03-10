import { query } from "@/lib/db";
import type { ParsedEventInput } from "@/lib/parser/log-parser";
import type { IngestionJobRecord, UploadRecord } from "@/types/loggy";

export type UploadRow = UploadRecord;
export type IngestionJobRow = IngestionJobRecord;

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

  const chunkSize = 500;

  for (let start = 0; start < events.length; start += chunkSize) {
    const chunk = events.slice(start, start + chunkSize);
    const values: unknown[] = [];
    const tuples: string[] = [];

    chunk.forEach((event, index) => {
      const offset = index * 15;
      values.push(
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
      );

      tuples.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13}, $${offset + 14}, NOW() + INTERVAL '30 days', $${offset + 15})`
      );
    });

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
        VALUES ${tuples.join(", ")}
      `,
      values
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

type AnomalyInput = {
  eventId: string | null;
  type: string;
  confidenceScore: number;
  explanation: string;
  detectionSource: "heuristic" | "llm_hybrid";
  llmReasoningSummary: string | null;
};

export async function replaceAnomalies(uploadId: string, anomalies: AnomalyInput[]): Promise<void> {
  await query("DELETE FROM anomalies WHERE upload_id = $1", [uploadId]);

  for (const anomaly of anomalies) {
    await query(
      `
        INSERT INTO anomalies (upload_id, event_id, type, confidence_score, explanation, detection_source, llm_reasoning_summary)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        uploadId,
        anomaly.eventId,
        anomaly.type,
        anomaly.confidenceScore,
        anomaly.explanation,
        anomaly.detectionSource,
        anomaly.llmReasoningSummary
      ]
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

export async function deleteUploadById(userId: string, uploadId: string): Promise<boolean> {
  const result = await query(
    `
      DELETE FROM uploads
      WHERE id = $1 AND user_id = $2
    `,
    [uploadId, userId]
  );

  return (result.rowCount ?? 0) > 0;
}
