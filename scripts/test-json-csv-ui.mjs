import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test, { afterEach } from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { parseDocument } from "htmlparser2";
import * as icons from "lucide-react";
import * as React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server.node";
import ts from "typescript";

// Offline, read-only contracts. Only allowlisted app modules execute in a VM;
// installed TypeScript, React, parsers and icons are trusted Node dependencies.
// No app env/config execution, DB, HTTP, app build, server or filesystem output.
// This is a test harness, not a hostile-code security sandbox.
// Page SSR substitutes the client; separate real-client SSR covers INITIAL UI
// only. Effects, events, Worker transport, clipboard, downloads, CSS, Next head
// resolution and PNG rasterization require the parent's browser/HTTP checks.
const require = createRequire(import.meta.url);
const jsonc = require("jsonc-parser");
const papa = require("papaparse");
const root = fileURLToPath(new URL("../", import.meta.url));
const files = Object.freeze({
  types: "src/lib/json-csv/types.ts",
  engine: "src/lib/json-csv/engine.ts",
  input: "src/lib/json-csv/input.ts",
  samples: "src/lib/json-csv/samples.ts",
  worker: "src/lib/json-csv/worker.ts",
  client: "src/app/tools/json-to-csv/json-to-csv-tool.tsx",
  page: "src/app/tools/json-to-csv/page.tsx",
  og: "src/app/tools/json-to-csv/opengraph-image.tsx",
  seo: "src/lib/tool-seo.tsx",
  config: "src/lib/config.ts",
  catalog: "src/lib/tool-catalog.ts",
  chat: "src/app/api/chat/route.ts",
  llms: "src/app/llms.txt/route.ts",
});
const executable = new Set(["types", "engine", "input", "samples", "worker", "client", "page", "og", "seo"]);
const sources = new Map();
const trees = new Map();
const compiled = new Map();
const importMetaReplacements = new Map();
const runtimes = [];
const plain = (value) => JSON.parse(JSON.stringify(value));
const collapse = (text) => text.replace(/\s+/g, " ").trim();

function source(name) {
  assert.ok(Object.hasOwn(files, name), "Unapproved source read");
  if (!sources.has(name)) sources.set(name, readFileSync(path.join(root, files[name]), "utf8"));
  return sources.get(name);
}

function tree(name) {
  if (!trees.has(name)) {
    const parsed = ts.createSourceFile(files[name], source(name), ts.ScriptTarget.Latest, true);
    assert.equal(parsed.parseDiagnostics.length, 0, `${name}: syntax diagnostics`);
    trees.set(name, parsed);
  }
  return trees.get(name);
}

function findNodes(node, predicate) {
  const found = [];
  function visit(current) {
    if (predicate(current)) found.push(current);
    ts.forEachChild(current, visit);
  }
  visit(node);
  return found;
}

function property(node, name) {
  assert.ok(ts.isObjectLiteralExpression(node), "Expected a static object literal");
  const matches = node.properties.filter((entry) => ts.isPropertyAssignment(entry)
    && (ts.isIdentifier(entry.name) || ts.isStringLiteral(entry.name)) && entry.name.text === name);
  assert.ok(matches.length <= 1, `Duplicate static property: ${name}`);
  return matches[0]?.initializer;
}

function literal(node) {
  assert.ok(node, "Missing literal value");
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (node.kind === ts.SyntaxKind.NullKeyword) return null;
  if (ts.isAsExpression(node) || ts.isSatisfiesExpression(node) || ts.isParenthesizedExpression(node)) return literal(node.expression);
  if (ts.isArrayLiteralExpression(node)) return node.elements.map(literal);
  if (ts.isObjectLiteralExpression(node)) {
    const entries = node.properties.map((entry) => {
      assert.ok(ts.isPropertyAssignment(entry), "Only literal properties may be extracted");
      assert.ok(ts.isIdentifier(entry.name) || ts.isStringLiteral(entry.name), "No computed property evaluation");
      return [entry.name.text, literal(entry.initializer)];
    });
    assert.equal(new Set(entries.map(([key]) => key)).size, entries.length, "Duplicate literal keys");
    return Object.fromEntries(entries);
  }
  assert.fail(`Nonliteral AST value is not executable: ${ts.SyntaxKind[node.kind]}`);
}

function initializer(name, symbol) {
  const matches = findNodes(tree(name), (node) => ts.isVariableDeclaration(node)
    && ts.isIdentifier(node.name) && node.name.text === symbol);
  assert.equal(matches.length, 1, `${name}: expected one ${symbol} declaration`);
  return matches[0].initializer;
}

function declaration(name, symbol) {
  const matches = findNodes(tree(name), (node) => ts.isFunctionDeclaration(node) && node.name?.text === symbol);
  assert.equal(matches.length, 1, `${name}: expected one ${symbol} function`);
  return matches[0];
}

function accessName(node) {
  if (ts.isIdentifier(node)) return node.text;
  if (ts.isPropertyAccessExpression(node)) return `${accessName(node.expression)}.${node.name.text}`;
  if (ts.isElementAccessExpression(node) && ts.isStringLiteral(node.argumentExpression)) {
    return `${accessName(node.expression)}.${node.argumentExpression.text}`;
  }
  return "";
}

const calls = (node, name) => findNodes(node, (entry) => ts.isCallExpression(entry) && accessName(entry.expression) === name);
const toolConfig = literal(initializer("page", "toolConfig"));
const urlDefault = property(initializer("config", "siteConfig"), "url");
assert.ok(ts.isBinaryExpression(urlDefault) && urlDefault.operatorToken.kind === ts.SyntaxKind.BarBarToken);
assert.equal(urlDefault.left.getText(tree("config")), "process.env.NEXT_PUBLIC_SITE_URL");
const productionOrigin = literal(urlDefault.right);
assert.equal(productionOrigin, "https://www.byteverse.fyi");
const canonical = `${productionOrigin}/tools/json-to-csv`;
const testModuleUri = "file:///__byteverse_json_csv_tests__/src/app/tools/json-to-csv/json-to-csv-tool.tsx";

function isImportMetaUrl(node) {
  return ts.isPropertyAccessExpression(node) && node.name.text === "url"
    && ts.isMetaProperty(node.expression) && node.expression.keywordToken === ts.SyntaxKind.ImportKeyword
    && node.expression.name.text === "meta";
}

function compile(name) {
  assert.ok(executable.has(name), "Only allowlisted app modules may be transpiled for execution");
  if (!compiled.has(name)) {
    let replacements = 0;
    const output = ts.transpileModule(source(name), {
      fileName: files[name], reportDiagnostics: true,
      compilerOptions: { target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, strict: true, isolatedModules: true },
      transformers: { before: [(context) => {
        function visit(node) {
          if (name === "client" && isImportMetaUrl(node)) {
            replacements++;
            return context.factory.createStringLiteral(testModuleUri);
          }
          return ts.visitEachChild(node, visit, context);
        }
        return (node) => ts.visitNode(node, visit);
      }] },
    });
    assert.equal(output.diagnostics?.length ?? 0, 0, `${name}: transpile diagnostics`);
    assert.equal(replacements, name === "client" ? 1 : 0, "Only the known worker-base import.meta.url is substituted");
    importMetaReplacements.set(name, replacements);
    compiled.set(name, output.outputText);
  }
  return compiled.get(name);
}

function createRuntime({ tracked = true } = {}) {
  const violations = [], messages = [], images = [], links = [];
  let placeholders = 0;
  const denied = (name) => () => {
    violations.push(name);
    throw new Error(`Blocked test capability: ${name}`);
  };
  const sandbox = { TextEncoder, TextDecoder, URL,
    postMessage: (message) => messages.push(structuredClone(message)) };
  for (const name of ["process", "fetch", "window", "document", "navigator", "XMLHttpRequest", "WebSocket",
    "EventSource", "Worker", "SharedWorker", "localStorage", "sessionStorage", "indexedDB", "caches",
    "FileReader", "DOMParser", "Image", "Blob", "console", "setTimeout", "clearTimeout", "setInterval",
    "clearInterval", "requestAnimationFrame"]) Object.defineProperty(sandbox, name, { get: denied(name) });
  const context = vm.createContext(sandbox, { codeGeneration: { strings: false, wasm: false } });
  const NativeLink = ({ children, ...props }) => {
    links.push(props.href);
    return React.createElement("a", props, children);
  };
  const ClientPlaceholder = () => {
    placeholders++;
    return React.createElement("section", { id: "json-csv-workspace", "data-test-placeholder": "true" });
  };
  class ImageResponseMock {
    constructor(element, options) {
      this.element = element; this.options = options;
      images.push(this);
    }
  }
  const imports = {
    types: {},
    input: { "./types": "types" },
    samples: {},
    engine: { "./types": "types", "jsonc-parser": jsonc, papaparse: papa },
    worker: { "./engine": "engine" },
    client: { react: React, "react/jsx-runtime": jsxRuntime, "lucide-react": icons,
      "@/lib/json-csv/input": "input", "@/lib/json-csv/types": "types", "@/lib/json-csv/samples": "samples", "./json-csv.css": {} },
    seo: { "react/jsx-runtime": jsxRuntime,
      // The alias is essential; the real config (and its app env) never runs.
      "@/lib/config": { siteConfig: Object.freeze({ url: productionOrigin }) } },
    page: { "react/jsx-runtime": jsxRuntime, "next/link": { __esModule: true, default: NativeLink },
      "lucide-react": { ArrowRight: icons.ArrowRight }, "@/lib/tool-seo": "seo",
      "./json-to-csv-tool": { JsonToCsvTool: ClientPlaceholder } },
    og: { "react/jsx-runtime": jsxRuntime, "next/og": { ImageResponse: ImageResponseMock } },
  };
  const cache = new Map();
  function resolveImport(parent, specifier) {
    if (!Object.hasOwn(imports, parent) || !Object.hasOwn(imports[parent], specifier)) return denied(`import:${parent}:${specifier}`)();
    const dependency = imports[parent][specifier];
    return typeof dependency === "string" ? load(dependency) : dependency;
  }
  function load(name) {
    if (!Object.hasOwn(imports, name)) return denied(`module:${name}`)();
    if (cache.has(name)) return cache.get(name).exports;
    const record = { exports: {} };
    cache.set(name, record);
    const wrapper = new vm.Script(`(function(exports, require, module) {\n${compile(name)}\n})`, { filename: files[name] }).runInContext(context);
    wrapper(record.exports, (specifier) => resolveImport(name, specifier), record);
    return record.exports;
  }
  const runtime = { load, resolveImport, context, violations, messages, images, links, cache, placeholders: () => placeholders };
  if (tracked) runtimes.push(runtime);
  return runtime;
}

afterEach(() => {
  for (const runtime of runtimes) assert.deepEqual(runtime.violations, [], "App code tried a forbidden capability, even if caught");
});

const runtime = createRuntime();
const { inputSizeProblem, readJsonFile, csvDownloadDetails, shortText, formatBytes } = runtime.load("input");
const engine = runtime.load("engine");
const { JSON_CSV_LIMITS: limits, DEFAULT_CSV_OPTIONS } = runtime.load("types");
const { JSON_CSV_SAMPLES: samples } = runtime.load("samples");
const settings = (changes = {}) => ({ ...DEFAULT_CSV_OPTIONS, ...changes });
const convert = (text, changes = {}, format = "json") => engine.convertJson(text, format, settings(changes));

function freeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}

function fakeFile(value, name = "fixture.json", { failure, size } = {}) {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : Uint8Array.from(value);
  let reads = 0;
  const file = Object.freeze({ name, size: size ?? bytes.byteLength, async arrayBuffer() {
    reads++;
    if (failure) throw failure;
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  } });
  return { file, bytes, reads: () => reads };
}

function elements(node, predicate = () => true) {
  const found = [];
  function visit(current) {
    if (current.name && predicate(current)) found.push(current);
    for (const child of current.children ?? []) visit(child);
  }
  visit(node);
  return found;
}

function textContent(node, visible = false) {
  if (visible && ["script", "style"].includes(node.name)) return "";
  if (node.type === "text") return node.data;
  return (node.children ?? []).map((child) => textContent(child, visible)).join("");
}

const byId = (dom, id) => {
  const matches = elements(dom, (node) => node.attribs.id === id);
  assert.equal(matches.length, 1, `Expected one #${id}`);
  return matches[0];
};
const visible = (dom) => collapse(textContent(dom, true));

test("harness denies app env, network, browser capabilities, routes and unapproved imports", () => {
  const isolated = createRuntime({ tracked: false });
  for (const expression of ["process.env", "fetch", "window", "document", "navigator", "localStorage", "indexedDB", "Worker", "setTimeout"]) {
    assert.throws(() => vm.runInContext(expression, isolated.context), /Blocked test capability|is not defined/);
    assert.equal(isolated.violations.at(-1), expression.split(".")[0]);
  }
  for (const name of ["config", "chat", "llms", "catalog", "../.env.local"]) {
    assert.throws(() => isolated.load(name), /Blocked test capability/);
  }
  for (const specifier of ["node:fs", "node:http", "node:https", "@/lib/db", "dotenv", "groq-sdk", "https://example.invalid/parser.js"]) {
    assert.throws(() => isolated.resolveImport("engine", specifier), /Blocked test capability/);
  }
  assert.throws(() => vm.runInContext("new Function('return 1')()", isolated.context), /Code generation from strings disallowed/);
  assert.throws(() => source(".env.local"), /Unapproved source read/);
});

test("AST extraction reads literals, not config expressions, calls, spreads or executable strings", () => {
  assert.throws(() => literal(urlDefault.left), /Nonliteral AST value/);
  for (const expression of ["fetch('https://example.invalid/')", "(() => 1)()", "({ ...other })", "({ ['computed']: 1 })", "({ a: 1, a: 2 })"]) {
    const parsed = ts.createSourceFile("fixture.ts", `const value = ${expression};`, ts.ScriptTarget.Latest, true);
    assert.throws(() => literal(parsed.statements[0].declarationList.declarations[0].initializer));
  }
  assert.equal(literal(property(initializer("page", "toolConfig"), "slug")), "json-to-csv");
  assert.ok(!runtime.cache.has("config"));
});

test("engine uses the actual installed jsonc-parser 3.3.1 and Papa Parse 5.7.0 packages", () => {
  assert.equal(require("jsonc-parser/package.json").version, "3.3.1");
  assert.equal(require("papaparse/package.json").version, "5.7.0");
  assert.strictEqual(runtime.resolveImport("engine", "jsonc-parser"), jsonc);
  assert.strictEqual(runtime.resolveImport("engine", "papaparse"), papa);
  assert.deepEqual(Object.keys(engine).sort(), ["JsonCsvError", "convertJson", "inspectJson"]);
});

test("input helper, engine and types pass a scoped no-emit DOM typecheck without an app tsconfig", () => {
  const program = ts.createProgram([files.input, files.engine, files.types].map((name) => path.join(root, name)), {
    target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler,
    lib: ["lib.esnext.d.ts", "lib.dom.d.ts", "lib.dom.iterable.d.ts"], types: [],
    esModuleInterop: true, strict: true, isolatedModules: true, skipLibCheck: true, incremental: false, noEmit: true,
  });
  const diagnostics = ts.getPreEmitDiagnostics(program);
  assert.equal(diagnostics.length, 0, ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCanonicalFileName: (name) => name, getCurrentDirectory: () => root, getNewLine: () => "\n",
  }));
  assert.deepEqual(program.getSourceFiles().filter((file) => !file.isDeclarationFile)
    .map((file) => path.basename(file.fileName)).sort(), ["engine.ts", "input.ts", "types.ts"]);
});

test("inputSizeProblem is size-only: it does not parse, trim, reject blanks or perform numeric arithmetic", () => {
  for (const text of ["", " \t\r\n", "\ufeff", "not JSON", "{", "😀 العربية 漢字", "9123372036854000123", "2.370", "1e999"]) {
    assert.equal(inputSizeProblem(text), null);
  }
});

test("1,000,000-character limit is inclusive and counts UTF-16, not Unicode code points", () => {
  assert.equal(limits.inputChars, 1_000_000);
  for (const text of ["a".repeat(limits.inputChars), "é".repeat(limits.inputChars), "😀".repeat(limits.inputChars / 2)]) {
    assert.equal(text.length, limits.inputChars);
    assert.ok(Buffer.byteLength(text, "utf8") <= limits.inputBytes);
    assert.equal(inputSizeProblem(text), null);
    assert.match(inputSizeProblem(`${text}x`), /1,000,000 characters.*previous input was kept.*nothing was truncated/);
  }
});

test("2 MiB input bound uses actual UTF-8 bytes, including BMP characters and unpaired surrogates", () => {
  assert.equal(limits.inputBytes, 2 * 1024 * 1024);
  for (const point of ["漢", "\ud800", "\udc00"]) {
    const exact = `${point.repeat(Math.floor(limits.inputBytes / 3))}aa`;
    assert.ok(exact.length < limits.inputChars);
    assert.equal(Buffer.byteLength(exact, "utf8"), limits.inputBytes);
    assert.equal(new TextEncoder().encode(exact).byteLength, limits.inputBytes);
    assert.equal(inputSizeProblem(exact), null);
    assert.match(inputSizeProblem(`${exact}a`), /2 MiB of UTF-8.*nothing was truncated/);
  }
});

test("native UTF-8 file reads preserve exact Unicode, whitespace, CRLF and bytes for all allowed extensions", async () => {
  const original = ' \t{"name":"Café e\u0301 العربية 漢字 𐐀 😀","n":2.370}\r\n';
  for (const [name, format] of [["a.json", "json"], ["b.JSON", "json"], ["a.jsonl", "jsonl"],
    ["b.JsOnL", "jsonl"], ["a.ndjson", "jsonl"], ["b.NDJSON", "jsonl"], ["a.txt", "json"], ["Café – نوٹ.TXT", "json"]]) {
    const fixture = fakeFile(original, name);
    const before = Uint8Array.from(fixture.bytes);
    assert.deepEqual(plain(await readJsonFile(fixture.file)), { text: original, format });
    assert.equal(fixture.reads(), 1);
    assert.deepEqual(fixture.bytes, before);
    assert.deepEqual(new TextEncoder().encode(original), before);
    assert.equal(fixture.file.name, name);
  }
});

test("JSON upload preserves the BOM exactly; only the real engine ignores one leading BOM with a warning", async () => {
  const original = '\ufeff{"id":"001","name":"Café 😀","n":2.370}\r\n';
  const fixture = fakeFile(original);
  const candidate = await readJsonFile(fixture.file);
  assert.equal(candidate.text, original);
  assert.deepEqual(Array.from(fixture.bytes.slice(0, 3)), [0xef, 0xbb, 0xbf]);
  const inspection = engine.inspectJson(candidate.text, candidate.format);
  assert.equal(inspection.inputChars, original.length);
  assert.equal(inspection.inputBytes, fixture.bytes.length);
  assert.ok(inspection.warnings.some((warning) => /One leading.*BOM/.test(warning)));
  assert.deepEqual(plain(convert(candidate.text).rows), [["001", "Café 😀", "2.370"]]);
  const doubled = await readJsonFile(fakeFile(`\ufeff${original}`).file);
  assert.equal(doubled.text, `\ufeff${original}`);
  assert.throws(() => engine.inspectJson(doubled.text, doubled.format), /JSON/);
});

test("JSONL and NDJSON uploads retain BOM bytes so the engine rejects them rather than silently fixing input", async () => {
  for (const extension of ["jsonl", "NDJSON"]) {
    for (const text of ['\ufeff{"n":1}\n', '{"n":1}\n\ufeff{"n":2}\n']) {
      const fixture = fakeFile(text, `records.${extension}`);
      const candidate = await readJsonFile(fixture.file);
      assert.equal(candidate.text, text);
      assert.equal(candidate.format, "jsonl");
      assert.deepEqual(new TextEncoder().encode(candidate.text), fixture.bytes);
      assert.throws(() => engine.inspectJson(candidate.text, candidate.format), /JSON/);
      assert.throws(() => convert(candidate.text, {}, candidate.format), /JSON/);
    }
  }
});

test("file byte limit accepts exactly 2 MiB of valid UTF-8 below the character cap and rejects larger files before reading", async () => {
  const exact = `"${"漢".repeat((limits.inputBytes - 2) / 3)}"`;
  const fixture = fakeFile(exact);
  assert.equal(fixture.file.size, limits.inputBytes);
  assert.ok(exact.length < limits.inputChars);
  const candidate = await readJsonFile(fixture.file);
  assert.ok(candidate.text === exact, "Exact-boundary input was changed");
  assert.equal(fixture.reads(), 1);
  assert.equal(engine.inspectJson(candidate.text, candidate.format).inputBytes, limits.inputBytes);
  const over = fakeFile(`${exact} `);
  await assert.rejects(readJsonFile(over.file), /exceeds the 2 MiB limit.*previous input was kept/);
  assert.equal(over.reads(), 0);
});

test("decoded actual byte size is checked even if a fake file under-reports its size", async () => {
  const fixture = fakeFile(`"${"漢".repeat(Math.floor(limits.inputBytes / 3))}x"`, "a.json", { size: 1 });
  assert.ok(fixture.bytes.length > limits.inputBytes);
  await assert.rejects(readJsonFile(fixture.file), /2 MiB of UTF-8.*nothing was truncated/);
  assert.equal(fixture.reads(), 1);
});

test("file character limit accepts exactly 1,000,000 units and rejects oversized decoded text without a partial candidate", async () => {
  const exact = `"${"x".repeat(limits.inputChars - 2)}"`;
  const candidate = await readJsonFile(fakeFile(exact).file);
  assert.ok(candidate.text === exact);
  const over = fakeFile(`${exact} `);
  assert.ok(over.bytes.length < limits.inputBytes);
  await assert.rejects(readJsonFile(over.file), /1,000,000 characters.*nothing was truncated/);
  assert.equal(over.reads(), 1);
});

test("unsupported and misleading file extensions are rejected without reading their bytes", async () => {
  for (const name of ["a.csv", "a.tsv", "a.xlsx", "a.xls", "a.pdf", "a.docx", "a.html", "a.svg", "a.exe",
    "a.json.exe", "a.json5", "a.jsonc", "a", "a.json.", "a.json ", "https://example.invalid/data.json?download=1"]) {
    const fixture = fakeFile('{"safe":true}', name);
    await assert.rejects(readJsonFile(fixture.file), /UTF-8 JSON, JSONL, NDJSON or TXT.*URLs and spreadsheet files cannot be imported/);
    assert.equal(fixture.reads(), 0, name);
  }
});

test("invalid UTF-8, truncated sequences, encoded surrogates and UTF-16 files fail with no replacement decoding", async () => {
  for (const bytes of [[0xc3, 0x28], [0xe2, 0x82], [0xf0, 0x9f, 0x98], [0xc0, 0xaf], [0xed, 0xa0, 0x80],
    [0xff, 0xfe, 0x7b, 0x00], [0xfe, 0xff, 0x00, 0x7b], [0xff, 0xd8, 0xff, 0xe0], [0x7b, 0x7d, 0xc3]]) {
    const fixture = fakeFile(bytes);
    await assert.rejects(readJsonFile(fixture.file), /could not be read as UTF-8/);
    assert.equal(fixture.reads(), 1);
    assert.deepEqual(Array.from(fixture.bytes), bytes);
  }
});

test("file read failures are sanitized and do not expose filenames or underlying errors", async () => {
  const fixture = fakeFile("{}", "PRIVATE_FILENAME.json", { failure: new Error("PRIVATE_READ_ERROR <script>secret</script>") });
  await assert.rejects(readJsonFile(fixture.file), (error) => {
    assert.match(error.message, /could not be read as UTF-8/);
    assert.doesNotMatch(error.message, /PRIVATE_|<script>|secret/);
    return true;
  });
  assert.equal(fixture.reads(), 1);
});

test("empty, whitespace-only and BOM-only uploads are rejected for every accepted format", async () => {
  for (const extension of ["json", "jsonl", "ndjson", "txt"]) {
    for (const text of ["", " \t\r\n", "\ufeff", "\ufeff \r\n\ufeff", "\u00a0\u2000\u3000"]) {
      const fixture = fakeFile(text, `empty.${extension}`);
      await assert.rejects(readJsonFile(fixture.file), /selected file is empty.*previous input was kept/);
      assert.equal(fixture.reads(), 1);
    }
  }
});

test("malformed nonblank JSON remains an exact candidate: the read helper does not parse or repair syntax", async () => {
  for (const text of ["{", '{"n":}', '{"a":1,"a":2}', '[1,]', '/* comment */{}', '{}{}', 'PRIVATE_NOT_JSON']) {
    const candidate = await readJsonFile(fakeFile(text).file);
    assert.deepEqual(plain(candidate), { text, format: "json" });
    assert.throws(() => engine.inspectJson(candidate.text, candidate.format), /JSON|Duplicate/);
  }
  assert.equal(calls(tree("input"), "JSON.parse").length, 0);
  assert.equal(calls(tree("input"), "inspectJson").length, 0);
});

test("actual worker validation rejects malformed imported candidates with one error and no partial inspection or conversion", async () => {
  const isolated = createRuntime();
  isolated.load("worker");
  let id = 100;
  for (const [name, text] of [["bad.json", '{"PRIVATE_FIELD":}'], ["bad.jsonl", '{"ok":1}\n{"PRIVATE_FIELD":}\n'],
    ["bad.ndjson", '{}\n\n{}'], ["bom.jsonl", '\ufeff{}\n']]) {
    const candidate = await readJsonFile(fakeFile(text, name).file);
    for (const kind of ["inspect", "convert"]) {
      const request = { id: id++, kind, input: candidate.text, format: candidate.format,
        ...(kind === "convert" ? { options: settings() } : {}) };
      const before = isolated.messages.length;
      isolated.context.onmessage({ data: structuredClone(request) });
      assert.equal(isolated.messages.length, before + 1);
      const response = isolated.messages.at(-1);
      assert.deepEqual(Object.keys(response).sort(), ["error", "id", "kind"]);
      assert.equal(response.id, request.id);
      assert.equal(response.kind, "error");
      assert.doesNotMatch(response.error, /PRIVATE_FIELD/);
      assert.equal(candidate.text, text);
    }
  }
});

test("actual worker validates then converts a valid imported candidate using the real engine", async () => {
  const isolated = createRuntime();
  isolated.load("worker");
  const candidate = await readJsonFile(fakeFile('{"n":2.370}\r\n{"n":9123372036854000123}\n', "numbers.ndjson").file);
  isolated.context.onmessage({ data: { id: 1, kind: "inspect", input: candidate.text, format: candidate.format } });
  isolated.context.onmessage({ data: { id: 2, kind: "convert", input: candidate.text, format: candidate.format, options: settings() } });
  assert.deepEqual(isolated.messages.map(({ id, kind }) => ({ id, kind })), [{ id: 1, kind: "inspect" }, { id: 2, kind: "convert" }]);
  assert.equal(isolated.messages[0].inspection.inputBytes, Buffer.byteLength(candidate.text));
  assert.deepEqual(isolated.messages[1].conversion.rows, [["2.370"], ["9123372036854000123"]]);
});

test("download filename trims, strips one CSV/TSV suffix, retains other suffixes and falls back when blank", () => {
  const result = freeze(convert('{"x":"value"}'));
  for (const [name, expected] of [["", "converted-data.csv"], [" \t ", "converted-data.csv"], [".", "converted-data.csv"],
    ["...", "converted-data.csv"], [".CSV", "converted-data.csv"], [".tsv", "converted-data.csv"],
    [" report.csv ", "report.csv"], ["report.TSV", "report.csv"], ["report.final.CSV", "report.final.csv"],
    ["report.json", "report.json.csv"], [" report... ", "report.csv"]]) {
    assert.equal(csvDownloadDetails(result, name).fileName, expected);
  }
});

test("download filename replaces slashes, Windows punctuation and control characters without treating the name as a path", () => {
  const result = convert("1");
  const forbidden = [...'<>:"/\\|?*', ...Array.from({ length: 32 }, (_, index) => String.fromCharCode(index)), "\u007f"];
  for (const character of forbidden) assert.equal(csvDownloadDetails(result, `before${character}after`).fileName, "before_after.csv");
  assert.equal(csvDownloadDetails(result, "../folder\\data").fileName, ".._folder_data.csv");
});

test("Windows ASCII device names fall back case-insensitively, including reserved names with extensions", () => {
  const result = convert("1");
  for (const name of ["CON", "prn", "aUx", "nul", "com1", "COM9", "lpt1", "LPT9", "con.backup", "AUX.notes.csv", "con .csv", "lPt4.TSV"]) {
    assert.equal(csvDownloadDetails(result, name).fileName, "converted-data.csv", name);
  }
});

test("normal Unicode filenames and nonreserved lookalikes are retained", () => {
  const result = convert("1");
  for (const name of ["console", "auxiliary", "COM0", "COM10", "LPT0", "LPT10", "my.CON", "Café e\u0301 – نوٹ 😀"]) {
    assert.equal(csvDownloadDetails(result, name).fileName, `${name}.csv`);
  }
});

test("ordinary filename bases are capped at 80 UTF-16 units before the selected output extension", () => {
  for (const delimiter of [",", "\t"]) {
    const result = convert("1", { delimiter });
    assert.equal(csvDownloadDetails(result, `${"a".repeat(120)}.csv`).fileName, `${"a".repeat(80)}.${delimiter === "\t" ? "tsv" : "csv"}`);
  }
});

// Deliberately strict regressions: do NOT turn genuine helper bugs into TODOs,
// skips or snapshots of broken output. The parent task owns application fixes.
test("filename regression: trailing dots/spaces must be normalized before removing an existing CSV/TSV extension", () => {
  const result = convert("1");
  const names = ["report.csv.", "report.CSV . ", "report.tsv..."];
  assert.deepEqual(names.map((name) => csvDownloadDetails(result, name).fileName), names.map(() => "report.csv"),
    "An existing export suffix must not become report.csv.csv or report.tsv.csv after trailing-name cleanup");
});

test("filename regression: length truncation must not reintroduce a trailing base dot or space", () => {
  const prefix = "a".repeat(79);
  const result = convert("1");
  assert.deepEqual([`${prefix}.tail`, `${prefix} tail`].map((name) => csvDownloadDetails(result, name).fileName),
    [`${prefix}.csv`, `${prefix}.csv`], "Trim the truncated base too, not only the untruncated input");
});

test("filename regression: Windows COM/LPT superscript-digit device aliases also require the safe fallback", () => {
  const names = ["COM¹", "com².csv", "COM³.log", "LPT¹.tsv", "lpt²", "LPT³.backup"];
  const result = convert("1");
  assert.deepEqual(names.map((name) => csvDownloadDetails(result, name).fileName), names.map(() => "converted-data.csv"),
    "Windows reserves superscript 1, 2 and 3 in COM/LPT device names as well as ASCII digits");
});

for (const delimiter of [",", ";", "\t", "|"]) {
  for (const bom of [false, true]) {
    test(`download ${JSON.stringify(delimiter)} delimiter / BOM ${bom}: exact result.csv bytes, MIME and matching extension`, async () => {
      const result = freeze(convert('[{"name":"Café 😀 العربية","value":"a,b;\\t|\\r\\n\\\"quoted\\\"","n":2.370}]', { delimiter, bom }));
      const before = plain(result);
      const details = csvDownloadDetails(result, "report.TSV");
      const tsv = delimiter === "\t";
      assert.equal(details.fileName, `report.${tsv ? "tsv" : "csv"}`);
      assert.equal(details.mime, `${tsv ? "text/tab-separated-values" : "text/csv"};charset=utf-8`);
      assert.equal(details.contents, `${bom ? "\ufeff" : ""}${result.csv}`);
      assert.notEqual(result.csv.charCodeAt(0), 0xfeff, "Copyable engine output must not acquire the download-only BOM");
      const bytes = Buffer.from(await new Blob([details.contents], { type: details.mime }).arrayBuffer());
      assert.deepEqual(bytes, Buffer.concat([bom ? Buffer.from([0xef, 0xbb, 0xbf]) : Buffer.alloc(0), Buffer.from(result.csv, "utf8")]));
      assert.equal(bytes.length, result.stats.downloadBytes);
      assert.deepEqual(papa.parse(result.csv, { delimiter, dynamicTyping: false }).data, plain([result.headers, ...result.rows]));
      assert.deepEqual(plain(result), before);
    });
  }
}

test("UTF-8 values and source number spelling survive import, conversion and download without numeric arithmetic", async () => {
  const text = '[{"id":"001","name":"Café e\u0301 😀 نوٹ","big":9123372036854000123,"decimal":2.370,"exp":2.3e+500,"negative":-1,"zero":-0}]';
  const candidate = await readJsonFile(fakeFile(text).file);
  const result = freeze(convert(candidate.text));
  assert.deepEqual(plain(result.rows), [["001", "Café e\u0301 😀 نوٹ", "9123372036854000123", "2.370", "2.3e+500", "-1", "-0"]]);
  assert.equal(result.stats.numericCells, 5);
  assert.equal(result.stats.formulaRiskFields, 0);
  assert.equal(csvDownloadDetails(result, "numbers").contents, `\ufeff${result.csv}`);
});

test("download exports the transformed result exactly, not raw input, reconstructed values or a shortened preview", () => {
  const result = freeze(convert(JSON.stringify([{ value: `=${"x".repeat(limits.previewChars + 10)}`, other: "-1" }])));
  assert.ok(result.csv.length > limits.previewChars);
  assert.equal(result.rows[0][0][0], "'");
  assert.equal(result.rows[0][1], "'-1");
  assert.equal(result.stats.protectedFields, 2);
  const details = csvDownloadDetails(result, "complete");
  assert.equal(details.contents.slice(1), result.csv);
  assert.equal(Buffer.byteLength(details.contents), result.stats.downloadBytes);
});

test("shortText preserves exact short text and truncates longer text with a separate ellipsis", () => {
  for (const text of ["", "abc", " \t\r\n", "<script>", "e\u0301"]) {
    assert.equal(shortText(text, text.length), text);
    assert.equal(shortText(text, text.length + 1), text);
  }
  assert.equal(shortText("abcdef", 3), "abc…");
  assert.equal(shortText("abcdef", 0), "…");
});

test("shortText guards astral characters at UTF-16 boundaries without claiming grapheme-cluster truncation", () => {
  for (const [text, max, expected] of [["A😀B", 2, "A…"], ["A😀B", 3, "A😀…"], ["A😀B", 4, "A😀B"],
    ["😀Z", 1, "…"], ["😀Z", 2, "😀…"], ["𐐀abc", 1, "…"], ["e\u0301x", 1, "e…"]]) {
    const shortened = shortText(text, max);
    assert.equal(shortened, expected);
    assert.equal(new TextDecoder().decode(new TextEncoder().encode(shortened)), shortened);
  }
});

test("formatBytes uses binary units with the current rounding rules", () => {
  for (const [bytes, expected] of [[0, "0 B"], [1, "1 B"], [1023, "1023 B"], [1024, "1 KiB"], [1536, "1.5 KiB"],
    [1024 * 1024 - 1, "1024 KiB"], [1024 * 1024, "1 MiB"], [1_310_720, "1.25 MiB"], [limits.inputBytes, "2 MiB"], [limits.outputBytes, "8 MiB"]]) {
    assert.equal(formatBytes(bytes), expected);
  }
});

const pageModule = runtime.load("page");
const pageDom = parseDocument(renderToStaticMarkup(React.createElement(pageModule.default)));
const visiblePage = visible(pageDom);
const schemaNodes = elements(pageDom, (node) => node.name === "script" && node.attribs.type === "application/ld+json");
const schemas = schemaNodes.map((node) => JSON.parse(textContent(node)));
const clientModule = runtime.load("client");
const clientDom = parseDocument(renderToStaticMarkup(React.createElement(clientModule.JsonToCsvTool)));

test("literal SEO config has a nonempty title at most 70 characters and description at most 160, not a quality score", (t) => {
  assert.equal(toolConfig.slug, "json-to-csv");
  assert.equal(toolConfig.name, "JSON to CSV Converter");
  assert.ok(toolConfig.title.trim().length > 0 && Array.from(toolConfig.title).length <= 70);
  assert.ok(toolConfig.description.trim().length > 0 && Array.from(toolConfig.description).length <= 160);
  assert.equal(toolConfig.applicationCategory, "DeveloperApplication");
  for (const keyword of ["json to csv", "nested json to csv", "jsonl to csv", "ndjson to csv", "json to tsv"]) assert.ok(toolConfig.keywords.includes(keyword));
  t.diagnostic(`Title: ${Array.from(toolConfig.title).length} characters; description: ${Array.from(toolConfig.description).length}. Length limits are contracts, not ranking or quality scores.`);
});

test("real page and tool-seo metadata retain the absolute title, production canonical and matching custom OG/Twitter image", () => {
  const { metadata } = pageModule;
  assert.deepEqual(plain(metadata.title), { absolute: toolConfig.title });
  assert.equal(metadata.description, toolConfig.description);
  assert.deepEqual(plain(metadata.keywords), toolConfig.keywords);
  assert.equal(metadata.alternates.canonical, canonical);
  assert.equal(metadata.openGraph.url, canonical);
  assert.equal(metadata.twitter.card, "summary_large_image");
  for (const social of [metadata.openGraph, metadata.twitter]) {
    assert.equal(social.title, toolConfig.title);
    assert.equal(social.description, toolConfig.description);
    assert.deepEqual(plain(social.images), [{ url: "/tools/json-to-csv/opengraph-image", width: 1200, height: 630, alt: literal(initializer("og", "alt")) }]);
  }
  assert.ok(runtime.cache.has("seo"));
  assert.ok(!runtime.cache.has("config"));
});

test("actual page SSR has one H1, no nested main, unique IDs and the exact mocked workspace anchor", (t) => {
  const headings = elements(pageDom, (node) => node.name === "h1");
  assert.equal(headings.length, 1);
  assert.equal(textContent(headings[0]), "JSON to CSV converter");
  assert.equal(elements(pageDom, (node) => node.name === "main").length, 0);
  const wrapped = parseDocument(renderToStaticMarkup(React.createElement("main", null, React.createElement(pageModule.default))));
  assert.equal(elements(wrapped, (node) => node.name === "main").length, 1);
  assert.equal(byId(pageDom, "json-csv-workspace").attribs["data-test-placeholder"], "true");
  assert.equal(elements(pageDom, (node) => node.name === "a" && node.attribs.href === "#json-csv-workspace").length, 1);
  const ids = elements(pageDom, (node) => Boolean(node.attribs.id)).map((node) => node.attribs.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const anchor of elements(pageDom, (node) => node.name === "a" && node.attribs.href?.startsWith("#"))) assert.ok(ids.includes(anchor.attribs.href.slice(1)));
  for (const href of ["/", "/tools", "/privacy", "/tools/invoice-pdf-to-excel"]) assert.ok(runtime.links.includes(href));
  assert.ok(runtime.placeholders() > 0);
  t.diagnostic("Real page + real tool-seo; JsonToCsvTool is an explicit section placeholder, Next Link is a native anchor, config supplies only the AST-read production fallback.");
});

test("all five visible FAQs exactly equal the config and real FAQPage JSON-LD", () => {
  const faq = byId(pageDom, "json-csv-faq");
  const faqSchemas = schemas.filter((schema) => schema["@type"] === "FAQPage");
  assert.equal(toolConfig.faqs.length, 5);
  assert.equal(faqSchemas.length, 1);
  assert.equal(faqSchemas[0].mainEntity.length, 5);
  assert.deepEqual(elements(faq, (node) => node.name === "h3").map((node) => textContent(node)), toolConfig.faqs.map(({ question }) => question));
  assert.deepEqual(elements(faq, (node) => node.name === "p").map((node) => textContent(node)), toolConfig.faqs.map(({ answer }) => answer));
  assert.deepEqual(faqSchemas[0].mainEntity.map((entry) => {
    assert.equal(entry["@type"], "Question");
    assert.equal(entry.acceptedAnswer["@type"], "Answer");
    return { question: entry.name, answer: entry.acceptedAnswer.text };
  }), toolConfig.faqs);
});

test("real schema has one free WebApplication, breadcrumbs and FAQs without fabricated ratings", () => {
  assert.equal(schemaNodes.length, 3);
  assert.deepEqual(schemas.map((schema) => schema["@type"]), ["WebApplication", "BreadcrumbList", "FAQPage"]);
  const app = schemas[0];
  assert.equal(app.name, toolConfig.name);
  assert.equal(app.url, canonical);
  assert.equal(app.description, toolConfig.description);
  assert.equal(app.applicationCategory, toolConfig.applicationCategory);
  assert.deepEqual(app.featureList, toolConfig.featureList);
  assert.equal(app.audience.audienceType, toolConfig.audience);
  assert.deepEqual(app.offers, { "@type": "Offer", price: "0", priceCurrency: "USD" });
  assert.equal(app.isAccessibleForFree, true);
  assert.deepEqual(schemas[1].itemListElement.map(({ position, item }) => ({ position, item })),
    [{ position: 1, item: productionOrigin }, { position: 2, item: `${productionOrigin}/tools` }, { position: 3, item: canonical }]);
  assert.doesNotMatch(JSON.stringify(schemas), /aggregateRating|ratingValue|ratingCount|reviewCount/);
});

test("visible page discloses strict formats, row/array semantics, numeric preservation, safety and local-processing limits", () => {
  for (const pattern of [/Root; it never guesses/, /wrapper metadata.*not exported/, /RFC 6901 JSON Pointer/, /~1 represents a slash/, /~0 a tilde/,
    /no Cartesian product/, /Empty, missing or null expansion values keep one parent row/, /joining scalar arrays.*not lossless/, /CSV does not preserve JSON types/,
    /Duplicate keys are rejected even when identical/, /Comments, trailing commas and JSON5 are unsupported/, /no blank interior lines or BOM/,
    /Ordinary JSON accepts one leading BOM with a warning/, /Import reads local files, never URLs/, /without numeric arithmetic/,
    /Excel can still remove leading zeros or retain only 15 significant digits/, /Quoting and a BOM do not force Text/,
    /BOM defaults on for downloads only; copy omits it/, /leaves actual negative JSON numbers unchanged/,
    /not a guarantee/, /No AI, conversion API or automatic workspace storage/, /Reload clears in-memory work, not copied text or downloaded files/,
    /Sitewide ads and analytics are separate/, /not a network-free-page guarantee/]) assert.match(visiblePage, pattern);
});

test("visible numerical limits and preview scope match the actual types instead of promising unlimited conversion", () => {
  const numerical = [["inputBytes", 2 * 1024 * 1024, /2 MiB UTF-8/], ["inputChars", 1_000_000, /1,000,000 UTF-16 characters/],
    ["depth", 40, /depth 40/], ["nodes", 200_000, /200,000 tokens\/nodes/], ["rows", 10_000, /10,000 output rows/],
    ["columns", 200, /200 columns/], ["cells", 250_000, /250,000 data cells/], ["dataChars", 4_000_000, /4,000,000 field characters/],
    ["outputBytes", 8 * 1024 * 1024, /8 MiB output/], ["rowPaths", 60, /60 row sources/], ["arrayPaths", 50, /50 array paths/],
    ["timeoutMs", 15_000, /15-second deadline, not a speed promise/], ["previewChars", 50_000, /Raw CSV preview stops at 50,000 characters/]];
  for (const [key, value, pattern] of numerical) { assert.equal(limits[key], value); assert.match(visiblePage, pattern); }
  assert.match(visiblePage, /initially 25 rows per page/);
  assert.match(visiblePage, /copy and download use the full result/);
  assert.match(visiblePage, /rejects the export, not silently truncates it/);
  assert.doesNotMatch(visiblePage, /\bunlimited\b|100% (?:private|safe|accurate)|guaranteed (?:rankings|spreadsheet safety)/i);
});

test("invoice PDF cross-link retains the exact paragraph and selectable-text/local-export/no-scans scope", () => {
  const anchors = elements(pageDom, (node) => node.name === "a" && node.attribs.href === "/tools/invoice-pdf-to-excel");
  assert.equal(anchors.length, 1);
  assert.equal(textContent(anchors[0]), "Invoice PDF to Excel");
  assert.equal(anchors[0].parent.name, "p");
  assert.equal(visible(anchors[0].parent), "Starting with invoice PDFs rather than JSON? Use Invoice PDF to Excel to review summary fields from selectable-text invoices and export XLSX or CSV locally. Scanned invoices are not supported.");
  assert.equal(anchors[0].parent.parent.attribs["aria-label"], "Working with invoice PDFs");
});

test("page's fictional JSON and CSV illustration actually agree with the installed engine", () => {
  const figure = elements(pageDom, (node) => node.name === "figure");
  assert.equal(figure.length, 1);
  const code = elements(figure[0], (node) => node.name === "code").map((node) => textContent(node));
  assert.equal(code.length, 2);
  const result = convert(code[0], { newline: "\n" });
  assert.equal(result.csv, code[1]);
  assert.deepEqual(plain(result.rows), [["Maya", "Bristol"], ["Leo", "Oslo"]]);
  assert.match(visible(figure[0]), /Fictional records/);
});

test("OG exports and real JSX match page metadata and fictional data (ImageResponse mocked, no PNG/network claim)", (t) => {
  const og = runtime.load("og");
  assert.equal(og.alt, literal(initializer("og", "alt")));
  assert.deepEqual(plain(og.size), { width: 1200, height: 630 });
  assert.equal(og.contentType, "image/png");
  const before = runtime.images.length;
  const image = og.default();
  assert.equal(runtime.images.length, before + 1);
  assert.strictEqual(runtime.images.at(-1), image);
  assert.deepEqual(plain(image.options), plain(og.size));
  const dom = parseDocument(renderToStaticMarkup(image.element));
  const text = visible(dom);
  for (const phrase of ["ByteVerse", "JSON to CSV converter", "name,location.city", "Maya,Bristol", "Leo,Oslo", "Fictional records"]) assert.ok(text.includes(phrase));
  assert.equal(elements(dom, (node) => ["img", "script", "link", "iframe"].includes(node.name)).length, 0);
  assert.equal(findNodes(tree("og"), (node) => ts.isNewExpression(node) && accessName(node.expression) === "ImageResponse").length, 1);
  t.diagnostic("Checks ImageResponse constructor count, arguments, JSX and exported metadata only. No fonts, Yoga fetch, PNG bytes or actual HTTP metadata are exercised.");
});

test("actual JsonToCsvTool initial SSR renders its workspace, empty editor and disabled actions without browser capabilities", (t) => {
  assert.equal(byId(clientDom, "json-csv-workspace").name, "section");
  assert.equal(byId(clientDom, "json-csv-workspace").attribs["aria-label"], "JSON to CSV workspace");
  assert.equal(byId(clientDom, "json-csv-workspace").attribs.translate, "no");
  assert.equal(elements(clientDom, (node) => node.name === "h1" || node.name === "main").length, 0);
  assert.equal(elements(clientDom, (node) => node.attribs["data-test-placeholder"]).length, 0);
  const editor = byId(clientDom, "jcsv-input");
  assert.equal(textContent(editor), "");
  assert.equal(editor.attribs.autocomplete, "off");
  for (const label of ["Inspect JSON", "Build CSV"]) {
    const buttons = elements(clientDom, (node) => node.name === "button" && visible(node) === label);
    assert.equal(buttons.length, 1);
    assert.ok(Object.hasOwn(buttons[0].attribs, "disabled"));
  }
  assert.equal(elements(clientDom, (node) => node.attribs["data-testid"] === "json-csv-result").length, 0);
  assert.ok(elements(clientDom, (node) => node.attribs.role === "status" && node.attribs["aria-live"] === "polite").length > 0);
  assert.equal(importMetaReplacements.get("client"), 1);
  t.diagnostic("Real client + React hooks render only the initial state. CSS is inert; only import.meta.url is replaced by a test URI. No Worker, effects, event handlers or hydration ran.");
});

test("initial client controls expose native local-file input, explicit JSON/JSONL format, labels and all real samples", () => {
  const uploads = elements(clientDom, (node) => node.name === "input" && node.attribs.type === "file");
  assert.equal(uploads.length, 1);
  assert.equal(uploads[0].attribs.accept, ".json,.jsonl,.ndjson,.txt");
  assert.equal(uploads[0].attribs["aria-label"], "Import JSON file");
  assert.deepEqual(elements(byId(clientDom, "jcsv-format"), (node) => node.name === "option").map((node) => node.attribs.value), ["json", "jsonl"]);
  assert.deepEqual(elements(byId(clientDom, "jcsv-example"), (node) => node.name === "option").map((node) => textContent(node)), Array.from(samples, (sample) => sample.label));
  for (const label of elements(clientDom, (node) => node.name === "label" && node.attribs.for)) byId(clientDom, label.attribs.for);
  assert.equal(elements(clientDom, (node) => node.name === "form").length, 0);
  assert.match(visible(clientDom), /No conversion server, no automatic storage/);
});

test("client AST retains the real module Worker URL, deadline, message correlation and cleanup", () => {
  const fn = declaration("client", "runWorker");
  const workers = findNodes(fn, (node) => ts.isNewExpression(node) && accessName(node.expression) === "Worker");
  assert.equal(workers.length, 1);
  const [url, options] = workers[0].arguments;
  assert.ok(ts.isNewExpression(url) && accessName(url.expression) === "URL");
  assert.equal(literal(url.arguments[0]), "../../../lib/json-csv/worker.ts");
  assert.ok(isImportMetaUrl(url.arguments[1]));
  assert.deepEqual(literal(options), { type: "module" });
  assert.equal(calls(fn, "instance.postMessage").length, 1);
  assert.equal(calls(fn, "instance.postMessage")[0].arguments[0].getText(tree("client")), "request");
  assert.match(fn.getText(tree("client")), /!mounted\.current \|\| revision\.current !== id \|\| event\.data\.id !== id/);
  assert.equal(calls(fn, "setTimeout")[0].arguments[1].getText(tree("client")), "JSON_CSV_LIMITS.timeoutMs");
  const stop = initializer("client", "stop");
  assert.ok(ts.isCallExpression(stop) && accessName(stop.expression) === "useCallback");
  assert.ok(ts.isArrowFunction(stop.arguments[0]));
  assert.equal(calls(stop.arguments[0], "worker.current.terminate").length, 1);
  assert.equal(calls(stop.arguments[0], "clearTimeout").length, 1);
  const effects = calls(tree("client"), "useEffect");
  assert.equal(effects.length, 1);
  assert.equal(calls(effects[0].arguments[0], "stop").length, 1, "Unmount cleanup terminates the pending worker");
});

test("client AST sends imported candidates for worker inspection before accepting or confirming replacement", () => {
  const fn = declaration("client", "importFile");
  assert.equal(calls(fn, "readJsonFile").length, 1);
  assert.equal(calls(fn, "runWorker").length, 1);
  const [request, task] = calls(fn, "runWorker")[0].arguments;
  assert.equal(literal(property(request, "kind")), "inspect");
  assert.equal(property(request, "input").getText(tree("client")), "candidate.text");
  assert.equal(property(request, "format").getText(tree("client")), "candidate.format");
  assert.equal(literal(task), "import");
  for (const setter of ["setInput", "setFormat", "setResult", "acceptCandidate", "invalidate"]) assert.equal(calls(fn, setter).length, 0);
  assert.match(fn.getText(tree("client")), /!mounted\.current \|\| revision\.current !== id/);
  const run = declaration("client", "runWorker");
  const branches = findNodes(run, (node) => ts.isIfStatement(node) && node.expression.getText(tree("client")) === 'response.kind === "inspect"');
  assert.equal(branches.length, 1);
  assert.equal(calls(branches[0].thenStatement, "acceptCandidate").length, 1);
  assert.equal(calls(branches[0].thenStatement, "setConfirmation").length, 1);
  const errors = findNodes(run, (node) => ts.isIfStatement(node) && node.expression.getText(tree("client")) === 'response.kind === "error"');
  assert.equal(errors.length, 1);
  assert.equal(calls(errors[0].thenStatement, "acceptCandidate").length, 0);
  assert.equal(findNodes(errors[0].thenStatement, ts.isReturnStatement).length, 1);
});

test("client AST copies exact BOM-free result.csv and downloads only the helper's full contents", () => {
  const copy = declaration("client", "copy");
  const writes = calls(copy, "navigator.clipboard.writeText");
  assert.equal(writes.length, 1);
  assert.equal(writes[0].arguments[0].getText(tree("client")), "current.csv");
  const captured = findNodes(copy, (node) => ts.isVariableDeclaration(node) && node.name.getText(tree("client")) === "current");
  assert.equal(captured.length, 1);
  assert.equal(captured[0].initializer.getText(tree("client")), "result");
  assert.equal(calls(copy, "csvDownloadDetails").length, 0);
  const download = declaration("client", "download");
  const helper = calls(download, "csvDownloadDetails");
  assert.equal(helper.length, 1);
  assert.deepEqual(helper[0].arguments.map((node) => node.getText(tree("client"))), ["result", "fileName"]);
  const blobs = findNodes(download, (node) => ts.isNewExpression(node) && accessName(node.expression) === "Blob");
  assert.equal(blobs.length, 1);
  assert.equal(blobs[0].arguments[0].getText(tree("client")), "[output.contents]");
  assert.equal(property(blobs[0].arguments[1], "type").getText(tree("client")), "output.mime");
  assert.equal(calls(download, "URL.revokeObjectURL").length, 1);
});

function forbiddenCode(parsed) {
  const denied = new Set(["process", "fetch", "XMLHttpRequest", "WebSocket", "EventSource", "sendBeacon", "localStorage",
    "sessionStorage", "indexedDB", "caches", "serviceWorker", "cookie", "credentials", "getSession", "useSession",
    "signIn", "signOut", "eval", "Function", "require"]);
  const violations = [];
  for (const node of findNodes(parsed, (entry) => ts.isIdentifier(entry) || ts.isPropertyAccessExpression(entry)
    || ts.isElementAccessExpression(entry) || ts.isCallExpression(entry))) {
    if (ts.isIdentifier(node) && denied.has(node.text)) violations.push(node.text);
    if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
      const name = accessName(node);
      if (denied.has(name.split(".").at(-1)) || /(?:^|\.)JSON\.parse$/.test(name)) violations.push(name);
    }
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) violations.push("dynamic import");
  }
  return [...new Set(violations)];
}

test("AST contract checks ignore JSON.parse/network-shaped strings and comments but detect executable calls or aliases", () => {
  const parse = (text) => ts.createSourceFile("fixture.ts", text, ts.ScriptTarget.Latest, true);
  assert.deepEqual(forbiddenCode(parse('// JSON.parse(fetch(input))\nconst example = "JSON.parse(input)"; const out = JSON.stringify({ parse: "data" });')), []);
  for (const text of ["JSON.parse(input)", "const parse = JSON['parse']", "globalThis.fetch(url)", "globalThis['fetch'](url)",
    "navigator.sendBeacon(url, input)", "localStorage.setItem('x', input)", "process.env.TOKEN", "new Function(input)", "import(url)"]) {
    assert.ok(forbiddenCode(parse(text)).length > 0, text);
  }
});

test("conversion source graph contains no fetch, auth, app-env, storage, JSON.parse or dynamic-code entry points", () => {
  const allowed = {
    types: [], input: ["./types"], samples: ["./types"], worker: ["./engine", "./types"],
    engine: ["jsonc-parser", "papaparse", "./types"],
    client: ["react", "lucide-react", "@/lib/json-csv/input", "@/lib/json-csv/samples", "@/lib/json-csv/types", "./json-csv.css"],
  };
  for (const [name, specifiers] of Object.entries(allowed)) {
    for (const entry of findNodes(tree(name), ts.isImportDeclaration)) {
      assert.ok(ts.isStringLiteral(entry.moduleSpecifier));
      assert.ok(specifiers.includes(entry.moduleSpecifier.text), `${name}: unexpected import ${entry.moduleSpecifier.text}`);
    }
    assert.deepEqual(forbiddenCode(tree(name)), [], `${name}: forbidden executable capability`);
    assert.equal(tree(name).statements.filter((node) => ts.isExpressionStatement(node)
      && ts.isStringLiteral(node.expression) && node.expression.text === "use server").length, 0);
  }
  assert.equal(calls(tree("engine"), "JSON.stringify").length, 1, "JSON.stringify for escaped header keys is data serialization, not numeric parsing");
});

test("converter has no dedicated backend route or automatic HTML form submission; unrelated site APIs are not executed", () => {
  for (const name of ["src/app/api/json-to-csv", "src/app/api/tools/json-to-csv", "src/app/tools/json-to-csv/route.ts"]) {
    assert.equal(existsSync(path.join(root, name)), false, `Unexpected converter route: ${name}`);
  }
  assert.equal(elements(clientDom, (node) => node.name === "form" || Object.hasOwn(node.attribs, "action") || Object.hasOwn(node.attribs, "formaction")).length, 0);
  for (const name of ["config", "chat", "llms", "catalog"]) assert.ok(!runtime.cache.has(name));
});

for (const [id, options, rowCount] of [["people", {}, 3], ["api", { rowPath: "/data/items" }, 2],
  ["orders", { expandPath: "/items" }, 3], ["lines", {}, 3]]) {
  test(`real fictional ${id} sample inspects and converts with its advertised row/array choice`, () => {
    const matches = samples.filter((sample) => sample.id === id);
    assert.equal(matches.length, 1);
    const sample = matches[0];
    const inspection = engine.inspectJson(sample.text, sample.format);
    assert.equal(inspection.inputBytes, Buffer.byteLength(sample.text));
    const result = convert(sample.text, options, sample.format);
    assert.equal(result.stats.outputRows, rowCount);
    if (id === "api") {
      assert.equal(result.rows[0][0], "9123372036854000123");
      assert.equal(result.rows[0].at(-1), "2.370");
      assert.ok(!result.headers.includes("page"));
    }
    if (id === "people") assert.equal(result.rows[0][0], "001");
  });
}

test("TXT import honors the selected format while explicit JSON and JSONL extensions remain authoritative", async () => {
  const text = '{"id":1}\n{"id":2}\n';
  const candidate = await readJsonFile(fakeFile(text, "records.txt").file, "jsonl");
  assert.equal(candidate.format, "jsonl");
  assert.equal(engine.inspectJson(candidate.text, candidate.format).rowPaths[0].rowCount, 2);
  assert.equal((await readJsonFile(fakeFile("{}", "data.json").file, "jsonl")).format, "json");
  assert.equal((await readJsonFile(fakeFile(text, "data.ndjson").file, "json")).format, "jsonl");
});

function descriptor(name, slug) {
  const key = name === "llms" ? "href" : "slug";
  const expected = name === "llms" ? `/tools/${slug}` : slug;
  const matches = findNodes(tree(name), (node) => ts.isObjectLiteralExpression(node)
    && property(node, key) && ts.isStringLiteral(property(node, key)) && property(node, key).text === expected);
  assert.equal(matches.length, 1, `${name}: expected one ${slug} descriptor`);
  const fields = name === "catalog" ? ["slug", "name", "description", "category", "icon", "color", "bg"]
    : name === "chat" ? ["slug", "name", "desc", "keywords"] : ["name", "href", "desc"];
  return Object.fromEntries(fields.map((field) => {
    const node = property(matches[0], field);
    assert.ok(node, `${name}: missing ${field}`);
    if (field === "icon") { assert.ok(ts.isIdentifier(node)); return [field, node.text]; }
    return [field, literal(node)];
  }));
}

for (const name of ["catalog", "chat", "llms"]) {
  test(`${name}: unique JSON/CSV descriptor uses the appropriate required fields and accurate local scope`, () => {
    const entry = descriptor(name, "json-to-csv");
    assert.equal(entry.name, toolConfig.name);
    assert.equal(entry.slug ?? entry.href, name === "llms" ? "/tools/json-to-csv" : "json-to-csv");
    const description = name === "catalog" ? entry.description : entry.desc;
    for (const pattern of [/JSON or JSON Lines/, /CSV locally/, /row/, /nested/, /flatten/, /one array|expand one array/, /formula-risk protection/]) assert.match(description, pattern);
    if (name === "catalog") {
      assert.equal(entry.category, "Encoders & Converters");
      assert.equal(entry.icon, "Table2");
      assert.match(description, /preview columns/);
    } else assert.match(description, /No AI or URL import/);
    if (name === "chat") {
      assert.match(entry.desc, /paste data in the converter, not this chat/);
      assert.ok(entry.keywords.every((keyword) => typeof keyword === "string" && keyword.trim()));
      assert.equal(new Set(entry.keywords).size, entry.keywords.length);
      for (const keyword of ["json", "csv", "jsonl", "ndjson", "nested", "flatten", "tsv"]) assert.ok(entry.keywords.includes(keyword));
    }
    if (name === "llms") assert.match(description, /edit columns/);
    assert.ok(!runtime.cache.has(name), "Shared catalog/routes are AST-only; no env, DB or chat execution");
  });
}

// Only the three observed similarity descriptors are pinned, not whole files,
// unrelated catalog entries, git history, or undocumented repository hashes.
const similarityBefore = {
  catalog: { slug: "plagiarism-checker", name: "Text Similarity Checker",
    description: "Compare a draft with up to five supplied sources, review matching phrases or repeated sentences locally. No web scan or originality verdict.",
    category: "Content Analysis", icon: "FileSearch", color: "text-rose-500", bg: "bg-rose-500/10" },
  chat: { slug: "plagiarism-checker", name: "Text Similarity Checker",
    desc: "Compare a draft with 1–5 supplied sources or find repeated sentences locally; review phrase evidence and save TXT reports. No web scan, AI or plagiarism verdict. Paste text in the tool, not this chat.",
    keywords: ["plagiarism", "copy", "duplicate", "similarity", "check", "naqal", "cheating", "original"] },
  llms: { name: "Text Similarity Checker", href: "/tools/plagiarism-checker",
    desc: "Compare one draft with 1–5 supplied sources locally, or find repeated sentences in a draft; review phrase evidence and save TXT reports. No web scan, AI or originality verdict" },
};
for (const name of ["catalog", "chat", "llms"]) {
  test(`${name}: existing similarity entry is unchanged from the observed context`, () => {
    assert.deepEqual(descriptor(name, "plagiarism-checker"), similarityBefore[name]);
  });
}

test("JSON/CSV related links retain the invoice route and do not alter the existing similarity recommendations", () => {
  const related = initializer("catalog", "relatedToolSlugs");
  const json = literal(property(related, "json-to-csv"));
  assert.deepEqual(json, ["json-formatter", "json-to-typescript", "diff-checker", "invoice-pdf-to-excel"]);
  assert.ok(literal(property(related, "invoice-pdf-to-excel")).includes("json-to-csv"));
  assert.deepEqual(literal(property(related, "plagiarism-checker")), ["diff-checker", "word-counter", "readability-checker", "plagiarism-remover"]);
});