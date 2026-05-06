import { useCallback, useState } from "react";
import { FORMATS, STAGE_COPY, STAGE_ORDER, VARIANTS, formatBytes, usePhoton } from "./photon";

const PAPER = "oklch(96.5% 0.012 75)";
const PAPER_DEEP = "oklch(94% 0.018 70 / 0.45)";
const INK = "oklch(18% 0.02 60)";
const INK_MUTE = "oklch(38% 0.018 65)";
const INK_FAINT = "oklch(56% 0.018 65)";
const RULE = "oklch(18% 0.02 60 / 0.18)";
const RULE_SOFT = "oklch(18% 0.02 60 / 0.1)";
const SIGNAL = "oklch(58% 0.21 28)";

export function StudioV1({ footer }: { footer: React.ReactNode }) {
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
  const stageLabel = p.stage === "idle" ? "" : p.stage === "done" ? STAGE_COPY.done : STAGE_COPY[p.stage as keyof typeof STAGE_COPY];
  const stageIdx = STAGE_ORDER.indexOf(p.stage);

  return (
    <div className="flex h-screen w-full justify-center overflow-hidden" style={{ background: PAPER, color: INK, fontFamily: "Inter, system-ui, sans-serif" }}>
      <div className="flex w-full max-w-[640px] flex-col px-6 pt-[6vh] pb-6">
        {/* Mast */}
        <header className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: SIGNAL }} />
          <span style={mono(10, INK_FAINT)}>Photon</span>
        </header>

        {/* Hero */}
        <h1
          className="mt-10 tracking-[-0.03em]"
          style={{ fontFamily: "'Inter Tight', sans-serif", fontWeight: 600, fontSize: "56px", lineHeight: 0.92 }}
        >
          One source.<br />
          <span style={{ color: INK_MUTE }}>Every variant you ship</span><span style={{ color: SIGNAL }}>.</span>
        </h1>

        {/* The Plate — stable height regardless of state */}
        <div
          className="mt-7 flex"
          style={{
            border: `1px dashed ${drag ? SIGNAL : "oklch(18% 0.02 60 / 0.3)"}`,
            background: drag ? "oklch(96% 0.04 30 / 0.4)" : PAPER_DEEP,
            borderRadius: "2px",
            transition: "border-color 200ms",
            minHeight: "220px",
            maxHeight: "260px",
          }}
        >
          {!p.isRunning && !p.isDone ? (
            <Plate p={p} setDrag={setDrag} onDrop={onDrop} />
          ) : (
            <Progress p={p} stageLabel={stageLabel} stageIdx={stageIdx} />
          )}
        </div>

        {/* Compressed control row */}
        <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2">
          <FormatDial p={p} />
          <span className="h-4 w-px" style={{ background: RULE }} />
          <VariantChips p={p} />
        </div>

        {/* Run row */}
        <div className="mt-5 flex items-baseline justify-between">
          <span style={mono(10, INK_FAINT)}>
            {p.files.length || "—"} · {p.variants.size}/{VARIANTS.length} · {p.format}
          </span>
          {p.isDone ? (
            <button type="button" onClick={p.reset}
              className="text-[13px] underline-offset-4 hover:underline"
              style={{ color: SIGNAL }}>
              Run another →
            </button>
          ) : (
            <button type="button" disabled={!canRun} onClick={p.run}
              className="rounded-sm px-5 py-2.5 transition-colors disabled:cursor-not-allowed"
              style={{
                background: canRun ? INK : "oklch(18% 0.02 60 / 0.2)",
                color: PAPER,
                ...mono(11, PAPER),
              }}
              onMouseEnter={(e) => { if (canRun) e.currentTarget.style.background = SIGNAL; }}
              onMouseLeave={(e) => { if (canRun) e.currentTarget.style.background = INK; }}
            >
              {p.isRunning ? "Running…" : "Run pipeline"}
            </button>
          )}
        </div>

        <div className="mt-auto">{footer}</div>
      </div>
    </div>
  );
}

function FormatDial({ p }: { p: ReturnType<typeof usePhoton> }) {
  return (
    <div className="inline-flex items-baseline gap-3">
      <span style={mono(10, SIGNAL)}>fmt</span>
      <div className="inline-flex items-center gap-1">
        {FORMATS.map((f) => {
          const active = p.format === f.id;
          return (
            <button key={f.id} type="button" disabled={p.isRunning}
              onClick={() => p.setFormat(f.id)}
              className="px-2 py-1 transition-colors"
              style={{
                ...mono(10, active ? PAPER : INK_FAINT),
                background: active ? INK : "transparent",
                borderRadius: "1px",
              }}>
              {f.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function VariantChips({ p }: { p: ReturnType<typeof usePhoton> }) {
  return (
    <div className="inline-flex items-baseline gap-3">
      <span style={mono(10, SIGNAL)}>crops</span>
      <div className="inline-flex flex-wrap items-center gap-1.5">
        {VARIANTS.map((v) => {
          const active = p.variants.has(v.id);
          return (
            <button key={v.id} type="button" disabled={p.isRunning}
              onClick={() => p.toggleVariant(v.id)}
              title={`${v.size} · ${v.hint}`}
              className="inline-flex items-center gap-1.5 px-2 py-1 transition-colors"
              style={{
                background: active ? INK : "transparent",
                color: active ? PAPER : INK_MUTE,
                border: `1px solid ${active ? INK : RULE}`,
                fontSize: "11px",
                fontWeight: 500,
                borderRadius: "1px",
                minWidth: "92px",
                justifyContent: "flex-start",
              }}>
              <span className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ background: active ? SIGNAL : "oklch(18% 0.02 60 / 0.25)" }} />
              {v.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Plate({
  p, setDrag, onDrop,
}: {
  p: ReturnType<typeof usePhoton>;
  setDrag: (b: boolean) => void;
  onDrop: (e: React.DragEvent) => void;
}) {
  const empty = p.files.length === 0;
  return (
    <label
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={onDrop}
      className="flex w-full cursor-pointer items-center justify-center"
      style={{ padding: "20px" }}
    >
      <input type="file" accept="image/*" multiple className="sr-only"
        onChange={(e) => { const list = Array.from(e.target.files ?? []); if (list.length) p.setFiles(list); }} />
      {empty ? (
        <div className="grid place-items-center gap-2 text-center">
          <svg width="28" height="28" viewBox="0 0 42 42" fill="none">
            <path d="M21 14v14M14 21l7-7 7 7" stroke="oklch(18% 0.02 60 / 0.55)" strokeLinecap="round" strokeWidth="1.4" />
          </svg>
          <div className="text-[14px]" style={{ fontWeight: 500 }}>Drop an image</div>
          <div className="text-[11px]" style={{ color: INK_FAINT }}>
            or click · jpg, png, heic, webp · 50&nbsp;mb
          </div>
        </div>
      ) : (
        <div className="flex w-full flex-wrap items-center gap-2">
          {p.files.map((f) => (
            <div key={f.id} className="group relative">
              <img src={f.previewURL} alt={f.file.name} className="h-16 w-16 object-cover"
                style={{ borderRadius: "2px", border: `1px solid ${RULE}` }} />
              <button type="button" aria-label={`remove ${f.file.name}`}
                onClick={(e) => { e.preventDefault(); p.removeFile(f.id); }}
                className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full opacity-0 transition-opacity group-hover:opacity-100"
                style={{ background: INK, color: PAPER, fontSize: "11px" }}>×</button>
            </div>
          ))}
          <div className="grid h-16 w-16 place-items-center"
            style={{ border: `1px dashed oklch(18% 0.02 60 / 0.3)`, ...mono(10, INK_FAINT), borderRadius: "2px" }}>
            + add
          </div>
          <span className="ml-auto" style={mono(10, INK_FAINT)}>
            {formatBytes(p.files.reduce((a, b) => a + b.bytes, 0))}
          </span>
        </div>
      )}
    </label>
  );
}

function Progress({
  p, stageLabel, stageIdx,
}: {
  p: ReturnType<typeof usePhoton>;
  stageLabel: string;
  stageIdx: number;
}) {
  return (
    <div className="flex w-full flex-col" style={{ padding: "20px" }}>
      <div className="flex items-center gap-3">
        <span className="inline-block h-2 w-2 rounded-full"
          style={{
            background: p.isDone ? "oklch(58% 0.14 155)" : SIGNAL,
            animation: p.isDone ? "none" : "studioV1Pulse 1.4s ease-in-out infinite",
          }} />
        <span style={mono(10, "oklch(28% 0.02 60)")}>{stageLabel}</span>
        <span className="ml-auto" style={mono(10, INK_FAINT)}>{Math.round(p.progress * 100)}%</span>
      </div>
      <div className="mt-3 h-px w-full overflow-hidden" style={{ background: RULE_SOFT }}>
        <div style={{ height: "100%", width: `${p.progress * 100}%`, background: INK, transition: "width 80ms linear" }} />
      </div>
      <div className="mt-3 grid grid-cols-7 gap-1">
        {STAGE_ORDER.map((s, i) => (
          <div key={s} className="h-[2px]"
            style={{ background: i < stageIdx ? INK : i === stageIdx ? SIGNAL : RULE_SOFT }} />
        ))}
      </div>
      {p.isDone ? (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {p.results.slice(0, 8).map((r, i) => (
            <span key={i} className="inline-flex items-center gap-1.5 px-2 py-1"
              style={{ border: `1px solid ${RULE}`, borderRadius: "1px", fontSize: "11px" }}>
              <span style={mono(9, SIGNAL)}>{r.format}</span>
              <span style={{ fontWeight: 500 }}>{r.label}</span>
              <span style={mono(9, INK_FAINT)}>{formatBytes(r.bytes)}</span>
            </span>
          ))}
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {p.files.map((f) => (
            <img key={f.id} src={f.previewURL} alt={f.file.name} className="h-9 w-9 object-cover"
              style={{ borderRadius: "2px", border: `1px solid ${RULE}` }} />
          ))}
        </div>
      )}
      <style>{`@keyframes studioV1Pulse { 0%,100%{ opacity:0.4 } 50%{ opacity:1 } }`}</style>
    </div>
  );
}

function mono(size: number, color: string): React.CSSProperties {
  return {
    fontFamily: "'IBM Plex Mono', monospace",
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    fontSize: `${size}px`,
    color,
  };
}
