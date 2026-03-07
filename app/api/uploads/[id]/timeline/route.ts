import { NextResponse } from "next/server";
import { runMigrations, query } from "@/lib/db";
import { requireApiUser } from "@/lib/auth-helpers";
import type { TimelineRecord } from "@/types/loggy";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, { params }: Params) {
  await runMigrations();

  const authResult = await requireApiUser();
  if (authResult.response) {
    return authResult.response;
  }

  const { id: uploadId } = await params;

  const result = await query<TimelineRecord>(
    `
      SELECT t.id, t.bucket_start, t.bucket_end, t.event_count, t.blocked_count, t.top_ip, t.top_domain
      FROM timelines t
      JOIN uploads u ON u.id = t.upload_id
      WHERE t.upload_id = $1 AND u.user_id = $2
      ORDER BY t.bucket_start ASC
    `,
    [uploadId, authResult.userId]
  );

  return NextResponse.json({ timeline: result.rows });
}
