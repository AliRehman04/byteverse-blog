import { cellFlags, FLAG } from "./detect";
import { dateStyle, parseBooleanCell, parseDateCell, parseDecimalCell, parseIntegerCell } from "./convert";
import { ROW, cellChanged, displayName, headerChanged, visibleColumns, type ColumnState, type ImportedTable, type TableState } from "./table";
import {
  MARK, PROFILE_LABELS, STUDIO_LIMITS, delimiterLabel,
  type ChangeSummary, type FixSuggestion, type IdentifierProfile, type ImportOptions, type ImportReport, type Issue, type IssueCategory, type Severity,
} from "./types";

const BITS = 27;

export interface ColumnAnalysis {
  counts: Int32Array;
  first: Int32Array;
  examples: string[][];
  nonEmpty: number;
  empty: number;
  missing: number;
  typeFailures: number;
  typeFirst: number;
  typeExamples: string[];
  profileFailures: number;
  profileFirst: number;
  profileExamples: string[];
  separatedDates: number;
  isoDates: number;
  nonNumeric: number;
  nonNumericFirst: number;
  nonNumericExamples: string[];
  maxLength: number;
  minLength: number;
}

export interface RowAnalysis {
  blank: number; blankFirst: number;
  duplicates: number; duplicateFirst: number;
  short: number; shortFirst: number;
  long: number; longFirst: number;
  malformed: number; malformedFirst: number;
  unclosed: number; unclosedFirst: number;
}

export interface ValidationContext { state: TableState; imported: ImportedTable; report: ImportReport; options: ImportOptions }

const columnCache = new WeakMap<ColumnState, { rows: Int32Array; analysis: ColumnAnalysis }>();
const rowCache = new WeakMap<TableState, RowAnalysis>();
const changeCache = new WeakMap<TableState, ChangeSummary>();

export function example(value: string): string {
  const flat = value.replace(/\r\n|\r|\n/g, "↵").replace(/\t/g, "⇥");
  return flat.length > STUDIO_LIMITS.exampleChars ? `${flat.slice(0, STUDIO_LIMITS.exampleChars)}…` : flat;
}

function addExample(list: string[], value: string): void {
  if (list.length >= STUDIO_LIMITS.issueExamples) return;
  const shown = example(value);
  if (!list.includes(shown)) list.push(shown);
}

export function isProtected(column: Pick<ColumnState, "type" | "profile">): boolean {
  return column.type === "text" || column.profile !== null;
}

export function typeAccepts(column: Pick<ColumnState, "type" | "dateFormat">, value: string): boolean {
  switch (column.type) {
    case "integer": return parseIntegerCell(value) !== null;
    case "decimal": return parseDecimalCell(value) !== null;
    case "boolean": return parseBooleanCell(value) !== null;
    case "date": return column.dateFormat !== null && parseDateCell(value, column.dateFormat) !== null;
    default: return true;
  }
}

const PHONE = /^(?:\+?1[\s.-]?)?(?:\(\d{3}\)|\d{3})[\s.-]?\d{3}[\s.-]?\d{4}$/;
export function profileAccepts(profile: IdentifierProfile | null, value: string): boolean {
  switch (profile) {
    case "zip": return /^\d{5}$/.test(value);
    case "zip4": return /^\d{5}(?:-\d{4})?$/.test(value);
    case "phone": return PHONE.test(value);
    default: return true;
  }
}

export function analyzeColumn(column: ColumnState, rows: Int32Array): ColumnAnalysis {
  const cached = columnCache.get(column);
  if (cached && cached.rows === rows) return cached.analysis;
  const counts = new Int32Array(BITS);
  const first = new Int32Array(BITS).fill(-1);
  const examples: string[][] = Array.from({ length: BITS }, () => []);
  const analysis: ColumnAnalysis = {
    counts, first, examples, nonEmpty: 0, empty: 0, missing: 0,
    typeFailures: 0, typeFirst: -1, typeExamples: [], profileFailures: 0, profileFirst: -1, profileExamples: [],
    separatedDates: 0, isoDates: 0, nonNumeric: 0, nonNumericFirst: -1, nonNumericExamples: [], maxLength: 0, minLength: 0,
  };
  const typed = column.type === "integer" || column.type === "decimal" || column.type === "date" || column.type === "boolean";
  let minLength = Number.POSITIVE_INFINITY;
  for (let row = 0; row < rows.length; row++) {
    const value = column.values[rows[row]];
    const flags = cellFlags(value);
    if (flags & FLAG.MISSING) analysis.missing++;
    else if (flags & FLAG.EMPTY) analysis.empty++;
    else analysis.nonEmpty++;
    for (let bits = flags; bits; bits &= bits - 1) {
      const bit = 31 - Math.clz32(bits & -bits);
      counts[bit]++;
      if (first[bit] === -1) first[bit] = row;
      if (value !== undefined && examples[bit].length < STUDIO_LIMITS.issueExamples) addExample(examples[bit], value);
    }
    if (!value) continue;
    if (value.length > analysis.maxLength) analysis.maxLength = value.length;
    if (value.length < minLength) minLength = value.length;
    if (typed && !typeAccepts(column, value)) {
      analysis.typeFailures++;
      if (analysis.typeFirst === -1) analysis.typeFirst = row;
      addExample(analysis.typeExamples, value);
    }
    if (column.profile && !profileAccepts(column.profile, value)) {
      analysis.profileFailures++;
      if (analysis.profileFirst === -1) analysis.profileFirst = row;
      addExample(analysis.profileExamples, value);
    }
    const style = flags & FLAG.DATE_LIKE ? dateStyle(value) : null;
    if (style === "separated") analysis.separatedDates++;
    else if (style === "iso") analysis.isoDates++;
    if (!(flags & (FLAG.INTEGER | FLAG.DECIMAL | FLAG.LEADING_ZERO))) {
      analysis.nonNumeric++;
      if (analysis.nonNumericFirst === -1) analysis.nonNumericFirst = row;
      addExample(analysis.nonNumericExamples, value);
    }
  }
  analysis.minLength = Number.isFinite(minLength) ? minLength : 0;
  columnCache.set(column, { rows, analysis });
  return analysis;
}

function extraColumn(imported: ImportedTable, column: ColumnState): boolean {
  return imported.hasHeader && column.source !== null && column.source >= imported.headerWidth;
}

export function analyzeRows(state: TableState, imported: ImportedTable): RowAnalysis {
  const cached = rowCache.get(state);
  if (cached) return cached;
  const columns = visibleColumns(state);
  const result: RowAnalysis = { blank: 0, blankFirst: -1, duplicates: 0, duplicateFirst: -1, short: 0, shortFirst: -1, long: 0, longFirst: -1, malformed: 0, malformedFirst: -1, unclosed: 0, unclosedFirst: -1 };
  const seen = new Map<string, number>();
  const regular = columns.filter((column) => !extraColumn(imported, column) && !column.derived);
  const extra = columns.filter((column) => extraColumn(imported, column));
  for (let row = 0; row < state.rows.length; row++) {
    const physical = state.rows[row];
    let blank = true;
    let key = "";
    for (const column of columns) {
      const value = column.values[physical];
      if (value) blank = false;
      key += value === undefined ? "\u0000" : `${value}\u0001`;
    }
    if (blank) {
      result.blank++;
      if (result.blankFirst === -1) result.blankFirst = row;
    } else {
      if (seen.has(key)) {
        result.duplicates++;
        if (result.duplicateFirst === -1) result.duplicateFirst = row;
      } else seen.set(key, row);
      if (regular.some((column) => column.values[physical] === undefined)) {
        result.short++;
        if (result.shortFirst === -1) result.shortFirst = row;
      }
      if (extra.some((column) => Boolean(column.values[physical]))) {
        result.long++;
        if (result.longFirst === -1) result.longFirst = row;
      }
    }
    if (physical < imported.rowCount) {
      const flags = imported.rowFlags[physical];
      if (flags & ROW.MALFORMED) { result.malformed++; if (result.malformedFirst === -1) result.malformedFirst = row; }
      if (flags & ROW.UNCLOSED) { result.unclosed++; if (result.unclosedFirst === -1) result.unclosedFirst = row; }
    }
  }
  rowCache.set(state, result);
  return result;
}

const PROFILE_HINTS: [RegExp, IdentifierProfile][] = [
  [/zip|postal|post\s*code|postcode/i, "zip"],
  [/phone|mobile|cell|tel\b|telephone|fax/i, "phone"],
  [/\bsku\b/i, "sku"],
  [/account|acct/i, "account"],
  [/customer|cust\b|client/i, "customer"],
  [/employee|emp\b|staff/i, "employee"],
  [/invoice|inv\b/i, "invoice"],
  [/member/i, "membership"],
  [/product|item|upc|ean|gtin|isbn/i, "product"],
];

export function suggestProfile(name: string, analysis?: ColumnAnalysis): IdentifierProfile {
  const nonEmpty = analysis?.nonEmpty ?? 0;
  if (analysis && nonEmpty > 0) {
    const zip4 = analysis.counts[31 - Math.clz32(FLAG.ZIP4)];
    const zip5 = analysis.counts[31 - Math.clz32(FLAG.ZIP5)];
    if (zip4 > 0 && (zip4 + zip5) / nonEmpty >= 0.6) return "zip4";
    if (zip5 / nonEmpty >= 0.6 && /zip|postal|post/i.test(name)) return "zip";
  }
  for (const [pattern, profile] of PROFILE_HINTS) if (pattern.test(name)) return profile;
  return "other";
}

const bit = (flag: number) => 31 - Math.clz32(flag);

interface IssueInput {
  code: string;
  name: string;
  severity: Severity;
  category: IssueCategory;
  column?: ColumnState | null;
  position?: number;
  count: number;
  row?: number | null;
  examples?: string[];
  explanation: string;
  action: string;
  effect: string;
  fix?: FixSuggestion | null;
  locatable?: boolean;
  dismissible?: boolean;
}

function make(input: IssueInput): Issue {
  const column = input.column ?? null;
  return {
    id: `${input.code}:${column ? column.key : "file"}`,
    code: input.code,
    name: input.name,
    severity: input.severity,
    category: input.category,
    column: column ? column.key : null,
    columnName: column ? displayName(column, input.position ?? 0) : null,
    count: input.count,
    row: input.row === undefined || input.row === null || input.row < 0 ? null : input.row,
    examples: input.examples ?? [],
    explanation: input.explanation,
    proposedAction: input.action,
    expectedEffect: input.effect,
    reviewable: Boolean(input.fix && input.fix.kind === "op"),
    dismissible: input.dismissible ?? input.severity !== "error",
    locatable: input.locatable ?? (input.row !== undefined && input.row !== null && input.row >= 0),
    fix: input.fix ?? null,
  };
}

const n = (value: number) => value.toLocaleString("en-US");
const plural = (count: number, one: string, many = `${one}s`) => `${n(count)} ${count === 1 ? one : many}`;
const quoteList = (items: string[]) => items.map((item) => `“${item}”`).join(", ");

function columnIssues(column: ColumnState, position: number, analysis: ColumnAnalysis, rowCount: number, issues: Issue[]): void {
  const count = (flag: number) => analysis.counts[bit(flag)];
  const first = (flag: number) => analysis.first[bit(flag)];
  const examples = (flag: number) => analysis.examples[bit(flag)];
  const label = displayName(column, position);
  const protectedColumn = isProtected(column);
  const profile = suggestProfile(column.name, analysis);
  const protectOp: FixSuggestion = {
    kind: "op",
    label: profile === "other" ? "Keep as text" : `Keep as text (${PROFILE_LABELS[profile]})`,
    op: { kind: "setType", columns: [column.key], type: "text", profile: profile === "other" ? null : profile, dateFormat: null },
  };
  const base = { column, position };

  if (analysis.nonEmpty === 0 && rowCount > 0) {
    issues.push(make({
      ...base, code: "empty-column", name: "Empty column", severity: "info", category: "structure", count: rowCount,
      explanation: `Every cell in ${label} is empty. This often comes from a trailing delimiter at the end of each line.`,
      action: "Delete the column if it carries no meaning.",
      effect: "The export will no longer contain this blank column.",
      fix: { kind: "op", label: "Delete column", op: { kind: "deleteColumn", column: column.key } },
    }));
    return;
  }

  const zeros = count(FLAG.LEADING_ZERO);
  if (zeros > 0 && !protectedColumn) {
    const sample = examples(FLAG.LEADING_ZERO)[0] ?? "00123";
    const stripped = sample.replace(/^([+-]?)0+(?=\d)/, "$1");
    const numeric = column.type === "integer" || column.type === "decimal";
    issues.push(make({
      ...base, code: "leading-zero", name: "Leading zeros at risk", severity: "warning", category: "identifier", count: zeros, row: first(FLAG.LEADING_ZERO), examples: examples(FLAG.LEADING_ZERO),
      explanation: numeric
        ? `${plural(zeros, "value")} start with zero, such as ${sample}. As a number, Excel would store ${stripped}. These cells will be written as text instead.`
        : `${plural(zeros, "value")} start with zero, such as ${sample}. Excel removes leading zeros when it opens a CSV directly, so ${sample} becomes ${stripped}.`,
      action: "Keep this column as text, or apply an identifier profile.",
      effect: `In the Excel export these cells are real text cells with Text format, so ${sample} stays ${sample}.`,
      fix: protectOp,
    }));
  }

  const long = count(FLAG.LONG_DIGITS);
  if (long > 0 && !protectedColumn) {
    const sample = examples(FLAG.LONG_DIGITS)[0] ?? "";
    issues.push(make({
      ...base, code: "long-digits", name: "Long numbers beyond Excel’s precision", severity: column.type === "integer" || column.type === "decimal" ? "error" : "warning", category: "identifier",
      count: long, row: first(FLAG.LONG_DIGITS), examples: examples(FLAG.LONG_DIGITS),
      explanation: `${plural(long, "value")} have 16 or more digits, such as ${sample}. Excel stores numbers with 15 significant digits, so the final digits would become zeros.`,
      action: "Keep this column as text.",
      effect: "Exported as text cells, every digit stays exactly as imported.",
      fix: { ...protectOp, op: { kind: "setType", columns: [column.key], type: "text", profile: profile === "other" ? "account" : profile, dateFormat: null } },
    }));
  }

  const scientific = count(FLAG.SCIENTIFIC);
  if (scientific > 0) {
    issues.push(make({
      ...base, code: "scientific", name: "Values already in scientific notation", severity: "warning", category: "identifier", count: scientific, row: first(FLAG.SCIENTIFIC), examples: examples(FLAG.SCIENTIFIC),
      explanation: `${plural(scientific, "value")} look like ${examples(FLAG.SCIENTIFIC)[0]}. This usually means a spreadsheet already rounded a long ID before the CSV was saved. The original digits are not in this file and can’t be recovered here.`,
      action: "Export the data again from the source system. Keep the column as text to avoid further changes.",
      effect: "CSV Studio keeps these values exactly as written; it does not invent digits.",
      fix: protectedColumn ? null : protectOp,
    }));
  }

  if (column.profile === "zip" || column.profile === "zip4" || (!protectedColumn && /zip|postal|post\s*code/i.test(column.name))) {
    const short = count(FLAG.SHORT_DIGITS);
    if (short > 0) {
      issues.push(make({
        ...base, code: "zip-short", name: "ZIP codes with missing digits", severity: "warning", category: "identifier", count: short, row: first(FLAG.SHORT_DIGITS), examples: examples(FLAG.SHORT_DIGITS),
        explanation: `${plural(short, "value")} have only 3–4 digits, such as ${examples(FLAG.SHORT_DIGITS)[0]}. Their leading zeros were probably removed before this file was saved. CSV Studio can’t know the missing digits.`,
        action: "Pad only if you know every value should have a fixed length (for example 5 for US ZIP codes). Otherwise correct them at the source.",
        effect: "Padding adds zeros on the left of digit-only values shorter than the length you type.",
        fix: { kind: "pad", label: "Pad to a length you choose", column: column.key },
      }));
    }
  }

  if (column.profile && analysis.profileFailures > 0 && ["zip", "zip4", "phone"].includes(column.profile)) {
    issues.push(make({
      ...base, code: "profile-mismatch", name: `Values that don’t match ${PROFILE_LABELS[column.profile]}`, severity: "info", category: "identifier",
      count: analysis.profileFailures, row: analysis.profileFirst, examples: analysis.profileExamples,
      explanation: `${plural(analysis.profileFailures, "value")} don’t follow the usual ${PROFILE_LABELS[column.profile]} pattern, for example ${quoteList(analysis.profileExamples.slice(0, 2))}. They are still exported as text, unchanged.`,
      action: "Review these cells and correct them if they are typos.",
      effect: "No automatic change is made.",
    }));
  }

  const formula = count(FLAG.FORMULA) - count(FLAG.SIGNED_NUMBER);
  if (formula > 0) {
    issues.push(make({
      ...base, code: "formula", name: "Formula-like values", severity: "warning", category: "security", count: formula, row: first(FLAG.FORMULA),
      examples: examples(FLAG.FORMULA),
      explanation: `${plural(formula, "value")} begin with =, +, − or @ (for example ${quoteList(examples(FLAG.FORMULA).slice(0, 2))}). Spreadsheet apps can run text like this as a formula when a CSV is opened.`,
      action: "Export Excel (.xlsx), where every value is a text cell, or use spreadsheet-safe CSV.",
      effect: "The XLSX export never writes formulas. Spreadsheet-safe CSV adds an apostrophe in front of these values.",
    }));
  }

  if (column.type === "auto" || column.type === "text") {
    const dates = count(FLAG.DATE_LIKE);
    if (dates > 0 && column.type === "auto") {
      issues.push(make({
        ...base, code: "date-like", name: "Text Excel may turn into dates", severity: "info", category: "identifier", count: dates, row: first(FLAG.DATE_LIKE), examples: examples(FLAG.DATE_LIKE),
        explanation: `${plural(dates, "value")} look like dates or times to Excel, such as ${examples(FLAG.DATE_LIKE)[0]}. Opening this CSV directly in Excel can convert them.`,
        action: "Leave the column as Automatic or Text to keep the exact text, or choose Date with an explicit format.",
        effect: "The Excel export keeps these values as text unless you set the Date type.",
        fix: protectOp,
      }));
    }
    if (analysis.separatedDates > 0 && analysis.isoDates > 0) {
      issues.push(make({
        ...base, code: "mixed-dates", name: "Mixed date formats", severity: "warning", category: "type", count: Math.min(analysis.separatedDates, analysis.isoDates), row: first(FLAG.DATE_LIKE), examples: examples(FLAG.DATE_LIKE),
        explanation: `This column mixes ${plural(analysis.separatedDates, "slash-style date")} with ${plural(analysis.isoDates, "ISO date")} (YYYY-MM-DD). One format will be misread if Excel converts them.`,
        action: "Keep the column as text, or standardize the values at the source before choosing a Date type.",
        effect: "No automatic date conversion is made.",
      }));
    }
  }

  if (column.type === "auto" && analysis.nonEmpty >= 3 && zeros === 0 && long === 0) {
    const numeric = analysis.nonEmpty - analysis.nonNumeric;
    const share = numeric / analysis.nonEmpty;
    if (analysis.nonNumeric === 0) {
      const integers = count(FLAG.INTEGER);
      const integerOnly = integers === analysis.nonEmpty;
      issues.push(make({
        ...base, code: "numbers-as-text", name: "Numbers will export as text", severity: "info", category: "type", count: analysis.nonEmpty, row: null,
        explanation: `Every value in ${label} is a plain number. Automatic columns are exported as text so nothing is reinterpreted, which means Excel won’t SUM them until they are converted.`,
        action: `Set the type to ${integerOnly ? "Integer" : "Decimal"} if you want numeric Excel cells.`,
        effect: `Values that parse cleanly become ${integerOnly ? "integer" : "number"} cells. Anything else stays text and is reported.`,
        fix: { kind: "op", label: `Set type: ${integerOnly ? "Integer" : "Decimal"}`, op: { kind: "setType", columns: [column.key], type: integerOnly ? "integer" : "decimal", profile: null, dateFormat: null } },
        locatable: false,
      }));
    } else if (share >= 0.8) {
      issues.push(make({
        ...base, code: "mixed-types", name: "Mostly numbers, some text", severity: "warning", category: "type", count: analysis.nonNumeric, row: analysis.nonNumericFirst, examples: analysis.nonNumericExamples,
        explanation: `${Math.round(share * 100)}% of ${label} is numeric, but ${plural(analysis.nonNumeric, "value")} aren’t, such as ${quoteList(analysis.nonNumericExamples.slice(0, 2))}. Totals and filters may treat them differently.`,
        action: "Review these cells. Correct typos, or keep the column as text if the mix is intentional.",
        effect: "No automatic change is made.",
      }));
    }
  }

  if (analysis.typeFailures > 0) {
    const typeName = column.type === "date" ? `dates in ${column.dateFormat ?? "the chosen"} format` : column.type === "boolean" ? "true/false values" : `${column.type} values`;
    issues.push(make({
      ...base, code: "type-mismatch", name: `Values that aren’t valid ${column.type === "date" ? "dates" : column.type}`, severity: "warning", category: "type", count: analysis.typeFailures, row: analysis.typeFirst, examples: analysis.typeExamples,
      explanation: column.type === "date" && !column.dateFormat
        ? "Choose a date format for this column. Without one, CSV Studio won’t convert any value to a date."
        : `${plural(analysis.typeFailures, "value")} can’t be read as ${typeName}, for example ${quoteList(analysis.typeExamples.slice(0, 2))}.`,
      action: "Correct those cells, or switch the column back to Automatic or Text.",
      effect: "Cells that don’t parse are written as text, unchanged, and listed in the export summary.",
    }));
  }

  const simple: [number, string, string, Severity, IssueCategory, string, string, string, FixSuggestion | null][] = [
    [FLAG.WS_EDGE, "whitespace", "Leading or trailing spaces", "info", "text",
      "have spaces, tabs or line breaks at the start or end. They are invisible in Excel but break lookups and duplicate checks.",
      "Trim whitespace in this column.", "Only the outer whitespace is removed; inner text is unchanged.",
      { kind: "op", label: "Trim whitespace", op: { kind: "trim", columns: [column.key] } }],
    [FLAG.WS_INNER, "inner-whitespace", "Irregular spaces inside values", "info", "text",
      "contain double spaces, tabs or no-break spaces between words.",
      "Normalize spaces in this column.", "No-break and other Unicode spaces become normal spaces and runs of spaces collapse to one. Tabs and line breaks stay.",
      { kind: "op", label: "Normalize spaces", op: { kind: "normalizeSpaces", columns: [column.key] } }],
    [FLAG.CONTROL, "control-chars", "Hidden control characters", "warning", "text",
      "contain invisible control characters (for example NUL, zero-width spaces or C1 codes). These often come from encoding problems or copy-paste.",
      "Remove control characters in this column.", "Tabs and line breaks inside values are kept; other control characters are removed.",
      { kind: "op", label: "Remove control characters", op: { kind: "removeControls", columns: [column.key] } }],
    [FLAG.BOM, "bom-cells", "Byte-order marks inside values", "warning", "encoding",
      "contain an invisible byte-order mark (U+FEFF), usually from files that were joined together.",
      "Strip byte-order marks.", "The invisible mark is removed; visible text is unchanged.",
      { kind: "op", label: "Strip BOM characters", op: { kind: "stripBom", columns: [column.key] } }],
    [FLAG.REPLACEMENT, "replacement-chars", "Unreadable characters (�)", "warning", "encoding",
      "contain the replacement character �, which appears when bytes don’t fit the selected encoding.",
      "Open the Encoding Lab and compare encodings.", "Re-importing with the right encoding restores the original characters. The source file is never changed.",
      { kind: "encoding-lab", label: "Open Encoding Lab" }],
    [FLAG.MOJIBAKE, "mojibake", "Possibly garbled characters", "warning", "encoding",
      "contain sequences such as “Ã©” or “â€™” that usually mean UTF-8 text was read with the wrong encoding. This is a heuristic.",
      "Compare encodings in the Encoding Lab.", "Choosing the encoding that shows names correctly re-reads the original bytes.",
      { kind: "encoding-lab", label: "Open Encoding Lab" }],
    [FLAG.SURROGATE, "surrogates", "Broken Unicode characters", "warning", "encoding",
      "contain half of an emoji or other character (an unpaired surrogate).",
      "Correct these cells manually.", "Excel can’t store them; the export writes � in their place and says so.", null],
    [FLAG.LINEBREAK, "line-breaks", "Line breaks inside values", "info", "text",
      "contain line breaks. They are valid when the value is quoted, and Excel shows them with Wrap Text.",
      "No action is needed unless the breaks are unwanted.", "Line breaks are preserved in every export.", null],
    [FLAG.APOSTROPHE, "apostrophe", "Values starting with an apostrophe", "info", "text",
      "already begin with an apostrophe ('). It is part of the text in this file, not Excel’s hidden text marker.",
      "Remove it with Find and replace if it was added by another tool.", "Exports keep the apostrophe as part of the value.", null],
    [FLAG.SENTINEL, "sentinel", "Placeholder values like NULL or N/A", "info", "quality",
      "are placeholders such as NULL, N/A or #N/A rather than real data.",
      "Replace them with empty cells if your target system expects blanks.", "Find and replace changes only exact matches.",
      { kind: "find-replace", label: "Find and replace", column: column.key, find: examples(FLAG.SENTINEL)[0] ?? "NULL" }],
    [FLAG.VERY_LONG, "very-long", "Very long values", "info", "quality",
      `are longer than ${n(STUDIO_LIMITS.longCellChars)} characters, which can mean merged rows or an embedded document.`,
      "Inspect these cells to confirm they are intended.", "No automatic change is made.", null],
  ];
  for (const [flag, code, name, severity, category, explanation, action, effect, fix] of simple) {
    const total = count(flag);
    if (!total) continue;
    issues.push(make({ ...base, code, name, severity, category, count: total, row: first(flag), examples: examples(flag), explanation: `${plural(total, "value")} ${explanation}`, action, effect, fix }));
  }

  const tooLong = count(FLAG.TOO_LONG);
  if (tooLong > 0) {
    issues.push(make({
      ...base, code: "too-long", name: "Too long for an Excel cell", severity: "error", category: "quality", count: tooLong, row: first(FLAG.TOO_LONG),
      explanation: `${plural(tooLong, "value")} exceed Excel’s limit of ${n(STUDIO_LIMITS.excelCellChars)} characters per cell. Excel export is blocked so nothing is silently cut off.`,
      action: "Shorten or split these values, or export CSV instead.",
      effect: "CSV export keeps the full text.",
      dismissible: false,
    }));
  }
}

function headerIssues(ctx: ValidationContext, columns: ColumnState[], issues: Issue[]): void {
  const { imported } = ctx;
  if (!imported.hasHeader) {
    issues.push(make({
      code: "no-header", name: "No header row", severity: "info", category: "structure", count: columns.length,
      explanation: "This file was imported without a header row, so columns are named Column 1, Column 2 and so on.",
      action: "Rename columns, or re-import with the header option on if the first row holds names.",
      effect: "Exports use the column names shown in the grid.",
      fix: { kind: "reimport", label: "Use first row as header", patch: { header: true } },
      locatable: false,
    }));
    return;
  }
  const counts = new Map<string, number>();
  for (const column of columns) counts.set(column.name, (counts.get(column.name) ?? 0) + 1);
  const repair: FixSuggestion = { kind: "op", label: "Repair header names", op: { kind: "repairHeaders", names: null } };
  const blank = columns.filter((column) => !column.name.trim() && !column.synthetic);
  if (blank.length) {
    issues.push(make({
      code: "blank-header", name: "Blank column names", severity: "warning", category: "structure", count: blank.length,
      explanation: `${plural(blank.length, "column")} ${blank.length === 1 ? "has" : "have"} no header name. Lookups, imports and JSON export need a name for every column.`,
      action: "Fill blank names. You can review and edit each proposed name.",
      effect: "Blank headers become “Column N” (or the names you type). Cell values are unchanged.",
      fix: repair, locatable: false,
    }));
  }
  const duplicates = [...counts].filter(([name, count]) => name.trim() && count > 1);
  if (duplicates.length) {
    issues.push(make({
      code: "duplicate-header", name: "Duplicate column names", severity: "warning", category: "structure", count: duplicates.reduce((sum, [, count]) => sum + count, 0),
      examples: duplicates.slice(0, 3).map(([name]) => example(name)),
      explanation: `${quoteList(duplicates.slice(0, 3).map(([name]) => example(name)))} ${duplicates.length === 1 ? "appears" : "appear"} more than once. Many tools keep only one of the duplicate columns.`,
      action: "Give each column a unique name.",
      effect: "Later duplicates get a numbered suffix such as “Name (2)”, unless you type other names.",
      fix: repair, locatable: false,
    }));
  }
  const spaced = columns.filter((column) => column.name !== column.name.trim() && column.name.trim());
  if (spaced.length) {
    issues.push(make({
      code: "header-whitespace", name: "Spaces around column names", severity: "info", category: "structure", count: spaced.length,
      examples: spaced.slice(0, 3).map((column) => `“${example(column.name)}”`),
      explanation: "Some column names start or end with spaces, which makes them look identical to other names while failing exact matches.",
      action: "Repair header names.", effect: "Outer spaces are removed from column names.", fix: repair, locatable: false,
    }));
  }
  const bom = columns.filter((column) => column.name.includes("\ufeff"));
  if (bom.length) {
    issues.push(make({
      code: "header-bom", name: "Hidden mark in a column name", severity: "warning", category: "encoding", count: bom.length,
      explanation: "A column name contains an invisible byte-order mark. Lookups for that column name will fail until it is removed.",
      action: "Strip byte-order marks.", effect: "The invisible mark is removed from names and cells.",
      fix: { kind: "op", label: "Strip BOM characters", op: { kind: "stripBom", columns: "all" } }, locatable: false,
    }));
  }
  const named = columns.filter((column) => column.name.trim() && !column.derived);
  const dataLike = named.filter((column) => {
    const flags = cellFlags(column.name.trim());
    return Boolean(flags & (FLAG.INTEGER | FLAG.DECIMAL | FLAG.LEADING_ZERO | FLAG.DATE_LIKE | FLAG.ZIP4 | FLAG.PHONE | FLAG.LONG_DIGITS));
  });
  if (named.length && dataLike.length / named.length >= 0.5) {
    issues.push(make({
      code: "header-like-data", name: "First row looks like data", severity: "warning", category: "structure", count: dataLike.length,
      examples: dataLike.slice(0, 3).map((column) => example(column.name)),
      explanation: `The column names include values such as ${quoteList(dataLike.slice(0, 2).map((column) => example(column.name)))}, which look like data rather than headings. The file may not have a header row.`,
      action: "Move the current names into the first data row and use Column 1, Column 2… as names.",
      effect: "One row is added at the top. No values are lost.",
      fix: { kind: "op", label: "Use first row as data", op: { kind: "demoteHeader" } }, locatable: false,
    }));
  }
}

function fileIssues(ctx: ValidationContext, columns: ColumnState[], rows: RowAnalysis, issues: Issue[]): void {
  const { report, imported, state, options } = ctx;
  if (state.rows.length === 0) {
    issues.push(make({
      code: "empty-data", name: "No data rows", severity: "info", category: "structure", count: 0,
      explanation: "This file has a header but no data rows.", action: "Check that you selected the right file and header row.", effect: "Only the header can be exported.", locatable: false,
    }));
  }
  if (report.unclosedQuote) {
    issues.push(make({
      code: "unclosed-quote", name: "Unclosed quote", severity: "error", category: "structure", count: 1, row: rows.unclosedFirst,
      explanation: `A quote that opens on line ${n(report.unclosedQuote.line)} is never closed, so everything after it became a single cell.`,
      action: "Fix the quote in the source file, or re-import with Quote set to None if quotes are ordinary characters in this file.",
      effect: "With Quote: None, quote characters are kept as text and every line becomes its own row.",
      fix: { kind: "reimport", label: "Re-import with Quote: None", patch: { quote: "none" } }, dismissible: false,
    }));
  }
  if (rows.malformed > 0) {
    issues.push(make({
      code: "malformed-quotes", name: "Text after a closing quote", severity: "error", category: "structure", count: rows.malformed, row: rows.malformedFirst,
      explanation: `${plural(rows.malformed, "row")} contain a quoted value followed by more text, such as "abc"def. CSV Studio kept all characters (as Excel does), but the row may be split differently than intended.`,
      action: "Review these rows in the raw record view. If quotes are ordinary characters in this file, re-import with Quote: None.",
      effect: "Re-importing reads the original bytes again; nothing in the source file changes.",
      fix: { kind: "reimport", label: "Re-import with Quote: None", patch: { quote: "none" } },
    }));
  }
  if (report.strayQuotes > 0) {
    issues.push(make({
      code: "stray-quotes", name: "Quote marks inside unquoted values", severity: "info", category: "text", count: report.strayQuotes,
      explanation: `${plural(report.strayQuotes, "value")} contain a quote character without being wrapped in quotes (for example 5'10" or 12" ruler). They were kept exactly as typed.`,
      action: "No action is needed unless a value looks cut off.", effect: "CSV exports quote these values correctly.", locatable: false,
    }));
  }
  if (rows.long > 0) {
    issues.push(make({
      code: "ragged-long", name: "Rows with extra fields", severity: "error", category: "structure", count: rows.long, row: rows.longFirst,
      explanation: `${plural(rows.long, "row")} have more fields than the header (${n(imported.headerWidth)}). The extra values are shown in untitled columns on the right, so nothing is dropped.`,
      action: "Review those rows. An unquoted delimiter inside a value is the usual cause.",
      effect: "If the extra values are noise, delete the extra column. If not, fix the source and re-import.",
    }));
  }
  if (rows.short > 0) {
    issues.push(make({
      code: "ragged-short", name: "Rows with missing fields", severity: "warning", category: "structure", count: rows.short, row: rows.shortFirst,
      explanation: `${plural(rows.short, "row")} have fewer fields than the header. Missing cells are shown with a dash and exported as empty cells.`,
      action: "Review those rows. Values after a missing field may belong to a different column.",
      effect: "No automatic change is made.",
    }));
  }
  if (rows.blank > 0) {
    issues.push(make({
      code: "blank-rows", name: "Blank rows", severity: "info", category: "structure", count: rows.blank, row: rows.blankFirst,
      explanation: `${plural(rows.blank, "row")} contain no values.`,
      action: "Remove fully blank rows.", effect: "Only rows where every visible cell is empty are removed. You can undo this.",
      fix: { kind: "op", label: "Remove blank rows", op: { kind: "removeBlankRows" } },
    }));
  }
  if (rows.duplicates > 0) {
    issues.push(make({
      code: "duplicate-rows", name: "Exact duplicate rows", severity: "warning", category: "quality", count: rows.duplicates, row: rows.duplicateFirst,
      explanation: `${plural(rows.duplicates, "row")} repeat an earlier row exactly, cell for cell.`,
      action: "Preview the duplicates, then remove them if they are not intentional.",
      effect: "The first copy of each row is kept; later exact copies are removed. You can undo this.",
      fix: { kind: "op", label: "Review duplicate removal", op: { kind: "removeDuplicateRows" } },
    }));
  }
  if (report.delimiter.ambiguous) {
    const [first, second] = [...report.delimiter.candidates].filter((candidate) => candidate.width > 1 && candidate.consistency >= 0.8).sort((a, b) => b.consistency - a.consistency);
    issues.push(make({
      code: "ambiguous-delimiter", name: "Delimiter needs your choice", severity: "warning", category: "structure", count: 1,
      explanation: report.delimiter.reason,
      action: `Choose the delimiter${first && second ? `: ${first.label.toLowerCase()} or ${second.label.toLowerCase()}` : ""}.`,
      effect: "The original file is read again with that delimiter.",
      fix: first ? { kind: "reimport", label: `Use ${first.label.toLowerCase()}`, patch: { delimiter: first.delimiter as ImportOptions["delimiter"] } } : null,
      locatable: false,
    }));
  } else if (columns.length === 1 && state.rows.length > 0 && report.delimiter.choice !== "auto") {
    const column = columns[0];
    const counts = new Map<string, number>();
    let filled = 0;
    for (let row = 0; row < state.rows.length && row < 5_000; row++) {
      const value = column.values[state.rows[row]];
      if (!value) continue;
      filled++;
      for (const char of [";", ",", "\t", "|"]) if (value.includes(char)) counts.set(char, (counts.get(char) ?? 0) + 1);
    }
    const best = [...counts].sort((a, b) => b[1] - a[1])[0];
    if (best && filled > 0 && best[1] / filled >= 0.8 && best[0] !== report.delimiter.used) {
      issues.push(make({
        code: "single-column-delimiter", name: "Everything is in one column", severity: "warning", category: "structure", count: best[1],
        explanation: `${n(best[1])} of ${n(filled)} rows contain ${delimiterLabel(best[0]).toLowerCase()}s, but the file was read as a single column. It probably uses ${delimiterLabel(best[0]).toLowerCase()} as its delimiter.`,
        action: `Switch the delimiter to ${delimiterLabel(best[0]).toLowerCase()} to rebuild the columns.`,
        effect: "The original file is read again; nothing is lost.",
        fix: { kind: "reimport", label: `Use ${delimiterLabel(best[0]).toLowerCase()}`, patch: { delimiter: best[0] as ImportOptions["delimiter"] } },
        locatable: false,
      }));
    }
  } else if (columns.length === 1 && state.rows.length > 0 && !report.delimiter.used && /not consistently/.test(report.delimiter.reason)) {
    issues.push(make({
      code: "single-column", name: "Read as one column", severity: "info", category: "structure", count: state.rows.length,
      explanation: report.delimiter.reason,
      action: "If this file should have columns, choose its delimiter in Setup.",
      effect: "Choosing a delimiter re-reads the original file; nothing is lost.",
      locatable: false,
    }));
  }
  if (report.encoding.replacements > 0) {
    issues.push(make({
      code: "file-replacements", name: "Encoding may be wrong", severity: "warning", category: "encoding", count: report.encoding.replacements,
      explanation: `Decoding with ${report.encoding.used.toUpperCase()} produced ${plural(report.encoding.replacements, "replacement character")} (�). Some bytes don’t fit this encoding.`,
      action: "Compare encodings side by side in the Encoding Lab.", effect: "Choosing another encoding re-reads the original bytes.",
      fix: { kind: "encoding-lab", label: "Open Encoding Lab" }, locatable: false,
    }));
  }
  if (report.encoding.bom) {
    issues.push(make({
      code: "bom", name: "Byte-order mark at the start", severity: "info", category: "encoding", count: 1,
      explanation: `The file starts with a ${report.encoding.bom === "utf-8" ? "UTF-8" : "UTF-16"} byte-order mark. It identifies the encoding and was not added to your first column name.`,
      action: "No action is needed.", effect: "CSV exports include a BOM only when you choose that option.", locatable: false,
    }));
  }
  const endings = [report.lineEndings.crlf, report.lineEndings.lf, report.lineEndings.cr].filter(Boolean).length;
  if (endings > 1) {
    issues.push(make({
      code: "mixed-line-endings", name: "Mixed line endings", severity: "info", category: "text", count: report.lineEndings.crlf + report.lineEndings.lf + report.lineEndings.cr,
      explanation: `The file mixes ${[report.lineEndings.crlf && `${n(report.lineEndings.crlf)} CRLF`, report.lineEndings.lf && `${n(report.lineEndings.lf)} LF`, report.lineEndings.cr && `${n(report.lineEndings.cr)} CR`].filter(Boolean).join(", ")} line endings. Each one was treated as a row break.`,
      action: "No action is needed.", effect: "CSV exports use one line-ending style that you choose.", locatable: false,
    }));
  }
  if (report.skippedRecords > 0 || report.commentLines > 0) {
    issues.push(make({
      code: "skipped", name: "Rows skipped before the header", severity: "info", category: "structure", count: report.skippedRecords + report.commentLines,
      explanation: `${report.skippedRecords ? `${plural(report.skippedRecords, "row")} above the header ${report.skippedRecords === 1 ? "was" : "were"} skipped as you asked. ` : ""}${report.commentLines ? `${plural(report.commentLines, "comment line")} starting with “${options.comment}” ${report.commentLines === 1 ? "was" : "were"} ignored.` : ""}`,
      action: "Adjust the setup if real data was skipped.", effect: "Skipped rows are not part of the export.", locatable: false,
    }));
  }
  if (!report.endsWithNewline && state.rows.length > 0 && imported.rowCount > 0 && imported.rowFlags[imported.rowCount - 1] & ROW.TRUNCATED) {
    issues.push(make({
      code: "truncated", name: "Last row may be cut off", severity: "warning", category: "structure", count: 1, row: state.rows.length - 1,
      explanation: "The file ends without a line break and its last row has fewer fields than the header. The file may have been truncated during download or export.",
      action: "Compare the last row with the source system.", effect: "No automatic change is made.",
    }));
  }
  if (columns.length > STUDIO_LIMITS.warnColumns) {
    issues.push(make({
      code: "wide", name: "Very wide file", severity: "info", category: "quality", count: columns.length,
      explanation: `This file has ${n(columns.length)} columns. Scrolling and export can be slower above ${STUDIO_LIMITS.warnColumns}.`,
      action: "Hide or delete columns you don’t need before exporting.", effect: "Hidden columns are left out of exports unless you include them.", locatable: false,
    }));
  }
}

const ORDER: Record<Severity, number> = { error: 0, warning: 1, info: 2 };

export function validate(ctx: ValidationContext): Issue[] {
  const issues: Issue[] = [];
  const columns = visibleColumns(ctx.state);
  const rows = analyzeRows(ctx.state, ctx.imported);
  fileIssues(ctx, columns, rows, issues);
  headerIssues(ctx, columns, issues);
  columns.forEach((column, position) => columnIssues(column, position, analyzeColumn(column, ctx.state.rows), ctx.state.rows.length, issues));
  return issues.sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);
}

const LOCATE_FLAGS: Record<string, number> = {
  "leading-zero": FLAG.LEADING_ZERO, "long-digits": FLAG.LONG_DIGITS, scientific: FLAG.SCIENTIFIC, "zip-short": FLAG.SHORT_DIGITS,
  "date-like": FLAG.DATE_LIKE, "mixed-dates": FLAG.DATE_LIKE, whitespace: FLAG.WS_EDGE, "inner-whitespace": FLAG.WS_INNER, "control-chars": FLAG.CONTROL,
  "bom-cells": FLAG.BOM, "replacement-chars": FLAG.REPLACEMENT, mojibake: FLAG.MOJIBAKE, surrogates: FLAG.SURROGATE, "line-breaks": FLAG.LINEBREAK,
  apostrophe: FLAG.APOSTROPHE, sentinel: FLAG.SENTINEL, "very-long": FLAG.VERY_LONG, "too-long": FLAG.TOO_LONG,
};

/** Next affected cell after `after` (wrapping). Column = visible position, -1 for whole-row issues. */
export function locate(ctx: ValidationContext, issueId: string, after: number): { row: number; column: number } | null {
  const [code, key] = issueId.split(":");
  const columns = visibleColumns(ctx.state);
  const position = key === "file" ? -1 : columns.findIndex((column) => column.key === Number(key));
  const column = position >= 0 ? columns[position] : null;
  const total = ctx.state.rows.length;
  if (!total) return null;
  let test: ((physical: number) => boolean) | null = null;
  if (column) {
    const flag = LOCATE_FLAGS[code];
    if (flag) test = (physical) => Boolean(cellFlags(column.values[physical]) & flag);
    else if (code === "formula") test = (physical) => { const flags = cellFlags(column.values[physical]); return Boolean(flags & FLAG.FORMULA) && !(flags & FLAG.SIGNED_NUMBER); };
    else if (code === "type-mismatch") test = (physical) => { const value = column.values[physical]; return Boolean(value) && !typeAccepts(column, value as string); };
    else if (code === "profile-mismatch") test = (physical) => { const value = column.values[physical]; return Boolean(value) && !profileAccepts(column.profile, value as string); };
    else if (code === "mixed-types") test = (physical) => { const value = column.values[physical]; return Boolean(value) && !(cellFlags(value) & (FLAG.INTEGER | FLAG.DECIMAL | FLAG.LEADING_ZERO)); };
  } else {
    const regular = columns.filter((item) => !extraColumn(ctx.imported, item) && !item.derived);
    const extra = columns.filter((item) => extraColumn(ctx.imported, item));
    const blank = (physical: number) => columns.every((item) => !item.values[physical]);
    if (code === "blank-rows") test = blank;
    else if (code === "ragged-short") test = (physical) => !blank(physical) && regular.some((item) => item.values[physical] === undefined);
    else if (code === "ragged-long") test = (physical) => extra.some((item) => Boolean(item.values[physical]));
    else if (code === "malformed-quotes") test = (physical) => physical < ctx.imported.rowCount && Boolean(ctx.imported.rowFlags[physical] & ROW.MALFORMED);
    else if (code === "unclosed-quote") test = (physical) => physical < ctx.imported.rowCount && Boolean(ctx.imported.rowFlags[physical] & ROW.UNCLOSED);
    else if (code === "truncated") return { row: total - 1, column: 0 };
    else if (code === "duplicate-rows") {
      const seen = new Set<string>();
      const duplicates: number[] = [];
      for (let row = 0; row < total; row++) {
        const physical = ctx.state.rows[row];
        if (blank(physical)) continue;
        const keyText = columns.map((item) => (item.values[physical] === undefined ? "\u0000" : `${item.values[physical]}\u0001`)).join("");
        if (seen.has(keyText)) duplicates.push(row);
        else seen.add(keyText);
      }
      const next = duplicates.find((row) => row > after) ?? duplicates[0];
      return next === undefined ? null : { row: next, column: 0 };
    }
  }
  if (!test) return null;
  for (let step = 1; step <= total; step++) {
    const row = (after + step + total) % total;
    if (test(ctx.state.rows[row])) return { row, column: Math.max(position, 0) };
  }
  return null;
}

export function cellMark(column: ColumnState, value: string | undefined): number {
  const flags = cellFlags(value);
  let mark = 0;
  if (flags & FLAG.MISSING) return MARK.MISSING;
  if (!value) return 0;
  const protectedColumn = isProtected(column);
  if (flags & FLAG.TOO_LONG) mark |= MARK.ERROR;
  if (flags & (FLAG.CONTROL | FLAG.REPLACEMENT | FLAG.BOM | FLAG.SURROGATE | FLAG.MOJIBAKE | FLAG.SCIENTIFIC)) mark |= MARK.WARNING;
  if (flags & (FLAG.LEADING_ZERO | FLAG.LONG_DIGITS)) mark |= protectedColumn ? MARK.IDENTIFIER : MARK.WARNING;
  if ((flags & FLAG.FORMULA) && !(flags & FLAG.SIGNED_NUMBER)) mark |= MARK.WARNING | MARK.FORMULA;
  if ((column.type === "integer" || column.type === "decimal" || column.type === "date" || column.type === "boolean") && !typeAccepts(column, value)) mark |= MARK.WARNING;
  if (column.profile && !profileAccepts(column.profile, value)) mark |= MARK.INFO;
  if (!(mark & (MARK.ERROR | MARK.WARNING)) && (flags & (FLAG.WS_EDGE | FLAG.WS_INNER | FLAG.SENTINEL | FLAG.APOSTROPHE | FLAG.VERY_LONG) || (column.type === "auto" && flags & FLAG.DATE_LIKE))) mark |= MARK.INFO;
  return mark;
}

export function computeChanges(state: TableState, imported: ImportedTable): ChangeSummary {
  const cached = changeCache.get(state);
  if (cached) return cached;
  let cells = 0;
  let rowsAdded = 0;
  const present = new Set<number>();
  for (const column of state.columns) if (column.source !== null) present.add(column.source);
  for (let row = 0; row < state.rows.length; row++) {
    const physical = state.rows[row];
    if (physical >= imported.rowCount) { rowsAdded++; continue; }
    for (const column of state.columns) if (column.source !== null && !column.hidden && cellChanged(imported, column, physical)) cells++;
  }
  const kept = state.rows.length - rowsAdded;
  const summary: ChangeSummary = {
    cells,
    rowsRemoved: imported.rowCount - kept,
    rowsAdded,
    columnsAdded: state.columns.filter((column) => column.source === null).length,
    columnsRemoved: imported.columns.length - present.size,
    headersChanged: state.columns.filter((column) => column.source !== null && headerChanged(imported, column)).length,
    typesChanged: state.columns.filter((column) => column.type !== "auto" || column.profile !== null).length,
  };
  changeCache.set(state, summary);
  return summary;
}

export function exportBlockers(state: TableState): { xlsx: string | null; json: string | null } {
  const columns = visibleColumns(state);
  if (!columns.length) return { xlsx: "Every column is hidden. Show at least one column to export.", json: "Every column is hidden. Show at least one column to export." };
  let tooLong = 0;
  let firstRow = -1;
  let firstColumn = "";
  columns.forEach((column, position) => {
    const analysis = analyzeColumn(column, state.rows);
    const count = analysis.counts[bit(FLAG.TOO_LONG)];
    if (count && firstRow === -1) { firstRow = analysis.first[bit(FLAG.TOO_LONG)]; firstColumn = displayName(column, position); }
    tooLong += count;
  });
  const names = columns.map((column) => column.name);
  const jsonProblem = names.some((name) => !name.trim()) ? "Every column needs a name for JSON export. Repair header names first."
    : new Set(names).size !== names.length ? "Column names must be unique for JSON export. Repair header names first." : null;
  return {
    xlsx: tooLong ? `${plural(tooLong, "cell")} exceed Excel’s ${n(STUDIO_LIMITS.excelCellChars)}-character limit (first: row ${n(firstRow + 1)}, ${firstColumn}). Shorten them or export CSV.` : null,
    json: jsonProblem,
  };
}
