"use client";

import { ChangeEvent, DragEvent, useEffect, useMemo, useState } from "react";
import { Check, Download, FileImage, Image as ImageIcon, Loader2, RefreshCw, SlidersHorizontal, Upload } from "lucide-react";

type OutputFormat = "image/jpeg" | "image/png" | "image/webp";

type ImageFileState = {
  name: string;
  size: number;
  type: string;
  width: number;
  height: number;
  url: string;
};

type CompressedImageState = {
  name: string;
  size: number;
  type: string;
  width: number;
  height: number;
  url: string;
  blob: Blob;
};

const formatOptions: { label: string; value: OutputFormat; hint: string }[] = [
  { label: "WebP", value: "image/webp", hint: "Best web compression" },
  { label: "JPG", value: "image/jpeg", hint: "Photos and compatibility" },
  { label: "PNG", value: "image/png", hint: "Transparency and sharp graphics" },
];

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function outputExtension(type: OutputFormat) {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}

function buildOutputName(name: string, type: OutputFormat) {
  const baseName = name.replace(/\.[^.]+$/, "") || "compressed-image";
  return `${baseName}-compressed.${outputExtension(type)}`;
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load this image."));
    image.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: OutputFormat, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Your browser could not create the compressed image."));
      },
      type,
      type === "image/png" ? undefined : quality / 100,
    );
  });
}

export function ImageCompressorTool() {
  const [original, setOriginal] = useState<ImageFileState | null>(null);
  const [compressed, setCompressed] = useState<CompressedImageState | null>(null);
  const [quality, setQuality] = useState(78);
  const [maxWidth, setMaxWidth] = useState(1600);
  const [maxHeight, setMaxHeight] = useState(1600);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("image/webp");
  const [isCompressing, setIsCompressing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState("");
  const [downloaded, setDownloaded] = useState(false);

  useEffect(() => {
    return () => {
      if (original?.url) URL.revokeObjectURL(original.url);
    };
  }, [original?.url]);

  useEffect(() => {
    return () => {
      if (compressed?.url) URL.revokeObjectURL(compressed.url);
    };
  }, [compressed?.url]);

  const savings = useMemo(() => {
    if (!original || !compressed) return null;
    const savedBytes = original.size - compressed.size;
    const percent = original.size > 0 ? Math.round((savedBytes / original.size) * 100) : 0;
    return { savedBytes, percent };
  }, [original, compressed]);

  async function readFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Please choose a JPG, PNG, or WebP image.");
      return;
    }

    setError("");
    setCompressed(null);
    setDownloaded(false);

    const url = URL.createObjectURL(file);
    try {
      const image = await loadImage(url);
      setOriginal({
        name: file.name,
        size: file.size,
        type: file.type || "image",
        width: image.naturalWidth,
        height: image.naturalHeight,
        url,
      });
    } catch (loadError) {
      URL.revokeObjectURL(url);
      setError(loadError instanceof Error ? loadError.message : "Could not read this image.");
    }
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) void readFile(file);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void readFile(file);
  }

  async function compressImage() {
    if (!original) {
      setError("Upload an image first.");
      return;
    }

    setIsCompressing(true);
    setError("");
    setDownloaded(false);

    try {
      const image = await loadImage(original.url);
      const widthLimit = Math.max(1, Number(maxWidth) || image.naturalWidth);
      const heightLimit = Math.max(1, Number(maxHeight) || image.naturalHeight);
      const scale = Math.min(1, widthLimit / image.naturalWidth, heightLimit / image.naturalHeight);
      const nextWidth = Math.max(1, Math.round(image.naturalWidth * scale));
      const nextHeight = Math.max(1, Math.round(image.naturalHeight * scale));

      const canvas = document.createElement("canvas");
      canvas.width = nextWidth;
      canvas.height = nextHeight;
      const context = canvas.getContext("2d", { alpha: outputFormat !== "image/jpeg" });
      if (!context) throw new Error("Canvas is not available in this browser.");

      if (outputFormat === "image/jpeg") {
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, nextWidth, nextHeight);
      }
      context.drawImage(image, 0, 0, nextWidth, nextHeight);

      const blob = await canvasToBlob(canvas, outputFormat, quality);
      const url = URL.createObjectURL(blob);
      setCompressed({
        name: buildOutputName(original.name, outputFormat),
        size: blob.size,
        type: outputFormat,
        width: nextWidth,
        height: nextHeight,
        url,
        blob,
      });
    } catch (compressError) {
      setError(compressError instanceof Error ? compressError.message : "Compression failed.");
    } finally {
      setIsCompressing(false);
    }
  }

  function downloadImage() {
    if (!compressed) return;
    const anchor = document.createElement("a");
    anchor.href = compressed.url;
    anchor.download = compressed.name;
    anchor.click();
    setDownloaded(true);
    window.setTimeout(() => setDownloaded(false), 1500);
  }

  function resetTool() {
    setOriginal(null);
    setCompressed(null);
    setError("");
    setDownloaded(false);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.95fr,1.05fr]">
      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary mb-2">Upload</p>
            <h2 className="text-2xl font-bold">Optimize an image</h2>
          </div>
          <button type="button" onClick={resetTool} className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium hover:bg-muted">
            <RefreshCw size={15} /> Reset
          </button>
        </div>

        <label
          onDragOver={(event) => {
            event.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          className={`flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${dragActive ? "border-primary bg-primary/5" : "border-border bg-muted/30 hover:border-primary/50"}`}
        >
          <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Upload size={26} />
          </span>
          <span className="text-base font-semibold">Drop an image here or browse</span>
          <span className="mt-2 text-sm text-muted-foreground">JPG, PNG, or WebP. Processing stays on your device.</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleInputChange} className="sr-only" />
        </label>

        {error && (
          <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-medium">Max width</span>
            <input type="number" min={1} value={maxWidth} onChange={(event) => setMaxWidth(Number(event.target.value))} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary" />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium">Max height</span>
            <input type="number" min={1} value={maxHeight} onChange={(event) => setMaxHeight(Number(event.target.value))} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary" />
          </label>
        </div>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-sm font-medium">Quality</span>
            <span className="text-sm font-semibold text-primary">{quality}%</span>
          </div>
          <input aria-label="Image quality" type="range" min={35} max={100} value={quality} onChange={(event) => setQuality(Number(event.target.value))} className="w-full accent-primary" />
          <p className="mt-2 text-xs text-muted-foreground">Quality applies to JPG and WebP. PNG output keeps lossless pixels and mainly benefits from resizing.</p>
        </div>

        <div className="mt-5">
          <p className="mb-3 flex items-center gap-2 text-sm font-medium"><SlidersHorizontal size={16} /> Output format</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {formatOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setOutputFormat(option.value)}
                className={`rounded-xl border p-4 text-left transition-colors ${outputFormat === option.value ? "border-primary bg-primary/10" : "border-border hover:bg-muted"}`}
              >
                <span className="block text-sm font-semibold">{option.label}</span>
                <span className="mt-1 block text-xs text-muted-foreground">{option.hint}</span>
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={compressImage}
          disabled={!original || isCompressing}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isCompressing ? <Loader2 size={18} className="animate-spin" /> : <FileImage size={18} />}
          {isCompressing ? "Compressing..." : "Compress image"}
        </button>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm">
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary mb-2">Preview</p>
          <h2 className="text-2xl font-bold">Before and after</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <PreviewPanel title="Original" image={original} emptyText="Upload an image to preview it." />
          <PreviewPanel title="Compressed" image={compressed} emptyText="Compress to see the optimized result." />
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Stat label="Original size" value={original ? formatBytes(original.size) : "-"} />
          <Stat label="New size" value={compressed ? formatBytes(compressed.size) : "-"} />
          <Stat label="Saved" value={savings ? `${Math.max(0, savings.percent)}%` : "-"} tone={savings && savings.percent > 0 ? "good" : "default"} />
        </div>

        {compressed && (
          <div className="mt-5 rounded-2xl border border-border bg-muted/30 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{compressed.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{compressed.width} x {compressed.height}px - {formatBytes(compressed.size)} - {compressed.type}</p>
              </div>
              <button type="button" onClick={downloadImage} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
                {downloaded ? <Check size={16} /> : <Download size={16} />}
                {downloaded ? "Downloaded" : "Download"}
              </button>
            </div>
          </div>
        )}

        {savings && savings.savedBytes < 0 && (
          <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
            The output is larger than the original. Try WebP, lower quality, or smaller dimensions.
          </p>
        )}
      </section>
    </div>
  );
}

function PreviewPanel({ title, image, emptyText }: { title: string; image: ImageFileState | CompressedImageState | null; emptyText: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-semibold">{title}</h3>
        {image && <span className="text-xs text-muted-foreground">{image.width} x {image.height}</span>}
      </div>
      {image ? (
        <div className="overflow-hidden rounded-xl border border-border bg-muted/30">
          <img src={image.url} alt={`${title} preview`} className="h-64 w-full object-contain" />
        </div>
      ) : (
        <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 text-center text-sm text-muted-foreground">
          <ImageIcon size={28} className="mb-3 opacity-60" />
          {emptyText}
        </div>
      )}
      {image && <p className="mt-3 text-sm text-muted-foreground">{formatBytes(image.size)}</p>}
    </div>
  );
}

function Stat({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "good" }) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-lg font-bold ${tone === "good" ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}>{value}</p>
    </div>
  );
}