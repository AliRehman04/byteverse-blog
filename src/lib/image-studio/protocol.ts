import type { ImageMetadata, ImageSettings, OutputFormat } from "./types";

export interface ImageInspection extends ImageMetadata {
  width: number;
  height: number;
  hasAlpha: boolean;
  gps: boolean;
  cameraSerial: boolean;
  metadataRead: boolean;
  orientation: number;
  preview: Blob;
  notices: string[];
}

export interface ImageResult {
  blob: Blob;
  reference: Blob;
  width: number;
  height: number;
  format: OutputFormat;
  quality: number | null;
  targetBytes: number | null;
  targetMet: boolean | null;
  attempts: number;
  codec: string;
  notices: string[];
  /** Low-resolution pixel-error comparison, not an objective perceptual score. */
  comparisonError?: number;
}

export type StudioRequest = {
  id: string;
  action: "inspect" | "process";
  file: Blob;
  maxPixels: number;
  settings?: ImageSettings;
};

export type StudioResponse =
  | { id: string; kind: "progress"; progress: number; stage: string }
  | { id: string; kind: "inspection"; value: ImageInspection }
  | { id: string; kind: "result"; value: ImageResult }
  | { id: string; kind: "error"; message: string; code: "invalid" | "unsupported" | "resource" | "codec" };