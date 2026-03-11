"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/query-keys";
import type { EventRecord } from "@/types/loggy";

type EventFilters = Record<string, string>;
type EventsPage = { events: EventRecord[]; nextCursor: string | null };

async function fetchEvents(args: {
  uploadId: string;
  cursor: string | null;
  filters: EventFilters;
}): Promise<EventsPage> {
  const params = new URLSearchParams();
  params.set("limit", "100");

  if (args.cursor) {
    params.set("cursor", args.cursor);
  }

  Object.entries(args.filters).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });

  const response = await fetch(`/api/uploads/${args.uploadId}/events?${params.toString()}`, {
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Failed to load events");
  return (await response.json()) as EventsPage;
}

export function useEventsInfiniteQuery(
  uploadId: string,
  eventFilterParams: EventFilters,
  isProcessing: boolean
) {
  return useInfiniteQuery({
    queryKey: queryKeys.events(uploadId, eventFilterParams),
    queryFn: ({ pageParam }) =>
      fetchEvents({ uploadId, cursor: pageParam, filters: eventFilterParams }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    refetchInterval: isProcessing ? 3000 : false,
    placeholderData: (previousData) => previousData,
  });
}
