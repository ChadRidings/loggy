"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { Form, ScrollArea, Separator } from "radix-ui";
import { useUploadUiStore } from "@/store/upload-ui-store";
import { StatusBadge } from "@/components/status-badge";
import { PaginationControls } from "@/components/pagination-controls";
import { formatAnomalyType } from "@/lib/anomaly-labels";
import type { AnomalyRecord, EventRecord, TimelineRecord, UploadRecord } from "@/types/loggy";

async function fetchUpload(uploadId: string): Promise<UploadRecord> {
  const response = await fetch(`/api/uploads/${uploadId}`, { cache: "no-store" });
  if (!response.ok) throw new Error("Failed to load upload");
  const data = (await response.json()) as { upload: UploadRecord };
  return data.upload;
}

async function fetchTimeline(uploadId: string): Promise<TimelineRecord[]> {
  const response = await fetch(`/api/uploads/${uploadId}/timeline`, { cache: "no-store" });
  if (!response.ok) throw new Error("Failed to load timeline");
  const data = (await response.json()) as { timeline: TimelineRecord[] };
  return data.timeline;
}

async function fetchAnomalies(uploadId: string): Promise<AnomalyRecord[]> {
  const response = await fetch(`/api/uploads/${uploadId}/anomalies`, { cache: "no-store" });
  if (!response.ok) throw new Error("Failed to load anomalies");
  const data = (await response.json()) as { anomalies: AnomalyRecord[] };
  return data.anomalies;
}

async function fetchEvents(args: {
  uploadId: string;
  cursor: string | null;
  filters: Record<string, string>;
}): Promise<{ events: EventRecord[]; nextCursor: string | null }> {
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
  return (await response.json()) as { events: EventRecord[]; nextCursor: string | null };
}

export function UploadDetailsClient({ uploadId }: { uploadId: string }) {
  const { filters, setFilter, resetFilters, selectedAnomalyId, setSelectedAnomalyId } =
    useUploadUiStore();
  const queryClient = useQueryClient();
  const previousStatusRef = useRef<string | undefined>(undefined);
  const eventsScrollContainerRef = useRef<HTMLDivElement | null>(null);
  const eventsScrollSentinelRef = useRef<HTMLDivElement | null>(null);

  const [timelinePage, setTimelinePage] = useState(1);
  const [anomalyPage, setAnomalyPage] = useState(1);

  const uploadQuery = useQuery({
    queryKey: ["upload", uploadId],
    queryFn: () => fetchUpload(uploadId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "processing" || status === "queued" ? 3000 : 0;
    },
  });

  const isProcessing =
    uploadQuery.data?.status === "processing" || uploadQuery.data?.status === "queued";

  const timelineQuery = useQuery({
    queryKey: ["timeline", uploadId],
    queryFn: () => fetchTimeline(uploadId),
    refetchInterval: isProcessing ? 3000 : false,
    placeholderData: (previousData) => previousData,
  });

  const anomalyQuery = useQuery({
    queryKey: ["anomalies", uploadId],
    queryFn: () => fetchAnomalies(uploadId),
    refetchInterval: isProcessing ? 3000 : false,
    placeholderData: (previousData) => previousData,
  });

  const eventFilterParams = useMemo(
    () => ({
      src_ip: filters.srcIp,
      domain: filters.domain,
      action: filters.action,
      status_code: filters.statusCode,
      start_time: filters.startTime,
      end_time: filters.endTime,
    }),
    [filters]
  );

  const eventsQuery = useInfiniteQuery({
    queryKey: ["events", uploadId, eventFilterParams],
    queryFn: ({ pageParam }) =>
      fetchEvents({ uploadId, cursor: pageParam, filters: eventFilterParams }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    refetchInterval: isProcessing ? 3000 : false,
    placeholderData: (previousData) => previousData,
  });

  useEffect(() => {
    const currentStatus = uploadQuery.data?.status;
    const previousStatus = previousStatusRef.current;

    const finishedNow =
      (previousStatus === "queued" || previousStatus === "processing") &&
      (currentStatus === "completed" ||
        currentStatus === "partial_success" ||
        currentStatus === "failed");

    if (finishedNow) {
      void queryClient.invalidateQueries({ queryKey: ["timeline", uploadId] });
      void queryClient.invalidateQueries({ queryKey: ["anomalies", uploadId] });
      void queryClient.invalidateQueries({ queryKey: ["events", uploadId] });
    }

    previousStatusRef.current = currentStatus;
  }, [queryClient, uploadId, uploadQuery.data?.status]);

  useEffect(() => {
    const root = eventsScrollContainerRef.current;
    const sentinel = eventsScrollSentinelRef.current;

    if (!root || !sentinel) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const isIntersecting = entries.some((entry) => entry.isIntersecting);
        if (!isIntersecting || !eventsQuery.hasNextPage || eventsQuery.isFetchingNextPage) {
          return;
        }
        void eventsQuery.fetchNextPage();
      },
      {
        root,
        rootMargin: "200px 0px",
      }
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [
    eventsQuery.fetchNextPage,
    eventsQuery.hasNextPage,
    eventsQuery.isFetchingNextPage,
    eventsQuery.data?.pages.length,
  ]);

  useEffect(() => {
    const root = eventsScrollContainerRef.current;
    if (!root) {
      return;
    }

    root.scrollTop = 0;
  }, [eventFilterParams]);

  useEffect(() => {
    setTimelinePage(1);
  }, [timelineQuery.data]);

  useEffect(() => {
    setAnomalyPage(1);
  }, [anomalyQuery.data]);

  const pageSize = 5;
  const timelineItems = timelineQuery.data ?? [];
  const timelineTotalPages = Math.max(1, Math.ceil(timelineItems.length / pageSize));
  const visibleTimelineItems = timelineItems.slice(
    (timelinePage - 1) * pageSize,
    timelinePage * pageSize
  );

  const anomalyItems = anomalyQuery.data ?? [];
  const anomalyTotalPages = Math.max(1, Math.ceil(anomalyItems.length / pageSize));
  const visibleAnomalyItems = anomalyItems.slice(
    (anomalyPage - 1) * pageSize,
    anomalyPage * pageSize
  );

  const eventRows = useMemo(
    () => eventsQuery.data?.pages.flatMap((page) => page.events) ?? [],
    [eventsQuery.data]
  );

  return (
    <div className="space-y-6">
      <section>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-lime-300">
              {uploadQuery.data?.filename ?? "Upload details"}
            </h1>
            <p className="mt-1 text-sm">
              Uploaded{" "}
              {uploadQuery.data ? new Date(uploadQuery.data.uploaded_at).toLocaleString() : "-"}
            </p>
            {isProcessing ? (
              <p className="mt-1 text-xs">Auto-refreshing timeline, events, and anomalies...</p>
            ) : null}
          </div>
          <StatusBadge
            status={uploadQuery.data?.status ?? "queued"}
            fallback={{ className: "bg-slate-100 text-slate-900", label: "loading" }}
          />
        </div>
        {uploadQuery.data?.failure_reason ? (
          <p className="mt-3 text-sm">{uploadQuery.data.failure_reason}</p>
        ) : null}
      </section>

      <Separator.Root className="h-px bg-slate-700/40" />

      <section className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <div className="p-0 lg:p-6">
          <h2 className="font-roboto-condensed text-xl font-semibold text-white">Timeline</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {visibleTimelineItems.map((bucket) => (
              <li key={bucket.id} className="rounded-lg border border-(--border) p-3">
                <p className="font-medium">
                  {new Date(bucket.bucket_start).toLocaleTimeString()} -{" "}
                  {new Date(bucket.bucket_end).toLocaleTimeString()}
                </p>
                <p>
                  Events: {bucket.event_count} · Blocked: {bucket.blocked_count} · Top IP:{" "}
                  {bucket.top_ip ?? "-"}
                </p>
              </li>
            ))}
          </ul>
          <PaginationControls
            currentPage={timelinePage}
            totalPages={timelineTotalPages}
            onPageChange={setTimelinePage}
            ariaLabel="Timeline pagination"
            className="mt-4 flex items-center justify-between text-xs"
          />
        </div>

        <div className="p-0 lg:p-6">
          <h2 className="font-roboto-condensed text-xl font-semibold text-white">Anomalies</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {visibleAnomalyItems.map((anomaly) => (
              <li
                key={anomaly.id}
                className={`cursor-pointer rounded-lg border p-3 ${selectedAnomalyId === anomaly.id ? "border-(--accent)" : "border-(--border)"}`}
                onClick={() => setSelectedAnomalyId(anomaly.id)}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{formatAnomalyType(anomaly.type)}</p>
                  <span className="rounded-full bg-(--accent) px-2 py-1 text-xs text-(--textdark)">
                    {Number(anomaly.confidence_score).toFixed(2)} / 10
                  </span>
                </div>
                <p className="mt-1">{anomaly.explanation}</p>
                <p className="mt-1 text-xs">
                  Source: {anomaly.detection_source}
                  {anomaly.llm_reasoning_summary ? ` · ${anomaly.llm_reasoning_summary}` : ""}
                </p>
              </li>
            ))}
            {anomalyItems.length === 0 ? <li>No anomalies detected yet.</li> : null}
          </ul>
          <PaginationControls
            currentPage={anomalyPage}
            totalPages={anomalyTotalPages}
            onPageChange={setAnomalyPage}
            ariaLabel="Anomalies pagination"
            className="mt-4 flex items-center justify-between text-xs"
          />
        </div>
      </section>

      <section className="rounded-2xl border border-(--border) bg-(--background)/50 p-6">
        <section className="border-b border-(--border) pb-4">
          <ScrollArea.Root className="overflow-hidden">
            <ScrollArea.Viewport className="w-full pb-4">
              <Form.Root className="flex min-w-max items-center justify-start gap-3">
                <div className="text-white text-sm">Filter By:</div>
                <Form.Field name="src_ip" className="text-sm">
                  <Form.Control asChild>
                    <input
                      type="text"
                      name="Source IP"
                      aria-label="Source IP"
                      id="filter-src-ip"
                      className="w-36 rounded-lg border border-(--border) px-2 py-1 text-slate-200"
                      placeholder="Source IP"
                      value={filters.srcIp}
                      onChange={(event) => setFilter("srcIp", event.target.value)}
                    />
                  </Form.Control>
                </Form.Field>

                <Form.Field name="domain" className="text-sm">
                  <Form.Control asChild>
                    <input
                      type="text"
                      name="Domain"
                      aria-label="Domain"
                      id="filter-domain"
                      className="w-44 rounded-lg border border-(--border) px-2 py-1 text-slate-200"
                      placeholder="Domain"
                      value={filters.domain}
                      onChange={(event) => setFilter("domain", event.target.value)}
                    />
                  </Form.Control>
                </Form.Field>

                <Form.Field name="action" className="text-sm">
                  <Form.Control asChild>
                    <input
                      type="text"
                      name="Action"
                      aria-label="Action"
                      id="filter-action"
                      className="w-32 rounded-lg border border-(--border) px-2 py-1 text-slate-200"
                      placeholder="Action"
                      value={filters.action}
                      onChange={(event) => setFilter("action", event.target.value)}
                    />
                  </Form.Control>
                </Form.Field>

                <Form.Field name="status_code" className="text-sm">
                  <Form.Control asChild>
                    <input
                      type="text"
                      name="Status"
                      aria-label="Status"
                      id="filter-status"
                      className="w-24 rounded-lg border border-(--border) px-2 py-1 text-slate-200"
                      placeholder="Status"
                      value={filters.statusCode}
                      onChange={(event) => setFilter("statusCode", event.target.value)}
                    />
                  </Form.Control>
                </Form.Field>

                <div>
                  <button
                    type="button"
                    className="rounded-md border border-(--border) bg-(--accent) px-3 py-1 text-sm text-(--textdark) hover:bg-(--accent)/70 transition-colors duration-300 ease-in-out"
                    onClick={() => {
                      resetFilters();
                    }}
                  >
                    Reset
                  </button>
                </div>
              </Form.Root>
            </ScrollArea.Viewport>
            <ScrollArea.Scrollbar
              orientation="horizontal"
              className="flex h-2.5 touch-none select-none bg-slate-900/50 p-0.5"
            >
              <ScrollArea.Thumb className="relative flex-1 rounded-full bg-slate-500/80 hover:bg-(--accent)" />
            </ScrollArea.Scrollbar>
            <ScrollArea.Corner className="bg-slate-900/50" />
          </ScrollArea.Root>
        </section>

        <ScrollArea.Root className="relative mt-4 h-[500px] overflow-hidden">
          <ScrollArea.Viewport ref={eventsScrollContainerRef} className="h-full w-full">
            <table className="w-full min-w-180 border-collapse text-sm">
              <thead>
                <tr className="border-b border-(--border) text-left">
                  <th className="pb-2">Timestamp</th>
                  <th className="pb-2">IP</th>
                  <th className="pb-2">Domain</th>
                  <th className="pb-2">Action</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Severity</th>
                </tr>
              </thead>
              <tbody>
                {eventRows.map((event) => (
                  <tr key={event.id} className="border-b border-(--border)">
                    <td className="py-2 pr-2">{new Date(event.timestamp).toLocaleString()}</td>
                    <td className="py-2 pr-2">{event.src_ip ?? "-"}</td>
                    <td className="py-2 pr-2">{event.domain ?? "-"}</td>
                    <td className="py-2 pr-2">{event.action ?? "-"}</td>
                    <td className="py-2 pr-2">{event.status_code ?? "-"}</td>
                    <td className="py-2 pr-2">{event.severity ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div ref={eventsScrollSentinelRef} className="h-4" aria-hidden="true" />
            {eventsQuery.isFetchingNextPage ? (
              <div className="sticky bottom-0 px-2 py-2 text-center text-sm bg-(--background)/85 backdrop-blur-xs">
                Loading more events...
              </div>
            ) : null}
          </ScrollArea.Viewport>

          <ScrollArea.Scrollbar
            orientation="vertical"
            className="flex w-2.5 touch-none select-none bg-slate-900/50 p-0.5"
          >
            <ScrollArea.Thumb className="relative flex-1 rounded-full bg-slate-500/80 hover:bg-(--accent)" />
          </ScrollArea.Scrollbar>
          <ScrollArea.Scrollbar
            orientation="horizontal"
            className="flex h-2.5 touch-none select-none bg-slate-900/50 p-0.5"
          >
            <ScrollArea.Thumb className="relative flex-1 rounded-full bg-slate-500/80 hover:bg-(--accent)" />
          </ScrollArea.Scrollbar>
          <ScrollArea.Corner className="bg-slate-900/50" />
        </ScrollArea.Root>

        {eventsQuery.isLoading && eventRows.length === 0 ? (
          <p className="mt-3 text-sm">Loading events...</p>
        ) : null}
        {eventsQuery.isError ? <p className="mt-3 text-sm">Failed to load events.</p> : null}
        {!eventsQuery.isLoading && eventRows.length === 0 ? (
          <p className="mt-3 text-sm">No events found.</p>
        ) : null}
      </section>
    </div>
  );
}
