import { NextResponse } from "next/server";
import { runMigrations } from "@/lib/db";

export async function GET() {
  try {
    await runMigrations();
    return NextResponse.json({ status: "ok" });
  } catch {
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}
