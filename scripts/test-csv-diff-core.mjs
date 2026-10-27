import assert from "node:assert/strict";
import { File, Blob } from "node:buffer";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { buildSync } from "esbuild";
import ts from "typescript";

// Synthetic, offline, allowlisted core only. esbuild writes disposable bundles
// to OS temp; no application entry, environment file, database, browser, server,
// network, package installation, or generated project output is involved.
const require = createRequire(import.meta.url);
const papa = require("papaparse");
const root = fileURLToPath(new URL("../", import.meta.url));
const directory = path.join(root, "src", "lib", "csv-diff");
const names = ["types", "engine", "input", "export", "samples", "worker"];
const temporary = mkdtempSync(path.join(tmpdir(), "byteverse-csv-diff-core-"));
const bundleOptions = { absWorkingDir: root, bundle: true, platform: "browser", format: "cjs", target: "es2017",
  external: ["papaparse"], logLevel: "silent", metafile: true, sourcemap: false };
const bundles = new Map();
try {
  for (const name of ["core", "worker"]) {
    const outfile = path.join(temporary, `${name}.cjs`);
    const entry = name === "core"
      ? { stdin: { contents: names.filter((value) => value !== "worker").map((value) => `export * from './${value}';`).join("\n"), resolveDir: directory, sourcefile: "csv-diff-test-entry.ts", loader: "ts" } }
      : { entryPoints: [path.join(directory, "worker.ts")] };
    const built = buildSync({ ...bundleOptions, ...entry, outfile });
    for (const input of Object.keys(built.metafile.inputs)) {
      if (input.includes("csv-diff-test-entry.ts")) continue;
      const full = path.resolve(root, input);
      assert.ok(names.some((value) => full === path.join(directory, `${value}.ts`)), `Unexpected bundle input: ${input}`);
    }
    bundles.set(name, readFileSync(outfile, "utf8"));
  }
} catch (error) {
  rmSync(temporary, { recursive: true, force: true });
  throw error;
}
after(() => rmSync(temporary, { recursive: true, force: true }));

function load(name = "core", fault) {
  const calls = { parses: 0, forbidden: [] };
  const messages = [];
  const blocked = (name) => () => { calls.forbidden.push(name); throw new Error(`Forbidden capability: ${name}`); };
  const moduleRecord = { exports: {} };
  const sandbox = {
    module: moduleRecord, exports: moduleRecord.exports,
    ArrayBuffer, Uint8Array, TextEncoder, TextDecoder, File, Blob, structuredClone,
    postMessage: (message) => messages.push(structuredClone(message)),
    console: Object.fromEntries(["log", "info", "warn", "error", "debug"].map((name) => [name, blocked(`console.${name}`)])),
    require: (specifier) => {
      assert.equal(specifier, "papaparse", "Only the installed parser may be required");
      return { parse: (text, options) => {
        calls.parses++;
        assert.equal(typeof text, "string");
        for (const property of ["header", "dynamicTyping", "skipEmptyLines", "download", "worker", "fastMode"]) assert.equal(options[property], false, property);
        assert.ok([",", ";", "\t", "|"].includes(options.delimiter));
        assert.equal(options.newline, "\n");
        if (fault === "throw") throw new Error("PRIVATE_SENTINEL parser/path.csv");
        const parsed = papa.parse(text, options);
        if (fault === "error") parsed.errors.push({ type: "Quotes", code: "InvalidQuotes", message: "PRIVATE_SENTINEL" });
        if (fault === "aborted") parsed.meta.aborted = true;
        if (fault === "truncated") parsed.meta.truncated = true;
        if (fault === "width") parsed.data[0].push("corruption");
        if (fault === "coerced") parsed.data[1][0] = 9007199254740992;
        if (fault === "missing-row") parsed.data.pop();
        return parsed;
      } };
    },
  };
  for (const name of ["fetch", "XMLHttpRequest", "WebSocket", "EventSource", "Worker", "importScripts", "setTimeout", "setInterval"]) sandbox[name] = blocked(name);
  for (const name of ["process", "window", "document", "localStorage", "sessionStorage"]) Object.defineProperty(sandbox, name, { get: blocked(name) });
  const context = vm.createContext(sandbox, { codeGeneration: { strings: false, wasm: false } });
  vm.runInContext(bundles.get(name), context, { filename: path.join(temporary, `${name}.cjs`), timeout: 15_000 });
  return { api: moduleRecord.exports, context, calls, messages };
}

const isolated = load();
const core = isolated.api;
const limits = core.CSV_DIFF_LIMITS;
const plain = (value) => JSON.parse(JSON.stringify(value));
const options = (changes = {}) => ({ keys: ["id"], columns: ["value"], trimValues: false, ignoreCase: false, ...changes });
const input = (text, delimiter = "auto", encoding = "utf-8") => ({ source: { text }, delimiter, encoding });
const table = (headers, rows) => ({ headers, rows: rows.map((values, index) => ({ record: index + 2, values })), delimiter: ",", skippedBlankRecords: 0 });
const compare = (original, updated, changes = {}) => core.compareTables(core.parseCsv(original), core.parseCsv(updated), options(changes));
const baseResult = () => compare("id,value\n1,alpha\n2,beta\n3,gamma", "value,id\nGAMMA,3\nalpha,1\ndelta,4");

function checkError(error, code, instance = core) {
  assert.ok(error instanceof instance.CsvDiffError, "Public core failures must be CsvDiffError");
  assert.equal(error.name, "CsvDiffError");
  if (code) assert.ok((Array.isArray(code) ? code : [code]).includes(error.code), `Expected ${code}, got ${error.code}: ${error.message}`);
  assert.ok(error.message.length < 400);
  assert.doesNotMatch(error.message, /PRIVATE_SENTINEL|parser\/path/);
  return true;
}
function rejects(operation, code, instance = core) {
  let caught;
  assert.throws(operation, (error) => { caught = error; return checkError(error, code, instance); });
  return caught;
}
async function rejectsAsync(operation, code, instance = core) {
  await assert.rejects(operation, (error) => checkError(error, code, instance));
}
function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}
function fixtureCsv(matrix, delimiter = ",") {
  return matrix.map((row) => row.map((value) => '"' + value.replace(/"/g, '""') + '"').join(delimiter)).join("\r\n");
}
function utf16(text, bigEndian = false, bom = false) {
  const bytes = Buffer.from(text, "utf16le");
  if (bigEndian) bytes.swap16();
  return bom ? Buffer.concat([Buffer.from(bigEndian ? [0xfe, 0xff] : [0xff, 0xfe]), bytes]) : bytes;
}

// Independent report reader: no Papa, split-on-lines, or production escaping.
// Also enforces quote-all, CRLF record separators and a final record terminator.
function readReport(csv) {
  assert.equal(csv[0], "\ufeff", "Exactly one transport BOM must precede the report");
  let index = 1;
  const matrix = [];
  while (index < csv.length) {
    const row = [];
    for (;;) {
      assert.equal(csv[index++], '"', "Every report field must be quoted");
      let value = "";
      let closed = false;
      while (index < csv.length) {
        const char = csv[index++];
        if (char !== '"') value += char;
        else if (csv[index] === '"') { value += '"'; index++; }
        else { closed = true; break; }
      }
      assert.equal(closed, true, "Quoted field must close");
      row.push(value);
      if (csv[index] === ",") { index++; continue; }
      assert.equal(csv.slice(index, index + 2), "\r\n");
      index += 2;
      matrix.push(row);
      break;
    }
  }
  assert.equal(index, csv.length);
  assert.ok(matrix.every((row) => row.length === matrix[0].length));
  return matrix;
}

test("required runtime API, exact installed Papa version, immutable limits", () => {
  assert.equal(require("papaparse/package.json").version, "5.7.0");
  assert.deepEqual(Object.keys(core).sort(), ["CSV_DIFF_LIMITS", "CSV_DIFF_SAMPLES", "CsvDiffError", "assertCsvUnicode", "compareTables", "decodeCsvBytes", "exportCsv", "exportJson", "filteredRows", "parseCsv", "readCsvInput", "sharedHeaders"].sort());
  assert.deepEqual(plain(limits), { inputBytes: 5 * 1024 * 1024, inputChars: 2_000_000, rows: 20_000, columns: 100,
    cells: 500_000, headerChars: 256, fieldChars: 100_000, outputBytes: 16 * 1024 * 1024,
    timeoutMs: 15_000, keys: 5, issues: 40, issueRecords: 20 });
  assert.ok(Object.isFrozen(limits));
});

for (const lib of [["lib.esnext.d.ts", "lib.dom.d.ts", "lib.dom.iterable.d.ts"], ["lib.esnext.d.ts", "lib.webworker.d.ts"]]) {
  test(`scoped no-emit TypeScript check with ${lib[1]}`, () => {
    const program = ts.createProgram(names.map((name) => path.join(directory, `${name}.ts`)), {
      target: ts.ScriptTarget.ES2017, lib, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler,
      esModuleInterop: true, strict: true, isolatedModules: true, types: [], skipLibCheck: true, incremental: false, noEmit: true,
    });
    const diagnostics = ts.getPreEmitDiagnostics(program);
    assert.equal(diagnostics.length, 0, ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCanonicalFileName: (name) => name, getCurrentDirectory: () => root, getNewLine: () => "\n",
    }));
    assert.deepEqual(program.getSourceFiles().filter((file) => !file.isDeclarationFile).map((file) => path.basename(file.fileName)).sort(), names.map((name) => `${name}.ts`).sort());
  });
}

for (const delimiter of [",", ";", "\t", "|"]) {
  test(`auto detects ${JSON.stringify(delimiter)} without coercing strings`, () => {
    const parsed = core.parseCsv(`id${delimiter}value\r\n0001${delimiter}900719925474099312345678901234567890`);
    assert.equal(parsed.delimiter, delimiter);
    assert.deepEqual(plain(parsed.rows), [{ record: 2, values: ["0001", "900719925474099312345678901234567890"] }]);
  });
  test(`explicit ${JSON.stringify(delimiter)} supports one column`, () => {
    assert.deepEqual(plain(core.parseCsv('id\n001\n""\n"two\nlines"\n', delimiter).rows), [
      { record: 2, values: ["001"] }, { record: 3, values: [""] }, { record: 4, values: ["two\nlines"] },
    ]);
  });
}

test("ambiguous consistent delimiters require an explicit choice", () => {
  for (const text of ["a,b;c\n1,2;3", "a,b\tc|d\n1,2\t3|4", "a,b;c"]) rejects(() => core.parseCsv(text), "AMBIGUOUS_DELIMITER");
  assert.deepEqual(plain(core.parseCsv("a,b;c\n1,2;3", ";").headers), ["a,b", "c"]);
});
test("auto one-column input never silently falls back to comma", () => {
  for (const text of ["id", "id\n001", '"id,inside quotes"\n"v;inside quotes"']) rejects(() => core.parseCsv(text), "DELIMITER_REQUIRED");
});
test("quoted multiline, doubled quotes and all delimiter characters stay exact", () => {
  const value = 'comma, semi; tab\t pipe| "quoted"\r\nnext\nfinal\rline';
  const parsed = core.parseCsv(fixtureCsv([["id", "value"], ["001", value], ["002", "emoji 🧪 café replacement �"]]));
  assert.equal(parsed.rows[0].values[1], value);
  assert.equal(parsed.rows[1].record, 3);
  assert.equal(parsed.rows[1].values[1], "emoji 🧪 café replacement �");
});
test("only empty physical records are skipped; quoted empties and whitespace remain", () => {
  const parsed = core.parseCsv('\nvalue\r\n\r\n""\n \n"\n"\n', ",");
  assert.equal(parsed.skippedBlankRecords, 2);
  assert.deepEqual(plain(parsed.rows), [{ record: 4, values: [""] }, { record: 5, values: [" "] }, { record: 6, values: ["\n"] }]);
});
test("delimiter-only and quoted empty multi-field records are not blank", () => {
  const parsed = core.parseCsv('a,b\n,\n"",""\n');
  assert.equal(parsed.skippedBlankRecords, 0);
  assert.deepEqual(plain(parsed.rows.map((row) => row.values)), [["", ""], ["", ""]]);
  rejects(() => core.parseCsv('a,b\n\n""\n', ","), "RAGGED_ROWS");
  rejects(() => core.parseCsv("a,b\n \n", ","), "RAGGED_ROWS");
});
test("logical numbers include leading and middle blanks but not multiline physical lines", () => {
  const parsed = core.parseCsv('\r\n\nid,value\r\n1,"a\r\nb"\n\n2,c\r\n\r\n\n');
  assert.deepEqual(plain(parsed.rows.map((row) => row.record)), [4, 6]);
  assert.equal(parsed.skippedBlankRecords, 5);
});
test("mixed external CRLF, LF and CR separators do not change quoted newlines", () => {
  const parsed = core.parseCsv('id,value\r\n1,"x\r\ny"\n2,z\r3,q\r\n');
  assert.deepEqual(plain(parsed.rows.map((row) => row.values)), [["1", "x\r\ny"], ["2", "z"], ["3", "q"]]);
  assert.equal(parsed.skippedBlankRecords, 0);
});
test("one transport BOM is removed, later BOMs remain literal data", () => {
  assert.deepEqual(plain(core.parseCsv("\ufeffid,value\n1,\ufeffdata").headers), ["id", "value"]);
  assert.equal(core.parseCsv("\ufeffid,value\n1,\ufeffdata").rows[0].values[1], "\ufeffdata");
  assert.equal(core.parseCsv("\ufeff\ufeffid,value\n1,x").headers[0], "\ufeffid");
  assert.equal(core.parseCsv("\n\ufeffid,value\n1,x").headers[0], "\ufeffid");
});

for (const [index, text] of ['id,value\n1,"unclosed', 'id,value\n1,a"b', 'id,value\n1,"x"z', 'id,value\n1,"x" ', '"id"x,value\n1,x', 'id,value\n1, "x"', 'id,value\n1,"x""'].entries()) {
  test(`strict malformed quote rejection ${index + 1}`, () => rejects(() => core.parseCsv(text, ","), "INVALID_QUOTES"));
}
for (const fault of ["throw", "error", "aborted", "truncated", "width", "coerced", "missing-row"]) {
  test(`Papa ${fault} never returns partial or coerced results`, () => {
    const loaded = load("core", fault);
    rejects(() => loaded.api.parseCsv("id,value\n001,x"), "CSV_PARSE_ERROR", loaded.api);
    assert.equal(loaded.calls.parses, 1);
  });
}
test("ragged rows are rejected even in automatic mode", () => {
  for (const text of ["a,b\n1", "a,b\n1,2,3"]) {
    rejects(() => core.parseCsv(text, ","), "RAGGED_ROWS");
    rejects(() => core.parseCsv(text), "RAGGED_ROWS");
  }
});
test("empty and whitespace-only headers are rejected without renaming", () => {
  for (const text of [",b\n1,2", '"",b\n1,2', '" ",b\n1,2', '"\t",b\n1,2']) rejects(() => core.parseCsv(text, ","), "EMPTY_HEADER");
});
test("only exact duplicate headers fail; significant header whitespace and case stay", () => {
  for (const text of ["id,id\n1,2", '"id",id\n1,2']) rejects(() => core.parseCsv(text), "DUPLICATE_HEADER");
  assert.deepEqual(plain(core.parseCsv("id, id ,ID\n1, 2 ,3").headers), ["id", " id ", "ID"]);
  assert.equal(core.parseCsv("id,value\n 0001 ,  a  ").rows[0].values[1], "  a  ");
});
test("empty files and invalid delimiters have domain errors", () => {
  for (const text of ["", "\ufeff", "\n\r\n"]) rejects(() => core.parseCsv(text), "EMPTY_CSV");
  rejects(() => core.parseCsv(null), "INVALID_INPUT");
  for (const delimiter of [":", "", "auto,", false]) rejects(() => core.parseCsv("a,b\n1,2", delimiter), "INVALID_DELIMITER");
});

for (const [index, value] of ["\ud800", "\ud800x", "\udc00", "\udc00\ud800", "x\udbff", "\ud800\ud800"].entries()) {
  test(`unpaired Unicode surrogate ${index + 1} fails in text and public tables`, () => {
    rejects(() => core.parseCsv(`id,value\n1,${value}`), "INVALID_UNICODE");
    rejects(() => core.compareTables(table(["id", "value"], [["1", value]]), table(["id", "value"], []), options()), "INVALID_UNICODE");
  });
}
test("NUL fails in headers and values, including quoted input", () => {
  for (const text of ["id,va\0lue\n1,x", 'id,value\n1,"x\0y"']) rejects(() => core.parseCsv(text), "NUL_CHARACTER");
});
test("256-character header is accepted, 257 is rejected", () => {
  assert.equal(core.parseCsv("h".repeat(limits.headerChars), ",").headers[0].length, limits.headerChars);
  rejects(() => core.parseCsv("h".repeat(limits.headerChars + 1), ","), "HEADER_LIMIT");
});
test("100,000-character decoded field is accepted, 100,001 is rejected", () => {
  assert.equal(core.parseCsv('id,value\n1,"' + '""'.repeat(limits.fieldChars) + '"', ",").rows[0].values[1].length, limits.fieldChars);
  rejects(() => core.parseCsv("id,value\n1," + "x".repeat(limits.fieldChars + 1), ","), "FIELD_LIMIT");
});
test("20,000 data rows are accepted, 20,001 are rejected", () => {
  const text = "id,value\n" + Array.from({ length: limits.rows }, (_, index) => `${index},x`).join("\n");
  assert.equal(core.parseCsv(text, ",").rows.length, limits.rows);
  rejects(() => core.parseCsv(text + "\nextra,x", ","), "ROW_LIMIT");
});
test("100 columns are accepted, 101 are rejected", () => {
  const headers = Array.from({ length: limits.columns }, (_, index) => `h${index}`);
  assert.equal(core.parseCsv(headers.join(","), ",").headers.length, limits.columns);
  rejects(() => core.parseCsv([...headers, "overflow"].join(","), ","), "COLUMN_LIMIT");
});
test("500,000 data cells are accepted; header cells are not charged twice", () => {
  const make = (width) => Array.from({ length: width }, (_, index) => `h${index}`).join(",") + "\n"
    + Array(limits.rows).fill(Array(width).fill("x").join(",")).join("\n");
  assert.equal(core.parseCsv(make(25), ",").rows.length, limits.rows);
  rejects(() => core.parseCsv(make(26), ","), "CELL_LIMIT");
});
test("2,000,000 characters accepted including many blanks; overflow is never truncated", () => {
  const initial = "id,value\n1,x";
  const text = initial + "\n".repeat(limits.inputChars - initial.length);
  const parsed = core.parseCsv(text, ",");
  assert.equal(parsed.rows.length, 1);
  assert.equal(parsed.skippedBlankRecords, limits.inputChars - initial.length - 1);
  assert.equal(core.parseCsv("\ufeff" + text, ",").rows.length, 1);
  rejects(() => core.parseCsv(text + "\n", ","), "INPUT_LIMIT");
});

test("UTF-8 with and without BOM decodes exactly", () => {
  const text = "id,value\r\n001,café 🧪";
  for (const prefix of ["", "\ufeff"]) assert.equal(core.decodeCsvBytes(Buffer.from(prefix + text), "utf-8"), text);
  const bytes = new TextEncoder().encode(text);
  assert.equal(core.decodeCsvBytes(bytes.buffer, "utf-8"), text);
});
for (const encoding of ["utf-16le", "utf-16be"]) {
  for (const bom of [false, true]) {
    test(`${encoding}, BOM=${bom}, preserves non-ASCII and surrogate pairs`, () => {
      const text = "id,value\n001,café 🧪";
      assert.equal(core.decodeCsvBytes(utf16(text, encoding === "utf-16be", bom), encoding), text);
    });
  }
}
test("Windows-1252 uses the correct non-Latin-1 punctuation mapping", () => {
  assert.equal(core.decodeCsvBytes(Uint8Array.from([0x80, 0x96, 0x93, 0x94, 0xa3, 0xe9]), "windows-1252"), "€–“”£é");
});
test("Windows-1252 maps all extension bytes and retains remaining non-NUL bytes", () => {
  const expected = "€\u0081‚ƒ„…†‡ˆ‰Š‹Œ\u008dŽ\u008f\u0090‘’“”•–—˜™š›œ\u009džŸ";
  assert.equal(core.decodeCsvBytes(Uint8Array.from({ length: 32 }, (_, index) => index + 128), "windows-1252"), expected);
  for (const [start, end] of [[1, 128], [160, 256]]) {
    const bytes = Uint8Array.from({ length: end - start }, (_, index) => index + start);
    assert.equal(core.decodeCsvBytes(bytes, "windows-1252"), String.fromCharCode(...bytes));
  }
  rejects(() => core.decodeCsvBytes(new Uint8Array([0]), "windows-1252"), "NUL_CHARACTER");
  rejects(() => core.decodeCsvBytes(new Uint8Array(limits.inputChars + 1).fill(65), "windows-1252"), "INPUT_LIMIT");
});
test("byte views respect offsets rather than decoding their entire backing buffer", () => {
  const bytes = new Uint8Array([0, 0, 65, 66, 67, 0]);
  assert.equal(core.decodeCsvBytes(bytes.subarray(2, 5), "utf-8"), "ABC");
  rejects(() => core.decodeCsvBytes([65], "utf-8"), "INVALID_INPUT");
});
for (const [index, bytes] of [[0xc0, 0xaf], [0xc2], [0xf0, 0x80, 0x80, 0x80], [0xed, 0xa0, 0x80], [0xef, 0xbb], [0xff]].entries()) {
  test(`fatal UTF-8 rejects malformed byte sequence ${index + 1}`, () => rejects(() => core.decodeCsvBytes(Uint8Array.from(bytes), "utf-8"), "INVALID_ENCODING"));
}
test("UTF-16 rejects odd lengths and unpaired encoded surrogates", () => {
  for (const encoding of ["utf-16le", "utf-16be"]) {
    rejects(() => core.decodeCsvBytes(Uint8Array.from([65]), encoding), "INVALID_ENCODING");
    const high = encoding === "utf-16le" ? [0, 0xd8] : [0xd8, 0];
    const low = encoding === "utf-16le" ? [0, 0xdc] : [0xdc, 0];
    for (const bytes of [high, low]) rejects(() => core.decodeCsvBytes(Uint8Array.from(bytes), encoding), "INVALID_ENCODING");
  }
});
test("every mismatched supported BOM fails before fallback decoding", () => {
  const samples = { "utf-8": Buffer.from("\ufeffid,value\n1,x"), "utf-16le": utf16("id,value\n1,x", false, true), "utf-16be": utf16("id,value\n1,x", true, true) };
  for (const [bom, bytes] of Object.entries(samples)) {
    for (const encoding of ["utf-8", "utf-16le", "utf-16be", "windows-1252"]) {
      if (encoding !== bom) rejects(() => core.decodeCsvBytes(bytes, encoding), "BOM_MISMATCH");
    }
  }
  for (const bytes of [[0xff, 0xfe, 0, 0], [0, 0, 0xfe, 0xff]]) rejects(() => core.decodeCsvBytes(Uint8Array.from(bytes), "utf-16le"), "BOM_MISMATCH");
});
test("invalid encodings and decoded NUL never pass silently", () => {
  for (const encoding of ["auto", "utf-16", "ascii", "UTF-8", null]) rejects(() => core.decodeCsvBytes(new Uint8Array([65]), encoding), "INVALID_ENCODING");
  rejects(() => core.decodeCsvBytes(new Uint8Array([65, 0, 66]), "utf-8"), "NUL_CHARACTER");
});
test("5 MiB byte limit is inclusive and independent of decoded character limit", () => {
  const bytes = Buffer.from("€".repeat(Math.floor(limits.inputBytes / 3)) + "x".repeat(limits.inputBytes % 3));
  assert.equal(bytes.length, limits.inputBytes);
  assert.ok(core.decodeCsvBytes(bytes, "utf-8").length < limits.inputChars);
  rejects(() => core.decodeCsvBytes(Buffer.concat([bytes, Buffer.from("x")]), "utf-8"), "FILE_LIMIT");
  assert.equal(core.decodeCsvBytes(Buffer.alloc(limits.inputChars, 65), "utf-8").length, limits.inputChars);
  rejects(() => core.decodeCsvBytes(Buffer.alloc(limits.inputChars + 1, 65), "utf-8"), "INPUT_LIMIT");
});
test("File.size is checked before arrayBuffer and unreadable files expose no names", async () => {
  let reads = 0;
  const tooLarge = new File([new Uint8Array(limits.inputBytes + 1)], "PRIVATE_SENTINEL.csv");
  tooLarge.arrayBuffer = () => { reads++; throw new Error("must not read"); };
  await rejectsAsync(() => core.readCsvInput({ source: { file: tooLarge }, delimiter: ",", encoding: "utf-8" }), "FILE_LIMIT");
  assert.equal(reads, 0);
  const unreadable = new File(["a,b\n1,2"], "PRIVATE_SENTINEL.csv");
  unreadable.arrayBuffer = () => Promise.reject(new Error("PRIVATE_SENTINEL"));
  await rejectsAsync(() => core.readCsvInput({ source: { file: unreadable }, delimiter: ",", encoding: "utf-8" }), "FILE_READ_ERROR");
});
test("local text and File input share parsing but never inspect the filename", async () => {
  const text = "id,value\n001,x";
  class NamelessFile extends File { get name() { throw new Error("Filename was accessed"); } }
  const file = new NamelessFile(["\ufeff" + text], "PRIVATE_SENTINEL.csv");
  const fromFile = await core.readCsvInput({ source: { file }, delimiter: "auto", encoding: "utf-8" });
  const fromText = await core.readCsvInput(input(text));
  assert.deepEqual(plain(fromFile), plain(fromText));
  assert.equal(core.exportJson(core.compareTables(fromFile, fromText, options()), "all").includes("PRIVATE_SENTINEL"), false);
});
test("byte decoding and parsing together remove only one transport BOM", async () => {
  for (const encoding of ["utf-8", "utf-16le", "utf-16be"]) {
    const text = "\ufeffid,value\n001,x";
    const bytes = encoding === "utf-8" ? Buffer.from("\ufeff" + text) : utf16(text, encoding === "utf-16be", true);
    assert.equal(core.decodeCsvBytes(bytes, encoding), text);
    const parsed = await core.readCsvInput({ source: { file: new File([bytes], "synthetic.csv") }, delimiter: ",", encoding });
    assert.equal(parsed.headers[0], "\ufeffid");
  }
});
test("URLs, mixed sources, unknown sources and partial buffers are rejected offline", async () => {
  for (const source of [{ url: "https://example.invalid/data.csv" }, { text: "a,b", file: new File([], "x") }, { file: "https://example.invalid/x" }, { file: { size: 1, arrayBuffer() { throw new Error("must not call"); } } }, {}, { text: 1 }]) {
    await rejectsAsync(() => core.readCsvInput({ source, delimiter: ",", encoding: "utf-8" }), "INVALID_INPUT");
  }
  const file = new File(["id,value\n1,x"], "partial.csv");
  file.arrayBuffer = () => Promise.resolve(new ArrayBuffer(2));
  await rejectsAsync(() => core.readCsvInput({ source: { file }, delimiter: ",", encoding: "utf-8" }), "FILE_READ_ERROR");
});

test("inventory sample has all four statuses despite reordered rows and columns", () => {
  const sample = core.CSV_DIFF_SAMPLES.find((value) => value.id === "inventory");
  const a = core.parseCsv(sample.original), b = core.parseCsv(sample.updated);
  const result = core.compareTables(a, b, options({ keys: sample.keys, columns: ["name", "stock"] }));
  assert.deepEqual(plain(result.counts), { added: 1, removed: 1, changed: 1, unchanged: 1 });
  assert.deepEqual(plain(result.rows.map((row) => [row.id, row.status, row.key, row.changedColumns])), [
    [1, "unchanged", ["001"], []], [2, "removed", ["002"], []], [3, "changed", ["003"], ["stock"]], [4, "added", ["004"], []],
  ]);
  assert.equal(result.rows[2].after.record, 2);
  assert.equal(result.rows[3].before, null);
});
test("shared headers use exact spelling and original order", () => {
  const a = table(["z", "id", " x ", "X", "__proto__", "left"], []);
  const b = table(["X", " x ", "__proto__", "id", "z", "right"], []);
  assert.deepEqual(plain(core.sharedHeaders(a, b)), ["z", "id", " x ", "X", "__proto__"]);
  assert.deepEqual(plain(core.sharedHeaders(table(["id"], []), table(["ID", " id "], []))), []);
});
test("composite sample matches exact SKU plus warehouse", () => {
  const sample = core.CSV_DIFF_SAMPLES.find((value) => value.id === "composite");
  const result = compare(sample.original, sample.updated, { keys: sample.keys, columns: ["stock"] });
  assert.deepEqual(plain(result.counts), { added: 1, removed: 1, changed: 1, unchanged: 1 });
  assert.deepEqual(plain(result.rows[1].key), ["001", "South"]);
});
test("JSON key tuples cannot collide through delimiters, quotes, or controls", () => {
  const rows = [["a|b", "c", "one"], ["a", "b|c", "two"], ["a\u001fb", "c", "three"], ["a", "b\u001fc", "four"], ['a,"b', "c", "five"]];
  const a = table(["sku", "warehouse", "value"], rows);
  const b = table(["sku", "warehouse", "value"], [...rows].reverse());
  const result = core.compareTables(a, b, options({ keys: ["sku", "warehouse"] }));
  assert.equal(result.counts.unchanged, rows.length);
  assert.deepEqual(plain(result.rows.map((row) => row.key)), rows.map((row) => row.slice(0, 2)));
});
test("zeros, huge numeric strings, booleans and prototype names stay string data", () => {
  const a = core.parseCsv('__proto__,constructor,toString\n001,900719925474099312345678901234567890,false\n1,001,true\n__proto__,null,undefined');
  const b = core.parseCsv('toString,__proto__,constructor\nundefined,__proto__,null\nfalse,001,900719925474099312345678901234567890\ntrue,1,001');
  const result = core.compareTables(a, b, options({ keys: ["__proto__"], columns: ["constructor", "toString"] }));
  assert.equal(result.counts.unchanged, 3);
  assert.equal(result.rows[0].before.values[1], "900719925474099312345678901234567890");
  assert.equal({}.polluted, undefined);
});
test("duplicate keys fail on both sides with logical record references", () => {
  const a = core.parseCsv('\nid,value\n001,"two\nlines"\n001,x');
  const b = core.parseCsv("id,value\n001,y\n001,z");
  const error = rejects(() => core.compareTables(a, b, options()), "INVALID_KEYS");
  assert.deepEqual(plain(error.issues.map((issue) => [issue.side, issue.kind, issue.records])), [
    ["original", "duplicate-key", [3, 4]], ["updated", "duplicate-key", [2, 3]],
  ]);
  const sample = core.CSV_DIFF_SAMPLES.find((value) => value.id === "duplicate-keys");
  rejects(() => compare(sample.original, sample.updated, { keys: sample.keys, columns: ["stock"] }), "INVALID_KEYS");
});
test("each component of a composite key must be nonblank", () => {
  for (const blank of ["", " ", "\t\r\n", "\u00a0", "\u3000", "\ufeff"]) {
    const a = table(["sku", "warehouse", "value"], [["001", blank, "x"]]);
    const error = rejects(() => core.compareTables(a, table(a.headers, []), options({ keys: ["sku", "warehouse"] })), "INVALID_KEYS");
    assert.equal(error.issues[0].kind, "blank-key");
    assert.deepEqual(plain(error.issues[0].records), [2]);
  }
});
test("issue groups and record references are bounded with both sides represented", () => {
  const rows = Array.from({ length: 80 }, () => [" ", "x"]);
  for (let index = 0; index < 200; index++) rows.push([`PRIVATE_SENTINEL-${index}`, "a"], [`PRIVATE_SENTINEL-${index}`, "b"]);
  rows.push(...Array.from({ length: 80 }, () => ["repeat", "x"]));
  const a = table(["id", "value"], rows);
  const error = rejects(() => core.compareTables(a, a, options()), "INVALID_KEYS");
  assert.ok(error.issues.length <= limits.issues);
  assert.deepEqual([...new Set(error.issues.map((issue) => issue.side))], ["original", "updated"]);
  assert.ok(error.issues.every((issue) => issue.records.length <= limits.issueRecords && issue.message.length < 400));
  assert.doesNotMatch(JSON.stringify(error.issues), /PRIVATE_SENTINEL/);
  const repeated = table(["id", "value"], Array.from({ length: 100 }, () => ["same", "x"]));
  const repeatedError = rejects(() => core.compareTables(repeated, table(repeated.headers, []), options()), "INVALID_KEYS");
  assert.deepEqual(plain(repeatedError.issues[0].records), Array.from({ length: limits.issueRecords }, (_, index) => index + 2));
});
test("value options never trim or case-fold keys", () => {
  const result = compare("id,value\nA, same \n1 , SAME", "id,value\na,SAME\n1,same", { trimValues: true, ignoreCase: true });
  assert.deepEqual(plain(result.counts), { added: 2, removed: 2, changed: 0, unchanged: 0 });
  assert.equal(result.normalizedCells, 0);
  assert.deepEqual(plain(result.rows.map((row) => row.key)), [["A"], ["1 "], ["a"], ["1"]]);
});
test("distinct exact keys remain distinct even when normalization would collide", () => {
  const a = "id,value\nA,x\na,x\n A ,x";
  const result = compare(a, a, { trimValues: true, ignoreCase: true });
  assert.equal(result.counts.unchanged, 3);
});
test("normalizedCells counts only unequal compared cell pairs made equal", () => {
  const a = "id,name,role,state,ignored\n1, Alice ,DEV,old,before\n2,Bob,OPS,same,before";
  const b = "role,state,name,id,ignored\ndev,new,alice,1,after\nOPS,same,Bob,2,after";
  const result = compare(a, b, { columns: ["role", "state", "name"], trimValues: true, ignoreCase: true });
  assert.equal(result.normalizedCells, 2);
  assert.deepEqual(plain(result.rows[0].changedColumns), ["state"]);
  assert.equal(result.rows[0].before.values[1], " Alice ");
  assert.equal(result.counts.changed, 1);
  assert.equal(result.counts.unchanged, 1);
});
test("trim and case settings are independent and do not Unicode-normalize", () => {
  assert.equal(compare("id,value\n1, x ", "id,value\n1,x", { trimValues: true }).normalizedCells, 1);
  assert.equal(compare("id,value\n1,X", "id,value\n1,x", { ignoreCase: true }).normalizedCells, 1);
  assert.equal(compare("id,value\n1,X ", "id,value\n1,x", { ignoreCase: true }).counts.changed, 1);
  assert.equal(compare("id,value\n1,é", "id,value\n1,e\u0301", { trimValues: true, ignoreCase: true }).counts.changed, 1);
});
test("ignored columns are disclosed separately and do not affect changed status", () => {
  const result = compare("id,value,common,left\n1,x,old,a", "right,common,value,id\nb,new,x,1");
  assert.deepEqual(plain(result.ignoredColumns), { original: ["common", "left"], updated: ["right", "common"] });
  assert.equal(result.counts.unchanged, 1);
  assert.equal(result.normalizedCells, 0);
  const report = JSON.parse(core.exportJson(result, "all"));
  assert.deepEqual(report.rows[0].before.values, ["1", "x", "old", "a"]);
});
test("changed columns follow explicit option order, not either header order", () => {
  const result = compare("id,a,b,c\n1,A,B,C", "c,id,b,a\nc,1,b,a", { columns: ["b", "c", "a"] });
  assert.deepEqual(plain(result.rows[0].changedColumns), ["b", "c", "a"]);
});
test("header-only tables are valid; empty sides still produce full outer results", () => {
  const empty = core.parseCsv("id,value\n");
  const populated = core.parseCsv("id,value\n1,x\n2,y");
  const both = core.compareTables(empty, empty, options());
  assert.deepEqual(plain(both.counts), { added: 0, removed: 0, changed: 0, unchanged: 0 });
  assert.equal(core.compareTables(empty, populated, options()).counts.added, 2);
  assert.equal(core.compareTables(populated, empty, options()).counts.removed, 2);
  assert.equal(readReport(core.exportCsv(both).text).length, 1);
  assert.deepEqual(JSON.parse(core.exportJson(both)).rows, []);
});

for (const [index, change] of [
  { keys: [] }, { columns: [] }, { keys: ["id", "id"] }, { columns: ["value", "value"] },
  { keys: ["missing"] }, { columns: ["missing"] }, { keys: [1] }, { columns: null },
  { trimValues: "true" }, { ignoreCase: 1 }, { keys: Array(1) }, { columns: Array(1) },
].entries()) {
  test(`invalid key/column options fail explicitly ${index + 1}`, () => rejects(() => compare("id,value\n1,x", "id,value\n1,x", change), "INVALID_OPTIONS"));
}
test("one through five shared keys are allowed; six are rejected", () => {
  const headers = ["a", "b", "c", "d", "e", "f", "value"];
  const a = table(headers, [["1", "2", "3", "4", "5", "6", "v"]]);
  assert.equal(core.compareTables(a, a, options({ keys: headers.slice(0, 5) })).counts.unchanged, 1);
  rejects(() => core.compareTables(a, a, options({ keys: headers.slice(0, 6) })), "INVALID_OPTIONS");
  assert.equal(core.compareTables(a, a, options({ keys: ["a"], columns: ["a"] })).counts.unchanged, 1);
});
test("public tables are revalidated for shape, limits and logical record numbers", () => {
  const good = table(["id", "value"], [["1", "x"]]);
  for (const row of [{ record: 1, values: ["1", "x"] }, { record: 2.5, values: ["1", "x"] }, { record: 2, values: [1, "x"] }]) {
    rejects(() => core.compareTables({ ...good, rows: [row] }, good, options()), "INVALID_TABLE");
  }
  rejects(() => core.compareTables({ ...good, rows: [good.rows[0], good.rows[0]] }, good, options()), "INVALID_TABLE");
  rejects(() => core.compareTables({ ...good, rows: [{ record: 2, values: ["1"] }] }, good, options()), "RAGGED_ROWS");
  rejects(() => core.compareTables({ ...good, rows: Array(limits.rows + 1).fill(good.rows[0]) }, good, options()), "ROW_LIMIT");
  rejects(() => core.compareTables({ ...good, skippedBlankRecords: -1 }, good, options()), "INVALID_TABLE");
});
test("comparison and exports do not mutate inputs; snapshots do not alias arrays", () => {
  const a = deepFreeze(core.parseCsv("id,value\n1,x"));
  const b = deepFreeze(core.parseCsv("value,id\ny,1"));
  const settings = deepFreeze(options());
  const result = core.compareTables(a, b, settings);
  core.exportCsv(deepFreeze(result));
  core.exportJson(result);
  assert.notEqual(result.originalHeaders, a.headers);
  assert.notEqual(result.rows[0].before.values, a.rows[0].values);
  assert.notEqual(result.options.keys, settings.keys);
});
test("full outer ordering is original rows followed by added rows in updated order", () => {
  const result = compare("id,value\n3,c\n1,a\n2,b", "id,value\n9,i\n2,b\n8,h\n1,A\n7,g");
  assert.deepEqual(plain(result.rows.map((row) => [row.key[0], row.status])), [["3", "removed"], ["1", "changed"], ["2", "unchanged"], ["9", "added"], ["8", "added"], ["7", "added"]]);
});
test("reordered public table arrays retain source records and explicit row order", () => {
  const a = core.parseCsv("id,value\n1,a\n2,b\n3,c");
  const b = core.parseCsv("id,value\n1,A\n2,b\n8,h\n9,i");
  a.rows.reverse();
  b.rows.reverse();
  const result = core.compareTables(a, b, options());
  assert.deepEqual(plain(result.rows.map((row) => [row.key[0], row.before?.record ?? null, row.after?.record ?? null])), [
    ["3", 4, null], ["2", 3, 3], ["1", 2, 2], ["9", null, 5], ["8", null, 4],
  ]);
  assert.deepEqual(JSON.parse(core.exportJson(result, "all")).rows, plain(result.rows));
  assert.deepEqual(readReport(core.exportCsv(result, "all").text).slice(1).map((row) => row[1]), ["3", "2", "1", "9", "8"]);
});
test("repeated comparisons and both reports are deterministic", () => {
  const first = baseResult();
  for (let index = 0; index < 10; index++) {
    const next = baseResult();
    assert.deepEqual(plain(next), plain(first));
    assert.equal(core.exportCsv(next, "all").text, core.exportCsv(first, "all").text);
    assert.equal(core.exportJson(next, "all"), core.exportJson(first, "all"));
  }
});

function shuffled(items, random) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}
for (let seed = 1; seed <= 12; seed++) {
  test(`seeded independent oracle for row/column shuffles and edits, seed ${seed}`, () => {
    let state = seed;
    const random = () => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 2 ** 32);
    const headers = ["sku", "warehouse", "value", "note"];
    const source = Array.from({ length: 64 }, (_, index) => [String(index).padStart(4, "0"), `w${index % 3}`, String(index), `note "${index}"\ntext`]);
    const originalRows = shuffled(source, random);
    const updatedRows = shuffled([...source.filter((_, index) => index % 7 !== 0).map((row) => Number(row[0]) % 5 ? [...row] : [row[0], row[1], row[2] + "x", row[3]]),
      ["A001", "north", "1", "added"], ["A002", "south", "2", "added"]], random);
    const originalOrder = shuffled([0, 1, 2, 3], random);
    const updatedOrder = shuffled([0, 1, 2, 3], random);
    const toCsv = (rows, order) => fixtureCsv([order.map((index) => headers[index]), ...rows.map((row) => order.map((index) => row[index]))]);
    const a = core.parseCsv(toCsv(originalRows, originalOrder));
    const b = core.parseCsv(toCsv(updatedRows, updatedOrder));
    const result = core.compareTables(a, b, options({ keys: ["sku", "warehouse"], columns: ["note", "value"] }));
    const expected = [];
    for (const before of originalRows) {
      const after = updatedRows.find((row) => row[0] === before[0] && row[1] === before[1]);
      const changed = after ? [3, 2].filter((index) => before[index] !== after[index]).map((index) => headers[index]) : [];
      expected.push([before.slice(0, 2), !after ? "removed" : changed.length ? "changed" : "unchanged", changed]);
    }
    for (const after of updatedRows) if (!originalRows.some((row) => row[0] === after[0] && row[1] === after[1])) expected.push([after.slice(0, 2), "added", []]);
    assert.deepEqual(plain(result.rows.map((row) => [row.key, row.status, row.changedColumns])), expected);
    for (const status of ["added", "removed", "changed", "unchanged"]) assert.equal(result.counts[status], expected.filter((row) => row[1] === status).length);
    assert.equal(readReport(core.exportCsv(result, "all").text).length, expected.length + 1);
    assert.deepEqual(JSON.parse(core.exportJson(result, "all")).rows, plain(result.rows));
  });
}

test("CSV report has fixed metadata then key-order and paired compared columns", () => {
  const result = baseResult();
  const report = core.exportCsv(result, "all");
  const matrix = readReport(report.text);
  assert.deepEqual(matrix[0], ["status", "key:id", "original_record", "updated_record", "before:value", "after:value"]);
  assert.deepEqual(matrix.slice(1), [
    ["unchanged", "1", "2", "3", "alpha", "alpha"], ["removed", "2", "3", "", "beta", ""],
    ["changed", "3", "4", "2", "gamma", "GAMMA"], ["added", "4", "", "4", "", "delta"],
  ]);
  assert.equal(report.rows, 4);
  assert.equal(report.protectedCells, 0);
  assert.ok(Buffer.byteLength(report.text) <= limits.outputBytes);
});
for (const filter of ["all", "differences", "added", "removed", "changed", "unchanged"]) {
  test(`row filtering is consistent in CSV and JSON: ${filter}`, () => {
    const result = baseResult();
    const expected = result.rows.filter((row) => filter === "all" || (filter === "differences" ? row.status !== "unchanged" : row.status === filter));
    assert.deepEqual(plain(core.filteredRows(result, filter)), plain(expected));
    const csv = core.exportCsv(result, filter);
    assert.equal(csv.rows, expected.length);
    assert.equal(readReport(csv.text).length, expected.length + 1);
    const json = JSON.parse(core.exportJson(result, filter));
    assert.deepEqual(json.rows, plain(expected));
    assert.equal(json.exportedRows, expected.length);
    assert.deepEqual(json.counts, plain(result.counts));
    assert.equal(json.filter, filter);
  });
}
test("default report filter is differences and invalid filters are rejected", () => {
  const result = baseResult();
  assert.equal(core.exportCsv(result).rows, 3);
  assert.equal(JSON.parse(core.exportJson(result)).rows.length, 3);
  assert.equal(core.filteredRows(result).length, 3);
  for (const filter of ["changed-only", "", 1, null]) {
    for (const method of ["filteredRows", "exportCsv", "exportJson"]) rejects(() => core[method](result, filter), "INVALID_FILTER");
  }
});
test("CSV quote-all roundtrip retains separators, quotes, leading zeros and huge numbers", () => {
  const values = ['x,"y"\r\nnext\nline\rend', "001", "900719925474099312345678901234567890", "café 🧪"];
  const a = table(["id", "value"], values.map((value, index) => [String(index), value]));
  const result = core.compareTables(a, a, options());
  const report = core.exportCsv(result, "all");
  assert.deepEqual(readReport(report.text).slice(1).map((row) => row[5]), values);
  assert.equal(report.protectedCells, 0);
});
test("formula-like and leading control cells receive a tab; JSON keeps exact strings", () => {
  const risky = ["=1+1", "+1", "-2", "@A1", "＝1+1", "＋1", "－1", "＠A1", "  =1", "\u00a0＠A1",
    "\ttext", "\rtext", "\ntext", "\u0001text", "\u007ftext", "\u0085text", "  \ttext", "\u200btext", "\u202e=1", "\ufefftext"];
  const safe = ["ordinary", "001", "900719925474099312345678901234567890", "plain=1", " foo", "a\tb", "�", " "];
  const all = [...risky, ...safe];
  const a = table(["id", "value"], []);
  const b = table(["id", "value"], all.map((value, index) => [String(index), value]));
  const result = core.compareTables(a, b, options());
  const report = core.exportCsv(result);
  const matrix = readReport(report.text);
  assert.equal(report.protectedCells, risky.length);
  assert.deepEqual(matrix.slice(1).map((row) => row[5]), [...risky.map((value) => "\t" + value), ...safe]);
  assert.deepEqual(JSON.parse(core.exportJson(result)).rows.map((row) => row.after.values[1]), all);
  assert.deepEqual(plain(result.rows.map((row) => row.after.values[1])), all);
});
test("risky keys and both sides count each protected output cell separately", () => {
  const result = compare('id,value\n=001," =1"', 'id,value\n=001," ＠A1"', { columns: ["id", "value"] });
  const report = core.exportCsv(result);
  const row = readReport(report.text)[1];
  assert.equal(report.protectedCells, 5);
  assert.deepEqual(row, ["changed", "\t=001", "2", "2", "\t=001", "\t=001", "\t =1", "\t ＠A1"]);
});
test("JSON version, options, full headers and values are exact and filename-free", () => {
  const result = compare("id,value,left\n001,90071992547409931234567890,old", "right,value,id\nnew,90071992547409931234567891,001");
  const json = JSON.parse(core.exportJson(result));
  assert.equal(json.version, 1);
  assert.deepEqual(json.options, options());
  assert.deepEqual(json.headers, { original: ["id", "value", "left"], updated: ["right", "value", "id"] });
  assert.deepEqual(json.rows, plain(result.rows));
  assert.deepEqual(json.ignoredColumns, { original: ["left"], updated: ["right"] });
  assert.equal(json.rows[0].before.values[1], "90071992547409931234567890");
  assert.equal(json.rows[0].after.values[1], "90071992547409931234567891");
  assert.equal("filename" in json, false);
  assert.equal("originalFilename" in json, false);
});
test("export revalidation rejects tampered row matching, metadata and source values", () => {
  const modifications = [
    (value) => { value.rows[0].status = "changed"; }, (value) => { value.rows[0].id = 8; },
    (value) => { value.rows[0].key = ["wrong"]; }, (value) => { value.rows[0].changedColumns = ["value"]; },
    (value) => { value.counts.changed = 9; }, (value) => { value.normalizedCells = 1; },
    (value) => { value.ignoredColumns.original = ["id"]; }, (value) => { value.rows[0].before.values[1] = 1; },
    (value) => { value.rows[0].before.values[1] = "\ud800"; }, (value) => { value.rows[0].before = null; value.rows[0].after = null; },
  ];
  for (const modify of modifications) {
    const value = plain(baseResult());
    modify(value);
    for (const method of ["exportCsv", "exportJson"]) rejects(() => core[method](value, "all"));
  }
});

function largeKeyResult(length = 99_000) {
  const rows = Array.from({ length: 20 }, (_, index) => [String(index).padStart(2, "0") + "界".repeat(length - 2), "x"]);
  const a = table(["id", "value"], rows);
  return core.compareTables(a, a, options({ columns: ["id", "value"] }));
}
test("CSV and JSON enforce 16 MiB as UTF-8 bytes, including repeated keys", () => {
  const below = largeKeyResult(80_000);
  const csv = core.exportCsv(below, "all");
  const json = core.exportJson(below, "all");
  assert.ok(Buffer.byteLength(csv.text) < limits.outputBytes);
  assert.ok(Buffer.byteLength(json) < limits.outputBytes);
  const above = largeKeyResult();
  rejects(() => core.exportCsv(above, "all"), "OUTPUT_LIMIT");
  rejects(() => core.exportJson(above, "all"), "OUTPUT_LIMIT");
});
test("JSON expansion of controls is budgeted before escaping, without truncation", () => {
  const rows = Array.from({ length: 10 }, (_, index) => [String(index) + "\u0001".repeat(95_000), "x"]);
  const a = table(["id", "value"], rows);
  const result = core.compareTables(a, a, options());
  rejects(() => core.exportJson(result, "all"), "OUTPUT_LIMIT");
  assert.equal(core.exportCsv(result, "all").rows, rows.length);
});

test("worker inspect, compare and both exports implement the typed protocol", async () => {
  const worker = load("worker");
  const sample = core.CSV_DIFF_SAMPLES[0];
  await worker.context.onmessage({ data: { id: 7, kind: "inspect", inputs: [input(sample.original), {
    source: { file: new File([sample.updated], "PRIVATE_SENTINEL.csv") }, delimiter: "auto", encoding: "utf-8",
  }] } });
  const inspected = worker.messages.at(-1);
  assert.equal(inspected.id, 7);
  assert.equal(inspected.ok, true);
  assert.equal(inspected.kind, "inspect");
  assert.equal(inspected.tables.length, 2);
  await worker.context.onmessage({ data: { id: 8, kind: "compare", tables: inspected.tables, options: options({ keys: sample.keys, columns: ["name", "stock"] }) } });
  const compared = worker.messages.at(-1);
  assert.equal(compared.kind, "compare");
  assert.equal(compared.ok, true);
  assert.deepEqual(compared.result.counts, { added: 1, removed: 1, changed: 1, unchanged: 1 });
  for (const format of ["csv", "json"]) {
    await worker.context.onmessage({ data: { id: 9, kind: "export", result: compared.result, format } });
    const exported = worker.messages.at(-1);
    assert.equal(exported.id, 9);
    assert.equal(exported.kind, "export");
    assert.equal(exported.ok, true);
    assert.equal(exported.filename, `csv-comparison.${format}`);
    assert.equal(exported.mime, format === "csv" ? "text/csv;charset=utf-8" : "application/json;charset=utf-8");
    assert.equal(exported.protectedCells, 0);
    assert.equal(exported.rows, 3);
    assert.doesNotMatch(exported.text, /PRIVATE_SENTINEL/);
    assert.equal(format === "csv" ? readReport(exported.text).length - 1 : JSON.parse(exported.text).rows.length, 3);
  }
  assert.deepEqual(worker.calls.forbidden, []);
});
test("worker failures expose bounded key issues and never raw parser errors", async () => {
  const worker = load("worker");
  const sample = core.CSV_DIFF_SAMPLES[2];
  await worker.context.onmessage({ data: { id: 20, kind: "compare", tables: [core.parseCsv(sample.original), core.parseCsv(sample.updated)], options: options({ keys: sample.keys, columns: ["stock"] }) } });
  const error = worker.messages[0];
  assert.equal(error.id, 20);
  assert.equal(error.ok, false);
  assert.equal(error.code, "INVALID_KEYS");
  assert.deepEqual(error.issues[0].records, [2, 3]);
  assert.equal("kind" in error, false);
  const failing = load("worker", "throw");
  await failing.context.onmessage({ data: { id: 21, kind: "inspect", inputs: [input("id,value\n1,x"), input("id,value\n1,x")] } });
  assert.equal(failing.messages[0].code, "CSV_PARSE_ERROR");
  assert.doesNotMatch(failing.messages[0].error, /PRIVATE_SENTINEL/);
});
test("worker rejects malformed envelopes and XLSX requests, ignores uncorrelatable IDs", async () => {
  const worker = load("worker");
  for (const data of [null, [], {}, { id: "1" }, { id: -1 }, { id: NaN }, { id: Infinity }, { id: 0.5 }]) await worker.context.onmessage({ data });
  assert.equal(worker.messages.length, 0);
  let accessed = false;
  await worker.context.onmessage({ data: { get id() { accessed = true; return 1; } } });
  assert.equal(accessed, false);
  for (const data of [
    { id: 1, kind: "unknown" }, { id: 2, kind: "inspect", inputs: [] },
    { id: 3, kind: "inspect", inputs: [input("a,b"), input("a,b")], url: "https://example.invalid/x" },
    { id: 4, kind: "compare", tables: [null, null], options: options() },
    { id: 5, kind: "export", result: baseResult(), format: "xlsx" },
    { id: 6, kind: "export", result: baseResult(), format: "csv", filter: "bogus" },
  ]) {
    await worker.context.onmessage({ data });
    const message = worker.messages.at(-1);
    assert.equal(message.id, data.id);
    assert.equal(message.ok, false);
    assert.ok(typeof message.code === "string");
  }
  assert.deepEqual(worker.calls.forbidden, []);
});
test("worker is stateless across concurrent inspect request IDs", async () => {
  const worker = load("worker");
  await Promise.all([31, 32, 33].map((id) => worker.context.onmessage({ data: { id, kind: "inspect", inputs: [input(`id,value\n${id},x`), input(`id,value\n${id},y`)] } })));
  assert.equal(worker.messages.length, 3);
  for (const response of worker.messages) {
    assert.equal(response.ok, true);
    assert.equal(response.tables[0].rows[0].values[0], String(response.id));
    assert.equal(response.tables[1].rows[0].values[0], String(response.id));
  }
});
test("worker reports output overflow instead of emitting a partial download", async () => {
  const worker = load("worker");
  await worker.context.onmessage({ data: { id: 40, kind: "export", result: largeKeyResult(), format: "csv", filter: "all" } });
  assert.equal(worker.messages[0].ok, false);
  assert.equal(worker.messages[0].code, "OUTPUT_LIMIT");
  assert.equal("text" in worker.messages[0], false);
});
test("core execution has no network, environment, DOM, timer or logging access", () => {
  assert.ok(isolated.calls.parses > 0);
  assert.deepEqual(isolated.calls.forbidden, []);
  const guard = load();
  assert.throws(() => vm.runInContext("fetch('https://example.invalid/blocked')", guard.context));
  assert.deepEqual(guard.calls.forbidden, ["fetch"]);
});