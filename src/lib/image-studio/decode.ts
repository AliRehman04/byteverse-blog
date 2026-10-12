import { sniffImage } from "./sniff";
import { IMAGE_LIMITS } from "./types";
import type { ImageMetadata, OutputFormat } from "./types";
import { readMetadata, type PrivacyMetadata } from "./metadata";
import { canvasFor, checkDimensions, checkPixels, hasTransparency, imageData, orientPixels, releaseCanvas } from "./pixels";
import { StudioError, checkAborted } from "./codecs/errors";
import type { OpenHeic } from "./codecs/heic";
import { readIsoMetadata } from "./codecs/isobmff";

export interface DecodedImage {
  pixels: ImageData;
  info: ImageMetadata;
  privacy: PrivacyMetadata;
  hasAlpha: boolean;
  notices: string[];
}

const COLOR_NOTICE = "Pixels are processed as 8-bit sRGB. Native color conversion follows this browser; wide-gamut/HDR/profile fidelity is not guaranteed.";
const FALLBACK_COLOR_NOTICE = "A WASM decoder was used. Its pixels are interpreted as sRGB; unusual ICC, wide-gamut or HDR input can have different colors.";

async function nativePixels(blob: Blob, maxPixels: number): Promise<ImageData> {
  if (typeof createImageBitmap !== "function") throw new StudioError("unsupported", "Native image decoding is unavailable in this worker.");
  const bitmap = await createImageBitmap(blob, { imageOrientation: "from-image", colorSpaceConversion: "default" });
  try {
    checkDimensions(bitmap.width, bitmap.height, maxPixels);
    const { canvas, context } = canvasFor(bitmap.width, bitmap.height, maxPixels);
    try {
      context.drawImage(bitmap, 0, 0);
      const pixels = context.getImageData(0, 0, bitmap.width, bitmap.height);
      checkPixels(pixels, maxPixels);
      return pixels;
    } finally { releaseCanvas(canvas); }
  } finally { bitmap.close(); }
}

async function decodeWithFallback(
  blob: Blob, bytes: Uint8Array<ArrayBuffer>, info: ImageMetadata, privacy: PrivacyMetadata,
  maxPixels: number, heic?: OpenHeic,
): Promise<{ pixels: ImageData; fallback: boolean }> {
  try {
    return { pixels: await nativePixels(blob, maxPixels), fallback: false };
  } catch (error) {
    if (error instanceof StudioError && error.code === "resource") throw error;
  }
  let pixels: ImageData;
  try {
    // A full ArrayBuffer is supplied, never a view which includes other data.
    switch (info.format) {
      case "jpeg": pixels = await (await import("./codecs/jpeg")).decode(bytes.buffer); break;
      case "png": pixels = await (await import("./codecs/png")).decode(bytes.buffer); break;
      case "webp":
        if (info.animated || info.animationUnknown) throw new StudioError("unsupported", "This browser cannot decode the first frame of this animated WebP file.");
        pixels = await (await import("./codecs/webp")).decode(bytes.buffer); break;
      case "avif": pixels = await (await import("./codecs/avif")).decode(bytes.buffer); break;
      case "heic":
        if (!heic) throw new StudioError("codec", "HEIC header inspection was not completed.");
        pixels = await heic.decode(); break;
      default: throw new StudioError("unsupported", "This browser could not decode this GIF or BMP image. Try converting it to PNG first.");
    }
    checkPixels(pixels, maxPixels);
    // jSquash JPEG and libheif already orient. Rust PNG/libwebp return encoded
    // pixel order, so only these two receive the explicit EXIF transform.
    if (info.format === "png" || info.format === "webp") {
      if (!privacy.metadataRead && privacy.orientation === 1) {
        // The notice below does not claim unknown orientation was repaired.
        privacy.notices.push("The fallback decoder could not verify all orientation metadata; check the preview before downloading.");
      }
      pixels = orientPixels(pixels, privacy.orientation, maxPixels);
    }
    if (info.format === "avif") {
      const container = readIsoMetadata(bytes);
      if (!container.geometryRead || container.hasCleanAperture) throw new StudioError("unsupported", "This AVIF needs container geometry that the fallback decoder cannot safely reproduce. Try a browser with native AVIF support.");
      // Verified with actual encoded fixtures: jSquash AVIF 2.1.1 returns raw
      // pixel order and ignores irot/imir. Apply ONLY primary-item transforms,
      // not EXIF orientation, in their property-association order.
      for (const transform of container.transforms) {
        const orientation = transform.kind === "rotate" ? [1, 8, 3, 6][transform.value] : transform.value === 0 ? 4 : 2;
        pixels = orientPixels(pixels, orientation, maxPixels);
      }
    }
    // Normalize the dependency's ImageData-like output and enforce data length.
    return { pixels: imageData(pixels.data, pixels.width, pixels.height, maxPixels), fallback: true };
  } catch (error) {
    if (error instanceof StudioError) throw error;
    throw new StudioError("unsupported", "This image is corrupt or uses a feature unsupported by this browser and the local fallback decoder.");
  }
}

export async function decodeImage(file: Blob, maxPixels: number, signal?: AbortSignal): Promise<DecodedImage> {
  checkAborted(signal);
  if (!(file instanceof Blob) || file.size < 1) throw new StudioError("invalid", "Choose a non-empty image file.");
  if (file.size > IMAGE_LIMITS.fileBytes) throw new StudioError("resource", "The input exceeds the 50 MB per-file safety limit.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  checkAborted(signal);
  let info: ImageMetadata | null;
  try { info = sniffImage(bytes); }
  catch { throw new StudioError("resource", "The image header exceeds the supported byte, pixel or dimension limits."); }
  if (!info) throw new StudioError("invalid", "Unsupported or invalid image signature. Choose JPEG, PNG, WebP, AVIF, HEIC, GIF or BMP; SVG is not accepted.");
  if (info.width !== undefined && info.height !== undefined) checkDimensions(info.width, info.height, maxPixels);
  if (info.format === "avif") {
    const container = readIsoMetadata(bytes);
    // Unlike an arbitrary ispe byte scan, these dimensions belong to pitm/ipma's
    // primary item. Unknown dimensions still require a post-decode budget check.
    if (container.width !== undefined && container.height !== undefined) checkDimensions(container.width, container.height, maxPixels);
  }
  const privacy = await readMetadata(bytes, info);
  checkAborted(signal);
  let heic: OpenHeic | undefined;
  try {
    if (info.format === "heic") {
      const { openHeic } = await import("./codecs/heic");
      heic = await openHeic(bytes, maxPixels);
      checkAborted(signal);
    }
    // A Blob's reported MIME/extension is untrusted. Give the native decoder
    // the MIME established by the signature, not a file-provided URL or label.
    const typedFile = file.type === info.mime ? file : new Blob([file], { type: info.mime });
    const decoded = await decodeWithFallback(typedFile, bytes, info, privacy, maxPixels, heic);
    checkAborted(signal);
    checkPixels(decoded.pixels, maxPixels);
    const notices = [...privacy.notices, COLOR_NOTICE];
    if (decoded.fallback) notices.push(FALLBACK_COLOR_NOTICE);
    if (info.animated || info.animationUnknown || info.format === "gif") notices.push("Only the first/default frame is processed. Animation, timing and additional frames are not preserved.");
    if (heic && heic.imageCount > 1) notices.push("This HEIF collection contains multiple images; only its primary image is processed.");
    if (info.animationUnknown) notices.push("The bounded header scan could not determine whether every frame was present.");
    return { pixels: decoded.pixels, info, privacy, hasAlpha: hasTransparency(decoded.pixels), notices };
  } finally { heic?.close(); }
}

/** Decode an already signature-checked generated output for actual comparison.
 * No metadata parser, no original-file sniff budget, no implicit network. */
export async function decodeOutput(blob: Blob, format: OutputFormat, maxPixels: number): Promise<ImageData> {
  try { return await nativePixels(blob, maxPixels); }
  catch (error) { if (error instanceof StudioError && error.code === "resource") throw error; }
  const buffer = await blob.arrayBuffer();
  let pixels: ImageData;
  try {
    switch (format) {
      case "jpeg": pixels = await (await import("./codecs/jpeg")).decode(buffer); break;
      case "png": pixels = await (await import("./codecs/png")).decode(buffer); break;
      case "webp": pixels = await (await import("./codecs/webp")).decode(buffer); break;
      case "avif": pixels = await (await import("./codecs/avif")).decode(buffer); break;
    }
    checkPixels(pixels, maxPixels);
    return pixels;
  } catch (error) {
    if (error instanceof StudioError) throw error;
    throw new StudioError("codec", "The encoded image could not be decoded for validation. No unverified output was returned.");
  }
}