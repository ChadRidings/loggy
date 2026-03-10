"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Label, Select } from "radix-ui";
import { CalendarIcon, UploadIcon, ThickArrowRightIcon } from "@radix-ui/react-icons";
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

async function uploadFile(formData: FormData): Promise<{ uploadId: string; status: string }> {
  const response = await fetch("/api/uploads", {
    method: "POST",
    body: formData,
  });

  const data = (await response.json()) as { uploadId?: string; status?: string; error?: string };

  if (!response.ok || !data.uploadId || !data.status) {
    throw new Error(data.error || "Upload failed");
  }

  return {
    uploadId: data.uploadId,
    status: data.status,
  };
}

export function DashboardClient() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sourceType, setSourceType] = useState("zscaler");
  const [error, setError] = useState<string | null>(null);
  const sourceTypeTriggerId = "dashboard-source-type-trigger";
  const sourceTypeContentId = "dashboard-source-type-content";

  const uploadsQuery = useQuery({
    queryKey: ["uploads"],
    queryFn: fetchUploads,
    refetchInterval: (query) => {
      const uploads = query.state.data;
      const hasRunning = uploads?.some(
        (upload) => upload.status === "processing" || upload.status === "queued"
      );
      return hasRunning ? 3000 : 0;
    },
  });

  const uploadMutation = useMutation({
    mutationFn: uploadFile,
    onSuccess: (result) => {
      setError(null);
      setSelectedFile(null);
      void queryClient.invalidateQueries({ queryKey: ["uploads"] });
      router.push(`/uploads/${result.uploadId}`);
    },
    onError: (mutationError) => {
      setError(mutationError instanceof Error ? mutationError.message : "Upload failed");
    },
  });

  const sortedUploads = useMemo(() => uploadsQuery.data ?? [], [uploadsQuery.data]);
  const recentUploads = useMemo(() => sortedUploads.slice(0, 5), [sortedUploads]);

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <section className="p-6">
        <div className="rounded-2xl border border-(--border) bg-(--background)/50 p-6">
          <h2 className="font-roboto-condensed text-xl font-semibold text-white">
            Upload Log File
          </h2>
          <p className="mt-1 text-sm">Supported files: .log or .txt (max 10MB)</p>

          <div className="mt-5 space-y-4">
            <div>
              <Label.Root htmlFor={sourceTypeTriggerId} className="text-sm font-medium">
                Source Type
              </Label.Root>
              <Select.Root value={sourceType} onValueChange={setSourceType}>
                <Select.Trigger
                  id={sourceTypeTriggerId}
                  aria-controls={sourceTypeContentId}
                  className="mt-1 flex w-full items-center justify-between rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-left text-sm text-slate-200 outline-none"
                >
                  <Select.Value placeholder="Select source type" />
                  <Select.Icon className="text-slate-200">▾</Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content
                    id={sourceTypeContentId}
                    position="popper"
                    sideOffset={4}
                    className="z-50 w-(--radix-select-trigger-width) overflow-hidden rounded-lg border border-slate-600 bg-slate-900"
                  >
                    <Select.Viewport className="p-1">
                      <Select.Item
                        value="zscaler"
                        className="relative flex cursor-pointer select-none items-center rounded-md px-3 py-2 text-sm text-slate-200 outline-none hover:bg-slate-800 focus:bg-slate-800"
                      >
                        <Select.ItemText>Zscaler-like</Select.ItemText>
                      </Select.Item>
                      <Select.Item
                        value="generic"
                        className="relative flex cursor-pointer select-none items-center rounded-md px-3 py-2 text-sm text-slate-200 outline-none hover:bg-slate-800 focus:bg-slate-800"
                      >
                        <Select.ItemText>Generic key=value</Select.ItemText>
                      </Select.Item>
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            </div>

            <div className="text-sm">
              <label
                htmlFor="upload-file-input"
                className="mt-1 inline-flex cursor-pointer items-center gap-2 rounded-md border border-(--border) bg-slate-900 px-3 py-2 text-sm text-slate-100 transition-colors duration-200 hover:bg-slate-800 focus-within:ring-2 focus-within:ring-(--accent)"
              >
                <UploadIcon className="h-4 w-4" />
                <span>Choose File</span>
              </label>
              <input
                id="upload-file-input"
                type="file"
                accept=".log,.txt,text/plain"
                className="sr-only"
                onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
              />
              {selectedFile ? (
                <p className="mt-1 text-xs text-slate-300">{selectedFile.name}</p>
              ) : null}
            </div>
          </div>

          {error ? <p className="mt-4 text-sm">{error}</p> : null}

          <button
            type="button"
            className="mt-5 rounded-md bg-(--accent) px-4 py-2 text-sm text-(--textdark) font-medium disabled:opacity-50"
            onClick={() => {
              if (!selectedFile) {
                setError("Please select a file to upload.");
                return;
              }

              const formData = new FormData();
              formData.append("file", selectedFile);
              formData.append("sourceType", sourceType);
              uploadMutation.mutate(formData);
            }}
            disabled={uploadMutation.isPending}
          >
            {uploadMutation.isPending ? "Uploading..." : "Upload"}
          </button>
        </div>
      </section>

      <section className="p-6">
        <h2 className="font-roboto-condensed text-xl font-semibold text-white">
          Recent Upload History
        </h2>

        {uploadsQuery.isLoading ? <p className="mt-4 text-sm">Loading uploads...</p> : null}
        {uploadsQuery.isError ? <p className="mt-4 text-sm">Failed to load uploads.</p> : null}

        {!uploadsQuery.isLoading && recentUploads.length === 0 ? (
          <p className="mt-4 text-sm">No uploads yet.</p>
        ) : null}

        {recentUploads.length > 0 ? (
          <ul className="mt-4 space-y-3">
            {recentUploads.map((upload) => (
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

                {upload.failure_reason ? (
                  <p className="mt-2 text-xs">{upload.failure_reason}</p>
                ) : null}

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
    </div>
  );
}
