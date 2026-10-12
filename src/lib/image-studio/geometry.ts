import { IMAGE_LIMITS } from "./types";
import type { CropPixels, CropRect, Dimensions, ImageSettings } from "./types";

function integer(value: number, minimum: number, maximum: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new RangeError(`${label} must be a finite integer from ${minimum} to ${maximum}.`);
  }
}

/** Use before decode when dimensions are known, and again on actual decoded pixels. */
export function validateDimensions(width: number, height: number, maxPixels: number = IMAGE_LIMITS.pixels): void {
  integer(maxPixels, 1, IMAGE_LIMITS.pixels, "Pixel budget");
  integer(width, 1, IMAGE_LIMITS.maxDimension, "Width");
  integer(height, 1, IMAGE_LIMITS.maxDimension, "Height");
  if (width * height > maxPixels) throw new RangeError("Image exceeds the decoded pixel budget.");
}

/** Clip a finite positive rectangle to the image; an empty intersection is invalid. */
export function normalizeCrop(crop: CropRect | null): CropRect | null {
  if (crop === null) return null;
  if (!crop || typeof crop !== "object"
    || ![crop.x, crop.y, crop.width, crop.height].every(Number.isFinite)
    || crop.width <= 0 || crop.height <= 0) {
    throw new RangeError("Crop must have finite coordinates and positive area.");
  }
  const x = Math.max(0, Math.min(1, crop.x));
  const y = Math.max(0, Math.min(1, crop.y));
  const right = Math.max(0, Math.min(1, crop.x + crop.width));
  const bottom = Math.max(0, Math.min(1, crop.y + crop.height));
  if (right <= x || bottom <= y) throw new RangeError("Crop does not intersect the image.");
  return { x, y, width: right - x, height: bottom - y };
}

/** Cover the normalized crop with integral source pixels, without leaving the image. */
export function getCropPixels(width: number, height: number, crop: CropRect | null): CropPixels {
  validateDimensions(width, height);
  const rect = normalizeCrop(crop);
  if (rect === null) return { x: 0, y: 0, width, height };
  // Avoid an extra pixel from e.g. (0.1 + 0.2) * 100 = 30.000000000000004.
  const x = Math.min(width - 1, Math.floor(rect.x * width + 1e-9));
  const y = Math.min(height - 1, Math.floor(rect.y * height + 1e-9));
  const right = Math.min(width, Math.max(x + 1, Math.ceil((rect.x + rect.width) * width - 1e-9)));
  const bottom = Math.min(height, Math.max(y + 1, Math.ceil((rect.y + rect.height) * height - 1e-9)));
  return { x, y, width: right - x, height: bottom - y };
}

/** Explicit crop/resize happens first. preserveDimensions prevents automatic
 * budget shrinking, not a user's explicit crop or resize. Target-search resizing
 * is a separate step. maxPixels is the OUTPUT budget; decode uses its own check.
 */
export function computeDimensions(
  width: number,
  height: number,
  settings: Readonly<ImageSettings>,
  maxPixels: number = IMAGE_LIMITS.pixels,
): Dimensions {
  validateDimensions(width, height);
  integer(maxPixels, 1, IMAGE_LIMITS.pixels, "Pixel budget");
  if (typeof settings.allowUpscale !== "boolean" || typeof settings.lockAspect !== "boolean"
    || typeof settings.preserveDimensions !== "boolean") throw new TypeError("Resize flags must be booleans.");
  const source = getCropPixels(width, height, settings.crop);
  let nextWidth = source.width;
  let nextHeight = source.height;
  let scale = 1;
  switch (settings.resizeMode) {
    case "none": break;
    case "dimensions":
      integer(settings.width, 1, IMAGE_LIMITS.maxDimension, "Requested width");
      integer(settings.height, 1, IMAGE_LIMITS.maxDimension, "Requested height");
      if (settings.lockAspect) scale = Math.min(settings.width / source.width, settings.height / source.height);
      else {
        nextWidth = settings.allowUpscale ? settings.width : Math.min(settings.width, source.width);
        nextHeight = settings.allowUpscale ? settings.height : Math.min(settings.height, source.height);
      }
      break;
    case "percent":
      integer(settings.percent, 1, 1000, "Resize percent");
      scale = settings.percent / 100;
      break;
    case "longest":
      integer(settings.longestSide, 1, IMAGE_LIMITS.maxDimension, "Longest side");
      scale = settings.longestSide / Math.max(source.width, source.height);
      break;
    default: throw new TypeError("Unknown resize mode.");
  }
  if (!settings.allowUpscale) scale = Math.min(1, scale);
  nextWidth *= scale;
  nextHeight *= scale;
  const bound = Math.min(1, IMAGE_LIMITS.maxDimension / nextWidth, IMAGE_LIMITS.maxDimension / nextHeight,
    Math.sqrt(maxPixels / (nextWidth * nextHeight)));
  if (bound < 1 && settings.preserveDimensions) {
    throw new RangeError("Preserved dimensions exceed the output budget; choose a smaller explicit resize.");
  }
  nextWidth = Math.max(1, Math.floor(nextWidth * bound));
  nextHeight = Math.max(1, Math.floor(nextHeight * bound));
  // A very thin image can hit the one-pixel floor on one axis after scaling.
  if (nextWidth * nextHeight > maxPixels) {
    if (nextWidth >= nextHeight) nextWidth = Math.max(1, Math.floor(maxPixels / nextHeight));
    else nextHeight = Math.max(1, Math.floor(maxPixels / nextWidth));
  }
  validateDimensions(nextWidth, nextHeight, maxPixels);
  return { width: nextWidth, height: nextHeight };
}

/** Area-based estimate only, not a promise of encoded size. Reduce by at most
 * 4x per axis per round, with 5% headroom and never upscale an already-fit image.
 */
export function estimateScale(targetBytes: number, currentBytes: number): number {
  integer(targetBytes, 1, IMAGE_LIMITS.maxOutputBytes, "Target bytes");
  integer(currentBytes, 1, IMAGE_LIMITS.maxOutputBytes, "Encoded bytes");
  return currentBytes <= targetBytes ? 1 : Math.max(0.25, Math.min(0.95, Math.sqrt(targetBytes / currentBytes) * 0.95));
}