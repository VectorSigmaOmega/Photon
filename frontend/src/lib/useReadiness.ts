import { useEffect, useState } from "react";
import type { Readiness, ReadinessComponent } from "./types";

const COMPONENTS: ReadinessComponent[] = ["postgres", "redis", "storage"];
const POLL_INTERVAL = 5_000;

const initial: Readiness = {
  postgres: { status: "unknown", checkedAt: 0 },
  redis: { status: "unknown", checkedAt: 0 },
  storage: { status: "unknown", checkedAt: 0 },
};

export function useReadiness(): Readiness {
  const [state, setState] = useState<Readiness>(initial);

  useEffect(() => {
    let cancelled = false;

    async function tick() {
      try {
        const response = await fetch("/readyz");
        const body = (await response.json().catch(() => ({}))) as {
          status?: string;
          reason?: string;
        };
        const now = Date.now();

        if (response.ok) {
          if (cancelled) return;
          setState({
            postgres: { status: "ready", checkedAt: now },
            redis: { status: "ready", checkedAt: now },
            storage: { status: "ready", checkedAt: now },
          });
          return;
        }

        // /readyz returns 503 with `reason` naming the failed component.
        const reason = body.reason ?? "";
        const failing: ReadinessComponent | null = reason.startsWith("postgres")
          ? "postgres"
          : reason.startsWith("redis")
            ? "redis"
            : reason.startsWith("storage")
              ? "storage"
              : null;

        if (cancelled) return;
        setState((prev) => {
          const next: Readiness = { ...prev };
          for (const component of COMPONENTS) {
            next[component] = {
              status: component === failing ? "not_ready" : prev[component].status === "not_ready" && component !== failing ? "ready" : prev[component].status,
              reason: component === failing ? reason : prev[component].reason,
              checkedAt: now,
            };
          }
          // First failure observed: if the failing component is identifiable, mark
          // the others as ready (the readyz handler short-circuits on the first
          // failure, so the others may still be healthy or unknown — we keep
          // unknowns honest rather than promote them to ready).
          if (failing) {
            for (const component of COMPONENTS) {
              if (component !== failing && next[component].status === "unknown") {
                next[component] = { status: "unknown", checkedAt: now };
              }
            }
          }
          return next;
        });
      } catch {
        if (cancelled) return;
        const now = Date.now();
        setState({
          postgres: { status: "unknown", checkedAt: now },
          redis: { status: "unknown", checkedAt: now },
          storage: { status: "unknown", checkedAt: now },
        });
      }
    }

    void tick();
    const id = window.setInterval(tick, POLL_INTERVAL);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  return state;
}
