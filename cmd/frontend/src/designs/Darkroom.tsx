import { useCallback, useState } from "react";
import { FORMATS, STAGE_COPY, VARIANTS, formatBytes, usePhoton } from "./photon";

export function Darkroom({ footer }: { footer: React.ReactNode }) {
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
      ? "Awaiting exposure"
      : p.stage === "done"
      ? STAGE_COPY.done
      : STAGE_COPY[p.stage as keyof typeof STAGE_COPY];

  return (
    <div
      className="min-h-screen w-full"
      style={{
        background: "oklch(94% 0.012 80)",
        color: "oklch(16% 0.018 50)",
        fontFamily: "Inter, system-ui, sans-serif",
        backgroundImage:
          "radial-gradient(circle at 10% -20%, oklch(86% 0.02 80) 0%, transparent 50%)",
      }}
    >
      <div className="mx-auto w-full max-w-[820px] px-6 pb-16 pt-10">
        {/* mast */}
        <header className="flex items-baseline justify-between border-b pb-4" style={{ borderColor: "oklch(16% 0.018 50 / 0.18)" }}>
          <div className="flex items-baseline gap-3">
            <span
              className="text-[28px] leading-none"
              style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontStyle: "italic" }}
            >
              Photon
            </span>
            <span
              className="text-[10px] uppercase"
              style={{ fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.22em", color: "oklch(40% 0.018 50)" }}
            >
              · darkroom
            </span>
          </div>
          <div
            className="text-[10px] uppercase"
            style={{ fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.22em", color: "oklch(40% 0.018 50)" }}
          >
            roll №041 · {new Date().toLocaleDateString(undefined, { month: "short", day: "2-digit" })}
          </div>
        </header>

        {/* hero */}
        <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-[1fr_auto] sm:items-end">
          <h1
            className="text-[56px] leading-[0.95]"
            style={{
              fontFamily: "'Fraunces', serif",
              fontWeight: 400,
            }}
          >
            Develop the
            <br />
            <em style={{ fontWeight: 300, fontStyle: "italic", color: "oklch(38% 0.04 30)" }}>
              full contact sheet
            </em>
            <span style={{ color: "oklch(58% 0.21 28)" }}>.</span>
          </h1>
          <div className="text-right">
            <div
              className="text-[10px] uppercase"
              style={{ fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.22em", color: "oklch(40% 0.018 50)" }}
            >
              Exposure
            </div>
            <div
              className="text-[36px] leading-none"
              style={{ fontFamily: "'Fraunces', serif", fontWeight: 500 }}
            >
              {p.files.length}
              <span className="text-[14px]" style={{ color: "oklch(40% 0.018 50)" }}>/12</span>
            </div>
          </div>
        </div>

        {/* film strip dropzone */}
        <div className="mt-10">
          <FilmStrip
            files={p.files}
            drag={drag}
            setDrag={setDrag}
            onDrop={onDrop}
            setFiles={p.setFiles}
            removeFile={p.removeFile}
            running={p.isRunning || p.isDone}
          />
        </div>

        {/* controls row */}
        <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-[1fr_1fr]">
          {/* format dial */}
          <div>
            <SectionLabel>I — Emulsion</SectionLabel>
            <div className="mt-3 flex flex-wrap gap-2">
              {FORMATS.map((f) => {
                const active = p.format === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    disabled={p.isRunning}
                    onClick={() => p.setFormat(f.id)}
                    className="text-left transition-colors"
                    style={{
                      padding: "10px 14px",
                      border: `1px solid ${active ? "oklch(16% 0.018 50)" : "oklch(16% 0.018 50 / 0.2)"}`,
                      background: active ? "oklch(16% 0.018 50)" : "transparent",
                      color: active ? "oklch(94% 0.012 80)" : "oklch(28% 0.018 50)",
                      borderRadius: "1px",
                    }}
                  >
                    <div
                      className="text-[10px] uppercase"
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        letterSpacing: "0.22em",
                        color: active ? "oklch(72% 0.012 80)" : "oklch(50% 0.018 50)",
                      }}
                    >
                      {f.id}
                    </div>
                    <div
                      className="text-[14px]"
                      style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontWeight: 400 }}
                    >
                      {f.note}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* variants — crop frames */}
          <div>
            <SectionLabel>II — Crops</SectionLabel>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {VARIANTS.map((v) => {
                const active = p.variants.has(v.id);
                return (
                  <button
                    key={v.id}
                    type="button"
                    disabled={p.isRunning}
                    onClick={() => p.toggleVariant(v.id)}
                    className="relative flex flex-col items-center gap-1 p-2 transition-all"
                    style={{
                      border: `1px solid ${active ? "oklch(16% 0.018 50)" : "oklch(16% 0.018 50 / 0.2)"}`,
                      background: active ? "oklch(94% 0.012 80)" : "transparent",
                      borderRadius: "1px",
                    }}
                  >
                    <div
                      style={{
                        aspectRatio: v.ratio,
                        width: "100%",
                        maxHeight: "44px",
                        background: active ? "oklch(16% 0.018 50)" : "oklch(16% 0.018 50 / 0.1)",
                        position: "relative",
                      }}
                    >
                      {/* corner ticks */}
                      {[
                        { top: 0, left: 0 },
                        { top: 0, right: 0 },
                        { bottom: 0, left: 0 },
                        { bottom: 0, right: 0 },
                      ].map((c, i) => (
                        <span
                          key={i}
                          aria-hidden
                          style={{
                            position: "absolute",
                            ...c,
                            width: "5px",
                            height: "5px",
                            borderTop: c.top === 0 ? `1px solid ${active ? "oklch(58% 0.21 28)" : "oklch(40% 0.018 50)"}` : "none",
                            borderBottom: c.bottom === 0 ? `1px solid ${active ? "oklch(58% 0.21 28)" : "oklch(40% 0.018 50)"}` : "none",
                            borderLeft: c.left === 0 ? `1px solid ${active ? "oklch(58% 0.21 28)" : "oklch(40% 0.018 50)"}` : "none",
                            borderRight: c.right === 0 ? `1px solid ${active ? "oklch(58% 0.21 28)" : "oklch(40% 0.018 50)"}` : "none",
                          }}
                        />
                      ))}
                    </div>
                    <div className="mt-1 text-center">
                      <div className="text-[12px]" style={{ fontFamily: "'Fraunces', serif" }}>
                        {v.label}
                      </div>
                      <div
                        className="text-[9px] uppercase"
                        style={{ fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.16em", color: "oklch(48% 0.018 50)" }}
                      >
                        {v.size.replace(" ", "")}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* expose / progress */}
        <div className="mt-10 grid grid-cols-1 gap-6 border-t pt-8 sm:grid-cols-[auto_1fr_auto] sm:items-center" style={{ borderColor: "oklch(16% 0.018 50 / 0.18)" }}>
          <ExposureDial
            progress={p.progress}
            running={p.isRunning}
            done={p.isDone}
          />
          <div>
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{
                  background: p.isDone ? "oklch(58% 0.14 155)" : "oklch(58% 0.21 28)",
                  animation: p.isRunning ? "darkPulse 1.4s ease-in-out infinite" : "none",
                }}
              />
              <span
                className="text-[11px] uppercase"
                style={{ fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.22em", color: "oklch(28% 0.018 50)" }}
              >
                {stageLabel}
              </span>
            </div>
            <div
              className="mt-2 text-[24px] leading-tight"
              style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontWeight: 400 }}
            >
              {p.stage === "idle"
                ? "Set your crops, then expose."
                : p.isDone
                ? "Sheet developed. Hang to dry."
                : `Working through ${p.variants.size} crops at ${p.format.toUpperCase()}.`}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {p.isDone ? (
              <button
                type="button"
                onClick={p.reset}
                className="px-5 py-3 text-[12px] uppercase transition-colors"
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  letterSpacing: "0.22em",
                  border: "1px solid oklch(16% 0.018 50 / 0.3)",
                  color: "oklch(28% 0.018 50)",
                }}
              >
                New roll
              </button>
            ) : (
              <button
                type="button"
                disabled={!canRun}
                onClick={p.run}
                className="group relative inline-flex items-center gap-3 px-6 py-3 text-[12px] uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  letterSpacing: "0.22em",
                  background: "oklch(16% 0.018 50)",
                  color: "oklch(94% 0.012 80)",
                }}
                onMouseEnter={(e) => {
                  if (canRun) e.currentTarget.style.background = "oklch(58% 0.21 28)";
                }}
                onMouseLeave={(e) => {
                  if (canRun) e.currentTarget.style.background = "oklch(16% 0.018 50)";
                }}
              >
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: "oklch(58% 0.21 28)" }} />
                {p.isRunning ? "Exposing…" : "Expose"}
              </button>
            )}
          </div>
        </div>

        {/* contact sheet */}
        {p.isDone && <ContactSheet results={p.results} />}

        {footer}

        <style>{`@keyframes darkPulse { 0%,100%{ opacity:0.4 } 50%{ opacity:1 } }`}</style>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-[10px] uppercase"
      style={{ fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.22em", color: "oklch(40% 0.018 50)" }}
    >
      {children}
    </div>
  );
}

function FilmStrip({
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
      className="block cursor-pointer"
      style={{
        background: "oklch(16% 0.018 50)",
        padding: "10px 14px",
        border: drag ? "2px solid oklch(58% 0.21 28)" : "2px solid transparent",
        transition: "border-color 200ms",
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
      {/* sprocket holes */}
      <div className="flex items-center justify-between">
        <Sprockets />
        <span
          className="text-[10px] uppercase"
          style={{ fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.22em", color: "oklch(72% 0.018 80)" }}
        >
          Photon · 35 · 400
        </span>
        <Sprockets />
      </div>

      <div
        className="my-2 flex items-stretch gap-2 overflow-hidden"
        style={{ minHeight: "140px" }}
      >
        {empty ? (
          <div className="grid w-full place-items-center text-center" style={{ color: "oklch(82% 0.012 80)" }}>
            <div>
              <div
                className="text-[20px]"
                style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontWeight: 300 }}
              >
                Drop a frame on the strip
              </div>
              <div
                className="mt-2 text-[10px] uppercase"
                style={{ fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.22em", color: "oklch(70% 0.012 80)" }}
              >
                or click to load · jpg, png, heic, webp
              </div>
            </div>
          </div>
        ) : (
          files.map((f, i) => (
            <div
              key={f.id}
              className="group relative shrink-0"
              style={{ width: "140px", height: "140px" }}
            >
              <img
                src={f.previewURL}
                alt={f.file.name}
                className="h-full w-full object-cover"
                style={{
                  filter: running ? "none" : "grayscale(0%)",
                }}
              />
              <div
                className="absolute bottom-1 left-1 px-1.5 py-0.5 text-[9px] uppercase"
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  letterSpacing: "0.18em",
                  background: "oklch(16% 0.018 50 / 0.85)",
                  color: "oklch(72% 0.012 80)",
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </div>
              {!running && (
                <button
                  type="button"
                  aria-label={`remove ${f.file.name}`}
                  onClick={(e) => {
                    e.preventDefault();
                    removeFile(f.id);
                  }}
                  className="absolute right-1 top-1 grid h-5 w-5 place-items-center opacity-0 transition-opacity group-hover:opacity-100"
                  style={{ background: "oklch(58% 0.21 28)", color: "oklch(94% 0.012 80)", fontSize: "11px" }}
                >
                  ×
                </button>
              )}
            </div>
          ))
        )}
      </div>
      <div className="flex items-center justify-between">
        <Sprockets />
        <span
          className="text-[10px] uppercase"
          style={{ fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.22em", color: "oklch(72% 0.018 80)" }}
        >
          {empty ? "load · click or drop" : `${files.length} frames`}
        </span>
        <Sprockets />
      </div>
    </label>
  );
}

function Sprockets() {
  return (
    <div className="flex gap-1">
      {Array.from({ length: 8 }).map((_, i) => (
        <span
          key={i}
          className="block h-2 w-3"
          style={{ background: "oklch(94% 0.012 80)", borderRadius: "1px" }}
        />
      ))}
    </div>
  );
}

function ExposureDial({ progress, running, done }: { progress: number; running: boolean; done: boolean }) {
  const r = 38;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid h-[100px] w-[100px] place-items-center">
      <svg width="100" height="100" viewBox="0 0 100 100" className="-rotate-90">
        <circle cx="50" cy="50" r={r} stroke="oklch(16% 0.018 50 / 0.15)" strokeWidth="2" fill="none" />
        <circle
          cx="50"
          cy="50"
          r={r}
          stroke={done ? "oklch(58% 0.14 155)" : "oklch(58% 0.21 28)"}
          strokeWidth="2"
          strokeLinecap="square"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - progress)}
          style={{ transition: "stroke-dashoffset 80ms linear" }}
        />
        {/* tick marks */}
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i * 360) / 12;
          const rad = (angle * Math.PI) / 180;
          const x1 = 50 + Math.cos(rad) * (r + 4);
          const y1 = 50 + Math.sin(rad) * (r + 4);
          const x2 = 50 + Math.cos(rad) * (r + 7);
          const y2 = 50 + Math.sin(rad) * (r + 7);
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="oklch(16% 0.018 50 / 0.4)"
              strokeWidth="1"
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div
            className="text-[20px] leading-none"
            style={{ fontFamily: "'Fraunces', serif", fontWeight: 500 }}
          >
            {Math.round(progress * 100)}
          </div>
          <div
            className="mt-0.5 text-[8px] uppercase"
            style={{ fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.22em", color: "oklch(40% 0.018 50)" }}
          >
            {running ? "exp" : done ? "fix" : "set"}
          </div>
        </div>
      </div>
    </div>
  );
}

function ContactSheet({ results }: { results: import("./photon").PhotonResult[] }) {
  return (
    <div className="mt-12">
      <SectionLabel>Contact sheet</SectionLabel>
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {results.map((r, i) => (
          <div
            key={i}
            className="p-3"
            style={{ background: "oklch(96% 0.012 80)", border: "1px solid oklch(16% 0.018 50 / 0.18)" }}
          >
            <div
              style={{
                aspectRatio: r.ratio,
                background: "oklch(16% 0.018 50)",
                position: "relative",
              }}
            >
              <span
                className="absolute bottom-1 right-1 px-1.5 py-0.5 text-[9px] uppercase"
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  letterSpacing: "0.18em",
                  background: "oklch(94% 0.012 80)",
                  color: "oklch(28% 0.018 50)",
                }}
              >
                {r.format}
              </span>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic" }}>{r.label}</span>
              <span
                className="text-[10px] uppercase"
                style={{ fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.18em", color: "oklch(48% 0.018 50)" }}
              >
                {formatBytes(r.bytes)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
