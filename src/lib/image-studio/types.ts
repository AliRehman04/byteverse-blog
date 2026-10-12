export type OutputFormat = "jpeg" | "png" | "webp" | "avif";
export type InputFormat = OutputFormat | "gif" | "bmp" | "heic";
export type Mode = "target" | "quality" | "resize" | "auto";
export type ByteUnit = "KB" | "KiB" | "MB" | "MiB";
export type ResizeMode = "none" | "dimensions" | "percent" | "longest";

/** Fractions of the oriented image, BEFORE cropping or resizing. */
export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Dimensions {
  width: number;
  height: number;
}

export interface CropPixels extends Dimensions {
  x: number;
  y: number;
}

export interface ImageMetadata {
  format: InputFormat;
  mime: string;
  width?: number;
  height?: number;
  animated: boolean;
  /** A bounded header scan could not rule animation out; the decoder must check. */
  animationUnknown?: boolean;
}

export interface ImageSettings {
  mode: Mode;
  format: OutputFormat | "auto";
  targetValue: number;
  unit: ByteUnit;
  quality: number;
  minQuality: number;
  preserveDimensions: boolean;
  resizeMode: ResizeMode;
  width: number;
  height: number;
  percent: number;
  longestSide: number;
  lockAspect: boolean;
  allowUpscale: boolean;
  background: string;
  /** Explicit consent to flatten transparent pixels onto background for JPEG. */
  allowJpegTransparency: boolean;
  pngLevel: number;
  /** 0 disables lossy palette reduction; otherwise 2..256 colors. */
  paletteColors: number;
  crop: CropRect | null;
  autoPreference: "balanced" | "smallest";
}

/** Resource budgets, not quotas. RGBA alone needs four bytes per decoded pixel;
 * decoders, resize buffers and encoders need additional memory. The worker must
 * check decoded dimensions (including unknown header dimensions), enforce the
 * low-memory budget when applicable, and terminate jobs at the time limit.
 * File/batch limits apply BEFORE allocation/queueing; output size AFTER encoding.
 */
export const IMAGE_LIMITS = Object.freeze({
  fileBytes: 50_000_000,
  pixels: 50_000_000,
  lowMemoryPixels: 12_000_000,
  batchBytes: 200_000_000,
  batchFiles: 50,
  maxDimension: 16_384,
  targetMinBytes: 5_000,
  maxOutputBytes: 100_000_000,
  jobTimeoutMs: 120_000,
});

export const DEFAULT_SETTINGS: Readonly<ImageSettings> = Object.freeze({
  mode: "target",
  format: "webp",
  targetValue: 100,
  unit: "KB",
  quality: 80,
  minQuality: 40,
  preserveDimensions: false,
  resizeMode: "none",
  width: 1920,
  height: 1920,
  percent: 100,
  longestSide: 1920,
  lockAspect: true,
  allowUpscale: false,
  background: "#ffffff",
  allowJpegTransparency: false,
  pngLevel: 2,
  paletteColors: 0,
  crop: null,
  autoPreference: "balanced",
});

export const OUTPUT_MIME: Readonly<Record<OutputFormat, string>> = Object.freeze({
  jpeg: "image/jpeg", png: "image/png", webp: "image/webp", avif: "image/avif",
});

export const OUTPUT_EXTENSIONS: Readonly<Record<OutputFormat, string>> = Object.freeze({
  jpeg: "jpg", png: "png", webp: "webp", avif: "avif",
});