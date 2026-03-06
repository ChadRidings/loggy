import { NextResponse } from "next/server";
import { z } from "zod";
import { createUser } from "@/lib/users";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128)
});

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;
const requestCounts = new Map<string, { count: number; windowStart: number }>();

function getClientKey(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "local";
}

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = requestCounts.get(key);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    requestCounts.set(key, { count: 1, windowStart: now });
    return false;
  }

  entry.count += 1;
  requestCounts.set(key, entry);
  return entry.count > RATE_LIMIT_MAX;
}

export async function POST(req: Request) {
  const key = getClientKey(req);
  if (isRateLimited(key)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const json = await req.json().catch(() => null);
  const parsed = registerSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  try {
    const user = await createUser(parsed.data.email, parsed.data.password);
    return NextResponse.json({ id: user.id, email: user.email }, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "23505") {
      return NextResponse.json({ error: "Email is already registered." }, { status: 409 });
    }

    return NextResponse.json({ error: "Failed to register user." }, { status: 500 });
  }
}
