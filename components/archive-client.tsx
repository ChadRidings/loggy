"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { CalendarIcon, ThickArrowRightIcon } from "@radix-ui/react-icons";
import { StatusBadge } from "@/components/status-badge";
import type { UploadRecord } from "@/types/loggy";

async function fetchUploads(): Promise<UploadRecord[]> {
  const response = await fetch("/api/uploads", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Failed to load uploads");
  }

  const data = (await response.json()) as { uploads: UploadRecord[] };
  return data.uploads;
}

export function ArchiveClient() {
  const uploadsQuery = useQuery({
    queryKey: ["uploads"],
    queryFn: fetchUploads,
  });

  const uploads = uploadsQuery.data ?? [];

  return (
    <section className="p-6">
      <h2 className="text-lg font-semibold text-white">Archive</h2>

      {uploadsQuery.isLoading ? <p className="mt-4 text-sm">Loading uploads...</p> : null}
      {uploadsQuery.isError ? <p className="mt-4 text-sm">Failed to load uploads.</p> : null}

      {!uploadsQuery.isLoading && uploads.length === 0 ? (
        <p className="mt-4 text-sm">No uploads yet.</p>
      ) : null}

      {uploads.length > 0 ? (
        <ul className="mt-4 space-y-3">
          {uploads.map((upload) => (
            <li key={upload.id} className="rounded-xl border border-(--border) p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{upload.filename}</p>
                  <p className="text-xs flex items-center">
                    <CalendarIcon className="inline-block mr-1" />
                    {new Date(upload.uploaded_at).toLocaleString()} ·{" "}
                    {(upload.raw_size_bytes / 1024).toFixed(1)} KB
                  </p>
                </div>
                <StatusBadge status={upload.status} />
              </div>

              {upload.failure_reason ? <p className="mt-2 text-xs">{upload.failure_reason}</p> : null}

              <Link href={`/uploads/${upload.id}`} className="mt-3 inline-block">
                <span className="flex items-center text-sm text-(--accent) hover:text-white transition-colors duration-300 ease-in-out">
                  View analysis
                  <ThickArrowRightIcon className="ml-1" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
