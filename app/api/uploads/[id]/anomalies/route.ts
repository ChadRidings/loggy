import { NextResponse } from "next/server";
import { runMigrations, query } from "@/lib/db";
import { requireApiUser } from "@/lib/auth-helpers";

type Params = {
  params: Promise<{ id: string }>;
};

type AnomalyRow = {
  id: string;
  event_id: string | null;
  type: string;
  confidence_score: number;
  explanation: string;
  detection_source: "heuristic" | "llm_hybrid";
  llm_reasoning_summary: string | null;
  created_at: string;
};

export async function GET(_: Request, { params }: Params) {
  await runMigrations();

  const authResult = await requireApiUser();
  if (authResult.response) {
    return authResult.response;
  }

  const { id: uploadId } = await params;

  const result = await query<AnomalyRow>(
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
