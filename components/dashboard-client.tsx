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
  if (status === "completed") return "bg-emerald-100";
  if (status === "partial_success") return "bg-amber-100";
  if (status === "failed") return "bg-red-100";
  if (status === "processing") return "bg-blue-100";
  return "bg-slate-100";
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
    <div className="grid gap-6 sm:grid-cols-2">
      <section className="rounded-2xl border border-(--border) bg-(--background) p-6">
        <h2 className="text-lg font-semibold text-white">Upload Log File</h2>
        <p className="mt-1 text-sm">Supported files: .log or .txt (max 10MB)</p>

        <div className="mt-5 space-y-4">
          <div>
            <Label.Root className="text-sm font-medium">Source Type</Label.Root>
            <Select.Root value={sourceType} onValueChange={setSourceType}>
              <Select.Trigger
                className="mt-1 flex w-full items-center justify-between rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-left text-sm text-slate-200 outline-none"
                aria-label="Source Type"
              >
                <Select.Value placeholder="Select source type" />
                <Select.Icon className="text-slate-200">▾</Select.Icon>
              </Select.Trigger>
              <Select.Portal>
                <Select.Content
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

          <label className="block text-sm font-medium">
            File
            <input
              type="file"
              accept=".log,.txt,text/plain"
              className="mt-1 block text-slate-200"
              onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
            />
          </label>
        </div>

        {error ? <p className="mt-4 text-sm">{error}</p> : null}

        <button
          type="button"
          className="mt-5 rounded-md bg-(--accent) px-4 py-2 text-sm text-white font-medium disabled:opacity-50"
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

      <section className="rounded-2xl border border-(--border) bg-(--background) p-6">
        <h2 className="text-lg font-semibold text-white">Upload History</h2>

        {uploadsQuery.isLoading ? <p className="mt-4 text-sm">Loading uploads...</p> : null}
        {uploadsQuery.isError ? <p className="mt-4 text-sm">Failed to load uploads.</p> : null}

        {!uploadsQuery.isLoading && sortedUploads.length === 0 ? (
          <p className="mt-4 text-sm">No uploads yet.</p>
        ) : null}

        {sortedUploads.length > 0 ? (
          <ul className="mt-4 space-y-3">
            {sortedUploads.map((upload) => (
              <li key={upload.id} className="rounded-xl border border-(--border) p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{upload.filename}</p>
                    <p className="text-xs">
                      {new Date(upload.uploaded_at).toLocaleString()} ·{" "}
                      {(upload.raw_size_bytes / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold text-slate-900 ${statusBadgeClass(upload.status)}`}
                  >
                    {upload.status}
                  </span>
                </div>

                {upload.failure_reason ? (
                  <p className="mt-2 text-xs">{upload.failure_reason}</p>
                ) : null}

                <Link href={`/uploads/${upload.id}`} className="mt-3 inline-block">
                  <span className="text-sm font-medium text-(--accent) hover:text-(--textmain)/80">
                    View Analysis
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
