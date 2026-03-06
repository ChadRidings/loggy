"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Label, Select } from "radix-ui";

type Upload = {
  id: string;
  filename: string;
  source_type: string;
  status: string;
  raw_size_bytes: number;
  uploaded_at: string;
  failure_reason: string | null;
};

async function fetchUploads(): Promise<Upload[]> {
  const response = await fetch("/api/uploads", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Failed to load uploads");
  }

  const data = (await response.json()) as { uploads: Upload[] };
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

function statusBadgeClass(status: string): string {
  if (status === "completed") return "bg-emerald-100 text-emerald-800";
  if (status === "partial_success") return "bg-amber-100 text-amber-800";
  if (status === "failed") return "bg-red-100 text-red-700";
  if (status === "processing") return "bg-blue-100 text-blue-700";
  return "bg-slate-100 text-slate-700";
}

export function DashboardClient() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sourceType, setSourceType] = useState("zscaler");
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">Upload Log File</h2>
        <p className="mt-1 text-sm text-slate-600">Supported files: .log or .txt (max 10MB)</p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <Label.Root className="text-sm font-medium text-slate-700">Source Type</Label.Root>
            <Select.Root value={sourceType} onValueChange={setSourceType}>
              <Select.Trigger
                className="mt-1 flex w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm text-slate-900 outline-none ring-offset-2 focus:ring-2 focus:ring-slate-300"
                aria-label="Source Type"
              >
                <Select.Value placeholder="Select source type" />
                <Select.Icon className="text-slate-500">▾</Select.Icon>
              </Select.Trigger>
              <Select.Portal>
                <Select.Content
                  position="popper"
                  sideOffset={4}
                  className="z-50 w-(--radix-select-trigger-width) overflow-hidden rounded-lg border border-slate-200 bg-white"
                >
                  <Select.Viewport className="p-1">
                    <Select.Item
                      value="zscaler"
                      className="relative flex cursor-pointer select-none items-center rounded-md px-3 py-2 text-sm text-slate-900 outline-none hover:bg-slate-100 focus:bg-slate-100"
                    >
                      <Select.ItemText>Zscaler-like</Select.ItemText>
                    </Select.Item>
                    <Select.Item
                      value="generic"
                      className="relative flex cursor-pointer select-none items-center rounded-md px-3 py-2 text-sm text-slate-900 outline-none hover:bg-slate-100 focus:bg-slate-100"
                    >
                      <Select.ItemText>Generic key=value</Select.ItemText>
                    </Select.Item>
                  </Select.Viewport>
                </Select.Content>
              </Select.Portal>
            </Select.Root>
          </div>

          <label className="text-sm font-medium text-slate-700">
            File
            <input
              type="file"
              accept=".log,.txt,text/plain"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
            />
          </label>
        </div>

        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

        <button
          type="button"
          className="mt-5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
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
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">Upload History</h2>

        {uploadsQuery.isLoading ? (
          <p className="mt-4 text-sm text-slate-600">Loading uploads...</p>
        ) : null}
        {uploadsQuery.isError ? (
          <p className="mt-4 text-sm text-red-600">Failed to load uploads.</p>
        ) : null}

        {!uploadsQuery.isLoading && sortedUploads.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">No uploads yet.</p>
        ) : null}

        {sortedUploads.length > 0 ? (
          <ul className="mt-4 space-y-3">
            {sortedUploads.map((upload) => (
              <li key={upload.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{upload.filename}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(upload.uploaded_at).toLocaleString()} ·{" "}
                      {(upload.raw_size_bytes / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(upload.status)}`}
                  >
                    {upload.status}
                  </span>
                </div>

                {upload.failure_reason ? (
                  <p className="mt-2 text-xs text-red-600">{upload.failure_reason}</p>
                ) : null}

                <Link
                  href={`/uploads/${upload.id}`}
                  className="mt-3 inline-block text-sm font-medium text-slate-900 underline"
                >
                  View Analysis
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
