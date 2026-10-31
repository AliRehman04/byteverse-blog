import { Unzip, UnzipInflate, Zip, ZipDeflate, strToU8 } from "fflate";
import { parseBooleanCell, parseDateCell, parseDecimalCell, parseIntegerCell } from "./convert";
import { spreadsheetSafe } from "./detect";
import { displayName, visibleColumns, type ColumnState, type TableState } from "./table";
import { isProtected } from "./validate";
import {
  PROFILE_LABELS, STUDIO_LIMITS, StudioError, columnLetter,
  type ExportOptions, type ExportResult, type HistoryStepInfo, type ImportReport, type Issue, type SourceMeta,
} from "./types";

export interface ExportContext {
  state: TableState;
  issues: Issue[];
  dismissed: ReadonlySet<string>;
  history: HistoryStepInfo[];
  source: SourceMeta;
  report: ImportReport;
}

export interface ExportHooks {
  progress(done: number, total: number): void;
  cancelled(): boolean;
  pause(): Promise<void>;
}

export interface ExportOutput { bytes: Uint8Array; result: ExportResult }

const BATCH = 1_000;
const NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const XML_HEAD = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>\n";

export function safeFileName(name: string, extension: string): string {
  const base = name.replace(/\.(xlsx|csv|tsv|json|txt)$/i, "").replace(/[\u0000-\u001f<>:"/\\|?*]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 120).replace(/^\.+/, "");
  return `${base || "export"}.${extension}`;
}

export function sheetNameFrom(fileName: string): string {
  const cleaned = fileName.replace(/\.[^.]+$/, "").replace(/[[\]:*?/\\']/g, " ").replace(/\s+/g, " ").trim().slice(0, 31).trim();
  if (!cleaned || /^history$/i.test(cleaned)) return "Data";
  return cleaned;
}

function escapeAttribute(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function wellFormed(value: string): string {
  let output = "";
  let changed = false;
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (next >= 0xdc00 && next <= 0xdfff) { output += value[index] + value[index + 1]; index++; continue; }
      output += "\ufffd";
      changed = true;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      output += "\ufffd";
      changed = true;
    } else output += value[index];
  }
  return changed ? output : value;
}

const SURROGATE_TEST = /[\ud800-\udfff]/;
const NEEDS_ESCAPE = /[&<>\u0000-\u0008\u000b-\u001f_\ud800-\udfff\ufffe\uffff]/;

/** OOXML shared/inline string escaping: XML entities, Excel _xHHHH_ escapes for control characters, CR preserved. */
export function escapeCellText(value: string): string {
  if (!NEEDS_ESCAPE.test(value)) return value;
  let text = SURROGATE_TEST.test(value) ? wellFormed(value) : value;
  if (text.indexOf("_x") !== -1) text = text.replace(/_x([0-9A-Fa-f]{4})_/g, "_x005F_x$1_");
  text = text.replace(/[&<>]/g, (char) => (char === "&" ? "&amp;" : char === "<" ? "&lt;" : "&gt;"));
  text = text.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/g, (char) => `_x${char.charCodeAt(0).toString(16).toUpperCase().padStart(4, "0")}_`);
  return text.indexOf("\r") === -1 ? text : text.replace(/\r/g, "&#13;");
}

function textCell(reference: string, value: string, style: number): string {
  const preserve = /^\s|\s$/.test(value) ? " xml:space=\"preserve\"" : "";
  return `<c r="${reference}"${style ? ` s="${style}"` : ""} t="inlineStr"><is><t${preserve}>${escapeCellText(value)}</t></is></c>`;
}

const STYLE = { GENERAL: 0, TEXT: 1, HEADER: 2, INTEGER: 3, DECIMAL: 4, DATE: 5, WRAP: 6, BOLD: 7 } as const;

const STYLES = `${XML_HEAD}<styleSheet xmlns="${NS}">`
  + "<numFmts count=\"1\"><numFmt numFmtId=\"164\" formatCode=\"mm/dd/yyyy\"/></numFmts>"
  + "<fonts count=\"2\"><font><sz val=\"11\"/><color theme=\"1\"/><name val=\"Calibri\"/><family val=\"2\"/><scheme val=\"minor\"/></font><font><b/><sz val=\"11\"/><color theme=\"1\"/><name val=\"Calibri\"/><family val=\"2\"/><scheme val=\"minor\"/></font></fonts>"
  + "<fills count=\"3\"><fill><patternFill patternType=\"none\"/></fill><fill><patternFill patternType=\"gray125\"/></fill><fill><patternFill patternType=\"solid\"><fgColor rgb=\"FFEEF3FA\"/><bgColor indexed=\"64\"/></patternFill></fill></fills>"
  + "<borders count=\"2\"><border><left/><right/><top/><bottom/><diagonal/></border><border><left/><right/><top/><bottom style=\"thin\"><color rgb=\"FFC6D0DD\"/></bottom><diagonal/></border></borders>"
  + "<cellStyleXfs count=\"1\"><xf numFmtId=\"0\" fontId=\"0\" fillId=\"0\" borderId=\"0\"/></cellStyleXfs>"
  + "<cellXfs count=\"8\">"
  + "<xf numFmtId=\"0\" fontId=\"0\" fillId=\"0\" borderId=\"0\" xfId=\"0\"/>"
  + "<xf numFmtId=\"49\" fontId=\"0\" fillId=\"0\" borderId=\"0\" xfId=\"0\" applyNumberFormat=\"1\"/>"
  + "<xf numFmtId=\"49\" fontId=\"1\" fillId=\"2\" borderId=\"1\" xfId=\"0\" applyNumberFormat=\"1\" applyFont=\"1\" applyFill=\"1\" applyBorder=\"1\"/>"
  + "<xf numFmtId=\"1\" fontId=\"0\" fillId=\"0\" borderId=\"0\" xfId=\"0\" applyNumberFormat=\"1\"/>"
  + "<xf numFmtId=\"0\" fontId=\"0\" fillId=\"0\" borderId=\"0\" xfId=\"0\"/>"
  + "<xf numFmtId=\"164\" fontId=\"0\" fillId=\"0\" borderId=\"0\" xfId=\"0\" applyNumberFormat=\"1\"/>"
  + "<xf numFmtId=\"49\" fontId=\"0\" fillId=\"0\" borderId=\"0\" xfId=\"0\" applyNumberFormat=\"1\" applyAlignment=\"1\"><alignment vertical=\"top\" wrapText=\"1\"/></xf>"
  + "<xf numFmtId=\"49\" fontId=\"1\" fillId=\"0\" borderId=\"0\" xfId=\"0\" applyNumberFormat=\"1\" applyFont=\"1\"/>"
  + "</cellXfs><cellStyles count=\"1\"><cellStyle name=\"Normal\" xfId=\"0\" builtinId=\"0\"/></cellStyles></styleSheet>";

interface Warnings { numbers: Map<string, number>; dates: Map<string, number>; booleans: Map<string, number>; surrogates: number }

function bump(map: Map<string, number>, key: string): void {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function dataCell(reference: string, value: string, column: ColumnState, label: string, warnings: Warnings): string {
  if (SURROGATE_TEST.test(value) && wellFormed(value) !== value) warnings.surrogates++;
  switch (column.type) {
    case "integer": {
      const parsed = parseIntegerCell(value);
      if (parsed !== null) return `<c r="${reference}" s="${STYLE.INTEGER}"><v>${parsed}</v></c>`;
      bump(warnings.numbers, label);
      return textCell(reference, value, STYLE.TEXT);
    }
    case "decimal": {
      const parsed = parseDecimalCell(value);
      if (parsed !== null) return `<c r="${reference}" s="${STYLE.DECIMAL}"><v>${parsed}</v></c>`;
      bump(warnings.numbers, label);
      return textCell(reference, value, STYLE.TEXT);
    }
    case "date": {
      const serial = column.dateFormat ? parseDateCell(value, column.dateFormat) : null;
      if (serial !== null) return `<c r="${reference}" s="${STYLE.DATE}"><v>${serial}</v></c>`;
      bump(warnings.dates, label);
      return textCell(reference, value, STYLE.TEXT);
    }
    case "boolean": {
      const parsed = parseBooleanCell(value);
      if (parsed !== null) return `<c r="${reference}" t="b"><v>${parsed ? 1 : 0}</v></c>`;
      bump(warnings.booleans, label);
      return textCell(reference, value, STYLE.TEXT);
    }
    case "text":
      return textCell(reference, value, STYLE.TEXT);
    default:
      return textCell(reference, value, isProtected(column) ? STYLE.TEXT : STYLE.GENERAL);
  }
}

function selectRows(state: TableState, options: ExportOptions): { start: number; end: number } {
  if (options.rows === "all") return { start: 0, end: state.rows.length };
  const start = Math.max(0, Math.min(options.rows.top, options.rows.bottom));
  const end = Math.min(state.rows.length, Math.max(options.rows.top, options.rows.bottom) + 1);
  return { start, end };
}

function exportColumns(state: TableState, options: ExportOptions): ColumnState[] {
  const columns = options.includeHidden ? [...state.columns] : visibleColumns(state);
  if (!columns.length) throw new StudioError("NO_COLUMNS", "Every column is hidden. Show at least one column, or include hidden columns.");
  return columns;
}

function columnWidth(column: ColumnState, rows: Int32Array, start: number, end: number): number {
  let widest = Math.max(column.name.length, 6);
  for (let row = start; row < Math.min(end, start + 300); row++) {
    const value = column.values[rows[row]];
    if (value) widest = Math.max(widest, Math.min(value.split(/\r\n|\r|\n/, 1)[0].length, 80));
  }
  return Math.min(Math.max(widest + 2, 9), 60);
}

function simpleSheet(rows: (string | number | null)[][], widths: number[], boldRows: Set<number>): string {
  const lastColumn = columnLetter(Math.max(widths.length - 1, 0));
  const body = rows.map((cells, rowIndex) => {
    const content = cells.map((value, columnIndex) => {
      if (value === null || value === "") return "";
      const reference = `${columnLetter(columnIndex)}${rowIndex + 1}`;
      if (typeof value === "number") return `<c r="${reference}"><v>${value}</v></c>`;
      return textCell(reference, value, boldRows.has(rowIndex) ? STYLE.BOLD : STYLE.WRAP);
    }).join("");
    return `<row r="${rowIndex + 1}">${content}</row>`;
  }).join("");
  const cols = widths.map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`).join("");
  return `${XML_HEAD}<worksheet xmlns="${NS}" xmlns:r="${REL}"><dimension ref="A1:${lastColumn}${Math.max(rows.length, 1)}"/><sheetViews><sheetView workbookViewId="0"/></sheetViews><sheetFormatPr defaultRowHeight="15"/><cols>${cols}</cols><sheetData>${body}</sheetData></worksheet>`;
}

function summaryRows(context: ExportContext, rowsExported: number, columnsExported: number, warnings: Warnings): (string | number | null)[][] {
  const rows: (string | number | null)[][] = [
    ["ByteVerse CSV Studio · validation summary", null, null, null, null],
    [null, null, null, null, null],
    ["Source file", context.source.innerName ?? context.source.name, null, null, null],
    ["Exported (UTC)", new Date().toISOString().replace("T", " ").slice(0, 19), null, null, null],
    ["Rows exported", rowsExported, null, null, null],
    ["Columns exported", columnsExported, null, null, null],
    ["Encoding read as", context.report.encoding.used.toUpperCase(), null, null, null],
    ["Delimiter read as", context.report.delimiter.label, null, null, null],
    [null, null, null, null, null],
    ["Severity", "Issue", "Column", "Count", "Status"],
  ];
  for (const issue of context.issues) {
    rows.push([issue.severity[0].toUpperCase() + issue.severity.slice(1), issue.name, issue.columnName ?? "Whole file", issue.count, context.dismissed.has(issue.id) ? "Dismissed" : "Open"]);
  }
  if (!context.issues.length) rows.push(["None", "No issues were detected.", null, null, null]);
  const conversions: [string, Map<string, number>][] = [["Not valid numbers, written as text", warnings.numbers], ["Not valid dates, written as text", warnings.dates], ["Not valid true/false values, written as text", warnings.booleans]];
  if (conversions.some(([, map]) => map.size) || warnings.surrogates) {
    rows.push([null, null, null, null, null], ["Export notes", null, null, null, null]);
    for (const [label, map] of conversions) for (const [column, count] of map) rows.push(["Info", label, column, count, null]);
    if (warnings.surrogates) rows.push(["Info", "Broken Unicode characters written as �", null, warnings.surrogates, null]);
  }
  return rows;
}

function changeRows(context: ExportContext): (string | number | null)[][] {
  const rows: (string | number | null)[][] = [["Step", "Change", "Details", "Cells changed", "Rows removed"]];
  context.history.forEach((step, index) => rows.push([index + 1, step.label, step.detail, step.cells, step.rowsRemoved]));
  if (context.history.length === 0) rows.push([null, "No changes were applied. The data is exactly as imported.", null, null, null]);
  return rows;
}

function concat(chunks: Uint8Array[], size: number): Uint8Array {
  const output = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { output.set(chunk, offset); offset += chunk.length; }
  return output;
}

export interface WorkbookCheck { parts: string[]; rows: number; cells: number; formulas: number; dimension: string | null }

function occurrences(text: string, token: string): number {
  let count = 0;
  for (let index = text.indexOf(token); index !== -1; index = text.indexOf(token, index + token.length)) count++;
  return count;
}

/** Re-read the generated archive: required parts, row/cell counts and absence of formula elements. */
export function inspectWorkbook(bytes: Uint8Array): WorkbookCheck {
  const parts: string[] = [];
  const check: WorkbookCheck = { parts, rows: 0, cells: 0, formulas: 0, dimension: null };
  const decoder = new TextDecoder();
  let carry = "";
  let failed: unknown = null;
  const unzip = new Unzip((file) => {
    parts.push(file.name);
    if (file.name !== "xl/worksheets/sheet1.xml") return;
    file.ondata = (error, chunk, final) => {
      if (error) { failed = error; return; }
      const text = carry + decoder.decode(chunk, { stream: !final });
      const scanEnd = final ? text.length : Math.max(0, text.length - 16);
      const scanned = text.slice(0, scanEnd);
      check.rows += occurrences(scanned, "<row ");
      check.cells += occurrences(scanned, "<c r=");
      check.formulas += occurrences(scanned, "<f>") + occurrences(scanned, "<f ");
      if (!check.dimension) check.dimension = /<dimension ref="([^"]+)"/.exec(scanned)?.[1] ?? null;
      carry = text.slice(scanEnd);
    };
    file.start();
  });
  unzip.register(UnzipInflate);
  unzip.push(bytes, true);
  if (failed) throw new StudioError("VERIFY_FAILED", "The generated workbook could not be read back. No file was downloaded.");
  return check;
}

export async function exportXlsx(context: ExportContext, options: ExportOptions, hooks: ExportHooks): Promise<ExportOutput> {
  const { state } = context;
  const columns = exportColumns(state, options);
  const { start, end } = selectRows(state, options);
  for (const column of columns) {
    for (let row = start; row < end; row++) {
      const value = column.values[state.rows[row]];
      if (value && value.length > STUDIO_LIMITS.excelCellChars) {
        throw new StudioError("CELL_TOO_LONG", `Row ${(row + 1).toLocaleString("en-US")} in ${displayName(column, columns.indexOf(column))} has ${value.length.toLocaleString("en-US")} characters. Excel cells hold up to ${STUDIO_LIMITS.excelCellChars.toLocaleString("en-US")}. Shorten it or export CSV.`);
      }
    }
  }
  const fileName = safeFileName(options.fileName, "xlsx");
  const sheetName = sheetNameFrom(fileName);
  const headerRows = options.includeHeader ? 1 : 0;
  const totalRows = end - start + headerRows;
  const lastColumn = columnLetter(columns.length - 1);
  const lastRow = Math.max(totalRows, 1);
  const sheets = [sheetName, ...(options.includeSummary ? ["Validation summary"] : []), ...(options.includeChanges ? ["Applied changes"] : [])];

  const chunks: Uint8Array[] = [];
  let size = 0;
  let zipError: unknown = null;
  const zip = new Zip((error, chunk) => {
    if (error) { zipError = error; return; }
    chunks.push(chunk);
    size += chunk.length;
  });
  const addFile = (name: string, content: string) => {
    const file = new ZipDeflate(name, { level: 6 });
    zip.add(file);
    file.push(strToU8(content), true);
  };
  const overrides = sheets.map((_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("");
  addFile("[Content_Types].xml", `${XML_HEAD}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${overrides}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`);
  addFile("_rels/.rels", `${XML_HEAD}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
  const sheetEntries = sheets.map((name, index) => `<sheet name="${escapeAttribute(name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join("");
  const filter = options.includeHeader ? `<definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">'${escapeAttribute(sheetName)}'!$A$1:$${lastColumn}$${lastRow}</definedName></definedNames>` : "";
  addFile("xl/workbook.xml", `${XML_HEAD}<workbook xmlns="${NS}" xmlns:r="${REL}"><workbookPr/><bookViews><workbookView activeTab="0"/></bookViews><sheets>${sheetEntries}</sheets>${filter}</workbook>`);
  const sheetRels = sheets.map((_, index) => `<Relationship Id="rId${index + 1}" Type="${REL}/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join("");
  addFile("xl/_rels/workbook.xml.rels", `${XML_HEAD}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheetRels}<Relationship Id="rId${sheets.length + 1}" Type="${REL}/styles" Target="styles.xml"/></Relationships>`);
  addFile("xl/styles.xml", STYLES);

  const sheet = new ZipDeflate("xl/worksheets/sheet1.xml", { level: 6 });
  zip.add(sheet);
  const cols = columns.map((column, index) => {
    const style = isProtected(column) || column.type === "text" ? ` style="${STYLE.TEXT}"` : "";
    return `<col min="${index + 1}" max="${index + 1}" width="${columnWidth(column, state.rows, start, end)}" customWidth="1"${style}/>`;
  }).join("");
  const pane = options.includeHeader ? "<pane ySplit=\"1\" topLeftCell=\"A2\" activePane=\"bottomLeft\" state=\"frozen\"/><selection pane=\"bottomLeft\" activeCell=\"A2\" sqref=\"A2\"/>" : "";
  sheet.push(strToU8(`${XML_HEAD}<worksheet xmlns="${NS}" xmlns:r="${REL}"><dimension ref="A1:${lastColumn}${lastRow}"/><sheetViews><sheetView tabSelected="1" workbookViewId="0">${pane}</sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/><cols>${cols}</cols><sheetData>`));
  let writtenCells = 0;
  if (options.includeHeader) {
    const header = columns.map((column, index) => {
      if (!column.name) return "";
      writtenCells++;
      return textCell(`${columnLetter(index)}1`, column.name, STYLE.HEADER);
    }).join("");
    sheet.push(strToU8(`<row r="1">${header}</row>`));
  }
  const warnings: Warnings = { numbers: new Map(), dates: new Map(), booleans: new Map(), surrogates: 0 };
  const letters = columns.map((_, index) => columnLetter(index));
  const labels = columns.map((column, index) => displayName(column, index));
  for (let batchStart = start; batchStart < end; batchStart += BATCH) {
    if (hooks.cancelled()) throw new StudioError("CANCELLED", "Export cancelled. Your working data is unchanged.");
    const batchEnd = Math.min(end, batchStart + BATCH);
    let xml = "";
    for (let row = batchStart; row < batchEnd; row++) {
      const physical = state.rows[row];
      const excelRow = row - start + 1 + headerRows;
      let cells = "";
      for (let index = 0; index < columns.length; index++) {
        const value = columns[index].values[physical];
        if (!value) continue;
        writtenCells++;
        cells += dataCell(`${letters[index]}${excelRow}`, value, columns[index], labels[index], warnings);
      }
      xml += `<row r="${excelRow}">${cells}</row>`;
    }
    sheet.push(strToU8(xml));
    hooks.progress(batchEnd - start, end - start);
    await hooks.pause();
  }
  if (hooks.cancelled()) throw new StudioError("CANCELLED", "Export cancelled. Your working data is unchanged.");
  sheet.push(strToU8(`</sheetData>${options.includeHeader ? `<autoFilter ref="A1:${lastColumn}${lastRow}"/>` : ""}</worksheet>`), true);
  let sheetIndex = 2;
  if (options.includeSummary) {
    addFile(`xl/worksheets/sheet${sheetIndex}.xml`, simpleSheet(summaryRows(context, end - start, columns.length, warnings), [26, 46, 24, 10, 12], new Set([0, 9])));
    sheetIndex++;
  }
  if (options.includeChanges) addFile(`xl/worksheets/sheet${sheetIndex}.xml`, simpleSheet(changeRows(context), [7, 44, 70, 14, 14], new Set([0])));
  zip.end();
  if (zipError) throw new StudioError("ZIP_FAILED", "The workbook could not be compressed. No file was downloaded.");
  const bytes = concat(chunks, size);

  const check = inspectWorkbook(bytes);
  const required = ["[Content_Types].xml", "_rels/.rels", "xl/workbook.xml", "xl/_rels/workbook.xml.rels", "xl/styles.xml", "xl/worksheets/sheet1.xml"];
  const missing = required.filter((part) => !check.parts.includes(part));
  if (missing.length || check.rows !== totalRows || check.cells !== writtenCells || check.formulas !== 0) {
    throw new StudioError("VERIFY_FAILED", `The generated workbook failed its self-check (${missing.length ? `missing ${missing.join(", ")}` : `rows ${check.rows}/${totalRows}, cells ${check.cells}/${writtenCells}, formulas ${check.formulas}`}). No file was downloaded.`);
  }
  const protectedNames = columns.filter((column) => isProtected(column)).map((column, index) => `${displayName(column, index)}${column.profile ? ` (${PROFILE_LABELS[column.profile]})` : ""}`);
  const notes: string[] = [];
  for (const [label, map] of [["number", warnings.numbers], ["date", warnings.dates], ["true/false", warnings.booleans]] as const) {
    for (const [column, count] of map) notes.push(`${count.toLocaleString("en-US")} value${count === 1 ? "" : "s"} in ${column} ${count === 1 ? "isn’t a" : "aren’t"} valid ${label}${count === 1 ? "" : "s"} and ${count === 1 ? "was" : "were"} written as text.`);
  }
  if (warnings.surrogates) notes.push(`${warnings.surrogates.toLocaleString("en-US")} broken Unicode characters were written as �.`);
  return {
    bytes,
    result: {
      fileName,
      mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      size: bytes.length,
      rows: end - start,
      columns: columns.length,
      notes,
      verification: [
        `Valid ZIP package with ${check.parts.length} parts, including the workbook and styles.`,
        `${totalRows.toLocaleString("en-US")} rows × ${columns.length.toLocaleString("en-US")} columns read back from the sheet (${check.dimension ?? "no range"}).`,
        `${writtenCells.toLocaleString("en-US")} non-empty cells written; 0 formula cells.`,
        protectedNames.length ? `Text-formatted columns: ${protectedNames.slice(0, 6).join(", ")}${protectedNames.length > 6 ? "…" : ""}.` : "Automatic columns were written as text cells, exactly as imported.",
      ],
    },
  };
}

function csvField(value: string, delimiter: string, quoteAll: boolean, safe: boolean): string {
  const text = safe ? spreadsheetSafe(value) : value;
  const needsQuotes = quoteAll || text.includes(delimiter) || text.includes("\"") || text.includes("\n") || text.includes("\r") || /^\s|\s$/.test(text);
  return needsQuotes ? `"${text.replace(/"/g, "\"\"")}"` : text;
}

export async function exportDelimited(context: ExportContext, options: ExportOptions, hooks: ExportHooks): Promise<ExportOutput> {
  const { state } = context;
  const columns = exportColumns(state, options);
  const { start, end } = selectRows(state, options);
  const delimiter = options.format === "tsv" ? "\t" : options.csvDelimiter;
  const newline = options.csvLineEnding === "crlf" ? "\r\n" : "\n";
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  let size = 0;
  let prefixed = 0;
  const push = (text: string) => { const bytes = encoder.encode(text); chunks.push(bytes); size += bytes.length; };
  const field = (value: string) => {
    if (options.csvSafe && spreadsheetSafe(value) !== value) prefixed++;
    return csvField(value, delimiter, options.csvQuoteAll, options.csvSafe);
  };
  if (options.csvBom) push("\ufeff");
  if (options.includeHeader) push(columns.map((column) => field(column.name)).join(delimiter) + newline);
  for (let batchStart = start; batchStart < end; batchStart += BATCH) {
    if (hooks.cancelled()) throw new StudioError("CANCELLED", "Export cancelled. Your working data is unchanged.");
    const batchEnd = Math.min(end, batchStart + BATCH);
    let text = "";
    for (let row = batchStart; row < batchEnd; row++) {
      const physical = state.rows[row];
      text += columns.map((column) => field(column.values[physical] ?? "")).join(delimiter) + newline;
    }
    push(text);
    hooks.progress(batchEnd - start, end - start);
    await hooks.pause();
  }
  const extension = options.format === "tsv" ? "tsv" : "csv";
  const notes = [
    "CSV files carry no cell types. Excel may still remove leading zeros or round long IDs if you double-click this file; use the Excel (.xlsx) export to keep them as text.",
  ];
  if (options.csvSafe) notes.push(prefixed ? `${prefixed.toLocaleString("en-US")} formula-like values were prefixed with an apostrophe (').` : "No values needed the spreadsheet-safe apostrophe.");
  const bytes = concat(chunks, size);
  return {
    bytes,
    result: {
      fileName: safeFileName(options.fileName, extension),
      mime: extension === "tsv" ? "text/tab-separated-values;charset=utf-8" : "text/csv;charset=utf-8",
      size: bytes.length,
      rows: end - start,
      columns: columns.length,
      notes,
      verification: [
        `${(end - start + (options.includeHeader ? 1 : 0)).toLocaleString("en-US")} lines × ${columns.length.toLocaleString("en-US")} fields, UTF-8${options.csvBom ? " with BOM" : ""}, ${options.csvLineEnding.toUpperCase()} line endings.`,
        "Values containing the delimiter, quotes or line breaks are wrapped in quotes (RFC 4180).",
      ],
    },
  };
}

export async function exportJson(context: ExportContext, options: ExportOptions, hooks: ExportHooks): Promise<ExportOutput> {
  const { state } = context;
  const columns = exportColumns(state, options);
  const names = columns.map((column) => column.name);
  if (names.some((name) => !name.trim()) || new Set(names).size !== names.length) {
    throw new StudioError("JSON_HEADERS", "JSON export needs a unique, non-blank name for every column. Repair header names first.");
  }
  const { start, end } = selectRows(state, options);
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [encoder.encode("[")];
  let size = 1;
  for (let batchStart = start; batchStart < end; batchStart += BATCH) {
    if (hooks.cancelled()) throw new StudioError("CANCELLED", "Export cancelled. Your working data is unchanged.");
    const batchEnd = Math.min(end, batchStart + BATCH);
    let text = "";
    for (let row = batchStart; row < batchEnd; row++) {
      const physical = state.rows[row];
      const record: Record<string, string> = {};
      columns.forEach((column, index) => { record[names[index]] = column.values[physical] ?? ""; });
      text += `${row === start ? "" : ","}\n  ${JSON.stringify(record)}`;
    }
    const bytes = encoder.encode(text);
    chunks.push(bytes);
    size += bytes.length;
    hooks.progress(batchEnd - start, end - start);
    await hooks.pause();
  }
  const tail = encoder.encode(end > start ? "\n]\n" : "]\n");
  chunks.push(tail);
  size += tail.length;
  const bytes = concat(chunks, size);
  return {
    bytes,
    result: {
      fileName: safeFileName(options.fileName, "json"),
      mime: "application/json;charset=utf-8",
      size: bytes.length,
      rows: end - start,
      columns: columns.length,
      notes: ["Every value is a JSON string. Missing fields are written as empty strings."],
      verification: [`An array of ${(end - start).toLocaleString("en-US")} objects with ${columns.length.toLocaleString("en-US")} keys each.`],
    },
  };
}
