import { NextResponse } from "next/server";
import { runMigrations, query } from "@/lib/db";
import { requireApiUser } from "@/lib/auth-helpers";
import type { AnomalyRecord } from "@/types/loggy";

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

  const result = await query<AnomalyRecord>(
    `
      SELECT a.id, a.event_id, a.type, a.confidence_score, a.explanation, a.detection_source, a.llm_reasoning_summary, a.created_at
      FROM anomalies a
      JOIN uploads u ON u.id = a.upload_id
      WHERE a.upload_id = $1 AND u.user_id = $2
      ORDER BY a.confidence_score DESC, a.created_at DESC
    `,
    [uploadId, authResult.userId]
  );

  return NextResponse.json({ anomalies: result.rows });
}
