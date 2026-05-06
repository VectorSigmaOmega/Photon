import { useCallback, useState } from "react";
import { FORMATS, STAGE_COPY, STAGE_ORDER, VARIANTS, formatBytes, usePhoton } from "./photon";

const PAPER = "oklch(95% 0.02 95)";
const INK = "oklch(15% 0.02 60)";
const POP = "oklch(86% 0.20 125)";
const POP_DEEP = "oklch(70% 0.21 130)";
const MUTE = "oklch(45% 0.02 60)";

export function ManifoldV1({ footer }: { footer: React.ReactNode }) {
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
    p.stage === "done" ? "DONE" :
    STAGE_COPY[p.stage as keyof typeof STAGE_COPY].toUpperCase();

  return (
    <div className="relative flex h-screen w-full justify-center overflow-hidden"
      style={{ background: PAPER, color: INK, fontFamily: "'Space Grotesk', Inter, sans-serif" }}>
      {/* corner color slab */}
      <div aria-hidden className="pointer-events-none absolute right-0 top-0 z-0"
        style={{
          width: "55%", height: "62vh", background: POP,
          clipPath: "polygon(20% 0, 100% 0, 100% 78%, 0 100%)",
        }} />

      <div className="relative z-10 flex w-full max-w-[920px] flex-col px-6 pt-[6vh] pb-6">
        {/* Mast */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="grid h-7 w-7 place-items-center" style={{ background: INK, color: POP }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                <path d="M7 0L8.5 5.5L14 7L8.5 8.5L7 14L5.5 8.5L0 7L5.5 5.5L7 0Z" />
              </svg>
            </div>
            <span className="text-[14px]" style={{ fontWeight: 700, letterSpacing: "-0.02em" }}>Photon</span>
          </div>
          <span className="text-[16px]" style={{ fontWeight: 700, letterSpacing: "0.02em" }}>Drop · Pick · Ship</span>
        </div>

        {/* Hero + drop tile in tight 2-col, drop aligned to bottom of hero */}
        <div className="mt-10 grid grid-cols-[1fr_340px] items-end gap-7">
          <h1
            className="leading-[0.85] tracking-[-0.045em]"
            style={{ fontFamily: "'Inter Tight', sans-serif", fontWeight: 800, fontSize: "clamp(56px, 8vw, 100px)" }}
          >
            <span className="block">SHIP</span>
            <span className="block" style={{ marginLeft: "0.4em", WebkitTextStroke: `2px ${INK}`, color: "transparent" }}>
              EVERY
            </span>
            <span className="block">SIZE.</span>
          </h1>

          <div>
            {p.isDone ? (
              <ResultBlock results={p.results} />
            ) : !p.isRunning ? (
              <DropTile p={p} drag={drag} setDrag={setDrag} onDrop={onDrop} />
            ) : (
              <ProgressTile p={p} stageLabel={stageLabel} />
            )}
          </div>
        </div>

        {/* Format = rounded pills (image type) */}
        <div className="mt-7 flex flex-wrap items-center gap-x-3 gap-y-2">
          <span style={{ ...mono(10, INK), fontWeight: 700 }}>fmt</span>
          <div className="inline-flex items-center gap-1.5">
            {FORMATS.map((f) => {
              const active = p.format === f.id;
              return (
                <button key={f.id} type="button" disabled={p.isRunning}
                  onClick={() => p.setFormat(f.id)}
                  className="px-3 py-1 transition-all"
                  style={{
                    background: active ? INK : "transparent",
                    color: active ? PAPER : INK,
                    border: `2px solid ${INK}`,
                    fontWeight: 700, fontSize: "12px",
                    borderRadius: "999px",
                  }}>
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Variants = square chips (crop size) */}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
          <span style={{ ...mono(10, INK), fontWeight: 700 }}>crop</span>
          <div className="inline-flex flex-wrap items-center gap-1.5">
            {VARIANTS.map((v) => {
              const active = p.variants.has(v.id);
              return (
                <button key={v.id} type="button" disabled={p.isRunning}
                  onClick={() => p.toggleVariant(v.id)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 transition-all"
                  style={{
                    background: active ? POP : "transparent",
                    color: INK, border: `2px solid ${INK}`,
                    fontWeight: 600, fontSize: "12px",
                    borderRadius: "0",
                    minWidth: "120px",
                    justifyContent: "flex-start",
                  }}>
                  <CropFrame ratio={v.ratio} active={active} />
                  {v.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* RUN bar — full width, prominent */}
        <div className="mt-5">
          {p.isDone ? (
            <button type="button" onClick={p.reset}
              className="block w-full px-5 py-3.5 text-left transition-all"
              style={{ background: INK, color: PAPER, fontWeight: 700, fontSize: "16px" }}>
              <span className="flex items-center justify-between">
                <span>Run another batch</span>
                <span style={{ fontSize: "20px" }}>↻</span>
              </span>
            </button>
          ) : (
            <button type="button" disabled={!canRun} onClick={p.run}
              className="group block w-full px-5 py-3.5 text-left transition-all disabled:cursor-not-allowed"
              style={{
                background: canRun ? INK : "oklch(15% 0.02 60 / 0.25)",
                color: canRun ? POP : "oklch(95% 0.02 95 / 0.6)",
                fontWeight: 800, fontSize: "18px", letterSpacing: "-0.01em",
                fontFamily: "'Inter Tight', sans-serif",
              }}>
              <span className="flex items-center justify-between">
                <span>
                  {p.isRunning
                    ? `RUNNING… ${stageLabel}`
                    : canRun
                    ? `RUN  →  ${p.files.length} × ${p.variants.size} in ${p.format.toUpperCase()}`
                    : "ADD AN IMAGE TO BEGIN"}
                </span>
                {canRun && !p.isRunning && (
                  <span className="grid h-8 w-8 place-items-center transition-transform group-hover:translate-x-1"
                    style={{ background: POP, color: INK }}>→</span>
                )}
              </span>
            </button>
          )}
        </div>

        <div className="mt-auto">{footer}</div>
      </div>
    </div>
  );
}

function mono(size: number, color: string): React.CSSProperties {
  return { fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.18em", textTransform: "uppercase", fontSize: `${size}px`, color };
}

function CropFrame({ ratio, active }: { ratio: string; active: boolean }) {
  const [w, h] = ratio.split("/").map((s) => parseInt(s.trim(), 10));
  const aspect = w / h;
  const W = 16, H = 12;
  let innerW: number, innerH: number;
  if (aspect >= W / H) {
    innerW = W;
    innerH = Math.round((W / aspect) * 10) / 10;
  } else {
    innerH = H;
    innerW = Math.round(H * aspect * 10) / 10;
  }
  return (
    <span aria-hidden style={{
      position: "relative",
      width: W, height: H,
      display: "inline-block", flexShrink: 0,
    }}>
      <span style={{
        position: "absolute",
        top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: innerW, height: innerH,
        background: active ? INK : "oklch(15% 0.02 60 / 0.55)",
      }} />
    </span>
  );
}

function DropTile({
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
      className="flex cursor-pointer items-center justify-center"
      style={{
        background: PAPER,
        border: `3px solid ${INK}`,
        boxShadow: drag ? `5px 5px 0 ${POP_DEEP}` : `5px 5px 0 ${INK}`,
        padding: "18px",
        minHeight: "200px",
        transition: "box-shadow 200ms",
      }}
    >
      <input type="file" accept="image/*" multiple className="sr-only"
        onChange={(e) => { const list = Array.from(e.target.files ?? []); if (list.length) p.setFiles(list); }} />
      {empty ? (
        <div className="grid place-items-center gap-2 py-3 text-center">
          <div className="grid h-12 w-12 place-items-center" style={{ background: INK, color: POP }}>
            <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
              <path d="M14 4v16M7 11l7-7 7 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="square" />
              <rect x="4" y="22" width="20" height="2.5" fill="currentColor" />
            </svg>
          </div>
          <div className="text-[18px]" style={{ fontWeight: 700, letterSpacing: "-0.01em" }}>DROP HERE</div>
          <div className="text-[11px]" style={{ color: MUTE, fontWeight: 500 }}>or click · jpg, png, heic, webp</div>
        </div>
      ) : (
        <div className="grid w-full grid-cols-4 gap-1.5">
          {p.files.slice(0, 8).map((f) => (
            <div key={f.id} className="group relative aspect-square">
              <img src={f.previewURL} alt={f.file.name} className="h-full w-full object-cover"
                style={{ border: `2px solid ${INK}` }} />
              <button type="button" aria-label="remove"
                onClick={(e) => { e.preventDefault(); p.removeFile(f.id); }}
                className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center opacity-0 transition-opacity group-hover:opacity-100"
                style={{ background: INK, color: POP, fontWeight: 700, fontSize: "10px" }}>×</button>
            </div>
          ))}
        </div>
      )}
    </label>
  );
}

function ProgressTile({ p, stageLabel }: { p: ReturnType<typeof usePhoton>; stageLabel: string }) {
  return (
    <div
      style={{
        background: INK, color: PAPER,
        border: `3px solid ${INK}`, boxShadow: `5px 5px 0 ${POP_DEEP}`,
        padding: "14px",
      }}
    >
      <div style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.18em", textTransform: "uppercase", fontSize: "10px", color: POP, fontWeight: 700 }}>
        {stageLabel}
      </div>
      <div className="mt-1 leading-none tracking-[-0.05em]"
        style={{ fontFamily: "'Inter Tight', sans-serif", fontWeight: 800, fontSize: "62px" }}>
        {Math.round(p.progress * 100)}
        <span style={{ fontSize: "0.4em", verticalAlign: "top", marginLeft: "0.05em" }}>%</span>
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1">
        {STAGE_ORDER.map((s, i) => {
          const idx = STAGE_ORDER.indexOf(p.stage);
          const active = i <= idx;
          return <div key={s} className="h-[4px]"
            style={{ background: active ? POP : "oklch(95% 0.02 95 / 0.2)" }} />;
        })}
      </div>
    </div>
  );
}

function ResultBlock({ results }: { results: ReturnType<typeof usePhoton>["results"] }) {
  return (
    <div style={{ background: PAPER, border: `3px solid ${INK}`, boxShadow: `5px 5px 0 ${INK}`, padding: "14px" }}>
      <div className="flex items-baseline justify-between">
        <span style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.18em", textTransform: "uppercase", fontSize: "10px", color: INK, fontWeight: 700 }}>
          {results.length} OUT
        </span>
        <button type="button" className="text-[11px]"
          style={{ fontWeight: 700, background: INK, color: POP, padding: "3px 8px" }}>
          .ZIP ↓
        </button>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1.5">
        {results.slice(0, 6).map((r, i) => (
          <div key={i} className="p-1.5" style={{ border: `2px solid ${INK}` }}>
            <div style={{ aspectRatio: r.ratio, background: INK, color: POP, position: "relative" }}>
              <span className="absolute left-1 top-0.5"
                style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.16em", textTransform: "uppercase", fontSize: "8px", color: POP, fontWeight: 700 }}>
                {r.size.replace(" ", "")}
              </span>
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-[10px]" style={{ fontWeight: 700 }}>{r.label}</span>
              <span style={{ fontSize: "9px", color: MUTE, fontWeight: 600 }}>{formatBytes(r.bytes)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
