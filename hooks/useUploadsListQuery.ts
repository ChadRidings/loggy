"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/query-keys";
import type { UploadRecord } from "@/types/loggy";

async function fetchUploads(): Promise<UploadRecord[]> {
  const response = await fetch("/api/uploads", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Failed to load uploads");
  }

  const data = (await response.json()) as { uploads: UploadRecord[] };
  return data.uploads;
}

export function useUploadsListQuery({ autoRefresh = false }: { autoRefresh?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.uploads(),
    queryFn: fetchUploads,
    refetchInterval: autoRefresh
      ? (query) => {
          const uploads = query.state.data;
          const hasRunning = uploads?.some(
            (upload) => upload.status === "processing" || upload.status === "queued"
          );
          return hasRunning ? 3000 : 0;
        }
      : undefined,
  });
}
