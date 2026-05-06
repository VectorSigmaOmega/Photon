import { useCallback, useEffect, useRef, useState } from "react";
import { api, putBlob } from "./api";
import type { BatchItem, ClientStatus, Job, JobOutput, Transform } from "./types";

const POLL_INTERVAL = 1_500;

interface PresignResponse {
  upload_url: string;
  object_key: string;
  content_type: string;
}

interface JobResponse {
  job: Job;
}

interface ResultsResponse {
  outputs: JobOutput[];
}

function isPollable(status: ClientStatus): boolean {
  return status === "queued" || status === "processing";
}

function isInFlightSubmission(status: ClientStatus): boolean {
  return ["pending_submission", "presigning", "uploading", "creating_job", "retrying"].includes(
    status,
  );
}

export interface PipelineState {
  items: BatchItem[];
  isSubmitting: boolean;
  banner: { message: string; tone: "ok" | "error" } | null;
  submit: (files: File[], transforms: Transform[], outputFormat: string) => Promise<void>;
  retry: (jobID: string) => Promise<void>;
  reset: () => void;
}

export function usePipeline(): PipelineState {
  const [items, setItems] = useState<BatchItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [banner, setBanner] = useState<PipelineState["banner"]>(null);
  const itemsRef = useRef(items);
  const pollTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const clearScheduledPoll = useCallback(() => {
    if (pollTimeoutRef.current !== null) {
      window.clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
  }, []);

  const updateItem = useCallback(
    (clientID: string, patch: Partial<BatchItem>) => {
      const next = itemsRef.current.map((entry) =>
        entry.clientID === clientID ? { ...entry, ...patch } : entry,
      );
      itemsRef.current = next;
      setItems(next);
    },
    [],
  );

  const updateByJob = useCallback(
    (jobID: string, patch: Partial<BatchItem>) => {
      const next = itemsRef.current.map((entry) =>
        entry.jobID === jobID ? { ...entry, ...patch } : entry,
      );
      itemsRef.current = next;
      setItems(next);
    },
    [],
  );

  const pollOnce = useCallback(async () => {
    const pollable = itemsRef.current.filter((item) => item.jobID && isPollable(item.status));
    if (pollable.length === 0) {
      return;
    }

    try {
      await Promise.all(
        pollable.map(async (item) => {
          const job = await api<JobResponse>(`/v1/jobs/${item.jobID}`);
          const patch: Partial<BatchItem> = {
            status: job.job.status,
            failureReason: job.job.failure_reason ?? "",
            detail: describeStatus(job.job.status, job.job.failure_reason),
          };
          if (job.job.status === "completed" || job.job.status === "failed" || job.job.status === "dead_lettered") {
            patch.completedAt = Date.now();
          }
          if (job.job.status === "completed") {
            try {
              const results = await api<ResultsResponse>(`/v1/jobs/${item.jobID}/results`);
              patch.outputs = results.outputs ?? [];
            } catch {
              // leave outputs empty; UI will retry on next render
            }
          }
          updateByJob(item.jobID, patch);
        }),
      );
    } catch (error) {
      setBanner({
        message: (error as Error).message || "polling failed",
        tone: "error",
      });
    }
  }, [updateByJob]);

  const schedulePoll = useCallback(
    (delay = POLL_INTERVAL) => {
      if (pollTimeoutRef.current !== null) {
        return;
      }

      if (!itemsRef.current.some((item) => item.jobID && isPollable(item.status))) {
        return;
      }

      pollTimeoutRef.current = window.setTimeout(async () => {
        pollTimeoutRef.current = null;
        await pollOnce();
        if (itemsRef.current.some((item) => item.jobID && isPollable(item.status))) {
          schedulePoll();
        }
      }, delay);
    },
    [pollOnce],
  );

  const submitOne = useCallback(
    async (item: BatchItem, file: File, transforms: Transform[]): Promise<Job | null> => {
      try {
        updateItem(item.clientID, {
          status: "presigning",
          detail: "requesting a presigned MinIO upload URL",
        });

        const presign = await api<PresignResponse>("/v1/uploads/presign", {
          method: "POST",
          body: JSON.stringify({ content_type: file.type, file_name: file.name }),
        });

        updateItem(item.clientID, {
          status: "uploading",
          objectKey: presign.object_key,
          detail: "streaming source bytes to object storage",
        });

        await putBlob(presign.upload_url, file);

        updateItem(item.clientID, {
          status: "creating_job",
          detail: "writing job row to Postgres and enqueueing on Redis",
        });

        const created = await api<JobResponse>("/v1/jobs", {
          method: "POST",
          body: JSON.stringify({
            source_object_key: presign.object_key,
            requested_transforms: transforms,
            output_format: item.outputFormat,
          }),
        });

        updateItem(item.clientID, {
          jobID: created.job.id,
          status: created.job.status,
          detail: describeStatus(created.job.status, created.job.failure_reason),
          failureReason: created.job.failure_reason ?? "",
        });
        return created.job;
      } catch (error) {
        updateItem(item.clientID, {
          status: "submission_failed",
          failureReason: (error as Error).message || "submission failed",
          detail: (error as Error).message || "submission failed",
          completedAt: Date.now(),
        });
        return null;
      }
    },
    [updateItem],
  );

  const submit = useCallback<PipelineState["submit"]>(
    async (files, transforms, outputFormat) => {
      clearScheduledPoll();
      setBanner(null);
      // Revoke any prior preview URLs before replacing the batch.
      for (const prior of itemsRef.current) {
        if (prior.previewURL) URL.revokeObjectURL(prior.previewURL);
      }

      const fresh: BatchItem[] = files.map((file, index) => ({
        clientID: `c-${Date.now()}-${index}`,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        previewURL: URL.createObjectURL(file),
        jobID: "",
        objectKey: "",
        outputFormat,
        status: "pending_submission",
        detail: "queued in browser",
        failureReason: "",
        outputs: [],
        startedAt: Date.now(),
        completedAt: null,
      }));
      setItems(fresh);
      itemsRef.current = fresh;
      setIsSubmitting(true);

      const createdJobs: Job[] = [];
      for (let i = 0; i < files.length; i += 1) {
        const created = await submitOne(fresh[i], files[i], transforms);
        if (created) {
          createdJobs.push(created);
        }
      }

      setIsSubmitting(false);
      if (createdJobs.some((job) => isPollable(job.status))) {
        void pollOnce();
        schedulePoll();
        setBanner({
          message: `submitted ${files.length} ${files.length === 1 ? "job" : "jobs"} — polling for worker progress`,
          tone: "ok",
        });
      } else if (createdJobs.length === 0) {
        setBanner({ message: "no jobs reached the queue", tone: "error" });
      }
    },
    [clearScheduledPoll, pollOnce, schedulePoll, submitOne],
  );

  const retry = useCallback<PipelineState["retry"]>(
    async (jobID) => {
      updateByJob(jobID, {
        status: "retrying",
        detail: "requeueing on Redis",
        failureReason: "",
        completedAt: null,
      });
      try {
        await api(`/v1/jobs/${jobID}/retry`, { method: "POST" });
        updateByJob(jobID, {
          status: "queued",
          detail: "waiting in Redis for the worker to claim the job",
          startedAt: Date.now(),
        });
        void pollOnce();
        schedulePoll();
      } catch (error) {
        updateByJob(jobID, {
          status: "failed",
          failureReason: (error as Error).message || "retry failed",
          detail: (error as Error).message || "retry failed",
          completedAt: Date.now(),
        });
      }
    },
    [pollOnce, schedulePoll, updateByJob],
  );

  const reset = useCallback(() => {
    clearScheduledPoll();
    for (const prior of itemsRef.current) {
      if (prior.previewURL) URL.revokeObjectURL(prior.previewURL);
    }
    setItems([]);
    itemsRef.current = [];
    setBanner(null);
  }, [clearScheduledPoll]);

  useEffect(() => {
    return () => {
      clearScheduledPoll();
      for (const prior of itemsRef.current) {
        if (prior.previewURL) URL.revokeObjectURL(prior.previewURL);
      }
    };
  }, [clearScheduledPoll]);

  return { items, isSubmitting, banner, submit, retry, reset };
}

function describeStatus(status: string, failure?: string): string {
  switch (status) {
    case "queued":
      return "waiting in Redis for the worker to claim the job";
    case "processing":
      return "Go worker claimed the job and is generating variants";
    case "completed":
      return "outputs persisted to MinIO and recorded in Postgres";
    case "failed":
      return failure || "worker reported a processing failure";
    case "dead_lettered":
      return failure || "exhausted retries — moved to the dead-letter queue";
    default:
      return status;
  }
}

export const stageHelpers = { isPollable, isInFlightSubmission };
