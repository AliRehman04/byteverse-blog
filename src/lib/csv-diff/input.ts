import { parseCsv } from "./engine";
import { assertCsvUnicode, CSV_DIFF_LIMITS, CsvDiffError, type CsvInput, type CsvTable, type Encoding } from "./types";

const ENCODINGS: readonly Encoding[] = ["utf-8", "utf-16le", "utf-16be", "windows-1252"];

// Explicit 0x80..0x9f mapping avoids runtime/ICU differences (including a
// Node 24.12 decoder that returned Latin-1 controls for Windows-1252 punctuation).
const WINDOWS_1252 = [
  0x20ac, 0x0081, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021,
  0x02c6, 0x2030, 0x0160, 0x2039, 0x0152, 0x008d, 0x017d, 0x008f,
  0x0090, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2013, 0x2014,
  0x02dc, 0x2122, 0x0161, 0x203a, 0x0153, 0x009d, 0x017e, 0x0178,
] as const;

function decodeWindows1252(bytes: Uint8Array): string {
  if (bytes.length > CSV_DIFF_LIMITS.inputChars) throw new CsvDiffError("INPUT_LIMIT", "CSV text exceeds the 2,000,000-character limit.");
  const parts: string[] = [];
  for (let start = 0; start < bytes.length; start += 8192) {
    const codes = Array.from(bytes.subarray(start, start + 8192), (value) => value >= 0x80 && value <= 0x9f ? WINDOWS_1252[value - 0x80] : value);
    parts.push(String.fromCharCode(...codes));
  }
  return parts.join("");
}

function validateEncoding(encoding: Encoding): void {
  if (!ENCODINGS.includes(encoding)) throw new CsvDiffError("INVALID_ENCODING", "Choose UTF-8, UTF-16 LE, UTF-16 BE, or Windows-1252 explicitly.");
}

/** Decode exactly the selected encoding, removing one matching transport BOM. */
export function decodeCsvBytes(bytes: ArrayBuffer | Uint8Array, encoding: Encoding): string {
  validateEncoding(encoding);
  if (!(bytes instanceof ArrayBuffer) && !(bytes instanceof Uint8Array)) {
    throw new CsvDiffError("INVALID_INPUT", "CSV byte input must be an ArrayBuffer or Uint8Array.");
  }
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (view.byteLength > CSV_DIFF_LIMITS.inputBytes) throw new CsvDiffError("FILE_LIMIT", "CSV files must not exceed 5 MiB.");
  let bom: Encoding | undefined;
  let offset = 0;
  if ((view[0] === 0xff && view[1] === 0xfe && view[2] === 0 && view[3] === 0)
    || (view[0] === 0 && view[1] === 0 && view[2] === 0xfe && view[3] === 0xff)) {
    throw new CsvDiffError("BOM_MISMATCH", "UTF-32 BOMs are unsupported. Export one of the supported encodings.");
  }
  if (view[0] === 0xef && view[1] === 0xbb && view[2] === 0xbf) { bom = "utf-8"; offset = 3; }
  else if (view[0] === 0xff && view[1] === 0xfe) { bom = "utf-16le"; offset = 2; }
  else if (view[0] === 0xfe && view[1] === 0xff) { bom = "utf-16be"; offset = 2; }
  if (bom && bom !== encoding) throw new CsvDiffError("BOM_MISMATCH", "The file BOM does not match the selected encoding. Choose the matching encoding.");
  let text: string;
  if (encoding === "windows-1252") text = decodeWindows1252(view);
  else {
    try {
      // ignoreBOM prevents a second literal U+FEFF from being silently stripped.
      text = new TextDecoder(encoding, { fatal: true, ignoreBOM: true }).decode(view.subarray(offset));
    } catch {
      throw new CsvDiffError("INVALID_ENCODING", "The file contains invalid bytes for the selected encoding. No replacement characters were inserted.");
    }
  }
  if (text.length > CSV_DIFF_LIMITS.inputChars) throw new CsvDiffError("INPUT_LIMIT", "CSV text exceeds the 2,000,000-character limit.");
  assertCsvUnicode(text);
  return text;
}

export async function readCsvInput(input: CsvInput): Promise<CsvTable> {
  if (!input || typeof input !== "object" || !input.source || typeof input.source !== "object"
    || Array.isArray(input.source) || !["auto", ",", ";", "\t", "|"].includes(input.delimiter)) {
    throw new CsvDiffError("INVALID_INPUT", "Provide one local text or File source and a supported delimiter.");
  }
  validateEncoding(input.encoding);
  const keys = Object.keys(input.source);
  if (keys.length !== 1) throw new CsvDiffError("INVALID_INPUT", "Provide exactly one text or File source; URLs are not supported.");
  if (keys[0] === "text" && "text" in input.source && typeof input.source.text === "string") {
    return parseCsv(input.source.text, input.delimiter);
  }
  if (keys[0] !== "file" || !("file" in input.source) || typeof File === "undefined" || !(input.source.file instanceof File)) {
    throw new CsvDiffError("INVALID_INPUT", "Provide a local File or text; URLs are not supported.");
  }
  const file = input.source.file;
  if (!Number.isSafeInteger(file.size) || file.size < 0) throw new CsvDiffError("INVALID_INPUT", "The local File has an invalid byte size.");
  if (file.size > CSV_DIFF_LIMITS.inputBytes) throw new CsvDiffError("FILE_LIMIT", "CSV files must not exceed 5 MiB.");
  let buffer: ArrayBuffer;
  try {
    buffer = await file.arrayBuffer();
  } catch {
    throw new CsvDiffError("FILE_READ_ERROR", "The local CSV file could not be read. Select the file again.");
  }
  if (!(buffer instanceof ArrayBuffer) || buffer.byteLength !== file.size) {
    throw new CsvDiffError("FILE_READ_ERROR", "The local CSV file was not read completely; no partial table was returned.");
  }
  const text = decodeCsvBytes(buffer, input.encoding);
  // parseCsv consumes one transport BOM. Restore that marker after decoding so
  // a second, literal BOM in the first field is preserved rather than removed.
  return parseCsv("\ufeff" + text, input.delimiter);
}