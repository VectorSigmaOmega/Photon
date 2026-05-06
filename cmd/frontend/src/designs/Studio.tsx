import { useCallback, useState } from "react";
import { FORMATS, STAGE_COPY, STAGE_ORDER, VARIANTS, formatBytes, usePhoton } from "./photon";

export function Studio({ footer }: { footer: React.ReactNode }) {
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

  return (
    <div
      className="min-h-screen w-full"
      style={{
        background: "oklch(96.5% 0.012 75)",
        color: "oklch(18% 0.02 60)",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <div className="mx-auto w-full max-w-[680px] px-6 pb-16 pt-12 sm:pt-16">
        {/* masthead */}
        <header className="flex items-baseline justify-between">
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: "oklch(58% 0.21 28)" }}
            />
            <span
              className="text-[10px] uppercase"
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                letterSpacing: "0.22em",
                color: "oklch(48% 0.018 65)",
              }}
            >
              Photon
            </span>
          </div>
          <span
            className="text-[10px] uppercase"
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              letterSpacing: "0.22em",
              color: "oklch(60% 0.018 65)",
            }}
          >
            image pipeline
          </span>
        </header>

        <h1
          className="mt-12 text-[44px] leading-[0.95] tracking-[-0.03em]"
          style={{ fontFamily: "'Inter Tight', sans-serif", fontWeight: 600 }}
        >
          One source.
          <br />
          <span style={{ color: "oklch(48% 0.018 65)" }}>Every variant you ship.</span>
        </h1>
        <p
          className="mt-4 max-w-[44ch] text-[15px] leading-relaxed"
          style={{ color: "oklch(38% 0.018 65)" }}
        >
          Drop an image, choose a format, pick the sizes you ship to. Photon
          fans out the variants in parallel and hands you a tidy bundle.
        </p>

        {/* dropzone */}
        <div className="mt-10">
          {!p.isRunning && !p.isDone ? (
            <Dropzone
              files={p.files}
              drag={drag}
              setDrag={setDrag}
              onDrop={onDrop}
              setFiles={p.setFiles}
              removeFile={p.removeFile}
            />
          ) : (
            <ProgressPanel
              stage={p.stage}
              progress={p.progress}
              stageLabel={stageLabel}
              files={p.files}
              isDone={p.isDone}
            />
          )}
        </div>

        {/* format */}
        <div className="mt-8">
          <FieldLabel n="01">Format</FieldLabel>
          <div className="mt-3 flex w-full overflow-hidden rounded-sm border" style={{ borderColor: "oklch(18% 0.02 60 / 0.18)" }}>
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
                    borderLeft: i === 0 ? "none" : "1px solid oklch(18% 0.02 60 / 0.12)",
                    background: active ? "oklch(18% 0.02 60)" : "transparent",
                    color: active ? "oklch(96% 0.012 75)" : "oklch(28% 0.02 60)",
                  }}
                >
                  <div
                    className="text-[10px] uppercase"
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      letterSpacing: "0.22em",
                      color: active ? "oklch(80% 0.018 65)" : "oklch(56% 0.018 65)",
                    }}
                  >
                    {f.label}
                  </div>
                  <div className="mt-1 text-[11px]" style={{ color: active ? "oklch(80% 0.018 65)" : "oklch(48% 0.018 65)" }}>
                    {f.note}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* variants */}
        <div className="mt-8">
          <FieldLabel n="02">Variants</FieldLabel>
          <div className="mt-3 grid grid-cols-1 gap-px overflow-hidden rounded-sm" style={{ background: "oklch(18% 0.02 60 / 0.12)" }}>
            {VARIANTS.map((v) => {
              const active = p.variants.has(v.id);
              return (
                <button
                  key={v.id}
                  type="button"
                  disabled={p.isRunning}
                  onClick={() => p.toggleVariant(v.id)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors"
                  style={{
                    background: "oklch(96.5% 0.012 75)",
                    color: active ? "oklch(18% 0.02 60)" : "oklch(48% 0.018 65)",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="grid h-4 w-4 place-items-center rounded-sm border transition-colors"
                      style={{
                        borderColor: active ? "oklch(18% 0.02 60)" : "oklch(18% 0.02 60 / 0.3)",
                        background: active ? "oklch(18% 0.02 60)" : "transparent",
                      }}
                    >
                      {active && (
                        <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                          <path d="M1 4.5L3.5 7L8 1.5" stroke="oklch(96% 0.012 75)" strokeWidth="1.5" />
                        </svg>
                      )}
                    </span>
                    <span className="text-[14px] font-medium">{v.label}</span>
                    <span
                      className="text-[10px] uppercase"
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        letterSpacing: "0.18em",
                        color: "oklch(60% 0.018 65)",
                      }}
                    >
                      {v.size}
                    </span>
                  </div>
                  <span
                    className="text-[11px]"
                    style={{ color: "oklch(56% 0.018 65)" }}
                  >
                    {v.hint}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* run */}
        <div className="mt-8 flex items-center justify-between">
          <span
            className="text-[10px] uppercase"
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              letterSpacing: "0.22em",
              color: "oklch(48% 0.018 65)",
            }}
          >
            {p.files.length} {p.files.length === 1 ? "file" : "files"} · {p.variants.size} variants · {p.format}
          </span>
          {p.isDone ? (
            <button
              type="button"
              onClick={p.reset}
              className="rounded-sm px-5 py-3 text-[13px] transition-colors"
              style={{
                background: "transparent",
                color: "oklch(28% 0.02 60)",
                border: "1px solid oklch(18% 0.02 60 / 0.3)",
              }}
            >
              Run another
            </button>
          ) : (
            <button
              type="button"
              disabled={!canRun}
              onClick={p.run}
              className="rounded-sm px-6 py-3 text-[13px] transition-colors disabled:cursor-not-allowed"
              style={{
                background: canRun ? "oklch(18% 0.02 60)" : "oklch(18% 0.02 60 / 0.25)",
                color: "oklch(96% 0.012 75)",
                fontFamily: "'IBM Plex Mono', monospace",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
              }}
              onMouseEnter={(e) => {
                if (canRun) e.currentTarget.style.background = "oklch(58% 0.21 28)";
              }}
              onMouseLeave={(e) => {
                if (canRun) e.currentTarget.style.background = "oklch(18% 0.02 60)";
              }}
            >
              {p.isRunning ? "Running…" : "Run pipeline"}
            </button>
          )}
        </div>

        {/* results */}
        {p.isDone && (
          <ResultsList results={p.results} />
        )}

        {footer}
      </div>
    </div>
  );
}

function FieldLabel({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-3">
      <span
        className="text-[10px] uppercase"
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          letterSpacing: "0.22em",
          color: "oklch(58% 0.21 28)",
        }}
      >
        {n}
      </span>
      <span className="text-[15px] font-medium tracking-tight">{children}</span>
      <span className="ml-2 h-px flex-1" style={{ background: "oklch(18% 0.02 60 / 0.15)" }} />
    </div>
  );
}

function Dropzone({
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
      className="block cursor-pointer transition-colors"
      style={{
        border: `1px dashed ${drag ? "oklch(58% 0.21 28)" : "oklch(18% 0.02 60 / 0.35)"}`,
        background: drag ? "oklch(96% 0.04 30 / 0.4)" : "oklch(94% 0.018 70 / 0.45)",
        padding: "32px",
        borderRadius: "2px",
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
        <div className="grid place-items-center gap-3 py-8 text-center">
          <UploadGlyph />
          <div className="text-[15px] font-medium">Drop an image here</div>
          <div className="text-[12px]" style={{ color: "oklch(48% 0.018 65)" }}>
            or click to browse · JPG, PNG, HEIC, WebP up to 50&nbsp;MB
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          {files.map((f) => (
            <div key={f.id} className="group relative">
              <img
                src={f.previewURL}
                alt={f.file.name}
                className="h-20 w-20 object-cover"
                style={{ borderRadius: "2px", border: "1px solid oklch(18% 0.02 60 / 0.2)" }}
              />
              <button
                type="button"
                aria-label={`remove ${f.file.name}`}
                onClick={(e) => {
                  e.preventDefault();
                  removeFile(f.id);
                }}
                className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full opacity-0 transition-opacity group-hover:opacity-100"
                style={{ background: "oklch(18% 0.02 60)", color: "oklch(96% 0.012 75)", fontSize: "11px" }}
              >
                ×
              </button>
            </div>
          ))}
          <div
            className="grid h-20 w-20 place-items-center text-[11px]"
            style={{
              border: "1px dashed oklch(18% 0.02 60 / 0.3)",
              color: "oklch(48% 0.018 65)",
              fontFamily: "'IBM Plex Mono', monospace",
              letterSpacing: "0.12em",
            }}
          >
            + add
          </div>
        </div>
      )}
    </label>
  );
}

function UploadGlyph() {
  return (
    <svg width="42" height="42" viewBox="0 0 42 42" fill="none">
      <rect x="6" y="6" width="30" height="30" rx="2" stroke="oklch(18% 0.02 60 / 0.4)" />
      <path d="M21 14v14M14 21l7-7 7 7" stroke="oklch(18% 0.02 60 / 0.55)" strokeLinecap="round" />
    </svg>
  );
}

function ProgressPanel({
  stage,
  progress,
  stageLabel,
  files,
  isDone,
}: {
  stage: ReturnType<typeof usePhoton>["stage"];
  progress: number;
  stageLabel: string;
  files: ReturnType<typeof usePhoton>["files"];
  isDone: boolean;
}) {
  const idx = STAGE_ORDER.indexOf(stage);
  return (
    <div
      style={{
        border: "1px solid oklch(18% 0.02 60 / 0.18)",
        borderRadius: "2px",
        padding: "28px",
        background: "oklch(94% 0.018 70 / 0.35)",
      }}
    >
      <div className="flex items-center gap-3">
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{
            background: isDone ? "oklch(58% 0.14 155)" : "oklch(58% 0.21 28)",
            animation: isDone ? "none" : "studioPulse 1.4s ease-in-out infinite",
          }}
        />
        <span
          className="text-[10px] uppercase"
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            letterSpacing: "0.22em",
            color: "oklch(28% 0.02 60)",
          }}
        >
          {stageLabel}
        </span>
        <span className="ml-auto text-[10px] uppercase" style={{
          fontFamily: "'IBM Plex Mono', monospace",
          letterSpacing: "0.22em",
          color: "oklch(48% 0.018 65)",
        }}>
          {Math.round(progress * 100)}%
        </span>
      </div>

      {/* progress rule */}
      <div className="mt-4 h-px w-full overflow-hidden" style={{ background: "oklch(18% 0.02 60 / 0.12)" }}>
        <div
          style={{
            height: "100%",
            width: `${progress * 100}%`,
            background: "oklch(18% 0.02 60)",
            transition: "width 80ms linear",
          }}
        />
      </div>

      {/* stage strip */}
      <div className="mt-4 grid grid-cols-7 gap-1">
        {STAGE_ORDER.map((s, i) => (
          <div
            key={s}
            className="h-[2px]"
            style={{
              background:
                i < idx
                  ? "oklch(18% 0.02 60)"
                  : i === idx
                  ? "oklch(58% 0.21 28)"
                  : "oklch(18% 0.02 60 / 0.15)",
            }}
          />
        ))}
      </div>

      {/* file thumbnails with status */}
      <div className="mt-5 flex flex-wrap gap-3">
        {files.map((f) => (
          <div key={f.id} className="flex items-center gap-3">
            <img
              src={f.previewURL}
              alt={f.file.name}
              className="h-12 w-12 object-cover"
              style={{ borderRadius: "2px" }}
            />
            <div className="text-[11px]">
              <div style={{ fontWeight: 500 }}>{f.file.name}</div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.12em", color: "oklch(56% 0.018 65)", textTransform: "uppercase", fontSize: "10px" }}>
                {formatBytes(f.bytes)}
              </div>
            </div>
          </div>
        ))}
      </div>

      <style>{`@keyframes studioPulse { 0%,100% { opacity: 0.4 } 50% { opacity: 1 } }`}</style>
    </div>
  );
}

function ResultsList({ results }: { results: import("./photon").PhotonResult[] }) {
  return (
    <div className="mt-10">
      <FieldLabel n="↓">Outputs</FieldLabel>
      <div className="mt-4 grid grid-cols-1 gap-px overflow-hidden rounded-sm" style={{ background: "oklch(18% 0.02 60 / 0.12)" }}>
        {results.map((r, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-4 px-4 py-3"
            style={{ background: "oklch(96.5% 0.012 75)" }}
          >
            <div className="flex items-center gap-3">
              <div
                className="grid h-8 w-8 place-items-center text-[10px] uppercase"
                style={{
                  background: "oklch(18% 0.02 60)",
                  color: "oklch(96% 0.012 75)",
                  fontFamily: "'IBM Plex Mono', monospace",
                  letterSpacing: "0.12em",
                  borderRadius: "2px",
                }}
              >
                {r.format}
              </div>
              <div className="text-[14px] font-medium">{r.label}</div>
              <span
                className="text-[10px] uppercase"
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  letterSpacing: "0.22em",
                  color: "oklch(48% 0.018 65)",
                }}
              >
                {r.size}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span
                className="text-[10px] uppercase"
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  letterSpacing: "0.22em",
                  color: "oklch(56% 0.018 65)",
                }}
              >
                {formatBytes(r.bytes)}
              </span>
              <button
                type="button"
                className="text-[11px] uppercase"
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  letterSpacing: "0.18em",
                  color: "oklch(58% 0.21 28)",
                }}
              >
                ↓ Save
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
