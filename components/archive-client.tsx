"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import {
  CalendarIcon,
  DotsHorizontalIcon,
  ThickArrowRightIcon,
  TrashIcon,
} from "@radix-ui/react-icons";
import { AlertDialog, DropdownMenu } from "radix-ui";
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

async function deleteUpload(uploadId: string): Promise<void> {
  const response = await fetch(`/api/uploads/${uploadId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error || "Failed to delete upload");
  }
}

export function ArchiveClient() {
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<UploadRecord | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const uploadsQuery = useQuery({
    queryKey: ["uploads"],
    queryFn: fetchUploads,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUpload,
    onSuccess: async () => {
      setDeleteTarget(null);
      setDeleteError(null);
      await queryClient.invalidateQueries({ queryKey: ["uploads"] });
    },
    onError: (mutationError) => {
      setDeleteError(mutationError instanceof Error ? mutationError.message : "Delete failed");
    },
  });

  const uploads = uploadsQuery.data ?? [];

  return (
    <section className="p-6">
      <h2 className="text-lg font-semibold text-white">Archive</h2>
      {deleteError ? <p className="mt-2 text-sm">{deleteError}</p> : null}

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
                  <p className="text-xs mt-1">Upload status: {upload.status}</p>
                  {upload.failure_reason ? (
                    <p className="mt-2 text-xs">{upload.failure_reason}</p>
                  ) : null}

                  <Link href={`/uploads/${upload.id}`} className="mt-3 inline-block">
                    <span className="flex items-center text-sm text-(--accent) hover:text-white transition-colors duration-300 ease-in-out">
                      View analysis
                      <ThickArrowRightIcon className="ml-1" />
                    </span>
                  </Link>
                </div>
                <div className="flex items-center gap-2">
                  <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild>
                      <button
                        type="button"
                        aria-label={`Open actions for ${upload.filename}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-(--border) hover:bg-slate-800"
                      >
                        <DotsHorizontalIcon />
                      </button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Portal>
                      <DropdownMenu.Content
                        sideOffset={8}
                        align="end"
                        className="z-50 min-w-40 rounded-lg border border-(--border) bg-slate-900 p-1 shadow-lg"
                      >
                        <DropdownMenu.Item
                          onSelect={() => {
                            setDeleteError(null);
                            setDeleteTarget(upload);
                          }}
                          className="flex cursor-pointer select-none items-center gap-2 rounded-md px-3 py-2 text-sm text-red-300 outline-none hover:bg-slate-800 focus:bg-slate-800"
                        >
                          <TrashIcon />
                          Delete log
                        </DropdownMenu.Item>
                      </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                  </DropdownMenu.Root>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      <AlertDialog.Root
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open && !deleteMutation.isPending) {
            setDeleteTarget(null);
          }
        }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/60" />
          <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-(--border) bg-(--background) p-5">
            <AlertDialog.Title className="text-lg font-semibold text-white">
              Delete log
            </AlertDialog.Title>
            <AlertDialog.Description className="mt-2 text-sm">
              {deleteTarget
                ? `Permanently delete ${deleteTarget.filename}? This action cannot be undone.`
                : "This action cannot be undone."}
            </AlertDialog.Description>
            <div className="mt-5 flex justify-end gap-2">
              <AlertDialog.Cancel asChild>
                <button
                  type="button"
                  className="rounded-md border border-(--border) px-3 py-2 text-sm text-(--textmain) disabled:opacity-60"
                  disabled={deleteMutation.isPending}
                >
                  Cancel
                </button>
              </AlertDialog.Cancel>
              <button
                type="button"
                className="rounded-md bg-red-600 px-3 py-2 text-sm text-white disabled:opacity-60"
                disabled={deleteMutation.isPending || !deleteTarget}
                onClick={() => {
                  if (!deleteTarget) {
                    return;
                  }
                  deleteMutation.mutate(deleteTarget.id);
                }}
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete log"}
              </button>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </section>
  );
}
