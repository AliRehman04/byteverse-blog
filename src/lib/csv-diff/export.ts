import { compareTables } from "./engine";
import { CSV_DIFF_LIMITS, CsvDiffError, type Comparison, type CsvRow, type DiffRow, type DiffStatus, type ExportFilter } from "./types";

export type { ExportFilter } from "./types";

const STATUSES: readonly DiffStatus[] = ["added", "removed", "changed", "unchanged"];

function invalidComparison(): never {
  throw new CsvDiffError("INVALID_COMPARISON", "The comparison is invalid or has changed. Compare the source tables again before exporting.");
}

export function filteredRows(result: Comparison, filter: ExportFilter = "differences"): DiffRow[] {
  if (filter !== "all" && filter !== "differences" && !STATUSES.includes(filter)) {
    throw new CsvDiffError("INVALID_FILTER", "Choose all rows, differences, or one comparison status.");
  }
  if (!result || !Array.isArray(result.rows) || result.rows.length > CSV_DIFF_LIMITS.rows * 2) invalidComparison();
  return result.rows.filter((row) => {
    if (!row || !STATUSES.includes(row.status)) invalidComparison();
    return filter === "all" || (filter === "differences" ? row.status !== "unchanged" : row.status === filter);
  });
}

function sameStrings(a: string[], b: string[]): boolean {
  return Array.isArray(a) && a.length === b.length && b.every((value, index) => a[index] === value);
}

// An exported result may have crossed a worker boundary or been edited by its
// caller. Reconstruct bounded tables and check the claimed matching/metadata.
// This is export-only; filteredRows remains a lightweight view operation.
function validateComparison(result: Comparison): Comparison {
  if (!result || !Array.isArray(result.rows) || result.rows.length > CSV_DIFF_LIMITS.rows * 2) invalidComparison();
  const before: CsvRow[] = [];
  const after: CsvRow[] = [];
  for (const row of result.rows) {
    if (!row || typeof row !== "object" || (row.before === null && row.after === null)) invalidComparison();
    for (const [value, destination] of [[row.before, before], [row.after, after]] as const) {
      if (value === null) continue;
      if (!value || typeof value !== "object" || !Number.isSafeInteger(value.record)) invalidComparison();
      destination.push(value);
    }
  }
  // Matched updated rows can be visited in any order. Retaining the result's
  // added-row order also supports callers that reorder table arrays without
  // renumbering the original logical source records.
  const checked = compareTables(
    { headers: result.originalHeaders, rows: before, delimiter: ",", skippedBlankRecords: 0 },
    { headers: result.updatedHeaders, rows: after, delimiter: ",", skippedBlankRecords: 0 },
    result.options,
  );
  if (!result.counts || !STATUSES.every((status) => result.counts[status] === checked.counts[status])
    || result.normalizedCells !== checked.normalizedCells || !result.ignoredColumns
    || !sameStrings(result.ignoredColumns.original, checked.ignoredColumns.original)
    || !sameStrings(result.ignoredColumns.updated, checked.ignoredColumns.updated)
    || result.rows.length !== checked.rows.length) invalidComparison();
  for (let index = 0; index < checked.rows.length; index++) {
    const actual = result.rows[index];
    const expected = checked.rows[index];
    if (actual.id !== expected.id || actual.status !== expected.status
      || actual.before?.record !== expected.before?.record || actual.after?.record !== expected.after?.record
      || !sameStrings(actual.key, expected.key) || !sameStrings(actual.changedColumns, expected.changedColumns)) invalidComparison();
  }
  return checked;
}

function byteBudget(): (bytes: number) => void {
  let total = 0;
  return (bytes) => {
    total += bytes;
    if (total > CSV_DIFF_LIMITS.outputBytes) {
      throw new CsvDiffError("OUTPUT_LIMIT", "The report exceeds the 16 MiB output limit. Select fewer rows or columns; nothing was truncated.");
    }
  };
}

function utf8Bytes(text: string): number {
  let bytes = 0;
  for (let index = 0; index < text.length; index++) {
    const code = text.charCodeAt(index);
    if (code < 0x80) bytes++;
    else if (code < 0x800) bytes += 2;
    else if (code >= 0xd800 && code <= 0xdbff) { bytes += 4; index++; }
    else bytes += 3;
  }
  return bytes;
}

function needsSpreadsheetPrefix(value: string): boolean {
  for (const char of value) {
    const code = char.charCodeAt(0);
    // Prefix leading C0/C1 and common invisible formatting controls, even when
    // no formula operator follows. Preserve all original whitespace after it.
    if ((code > 0 && code < 0x20) || (code >= 0x7f && code <= 0x9f)
      || (code >= 0x200b && code <= 0x200f) || (code >= 0x202a && code <= 0x202e)
      || (code >= 0x2060 && code <= 0x206f) || code === 0xfeff) return true;
    if (!char.trim()) continue;
    return "=+-@＝＋－＠".includes(char);
  }
  return false;
}

/** Spreadsheet-oriented mitigation, NOT a universal spreadsheet safety claim.
 * Some importers strip prefixes or coerce text. JSON is the exact-data option.
 */
export function exportCsv(result: Comparison, filter: ExportFilter = "differences"): { text: string; protectedCells: number; rows: number } {
  const checked = validateComparison(result);
  const rows = filteredRows(checked, filter);
  const reserve = byteBudget();
  const parts = ["\ufeff"];
  reserve(3);
  let protectedCells = 0;
  const emit = (values: string[]) => {
    const protectedValues = values.map((value) => {
      if (!needsSpreadsheetPrefix(value)) return value;
      protectedCells++;
      return "\t" + value;
    });
    let bytes = protectedValues.length - 1 + 2; // commas and final CRLF
    for (const value of protectedValues) {
      bytes += 2 + utf8Bytes(value); // enclosing quotes
      for (const char of value) if (char === '"') bytes++; // doubled quotes
    }
    reserve(bytes); // Check before allocating escaped strings or report text.
    parts.push(protectedValues.map((value) => '"' + value.replace(/"/g, '""') + '"').join(",") + "\r\n");
  };
  emit([
    "status", ...checked.options.keys.map((key) => `key:${key}`), "original_record", "updated_record",
    ...checked.options.columns.flatMap((column) => [`before:${column}`, `after:${column}`]),
  ]);
  const positions = checked.options.columns.map((column) => ({ before: checked.originalHeaders.indexOf(column), after: checked.updatedHeaders.indexOf(column) }));
  for (const row of rows) {
    emit([
      row.status, ...row.key, row.before ? String(row.before.record) : "", row.after ? String(row.after.record) : "",
      ...positions.flatMap((position) => [row.before?.values[position.before] ?? "", row.after?.values[position.after] ?? ""]),
    ]);
  }
  return { text: parts.join(""), protectedCells, rows: rows.length };
}

// Exact JSON byte accounting before JSON.stringify can expand control chars.
// Values passed here are newly constructed metadata or validated plain rows.
function reserveJson(value: unknown, reserve: (bytes: number) => void): void {
  if (value === null) { reserve(4); return; }
  if (typeof value === "boolean") { reserve(value ? 4 : 5); return; }
  if (typeof value === "number") { reserve(String(value).length); return; }
  if (typeof value === "string") {
    reserve(2 + utf8Bytes(value));
    for (let index = 0; index < value.length; index++) {
      const code = value.charCodeAt(index);
      if (code === 0x22 || code === 0x5c || code === 8 || code === 9 || code === 10 || code === 12 || code === 13) reserve(1);
      else if (code < 0x20) reserve(5);
    }
    return;
  }
  if (Array.isArray(value)) {
    reserve(2 + Math.max(0, value.length - 1));
    for (const item of value) reserveJson(item, reserve);
    return;
  }
  if (!value || typeof value !== "object") invalidComparison();
  const entries = Object.entries(value);
  reserve(2 + Math.max(0, entries.length - 1));
  for (const [key, item] of entries) { reserveJson(key, reserve); reserve(1); reserveJson(item, reserve); }
}

/** Version 1 stores exact original strings, including ignored source columns. */
export function exportJson(result: Comparison, filter: ExportFilter = "differences"): string {
  const checked = validateComparison(result);
  const rows = filteredRows(checked, filter);
  const metadata = {
    version: 1, filter, options: checked.options,
    headers: { original: checked.originalHeaders, updated: checked.updatedHeaders },
    counts: checked.counts, ignoredColumns: checked.ignoredColumns,
    normalizedCells: checked.normalizedCells, exportedRows: rows.length,
  };
  const reserve = byteBudget();
  reserveJson(metadata, reserve);
  // Replace metadata's closing brace with the rows member; the brace counted
  // above becomes the report's final brace. Only the other punctuation is new.
  reserve(10); // ,"rows":[ plus ]
  const parts = [JSON.stringify(metadata).slice(0, -1), ',"rows":['];
  for (let index = 0; index < rows.length; index++) {
    if (index) { reserve(1); parts.push(","); }
    reserveJson(rows[index], reserve);
    parts.push(JSON.stringify(rows[index]));
  }
  parts.push("]}");
  return parts.join("");
}