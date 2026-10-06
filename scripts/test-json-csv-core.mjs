import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { performance } from "node:perf_hooks";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";

// Trusted, installed dependencies and four allowlisted local TS modules only.
// No application entry point, environment file, database, network, temp output,
// browser, or dependency installation is part of this test harness.
const require = createRequire(import.meta.url);
const parser = require("jsonc-parser");
const papa = require("papaparse");
const root = fileURLToPath(new URL("../", import.meta.url));
const directory = path.join(root, "src", "lib", "json-csv");
const allowlist = new Set(["types", "samples", "engine", "worker"]);
const compiled = new Map();

function compile(name) {
  assert.ok(allowlist.has(name));
  if (compiled.has(name)) return compiled.get(name);
  const filename = path.join(directory, `${name}.ts`);
  const output = ts.transpileModule(readFileSync(filename, "utf8"), {
    fileName: filename,
    reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.CommonJS,
      esModuleInterop: true, strict: true, isolatedModules: true },
  });
  assert.equal(output.diagnostics?.length ?? 0, 0, `${name}: transpile diagnostics`);
  compiled.set(name, output.outputText);
  return output.outputText;
}

function loadCore({ parserFailure = false, csvFailure = false, corruptCsv = false } = {}) {
  const blocked = () => { throw new Error("Unexpected environment, network, DOM, or logging access"); };
  const messages = [];
  const counters = { scans: 0, parses: 0, unparses: 0, lastMatrix: undefined, numericNodes: 0 };
  const sandbox = { console: { log: blocked, warn: blocked, error: blocked },
    postMessage: (message) => messages.push(structuredClone(message)) };
  for (const name of ["fetch", "process", "window", "document", "XMLHttpRequest", "WebSocket", "localStorage", "setTimeout"]) {
    Object.defineProperty(sandbox, name, { get: blocked });
  }
  const context = vm.createContext(sandbox, { codeGeneration: { strings: false, wasm: false } });
  const dependencies = new Map([
    ["jsonc-parser", {
      ScanError: parser.ScanError,
      SyntaxKind: parser.SyntaxKind,
      createScanner: (...args) => { counters.scans++; return parser.createScanner(...args); },
      parseTree: (...args) => {
        counters.parses++;
        if (parserFailure) throw new Error("PRIVATE_PAYLOAD <script>provider-secret</script>");
        const ast = parser.parseTree(...args);
        const stack = ast ? [ast] : [];
        while (stack.length) {
          const node = stack.pop();
          if (node.type === "number") {
            counters.numericNodes++;
            Object.defineProperty(node, "value", { get() { throw new Error("Numeric node.value must NEVER be read"); } });
          }
          if (node.children) {
            stack.push(...node.children);
            Object.freeze(node.children);
          }
          Object.freeze(node);
        }
        return ast;
      },
    }],
    ["papaparse", { unparse: (matrix, options) => {
      counters.unparses++;
      counters.lastMatrix = matrix;
      assert.ok(Array.isArray(matrix) && matrix.every((row) => Array.isArray(row) && row.every((cell) => typeof cell === "string")));
      assert.equal(options.escapeFormulae, false, "Papa must not prefix already classified numeric strings");
      assert.equal(options.skipEmptyLines, false);
      if (csvFailure) throw new Error("PRIVATE_PAYLOAD <script>serializer-secret</script>");
      return corruptCsv ? "PRIVATE_PAYLOAD" : papa.unparse(matrix, options);
    } }],
  ]);
  const cache = new Map();
  function load(name) {
    assert.ok(allowlist.has(name), "Only JSON/CSV modules may be loaded");
    if (cache.has(name)) return cache.get(name).exports;
    const moduleRecord = { exports: {} };
    cache.set(name, moduleRecord);
    const wrapper = new vm.Script(`(function(exports, require, module) {\n${compile(name)}\n})`, {
      filename: path.join(directory, `${name}.ts`),
    }).runInContext(context);
    wrapper(moduleRecord.exports, (specifier) => {
      if (dependencies.has(specifier)) return dependencies.get(specifier);
      assert.match(specifier, /^\.\/(types|engine)$/);
      return load(specifier.slice(2));
    }, moduleRecord);
    return moduleRecord.exports;
  }
  const engine = load("engine");
  context.engine = engine;
  return { engine, load, context, counters, messages };
}

const core = loadCore();
const { engine } = core;
const { DEFAULT_CSV_OPTIONS, JSON_CSV_LIMITS } = core.load("types");
const options = (changes = {}) => ({ ...DEFAULT_CSV_OPTIONS, ...changes });
const convert = (input, changes = {}, format = "json", columns) => engine.convertJson(input, format, options(changes), columns);
const inspect = (input, format = "json") => engine.inspectJson(input, format);
const plain = (value) => JSON.parse(JSON.stringify(value));
const warningHas = (result, pattern) => result.warnings.some((warning) => pattern.test(warning));
const headersOf = (result) => Array.from(result.headers);
const rowsOf = (result) => plain(result.rows);
const columnsOf = (result) => plain(result.columns);
const pointerOf = (key) => `/${key.replace(/~/g, "~0").replace(/\//g, "~1")}`;
const POINTER_ERROR = /^A JSON Pointer exceeds the 4,096-character limit\.$/;
const SELECTOR_ERROR = /^JSON selector text exceeds the 65,536-character budget\.$/;
const UNICODE_ERROR = /^Unpaired Unicode surrogate in an exported field; replace it or export valid Unicode\.$/;

function selectorTextChars(inspection) {
  return inspection.rowPaths.reduce((total, row) => total + row.pointer.length + row.label.length
    + row.arrayPaths.reduce((sum, array) => sum + array.pointer.length + array.label.length, 0), 0);
}

// Observe engine-realm string work, not the trusted parser's input decoding.
// This detects escape-before-check and work on undiscovered keys; it is not a
// heap measurement or a claim about memory use in a particular JS runtime.
function watchPointerWork(isolated, keyLength) {
  const work = { keyLength, keyScans: 0, keyReplacements: 0, oversizedReplacements: 0 };
  isolated.context.pointerWork = work;
  vm.runInContext(`
    "use strict";
    const originalCodeAt = String.prototype.charCodeAt;
    const originalReplace = String.prototype.replace;
    String.prototype.charCodeAt = function (index) {
      if (this.length === pointerWork.keyLength) pointerWork.keyScans++;
      return originalCodeAt.call(this, index);
    };
    String.prototype.replace = function (pattern, replacement) {
      if (replacement === "~0" || replacement === "~1") {
        if (this.length === pointerWork.keyLength) pointerWork.keyReplacements++;
        if (this.length > 4096) {
          pointerWork.oversizedReplacements++;
          throw new Error("Unbounded pointer escape");
        }
      }
      return originalReplace.call(this, pattern, replacement);
    };
  `, isolated.context);
  return work;
}

function rejects(operation, pattern = /./, instance = engine) {
  assert.throws(operation, (error) => {
    assert.ok(error instanceof instance.JsonCsvError, "Only the safe domain error should cross the engine boundary");
    assert.equal(error.name, "JsonCsvError");
    assert.match(error.message, pattern);
    assert.doesNotMatch(error.message, /PRIVATE_PAYLOAD|<script>|provider-secret|serializer-secret/);
    assert.ok(error.message.length < 400, "Error messages must not include input excerpts");
    return true;
  });
}

// Independent quote-aware reader, not Papa.parse or split-on-newlines. It
// validates delimiters, doubled quotes, empty fields, and embedded CR/LF.
function readCsv(csv, delimiter = ",") {
  if (csv === "") return [];
  const result = [];
  let row = [], field = "", quoted = false, afterQuote = false, started = false;
  const pushField = () => { row.push(field); field = ""; afterQuote = false; started = false; };
  for (let index = 0; index < csv.length; index++) {
    const char = csv[index];
    if (quoted) {
      if (char === '"') {
        if (csv[index + 1] === '"') { field += '"'; index++; }
        else { quoted = false; afterQuote = true; }
      } else field += char;
      continue;
    }
    if (char === '"') {
      assert.ok(!started && !afterQuote, "Quote must begin an empty field");
      quoted = true;
      started = true;
    } else if (char === delimiter) pushField();
    else if (char === "\r" || char === "\n") {
      if (char === "\r" && csv[index + 1] === "\n") index++;
      pushField(); result.push(row); row = [];
    } else {
      assert.equal(afterQuote, false, "No characters may follow a closing quote before a separator");
      started = true;
      field += char;
    }
  }
  assert.equal(quoted, false, "Unclosed quoted field");
  if (started || afterQuote || row.length || field.length || csv.endsWith(delimiter)) {
    pushField(); result.push(row);
  }
  return result;
}

function assertRoundtrip(result) {
  const matrix = result.options.includeHeader ? [result.headers, ...result.rows] : result.rows;
  assert.deepEqual(readCsv(result.csv, result.options.delimiter), plain(matrix));
  assert.ok(Buffer.from(result.csv, "utf8").toString("utf8") === result.csv, "UTF-8 download encoding must not replace exported characters");
  assert.equal(result.stats.downloadBytes, Buffer.byteLength(result.csv, "utf8") + (result.options.bom ? 3 : 0));
  assert.notEqual(result.csv.charCodeAt(0), 0xfeff, "Result CSV must never contain a leading download BOM");
  assert.equal(result.stats.outputRows, result.rows.length);
  assert.equal(result.stats.exportedColumns, result.headers.length);
  assert.ok(result.rows.every((row) => row.length === result.headers.length));
  assert.ok(result.warnings.length <= 16, "Warnings are aggregated, not emitted per row");
  assert.deepEqual(plain(structuredClone(result)), plain(result), "Worker results must be JSON serializable");
}

function beforeCsvFailure(input, changes, pattern, columns) {
  const isolated = loadCore();
  isolated.context.fixture = { input, options: options(changes), columns };
  rejects(() => vm.runInContext("engine.convertJson(fixture.input, 'json', fixture.options, fixture.columns)", isolated.context,
    { timeout: 20_000 }), pattern, isolated.engine);
  assert.equal(isolated.counters.unparses, 0, "Budget must be checked before Papa generates CSV");
  return isolated;
}

test("exact scoped exports and installed parser versions", () => {
  assert.deepEqual(Object.keys(engine).sort(), ["JsonCsvError", "convertJson", "inspectJson"]);
  assert.equal(require("jsonc-parser/package.json").version, "3.3.1");
  assert.equal(require("papaparse/package.json").version, "5.7.0");
  assert.equal(require("@types/papaparse/package.json").version, "5.5.2");
  assert.equal(core.counters.unparses, 0);
  assert.deepEqual([parser.SyntaxKind.OpenBraceToken, parser.SyntaxKind.CloseBraceToken,
    parser.SyntaxKind.OpenBracketToken, parser.SyntaxKind.CloseBracketToken, parser.SyntaxKind.NumericLiteral,
    parser.SyntaxKind.LineCommentTrivia, parser.SyntaxKind.BlockCommentTrivia, parser.SyntaxKind.LineBreakTrivia,
    parser.SyntaxKind.Trivia, parser.SyntaxKind.Unknown, parser.SyntaxKind.EOF, parser.ScanError.None],
  [1, 2, 3, 4, 11, 12, 13, 14, 15, 16, 17, 0]);
});

test("scoped no-emit type checks compile at ES2017 with DOM and separately worker libraries", () => {
  for (const lib of [["lib.esnext.d.ts", "lib.dom.d.ts", "lib.dom.iterable.d.ts"], ["lib.esnext.d.ts", "lib.webworker.d.ts"]]) {
    const program = ts.createProgram([path.join(directory, "engine.ts"), path.join(directory, "worker.ts")], {
      target: ts.ScriptTarget.ES2017, lib, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler,
      esModuleInterop: true, strict: true, isolatedModules: true, types: [], skipLibCheck: true,
      incremental: false, noEmit: true,
    });
    const diagnostics = ts.getPreEmitDiagnostics(program);
    assert.equal(diagnostics.length, 0, ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCanonicalFileName: (filename) => filename, getCurrentDirectory: () => root, getNewLine: () => "\n",
    }));
    assert.deepEqual(program.getSourceFiles().filter((file) => !file.isDeclarationFile)
      .map((file) => path.basename(file.fileName)).sort(), ["engine.ts", "types.ts", "worker.ts"]);
  }
});

test("ordinary records retain first-seen column order, including numeric-looking keys", () => {
  const result = convert('[{"10":"ten","2":"two","id":"001"},{"id":"002","extra":true}]');
  assert.deepEqual(headersOf(result), ["10", "2", "id", "extra"].map((key) => /^\d/.test(key) ? `["${key}"]` : key));
  assert.deepEqual(rowsOf(result), [["ten", "two", "001", ""], ["", "", "002", "true"]]);
  assert.equal(result.stats.missingCells, 3);
  assert.equal(result.stats.inputRows, 2);
  assertRoundtrip(result);
});

for (const [text, cell, numeric, nulls] of [
  ['"001"', "001", 0, 0], ['"abc"', "abc", 0, 0], ["true", "true", 0, 0],
  ["false", "false", 0, 0], ["null", "", 0, 1], ["-1", "-1", 1, 0],
  ["2.370", "2.370", 1, 0], ["9123372036854000123", "9123372036854000123", 1, 0],
  ["2.3e+500", "2.3e+500", 1, 0], ["1e999", "1e999", 1, 0],
  ["1E-999", "1E-999", 1, 0], ["-0", "-0", 1, 0],
]) {
  test(`scalar JSON ${text} is one value cell without numeric coercion`, () => {
    const result = convert(text);
    assert.deepEqual(headersOf(result), ["(value)"]);
    assert.deepEqual(rowsOf(result), [[cell]]);
    assert.equal(result.columns[0].id, "root:");
    assert.equal(result.columns[0].path, "");
    assert.equal(result.stats.numericCells, numeric);
    assert.equal(result.stats.nullCells, nulls);
    assert.equal(result.stats.formulaRiskFields, 0);
    assertRoundtrip(result);
  });
}

test("all numeric AST values are unreadable, while raw tokens still convert exactly", () => {
  const isolated = loadCore();
  const result = isolated.engine.convertJson('[{"n":9123372036854000123,"f":2.370,"huge":2.3e+500,"tiny":1e-999,"negative":-1,"zero":-0}]', "json", options());
  assert.deepEqual(rowsOf(result), [["9123372036854000123", "2.370", "2.3e+500", "1e-999", "-1", "-0"]]);
  assert.equal(isolated.counters.numericNodes, 6);
  assert.equal(result.stats.numericCells, 6);
  assertRoundtrip(result);
});

test("mixed scalar/object/array rows and empty objects retain a distinct root value column", () => {
  const result = convert('["abc",2,true,null,{}, {"value":"v","(value)":"named"},["x",2],{"":""}]');
  assert.deepEqual(headersOf(result), ["(value)", "value", '["(value)"]', '[""]']);
  assert.deepEqual(Array.from(result.rows, (row) => row[0]), ["abc", "2", "true", "", "{}", "", '["x",2]', ""]);
  assert.equal(result.rows[5][1], "v");
  assert.equal(result.rows[5][2], "named");
  assert.equal(new Set(result.columns.map((column) => column.id)).size, 4);
  assert.equal(result.stats.nullCells, 1);
  assertRoundtrip(result);
});

test("empty objects remain JSON cells; an empty root array can be inspected but not exported", () => {
  for (const text of ["{}", "[{}]"]) assert.deepEqual(rowsOf(convert(text)), [["{}"]]);
  const inspection = inspect("[]");
  assert.deepEqual(plain(inspection.rowPaths), [{ pointer: "", label: "Root (array)", rowCount: 0, kind: "array", arrayPaths: [] }]);
  rejects(() => convert("[]"), /empty|no rows/);
});

test("empty or whitespace-only JSON and malformed roots never return partial results", () => {
  for (const input of ["", " \t\r\n", "{", "[", "}", "null true", "{}{}", "[1,,2]", '{"a":}', '{"a" 1}']) {
    rejects(() => inspect(input), /JSON/);
    rejects(() => convert(input), /JSON/);
  }
});

test("strict syntax rejects comments, trailing commas, invalid escapes, and non-JSON whitespace", () => {
  for (const input of ['{"a":1,}', "[1,]", "/* PRIVATE_PAYLOAD */{}", "{}//comment", '{"a":/*x*/1}',
    '"\\x20"', '"\\u12xx"', '"raw\nline"', '"raw\u0000zero"', '\u00a0{}', "\ufeff\ufeff{}"]) {
    rejects(() => inspect(input), /JSON/);
  }
  assertRoundtrip(convert('{"comment":"/* data, not a comment */","url":"https://example.invalid/"}'));
});

test("malformed numeric tokens are rejected, not accepted through JavaScript Number coercion", () => {
  for (const token of ["01", "-01", "+1", "1.", "1e", "1e+", "1e-", "--1", "NaN", "Infinity", "-Infinity", "0x10", ".1", "1_000", "-.5"]) {
    rejects(() => inspect(token), /JSON/);
    rejects(() => convert(`{"n":${token}}`), /JSON/);
  }
  assert.deepEqual(rowsOf(convert("[-1.20E+003,0.000,1e999]")), [["-1.20E+003"], ["0.000"], ["1e999"]]);
});

test("duplicate names, identical values, escaped aliases, and hidden nested duplicates are rejected", () => {
  for (const input of ['{"a":1,"a":1}', '{"a":1,"\\u0061":2}', '{"__proto__":1,"__pro\\u0074o__":2}',
    '{"hidden":[{"deep":{"x":true,"x":true}}]}', '{"constructor":0,"constructor":0}']) {
    rejects(() => inspect(input), /Duplicate object keys/);
  }
  const beyondControlScan = `[${'{"a":0},'.repeat(10_000)}{"private":{"x":1,"x":1}}]`;
  rejects(() => inspect(beyondControlScan), /Duplicate object keys/);
});

test("prototype-sensitive field names survive in maps without prototype pollution", () => {
  const result = convert('{"\\u005f_proto__":"p","constructor":"c","isLosslessNumber":"i","value":"v","toString":"t"}');
  assert.deepEqual(headersOf(result), ["__proto__", "constructor", "isLosslessNumber", "value", "toString"]);
  assert.deepEqual(rowsOf(result), [["p", "c", "i", "v", "t"]]);
  const nested = convert('{"__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":1}}}');
  assert.deepEqual(headersOf(nested), ["__proto__.polluted", "constructor.prototype.polluted"]);
  assert.equal(Object.prototype.polluted, undefined);
  assert.equal(vm.runInContext("Object.prototype.polluted", core.context), undefined);
  assertRoundtrip(result);
  assertRoundtrip(nested);
});

test("decoded string escapes, controls and valid Unicode remain exact exported data", () => {
  const text = '"a\\tb\\rc\\nd\\\\e\\\"f\\/g\\u263a\\uD83D\\uDE00"';
  const result = convert(text);
  assert.equal(result.rows[0][0], JSON.parse(text));
  assertRoundtrip(result);
  assert.equal(inspect(text).inputBytes, Buffer.byteLength(text, "utf8"));
  const literal = JSON.stringify("é😀");
  assert.equal(inspect(literal).inputBytes, Buffer.byteLength(literal, "utf8"));
  assertRoundtrip(convert(literal));
});

test("escaped and literal lone high/low surrogates fail only when exported, before CSV in JSON and JSONL", () => {
  const isolated = loadCore();
  for (const code of [0xd800, 0xdbff, 0xdc00, 0xdfff]) {
    const surrogate = String.fromCharCode(code);
    for (const input of [`{"value":"\\u${code.toString(16).toUpperCase()}"}`, `{"value":"${surrogate}"}`]) {
      for (const format of ["json", "jsonl"]) {
        const text = format === "jsonl" ? `0\n${input}\n` : input;
        assert.equal(isolated.engine.inspectJson(text, format).inputBytes, Buffer.byteLength(text, "utf8"));
        rejects(() => isolated.engine.convertJson(text, format, options()), UNICODE_ERROR, isolated.engine);
      }
    }
  }
  for (const value of ["\ud800x", "x\udc00", "\ud800\ud800", "\udc00\ud800"]) {
    rejects(() => isolated.engine.convertJson(JSON.stringify(value), "json", options()), UNICODE_ERROR, isolated.engine);
  }
  assert.equal(isolated.counters.unparses, 0);
});

test("null and missing replacements reject unpaired surrogates only in actual exported cells", () => {
  for (const replacement of ["\ud800", "\udfff"]) {
    beforeCsvFailure('{"value":null}', { nullValue: replacement }, UNICODE_ERROR);
    beforeCsvFailure('[{"value":1},{}]', { missingValue: replacement }, UNICODE_ERROR);
    beforeCsvFailure('{"value":[null]}', { arrayMode: "join", nullValue: replacement }, UNICODE_ERROR);
    const unused = convert('{"value":1}', { nullValue: replacement, missingValue: replacement, joinSeparator: replacement });
    assert.deepEqual(rowsOf(unused), [["1"]]);
    assertRoundtrip(unused);
    const input = '[{"keep":1,"skip":null},{"keep":2}]';
    const columns = columnsOf(convert(input)).map((column) => ({ ...column, enabled: column.path === "/keep" }));
    const excluded = convert(input, { nullValue: replacement, missingValue: replacement }, "json", columns);
    assert.deepEqual(rowsOf(excluded), [["1"], ["2"]]);
    assertRoundtrip(excluded);
  }
});

test("custom headers are Unicode-checked only when enabled and included in the export", () => {
  const input = '{"a":1,"b":2}';
  const original = columnsOf(convert(input));
  for (const surrogate of ["\ud800", "\udc00"]) {
    const columns = original.map((column, index) => ({ ...column, header: index ? column.header : `H${surrogate}` }));
    beforeCsvFailure(input, {}, UNICODE_ERROR, columns);
    assertRoundtrip(convert(input, { includeHeader: false }, "json", columns));
    const excluded = columns.map((column, index) => ({ ...column, enabled: index === 1 }));
    assertRoundtrip(convert(input, {}, "json", excluded));
  }
});

test("joined output validates final Unicode after applying strings, separators and null replacements", () => {
  for (const surrogate of ["\ud800", "\udc00"]) {
    beforeCsvFailure(JSON.stringify({ list: ["a", surrogate] }), { arrayMode: "join" }, UNICODE_ERROR);
    beforeCsvFailure('{"list":["a","b"]}', { arrayMode: "join", joinSeparator: surrogate }, UNICODE_ERROR);
    beforeCsvFailure('{"list":[null,"x"]}', { arrayMode: "join", nullValue: surrogate }, UNICODE_ERROR);
    assertRoundtrip(convert('{"list":["a"]}', { arrayMode: "join", joinSeparator: surrogate }));
    assertRoundtrip(convert('{"list":[]}', { arrayMode: "join", joinSeparator: surrogate }));
  }
  for (const [input, changes] of [
    ['{"list":["\\uD83D","\\uDE00"]}', { joinSeparator: "" }],
    ['{"list":[null,"\\uDE00"]}', { nullValue: "\ud83d", joinSeparator: "" }],
    ['{"list":["","\\uDE00"]}', { joinSeparator: "\ud83d" }],
  ]) {
    const result = convert(input, { arrayMode: "join", ...changes });
    assert.deepEqual(rowsOf(result), [["😀"]], "A surrogate pair formed in the final joined field is valid Unicode");
    assertRoundtrip(result);
  }
});

test("valid surrogate pairs and astral Unicode survive text, headers, replacements and joins as UTF-8", () => {
  const value = "\ud800\udc00😀𝄞\udbff\udfff";
  const input = JSON.stringify([{ text: value, nil: null, list: [value, value] }, { text: value }]);
  const changes = { arrayMode: "join", joinSeparator: "🧵", nullValue: value, missingValue: value };
  const columns = columnsOf(convert(input, changes)).map((column, index) => ({ ...column, header: `${index}${value}` }));
  const result = convert(input, changes, "json", columns);
  assert.deepEqual(rowsOf(result), [[value, value, `${value}🧵${value}`], [value, value, value]]);
  assertRoundtrip(result);
});

test("raw compound JSON preserves literal surrogate escapes and raw numbers, but not literal malformed Unicode", () => {
  const array = '[ "\\uD800", "\\udfff", 2.370, 9123372036854000123, 1e999 ]';
  const object = '{ "text": "\\uD800", "n": -0 }';
  const input = `{"array":${array},"object":${object}}`;
  const result = convert(input, { flatten: false });
  assert.deepEqual(rowsOf(result), [[array, object]]);
  assertRoundtrip(result);
  beforeCsvFailure(input, { flatten: false, arrayMode: "join" }, UNICODE_ERROR);
  const complex = `[${object}, "\\uDC00", 2.370]`;
  const retained = convert(`{"value":${complex}}`, { arrayMode: "join" });
  assert.deepEqual(rowsOf(retained), [[complex]]);
  assertRoundtrip(retained);
  const lines = convert(`${array}\n{"box":${object}}\n`, { flatten: false }, "jsonl");
  assert.deepEqual(rowsOf(lines), [[array, ""], ["", object]]);
  assertRoundtrip(lines);
  assert.deepEqual(rowsOf(convert('{"value":"\\\\ud800"}')), [["\\ud800"]]);
  for (const surrogate of ["\ud800", "\udc00"]) {
    beforeCsvFailure(`{"value":["${surrogate}"]}`, {}, UNICODE_ERROR);
    beforeCsvFailure(`{"value":{"text":"${surrogate}"}}`, { flatten: false }, UNICODE_ERROR);
  }
});

test("escaped generated headers and disabled malformed string fields do not trigger blanket input rejection", () => {
  const result = convert('{"\\uD800":1,"\\uDC00":2}');
  assert.deepEqual(headersOf(result), ['["\\ud800"]', '["\\udc00"]']);
  assertRoundtrip(result);
  const columns = columnsOf(convert('{"keep":1,"skip":"safe"}'))
    .map((column) => ({ ...column, enabled: column.path === "/keep" }));
  const excluded = convert('{"keep":1,"skip":"\\uD800"}', {}, "json", columns);
  assert.deepEqual(rowsOf(excluded), [["1"]]);
  assertRoundtrip(excluded);
});

test("errors report fixed 1-based UTF-16 line/column locations without disclosing source text", () => {
  rejects(() => inspect('[\r\n  {"a": 1, "a": 2}\r\n]'), /line 2, column 12/);
  rejects(() => inspect('{\n "bad":\n}'), /line 3, column 1/);
  rejects(() => inspect('{}\r\n{"bad":}\r\n', "jsonl"), /line 2, column 8/);
  rejects(() => inspect('\ufeff{"a":}'), /line 1, column 7/);
  rejects(() => inspect('"PRIVATE_PAYLOAD <script>" false'), /line 1, column/);
});

test("ordinary JSON permits exactly one leading BOM and counts its original bytes/characters", () => {
  const input = '\ufeff{"id":"001"}';
  const result = inspect(input);
  assert.equal(result.inputChars, input.length);
  assert.equal(result.inputBytes, Buffer.byteLength(input, "utf8"));
  assert.ok(warningHas(result, /One leading.*BOM/));
  assert.deepEqual(rowsOf(convert(input)), [["001"]]);
  rejects(() => inspect('\ufeff\ufeff{}'), /line 1, column 2/);
  rejects(() => inspect(' \ufeff{}'), /JSON/);
});

test("JSON Lines roots intentionally accept every JSON value and retain line-local raw slices", () => {
  const input = '{"n":2.370}\r\n9123372036854000123\n"001"\nnull\n[ 2.3e+500,  -0 ]\n{}\n';
  const result = convert(input, {}, "jsonl");
  assert.equal(result.stats.inputRows, 6);
  assert.deepEqual(headersOf(result), ["n", "(value)"]);
  assert.deepEqual(rowsOf(result), [["2.370", ""], ["", "9123372036854000123"], ["", "001"], ["", ""], ["", "[ 2.3e+500,  -0 ]"], ["", "{}"]]);
  assert.equal(result.stats.numericCells, 2);
  assert.equal(result.stats.nullCells, 1);
  assert.deepEqual(plain(inspect(input, "jsonl").rowPaths.map((choice) => choice.pointer)), [""]);
  assertRoundtrip(result);
});

test("JSON Lines permits one final LF/CRLF but rejects empty interior or extra final records", () => {
  for (const text of ["{}", "{}\n", "{}\r\n", "{} \t\n"]) assert.equal(inspect(text, "jsonl").rowPaths[0].rowCount, 1);
  for (const text of ["", "\n", "\n{}", "{}\n\n", "{}\n \t\n", "{}\n\r\n", "{}\n \t", "{}\n\n{}", "{\n\"a\":1\n}"]) {
    rejects(() => inspect(text, "jsonl"), /JSON|Blank/);
  }
  for (const text of ["\ufeff{}", "{}\n\ufeff{}", "{}\n[1,]", "{}\n/*x*/1", '{"a":1}\n{"a":2,"a":2}']) {
    rejects(() => inspect(text, "jsonl"), /JSON|Duplicate/);
  }
});

test("inspection lists only root and object-property-reached arrays, never paths through array elements", () => {
  const input = '{"data":{"items":[{"nested":[1]}]},"other":[],"meta":{"list":[3]}}';
  const result = inspect(input);
  assert.deepEqual(plain(result.rowPaths.map((choice) => choice.pointer)), ["", "/data/items", "/other", "/meta/list"]);
  assert.deepEqual(plain(result.rowPaths[1].arrayPaths), [{ pointer: "/nested", label: "/nested" }]);
  assert.equal(result.rowPaths[0].rowCount, 1);
  rejects(() => convert(input, { rowPath: "/data/items/0/nested" }), /row-source/);
  rejects(() => convert('[{"records":[1]}]', { rowPath: "/0/records" }), /row-source/);
});

test("RFC 6901 escape sequences select exact own keys and omit wrapper metadata", () => {
  const input = '{"status":"PRIVATE_PAYLOAD","a/b":{"~key":[{"x/y":{"~z":2.370}},{"x/y":{"~z":3}}]}}';
  const result = convert(input, { rowPath: "/a~1b/~0key" });
  assert.deepEqual(Array.from(result.columns, (column) => column.path), ["/x~1y/~0z"]);
  assert.deepEqual(headersOf(result), ['["x/y"]["~z"]']);
  assert.deepEqual(rowsOf(result), [["2.370"], ["3"]]);
  assert.ok(warningHas(result, /metadata outside/));
  assert.doesNotMatch(result.csv, /PRIVATE_PAYLOAD|status/);
  rejects(() => convert(input, { rowPath: "/a/b/~key" }), /options/);
  const proto = convert('{"__proto__":[{"x":1}]}', { rowPath: "/__proto__" });
  assert.deepEqual(rowsOf(proto), [["1"]]);
  rejects(() => convert("{}", { rowPath: "/constructor/prototype" }), /row-source/);
  assertRoundtrip(result);
});

test("60 row choices and 50 array choices are bounded controls, not input truncation", () => {
  const input = `{${Array.from({ length: 65 }, (_, index) => `"a${index}":[${index}]`).join(",")}}`;
  const inspection = inspect(input);
  assert.equal(inspection.rowPaths.length, 60);
  assert.equal(inspection.rowPaths[59].pointer, "/a58");
  assert.ok(warningHas(inspection, /Row-source discovery stopped.*60.*additional sources may exist/));
  assert.equal(inspection.rowPaths[0].arrayPaths.length, 50);
  assert.ok(warningHas(inspection, /Array-path discovery stopped.*50 array-path.*additional paths may exist/));
  assert.ok(inspection.warnings.every((warning) => !/\d+ additional row sources/.test(warning)));
  assert.equal(convert(input).columns.length, 65);
  rejects(() => convert(input, { rowPath: "/a64" }), /row-source/);
  rejects(() => convert(input, { expandPath: "/a50" }), /array-expansion/);
});

test("giant escaped selector keys reject promptly under input limits without escaping the key or generating CSV", () => {
  const key = "~/".repeat(450_000);
  const fields = Array.from({ length: 1_000 }, (_, index) => `"a${index}":[0]`).join(",");
  const input = `{${JSON.stringify(key)}:{${fields}}}`;
  assert.ok(input.length < JSON_CSV_LIMITS.inputChars);
  assert.ok(Buffer.byteLength(input, "utf8") < JSON_CSV_LIMITS.inputBytes);
  for (const format of ["json", "jsonl"]) for (const conversion of [false, true]) {
    const isolated = loadCore();
    const work = watchPointerWork(isolated, key.length);
    const start = performance.now();
    rejects(() => conversion ? isolated.engine.convertJson(input, format, options()) : isolated.engine.inspectJson(input, format),
      POINTER_ERROR, isolated.engine);
    assert.ok(performance.now() - start < 10_000, "Bounded selector rejection must finish promptly, not exhaust a worker deadline");
    assert.equal(isolated.counters.parses, 1, "The input passed depth/token preflight and reached selector discovery");
    assert.equal(isolated.counters.numericNodes, 1_000);
    assert.ok(work.keyScans <= 4_096, "Escaped-length scanning must stop early, not scan the whole giant key");
    assert.equal(work.keyReplacements, 0);
    assert.equal(work.oversizedReplacements, 0);
    assert.equal(isolated.counters.unparses, 0);
  }
});

test("plain and RFC-escaped row pointers accept 4096 characters and reject the next character before serialization", () => {
  for (const key of ["x".repeat(4_095), "~/".repeat(1_023) + "abc"]) {
    const rowPath = pointerOf(key);
    assert.equal(rowPath.length, 4_096);
    const input = `{${JSON.stringify(key)}:[{"n":2.370,"large":9123372036854000123}]}`;
    assert.equal(inspect(input).rowPaths[1].pointer, rowPath);
    const result = convert(input, { rowPath });
    assert.deepEqual(rowsOf(result), [["2.370", "9123372036854000123"]]);
    assertRoundtrip(result);
    const outside = `{${JSON.stringify(key + "x")}:[0]}`;
    rejects(() => inspect(outside), POINTER_ERROR);
    beforeCsvFailure(outside, {}, POINTER_ERROR);
  }
});

test("expansion decodes bounded escaped pointers and overlong option/column identities fail before input parsing", () => {
  const key = "~/".repeat(1_000) + "x".repeat(90);
  const expandPath = `/meta${pointerOf(key)}`;
  assert.equal(expandPath.length, 4_096);
  const input = `[{"meta":{${JSON.stringify(key)}:[1,2]},"n":-0}]`;
  const result = convert(input, { expandPath, flatten: false });
  assert.deepEqual(Array.from(result.rows, (row) => JSON.parse(row[0])[key]), [1, 2]);
  assert.deepEqual(Array.from(result.rows, (row) => row[1]), ["-0", "-0"]);
  assertRoundtrip(result);
  const overlong = `/PRIVATE_PAYLOAD${"x".repeat(4_096)}`;
  const isolated = loadCore();
  for (const changes of [{ rowPath: overlong }, { expandPath: overlong }]) {
    rejects(() => isolated.engine.convertJson("1", "json", options(changes)), /options/, isolated.engine);
  }
  const column = columnsOf(convert('{"a":1}'))[0];
  for (const supplied of [[{ ...column, path: overlong }], [{ ...column, id: `field:${overlong}` }]]) {
    rejects(() => isolated.engine.convertJson('{"a":1}', "json", options(), supplied), /column/i, isolated.engine);
  }
  assert.equal(isolated.counters.scans, 0);
  assert.equal(isolated.counters.parses, 0);
  assert.equal(isolated.counters.unparses, 0);
});

test("one selector text budget includes both row and array pointer-label copies at the 60/50 choice caps", () => {
  const fixture = (length) => JSON.stringify(Object.fromEntries(Array.from({ length: 60 }, (_, index) => [`k${index}`.padEnd(length, "x"), [index]])));
  const input = fixture(299);
  const inspection = inspect(input);
  assert.equal(inspection.rowPaths.length, 60);
  assert.equal(inspection.rowPaths[0].arrayPaths.length, 50);
  assert.ok(selectorTextChars(inspection) <= 65_536);
  const result = convert(input);
  assert.equal(result.stats.exportedColumns, 60, "Unlisted selector choices must not truncate exported source fields");
  assert.equal(result.rows[0][59], "[59]");
  assertRoundtrip(result);
  const outside = fixture(300);
  rejects(() => inspect(outside), SELECTOR_ERROR);
  beforeCsvFailure(outside, {}, SELECTOR_ERROR);
});

test("identical array pointers in different row sources each consume the shared selector text budget", () => {
  const child = `[{"${"x".repeat(600)}":[0]}]`;
  const input = `{${Array.from({ length: 60 }, (_, index) => `"r${index}":${child}`).join(",")}}`;
  rejects(() => inspect(input), SELECTOR_ERROR);
  beforeCsvFailure(input, { rowPath: "/r0" }, SELECTOR_ERROR);
});

test("selector text boundaries count root/value labels, deduplicate records and reject before escaping the over-budget path", () => {
  for (const includeRootArray of [false, true]) {
    const lastLength = includeRootArray ? 4_086 : 4_090;
    function fixture(extra = 0) {
      const keys = Array.from({ length: 8 }, (_, index) => `k${index}`.padEnd((index === 7 ? lastLength + extra : 4_096) - "/box/".length, "x"));
      const body = JSON.stringify(Object.fromEntries(keys.map((key) => [key, []])));
      const record = `{"box":${body}}`;
      return { input: `[${includeRootArray ? "[]," : ""}${record},${record}]`, body, lastKey: keys[7] };
    }
    const { input, body } = fixture();
    const inspection = inspect(input);
    assert.equal(selectorTextChars(inspection), includeRootArray ? 65_535 : 65_536);
    assert.equal(inspection.rowPaths[0].arrayPaths.length, includeRootArray ? 9 : 8);
    const result = convert(input, { flatten: false });
    assert.ok(result.rows[result.rows.length - 1][result.headers.length - 1] === body, "Raw long-key JSON must remain complete");
    assertRoundtrip(result);
    const outside = fixture(1);
    const isolated = loadCore();
    const work = watchPointerWork(isolated, outside.lastKey.length);
    rejects(() => isolated.engine.inspectJson(outside.input, "json"), SELECTOR_ERROR, isolated.engine);
    rejects(() => isolated.engine.convertJson(outside.input, "json", options({ flatten: false })), SELECTOR_ERROR, isolated.engine);
    assert.equal(work.keyReplacements, 0, "Cumulative budget must be reserved before constructing even an individually bounded pointer");
    assert.equal(work.oversizedReplacements, 0);
    assert.equal(isolated.counters.unparses, 0);
  }
});

test("row and array discovery stop at their caps without scanning or escaping later giant paths", () => {
  const key = "~/".repeat(30_000);
  const first = Array.from({ length: 59 }, (_, index) => `"r${index}":[${index}]`).join(",");
  const later = Array.from({ length: 1_000 }, (_, index) => `"a${index}":[0]`).join(",");
  const input = `{${first},${JSON.stringify(key)}:{${later}}}`;
  const isolated = loadCore();
  const work = watchPointerWork(isolated, key.length);
  const inspection = isolated.engine.inspectJson(input, "json");
  assert.equal(inspection.rowPaths.length, 60);
  assert.equal(inspection.rowPaths[0].arrayPaths.length, 50);
  assert.ok(warningHas(inspection, /discovery stopped.*60.*may exist/));
  assert.ok(warningHas(inspection, /discovery stopped.*50.*may exist/));
  assert.ok(warningHas(inspect(`{${first}}`), /discovery stopped.*60.*may exist/), "Reaching the cap does not verify any additional sources");
  const result = isolated.engine.convertJson(input, "json", options({ rowPath: "/r0" }));
  assert.deepEqual(rowsOf(result), [["0"]]);
  assertRoundtrip(result);
  assert.equal(work.keyScans, 0);
  assert.equal(work.keyReplacements, 0);
  assert.equal(work.oversizedReplacements, 0);
});

test("array discovery stops across records at 50 choices while conversion retains later unflattened data", () => {
  const key = "~/".repeat(30_000);
  const first = `{${Array.from({ length: 50 }, (_, index) => `"a${index}":[0]`).join(",")}}`;
  const payload = `{${JSON.stringify(key)}:{"later":[0]}}`;
  const input = `[${first},{"payload":${payload}}]`;
  const isolated = loadCore();
  const work = watchPointerWork(isolated, key.length);
  const inspection = isolated.engine.inspectJson(input, "json");
  assert.equal(inspection.rowPaths[0].arrayPaths.length, 50);
  assert.ok(warningHas(inspection, /discovery stopped.*50.*may exist/));
  const result = isolated.engine.convertJson(input, "json", options({ flatten: false }));
  assert.equal(result.stats.outputRows, 2);
  assert.equal(result.stats.exportedColumns, 51);
  assert.ok(result.rows[1][50] === payload, "Discovery limits must not drop later source data");
  assertRoundtrip(result);
  assert.equal(work.keyScans, 0);
  assert.equal(work.keyReplacements, 0);
  assert.equal(work.oversizedReplacements, 0);
});

test("selector character limits do not become UTF-8 limits or restrict unrelated long fullwidth/astral text", () => {
  const key = "漢".repeat(4_095);
  const rowPath = `/${key}`;
  const value = "Ｆｕｌｌ😀".repeat(20_000);
  assert.equal(rowPath.length, 4_096);
  assert.ok(Buffer.byteLength(rowPath, "utf8") > 4_096);
  assert.ok(value.length > 65_536);
  const input = JSON.stringify({ [key]: [{ value }] });
  assert.equal(inspect(input).inputBytes, Buffer.byteLength(input, "utf8"));
  const result = convert(input, { rowPath });
  assert.ok(result.rows[0][0] === value, "Fullwidth and astral data must not be truncated or normalized");
  assertRoundtrip(result);
});

test("inspection counts oversized sources accurately but scans no more than 10,000 records into controls", () => {
  const input = `[${'{"a":0},'.repeat(10_000)}{"later":[1]}]`;
  const result = inspect(input);
  assert.equal(result.rowPaths[0].rowCount, 10_001);
  assert.deepEqual(plain(result.rowPaths[0].arrayPaths), []);
  assert.ok(warningHas(result, /first 10,000/));
  beforeCsvFailure(input, {}, /10,000-row/);
  const wrapped = `{"rows":${input},"page":1}`;
  assert.equal(inspect(wrapped).rowPaths[0].rowCount, 1);
  assert.equal(inspect(wrapped).rowPaths[1].rowCount, 10_001);
  assert.equal(convert(wrapped).stats.outputRows, 1);
  beforeCsvFailure(wrapped, { rowPath: "/rows" }, /10,000-row/);
});

test("flattening preserves empty objects and otherwise keeps exact original nested JSON", () => {
  const array = '[ 2.370,\n 9123372036854000123, 2.3e+500 ]';
  const object = '{ "a": 2.370, "empty": {} }';
  const input = `{"plain":${object},"array":${array},"empty":{}}`;
  const flattened = convert(input);
  assert.deepEqual(headersOf(flattened), ["plain.a", "plain.empty", "array", "empty"]);
  assert.deepEqual(rowsOf(flattened), [["2.370", "{}", array, "{}"]]);
  const nested = convert(input, { flatten: false });
  assert.deepEqual(headersOf(nested), ["plain", "array", "empty"]);
  assert.deepEqual(rowsOf(nested), [[object, array, "{}"]]);
  assert.equal(nested.stats.numericCells, 0);
  assertRoundtrip(flattened);
  assertRoundtrip(nested);
});

test("special-key headers, root identities, empty keys, and heterogeneous fields never collide", () => {
  const input = '[0,{"value":1,"(value)":2,"a.b":3,"a":{"b":4},"a/b":5,"~":6,"":7,"a[\\\"b\\\"]":8},{"a":9}]';
  const result = convert(input);
  assert.deepEqual(headersOf(result), ["(value)", "value", '["(value)"]', '["a.b"]', "a.b", '["a/b"]', '["~"]', '[""]', '["a[\\\"b\\\"]"]', "a"]);
  assert.equal(new Set(result.columns.map((column) => column.id)).size, result.columns.length);
  assert.equal(result.columns.find((column) => column.path === "/a~1b").header, '["a/b"]');
  assert.equal(result.columns.find((column) => column.path === "/~0").header, '["~"]');
  assertRoundtrip(result);
});

test("scalar-array joining uses raw numbers, decoded strings and null replacement; counts are cells not items", () => {
  const result = convert('{"list":[1,-2.370,true,null," a | b"]}', { arrayMode: "join", nullValue: "NULL" });
  assert.deepEqual(rowsOf(result), [["1 | -2.370 | true | NULL |  a | b"]]);
  assert.equal(result.stats.nullCells, 0);
  assert.equal(result.stats.numericCells, 0);
  assert.ok(warningHas(result, /1 array cell.*not lossless/));
  assertRoundtrip(result);
  const joinedNull = convert('{"list":[null,null]}', { arrayMode: "join", nullValue: "=N", joinSeparator: ";" });
  assert.deepEqual(rowsOf(joinedNull), [["'=N;=N"]]);
  assert.equal(joinedNull.stats.formulaRiskFields, 1);
  assert.equal(joinedNull.stats.nullCells, 0);
  assert.equal(convert('{"list":[]}', { arrayMode: "join" }).rows[0][0], "");
  assert.equal(convert('{"list":[-1,2]}', { arrayMode: "join" }).rows[0][0], "'-1 | 2");
});

test("complex/mixed/nested arrays retain their complete original JSON instead of lossy joining", () => {
  const cells = ['[ {"n":2.370} ]', '[ 1, {"n":9123372036854000123}, null ]', '[[2.3e+500],[]]'];
  const result = convert(`{"a":${cells[0]},"b":${cells[1]},"c":${cells[2]}}`, { arrayMode: "join" });
  assert.deepEqual(rowsOf(result), [cells]);
  assert.ok(warningHas(result, /3 array cell.*retained as JSON/));
  assert.equal(result.stats.numericCells, 0);
  assertRoundtrip(result);
});

test("single-path outer expansion repeats parent fields and retains empty, absent, null and wrong-type parents", () => {
  const input = '[{"id":"A","items":[{"sku":"s","qty":2},{"sku":"t","qty":1}],"tags":["a","b"]},{"id":"B","items":[],"tags":["c"]},{"id":"C"},{"id":"D","items":null},{"id":"E","items":7}]';
  const result = convert(input, { expandPath: "/items" });
  assert.equal(result.stats.inputRows, 5);
  assert.equal(result.stats.outputRows, 6);
  assert.deepEqual(headersOf(result), ["id", "items.sku", "items.qty", "tags", "items"]);
  assert.deepEqual(rowsOf(result), [
    ["A", "s", "2", '["a","b"]', ""], ["A", "t", "1", '["a","b"]', ""],
    ["B", "", "", '["c"]', ""], ["C", "", "", "", ""], ["D", "", "", "", ""], ["E", "", "", "", "7"],
  ]);
  assert.equal(result.stats.missingCells, 16);
  assert.equal(result.stats.nullCells, 0);
  assert.equal(result.stats.numericCells, 3);
  assert.ok(warningHas(result, /1 input row.*non-array.*unchanged/));
  assertRoundtrip(result);
});

test("expansion is one explicit path, not a Cartesian product or an executable expression", () => {
  const input = '{"left":[1,2],"right":[3,4,5]}';
  const result = convert(input, { expandPath: "/left" });
  assert.deepEqual(rowsOf(result), [["1", "[3,4,5]"], ["2", "[3,4,5]"]]);
  assert.equal(result.stats.outputRows, 2);
  for (const expandPath of [["/left", "/right"], "/left,/right", "$.left", "/constructor/constructor", "/left/0"]) {
    rejects(() => convert(input, { expandPath }), /options|array-expansion/);
  }
  rejects(() => convert(input, { rowPath: "constructor.constructor('PRIVATE_PAYLOAD')()" }), /options/);
  assertRoundtrip(result);
});

test("unflattened nested expansion uses lexical overlays, preserves siblings, and omits missing members", () => {
  const input = '[{"meta":{"items":[{"n":2.370}],"before":1,"after":2}},{"meta":{"items":[],"before":1,"after":2}},{"meta":{"before":1,"items":[],"after":2}},{"meta":{"before":1,"after":2,"items":[]}},{"meta":{"items":null}},{"meta":{"other":0}},{"meta":null}]';
  const result = convert(input, { flatten: false, expandPath: "/meta/items", nullValue: "NULL" });
  assert.deepEqual(headersOf(result), ["meta"]);
  assert.equal(result.rows[0][0], '{"items":{"n":2.370},"before":1,"after":2}');
  for (const index of [1, 2, 3]) assert.deepEqual(JSON.parse(result.rows[index][0]), { before: 1, after: 2 });
  assert.equal(result.rows[4][0], "{}");
  assert.equal(result.rows[5][0], '{"other":0}');
  assert.equal(result.rows[6][0], "NULL");
  assert.equal(result.stats.nullCells, 1);
  assert.ok(warningHas(result, /4 serialized parent-object cell.*omit/));
  assertRoundtrip(result);
  assert.equal(convert(input, { flatten: false }).rows[0][0], '{"items":[{"n":2.370}],"before":1,"after":2}');
});

test("top-level unflattened expansion, root-array-row expansion and expanded null children have explicit semantics", () => {
  const top = convert('{"id":"A","items":[{"n":2.370},null]}', { flatten: false, expandPath: "/items", nullValue: "NULL" });
  assert.deepEqual(rowsOf(top), [["A", '{"n":2.370}'], ["A", "NULL"]]);
  assert.equal(top.stats.nullCells, 1);
  const rootArrays = convert('[[1,2],[],null,{"k":"v"}]', { expandPath: "", missingValue: "M" });
  assert.deepEqual(rowsOf(rootArrays), [["1", "M"], ["2", "M"], ["M", "M"], ["M", "M"], ["M", "v"]]);
  assert.equal(rootArrays.stats.outputRows, 5);
  assertRoundtrip(top);
  assertRoundtrip(rootArrays);
});

test("column edits are a complete immutable map, preserving order, disabled fields, raw names and paths", () => {
  const input = '[{"a":1,"b":2,"c":3},{"a":4,"b":5,"c":6}]';
  const original = convert(input);
  const supplied = columnsOf(original).reverse();
  supplied[0].header = " Z ";
  supplied[1].enabled = false;
  supplied[1].header = "";
  Object.freeze(supplied);
  supplied.forEach(Object.freeze);
  const result = convert(input, {}, "json", supplied);
  assert.deepEqual(headersOf(result), [" Z ", "a"]);
  assert.deepEqual(rowsOf(result), [["3", "1"], ["6", "4"]]);
  assert.deepEqual(columnsOf(result), supplied);
  assert.equal(result.stats.availableColumns, 3);
  assert.equal(result.stats.exportedColumns, 2);
  assert.equal(result.stats.numericCells, 4);
  assertRoundtrip(result);
});

test("unknown, duplicate, partial, empty and mismatched column maps are rejected", () => {
  const input = '{"a":1,"b":2}';
  const columns = columnsOf(convert(input));
  for (const supplied of [[], [columns[0]], [columns[0], columns[0]],
    [{ ...columns[0], id: "field:/unknown" }, columns[1]],
    [{ ...columns[0], path: "/wrong" }, columns[1]],
    [{ ...columns[0], enabled: "true" }, columns[1]],
    [{ ...columns[0], header: null }, columns[1]],
    [{ ...columns[0], extra: "PRIVATE_PAYLOAD" }, columns[1]],
    columns.map((column) => ({ ...column, enabled: false })),
    "PRIVATE_PAYLOAD", null, new Array(2),
  ]) rejects(() => convert(input, {}, "json", supplied), /column|Column|Enable/);
});

test("enabled headers must be nonblank and trim-unique, remain case-sensitive, and share one 1024-character cap", () => {
  const input = '{"a":1,"b":2}';
  const columns = columnsOf(convert(input));
  for (const headers of [["", "b"], [" \t\n", "b"], ["same", " same "], ["h".repeat(1_025), "b"]]) {
    rejects(() => convert(input, {}, "json", columns.map((column, index) => ({ ...column, header: headers[index] }))), /header|column/i);
  }
  assert.deepEqual(headersOf(convert(input, {}, "json", columns.map((column, index) => ({ ...column, header: index ? "A" : "a" })))), ["a", "A"]);
  const long = "a".repeat(1_024);
  const generated = convert(`{"${long}":1}`);
  assert.equal(generated.headers[0].length, 1_024);
  assertRoundtrip(convert(`{"${long}":1}`, {}, "json", columnsOf(generated)));
  rejects(() => convert(`{"${long}a":1}`), /generated column header/);
});

test("malformed options, inherited/accessor fields, enums and overlong replacements fail safely", () => {
  for (const changes of [{ flatten: 1 }, { arrayMode: "flatten" }, { joinSeparator: "a".repeat(33) },
    { nullValue: "a".repeat(101) }, { missingValue: "a".repeat(101) }, { delimiter: ":" },
    { delimiter: ",," }, { newline: "\r" }, { includeHeader: 1 }, { bom: "true" }, { quoteAll: null },
    { protectFormulas: "false" }, { rowPath: "/bad~2escape" }, { expandPath: 0 }, { unknown: "PRIVATE_PAYLOAD" }]) {
    rejects(() => convert("1", changes), /options/);
  }
  for (const value of [undefined, null, [], Object.create(DEFAULT_CSV_OPTIONS)]) {
    rejects(() => engine.convertJson("1", "json", value), /options/);
  }
  let calls = 0;
  const accessor = options();
  Object.defineProperty(accessor, "nullValue", { get() { calls++; throw new Error("PRIVATE_PAYLOAD"); } });
  rejects(() => engine.convertJson("1", "json", accessor), /options/);
  assert.equal(calls, 0);
  const proxy = new Proxy(options(), { ownKeys() { throw new Error("PRIVATE_PAYLOAD"); } });
  rejects(() => engine.convertJson("1", "json", proxy), /Unable to process/);
  for (const [input, format] of [[null, "json"], [1, "json"], ["1", "auto"], ["1", null]]) rejects(() => engine.inspectJson(input, format), /format/);
});

for (const delimiter of [",", ";", "\t", "|"]) {
  for (const newline of ["\r\n", "\n"]) {
    test(`independent CSV roundtrip: delimiter ${JSON.stringify(delimiter)}, newline ${JSON.stringify(newline)}`, () => {
      const values = ["comma,semicolon;pipe|tab\t", 'quote " and CR\rLF\nCRLF\r\n', " leading ", "", "é😀", "\ufeffinside"];
      const input = JSON.stringify([Object.fromEntries(values.map((value, index) => [`c${index}`, value]))]);
      const first = convert(input, { delimiter, newline });
      const columns = columnsOf(first).map((column, index) => ({ ...column, header: index ? column.header : `H${delimiter}"\r\nX` }));
      for (const quoteAll of [false, true]) for (const includeHeader of [false, true]) for (const bom of [false, true]) {
        const result = convert(input, { delimiter, newline, quoteAll, includeHeader, bom }, "json", columns);
        assertRoundtrip(result);
        if (quoteAll) assert.equal(result.csv[0], '"');
        assert.deepEqual(rowsOf(result), [values]);
      }
    });
  }
}

test("a headerless single empty field is quoted so blank records are not lost", () => {
  for (const input of ['""', "null", "[null]", "[null,null]"]) {
    const result = convert(input, { includeHeader: false, bom: false });
    assert.equal(result.csv, input === "[null,null]" ? '""\r\n""' : '""');
    assertRoundtrip(result);
  }
  assertRoundtrip(convert('[{"a":null,"b":null}]', { includeHeader: false }));
  assertRoundtrip(convert('"\ufeffdata"', { includeHeader: false, bom: false }));
});

test("formula detection covers Unicode/control prefixes and fullwidth operators without normalizing exported text", () => {
  const risky = ["=1+1", "+cmd", "-1", "@SUM(A1)", " \t\r\n=1", "\u00a0\u2003＋1", "\u200b\u0000\u2060＝1", "\u0085－1", "\ufeff＠x", "\u202e=1"];
  const safe = ["1", "00", "x=1", "'=1", " \tplain", "[=1]", "", "\t\r\n", "é😀"];
  const result = convert(JSON.stringify([...risky, ...safe]));
  assert.deepEqual(Array.from(result.rows, (row) => row[0]), [...risky.map((text) => `'${text}`), ...safe]);
  assert.equal(result.stats.formulaRiskFields, risky.length);
  assert.equal(result.stats.protectedFields, risky.length);
  assertRoundtrip(result);
});

test("negative numeric tokens are exempt but identical-looking JSON strings are protected", () => {
  const result = convert('[-1,"-1",-2.370,"-2.370",-2.3e+500,"-2.3e+500"]');
  assert.deepEqual(rowsOf(result), [["-1"], ["'-1"], ["-2.370"], ["'-2.370"], ["-2.3e+500"], ["'-2.3e+500"]]);
  assert.equal(result.stats.numericCells, 3);
  assert.equal(result.stats.formulaRiskFields, 3);
  assert.equal(result.stats.protectedFields, 3);
  assertRoundtrip(result);
});

test("formula mitigation includes exported headers and replacement cells; returned previews match CSV", () => {
  const input = '[{"a":"=1","b":null},{"a":null}]';
  const first = convert(input);
  const columns = columnsOf(first).map((column, index) => ({ ...column, header: index ? "\t＝H" : "=H" }));
  const result = convert(input, { nullValue: "+N", missingValue: "@M" }, "json", columns);
  assert.deepEqual(headersOf(result), ["'=H", "'\t＝H"]);
  assert.deepEqual(Array.from(result.columns, (column) => column.header), ["=H", "\t＝H"]);
  assert.deepEqual(rowsOf(result), [["'=1", "'+N"], ["'+N", "'@M"]]);
  assert.equal(result.stats.formulaRiskFields, 6);
  assert.equal(result.stats.protectedFields, 6);
  assert.equal(result.stats.nullCells, 2);
  assert.equal(result.stats.missingCells, 1);
  assertRoundtrip(result);
  const headerless = convert(input, { includeHeader: false, nullValue: "+N", missingValue: "@M" }, "json", columns);
  assert.equal(headerless.stats.formulaRiskFields, 4);
  assert.equal(headerless.stats.protectedFields, 4);
  assertRoundtrip(headerless);
  const excluded = convert(input, { nullValue: "+N", missingValue: "@M" }, "json", columns.map((column, index) => ({ ...column, enabled: index === 0 })));
  assert.equal(excluded.stats.formulaRiskFields, 3);
  assert.equal(excluded.stats.nullCells, 1);
  assert.equal(excluded.stats.missingCells, 0);
});

test("raw mode reports risks but does not mutate strings or allow Papa to protect numeric negatives", () => {
  const result = convert(JSON.stringify(["=1", "\t＠x", -1, "-1"]), { protectFormulas: false });
  assert.deepEqual(rowsOf(result), [["=1"], ["\t＠x"], ["-1"], ["-1"]]);
  assert.equal(result.stats.formulaRiskFields, 3);
  assert.equal(result.stats.protectedFields, 0);
  assert.ok(warningHas(result, /off; 3 formula-risk/));
  assertRoundtrip(result);
});

test("headers that would collide after formula protection are rejected rather than overwritten", () => {
  const input = '{"a":1,"b":2}';
  const columns = columnsOf(convert(input)).map((column, index) => ({ ...column, header: index ? "'=H" : "=H" }));
  rejects(() => convert(input, {}, "json", columns), /duplicate export headers/);
  assertRoundtrip(convert(input, { protectFormulas: false }, "json", columns));
});

test("null/missing collapse, lossless numeric limits and formula caveats are disclosed as bounded warnings", () => {
  const result = convert('[{"n":null},{}]');
  assert.ok(warningHas(result, /Null and missing.*blank/));
  assert.ok(warningHas(result, /not a universal safety guarantee/));
  assert.ok(warningHas(result, /strip apostrophes/));
  assert.ok(warningHas(result, /quotes and a BOM do not force text typing/));
  assert.ok(warningHas(result, /15 significant digits/));
  assert.ok(warningHas(convert("null", { nullValue: "N", missingValue: "N" }), /same replacement/));
  const many = convert(`[${Array.from({ length: 2_000 }, () => '{"a":[null],"b":[{}]}').join(",")}]`, { arrayMode: "join" });
  assert.ok(warningHas(many, /2000 array cell.*joined/));
  assert.ok(warningHas(many, /2000 array cell.*retained/));
  assert.ok(many.warnings.length < 10);
});

test("input character and actual UTF-8 byte limits are enforced before scanner or AST allocation", () => {
  const isolated = loadCore();
  rejects(() => isolated.engine.inspectJson(`"${"a".repeat(999_999)}"`, "json"), /1,000,000 UTF-16/, isolated.engine);
  rejects(() => isolated.engine.inspectJson(`"${"漢".repeat(699_050)}a"`, "json"), /2 MiB/, isolated.engine);
  assert.equal(isolated.counters.scans, 0);
  assert.equal(isolated.counters.parses, 0);
  assert.equal(inspect(`"${"a".repeat(999_998)}"`).inputChars, 1_000_000);
  assert.equal(inspect(`"${"漢".repeat(699_050)}"`).inputBytes, 2 * 1024 * 1024);
  assert.equal(inspect(JSON.stringify("word ".repeat(50_000))).rowPaths[0].rowCount, 1, "No invented similarity-tool word-count limit");
});

test("depth and cumulative token limits are checked for the whole input before recursive parsing", () => {
  assert.equal(inspect("[".repeat(40) + "0" + "]".repeat(40)).rowPaths[0].rowCount, 1);
  const isolated = loadCore();
  rejects(() => isolated.engine.inspectJson("[".repeat(41) + "0" + "]".repeat(41), "json"), /depth limit of 40/, isolated.engine);
  rejects(() => isolated.engine.inspectJson(`{}\n${"[".repeat(41)}0${"]".repeat(41)}`, "jsonl"), /line 2/, isolated.engine);
  rejects(() => isolated.engine.inspectJson(`[${"0,".repeat(99_999)}0]`, "json"), /200,000-token\/node/, isolated.engine);
  rejects(() => isolated.engine.inspectJson("0\n".repeat(200_000), "jsonl"), /200,000-token\/node/, isolated.engine);
  assert.equal(isolated.counters.parses, 0, "Even earlier valid JSONL lines must not parse before global preflight succeeds");
  assert.equal(inspect(`[${"0,".repeat(99_998)}0]`).rowPaths[0].rowCount, 99_999);
});

test("10,000 rows are permitted; source and expanded row overflows are errors, not partial CSV", () => {
  const result = convert(`[${"0,".repeat(9_999)}0]`, { includeHeader: false });
  assert.equal(result.stats.outputRows, 10_000);
  assertRoundtrip(result);
  beforeCsvFailure(`[${"0,".repeat(10_000)}0]`, {}, /10,000-row/);
  beforeCsvFailure(`[{"x":[${"0,".repeat(5_999)}0]},{"x":[${"0,".repeat(5_999)}0]}]`, { expandPath: "/x" }, /10,000-output-row/);
});

test("200 union columns and 250,000 exported cells are allowed exactly, with overflow checked before CSV", () => {
  const first = `{${Array.from({ length: 200 }, (_, index) => `"c${index}":${index}`).join(",")}}`;
  const extra = first.slice(0, -1) + ',"extra":1}';
  assert.equal(convert(first).stats.availableColumns, 200);
  beforeCsvFailure(extra, {}, /200-column/);
  const atLimit = `[${first},${Array.from({ length: 1_249 }, () => '{"c0":1}').join(",")}]`;
  const result = convert(atLimit);
  assert.equal(result.stats.outputRows * result.stats.exportedColumns, 250_000);
  assertRoundtrip(result);
  const tooMany = atLimit.slice(0, -1) + ',{"c0":1}]';
  beforeCsvFailure(tooMany, {}, /250,000-data-cell/);
  const reduced = columnsOf(convert(first)).map((column, index) => ({ ...column, enabled: index === 0 }));
  assert.equal(convert(tooMany, {}, "json", reduced).stats.exportedColumns, 1);
});

test("expanded parent strings are budgeted per exported row before materializing an enormous CSV", () => {
  const input = `{"blob":"${"x".repeat(900_000)}","items":[${"0,".repeat(9_999)}0]}`;
  beforeCsvFailure(input, { expandPath: "/items" }, /4,000,000-character/);
  const nested = `{"meta":{"blob":"${"x".repeat(900_000)}","items":[${"0,".repeat(9_999)}0]}}`;
  beforeCsvFailure(nested, { flatten: false, expandPath: "/meta/items" }, /4,000,000-character/);
});

test("joining is length-checked before a many-element custom separator can overrun the field budget", () => {
  const input = `{"blob":"${"x".repeat(850_000)}","repeat":[1,2],"list":[${'"",'.repeat(99_980)}""]}`;
  // This synthetic input is itself oversized; isolate the join budget with a
  // smaller valid source whose joined string repeats after a single expansion.
  assert.ok(input.length > JSON_CSV_LIMITS.inputChars);
  const valid = `{"repeat":[1,2,3,4],"list":[${'"",'.repeat(49_990)}""]}`;
  beforeCsvFailure(valid, { expandPath: "/repeat", arrayMode: "join", joinSeparator: "x".repeat(32) }, /4,000,000-character/);
});

test("4,000,000 output text characters are allowed exactly; headers and repeated values consume the same budget", () => {
  const base = convert('{"text":"x","items":[0]}', { expandPath: "/items" });
  const columns = columnsOf(base).map((column) => ({ ...column, enabled: column.path === "/text" }));
  const input = `{"text":"${"x".repeat(800_000)}","items":[0,0,0,0,0]}`;
  const result = convert(input, { expandPath: "/items", includeHeader: false, bom: false }, "json", columns);
  assert.equal(result.rows.reduce((total, row) => total + row[0].length, 0), 4_000_000);
  assert.equal(result.stats.downloadBytes, 4_000_008);
  beforeCsvFailure(input, { expandPath: "/items", includeHeader: true }, /4,000,000-character/, columns);
  const larger = input.replace('"text":"', '"text":"x');
  beforeCsvFailure(larger, { expandPath: "/items", includeHeader: false }, /4,000,000-character/, columns);
});

test("8 MiB output byte limit counts real UTF-8, quoting and optional download BOM before serialization", () => {
  const base = convert('{"text":"x","items":[0]}', { expandPath: "/items" });
  const columns = columnsOf(base).map((column) => ({ ...column, enabled: column.path === "/text", header: "X" }));
  const input = `{"text":"${"漢".repeat(559_240)}","items":[0,0,0,0,0]}`;
  const result = convert(input, { expandPath: "/items", newline: "\n", bom: false }, "json", columns);
  assert.equal(result.stats.downloadBytes, 8 * 1024 * 1024 - 2);
  assert.equal(Buffer.byteLength(result.csv, "utf8"), result.stats.downloadBytes);
  beforeCsvFailure(input, { expandPath: "/items", newline: "\n", bom: true }, /8 MiB/, columns);
  beforeCsvFailure(input, { expandPath: "/items", newline: "\n", bom: false, quoteAll: true }, /8 MiB/, columns);
});

test("pathological escaped/deep expansion paths use exact non-executable pointers and bounded field discovery", () => {
  const key = "~/".repeat(200);
  const input = `{"${key}":{"items":[{"x":1},{"x":2}]},"keep":true}`;
  const path = `${pointerOf(key)}/items`;
  const result = convert(input, { expandPath: path });
  assert.equal(result.stats.outputRows, 2);
  assert.equal(result.columns[0].path, `${path}/x`);
  assertRoundtrip(result);
  const long = "x".repeat(20_000);
  beforeCsvFailure(`{"${long}":[1,2]}`, {}, POINTER_ERROR);
  rejects(() => convert('{"x":[1]}', { expandPath: `/${long}` }), /options/);
});

test("provided samples convert with their exact contract paths and frozen ASTs", () => {
  for (const sample of core.load("samples").JSON_CSV_SAMPLES) {
    const settings = sample.id === "api" ? { rowPath: "/data/items" } : sample.id === "orders" ? { expandPath: "/items" } : {};
    const result = convert(sample.text, settings, sample.format);
    assertRoundtrip(result);
    assert.deepEqual(plain(result), plain(convert(sample.text, settings, sample.format)), "Conversions are stateless and do not mutate input ASTs");
  }
});

test("seeded adversarial strings roundtrip across all delimiters independently of Papa's reader", () => {
  let seed = 0x715c0de;
  const next = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed; };
  const alphabet = ["a", ",", ";", "|", "\t", "\r", "\n", '"', " ", "é", "😀", "=", "－", "\u0000", "\ufeff", "\\"];
  for (let trial = 0; trial < 128; trial++) {
    const values = Array.from({ length: 1 + next() % 8 }, () => Array.from({ length: next() % 25 }, () => alphabet[next() % alphabet.length]).join(""));
    const result = convert(JSON.stringify(values), { delimiter: [",", ";", "\t", "|"][next() % 4],
      newline: next() % 2 ? "\n" : "\r\n", includeHeader: !!(next() % 2), bom: !!(next() % 2),
      quoteAll: !!(next() % 2), protectFormulas: !!(next() % 2) });
    assertRoundtrip(result);
  }
});

test("worker responses have exact kinds and correlation IDs, with no stale conversion state", () => {
  const isolated = loadCore();
  isolated.load("worker");
  const send = (data) => isolated.context.onmessage({ data });
  send({ id: 12, kind: "inspect", input: '[{"a":1}]', format: "json" });
  send({ id: 10, kind: "convert", input: '"001"', format: "json", options: options() });
  send({ id: 0, kind: "convert", input: "[", format: "json", options: options() });
  send({ id: Number.MAX_SAFE_INTEGER, kind: "inspect", input: "true", format: "json" });
  assert.deepEqual(isolated.messages.map((message) => [message.id, message.kind]), [[12, "inspect"], [10, "convert"], [0, "error"], [Number.MAX_SAFE_INTEGER, "inspect"]]);
  assert.deepEqual(Object.keys(isolated.messages[0]).sort(), ["id", "inspection", "kind"]);
  assert.deepEqual(Object.keys(isolated.messages[1]).sort(), ["conversion", "id", "kind"]);
  assert.deepEqual(Object.keys(isolated.messages[2]).sort(), ["error", "id", "kind"]);
  assert.deepEqual(isolated.messages[1].conversion.rows, [["001"]]);
  assertRoundtrip(isolated.messages[1].conversion);
});

test("worker malformed envelopes and payloads never reflect input, execute getters or fabricate IDs", () => {
  const isolated = loadCore();
  isolated.load("worker");
  const send = (data) => isolated.context.onmessage({ data });
  for (const data of [null, undefined, [], "PRIVATE_PAYLOAD", {}, { id: -1 }, { id: NaN }, { id: Infinity },
    { id: 1.2 }, { id: "1" }, Object.create({ id: 1 })]) send(data);
  assert.equal(isolated.messages.length, 0);
  let called = 0;
  const getter = { id: 71, kind: "inspect", format: "json" };
  Object.defineProperty(getter, "input", { get() { called++; throw new Error("PRIVATE_PAYLOAD"); } });
  const bad = [getter, { id: 72, kind: "PRIVATE_PAYLOAD" }, { id: 73, kind: "inspect", input: 1, format: "json" },
    { id: 74, kind: "inspect", input: "{}", format: "json", extra: "PRIVATE_PAYLOAD" },
    { id: 75, kind: "convert", input: "{}", format: "json" },
    { id: 76, kind: "convert", input: "{}", format: "json", options: options(), columns: [] },
    { id: 77, kind: "inspect", input: "{}", format: "auto" }];
  for (const data of bad) send(data);
  assert.equal(called, 0);
  assert.deepEqual(isolated.messages.map((message) => message.id), bad.map((data) => data.id));
  for (const message of isolated.messages) {
    assert.equal(message.kind, "error");
    assert.doesNotMatch(message.error, /PRIVATE_PAYLOAD|<script>/);
    assert.equal(Object.keys(message).length, 3);
  }
});

test("unexpected parser, serializer and byte-estimator failures are sanitized in engine and worker", () => {
  for (const faults of [{ parserFailure: true }, { csvFailure: true }, { corruptCsv: true }]) {
    const isolated = loadCore(faults);
    rejects(() => isolated.engine.convertJson('{"a":1}', "json", options()), /Unable to process this JSON safely/, isolated.engine);
    isolated.load("worker");
    isolated.context.onmessage({ data: { id: 99, kind: "convert", input: '"PRIVATE_PAYLOAD"', format: "json", options: options() } });
    assert.deepEqual(isolated.messages, [{ id: 99, kind: "error", error: "Unable to process this JSON safely. Check the input and CSV settings." }]);
  }
});