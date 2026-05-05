import { useCallback, useState } from "react";
import { FORMATS, STAGE_COPY, STAGE_ORDER, VARIANTS, formatBytes, usePhoton } from "./photon";

export function Aurora({ footer }: { footer: React.ReactNode }) {
  const p = usePhoton();
  const [drag, setDrag] = useState(false);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDrag(false);
      const dropped = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
      if (dropped.length) p.setFiles(dropped);
    },
    [p],
  );

  const canRun = p.files.length > 0 && p.variants.size > 0 && !p.isRunning;
  const stageLabel =
    p.stage === "idle"
      ? ""
      : p.stage === "done"
      ? STAGE_COPY.done
      : STAGE_COPY[p.stage as keyof typeof STAGE_COPY];

  return (
    <div
      className="relative min-h-screen w-full overflow-hidden"
      style={{
        background:
          "radial-gradient(120% 80% at 90% 0%, oklch(82% 0.10 30) 0%, transparent 55%)," +
          "radial-gradient(100% 70% at 10% 10%, oklch(78% 0.13 350) 0%, transparent 55%)," +
          "radial-gradient(140% 90% at 50% 100%, oklch(40% 0.13 280) 0%, transparent 60%)," +
          "linear-gradient(180deg, oklch(28% 0.06 290) 0%, oklch(22% 0.05 285) 100%)",
        color: "oklch(96% 0.02 80)",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      {/* faint grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(to right, oklch(96% 0.02 80) 1px, transparent 1px), linear-gradient(to bottom, oklch(96% 0.02 80) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative mx-auto w-full max-w-[760px] px-6 pb-16 pt-10">
        {/* mast */}
        <header className="flex items-center justify-between text-[12px]" style={{ color: "oklch(82% 0.04 80 / 0.7)" }}>
          <div className="flex items-center gap-2.5">
            <SparkLogo />
            <span style={{ fontWeight: 500, letterSpacing: "-0.01em" }}>Photon</span>
          </div>
          <div className="flex items-center gap-2 text-[11px]" style={{ color: "oklch(82% 0.04 80 / 0.55)" }}>
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: "oklch(78% 0.16 155)", boxShadow: "0 0 8px oklch(78% 0.16 155 / 0.7)" }}
            />
            All systems nominal
          </div>
        </header>

        {/* hero */}
        <div className="mt-14">
          <h1
            className="text-[52px] leading-[1.0] tracking-[-0.02em]"
            style={{ fontFamily: "'Fraunces', 'Instrument Serif', serif", fontWeight: 400 }}
          >
            Make every image
            <br />
            <em
              style={{
                fontStyle: "italic",
                fontWeight: 300,
                background:
                  "linear-gradient(90deg, oklch(86% 0.12 30) 0%, oklch(82% 0.13 350) 60%, oklch(80% 0.13 60) 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              ship-ready.
            </em>
          </h1>
          <p
            className="mt-4 max-w-[46ch] text-[16px] leading-relaxed"
            style={{ color: "oklch(82% 0.04 80 / 0.72)" }}
          >
            One drop. Every variant your product needs, encoded in parallel and
            delivered as a tidy bundle.
          </p>
        </div>

        {/* main panel */}
        <div
          className="mt-10 rounded-[20px] p-6"
          style={{
            background: "oklch(96% 0.02 80 / 0.06)",
            border: "1px solid oklch(96% 0.02 80 / 0.12)",
            backdropFilter: "blur(18px) saturate(140%)",
            WebkitBackdropFilter: "blur(18px) saturate(140%)",
          }}
        >
          {!p.isRunning && !p.isDone ? (
            <Drop
              files={p.files}
              drag={drag}
              setDrag={setDrag}
              onDrop={onDrop}
              setFiles={p.setFiles}
              removeFile={p.removeFile}
            />
          ) : (
            <Progress
              files={p.files}
              stage={p.stage}
              progress={p.progress}
              stageLabel={stageLabel}
              isDone={p.isDone}
            />
          )}

          {/* controls bar */}
          <div className="mt-5 flex flex-wrap items-center gap-4 border-t pt-5" style={{ borderColor: "oklch(96% 0.02 80 / 0.1)" }}>
            <div className="flex flex-1 items-center gap-2">
              <span className="text-[11px] uppercase tracking-[0.18em]" style={{ color: "oklch(82% 0.04 80 / 0.5)" }}>
                Format
              </span>
              <div
                className="flex rounded-full p-1"
                style={{ background: "oklch(96% 0.02 80 / 0.06)", border: "1px solid oklch(96% 0.02 80 / 0.08)" }}
              >
                {FORMATS.map((f) => {
                  const active = p.format === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      disabled={p.isRunning}
                      onClick={() => p.setFormat(f.id)}
                      className="rounded-full px-3 py-1.5 text-[12px] transition-all"
                      style={{
                        background: active ? "oklch(96% 0.02 80)" : "transparent",
                        color: active ? "oklch(22% 0.05 285)" : "oklch(82% 0.04 80 / 0.7)",
                        fontWeight: active ? 600 : 500,
                      }}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {p.isDone ? (
              <button
                type="button"
                onClick={p.reset}
                className="rounded-full px-5 py-2.5 text-[13px]"
                style={{
                  background: "oklch(96% 0.02 80 / 0.08)",
                  border: "1px solid oklch(96% 0.02 80 / 0.12)",
                  color: "oklch(96% 0.02 80)",
                }}
              >
                Run another
              </button>
            ) : (
              <button
                type="button"
                disabled={!canRun}
                onClick={p.run}
                className="rounded-full px-6 py-2.5 text-[13px] font-medium transition-all disabled:cursor-not-allowed disabled:opacity-40"
                style={{
                  background:
                    "linear-gradient(135deg, oklch(86% 0.12 30) 0%, oklch(82% 0.13 350) 100%)",
                  color: "oklch(22% 0.05 285)",
                  boxShadow: canRun
                    ? "0 0 30px oklch(82% 0.13 350 / 0.4), inset 0 1px 0 oklch(98% 0.02 80 / 0.6)"
                    : "none",
                }}
              >
                {p.isRunning ? "Running…" : "Run pipeline →"}
              </button>
            )}
          </div>
        </div>

        {/* variant chips */}
        <div className="mt-6">
          <div className="mb-3 flex items-baseline justify-between">
            <span className="text-[11px] uppercase tracking-[0.18em]" style={{ color: "oklch(82% 0.04 80 / 0.5)" }}>
              Variants
            </span>
            <span className="text-[11px]" style={{ color: "oklch(82% 0.04 80 / 0.45)" }}>
              {p.variants.size} of {VARIANTS.length} selected
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {VARIANTS.map((v) => {
              const active = p.variants.has(v.id);
              return (
                <button
                  key={v.id}
                  type="button"
                  disabled={p.isRunning}
                  onClick={() => p.toggleVariant(v.id)}
                  className="group inline-flex items-center gap-2.5 rounded-full px-4 py-2 text-[13px] transition-all disabled:cursor-not-allowed"
                  style={{
                    background: active ? "oklch(96% 0.02 80)" : "oklch(96% 0.02 80 / 0.05)",
                    color: active ? "oklch(22% 0.05 285)" : "oklch(82% 0.04 80 / 0.85)",
                    border: active ? "1px solid transparent" : "1px solid oklch(96% 0.02 80 / 0.12)",
                  }}
                >
                  <span className="font-medium">{v.label}</span>
                  <span
                    className="text-[10px] uppercase tracking-[0.14em]"
                    style={{ color: active ? "oklch(40% 0.05 285)" : "oklch(82% 0.04 80 / 0.5)" }}
                  >
                    {v.size}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* results */}
        {p.isDone && <Results results={p.results} />}

        {footer}
      </div>
    </div>
  );
}

function SparkLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <defs>
        <linearGradient id="ag" x1="0" y1="0" x2="20" y2="20">
          <stop offset="0%" stopColor="oklch(86% 0.12 30)" />
          <stop offset="100%" stopColor="oklch(82% 0.13 350)" />
        </linearGradient>
      </defs>
      <path d="M10 2L11.8 8.2L18 10L11.8 11.8L10 18L8.2 11.8L2 10L8.2 8.2L10 2Z" fill="url(#ag)" />
    </svg>
  );
}

function Drop({
  files,
  drag,
  setDrag,
  onDrop,
  setFiles,
  removeFile,
}: {
  files: ReturnType<typeof usePhoton>["files"];
  drag: boolean;
  setDrag: (b: boolean) => void;
  onDrop: (e: React.DragEvent) => void;
  setFiles: (f: File[]) => void;
  removeFile: (id: string) => void;
}) {
  const empty = files.length === 0;
  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={onDrop}
      className="block cursor-pointer transition-all"
      style={{
        border: `1.5px dashed ${drag ? "oklch(86% 0.12 30)" : "oklch(96% 0.02 80 / 0.18)"}`,
        background: drag
          ? "radial-gradient(60% 80% at 50% 50%, oklch(86% 0.12 30 / 0.18) 0%, transparent 100%)"
          : "transparent",
        borderRadius: "16px",
        padding: empty ? "44px 24px" : "20px",
        minHeight: empty ? "180px" : "auto",
      }}
    >
      <input
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={(e) => {
          const list = Array.from(e.target.files ?? []);
          if (list.length) setFiles(list);
        }}
      />
      {empty ? (
        <div className="grid place-items-center gap-3 text-center">
          <div
            className="grid h-11 w-11 place-items-center rounded-full"
            style={{
              background:
                "linear-gradient(135deg, oklch(86% 0.12 30 / 0.3), oklch(82% 0.13 350 / 0.3))",
              border: "1px solid oklch(96% 0.02 80 / 0.15)",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 3v9M5 7l4-4 4 4" stroke="oklch(96% 0.02 80)" strokeWidth="1.4" strokeLinecap="round" />
              <rect x="3" y="13" width="12" height="2" rx="1" fill="oklch(96% 0.02 80 / 0.6)" />
            </svg>
          </div>
          <div className="text-[15px]" style={{ fontWeight: 500 }}>
            Drop your image here
          </div>
          <div className="text-[12px]" style={{ color: "oklch(82% 0.04 80 / 0.55)" }}>
            or browse · JPG, PNG, HEIC, WebP up to 50&nbsp;MB
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          {files.map((f) => (
            <div key={f.id} className="group relative">
              <img
                src={f.previewURL}
                alt={f.file.name}
                className="h-24 w-24 object-cover"
                style={{ borderRadius: "12px", border: "1px solid oklch(96% 0.02 80 / 0.12)" }}
              />
              <button
                type="button"
                aria-label={`remove ${f.file.name}`}
                onClick={(e) => {
                  e.preventDefault();
                  removeFile(f.id);
                }}
                className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full opacity-0 transition-opacity group-hover:opacity-100"
                style={{
                  background: "oklch(22% 0.05 285 / 0.9)",
                  color: "oklch(96% 0.02 80)",
                  fontSize: "11px",
                  backdropFilter: "blur(8px)",
                }}
              >
                ×
              </button>
            </div>
          ))}
          <div
            className="grid h-24 w-24 place-items-center text-[11px]"
            style={{
              border: "1.5px dashed oklch(96% 0.02 80 / 0.16)",
              borderRadius: "12px",
              color: "oklch(82% 0.04 80 / 0.55)",
            }}
          >
            + add
          </div>
        </div>
      )}
    </label>
  );
}

function Progress({
  files,
  stage,
  progress,
  stageLabel,
  isDone,
}: {
  files: ReturnType<typeof usePhoton>["files"];
  stage: ReturnType<typeof usePhoton>["stage"];
  progress: number;
  stageLabel: string;
  isDone: boolean;
}) {
  const r = 60;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - progress);
  return (
    <div className="grid grid-cols-1 items-center gap-6 sm:grid-cols-[160px_minmax(0,1fr)]">
      <div className="relative grid h-[160px] w-[160px] place-items-center">
        <svg width="160" height="160" viewBox="0 0 160 160" className="-rotate-90">
          <defs>
            <linearGradient id="auroraRing" x1="0" y1="0" x2="160" y2="160">
              <stop offset="0%" stopColor="oklch(86% 0.12 30)" />
              <stop offset="100%" stopColor="oklch(82% 0.13 350)" />
            </linearGradient>
          </defs>
          <circle cx="80" cy="80" r={r} stroke="oklch(96% 0.02 80 / 0.1)" strokeWidth="3" fill="none" />
          <circle
            cx="80"
            cy="80"
            r={r}
            stroke="url(#auroraRing)"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
            strokeDasharray={c}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 80ms linear", filter: "drop-shadow(0 0 8px oklch(82% 0.13 350 / 0.5))" }}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <div className="text-center">
            <div
              className="text-[36px]"
              style={{
                fontFamily: "'Fraunces', serif",
                fontWeight: 300,
                lineHeight: 1,
              }}
            >
              {Math.round(progress * 100)}
              <span className="text-[18px]" style={{ color: "oklch(82% 0.04 80 / 0.55)" }}>%</span>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{
              background: isDone ? "oklch(78% 0.16 155)" : "oklch(86% 0.12 30)",
              boxShadow: `0 0 8px ${isDone ? "oklch(78% 0.16 155 / 0.6)" : "oklch(86% 0.12 30 / 0.6)"}`,
              animation: isDone ? "none" : "auroraGlow 1.6s ease-in-out infinite",
            }}
          />
          <span className="text-[15px]" style={{ fontFamily: "'Fraunces', serif", fontWeight: 400 }}>
            {stageLabel}
          </span>
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          {STAGE_ORDER.map((s, i) => {
            const idx = STAGE_ORDER.indexOf(stage);
            const active = i <= idx;
            return (
              <span
                key={s}
                className="h-1 flex-1 rounded-full"
                style={{
                  background: active ? "oklch(96% 0.02 80)" : "oklch(96% 0.02 80 / 0.1)",
                  transition: "background 200ms ease-out",
                }}
              />
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {files.map((f) => (
            <img
              key={f.id}
              src={f.previewURL}
              alt={f.file.name}
              className="h-10 w-10 object-cover"
              style={{
                borderRadius: "8px",
                border: "1px solid oklch(96% 0.02 80 / 0.15)",
              }}
            />
          ))}
        </div>
      </div>
      <style>{`@keyframes auroraGlow { 0%,100%{ opacity:0.5 } 50%{ opacity:1 } }`}</style>
    </div>
  );
}

function Results({ results }: { results: import("./photon").PhotonResult[] }) {
  return (
    <div className="mt-8">
      <div className="mb-3 flex items-baseline justify-between">
        <span className="text-[11px] uppercase tracking-[0.18em]" style={{ color: "oklch(82% 0.04 80 / 0.5)" }}>
          Outputs · {results.length} files ready
        </span>
        <button
          type="button"
          className="text-[12px] underline-offset-4 hover:underline"
          style={{ color: "oklch(86% 0.12 30)" }}
        >
          Download all .zip
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {results.map((r, i) => (
          <div
            key={i}
            className="rounded-2xl p-4"
            style={{
              background: "oklch(96% 0.02 80 / 0.05)",
              border: "1px solid oklch(96% 0.02 80 / 0.1)",
              backdropFilter: "blur(12px)",
            }}
          >
            <div className="flex items-center justify-between">
              <span style={{ fontWeight: 500 }}>{r.label}</span>
              <span
                className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.14em]"
                style={{ background: "oklch(96% 0.02 80 / 0.08)", color: "oklch(82% 0.04 80 / 0.7)" }}
              >
                {r.format}
              </span>
            </div>
            <div className="mt-1 text-[11px]" style={{ color: "oklch(82% 0.04 80 / 0.5)" }}>
              {r.size} · {formatBytes(r.bytes)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
