import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatBytes } from "../lib/format";

interface Props {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
}

const ACCEPT = ["image/png", "image/jpeg", "image/webp", "image/avif"];

export function Dropzone({ files, onChange, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [hover, setHover] = useState(false);

  const previews = useMemo(
    () => files.map((f) => ({ key: `${f.name}-${f.size}-${f.lastModified}`, url: URL.createObjectURL(f) })),
    [files],
  );

  useEffect(() => {
    return () => {
      for (const p of previews) URL.revokeObjectURL(p.url);
    };
  }, [previews]);

  const handlePicked = useCallback(
    (picked: FileList | null, append: boolean) => {
      if (!picked) return;
      const incoming = Array.from(picked).filter((f) => ACCEPT.includes(f.type));
      const next = append ? [...files, ...incoming] : incoming;
      onChange(next);
    },
    [files, onChange],
  );

  const empty = files.length === 0;

  return (
    <div
      onDragEnter={(e) => {
        e.preventDefault();
        if (!disabled) setHover(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setHover(true);
      }}
      onDragLeave={() => setHover(false)}
      onDrop={(e) => {
        e.preventDefault();
        setHover(false);
        if (disabled) return;
        handlePicked(e.dataTransfer.files, !empty);
      }}
      className={`relative rounded-lg border transition-colors ${
        hover
          ? "border-signal bg-signal-wash/40"
          : empty
            ? "border-dashed border-ink/25 bg-paper-deep/30"
            : "border-ink/15 bg-paper-deep/20"
      } ${disabled ? "opacity-60" : ""}`}
    >
      {empty ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="block w-full px-6 py-12 text-left sm:px-10 sm:py-16"
        >
          <div className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-[2.4rem]">
            Drop images here, or click to browse.
          </div>
          <div className="mt-3 max-w-md text-base leading-relaxed text-ink-soft">
            Each image becomes its own job. Photon presigns a direct upload to
            object storage; the API never proxies the bytes.
          </div>
          <div className="mt-6 text-xs text-ink-mute">
            png, jpg, webp, avif
          </div>
        </button>
      ) : (
        <div className="px-4 py-4 sm:px-5 sm:py-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {files.map((file, idx) => (
              <figure
                key={previews[idx]?.key ?? `${file.name}-${idx}`}
                className="group relative overflow-hidden rounded-md border border-ink/15 bg-paper"
              >
                <div className="aspect-[4/3] w-full overflow-hidden bg-paper-deep">
                  <img
                    src={previews[idx]?.url}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
                <figcaption className="flex items-center justify-between gap-2 border-t border-ink/10 bg-paper px-2.5 py-1.5">
                  <span className="truncate text-xs text-ink" title={file.name}>
                    {file.name}
                  </span>
                  <span className="shrink-0 font-mono text-[10px] text-ink-mute">
                    {formatBytes(file.size)}
                  </span>
                </figcaption>
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => onChange(files.filter((_, i) => i !== idx))}
                    className="absolute right-1.5 top-1.5 rounded-full bg-ink/80 px-2 py-0.5 text-[10px] text-paper opacity-0 transition-opacity hover:bg-ink group-hover:opacity-100"
                    aria-label={`Remove ${file.name}`}
                  >
                    remove
                  </button>
                )}
              </figure>
            ))}

            <button
              type="button"
              disabled={disabled}
              onClick={() => inputRef.current?.click()}
              className="flex aspect-[4/3] flex-col items-center justify-center rounded-md border border-dashed border-ink/25 text-ink-mute transition-colors hover:border-ink/50 hover:text-ink"
            >
              <span className="text-2xl leading-none">+</span>
              <span className="mt-2 text-xs">add more</span>
            </button>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-ink-mute">
            <span>
              {files.length} {files.length === 1 ? "image" : "images"} staged
            </span>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange([])}
              className="text-ink-mute underline-offset-4 hover:text-signal hover:underline"
            >
              clear
            </button>
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT.join(",")}
        multiple
        className="sr-only"
        onChange={(e) => {
          handlePicked(e.target.files, !empty);
          if (inputRef.current) inputRef.current.value = "";
        }}
      />
    </div>
  );
}
