"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/query-keys";
import type { TimelineRecord } from "@/types/loggy";

async function fetchTimeline(uploadId: string): Promise<TimelineRecord[]> {
  const response = await fetch(`/api/uploads/${uploadId}/timeline`, { cache: "no-store" });
  if (!response.ok) throw new Error("Failed to load timeline");
  const data = (await response.json()) as { timeline: TimelineRecord[] };
  return data.timeline;
}

export function useTimelineQuery(uploadId: string, isProcessing: boolean) {
  return useQuery({
    queryKey: queryKeys.timeline(uploadId),
    queryFn: () => fetchTimeline(uploadId),
    refetchInterval: isProcessing ? 3000 : false,
    placeholderData: (previousData) => previousData,
  });
}
