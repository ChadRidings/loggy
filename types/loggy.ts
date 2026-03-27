export type UploadStatus = "queued" | "processing" | "completed" | "failed" | "partial_success";

export type UploadRecord = {
  id: string;
  user_id: string;
  filename: string;
  source_type: string;
  status: UploadStatus | string;
  raw_size_bytes: number;
  uploaded_at: string;
  failure_reason: string | null;
};

export type IngestionJobRecord = {
  id: string;
  upload_id: string;
  status: UploadStatus | string;
  attempt_count: number;
  started_at: string | null;
  finished_at: string | null;
  last_error: string | null;
};

export type EventRecord = {
  id: string;
  line_number: number;
  timestamp: string;
  src_ip: string | null;
  user_identifier: string | null;
  url: string | null;
  domain: string | null;
  http_method: string | null;
  action: string | null;
  status_code: number | null;
  bytes_out: number | null;
  user_agent: string | null;
  severity: string | null;
  parse_warning: string | null;
};

export type TimelineRecord = {
  id: string;
  bucket_start: string;
  bucket_end: string;
  event_count: number;
  blocked_count: number;
  top_ip: string | null;
  top_domain: string | null;
};

export type AnomalyDetectionSource = "heuristic" | "llm_hybrid";

export type AnomalyRecord = {
  id: string;
  event_id: string | null;
  type: string;
  confidence_score: number;
  explanation: string;
  detection_source: AnomalyDetectionSource;
  llm_reasoning_summary: string | null;
  created_at?: string;
};

export type SpotifyRepoActivity = {
  rank: number;
  name: string;
  fullName: string;
  htmlUrl: string;
  description: string | null;
  forksCount: number;
  starsCount: number;
  activityScore: number;
};
