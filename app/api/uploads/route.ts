import { after, NextResponse } from "next/server";
import { z } from "zod";
import { runMigrations } from "@/lib/db";
import { enqueueUploadProcessing } from "@/lib/ingestion";
import { requireApiUser } from "@/lib/auth-helpers";
import { createIngestionJob, createUpload, listUploads } from "@/lib/uploads";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const allowedFileName = /\.(log|txt)$/i;

const sourceTypeSchema = z.enum(["zscaler", "generic"]).default("zscaler");

export async function GET() {
  await runMigrations();

  const authResult = await requireApiUser();
  if (authResult.response) {
    return authResult.response;
  }

  const uploads = await listUploads(authResult.userId);
  return NextResponse.json({ uploads });
}

export async function POST(req: Request) {
  await runMigrations();

  const authResult = await requireApiUser();
  if (authResult.response) {
    return authResult.response;
  }

  const formData = await req.formData();
  const file = formData.get("file");
  const sourceTypeRaw = formData.get("sourceType");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  if (!allowedFileName.test(file.name)) {
    return NextResponse.json({ error: "Only .log and .txt files are supported" }, { status: 400 });
  }

  if (file.size <= 0 || file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json({ error: "File size must be between 1 byte and 10 MB" }, { status: 400 });
  }

  const sourceTypeParsed = sourceTypeSchema.safeParse(sourceTypeRaw || "zscaler");
  if (!sourceTypeParsed.success) {
    return NextResponse.json({ error: "Invalid sourceType" }, { status: 400 });
  }

  const fileText = await file.text();
  if (!fileText.trim()) {
    return NextResponse.json({ error: "Uploaded file is empty" }, { status: 400 });
  }

  const upload = await createUpload({
    userId: authResult.userId,
    filename: file.name,
    sourceType: sourceTypeParsed.data,
    rawSizeBytes: file.size
  });

  const job = await createIngestionJob(upload.id);

  after(() => {
    enqueueUploadProcessing(upload.id, fileText);
  });

  return NextResponse.json(
    {
      uploadId: upload.id,
      status: upload.status,
      jobId: job.id
    },
    { status: 202 }
  );
}
