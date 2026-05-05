export type JobStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "dead_lettered";

export type ClientStatus =
  | "pending_submission"
  | "presigning"
  | "uploading"
  | "creating_job"
  | "submission_failed"
  | "retrying"
  | JobStatus;

export interface Transform {
  name: "thumb" | "card" | "detail";
  width: number;
  height: number;
  quality: "balanced" | "high";
}

export interface JobOutput {
  id: number;
  job_id: string;
  variant_name: string;
  object_key: string;
  content_type: string;
  size_bytes: number;
  created_at: string;
  download_url: string;
  expires_in_seconds: number;
}

export interface Job {
  id: string;
  status: JobStatus;
  source_object_key: string;
  output_format: string;
  failure_reason?: string;
  created_at?: string;
  updated_at?: string;
}

export interface BatchItem {
  clientID: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  previewURL: string;
  jobID: string;
  objectKey: string;
  outputFormat: string;
  status: ClientStatus;
  detail: string;
  failureReason: string;
  outputs: JobOutput[];
  startedAt: number;
  completedAt: number | null;
}

export type ReadinessComponent = "postgres" | "redis" | "storage";

export interface ReadinessState {
  status: "ready" | "not_ready" | "unknown";
  reason?: string;
  checkedAt: number;
}

export type Readiness = Record<ReadinessComponent, ReadinessState>;
