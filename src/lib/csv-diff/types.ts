// Character limits use UTF-16 code units. Row/cell limits exclude the header.
// The host, not the worker's busy event loop, enforces timeoutMs by termination.
export const CSV_DIFF_LIMITS = Object.freeze({
  inputBytes: 5 * 1024 * 1024,
  inputChars: 2_000_000,
  rows: 20_000,
  columns: 100,
  cells: 500_000,
  headerChars: 256,
  fieldChars: 100_000,
  outputBytes: 16 * 1024 * 1024,
  timeoutMs: 15_000,
  keys: 5,
  issues: 40,
  issueRecords: 20,
} as const);

export type Delimiter = "auto" | "," | ";" | "\t" | "|";
export type Encoding = "utf-8" | "utf-16le" | "utf-16be" | "windows-1252";

export interface CsvInput {
  source: { text: string } | { file: File };
  delimiter: Delimiter;
  encoding: Encoding;
}

export interface CsvRow {
  /** One-based logical record, including the header and skipped blank records. */
  record: number;
  values: string[];
}

export interface CsvTable {
  headers: string[];
  rows: CsvRow[];
  delimiter: string;
  skippedBlankRecords: number;
}

export interface DiffOptions {
  keys: string[];
  columns: string[];
  trimValues: boolean;
  ignoreCase: boolean;
}

export type DiffStatus = "added" | "removed" | "changed" | "unchanged";

export interface DiffRow {
  /** Stable, one-based position in this comparison, not an input record number. */
  id: number;
  status: DiffStatus;
  key: string[];
  before: CsvRow | null;
  after: CsvRow | null;
  changedColumns: string[];
}

export interface Comparison {
  rows: DiffRow[];
  counts: Record<DiffStatus, number>;
  options: DiffOptions;
  originalHeaders: string[];
  updatedHeaders: string[];
  ignoredColumns: { original: string[]; updated: string[] };
  /** Unequal matched cell pairs made equal by the selected value options. */
  normalizedCells: number;
}

export interface CsvIssue {
  side: "original" | "updated";
  kind: "blank-key" | "duplicate-key";
  records: number[];
  message: string;
}

export class CsvDiffError extends Error {
  readonly code: string;
  readonly issues?: CsvIssue[];

  constructor(code: string, message: string, issues?: CsvIssue[]) {
    super(message);
    this.name = "CsvDiffError";
    this.code = code;
    if (issues) this.issues = issues;
  }
}

export type ExportFilter = "all" | "differences" | DiffStatus;

export type CsvDiffRequest =
  | { id: number; kind: "inspect"; inputs: [CsvInput, CsvInput] }
  | { id: number; kind: "compare"; tables: [CsvTable, CsvTable]; options: DiffOptions }
  | { id: number; kind: "export"; result: Comparison; format: "csv" | "json"; filter?: ExportFilter };

export type CsvDiffResponse =
  | { id: number; ok: true; kind: "inspect"; tables: [CsvTable, CsvTable] }
  | { id: number; ok: true; kind: "compare"; result: Comparison }
  | { id: number; ok: true; kind: "export"; text: string; mime: string;
      filename: "csv-comparison.csv" | "csv-comparison.json"; protectedCells: number; rows: number }
  | { id: number; ok: false; error: string; code: string; issues?: CsvIssue[] };

export interface CsvDiffSample {
  id: string;
  label: string;
  description: string;
  original: string;
  updated: string;
  keys: string[];
}

/** @internal Shared by text, byte-input, table and output validation. */
export function assertCsvUnicode(text: string): void {
  for (let index = 0; index < text.length; index++) {
    const code = text.charCodeAt(index);
    if (code === 0) throw new CsvDiffError("NUL_CHARACTER", "CSV text must not contain NUL characters.");
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = text.charCodeAt(++index);
      if (!(next >= 0xdc00 && next <= 0xdfff)) {
        throw new CsvDiffError("INVALID_UNICODE", "CSV text contains an unpaired Unicode surrogate.");
      }
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      throw new CsvDiffError("INVALID_UNICODE", "CSV text contains an unpaired Unicode surrogate.");
    }
  }
}