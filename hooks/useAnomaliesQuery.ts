"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/query-keys";
import type { AnomalyRecord } from "@/types/loggy";

async function fetchAnomalies(uploadId: string): Promise<AnomalyRecord[]> {
  const response = await fetch(`/api/uploads/${uploadId}/anomalies`, { cache: "no-store" });
  if (!response.ok) throw new Error("Failed to load anomalies");
  const data = (await response.json()) as { anomalies: AnomalyRecord[] };
  return data.anomalies;
}

export function useAnomaliesQuery(uploadId: string, isProcessing: boolean) {
  return useQuery({
    queryKey: queryKeys.anomalies(uploadId),
    queryFn: () => fetchAnomalies(uploadId),
    refetchInterval: isProcessing ? 3000 : false,
    placeholderData: (previousData) => previousData,
  });
}
