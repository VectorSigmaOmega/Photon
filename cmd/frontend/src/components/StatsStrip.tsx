import type { BatchItem } from "../lib/types";

interface Props {
  items: BatchItem[];
}

function statValue(value: number, singular: string, plural: string) {
  return `${value} ${value === 1 ? singular : plural}`;
}

export function StatsStrip({ items }: Props) {
  const total = items.length;
  const active = items.filter((item) =>
    ["pending_submission", "presigning", "uploading", "creating_job", "queued", "processing", "retrying"].includes(item.status),
  ).length;
  const completed = items.filter((item) => item.status === "completed").length;
  const failed = items.filter((item) => ["submission_failed", "failed", "dead_lettered"].includes(item.status)).length;
  const variants = items.reduce((count, item) => count + item.outputs.length, 0);

  const stats = [
    { label: "batch", value: statValue(total, "file", "files") },
    { label: "active", value: statValue(active, "job", "jobs") },
    { label: "completed", value: statValue(completed, "job", "jobs") },
    { label: "failed", value: statValue(failed, "job", "jobs") },
    { label: "outputs", value: statValue(variants, "variant", "variants") },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-md border border-ink/15 bg-paper-deep/20 px-4 py-3"
        >
          <div className="font-mono text-[10px] uppercase tracking-widest text-ink-mute">
            {stat.label}
          </div>
          <div className="mt-2 font-display text-2xl font-semibold tracking-tight text-ink">
            {stat.value}
          </div>
        </div>
      ))}
    </div>
  );
}
