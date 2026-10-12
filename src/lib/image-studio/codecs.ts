import { IMAGE_LIMITS, OUTPUT_MIME } from "./types";
import type { ImageSettings, OutputFormat } from "./types";
import { canvasFor, checkPixels, hasTransparency, releaseCanvas, resizePixels, previewDimensions } from "./pixels";
import { StudioError } from "./codecs/errors";

export interface EncodedImage {
  readonly blob: Blob;
  readonly size: number;
  readonly format: OutputFormat;
  readonly codec: string;
  readonly notices: readonly string[];
}

function matches(bytes: Uint8Array, offset: number, text: string): boolean {
  if (offset + text.length > bytes.length) return false;
  for (let i = 0; i < text.length; i++) if (bytes[offset + i] !== text.charCodeAt(i)) return false;
  return true;
}

/** Output validation has its own 100 MB ceiling; reusing the INPUT sniffer
 * would wrongly reject valid 50..100 MB generated PNGs. Header/tail checks are
 * not a full decoder: the selected output is additionally decoded downstream. */
export async function validateEncodedBlob(blob: Blob, format: OutputFormat, width: number, height: number): Promise<void> {
  if (!(blob instanceof Blob) || blob.size < 1 || blob.type !== OUTPUT_MIME[format]) throw new StudioError("codec", "The encoder returned an empty image or a different MIME type. No mislabeled download was created.");
  if (blob.size > IMAGE_LIMITS.maxOutputBytes) throw new StudioError("resource", "The encoded image exceeds the 100 MB output safety limit. Choose smaller dimensions.");
  const bytes = new Uint8Array(await blob.slice(0, 65_536).arrayBuffer());
  const tail = new Uint8Array(await blob.slice(Math.max(0, blob.size - 12)).arrayBuffer());
  const view = new DataView(bytes.buffer);
  let valid = false;
  if (format === "png") {
    valid = bytes.length >= 33 && matches(bytes, 0, "\x89PNG\r\n\x1a\n") && view.getUint32(8) === 13
      && matches(bytes, 12, "IHDR") && view.getUint32(16) === width && view.getUint32(20) === height
      && tail.length === 12 && matches(tail, 4, "IEND") && tail[0] === 0 && tail[1] === 0 && tail[2] === 0 && tail[3] === 0;
  } else if (format === "jpeg") {
    if (bytes[0] === 255 && bytes[1] === 216 && tail.at(-2) === 255 && tail.at(-1) === 217) {
      const sof = new Set([0xc0, 0xc1, 0xc2]);
      let offset = 2;
      for (let count = 0; count < 512 && offset + 4 <= bytes.length; count++) {
        if (bytes[offset++] !== 255) break;
        while (bytes[offset] === 255) offset++;
        const marker = bytes[offset++];
        if (marker === 0xda || marker === 0xd9) break;
        const size = view.getUint16(offset);
        if (size < 2 || offset + size > bytes.length) break;
        if (sof.has(marker)) {
          valid = size >= 8 && view.getUint16(offset + 3) === height && view.getUint16(offset + 5) === width;
          break;
        }
        offset += size;
      }
    }
  } else if (format === "webp") {
    if (bytes.length >= 30 && matches(bytes, 0, "RIFF") && matches(bytes, 8, "WEBP") && view.getUint32(4, true) + 8 === blob.size) {
      const uint24 = (offset: number) => bytes[offset] + bytes[offset + 1] * 256 + bytes[offset + 2] * 65_536;
      if (matches(bytes, 12, "VP8X")) valid = view.getUint32(16, true) === 10 && uint24(24) + 1 === width && uint24(27) + 1 === height && (bytes[20] & 2) === 0;
      else if (matches(bytes, 12, "VP8 ") && matches(bytes, 23, "\x9d\x01\x2a")) valid = (view.getUint16(26, true) & 0x3fff) === width && (view.getUint16(28, true) & 0x3fff) === height;
      else if (matches(bytes, 12, "VP8L") && bytes[20] === 0x2f) {
        const bits = view.getUint32(21, true);
        valid = (bits & 0x3fff) + 1 === width && ((bits >>> 14) & 0x3fff) + 1 === height;
      }
    }
  } else if (format === "avif" && bytes.length >= 24 && matches(bytes, 4, "ftyp")) {
    const end = view.getUint32(0);
    if (end >= 16 && end <= bytes.length && end % 4 === 0) {
      for (let offset = 8; offset < end; offset += 4) {
        if (offset !== 12 && matches(bytes, offset, "avif")) valid = true;
      }
    }
  }
  if (!valid) throw new StudioError("codec", "The encoded file signature or dimensions did not match the requested output.");
}

async function wasmEncode(pixels: ImageData, format: OutputFormat, quality: number, level: number): Promise<{ data: ArrayBuffer | Uint8Array; codec: string }> {
  switch (format) {
    case "jpeg": return { data: await (await import("./codecs/jpeg")).encode(pixels, quality), codec: "MozJPEG WASM (single-thread)" };
    case "png": return { data: await (await import("./codecs/png")).encode(pixels, level), codec: "OxiPNG WASM (single-thread, raw RGBA)" };
    case "webp": return { data: await (await import("./codecs/webp")).encode(pixels, quality), codec: "libwebp WASM (single-thread)" };
    case "avif": return { data: await (await import("./codecs/avif")).encode(pixels, quality), codec: "libavif WASM (single-thread, speed 8)" };
  }
}

function outputBlob(data: ArrayBuffer | Uint8Array, format: OutputFormat): Blob {
  const length = data.byteLength;
  if (length < 1) throw new StudioError("codec", "The image encoder returned no bytes.");
  if (length > IMAGE_LIMITS.maxOutputBytes) throw new StudioError("resource", "The encoded image exceeds the 100 MB output safety limit.");
  // Blob snapshots bytes before another WASM encode can reuse its heap.
  const part = data instanceof ArrayBuffer ? data : data.buffer instanceof ArrayBuffer
    ? new Uint8Array(data.buffer, data.byteOffset, length) : new Uint8Array(data);
  return new Blob([part], { type: OUTPUT_MIME[format] });
}

async function browserEncode(pixels: ImageData, format: OutputFormat, quality: number, maxPixels: number): Promise<Blob> {
  const { canvas, context } = canvasFor(pixels.width, pixels.height, maxPixels);
  try {
    context.putImageData(pixels, 0, 0);
    if (typeof canvas.convertToBlob !== "function") throw new StudioError("unsupported", "This browser cannot encode images in workers.");
    const blob = await canvas.convertToBlob({ type: OUTPUT_MIME[format], quality: quality / 100 });
    await validateEncodedBlob(blob, format, pixels.width, pixels.height);
    return blob;
  } finally { releaseCanvas(canvas); }
}

/** One backend choice per format per job. On a WASM failure, try only a
 * MIME/signature-verified OffscreenCanvas encoder, never a main-thread canvas. */
export function createEncoder(format: OutputFormat, settings: Readonly<ImageSettings>, maxPixels: number): {
  encode: (pixels: ImageData, quality: number) => Promise<EncodedImage>;
} {
  let useBrowser = false;
  return {
    async encode(pixels, quality) {
      checkPixels(pixels, maxPixels);
      if (format === "jpeg" && hasTransparency(pixels)) {
        throw new StudioError("invalid", settings.allowJpegTransparency
          ? "JPEG pixels must be flattened onto the selected background before encoding."
          : "This image has transparency. Enable JPEG background flattening explicitly or choose PNG, WebP or AVIF.");
      }
      if (!useBrowser) {
        try {
          const { data, codec } = await wasmEncode(pixels, format, quality, settings.pngLevel);
          const blob = outputBlob(data, format);
          await validateEncodedBlob(blob, format, pixels.width, pixels.height);
          return { blob, size: blob.size, format, codec, notices: [] };
        } catch (error) {
          if (error instanceof StudioError && (error.code === "resource" || error.code === "invalid")) throw error;
          useBrowser = true;
        }
      }
      try {
        const blob = await browserEncode(pixels, format, quality, maxPixels);
        return {
          blob, size: blob.size, format, codec: `Browser OffscreenCanvas ${format.toUpperCase()}`,
          notices: [`${format.toUpperCase()} WASM encoding was unavailable. A verified browser encoder was used; quality/size behavior can differ.${format === "png" ? " The OxiPNG optimization-level setting could not be applied." : ""}`],
        };
      } catch (error) {
        if (error instanceof StudioError && error.code === "resource") throw error;
        throw new StudioError("codec", `${format.toUpperCase()} encoding is unavailable or failed in both the local codec and this browser. Choose another output format.`);
      }
    },
  };
}

export async function makePreview(pixels: ImageData, maximumSide: number, maxPixels: number): Promise<Blob> {
  const dimensions = previewDimensions(pixels.width, pixels.height, maximumSide);
  const preview = await resizePixels(pixels, dimensions.width, dimensions.height, maxPixels);
  try { return await browserEncode(preview, "png", 100, maxPixels); }
  catch (error) {
    if (error instanceof StudioError && error.code === "resource") throw error;
    const { data } = await wasmEncode(preview, "png", 100, 0);
    const blob = outputBlob(data, "png");
    await validateEncodedBlob(blob, "png", preview.width, preview.height);
    return blob;
  }
}