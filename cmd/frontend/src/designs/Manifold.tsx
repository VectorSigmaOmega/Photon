import { useCallback, useState } from "react";
import { FORMATS, STAGE_COPY, STAGE_ORDER, VARIANTS, formatBytes, usePhoton } from "./photon";

const PAPER = "oklch(95% 0.02 95)";
const INK = "oklch(15% 0.02 60)";
const POP = "oklch(86% 0.20 125)"; // electric chartreuse
const POP_DEEP = "oklch(70% 0.21 130)";
const MUTE = "oklch(45% 0.02 60)";

export function Manifold({ footer }: { footer: React.ReactNode }) {
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
        background: PAPER,
        color: INK,
        fontFamily: "'Space Grotesk', Inter, sans-serif",
      }}
    >
      {/* corner color block */}
      <div
        aria-hidden
        className="absolute right-0 top-0 -z-0"
        style={{
          width: "55%",
          height: "60vh",
          background: POP,
          clipPath: "polygon(20% 0, 100% 0, 100% 78%, 0 100%)",
        }}
      />

      <div className="relative z-10 mx-auto w-full max-w-[1080px] px-6 pb-16 pt-8">
        {/* mast */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="grid h-7 w-7 place-items-center"
              style={{ background: INK, color: POP }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                <path d="M7 0L8.5 5.5L14 7L8.5 8.5L7 14L5.5 8.5L0 7L5.5 5.5L7 0Z" />
              </svg>
            </div>
            <span className="text-[14px]" style={{ fontWeight: 700, letterSpacing: "-0.02em" }}>
              Photon
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px]" style={{ fontWeight: 500 }}>
            <span>Drop · Pick · Ship</span>
          </div>
        </header>

        {/* hero + dropzone */}
        <div className="mt-10 grid grid-cols-1 items-start gap-8 lg:grid-cols-[1fr_minmax(320px,420px)]">
          <div>
            <h1
              className="leading-[0.85] tracking-[-0.04em]"
              style={{
                fontFamily: "'Inter Tight', sans-serif",
                fontWeight: 800,
                fontSize: "clamp(72px, 11vw, 132px)",
              }}
            >
              <span className="block">SHIP</span>
              <span
                className="block"
                style={{
                  marginLeft: "0.5em",
                  WebkitTextStroke: `2px ${INK}`,
                  color: "transparent",
                }}
              >
                EVERY
              </span>
              <span className="block">SIZE.</span>
            </h1>
            <p
              className="mt-6 max-w-[36ch] text-[16px] leading-snug"
              style={{ color: INK, fontWeight: 500 }}
            >
              One image in. Every variant your product surfaces ask for, out.
              No middle.
            </p>
          </div>

          {/* dropzone / progress card */}
          <div className="relative">
            {!p.isRunning && !p.isDone ? (
              <DropTile
                files={p.files}
                drag={drag}
                setDrag={setDrag}
                onDrop={onDrop}
                setFiles={p.setFiles}
                removeFile={p.removeFile}
              />
            ) : (
              <ProgressTile
                progress={p.progress}
                stageLabel={stageLabel}
                files={p.files}
                stage={p.stage}
                isDone={p.isDone}
              />
            )}
          </div>
        </div>

        {/* format + variants */}
        <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[auto_1fr]">
          <div>
            <Eyebrow>FORMAT</Eyebrow>
            <div className="mt-2 flex flex-wrap gap-2">
              {FORMATS.map((f) => {
                const active = p.format === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    disabled={p.isRunning}
                    onClick={() => p.setFormat(f.id)}
                    className="px-4 py-2.5 transition-all"
                    style={{
                      background: active ? INK : "transparent",
                      color: active ? PAPER : INK,
                      border: `2px solid ${INK}`,
                      fontWeight: 700,
                      fontSize: "13px",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Eyebrow>VARIANTS · {p.variants.size}/5</Eyebrow>
            <div className="mt-2 flex flex-wrap gap-2">
              {VARIANTS.map((v) => {
                const active = p.variants.has(v.id);
                return (
                  <button
                    key={v.id}
                    type="button"
                    disabled={p.isRunning}
                    onClick={() => p.toggleVariant(v.id)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 transition-all"
                    style={{
                      background: active ? POP : "transparent",
                      color: INK,
                      border: `2px solid ${INK}`,
                      fontWeight: 600,
                      fontSize: "13px",
                    }}
                  >
                    <span
                      className="inline-block h-2 w-2"
                      style={{
                        background: active ? INK : "transparent",
                        border: `1.5px solid ${INK}`,
                      }}
                    />
                    {v.label}
                    <span style={{ fontWeight: 400, opacity: 0.6, fontSize: "11px" }}>
                      {v.size}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* run bar */}
        <div className="mt-10">
          {p.isDone ? (
            <button
              type="button"
              onClick={p.reset}
              className="block w-full px-6 py-5 text-left transition-all"
              style={{
                background: INK,
                color: PAPER,
                fontWeight: 700,
                fontSize: "18px",
              }}
            >
              <span className="flex items-center justify-between">
                <span>Run another batch</span>
                <span style={{ fontSize: "26px" }}>↻</span>
              </span>
            </button>
          ) : (
            <button
              type="button"
              disabled={!canRun}
              onClick={p.run}
              className="group block w-full px-6 py-5 text-left transition-all disabled:cursor-not-allowed"
              style={{
                background: canRun ? INK : "oklch(15% 0.02 60 / 0.25)",
                color: canRun ? POP : "oklch(95% 0.02 95 / 0.6)",
                fontWeight: 800,
                fontSize: "22px",
                letterSpacing: "-0.01em",
                fontFamily: "'Inter Tight', sans-serif",
              }}
            >
              <span className="flex items-center justify-between">
                <span>
                  {p.isRunning
                    ? "RUNNING…"
                    : canRun
                    ? `RUN  →  ${p.files.length} × ${p.variants.size} variants in ${p.format.toUpperCase()}`
                    : "Add an image to begin"}
                </span>
                {canRun && !p.isRunning && (
                  <span
                    className="grid h-10 w-10 place-items-center transition-transform group-hover:translate-x-1"
                    style={{ background: POP, color: INK }}
                  >
                    →
                  </span>
                )}
              </span>
            </button>
          )}
        </div>

        {/* results */}
        {p.isDone && <Results results={p.results} />}

        {footer}
      </div>
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-[10px] uppercase"
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        letterSpacing: "0.22em",
        color: INK,
        fontWeight: 700,
      }}
    >
      {children}
    </div>
  );
}

function DropTile({
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
      className="block cursor-pointer"
      style={{
        background: PAPER,
        border: `3px solid ${INK}`,
        boxShadow: drag ? `8px 8px 0 ${POP_DEEP}` : `8px 8px 0 ${INK}`,
        padding: "20px",
        transition: "box-shadow 200ms",
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
        <div className="grid place-items-center gap-3 py-12 text-center">
          <div
            className="grid h-16 w-16 place-items-center"
            style={{ background: INK, color: POP }}
          >
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M14 4v16M7 11l7-7 7 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="square" />
              <rect x="4" y="22" width="20" height="2.5" fill="currentColor" />
            </svg>
          </div>
          <div className="text-[20px]" style={{ fontWeight: 700, letterSpacing: "-0.01em" }}>
            DROP HERE
          </div>
          <div className="text-[12px]" style={{ color: MUTE, fontWeight: 500 }}>
            or click · jpg, png, heic, webp
          </div>
        </div>
      ) : (
        <div>
          <div className="grid grid-cols-3 gap-2">
            {files.map((f) => (
              <div key={f.id} className="group relative aspect-square">
                <img
                  src={f.previewURL}
                  alt={f.file.name}
                  className="h-full w-full object-cover"
                  style={{ border: `2px solid ${INK}` }}
                />
                <button
                  type="button"
                  aria-label={`remove ${f.file.name}`}
                  onClick={(e) => {
                    e.preventDefault();
                    removeFile(f.id);
                  }}
                  className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center opacity-0 transition-opacity group-hover:opacity-100"
                  style={{ background: INK, color: POP, fontWeight: 700 }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <div
            className="mt-3 grid place-items-center px-3 py-2 text-[11px]"
            style={{ border: `2px dashed ${INK}`, fontWeight: 600, color: INK }}
          >
            + ADD MORE
          </div>
        </div>
      )}
    </label>
  );
}

function ProgressTile({
  progress,
  stageLabel,
  files,
  stage,
  isDone,
}: {
  progress: number;
  stageLabel: string;
  files: ReturnType<typeof usePhoton>["files"];
  stage: ReturnType<typeof usePhoton>["stage"];
  isDone: boolean;
}) {
  return (
    <div
      style={{
        background: isDone ? POP : INK,
        color: isDone ? INK : PAPER,
        border: `3px solid ${INK}`,
        boxShadow: `8px 8px 0 ${INK}`,
        padding: "24px",
      }}
    >
      <div
        className="text-[10px] uppercase"
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: "0.22em",
          color: isDone ? INK : POP,
          fontWeight: 700,
        }}
      >
        {stageLabel}
      </div>
      <div
        className="mt-2 leading-none tracking-[-0.05em]"
        style={{
          fontFamily: "'Inter Tight', sans-serif",
          fontWeight: 800,
          fontSize: "clamp(80px, 14vw, 140px)",
        }}
      >
        {Math.round(progress * 100)}
        <span style={{ fontSize: "0.4em", verticalAlign: "top", marginLeft: "0.05em" }}>%</span>
      </div>
      <div className="mt-3 grid grid-cols-7 gap-1">
        {STAGE_ORDER.map((s, i) => {
          const idx = STAGE_ORDER.indexOf(stage);
          const active = i <= idx;
          return (
            <div
              key={s}
              className="h-[4px]"
              style={{
                background: active
                  ? isDone
                    ? INK
                    : POP
                  : isDone
                  ? "oklch(15% 0.02 60 / 0.2)"
                  : "oklch(95% 0.02 95 / 0.2)",
              }}
            />
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {files.map((f) => (
          <img
            key={f.id}
            src={f.previewURL}
            alt={f.file.name}
            className="h-9 w-9 object-cover"
            style={{ border: `1.5px solid ${isDone ? INK : POP}` }}
          />
        ))}
      </div>
    </div>
  );
}

function Results({ results }: { results: import("./photon").PhotonResult[] }) {
  return (
    <div className="mt-12">
      <div className="flex items-baseline justify-between">
        <Eyebrow>OUTPUTS · {results.length}</Eyebrow>
        <button
          type="button"
          className="text-[13px]"
          style={{
            fontWeight: 700,
            background: INK,
            color: POP,
            padding: "8px 14px",
          }}
        >
          DOWNLOAD .ZIP ↓
        </button>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {results.map((r, i) => (
          <div
            key={i}
            className="p-3"
            style={{ border: `2px solid ${INK}`, background: PAPER }}
          >
            <div
              style={{
                aspectRatio: r.ratio,
                background: INK,
                color: POP,
                position: "relative",
              }}
            >
              <span
                className="absolute left-1 top-1 text-[9px] uppercase"
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  letterSpacing: "0.18em",
                  color: POP,
                  padding: "1px 4px",
                  fontWeight: 700,
                }}
              >
                {r.size.replace(" ", "")}
              </span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span style={{ fontWeight: 700 }}>{r.label}</span>
              <span style={{ fontSize: "10px", color: MUTE, fontWeight: 600 }}>
                {r.format} · {formatBytes(r.bytes)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
