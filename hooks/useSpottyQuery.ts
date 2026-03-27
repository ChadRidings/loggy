"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/query-keys";
import type { SpotifyRepoActivity } from "@/types/loggy";

async function fetchSpottyRepositories(): Promise<SpotifyRepoActivity[]> {
  const response = await fetch("/api/spotty", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Failed to load Spotify repositories");
  }

  const data = (await response.json()) as { repositories: SpotifyRepoActivity[] };
  return data.repositories;
}

export function useSpottyQuery() {
  return useQuery({
    queryKey: queryKeys.spotty(),
    queryFn: fetchSpottyRepositories,
  });
}
