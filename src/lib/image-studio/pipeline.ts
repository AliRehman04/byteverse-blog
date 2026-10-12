import type { ImageInspection, ImageResult } from "./protocol";
import type { ImageSettings, OutputFormat } from "./types";
import { IMAGE_LIMITS } from "./types";
import { validateSettings } from "./settings";
import { parseTarget } from "./bytes";
import { computeDimensions } from "./geometry";
import { searchTarget, TARGET_SEARCH_LIMITS } from "./target";
import { decodeImage, decodeOutput } from "./decode";
import { createEncoder, makePreview, type EncodedImage } from "./codecs";
import { cropPixels, flattenPixels, hasTransparency, previewDimensions, quantizePalette, resizePixels, sampledRgbaError } from "./pixels";
import { StudioError, checkAborted } from "./codecs/errors";

/** Worker-only module: the build resolves its virtual WASM asset table. The
 * Next UI imports protocol TYPES and uses the stable URL, not this runtime. */
export const WORKER_URL = "/image-studio/worker.js";
export const CODEC_MANIFEST_URL = "/image-studio/manifest.json";

export interface PipelineOptions {
  signal?: AbortSignal;
  /** Planned stage fraction, not a measured percentage of CPU work or time. */
  onProgress?: (fraction: number, stage: string) => void;
}

function budget(maxPixels: number): void {
  if (!Number.isSafeInteger(maxPixels) || maxPixels < 1 || maxPixels > IMAGE_LIMITS.pixels) {
    throw new StudioError("invalid", "The worker needs a valid pixel safety budget.");
  }
}

function progress(options: PipelineOptions, fraction: number, stage: string): void {
  checkAborted(options.signal);
  options.onProgress?.(fraction, stage);
}

export async function inspectImage(file: Blob, maxPixels: number, options: PipelineOptions = {}): Promise<ImageInspection> {
  budget(maxPixels);
  progress(options, 0, "Checking the file signature and privacy markers");
  const decoded = await decodeImage(file, maxPixels, options.signal);
  progress(options, 0.7, "Decoded oriented pixels; building an inspection preview");
  const preview = await makePreview(decoded.pixels, 1024, maxPixels);
  checkAborted(options.signal);
  progress(options, 1, "Inspection complete");
  return {
    ...decoded.info, width: decoded.pixels.width, height: decoded.pixels.height,
    hasAlpha: decoded.hasAlpha, gps: decoded.privacy.gps, cameraSerial: decoded.privacy.cameraSerial,
    metadataRead: decoded.privacy.metadataRead, orientation: decoded.privacy.orientation,
    preview, notices: [...new Set(decoded.notices)],
  };
}

interface Candidate extends EncodedImage {
  width: number;
  height: number;
  quality: number | null;
  comparisonError?: number;
}

/** Holds only the current dimension round and one prepared variant, not all
 * quality attempts. Every resize starts from the same cropped source rather
 * than repeatedly resizing a previously shrunk/quantized/compressed image. */
function pixelRounds(base: ImageData, settings: Readonly<ImageSettings>, maxPixels: number) {
  let resized = base;
  let reference: ImageData | undefined;
  let prepared: ImageData | undefined;
  let preparedFormat: OutputFormat | undefined;
  let notices: string[] = [];
  return {
    async get(format: OutputFormat, width: number, height: number) {
      if (resized.width !== width || resized.height !== height) {
        reference = undefined; prepared = undefined; preparedFormat = undefined;
        resized = await resizePixels(base, width, height, maxPixels);
      }
      if (preparedFormat !== format || !prepared || !reference) {
        reference = undefined; prepared = undefined;
        reference = format === "jpeg" ? flattenPixels(resized, settings.background, maxPixels) : resized;
        if (format === "png" && settings.paletteColors > 0) {
          const quantized = quantizePalette(reference, settings.paletteColors, maxPixels);
          prepared = quantized.pixels;
          notices = quantized.notices;
        } else { prepared = reference; notices = []; }
        preparedFormat = format;
      }
      return { reference, prepared, notices };
    },
    clear() { resized = base; reference = undefined; prepared = undefined; preparedFormat = undefined; notices = []; },
  };
}

export async function processImage(file: Blob, input: ImageSettings, maxPixels: number, options: PipelineOptions = {}): Promise<ImageResult> {
  budget(maxPixels);
  let settings: ImageSettings;
  try { settings = validateSettings(input); }
  catch { throw new StudioError("invalid", "Invalid image settings. Check the target, quality, dimensions and crop before retrying."); }
  progress(options, 0, "Checking image signature, dimensions and metadata");
  let { pixels: base, notices } = await decodeImage(file, maxPixels, options.signal);
  const explicit = computeDimensions(base.width, base.height, settings, maxPixels);
  progress(options, 0.12, "Cropping the oriented image and preparing Lanczos dimensions");
  base = cropPixels(base, settings.crop, maxPixels);
  base = await resizePixels(base, explicit.width, explicit.height, maxPixels);
  const alpha = hasTransparency(base);
  const automatic = settings.mode === "auto" || settings.format === "auto";
  const targetMode = settings.mode === "target" || settings.mode === "auto";
  const targetBytes = targetMode ? parseTarget(settings) : null;
  const smallest = automatic && settings.autoPreference === "smallest";
  const formats: OutputFormat[] = automatic
    ? ["jpeg", "webp", "avif"] : [settings.format as OutputFormat];
  if (alpha && !settings.allowJpegTransparency) {
    if (!automatic && formats[0] === "jpeg") throw new StudioError("invalid", "This image has transparency. Explicitly allow JPEG background flattening, or select PNG, WebP or AVIF.");
    if (automatic) {
      formats.splice(formats.indexOf("jpeg"), 1);
      notices.push("JPEG was excluded from automatic comparison because transparency flattening was not authorized.");
    }
  }
  const perRound = smallest ? 1 : TARGET_SEARCH_LIMITS.encodesPerRound;
  const rounds = settings.preserveDimensions ? 1 : TARGET_SEARCH_LIMITS.resizeRounds + 1;
  const plannedAttempts = formats.length * (targetMode ? perRound * rounds : 1);
  let attempts = 0;
  const candidates: Candidate[] = [];
  const unavailable: string[] = [];
  let firstFailure: unknown;
  const cache = pixelRounds(base, settings, maxPixels);
  try {
    for (const format of formats) {
      checkAborted(options.signal);
      const encoder = createEncoder(format, settings, maxPixels);
      const encode = async ({ width, height, quality }: { width: number; height: number; quality: number }): Promise<Candidate> => {
        checkAborted(options.signal);
        if (attempts >= plannedAttempts) throw new StudioError("resource", "The bounded encode-attempt budget was reached.");
        const pixels = await cache.get(format, width, height);
        checkAborted(options.signal);
        attempts++;
        progress(options, 0.22 + 0.58 * (attempts - 1) / plannedAttempts,
          `${format.toUpperCase()} encode attempt ${attempts} of at most ${plannedAttempts} (planned work budget)`);
        const output = await encoder.encode(pixels.prepared, quality);
        checkAborted(options.signal);
        return { ...output, width, height, quality: format === "png" ? null : quality, notices: [...output.notices, ...pixels.notices] };
      };
      try {
        let candidate: Candidate;
        if (targetBytes !== null) {
          const result = await searchTarget({
            width: base.width, height: base.height, targetBytes,
            minQuality: settings.minQuality,
            maxQuality: smallest ? settings.minQuality : Math.min(settings.quality, TARGET_SEARCH_LIMITS.qualityCeiling),
            preserveDimensions: settings.preserveDimensions, lossless: format === "png",
            maxEncodesPerRound: perRound, maxResizeRounds: TARGET_SEARCH_LIMITS.resizeRounds,
            signal: options.signal, encode,
            onAttempt(attempt) {
              progress(options, 0.22 + 0.58 * attempts / plannedAttempts,
                `${format.toUpperCase()} round ${attempt.round}: ${attempt.size.toLocaleString("en-US")} measured bytes; ${attempt.targetMet ? "within target" : "over target"}; ${attempts} encode attempts`);
            },
          });
          candidate = result.candidate;
        } else {
          candidate = await encode({ width: base.width, height: base.height, quality: smallest ? settings.minQuality : settings.quality });
        }
        candidates.push(candidate);
      } catch (error) {
        checkAborted(options.signal);
        if (!automatic) throw error;
        firstFailure ??= error;
        unavailable.push(format.toUpperCase());
      } finally { cache.clear(); }
    }
    if (!candidates.length) {
      if (firstFailure instanceof StudioError) throw firstFailure;
      throw new StudioError("codec", "None of the eligible formats could be encoded. Try a smaller image or another browser.");
    }
    if (unavailable.length) notices.push(`${unavailable.join(", ")} could not be encoded and was excluded; automatic comparison covers only the formats that completed.`);
    progress(options, 0.84, "Decoding candidate bytes for dimensions and sampled RGBA error");
    const verified: Candidate[] = [];
    for (const candidate of candidates) {
      checkAborted(options.signal);
      try {
        const { reference } = await cache.get(candidate.format, candidate.width, candidate.height);
        const decoded = await decodeOutput(candidate.blob, candidate.format, maxPixels);
        candidate.comparisonError = sampledRgbaError(reference, decoded);
        verified.push(candidate);
      } catch (error) {
        if (!automatic) throw error;
        notices.push(`${candidate.format.toUpperCase()} output could not be decoded for comparison and was excluded.`);
      } finally { cache.clear(); }
    }
    if (!verified.length) throw new StudioError("codec", "No encoded candidate passed decoded-pixel validation. No unverified download was returned.");
    const passing = targetBytes === null ? verified : verified.filter((candidate) => candidate.size <= targetBytes);
    const pool = passing.length ? passing : verified;
    pool.sort((a, b) => {
      if (!passing.length || smallest) return a.size - b.size || b.width * b.height - a.width * a.height || (a.comparisonError ?? 1) - (b.comparisonError ?? 1);
      return b.width * b.height - a.width * a.height || (a.comparisonError ?? 1) - (b.comparisonError ?? 1) || a.size - b.size;
    });
    const selected = pool[0];
    progress(options, 0.94, "Building the correctly cropped/resized pre-compression reference");
    const { reference: referencePixels } = await cache.get(selected.format, selected.width, selected.height);
    const reference = await makePreview(referencePixels, 1600, maxPixels);
    checkAborted(options.signal);
    const preview = previewDimensions(selected.width, selected.height, 1600);
    notices = [...notices, ...selected.notices, "All source EXIF, GPS, comments, thumbnails and camera metadata were discarded; output contains newly encoded pixels and encoder-generated format/color headers."];
    if (preview.width !== selected.width || preview.height !== selected.height) notices.push(`Comparison reference preview is limited to ${preview.width} × ${preview.height}; the downloaded image is ${selected.width} × ${selected.height}.`);
    if (alpha && selected.format === "jpeg") notices.push(`Transparency was flattened onto ${settings.background} with explicit consent. The comparison reference includes this same background.`);
    if (selected.width !== base.width || selected.height !== base.height) notices.push("Dimensions were reduced during the bounded target search, after the requested crop/resize.");
    if (automatic) notices.push(smallest
      ? "Automatic smallest preference compared completed formats at the selected minimum quality, choosing the smallest passing measured file (or smallest observed miss). Codec quality numbers are not equivalent."
      : "Automatic balanced preference chooses passing candidates by largest pixel area, then lowest sampled decoded RGBA mean absolute error, then byte size. This is not an objective perceptual-quality score or exhaustive optimum.");
    if (targetBytes !== null && selected.size > targetBytes) notices.push("The target was not reached within the quality, dimension and attempt limits. This is the smallest verified candidate observed; its real byte size is above the ceiling.");
    if (selected.format === "png" && settings.paletteColors === 0) notices.push("PNG optimization is lossless relative to the cropped/resized 8-bit working pixels; PNG has no quality slider.");
    progress(options, 1, "Processing complete; output bytes and dimensions verified");
    return {
      blob: selected.blob, reference, width: selected.width, height: selected.height,
      format: selected.format, quality: selected.quality, targetBytes,
      targetMet: targetBytes === null ? null : selected.blob.size <= targetBytes,
      attempts, codec: selected.codec, notices: [...new Set(notices)], comparisonError: selected.comparisonError,
    };
  } finally { cache.clear(); }
}