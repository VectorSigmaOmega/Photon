import { useCallback, useState } from "react";
import { FORMATS, STAGE_COPY, STAGE_ORDER, VARIANTS, formatBytes, usePhoton } from "./photon";

const FG = "oklch(96% 0.02 80)";
const FG_50 = "oklch(96% 0.02 80 / 0.5)";
const FG_70 = "oklch(96% 0.02 80 / 0.72)";
const FG_15 = "oklch(96% 0.02 80 / 0.15)";
const FG_08 = "oklch(96% 0.02 80 / 0.08)";
const INK_DEEP = "oklch(22% 0.05 285)";
const HOT = "oklch(86% 0.12 30)";
const HOT_GRAD = "linear-gradient(135deg, oklch(86% 0.12 30) 0%, oklch(82% 0.13 350) 100%)";

export function AuroraV1({ footer }: { footer: React.ReactNode }) {
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
    p.stage === "idle" ? "" :
    p.stage === "done" ? STAGE_COPY.done :
    STAGE_COPY[p.stage as keyof typeof STAGE_COPY];

  return (
    <div
      className="flex h-screen w-full justify-center overflow-hidden"
      style={{
        background:
          "radial-gradient(80% 60% at 90% 0%, oklch(82% 0.10 30) 0%, transparent 55%)," +
          "radial-gradient(70% 50% at 5% 5%, oklch(78% 0.13 350) 0%, transparent 55%)," +
          "radial-gradient(120% 80% at 50% 110%, oklch(40% 0.13 280) 0%, transparent 60%)," +
          "linear-gradient(180deg, oklch(28% 0.06 290) 0%, oklch(20% 0.05 285) 100%)",
        color: FG,
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(to right, oklch(96% 0.02 80) 1px, transparent 1px), linear-gradient(to bottom, oklch(96% 0.02 80) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />

      <div className="relative flex w-full max-w-[720px] flex-col px-6 pt-[6vh] pb-6">
        {/* Mast — single brand mark */}
        <div className="flex items-center gap-2.5">
          <SparkLogo />
          <span style={{ fontWeight: 500, letterSpacing: "-0.01em", fontSize: "14px" }}>Photon</span>
        </div>

        {/* Hero serif */}
        <h1
          className="mt-10 tracking-[-0.02em]"
          style={{
            fontFamily: "'Fraunces', 'Instrument Serif', serif",
            fontWeight: 400,
            fontSize: "72px",
            lineHeight: 0.95,
          }}
        >
          Make every image
          <br />
          <em
            style={{
              fontStyle: "italic", fontWeight: 300,
              background: HOT_GRAD,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            ship-ready.
          </em>
        </h1>

        {/* The orb — stable height regardless of state */}
        <div
          className="mt-7 flex flex-col rounded-[18px] p-5"
          style={{
            background: "oklch(96% 0.02 80 / 0.06)",
            border: "1px solid oklch(96% 0.02 80 / 0.12)",
            backdropFilter: "blur(18px) saturate(140%)",
            WebkitBackdropFilter: "blur(18px) saturate(140%)",
            minHeight: "210px",
            maxHeight: "260px",
          }}
        >
          {p.isDone ? (
            <ResultStrip results={p.results} />
          ) : !p.isRunning ? (
            <Drop p={p} drag={drag} setDrag={setDrag} onDrop={onDrop} />
          ) : (
            <Halo p={p} stageLabel={stageLabel} />
          )}
        </div>

        {/* Single compressed control row */}
        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-3">
          {/* Format pill group */}
          <div
            className="flex rounded-full p-1"
            style={{ background: FG_08, border: "1px solid oklch(96% 0.02 80 / 0.08)" }}
          >
            {FORMATS.map((f) => {
              const active = p.format === f.id;
              return (
                <button key={f.id} type="button" disabled={p.isRunning}
                  onClick={() => p.setFormat(f.id)}
                  className="rounded-full px-3 py-1 text-[12px] transition-all"
                  style={{
                    background: active ? FG : "transparent",
                    color: active ? INK_DEEP : FG_70,
                    fontWeight: active ? 600 : 500,
                  }}>
                  {f.label}
                </button>
              );
            })}
          </div>

          {/* Variant chips inline */}
          <div className="flex flex-wrap items-center gap-1.5">
            {VARIANTS.map((v) => {
              const active = p.variants.has(v.id);
              return (
                <button key={v.id} type="button" disabled={p.isRunning}
                  onClick={() => p.toggleVariant(v.id)}
                  title={`${v.size} · ${v.hint}`}
                  className="rounded-full px-3 py-1 text-[12px] transition-all"
                  style={{
                    background: active ? FG : "oklch(96% 0.02 80 / 0.05)",
                    color: active ? INK_DEEP : "oklch(96% 0.02 80 / 0.85)",
                    border: active ? "1px solid transparent" : "1px solid oklch(96% 0.02 80 / 0.12)",
                    fontWeight: active ? 500 : 400,
                    minWidth: "84px",
                  }}>
                  {v.label}
                </button>
              );
            })}
          </div>

          {/* Run pill */}
          <div className="ml-auto">
            {p.isDone ? (
              <button type="button" onClick={p.reset}
                className="rounded-full px-5 py-2 text-[13px]"
                style={{ background: FG_08, border: "1px solid oklch(96% 0.02 80 / 0.18)", color: FG }}>
                Run another
              </button>
            ) : (
              <button type="button" disabled={!canRun} onClick={p.run}
                className="rounded-full px-5 py-2 text-[13px] transition-all disabled:cursor-not-allowed disabled:opacity-40"
                style={{
                  background: HOT_GRAD,
                  color: INK_DEEP, fontWeight: 600,
                  boxShadow: canRun ? "0 0 30px oklch(82% 0.13 350 / 0.4), inset 0 1px 0 oklch(98% 0.02 80 / 0.6)" : "none",
                }}>
                {p.isRunning ? "Running…" : "Run pipeline →"}
              </button>
            )}
          </div>
        </div>

        {footer && <div className="mt-auto" style={{ color: FG }}>{footer}</div>}
      </div>
    </div>
  );
}

function SparkLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <defs>
        <linearGradient id="agV1" x1="0" y1="0" x2="20" y2="20">
          <stop offset="0%" stopColor="oklch(86% 0.12 30)" />
          <stop offset="100%" stopColor="oklch(82% 0.13 350)" />
        </linearGradient>
      </defs>
      <path d="M10 2L11.8 8.2L18 10L11.8 11.8L10 18L8.2 11.8L2 10L8.2 8.2L10 2Z" fill="url(#agV1)" />
    </svg>
  );
}

function Drop({
  p, drag, setDrag, onDrop,
}: {
  p: ReturnType<typeof usePhoton>;
  drag: boolean;
  setDrag: (b: boolean) => void;
  onDrop: (e: React.DragEvent) => void;
}) {
  const empty = p.files.length === 0;
  return (
    <label
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={onDrop}
      className="flex w-full flex-1 cursor-pointer items-center justify-center overflow-auto transition-all"
      style={{
        border: `1.5px dashed ${drag ? HOT : "oklch(96% 0.02 80 / 0.18)"}`,
        background: drag ? "radial-gradient(60% 80% at 50% 50%, oklch(86% 0.12 30 / 0.18) 0%, transparent 100%)" : "transparent",
        borderRadius: "12px",
        padding: "18px",
      }}
    >
      <input type="file" accept="image/*" multiple className="sr-only"
        onChange={(e) => { const list = Array.from(e.target.files ?? []); if (list.length) p.setFiles(list); }} />
      {empty ? (
        <div className="grid place-items-center gap-2 text-center">
          <div className="grid h-10 w-10 place-items-center rounded-full"
            style={{
              background: "linear-gradient(135deg, oklch(86% 0.12 30 / 0.3), oklch(82% 0.13 350 / 0.3))",
              border: "1px solid oklch(96% 0.02 80 / 0.15)",
            }}>
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
              <path d="M9 3v9M5 7l4-4 4 4" stroke={FG} strokeWidth="1.4" strokeLinecap="round" />
              <rect x="3" y="13" width="12" height="2" rx="1" fill={FG_70} />
            </svg>
          </div>
          <div className="text-[14px]" style={{ fontWeight: 500 }}>Drop your image here</div>
          <div className="text-[11px]" style={{ color: FG_50 }}>or browse · jpg, png, heic, webp · 50&nbsp;mb</div>
        </div>
      ) : (
        <div className="flex w-full flex-wrap items-center gap-2">
          {p.files.map((f) => (
            <div key={f.id} className="group relative">
              <img src={f.previewURL} alt={f.file.name} className="h-16 w-16 object-cover"
                style={{ borderRadius: "8px", border: "1px solid oklch(96% 0.02 80 / 0.12)" }} />
              <button type="button" aria-label="remove"
                onClick={(e) => { e.preventDefault(); p.removeFile(f.id); }}
                className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full opacity-0 transition-opacity group-hover:opacity-100"
                style={{ background: "oklch(22% 0.05 285 / 0.9)", color: FG, fontSize: "11px" }}>×</button>
            </div>
          ))}
          <div className="grid h-16 w-16 place-items-center"
            style={{ border: "1.5px dashed oklch(96% 0.02 80 / 0.16)", borderRadius: "8px", color: FG_50, fontSize: "11px" }}>
            + add
          </div>
          <span className="ml-auto text-[11px]" style={{ color: FG_50 }}>
            {formatBytes(p.files.reduce((a, b) => a + b.bytes, 0))}
          </span>
        </div>
      )}
    </label>
  );
}

function Halo({ p, stageLabel }: { p: ReturnType<typeof usePhoton>; stageLabel: string }) {
  const r = 56;
  const c = 2 * Math.PI * r;
  return (
    <div className="grid w-full flex-1 grid-cols-[auto_1fr] items-center gap-5">
      <div className="relative grid h-[140px] w-[140px] place-items-center">
        <svg width="140" height="140" viewBox="0 0 140 140" className="-rotate-90">
          <defs>
            <linearGradient id="auroraV1Ring" x1="0" y1="0" x2="140" y2="140">
              <stop offset="0%" stopColor="oklch(86% 0.12 30)" />
              <stop offset="100%" stopColor="oklch(82% 0.13 350)" />
            </linearGradient>
          </defs>
          <circle cx="70" cy="70" r={r} stroke="oklch(96% 0.02 80 / 0.1)" strokeWidth="3" fill="none" />
          <circle cx="70" cy="70" r={r} stroke="url(#auroraV1Ring)" strokeWidth="3" strokeLinecap="round" fill="none"
            strokeDasharray={c} strokeDashoffset={c * (1 - p.progress)}
            style={{ transition: "stroke-dashoffset 80ms linear", filter: "drop-shadow(0 0 8px oklch(82% 0.13 350 / 0.5))" }} />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <div className="text-[34px] leading-none" style={{ fontFamily: "'Fraunces', serif", fontWeight: 300 }}>
            {Math.round(p.progress * 100)}<span className="text-[16px]" style={{ color: FG_50 }}>%</span>
          </div>
        </div>
      </div>
      <div>
        <div className="text-[15px]" style={{ fontFamily: "'Fraunces', serif" }}>{stageLabel}</div>
        <div className="mt-2 flex items-center gap-1">
          {STAGE_ORDER.map((s, i) => {
            const idx = STAGE_ORDER.indexOf(p.stage);
            const active = i <= idx;
            return <span key={s} className="h-1 flex-1 rounded-full"
              style={{ background: active ? FG : FG_15, transition: "background 200ms" }} />;
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {p.files.map((f) => (
            <img key={f.id} src={f.previewURL} alt={f.file.name} className="h-9 w-9 object-cover"
              style={{ borderRadius: "6px", border: "1px solid oklch(96% 0.02 80 / 0.15)" }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ResultStrip({ results }: { results: ReturnType<typeof usePhoton>["results"] }) {
  return (
    <div className="flex w-full flex-1 flex-col">
      <div className="flex items-baseline justify-between">
        <span className="text-[14px]" style={{ fontFamily: "'Fraunces', serif" }}>
          {results.length} variants ready.
        </span>
        <button type="button" className="text-[12px] underline-offset-4 hover:underline" style={{ color: HOT }}>
          Download .zip
        </button>
      </div>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {results.map((r, i) => (
          <span key={i} className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1"
            style={{ background: FG_08, border: "1px solid oklch(96% 0.02 80 / 0.12)", fontSize: "11px" }}>
            <span style={{ fontWeight: 500 }}>{r.label}</span>
            <span style={{ color: FG_50 }}>· {r.format} · {formatBytes(r.bytes)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
