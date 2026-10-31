import { Gunzip, Unzip, UnzipInflate, unzipSync } from "fflate";
import { STUDIO_LIMITS, StudioError, encodingLabel, type EncodingId, type EncodingLabResult } from "./types";

// Explicit 0x80..0x9f mapping: browsers and Node builds disagree on this range.
const WINDOWS_1252 = [
  0x20ac, 0x0081, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021, 0x02c6, 0x2030, 0x0160, 0x2039, 0x0152, 0x008d, 0x017d, 0x008f,
  0x0090, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2013, 0x2014, 0x02dc, 0x2122, 0x0161, 0x203a, 0x0153, 0x009d, 0x017e, 0x0178,
] as const;

export const MOJIBAKE = /Ã[\u0080-\u00bf\u0152\u0153\u0160\u0161\u0178\u017d\u017e\u0192\u02c6\u02dc\u2013\u2014\u2018-\u201e\u2020-\u2022\u2026\u2030\u2039\u203a\u20ac\u2122]|Â[\u00a0-\u00bf]|â€|ðŸ/g;

const TEXT_EXTENSIONS = /\.(csv|tsv|tab|txt|psv|dat)$/i;

export interface Unwrapped { bytes: Uint8Array; container: "plain" | "gzip" | "zip"; innerName: string | null }

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  return signature.every((value, index) => bytes[index] === value);
}

function refuseKnownBinary(bytes: Uint8Array): void {
  if (startsWith(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) {
    throw new StudioError("XLS_FILE", "This is a legacy Excel workbook (.xls), not a CSV. Open it in Excel and choose File → Save As → CSV UTF-8, then import that file.");
  }
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46])) throw new StudioError("PDF_FILE", "This is a PDF, not delimited text. For invoice PDFs, try ByteVerse Invoice PDF to Excel instead.");
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47]) || startsWith(bytes, [0xff, 0xd8, 0xff]) || startsWith(bytes, [0x47, 0x49, 0x46, 0x38])) {
    throw new StudioError("IMAGE_FILE", "This is an image file. CSV Studio reads delimited text such as .csv, .tsv or .txt.");
  }
}

function collect(chunks: Uint8Array[], total: number): Uint8Array {
  const output = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { output.set(chunk, offset); offset += chunk.length; }
  return output;
}

function tooLarge(): StudioError {
  return new StudioError("FILE_LIMIT", `The decompressed file is larger than ${STUDIO_LIMITS.maxBytes / 1048576} MB. Split it into smaller CSV files.`);
}

/** Accept plain text, a .gz stream, or a .zip holding exactly one delimited text file. */
export function unwrapContainer(bytes: Uint8Array): Unwrapped {
  refuseKnownBinary(bytes);
  if (startsWith(bytes, [0x1f, 0x8b])) {
    const chunks: Uint8Array[] = [];
    let total = 0;
    try {
      const gunzip = new Gunzip((chunk) => {
        total += chunk.length;
        if (total > STUDIO_LIMITS.maxBytes) throw tooLarge();
        chunks.push(chunk);
      });
      gunzip.push(bytes, true);
    } catch (error) {
      if (error instanceof StudioError) throw error;
      throw new StudioError("GZIP_ERROR", "This .gz file could not be decompressed. It may be incomplete or damaged.");
    }
    const inner = collect(chunks, total);
    refuseKnownBinary(inner);
    return { bytes: inner, container: "gzip", innerName: null };
  }
  if (startsWith(bytes, [0x50, 0x4b, 0x03, 0x04]) || startsWith(bytes, [0x50, 0x4b, 0x05, 0x06])) {
    const entries: { name: string; originalSize: number }[] = [];
    try {
      unzipSync(bytes, { filter: (file) => { entries.push({ name: file.name, originalSize: file.originalSize }); return false; } });
    } catch {
      throw new StudioError("ZIP_ERROR", "This ZIP archive could not be read. It may be incomplete or damaged.");
    }
    const names = new Set(entries.map((entry) => entry.name));
    if (names.has("[Content_Types].xml") && [...names].some((name) => name.startsWith("xl/"))) {
      throw new StudioError("XLSX_FILE", "This is an Excel workbook (.xlsx), not a CSV. CSV Studio repairs delimited text. Open the workbook in Excel and save the sheet as CSV UTF-8, or import the original CSV.");
    }
    const candidates = entries.filter((entry) => !entry.name.endsWith("/") && !entry.name.startsWith("__MACOSX/") && !/(^|\/)\.DS_Store$/.test(entry.name));
    const text = candidates.filter((entry) => TEXT_EXTENSIONS.test(entry.name));
    if (text.length !== 1 || candidates.length !== 1) {
      throw new StudioError("ZIP_CONTENTS", text.length === 0
        ? "This ZIP archive doesn’t contain a .csv, .tsv or .txt file."
        : "This ZIP archive contains more than one file. Extract the CSV you need and import it directly.");
    }
    const target = text[0];
    if (target.originalSize > STUDIO_LIMITS.maxBytes) throw tooLarge();
    const chunks: Uint8Array[] = [];
    let total = 0;
    let found = false;
    try {
      const unzip = new Unzip((file) => {
        if (file.name !== target.name) return;
        found = true;
        file.ondata = (error, chunk) => {
          if (error) throw error;
          total += chunk.length;
          if (total > STUDIO_LIMITS.maxBytes) throw tooLarge();
          chunks.push(chunk);
        };
        file.start();
      });
      unzip.register(UnzipInflate);
      unzip.push(bytes, true);
    } catch (error) {
      if (error instanceof StudioError) throw error;
      throw new StudioError("ZIP_ERROR", "The CSV inside this ZIP archive could not be extracted. The archive may be damaged or use unsupported compression.");
    }
    if (!found) throw new StudioError("ZIP_ERROR", "The CSV inside this ZIP archive could not be located.");
    const inner = collect(chunks, total);
    refuseKnownBinary(inner);
    return { bytes: inner, container: "zip", innerName: target.name };
  }
  return { bytes, container: "plain", innerName: null };
}

export function bomOf(bytes: Uint8Array): { encoding: EncodingId; length: number } | null {
  if (startsWith(bytes, [0xef, 0xbb, 0xbf])) return { encoding: "utf-8", length: 3 };
  if (startsWith(bytes, [0xff, 0xfe, 0x00, 0x00]) || startsWith(bytes, [0x00, 0x00, 0xfe, 0xff])) {
    throw new StudioError("UNSUPPORTED_ENCODING", "UTF-32 files aren’t supported. Save the file as UTF-8 and import it again.");
  }
  if (startsWith(bytes, [0xff, 0xfe])) return { encoding: "utf-16le", length: 2 };
  if (startsWith(bytes, [0xfe, 0xff])) return { encoding: "utf-16be", length: 2 };
  return null;
}

/** Index of the first byte that breaks UTF-8, or -1 when every sequence is valid. */
export function firstInvalidUtf8(bytes: Uint8Array): number {
  const length = bytes.length;
  for (let index = 0; index < length;) {
    const byte = bytes[index];
    if (byte < 0x80) { index++; continue; }
    let needed: number;
    let min: number;
    if (byte >= 0xc2 && byte <= 0xdf) { needed = 1; min = 0x80; }
    else if (byte >= 0xe0 && byte <= 0xef) { needed = 2; min = 0x800; }
    else if (byte >= 0xf0 && byte <= 0xf4) { needed = 3; min = 0x10000; }
    else return index;
    if (index + needed >= length) return index;
    let code = byte & (needed === 1 ? 0x1f : needed === 2 ? 0x0f : 0x07);
    for (let step = 1; step <= needed; step++) {
      const next = bytes[index + step];
      if (next === undefined || (next & 0xc0) !== 0x80) return index;
      code = (code << 6) | (next & 0x3f);
    }
    if (code < min || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) return index;
    index += needed + 1;
  }
  return -1;
}

function utf16Guess(bytes: Uint8Array): EncodingId | null {
  const sample = Math.min(bytes.length - (bytes.length % 2), 8192);
  if (sample < 8) return null;
  let evenZero = 0;
  let oddZero = 0;
  for (let index = 0; index < sample; index += 2) {
    if (bytes[index] === 0) evenZero++;
    if (bytes[index + 1] === 0) oddZero++;
  }
  const pairs = sample / 2;
  if (oddZero / pairs > 0.3 && evenZero / pairs < 0.05) return "utf-16le";
  if (evenZero / pairs > 0.3 && oddZero / pairs < 0.05) return "utf-16be";
  return null;
}

export interface EncodingDecision { encoding: EncodingId; reason: string; bom: EncodingId | null }

export function detectEncoding(bytes: Uint8Array): EncodingDecision {
  const bom = bomOf(bytes);
  if (bom) return { encoding: bom.encoding, bom: bom.encoding, reason: `${encodingLabel(bom.encoding)} byte-order mark found at the start of the file.` };
  const wide = utf16Guess(bytes);
  if (wide) return { encoding: wide, bom: null, reason: `No byte-order mark, but every other byte is zero, which matches ${encodingLabel(wide)} text.` };
  const invalid = firstInvalidUtf8(bytes);
  if (invalid === -1) {
    const ascii = bytes.every((value) => value < 0x80);
    return { encoding: "utf-8", bom: null, reason: ascii ? "Only plain ASCII characters were found, so UTF-8 reads them exactly." : "Every multi-byte sequence is valid UTF-8." };
  }
  return {
    encoding: "windows-1252",
    bom: null,
    reason: `Not valid UTF-8 (byte ${invalid.toLocaleString("en-US")} breaks a UTF-8 sequence), so it was read as Windows-1252, the usual Excel-for-Windows encoding. Check accented names in the Encoding Lab.`,
  };
}

function singleByte(bytes: Uint8Array, table: readonly number[] | null): string {
  const parts: string[] = [];
  const chunk = 8192;
  const codes = new Array<number>(chunk);
  for (let start = 0; start < bytes.length; start += chunk) {
    const end = Math.min(start + chunk, bytes.length);
    codes.length = end - start;
    for (let index = start; index < end; index++) {
      const value = bytes[index];
      codes[index - start] = table && value >= 0x80 && value <= 0x9f ? table[value - 0x80] : value;
    }
    parts.push(String.fromCharCode.apply(null, codes));
  }
  return parts.join("");
}

function countChar(text: string, char: string): number {
  let count = 0;
  for (let index = text.indexOf(char); index !== -1; index = text.indexOf(char, index + 1)) count++;
  return count;
}

export interface Decoded { text: string; replacements: number; bom: boolean }

/** Decode with an explicit encoding. Invalid sequences become U+FFFD and are counted, never hidden. */
export function decodeBytes(bytes: Uint8Array, encoding: EncodingId): Decoded {
  const bom = bomOf(bytes);
  const matching = bom && bom.encoding === encoding;
  const body = matching ? bytes.subarray(bom.length) : bytes;
  let text: string;
  if (encoding === "windows-1252") text = singleByte(body, WINDOWS_1252);
  else if (encoding === "iso-8859-1") text = singleByte(body, null);
  else {
    try {
      text = new TextDecoder(encoding, { fatal: false, ignoreBOM: true }).decode(body);
    } catch {
      throw new StudioError("UNSUPPORTED_ENCODING", `${encodingLabel(encoding)} decoding isn’t available in this browser. Choose another encoding.`);
    }
  }
  return { text, replacements: countChar(text, "\ufffd"), bom: Boolean(matching) };
}

/** Refuse obviously binary payloads instead of importing pages of control characters. */
export function assertTextLike(bytes: Uint8Array, encoding: EncodingId): void {
  if (encoding === "utf-16le" || encoding === "utf-16be") return;
  const sample = Math.min(bytes.length, 65_536);
  let zeros = 0;
  for (let index = 0; index < sample; index++) if (bytes[index] === 0) zeros++;
  if (sample > 0 && zeros / sample > 0.01) {
    throw new StudioError("BINARY_FILE", "This file contains many NUL bytes, which means it is binary data rather than delimited text. If it is a spreadsheet, save it as CSV UTF-8 first.");
  }
}

export function mojibakeCount(text: string): number {
  MOJIBAKE.lastIndex = 0;
  let count = 0;
  while (MOJIBAKE.exec(text)) count++;
  MOJIBAKE.lastIndex = 0;
  return count;
}

/** Decode the first part of the same bytes several ways so a person can pick the readable one. */
export function encodingLab(bytes: Uint8Array, encodings: EncodingId[], detected: EncodingId): EncodingLabResult[] {
  let head = bytes.subarray(0, Math.min(bytes.length, 65_536));
  const lastBreak = head.lastIndexOf(0x0a);
  if (head.length < bytes.length && lastBreak > 0) head = head.subarray(0, lastBreak + 1);
  const results = encodings.map((encoding) => {
    let slice = head;
    if ((encoding === "utf-16le" || encoding === "utf-16be") && slice.length % 2) slice = slice.subarray(0, slice.length - 1);
    const { text, replacements } = decodeBytes(slice, encoding);
    const lines = text.split(/\r\n|\n|\r/).filter((line) => line.length > 0).slice(0, 6).map((line) => (line.length > 160 ? `${line.slice(0, 160)}…` : line));
    return { encoding, label: encodingLabel(encoding), lines, replacements, mojibake: mojibakeCount(text), recommended: false };
  });
  const score = (result: EncodingLabResult) => result.replacements * 4 + result.mojibake * 3 + (result.encoding === detected ? -0.5 : 0);
  const best = results.reduce<EncodingLabResult | null>((winner, result) => (!winner || score(result) < score(winner) ? result : winner), null);
  if (best) best.recommended = true;
  return results;
}
