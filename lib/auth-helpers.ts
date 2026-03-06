import { NextResponse } from "next/server";
import { auth } from "@/auth";

type RequireUserResult =
  | { userId: string; response: null }
  | { userId: null; response: NextResponse<{ error: string }> };

export async function requireApiUser(): Promise<RequireUserResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      userId: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    };
  }

  return {
    userId: session.user.id,
    response: null
  };
}
