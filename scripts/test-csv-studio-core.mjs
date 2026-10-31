/**
 * CSV Studio engine tests: tokenizer, dialect/encoding detection, import of every
 * fixture, validation, repairs with undo/reset, and XLSX/CSV/JSON export read back
 * with an independent XLSX reader. Offline: esbuild bundles src/lib/csv-studio into
 * OS temp; no browser, server, network, database or environment file is used.
 *   node --test scripts/test-csv-studio-core.mjs
 */
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { gzipSync, zipSync, unzipSync, strFromU8 } from "fflate";
import { buildSync } from "esbuild";
import readXlsxFile from "read-excel-file/node";

const require = createRequire(import.meta.url);
const Papa = require("papaparse");
const root = fileURLToPath(new URL("../", import.meta.url));
const fixtures = path.join(root, "fixtures", "csv-studio");
const temporary = mkdtempSync(path.join(tmpdir(), "byteverse-csv-studio-core-"));
after(() => rmSync(temporary, { recursive: true, force: true }));
const outfile = path.join(temporary, "studio.cjs");
const modules = ["types", "encoding", "parse", "detect", "convert", "table", "validate", "repairs", "export", "engine", "recipes", "samples"];
buildSync({
  absWorkingDir: root,
  stdin: { contents: modules.map((name) => `export * from './${name}';`).join("\n"), resolveDir: path.join(root, "src", "lib", "csv-studio"), sourcefile: "studio-test-entry.ts", loader: "ts" },
  bundle: true, platform: "node", format: "cjs", target: "es2020", outfile, logLevel: "silent",
});
const S = require(outfile);
const { StudioSession, DEFAULT_IMPORT_OPTIONS, StudioError, MARK } = S;

const fixture = (name) => readFileSync(path.join(fixtures, name));
const toBuffer = (bytes) => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
function open(input, options = {}, name = "test.csv") {
  const bytes = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return StudioSession.open({ bytes: toBuffer(bytes), text: null, source: { name, size: bytes.length, lastModified: null, kind: "file", container: "plain", innerName: null }, options: { ...DEFAULT_IMPORT_OPTIONS, ...options } });
}
function openFixture(name, options) { return open(fixture(name), options, name); }
function grid(session) {
  const snap = session.snapshot();
  return session.window(0, snap.rowCount).rows.map((row) => row.cells);
}
function headers(session) { return session.snapshot().columns.filter((column) => !column.hidden).map((column) => column.name); }
function issue(session, code) { return session.snapshot().issues.find((item) => item.code === code); }
function tokens(text, options = {}) {
  const records = [];
  const stats = S.tokenize(text, { delimiter: ",", quote: "\"", comment: "", mergeDelimiters: false, ...options }, (fields, info) => { records.push({ fields, info }); });
  return { records: records.map((record) => record.fields), infos: records.map((record) => record.info), stats };
}
const exportOptions = (overrides = {}) => ({
  format: "xlsx", fileName: "out", includeHidden: false, includeHeader: true, rows: "all", includeSummary: false, includeChanges: false,
  csvDelimiter: ",", csvSafe: false, csvBom: false, csvLineEnding: "crlf", csvQuoteAll: false, ...overrides,
});
async function exported(session, overrides) {
  const output = await session.export(exportOptions(overrides), () => {});
  return output;
}
async function readBack(bytes, sheet = 0) {
  const sheets = await readXlsxFile(Buffer.from(bytes), { trim: false });
  return sheets[sheet].data;
}
function sheetXml(bytes, name = "xl/worksheets/sheet1.xml") {
  return strFromU8(unzipSync(bytes, { filter: (file) => file.name === name })[name]);
}

describe("tokenizer", () => {
  test("quoted commas, quoted line breaks, doubled quotes and every line ending", () => {
    const { records, stats } = tokens("a,\"b,c\",\"d\r\ne\"\r\n1,\"say \"\"hi\"\"\",3\n4,5,6\r7,8,9");
    assert.deepEqual(records, [["a", "b,c", "d\r\ne"], ["1", "say \"hi\"", "3"], ["4", "5", "6"], ["7", "8", "9"]]);
    assert.deepEqual([stats.crlf, stats.lf, stats.cr], [1, 1, 1]);
    assert.equal(stats.endsWithNewline, false);
  });
  test("empty fields, trailing delimiter and blank lines are kept", () => {
    assert.deepEqual(tokens("a,,c\n\n,,\nx,\n").records, [["a", "", "c"], [""], ["", "", ""], ["x", ""]]);
  });
  test("final line break does not invent a record", () => {
    assert.equal(tokens("a,b\n1,2\n").records.length, 2);
    assert.equal(tokens("a,b\n1,2\n").stats.endsWithNewline, true);
  });
  test("text after a closing quote is kept and counted, never dropped", () => {
    const { records, stats } = tokens("\"abc\"def,x\n\"ab\"  ,y\n");
    assert.deepEqual(records, [["abcdef", "x"], ["ab  ", "y"]]);
    assert.equal(stats.malformedQuotes, 2);
  });
  test("stray quotes inside unquoted fields stay literal", () => {
    const { records, stats } = tokens("5'10\" tall,ok\n");
    assert.deepEqual(records, [["5'10\" tall", "ok"]]);
    assert.equal(stats.strayQuotes, 1);
  });
  test("unclosed quote keeps the rest of the file and reports the line", () => {
    const { records, stats } = tokens("a,b\n1,\"open\n2,x\n");
    assert.deepEqual(records, [["a", "b"], ["1", "open\n2,x\n"]]);
    assert.deepEqual(stats.unclosed, { record: 2, line: 2 });
  });
  test("line numbers account for line breaks inside quotes", () => {
    const { infos } = tokens("h\n\"a\nb\nc\"\nnext\n");
    assert.deepEqual(infos.map((info) => info.line), [1, 2, 5]);
  });
  test("comment lines, merge delimiters, no-quote and no-delimiter modes", () => {
    assert.deepEqual(tokens("# note\na,b\n#x,y\n1,2\n", { comment: "#" }).records, [["a", "b"], ["1", "2"]]);
    assert.deepEqual(tokens("a   b  c\n1 2 3 \n", { delimiter: " ", mergeDelimiters: true }).records, [["a", "b", "c"], ["1", "2", "3"]]);
    assert.deepEqual(tokens("\"a\",b\n", { quote: "" }).records, [["\"a\"", "b"]]);
    assert.deepEqual(tokens("a,b\nc;d\n", { delimiter: "" }).records, [["a,b"], ["c;d"]]);
  });
  test("matches Papa Parse on 400 random well-formed tables", () => {
    let seed = 7;
    const random = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
    const pieces = ["a", "B", "0", "007", " ", ",", "\"", "\n", "\r\n", "é", "李", "👩‍💻", "", "x y", "=1+1", "\t"];
    for (let round = 0; round < 400; round++) {
      const width = 1 + Math.floor(random() * 5);
      const rows = Array.from({ length: 1 + Math.floor(random() * 6) }, () => Array.from({ length: width }, () => Array.from({ length: Math.floor(random() * 4) }, () => pieces[Math.floor(random() * pieces.length)]).join("")));
      if (rows.some((row) => row.length === 1 && row[0] === "")) continue;
      const text = rows.map((row) => row.map((value) => (/[",\r\n]/.test(value) || value === "" ? `"${value.replace(/"/g, "\"\"")}"` : value)).join(",")).join("\n");
      const papa = Papa.parse(text, { delimiter: ",", newline: "\n", quoteChar: "\"", escapeChar: "\"", header: false, dynamicTyping: false, skipEmptyLines: false });
      assert.equal(papa.errors.length, 0, text);
      assert.deepEqual(tokens(text).records, papa.data, JSON.stringify(text));
      assert.deepEqual(tokens(text).records, rows, JSON.stringify(text));
    }
  });
});

describe("dialect and encoding detection", () => {
  const detect = (text) => S.detectDelimiter(text, "\"", "", 0);
  test("comma, semicolon, tab and pipe", () => {
    assert.equal(detect(fixture("01-standard-comma.csv").toString()).delimiter, ",");
    assert.equal(detect(fixture("02-semicolon.csv").toString()).delimiter, ";");
    assert.equal(detect(fixture("03-tab-delimited.tsv").toString()).delimiter, "\t");
    assert.equal(detect("a|b|c\n1|2|3\n").delimiter, "|");
    assert.match(detect(fixture("02-semicolon.csv").toString()).reason, /Semicolon: all 4 sampled rows have 3 fields/);
  });
  test("ambiguous delimiters and the single-column trap are not guessed", () => {
    const ambiguous = detect("a;b,c\n1;2,3\n");
    assert.equal(ambiguous.delimiter, "");
    assert.equal(ambiguous.ambiguous, true);
    const trap = detect(fixture("24-delimiter-trap.csv").toString());
    assert.equal(trap.delimiter, "");
    assert.equal(trap.ambiguous, false);
    assert.match(trap.reason, /not consistently/);
  });
  test("BOMs, UTF-16 without BOM, invalid UTF-8 and explicit Windows-1252/ISO-8859-1", () => {
    assert.equal(S.detectEncoding(fixture("04-utf8-bom.csv")).bom, "utf-8");
    assert.equal(S.detectEncoding(Buffer.from([0xff, 0xfe, 0x61, 0x00])).encoding, "utf-16le");
    assert.equal(S.detectEncoding(Buffer.from([0xfe, 0xff, 0x00, 0x61])).encoding, "utf-16be");
    assert.equal(S.detectEncoding(Buffer.from("id,name\n1,Ava\n2,Liam\n", "utf16le")).encoding, "utf-16le");
    const windows = S.detectEncoding(fixture("20-windows-1252.csv"));
    assert.equal(windows.encoding, "windows-1252");
    assert.match(windows.reason, /Not valid UTF-8/);
    assert.equal(S.decodeBytes(fixture("20-windows-1252.csv"), "windows-1252").text.split("\n")[1], "Café,“smart quotes” – dash,€ 5");
    assert.equal(S.decodeBytes(Buffer.from([0x80, 0xe9]), "iso-8859-1").text, "\u0080é");
    assert.equal(S.decodeBytes(Buffer.from([0x61, 0xff, 0x62]), "utf-8").replacements, 1);
    assert.throws(() => S.bomOf(Buffer.from([0xff, 0xfe, 0, 0])), /UTF-32/);
  });
  test("refuses workbooks, PDFs and binary data; unwraps gzip and single-file zip", () => {
    const xlsx = zipSync({ "[Content_Types].xml": Buffer.from("<Types/>"), "xl/workbook.xml": Buffer.from("<workbook/>") });
    assert.throws(() => S.unwrapContainer(xlsx), /Excel workbook \(\.xlsx\)/);
    assert.throws(() => S.unwrapContainer(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])), /legacy Excel/);
    assert.throws(() => S.unwrapContainer(Buffer.from("%PDF-1.7")), /PDF/);
    assert.throws(() => open(Buffer.concat([Buffer.from("a,b\n"), Buffer.alloc(4000)])), /binary data/);
    const gz = S.unwrapContainer(gzipSync(fixture("01-standard-comma.csv")));
    assert.equal(gz.container, "gzip");
    assert.equal(Buffer.from(gz.bytes).toString(), fixture("01-standard-comma.csv").toString());
    const zipped = S.unwrapContainer(zipSync({ "export/data.csv": fixture("01-standard-comma.csv") }));
    assert.equal(zipped.innerName, "export/data.csv");
    assert.throws(() => S.unwrapContainer(zipSync({ "a.csv": Buffer.from("a"), "b.csv": Buffer.from("b") })), /more than one file/);
  });
});

describe("import of every fixture", () => {
  test("standard, semicolon, tab and BOM files", () => {
    assert.deepEqual(headers(openFixture("01-standard-comma.csv")), ["id", "name", "city"]);
    const semi = openFixture("02-semicolon.csv");
    assert.deepEqual(grid(semi)[0], ["1", "Widget", "1,50"]);
    assert.deepEqual(grid(openFixture("03-tab-delimited.tsv"))[0], ["001", "Bolt, small", "10"]);
    const bom = openFixture("04-utf8-bom.csv");
    assert.deepEqual(headers(bom), ["name", "email"]);
    assert.equal(bom.snapshot().report.encoding.bom, "utf-8");
    assert.ok(issue(bom, "bom"));
  });
  test("Unicode names round-trip exactly", () => {
    const session = openFixture("05-unicode-names.csv");
    assert.deepEqual(grid(session).map((row) => row[0]), ["Sofía Ramírez", "李雷", "Zoë Ørsted", "محمد"]);
    assert.equal(grid(session)[2][2], "emoji 👩‍💻");
  });
  test("quoted commas, multiline values and escaped quotes", () => {
    assert.deepEqual(grid(openFixture("06-quoted-commas.csv"))[0], ["1", "123 Main St, Apt 4", "Boston"]);
    const multi = openFixture("07-quoted-multiline.csv");
    assert.deepEqual(grid(multi).map((row) => row[1]), ["First line\r\nSecond line", "One\nTwo\nThree", "plain"]);
    assert.deepEqual(multi.window(0, 3).rows.map((row) => row.line), [2, 4, 7]);
    assert.deepEqual(grid(openFixture("08-escaped-quotes.csv")).map((row) => row[1]), ["She said \"hello\"", "12\" ruler", "\""]);
  });
  test("empty cells and blank rows are kept until the user removes them", () => {
    const session = openFixture("09-empty-cells-rows.csv");
    assert.deepEqual(grid(session), [["1", "", "3"], ["", null, null], ["", "", ""], ["4", "5", ""]]);
    assert.equal(issue(session, "blank-rows").count, 2);
  });
  test("duplicate and blank headers are reported, not renamed silently", () => {
    const session = openFixture("10-duplicate-blank-headers.csv");
    assert.deepEqual(headers(session), ["name", "", "name", "email"]);
    assert.ok(issue(session, "duplicate-header"));
    assert.ok(issue(session, "blank-header"));
    assert.ok(session.snapshot().blockers.json);
  });
  test("ragged rows: short cells are missing, extra values become visible columns", () => {
    const session = openFixture("11-inconsistent-rows.csv");
    assert.deepEqual(headers(session), ["a", "b", "c", "", ""]);
    assert.deepEqual(grid(session), [["1", "2", "3", null, null], ["4", "5", null, null, null], ["6", "7", "8", "9", "10"], ["11", "12", "13", null, null]]);
    assert.equal(issue(session, "ragged-short").count, 1);
    assert.equal(issue(session, "ragged-long").severity, "error");
    const extra = openFixture("23-ragged-extra.csv");
    assert.deepEqual(grid(extra)[1], ["2", "Liam", "unexpected", "values"]);
  });
  test("empty and header-only files", () => {
    assert.throws(() => openFixture("17-empty.csv"), (error) => error.code === "EMPTY_FILE");
    const header = openFixture("17b-header-only.csv");
    assert.equal(header.snapshot().rowCount, 0);
    assert.ok(issue(header, "empty-data"));
  });
  test("malformed, unclosed and truncated files import with errors instead of failing", () => {
    const session = openFixture("18-malformed-quotes.csv");
    const rows = grid(session);
    assert.equal(rows.length, 3);
    assert.deepEqual(rows[1], ["2", "Betax", "text after quote"]);
    assert.equal(rows[2][1], "Gamma,never closed\n4,Delta,swallowed\n");
    assert.equal(issue(session, "unclosed-quote").severity, "error");
    assert.equal(issue(session, "unclosed-quote").dismissible, false);
    assert.ok(issue(session, "malformed-quotes"));
    const noQuotes = openFixture("18-malformed-quotes.csv", { quote: "none" });
    assert.equal(noQuotes.snapshot().rowCount, 4);
    const truncated = openFixture("18b-truncated.csv");
    assert.ok(issue(truncated, "truncated"));
  });
  test("Windows-1252, mixed line endings, skip rows, comments and no-header mode", () => {
    const windows = openFixture("20-windows-1252.csv");
    assert.deepEqual(grid(windows)[0], ["Café", "“smart quotes” – dash", "€ 5"]);
    const mixed = openFixture("21-mixed-line-endings.csv");
    assert.deepEqual(grid(mixed), [["1", "2"], ["3", "4"], ["5", "6"], ["7", "8"]]);
    assert.equal(mixed.snapshot().report.lineEndings.style, "Mixed");
    assert.ok(issue(mixed, "mixed-line-endings"));
    const skipped = open("Report generated 2026-03-04\n\nid,name\n1,Ava\n", { skipRows: 2 });
    assert.deepEqual(headers(skipped), ["id", "name"]);
    assert.ok(issue(skipped, "skipped"));
    const commented = open("# exported\nid,name\n# hidden\n1,Ava\n", { comment: "#" });
    assert.equal(commented.snapshot().rowCount, 1);
    const noHeader = openFixture("01-standard-comma.csv", { header: false });
    assert.deepEqual(headers(noHeader), ["Column 1", "Column 2", "Column 3"]);
    assert.equal(noHeader.snapshot().rowCount, 4);
  });
  test("single-column delimiter trap recommends the real delimiter only when consistent", () => {
    const trap = openFixture("24-delimiter-trap.csv");
    assert.equal(trap.snapshot().columns.length, 1);
    assert.equal(issue(trap, "single-column-delimiter"), undefined);
    assert.match(issue(trap, "single-column").explanation, /not consistently/);
    const semicolon = open("a;b;c\n1;2;3\n4;5;6\n", { delimiter: "none" });
    const suggestion = issue(semicolon, "single-column-delimiter");
    assert.equal(suggestion.fix.kind, "reimport");
    assert.equal(suggestion.fix.patch.delimiter, ";");
  });
  test("manual overrides re-read the same bytes", () => {
    const bytes = fixture("02-semicolon.csv");
    const comma = open(bytes, { delimiter: "," });
    assert.deepEqual(headers(comma), ["id;product;price", ""]);
    const semicolon = open(bytes, { delimiter: ";" });
    assert.deepEqual(headers(semicolon), ["id", "product", "price"]);
    const wrongEncoding = open(fixture("05-unicode-names.csv"), { encoding: "windows-1252" });
    assert.ok(issue(wrongEncoding, "mojibake"));
    assert.throws(() => open(bytes, { delimiter: "custom", customDelimiter: "\"" }), /custom delimiter/);
  });
  test("limits refuse clearly instead of importing part of a file", () => {
    const oversized = Buffer.alloc(25 * 1024 * 1024 + 1, 0x61);
    assert.throws(() => open(oversized), (error) => error.code === "FILE_LIMIT");
    const rows = `id\n${Array.from({ length: 100_001 }, (_, index) => index).join("\n")}\n`;
    assert.throws(() => open(rows), (error) => error.code === "ROW_LIMIT" && /never imports part of a file/.test(error.message));
    assert.throws(() => open(`${Array.from({ length: 501 }, (_, index) => `c${index}`).join(",")}\n`), (error) => error.code === "COLUMN_LIMIT");
  });
});

describe("validation", () => {
  test("leading zeros: warning recommends Text and never converts", () => {
    const session = openFixture("12-leading-zero-ids.csv");
    const zero = issue(session, "leading-zero");
    assert.equal(zero.severity, "warning");
    assert.equal(zero.fix.op.kind, "setType");
    assert.equal(zero.fix.op.type, "text");
    assert.match(zero.explanation, /001234 becomes 1234/);
    assert.deepEqual(grid(session).map((row) => row[0]), ["001234", "000001", "12345"]);
    session.apply(zero.fix.op);
    assert.equal(session.snapshot().issues.filter((item) => item.code === "leading-zero" && item.column === zero.column).length, 0);
    assert.deepEqual(grid(session).map((row) => row[0]), ["001234", "000001", "12345"]);
  });
  test("ZIP, ZIP+4 and phone fixtures: short ZIPs flagged as unrecoverable, never padded", () => {
    const session = openFixture("13-phone-zip.csv");
    const zip = issue(session, "zip-short");
    assert.match(zip.explanation, /can’t know the missing digits/);
    assert.equal(zip.fix.kind, "pad");
    assert.equal(grid(session)[2][2], "2115");
    assert.equal(session.profile(2).suggestion.profile, "zip");
  });
  test("long identifiers and scientific notation", () => {
    const long = openFixture("14-long-ids.csv");
    assert.equal(issue(long, "long-digits").count, 2);
    assert.match(issue(long, "long-digits").explanation, /15 significant digits/);
    assert.deepEqual(grid(long)[0], ["4111111111111111", "12345678901234567890"]);
    const scientific = openFixture("22-scientific-ids.csv");
    assert.match(issue(scientific, "scientific").explanation, /can’t be recovered/);
  });
  test("dates, formulas and type mixes", () => {
    const dates = openFixture("15-ambiguous-dates.csv");
    assert.equal(issue(dates, "date-like").count, 5);
    assert.ok(issue(dates, "mixed-dates"));
    const formulas = openFixture("16-formula-like.csv");
    const formula = issue(formulas, "formula");
    assert.equal(formula.count, 4, "plain signed numbers +1234 and -5 are not counted as formula risk");
    assert.equal(formula.category, "security");
    const marks = formulas.window(0, 6).rows.map((row) => Boolean(row.marks[1] & MARK.FORMULA));
    assert.deepEqual(marks, [true, false, true, true, false, true]);
    const mixed = open("amount\n1\n2\n3\n4\n5\n6\n7\n8\nN/A\n");
    assert.ok(issue(mixed, "mixed-types"));
    assert.ok(issue(mixed, "sentinel"));
  });
  test("issues are navigable, dismissing changes nothing, errors cannot be dismissed", () => {
    const session = openFixture("12-leading-zero-ids.csv");
    const zero = issue(session, "leading-zero");
    assert.deepEqual(session.locate(zero.id, -1), { row: 0, column: 0 });
    assert.deepEqual(session.locate(zero.id, 0), { row: 1, column: 0 });
    assert.deepEqual(session.locate(zero.id, 1), { row: 0, column: 0 });
    const before = JSON.stringify(grid(session));
    const version = session.snapshot().version;
    session.dismiss(zero.id, true);
    assert.deepEqual(session.snapshot().dismissed, [zero.id]);
    assert.equal(JSON.stringify(grid(session)), before);
    assert.equal(session.snapshot().version, version);
    session.dismiss(zero.id, false);
    assert.deepEqual(session.snapshot().dismissed, []);
    const broken = openFixture("18-malformed-quotes.csv");
    assert.throws(() => broken.dismiss(issue(broken, "unclosed-quote").id, true), /can’t be dismissed/);
  });
  test("cell inspector shows the raw record, quoting and code points", () => {
    const session = open("id,name\n1,\"Ava \u00a0Lee\"\n2,  Liam\n");
    const detail = session.cell(0, 1);
    assert.equal(detail.quoted, true);
    assert.equal(detail.raw, "1,\"Ava \u00a0Lee\"");
    assert.ok(detail.codePoints.some((point) => point.code === "U+00A0"));
    assert.equal(session.cell(1, 1).quoted, false);
    assert.equal(session.cell(1, 1).codePoints[0].name, "Leading space");
    assert.equal(session.cell(1, 1).line, 3);
  });
});

describe("repairs, history and reset", () => {
  test("safe cleanups preview first, then apply as one undoable step", () => {
    const session = open("\ufeffname , city\n Ava ,Boston\nLi\ufeffam,  Denver\n", { encoding: "utf-8" });
    const op = { kind: "batch", label: "Apply safe cleanups", ops: [{ kind: "trim", columns: "all" }, { kind: "stripBom", columns: "all" }, { kind: "repairHeaders", names: null }] };
    const preview = session.preview(op);
    assert.equal(preview.cells, 3);
    assert.equal(session.snapshot().history.cursor, 0, "preview must not commit");
    session.apply(op);
    assert.deepEqual(headers(session), ["name", "city"]);
    assert.deepEqual(grid(session), [["Ava", "Boston"], ["Liam", "Denver"]]);
    session.undo();
    assert.deepEqual(grid(session), [[" Ava ", "Boston"], ["Li\ufeffam", "  Denver"]]);
    session.redo();
    assert.deepEqual(grid(session)[0], ["Ava", "Boston"]);
  });
  test("control characters, spaces and NFC", () => {
    const session = open("v\na\u0001b\u200bc\nx\u00a0\u00a0y\ncafe\u0301\n");
    session.apply({ kind: "removeControls", columns: "all" });
    session.apply({ kind: "normalizeSpaces", columns: "all" });
    session.apply({ kind: "nfc", columns: "all" });
    assert.deepEqual(grid(session).map((row) => row[0]), ["abc", "x y", "café"]);
  });
  test("header repair: defaults, custom names and collision protection", () => {
    const session = openFixture("10-duplicate-blank-headers.csv");
    const preview = session.preview({ kind: "repairHeaders", names: null });
    assert.deepEqual(preview.headers.map((item) => item.after), ["Column 2", "name (2)"]);
    const blocked = session.preview({ kind: "repairHeaders", names: { 1: "email" } });
    assert.match(blocked.blocked, /share a name/);
    session.apply({ kind: "repairHeaders", names: { 1: "Notes" } });
    assert.deepEqual(headers(session), ["name", "Notes", "name (2)", "email"]);
    assert.equal(session.snapshot().blockers.json, null);
  });
  test("blank and duplicate row removal keeps the first copy", () => {
    const session = open("a,b\n1,2\n\n1,2\n3,4\n,\n1,2\n");
    const duplicates = session.preview({ kind: "removeDuplicateRows" });
    assert.equal(duplicates.rowsRemoved, 2);
    assert.match(duplicates.samples[0].column, /Same as row 1/);
    session.apply({ kind: "removeDuplicateRows" });
    session.apply({ kind: "removeBlankRows" });
    assert.deepEqual(grid(session), [["1", "2"], ["3", "4"]]);
  });
  test("column tools: type, rename, move, hide, delete, split, merge, pad, fill", () => {
    const session = open("first,last,zip,code\nAva,Lee,2115,A-1\nLiam,,30301,B-2\n");
    session.apply({ kind: "setType", columns: [2], type: "text", profile: "zip", dateFormat: null });
    assert.equal(session.snapshot().columns[2].type, "text");
    assert.equal(session.preview({ kind: "padLeft", column: 2, length: 1 }).blocked, "Type a target length between 2 and 64.");
    session.apply({ kind: "padLeft", column: 2, length: 5 });
    assert.deepEqual(grid(session).map((row) => row[2]), ["02115", "30301"]);
    session.apply({ kind: "merge", columns: [0, 1], joiner: " ", name: "full name", removeSources: false });
    assert.deepEqual(grid(session).map((row) => row[2]), ["Ava Lee", "Liam"]);
    session.apply({ kind: "split", column: 3, separator: "-", maxParts: 2, keepSource: false });
    assert.deepEqual(headers(session).slice(-2), ["code 1", "code 2"]);
    assert.deepEqual(grid(session)[0].slice(-2), ["A", "1"]);
    session.apply({ kind: "rename", column: 0, name: "given" });
    session.apply({ kind: "move", column: 0, offset: 1 });
    assert.deepEqual(headers(session).slice(0, 2), ["last", "given"]);
    session.apply({ kind: "hide", column: 1, hidden: true });
    assert.equal(headers(session).includes("last"), false);
    session.apply({ kind: "fillEmpty", column: 1, value: "(none)" });
    session.apply({ kind: "deleteColumn", column: 0 });
    assert.equal(session.snapshot().columns.some((column) => column.key === 0), false);
    session.reset();
    assert.deepEqual(headers(session), ["first", "last", "zip", "code"]);
    assert.deepEqual(grid(session)[0], ["Ava", "Lee", "2115", "A-1"]);
    session.undo();
    assert.equal(session.snapshot().columns.some((column) => column.key === 0), false, "reset is undoable");
  });
  test("find and replace: literal, whole cell, regex groups, unsafe patterns blocked", () => {
    const session = open("v\nNULL\nnull value\nACME-001\n");
    session.apply({ kind: "findReplace", columns: "all", find: "NULL", replace: "", regex: false, matchCase: true, wholeCell: true });
    assert.deepEqual(grid(session).map((row) => row[0]), ["", "null value", "ACME-001"]);
    session.apply({ kind: "findReplace", columns: "all", find: "([A-Z]+)-(\\d+)", replace: "$2/$1", regex: true, matchCase: true, wholeCell: false });
    assert.equal(grid(session)[2][0], "001/ACME");
    assert.match(session.preview({ kind: "findReplace", columns: "all", find: "(a+)+", replace: "", regex: true, matchCase: false, wholeCell: false }).blocked, /Nested repetition/);
  });
  test("cell edits, clears and demoting a header never touch the imported table", () => {
    const session = open("a,b\n1,2\n3,4\n");
    const original = JSON.stringify(grid(session));
    session.apply({ kind: "editCells", edits: [{ row: 0, column: 0, value: "x" }] });
    session.apply({ kind: "clearCells", range: { top: 1, bottom: 1, left: 0, right: 1 } });
    assert.deepEqual(grid(session), [["x", "2"], ["", ""]]);
    assert.ok(session.window(0, 1).rows[0].marks[0] & MARK.CHANGED);
    assert.ok(session.cell(0, 0).changed);
    assert.equal(session.cell(0, 0).original, "1");
    session.apply({ kind: "demoteHeader" });
    assert.deepEqual(grid(session)[0], ["a", "b"]);
    assert.deepEqual(headers(session), ["Column 1", "Column 2"]);
    session.reset();
    assert.equal(JSON.stringify(grid(session)), original);
    assert.equal(session.snapshot().changes.cells, 0);
  });
  test("history is capped without losing reset", () => {
    const session = open("v\n1\n");
    for (let index = 0; index < 60; index++) session.apply({ kind: "editCells", edits: [{ row: 0, column: 0, value: String(index) }] });
    assert.equal(session.snapshot().history.steps.length, 51);
    session.reset();
    assert.equal(grid(session)[0][0], "1");
  });
  test("recipes store rules, not values, and replay as one step", () => {
    const session = openFixture("12-leading-zero-ids.csv");
    const columns = session.snapshot().columns.map((column, index) => (index === 0 ? { ...column, type: "text", profile: "customer" } : column));
    const recipe = { id: "r", name: "IDs", created: 1, columns: columns.filter((column) => column.profile).map((column) => ({ name: column.name, type: column.type, profile: column.profile, dateFormat: null })), cleanups: ["trim"] };
    assert.equal(JSON.stringify(recipe).includes("001234"), false);
    const { op, matched } = S.recipeOps(recipe, session.snapshot().columns);
    assert.equal(matched, 1);
    session.apply(op);
    assert.equal(session.snapshot().columns[0].profile, "customer");
    assert.equal(session.snapshot().history.steps.length, 2);
  });
});

describe("export", () => {
  test("XLSX is a real workbook with text identifiers, exact long IDs and no formulas", async () => {
    const session = open([
      "id,zip,account,formula,name,amount,date,flag",
      "001234,02115,12345678901234567890,=1+1,Zoë 👩‍💻,1234.50,03/04/2026,yes",
      "0000789,07030,4111111111111111,@SUM(1),\"Line one\r\nline two\",-5,13/40/2026,maybe",
      "12,10001,00000000000000000001,\t=cmd,_x0041_ literal,1e5,12/31/2026,no",
    ].join("\n"));
    session.apply({ kind: "setType", columns: [0], type: "text", profile: "customer", dateFormat: null });
    session.apply({ kind: "setType", columns: [5], type: "decimal", profile: null, dateFormat: null });
    session.apply({ kind: "setType", columns: [6], type: "date", profile: null, dateFormat: "MDY" });
    session.apply({ kind: "setType", columns: [7], type: "boolean", profile: null, dateFormat: null });
    const { bytes, result } = await exported(session, { includeSummary: true, includeChanges: true });
    const parts = Object.keys(unzipSync(bytes));
    for (const part of ["[Content_Types].xml", "_rels/.rels", "xl/workbook.xml", "xl/_rels/workbook.xml.rels", "xl/styles.xml", "xl/worksheets/sheet1.xml", "xl/worksheets/sheet2.xml", "xl/worksheets/sheet3.xml"]) assert.ok(parts.includes(part), part);
    const xml = sheetXml(bytes);
    assert.equal(/<f[ >]/.test(xml), false, "no formula elements");
    assert.match(xml, /<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"\/>/);
    assert.match(xml, /<autoFilter ref="A1:H4"\/>/);
    assert.match(xml, /_x005F_x0041_ literal/);
    assert.match(xml, /<t xml:space="preserve">\t=cmd<\/t>/);
    assert.match(xml, /Line one&#13;\nline two/);
    const rows = await readBack(bytes);
    assert.deepEqual(rows[0], ["id", "zip", "account", "formula", "name", "amount", "date", "flag"]);
    assert.deepEqual(rows[1].slice(0, 5), ["001234", "02115", "12345678901234567890", "=1+1", "Zoë 👩‍💻"]);
    assert.deepEqual(rows[2].slice(0, 4), ["0000789", "07030", "4111111111111111", "@SUM(1)"]);
    assert.equal(rows[3][2], "00000000000000000001");
    assert.equal(rows[3][3], "\t=cmd");
    assert.equal(rows[1][5], 1234.5);
    assert.equal(rows[2][5], -5);
    assert.equal(rows[3][5], "1e5", "numbers that don't parse cleanly stay text");
    assert.ok(rows[1][6] instanceof Date);
    assert.equal(rows[1][6].toISOString().slice(0, 10), "2026-03-04");
    assert.equal(rows[2][6], "13/40/2026");
    assert.equal(rows[1][7], true);
    assert.equal(rows[3][7], false);
    assert.equal(rows[2][7], "maybe");
    assert.equal(result.rows, 3);
    assert.equal(result.columns, 8);
    assert.ok(result.notes.some((note) => /1 value in amount isn’t a valid number/.test(note)));
    assert.ok(result.verification.some((line) => /0 formula cells/.test(line)));
    const summary = await readBack(bytes, 1);
    assert.equal(summary[0][0], "ByteVerse CSV Studio · validation summary");
    assert.ok(summary.some((row) => row[1] === "Formula-like values"));
    const changes = await readBack(bytes, 2);
    assert.equal(changes.length, 5);
    assert.equal(changes[1][1], "Keep id as text (Customer ID)");
  });
  test("XLSX keeps imported data untouched and refuses cells Excel can't hold", async () => {
    const session = openFixture("12-leading-zero-ids.csv");
    const before = JSON.stringify(grid(session));
    const { bytes } = await exported(session);
    const rows = await readBack(bytes);
    assert.deepEqual(rows.slice(1).map((row) => row[0]), ["001234", "000001", "12345"]);
    assert.equal(JSON.stringify(grid(session)), before);
    const huge = open(`v\n${"x".repeat(32_768)}\n`);
    assert.ok(huge.snapshot().blockers.xlsx);
    await assert.rejects(() => exported(huge), (error) => error.code === "CELL_TOO_LONG");
  });
  test("selection export, hidden columns and header option", async () => {
    const session = openFixture("01-standard-comma.csv");
    session.apply({ kind: "hide", column: 2, hidden: true });
    const { bytes, result } = await exported(session, { rows: { top: 1, bottom: 2 } });
    const rows = await readBack(bytes);
    assert.deepEqual(rows, [["id", "name"], ["2", "Liam"], ["3", "Mia"]]);
    assert.equal(result.columns, 2);
    const withHidden = await exported(session, { includeHidden: true, includeHeader: false });
    assert.deepEqual((await readBack(withHidden.bytes))[0], ["1", "Ava", "Boston"]);
  });
  test("CSV: RFC quoting, spreadsheet-safe apostrophes, BOM and line endings", async () => {
    const session = openFixture("16-formula-like.csv");
    const plain = await exported(session, { format: "csv", csvLineEnding: "lf" });
    const text = Buffer.from(plain.bytes).toString("utf8");
    assert.equal(text.split("\n")[6], "6,\"＝HYPERLINK(\"\"x\"\")\"");
    const safe = await exported(session, { format: "csv", csvSafe: true, csvBom: true });
    const safeText = Buffer.from(safe.bytes).toString("utf8");
    assert.ok(safeText.startsWith("\ufeffid,value\r\n"));
    const lines = safeText.slice(1).split("\r\n");
    assert.deepEqual(lines.slice(1, 6), ["1,'=1+1", "2,+1234", "3,'@SUM(1)", "4,'\t=cmd|' /C calc'!A0", "5,-5"]);
    assert.ok(safe.result.notes.some((note) => /4 formula-like values were prefixed/.test(note)));
    assert.ok(plain.result.notes[0].includes("CSV files carry no cell types"));
    const multi = await exported(openFixture("07-quoted-multiline.csv"), { format: "csv", csvLineEnding: "crlf" });
    const reparsed = tokens(Buffer.from(multi.bytes).toString("utf8")).records;
    assert.deepEqual(reparsed.slice(1).map((row) => row[1]), ["First line\r\nSecond line", "One\nTwo\nThree", "plain"]);
    const tsv = await exported(openFixture("06-quoted-commas.csv"), { format: "tsv" });
    assert.equal(Buffer.from(tsv.bytes).toString("utf8").split("\r\n")[1], "1\t123 Main St, Apt 4\tBoston");
    assert.equal(tsv.result.fileName, "out.tsv");
  });
  test("JSON exports strings and requires unique names", async () => {
    const json = await exported(openFixture("12-leading-zero-ids.csv"), { format: "json" });
    assert.deepEqual(JSON.parse(Buffer.from(json.bytes).toString("utf8"))[0], { customer_id: "001234", account: "0000789" });
    await assert.rejects(() => exported(openFixture("10-duplicate-blank-headers.csv"), { format: "json" }), (error) => error.code === "JSON_HEADERS");
  });
  test("cancelled exports fail honestly and leave the document intact", async () => {
    const session = open(`v\n${Array.from({ length: 5_000 }, (_, index) => index).join("\n")}\n`);
    const promise = session.export(exportOptions(), () => session.cancel());
    await assert.rejects(promise, (error) => error.code === "CANCELLED");
    assert.equal(session.snapshot().rowCount, 5_000);
  });
  test("file names and sheet names are sanitized", () => {
    assert.equal(S.safeFileName("a/b:c*?.csv", "xlsx"), "a b c .xlsx".replace(" .", "."));
    assert.equal(S.sheetNameFrom("Q1 [final]: report.xlsx"), "Q1 final report");
    assert.equal(S.sheetNameFrom("history.xlsx"), "Data");
  });
});

describe("samples and scale", () => {
  test("every bundled sample imports and has issues worth reviewing", () => {
    for (const sample of S.STUDIO_SAMPLES) {
      const session = open(Buffer.from(sample.bytes()), {}, sample.fileName);
      assert.ok(session.snapshot().issues.length > 0, sample.id);
    }
    const europe = open(Buffer.from(S.STUDIO_SAMPLES.find((sample) => sample.id === "europe").bytes()));
    assert.equal(europe.snapshot().report.delimiter.used, ";");
    assert.equal(europe.snapshot().report.encoding.used, "windows-1252");
    assert.equal(grid(europe)[0][1], "Müller GmbH");
  });
  test("100,000 rows × 10 columns import, validate and export within budget", async () => {
    const lines = ["id,zip,sku,name,email,amount,date,state,notes,account"];
    for (let index = 0; index < 100_000; index++) {
      lines.push(`${String(index).padStart(7, "0")},0${(index % 9000) + 1000},SKU-${index},Customer ${index},user${index}@example.com,${(index % 997) + 0.5},3/${(index % 28) + 1}/26,MA,"note, ${index}",4000${String(index).padStart(16, "0")}`);
    }
    const text = `${lines.join("\n")}\n`;
    writeFileSync(path.join(temporary, "large.csv"), text);
    const bytes = readFileSync(path.join(temporary, "large.csv"));
    let started = performance.now();
    const session = open(bytes);
    const importMs = performance.now() - started;
    assert.equal(session.snapshot().rowCount, 100_000);
    assert.ok(issue(session, "leading-zero"));
    started = performance.now();
    const { bytes: workbook, result } = await exported(session);
    const exportMs = performance.now() - started;
    assert.equal(result.rows, 100_000);
    const check = S.inspectWorkbook(workbook);
    assert.equal(check.rows, 100_001);
    console.log(`  large file: ${(bytes.length / 1048576).toFixed(1)} MB imported+validated in ${Math.round(importMs)} ms; ${(workbook.length / 1048576).toFixed(1)} MB XLSX in ${Math.round(exportMs)} ms`);
    assert.ok(importMs < 60_000 && exportMs < 120_000);
  });
});

test("StudioError is the only error type surfaced for user problems", () => {
  try { openFixture("17-empty.csv"); } catch (error) { assert.ok(error instanceof StudioError); }
});
