"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/query-keys";
import type { UploadRecord } from "@/types/loggy";

async function fetchUpload(uploadId: string): Promise<UploadRecord> {
  const response = await fetch(`/api/uploads/${uploadId}`, { cache: "no-store" });
  if (!response.ok) throw new Error("Failed to load upload");
  const data = (await response.json()) as { upload: UploadRecord };
  return data.upload;
}

export function useUploadDetailsQuery(uploadId: string) {
  return useQuery({
    queryKey: queryKeys.upload(uploadId),
    queryFn: () => fetchUpload(uploadId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "processing" || status === "queued" ? 3000 : 0;
    },
  });
}
