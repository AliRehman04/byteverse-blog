/** Shared contracts for ByteVerse CSV Studio. Pure data; no DOM or worker APIs. */

export const STUDIO_LIMITS = {
  /** Largest file or decompressed payload accepted. */
  maxBytes: 25 * 1024 * 1024,
  /** Above this size the UI warns that the browser may slow down. */
  comfortableBytes: 5 * 1024 * 1024,
  maxPasteChars: 10_000_000,
  /** Hard stop for data rows (after skipped rows and the header). */
  maxRows: 100_000,
  maxColumns: 500,
  warnColumns: 100,
  maxCells: 5_000_000,
  /** A single field above this is treated as an embedded file and refused. */
  maxFieldChars: 1_000_000,
  /** Excel's documented cell text limit. */
  excelCellChars: 32_767,
  longCellChars: 10_000,
  maxSkipRows: 100,
  historyDepth: 50,
  previewRows: 100,
  maxWindowRows: 400,
  maxCopyCells: 200_000,
  /** Characters sampled for delimiter detection. */
  sampleChars: 262_144,
  issueExamples: 3,
  exampleChars: 48,
  previewSamples: 8,
  importTimeoutMs: 120_000,
} as const;

export type EncodingId = "utf-8" | "utf-16le" | "utf-16be" | "windows-1252" | "iso-8859-1";
export type EncodingChoice = "auto" | EncodingId;
export type DelimiterChoice = "auto" | "," | ";" | "\t" | "|" | "custom" | "none";
export type QuoteChoice = "\"" | "'" | "none";

export interface ImportOptions {
  encoding: EncodingChoice;
  delimiter: DelimiterChoice;
  customDelimiter: string;
  quote: QuoteChoice;
  /** The first record after skipped rows holds column names. */
  header: boolean;
  /** Records discarded before the header (title rows, notes). */
  skipRows: number;
  /** Records starting with this prefix are ignored. Empty = off. */
  comment: string;
  /** Off = RFC behaviour: consecutive delimiters create empty fields. */
  mergeDelimiters: boolean;
}

export const DEFAULT_IMPORT_OPTIONS: ImportOptions = Object.freeze({
  encoding: "auto",
  delimiter: "auto",
  customDelimiter: "",
  quote: "\"",
  header: true,
  skipRows: 0,
  comment: "",
  mergeDelimiters: false,
});

export interface SourceMeta {
  name: string;
  size: number;
  lastModified: number | null;
  kind: "file" | "paste" | "sample";
  container: "plain" | "gzip" | "zip";
  innerName: string | null;
}

export interface DelimiterCandidate { delimiter: string; label: string; width: number; consistency: number; records: number }

export interface ImportReport {
  encoding: { used: EncodingId; detected: EncodingId; choice: EncodingChoice; reason: string; bom: EncodingId | null; replacements: number };
  delimiter: { used: string; label: string; choice: DelimiterChoice; reason: string; ambiguous: boolean; candidates: DelimiterCandidate[] };
  quote: QuoteChoice;
  lineEndings: { crlf: number; lf: number; cr: number; style: "LF" | "CRLF" | "CR" | "Mixed" | "None" };
  chars: number;
  records: number;
  skippedRecords: number;
  commentLines: number;
  headerFields: number;
  dataRows: number;
  columns: number;
  minFields: number;
  maxFields: number;
  malformedQuotes: number;
  strayQuotes: number;
  unclosedQuote: { row: number; line: number } | null;
  endsWithNewline: boolean;
  decodeMs: number;
  parseMs: number;
  validateMs: number;
}

export type ColumnType = "auto" | "text" | "integer" | "decimal" | "date" | "boolean";
export type IdentifierProfile = "zip" | "zip4" | "phone" | "account" | "customer" | "sku" | "product" | "employee" | "invoice" | "membership" | "other";
export type DateFormat = "MDY" | "DMY" | "YMD";

export const COLUMN_TYPE_LABELS: Record<ColumnType, string> = {
  auto: "Automatic",
  text: "Text",
  integer: "Integer",
  decimal: "Decimal",
  date: "Date",
  boolean: "Boolean",
};

export const PROFILE_LABELS: Record<IdentifierProfile, string> = {
  zip: "ZIP code",
  zip4: "ZIP+4",
  phone: "Phone number",
  account: "Account ID",
  customer: "Customer ID",
  sku: "SKU",
  product: "Product code",
  employee: "Employee ID",
  invoice: "Invoice number",
  membership: "Membership number",
  other: "Other identifier",
};

export const DATE_FORMAT_LABELS: Record<DateFormat, string> = {
  MDY: "MM/DD/YYYY (US)",
  DMY: "DD/MM/YYYY",
  YMD: "YYYY-MM-DD (ISO)",
};

export interface ColumnInfo {
  key: number;
  name: string;
  /** Imported header text when this column maps 1:1 to an imported column. */
  originalName: string | null;
  type: ColumnType;
  profile: IdentifierProfile | null;
  dateFormat: DateFormat | null;
  hidden: boolean;
  derived: boolean;
  synthetic: boolean;
}

export type Severity = "error" | "warning" | "info";
export type IssueCategory = "structure" | "text" | "encoding" | "identifier" | "type" | "security" | "quality";

export type RepairOp =
  | { kind: "trim"; columns: "all" | number[] }
  | { kind: "normalizeSpaces"; columns: "all" | number[] }
  | { kind: "removeControls"; columns: "all" | number[] }
  | { kind: "stripBom"; columns: "all" | number[] }
  | { kind: "nfc"; columns: "all" | number[] }
  | { kind: "repairHeaders"; names: Record<number, string> | null }
  | { kind: "removeBlankRows" }
  | { kind: "removeDuplicateRows" }
  | { kind: "setType"; columns: number[]; type: ColumnType; profile: IdentifierProfile | null; dateFormat: DateFormat | null }
  | { kind: "rename"; column: number; name: string }
  | { kind: "move"; column: number; offset: -1 | 1 }
  | { kind: "hide"; column: number; hidden: boolean }
  | { kind: "deleteColumn"; column: number }
  | { kind: "split"; column: number; separator: string; maxParts: number; keepSource: boolean }
  | { kind: "merge"; columns: [number, number]; joiner: string; name: string; removeSources: boolean }
  | { kind: "padLeft"; column: number; length: number }
  | { kind: "findReplace"; columns: "all" | number[]; find: string; replace: string; regex: boolean; matchCase: boolean; wholeCell: boolean }
  | { kind: "fillEmpty"; column: number; value: string }
  | { kind: "editCells"; edits: { row: number; column: number; value: string }[] }
  | { kind: "clearCells"; range: CellRange }
  | { kind: "demoteHeader" }
  | { kind: "batch"; label: string; ops: RepairOp[] };

export type RepairKind = RepairOp["kind"];

export type FixSuggestion =
  | { kind: "op"; label: string; op: RepairOp }
  | { kind: "reimport"; label: string; patch: Partial<ImportOptions> }
  | { kind: "encoding-lab"; label: string }
  | { kind: "pad"; label: string; column: number }
  | { kind: "find-replace"; label: string; column: number | null; find: string };

export interface Issue {
  id: string;
  code: string;
  name: string;
  severity: Severity;
  category: IssueCategory;
  column: number | null;
  columnName: string | null;
  count: number;
  /** First affected visible row (0-based), when known. */
  row: number | null;
  examples: string[];
  explanation: string;
  proposedAction: string;
  expectedEffect: string;
  reviewable: boolean;
  dismissible: boolean;
  locatable: boolean;
  fix: FixSuggestion | null;
}

export interface CellRange { top: number; left: number; bottom: number; right: number }

export interface HistoryStepInfo { id: number; label: string; detail: string; cells: number; rowsRemoved: number; columnsChanged: number; at: number }

export interface ChangeSummary { cells: number; rowsRemoved: number; rowsAdded: number; columnsAdded: number; columnsRemoved: number; headersChanged: number; typesChanged: number }

export interface StudioSnapshot {
  version: number;
  source: SourceMeta;
  options: ImportOptions;
  report: ImportReport;
  columns: ColumnInfo[];
  rowCount: number;
  importedRowCount: number;
  issues: Issue[];
  dismissed: string[];
  history: { steps: HistoryStepInfo[]; cursor: number; canUndo: boolean; canRedo: boolean };
  changes: ChangeSummary;
  blockers: { xlsx: string | null; json: string | null };
}

/** Cell marks returned with grid windows. */
export const MARK = {
  CHANGED: 1,
  ERROR: 2,
  WARNING: 4,
  INFO: 8,
  MISSING: 16,
  FORMULA: 32,
  IDENTIFIER: 64,
} as const;

export interface GridRow { index: number; line: number; cells: (string | null)[]; marks: number[]; rowMark: number }
export interface GridWindow { version: number; start: number; rows: GridRow[] }

export interface CellDetail {
  row: number;
  column: number;
  columnName: string;
  line: number;
  working: string | null;
  original: string | null;
  changed: boolean;
  quoted: boolean | null;
  raw: string | null;
  rawTruncated: boolean;
  length: number;
  codePoints: { index: number; char: string; code: string; name: string }[];
  notes: string[];
  excelRisk: string | null;
}

export interface ColumnProfile {
  column: number;
  name: string;
  rows: number;
  nonEmpty: number;
  empty: number;
  missing: number;
  unique: number;
  minLength: number;
  maxLength: number;
  leadingZero: number;
  formulaLike: number;
  longDigits: number;
  samples: string[];
  suggestion: { type: ColumnType; profile: IdentifierProfile | null; dateFormat: DateFormat | null; reason: string };
  risk: { asNumber: string | null; asText: string };
}

export interface RepairPreview {
  label: string;
  reason: string;
  cells: number;
  rowsRemoved: number;
  rowsAdded: number;
  columnsAdded: number;
  columnsRemoved: number;
  samples: { row: number; column: string; before: string | null; after: string | null }[];
  notes: string[];
  blocked: string | null;
  headers: { column: number; before: string; after: string }[];
}

export interface SelectionStats { cells: number; nonEmpty: number; numeric: number; sum: string | null; average: string | null; truncated: boolean }

export type ExportFormat = "xlsx" | "csv" | "tsv" | "json";
export interface ExportOptions {
  format: ExportFormat;
  fileName: string;
  includeHidden: boolean;
  includeHeader: boolean;
  rows: "all" | { top: number; bottom: number };
  includeSummary: boolean;
  includeChanges: boolean;
  csvDelimiter: "," | ";" | "\t" | "|";
  csvSafe: boolean;
  csvBom: boolean;
  csvLineEnding: "crlf" | "lf";
  csvQuoteAll: boolean;
}

export interface ExportResult {
  fileName: string;
  mime: string;
  size: number;
  rows: number;
  columns: number;
  notes: string[];
  verification: string[];
}

export type StudioRequest =
  | { type: "import"; payload: { bytes: ArrayBuffer | null; text: string | null; source: SourceMeta; options: ImportOptions } }
  | { type: "window"; payload: { start: number; count: number } }
  | { type: "cell"; payload: { row: number; column: number } }
  | { type: "locate"; payload: { issueId: string; after: number } }
  | { type: "preview"; payload: { op: RepairOp } }
  | { type: "apply"; payload: { op: RepairOp } }
  | { type: "undo" } | { type: "redo" } | { type: "reset" }
  | { type: "dismiss"; payload: { issueId: string; dismissed: boolean } }
  | { type: "profile"; payload: { column: number } }
  | { type: "stats"; payload: { range: CellRange } }
  | { type: "copy"; payload: { range: CellRange } }
  | { type: "lab"; payload: { encodings: EncodingId[] } }
  | { type: "export"; payload: { options: ExportOptions } }
  | { type: "cancel" };

export interface EncodingLabResult { encoding: EncodingId; label: string; lines: string[]; replacements: number; mojibake: number; recommended: boolean }

export type StudioMessage =
  | { id: number; ok: true; result: unknown }
  | { id: number; ok: false; code: string; message: string }
  | { id: number; progress: { phase: string; done: number; total: number } };

export class StudioError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "StudioError";
  }
}

export function delimiterLabel(delimiter: string): string {
  switch (delimiter) {
    case ",": return "Comma";
    case ";": return "Semicolon";
    case "\t": return "Tab";
    case "|": return "Pipe";
    case "": return "None (single column)";
    case " ": return "Space";
    default: return `Custom “${delimiter}”`;
  }
}

export function encodingLabel(encoding: EncodingId): string {
  switch (encoding) {
    case "utf-8": return "UTF-8";
    case "utf-16le": return "UTF-16 LE";
    case "utf-16be": return "UTF-16 BE";
    case "windows-1252": return "Windows-1252";
    case "iso-8859-1": return "ISO-8859-1";
  }
}

export function columnLetter(index: number): string {
  let name = "";
  for (let value = index + 1; value > 0; value = Math.floor((value - 1) / 26)) name = String.fromCharCode(65 + ((value - 1) % 26)) + name;
  return name;
}
