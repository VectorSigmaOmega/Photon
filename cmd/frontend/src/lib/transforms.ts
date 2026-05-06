import type { Transform } from "./types";

export const TRANSFORMS: Record<Transform["name"], Transform> = {
  thumb: { name: "thumb", width: 320, height: 320, quality: "balanced" },
  card: { name: "card", width: 960, height: 960, quality: "balanced" },
  detail: { name: "detail", width: 1600, height: 1600, quality: "high" },
};

export const TRANSFORM_ORDER: Transform["name"][] = ["thumb", "card", "detail"];
export const FORMATS = ["webp", "avif", "jpg", "png"] as const;
export type OutputFormat = (typeof FORMATS)[number];
