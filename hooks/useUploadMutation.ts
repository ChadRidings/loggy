"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/query-keys";

type UploadMutationResult = { uploadId: string; status: string };

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

function normalizeError(error: unknown, fallback: string): Error {
  return error instanceof Error ? error : new Error(fallback);
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
