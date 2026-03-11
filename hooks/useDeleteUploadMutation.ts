"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/query-keys";

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
