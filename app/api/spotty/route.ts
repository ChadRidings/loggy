import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth-helpers";
import { getSpotifyRepositoryActivity } from "@/lib/spotify-github";

export async function GET() {
  const authResult = await requireApiUser();
  if (authResult.response) {
    return authResult.response;
  }

  try {
    const repositories = await getSpotifyRepositoryActivity();
    return NextResponse.json({ repositories });
  } catch (error) {
    console.error("Failed to fetch Spotify GitHub repositories", error);
    return NextResponse.json(
      { error: "Failed to load Spotify GitHub repositories" },
      { status: 502 }
    );
  }
}
