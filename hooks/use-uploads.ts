"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/query-keys";
import type { UploadRecord } from "@/types/loggy";

type UploadMutationResult = { uploadId: string; status: string };

async function fetchUploads(): Promise<UploadRecord[]> {
  const response = await fetch("/api/uploads", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Failed to load uploads");
  }

  const data = (await response.json()) as { uploads: UploadRecord[] };
  return data.uploads;
}

async function uploadFile(formData: FormData): Promise<UploadMutationResult> {
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

async function deleteUpload(uploadId: string): Promise<void> {
  const response = await fetch(`/api/uploads/${uploadId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error || "Failed to delete upload");
  }
}

function normalizeError(error: unknown, fallback: string): Error {
  return error instanceof Error ? error : new Error(fallback);
}

export function useUploadsQuery({ autoRefresh = false }: { autoRefresh?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.uploads(),
    queryFn: fetchUploads,
    refetchInterval: autoRefresh
      ? (query) => {
          const uploads = query.state.data;
          const hasRunning = uploads?.some(
            (upload) => upload.status === "processing" || upload.status === "queued"
          );
          return hasRunning ? 3000 : 0;
        }
      : undefined,
  });
}

export function useUploadMutation(options?: {
  onSuccess?: (result: UploadMutationResult) => void | Promise<void>;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: uploadFile,
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.uploads() });
      await options?.onSuccess?.(result);
    },
    onError: (error) => {
      options?.onError?.(normalizeError(error, "Upload failed"));
    },
  });
}

export function useDeleteUploadMutation(options?: {
  onSuccess?: () => void | Promise<void>;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteUpload,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.uploads() });
      await options?.onSuccess?.();
    },
    onError: (error) => {
      options?.onError?.(normalizeError(error, "Delete failed"));
    },
  });
}
