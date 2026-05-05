import { useMemo } from "react";
import type { BatchItem, ClientStatus } from "../lib/types";

type StageID = "presign" | "upload" | "queue" | "worker" | "store";

const STAGES: { id: StageID; label: string; tech: string }[] = [
  { id: "presign", label: "Presign", tech: "MinIO" },
  { id: "upload", label: "Upload", tech: "MinIO" },
  { id: "queue", label: "Queue", tech: "Redis" },
  { id: "worker", label: "Transform", tech: "Go worker" },
  { id: "store", label: "Store", tech: "MinIO" },
];

function stageFor(status: ClientStatus): StageID | null {
  switch (status) {
    case "presigning":
      return "presign";
    case "uploading":
      return "upload";
    case "creating_job":
    case "queued":
    case "retrying":
      return "queue";
    case "processing":
      return "worker";
    case "completed":
      return "store";
    default:
      return null;
  }
}

interface Props {
  items: BatchItem[];
}

export function TraceStrip({ items }: Props) {
  const counts = useMemo(() => {
    const map: Record<StageID, number> = {
      presign: 0,
      upload: 0,
      queue: 0,
      worker: 0,
      store: 0,
    };
    for (const item of items) {
      const stage = stageFor(item.status);
      if (stage) map[stage] += 1;
    }
    return map;
  }, [items]);

  if (items.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <ol className="flex min-w-max items-stretch gap-1">
        {STAGES.map((stage, i) => {
          const count = counts[stage.id];
          const isActive = count > 0;
          const isLast = i === STAGES.length - 1;
          return (
            <li key={stage.id} className="flex items-center">
              <div
                className={`flex items-center gap-2 rounded-md px-3 py-2 transition-colors ${
                  isActive ? "bg-signal-wash/50" : ""
                }`}
              >
                <span
                  aria-hidden
                  className={`inline-block h-1.5 w-1.5 rounded-full ${
                    isActive ? "bg-signal animate-pulse2" : "bg-ink/20"
                  }`}
                />
                <span
                  className={`text-sm ${isActive ? "text-ink" : "text-ink-mute"}`}
                >
                  {stage.label}
                </span>
                <span className="font-mono text-[10px] text-ink-faint">{stage.tech}</span>
                {count > 0 && (
                  <span className="ml-1 rounded-full bg-ink px-1.5 font-mono text-[10px] tabular-nums text-paper">
                    {count}
                  </span>
                )}
              </div>
              {!isLast && (
                <span
                  aria-hidden
                  className={`h-px w-6 ${isActive ? "bg-signal/50" : "bg-ink/10"}`}
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
