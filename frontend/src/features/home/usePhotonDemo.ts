import { useCallback, useEffect, useRef, useState } from "react";

export type PhotonFormat = "webp" | "avif" | "jpeg" | "png";

export interface VariantSpec {
  id: string;
  label: string;
  size: string;
  ratio: string;
  hint: string;
}

export const VARIANTS: VariantSpec[] = [
  { id: "thumb", label: "Thumbnail", size: "240 × 240", ratio: "1 / 1", hint: "feed tiles, avatars" },
  { id: "card", label: "Card", size: "640 × 480", ratio: "4 / 3", hint: "listings, gallery rows" },
  { id: "detail", label: "Detail", size: "1440 × 960", ratio: "3 / 2", hint: "product page hero" },
  { id: "hero", label: "Hero", size: "2560 × 1440", ratio: "16 / 9", hint: "full-bleed banners" },
  { id: "social", label: "Social", size: "1200 × 630", ratio: "40 / 21", hint: "OG / Twitter cards" },
];

export const FORMATS: { id: PhotonFormat; label: string; note: string }[] = [
  { id: "webp", label: "WebP", note: "balanced default" },
  { id: "avif", label: "AVIF", note: "smallest, slower encode" },
  { id: "jpeg", label: "JPEG", note: "universal" },
  { id: "png", label: "PNG", note: "lossless" },
];

export type PhotonStage =
  | "idle"
  | "uploading"
  | "queued"
  | "claimed"
  | "generating"
  | "compressing"
  | "stored"
  | "done"
  | "error";

export const STAGE_COPY: Record<Exclude<PhotonStage, "idle" | "error">, string> = {
  uploading: "Uploading to MinIO",
  queued: "Queued in Redis",
  claimed: "Go worker claimed job",
  generating: "Generating variants",
  compressing: "Compressing variants",
  stored: "Stored in MinIO",
  done: "Done",
};

export const STAGE_ORDER: PhotonStage[] = [
  "uploading",
  "queued",
  "claimed",
  "generating",
  "compressing",
  "stored",
  "done",
];

// stage timing: monotonic progress fractions (end-of-stage)
const STAGE_END: Record<PhotonStage, number> = {
  idle: 0,
  uploading: 0.18,
  queued: 0.26,
  claimed: 0.36,
  generating: 0.7,
  compressing: 0.86,
  stored: 0.97,
  done: 1,
  error: 1,
};

const STAGE_DURATION_MS: Record<PhotonStage, number> = {
  idle: 0,
  uploading: 1100,
  queued: 600,
  claimed: 700,
  generating: 2400,
  compressing: 1100,
  stored: 700,
  done: 0,
  error: 0,
};

export interface PhotonFile {
  id: string;
  file: File;
  previewURL: string;
  bytes: number;
}

export interface PhotonResult {
  variantId: string;
  format: PhotonFormat;
  bytes: number;
  ratio: string;
  size: string;
  label: string;
}

export interface PhotonState {
  files: PhotonFile[];
  variants: Set<string>;
  format: PhotonFormat;
  stage: PhotonStage;
  progress: number;
  elapsedMs: number;
  results: PhotonResult[];
  isRunning: boolean;
  isDone: boolean;
}

export interface PhotonControls {
  setFiles: (files: File[]) => void;
  addFiles: (files: File[]) => void;
  removeFile: (id: string) => void;
  toggleVariant: (id: string) => void;
  setFormat: (f: PhotonFormat) => void;
  run: () => void;
  reset: () => void;
}

function makeId() {
  return Math.random().toString(36).slice(2, 9);
}

function fakeBytes(variantId: string, format: PhotonFormat, sourceBytes: number) {
  const variantScale: Record<string, number> = {
    thumb: 0.018,
    card: 0.06,
    detail: 0.22,
    hero: 0.42,
    social: 0.14,
  };
  const formatScale: Record<PhotonFormat, number> = {
    webp: 0.55,
    avif: 0.32,
    jpeg: 0.7,
    png: 1.4,
  };
  const base = sourceBytes * (variantScale[variantId] ?? 0.1) * (formatScale[format] ?? 0.6);
  return Math.max(2_000, Math.round(base));
}

export function usePhoton(): PhotonState & PhotonControls {
  const [files, setFilesState] = useState<PhotonFile[]>([]);
  const [variants, setVariants] = useState<Set<string>>(
    () => new Set(["thumb", "card", "detail"]),
  );
  const [format, setFormat] = useState<PhotonFormat>("webp");
  const [stage, setStage] = useState<PhotonStage>("idle");
  const [progress, setProgress] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [results, setResults] = useState<PhotonResult[]>([]);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);

  const cleanup = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  useEffect(() => () => {
    cleanup();
    files.forEach((f) => URL.revokeObjectURL(f.previewURL));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setFiles = useCallback((next: File[]) => {
    setFilesState((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.previewURL));
      return next.map((file) => ({
        id: makeId(),
        file,
        previewURL: URL.createObjectURL(file),
        bytes: file.size,
      }));
    });
    setStage("idle");
    setProgress(0);
    setResults([]);
  }, []);

  const addFiles = useCallback((next: File[]) => {
    setFilesState((prev) => [
      ...prev,
      ...next.map((file) => ({
        id: makeId(),
        file,
        previewURL: URL.createObjectURL(file),
        bytes: file.size,
      })),
    ]);
    setStage("idle");
    setProgress(0);
    setResults([]);
  }, []);

  const removeFile = useCallback((id: string) => {
    setFilesState((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.previewURL);
      return prev.filter((p) => p.id !== id);
    });
  }, []);

  const toggleVariant = useCallback((id: string) => {
    setVariants((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    cleanup();
    setStage("idle");
    setProgress(0);
    setElapsedMs(0);
    setResults([]);
  }, [cleanup]);

  const run = useCallback(() => {
    if (files.length === 0 || variants.size === 0) return;
    cleanup();
    setResults([]);
    setStage("uploading");
    setProgress(0);
    setElapsedMs(0);
    startRef.current = performance.now();

    const sequence: PhotonStage[] = STAGE_ORDER;
    const totalDuration = sequence.reduce((acc, s) => acc + STAGE_DURATION_MS[s], 0);

    const tick = (now: number) => {
      const elapsed = now - startRef.current;
      setElapsedMs(elapsed);
      const t = Math.min(elapsed / totalDuration, 1);

      // determine current stage by elapsed
      let acc = 0;
      let current: PhotonStage = "uploading";
      for (const s of sequence) {
        const next = acc + STAGE_DURATION_MS[s];
        if (elapsed < next) {
          current = s;
          break;
        }
        acc = next;
        current = s;
      }

      // progress fraction smoothed across stage endpoints
      const stageStart = STAGE_END[
        current === "uploading"
          ? "idle"
          : sequence[Math.max(0, sequence.indexOf(current) - 1)]
      ];
      const stageEnd = STAGE_END[current];
      const stageElapsed = elapsed - acc;
      const stageDur = STAGE_DURATION_MS[current] || 1;
      const localFrac = Math.min(1, Math.max(0, stageElapsed / stageDur));
      const eased = 1 - Math.pow(1 - localFrac, 3);
      const overall = stageStart + (stageEnd - stageStart) * eased;
      setProgress(Math.min(1, overall));
      setStage(current);

      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setStage("done");
        setProgress(1);
        // build results
        const out: PhotonResult[] = [];
        for (const f of files) {
          for (const vId of variants) {
            const v = VARIANTS.find((x) => x.id === vId);
            if (!v) continue;
            out.push({
              variantId: v.id,
              format,
              bytes: fakeBytes(v.id, format, f.bytes),
              ratio: v.ratio,
              size: v.size,
              label: v.label,
            });
          }
        }
        setResults(out);
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(tick);
  }, [files, variants, format, cleanup]);

  return {
    files,
    variants,
    format,
    stage,
    progress,
    elapsedMs,
    results,
    isRunning: stage !== "idle" && stage !== "done" && stage !== "error",
    isDone: stage === "done",
    setFiles,
    addFiles,
    removeFile,
    toggleVariant,
    setFormat,
    run,
    reset,
  };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function stageIndex(stage: PhotonStage): number {
  return STAGE_ORDER.indexOf(stage);
}
