import { useCallback, useState } from "react";
import { FORMATS, STAGE_COPY, STAGE_ORDER, VARIANTS, formatBytes, usePhoton } from "./photon";

const BG = "oklch(18% 0.012 60)";
const SURF = "oklch(22% 0.014 60)";
const TEXT = "oklch(94% 0.018 80)";
const MUTE = "oklch(70% 0.014 70)";
const FAINT = "oklch(50% 0.012 60)";
const ACCENT = "oklch(75% 0.16 50)";

export function Console({ footer }: { footer: React.ReactNode }) {
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
      ? "Ready"
      : p.stage === "done"
      ? STAGE_COPY.done
      : STAGE_COPY[p.stage as keyof typeof STAGE_COPY];

  return (
    <div
      className="relative min-h-screen w-full overflow-hidden"
      style={{
        background: BG,
        color: TEXT,
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      {/* progress beam — single restrained system visual */}
      <div
        aria-hidden
        className="absolute left-0 right-0 top-0 z-10 h-[2px]"
        style={{ background: "oklch(94% 0.018 80 / 0.08)" }}
      >
        <div
          style={{
            height: "100%",
            width: `${p.progress * 100}%`,
            background:
              "linear-gradient(90deg, transparent, oklch(75% 0.16 50) 30%, oklch(82% 0.18 60) 70%, transparent)",
            transition: "width 80ms linear",
            boxShadow: p.isRunning ? "0 0 12px oklch(75% 0.16 50 / 0.6)" : "none",
          }}
        />
      </div>

      <div className="mx-auto w-full max-w-[920px] px-6 pb-16 pt-12">
        {/* mast */}
        <header className="flex items-baseline justify-between">
          <div className="flex items-center gap-3">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <circle cx="11" cy="11" r="10" stroke={TEXT} strokeOpacity="0.6" strokeWidth="1" />
              <circle cx="11" cy="11" r="3" fill={ACCENT} />
            </svg>
            <span className="text-[14px]" style={{ fontWeight: 500 }}>
              Photon
            </span>
          </div>
          <span
            className="text-[11px] uppercase"
            style={{
              fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace",
              letterSpacing: "0.18em",
              color: FAINT,
            }}
          >
            v0.4 · Issue 12
          </span>
        </header>

        {/* hero */}
        <div className="mt-16 max-w-[620px]">
          <div
            className="text-[11px] uppercase"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: "0.22em",
              color: ACCENT,
            }}
          >
            № 012 · Image pipeline
          </div>
          <h1
            className="mt-5 text-[64px] leading-[0.95] tracking-[-0.02em]"
            style={{ fontFamily: "'Fraunces', serif", fontWeight: 300 }}
          >
            One image,
            <br />
            <em style={{ fontStyle: "italic", color: ACCENT, fontWeight: 300 }}>
              every dimension
            </em>{" "}
            you need.
          </h1>
          <p
            className="mt-5 max-w-[52ch] text-[15px] leading-relaxed"
            style={{ color: MUTE }}
          >
            Drop a source. Choose a format. Pick the crops your product surfaces
            need. Photon fans them out in parallel and hands you back a tidy bundle.
          </p>
        </div>

        {/* main grid */}
        <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_1fr]">
          {/* left: dropzone */}
          <div>
            <RowLabel>Source</RowLabel>
            <Drop
              files={p.files}
              drag={drag}
              setDrag={setDrag}
              onDrop={onDrop}
              setFiles={p.setFiles}
              removeFile={p.removeFile}
              running={p.isRunning}
            />

            <RowLabel className="mt-7">Format</RowLabel>
            <div
              className="mt-3 flex overflow-hidden rounded-md"
              style={{ background: SURF, border: `1px solid ${TEXT.replace(")", " / 0.08)")}` }}
            >
              {FORMATS.map((f, i) => {
                const active = p.format === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    disabled={p.isRunning}
                    onClick={() => p.setFormat(f.id)}
                    className="flex-1 px-3 py-3 text-left transition-colors"
                    style={{
                      borderLeft: i === 0 ? "none" : `1px solid ${TEXT.replace(")", " / 0.06)")}`,
                      background: active ? "oklch(28% 0.014 60)" : "transparent",
                      color: active ? TEXT : MUTE,
                    }}
                  >
                    <div
                      className="text-[10px] uppercase"
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        letterSpacing: "0.22em",
                        color: active ? ACCENT : FAINT,
                      }}
                    >
                      {f.label}
                    </div>
                    <div className="mt-1 text-[12px]">{f.note}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* right: variants + run */}
          <div>
            <RowLabel>Variants</RowLabel>
            <div className="mt-3 flex flex-col gap-1.5">
              {VARIANTS.map((v) => {
                const active = p.variants.has(v.id);
                return (
                  <button
                    key={v.id}
                    type="button"
                    disabled={p.isRunning}
                    onClick={() => p.toggleVariant(v.id)}
                    className="flex items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors"
                    style={{
                      background: active ? "oklch(28% 0.014 60)" : SURF,
                      border: `1px solid ${active ? "oklch(75% 0.16 50 / 0.5)" : "oklch(94% 0.018 80 / 0.06)"}`,
                    }}
                  >
                    <span
                      className="grid h-4 w-4 shrink-0 place-items-center rounded-sm"
                      style={{
                        border: `1px solid ${active ? ACCENT : "oklch(94% 0.018 80 / 0.25)"}`,
                        background: active ? ACCENT : "transparent",
                      }}
                    >
                      {active && (
                        <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                          <path d="M1 4.5L3.5 7L8 1.5" stroke={BG} strokeWidth="1.6" />
                        </svg>
                      )}
                    </span>
                    <div className="flex-1">
                      <div className="text-[13px]" style={{ fontWeight: 500, color: TEXT }}>
                        {v.label}
                      </div>
                      <div
                        className="mt-0.5 text-[10px] uppercase"
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          letterSpacing: "0.18em",
                          color: FAINT,
                        }}
                      >
                        {v.size} · {v.ratio}
                      </div>
                    </div>
                    <span className="text-[11px]" style={{ color: MUTE }}>
                      {v.hint}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* run + status */}
            <div className="mt-6 rounded-md p-4" style={{ background: SURF, border: "1px solid oklch(94% 0.018 80 / 0.06)" }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-1.5 w-1.5 rounded-full"
                    style={{
                      background: p.isDone ? "oklch(78% 0.16 155)" : ACCENT,
                      boxShadow: `0 0 8px ${p.isDone ? "oklch(78% 0.16 155 / 0.6)" : "oklch(75% 0.16 50 / 0.6)"}`,
                      animation: p.isRunning ? "consolePulse 1.4s ease-in-out infinite" : "none",
                    }}
                  />
                  <span
                    className="text-[11px] uppercase"
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      letterSpacing: "0.22em",
                      color: TEXT,
                    }}
                  >
                    {stageLabel}
                  </span>
                </div>
                <span
                  className="text-[11px]"
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    letterSpacing: "0.18em",
                    color: FAINT,
                  }}
                >
                  {Math.round(p.progress * 100).toString().padStart(2, "0")}%
                </span>
              </div>

              {/* segmented progress */}
              <div className="mt-3 grid grid-cols-7 gap-1">
                {STAGE_ORDER.map((s, i) => {
                  const idx = STAGE_ORDER.indexOf(p.stage);
                  const active = i <= idx && p.stage !== "idle";
                  return (
                    <div
                      key={s}
                      className="h-[3px] rounded-full"
                      style={{
                        background: active
                          ? i === idx && !p.isDone
                            ? ACCENT
                            : TEXT
                          : "oklch(94% 0.018 80 / 0.1)",
                        transition: "background 200ms",
                      }}
                    />
                  );
                })}
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <span className="text-[11px]" style={{ color: MUTE }}>
                  {p.files.length} {p.files.length === 1 ? "file" : "files"} · {p.variants.size} variants · {p.format}
                </span>
                {p.isDone ? (
                  <button
                    type="button"
                    onClick={p.reset}
                    className="rounded-md px-4 py-2 text-[12px] transition-colors"
                    style={{
                      border: "1px solid oklch(94% 0.018 80 / 0.15)",
                      color: TEXT,
                      background: "transparent",
                    }}
                  >
                    Run another
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={!canRun}
                    onClick={p.run}
                    className="rounded-md px-5 py-2 text-[12px] transition-all disabled:cursor-not-allowed disabled:opacity-30"
                    style={{
                      background: ACCENT,
                      color: BG,
                      fontWeight: 600,
                      boxShadow: canRun ? `0 0 24px oklch(75% 0.16 50 / 0.4)` : "none",
                    }}
                  >
                    {p.isRunning ? "Running…" : "Run pipeline"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* results */}
        {p.isDone && <Results results={p.results} />}

        {footer}

        <style>{`@keyframes consolePulse { 0%,100%{ opacity:0.4 } 50%{ opacity:1 } }`}</style>
      </div>
    </div>
  );
}

function RowLabel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`text-[10px] uppercase ${className}`}
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        letterSpacing: "0.22em",
        color: FAINT,
      }}
    >
      {children}
    </div>
  );
}

function Drop({
  files,
  drag,
  setDrag,
  onDrop,
  setFiles,
  removeFile,
  running,
}: {
  files: ReturnType<typeof usePhoton>["files"];
  drag: boolean;
  setDrag: (b: boolean) => void;
  onDrop: (e: React.DragEvent) => void;
  setFiles: (f: File[]) => void;
  removeFile: (id: string) => void;
  running: boolean;
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
      className="mt-3 block cursor-pointer rounded-md transition-all"
      style={{
        border: `1px ${drag ? "solid" : "dashed"} ${drag ? ACCENT : "oklch(94% 0.018 80 / 0.18)"}`,
        background: drag ? "oklch(75% 0.16 50 / 0.05)" : SURF,
        padding: empty ? "36px 20px" : "16px",
        minHeight: empty ? "200px" : "auto",
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
        disabled={running}
      />
      {empty ? (
        <div className="grid h-full place-items-center text-center">
          <div>
            <div
              className="text-[24px]"
              style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontWeight: 300, color: TEXT }}
            >
              Drop your image
            </div>
            <div
              className="mt-2 text-[11px] uppercase"
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: "0.22em",
                color: FAINT,
              }}
            >
              or click to browse · max 50&nbsp;MB
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {files.map((f) => (
            <div key={f.id} className="group relative">
              <img
                src={f.previewURL}
                alt={f.file.name}
                className="h-24 w-24 rounded-md object-cover"
                style={{ border: "1px solid oklch(94% 0.018 80 / 0.08)" }}
              />
              <div
                className="absolute bottom-1 left-1 max-w-[80px] truncate px-1.5 py-0.5 text-[9px] uppercase"
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  letterSpacing: "0.16em",
                  background: "oklch(0% 0 0 / 0.6)",
                  color: "oklch(94% 0.018 80)",
                  borderRadius: "2px",
                }}
              >
                {formatBytes(f.bytes)}
              </div>
              {!running && (
                <button
                  type="button"
                  aria-label={`remove ${f.file.name}`}
                  onClick={(e) => {
                    e.preventDefault();
                    removeFile(f.id);
                  }}
                  className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full opacity-0 transition-opacity group-hover:opacity-100"
                  style={{ background: ACCENT, color: BG, fontSize: "11px" }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
          <div
            className="grid h-24 w-24 place-items-center rounded-md text-[10px] uppercase"
            style={{
              border: "1px dashed oklch(94% 0.018 80 / 0.18)",
              fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: "0.18em",
              color: FAINT,
            }}
          >
            + add
          </div>
        </div>
      )}
    </label>
  );
}

function Results({ results }: { results: import("./photon").PhotonResult[] }) {
  return (
    <div className="mt-12">
      <div className="flex items-baseline justify-between">
        <RowLabel>Outputs</RowLabel>
        <button
          type="button"
          className="text-[12px] underline-offset-4 hover:underline"
          style={{ color: ACCENT }}
        >
          Download all .zip ↓
        </button>
      </div>
      <div
        className="mt-3 grid grid-cols-1 gap-px overflow-hidden rounded-md"
        style={{ background: "oklch(94% 0.018 80 / 0.06)" }}
      >
        {results.map((r, i) => (
          <div
            key={i}
            className="flex items-center justify-between px-4 py-3"
            style={{ background: SURF }}
          >
            <div className="flex items-center gap-3">
              <span
                className="px-2 py-1 text-[10px] uppercase"
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  letterSpacing: "0.18em",
                  background: "oklch(28% 0.014 60)",
                  color: ACCENT,
                  borderRadius: "3px",
                }}
              >
                {r.format}
              </span>
              <span style={{ fontWeight: 500 }}>{r.label}</span>
              <span className="text-[11px]" style={{ color: FAINT }}>
                {r.size}
              </span>
            </div>
            <span className="text-[11px]" style={{ color: MUTE, fontFamily: "'JetBrains Mono', monospace" }}>
              {formatBytes(r.bytes)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
