import { Pool, type QueryResult, type QueryResultRow } from "pg";

let pool: Pool | null = null;
let migrationPromise: Promise<void> | null = null;

function getPool(): Pool {
  if (pool) {
    return pool;
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set.");
  }

  pool = new Pool({ connectionString: databaseUrl });
  return pool;
}

export async function query<T extends QueryResultRow>(
  sql: string,
  params: unknown[] = []
): Promise<QueryResult<T>> {
  const db = getPool();
  return db.query<T>(sql, params);
}

export async function runMigrations(): Promise<void> {
  if (migrationPromise) {
    return migrationPromise;
  }

  migrationPromise = (async () => {
    const db = getPool();

    await db.query(`
      CREATE EXTENSION IF NOT EXISTS pgcrypto;

      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'analyst',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS uploads (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        filename TEXT NOT NULL,
        source_type TEXT NOT NULL DEFAULT 'zscaler',
        status TEXT NOT NULL,
        raw_size_bytes BIGINT NOT NULL,
        uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        failure_reason TEXT
      );

      CREATE TABLE IF NOT EXISTS ingestion_jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        upload_id UUID NOT NULL REFERENCES uploads(id) ON DELETE CASCADE,
        status TEXT NOT NULL,
        attempt_count INT NOT NULL DEFAULT 0,
        started_at TIMESTAMPTZ,
        finished_at TIMESTAMPTZ,
        last_error TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        upload_id UUID NOT NULL REFERENCES uploads(id) ON DELETE CASCADE,
        line_number INT NOT NULL,
        timestamp TIMESTAMPTZ NOT NULL,
        src_ip TEXT,
        user_identifier TEXT,
        url TEXT,
        domain TEXT,
        http_method TEXT,
        action TEXT,
        status_code INT,
        bytes_out BIGINT,
        user_agent TEXT,
        severity TEXT,
        raw_line TEXT,
        raw_line_expires_at TIMESTAMPTZ,
        parse_warning TEXT
      );

      CREATE TABLE IF NOT EXISTS timelines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        upload_id UUID NOT NULL REFERENCES uploads(id) ON DELETE CASCADE,
        bucket_start TIMESTAMPTZ NOT NULL,
        bucket_end TIMESTAMPTZ NOT NULL,
        event_count INT NOT NULL,
        blocked_count INT NOT NULL,
        top_ip TEXT,
        top_domain TEXT
      );

      CREATE TABLE IF NOT EXISTS anomalies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        upload_id UUID NOT NULL REFERENCES uploads(id) ON DELETE CASCADE,
        event_id UUID REFERENCES events(id) ON DELETE SET NULL,
        type TEXT NOT NULL,
        confidence_score NUMERIC(4, 2) NOT NULL,
        explanation TEXT NOT NULL,
        detection_source TEXT NOT NULL DEFAULT 'heuristic',
        llm_reasoning_summary TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'anomalies'
            AND column_name = 'label'
        ) THEN
          ALTER TABLE anomalies ALTER COLUMN label DROP NOT NULL;
        END IF;
      END $$;

      CREATE INDEX IF NOT EXISTS idx_events_upload_timestamp_id
        ON events(upload_id, timestamp DESC, id DESC);
      CREATE INDEX IF NOT EXISTS idx_events_upload_src_ip
        ON events(upload_id, src_ip);
      CREATE INDEX IF NOT EXISTS idx_events_upload_domain
        ON events(upload_id, domain);
      CREATE INDEX IF NOT EXISTS idx_anomalies_upload_confidence
        ON anomalies(upload_id, confidence_score DESC);
      CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_upload_status
        ON ingestion_jobs(upload_id, status);
    `);
  })();

  return migrationPromise;
}
