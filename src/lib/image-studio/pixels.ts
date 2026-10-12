import { getCropPixels, validateDimensions } from "./geometry";
import { IMAGE_LIMITS } from "./types";
import type { CropRect, Dimensions } from "./types";
import { StudioError } from "./codecs/errors";

export function checkDimensions(width: number, height: number, maxPixels: number): void {
  try { validateDimensions(width, height, maxPixels); }
  catch { throw new StudioError("resource", "Image dimensions exceed this worker's pixel budget or the 16,384-pixel side limit."); }
}

export function checkPixels(pixels: ImageData, maxPixels: number = IMAGE_LIMITS.pixels): void {
  if (!pixels || !(pixels.data instanceof Uint8ClampedArray)) throw new StudioError("codec", "The decoder did not return 8-bit RGBA pixels.");
  checkDimensions(pixels.width, pixels.height, maxPixels);
  if (pixels.data.byteLength !== pixels.width * pixels.height * 4) throw new StudioError("codec", "The decoder returned incomplete image pixels.");
}

export function imageData(data: Uint8ClampedArray, width: number, height: number, maxPixels: number = IMAGE_LIMITS.pixels): ImageData {
  checkDimensions(width, height, maxPixels);
  if (data.byteLength !== width * height * 4) throw new StudioError("codec", "The decoder returned incomplete image pixels.");
  if (typeof ImageData !== "function") throw new StudioError("unsupported", "This browser does not provide ImageData in workers. Use a current browser.");
  // Do not pass a shared WASM heap to ImageData, nor a wider underlying buffer.
  const owned = data.buffer instanceof ArrayBuffer
    ? new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength) : new Uint8ClampedArray(data);
  try { return new ImageData(owned, width, height, { colorSpace: "srgb" }); }
  catch { throw new StudioError("resource", "There is not enough worker memory for these image pixels. Try a smaller image."); }
}

export function hasTransparency(pixels: ImageData): boolean {
  for (let index = 3; index < pixels.data.length; index += 4) if (pixels.data[index] !== 255) return true;
  return false;
}

export function canvasFor(width: number, height: number, maxPixels: number = IMAGE_LIMITS.pixels): {
  canvas: OffscreenCanvas; context: OffscreenCanvasRenderingContext2D;
} {
  checkDimensions(width, height, maxPixels);
  if (typeof OffscreenCanvas !== "function") throw new StudioError("unsupported", "This browser does not support offscreen image processing in workers.");
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext("2d", { colorSpace: "srgb", willReadFrequently: true });
  if (!context) { releaseCanvas(canvas); throw new StudioError("unsupported", "An offscreen sRGB canvas is unavailable in this browser."); }
  return { canvas, context };
}

export function releaseCanvas(canvas: OffscreenCanvas): void {
  canvas.width = 0;
  canvas.height = 0;
}

export function cropPixels(source: ImageData, crop: CropRect | null, maxPixels: number): ImageData {
  checkPixels(source, maxPixels);
  const rectangle = getCropPixels(source.width, source.height, crop);
  if (rectangle.x === 0 && rectangle.y === 0 && rectangle.width === source.width && rectangle.height === source.height) return source;
  const data = new Uint8ClampedArray(rectangle.width * rectangle.height * 4);
  for (let y = 0; y < rectangle.height; y++) {
    const start = ((y + rectangle.y) * source.width + rectangle.x) * 4;
    data.set(source.data.subarray(start, start + rectangle.width * 4), y * rectangle.width * 4);
  }
  return imageData(data, rectangle.width, rectangle.height, maxPixels);
}

export async function resizePixels(source: ImageData, width: number, height: number, maxPixels: number): Promise<ImageData> {
  checkPixels(source, maxPixels);
  checkDimensions(width, height, maxPixels);
  if (source.width === width && source.height === height) return source;
  try {
    const { resize } = await import("./codecs/resize");
    return imageData(await resize(source, width, height), width, height, maxPixels);
  } catch (error) {
    if (error instanceof StudioError) throw error;
    // Do not silently advertise a browser bilinear resize as Lanczos.
    throw new StudioError("codec", "The local Lanczos resizer could not process this image. Retry with a smaller image or reload the codec pack.");
  }
}

export function previewDimensions(width: number, height: number, maximumSide: number): Dimensions {
  const scale = Math.min(1, maximumSide / Math.max(width, height));
  return { width: Math.max(1, Math.floor(width * scale)), height: Math.max(1, Math.floor(height * scale)) };
}

/** Only for decoders known to return unoriented pixels. Native bitmaps,
 * libheif and JPEG preserveOrientation:true must NEVER be passed here. */
export function orientPixels(source: ImageData, orientation: number, maxPixels: number): ImageData {
  checkPixels(source, maxPixels);
  if (orientation === 1) return source;
  if (!Number.isInteger(orientation) || orientation < 1 || orientation > 8) throw new StudioError("invalid", "The image has an invalid orientation marker.");
  const swapped = orientation >= 5;
  const width = swapped ? source.height : source.width;
  const height = swapped ? source.width : source.height;
  const result = new Uint8ClampedArray(source.data.length);
  for (let y = 0; y < source.height; y++) for (let x = 0; x < source.width; x++) {
    let dx = x;
    let dy = y;
    switch (orientation) {
      case 2: dx = source.width - 1 - x; break;
      case 3: dx = source.width - 1 - x; dy = source.height - 1 - y; break;
      case 4: dy = source.height - 1 - y; break;
      case 5: dx = y; dy = x; break;
      case 6: dx = source.height - 1 - y; dy = x; break;
      case 7: dx = source.height - 1 - y; dy = source.width - 1 - x; break;
      case 8: dx = y; dy = source.width - 1 - x; break;
    }
    const from = (y * source.width + x) * 4;
    const to = (dy * width + dx) * 4;
    result[to] = source.data[from]; result[to + 1] = source.data[from + 1];
    result[to + 2] = source.data[from + 2]; result[to + 3] = source.data[from + 3];
  }
  return imageData(result, width, height, maxPixels);
}

export function flattenPixels(source: ImageData, background: string, maxPixels: number): ImageData {
  checkPixels(source, maxPixels);
  if (!/^#[\da-f]{6}$/i.test(background)) throw new StudioError("invalid", "Choose a six-digit background color for JPEG.");
  if (!hasTransparency(source)) return source;
  const red = Number.parseInt(background.slice(1, 3), 16);
  const green = Number.parseInt(background.slice(3, 5), 16);
  const blue = Number.parseInt(background.slice(5, 7), 16);
  const result = new Uint8ClampedArray(source.data.length);
  for (let i = 0; i < result.length; i += 4) {
    const alpha = source.data[i + 3] / 255;
    result[i] = Math.round(source.data[i] * alpha + red * (1 - alpha));
    result[i + 1] = Math.round(source.data[i + 1] * alpha + green * (1 - alpha));
    result[i + 2] = Math.round(source.data[i + 2] * alpha + blue * (1 - alpha));
    result[i + 3] = 255;
  }
  return imageData(result, source.width, source.height, maxPixels);
}

/** Deterministic, bounded weighted median-cut quantizer. The histogram uses
 * 4 bits/RGB channel and 32 alpha buckets; never O(pixels * paletteColors).
 * Zero alpha is reserved exactly. Opaque/semitransparent groups are kept apart
 * when the requested palette can represent both. Partial alpha may be lossy. */
export function quantizePalette(source: ImageData, colors: number, maxPixels: number): { pixels: ImageData; notices: string[] } {
  checkPixels(source, maxPixels);
  if (!Number.isInteger(colors) || colors < 2 || colors > 256) throw new StudioError("invalid", "PNG palette reduction needs 2 to 256 colors.");
  const data = source.data;
  const exact = new Set<number>();
  for (let i = 0; i < data.length && exact.size <= colors; i += 4) {
    exact.add((data[i] | data[i + 1] << 8 | data[i + 2] << 16 | data[i + 3] << 24) >>> 0);
  }
  if (exact.size <= colors) return { pixels: source, notices: [`PNG already has at most ${colors} RGBA colors; palette reduction did not change its pixels.`] };
  const buckets = 131_072;
  const counts = new Uint32Array(buckets);
  const sums = Array.from({ length: 4 }, () => new Float64Array(buckets));
  let transparent = false;
  let partial = false;
  const key = (offset: number): number => {
    const a = data[offset + 3];
    const alpha = a === 255 ? 31 : 1 + Math.floor((a - 1) * 30 / 254);
    return (data[offset] >> 4) << 13 | (data[offset + 1] >> 4) << 9 | (data[offset + 2] >> 4) << 5 | alpha;
  };
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) { transparent = true; continue; }
    if (data[i + 3] !== 255) partial = true;
    const bin = key(i);
    counts[bin]++;
    for (let channel = 0; channel < 4; channel++) sums[channel][bin] += data[i + channel];
  }
  const bins: number[] = [];
  for (let bin = 0; bin < buckets; bin++) if (counts[bin]) bins.push(bin);
  const slots = colors - Number(transparent);
  type Box = { bins: number[]; count: number; axis: number; score: number };
  const makeBox = (entries: number[]): Box => {
    const low = [255, 255, 255, 255];
    const high = [0, 0, 0, 0];
    let count = 0;
    for (const bin of entries) {
      count += counts[bin];
      for (let channel = 0; channel < 4; channel++) {
        const value = sums[channel][bin] / counts[bin];
        low[channel] = Math.min(low[channel], value); high[channel] = Math.max(high[channel], value);
      }
    }
    let axis = 0;
    for (let channel = 1; channel < 4; channel++) {
      if ((high[channel] - low[channel]) * (channel === 3 ? 2 : 1)
        > (high[axis] - low[axis]) * (axis === 3 ? 2 : 1)) axis = channel;
    }
    return { bins: entries, count, axis, score: entries.length > 1 ? (high[axis] - low[axis]) * count : 0 };
  };
  const opaque = bins.filter((bin) => (bin & 31) === 31);
  const semi = bins.filter((bin) => (bin & 31) !== 31);
  const boxes = slots >= 2 && opaque.length && semi.length
    ? [makeBox(opaque), makeBox(semi)] : bins.length ? [makeBox(bins)] : [];
  while (boxes.length < slots) {
    let largest = -1;
    for (let index = 0; index < boxes.length; index++) {
      if (boxes[index].score > 0 && (largest < 0 || boxes[index].score > boxes[largest].score)) largest = index;
    }
    if (largest < 0) break;
    const box = boxes[largest];
    const axis = box.axis;
    box.bins.sort((a, b) => sums[axis][a] / counts[a] - sums[axis][b] / counts[b] || a - b);
    let middle = 0;
    let weight = 0;
    while (middle < box.bins.length - 1 && weight < box.count / 2) weight += counts[box.bins[middle++]];
    middle = Math.max(1, middle);
    boxes.splice(largest, 1, makeBox(box.bins.slice(0, middle)), makeBox(box.bins.slice(middle)));
  }
  const palette: number[][] = transparent ? [[0, 0, 0, 0]] : [];
  const assigned = new Uint8Array(buckets);
  for (const box of boxes) {
    const rgba = [0, 0, 0, 0];
    for (const bin of box.bins) for (let channel = 0; channel < 4; channel++) rgba[channel] += sums[channel][bin];
    for (let channel = 0; channel < 4; channel++) rgba[channel] = Math.round(rgba[channel] / box.count);
    for (const bin of box.bins) assigned[bin] = palette.length;
    palette.push(rgba);
  }
  const output = new Uint8ClampedArray(data.length);
  for (let i = 0; i < data.length; i += 4) {
    const rgba = data[i + 3] === 0 ? palette[0] : palette[assigned[key(i)]];
    for (let channel = 0; channel < 4; channel++) output[i + channel] = rgba[channel];
  }
  const notices = [`Lossy PNG palette reduction: at most ${colors} RGBA colors. This is separate from lossless PNG optimization.`];
  if (partial) notices.push("Palette reduction may change partially transparent alpha values; fully transparent pixels remain transparent.");
  return { pixels: imageData(output, source.width, source.height, maxPixels), notices };
}

/** At most 4,096 actual decoded pixel locations, all four 8-bit channels.
 * Returns normalized mean absolute error (0..1), NOT a perceptual score. */
export function sampledRgbaError(reference: ImageData, decoded: ImageData): number {
  checkPixels(reference); checkPixels(decoded);
  if (reference.width !== decoded.width || reference.height !== decoded.height) throw new StudioError("codec", "Encoded image dimensions do not match the reference pixels.");
  const columns = Math.min(64, reference.width);
  const rows = Math.min(64, reference.height);
  let error = 0;
  for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) {
    const x = Math.min(reference.width - 1, Math.floor((column + 0.5) * reference.width / columns));
    const y = Math.min(reference.height - 1, Math.floor((row + 0.5) * reference.height / rows));
    const start = (y * reference.width + x) * 4;
    for (let channel = 0; channel < 4; channel++) error += Math.abs(reference.data[start + channel] - decoded.data[start + channel]);
  }
  return error / (columns * rows * 4 * 255);
}