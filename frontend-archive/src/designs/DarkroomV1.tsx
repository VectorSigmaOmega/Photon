import { useCallback, useState } from "react";
import { FORMATS, VARIANTS, formatBytes, usePhoton } from "./photon";

const PAPER = "oklch(94% 0.012 80)";
const PAPER_HI = "oklch(96% 0.012 80)";
const INK = "oklch(16% 0.018 50)";
const INK_60 = "oklch(40% 0.018 50)";
const INK_45 = "oklch(50% 0.018 50)";
const RULE = "oklch(16% 0.018 50 / 0.18)";
const SIGNAL = "oklch(58% 0.21 28)";
const FILM = "oklch(16% 0.018 50)";
const FILM_LIGHT = "oklch(72% 0.012 80)";

export function DarkroomV1({ footer }: { footer: React.ReactNode }) {
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
  return (
    <div
      className="flex h-screen w-full justify-center overflow-hidden"
      style={{
        background: PAPER,
        color: INK,
        fontFamily: "Inter, system-ui, sans-serif",
        backgroundImage: "radial-gradient(circle at 12% -10%, oklch(86% 0.02 80) 0%, transparent 55%)",
      }}
    >
      <div className="flex w-full max-w-[760px] flex-col px-6 pt-[6vh] pb-6">
        {/* Mast — italic wordmark only */}
        <header className="flex items-baseline">
          <span className="text-[26px] leading-none"
            style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontStyle: "italic" }}>
            Photon
          </span>
        </header>

        {/* Hero */}
        <h1
          className="mt-9"
          style={{ fontFamily: "'Fraunces', serif", fontWeight: 400, fontSize: "64px", lineHeight: 0.95 }}
        >
          Develop the
          <br />
          <em style={{ fontWeight: 300, fontStyle: "italic", color: "oklch(38% 0.04 30)" }}>full contact sheet</em>
          <span style={{ color: SIGNAL }}>.</span>
        </h1>

        {/* Film strip */}
        <div className="mt-7 flex flex-col" style={{ minHeight: "200px", maxHeight: "240px" }}>
          <FilmStrip
            files={p.files}
            drag={drag}
            setDrag={setDrag}
            onDrop={onDrop}
            setFiles={p.setFiles}
            removeFile={p.removeFile}
            running={p.isRunning || p.isDone}
            progress={p.progress}
            isDone={p.isDone}
            results={p.results}
          />
        </div>

        {/* Compressed control row: emulsion + crops + expose */}
        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
          {/* Emulsion as 4 small blocks */}
          <div className="inline-flex items-baseline gap-2">
            <span style={mono(10, INK_60)}>emulsion</span>
            <div className="inline-flex items-center gap-1">
              {FORMATS.map((f) => {
                const active = p.format === f.id;
                return (
                  <button key={f.id} type="button" disabled={p.isRunning}
                    onClick={() => p.setFormat(f.id)}
                    className="px-2 py-1 transition-colors"
                    style={{
                      ...mono(10, active ? PAPER_HI : INK_60),
                      background: active ? INK : "transparent",
                      border: `1px solid ${active ? INK : RULE}`,
                    }}>
                    {f.id}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Crops with frame icon + label */}
          <div className="inline-flex items-baseline gap-2">
            <span style={mono(10, INK_60)}>crops</span>
            <div className="inline-flex flex-wrap items-center gap-1.5">
              {VARIANTS.map((v) => {
                const active = p.variants.has(v.id);
                return (
                  <button key={v.id} type="button" disabled={p.isRunning}
                    onClick={() => p.toggleVariant(v.id)}
                    title={`${v.label} · ${v.size}`}
                    className="inline-flex items-center gap-1.5 px-2 py-1 transition-colors"
                    style={{
                      border: `1px solid ${active ? INK : "oklch(16% 0.018 50 / 0.25)"}`,
                      background: active ? INK : "transparent",
                      color: active ? PAPER_HI : INK,
                      fontSize: "11px",
                      fontWeight: 500,
                      minWidth: "104px",
                      justifyContent: "flex-start",
                    }}>
                    <CropFrame ratio={v.ratio} active={active} />
                    {v.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Expose with dial inline */}
          <div className="ml-auto flex items-center gap-3">
            <ExposureDial progress={p.progress} running={p.isRunning} done={p.isDone} />
            {p.isDone ? (
              <button type="button" onClick={p.reset}
                className="px-4 py-2 transition-colors"
                style={{ ...mono(10, INK), border: `1px solid ${RULE}` }}>
                New roll
              </button>
            ) : (
              <button type="button" disabled={!canRun} onClick={p.run}
                className="inline-flex items-center gap-2 px-4 py-2 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                style={{ ...mono(10, PAPER_HI), background: INK }}
                onMouseEnter={(e) => { if (canRun) e.currentTarget.style.background = SIGNAL; }}
                onMouseLeave={(e) => { if (canRun) e.currentTarget.style.background = INK; }}
              >
                <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: SIGNAL }} />
                {p.isRunning ? "Exposing…" : "Expose"}
              </button>
            )}
          </div>
        </div>

        <div className="mt-auto">{footer}</div>
      </div>
    </div>
  );
}

function mono(size: number, color: string): React.CSSProperties {
  return { fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.18em", textTransform: "uppercase", fontSize: `${size}px`, color };
}

function CropFrame({ ratio, active }: { ratio: string; active: boolean }) {
  const [w, h] = ratio.split("/").map((s) => parseInt(s.trim(), 10));
  const aspect = w / h;
  const W = 18, H = 12;
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
        background: active ? SIGNAL : "oklch(16% 0.018 50 / 0.55)",
      }} />
    </span>
  );
}

function FilmStrip({
  files, drag, setDrag, onDrop, setFiles, removeFile, running, isDone, progress, results,
}: {
  files: ReturnType<typeof usePhoton>["files"];
  drag: boolean;
  setDrag: (b: boolean) => void;
  onDrop: (e: React.DragEvent) => void;
  setFiles: (f: File[]) => void;
  removeFile: (id: string) => void;
  running: boolean;
  isDone: boolean;
  progress: number;
  results: ReturnType<typeof usePhoton>["results"];
}) {
  const empty = files.length === 0;
  return (
    <label
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={onDrop}
      className="flex w-full flex-1 cursor-pointer flex-col"
      style={{
        background: FILM, padding: "10px 12px",
        border: drag ? `2px solid ${SIGNAL}` : "2px solid transparent",
        transition: "border-color 200ms",
      }}
    >
      <input type="file" accept="image/*" multiple className="sr-only" disabled={running}
        onChange={(e) => { const list = Array.from(e.target.files ?? []); if (list.length) setFiles(list); }} />
      <div className="flex items-center justify-between">
        <Sprockets />
        <span style={mono(9, FILM_LIGHT)}>Photon · 35 · 400</span>
        <Sprockets />
      </div>

      <div className="my-2 flex flex-1 items-stretch gap-2 overflow-hidden" style={{ minHeight: "120px" }}>
        {empty ? (
          <div className="grid w-full place-items-center text-center" style={{ color: FILM_LIGHT }}>
            <div>
              <div className="text-[18px]"
                style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontWeight: 300 }}>
                Drop a frame on the strip
              </div>
              <div className="mt-1.5" style={mono(9, "oklch(70% 0.012 80)")}>or click to load</div>
            </div>
          </div>
        ) : isDone ? (
          results.slice(0, 5).map((r, i) => (
            <div key={i} className="relative shrink-0"
              style={{ width: "120px", background: PAPER_HI, padding: "8px" }}>
              <div style={{ aspectRatio: r.ratio, background: INK, height: "60%", position: "relative" }}>
                <span className="absolute bottom-1 right-1 px-1"
                  style={{ ...mono(8, INK_60), background: PAPER_HI }}>{r.format}</span>
              </div>
              <div className="mt-1.5 flex items-baseline justify-between">
                <span className="text-[11px]" style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic" }}>{r.label}</span>
                <span style={mono(8, INK_45)}>{formatBytes(r.bytes)}</span>
              </div>
            </div>
          ))
        ) : (
          files.slice(0, 5).map((f, i) => (
            <div key={f.id} className="group relative shrink-0" style={{ width: "120px", height: "100%" }}>
              <img src={f.previewURL} alt={f.file.name} className="h-full w-full object-cover"
                style={{ filter: running ? "saturate(0.7) contrast(1.05)" : "none" }} />
              {running && !isDone && (
                <div className="pointer-events-none absolute inset-0"
                  style={{ background: `linear-gradient(180deg, transparent ${(1 - progress) * 100}%, oklch(58% 0.21 28 / 0.18) ${(1 - progress) * 100}%)` }} />
              )}
              <div className="absolute bottom-1 left-1 px-1"
                style={{ ...mono(8, FILM_LIGHT), background: "oklch(16% 0.018 50 / 0.85)" }}>
                {String(i + 1).padStart(2, "0")}
              </div>
              {!running && (
                <button type="button" aria-label={`remove ${f.file.name}`}
                  onClick={(e) => { e.preventDefault(); removeFile(f.id); }}
                  className="absolute right-1 top-1 grid h-5 w-5 place-items-center opacity-0 transition-opacity group-hover:opacity-100"
                  style={{ background: SIGNAL, color: PAPER_HI, fontSize: "11px" }}>×</button>
              )}
            </div>
          ))
        )}
      </div>

      <div className="flex items-center justify-between">
        <Sprockets />
        <span style={mono(9, FILM_LIGHT)}>
          {empty ? "drop or click" : isDone ? `${results.length} prints` : `${files.length} frames`}
        </span>
        <Sprockets />
      </div>
    </label>
  );
}

function Sprockets() {
  return (
    <div className="flex gap-1">
      {Array.from({ length: 6 }).map((_, i) => (
        <span key={i} className="block h-2 w-2.5" style={{ background: PAPER_HI, borderRadius: "1px" }} />
      ))}
    </div>
  );
}

function ExposureDial({ progress, running, done }: { progress: number; running: boolean; done: boolean }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid h-[64px] w-[64px] place-items-center">
      <svg width="64" height="64" viewBox="0 0 64 64" className="-rotate-90">
        <circle cx="32" cy="32" r={r} stroke="oklch(16% 0.018 50 / 0.15)" strokeWidth="2" fill="none" />
        <circle cx="32" cy="32" r={r}
          stroke={done ? "oklch(58% 0.14 155)" : SIGNAL}
          strokeWidth="2" strokeLinecap="square" fill="none"
          strokeDasharray={c} strokeDashoffset={c * (1 - progress)}
          style={{ transition: "stroke-dashoffset 80ms linear" }} />
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i * 360) / 12;
          const rad = (angle * Math.PI) / 180;
          const x1 = 32 + Math.cos(rad) * (r + 3);
          const y1 = 32 + Math.sin(rad) * (r + 3);
          const x2 = 32 + Math.cos(rad) * (r + 6);
          const y2 = 32 + Math.sin(rad) * (r + 6);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="oklch(16% 0.018 50 / 0.4)" strokeWidth="1" />;
        })}
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="text-[14px] leading-none" style={{ fontFamily: "'Fraunces', serif", fontWeight: 500 }}>
            {Math.round(progress * 100)}
          </div>
          <div className="mt-0.5" style={mono(7, INK_60)}>{running ? "exp" : done ? "fix" : "set"}</div>
        </div>
      </div>
    </div>
  );
}
