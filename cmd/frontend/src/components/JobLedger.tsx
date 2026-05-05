import { useEffect, useState } from "react";
import type { BatchItem } from "../lib/types";
import { formatBytes, formatDuration } from "../lib/format";

interface Props {
  items: BatchItem[];
  onRetry: (jobID: string) => void;
}

const STAGE_COPY: Record<string, string> = {
  pending_submission: "Staged",
  presigning: "Requesting presigned URL",
  uploading: "Uploading to MinIO",
  creating_job: "Writing to Postgres, queueing on Redis",
  submission_failed: "Submission failed",
  retrying: "Requeueing",
  queued: "Queued on Redis",
  processing: "Worker is generating variants",
  completed: "Done",
  failed: "Failed",
  dead_lettered: "Dead-lettered",
};

const ACTIVE_STAGES = new Set([
  "presigning",
  "uploading",
  "creating_job",
  "queued",
  "processing",
  "retrying",
  "pending_submission",
]);

const FAILED_STAGES = new Set(["failed", "dead_lettered", "submission_failed"]);

function useTick(active: boolean): void {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 250);
    return () => window.clearInterval(id);
  }, [active]);
}

export function JobLedger({ items, onRetry }: Props) {
  const anyActive = items.some((i) => ACTIVE_STAGES.has(i.status));
  useTick(anyActive);

  if (items.length === 0) return null;

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <JobRow key={item.clientID} item={item} onRetry={onRetry} />
      ))}
    </ul>
  );
}

function JobRow({ item, onRetry }: { item: BatchItem; onRetry: (id: string) => void }) {
  const [open, setOpen] = useState(true);
  const elapsed = (item.completedAt ?? Date.now()) - item.startedAt;
  const isCompleted = item.status === "completed";
  const isFailed = FAILED_STAGES.has(item.status);
  const isActive = ACTIVE_STAGES.has(item.status);

  const tone = isCompleted
    ? "border-ink/15"
    : isFailed
      ? "border-signal/40 bg-signal-wash/30"
      : "border-ink/15";

  return (
    <li className={`overflow-hidden rounded-lg border bg-paper-deep/20 ${tone}`}>
      <div className="flex items-stretch">
        <div className="relative w-20 shrink-0 overflow-hidden bg-paper-deep sm:w-24">
          <img
            src={item.previewURL}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
          {isActive && (
            <div className="absolute inset-0 bg-paper/40 mix-blend-luminosity" aria-hidden />
          )}
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-4 px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-medium text-ink" title={item.fileName}>
                {item.fileName}
              </span>
              <span className="shrink-0 font-mono text-[10px] text-ink-mute">
                {formatBytes(item.fileSize)}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs text-ink-soft">
              <StageDot status={item.status} />
              <span className="truncate">{STAGE_COPY[item.status] ?? item.status}</span>
              {isActive && (
                <span className="font-mono tabular-nums text-ink-mute">{formatDuration(elapsed)}</span>
              )}
              {isCompleted && (
                <span className="font-mono tabular-nums text-ink-mute">in {formatDuration(elapsed)}</span>
              )}
            </div>
            {item.failureReason && (
              <div className="mt-2 text-xs text-signal-deep">{item.failureReason}</div>
            )}
          </div>

          <div className="shrink-0 flex items-center gap-2">
            {isFailed && item.jobID && item.status !== "submission_failed" && (
              <button
                type="button"
                onClick={() => onRetry(item.jobID)}
                className="rounded-md border border-signal/40 px-3 py-1.5 text-xs text-signal-deep transition-colors hover:bg-signal hover:text-paper"
              >
                Retry
              </button>
            )}
            {isCompleted && item.outputs.length > 0 && (
              <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="text-xs text-ink-soft underline-offset-4 hover:text-ink hover:underline"
                aria-expanded={open}
              >
                {open ? "hide" : "show"} {item.outputs.length} {item.outputs.length === 1 ? "variant" : "variants"}
              </button>
            )}
          </div>
        </div>
      </div>

      {isCompleted && item.outputs.length > 0 && open && (
        <div className="border-t border-ink/10 bg-paper/40 px-4 py-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {item.outputs.map((output) => (
              <a
                key={output.id}
                href={output.download_url}
                target="_blank"
                rel="noreferrer"
                className="group block overflow-hidden rounded-md border border-ink/15 bg-paper transition-colors hover:border-ink"
              >
                <div className="aspect-square w-full overflow-hidden bg-paper-deep">
                  <img
                    src={output.download_url}
                    alt={`${output.variant_name} variant`}
                    className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02]"
                    loading="lazy"
                  />
                </div>
                <div className="flex items-center justify-between gap-2 px-3 py-2">
                  <span className="text-sm font-medium text-ink">{output.variant_name}</span>
                  <span className="font-mono text-[10px] text-ink-mute">
                    {output.content_type.replace("image/", "")} · {formatBytes(output.size_bytes)}
                  </span>
                </div>
              </a>
            ))}
          </div>
          <div className="mt-3 text-right font-mono text-[10px] text-ink-faint">
            click any variant to download
          </div>
        </div>
      )}

      {isActive && (
        <div className="h-0.5 w-full overflow-hidden bg-ink/5">
          <div className="h-full w-1/3 animate-[indeterminate_1.4s_ease-in-out_infinite] bg-signal/70" />
        </div>
      )}
    </li>
  );
}

function StageDot({ status }: { status: string }) {
  const tone = ACTIVE_STAGES.has(status)
    ? "bg-signal animate-pulse2"
    : status === "completed"
      ? "bg-ok"
      : FAILED_STAGES.has(status)
        ? "bg-signal"
        : "bg-ink/30";
  return <span className={`inline-block h-1.5 w-1.5 rounded-full ${tone}`} aria-hidden />;
}
