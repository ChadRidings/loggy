"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useUploadUiStore } from "@/store/upload-ui-store";

type Upload = {
  id: string;
  filename: string;
  status: string;
  source_type: string;
  uploaded_at: string;
  failure_reason: string | null;
};

type TimelineRow = {
  id: string;
  bucket_start: string;
  bucket_end: string;
  event_count: number;
  blocked_count: number;
  top_ip: string | null;
  top_domain: string | null;
};

type EventRow = {
  id: string;
  timestamp: string;
  src_ip: string | null;
  domain: string | null;
  action: string | null;
  status_code: number | null;
  user_identifier: string | null;
  severity: string | null;
  parse_warning: string | null;
};

type AnomalyRow = {
  id: string;
  type: string;
  confidence_score: number;
  explanation: string;
  detection_source: "heuristic" | "llm_hybrid";
  llm_reasoning_summary: string | null;
};

async function fetchUpload(uploadId: string): Promise<Upload> {
  const response = await fetch(`/api/uploads/${uploadId}`, { cache: "no-store" });
  if (!response.ok) throw new Error("Failed to load upload");
  const data = (await response.json()) as { upload: Upload };
  return data.upload;
}

async function fetchTimeline(uploadId: string): Promise<TimelineRow[]> {
  const response = await fetch(`/api/uploads/${uploadId}/timeline`, { cache: "no-store" });
  if (!response.ok) throw new Error("Failed to load timeline");
  const data = (await response.json()) as { timeline: TimelineRow[] };
  return data.timeline;
}

async function fetchAnomalies(uploadId: string): Promise<AnomalyRow[]> {
  const response = await fetch(`/api/uploads/${uploadId}/anomalies`, { cache: "no-store" });
  if (!response.ok) throw new Error("Failed to load anomalies");
  const data = (await response.json()) as { anomalies: AnomalyRow[] };
  return data.anomalies;
}

async function fetchEvents(args: {
  uploadId: string;
  cursor: string | null;
  filters: Record<string, string>;
}): Promise<{ events: EventRow[]; nextCursor: string | null }> {
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

  const response = await fetch(`/api/uploads/${args.uploadId}/events?${params.toString()}`, { cache: "no-store" });
  if (!response.ok) throw new Error("Failed to load events");
  return (await response.json()) as { events: EventRow[]; nextCursor: string | null };
}

function statusBadgeClass(status: string): string {
  if (status === "completed") return "bg-emerald-100 text-emerald-800";
  if (status === "partial_success") return "bg-amber-100 text-amber-800";
  if (status === "failed") return "bg-red-100 text-red-700";
  if (status === "processing") return "bg-blue-100 text-blue-700";
  return "bg-slate-100 text-slate-700";
}

export function UploadDetailsClient({ uploadId }: { uploadId: string }) {
  const { filters, setFilter, resetFilters, selectedAnomalyId, setSelectedAnomalyId } = useUploadUiStore();
  const queryClient = useQueryClient();
  const previousStatusRef = useRef<string | undefined>(undefined);

  const [eventRows, setEventRows] = useState<EventRow[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const uploadQuery = useQuery({
    queryKey: ["upload", uploadId],
    queryFn: () => fetchUpload(uploadId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "processing" || status === "queued" ? 3000 : 0;
    }
  });

  const isProcessing = uploadQuery.data?.status === "processing" || uploadQuery.data?.status === "queued";

  const timelineQuery = useQuery({
    queryKey: ["timeline", uploadId],
    queryFn: () => fetchTimeline(uploadId),
    refetchInterval: isProcessing ? 3000 : false
  });

  const anomalyQuery = useQuery({
    queryKey: ["anomalies", uploadId],
    queryFn: () => fetchAnomalies(uploadId),
    refetchInterval: isProcessing ? 3000 : false
  });

  const eventFilterParams = useMemo(
    () => ({
      src_ip: filters.srcIp,
      domain: filters.domain,
      action: filters.action,
      status_code: filters.statusCode,
      start_time: filters.startTime,
      end_time: filters.endTime
    }),
    [filters]
  );

  const eventsQuery = useQuery({
    queryKey: ["events", uploadId, eventFilterParams],
    queryFn: () => fetchEvents({ uploadId, cursor: null, filters: eventFilterParams }),
    refetchInterval: isProcessing ? 3000 : false
  });

  useEffect(() => {
    const currentStatus = uploadQuery.data?.status;
    const previousStatus = previousStatusRef.current;

    const finishedNow =
      (previousStatus === "queued" || previousStatus === "processing") &&
      (currentStatus === "completed" || currentStatus === "partial_success" || currentStatus === "failed");

    if (finishedNow) {
      void queryClient.invalidateQueries({ queryKey: ["timeline", uploadId] });
      void queryClient.invalidateQueries({ queryKey: ["anomalies", uploadId] });
      void queryClient.invalidateQueries({ queryKey: ["events", uploadId] });
    }

    previousStatusRef.current = currentStatus;
  }, [queryClient, uploadId, uploadQuery.data?.status]);

  useEffect(() => {
    if (!eventsQuery.data) {
      return;
    }

    setEventRows(eventsQuery.data.events);
    setNextCursor(eventsQuery.data.nextCursor);
  }, [eventsQuery.data]);

  async function loadMoreEvents() {
    if (!nextCursor || loadingMore) {
      return;
    }

    setLoadingMore(true);

    try {
      const data = await fetchEvents({ uploadId, cursor: nextCursor, filters: eventFilterParams });
      setEventRows((current) => [...current, ...data.events]);
      setNextCursor(data.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">{uploadQuery.data?.filename ?? "Upload details"}</h1>
            <p className="mt-1 text-sm text-slate-600">Uploaded {uploadQuery.data ? new Date(uploadQuery.data.uploaded_at).toLocaleString() : "-"}</p>
            {isProcessing ? <p className="mt-1 text-xs text-blue-700">Auto-refreshing timeline, events, and anomalies...</p> : null}
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(uploadQuery.data?.status ?? "queued")}`}>
            {uploadQuery.data?.status ?? "loading"}
          </span>
        </div>
        {uploadQuery.data?.failure_reason ? <p className="mt-3 text-sm text-red-600">{uploadQuery.data.failure_reason}</p> : null}
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Timeline</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {(timelineQuery.data ?? []).map((bucket) => (
              <li key={bucket.id} className="rounded-lg border border-slate-200 p-3">
                <p className="font-medium text-slate-900">
                  {new Date(bucket.bucket_start).toLocaleTimeString()} - {new Date(bucket.bucket_end).toLocaleTimeString()}
                </p>
                <p className="text-slate-600">
                  Events: {bucket.event_count} · Blocked: {bucket.blocked_count} · Top IP: {bucket.top_ip ?? "-"}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Anomalies</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {(anomalyQuery.data ?? []).map((anomaly) => (
              <li
                key={anomaly.id}
                className={`cursor-pointer rounded-lg border p-3 ${selectedAnomalyId === anomaly.id ? "border-slate-900" : "border-slate-200"}`}
                onClick={() => setSelectedAnomalyId(anomaly.id)}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-slate-900">{anomaly.type}</p>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                    {Number(anomaly.confidence_score).toFixed(2)} / 10
                  </span>
                </div>
                <p className="mt-1 text-slate-600">{anomaly.explanation}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Source: {anomaly.detection_source}
                  {anomaly.llm_reasoning_summary ? ` · ${anomaly.llm_reasoning_summary}` : ""}
                </p>
              </li>
            ))}
            {anomalyQuery.data?.length === 0 ? <li className="text-slate-600">No anomalies detected yet.</li> : null}
          </ul>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            Source IP
            <input
              className="mt-1 w-36 rounded-lg border border-slate-300 px-2 py-1"
              value={filters.srcIp}
              onChange={(event) => setFilter("srcIp", event.target.value)}
            />
          </label>
          <label className="text-sm">
            Domain
            <input
              className="mt-1 w-44 rounded-lg border border-slate-300 px-2 py-1"
              value={filters.domain}
              onChange={(event) => setFilter("domain", event.target.value)}
            />
          </label>
          <label className="text-sm">
            Action
            <input
              className="mt-1 w-32 rounded-lg border border-slate-300 px-2 py-1"
              value={filters.action}
              onChange={(event) => setFilter("action", event.target.value)}
            />
          </label>
          <label className="text-sm">
            Status
            <input
              className="mt-1 w-24 rounded-lg border border-slate-300 px-2 py-1"
              value={filters.statusCode}
              onChange={(event) => setFilter("statusCode", event.target.value)}
            />
          </label>
          <button
            type="button"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            onClick={() => void eventsQuery.refetch()}
          >
            Apply Filters
          </button>
          <button
            type="button"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            onClick={() => {
              resetFilters();
              void eventsQuery.refetch();
            }}
          >
            Reset
          </button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-600">
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
                <tr key={event.id} className="border-b border-slate-100">
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
        </div>

        {eventsQuery.isLoading && eventRows.length === 0 ? <p className="mt-3 text-sm text-slate-600">Loading events...</p> : null}
        {eventsQuery.isError ? <p className="mt-3 text-sm text-red-600">Failed to load events.</p> : null}
        {!eventsQuery.isLoading && eventRows.length === 0 ? <p className="mt-3 text-sm text-slate-600">No events found.</p> : null}

        {nextCursor ? (
          <button
            type="button"
            className="mt-4 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            onClick={() => void loadMoreEvents()}
            disabled={loadingMore}
          >
            {loadingMore ? "Loading more..." : "Load More"}
          </button>
        ) : null}
      </section>
    </div>
  );
}
