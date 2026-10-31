import { describeCodePoint, cellFlags, FLAG } from "./detect";
import { assertTextLike, decodeBytes, detectEncoding, encodingLab, unwrapContainer } from "./encoding";
import { exportDelimited, exportJson, exportXlsx, type ExportHooks, type ExportOutput } from "./export";
import { parseDecimalCell } from "./convert";
import { detectDelimiter, fieldQuoting, tokenize } from "./parse";
import { applyRepair } from "./repairs";
import { ROW, cellChanged, columnInfo, displayName, initialState, originalValue, visibleColumns, type Cell, type ImportedTable, type TableState } from "./table";
import { analyzeColumn, cellMark, computeChanges, exportBlockers, isProtected, locate, suggestProfile, validate } from "./validate";
import {
  DEFAULT_IMPORT_OPTIONS, MARK, STUDIO_LIMITS, StudioError, delimiterLabel, encodingLabel,
  type CellDetail, type CellRange, type ColumnProfile, type EncodingId, type EncodingLabResult, type ExportOptions, type GridWindow,
  type HistoryStepInfo, type ImportOptions, type ImportReport, type Issue, type RepairOp, type RepairPreview, type SelectionStats, type SourceMeta, type StudioSnapshot,
} from "./types";

export interface ImportPayload { bytes: ArrayBuffer | null; text: string | null; source: SourceMeta; options: ImportOptions }
export type ProgressCallback = (phase: string, done: number, total: number) => void;

interface HistoryEntry { state: TableState; info: HistoryStepInfo }

const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

function normalizeOptions(options: ImportOptions): ImportOptions {
  const merged = { ...DEFAULT_IMPORT_OPTIONS, ...options };
  const skipRows = Math.min(Math.max(Math.trunc(Number(merged.skipRows) || 0), 0), STUDIO_LIMITS.maxSkipRows);
  return { ...merged, skipRows, comment: String(merged.comment ?? "").slice(0, 3), customDelimiter: String(merged.customDelimiter ?? "").slice(0, 1) };
}

function resolveDelimiter(options: ImportOptions): string | null {
  switch (options.delimiter) {
    case "auto": return null;
    case "none": return "";
    case "custom": {
      const value = options.customDelimiter;
      if (!value || /[\r\n"'\ufeff]/.test(value) || value === (options.quote === "none" ? "" : options.quote)) {
        throw new StudioError("INVALID_DELIMITER", "Type a single custom delimiter character other than a quote or line break.");
      }
      return value;
    }
    default: return options.delimiter;
  }
}

export class StudioSession {
  private readonly imported: ImportedTable;
  private readonly initial: TableState;
  private history: HistoryEntry[];
  private cursor = 0;
  private readonly dismissed = new Set<string>();
  private version = 1;
  private stepId = 0;
  private issueCache: { state: TableState; issues: Issue[] } | null = null;
  private cancelFlag = false;

  private constructor(
    imported: ImportedTable,
    readonly source: SourceMeta,
    readonly options: ImportOptions,
    readonly report: ImportReport,
    private readonly bytes: Uint8Array | null,
  ) {
    this.imported = imported;
    this.initial = initialState(imported);
    this.history = [{ state: this.initial, info: { id: 0, label: "Imported", detail: "Data as read from the file.", cells: 0, rowsRemoved: 0, columnsChanged: 0, at: Date.now() } }];
  }

  static open(payload: ImportPayload, progress: ProgressCallback = () => {}): StudioSession {
    const options = normalizeOptions(payload.options);
    const source: SourceMeta = { ...payload.source };
    const decodeStart = now();
    let text: string;
    let bytes: Uint8Array | null = null;
    let encodingReport: ImportReport["encoding"];
    if (payload.text !== null) {
      if (payload.text.length > STUDIO_LIMITS.maxPasteChars) throw new StudioError("PASTE_LIMIT", `Pasted text is limited to ${STUDIO_LIMITS.maxPasteChars.toLocaleString("en-US")} characters. Save it as a file and import that instead.`);
      text = payload.text;
      const bom = text.charCodeAt(0) === 0xfeff;
      if (bom) text = text.slice(1);
      let replacements = 0;
      for (let index = text.indexOf("\ufffd"); index !== -1; index = text.indexOf("\ufffd", index + 1)) replacements++;
      encodingReport = { used: "utf-8", detected: "utf-8", choice: options.encoding, reason: "Pasted text is already Unicode, so no decoding was needed.", bom: bom ? "utf-8" : null, replacements };
    } else {
      if (!payload.bytes) throw new StudioError("NO_INPUT", "Choose a file, paste data or load a sample.");
      const raw = new Uint8Array(payload.bytes);
      if (raw.length === 0) throw new StudioError("EMPTY_FILE", "This file is empty (0 bytes). There is nothing to repair.");
      if (raw.length > STUDIO_LIMITS.maxBytes) throw new StudioError("FILE_LIMIT", `This file is ${(raw.length / 1048576).toFixed(1)} MB. CSV Studio handles files up to ${STUDIO_LIMITS.maxBytes / 1048576} MB in the browser. Split it into smaller files.`);
      progress("Reading", 0, raw.length);
      const unwrapped = unwrapContainer(raw);
      source.container = unwrapped.container;
      source.innerName = unwrapped.innerName;
      bytes = unwrapped.bytes;
      if (bytes.length === 0) throw new StudioError("EMPTY_FILE", "The file inside the archive is empty.");
      const detected = detectEncoding(bytes);
      const used: EncodingId = options.encoding === "auto" ? detected.encoding : options.encoding;
      assertTextLike(bytes, used);
      progress("Decoding", 0, bytes.length);
      const decoded = decodeBytes(bytes, used);
      text = decoded.text;
      encodingReport = {
        used,
        detected: detected.encoding,
        choice: options.encoding,
        reason: options.encoding === "auto" ? detected.reason : `Set manually. Auto-detection would choose ${encodingLabel(detected.encoding)}.`,
        bom: decoded.bom ? used : null,
        replacements: decoded.replacements,
      };
    }
    if (!text.trim()) throw new StudioError("EMPTY_FILE", "This file contains no data, only whitespace.");
    const decodeMs = now() - decodeStart;

    const quote = options.quote === "none" ? "" : options.quote;
    const comment = options.comment;
    const parseStart = now();
    const manual = resolveDelimiter(options);
    let delimiter: string;
    let delimiterReport: ImportReport["delimiter"];
    if (manual === null) {
      const decision = detectDelimiter(text, quote, comment, options.skipRows);
      delimiter = decision.delimiter;
      delimiterReport = { used: delimiter, label: delimiterLabel(delimiter), choice: "auto", reason: decision.reason, ambiguous: decision.ambiguous, candidates: decision.candidates };
    } else {
      delimiter = manual;
      delimiterReport = { used: delimiter, label: delimiterLabel(delimiter), choice: options.delimiter, reason: delimiter ? "Set manually." : "Set manually: each line is one value.", ambiguous: false, candidates: [] };
    }

    const columns: Cell[][] = [];
    const spans: number[] = [];
    const lines: number[] = [];
    const flags: number[] = [];
    let header = null as string[] | null;
    let headerSpan = null as [number, number] | null;
    let skipped = 0;
    let rows = 0;
    let cells = 0;
    let minFields = Number.POSITIVE_INFINITY;
    let maxFields = 0;
    let lastWidth = 0;
    const ensure = (width: number) => { while (columns.length < width) columns.push(new Array<Cell>(rows)); };
    const stats = tokenize(text, { delimiter, quote, comment, mergeDelimiters: options.mergeDelimiters, maxFields: STUDIO_LIMITS.maxColumns, maxFieldChars: STUDIO_LIMITS.maxFieldChars }, (fields, info) => {
      if (skipped < options.skipRows) { skipped++; return; }
      if (options.header && header === null) {
        header = fields;
        headerSpan = [info.start, info.end];
        ensure(fields.length);
        return;
      }
      if (rows >= STUDIO_LIMITS.maxRows) {
        throw new StudioError("ROW_LIMIT", `This file has more than ${STUDIO_LIMITS.maxRows.toLocaleString("en-US")} data rows. CSV Studio stops there to protect your browser’s memory, and it never imports part of a file silently. Split the file and repair each part.`);
      }
      const width = fields.length;
      ensure(width);
      for (let index = 0; index < columns.length; index++) columns[index].push(index < width ? fields[index] : undefined);
      cells += width;
      if (cells > STUDIO_LIMITS.maxCells) throw new StudioError("CELL_LIMIT", `This file has more than ${STUDIO_LIMITS.maxCells.toLocaleString("en-US")} cells. Split it into smaller files.`);
      let rowFlag = 0;
      const blank = fields.every((field) => field === "");
      const expected = header ? (header as string[]).length : 0;
      if (blank) rowFlag |= ROW.BLANK;
      else if (expected && width < expected) rowFlag |= ROW.SHORT;
      if (expected && width > expected && !blank) rowFlag |= ROW.LONG;
      if (info.unclosed) rowFlag |= ROW.UNCLOSED;
      else if (info.malformed) rowFlag |= ROW.MALFORMED;
      flags.push(rowFlag);
      spans.push(info.start, info.end);
      lines.push(info.line);
      if (!blank) { minFields = Math.min(minFields, width); maxFields = Math.max(maxFields, width); }
      lastWidth = width;
      rows++;
      if (rows % 5_000 === 0) progress("Parsing", info.end, text.length);
    });
    if (options.header && header === null) {
      throw new StudioError("NO_HEADER", options.skipRows ? `No header row is left after skipping ${options.skipRows} rows. Lower “Skip rows” or turn off the header option.` : "The file has no rows to use as a header.");
    }
    const headerFields: string[] = header ?? [];
    const headerWidth = header ? headerFields.length : columns.length;
    if (!columns.length) columns.push([]);
    for (const column of columns) if (column.length < rows) column.length = rows;
    const rowFlags = Uint8Array.from(flags);
    if (rows > 0 && !stats.endsWithNewline && !stats.unclosed && header && lastWidth < headerWidth && !(rowFlags[rows - 1] & ROW.BLANK)) rowFlags[rows - 1] |= ROW.TRUNCATED;
    const parseMs = now() - parseStart;

    const imported: ImportedTable = {
      headers: headerFields,
      headerWidth,
      hasHeader: options.header,
      columns,
      rowCount: rows,
      rowFlags,
      spans: Int32Array.from(spans),
      lines: Int32Array.from(lines),
      headerSpan,
      text,
    };
    const unclosedRow = stats.unclosed ? Math.max(0, rows - 1) : null;
    const report: ImportReport = {
      encoding: encodingReport,
      delimiter: delimiterReport,
      quote: options.quote,
      lineEndings: {
        crlf: stats.crlf,
        lf: stats.lf,
        cr: stats.cr,
        style: [stats.crlf, stats.lf, stats.cr].filter(Boolean).length > 1 ? "Mixed" : stats.crlf ? "CRLF" : stats.lf ? "LF" : stats.cr ? "CR" : "None",
      },
      chars: text.length,
      records: stats.records,
      skippedRecords: skipped,
      commentLines: stats.commentLines,
      headerFields: headerFields.length,
      dataRows: rows,
      columns: columns.length,
      minFields: Number.isFinite(minFields) ? minFields : 0,
      maxFields,
      malformedQuotes: stats.malformedQuotes,
      strayQuotes: stats.strayQuotes,
      unclosedQuote: stats.unclosed && unclosedRow !== null ? { row: unclosedRow, line: stats.unclosed.line } : null,
      endsWithNewline: stats.endsWithNewline,
      decodeMs: Math.round(decodeMs),
      parseMs: Math.round(parseMs),
      validateMs: 0,
    };
    const session = new StudioSession(imported, source, options, report, bytes);
    progress("Checking", 0, 1);
    const validateStart = now();
    session.issues();
    report.validateMs = Math.round(now() - validateStart);
    return session;
  }

  private get state(): TableState {
    return this.history[this.cursor].state;
  }

  private context() {
    return { state: this.state, imported: this.imported, report: this.report, options: this.options };
  }

  issues(): Issue[] {
    if (this.issueCache?.state === this.state) return this.issueCache.issues;
    const issues = validate(this.context());
    this.issueCache = { state: this.state, issues };
    return issues;
  }

  snapshot(): StudioSnapshot {
    const state = this.state;
    const issues = this.issues();
    const ids = new Set(issues.map((issue) => issue.id));
    return {
      version: this.version,
      source: this.source,
      options: this.options,
      report: this.report,
      columns: state.columns.map((column) => columnInfo(this.imported, column)),
      rowCount: state.rows.length,
      importedRowCount: this.imported.rowCount,
      issues,
      dismissed: [...this.dismissed].filter((id) => ids.has(id)),
      history: {
        steps: this.history.map((entry) => entry.info),
        cursor: this.cursor,
        canUndo: this.cursor > 0,
        canRedo: this.cursor < this.history.length - 1,
      },
      changes: computeChanges(state, this.imported),
      blockers: exportBlockers(state),
    };
  }

  window(start: number, count: number): GridWindow {
    const state = this.state;
    const columns = visibleColumns(state);
    const first = Math.max(0, Math.min(Math.trunc(start), state.rows.length));
    const last = Math.min(state.rows.length, first + Math.min(Math.max(Math.trunc(count), 0), STUDIO_LIMITS.maxWindowRows));
    const rows: GridWindow["rows"] = [];
    for (let row = first; row < last; row++) {
      const physical = state.rows[row];
      const cells: (string | null)[] = [];
      const marks: number[] = [];
      let rowMark = 0;
      for (const column of columns) {
        const value = column.values[physical];
        cells.push(value === undefined ? null : value);
        let mark = cellMark(column, value);
        if (cellChanged(this.imported, column, physical) || (column.source !== null && physical >= this.imported.rowCount)) mark |= MARK.CHANGED;
        marks.push(mark);
        rowMark |= mark;
      }
      if (physical >= this.imported.rowCount) rowMark |= MARK.CHANGED;
      rows.push({ index: row, line: state.lines[physical] ?? 0, cells, marks, rowMark });
    }
    return { version: this.version, start: first, rows };
  }

  cell(row: number, position: number): CellDetail {
    const state = this.state;
    const columns = visibleColumns(state);
    const column = columns[position];
    if (!column || row < 0 || row >= state.rows.length) throw new StudioError("OUT_OF_RANGE", "That cell is no longer in the table.");
    const physical = state.rows[row];
    const working = column.values[physical];
    const original = originalValue(this.imported, column, physical);
    let raw: string | null = null;
    let rawTruncated = false;
    let quoted: boolean | null = null;
    if (physical < this.imported.rowCount) {
      const startOffset = this.imported.spans[physical * 2];
      const endOffset = this.imported.spans[physical * 2 + 1];
      const record = this.imported.text.slice(startOffset, endOffset);
      raw = record.length > 2_000 ? `${record.slice(0, 2_000)}` : record;
      rawTruncated = record.length > 2_000;
      if (column.source !== null && record.length <= 200_000) {
        const delimiter = this.report.delimiter.used;
        const quoting = fieldQuoting(record, delimiter, this.options.quote === "none" ? "" : this.options.quote);
        quoted = quoting[column.source] ?? null;
      }
    }
    const value = working ?? "";
    const codePoints: CellDetail["codePoints"] = [];
    for (let index = 0; index < value.length && codePoints.length < 40; index++) {
      const code = value.codePointAt(index) ?? 0;
      const edgeSpace = code === 0x20 && (index === 0 || index === value.length - 1);
      const name = edgeSpace ? (index === 0 ? "Leading space" : "Trailing space") : describeCodePoint(code);
      if (name) codePoints.push({ index, char: code === 0x20 ? "␠" : code < 0x20 ? String.fromCodePoint(0x2400 + code) : String.fromCodePoint(code), code: `U+${code.toString(16).toUpperCase().padStart(4, "0")}`, name });
      if (code > 0xffff) index++;
    }
    const flags = cellFlags(working);
    const notes: string[] = [];
    if (working === undefined) notes.push("This row had no field for this column in the source file.");
    if (flags & FLAG.FORMULA && !(flags & FLAG.SIGNED_NUMBER)) notes.push("Starts like a formula. It is treated as plain text and never evaluated.");
    if (flags & FLAG.TOO_LONG) notes.push("Longer than an Excel cell allows.");
    let excelRisk: string | null = null;
    const protectedColumn = isProtected(column);
    if (flags & FLAG.LEADING_ZERO) {
      const stripped = value.replace(/^([+-]?)0+(?=\d)/, "$1");
      excelRisk = protectedColumn ? `Protected: exported as text, so ${value} stays ${value}.` : `Opened directly as CSV, Excel would show ${stripped}. The XLSX export keeps ${value} as text.`;
    } else if (flags & FLAG.LONG_DIGITS) {
      excelRisk = `As a number Excel would keep 15 digits: ${value.slice(0, 15)}${"0".repeat(value.length - 15)}. Exported as text, every digit stays.`;
    } else if (flags & FLAG.DATE_LIKE && column.type === "auto") {
      excelRisk = "Excel may convert this to a date if the CSV is opened directly. The XLSX export keeps the text.";
    }
    return {
      row,
      column: column.key,
      columnName: displayName(column, position),
      line: state.lines[physical] ?? 0,
      working: working ?? null,
      original: original ?? null,
      changed: cellChanged(this.imported, column, physical),
      quoted,
      raw,
      rawTruncated,
      length: value.length,
      codePoints,
      notes,
      excelRisk,
    };
  }

  locate(issueId: string, after: number): { row: number; column: number } | null {
    return locate(this.context(), issueId, after);
  }

  preview(op: RepairOp): RepairPreview {
    return applyRepair(this.state, this.imported, op).preview;
  }

  apply(op: RepairOp): { snapshot: StudioSnapshot; preview: RepairPreview } {
    const result = applyRepair(this.state, this.imported, op);
    if (result.preview.blocked) throw new StudioError("BLOCKED", result.preview.blocked);
    if (result.state === this.state) return { snapshot: this.snapshot(), preview: result.preview };
    this.push(result.state, result.preview);
    return { snapshot: this.snapshot(), preview: result.preview };
  }

  private push(state: TableState, preview: Pick<RepairPreview, "label" | "reason" | "cells" | "rowsRemoved" | "columnsAdded" | "columnsRemoved">): void {
    this.history = this.history.slice(0, this.cursor + 1);
    this.history.push({
      state,
      info: { id: ++this.stepId, label: preview.label, detail: preview.reason, cells: preview.cells, rowsRemoved: preview.rowsRemoved, columnsChanged: preview.columnsAdded + preview.columnsRemoved, at: Date.now() },
    });
    if (this.history.length > STUDIO_LIMITS.historyDepth + 1) this.history.shift();
    this.cursor = this.history.length - 1;
    this.version++;
  }

  undo(): StudioSnapshot {
    if (this.cursor > 0) { this.cursor--; this.version++; }
    return this.snapshot();
  }

  redo(): StudioSnapshot {
    if (this.cursor < this.history.length - 1) { this.cursor++; this.version++; }
    return this.snapshot();
  }

  reset(): StudioSnapshot {
    if (this.state !== this.initial) {
      this.push(this.initial, { label: "Reset to imported data", reason: "Restored the table exactly as it was imported. Undo brings back the previous working copy.", cells: 0, rowsRemoved: 0, columnsAdded: 0, columnsRemoved: 0 });
    }
    return this.snapshot();
  }

  dismiss(issueId: string, dismissed: boolean): StudioSnapshot {
    const issue = this.issues().find((item) => item.id === issueId);
    if (dismissed && issue && !issue.dismissible) throw new StudioError("NOT_DISMISSIBLE", "Errors can’t be dismissed. Fix them or export CSV instead.");
    if (dismissed) this.dismissed.add(issueId);
    else this.dismissed.delete(issueId);
    return this.snapshot();
  }

  profile(key: number): ColumnProfile {
    const state = this.state;
    const columns = visibleColumns(state);
    const position = columns.findIndex((column) => column.key === key);
    const column = state.columns.find((item) => item.key === key);
    if (!column) throw new StudioError("OUT_OF_RANGE", "That column no longer exists.");
    const analysis = analyzeColumn(column, state.rows);
    const unique = new Set<string>();
    const samples: string[] = [];
    for (let row = 0; row < state.rows.length; row++) {
      const value = column.values[state.rows[row]];
      if (!value) continue;
      unique.add(value);
      if (samples.length < 5 && !samples.includes(value)) samples.push(value.length > 60 ? `${value.slice(0, 60)}…` : value);
    }
    const count = (flag: number) => analysis.counts[31 - Math.clz32(flag)];
    const nonEmpty = analysis.nonEmpty;
    const zeros = count(FLAG.LEADING_ZERO);
    const long = count(FLAG.LONG_DIGITS);
    const integers = count(FLAG.INTEGER);
    const decimals = count(FLAG.DECIMAL);
    const dates = count(FLAG.DATE_LIKE);
    const booleans = count(FLAG.BOOLEAN);
    let suggestion: ColumnProfile["suggestion"];
    const profileHint = suggestProfile(column.name, analysis);
    if (nonEmpty === 0) suggestion = { type: "auto", profile: null, dateFormat: null, reason: "The column is empty." };
    else if (zeros > 0 || long > 0 || profileHint !== "other") suggestion = { type: "text", profile: profileHint === "other" ? null : profileHint, dateFormat: null, reason: zeros || long ? "Values have leading zeros or more than 15 digits, so they are identifiers, not quantities." : "The column name suggests an identifier." };
    else if (integers === nonEmpty) suggestion = { type: "integer", profile: null, dateFormat: null, reason: "Every value is a whole number without leading zeros." };
    else if (decimals === nonEmpty) suggestion = { type: "decimal", profile: null, dateFormat: null, reason: "Every value is a plain number." };
    else if (booleans === nonEmpty) suggestion = { type: "boolean", profile: null, dateFormat: null, reason: "Every value is true/false, yes/no or 1/0." };
    else if (dates === nonEmpty) suggestion = { type: "date", profile: null, dateFormat: null, reason: "Every value looks like a date. Choose the format explicitly before converting." };
    else suggestion = { type: "text", profile: null, dateFormat: null, reason: "Mixed or free text. Keeping it as text preserves every value." };
    const sampleZero = analysis.examples[31 - Math.clz32(FLAG.LEADING_ZERO)][0];
    const sampleLong = analysis.examples[31 - Math.clz32(FLAG.LONG_DIGITS)][0];
    const exampleValue = sampleZero ?? sampleLong ?? samples[0] ?? "";
    let asNumber: string | null = null;
    if (sampleZero) asNumber = `If exported as a number, Excel may store ${sampleZero} as ${sampleZero.replace(/^([+-]?)0+(?=\d)/, "$1")}.`;
    else if (sampleLong) asNumber = `If exported as a number, Excel keeps 15 significant digits: ${sampleLong} becomes ${sampleLong.slice(0, 15)}${"0".repeat(Math.max(sampleLong.length - 15, 0))}.`;
    return {
      column: key,
      name: displayName(column, Math.max(position, 0)),
      rows: state.rows.length,
      nonEmpty,
      empty: analysis.empty,
      missing: analysis.missing,
      unique: unique.size,
      minLength: analysis.minLength,
      maxLength: analysis.maxLength,
      leadingZero: zeros,
      formulaLike: count(FLAG.FORMULA) - count(FLAG.SIGNED_NUMBER),
      longDigits: long,
      samples,
      suggestion,
      risk: { asNumber, asText: exampleValue ? `If exported as text, the cell will keep ${exampleValue.length > 40 ? `${exampleValue.slice(0, 40)}…` : exampleValue}.` : "Text export keeps each value exactly." },
    };
  }

  private rangeCells(range: CellRange, visit: (value: string | undefined, row: number, position: number) => void): boolean {
    const state = this.state;
    const columns = visibleColumns(state);
    const top = Math.max(0, Math.min(range.top, range.bottom));
    const bottom = Math.min(state.rows.length - 1, Math.max(range.top, range.bottom));
    const left = Math.max(0, Math.min(range.left, range.right));
    const right = Math.min(columns.length - 1, Math.max(range.left, range.right));
    let visited = 0;
    for (let row = top; row <= bottom; row++) {
      for (let position = left; position <= right; position++) {
        if (++visited > STUDIO_LIMITS.maxCopyCells) return true;
        visit(columns[position].values[state.rows[row]], row, position);
      }
    }
    return false;
  }

  stats(range: CellRange): SelectionStats {
    let cells = 0;
    let nonEmpty = 0;
    let numeric = 0;
    let sum = 0;
    const truncated = this.rangeCells(range, (value) => {
      cells++;
      if (!value) return;
      nonEmpty++;
      const parsed = parseDecimalCell(value);
      if (parsed !== null) { numeric++; sum += Number(parsed); }
    });
    const format = (value: number) => value.toLocaleString("en-US", { maximumFractionDigits: 6 });
    return { cells, nonEmpty, numeric, sum: numeric ? format(sum) : null, average: numeric ? format(sum / numeric) : null, truncated };
  }

  copy(range: CellRange): string {
    const lines: string[][] = [];
    const top = Math.min(range.top, range.bottom);
    const truncated = this.rangeCells(range, (value, row) => {
      const index = row - top;
      (lines[index] ??= []).push(value === undefined ? "" : /[\t\n\r"]/.test(value) ? `"${value.replace(/"/g, "\"\"")}"` : value);
    });
    if (truncated) throw new StudioError("COPY_LIMIT", `Copy is limited to ${STUDIO_LIMITS.maxCopyCells.toLocaleString("en-US")} cells. Select a smaller range or use Export.`);
    return lines.map((cells) => cells.join("\t")).join("\r\n");
  }

  lab(encodings: EncodingId[]): EncodingLabResult[] {
    if (!this.bytes) throw new StudioError("NO_BYTES", "Pasted text is already decoded, so there are no bytes to compare. Import a file to use the Encoding Lab.");
    const allowed: EncodingId[] = ["utf-8", "windows-1252", "iso-8859-1", "utf-16le", "utf-16be"];
    const chosen = encodings.filter((encoding) => allowed.includes(encoding)).slice(0, 5);
    return encodingLab(this.bytes, chosen.length ? chosen : allowed.slice(0, 3), this.report.encoding.detected);
  }

  cancel(): void {
    this.cancelFlag = true;
  }

  async export(options: ExportOptions, progress: (done: number, total: number) => void): Promise<ExportOutput> {
    this.cancelFlag = false;
    const hooks: ExportHooks = {
      progress,
      cancelled: () => this.cancelFlag,
      pause: () => new Promise((resolve) => setTimeout(resolve, 0)),
    };
    const context = {
      state: this.state,
      issues: this.issues(),
      dismissed: this.dismissed,
      history: this.history.slice(1, this.cursor + 1).map((entry) => entry.info),
      source: this.source,
      report: this.report,
    };
    if (options.format === "xlsx") return exportXlsx(context, options, hooks);
    if (options.format === "json") return exportJson(context, options, hooks);
    return exportDelimited(context, options, hooks);
  }
}
