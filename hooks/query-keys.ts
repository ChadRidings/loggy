export const queryKeys = {
  uploads: () => ["uploads"] as const,
  upload: (uploadId: string) => ["upload", uploadId] as const,
  timeline: (uploadId: string) => ["timeline", uploadId] as const,
  anomalies: (uploadId: string) => ["anomalies", uploadId] as const,
  eventsBase: (uploadId: string) => ["events", uploadId] as const,
  events: (uploadId: string, filters: Record<string, string>) =>
    ["events", uploadId, filters] as const,
};
