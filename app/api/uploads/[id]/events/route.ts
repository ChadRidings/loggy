import { NextResponse } from "next/server";
import { z } from "zod";
import { runMigrations, query } from "@/lib/db";
import { requireApiUser } from "@/lib/auth-helpers";

type Params = {
  params: Promise<{ id: string }>;
};

type EventRow = {
  id: string;
  line_number: number;
  timestamp: string;
  src_ip: string | null;
  user_identifier: string | null;
  url: string | null;
  domain: string | null;
  http_method: string | null;
  action: string | null;
  status_code: number | null;
  bytes_out: number | null;
  user_agent: string | null;
  severity: string | null;
  parse_warning: string | null;
};

const querySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(500).default(100),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  src_ip: z.string().optional(),
  domain: z.string().optional(),
  action: z.string().optional(),
  status_code: z.coerce.number().int().optional()
});

function decodeCursor(cursor: string): { timestamp: string; id: string } | null {
  try {
    const decoded = JSON.parse(Buffer.from(cursor, "base64").toString("utf8")) as {
      timestamp: string;
      id: string;
    };

    if (!decoded.timestamp || !decoded.id) {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
}

function encodeCursor(row: EventRow): string {
  return Buffer.from(JSON.stringify({ timestamp: row.timestamp, id: row.id }), "utf8").toString("base64");
}

export async function GET(req: Request, { params }: Params) {
  await runMigrations();

  const authResult = await requireApiUser();
  if (authResult.response) {
    return authResult.response;
  }

  const { id: uploadId } = await params;
  const url = new URL(req.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query parameters" }, { status: 400 });
  }

  const whereClauses: string[] = ["e.upload_id = $1", "u.user_id = $2"];
  const values: unknown[] = [uploadId, authResult.userId];

  if (parsed.data.start_time) {
    values.push(parsed.data.start_time);
    whereClauses.push(`e.timestamp >= $${values.length}`);
  }

  if (parsed.data.end_time) {
    values.push(parsed.data.end_time);
    whereClauses.push(`e.timestamp <= $${values.length}`);
  }

  if (parsed.data.src_ip) {
    values.push(parsed.data.src_ip);
    whereClauses.push(`e.src_ip = $${values.length}`);
  }

  if (parsed.data.domain) {
    values.push(parsed.data.domain);
    whereClauses.push(`e.domain = $${values.length}`);
  }

  if (parsed.data.action) {
    values.push(parsed.data.action);
    whereClauses.push(`e.action = $${values.length}`);
  }

  if (typeof parsed.data.status_code === "number") {
    values.push(parsed.data.status_code);
    whereClauses.push(`e.status_code = $${values.length}`);
  }

  if (parsed.data.cursor) {
    const cursor = decodeCursor(parsed.data.cursor);
    if (!cursor) {
      return NextResponse.json({ error: "Invalid cursor" }, { status: 400 });
    }

    values.push(cursor.timestamp);
    const timestampPos = values.length;
    values.push(cursor.id);
    const idPos = values.length;
    whereClauses.push(`(e.timestamp < $${timestampPos} OR (e.timestamp = $${timestampPos} AND e.id < $${idPos}))`);
  }

  values.push(parsed.data.limit + 1);

  const result = await query<EventRow>(
    `
      SELECT
        e.id,
        e.line_number,
        e.timestamp,
        e.src_ip,
        e.user_identifier,
        e.url,
        e.domain,
        e.http_method,
        e.action,
        e.status_code,
        e.bytes_out,
        e.user_agent,
        e.severity,
        e.parse_warning
      FROM events e
      JOIN uploads u ON u.id = e.upload_id
      WHERE ${whereClauses.join(" AND ")}
      ORDER BY e.timestamp DESC, e.id DESC
      LIMIT $${values.length}
    `,
    values
  );

  const hasMore = result.rows.length > parsed.data.limit;
  const rows = hasMore ? result.rows.slice(0, parsed.data.limit) : result.rows;

  return NextResponse.json({
    events: rows,
    nextCursor: hasMore ? encodeCursor(rows[rows.length - 1]) : null
  });
}
