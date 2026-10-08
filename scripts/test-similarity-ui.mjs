import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test, { afterEach } from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { parseDocument } from "htmlparser2";
import { ArrowRight } from "lucide-react";
import * as React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server.node";
import ts from "typescript";

// App code runs only in an allowlisted VM; trusted React/parser packages run in Node.
const root = fileURLToPath(new URL("../", import.meta.url));
const files = Object.freeze({
  types: "src/lib/similarity/types.ts",
  engine: "src/lib/similarity/engine.ts",
  input: "src/lib/similarity/input.ts",
  report: "src/lib/similarity/report.ts",
  review: "src/lib/similarity/review.ts",
  samples: "src/lib/similarity/samples.ts",
  worker: "src/lib/similarity/worker.ts",
  highlights: "src/app/tools/plagiarism-checker/text-highlights.tsx",
  client: "src/app/tools/plagiarism-checker/plagiarism-tool.tsx",
  page: "src/app/tools/plagiarism-checker/page.tsx",
  og: "src/app/tools/plagiarism-checker/opengraph-image.tsx",
  css: "src/app/tools/plagiarism-checker/similarity.css",
  theme: "src/app/globals.css",
  api: "src/app/api/ai-plagiarism-check/route.ts",
  seo: "src/lib/tool-seo.tsx",
  config: "src/lib/config.ts",
  catalog: "src/lib/tool-catalog.ts",
  home: "src/app/page.tsx",
  llms: "src/app/llms.txt/route.ts",
  chat: "src/app/api/chat/route.ts",
});
const sourceCache = new Map();
const treeCache = new Map();
const compiled = new Map();
const runtimes = [];
const plain = (value) => JSON.parse(JSON.stringify(value));
const collapse = (value) => value.replace(/\s+/g, " ").trim();

function source(name) {
  assert.ok(Object.hasOwn(files, name), "Unapproved source-file read");
  if (!sourceCache.has(name)) sourceCache.set(name, readFileSync(path.join(root, files[name]), "utf8"));
  return sourceCache.get(name);
}

function tree(name) {
  if (!treeCache.has(name)) {
    const parsed = ts.createSourceFile(files[name], source(name), ts.ScriptTarget.Latest, true);
    assert.equal(parsed.parseDiagnostics.length, 0, `${name}: parse diagnostics`);
    treeCache.set(name, parsed);
  }
  return treeCache.get(name);
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
  assert.ok(node, "Missing static value");
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (node.kind === ts.SyntaxKind.NullKeyword) return null;
  if (ts.isAsExpression(node) || ts.isSatisfiesExpression(node) || ts.isParenthesizedExpression(node)) return literal(node.expression);
  if (ts.isArrayLiteralExpression(node)) return node.elements.map(literal);
  if (ts.isObjectLiteralExpression(node)) {
    return Object.fromEntries(node.properties.map((entry) => {
      assert.ok(ts.isPropertyAssignment(entry), "Only literal properties may be extracted");
      assert.ok(ts.isIdentifier(entry.name) || ts.isStringLiteral(entry.name));
      return [entry.name.text, literal(entry.initializer)];
    }));
  }
  assert.fail(`Nonliteral AST value is not executable: ${ts.SyntaxKind[node.kind]}`);
}

function initializer(name, symbol) {
  const matches = findNodes(tree(name), (node) => ts.isVariableDeclaration(node)
    && ts.isIdentifier(node.name) && node.name.text === symbol);
  assert.equal(matches.length, 1, `${name}: expected one ${symbol} declaration`);
  return matches[0].initializer;
}

const toolConfig = literal(initializer("page", "toolConfig"));
const urlDefault = property(initializer("config", "siteConfig"), "url");
assert.ok(ts.isBinaryExpression(urlDefault) && urlDefault.operatorToken.kind === ts.SyntaxKind.BarBarToken);
assert.equal(urlDefault.left.getText(tree("config")), "process.env.NEXT_PUBLIC_SITE_URL");
const productionOrigin = literal(urlDefault.right);
assert.equal(productionOrigin, "https://www.byteverse.fyi");
const canonical = `${productionOrigin}/tools/plagiarism-checker`;

function compile(name) {
  if (!compiled.has(name)) {
    const output = ts.transpileModule(source(name), {
      fileName: files[name],
      reportDiagnostics: true,
      compilerOptions: {
        target: ts.ScriptTarget.ES2017,
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
        strict: true,
        isolatedModules: true,
      },
    });
    assert.equal(output.diagnostics?.length ?? 0, 0, `${name}: transpile diagnostics`);
    compiled.set(name, output.outputText);
  }
  return compiled.get(name);
}

function createRuntime({ allowUrls = true, tracked = true } = {}) {
  const violations = [];
  const responses = [];
  const blocked = (name) => () => {
    violations.push(name);
    throw new Error(`Blocked test capability: ${name}`);
  };
  const sandbox = { TextDecoder };
  for (const name of ["process", "fetch", "window", "document", "navigator", "XMLHttpRequest", "WebSocket", "EventSource", "Worker", "localStorage", "sessionStorage", "indexedDB", "caches", "DOMParser", "FileReader", "Image", "console"]) {
    Object.defineProperty(sandbox, name, { get: blocked(name) });
  }
  for (const [name, value] of [["URL", URL], ["URLSearchParams", URLSearchParams]]) {
    Object.defineProperty(sandbox, name, allowUrls ? { value } : { get: blocked(name) });
  }
  const context = vm.createContext(sandbox, { codeGeneration: { strings: false, wasm: false } });
  const NativeLink = ({ children, ...props }) => React.createElement("a", props, children);
  const WorkspacePlaceholder = () => React.createElement("section", { id: "similarity-workspace", "data-test-placeholder": "true" });
  class ImageResponseMock {
    constructor(element, options) { this.element = element; this.options = options; }
  }
  const NextResponseMock = Object.freeze({
    json(body, init) {
      responses.push({ body: plain(body), init: plain(init) });
      return Response.json(body, init);
    },
  });
  const imports = {
    types: {},
    engine: { "./types": "types" },
    input: { "./engine": "engine", "./types": "types" },
    report: {},
    review: {},
    highlights: { react: React, "react/jsx-runtime": jsxRuntime, "@/lib/similarity/review": "review" },
    seo: {
      "react/jsx-runtime": jsxRuntime,
      // Read the production fallback as an AST literal; never evaluate app config/env.
      "@/lib/config": { siteConfig: Object.freeze({ url: productionOrigin }) },
    },
    page: {
      "react/jsx-runtime": jsxRuntime,
      "next/link": { __esModule: true, default: NativeLink },
      "lucide-react": { ArrowRight },
      "@/lib/tool-seo": "seo",
      "./plagiarism-tool": { PlagiarismTool: WorkspacePlaceholder },
    },
    api: { "next/server": { NextResponse: NextResponseMock } },
    og: { "react/jsx-runtime": jsxRuntime, "next/og": { ImageResponse: ImageResponseMock } },
  };
  const cache = new Map();
  function resolveImport(parent, specifier) {
    if (!Object.hasOwn(imports[parent], specifier)) return blocked(`import:${parent}:${specifier}`)();
    const dependency = imports[parent][specifier];
    return typeof dependency === "string" ? load(dependency) : dependency;
  }
  function load(name) {
    if (!Object.hasOwn(imports, name)) return blocked(`module:${name}`)();
    if (cache.has(name)) return cache.get(name).exports;
    const record = { exports: {} };
    cache.set(name, record);
    const wrapper = new vm.Script(`(function(exports, require, module) {\n${compile(name)}\n})`, {
      filename: files[name],
    }).runInContext(context);
    wrapper(record.exports, (specifier) => resolveImport(name, specifier), record);
    return record.exports;
  }
  const runtime = { load, resolveImport, context, violations, responses, cache };
  if (tracked) runtimes.push(runtime);
  return runtime;
}

afterEach(() => {
  for (const runtime of runtimes) assert.deepEqual(runtime.violations, [], "App code tried a forbidden capability, even if caught");
});

const runtime = createRuntime();
const { inputProblem, readTextFile, manualSearchUrl } = runtime.load("input");
const engine = runtime.load("engine");
const { SIMILARITY_LIMITS: limits, DEFAULT_MATCH_OPTIONS } = runtime.load("types");
const { buildComparisonHtmlReport, buildComparisonReport, formatCoverage, REVIEW_LABELS } = runtime.load("report");
const { selectPassages, passageContext } = runtime.load("review");
const { PassageContext, TextHighlights } = runtime.load("highlights");
const options = Object.freeze({ ...DEFAULT_MATCH_OPTIONS, minWords: 4 });
const supplied = (text, index = 0, label = `Source ${index + 1}`) => ({ id: `fixture-${index + 1}`, label, text });
const compareSnapshot = (draft, texts, settings = {}, reviews = {}) => {
  const sources = texts.map((entry, index) => typeof entry === "string" ? supplied(entry, index) : entry);
  return { draft, sources, result: engine.compareSources(draft, sources, { ...options, ...settings }), reviews };
};
const repeatSnapshot = (draft, settings = {}, reviews = {}) => ({
  draft, sources: [], result: engine.findRepeatedSentences(draft, { ...options, ...settings }), reviews,
});

function freeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}

function fakeFile(value, name = "fixture.txt", failure) {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : Uint8Array.from(value);
  let reads = 0;
  const file = Object.freeze({
    name,
    size: bytes.byteLength,
    async arrayBuffer() {
      reads++;
      if (failure) throw failure;
      return bytes.buffer;
    },
  });
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

function renderHighlights(props) {
  const html = renderToStaticMarkup(React.createElement("div", { "data-test-text": "true" },
    React.createElement(TextHighlights, { matched: [], excluded: [], markerId: "selected-passage", ...props })));
  const parsed = parseDocument(html);
  const container = elements(parsed, (node) => node.attribs["data-test-text"] === "true")[0];
  assert.equal(textContent(container), props.text, "SSR must round-trip the entire original input, including whitespace");
  return { html, container, nodes: elements(container) };
}

const hasClass = (node, value) => (node.attribs.class ?? "").split(/\s+/).includes(value);
const includeLine = (report, line) => assert.ok(report.split("\n").includes(line), `Missing report line: ${line}`);

test("harness rejects environment, network, DOM and nonallowlisted imports", () => {
  const isolated = createRuntime({ allowUrls: false, tracked: false });
  for (const expression of ["process.env", "fetch", "document", "DOMParser", "URL", "localStorage"]) {
    // VM identifier lookup can rethrow a denied getter as ReferenceError.
    assert.throws(() => vm.runInContext(expression, isolated.context), /Blocked test capability|is not defined/);
    assert.equal(isolated.violations.at(-1), expression.split(".")[0]);
  }
  for (const name of ["config", "chat", "llms", "client", "../.env.local"]) {
    assert.throws(() => isolated.load(name), /Blocked test capability/);
  }
  for (const name of ["node:fs", "node:http", "@/lib/db", "dotenv", "groq-sdk"]) {
    assert.throws(() => isolated.resolveImport("api", name), /Blocked test capability/);
  }
  assert.throws(() => vm.runInContext("new Function('return 1')()", isolated.context), /Code generation from strings disallowed/);
  assert.throws(() => literal(urlDefault.left), /Nonliteral AST value/);
});

test("input validation rejects blank/punctuation/emoji-only text but accepts Unicode words and a long word", () => {
  for (const text of ["", " \t\r\n ", "!?…—_", "🧪🙂", "\u0301\u0308"]) {
    assert.match(inputProblem(text), /words, not just punctuation/);
  }
  for (const text of ["é", "𐐀", "العربية १२३", "x".repeat(8_000)]) assert.equal(inputProblem(text), null);
});

test("60,000-character limit is inclusive, uses UTF-16 units and never truncates", () => {
  assert.equal(limits.maxChars, 60_000);
  const ascii = "x".repeat(limits.maxChars);
  const unicode = `${"🧪".repeat((limits.maxChars - 2) / 2)}ok`;
  for (const text of [ascii, unicode]) {
    assert.equal(text.length, limits.maxChars);
    assert.equal(inputProblem(text), null);
    assert.match(inputProblem(`${text}x`), /60,000 characters.*Nothing is truncated/);
    assert.equal(text.length, limits.maxChars);
  }
});

test("10,000-word limit is inclusive independently of the character limit", () => {
  assert.equal(limits.maxWords, 10_000);
  const text = Array(limits.maxWords).fill("a").join(" ");
  assert.ok(text.length < limits.maxChars);
  assert.equal(inputProblem(text), null);
  assert.match(inputProblem(`${text} a`), /10,000 words/);
  assert.equal(engine.getInputStats(text).words, limits.maxWords);
});

test("UTF-8 TXT/Markdown imports preserve original Unicode and whitespace with case-insensitive extensions", async () => {
  const original = " \tCafé e\u0301 İ 𐐀 🧪\r\nالعربية\n# Heading\n\n";
  for (const name of ["draft.txt", "notes.md", "Émilie – مُلاحظات.TXT", "Draft notes (final).Md"]) {
    const fixture = fakeFile(original, name);
    const before = Uint8Array.from(fixture.bytes);
    assert.equal(await readTextFile(fixture.file), original);
    assert.equal(fixture.reads(), 1);
    assert.deepEqual(fixture.bytes, before);
    assert.equal(fixture.file.name, name);
    assert.equal(fixture.file.size, before.byteLength);
  }
});

test("UTF-8 BOM is decoded without introducing a visible character or normalizing the text", async () => {
  const fixture = fakeFile("\ufeffCafé e\u0301 𐐀\r\n");
  const before = Uint8Array.from(fixture.bytes);
  assert.equal(await readTextFile(fixture.file), "Café e\u0301 𐐀\r\n");
  assert.deepEqual(fixture.bytes, before);
});

test("256 KB byte bound rejects before reading; exact byte bound still enforces the text bound", async () => {
  assert.equal(limits.fileBytes, 256 * 1024);
  const over = fakeFile(new Uint8Array(limits.fileBytes + 1).fill(97));
  await assert.rejects(readTextFile(over.file), /256 KB.*nothing was replaced/);
  assert.equal(over.reads(), 0);
  // No 256 KB ASCII fixture can satisfy the independent 60,000-character cap.
  const exact = fakeFile(new Uint8Array(limits.fileBytes).fill(97));
  await assert.rejects(readTextFile(exact.file), /60,000 characters.*Nothing is truncated/);
  assert.equal(exact.reads(), 1);
});

test("DOCX, PDF, JPEG, HTML and misleading extensions are rejected without reading bytes", async () => {
  for (const name of ["draft.docx", "draft.DOCX", "draft.pdf", "draft.PDF", "photo.jpeg", "photo.jpg", "page.html", "image.svg", "draft.txt.exe", "draft", "draft.markdown"]) {
    const fixture = fakeFile("plain words even in an unsupported container", name);
    await assert.rejects(readTextFile(fixture.file), /UTF-8 \.txt or \.md.*PDF and Word files are not supported/);
    assert.equal(fixture.reads(), 0, name);
  }
});

test("invalid UTF-8, truncated sequences and JPEG bytes disguised as TXT are rejected", async () => {
  for (const bytes of [[0xc3, 0x28], [0xe2, 0x82], [0xc0, 0xaf], [0xed, 0xa0, 0x80], [0xff, 0xd8, 0xff, 0xe0]]) {
    const fixture = fakeFile(bytes);
    await assert.rejects(readTextFile(fixture.file), /could not be read as UTF-8/);
    assert.equal(fixture.reads(), 1);
    assert.deepEqual(Array.from(fixture.bytes), bytes);
  }
});

test("NUL and binary controls are rejected while tabs and line endings remain valid", async () => {
  const controls = [...Array(9).keys(), 11, 12, ...Array.from({ length: 18 }, (_, index) => index + 14)];
  for (const control of controls) {
    const fixture = fakeFile(`before${String.fromCharCode(control)}after`);
    await assert.rejects(readTextFile(fixture.file), /binary data, not a plain text document/);
  }
  assert.equal(await readTextFile(fakeFile("before\tafter\r\nnext\n").file), "before\tafter\r\nnext\n");
});

test("file read failures return a fixed actionable error without leaking the reader's message", async () => {
  const fixture = fakeFile("safe text", "draft.txt", new Error("SYNTHETIC_READER_DETAIL_DO_NOT_ECHO"));
  await assert.rejects(readTextFile(fixture.file), (error) => {
    assert.match(error.message, /Export a UTF-8 text copy/);
    assert.ok(!error.message.includes("SYNTHETIC_READER_DETAIL_DO_NOT_ECHO"));
    return true;
  });
  assert.equal(fixture.reads(), 1);
});

test("file import applies blank, word and character validation without partial text", async () => {
  for (const [value, problem] of [[" \n", /words/], ["!?…🧪", /words/], ["x".repeat(limits.maxChars + 1), /60,000/], ["a ".repeat(limits.maxWords + 1), /10,000/]]) {
    await assert.rejects(readTextFile(fakeFile(value).file), problem);
  }
  for (const text of ["x".repeat(limits.maxChars), Array(limits.maxWords).fill("a").join(" ")]) {
    assert.equal(await readTextFile(fakeFile(text).file), text);
  }
});

test("Markdown import treats HTML, scripts and external resources as literal text, not a DOM", async () => {
  const original = '<script>fetch("https://example.invalid/script")</script>\n<img src="https://example.invalid/image" onerror="globalThis.executed=true">\n<iframe src="https://example.invalid/frame"></iframe>\n<style>@import url(https://example.invalid/style);</style>\n# Plain words';
  assert.equal(await readTextFile(fakeFile(original, "notes.md").file), original);
});

test("file helper is read-only: failed and successful reads preserve caller-owned inputs and bytes", async () => {
  const current = freeze({ draft: "Keep this draft", sources: [supplied("Keep this source")], note: "Keep this note" });
  const before = plain(current);
  const good = fakeFile("New text returned for a later explicit replacement", "../Draft notes (final).txt");
  const bytes = Uint8Array.from(good.bytes);
  await assert.rejects(readTextFile(fakeFile("bad\u0000data").file), /binary data/);
  const imported = await readTextFile(good.file);
  assert.notEqual(imported, current.draft);
  assert.deepEqual(plain(current), before);
  assert.deepEqual(good.bytes, bytes);
  assert.ok(Object.isFrozen(good.file));
});

test("manual search uses one exactly encoded quoted query on Google's HTTPS search endpoint", () => {
  const result = manualSearchUrl("Alpha & beta+gamma? #50%");
  assert.equal(result.url, "https://www.google.com/search?q=%22Alpha+%26+beta%2Bgamma%3F+%2350%25%22");
  const parsed = new URL(result.url);
  assert.equal(parsed.searchParams.get("q"), '"Alpha & beta+gamma? #50%"');
  assert.equal(result.phrase, "Alpha & beta+gamma? #50%");
  assert.equal(result.shortened, false);
});

test("manual query removes double quote styles and collapses whitespace, retaining Unicode and apostrophes", () => {
  const result = manualSearchUrl('  “Café”\n«İ & 𐐀» "quoted"\twriter’s phrase  ');
  assert.equal(result.phrase, "Café İ & 𐐀 quoted writer’s phrase");
  assert.equal(new URL(result.url).searchParams.get("q"), `"${result.phrase}"`);
  assert.equal(result.shortened, false);
  assert.equal(manualSearchUrl(' “ ” « » " ').phrase, "");
});

test("manual query limit counts 180 Unicode code points, without splitting astral letters", () => {
  for (const glyph of ["x", "𐐀", "🧪"]) {
    const exact = manualSearchUrl(glyph.repeat(180));
    const over = manualSearchUrl(glyph.repeat(181));
    assert.equal(exact.phrase, glyph.repeat(180));
    assert.equal(exact.shortened, false);
    assert.equal(over.phrase, glyph.repeat(180));
    assert.equal(over.shortened, true);
    assert.equal(Array.from(over.phrase).length, 180);
    assert.ok(!over.phrase.includes("\ufffd"));
    assert.equal(new URL(over.url).searchParams.get("q"), `"${over.phrase}"`);
  }
});

test("long manual queries shorten at a word boundary and clearly flag shortening", () => {
  const result = manualSearchUrl(`${"alpha ".repeat(29)}bravissimo omega`);
  assert.equal(result.phrase, Array(29).fill("alpha").join(" "));
  assert.ok(Array.from(result.phrase).length <= 180);
  assert.equal(result.shortened, true);
  assert.equal(new URL(result.url).searchParams.get("q"), `"${result.phrase}"`);
});

test("malicious query strings cannot change scheme, host, credentials, fragment or query keys", () => {
  for (const phrase of ["javascript:alert(1)", "data:text/html,<script>throw 1</script>", "//evil.invalid/path", "https://user:pass@evil.invalid/", "\\\\evil.invalid\\path", '"&q=override&url=https://evil.invalid#fragment', "\r\nLocation: https://evil.invalid", "%22%26q%3Dinjected"]) {
    const result = manualSearchUrl(phrase);
    const parsed = new URL(result.url);
    assert.equal(parsed.protocol, "https:");
    assert.equal(parsed.origin, "https://www.google.com");
    assert.equal(parsed.pathname, "/search");
    assert.equal(parsed.username + parsed.password + parsed.port + parsed.hash, "");
    assert.deepEqual([...parsed.searchParams.keys()], ["q"]);
    assert.equal(parsed.searchParams.get("q"), `"${result.phrase}"`);
  }
});

test("engine returns text-only manual-review excerpts without constructing or fetching a search URL", () => {
  const isolated = createRuntime({ allowUrls: false });
  const localEngine = isolated.load("engine");
  const text = "The quiet reading room opens early. The quiet reading room opens early.";
  const repeat = localEngine.findRepeatedSentences(text, options);
  assert.ok(repeat.searchPassages.length > 0 && repeat.searchPassages.length <= 5);
  for (const passage of repeat.searchPassages) {
    assert.deepEqual(Object.keys(passage).sort(), ["id", "range", "text", "words"]);
    assert.equal(passage.text, text.slice(passage.range.start, passage.range.end));
  }
  const result = localEngine.compareSources(text, [supplied(text)], options);
  assert.equal(result.draft.coverage, 100);
  assert.ok(!JSON.stringify([result, repeat]).includes("https://www.google.com"));
});

test("coverage formatting distinguishes N/A, true endpoints, tiny percentages and ordinary rounding", () => {
  for (const [value, expected] of [[null, "N/A"], [0, "0%"], [0.000001, "<0.1%"], [0.099999, "<0.1%"], [0.1, "0.1%"], [12.34, "12.3%"], [12.36, "12.4%"], [50, "50%"], [99.9, "99.9%"], [99.900001, ">99.9%"], [99.999999, ">99.9%"], [100, "100%"]]) {
    assert.equal(formatCoverage(value), expected, String(value));
  }
});

test("report shows directional document/source percentages instead of averaging them", () => {
  const document = "alpha beta gamma delta epsilon zeta eta theta iota kappa";
  const excerpt = "gamma delta epsilon zeta";
  const forward = buildComparisonReport(compareSnapshot(document, [excerpt]), true);
  includeLine(forward, "Matched-document coverage: 40%");
  includeLine(forward, "Document coverage from this source: 40% (4 words)");
  includeLine(forward, "Source covered by document: 100% (4 words)");
  const reverse = buildComparisonReport(compareSnapshot(excerpt, [document]), true);
  includeLine(reverse, "Matched-document coverage: 100%");
  includeLine(reverse, "Source covered by document: 40% (4 words)");
});

test("report explains nonadditive source coverage and counts the document union once", () => {
  const snapshot = compareSnapshot("a b c d e f g h i j", ["a b c d e f", "e f g h i j"]);
  assert.deepEqual(Array.from(snapshot.result.sources, (entry) => entry.draftCoverage), [60, 60]);
  const report = buildComparisonReport(snapshot, false);
  includeLine(report, "Matched document words: 10");
  includeLine(report, "Matched-document coverage: 100%");
  includeLine(report, "Each matched document word is counted once across all sources. Do not add source percentages.");
  assert.ok(!report.includes("120%"));
});

test("pathological overlapping passages produce a bounded stats-only report, not repeated megabytes", () => {
  const draft = Array(10_000).fill("alpha").join(" ");
  const excerpt = Array(9_851).fill("alpha").join(" ");
  const snapshot = compareSnapshot(draft, Array(5).fill(excerpt));
  assert.equal(snapshot.result.sources[0].passages.length, 150);
  const report = buildComparisonReport(snapshot, true);
  assert.ok(report.length < 250_000);
  assert.ok(!report.includes("alpha alpha"));
  includeLine(report, "Matched passages included: no (notes and text omitted)");
  assert.match(report, /TEXT BUDGET.*stats-only/);
  assert.equal(snapshot.result.draft.coverage, 100);
});

test("report carries total/eligible/excluded statistics, options and every method warning", () => {
  const snapshot = compareSnapshot('"hidden quoted words ignored" alpha beta gamma delta stray', ['"other removed words here" alpha beta gamma delta'], { ignoreCase: false, excludeQuotes: true, excludeReferences: true });
  const report = buildComparisonReport(snapshot, true);
  for (const line of ["DOCUMENT: 9 total; 5 eligible; 4 excluded", "Source words: 8 total; 4 eligible; 4 excluded", "Minimum consecutive words: 4", "Ignore case: no", "Exclude paired quotes: yes", "Exclude trailing reference section: yes", "Matched-document coverage: 80%", "METHOD & LIMITATIONS"]) includeLine(report, line);
  for (const warning of snapshot.result.warnings) includeLine(report, `- ${warning}`);
  assert.match(report, /Unicode NFKC.*Accents retained/);
});

function privateSnapshot() {
  const snapshot = compareSnapshot("🧪 Café İ 𐐀 beta gamma delta draftTailOnly", [supplied("CAFÉ i\u0307 𐐨 BETA GAMMA DELTA sourceTailOnly", 0, "LABEL_ONLY_阿 🧪")]);
  const passage = snapshot.result.sources[0].passages[0];
  snapshot.reviews[passage.id] = { status: "cited", note: "\tNOTE_ONLY_نوٹ e\u0301 𐐀 🧪\nsecond line  " };
  return snapshot;
}

test("full report includes exact original Unicode passages, labels, normalized note whitespace and UTF-16 positions", () => {
  const snapshot = privateSnapshot();
  const passage = snapshot.result.sources[0].passages[0];
  const report = buildComparisonReport(snapshot, true);
  includeLine(report, "SOURCE 1: LABEL_ONLY_阿 🧪");
  includeLine(report, "Document: Café İ 𐐀 beta gamma delta");
  includeLine(report, "Source: CAFÉ i\u0307 𐐨 BETA GAMMA DELTA");
  includeLine(report, "Reviewer status: Citation checked");
  includeLine(report, "Reviewer note: NOTE_ONLY_نوٹ e\u0301 𐐀 🧪 second line");
  includeLine(report, `Document characters: ${passage.draft.start + 1}-${passage.draft.end}; source characters: ${passage.source.start + 1}-${passage.source.end} (UTF-16 positions)`);
  assert.equal(passage.draft.start, 3);
});

test("stats-only comparison report omits actual source labels, passages and notes", () => {
  const snapshot = privateSnapshot();
  const report = buildComparisonReport(snapshot, false);
  for (const source of snapshot.result.sources) {
    assert.ok(!report.includes(source.label));
    for (const passage of source.passages) {
      assert.ok(!report.includes(snapshot.draft.slice(passage.draft.start, passage.draft.end)));
      assert.ok(!report.includes(snapshot.sources[0].text.slice(passage.source.start, passage.source.end)));
      assert.ok(!report.includes(collapse(snapshot.reviews[passage.id].note)));
    }
  }
  for (const secret of ["LABEL_ONLY", "NOTE_ONLY", "draftTailOnly", "sourceTailOnly"]) assert.ok(!report.includes(secret));
  includeLine(report, "SOURCE 1: Label omitted");
  includeLine(report, "Matched passages included: no (notes and text omitted)");
  includeLine(report, "Reviewer status: Citation checked");
  assert.doesNotMatch(report, /^Reviewer note:|^Document:|^Source:/m);
});

test("review statuses and notes never mutate results or change engine percentages", () => {
  const snapshot = privateSnapshot();
  const resultBefore = plain(snapshot.result);
  const id = snapshot.result.sources[0].passages[0].id;
  freeze(snapshot.result);
  assert.deepEqual(plain(REVIEW_LABELS), { unreviewed: "Not reviewed", cited: "Citation checked", common: "Common wording", revise: "Needs revision" });
  const baseline = formatCoverage(snapshot.result.draft.coverage);
  for (const [status, label] of Object.entries(REVIEW_LABELS)) {
    const reviewed = freeze({ ...snapshot, reviews: { [id]: { status, note: `Review for ${status}` } } });
    for (const includePassages of [true, false]) {
      const report = buildComparisonReport(reviewed, includePassages);
      includeLine(report, `Matched-document coverage: ${baseline}`);
      includeLine(report, `Reviewer status: ${label}`);
      assert.equal(report.includes(`Reviewer note: Review for ${status}`), includePassages);
    }
    assert.deepEqual(plain(snapshot.result), resultBefore);
  }
});

test("report is deterministic and leaves its deeply frozen snapshot unchanged", () => {
  const snapshot = freeze(privateSnapshot());
  const before = plain(snapshot);
  for (const includePassages of [true, false]) {
    assert.equal(buildComparisonReport(snapshot, includePassages), buildComparisonReport(snapshot, includePassages));
  }
  assert.deepEqual(plain(snapshot), before);
});

test("normal source names and code-shaped labels/notes remain inert literal TXT data", () => {
  for (const label of ["José's manuscript (2026).md", "Notes & citations — العربية", "constructor", "__proto__", '<script>fetch("https://example.invalid/name")</script>']) {
    const snapshot = compareSnapshot("alpha beta gamma delta", [supplied("alpha beta gamma delta", 0, label)]);
    const note = '</textarea><img src="https://example.invalid/note" onerror="globalThis.executed=true">';
    snapshot.reviews[snapshot.result.sources[0].passages[0].id] = { status: "revise", note };
    const report = buildComparisonReport(freeze(snapshot), true);
    includeLine(report, `SOURCE 1: ${label}`);
    includeLine(report, `Reviewer note: ${note}`);
  }
});

test("all-excluded and unmatched reports distinguish unavailable coverage from zero without originality claims", () => {
  const excluded = compareSnapshot('"alpha beta gamma delta"', ['"alpha beta gamma delta"'], { excludeQuotes: true });
  const unavailable = buildComparisonReport(excluded, false);
  includeLine(unavailable, "Matched-document coverage: N/A");
  includeLine(unavailable, "Source covered by document: N/A (0 words)");
  const unmatched = buildComparisonReport(compareSnapshot("alpha beta gamma delta", ["one two three four"]), false);
  includeLine(unmatched, "Matched-document coverage: 0%");
  assert.match(unmatched, /No match does not prove originality/);
  assert.match(unmatched, /not evidence of uniqueness or originality/);
  assert.doesNotMatch(unmatched, /100% (?:unique|original)|originality score:\s*\d/i);
});

test("repetition report counts groups and copies beyond the first, not an originality score", () => {
  const sentence = "Café İ 𐐀 beta gamma delta.";
  const snapshot = repeatSnapshot(`${sentence}\nAnother wholly separate statement exists.\nCAFÉ i\u0307 𐐨 beta gamma delta!`);
  assert.equal(snapshot.result.groupCount, 1);
  assert.equal(snapshot.result.repeatedOccurrences, 1);
  const group = snapshot.result.groups[0];
  snapshot.reviews[group.id] = { status: "common", note: "REPEAT_NOTE_é 𐐀" };
  const full = buildComparisonReport(freeze(snapshot), true);
  for (const line of ["Mode: Find repeated sentences", "Repeated sentence groups: 1", "Copies beyond first occurrences: 1", "No originality score is assigned.", "Group 1: 6 words; 2 occurrences", `Sentence: ${sentence}`, "Reviewer note: REPEAT_NOTE_é 𐐀"]) includeLine(full, line);
  assert.ok(!full.includes("Matched-document coverage:"));
  const redacted = buildComparisonReport(snapshot, false);
  assert.ok(!redacted.includes(sentence));
  assert.ok(!redacted.includes("REPEAT_NOTE_é 𐐀"));
  assert.doesNotMatch(redacted, /^Sentence:|^Reviewer note:/m);
  includeLine(redacted, "Reviewer status: Common wording");
});

test("comparison report clearly discloses capped evidence while keeping complete coverage", () => {
  const total = limits.passagesPerSource + 1;
  const draft = Array.from({ length: total }, (_, index) => `alpha beta gamma delta gap${index}`).join(" ");
  const snapshot = compareSnapshot(draft, ["alpha beta gamma delta"]);
  assert.equal(snapshot.result.sources[0].passageCount, total);
  assert.equal(snapshot.result.sources[0].passages.length, limits.passagesPerSource);
  const report = buildComparisonReport(freeze(snapshot), false);
  includeLine(report, `Review passages: ${limits.passagesPerSource} shown of ${total}`);
  includeLine(report, `Matched document words: ${total * 4}`);
  includeLine(report, "Matched-document coverage: 80%");
  assert.match(report, /1 of 151 maximal draft passages are omitted from review \(limit 150\)/);
  assert.match(report, /Coverage and highlights still include every qualifying match/);
});

test("repetition report discloses omitted groups and keeps their complete totals", () => {
  const total = limits.repeatGroups + 1;
  const draft = Array.from({ length: total }, (_, index) => `Group${index} alpha beta gamma.\nGroup${index} alpha beta gamma.`).join("\n");
  const snapshot = repeatSnapshot(draft);
  assert.equal(snapshot.result.groupCount, total);
  assert.equal(snapshot.result.groups.length, limits.repeatGroups);
  const report = buildComparisonReport(freeze(snapshot), false);
  includeLine(report, `Repeated sentence groups: ${total}`);
  includeLine(report, `Copies beyond first occurrences: ${total}`);
  assert.equal(report.split("\n").filter((line) => /^Group \d+:/.test(line)).length, limits.repeatGroups);
  assert.match(report, /1 of 151 repeated-sentence groups are omitted from review \(limit 150\)/);
  assert.match(report, /Totals and highlights still include them/);
});

test("repetition report discloses capped occurrence positions without capping occurrence counts", () => {
  const count = limits.occurrencesPerGroup + 1;
  const snapshot = repeatSnapshot(Array(count).fill("The quiet reading room opens early.").join("\n"));
  const group = snapshot.result.groups[0];
  assert.equal(group.occurrenceCount, count);
  assert.equal(group.occurrences.length, limits.occurrencesPerGroup);
  const report = buildComparisonReport(freeze(snapshot), false);
  includeLine(report, `Group 1: 6 words; ${count} occurrences`);
  includeLine(report, `Copies beyond first occurrences: ${count - 1}`);
  const positions = report.split("\n").find((line) => line.startsWith("Occurrence positions shown:"));
  assert.equal((positions.match(/\d+-\d+/g) ?? []).length, limits.occurrencesPerGroup);
  assert.match(report, /1 occurrence ranges in displayed groups are omitted from review \(limit 100 per group\)/);
  assert.match(report, /Occurrence counts and highlights remain complete/);
});

test("TextHighlights SSR round-trips empty text, whitespace, HTML characters and Unicode without ranges", () => {
  for (const text of ["", " \t\r\n", "<&> \"quoted\" 'apostrophe'\nCafé e\u0301 𐐀 🧪 العربية\u2028last\u2029"]) {
    const { nodes } = renderHighlights({ text });
    assert.equal(nodes.filter((node) => node.name === "mark").length, 0);
  }
});

test("TextHighlights uses actual engine-merged overlapping source ranges and a single selected marker", () => {
  const text = "🙂 alpha beta gamma delta epsilon zeta eta theta!\n";
  const snapshot = compareSnapshot(text, ["alpha beta gamma delta epsilon", "delta epsilon zeta eta theta"]);
  const matched = snapshot.result.draft.matchRanges;
  assert.equal(matched.length, 1);
  const selected = snapshot.result.sources[1].passages[0].draft;
  const props = freeze({ text, matched, excluded: snapshot.result.draft.excludedRanges, selected, markerId: "one-selected-match" });
  const before = plain(props);
  const { nodes } = renderHighlights(props);
  const marks = nodes.filter((node) => node.name === "mark");
  assert.equal(marks.map((node) => textContent(node)).join(""), "alpha beta gamma delta epsilon zeta eta theta");
  assert.equal(nodes.filter((node) => node.attribs.id === props.markerId).length, 1);
  assert.equal(marks.filter((node) => hasClass(node, "sim-highlight-selected")).map((node) => textContent(node)).join(""), text.slice(selected.start, selected.end));
  assert.deepEqual(plain(props), before);
});

test("TextHighlights preserves original UTF-16 offsets through normalization and astral characters", () => {
  const text = "🙂 İ, CAFÉ cafe\u0301 ＦＯＯ 𐐀!\r\n";
  const snapshot = compareSnapshot(text, ["i\u0307 café café foo 𐐨"]);
  const selected = snapshot.result.sources[0].passages[0].draft;
  assert.equal(selected.start, 3);
  const { nodes } = renderHighlights({ text, matched: snapshot.result.draft.matchRanges, excluded: [], selected });
  const marks = nodes.filter((node) => node.name === "mark");
  assert.equal(marks.length, 1);
  assert.equal(textContent(marks[0]), "İ, CAFÉ cafe\u0301 ＦＯＯ 𐐀");
  assert.equal(marks[0].attribs.id, "selected-passage");
});

test("TextHighlights preserves engine quote/reference exclusions separately from selected matches", () => {
  const text = '🙂 "hidden quoted words here"\nalpha beta gamma delta\nReferences\nBook source note';
  const snapshot = compareSnapshot(text, [text], { excludeQuotes: true, excludeReferences: true });
  const result = snapshot.result.draft;
  const selected = snapshot.result.sources[0].passages[0].draft;
  const { nodes } = renderHighlights(freeze({ text, matched: result.matchRanges, excluded: result.excludedRanges, selected }));
  assert.deepEqual(nodes.filter((node) => hasClass(node, "sim-excluded")).map((node) => textContent(node)), ['"hidden quoted words here"', "References\nBook source note"]);
  assert.equal(nodes.filter((node) => node.name === "mark").map((node) => textContent(node)).join(""), "alpha beta gamma delta");
  assert.equal(nodes.filter((node) => node.attribs.id === "selected-passage").length, 1);
});

test("TextHighlights gives exclusions precedence over mixed matched/selected ranges without duplicate IDs", () => {
  const text = "alpha beta gamma delta";
  const matched = [{ start: 0, end: text.length }];
  const excluded = [{ start: text.indexOf("beta"), end: text.indexOf(" delta") }];
  const { nodes } = renderHighlights(freeze({ text, matched, excluded, selected: matched[0] }));
  assert.deepEqual(nodes.filter((node) => node.name === "mark").map((node) => textContent(node)), ["alpha ", " delta"]);
  assert.equal(textContent(nodes.find((node) => hasClass(node, "sim-excluded"))), "beta gamma");
  assert.equal(nodes.filter((node) => node.attribs.id === "selected-passage").length, 1);
  assert.equal(nodes.filter((node) => hasClass(node, "sim-highlight-selected")).length, 2);
});

test("TextHighlights escapes scripts, image handlers and hostile marker IDs rather than creating executable markup", () => {
  const script = '<script>fetch("https://example.invalid/run")</script>';
  const image = '<img src="https://example.invalid/pixel" onerror="globalThis.executed=true">';
  const text = `${script}\n${image}\nCafé e\u0301 𐐀 🧪`;
  const markerId = 'selected" onmouseover="globalThis.executed=true';
  const { html, nodes } = renderHighlights({ text, matched: [{ start: 0, end: text.length }], excluded: [{ start: script.length + 1, end: script.length + 1 + image.length }], selected: { start: 0, end: script.length }, markerId });
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(html.includes("&lt;img"));
  assert.equal(nodes.filter((node) => node.attribs.id === markerId).length, 1);
  for (const node of nodes) {
    assert.ok(["div", "mark", "span"].includes(node.name));
    assert.ok(!Object.keys(node.attribs).some((name) => /^on/i.test(name)));
  }
});

const pageModule = runtime.load("page");
const pageHtml = renderToStaticMarkup(React.createElement(pageModule.default));
const pageDom = parseDocument(pageHtml);
const visiblePage = collapse(textContent(pageDom, true));
const schemaNodes = elements(pageDom, (node) => node.name === "script" && node.attribs.type === "application/ld+json");
const schemas = schemaNodes.map((node) => JSON.parse(textContent(node)));
const falseClaims = /100%\s+private|\bunlimited\b|under a second|Verify Text Originality/i;

test("actual page metadata keeps the absolute title, production canonical and specific social image", (t) => {
  const { metadata } = pageModule;
  assert.deepEqual(plain(metadata.title), { absolute: toolConfig.title });
  assert.equal(metadata.title.absolute, "Text Similarity Checker - Compare Two Texts Free");
  assert.equal(metadata.description, toolConfig.description);
  assert.equal(metadata.alternates.canonical, canonical);
  assert.equal(metadata.openGraph.url, canonical);
  assert.equal(metadata.openGraph.title, toolConfig.title);
  assert.equal(metadata.twitter.title, toolConfig.title);
  assert.equal(metadata.twitter.card, "summary_large_image");
  for (const social of [metadata.openGraph, metadata.twitter]) {
    assert.equal(social.images.length, 1);
    assert.equal(social.images[0].url, "/tools/plagiarism-checker/opengraph-image");
    assert.equal(social.images[0].width, 1200);
    assert.equal(social.images[0].height, 630);
    assert.equal(social.images[0].alt, literal(initializer("og", "alt")));
  }
  assert.doesNotMatch(JSON.stringify(metadata), falseClaims);
  t.diagnostic(`Actual metadata: title ${Array.from(metadata.title.absolute).length} code points; description ${Array.from(metadata.description).length} code points. No parent Next.js layout/head resolution is simulated.`);
});

test("actual page SSR has one H1, no nested main, and an exact workspace anchor with a mocked client section", () => {
  assert.equal(elements(pageDom, (node) => node.name === "h1").length, 1);
  assert.equal(textContent(elements(pageDom, (node) => node.name === "h1")[0]), "Text similarity checker");
  assert.equal(elements(pageDom, (node) => node.name === "main").length, 0);
  const wrapped = parseDocument(renderToStaticMarkup(React.createElement("main", null, React.createElement(pageModule.default))));
  assert.equal(elements(wrapped, (node) => node.name === "main").length, 1);
  const workspace = elements(pageDom, (node) => node.attribs.id === "similarity-workspace");
  assert.equal(workspace.length, 1);
  assert.equal(workspace[0].name, "section");
  assert.equal(workspace[0].attribs["data-test-placeholder"], "true");
  assert.equal(elements(pageDom, (node) => node.name === "a" && node.attribs.href === "#similarity-workspace").length, 1);
  const ids = elements(pageDom, (node) => Boolean(node.attribs.id)).map((node) => node.attribs.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const anchor of elements(pageDom, (node) => node.name === "a" && node.attribs.href?.startsWith("#"))) {
    assert.ok(ids.includes(anchor.attribs.href.slice(1)), `Missing fragment target: ${anchor.attribs.href}`);
  }
});

test("actual page's five visible FAQs exactly match the real tool-seo JSON-LD", () => {
  const faqSchemas = schemas.filter((schema) => schema["@type"] === "FAQPage");
  assert.equal(faqSchemas.length, 1);
  assert.equal(toolConfig.faqs.length, 5);
  assert.equal(faqSchemas[0].mainEntity.length, 5);
  const faqSection = elements(pageDom, (node) => node.attribs.id === "similarity-faq")[0];
  const questions = elements(faqSection, (node) => node.name === "dt").map((node) => textContent(node));
  const answers = elements(faqSection, (node) => node.name === "dd").map((node) => textContent(node));
  assert.deepEqual(questions, toolConfig.faqs.map((faq) => faq.question));
  assert.deepEqual(answers, toolConfig.faqs.map((faq) => faq.answer));
  assert.deepEqual(faqSchemas[0].mainEntity.map((faq) => ({ question: faq.name, answer: faq.acceptedAnswer.text })), toolConfig.faqs);
});

test("actual schema advertises the local tool and free offer without fabricated aggregate ratings", () => {
  assert.equal(schemaNodes.length, 3);
  assert.deepEqual(schemas.map((schema) => schema["@type"]), ["WebApplication", "BreadcrumbList", "FAQPage"]);
  const app = schemas[0];
  assert.equal(app.name, toolConfig.name);
  assert.equal(app.url, canonical);
  assert.equal(app.applicationCategory, toolConfig.applicationCategory);
  assert.deepEqual(app.featureList, toolConfig.featureList);
  assert.equal(app.offers.price, "0");
  assert.equal(app.isAccessibleForFree, true);
  assert.doesNotMatch(JSON.stringify(schemas), /aggregateRating|ratingValue|ratingCount|reviewCount/);
  assert.doesNotMatch(visiblePage, falseClaims);
  assert.equal(schemas[1].itemListElement.at(-1).item, canonical);
});

test("actual visible page explains no external corpus, no originality verdict, directional coverage and all limits", () => {
  for (const pattern of [/No web or academic corpus is searched/, /no AI or semantic matching/, /paraphrases, translated ideas and unsupplied sources can be missed/, /not a plagiarism verdict or an internet scan/, /Source percentages are not additive/, /coverage is unavailable—not zero/, /10,000 words and 60,000 UTF-16 characters/, /256 KB limit/, /PDF, DOCX, URLs and OCR are unsupported/, /first 150 maximal passages per source/, /150 groups and 100 occurrences per group/, /15 seconds; speed depends on your device/, /Nothing is searched automatically/, /Sitewide ads and analytics still operate separately/, /reload clears the workspace/i]) {
    assert.match(visiblePage, pattern);
  }
  assert.match(visiblePage, /not an executed sample/);
  assert.match(visiblePage, /recognizing quotation marks or a heading does not validate a citation/);
});

test("new client contains no retired AI endpoint or network calls, and retains explicit manual-search preview", () => {
  const allowedImports = new Set(["react", "lucide-react", "@/lib/similarity/engine", "@/lib/similarity/input", "@/lib/similarity/report", "@/lib/similarity/review", "@/lib/similarity/samples", "@/lib/similarity/types", "./text-highlights", "./similarity.css"]);
  for (const declaration of findNodes(tree("client"), ts.isImportDeclaration)) {
    assert.ok(allowedImports.has(declaration.moduleSpecifier.text), `Unexpected client import: ${declaration.moduleSpecifier.text}`);
  }
  for (const name of ["client", "engine", "input", "report", "review", "types", "samples", "worker", "highlights"]) {
    assert.doesNotMatch(source(name), /ai-plagiarism/i);
    const calls = findNodes(tree(name), (node) => ts.isCallExpression(node) || ts.isNewExpression(node));
    for (const call of calls) {
      const callable = call.expression.getText(tree(name));
      assert.doesNotMatch(callable, /(?:^|\.)(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon)$/);
    }
  }
  assert.match(source("client"), /searchText !== null \? manualSearchUrl\(searchText\) : null/);
  assert.match(source("client"), /onClick=\{\(\) => setSearchText\(passage\.text\)\}/);
  assert.match(source("client"), /href=\{chosenSearch\.url\} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer"/);
  assert.match(source("client"), /Preview the query before opening Google/);
  assert.match(source("client"), /A missing search result does not prove originality/);
  assert.doesNotMatch(source("client"), falseClaims);
});

test("actual retired POST returns 410 without reading any request property (NextResponse.json shim)", async (t) => {
  const isolated = createRuntime({ allowUrls: false });
  const route = isolated.load("api");
  const requestReads = [];
  const trap = (operation) => () => { requestReads.push(operation); throw new Error("Request must not be inspected"); };
  const request = new Proxy(Object.create(null), { get: trap("get"), has: trap("has"), ownKeys: trap("ownKeys"), getPrototypeOf: trap("getPrototypeOf") });
  const response = await route.POST(request);
  assert.ok(response instanceof Response);
  assert.equal(response.status, 410);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("x-robots-tag"), "noindex");
  assert.match(response.headers.get("content-type"), /^application\/json/);
  const body = await response.json();
  assert.deepEqual(Object.keys(body).sort(), ["error", "toolPath"]);
  assert.equal(body.toolPath, "/tools/plagiarism-checker");
  assert.match(body.error, /AI originality estimates have been retired/);
  assert.match(body.error, /supplied sources locally; no web scan or originality verdict/);
  assert.equal(isolated.responses.length, 1);
  assert.deepEqual(body, isolated.responses[0].body);
  assert.deepEqual(requestReads, []);
  assert.deepEqual([...isolated.cache.keys()], ["api"]);
  t.diagnostic("Executes the complete source POST handler. Only NextResponse.json is replaced by native Response.json; Next.js routing/middleware/HTTP transport are not tested.");
});

test("retired POST also works with no request and returns no score or reflected text", async () => {
  const isolated = createRuntime({ allowUrls: false });
  const { POST } = isolated.load("api");
  for (const request of [undefined, null, freeze({ body: "SYNTHETIC_OLD_DRAFT_DO_NOT_ECHO", text: "SYNTHETIC_OLD_DRAFT_DO_NOT_ECHO" })]) {
    const response = await POST(request);
    assert.equal(response.status, 410);
    const body = await response.json();
    assert.ok(!JSON.stringify(body).includes("SYNTHETIC_OLD_DRAFT_DO_NOT_ECHO"));
    for (const key of ["score", "originality", "percentage", "matches", "results"]) assert.ok(!Object.hasOwn(body, key));
  }
});

test("OG static exports and actual JSX align with metadata (ImageResponse mocked; no font/PNG network)", () => {
  const og = runtime.load("og");
  assert.equal(og.alt, literal(initializer("og", "alt")));
  assert.deepEqual(plain(og.size), { width: 1200, height: 630 });
  assert.equal(og.contentType, "image/png");
  assert.match(og.alt, /fictional draft and supplied source.*not a plagiarism verdict/);
  const image = og.default();
  assert.deepEqual(plain(image.options), plain(og.size));
  const rendered = parseDocument(renderToStaticMarkup(image.element));
  const text = collapse(textContent(rendered, true));
  assert.match(text, /Text similarity checker/);
  assert.match(text, /Fictional phrase illustration/);
  assert.match(text, /No internet-wide scan/);
  assert.doesNotMatch(text, falseClaims);
  assert.equal(elements(rendered, (node) => ["img", "script", "link", "iframe"].includes(node.name)).length, 0);
});

function checkerDescriptor(name) {
  const matches = findNodes(tree(name), (node) => ts.isObjectLiteralExpression(node)
    && [property(node, "slug"), property(node, "href")].some((value) => value && ts.isStringLiteral(value)
      && ["plagiarism-checker", "/tools/plagiarism-checker"].includes(value.text)));
  assert.equal(matches.length, 1, `${name}: expected exactly one checker descriptor`);
  return Object.fromEntries(["slug", "href", "name", "title", "description", "desc", "keywords"]
    .flatMap((key) => property(matches[0], key) ? [[key, literal(property(matches[0], key))]] : []));
}

for (const name of ["catalog", "home", "llms", "chat"]) {
  test(`${name}: statically extracted checker descriptor agrees with supplied-text/local scope`, () => {
    const entry = checkerDescriptor(name);
    assert.equal(entry.name ?? entry.title, toolConfig.name);
    assert.equal(entry.slug ?? entry.href, entry.slug ? "plagiarism-checker" : "/tools/plagiarism-checker");
    const description = entry.description ?? entry.desc;
    assert.match(description, /draft/i);
    assert.match(description, /supplied sources/i);
    assert.match(description, /locally/i);
    assert.match(description, /(?:no|not a) web scan/i);
    assert.doesNotMatch(description, falseClaims);
    assert.doesNotMatch(description, /detect plagiarism|verify (?:text )?originality|scan (?:the )?(?:internet|billions)/i);
    if (name === "chat") assert.match(description, /Paste text in the tool, not this chat/);
    if (name !== "home") assert.match(description, /No web scan(?:, AI)? or (?:originality|plagiarism) verdict/i);
    assert.ok(!runtime.cache.has(name), "Discovery routes must never be executed");
  });
}

test("reports include the complete eligible overlap partition and per-source counts", () => {
  const snapshot = compareSnapshot("a b c d e f g h i j extra", ["a b c d e f", "e f g h i j"]);
  const report = buildComparisonReport(freeze(snapshot), false);
  for (const text of [
    "Matched in exactly one supplied source: 8 words",
    "Matched in multiple supplied sources: 2 words",
    "No qualifying match in supplied sources: 1 eligible words",
    "Matched only in this source: 4 document words",
    "Also matched in other supplied sources: 2 document words",
  ]) includeLine(report, text);
  assert.match(report, /not the whole web/);
  assert.match(report, /does not identify an original author/);
});

test("HTML report escapes hostile evidence and is self-contained and script-free", () => {
  const label = '</pre><script>fetch("https://example.invalid/leak")</script>';
  const snapshot = compareSnapshot("alpha beta gamma delta", [supplied("alpha beta gamma delta", 0, label)]);
  snapshot.reviews[snapshot.result.sources[0].passages[0].id] = { status: "revise", note: '<img src="https://example.invalid/pixel" onerror="alert(1)"> & "quoted"' };
  const frozen = freeze(snapshot);
  const html = buildComparisonHtmlReport(frozen, true);
  const parsed = parseDocument(html);
  const report = elements(parsed, (node) => node.name === "pre");
  assert.equal(report.length, 1);
  assert.equal(textContent(report[0]), buildComparisonReport(frozen, true));
  assert.equal(elements(parsed, (node) => ["script", "img", "iframe", "link", "object", "embed", "form", "a"].includes(node.name)).length, 0);
  for (const node of elements(parsed)) assert(!Object.keys(node.attribs ?? {}).some((key) => /^on/i.test(key)));
  const csp = elements(parsed, (node) => node.name === "meta" && node.attribs["http-equiv"] === "Content-Security-Policy")[0].attribs.content;
  assert.match(csp, /default-src 'none'/); assert.match(csp, /form-action 'none'/);
  assert.match(html, /@media print/); assert.doesNotMatch(html, /window\.print|http-equiv="refresh"/);
  assert.equal(buildComparisonHtmlReport(frozen, true), html);
});

test("HTML stats-only and compact reports omit labels, passages and private notes", () => {
  const redacted = buildComparisonHtmlReport(freeze(privateSnapshot()), false);
  for (const value of ["LABEL_ONLY", "NOTE_ONLY", "draftTailOnly", "sourceTailOnly"]) assert(!redacted.includes(value));
  const draft = Array(10_000).fill("alpha").join(" ");
  const excerpt = Array(9_851).fill("alpha").join(" ");
  const large = buildComparisonHtmlReport(compareSnapshot(draft, Array(5).fill(excerpt)), true);
  assert(large.length < 350_000); assert(!large.includes("alpha alpha")); assert.match(large, /TEXT BUDGET/);
});

test("HTML report supports repeated sentences and unavailable coverage without numeric verdicts", () => {
  const repeat = buildComparisonHtmlReport(repeatSnapshot("alpha beta gamma delta. alpha beta gamma delta."), true);
  assert.match(repeat, /1 repeated sentence groups/); assert.doesNotMatch(repeat, /originality score:\s*\d/i);
  const excluded = compareSnapshot('"alpha beta gamma delta"', ['"alpha beta gamma delta"'], { excludeQuotes: true });
  assert.match(buildComparisonHtmlReport(excluded, false), /N\/A matched-document coverage/);
});

const orderedFixture = () => [
  { id: "late", sourceId: "b", draft: { start: 40, end: 90 }, source: { start: 0, end: 50 }, words: 8 },
  { id: "early", sourceId: "a", draft: { start: 0, end: 25 }, source: { start: 0, end: 25 }, words: 4 },
  { id: "middle", sourceId: "b", draft: { start: 20, end: 100 }, source: { start: 0, end: 80 }, words: 12 },
];
test("passage order is deterministic and never mutates the source evidence", () => {
  const passages = freeze(orderedFixture());
  const order = (value) => Array.from(selectPassages(passages, {}, ["a", "b"], "all", "all", value), (item) => item.id);
  assert.deepEqual(order("document"), ["early", "middle", "late"]);
  assert.deepEqual(order("longest"), ["middle", "late", "early"]);
  assert.deepEqual(order("source"), ["early", "middle", "late"]);
  assert.deepEqual(plain(passages), orderedFixture());
});

test("all review statuses can be combined with a source filter without changing coverage", () => {
  const snapshot = compareSnapshot("a b c d e f g h i j", ["a b c d e f", "e f g h i j"]);
  const passages = snapshot.result.sources.flatMap((item) => item.passages);
  const before = plain(snapshot.result);
  const id = passages[0].id;
  for (const status of Object.keys(REVIEW_LABELS)) {
    const reviews = { [id]: { status, note: "review only" } };
    const selected = selectPassages(passages, reviews, snapshot.sources.map((item) => item.id), passages[0].sourceId, status, "document");
    assert.equal(selected.length, 1); assert.equal(selected[0].id, id);
    assert.equal(selectPassages(passages, reviews, ["missing"], "missing", status, "longest").length, 0);
  }
  assert.deepEqual(plain(snapshot.result), before);
});

test("focused context preserves original text within its bounds", () => {
  const text = "Before: alpha beta gamma delta. After.";
  const start = text.indexOf("alpha"), end = text.indexOf(". After");
  const context = passageContext(text, { start, end });
  assert.equal(context.before + context.match + context.after, text);
  assert.equal(context.match, "alpha beta gamma delta");
  assert.equal(context.shortened, false); assert.equal(context.leading, false); assert.equal(context.trailing, false);
});

test("focused context bounds giant passages and keeps valid UTF-16 boundary pairs", () => {
  const text = `${"🧪".repeat(80)}alpha ${"🧪".repeat(800)} delta${"🧪".repeat(80)}`;
  const range = { start: 160, end: text.length - 160 };
  const context = passageContext(text, range);
  assert(context.before.length <= 140); assert(context.after.length <= 140); assert(context.match.length <= 1200);
  assert.equal(context.shortened, true); assert.equal(context.leading, true); assert.equal(context.trailing, true);
  for (const value of [context.before, context.match, context.after]) assert.equal(value.isWellFormed(), true);
  for (const invalid of [{ start: -1, end: 5 }, { start: 4, end: 3 }, { start: 0, end: text.length + 1 }, { start: 0.5, end: 3 }]) {
    assert.throws(() => passageContext(text, invalid), /outside the document/);
  }
});

test("focused-context component renders malicious markup only as literal text", () => {
  const text = '<img src="https://example.invalid/test"> alpha beta gamma delta </script>';
  const range = { start: text.indexOf("alpha"), end: text.indexOf(" </script>") };
  const html = renderToStaticMarkup(React.createElement(PassageContext, { text, range, markerId: "context-current" }));
  const parsed = parseDocument(html);
  assert.equal(elements(parsed, (node) => ["img", "script", "iframe", "link"].includes(node.name)).length, 0);
  assert.equal(textContent(elements(parsed, (node) => node.name === "p")[0]), text);
  assert.equal(elements(parsed, (node) => node.attribs?.id === "context-current").length, 1);
  assert.equal(textContent(elements(parsed, (node) => node.name === "mark")[0]), "alpha beta gamma delta");
});

test("landing page accurately explains review enhancements and print-to-PDF boundaries", () => {
  for (const pattern of [/exactly one supplied source/, /multiple supplied sources/, /Duplicate source entries count separately/, /8 \+ 4 \+ 28 = 40/, /first 20 qualifying occurrences/, /Focused context/, /not a direct PDF download/, /without scripts or external resources/, /not just the passages currently visible/]) assert.match(visiblePage, pattern);
  assert.equal(elements(pageDom, (node) => hasClass(node, "sim-use-case")).length, 3);
});

test("tool inherits ByteVerse theme tokens instead of an independent green palette", () => {
  const css = source("css");
  for (const [local, shared] of [["accent", "primary"], ["ink", "foreground"], ["border", "border"], ["surface", "card"], ["soft", "muted"], ["muted", "muted-foreground"]]) {
    assert(css.includes(`--sim-${local}:var(--${shared})`));
  }
  assert.match(css, /color:var\(--primary-foreground\)/);
  assert.doesNotMatch(source("page"), /emerald-|teal-|green-|#173f38|#f4f8f3/);
  assert.doesNotMatch(css, /#(?:136853|123c34|153b30|dcf7ed|173f38|102d28|184e3d|329275|bcdfad)\b/i);
  const rootTokens = source("theme").match(/:root\s*\{([\s\S]*?)\}/)?.[1];
  const darkTokens = source("theme").match(/\.dark\s*\{([\s\S]*?)\}/)?.[1];
  assert(rootTokens && darkTokens);
  const color = (tokens, name) => tokens.match(new RegExp(`--${name}:\\s*(#[0-9a-f]+);`, "i"))?.[1];
  for (const name of ["primary", "foreground", "card", "border", "muted-foreground"]) {
    const value = color(rootTokens, name);
    assert(value, `Missing shared token: ${name}`);
    assert(source("report").includes(value), `Printable report differs from site ${name}`);
  }
  for (const name of ["background", "foreground", "card", "border", "accent"]) {
    assert(source("og").includes(color(darkTokens, name)), `Social image differs from site dark ${name}`);
  }
});