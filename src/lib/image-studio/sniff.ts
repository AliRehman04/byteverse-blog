import { IMAGE_LIMITS } from "./types";
import type { ImageMetadata, InputFormat } from "./types";
import { validateDimensions } from "./geometry";

/** Only framing/header bytes are inspected; compressed pixels are never decoded. */
export const SNIFF_LIMITS = Object.freeze({ headerBytes: 1_048_576, records: 512, gifBlocks: 4096 });

function matches(bytes: Uint8Array, offset: number, text: string): boolean {
  if (offset + text.length > bytes.length) return false;
  for (let index = 0; index < text.length; index++) if (bytes[offset + index] !== text.charCodeAt(index)) return false;
  return true;
}

function dimensions(format: InputFormat, mime: string, width: number, height: number, animated = false): ImageMetadata {
  validateDimensions(width, height);
  return { format, mime, width, height, animated };
}

function jpeg(bytes: Uint8Array, view: DataView): ImageMetadata | null {
  const sof = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
  const limit = Math.min(bytes.length, SNIFF_LIMITS.headerBytes);
  let offset = 2;
  for (let count = 0; count < SNIFF_LIMITS.records && offset < limit; count++) {
    if (bytes[offset++] !== 0xff) return null;
    while (offset < limit && bytes[offset] === 0xff) offset++;
    if (offset >= limit) return null;
    const marker = bytes[offset++];
    if (marker === 0 || marker === 0xd8 || marker === 0xd9 || marker === 0xda) return null;
    if (marker === 1 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > limit) return null;
    const length = view.getUint16(offset);
    if (length < 2 || offset + length > bytes.length) return null;
    if (sof.has(marker)) {
      if (length < 8 || offset + 8 > limit) return null;
      const components = bytes[offset + 7];
      if (components < 1 || components > 4 || length !== 8 + 3 * components
        || bytes[offset + 2] < 1 || bytes[offset + 2] > 16) return null;
      const height = view.getUint16(offset + 3);
      const width = view.getUint16(offset + 5);
      if (!width || !height) return null;
      return dimensions("jpeg", "image/jpeg", width, height);
    }
    offset += length; // Skip APP/EXIF data rather than looking for fake SOF bytes inside it.
  }
  return null;
}

function png(bytes: Uint8Array, view: DataView): ImageMetadata | null {
  if (bytes.length < 33 || view.getUint32(8) !== 13 || !matches(bytes, 12, "IHDR")) return null;
  const width = view.getUint32(16);
  const height = view.getUint32(20);
  const depths: Record<number, readonly number[]> = { 0: [1, 2, 4, 8, 16], 2: [8, 16], 3: [1, 2, 4, 8], 4: [8, 16], 6: [8, 16] };
  if (!width || !height || !depths[bytes[25]]?.includes(bytes[24]) || bytes[26] !== 0 || bytes[27] !== 0 || bytes[28] > 1) return null;
  const info = dimensions("png", "image/png", width, height);
  let offset = 33;
  for (let count = 0; count < SNIFF_LIMITS.records && offset < SNIFF_LIMITS.headerBytes && offset < bytes.length; count++) {
    if (offset + 12 > bytes.length) return null;
    const length = view.getUint32(offset);
    const end = offset + length + 12;
    if (end > bytes.length) return null;
    for (let index = offset + 4; index < offset + 8; index++) {
      const code = bytes[index];
      if (!(code >= 65 && code <= 90) && !(code >= 97 && code <= 122)) return null;
    }
    if (matches(bytes, offset + 4, "IHDR")) return null;
    if (matches(bytes, offset + 4, "acTL")) {
      if (length !== 8 || info.animated || view.getUint32(offset + 8) === 0) return null;
      info.animated = true;
    }
    // acTL must precede IDAT. Do not scan compressed data for an animation string.
    if (matches(bytes, offset + 4, "IDAT")) return info;
    if (matches(bytes, offset + 4, "IEND")) return length === 0 ? info : null;
    offset = end;
  }
  info.animationUnknown = !info.animated;
  return info;
}

function uint24(view: DataView, offset: number): number {
  return view.getUint16(offset, true) + view.getUint8(offset + 2) * 65_536;
}

function webp(bytes: Uint8Array, view: DataView): ImageMetadata | null {
  if (bytes.length < 20) return null;
  const end = view.getUint32(4, true) + 8;
  if (end > bytes.length || end < 20 || end % 2 !== 0) return null;
  let offset = 12;
  let width: number | undefined;
  let height: number | undefined;
  let animated = false;
  let extended = false;
  for (let count = 0; count < SNIFF_LIMITS.records && offset < end && offset < SNIFF_LIMITS.headerBytes; count++) {
    if (offset + 8 > end) return null;
    const length = view.getUint32(offset + 4, true);
    const data = offset + 8;
    const next = data + length + (length % 2);
    if (next > end) return null;
    let frameWidth: number | undefined;
    let frameHeight: number | undefined;
    if (matches(bytes, offset, "VP8X")) {
      if (extended || length !== 10 || (bytes[data] & 0xc1) !== 0 || bytes[data + 1] || bytes[data + 2] || bytes[data + 3]) return null;
      extended = true;
      animated = animated || (bytes[data] & 2) !== 0;
      width = uint24(view, data + 4) + 1;
      height = uint24(view, data + 7) + 1;
      validateDimensions(width, height);
    } else if (matches(bytes, offset, "VP8L")) {
      if (length < 5 || bytes[data] !== 0x2f) return null;
      const bits = view.getUint32(data + 1, true);
      if ((bits >>> 29) !== 0) return null;
      frameWidth = (bits & 0x3fff) + 1;
      frameHeight = ((bits >>> 14) & 0x3fff) + 1;
    } else if (matches(bytes, offset, "VP8 ")) {
      if (length < 10 || (bytes[data] & 1) !== 0 || !matches(bytes, data + 3, "\x9d\x01\x2a")) return null;
      frameWidth = view.getUint16(data + 6, true) & 0x3fff;
      frameHeight = view.getUint16(data + 8, true) & 0x3fff;
      if (!frameWidth || !frameHeight) return null;
    } else if (matches(bytes, offset, "ANIM")) {
      if (length !== 6) return null;
      animated = true;
    } else if (matches(bytes, offset, "ANMF")) {
      if (!extended || length < 16) return null;
      animated = true;
    }
    if (frameWidth !== undefined && frameHeight !== undefined) {
      if (width !== undefined && (width !== frameWidth || height !== frameHeight)) return null;
      validateDimensions(frameWidth, frameHeight);
      width = frameWidth;
      height = frameHeight;
    }
    offset = next;
  }
  return width === undefined || height === undefined ? null : dimensions("webp", "image/webp", width, height, animated);
}

function gif(bytes: Uint8Array, view: DataView): ImageMetadata | null {
  if (bytes.length < 13) return null;
  const width = view.getUint16(6, true);
  const height = view.getUint16(8, true);
  if (!width || !height) return null;
  const info = dimensions("gif", "image/gif", width, height);
  let offset = 13 + ((bytes[10] & 0x80) ? 3 * 2 ** ((bytes[10] & 7) + 1) : 0);
  if (offset > bytes.length) return null;
  let records = 0;
  let frames = 0;
  // null = truncated framing; undefined = reached the bounded inspection budget.
  const skipBlocks = (start: number): number | null | undefined => {
    let position = start;
    while (records++ < SNIFF_LIMITS.gifBlocks && position < SNIFF_LIMITS.headerBytes) {
      if (position >= bytes.length) return null;
      const size = bytes[position++];
      if (position + size > bytes.length) return null;
      if (size === 0) return position;
      position += size;
    }
    return undefined;
  };
  while (offset < bytes.length && offset < SNIFF_LIMITS.headerBytes && records++ < SNIFF_LIMITS.gifBlocks) {
    const block = bytes[offset];
    if (block === 0x3b) return frames > 0 ? info : null;
    let next: number | null | undefined;
    if (block === 0x21) {
      if (offset + 2 > bytes.length) return null;
      next = skipBlocks(offset + 2);
    } else if (block === 0x2c) {
      if (offset + 10 > bytes.length) return null;
      const frameWidth = view.getUint16(offset + 5, true);
      const frameHeight = view.getUint16(offset + 7, true);
      if (!frameWidth || !frameHeight || view.getUint16(offset + 1, true) + frameWidth > width
        || view.getUint16(offset + 3, true) + frameHeight > height) return null;
      const packed = bytes[offset + 9];
      const codePosition = offset + 10 + ((packed & 0x80) ? 3 * 2 ** ((packed & 7) + 1) : 0);
      if (codePosition >= bytes.length || bytes[codePosition] < 2 || bytes[codePosition] > 8) return null;
      next = skipBlocks(codePosition + 1);
      frames++;
    } else return null;
    if (next === null) return null;
    if (frames >= 2) { info.animated = true; return info; }
    if (next === undefined) break;
    offset = next;
  }
  info.animationUnknown = true;
  return info;
}

function bmp(bytes: Uint8Array, view: DataView): ImageMetadata | null {
  if (bytes.length < 26) return null;
  const dibSize = view.getUint32(14, true);
  if (dibSize !== 12 && ![40, 52, 56, 108, 124].includes(dibSize)) return null;
  if (14 + dibSize > bytes.length) return null;
  const declared = view.getUint32(2, true);
  const pixels = view.getUint32(10, true);
  if ((declared !== 0 && (declared > bytes.length || declared < 14 + dibSize))
    || pixels < 14 + dibSize || pixels > (declared || bytes.length)) return null;
  let width: number;
  let height: number;
  if (dibSize === 12) {
    width = view.getUint16(18, true);
    height = view.getUint16(20, true);
    if (view.getUint16(22, true) !== 1 || ![1, 4, 8, 24].includes(view.getUint16(24, true))) return null;
  } else {
    width = view.getInt32(18, true);
    const signedHeight = view.getInt32(22, true);
    height = Math.abs(signedHeight);
    const depth = view.getUint16(28, true);
    const compression = view.getUint32(30, true);
    if (view.getUint16(26, true) !== 1 || ![1, 4, 8, 16, 24, 32].includes(depth)
      || ![0, 1, 2, 3, 6].includes(compression)
      || (compression === 1 && depth !== 8) || (compression === 2 && depth !== 4)
      || ([3, 6].includes(compression) && ![16, 32].includes(depth))
      || (signedHeight < 0 && [1, 2].includes(compression))) return null;
  }
  if (width <= 0 || height <= 0) return null;
  return dimensions("bmp", "image/bmp", width, height);
}

function isoImage(bytes: Uint8Array, view: DataView): ImageMetadata | null {
  let offset = 0;
  for (let count = 0; count < SNIFF_LIMITS.records && offset + 8 <= Math.min(bytes.length, SNIFF_LIMITS.headerBytes); count++) {
    let size = view.getUint32(offset);
    let header = 8;
    if (size === 1) {
      if (offset + 16 > bytes.length) return null;
      size = view.getUint32(offset + 8) * 4_294_967_296 + view.getUint32(offset + 12);
      header = 16;
    } else if (size === 0) size = bytes.length - offset;
    if (!Number.isSafeInteger(size) || size < header || offset + size > bytes.length) return null;
    if (matches(bytes, offset + 4, "ftyp")) {
      if (size < header + 8 || (size - header - 8) % 4 !== 0
        || offset + size > SNIFF_LIMITS.headerBytes || (size - header) / 4 > SNIFF_LIMITS.records) return null;
      const brands = new Set<string>();
      for (let position = offset + header; position < offset + size; position += 4) {
        if (position === offset + header + 4) continue; // Minor version, not a brand.
        brands.add(String.fromCharCode(bytes[position], bytes[position + 1], bytes[position + 2], bytes[position + 3]));
      }
      const avif = brands.has("avif") || brands.has("avis");
      const heic = ["heic", "heix", "hevc", "hevx", "heim", "heis", "hevm", "hevs"].some((brand) => brands.has(brand));
      if (!avif && !heic && !brands.has("mif1") && !brands.has("msf1")) return null;
      const animated = ["avis", "msf1", "hevc", "hevx", "hevm", "hevs"].some((brand) => brands.has(brand));
      // An arbitrary ispe can describe a thumbnail/tile, not the primary image.
      // Do not guess dimensions without pitm/ipma associations; the worker MUST
      // inspect the selected decoded image before allocating further buffers.
      return { format: avif ? "avif" : "heic", mime: avif ? "image/avif" : heic ? "image/heic" : "image/heif", animated };
    }
    if (!matches(bytes, offset + 4, "free") && !matches(bytes, offset + 4, "skip") && !matches(bytes, offset + 4, "wide")) return null;
    offset += size;
  }
  return null;
}

/** Header identification, NOT proof a decoder will accept the entire file.
 * Returns null for unsupported/demonstrably corrupt headers (including SVG/text).
 * Throws on byte/pixel resource violations or a non-Uint8Array input. Known
 * dimensions are encoded dimensions; orientation belongs to the decoder.
 * CRCs, compressed pixels and complete animation streams are not validated here.
 */
export function sniffImage(bytes: Uint8Array): ImageMetadata | null {
  if (!ArrayBuffer.isView(bytes) || Object.prototype.toString.call(bytes) !== "[object Uint8Array]") {
    throw new TypeError("Image sniffing requires a Uint8Array.");
  }
  if (bytes.byteLength > IMAGE_LIMITS.fileBytes) throw new RangeError("Image exceeds the 50,000,000-byte file budget.");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xd8) return jpeg(bytes, view);
  if (matches(bytes, 0, "\x89PNG\r\n\x1a\n")) return png(bytes, view);
  if (matches(bytes, 0, "RIFF") && matches(bytes, 8, "WEBP")) return webp(bytes, view);
  if (matches(bytes, 0, "GIF87a") || matches(bytes, 0, "GIF89a")) return gif(bytes, view);
  if (matches(bytes, 0, "BM")) return bmp(bytes, view);
  return isoImage(bytes, view);
}