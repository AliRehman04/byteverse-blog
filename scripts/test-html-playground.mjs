import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { buildSync } from "esbuild";
import { unzipSync, strFromU8 } from "fflate";

// Offline checks for the HTML editor core. esbuild writes one disposable bundle to OS temp;
// no browser, server, network, environment file or database is involved.
const root = fileURLToPath(new URL("../", import.meta.url));
const temporary = mkdtempSync(path.join(tmpdir(), "byteverse-html-playground-"));
after(() => rmSync(temporary, { recursive: true, force: true }));
const outfile = path.join(temporary, "playground.cjs");
buildSync({
  absWorkingDir: root, bundle: true, platform: "node", format: "cjs", target: "es2020", logLevel: "silent", outfile,
  stdin: {
    contents: [
      "export * from './src/lib/html-playground';",
      "export * from './src/lib/html-playground-export';",
      "export { TEMPLATES } from './src/app/tools/html-editor/templates';",
    ].join("\n"),
    resolveDir: root, sourcefile: "html-playground-test-entry.ts", loader: "ts",
  },
});
const lib = createRequire(import.meta.url)(outfile);
const { buildDocument, mapLine, splitDocument, staticPreview, serializeProject, parseProject, describeConsoleMessage, encodeShare, decodeShare, zipProject, TEMPLATES } = lib;

const lineOf = (doc, needle) => doc.slice(0, doc.indexOf(needle)).split("\n").length;
const squash = (text) => text.replace(/\s+/g, "");
const captureSource = (doc) => /<script data-byteverse-preview>(.*?)<\/script>/.exec(doc)?.[1];

test("a fragment is wrapped in a complete document with CSS in the head and JS at the end of the body", () => {
  const project = { html: "<h1>Hi</h1>\n<p>Text</p>", css: "h1 { color: red; }", js: "console.log(1);\nboom();" };
  const { doc, segments } = buildDocument(project);
  assert.match(doc, /^<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">/);
  assert.ok(doc.indexOf("<style>") < doc.indexOf("</head>"));
  assert.ok(doc.indexOf("<script>") > doc.indexOf("<p>Text</p>") && doc.indexOf("</script>") < doc.indexOf("</body>"));
  assert.ok(!doc.includes("data-byteverse-preview"));
  assert.deepEqual(mapLine(segments, lineOf(doc, "boom();")), { source: "js", line: 2 });
  assert.deepEqual(mapLine(segments, lineOf(doc, "h1 { color")), { source: "css", line: 1 });
  assert.deepEqual(mapLine(segments, lineOf(doc, "<p>Text</p>")), { source: "html", line: 2 });
  assert.equal(mapLine(segments, 1), null);
});

test("a complete page keeps its own line numbers when the capture script, CSS and JS are injected", () => {
  const html = "<!DOCTYPE html>\n<html>\n<head>\n  <title>t</title>\n</head>\n<body>\n  <h1>One</h1>\n  <script>\n    early();\n  </script>\n</body>\n</html>";
  const project = { html, css: "body { margin: 0; }\nh1 { color: blue; }", js: "late();" };
  const plain = buildDocument(project);
  const captured = buildDocument(project, { capture: true });
  assert.equal(captured.doc.split("\n").length, plain.doc.split("\n").length, "capture script must not add a line");
  assert.match(captured.doc, /<head><script data-byteverse-preview>/);
  assert.ok(!captureSource(captured.doc).includes("\n"));
  for (const built of [plain, captured]) {
    assert.ok(built.doc.indexOf("h1 { color: blue; }") < built.doc.indexOf("</head>"));
    assert.ok(built.doc.indexOf("late();") > built.doc.indexOf("early();") && built.doc.indexOf("late();") < built.doc.indexOf("</body>"));
    assert.deepEqual(mapLine(built.segments, lineOf(built.doc, "early();")), { source: "html", line: 9 });
    assert.deepEqual(mapLine(built.segments, lineOf(built.doc, "<title>")), { source: "html", line: 4 });
    assert.deepEqual(mapLine(built.segments, lineOf(built.doc, "h1 { color: blue; }")), { source: "css", line: 2 });
    assert.deepEqual(mapLine(built.segments, lineOf(built.doc, "late();")), { source: "js", line: 1 });
    assert.deepEqual(mapLine(built.segments, lineOf(built.doc, "</html>")), { source: "html", line: 12 });
  }
});

test("pages without head or body tags, and a <header> element, are handled", () => {
  const headerOnly = buildDocument({ html: "<!DOCTYPE html>\n<header>Top</header>\n<p>x</p>", css: "p{}", js: "go();" }, { capture: true });
  assert.match(headerOnly.doc, /^<!DOCTYPE html><script data-byteverse-preview>/, "capture goes after the doctype, not into <header>");
  assert.ok(headerOnly.doc.indexOf("<style>") < headerOnly.doc.indexOf("<header>"));
  assert.ok(headerOnly.doc.trimEnd().endsWith("</script>"));
  const noBodyEnd = buildDocument({ html: "<html><body><p>x</p></html>", css: "", js: "go();" });
  assert.ok(noBodyEnd.doc.indexOf("go();") < noBodyEnd.doc.indexOf("</html>"));
  const empty = buildDocument({ html: "<p>only</p>", css: "  \n", js: "" });
  assert.ok(!empty.doc.includes("<style>") && !empty.doc.includes("<script>"));
});

test("closing tags inside the CSS and JS tabs cannot end the injected block", () => {
  const { doc } = buildDocument({ html: "<p>x</p>", css: 'p::after { content: "</style>"; }', js: 'const s = "</script><b>";' });
  assert.equal(doc.match(/<\/style>/g).length, 1);
  assert.equal(doc.match(/<\/script>/g).length, 1);
  assert.ok(doc.includes('"<\\/script><b>"'));
});

test("the external build links files instead of inlining them", () => {
  const { doc } = buildDocument({ html: "<!DOCTYPE html>\n<html><head></head><body><p>x</p></body></html>", css: "p{}", js: "go();" }, { external: true });
  assert.ok(doc.includes('<link rel="stylesheet" href="styles.css">\n</head>'));
  assert.ok(doc.includes('<script src="script.js"></script>\n</body>'));
  assert.ok(!doc.includes("go();") && !doc.includes("p{}"));
});

test("every template splits into tabs and rebuilds to the same page", () => {
  const keys = Object.keys(TEMPLATES);
  assert.equal(keys.length, 7);
  for (const key of keys) {
    const { label, description, code } = TEMPLATES[key];
    assert.ok(label && description, `${key} needs a label and description`);
    const project = splitDocument(code);
    assert.ok(project.css.length > 20, `${key} CSS tab`);
    assert.ok(!/<style|<script/i.test(project.html), `${key} HTML tab still holds style or script`);
    assert.ok(!project.css.startsWith(" ") && !/\s$/.test(project.css), `${key} CSS is dedented and trimmed`);
    assert.equal(squash(buildDocument(project).doc), squash(code), `${key} round trip`);
    const thumbnail = staticPreview(code);
    assert.ok(!/<script|\son[a-z]+=|javascript:/i.test(thumbnail), `${key} thumbnail must not contain script`);
    assert.ok(thumbnail.includes("<style>") && thumbnail.includes("</body>"), `${key} thumbnail keeps its styles`);
  }
  assert.ok(TEMPLATES.form.code.includes("onsubmit="), "the form template keeps its handler in the editor");
  const starter = splitDocument(TEMPLATES.starter.code);
  assert.match(starter.js, /^const button = document\.getElementById\("greet"\);/);
  assert.ok(starter.js.includes("console.log("));
});

test("projects serialize, and invalid or oversized data is rejected", () => {
  const project = { html: "<p>é ✓</p>", css: "p{}", js: "" };
  assert.deepEqual(parseProject(serializeProject(project)), project);
  for (const bad of ["", "null", "[]", '{"v":2,"html":"","css":"","js":""}', '{"v":1,"html":1,"css":"","js":""}', '{"v":1,"html":"","css":""}', "{not json"]) {
    assert.equal(parseProject(bad), null, bad);
  }
  assert.equal(parseProject(serializeProject({ html: "x".repeat(300_001), css: "", js: "" })), null);
});

test("share links round trip, stay URL-safe and reject tampering", () => {
  const project = splitDocument(TEMPLATES.landing.code);
  const hash = encodeShare(project);
  assert.match(hash, /^#code=[A-Za-z0-9_-]+$/);
  assert.ok(hash.length < 4000, `landing template link is ${hash.length} chars`);
  assert.deepEqual(decodeShare(hash), project);
  assert.deepEqual(decodeShare(encodeShare({ html: "<p>é ✓ 你好</p>", css: "", js: "" })), { html: "<p>é ✓ 你好</p>", css: "", js: "" });
  for (const bad of ["", "#code=", "#code=!!!", "#code=AAAA", "#other=abc", hash.slice(0, 40), `#code=${"A".repeat(12_001)}`]) {
    assert.equal(decodeShare(bad), null, bad.slice(0, 30));
  }
  let noise = "";
  let seed = 12345;
  for (let index = 0; index < 60_000; index++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    noise += String.fromCharCode(33 + ((seed >>> 24) % 90));
  }
  assert.equal(encodeShare({ html: noise, css: "", js: "" }), null, "incompressible projects do not fit in a link");
});

test("the ZIP holds index.html plus only the non-empty CSS and JS files", () => {
  const full = unzipSync(zipProject({ html: "<p>x</p>", css: "p { color: red; }", js: "go();" }));
  assert.deepEqual(Object.keys(full).sort(), ["index.html", "script.js", "styles.css"]);
  assert.equal(strFromU8(full["styles.css"]), "p { color: red; }");
  assert.equal(strFromU8(full["script.js"]), "go();");
  const index = strFromU8(full["index.html"]);
  assert.ok(index.includes('href="styles.css"') && index.includes('src="script.js"') && !index.includes("go();"));
  assert.deepEqual(Object.keys(unzipSync(zipProject({ html: "<p>x</p>", css: "", js: "" }))), ["index.html"]);
});

test("console messages are validated and labelled with the tab and line", () => {
  const { doc, segments } = buildDocument({ html: "<p>x</p>", css: "", js: "ok();\nboom();" }, { capture: true });
  const line = lineOf(doc, "boom();");
  const base = { byteversePreview: true, level: "error", message: "boom is not defined" };
  assert.deepEqual(describeConsoleMessage({ ...base, line, file: "about:srcdoc" }, segments), { level: "error", text: "boom is not defined (JS line 2)" });
  assert.deepEqual(describeConsoleMessage({ ...base, line, file: "https://site.test/tools/html-editor" }, segments, "https://site.test/tools/html-editor#code=x"), { level: "error", text: "boom is not defined (JS line 2)" });
  assert.deepEqual(describeConsoleMessage({ ...base, line: 7, file: "https://cdn.test/lib/app.min.js?v=2" }, segments, "https://site.test/"), { level: "error", text: "boom is not defined (app.min.js:7)" });
  assert.deepEqual(describeConsoleMessage({ ...base, line: 9999, file: "" }, segments), { level: "error", text: "boom is not defined (line 9999)" });
  assert.deepEqual(describeConsoleMessage({ ...base, level: "log", line: 0 }, segments), { level: "log", text: "boom is not defined" });
  assert.equal(describeConsoleMessage({ ...base, message: "x".repeat(5000) }, segments).text.length, 2000);
  for (const bad of [null, "text", {}, { ...base, byteversePreview: false }, { ...base, level: "table" }, { ...base, message: 5 }]) {
    assert.equal(describeConsoleMessage(bad, segments), null);
  }
});

test("the capture script reports console calls and errors, and pauses a flood", () => {
  const source = captureSource(buildDocument({ html: "<p>x</p>", css: "", js: "" }, { capture: true }).doc);
  const posted = [];
  const listeners = {};
  const calls = [];
  const context = vm.createContext({
    parent: { postMessage: (data, target) => { assert.equal(target, "*"); posted.push(data); } },
    window: { addEventListener: (type, handler) => { listeners[type] = handler; } },
    console: { log: (...args) => calls.push(args), info() {}, warn() {}, error() {}, debug() {} },
  });
  vm.runInContext(source, context);
  vm.runInContext('var loop = {}; loop.self = loop; console.log("a", { b: 1 }, undefined, [1, 2], function named() {}, new TypeError("bad"), loop); console.warn("careful"); console.error("broken")', context);
  assert.equal(calls.length, 1, "the original console still receives the call");
  assert.deepEqual(posted.map((item) => item.level), ["log", "warn", "error"]);
  assert.equal(posted[0].message, 'a {"b":1} undefined [1,2] function named() TypeError: bad {"self":"[repeated]"}');
  assert.ok(posted.every((item) => item.byteversePreview === true && item.line === 0));
  listeners.error({ message: "Uncaught ReferenceError: x is not defined", lineno: 12, filename: "about:srcdoc" });
  listeners.unhandledrejection({ reason: new Error("nope") });
  listeners.unhandledrejection({ reason: "plain" });
  assert.deepEqual(posted.slice(3).map((item) => [item.level, item.message, item.line, item.file]), [
    ["error", "Uncaught ReferenceError: x is not defined", 12, "about:srcdoc"],
    ["error", "Unhandled promise rejection: nope", 0, ""],
    ["error", "Unhandled promise rejection: plain", 0, ""],
  ]);
  vm.runInContext('for (var i = 0; i < 1000; i++) console.log("spam " + i)', context);
  assert.equal(posted.length, 301);
  assert.deepEqual([posted[300].level, posted[300].message], ["warn", "Console output paused after 300 messages in this run."]);
});
