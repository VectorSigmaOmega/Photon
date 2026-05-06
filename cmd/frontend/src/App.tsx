import { useMemo, useState } from "react";
import { Architecture } from "./components/Architecture";
import { Dropzone } from "./components/Dropzone";
import { FormatSelector } from "./components/FormatSelector";
import { JobLedger } from "./components/JobLedger";
import { Pipeline } from "./components/Pipeline";
import { ReadinessPills } from "./components/ReadinessPills";
import { StatsStrip } from "./components/StatsStrip";
import { VariantSelector } from "./components/VariantSelector";
import { TRANSFORMS, type OutputFormat } from "./lib/transforms";
import type { Transform } from "./lib/types";
import { useReadiness } from "./lib/useReadiness";
import { usePipeline } from "./lib/usePipeline";

export default function App() {
  const readiness = useReadiness();
  const pipeline = usePipeline();
  const [files, setFiles] = useState<File[]>([]);
  const [variants, setVariants] = useState<Set<Transform["name"]>>(
    () => new Set<Transform["name"]>(["thumb", "card", "detail"]),
  );
  const [format, setFormat] = useState<OutputFormat>("webp");

  const transforms = useMemo<Transform[]>(
    () => Array.from(variants).map((n) => TRANSFORMS[n]),
    [variants],
  );

  const canSubmit = files.length > 0 && variants.size > 0 && !pipeline.isSubmitting;

  function toggleVariant(name: Transform["name"]) {
    setVariants((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    await pipeline.submit(files, transforms, format);
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto w-full max-w-[1200px] px-5 pb-24 pt-6 sm:px-8 sm:pt-8">
        {/* Masthead */}
        <header className="border-b border-ink/15 pb-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest text-ink-mute">
              <span className="inline-block h-2 w-2 rounded-full bg-signal" />
              <span>photon · v0.1 · async image pipeline</span>
            </div>
            <ReadinessPills state={readiness} />
          </div>
          <div className="mt-6 grid grid-cols-1 items-end gap-6 md:grid-cols-[1.6fr_1fr]">
            <h1 className="font-display text-[clamp(3rem,9vw,7rem)] font-extrabold leading-[0.85] tracking-tightest">
              PHOTON
              <span className="block font-display text-[clamp(1rem,2.4vw,1.6rem)] font-medium leading-tight text-ink-soft tracking-tight">
                One source image · many production variants · across a real distributed runtime.
              </span>
            </h1>
            <div className="font-mono text-xs leading-6 text-ink-mute">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-ink-soft">stack</span>
                <span>go</span>
                <span className="text-ink-faint">·</span>
                <span>redis</span>
                <span className="text-ink-faint">·</span>
                <span>postgres</span>
                <span className="text-ink-faint">·</span>
                <span>minio</span>
                <span className="text-ink-faint">·</span>
                <span>kubernetes</span>
                <span className="text-ink-faint">·</span>
                <span>prometheus</span>
              </div>
              <div className="mt-2 max-w-md text-ink-soft">
                Files are presigned to object storage, persisted in Postgres, queued
                on Redis, transformed by a Go worker pool, and streamed back to MinIO.
              </div>
            </div>
          </div>
        </header>

        {/* Pipeline hero */}
        <section className="mt-10">
          <SectionHeading kicker="fig.01" title="Job lifecycle, live trace" />
          <div className="mt-4">
            <Pipeline items={pipeline.items} />
          </div>
        </section>

        {/* Submit + ledger */}
        <section className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
          <div>
            <SectionHeading kicker="run" title="Submit a batch" />
            <form onSubmit={handleSubmit} className="mt-4 space-y-6">
              <Dropzone files={files} onChange={setFiles} disabled={pipeline.isSubmitting} />
              <FormatSelector
                value={format}
                onChange={setFormat}
                disabled={pipeline.isSubmitting}
              />
              <VariantSelector
                selected={variants}
                onToggle={toggleVariant}
                disabled={pipeline.isSubmitting}
              />

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink/15 pt-4">
                <div className="font-mono text-[11px] uppercase tracking-widest text-ink-mute">
                  {variants.size === 0
                    ? "select at least one variant"
                    : `${variants.size} ${variants.size === 1 ? "variant" : "variants"} · ${format}`}
                </div>
                <div className="flex items-center gap-3">
                  <a
                    href="https://github.com/VectorSigmaOmega/SwiftBatch"
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-[11px] uppercase tracking-widest text-ink-soft underline-offset-4 hover:text-ink hover:underline"
                  >
                    source ↗
                  </a>
                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className="group relative inline-flex items-center gap-3 rounded-sm bg-ink px-5 py-3 font-mono text-[11px] uppercase tracking-widest text-paper transition-colors hover:bg-signal disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-signal transition-colors group-hover:bg-paper" />
                    {pipeline.isSubmitting ? "submitting…" : "run pipeline"}
                  </button>
                </div>
              </div>

              {pipeline.banner && (
                <div
                  className={`rounded-sm border px-4 py-3 font-mono text-xs ${
                    pipeline.banner.tone === "ok"
                      ? "border-ok/40 bg-ok/10 text-ink"
                      : "border-signal/40 bg-signal/10 text-signal-deep"
                  }`}
                >
                  {pipeline.banner.message}
                </div>
              )}
            </form>
          </div>

          <div>
            <SectionHeading kicker="ledger" title="Per-file lifecycle" />
            <div className="mt-4">
              <JobLedger items={pipeline.items} onRetry={pipeline.retry} />
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="mt-16">
          <SectionHeading kicker="instruments" title="System read-out" />
          <div className="mt-4">
            <StatsStrip items={pipeline.items} />
          </div>
        </section>

        {/* Architecture */}
        <section className="mt-16">
          <SectionHeading kicker="fig.02" title="Service topology" />
          <div className="mt-4">
            <Architecture />
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 font-mono text-xs leading-6 text-ink-soft sm:grid-cols-2">
            <p>
              <span className="text-ink-mute">// ingress.</span> Traefik on k3s
              terminates TLS via Let&apos;s Encrypt and forwards HTTPS to the API
              service. Browser uploads bypass the API entirely via presigned PUT.
            </p>
            <p>
              <span className="text-ink-mute">// api.</span> Go service writes
              the job row to Postgres, then enqueues the id on Redis. Per-route
              token-bucket rate limiting; Prometheus instrumentation per handler.
            </p>
            <p>
              <span className="text-ink-mute">// worker.</span> Pool blocks on
              <code className="mx-1 rounded-sm bg-ink/5 px-1 py-0.5">BRPOP</code>,
              fetches the source from MinIO, decodes with libvips, fans the
              transforms out, and re-uploads variants. Failures retry with backoff
              before dead-lettering.
            </p>
            <p>
              <span className="text-ink-mute">// observability.</span>{" "}
              <code className="mx-1 rounded-sm bg-ink/5 px-1 py-0.5">/readyz</code>
              {" "}probes Postgres, Redis, and MinIO independently — the pills above
              this page poll it every five seconds. <code className="mx-1 rounded-sm bg-ink/5 px-1 py-0.5">/metrics</code>
              {" "}exposes Prometheus counters and histograms for both pods.
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-20 border-t border-ink/15 pt-6">
          <div className="flex flex-wrap items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-widest text-ink-mute">
            <span>photon — single-page demo · no fabricated metrics</span>
            <span>built with go · react · tailwind</span>
          </div>
        </footer>
      </div>
    </div>
  );
}

function SectionHeading({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div className="flex items-baseline gap-4">
      <span className="font-mono text-[10px] uppercase tracking-widest text-signal-deep">
        {kicker}
      </span>
      <span className="h-px flex-1 bg-ink/15" />
      <span className="font-display text-base font-semibold tracking-tight text-ink-soft sm:text-lg">
        {title}
      </span>
    </div>
  );
}
