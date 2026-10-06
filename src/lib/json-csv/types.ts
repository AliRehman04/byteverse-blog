export const JSON_CSV_LIMITS = {
  inputChars: 1_000_000,
  inputBytes: 2 * 1024 * 1024,
  depth: 40,
  nodes: 200_000,
  rows: 10_000,
  columns: 200,
  cells: 250_000,
  dataChars: 4_000_000,
  outputBytes: 8 * 1024 * 1024,
  rowPaths: 60,
  arrayPaths: 50,
  timeoutMs: 15_000,
  previewChars: 50_000,
} as const;

export type JsonInputFormat = "json" | "jsonl";
export type CsvDelimiter = "," | ";" | "\t" | "|";
export type ArrayCellMode = "json" | "join";

export interface ArrayPathOption {
  pointer: string;
  label: string;
}

export interface RowPathOption {
  pointer: string;
  label: string;
  rowCount: number;
  kind: "array" | "object" | "scalar";
  arrayPaths: ArrayPathOption[];
}

export interface JsonInspection {
  format: JsonInputFormat;
  inputChars: number;
  inputBytes: number;
  rowPaths: RowPathOption[];
  warnings: string[];
}

export interface CsvOptions {
  rowPath: string;
  flatten: boolean;
  arrayMode: ArrayCellMode;
  joinSeparator: string;
  expandPath: string | null;
  nullValue: string;
  missingValue: string;
  delimiter: CsvDelimiter;
  newline: "\r\n" | "\n";
  includeHeader: boolean;
  bom: boolean;
  quoteAll: boolean;
  protectFormulas: boolean;
}

export const DEFAULT_CSV_OPTIONS: CsvOptions = {
  rowPath: "",
  flatten: true,
  arrayMode: "json",
  joinSeparator: " | ",
  expandPath: null,
  nullValue: "",
  missingValue: "",
  delimiter: ",",
  newline: "\r\n",
  includeHeader: true,
  bom: true,
  quoteAll: false,
  protectFormulas: true,
};

export interface CsvColumn {
  id: string;
  path: string;
  header: string;
  enabled: boolean;
}

export interface CsvConversion {
  options: CsvOptions;
  format: JsonInputFormat;
  columns: CsvColumn[];
  headers: string[];
  rows: string[][];
  csv: string;
  stats: {
    inputRows: number;
    outputRows: number;
    availableColumns: number;
    exportedColumns: number;
    nullCells: number;
    missingCells: number;
    protectedFields: number;
    formulaRiskFields: number;
    numericCells: number;
    downloadBytes: number;
  };
  warnings: string[];
}

export type JsonCsvRequest =
  | { id: number; kind: "inspect"; input: string; format: JsonInputFormat }
  | { id: number; kind: "convert"; input: string; format: JsonInputFormat; options: CsvOptions; columns?: CsvColumn[] };

export type JsonCsvResponse =
  | { id: number; kind: "inspect"; inspection: JsonInspection }
  | { id: number; kind: "convert"; conversion: CsvConversion }
  | { id: number; kind: "error"; error: string };