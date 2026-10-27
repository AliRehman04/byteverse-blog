import Papa from "papaparse";
import {
  assertCsvUnicode, CSV_DIFF_LIMITS, CsvDiffError,
  type Comparison, type CsvIssue, type CsvRow, type CsvTable, type Delimiter, type DiffOptions,
} from "./types";

const DELIMITERS = [",", ";", "\t", "|"] as const;
type ExplicitDelimiter = Exclude<Delimiter, "auto">;
interface RecordSpan { start: number; end: number; record: number }
interface Scan { records: RecordSpan[]; width: number; skipped: number }

function fail(code: string, message: string): never {
  throw new CsvDiffError(code, message);
}

// Papa's empty-line option also drops quoted "" records, and its permissive
// quote handling accepts some malformed fields. This bounded lexical pass
// retains source record numbers and validates strict quoting BEFORE Papa parses.
function scanRecords(text: string, delimiter: ExplicitDelimiter): Scan {
  const records: RecordSpan[] = [];
  let start = text.charCodeAt(0) === 0xfeff ? 1 : 0;
  let state: "start" | "plain" | "quoted" | "closed" = "start";
  let fieldChars = 0;
  let fields = 1;
  let width = 0;
  let record = 1;
  let skipped = 0;
  let cells = 0;

  const addCharacter = () => {
    fieldChars++;
    const header = records.length === 0;
    if (fieldChars > (header ? CSV_DIFF_LIMITS.headerChars : CSV_DIFF_LIMITS.fieldChars)) {
      fail(header ? "HEADER_LIMIT" : "FIELD_LIMIT", header
        ? "A CSV header exceeds the 256-character limit."
        : `A field in record ${record} exceeds the 100,000-character limit.`);
    }
  };

  const finishRecord = (end: number) => {
    if (end === start) skipped++;
    else {
      if (records.length === 0) width = fields;
      else {
        if (fields !== width) fail("RAGGED_ROWS", `Record ${record} has ${fields} fields; the header has ${width}.`);
        if (records.length > CSV_DIFF_LIMITS.rows) fail("ROW_LIMIT", "CSV data exceeds the 20,000-row limit.");
        cells += fields;
        if (cells > CSV_DIFF_LIMITS.cells) fail("CELL_LIMIT", "CSV data exceeds the 500,000-cell limit.");
      }
      records.push({ start, end, record });
    }
    fields = 1;
    fieldChars = 0;
    state = "start";
    record++;
  };

  for (let index = start; index < text.length; index++) {
    const char = text[index];
    if (state === "quoted") {
      if (char === '"') {
        if (text[index + 1] === '"') { addCharacter(); index++; }
        else state = "closed";
      } else addCharacter();
      continue;
    }
    if (char === delimiter) {
      fields++;
      if (fields > CSV_DIFF_LIMITS.columns) fail("COLUMN_LIMIT", "CSV data exceeds the 100-column limit.");
      fieldChars = 0;
      state = "start";
    } else if (char === "\r" || char === "\n") {
      finishRecord(index);
      if (char === "\r" && text[index + 1] === "\n") index++;
      start = index + 1;
    } else if (char === '"' && state === "start") state = "quoted";
    else if (char === '"' || state === "closed") {
      fail("INVALID_QUOTES", `Record ${record} has an unexpected quote or text after a closing quote.`);
    } else {
      state = "plain";
      addCharacter();
    }
  }
  if (state === "quoted") fail("INVALID_QUOTES", `Record ${record} has an unterminated quoted field.`);
  // A final line terminator ends the preceding record; it does not invent one.
  if (start < text.length) finishRecord(text.length);
  if (!records.length) fail("EMPTY_CSV", "CSV input must contain a nonempty header record.");
  return { records, width, skipped };
}

function detect(text: string): { delimiter: ExplicitDelimiter; scan: Scan } {
  const candidates: { delimiter: ExplicitDelimiter; scan: Scan }[] = [];
  const errors: CsvDiffError[] = [];
  for (const delimiter of DELIMITERS) {
    try {
      const scan = scanRecords(text, delimiter);
      if (scan.width > 1) candidates.push({ delimiter, scan });
    } catch (error) {
      if (!(error instanceof CsvDiffError)) throw error;
      errors.push(error);
    }
  }
  if (candidates.length > 1) fail("AMBIGUOUS_DELIMITER", "More than one delimiter fits this CSV. Choose a delimiter explicitly.");
  if (candidates.length === 1) return candidates[0];
  // Preserve actionable syntax/limit failures instead of Papa's comma fallback.
  const priority = ["EMPTY_CSV", "ROW_LIMIT", "COLUMN_LIMIT", "CELL_LIMIT", "RAGGED_ROWS", "INVALID_QUOTES", "FIELD_LIMIT", "HEADER_LIMIT"];
  for (const code of priority) {
    const error = errors.find((item) => item.code === code);
    if (error) throw error;
  }
  return fail("DELIMITER_REQUIRED", "No unambiguous multi-column delimiter was found. Choose a delimiter explicitly, including for one-column CSV.");
}

function validateHeaders(headers: string[]): void {
  if (!Array.isArray(headers) || !headers.length) fail("EMPTY_HEADER", "CSV must contain at least one header.");
  if (headers.length > CSV_DIFF_LIMITS.columns) fail("COLUMN_LIMIT", "CSV data exceeds the 100-column limit.");
  const seen = new Set<string>();
  for (const header of headers) {
    if (typeof header !== "string" || !header.trim()) fail("EMPTY_HEADER", "CSV headers must be nonempty strings, not whitespace-only.");
    if (header.length > CSV_DIFF_LIMITS.headerChars) fail("HEADER_LIMIT", "A CSV header exceeds the 256-character limit.");
    assertCsvUnicode(header);
    if (seen.has(header)) fail("DUPLICATE_HEADER", "CSV has duplicate exact headers. Rename them explicitly before comparing.");
    seen.add(header);
  }
}

export function parseCsv(text: string, delimiter: Delimiter = "auto"): CsvTable {
  if (typeof text !== "string") fail("INVALID_INPUT", "CSV input must be text.");
  const bomChars = text.charCodeAt(0) === 0xfeff ? 1 : 0;
  if (text.length - bomChars > CSV_DIFF_LIMITS.inputChars) fail("INPUT_LIMIT", "CSV text exceeds the 2,000,000-character limit.");
  assertCsvUnicode(text);
  if (delimiter !== "auto" && !DELIMITERS.includes(delimiter)) fail("INVALID_DELIMITER", "Choose comma, semicolon, tab, pipe, or automatic delimiter detection.");
  const chosen = delimiter === "auto" ? detect(text) : { delimiter, scan: scanRecords(text, delimiter) };
  const { records, width, skipped } = chosen.scan;
  // Normalize ONLY record separators. Quoted CR/LF stays byte-for-text exact.
  // The artificial BOM is the one Papa removes, protecting a literal BOM in a
  // header after leading blank records or after the input's one transport BOM.
  const normalized = "\ufeff" + records.map(({ start, end }) => text.slice(start, end)).join("\n");
  let parsed: Papa.ParseResult<string[]>;
  try {
    parsed = Papa.parse<string[]>(normalized, {
      delimiter: chosen.delimiter, newline: "\n", quoteChar: '"', escapeChar: '"',
      dynamicTyping: false, header: false, skipEmptyLines: false, comments: false,
      fastMode: false, download: false, worker: false,
    });
  } catch {
    return fail("CSV_PARSE_ERROR", "CSV parsing failed. Check quoting and the selected delimiter.");
  }
  if (parsed.errors.length || parsed.meta.aborted || parsed.meta.truncated
    || parsed.data.length !== records.length
    || parsed.data.some((values) => !Array.isArray(values) || values.length !== width || values.some((value) => typeof value !== "string"))) {
    fail("CSV_PARSE_ERROR", "CSV parsing failed; no partial or truncated table was returned.");
  }
  const [headers, ...values] = parsed.data;
  validateHeaders(headers);
  return {
    headers,
    rows: values.map((row, index) => ({ record: records[index + 1].record, values: row })),
    delimiter: chosen.delimiter,
    skippedBlankRecords: skipped,
  };
}

// Revalidate public/structured-cloned tables, not only tables from this parser.
function validateTable(table: CsvTable): void {
  if (!table || typeof table !== "object" || !Array.isArray(table.rows)
    || !DELIMITERS.some((delimiter) => delimiter === table.delimiter)
    || !Number.isSafeInteger(table.skippedBlankRecords) || table.skippedBlankRecords < 0
    || table.skippedBlankRecords > CSV_DIFF_LIMITS.inputChars) fail("INVALID_TABLE", "Invalid CSV table metadata.");
  validateHeaders(table.headers);
  if (table.rows.length > CSV_DIFF_LIMITS.rows) fail("ROW_LIMIT", "CSV data exceeds the 20,000-row limit.");
  if (table.rows.length * table.headers.length > CSV_DIFF_LIMITS.cells) fail("CELL_LIMIT", "CSV data exceeds the 500,000-cell limit.");
  let chars = table.headers.reduce((sum, header) => sum + header.length, 0);
  const records = new Set<number>();
  for (const row of table.rows) {
    if (!row || !Number.isSafeInteger(row.record) || row.record < 2 || records.has(row.record)
      || row.record > CSV_DIFF_LIMITS.inputChars + 1 || !Array.isArray(row.values)) {
      fail("INVALID_TABLE", "CSV rows must have unique, one-based logical record numbers after the header.");
    }
    records.add(row.record);
    if (row.values.length !== table.headers.length) fail("RAGGED_ROWS", `Record ${row.record} does not match its header width.`);
    for (const value of row.values) {
      if (typeof value !== "string") fail("INVALID_TABLE", "CSV cell values must remain strings.");
      if (value.length > CSV_DIFF_LIMITS.fieldChars) fail("FIELD_LIMIT", "A CSV field exceeds the 100,000-character limit.");
      chars += value.length;
      if (chars > CSV_DIFF_LIMITS.inputChars) fail("INPUT_LIMIT", "CSV text exceeds the 2,000,000-character limit.");
      assertCsvUnicode(value);
    }
  }
}

export function sharedHeaders(a: CsvTable, b: CsvTable): string[] {
  if (!a || !b || typeof a !== "object" || typeof b !== "object") fail("INVALID_TABLE", "Provide both CSV tables.");
  validateHeaders(a.headers);
  validateHeaders(b.headers);
  const updated = new Set(b.headers);
  return a.headers.filter((header) => updated.has(header));
}

function validateOptions(a: CsvTable, b: CsvTable, options: DiffOptions): DiffOptions {
  if (!options || typeof options !== "object" || typeof options.trimValues !== "boolean" || typeof options.ignoreCase !== "boolean") {
    fail("INVALID_OPTIONS", "Specify keys, compared columns, and both value-normalization settings.");
  }
  const shared = new Set(sharedHeaders(a, b));
  for (const [names, maximum] of [[options.keys, CSV_DIFF_LIMITS.keys], [options.columns, CSV_DIFF_LIMITS.columns]] as const) {
    if (!Array.isArray(names) || names.length < 1 || names.length > maximum
      || Array.from(names).some((name) => typeof name !== "string" || !shared.has(name)) || new Set(names).size !== names.length) {
      fail("INVALID_OPTIONS", "Select 1 to 5 unique shared keys and at least one unique shared compared column.");
    }
  }
  return { keys: [...options.keys], columns: [...options.columns], trimValues: options.trimValues, ignoreCase: options.ignoreCase };
}

function indexKeys(table: CsvTable, keyIndexes: number[], side: CsvIssue["side"]): { index: Map<string, CsvRow>; issues: CsvIssue[] } {
  const index = new Map<string, CsvRow>();
  const duplicates = new Map<string, CsvIssue>();
  const blankRecords: number[] = [];
  let blankCount = 0;
  // Reserve space for blank keys on each side, so one side cannot hide the other.
  const duplicateLimit = CSV_DIFF_LIMITS.issues / 2 - 1;
  for (const row of table.rows) {
    const key = keyIndexes.map((position) => row.values[position]);
    if (key.some((part) => !part.trim())) {
      blankCount++;
      if (blankRecords.length < CSV_DIFF_LIMITS.issueRecords) blankRecords.push(row.record);
      continue;
    }
    // JSON tuples cannot collide through delimiter-containing component values.
    const encoded = JSON.stringify(key);
    const previous = index.get(encoded);
    if (!previous) index.set(encoded, row);
    else {
      let issue = duplicates.get(encoded);
      if (!issue && duplicates.size < duplicateLimit) {
        issue = { side, kind: "duplicate-key", records: [previous.record],
          message: `Duplicate exact key on the ${side} side. Record references are limited to ${CSV_DIFF_LIMITS.issueRecords}.` };
        duplicates.set(encoded, issue);
      }
      if (issue && issue.records.length < CSV_DIFF_LIMITS.issueRecords) issue.records.push(row.record);
    }
  }
  const issues: CsvIssue[] = blankCount ? [{ side, kind: "blank-key", records: blankRecords,
    message: `${blankCount} record(s) on the ${side} side have an empty or whitespace-only key component. Record references are limited to ${CSV_DIFF_LIMITS.issueRecords}.` }] : [];
  issues.push(...duplicates.values());
  return { index, issues };
}

function copyRow(row: CsvRow | null): CsvRow | null {
  return row ? { record: row.record, values: [...row.values] } : null;
}

export function compareTables(a: CsvTable, b: CsvTable, options: DiffOptions): Comparison {
  validateTable(a);
  validateTable(b);
  const selected = validateOptions(a, b, options);
  const originalKeys = selected.keys.map((key) => a.headers.indexOf(key));
  const updatedKeys = selected.keys.map((key) => b.headers.indexOf(key));
  const original = indexKeys(a, originalKeys, "original");
  const updated = indexKeys(b, updatedKeys, "updated");
  const issues = [...original.issues, ...updated.issues];
  if (issues.length) failKeys(issues);
  const used = new Set([...selected.keys, ...selected.columns]);
  const result: Comparison = {
    rows: [], counts: { added: 0, removed: 0, changed: 0, unchanged: 0 }, options: selected,
    originalHeaders: [...a.headers], updatedHeaders: [...b.headers],
    ignoredColumns: { original: a.headers.filter((header) => !used.has(header)), updated: b.headers.filter((header) => !used.has(header)) },
    normalizedCells: 0,
  };
  const positions = selected.columns.map((name) => ({ name, before: a.headers.indexOf(name), after: b.headers.indexOf(name) }));
  const normalize = (value: string) => {
    const trimmed = selected.trimValues ? value.trim() : value;
    return selected.ignoreCase ? trimmed.toLowerCase() : trimmed;
  };
  for (const before of a.rows) {
    const key = originalKeys.map((position) => before.values[position]);
    const after = updated.index.get(JSON.stringify(key)) ?? null;
    const changedColumns: string[] = [];
    if (after) {
      for (const position of positions) {
        const left = before.values[position.before];
        const right = after.values[position.after];
        if (left !== right) {
          if (normalize(left) === normalize(right)) result.normalizedCells++;
          else changedColumns.push(position.name);
        }
      }
    }
    const status = !after ? "removed" : changedColumns.length ? "changed" : "unchanged";
    result.rows.push({ id: result.rows.length + 1, status, key, before: copyRow(before), after: copyRow(after), changedColumns });
    result.counts[status]++;
  }
  for (const after of b.rows) {
    const key = updatedKeys.map((position) => after.values[position]);
    if (original.index.has(JSON.stringify(key))) continue;
    result.rows.push({ id: result.rows.length + 1, status: "added", key, before: null, after: copyRow(after), changedColumns: [] });
    result.counts.added++;
  }
  return result;
}

function failKeys(issues: CsvIssue[]): never {
  throw new CsvDiffError("INVALID_KEYS", "Keys must be nonblank and unique on each side. Resolve the listed issues; issue groups and record references are bounded samples.", issues);
}