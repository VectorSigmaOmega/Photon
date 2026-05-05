import type { Readiness, ReadinessComponent } from "../lib/types";

const ORDER: { id: ReadinessComponent; label: string }[] = [
  { id: "postgres", label: "Postgres" },
  { id: "redis", label: "Redis" },
  { id: "storage", label: "MinIO" },
];

export function ReadinessPills({ state }: { state: Readiness }) {
  const allReady = ORDER.every((c) => state[c.id].status === "ready");
  const anyDown = ORDER.some((c) => state[c.id].status === "not_ready");

  return (
    <div
      className="flex items-center gap-2 text-xs text-ink-soft"
      title={ORDER.map((c) => `${c.label}: ${state[c.id].status}${state[c.id].reason ? ` (${state[c.id].reason})` : ""}`).join("\n")}
    >
      <span className="hidden sm:inline">
        {anyDown ? "Degraded" : allReady ? "All systems live" : "Checking"}
      </span>
      <span className="flex items-center gap-1.5">
        {ORDER.map(({ id, label }) => {
          const s = state[id];
          const tone =
            s.status === "ready"
              ? "bg-ok"
              : s.status === "not_ready"
                ? "bg-signal animate-pulse2"
                : "bg-ink/30";
          return (
            <span
              key={id}
              className={`inline-block h-1.5 w-1.5 rounded-full ${tone}`}
              aria-label={`${label}: ${s.status}`}
            />
          );
        })}
      </span>
    </div>
  );
}
