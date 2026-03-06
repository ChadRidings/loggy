import { NextResponse } from "next/server";
import { runMigrations } from "@/lib/db";
import { requireApiUser } from "@/lib/auth-helpers";
import { getUploadById } from "@/lib/uploads";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, { params }: Params) {
  await runMigrations();

  const authResult = await requireApiUser();
  if (authResult.response) {
    return authResult.response;
  }

  const { id } = await params;
  const upload = await getUploadById(authResult.userId, id);

  if (!upload) {
    return NextResponse.json({ error: "Upload not found" }, { status: 404 });
  }

  return NextResponse.json({ upload });
}
