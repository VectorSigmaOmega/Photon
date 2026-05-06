import { useCallback, useState } from "react";
import { FORMATS, STAGE_COPY, STAGE_ORDER, VARIANTS, formatBytes, usePhoton } from "./photon";

const BG = "oklch(18% 0.012 60)";
const SURF = "oklch(22% 0.014 60)";
const SURF_HI = "oklch(28% 0.014 60)";
const TEXT = "oklch(94% 0.018 80)";
const MUTE = "oklch(70% 0.014 70)";
const FAINT = "oklch(50% 0.012 60)";
const RULE = "oklch(94% 0.018 80 / 0.08)";
const ACCENT = "oklch(75% 0.16 50)";
const ACCENT_DEEP = "oklch(82% 0.18 60)";

export function ConsoleV1({ footer }: { footer: React.ReactNode }) {
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
    p.stage === "idle" ? "Ready" :
    p.stage === "done" ? STAGE_COPY.done :
    STAGE_COPY[p.stage as keyof typeof STAGE_COPY];

  return (
    <div className="relative flex h-screen w-full justify-center overflow-hidden"
      style={{ background: BG, color: TEXT, fontFamily: "Inter, system-ui, sans-serif" }}>
      {/* Beam at top */}
      <div className="absolute left-0 right-0 top-0 h-[2px]" style={{ background: "oklch(94% 0.018 80 / 0.08)" }}>
        <div style={{
          height: "100%", width: `${p.progress * 100}%`,
          background: `linear-gradient(90deg, transparent, ${ACCENT} 30%, ${ACCENT_DEEP} 70%, transparent)`,
          transition: "width 80ms linear",
          boxShadow: p.isRunning ? `0 0 12px ${ACCENT}` : "none",
        }} />
      </div>

      <div className="flex w-full max-w-[760px] flex-col px-6 pt-[6vh] pb-6">
        {/* Mast */}
        <div className="flex items-center gap-3">
          <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
            <circle cx="11" cy="11" r="10" stroke={TEXT} strokeOpacity="0.6" strokeWidth="1" />
            <circle cx="11" cy="11" r="3" fill={ACCENT} />
          </svg>
          <span className="text-[14px]" style={{ fontWeight: 500 }}>Photon</span>
        </div>

        {/* Hero */}
        <div className="mt-9">
          <h1
            className="tracking-[-0.02em]"
            style={{ fontFamily: "'Fraunces', serif", fontWeight: 300, fontSize: "68px", lineHeight: 0.95 }}
          >
            One image,
            <br />
            <em style={{ fontStyle: "italic", color: ACCENT, fontWeight: 300 }}>every dimension</em>
            <span style={{ color: MUTE }}> you need.</span>
          </h1>
        </div>

        {/* The dropzone — stable height */}
        <div className="mt-7 flex flex-col" style={{ minHeight: "210px", maxHeight: "260px" }}>
          {p.isDone ? (
            <ResultStrip results={p.results} />
          ) : !p.isRunning ? (
            <Drop p={p} drag={drag} setDrag={setDrag} onDrop={onDrop} />
          ) : (
            <Running p={p} stageLabel={stageLabel} />
          )}
        </div>

        {/* Compressed control row */}
        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
          <div className="inline-flex items-center gap-2">
            <span style={mono(10, FAINT)}>fmt</span>
            <div className="inline-flex rounded-md p-0.5" style={{ background: SURF, border: `1px solid ${RULE}` }}>
              {FORMATS.map((f) => {
                const active = p.format === f.id;
                return (
                  <button key={f.id} type="button" disabled={p.isRunning}
                    onClick={() => p.setFormat(f.id)}
                    className="rounded px-2.5 py-1 transition-colors"
                    style={{
                      ...mono(10, active ? ACCENT : FAINT),
                      background: active ? SURF_HI : "transparent",
                    }}>
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="inline-flex flex-wrap items-center gap-1.5">
            <span style={mono(10, FAINT)}>crops</span>
            {VARIANTS.map((v) => {
              const active = p.variants.has(v.id);
              return (
                <button key={v.id} type="button" disabled={p.isRunning}
                  onClick={() => p.toggleVariant(v.id)}
                  title={`${v.size} · ${v.hint}`}
                  className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] transition-colors"
                  style={{
                    background: active ? SURF_HI : SURF,
                    color: active ? TEXT : MUTE,
                    border: `1px solid ${active ? "oklch(75% 0.16 50 / 0.5)" : RULE}`,
                    minWidth: "100px",
                    justifyContent: "flex-start",
                  }}>
                  <span className="inline-block h-1.5 w-1.5 rounded-full"
                    style={{ background: active ? ACCENT : FAINT }} />
                  {v.label}
                </button>
              );
            })}
          </div>

          <div className="ml-auto flex items-center gap-3">
            <span style={mono(10, FAINT)}>{stageLabel}</span>
            {p.isDone ? (
              <button type="button" onClick={p.reset}
                className="rounded-md px-4 py-1.5 text-[12px] transition-colors"
                style={{ border: "1px solid oklch(94% 0.018 80 / 0.15)", color: TEXT }}>
                Run another
              </button>
            ) : (
              <button type="button" disabled={!canRun} onClick={p.run}
                className="rounded-md px-4 py-1.5 text-[12px] transition-all disabled:cursor-not-allowed disabled:opacity-30"
                style={{
                  background: ACCENT, color: BG, fontWeight: 600,
                  boxShadow: canRun ? `0 0 24px oklch(75% 0.16 50 / 0.4)` : "none",
                }}>
                {p.isRunning ? "Running…" : "Run pipeline →"}
              </button>
            )}
          </div>
        </div>

        {footer && <div className="mt-auto" style={{ color: TEXT }}>{footer}</div>}
      </div>
    </div>
  );
}

function mono(size: number, color: string): React.CSSProperties {
  return { fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace", letterSpacing: "0.18em", textTransform: "uppercase", fontSize: `${size}px`, color };
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
      className="flex w-full flex-1 cursor-pointer items-center justify-center rounded-md transition-all"
      style={{
        border: `1px ${drag ? "solid" : "dashed"} ${drag ? ACCENT : "oklch(94% 0.018 80 / 0.18)"}`,
        background: drag ? "oklch(75% 0.16 50 / 0.05)" : SURF,
        padding: "20px",
      }}
    >
      <input type="file" accept="image/*" multiple className="sr-only"
        onChange={(e) => { const list = Array.from(e.target.files ?? []); if (list.length) p.setFiles(list); }} />
      {empty ? (
        <div className="grid place-items-center text-center">
          <div className="text-[22px]"
            style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontWeight: 300, color: TEXT }}>
            Drop your image
          </div>
          <div className="mt-1.5" style={mono(10, FAINT)}>or click to browse · max 50&nbsp;mb</div>
        </div>
      ) : (
        <div className="flex w-full flex-wrap items-center gap-2">
          {p.files.map((f) => (
            <div key={f.id} className="group relative">
              <img src={f.previewURL} alt={f.file.name} className="h-16 w-16 rounded-md object-cover"
                style={{ border: `1px solid ${RULE}` }} />
              <button type="button" aria-label="remove"
                onClick={(e) => { e.preventDefault(); p.removeFile(f.id); }}
                className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full opacity-0 transition-opacity group-hover:opacity-100"
                style={{ background: ACCENT, color: BG, fontSize: "11px" }}>×</button>
            </div>
          ))}
          <div className="grid h-16 w-16 place-items-center rounded-md"
            style={{ border: "1px dashed oklch(94% 0.018 80 / 0.18)", ...mono(10, FAINT) }}>
            + add
          </div>
          <span className="ml-auto" style={mono(10, FAINT)}>
            {formatBytes(p.files.reduce((a, b) => a + b.bytes, 0))}
          </span>
        </div>
      )}
    </label>
  );
}

function Running({ p, stageLabel }: { p: ReturnType<typeof usePhoton>; stageLabel: string }) {
  return (
    <div className="flex w-full flex-1 flex-col rounded-md p-4" style={{ background: SURF, border: `1px solid ${RULE}` }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-block h-1.5 w-1.5 rounded-full"
            style={{
              background: ACCENT, boxShadow: `0 0 8px ${ACCENT}`,
              animation: "consoleV1Pulse 1.4s ease-in-out infinite",
            }} />
          <span style={mono(10, TEXT)}>{stageLabel}</span>
        </div>
        <span style={mono(10, FAINT)}>{Math.round(p.progress * 100).toString().padStart(2, "0")}%</span>
      </div>
      <div className="mt-3 grid grid-cols-7 gap-1">
        {STAGE_ORDER.map((s, i) => {
          const idx = STAGE_ORDER.indexOf(p.stage);
          const active = i <= idx && p.stage !== "idle";
          return (
            <div key={s} className="h-[3px] rounded-full"
              style={{
                background: active ? (i === idx && !p.isDone ? ACCENT : TEXT) : "oklch(94% 0.018 80 / 0.1)",
                transition: "background 200ms",
              }} />
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {p.files.map((f) => (
          <img key={f.id} src={f.previewURL} alt={f.file.name} className="h-9 w-9 rounded-md object-cover"
            style={{ border: `1px solid ${RULE}` }} />
        ))}
      </div>
      <style>{`@keyframes consoleV1Pulse { 0%,100%{ opacity:0.4 } 50%{ opacity:1 } }`}</style>
    </div>
  );
}

function ResultStrip({ results }: { results: ReturnType<typeof usePhoton>["results"] }) {
  return (
    <div className="flex w-full flex-1 flex-col rounded-md p-4" style={{ background: SURF, border: `1px solid ${RULE}` }}>
      <div className="flex items-baseline justify-between">
        <span className="text-[14px]" style={{ fontFamily: "'Fraunces', serif", color: TEXT }}>
          {results.length} variants ready.
        </span>
        <button type="button" className="text-[12px] underline-offset-4 hover:underline" style={{ color: ACCENT }}>
          Download .zip ↓
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {results.map((r, i) => (
          <span key={i} className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1"
            style={{ background: SURF_HI, border: `1px solid ${RULE}`, fontSize: "11px", color: TEXT }}>
            <span style={mono(9, ACCENT)}>{r.format}</span>
            <span style={{ fontWeight: 500 }}>{r.label}</span>
            <span style={{ color: FAINT }}>{formatBytes(r.bytes)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
