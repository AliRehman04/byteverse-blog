import type { ImageMetadata } from "./types";
import { readIsoMetadata } from "./codecs/isobmff";

export interface PrivacyMetadata {
  gps: boolean;
  cameraSerial: boolean;
  metadataRead: boolean;
  orientation: number;
  hasColorProfile: boolean;
  notices: string[];
}

const MAX_RECORDS = 4096;
const MAX_EXIF_BYTES = 1_048_576;
const MAX_EXIF_BLOCKS = 8;
const SCOPE_NOTICE = "Privacy inspection checks standard EXIF GPS/serial markers, not every possible metadata convention. Source metadata is never copied to outputs.";

function textAt(bytes: Uint8Array, offset: number, value: string): boolean {
  if (offset + value.length > bytes.length) return false;
  for (let index = 0; index < value.length; index++) if (bytes[offset + index] !== value.charCodeAt(index)) return false;
  return true;
}

interface MetadataBlocks { tiffs: Uint8Array[]; profile: boolean; complete: boolean; other: boolean }

/** Parse only container framing. Never search compressed pixel bytes for a
 * metadata string; never decode PNG text, XML, coordinates or profile bodies. */
function findBlocks(bytes: Uint8Array, format: ImageMetadata["format"]): MetadataBlocks {
  const result: MetadataBlocks = { tiffs: [], profile: false, complete: true, other: false };
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const addTiff = (start: number, end: number) => {
    if (textAt(bytes, start, "Exif\0\0")) start += 6;
    if (end <= start || end - start > MAX_EXIF_BYTES || result.tiffs.length >= MAX_EXIF_BLOCKS) {
      result.complete = false;
      return;
    }
    result.tiffs.push(bytes.subarray(start, end));
  };
  let position = format === "jpeg" ? 2 : format === "png" ? 8 : 12;
  for (let record = 0; record < MAX_RECORDS && position < bytes.length; record++) {
    if (format === "jpeg") {
      if (bytes[position++] !== 255) { result.complete = false; return result; }
      while (position < bytes.length && bytes[position] === 255) position++;
      const marker = bytes[position++];
      if (marker === 0xda || marker === 0xd9) return result;
      if (marker === 1 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      if (position + 2 > bytes.length) { result.complete = false; return result; }
      const length = view.getUint16(position);
      const end = position + length;
      if (length < 2 || end > bytes.length) { result.complete = false; return result; }
      const start = position + 2;
      if (marker === 0xe1 && textAt(bytes, start, "Exif\0\0")) addTiff(start, end);
      else if (marker === 0xe1 || marker === 0xed || marker === 0xfe) result.other = true;
      if (marker === 0xe2 && textAt(bytes, start, "ICC_PROFILE\0")) result.profile = true;
      position = end;
    } else {
      const png = format === "png";
      if (position + (png ? 12 : 8) > bytes.length) { result.complete = false; return result; }
      const length = view.getUint32(position + (png ? 0 : 4), !png);
      const name = position + (png ? 4 : 0);
      const start = position + 8;
      const end = start + length;
      const next = end + (png ? 4 : length % 2);
      if (next > bytes.length) { result.complete = false; return result; }
      if (textAt(bytes, name, png ? "eXIf" : "EXIF")) addTiff(start, end);
      if (textAt(bytes, name, png ? "iCCP" : "ICCP")) result.profile = true;
      if (png ? ["tEXt", "zTXt", "iTXt"].some((tag) => textAt(bytes, name, tag)) : textAt(bytes, name, "XMP ")) result.other = true;
      position = next;
      if (png && textAt(bytes, name, "IEND")) return result;
    }
  }
  if (position < bytes.length) result.complete = false;
  return result;
}

const options = Object.freeze({
  // Numeric tags + sanitize:false keep the GPS IFD *pointer*, but gps:false
  // prevents reading any coordinate values. Maker notes, comments, thumbnails,
  // ICC payloads and XMP are not parsed. Only the booleans below escape.
  tiff: {},
  ifd0: { pick: [0x0112, 0x8825, 0xc62f] },
  exif: { pick: [0xa431, 0xa435, 0xfde9, 0xa001] },
  gps: false, ifd1: false, interop: false, makerNote: false, userComment: false,
  xmp: false, icc: false, iptc: false, jfif: false, ihdr: false,
  sanitize: false, translateKeys: false, translateValues: false, reviveValues: false,
  mergeOutput: true, silentErrors: false,
});

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

export async function readMetadata(bytes: Uint8Array, info: ImageMetadata): Promise<PrivacyMetadata> {
  const result: PrivacyMetadata = {
    gps: false, cameraSerial: false, metadataRead: false, orientation: 1,
    hasColorProfile: false, notices: [SCOPE_NOTICE],
  };
  if (info.format === "gif" || info.format === "bmp") {
    result.notices.push("Detailed privacy metadata inspection is unavailable for this input format; missing findings do not mean that no metadata exists.");
    return result;
  }
  try {
    const iso = info.format === "heic" || info.format === "avif";
    const blocks = iso ? readIsoMetadata(bytes) : findBlocks(bytes, info.format);
    result.hasColorProfile = blocks.profile;
    let complete = blocks.complete;
    // Do not load EXIF code for files with no EXIF blocks. Only bounded TIFF
    // blocks reach exifr, never an unchecked HEIF box walk or a remote URL.
    if (blocks.tiffs.length) {
      const { parse } = await import("exifr");
      let knownOrientation: number | undefined;
      for (const tiff of blocks.tiffs) {
        const raw = record(await parse(tiff, options) as unknown);
        if (!raw) continue;
        if (Array.isArray(raw.errors) && raw.errors.length) complete = false;
        if (Object.prototype.hasOwnProperty.call(raw, "34853") && Number(raw["34853"]) > 0) result.gps = true;
        if (["42033", "42037", "65001", "50735"].some((tag) => Object.prototype.hasOwnProperty.call(raw, tag))) result.cameraSerial = true;
        if (raw["40961"] !== undefined && raw["40961"] !== 1) result.hasColorProfile = true;
        if (raw["274"] !== undefined) {
          const orientation = raw["274"];
          if (typeof orientation !== "number" || !Number.isInteger(orientation) || orientation < 1 || orientation > 8
            || (knownOrientation !== undefined && knownOrientation !== orientation)) complete = false;
          else { result.orientation = orientation; knownOrientation = orientation; }
        }
        // raw is scoped to this iteration; no serial, pointer or other tag value
        // is attached to the result, cached, logged or sent back to the caller.
      }
    }
    result.metadataRead = complete && !blocks.other;
    if (blocks.other) result.notices.push("Additional text/XMP/IPTC metadata was not interpreted; GPS/serial findings may be incomplete. It is still discarded on re-encoding.");
    if (!complete) result.notices.push("Some metadata could not be read completely; absent privacy findings are unknown, not proof of absence.");
    if (iso) result.notices.push("HEIF/AVIF container rotation is handled by the decoder, independently of the reported EXIF orientation marker.");
    if (result.hasColorProfile) result.notices.push("A color-profile marker was found. Working pixels use 8-bit sRGB; the original profile and HDR metadata are not retained.");
  } catch {
    result.metadataRead = false;
    result.notices.push("Privacy metadata could not be read. GPS/serial absence is unknown; all source metadata is still discarded when pixels are re-encoded.");
  }
  return result;
}