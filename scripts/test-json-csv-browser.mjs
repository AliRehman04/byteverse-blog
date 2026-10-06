/**
 * Direct Node runner for the PARENT'S already-built, credential-free preview.
 * No server/build management, installs, application-module execution, env-file
 * reads, database access, API probes, external navigation, or workspace output.
 * Normal cases use the actual hydrated Next client and native bundled Worker.
 * Explicit fault cases gate native deliveries/file reads or capture clipboard
 * writes IN MEMORY; they never read or write the operating-system clipboard.
 * Run without arguments for full coverage. --from N is always a focused run.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, expect as playwrightExpect } from "@playwright/test";
import { parseDocument } from "htmlparser2";
import ts from "typescript";

const ORIGIN = "http://127.0.0.1:3042";
const TOOL_PATH = "/tools/json-to-csv";
const TARGET = `${ORIGIN}${TOOL_PATH}`;
const PRODUCTION = "https://www.byteverse.fyi";
const CANONICAL = `${PRODUCTION}${TOOL_PATH}`;
const IMAGE_PATH = `${TOOL_PATH}/opengraph-image`;
const ROW_SOURCE = "Row source JSON Pointer";
const ROOT = fileURLToPath(new URL("../", import.meta.url));
const expect = playwrightExpect.configure({ timeout: 12_000 });
const cases = [], results = [], screenshots = [], downloads = [];
let browser, artifactDirectory;

// Extract trusted DATA literals only. No transpilation/eval/import of the
// application, config, input helper, engine, routes, or existing test runners.
function literal(node) {
  assert.ok(node, "Missing contract literal");
  if (ts.isAsExpression(node) || ts.isParenthesizedExpression(node)) return literal(node.expression);
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isNumericLiteral(node)) return Number(node.text.replaceAll("_", ""));
  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.AsteriskToken) {
    // The byte limits are written as 2 * 1024 * 1024, not executable calls.
    const left = literal(node.left), right = literal(node.right);
    assert.equal(typeof left, "number"); assert.equal(typeof right, "number");
    assert.ok(Number.isSafeInteger(left * right)); return left * right;
  }
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (node.kind === ts.SyntaxKind.NullKeyword) return null;
  if (ts.isArrayLiteralExpression(node)) return node.elements.map(literal);
  assert.ok(ts.isObjectLiteralExpression(node), "Contract extraction does not execute expressions");
  const entries = node.properties.map((property) => {
    assert.ok(ts.isPropertyAssignment(property) && (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)));
    return [property.name.text, literal(property.initializer)];
  });
  assert.equal(new Set(entries.map(([key]) => key)).size, entries.length);
  return Object.fromEntries(entries);
}
function contracts(relative, names) {
  assert.ok(["src/lib/json-csv/types.ts", "src/lib/json-csv/samples.ts",
    "src/app/tools/json-to-csv/page.tsx", "src/app/tools/json-to-csv/opengraph-image.tsx"].includes(relative));
  const tree = ts.createSourceFile(relative, readFileSync(join(ROOT, relative), "utf8"), ts.ScriptTarget.Latest, true);
  assert.equal(tree.parseDiagnostics.length, 0, "Contract source must parse");
  return names.map((name) => {
    const declarations = tree.statements.filter(ts.isVariableStatement).flatMap((statement) => [...statement.declarationList.declarations])
      .filter((declaration) => ts.isIdentifier(declaration.name) && declaration.name.text === name);
    assert.equal(declarations.length, 1, `Expected one ${name} literal`);
    return literal(declarations[0].initializer);
  });
}
const [LIMITS, DEFAULTS] = contracts("src/lib/json-csv/types.ts", ["JSON_CSV_LIMITS", "DEFAULT_CSV_OPTIONS"]);
const [SAMPLES] = contracts("src/lib/json-csv/samples.ts", ["JSON_CSV_SAMPLES"]);
const [TOOL] = contracts("src/app/tools/json-to-csv/page.tsx", ["toolConfig"]);
const [IMAGE_ALT] = contracts("src/app/tools/json-to-csv/opengraph-image.tsx", ["alt"]);
const CATALOG_DESCRIPTION = "Convert JSON or JSON Lines to CSV locally: choose rows, flatten nested fields, expand one array and preview columns with formula-risk protection.";
const LLMS_DESCRIPTION = "Convert strict JSON or JSON Lines to CSV locally; choose rows, flatten nested fields, expand one array, edit columns and preview formula-risk protection. No AI or URL import";
const PEOPLE_HEADERS = ["id", "name", "team", "location.city", "active"];
const PEOPLE_ROWS = [["001", "Maya", "Design", "Bristol", "true"], ["002", "Leo", "Engineering", "Oslo", "false"], ["003", "Amina", "", "", "true"]];
const API_HEADERS = ["id", "title", "tags", "price"];
const API_ROWS = [["9123372036854000123", "Café guide", '["reading", "weekend"]', "2.370"], ["9123372036854000124", "City map", '["travel"]', "5.50"]];
const EXPORT_HEADERS = ["id", "text", "cr", "lf", "quote", "unicode"];
const EXPORT_ROWS = [["001", "comma,semi;tab\tpipe|", "left\rright", "top\nbottom", 'say "hello"', "Café 😀 العربية"],
  ["002", " plain ", "CRLF\r\nend", "", '"', "漢字 e\u0301"]];
const EXPORT_INPUT = JSON.stringify(EXPORT_ROWS.map((row) => Object.fromEntries(EXPORT_HEADERS.map((header, index) => [header, row[index]]))));
const normalTextarea = (value) => value.replace(/\r\n?/g, "\n");
const count = (value) => value.toLocaleString("en-US");
const hash = (value) => createHash("sha256").update(value).digest("hex");
const collapse = (value) => value.replace(/\s+/g, " ").trim();
function scenario(name, run, options = {}) { cases.push({ name, run, options }); }
function safeError(error) {
  return String(error?.stack ?? error).replace(/\u001b\[[0-9;]*m/g, "").split("\n").slice(0, 18)
    .map((line) => line.length > 240 ? `${line.slice(0, 100)} [long diagnostic omitted]` : line).join("\n").slice(0, 3_000);
}
function equalText(actual, expected, message) { assert.ok(actual === expected, `${message}; lengths ${actual.length}/${expected.length}`); }

// Small independent reference writer and strict quote-aware reader. Neither
// calls Papa or the application engine. Numeric fixtures are hand-written
// strings, never JSON.parse'd into an imprecise JavaScript Number.
function expectedCsv(matrix, { delimiter = ",", newline = "\r\n", quoteAll = false } = {}) {
  return matrix.map((row) => row.map((value) => {
    assert.equal(typeof value, "string");
    const quoted = quoteAll || (row.length === 1 && value === "") || value.includes(delimiter)
      || /["\r\n\ufeff]/.test(value) || value.startsWith(" ") || value.endsWith(" ");
    return quoted ? `"${value.replaceAll('"', '""')}"` : value;
  }).join(delimiter)).join(newline);
}
function readCsv(text, delimiter = ",") {
  if (!text) return [];
  const rows = [];
  let row = [], field = "", quoted = false, closed = false, started = false;
  const fieldEnd = () => { row.push(field); field = ""; closed = false; started = false; };
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (quoted) {
      if (char !== '"') field += char;
      else if (text[index + 1] === '"') { field += '"'; index++; }
      else { quoted = false; closed = true; }
    } else if (char === '"') {
      assert.ok(!started && !closed, "CSV quote must start a field"); quoted = true; started = true;
    } else if (char === delimiter) fieldEnd();
    else if (char === "\r" || char === "\n") {
      if (char === "\r" && text[index + 1] === "\n") index++;
      fieldEnd(); rows.push(row); row = [];
    } else {
      assert.equal(closed, false, "CSV has text after a closing quote"); field += char; started = true;
    }
  }
  assert.equal(quoted, false, "CSV has an unterminated quoted field");
  if (started || closed || row.length || text.endsWith(delimiter)) { fieldEnd(); rows.push(row); }
  return rows;
}
function sameMatrix(actual, expected, label = "Independent CSV values") {
  assert.equal(actual.length, expected.length, `${label}: record count (not newline count)`);
  for (const [index, row] of expected.entries()) {
    assert.equal(actual[index].length, row.length, `${label}: columns in record ${index}`);
    row.forEach((value, column) => equalText(actual[index][column], value, `${label}: record ${index}, field ${column}`));
  }
}
function nodes(root, predicate) {
  const found = [];
  function visit(node) { if (predicate(node)) found.push(node); for (const child of node.children ?? []) visit(child); }
  visit(root); return found;
}
function nodeText(node) { return node.type === "text" ? node.data : (node.children ?? []).map(nodeText).join(""); }
function one(root, predicate, label) {
  const found = nodes(root, predicate); assert.equal(found.length, 1, `Exactly one ${label}`); return found[0];
}
function meta(root, key, attribute = "name") {
  return one(root, (node) => node.name === "meta" && node.attribs[attribute] === key, key).attribs.content;
}
function schemas(root) {
  return nodes(root, (node) => node.name === "script" && node.attribs.type === "application/ld+json")
    .flatMap((node) => { const value = JSON.parse(nodeText(node)); return Array.isArray(value) ? value : value["@graph"] ?? [value]; });
}

// Native operations remain native. Only explicitly selected fault gates alter
// completion; stored message callbacks are used solely to inject late delivery.
function installProbe({ workerMode = "native", fileMode = "native", clipboardMode = "capture" }) {
  if (Object.hasOwn(window, "__jsonCsvBrowserProbe")) return;
  const probe = { workers: [], files: [], copies: [], clipboardPending: 0, blobs: [],
    constructorFailures: 0, holdMessages: false, held: 0, released: 0, injectedErrors: 0, preventedErrors: 0 };
  Object.defineProperty(window, "__jsonCsvBrowserProbe", { value: probe });
  let messages = [];
  const imports = [], clipboards = [], workerErrors = [];
  probe.releaseMessages = (index) => {
    if (index === undefined) probe.holdMessages = false;
    const selected = messages.filter((entry) => index === undefined || entry.index === index);
    messages = messages.filter((entry) => !selected.includes(entry));
    selected.forEach((entry) => { probe.released++; entry.deliver(); });
  };
  probe.releaseImports = () => imports.splice(0).forEach((release) => release());
  probe.releaseClipboard = () => clipboards.splice(0).forEach((release) => release());
  probe.injectWorkerError = (index) => workerErrors[index]();
  probe.snapshot = () => ({ workers: probe.workers, files: probe.files, blobs: probe.blobs,
    copyLengths: probe.copies.map((text) => text.length), clipboardPending: probe.clipboardPending,
    constructorFailures: probe.constructorFailures, held: probe.held, released: probe.released,
    heldPending: messages.length, injectedErrors: probe.injectedErrors, preventedErrors: probe.preventedErrors });
  const nativeRead = File.prototype.arrayBuffer;
  File.prototype.arrayBuffer = async function () {
    const record = { bytes: this.size, pending: true, held: fileMode === "hold", completed: false };
    probe.files.push(record);
    try {
      if (fileMode === "hold") await new Promise((resolve) => imports.push(resolve));
      if (fileMode === "reject") throw new Error("SYNTHETIC_FILE_INTERNAL_ERROR");
      const value = await Reflect.apply(nativeRead, this, []); record.completed = true; return value;
    } finally { record.pending = false; }
  };
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: {
    async writeText(text) {
      probe.copies.push(String(text)); probe.clipboardPending++;
      try {
        if (clipboardMode === "reject") throw new Error("Synthetic clipboard rejection");
        if (clipboardMode === "hold") await new Promise((resolve) => clipboards.push(resolve));
      } finally { probe.clipboardPending--; }
    },
  } });
  const create = URL.createObjectURL, revoke = URL.revokeObjectURL;
  URL.createObjectURL = function (blob) {
    const url = Reflect.apply(create, URL, [blob]);
    probe.blobs.push({ url, bytes: blob.size, mime: blob.type, revoked: false }); return url;
  };
  URL.revokeObjectURL = function (url) {
    const record = probe.blobs.find((entry) => entry.url === url); if (record) record.revoked = true;
    return Reflect.apply(revoke, URL, [url]);
  };
  const NativeWorker = window.Worker;
  if (workerMode === "unsupported") window.Worker = undefined;
  else if (workerMode === "constructor-error") window.Worker = class {
    constructor() { probe.constructorFailures++; throw new Error("SYNTHETIC_WORKER_INTERNAL_ERROR"); }
  };
  else window.Worker = class extends NativeWorker {
    constructor(url, options) {
      super(url, options);
      const index = probe.workers.length;
      this.audit = { url: new URL(String(url), location.href).href, type: options?.type ?? "classic", posted: [], received: [], terminateCalls: 0 };
      probe.workers.push(this.audit);
      this.addEventListener("message", (event) => {
        const data = event.data;
        this.audit.received.push({ id: data.id, kind: data.kind, keys: Object.keys(data).sort(),
          rows: data.conversion?.stats.outputRows, columns: data.conversion?.stats.exportedColumns,
          inputChars: data.inspection?.inputChars, inputBytes: data.inspection?.inputBytes });
        if (!probe.holdMessages) return;
        const callback = this.onmessage;
        if (typeof callback !== "function") throw new Error("Missing real client Worker callback");
        event.stopImmediatePropagation(); probe.held++;
        messages.push({ index, deliver: () => callback.call(this, event) });
      });
      workerErrors.push(() => {
        const event = new ErrorEvent("error", { message: "SYNTHETIC_WORKER_INTERNAL_ERROR", cancelable: true });
        probe.injectedErrors++; this.onerror?.call(this, event);
        if (event.defaultPrevented) probe.preventedErrors++;
      });
    }
    postMessage(request, ...rest) {
      this.audit.posted.push({ id: request.id, kind: request.kind, format: request.format,
        keys: Object.keys(request).sort(), inputChars: request.input.length, inputBytes: new TextEncoder().encode(request.input).length,
        optionKeys: request.options ? Object.keys(request.options).sort() : [], columnCount: request.columns?.length,
        rowPathChars: request.options?.rowPath.length, expandPathChars: request.options?.expandPath?.length });
      return super.postMessage(request, ...rest);
    }
    terminate() { this.audit.terminateCalls++; return super.terminate(); }
  };
}

const DOCUMENTS = new Set([TOOL_PATH, "/tools", "/site-map"]);
const HTTP_GETS = new Set([...DOCUMENTS, IMAGE_PATH, "/llms.txt", "/sitemap.xml"]);
const ASSETS = new Set(["/logo.png", "/favicon.ico", "/favicon-16x16.png", "/favicon-32x32.png", "/apple-icon.png",
  "/apple-touch-icon.png", "/android-chrome-192x192.png", "/android-chrome-512x512.png", "/site.webmanifest"]);
const GLOBAL_HOSTS = new Set(["translate.googleapis.com", "translate.google.com", "translate.gstatic.com", "res.cloudinary.com",
  "images.unsplash.com", "fonts.googleapis.com", "fonts.gstatic.com", "www.googletagmanager.com", "www.google-analytics.com",
  "region1.google-analytics.com", "pagead2.googlesyndication.com", "googleads.g.doubleclick.net", "tpc.googlesyndication.com"]);
const onlyKeys = (url, keys) => [...url.searchParams.keys()].every((key) => keys.includes(key));
function allowedGet(url, method) {
  if (method !== "GET" || url.origin !== ORIGIN || url.username || url.password) return false;
  if (url.pathname.startsWith("/_next/static/")) return onlyKeys(url, ["dpl", "v"]);
  if (DOCUMENTS.has(url.pathname)) return onlyKeys(url, ["_rsc"]);
  if (ASSETS.has(url.pathname)) return !url.search || /^\?[\w.-]{1,160}(?:=[\w.-]{1,160})?$/.test(url.search);
  return url.pathname === "/_next/image" && url.searchParams.get("url") === "/logo.png"
    && onlyKeys(url, ["url", "w", "q"]) && /^\d+$/.test(url.searchParams.get("w") ?? "") && /^\d+$/.test(url.searchParams.get("q") ?? "");
}
async function stableBox(locator) {
  let previous, stable = 0;
  await expect.poll(async () => {
    const box = await locator.boundingBox(); if (!box) return false;
    const next = [box.x, box.y, box.width, box.height];
    stable = previous && next.every((value, index) => Math.abs(value - previous[index]) < 0.5) ? stable + 1 : 0;
    previous = next; return stable >= 2;
  }, { message: "Action target geometry must settle", intervals: [75, 100, 150] }).toBe(true);
}
async function sameValue(locator, expected) {
  await expect.poll(async () => (await locator.inputValue()) === expected, { message: "Exact input value, without logging its contents" }).toBe(true);
}
async function noResult(h) {
  await expect(h.result).toHaveCount(0);
  await expect(h.workspace.getByRole("button", { name: /^Download (CSV|TSV)$/ })).toHaveCount(0);
  await expect(h.button("Copy full CSV")).toHaveCount(0);
}
async function errorIs(h, pattern) {
  await expect(h.alert).toBeVisible(); await expect(h.alert).toContainText(pattern);
  assert.ok((await h.alert.textContent()).length < 450, "Error must not echo an input excerpt");
}
function classify(h, record) {
  if (record.inputMatches.length) return "input-bearing:FAIL";
  if (record.allowed) return record.blob ? "local-blob-download" : "loopback-GET";
  if (record.origin === ORIGIN && record.path.startsWith("/api/")) return "API-attempt:FAIL";
  if (record.origin !== ORIGIN && GLOBAL_HOSTS.has(record.hostname)) return "blocked-sitewide-resource";
  if (record.remoteImage) return "blocked-remote-image-proxy";
  if (record.prefetch && record.method === "GET" && record.onlyRsc && h.references.has(record.path)) return "blocked-app-reference-prefetch";
  return "unexpected-request:FAIL";
}
async function createHarness(entry, index) {
  const h = { index, name: entry.name, phase: "initial", generation: 0, closing: false, source: "", inputs: [], needles: [],
    requests: [], console: [], pageErrors: [], guardErrors: [], nativeWorkers: [], probeArchives: [], references: new Set(),
    resourceHints: [], sockets: [], dialogs: 0, popupChecks: [], secondaryPages: [], downloads: 0, downloadIntent: false,
    unexpectedDownloads: 0, httpGets: [], layouts: [], pointerActions: 0, js: entry.options.js !== false };
  h.context = await browser.newContext({ viewport: { width: entry.options.width ?? 1440, height: 900 }, deviceScaleFactor: 1,
    colorScheme: "light", reducedMotion: "reduce", locale: "en-US", timezoneId: "UTC", serviceWorkers: "block",
    javaScriptEnabled: h.js, acceptDownloads: true });
  h.context.setDefaultTimeout(12_000); h.context.setDefaultNavigationTimeout(30_000);
  h.track = (text, kind = "input") => {
    h.inputs.push({ kind, chars: text.length, bytes: Buffer.byteLength(text), sha256: hash(text) });
    if (text.length < 16) return;
    const prefix = text.slice(0, 96).replace(/[\uD800-\uDBFF]$/, "");
    const encodable = prefix.toWellFormed();
    h.needles.push({ id: `${kind}-${h.inputs.length}`, variants: [prefix, collapse(prefix), JSON.stringify(prefix).slice(1, -1),
      encodeURIComponent(encodable), new URLSearchParams({ q: encodable }).toString().slice(2), Buffer.from(prefix).toString("base64").replace(/=+$/, "")].filter(Boolean) });
  };
  const seen = new WeakMap(), requestUrls = new Map();
  function observe(request) {
    if (seen.has(request)) return seen.get(request);
    const url = new URL(request.url()), headers = request.headers();
    const raw = [request.url(), request.postData() ?? "", ...Object.values(headers)].join("\n");
    let decoded = raw; try { decoded = decodeURIComponent(raw.replace(/\+/g, " ")); } catch { /* Raw bytes still checked. */ }
    const matches = h.needles.filter((needle) => needle.variants.some((variant) => [raw, decoded, collapse(decoded)].some((form) => form.includes(variant)))).map((needle) => needle.id);
    const blob = url.protocol === "blob:" && url.origin === ORIGIN && request.method() === "GET" && h.downloadIntent;
    const record = { phase: h.phase, method: request.method(), type: request.resourceType(), origin: url.origin, hostname: url.hostname,
      path: matches.length ? "[input path redacted]" : url.pathname.slice(0, 240), queryKeys: matches.length ? ["[redacted]"] : [...url.searchParams.keys()].map((key) => key.slice(0, 50)),
      bodyBytes: request.postDataBuffer()?.length ?? 0, inputMatches: matches, blob,
      allowed: !matches.length && !request.postDataBuffer()?.length && (blob || allowedGet(url, request.method())),
      prefetch: url.origin === ORIGIN && (headers.rsc === "1" || headers["next-router-prefetch"] === "1" || url.searchParams.has("_rsc")),
      onlyRsc: onlyKeys(url, ["_rsc"]), remoteImage: url.origin === ORIGIN && url.pathname === "/_next/image" && /^https?:\/\//.test(url.searchParams.get("url") ?? "") };
    seen.set(request, record); requestUrls.set(request.url(), record); h.requests.push(record); return record;
  }
  h.context.on("request", observe);
  h.context.on("response", (response) => { observe(response.request()).status = response.status(); });
  h.context.on("requestfailed", (request) => { observe(request).failed = true; observe(request).failureText = request.failure()?.errorText; });
  await h.context.route("**/*", async (route) => {
    const record = observe(route.request());
    try { if (record.allowed) await route.continue(); else { record.blockedByHarness = true; await route.abort("blockedbyclient"); } }
    catch (error) { if (!h.closing) h.guardErrors.push(safeError(error)); }
  });
  await h.context.routeWebSocket("**/*", (socket) => { h.sockets.push("blocked websocket"); socket.close(); });
  if (h.js) await h.context.addInitScript(installProbe, entry.options);
  let pages = 0;
  h.context.on("page", (page) => {
    if (++pages > 1) {
      const secondary = { initialUrl: page.url(), finalUrl: "", allowedDownloadHub: false };
      h.secondaryPages.push(secondary);
      h.popupChecks.push((async () => {
        try {
          // Edge may emit an initially empty page BEFORE the download event.
          // Classify only its final URL + an observed REAL native download.
          await expect.poll(() => ({ url: page.url(), downloaded: h.downloads > 0 }), { timeout: 5_000 })
            .toEqual({ url: "edge://downloads-hub/", downloaded: true });
          secondary.allowedDownloadHub = true;
        } catch { /* Recorded and failed by verifyHealthy, never silently closed. */ }
        finally { secondary.finalUrl = page.url().slice(0, 240); }
      })());
      // NEVER await closing an individual downloads-hub page: Edge can hang.
      // The isolated context, not this handler, owns all secondary-page cleanup.
    }
    page.on("pageerror", (error) => h.pageErrors.push(safeError(error)));
    page.on("console", (message) => {
      if (message.type() === "error") h.console.push({ text: message.text(), url: message.location().url });
    });
    page.on("dialog", async (dialog) => { h.dialogs++; await dialog.dismiss().catch((error) => h.guardErrors.push(safeError(error))); });
    page.on("download", () => { h.downloads++; if (!h.downloadIntent) h.unexpectedDownloads++; });
    page.on("worker", (worker) => {
      const record = { url: worker.url(), generation: h.generation, closed: false }; h.nativeWorkers.push(record);
      worker.on("close", () => { record.closed = true; });
    });
  });
  h.page = await h.context.newPage();
  h.workspace = h.page.getByRole("region", { name: "JSON to CSV workspace", exact: true });
  h.result = h.workspace.getByTestId("json-csv-result");
  h.input = h.workspace.getByRole("textbox", { name: "Your JSON", exact: true });
  h.alert = h.workspace.getByRole("alert"); h.status = h.workspace.locator(".jcsv-status");
  h.copyNotice = h.workspace.locator(".jcsv-copy-global");
  h.confirmation = h.workspace.getByRole("group", { name: "Confirm input replacement", exact: true });
  h.button = (name) => h.workspace.getByRole("button", { name, exact: true });
  h.selectControl = (name) => h.workspace.getByRole("combobox", { name, exact: true });
  h.textbox = (name) => h.workspace.getByRole("textbox", { name, exact: true });
  h.probe = () => h.js ? h.page.evaluate(() => window.__jsonCsvBrowserProbe.snapshot()) : Promise.resolve(null);
  h.release = (kind, index) => h.page.evaluate(({ kind, index }) => window.__jsonCsvBrowserProbe[`release${kind}`](index), { kind, index });
  h.hold = (held) => h.page.evaluate((held) => { window.__jsonCsvBrowserProbe.holdMessages = held; }, held);
  h.injectError = (index) => h.page.evaluate((index) => window.__jsonCsvBrowserProbe.injectWorkerError(index), index);
  h.click = async (locator) => {
    await expect(locator).toBeVisible(); await expect(locator).toBeEnabled(); await locator.scrollIntoViewIfNeeded();
    await locator.click({ trial: true }); await stableBox(locator); await locator.click(); h.pointerActions++;
  };
  h.select = async (name, value) => { const locator = h.selectControl(name); await locator.selectOption(String(value)); await expect(locator).toHaveValue(String(value)); };
  h.fill = async (locator, value, kind = "control") => { h.track(value, kind); await locator.fill(value); await sameValue(locator, normalTextarea(value)); };
  h.setInput = async (value, format = "json") => {
    if (await h.selectControl("Input format").inputValue() !== format) await h.select("Input format", format);
    await h.fill(h.input, value, "JSON"); h.source = normalTextarea(value); await noResult(h);
  };
  h.check = async (name, checked) => {
    const locator = h.workspace.getByRole("checkbox", { name, exact: true });
    await locator.scrollIntoViewIfNeeded(); await stableBox(locator); await locator.setChecked(checked);
    if (checked) await expect(locator).toBeChecked(); else await expect(locator).not.toBeChecked();
  };
  h.open = async (selector) => {
    const details = h.workspace.locator(selector);
    if (await details.getAttribute("open") === null) await h.click(details.locator(":scope > summary"));
    await expect(details).toHaveAttribute("open", ""); return details;
  };
  h.readReferences = async () => {
    const references = await h.page.locator("a[href]").evaluateAll((elements) => elements.map((element) => element.getAttribute("href")));
    for (const reference of references) {
      const url = new URL(reference, ORIGIN); if (url.origin === ORIGIN) h.references.add(url.pathname);
    }
    h.resourceHints = await h.page.locator('link[rel="preconnect"], link[rel="dns-prefetch"]').evaluateAll((elements) =>
      elements.map((element) => ({ rel: element.rel, href: element.href, classification: "sitewide hint, not an input request" })));
  };
  h.goto = async (path = TOOL_PATH) => {
    assert.ok(DOCUMENTS.has(path), "Only approved loopback documents may be opened");
    const response = await h.page.goto(`${ORIGIN}${path}`, { waitUntil: "load" });
    assert.equal(response?.status(), 200); await expect(h.page).toHaveURL(`${ORIGIN}${path}`); await h.readReferences(); return response;
  };
  h.ready = async () => {
    await expect(h.workspace).toBeVisible();
    if (h.js) await expect.poll(() => h.button("Load example").evaluate((element) => Object.keys(element)
      .some((key) => key.startsWith("__reactProps$") && typeof element[key]?.onClick === "function")), { message: "Observe hydration, never invoke a React handler" }).toBe(true);
    h.phase = "workflow";
  };
  h.http = async (path) => {
    const url = new URL(path, ORIGIN);
    assert.ok(url.origin === ORIGIN && HTTP_GETS.has(url.pathname) && !url.search && !url.hash && !url.username && !url.password);
    // APIRequestContext bypasses browser routes: independently whitelist GET
    // paths and disable redirects/retries. Never use this for an /api endpoint.
    const response = await h.context.request.get(url.href, { maxRedirects: 0, maxRetries: 0, timeout: 30_000, failOnStatusCode: false });
    h.httpGets.push({ path, status: response.status() }); assert.equal(response.status(), 200); return response;
  };
  h.consoleAudit = () => h.console.map((entry) => {
    const request = requestUrls.get(entry.url);
    const category = request ? classify(h, request) : "unmatched";
    // No broad 'Failed to fetch/load' suppression: hydration, React, chunk,
    // RSC and all other framework/application errors ALWAYS remain failures.
    const expected = /^Failed to load resource: net::ERR_BLOCKED_BY_CLIENT(?:\.Inspector)?(?:\s.*)?$/.test(entry.text)
      && request?.blockedByHarness && category.startsWith("blocked-");
    return { category: expected ? category : "console-error:FAIL", message: safeError(entry.text), path: request?.path ?? "[no matching request]" };
  });
  try { if (entry.options.open !== false) { h.initialResponse = await h.goto(); await h.ready(); } return h; }
  catch (error) { error.harness = h; throw error; }
}

async function terminated(h) {
  if (!h.js) return;
  await expect.poll(async () => (await h.probe()).workers.every((worker) => worker.terminateCalls === 1), { message: "Every real client Worker is terminated once" }).toBe(true);
  const probe = await h.probe();
  await expect.poll(() => h.nativeWorkers.filter((worker) => worker.generation === h.generation).length, { message: "Independent native Worker events, not just a mocked constructor" }).toBe(probe.workers.length);
  await expect.poll(() => h.nativeWorkers.every((worker) => worker.closed), { message: "All native Worker close callbacks observed" }).toBe(true);
  for (const worker of probe.workers) {
    const url = new URL(worker.url); assert.equal(url.origin, ORIGIN); assert.match(url.pathname, /^\/_next\/static\/.+\.js$/);
    assert.ok(["classic", "module"].includes(worker.type)); assert.equal(worker.posted.length, 1);
    const request = worker.posted[0]; assert.ok(Number.isSafeInteger(request.id) && request.id >= 0);
    assert.ok(["inspect", "convert"].includes(request.kind)); assert.ok(["json", "jsonl"].includes(request.format));
    assert.ok(request.inputChars > 0 && request.inputChars <= LIMITS.inputChars && request.inputBytes <= LIMITS.inputBytes);
    assert.deepEqual(request.keys, (request.kind === "inspect" ? ["id", "kind", "input", "format"] : ["id", "kind", "input", "format", "options", ...(request.columnCount === undefined ? [] : ["columns"])]).sort());
    assert.deepEqual(request.optionKeys, request.kind === "inspect" ? [] : Object.keys(DEFAULTS).sort());
    for (const response of worker.received) {
      assert.equal(response.id, request.id); assert.ok(response.kind === request.kind || response.kind === "error");
      assert.deepEqual(response.keys, ["id", "kind", response.kind === "error" ? "error" : response.kind === "inspect" ? "inspection" : "conversion"].sort());
    }
  }
}
async function completedWorker(h, before, kind) {
  await terminated(h); const probe = await h.probe(); assert.equal(probe.workers.length, before + 1);
  const worker = probe.workers.at(-1); assert.equal(worker.posted[0].kind, kind); assert.equal(worker.received.length, 1);
  assert.equal(worker.received[0].kind, kind); assert.equal(worker.posted[0].inputChars, h.source.length);
  assert.equal(worker.posted[0].inputBytes, Buffer.byteLength(h.source));
}
async function inspect(h) {
  const before = (await h.probe()).workers.length;
  await h.click(h.button("Inspect JSON")); await expect(h.workspace.locator(".jcsv-valid-badge")).toBeVisible();
  await expect(h.status).toHaveText("Valid input. Root is selected by default; choose a detected array for wrapped API records.");
  await expect(h.selectControl(ROW_SOURCE)).toHaveValue(""); await noResult(h); await completedWorker(h, before, "inspect");
}
async function build(h, rows, columns, inputRows = rows) {
  const before = (await h.probe()).workers.length;
  const tsv = await h.selectControl("Delimiter").inputValue() === "\t";
  await h.click(h.button(tsv ? "Build TSV" : "Build CSV"));
  await expect(h.result).toBeVisible({ timeout: 20_000 }); await expect(h.alert).toHaveCount(0);
  await expect(h.result.getByTestId("json-csv-row-count")).toHaveText(count(rows));
  await expect(h.result.getByTestId("json-csv-column-count")).toHaveText(String(columns));
  await expect(h.result.locator(".jcsv-stats > div").first().locator("small")).toHaveText(`${count(inputRows)} input ${inputRows === 1 ? "record" : "records"}`);
  await completedWorker(h, before, "convert");
}
async function sample(h, index = 0) {
  const sample = SAMPLES[index]; h.track(sample.text, "sample");
  const replace = Boolean((await h.input.inputValue()).trim());
  await h.select("Try an example", index); await h.click(h.button("Load example"));
  if (replace) await h.click(h.confirmation.getByRole("button", { name: "Replace input", exact: true }));
  await sameValue(h.input, sample.text); h.source = sample.text;
  await expect(h.selectControl("Input format")).toHaveValue(sample.format); await noResult(h);
  await expect(h.button("Build CSV")).toBeDisabled(); await inspect(h);
}
async function fixture(h, text = EXPORT_INPUT, format = "json") { await h.setInput(text, format); await inspect(h); }
async function captureCsv(h) {
  const before = (await h.probe()).copyLengths.length;
  await h.click(h.button("Copy full CSV"));
  await expect(h.copyNotice).toHaveText("Full CSV copied without a BOM. Check spreadsheet import types before using it.");
  const probe = await h.probe(); assert.equal(probe.copyLengths.length, before + 1); assert.equal(probe.clipboardPending, 0);
  return h.page.evaluate((index) => window.__jsonCsvBrowserProbe.copies[index], before);
}
async function exportMatches(h, headers, rows, options = {}) {
  const matrix = options.includeHeader === false ? rows : [headers, ...rows];
  const csv = await captureCsv(h);
  equalText(csv, expectedCsv(matrix, options), "Full copied CSV, including exact CR/LF and quote spelling");
  sameMatrix(readCsv(csv, options.delimiter), matrix);
  assert.notEqual(csv.charCodeAt(0), 0xfeff, "The download-only BOM must not enter clipboard text");
  await h.click(h.button("Table preview"));
  const shownHeaders = await h.result.locator("thead th").allTextContents();
  assert.deepEqual(shownHeaders, ["Row", ...headers]);
  const shown = await h.result.locator("tbody tr").evaluateAll((elements) => elements.map((row) => [...row.querySelectorAll("td button")]
    .map((button) => button.querySelector(".jcsv-empty-cell") ? "" : button.textContent)));
  for (const [index, row] of shown.entries()) for (const [column, value] of row.entries()) {
    if (rows[index][column].length <= 160) equalText(value, rows[index][column], "Visible export-transformed table cell");
    else assert.ok(value.endsWith("…") && value.length <= 161, "Long table cells are bounded, not the export");
  }
  return csv;
}
async function nativeDownload(h, name, expectedName, matrix, options = {}) {
  await h.fill(h.textbox("Filename"), name, "filename"); h.downloadIntent = true;
  try {
    const pending = h.page.waitForEvent("download");
    const [, download] = await Promise.all([h.click(h.button(options.delimiter === "\t" ? "Download TSV" : "Download CSV")), pending]);
    assert.equal(download.suggestedFilename(), expectedName); assert.equal(await download.failure(), null);
    const path = join(artifactDirectory, `${String(h.index + 1).padStart(2, "0")}-download-${downloads.length + 1}.${options.delimiter === "\t" ? "tsv" : "csv"}`);
    await download.saveAs(path); const bytes = await readFile(path);
    const csv = expectedCsv(matrix, options), bom = options.bom !== false;
    const expected = Buffer.from(`${bom ? "\ufeff" : ""}${csv}`, "utf8");
    assert.ok(bytes.equals(expected), "Real downloaded bytes equal independently encoded full CSV/TSV, not textarea contents");
    const decoded = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
    equalText(decoded, `${bom ? "\ufeff" : ""}${csv}`, "Downloaded Unicode is lossless");
    sameMatrix(readCsv(bom ? decoded.slice(1) : decoded, options.delimiter), matrix, "Native download read-back");
    const blob = (await h.probe()).blobs.at(-1); assert.equal(blob.bytes, bytes.length);
    assert.equal(blob.mime, `${options.delimiter === "\t" ? "text/tab-separated-values" : "text/csv"};charset=utf-8`);
    downloads.push({ case: h.name, path, suggestedName: expectedName, bytes: bytes.length, sha256: hash(bytes), bom,
      rows: matrix.length - (options.includeHeader === false ? 0 : 1), fieldCharacters: matrix.flat().reduce((sum, value) => sum + value.length, 0) });
  } finally { h.downloadIntent = false; }
}
async function upload(h, name, contents) {
  const bytes = Buffer.isBuffer(contents) ? contents : Buffer.from(contents, "utf8");
  h.track(name, "import-name"); h.track(bytes.toString("utf8"), "import-bytes");
  const input = h.workspace.getByLabel("Import JSON file", { exact: true });
  await input.setInputFiles({ name, mimeType: "text/plain", buffer: bytes }); await expect(input).toHaveValue("");
}
async function editedPeople(h) {
  await sample(h); await build(h, 3, 5); await h.open(".jcsv-columns");
  await h.fill(h.textbox("Header for column 1"), "Identifier");
  await h.check("Include column 3", false); await h.fill(h.textbox("Null values"), "NULL");
  await build(h, 3, 4);
  return { csv: await captureCsv(h), columns: await columnSnapshot(h), source: h.source };
}
async function columnSnapshot(h) {
  return h.workspace.locator(".jcsv-column-row").evaluateAll((elements) => elements.map((element) => ({
    path: element.querySelector(".jcsv-column-path").textContent,
    header: element.querySelector('input:not([type="checkbox"])').value,
    enabled: element.querySelector('input[type="checkbox"]').checked,
  })));
}
async function kept(h, previous) {
  await sameValue(h.input, normalTextarea(previous.source)); await expect(h.result).toBeVisible();
  assert.deepEqual(await columnSnapshot(h), previous.columns); await sameValue(h.textbox("Null values"), "NULL");
  equalText(await captureCsv(h), previous.csv, "Failed/cancelled import preserves the complete prior export");
}
async function heldOperation(h, kind) {
  const before = (await h.probe()).held; await h.hold(true);
  await h.click(h.button(kind === "inspect" ? "Inspect JSON" : "Build CSV"));
  await expect(h.button("Cancel")).toBeVisible();
  await expect.poll(async () => (await h.probe()).held).toBe(before + 1);
  await noResult(h); return (await h.probe()).workers.length - 1;
}
async function layout(h, state) {
  await expect.poll(() => h.page.evaluate(() => document.fonts.status)).toBe("loaded");
  let measurement, previous, stable = 0;
  await expect.poll(async () => {
    measurement = await h.workspace.evaluate((workspace) => {
      const outer = workspace.getBoundingClientRect();
      const outside = [...workspace.querySelectorAll(".jcsv-input-panel, .jcsv-shape-panel, .jcsv-columns, .jcsv-stats, .jcsv-cell-detail, textarea, select, input:not([type=file])")]
        .filter((element) => { const box = element.getBoundingClientRect(); return box.width > 0 && (box.left < outer.left - 1 || box.right > outer.right + 1); })
        .map((element) => element.id || element.className);
      return { viewport: window.innerWidth, documentWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
        workspaceWidth: outer.width, outside, workspaceOverflow: workspace.scrollWidth > workspace.clientWidth + 1,
        controlsOverflow: [...workspace.querySelectorAll(".jcsv-examples, .jcsv-format-line, .jcsv-shape-settings, .jcsv-setting-grid, .jcsv-column-toolbar")]
          .some((element) => element.clientWidth && element.scrollWidth > element.clientWidth + 1) };
    });
    const signature = JSON.stringify(measurement); stable = signature === previous ? stable + 1 : 0; previous = signature;
    return stable >= 2 && measurement.documentWidth <= measurement.viewport + 1 && !measurement.workspaceOverflow && !measurement.controlsOverflow && !measurement.outside.length;
  }, { message: `${state}: stable document and source-control geometry (table-internal scrolling is allowed)`, intervals: [100, 150, 250] }).toBe(true);
  h.layouts.push({ state, ...measurement });
}
async function screenshot(h, suffix, locator) {
  await locator.scrollIntoViewIfNeeded(); await stableBox(locator);
  const path = join(artifactDirectory, `${String(h.index + 1).padStart(2, "0")}-${suffix}.png`);
  // Viewport only: never produce a 5,000px-tall workspace/debug screenshot.
  await h.page.screenshot({ path, fullPage: false, caret: "hide" }); screenshots.push({ case: h.name, suffix, path });
}

scenario("SEO / actual HTTP SSR, exact metadata, five FAQs, free schema and 1200x630 PNG", async (h) => {
  const root = parseDocument(await h.initialResponse.text());
  assert.equal(nodeText(one(root, (node) => node.name === "title", "SSR title")), TOOL.title);
  assert.equal(TOOL.title, "Free JSON to CSV Converter - Nested JSON & JSON Lines"); assert.equal(TOOL.title.length, 53);
  assert.equal(meta(root, "description"), TOOL.description); assert.ok(TOOL.description.length <= 160);
  assert.equal(one(root, (node) => node.name === "link" && node.attribs.rel === "canonical", "canonical").attribs.href, CANONICAL);
  assert.equal(nodes(root, (node) => node.name === "main").length, 1); assert.equal(nodes(root, (node) => node.name === "h1").length, 1);
  await expect(h.page.locator("main")).toHaveCount(1); await expect(h.page.getByRole("heading", { level: 1 })).toHaveText("JSON to CSV converter");
  await expect(h.page).toHaveTitle(TOOL.title);
  for (const [key, attribute] of [["og:title", "property"], ["twitter:title", "name"]]) assert.equal(meta(root, key, attribute), TOOL.title);
  for (const [key, attribute] of [["og:description", "property"], ["twitter:description", "name"]]) assert.equal(meta(root, key, attribute), TOOL.description);
  assert.equal(meta(root, "og:url", "property"), CANONICAL); assert.equal(meta(root, "twitter:card"), "summary_large_image");
  for (const [key, attribute] of [["og:image", "property"], ["twitter:image", "name"]]) {
    const url = new URL(meta(root, key, attribute)); assert.equal(url.origin, PRODUCTION); assert.equal(url.pathname, IMAGE_PATH);
    assert.equal(url.username + url.password + url.hash, "");
  }
  assert.equal(meta(root, "og:image:width", "property"), "1200"); assert.equal(meta(root, "og:image:height", "property"), "630");
  assert.equal(meta(root, "og:image:alt", "property"), IMAGE_ALT); assert.equal(meta(root, "twitter:image:alt"), IMAGE_ALT);
  const data = schemas(root), apps = data.filter((entry) => entry["@type"] === "WebApplication"); assert.equal(apps.length, 1);
  assert.equal(apps[0].name, TOOL.name); assert.equal(apps[0].url, CANONICAL); assert.equal(apps[0].description, TOOL.description);
  assert.equal(apps[0].applicationCategory, "DeveloperApplication"); assert.equal(apps[0].isAccessibleForFree, true);
  assert.deepEqual(apps[0].offers, { "@type": "Offer", price: "0", priceCurrency: "USD" }); assert.deepEqual(apps[0].featureList, TOOL.featureList);
  assert.doesNotMatch(JSON.stringify(data), /aggregateRating|ratingValue|ratingCount|reviewCount/);
  const breadcrumbs = data.filter((entry) => entry["@type"] === "BreadcrumbList"); assert.equal(breadcrumbs.length, 1);
  assert.deepEqual(breadcrumbs[0].itemListElement.map((entry) => entry.item), [PRODUCTION, `${PRODUCTION}/tools`, CANONICAL]);
  const faq = data.filter((entry) => entry["@type"] === "FAQPage"); assert.equal(faq.length, 1); assert.equal(TOOL.faqs.length, 5);
  assert.deepEqual(faq[0].mainEntity.map((entry) => ({ question: entry.name, answer: entry.acceptedAnswer.text })), TOOL.faqs);
  const visibleFaq = h.page.locator("#json-csv-faq"); await expect(visibleFaq.locator("h3")).toHaveCount(5); await expect(visibleFaq.locator("p")).toHaveCount(5);
  for (const [index, entry] of TOOL.faqs.entries()) {
    await expect(visibleFaq.locator("h3").nth(index)).toBeVisible(); await expect(visibleFaq.locator("h3").nth(index)).toHaveText(entry.question);
    await expect(visibleFaq.locator("p").nth(index)).toBeVisible(); await expect(visibleFaq.locator("p").nth(index)).toHaveText(entry.answer);
  }
  const invoice = h.page.getByRole("complementary", { name: "Working with invoice PDFs", exact: true });
  await expect(invoice.getByRole("link", { name: "Invoice PDF to Excel", exact: true })).toHaveAttribute("href", "/tools/invoice-pdf-to-excel");
  await expect(invoice).toHaveText("Starting with invoice PDFs rather than JSON? Use Invoice PDF to Excel to review summary fields from selectable-text invoices and export XLSX or CSV locally. Scanned invoices are not supported.");
  const image = await h.http(IMAGE_PATH); assert.match(image.headers()["content-type"], /^image\/png(?:;|$)/);
  const png = await image.body(); assert.ok(png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])));
  assert.equal(png.toString("ascii", 12, 16), "IHDR"); assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [1200, 630]);
  await writeFile(join(artifactDirectory, "json-csv-social.png"), png, { flag: "wx" });
}, { js: false });

scenario("discovery / exact JSON-CSV entries in tools, HTML sitemap, llms and XML sitemap only", async (h) => {
  for (const path of ["/tools", "/site-map"]) {
    const response = await h.goto(path); const links = h.page.locator(`main a[href="${TOOL_PATH}"]`);
    await expect(links).toHaveCount(1); await expect(links).toBeVisible();
    if (path === "/tools") {
      await expect(links.getByRole("heading", { level: 2, name: TOOL.name, exact: true })).toBeVisible();
      await expect(links.locator("p")).toHaveText(CATALOG_DESCRIPTION);
      const collection = schemas(parseDocument(await response.text())).find((entry) => entry["@type"] === "CollectionPage");
      assert.deepEqual(collection.mainEntity.itemListElement.filter((entry) => entry.url === CANONICAL).map((entry) => entry.name), [TOOL.name]);
    } else await expect(links).toHaveText(TOOL.name);
  }
  const llms = await h.http("/llms.txt");
  assert.deepEqual((await llms.text()).split(/\r?\n/).filter((line) => line.includes(`](${CANONICAL})`)), [`- [${TOOL.name}](${CANONICAL}): ${LLMS_DESCRIPTION}`]);
  const sitemap = parseDocument(await (await h.http("/sitemap.xml")).text(), { xmlMode: true });
  const locations = nodes(sitemap, (node) => node.name === "loc").map(nodeText);
  assert.equal(locations.filter((url) => url === CANONICAL).length, 1); assert.ok(!locations.some((url) => url.startsWith(ORIGIN)));
  // No assertions about another tool's pending descriptions or content.
}, { js: false, open: false });

scenario("initial / blank disabled actions, native upload and literal accessible labels", async (h) => {
  await sameValue(h.input, ""); await expect(h.button("Inspect JSON")).toBeDisabled(); await expect(h.button("Build CSV")).toBeDisabled();
  await expect(h.button("Clear workspace")).toBeDisabled(); await expect(h.button("Import file")).toBeEnabled();
  const file = h.workspace.getByLabel("Import JSON file", { exact: true });
  await expect(file).toHaveAttribute("type", "file"); await expect(file).toHaveAttribute("accept", ".json,.jsonl,.ndjson,.txt");
  await expect(h.selectControl("Try an example").locator("option")).toHaveText(SAMPLES.map((sample) => sample.label));
  await expect(h.selectControl("Input format")).toHaveValue("json"); await expect(h.copyNotice).toHaveCount(1);
  await expect(h.workspace.locator("form, input[type=url]")).toHaveCount(0); await noResult(h);
  await h.setInput(" \n\t "); await expect(h.button("Inspect JSON")).toBeDisabled(); assert.equal((await h.probe()).workers.length, 0);
});

scenario("sample / three people, FIVE columns, default CRLF/BOM and real inspect/convert Workers", async (h) => {
  await sample(h, 0); await expect(h.selectControl(ROW_SOURCE).locator("option:checked")).toHaveText("Root (array) · 3 rows");
  await expect(h.selectControl("Delimiter")).toHaveValue(","); await expect(h.selectControl("Line endings")).toHaveValue("\r\n");
  for (const label of ["Flatten nested object fields", "Header row", "UTF-8 BOM for downloads", "Protect formula-like text"]) await expect(h.workspace.getByRole("checkbox", { name: label, exact: true })).toBeChecked();
  await build(h, 3, 5); await exportMatches(h, PEOPLE_HEADERS, PEOPLE_ROWS);
  await h.open(".jcsv-warnings"); await expect(h.result.locator(".jcsv-warnings > p")).toHaveText("1 null cells · 1 missing cells · 0 numeric-token cells. Counts refer to selected output columns.");
  assert.deepEqual((await h.probe()).workers.map((worker) => worker.posted[0].kind), ["inspect", "convert"]);
});

scenario("sample / wrapped root is not guessed; explicit items keep large IDs and decimal spelling", async (h) => {
  await sample(h, 1); await expect(h.selectControl(ROW_SOURCE).locator("option:checked")).toHaveText("Root (object) · 1 row"); await noResult(h);
  await h.select(ROW_SOURCE, "/data/items"); await build(h, 2, 4); const csv = await exportMatches(h, API_HEADERS, API_ROWS);
  assert.ok(!readCsv(csv)[0].some((header) => ["page", "status", "data.items"].includes(header)));
  await h.click(h.button("View row 1, column 1")); await sameValue(h.workspace.locator("#jcsv-cell"), "9123372036854000123");
  await h.click(h.button("View row 2, column 4")); await sameValue(h.workspace.locator("#jcsv-cell"), "5.50");
  await h.open(".jcsv-warnings"); await expect(h.result.locator(".jcsv-warnings")).toContainText("Parent/wrapper metadata outside the selected row array is not included");
});

scenario("arrays / custom scalar join is explicit; complex arrays retain exact JSON with warnings", async (h) => {
  await sample(h, 1); await h.select(ROW_SOURCE, "/data/items"); await h.select("Arrays in cells", "join"); await h.fill(h.textbox("Join separator"), "=>");
  await build(h, 2, 4); await exportMatches(h, API_HEADERS, API_ROWS.map((row, index) => row.map((value, column) => column === 2 ? index ? "travel" : "reading=>weekend" : value)));
  await h.open(".jcsv-warnings"); await expect(h.result.locator(".jcsv-warnings")).toContainText("2 array cell(s) were joined as text. Joining is not lossless");
  await fixture(h, '{"tags":["a","b"],"complex":[ {"n":2.370}, [1,2] ]}');
  await build(h, 1, 2); await exportMatches(h, ["tags", "complex"], [["a=>b", '[ {"n":2.370}, [1,2] ]']]);
  await h.open(".jcsv-warnings"); await expect(h.result.locator(".jcsv-warnings")).toContainText("1 array cell(s) contained objects or nested arrays and were retained as JSON instead of joined");
});

scenario("orders / one expansion, three rows from two orders, empty parent and no Cartesian product", async (h) => {
  await sample(h, 2); await h.select("Expand one array into rows", "/items"); await build(h, 3, 6, 2);
  await exportMatches(h, ["order", "customer.name", "items.sku", "items.qty", "tags", "items"], [
    ["DEMO-101", "Maya", "BOOK", "2", '["sample", "paid"]', ""], ["DEMO-101", "Maya", "MAP", "1", '["sample", "paid"]', ""],
    ["DEMO-102", "Leo", "", "", '["sample"]', ""],
  ]);
});

scenario("orders / unflattened expansion preserves customer JSON and nested parent siblings", async (h) => {
  await sample(h, 2); await h.select("Expand one array into rows", "/items"); await h.check("Flatten nested object fields", false);
  await build(h, 3, 4, 2); const csv = await exportMatches(h, ["order", "customer", "items", "tags"], [
    ["DEMO-101", '{ "name": "Maya" }', '{ "sku": "BOOK", "qty": 2 }', '["sample", "paid"]'],
    ["DEMO-101", '{ "name": "Maya" }', '{ "sku": "MAP", "qty": 1 }', '["sample", "paid"]'],
    ["DEMO-102", '{ "name": "Leo" }', "", '["sample"]'],
  ]);
  assert.deepEqual(readCsv(csv).slice(1).map((row) => JSON.parse(row[1])), [{ name: "Maya" }, { name: "Maya" }, { name: "Leo" }]);
  await fixture(h, '[{"meta":{"customer":"Maya","items":[{"sku":"A"},{"sku":"B"}]}},{"meta":{"customer":"Leo","items":[]}}]');
  await h.select("Expand one array into rows", "/meta/items"); await build(h, 3, 1, 2);
  const values = readCsv(await captureCsv(h)).slice(1).map(([value]) => JSON.parse(value));
  assert.deepEqual(values, [{ customer: "Maya", items: { sku: "A" } }, { customer: "Maya", items: { sku: "B" } }, { customer: "Leo" }]);
  await h.open(".jcsv-warnings"); await expect(h.result.locator(".jcsv-warnings")).toContainText("omit the missing expanded member while retaining sibling fields");
});

scenario("JSON Lines / actual fourth sample yields three strict records and deliberate format", async (h) => {
  await sample(h, 3); await expect(h.selectControl(ROW_SOURCE).locator("option:checked")).toHaveText("Root (JSON Lines records) · 3 rows");
  await build(h, 3, 3); await exportMatches(h, ["event", "user", "count"], [["opened", "001", "1"], ["saved", "002", "2"], ["shared", "003", "3"]]);
});

scenario("strict input / malformed JSON, comments, trailing commas and equal/escaped duplicate keys", async (h) => {
  for (const [text, format, error] of [["{\n \"bad\":\n}", "json", /line 3, column 1/], ['/* no comments */{}', "json", /comments.*line 1/],
    ['{"a":1,}', "json", /strict JSON.*line 1/], ['{"a":1,"a":1}', "json", /Duplicate.*line 1/], ['{"a":1,"\\u0061":1}', "json", /Duplicate.*line 1/],
    ['{}\n\n{}', "jsonl", /Blank JSON Lines.*line 2/], ['{}\n{"bad":}\n', "jsonl", /strict JSON.*line 2/], ['{}\n//comment', "jsonl", /comments.*line 2/]]) {
    await h.setInput(text, format); await h.click(h.button("Inspect JSON")); await errorIs(h, error); await noResult(h);
    await expect(h.button("Build CSV")).toBeDisabled(); await terminated(h);
  }
});

scenario("root values / primitives, mixed records, empty objects and inspectable but unexportable empty array", async (h) => {
  await fixture(h, '"001"'); await build(h, 1, 1); await exportMatches(h, ["(value)"], [["001"]]);
  await fixture(h, '["abc",2,true,null,{}, {"value":"v"},["x",2]]'); await build(h, 7, 2);
  await exportMatches(h, ["(value)", "value"], [["abc", ""], ["2", ""], ["true", ""], ["", ""], ["{}", ""], ["", "v"], ['["x",2]', ""]]);
  await fixture(h, "[]"); await expect(h.selectControl(ROW_SOURCE).locator("option:checked")).toHaveText("Root (array) · 0 rows");
  await h.click(h.button("Build CSV")); await errorIs(h, /selected row source is empty/); await noResult(h);
});

scenario("keys / __proto__, constructor and dotted keys remain distinct inert data", async (h) => {
  await fixture(h, '{"__proto__":"proto-data","constructor":"ctor-data","a.b":"literal","a":{"b":"nested"}}');
  await build(h, 1, 4); await exportMatches(h, ["__proto__", "constructor", '["a.b"]', "a.b"], [["proto-data", "ctor-data", "literal", "nested"]]);
  assert.equal(await h.page.evaluate(() => Object.prototype.polluted), undefined);
  await h.open(".jcsv-columns"); assert.deepEqual((await columnSnapshot(h)).map((column) => column.path), ["/__proto__", "/constructor", "/a.b", "/a/b"]);
});

scenario("paths / RFC6901 row selection, separate missing/null replacements and custom column map", async (h) => {
  await fixture(h, '{"page":99,"a/b":{"~key":[{"x/y":{"~z":null},"id":"001"},{"id":"002"}]}}');
  await h.select(ROW_SOURCE, "/a~1b/~0key"); await h.fill(h.textbox("Null values"), "NULL"); await h.fill(h.textbox("Missing fields"), "MISSING");
  await build(h, 2, 2); await h.open(".jcsv-columns");
  assert.deepEqual((await columnSnapshot(h)).map((column) => column.path), ["/x~1y/~0z", "/id"]);
  await h.fill(h.textbox("Header for column 1"), "Custom value"); await build(h, 2, 2);
  await exportMatches(h, ["Custom value", "id"], [["NULL", "001"], ["MISSING", "002"]]);
});

scenario("Unicode / valid surrogate pairs and markup-like strings stay text, never executable DOM", async (h) => {
  const marker = "BV_JSON_CSV_CANARY_MARKUP_984";
  const markup = `<script>window.${marker}=true</script><img src="https://example.invalid/${marker}"><iframe></iframe><a href="/api/${marker}">x</a>`;
  h.track(marker, "canary");
  await fixture(h, JSON.stringify({ unicode: "Café e\u0301 العربية 漢字 😀 𝄞", html: markup, url: `https://example.invalid/${marker}` }));
  await build(h, 1, 3); await exportMatches(h, ["unicode", "html", "url"], [["Café e\u0301 العربية 漢字 😀 𝄞", markup, `https://example.invalid/${marker}`]]);
  await h.click(h.button("View row 1, column 2")); await sameValue(h.workspace.locator("#jcsv-cell"), markup);
  await expect(h.result.locator("script, img, iframe, a")).toHaveCount(0);
  // Sitewide scripts load independently; no input canary may become executable script content or a script URL.
  assert.equal(await h.page.locator("body script").evaluateAll((scripts, key) => scripts.some((script) => script.textContent?.includes(key) || script.src.includes(key)), marker), false);
  assert.equal(await h.page.evaluate((key) => Object.hasOwn(window, key), marker), false);
});

scenario("columns / native checkbox, rename, reorder, invalidation and complete reset", async (h) => {
  await sample(h); await build(h, 3, 5); await h.open(".jcsv-columns");
  await h.check("Include column 3", false); await noResult(h); await h.fill(h.textbox("Header for column 1"), "Identifier");
  await h.click(h.button("Move column 2 up")); await build(h, 3, 4);
  await exportMatches(h, ["name", "Identifier", "location.city", "active"], PEOPLE_ROWS.map((row) => [row[1], row[0], row[3], row[4]]));
  await h.click(h.button("Reset columns")); await noResult(h); await build(h, 3, 5); await exportMatches(h, PEOPLE_HEADERS, PEOPLE_ROWS);
  await h.click(h.button("Clear workspace")); await h.click(h.confirmation.getByRole("button", { name: "Keep current input", exact: true })); await expect(h.result).toBeVisible();
  await h.click(h.button("Clear workspace")); await h.click(h.confirmation.getByRole("button", { name: "Yes, clear", exact: true }));
  await sameValue(h.input, ""); await noResult(h); await expect(h.workspace.locator(".jcsv-columns")).toHaveCount(0);
});

scenario("columns / no selection, duplicate trimmed headers and protection collisions reject exports", async (h) => {
  await fixture(h, '{"a":1,"b":2}'); await build(h, 1, 2); await h.open(".jcsv-columns");
  await h.click(h.button("Select none")); await h.click(h.button("Build CSV")); await errorIs(h, /Enable at least one column/); await noResult(h);
  await h.click(h.button("Select all")); await h.fill(h.textbox("Header for column 2"), " a ");
  await h.click(h.button("Build CSV")); await errorIs(h, /nonblank and unique after trimming/); await noResult(h);
  await h.fill(h.textbox("Header for column 1"), "=H"); await h.fill(h.textbox("Header for column 2"), "'=H");
  await h.click(h.button("Build CSV")); await errorIs(h, /Formula protection creates duplicate export headers/); await noResult(h);
  await h.click(h.button("Reset columns")); await build(h, 1, 2); await exportMatches(h, ["a", "b"], [["1", "2"]]);
});

scenario("columns / filtering is read-only; Select all under a filter restores ALL fields", async (h) => {
  await sample(h); await build(h, 3, 5); await h.open(".jcsv-columns"); const original = await captureCsv(h);
  const before = (await h.probe()).workers.length;
  await h.fill(h.textbox("Find a column"), "/location"); await expect(h.workspace.locator(".jcsv-column-row")).toHaveCount(1);
  await expect(h.result).toBeVisible(); equalText(await captureCsv(h), original, "Column filter does not invalidate export");
  assert.equal((await h.probe()).workers.length, before);
  await h.click(h.button("Select none")); await noResult(h); await h.click(h.button("Select all"));
  await h.fill(h.textbox("Find a column"), ""); await build(h, 3, 5); await exportMatches(h, PEOPLE_HEADERS, PEOPLE_ROWS);
});

scenario("discovery controls / 60 row choices, 50 array choices, 30-column paging retain full data", async (h) => {
  const data = Object.fromEntries(Array.from({ length: 65 }, (_, index) => [`a${index}`, [index]]));
  await fixture(h, JSON.stringify(data)); await expect(h.selectControl(ROW_SOURCE).locator("option")).toHaveCount(60);
  await expect(h.selectControl("Expand one array into rows").locator("option")).toHaveCount(51);
  await expect(h.workspace.locator(".jcsv-inspection-warnings")).toContainText("60-choice limit");
  await expect(h.workspace.locator(".jcsv-inspection-warnings")).toContainText("50 array-path choice limit");
  await build(h, 1, 65); await h.open(".jcsv-columns"); await expect(h.workspace.locator(".jcsv-column-row")).toHaveCount(30);
  await h.click(h.button("Show 30 more columns")); await expect(h.workspace.locator(".jcsv-column-row")).toHaveCount(60);
  await h.click(h.button("Show 30 more columns")); await expect(h.workspace.locator(".jcsv-column-row")).toHaveCount(65);
  await expect(h.button("Show 30 more columns")).toHaveCount(0);
  sameMatrix(readCsv(await captureCsv(h)), [Object.keys(data), Array.from({ length: 65 }, (_, index) => `[${index}]`)]);
});

scenario("column discovery cap / oversized union rejects; choosing a smaller row source recovers", async (h) => {
  const wide = Object.fromEntries(Array.from({ length: 201 }, (_, index) => [`c${index}`, index]));
  await fixture(h, JSON.stringify({ wide, rows: [{ keep: "smaller-source" }] })); await h.click(h.button("Build CSV"));
  await errorIs(h, /200-column limit/); await noResult(h); await expect(h.workspace.locator(".jcsv-columns")).toHaveCount(0);
  await h.select(ROW_SOURCE, "/rows"); await build(h, 1, 1); await exportMatches(h, ["keep"], [["smaller-source"]]);
});

for (const [label, delimiter, newline, quoteAll, bom] of [["comma CRLF", ",", "\r\n", false, true], ["semicolon LF quote-all", ";", "\n", true, true],
  ["tab LF no-BOM", "\t", "\n", false, false], ["pipe CRLF quote-all", "|", "\r\n", true, true]]) {
  scenario(`export / ${label}, embedded CR/LF/quotes and independent full CSV values`, async (h) => {
    await fixture(h); await h.select("Delimiter", delimiter); await h.select("Line endings", newline);
    await h.check("Quote all fields", quoteAll); await h.check("UTF-8 BOM for downloads", bom); await build(h, 2, 6);
    const options = { delimiter, newline, quoteAll, bom }; const csv = await exportMatches(h, EXPORT_HEADERS, EXPORT_ROWS, options);
    await h.click(h.button("CSV text")); await sameValue(h.workspace.locator("#jcsv-output"), normalTextarea(csv));
    await expect(h.workspace.locator(".jcsv-csv-preview")).toContainText("Textareas normalize displayed line endings");
    if (delimiter === ",") await nativeDownload(h, "Café-review.csv", "Café-review.csv", [EXPORT_HEADERS, ...EXPORT_ROWS], options);
    if (delimiter === "\t") await nativeDownload(h, "CON.csv", "converted-data.tsv", [EXPORT_HEADERS, ...EXPORT_ROWS], options);
  });
}

scenario("header off / review labels remain, but raw exported records contain no header row", async (h) => {
  await fixture(h, '[{"id":"001","value":null},{"id":"002","value":"ok"}]'); await h.check("Header row", false);
  await build(h, 2, 2); await exportMatches(h, ["id", "value"], [["001", ""], ["002", "ok"]], { includeHeader: false });
  await expect(h.result).toContainText("The table labels are for review only. Header row is off in the exported file.");
});

scenario("formula risk / numeric -1 stays numeric, risky text AND exported headers are prefixed", async (h) => {
  const strings = ["=SUM(A1)", " +text", "\u200b＝1", "-1"];
  await fixture(h, JSON.stringify({ negative: -1, formula: strings[0], plus: strings[1], wide: strings[2], textNegative: strings[3] }));
  await build(h, 1, 5); await h.open(".jcsv-columns"); await h.fill(h.textbox("Header for column 1"), "=NEG"); await build(h, 1, 5);
  const headers = ["'=NEG", "formula", "plus", "wide", "textNegative"], rows = [["-1", ...strings.map((value) => `'${value}`)]];
  await exportMatches(h, headers, rows); await expect(h.result.locator(".jcsv-stats > div").nth(2).locator("strong")).toHaveText("5");
  await expect(h.result.locator(".jcsv-stats > div").nth(2).locator("small")).toHaveText("5 prefixed for protection");
  await h.check("Header row", false); await noResult(h); await build(h, 1, 5);
  await expect(h.result.locator(".jcsv-stats > div").nth(2).locator("strong")).toHaveText("4");
  await exportMatches(h, ["=NEG", ...headers.slice(1)], rows, { includeHeader: false });
  await h.check("Header row", true); await h.check("Protect formula-like text", false); await noResult(h);
  await expect(h.workspace.locator(".jcsv-risk")).toContainText("CSV quoting alone does not prevent this");
  await build(h, 1, 5); await exportMatches(h, ["=NEG", ...headers.slice(1)], [["-1", ...strings]]);
  await expect(h.result.locator(".jcsv-stats > div").nth(2).locator("small")).toHaveText("0 prefixed for protection");
});

for (const extension of ["json", "jsonl", "ndjson", "txt"]) scenario(`import / native UTF-8 .${extension}, correct format and already-inspected candidate`, async (h) => {
  const text = extension === "json" ? '\ufeff{"id":"001","name":"Café 😀","n":2.370}\r\n' : '{"id":"001","name":"Café 😀","n":2.370}\r\n{"id":"002","name":"漢字","n":5.50}\n';
  if (extension === "txt") await h.select("Input format", "jsonl");
  if (extension === "json") await h.select("Input format", "jsonl"); // Explicit .json overrides selected JSONL.
  await upload(h, `fictional-records.${extension}`, text); await expect(h.status).toContainText("Imported locally and validated");
  await sameValue(h.input, normalTextarea(text)); h.source = text;
  await expect(h.selectControl("Input format")).toHaveValue(extension === "json" ? "json" : "jsonl");
  await expect(h.confirmation).toHaveCount(0); await expect(h.button("Build CSV")).toBeEnabled();
  assert.equal((await h.probe()).workers.length, 1, "Import performs one real inspect; another inspect is unnecessary");
  if (extension === "json") await expect(h.workspace.locator(".jcsv-inspection-warnings")).toContainText("One leading UTF-8 BOM was ignored");
  const rows = [["001", "Café 😀", "2.370"], ...(extension === "json" ? [] : [["002", "漢字", "5.50"]])];
  await build(h, rows.length, 3); await exportMatches(h, ["id", "name", "n"], rows);
});

scenario("import rejection / syntax, JSONL BOM, UTF-8, extension and size failures preserve input/result/custom settings", async (h) => {
  const previous = await editedPeople(h);
  const entries = [
    ["unsupported.csv", "not an import", /Choose a UTF-8 JSON/, 0, 0],
    ["invalid.json", Buffer.from([0xc3, 0x28]), /could not be read as UTF-8/, 1, 0],
    ["large.json", Buffer.alloc(LIMITS.inputBytes + 1, 97), /exceeds the 2 MiB limit/, 0, 0],
    ["characters.json", `"${"x".repeat(LIMITS.inputChars)}"`, /at most 1,000,000 characters/, 1, 0],
    ["malformed.json", '{"bad":}', /strict JSON.*line 1/, 1, 1],
    ["bom.jsonl", '\ufeff{"id":1}\n', /Invalid JSON token.*line 1/, 1, 1],
    ["empty.txt", " \r\n", /selected file is empty/, 1, 0],
  ];
  for (const [name, text, pattern, reads, workers] of entries) {
    const before = await h.probe(); await upload(h, name, text); await errorIs(h, pattern);
    await kept(h, previous); await expect(h.confirmation).toHaveCount(0); await expect(h.button("Build CSV")).toBeEnabled();
    const after = await h.probe(); assert.equal(after.files.length - before.files.length, reads); assert.equal(after.workers.length - before.workers.length, workers);
  }
});

scenario("import replacement / Cancel preserves everything; Accept clears columns/result but retains inspected input", async (h) => {
  const previous = await editedPeople(h), text = '{"changed":"BV_JSON_CSV_REPLACEMENT_984","n":2.370}';
  await upload(h, "replacement.json", text); await expect(h.confirmation).toBeVisible(); await kept(h, previous);
  await h.click(h.confirmation.getByRole("button", { name: "Keep current input", exact: true })); await kept(h, previous);
  await upload(h, "replacement.json", text); await h.click(h.confirmation.getByRole("button", { name: "Replace input", exact: true }));
  h.source = text; await sameValue(h.input, text); await noResult(h); await expect(h.workspace.locator(".jcsv-columns")).toHaveCount(0);
  await expect(h.button("Build CSV")).toBeEnabled(); await build(h, 1, 2);
  await exportMatches(h, ["changed", "n"], [["BV_JSON_CSV_REPLACEMENT_984", "2.370"]]);
});

scenario("file fault / input edit while native arrayBuffer is held discards the stale candidate", async (h) => {
  await sample(h); await build(h, 3, 5); const before = (await h.probe()).workers.length;
  await upload(h, "delayed.json", '{"stale":"BV_JSON_CSV_STALE_FILE_984"}');
  await expect(h.button("Reading file…")).toBeDisabled(); await expect.poll(async () => (await h.probe()).files.filter((file) => file.pending).length).toBe(1);
  await h.setInput('{"current":"BV_JSON_CSV_CURRENT_FILE_984"}'); await h.release("Imports");
  await expect.poll(async () => (await h.probe()).files.some((file) => file.pending)).toBe(false);
  await expect(h.confirmation).toHaveCount(0); assert.equal((await h.probe()).workers.length, before);
  await inspect(h); await build(h, 1, 1); await exportMatches(h, ["current"], [["BV_JSON_CSV_CURRENT_FILE_984"]]);
}, { fileMode: "hold" });

scenario("file fault / Cancel ends reading busy state and preserves prior columns/export after release", async (h) => {
  const previous = await editedPeople(h); await upload(h, "cancelled.json", '{"cancelled":"BV_JSON_CSV_CANCEL_FILE_984"}');
  await expect(h.button("Reading file…")).toBeDisabled(); await h.click(h.button("Cancel"));
  await expect(h.button("Build CSV")).toBeEnabled(); await h.release("Imports");
  await expect.poll(async () => (await h.probe()).files.some((file) => file.pending)).toBe(false);
  await kept(h, previous); await expect(h.confirmation).toHaveCount(0);
}, { fileMode: "hold" });

scenario("file fault / native-reader rejection is sanitized and leaves prior work intact", async (h) => {
  const previous = await editedPeople(h); await upload(h, "read-failure.json", '{"synthetic":true}');
  await errorIs(h, /could not be read as UTF-8/); await expect(h.alert).not.toContainText("SYNTHETIC_FILE_INTERNAL_ERROR"); await kept(h, previous);
}, { fileMode: "reject" });

scenario("paste limits / over 1m characters and 2MiB Unicode reject whole edits and keep the prior result", async (h) => {
  const previous = await editedPeople(h); const before = (await h.probe()).workers.length;
  for (const [text, pattern] of [[`"${"a".repeat(LIMITS.inputChars)}"`, /1,000,000 characters/], [`"${"漢".repeat(699_051)}"`, /2 MiB of UTF-8/]]) {
    h.track(text, "oversized-paste"); await h.input.fill(text); await errorIs(h, pattern); await kept(h, previous);
  }
  assert.equal((await h.probe()).workers.length, before, "Rejected pastes do not start workers or overwrite accepted settings");
});

scenario("Unicode rejection / decoded unpaired surrogate inspects but cannot produce a lossy UTF-8 export", async (h) => {
  await fixture(h, '{"value":"\\uD800"}'); await h.click(h.button("Build CSV"));
  await errorIs(h, /Unpaired Unicode surrogate in an exported field/); await noResult(h);
  assert.equal((await h.probe()).blobs.length, 0); assert.equal((await h.probe()).copyLengths.length, 0);
});

scenario("selector limits / 4096+ pointer and cumulative selector text fail during actual inspection", async (h) => {
  for (const [text, pattern] of [[JSON.stringify({ ["x".repeat(4_096)]: [0] }), /JSON Pointer exceeds the 4,096-character limit/],
    [JSON.stringify(Object.fromEntries(Array.from({ length: 60 }, (_, index) => [`k${index}`.padEnd(300, "x"), [index]]))), /selector text exceeds the 65,536-character budget/]]) {
    await h.setInput(text); await h.click(h.button("Inspect JSON")); await errorIs(h, pattern); await noResult(h); await expect(h.button("Build CSV")).toBeDisabled();
  }
});

scenario("export budget / repeated parent field overflow rejects the whole CSV, not a downloadable partial", async (h) => {
  await fixture(h, JSON.stringify({ text: "x".repeat(500_000), items: Array(9).fill(0) }));
  await h.select("Expand one array into rows", "/items"); await h.click(h.button("Build CSV"));
  await errorIs(h, /4,000,000-character budget/); await noResult(h); await expect(h.workspace.locator("#jcsv-output")).toHaveCount(0);
  assert.equal((await h.probe()).blobs.length, 0); assert.equal((await h.probe()).copyLengths.length, 0);
});

scenario("clipboard hold / single flight blocks rebuild; edits remove result and global notice warns about the older CSV", async (h) => {
  await fixture(h, '{"id":"001","value":"old"}'); await build(h, 1, 2);
  const original = expectedCsv([["id", "value"], ["001", "old"]]);
  await h.click(h.button("Copy full CSV")); await expect(h.button("Copying…")).toBeDisabled();
  await expect.poll(async () => (await h.probe()).clipboardPending).toBe(1);
  const workers = (await h.probe()).workers.length;
  await h.click(h.button("Build CSV")); await errorIs(h, /Wait for the pending clipboard copy/); await expect(h.result).toBeVisible();
  await h.select("Delimiter", ";"); await noResult(h); await h.click(h.button("Build CSV")); await errorIs(h, /pending clipboard copy/);
  assert.equal((await h.probe()).workers.length, workers); assert.deepEqual((await h.probe()).copyLengths, [original.length]);
  await h.release("Clipboard");
  await expect(h.copyNotice).toBeVisible(); await expect(h.copyNotice).toHaveText("An earlier CSV was copied, not your changed settings. Build and copy the current export again.");
  equalText(await h.page.evaluate(() => window.__jsonCsvBrowserProbe.copies[0]), original, "Held write captures the original full CSV");
  await build(h, 1, 2); await h.click(h.button("Copy full CSV")); await h.release("Clipboard");
  await expect(h.copyNotice).toContainText("Full CSV copied without a BOM");
  equalText(await h.page.evaluate(() => window.__jsonCsvBrowserProbe.copies[1]), expectedCsv([["id", "value"], ["001", "old"]], { delimiter: ";" }), "Next copy uses the rebuilt export");
}, { clipboardMode: "hold" });

scenario("clipboard rejection / embedded CR explicitly requires download, never misleading manual-copy advice", async (h) => {
  await fixture(h); await build(h, 2, 6); await h.click(h.button("Copy full CSV"));
  await expect(h.copyNotice).toHaveText("Clipboard access was blocked. Some fields contain carriage returns; the text preview can normalize them. Download the file to preserve the exact values.");
  await expect(h.copyNotice).not.toContainText("copy it manually"); await sameValue(h.workspace.locator("#jcsv-output"), normalTextarea(expectedCsv([EXPORT_HEADERS, ...EXPORT_ROWS])));
  await expect(h.button("Download CSV")).toBeEnabled();
}, { clipboardMode: "reject" });

scenario("clipboard rejection / short no-CR fields select the normalized textarea for manual fallback", async (h) => {
  await fixture(h, '[{"id":"001","v":"a"},{"id":"002","v":"b"}]'); await build(h, 2, 2); await h.click(h.button("Copy full CSV"));
  await expect(h.copyNotice).toHaveText("Clipboard access was blocked. Select the CSV text and copy it manually, or download the file.");
  const output = h.workspace.locator("#jcsv-output"); const normalized = normalTextarea(expectedCsv([["id", "v"], ["001", "a"], ["002", "b"]]));
  await sameValue(output, normalized); await expect(output).toBeFocused();
  await expect.poll(() => output.evaluate((element) => [element.selectionStart, element.selectionEnd])).toEqual([0, normalized.length]);
  await expect(h.button("Copy full CSV")).toBeEnabled();
}, { clipboardMode: "reject" });

function largeFixture() {
  const text = `BV_JSON_CSV_LONG_CELL_984_${"Café😀-".repeat(240)}`;
  const rows = Array.from({ length: 60 }, (_, index) => [String(index + 1).padStart(3, "0"), `${text}${index === 59 ? "_LAST_RECORD_984" : ""}`]);
  return { rows, input: JSON.stringify(rows.map(([id, text]) => ({ id, text }))) };
}
scenario("large result / 60 rows paginate 25/50/100, full cell, 50k preview and FULL native download", async (h) => {
  const data = largeFixture(); await fixture(h, data.input); await h.check("UTF-8 BOM for downloads", false); await build(h, 60, 2);
  await expect(h.result.locator("tbody tr")).toHaveCount(25); await expect(h.result.locator(".jcsv-pagination")).toContainText("Rows 1–25 of 60");
  await h.click(h.button("Next page")); await expect(h.result.locator("tbody tr")).toHaveCount(25); await expect(h.result.locator(".jcsv-pagination")).toContainText("Rows 26–50 of 60");
  await h.select("Rows per page", 50); await expect(h.result.locator("tbody tr")).toHaveCount(50);
  await h.click(h.button("Next page")); await expect(h.result.locator("tbody tr")).toHaveCount(10); await expect(h.result.locator(".jcsv-pagination")).toContainText("Rows 51–60 of 60");
  await h.select("Rows per page", 100); await expect(h.result.locator("tbody tr")).toHaveCount(60); await expect(h.button("Next page")).toBeDisabled();
  const cell = h.button("View row 60, column 2"); assert.ok((await cell.textContent()).length <= 161);
  await h.click(cell); await sameValue(h.workspace.locator("#jcsv-cell"), data.rows[59][1]);
  await expect(h.workspace.getByRole("group", { name: "Full cell value", exact: true })).toContainText(`${count(data.rows[59][1].length)} characters · actual exported value`);
  await layout(h, "long cell and bounded table");
  const csv = await captureCsv(h); const expected = expectedCsv([["id", "text"], ...data.rows]); equalText(csv, expected, "Large full clipboard payload"); sameMatrix(readCsv(csv), [["id", "text"], ...data.rows]);
  await h.click(h.button("CSV text")); await expect(h.textbox("CSV text preview · first 50,000 characters only")).toBeVisible();
  await sameValue(h.workspace.locator("#jcsv-output"), normalTextarea(expected.slice(0, LIMITS.previewChars)));
  await expect(h.workspace.locator(".jcsv-csv-preview")).toContainText("Copy full CSV and Download include all 60 rows");
  assert.ok(!(await h.workspace.locator("#jcsv-output").inputValue()).includes("_LAST_RECORD_984"));
  await nativeDownload(h, "all-60-rows", "all-60-rows.csv", [["id", "text"], ...data.rows], { bom: false });
});

scenario("clipboard rejection / a shortened 50k preview directs users to the full download", async (h) => {
  const data = largeFixture(); await fixture(h, data.input); await build(h, 60, 2); await h.click(h.button("Copy full CSV"));
  await expect(h.copyNotice).toHaveText("Clipboard access was blocked. The text preview is shortened; download the file to keep the full result.");
  await expect(h.copyNotice).not.toContainText("copy it manually");
  equalText(await h.page.evaluate(() => window.__jsonCsvBrowserProbe.copies[0]), expectedCsv([["id", "text"], ...data.rows]), "Even the rejected clipboard call received the full export");
}, { clipboardMode: "reject" });

for (const [workerMode, pattern] of [["unsupported", /background worker support is required/], ["constructor-error", /Unable to start a local worker/]]) {
  scenario(`Worker fault / ${workerMode} keeps input and exposes a fixed local error`, async (h) => {
    await h.setInput('{"safe":"BV_JSON_CSV_WORKER_FAULT_984"}'); await h.click(h.button("Inspect JSON"));
    await errorIs(h, pattern); await expect(h.alert).not.toContainText("SYNTHETIC_WORKER_INTERNAL_ERROR"); await noResult(h);
    await sameValue(h.input, h.source); assert.equal((await h.probe()).workers.length, 0);
    assert.equal((await h.probe()).constructorFailures, workerMode === "constructor-error" ? 1 : 0);
  }, { workerMode });
}

scenario("Worker fault / native error is prevented and a fresh inspect/convert retry ignores the old response", async (h) => {
  await h.setInput('{"safe":"BV_JSON_CSV_NATIVE_ERROR_984"}'); const index = await heldOperation(h, "inspect");
  await h.injectError(index); await errorIs(h, /local worker could not complete/); await noResult(h);
  await h.hold(false); await inspect(h); await h.release("Messages"); await noResult(h);
  await build(h, 1, 1); await exportMatches(h, ["safe"], [["BV_JSON_CSV_NATIVE_ERROR_984"]]);
  assert.equal((await h.probe()).preventedErrors, 1);
});

scenario("Worker fault / cancel conversion terminates native worker and discards held complete output", async (h) => {
  await fixture(h, '{"safe":"BV_JSON_CSV_CANCEL_WORKER_984"}'); await heldOperation(h, "convert");
  await h.click(h.button("Cancel")); await expect(h.status).toContainText("Operation cancelled"); await h.release("Messages");
  await noResult(h); await sameValue(h.input, h.source); await expect(h.button("Build CSV")).toBeEnabled();
  await build(h, 1, 1); await exportMatches(h, ["safe"], [["BV_JSON_CSV_CANCEL_WORKER_984"]]);
});

scenario("Worker fault / edits invalidate old delivery; old errors cannot terminate a newer in-flight Worker", async (h) => {
  await fixture(h, '{"old":"BV_JSON_CSV_OLD_WORKER_984"}'); const old = await heldOperation(h, "convert");
  await h.setInput('{"new":"BV_JSON_CSV_NEW_WORKER_984"}'); await h.hold(false); await inspect(h);
  const current = await heldOperation(h, "convert"); await h.injectError(old); await h.release("Messages", old);
  await expect(h.button("Building CSV…")).toBeDisabled(); await expect(h.button("Cancel")).toBeVisible();
  assert.equal((await h.probe()).workers[current].terminateCalls, 0); await noResult(h);
  await h.release("Messages"); await expect(h.result).toBeVisible(); await h.injectError(old);
  await expect(h.alert).toHaveCount(0); await exportMatches(h, ["new"], [["BV_JSON_CSV_NEW_WORKER_984"]]);
});

scenario("Worker fault / virtual 15-second deadline produces no partial result and ignores late delivery", async (h) => {
  await fixture(h, '{"safe":"BV_JSON_CSV_TIMEOUT_984"}'); await h.page.clock.install(); await heldOperation(h, "convert");
  await h.page.clock.fastForward(LIMITS.timeoutMs + 1); await errorIs(h, /15-second processing limit.*no partial export/);
  await noResult(h); await h.release("Messages"); await errorIs(h, /15-second processing limit/); await noResult(h);
  await build(h, 1, 1); await exportMatches(h, ["safe"], [["BV_JSON_CSV_TIMEOUT_984"]]);
});

scenario("privacy / URL-shaped data is not fetched, no AI action, reload clears work without erasing site theme", async (h) => {
  const marker = "BV_JSON_CSV_STORAGE_CANARY_984"; h.track(marker, "canary");
  await fixture(h, JSON.stringify({ marker, url: `https://example.invalid/${marker}` })); await build(h, 1, 2);
  await h.open(".jcsv-columns"); await h.fill(h.textbox("Header for column 1"), `${marker}_HEADER`); await build(h, 1, 2);
  await expect(h.workspace.getByRole("button", { name: /AI|Fetch URL|Import URL/i })).toHaveCount(0);
  const storage = await h.page.evaluate((marker) => {
    const read = (store) => Array.from({ length: store.length }, (_, index) => { const key = store.key(index); return [key, store.getItem(key)]; });
    const local = read(localStorage), session = read(sessionStorage);
    return { localKeys: local.map(([key]) => key), sessionKeys: session.map(([key]) => key), containsInput: [...local, ...session].some(([key, value]) => `${key}\n${value}`.includes(marker)) };
  }, marker);
  assert.equal(storage.containsInput, false); h.storage = storage;
  await terminated(h); h.probeArchives.push(await h.probe()); h.generation++; h.phase = "reload";
  const response = await h.page.reload({ waitUntil: "load" }); assert.equal(response.status(), 200); await h.ready();
  await sameValue(h.input, ""); await noResult(h); await expect(h.workspace.locator(".jcsv-columns")).toHaveCount(0);
  await expect(h.button("Inspect JSON")).toBeDisabled(); await expect(h.button("Build CSV")).toBeDisabled();
  await expect(h.page).toHaveURL(TARGET); assert.equal((await h.probe()).workers.length, 0);
});

for (const width of [320, 390, 768, 1440]) for (const theme of ["light", "dark"]) scenario(`responsive / ${width}px ${theme}, wrapped input, columns, notes, full cell and CSV text`, async (h) => {
  // Fresh context resolves defaultTheme=system against explicit LIGHT media.
  // Exercise the real root theme button, not DOM-class or storage manipulation.
  const toggle = h.page.getByRole("button", { name: "Toggle theme", exact: true });
  await h.click(toggle); await expect(h.page.locator("html")).toHaveClass(/(?:^|\s)dark(?:\s|$)/);
  if (theme === "light") await h.click(toggle);
  await expect.poll(() => h.page.locator("html").evaluate((element) => ({ dark: element.classList.contains("dark"), scheme: getComputedStyle(element).colorScheme })))
    .toEqual({ dark: theme === "dark", scheme: theme });
  await expect(h.input).toBeVisible(); await layout(h, "initial"); const capture = width === 390 || width === 1440;
  if (capture) await screenshot(h, `${width}-${theme}-top`, h.page.locator(".jcsv-page > header"));
  await sample(h, 1); await h.select(ROW_SOURCE, "/data/items"); await layout(h, "wrapped source settings");
  if (capture) await screenshot(h, `${width}-${theme}-workspace`, h.workspace.locator(".jcsv-input-layout"));
  await build(h, 2, 4); await h.open(".jcsv-columns"); await h.open(".jcsv-warnings");
  await layout(h, "result and columns"); if (capture) await screenshot(h, `${width}-${theme}-result`, h.result.locator(".jcsv-stats"));
  await h.click(h.button("View row 1, column 3")); await sameValue(h.workspace.locator("#jcsv-cell"), '["reading", "weekend"]');
  await layout(h, "full cell value"); await h.click(h.button("Close cell value")); await h.click(h.button("CSV text"));
  await sameValue(h.workspace.locator("#jcsv-output"), normalTextarea(expectedCsv([API_HEADERS, ...API_ROWS]))); await layout(h, "raw CSV preview");
  await h.click(h.button("Table preview")); await exportMatches(h, API_HEADERS, API_ROWS);
}, { width });

async function verifyHealthy(h) {
  await terminated(h); await h.readReferences();
  if (!h.js) {
    for (const record of h.requests.filter((item) => item.allowed && item.type === "script" && item.failed && item.failureText === "csp")) {
      // Disabling JavaScript in Edge cancels its script preload as "csp"; verify the actual asset separately.
      assert.equal(record.origin, ORIGIN);
      assert.match(record.path, /^\/_next\/static\/chunks\/[\w.~%-]+\.js$/);
      const response = await h.context.request.get(`${ORIGIN}${record.path}`, { timeout: 15_000, maxRedirects: 0, maxRetries: 0 });
      assert.equal(response.status(), 200);
      assert.match(response.headers()["content-type"], /javascript/);
      assert.ok((await response.body()).length > 0);
      record.disabledScriptAssetVerified = true;
    }
  }
  if (h.js) {
    const probe = await h.probe(); assert.equal(probe.clipboardPending, 0); assert.equal(probe.heldPending, 0);
    assert.ok(probe.files.every((file) => !file.pending)); assert.equal(probe.injectedErrors, probe.preventedErrors);
    await expect.poll(async () => (await h.probe()).blobs.every((blob) => blob.revoked), { message: "Download object URLs are revoked by the real UI timer" }).toBe(true);
  }
  // Include secondary pages arriving while other asynchronous checks finish.
  // Each classification owns its bounded final-URL poll, never a hub close.
  for (let observed = 0; observed < h.popupChecks.length;) {
    const end = h.popupChecks.length; await Promise.all(h.popupChecks.slice(observed, end)); observed = end;
  }
  assert.deepEqual(h.pageErrors, [], "Every pageerror fails, including framework exceptions");
  assert.deepEqual(h.guardErrors, [], "Network guards must not silently fail"); assert.deepEqual(h.sockets, []);
  assert.equal(h.dialogs, 0); assert.equal(h.unexpectedDownloads, 0);
  assert.ok(h.secondaryPages.every((page) => page.allowedDownloadHub), "Only explicitly classified post-download edge://downloads-hub/ pages are allowed; external popups fail");
  assert.deepEqual(h.consoleAudit().filter((entry) => entry.category.endsWith(":FAIL")), [], "Only correlated ERR_BLOCKED_BY_CLIENT resource messages are expected; never hide framework errors");
  assert.deepEqual(h.requests.filter((record) => classify(h, record).endsWith(":FAIL")), [], "No input-bearing/API/unexpected request, even if blocked");
  assert.deepEqual(h.requests.filter((record) => record.allowed && !record.blob && (record.origin !== ORIGIN || record.method !== "GET" || record.status >= 400 || (record.failed && !record.disabledScriptAssetVerified))), [], "Authorized static/document GETs must succeed");
}
async function audit(h) {
  const probe = h.page.isClosed() ? null : await h.probe().catch(() => null);
  const requests = h.requests.map((record) => ({ ...record, classification: classify(h, record) }));
  const networkCounts = requests.reduce((counts, record) => { counts[record.classification] = (counts[record.classification] ?? 0) + 1; return counts; }, {});
  return { inputs: h.inputs, requests, networkCounts,
    resourceHints: h.resourceHints, console: h.consoleAudit(), pageErrors: h.pageErrors, guardErrors: h.guardErrors,
    nativeWorkers: h.nativeWorkers, probeGenerations: [...h.probeArchives, ...(probe ? [probe] : [])],
    secondaryPages: h.secondaryPages, httpGets: h.httpGets, storage: h.storage, layouts: h.layouts,
    pointerActions: h.pointerActions, downloadEvents: h.downloads, dialogs: h.dialogs, sockets: h.sockets };
}
async function main() {
  const args = process.argv.slice(2), focused = args.length > 0;
  assert.ok(!focused || (args.length === 2 && args[0] === "--from" && /^[1-9]\d*$/.test(args[1])), "Use no arguments, or --from N for focused debugging; no URL/env overrides");
  const first = focused ? Number(args[1]) : 1; assert.ok(first >= 1 && first <= cases.length);
  assert.ok(cases.length >= 35 && cases.length <= 60); const selected = cases.slice(first - 1);
  artifactDirectory = await mkdtemp(join(tmpdir(), "byteverse-json-csv-browser-"));
  const startedAt = new Date().toISOString(); let failure, version;
  console.log(`ARTIFACT_DIRECTORY ${artifactDirectory}\nExisting production preview only: ${TARGET}`);
  console.log(`${focused ? "FOCUSED, NOT FULL VALIDATION" : "FULL SUITE"}: ${selected.length}/${cases.length} sequential cases; first=${first}. No server management or installs.`);
  try {
    browser = await chromium.launch({ channel: "msedge", headless: true, downloadsPath: artifactDirectory,
      args: ["--disable-background-networking", "--disable-component-update", "--disable-domain-reliability", "--no-pings",
        "--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1"] });
    version = browser.version();
    for (let index = first - 1; index < cases.length; index++) {
      const entry = cases[index]; const result = { number: index + 1, name: entry.name, status: "running", options: entry.options }; results.push(result);
      let h;
      try {
        h = await createHarness(entry, index); await entry.run(h); await verifyHealthy(h); result.status = "passed";
        console.log(`PASS ${index + 1}/${cases.length} ${entry.name}`);
      } catch (error) {
        h ??= error.harness; result.status = "failed"; result.error = safeError(error);
        if (h && !h.page.isClosed()) {
          const path = join(artifactDirectory, `${String(index + 1).padStart(2, "0")}-failure-viewport.png`);
          try { await h.page.screenshot({ path, fullPage: false, caret: "hide", timeout: 5_000 }); screenshots.push({ case: entry.name, suffix: "failure", path }); }
          catch (captureError) { result.captureError = safeError(captureError); }
        }
        console.error(`FAIL ${index + 1}/${cases.length} ${entry.name}\n${result.error}`); throw error;
      } finally {
        if (h) {
          try { result.audit = await audit(h); }
          finally { h.closing = true; await h.context.close(); } // Owns downloads hubs; no individual hub.close().
        }
      }
    }
    if (!focused) { assert.equal(downloads.length, 3); assert.equal(screenshots.length, 12); }
  } catch (error) {
    failure = safeError(error); process.exitCode = 1;
    if (!results.some((result) => result.status === "failed")) console.error(`SETUP/CLEANUP FAILURE\n${failure}`);
  } finally {
    try { await browser?.close(); } catch (error) { failure ??= safeError(error); process.exitCode = 1; }
    const passed = results.filter((result) => result.status === "passed").length;
    const manifest = { status: failure ? "failed" : focused ? "focused-passed" : "passed", focused, first,
      startedAt, finishedAt: new Date().toISOString(), target: TARGET, canonical: CANONICAL,
      browser: { channel: "msedge", headless: true, version }, titleCharacters: TOOL.title.length, descriptionCharacters: TOOL.description.length,
      planned: selected.length, totalCases: cases.length, passed, failure, notRun: selected.slice(results.length).map((entry) => entry.name),
      intentionallyNotSelected: cases.slice(0, first - 1).map((entry) => entry.name), screenshots, downloads, cases: results,
      limitations: [
        "Parent must supply its credential-free built preview. This runner never loads app env/config/DB modules, starts a server, installs dependencies or calls an /api endpoint.",
        "Normal conversion exercises native Next-built Workers; selected worker/file/clipboard faults inject completion behavior, not real slow disks or system clipboard permissions.",
        "Copied CSV is captured in memory, not the system clipboard. Saved CSV/TSV files are real native downloads independently decoded and parsed.",
        "External requests, remote image proxies, nonapproved paths, mutations and sockets are blocked; sitewide hints/resources and app prefetch references are separate from input-bearing requests.",
        "Literal/JSON/URL/base64 canary checks cover these synthetic inputs, not every possible encoding or covert channel. Passing does not mean the surrounding site emits no network requests or uses no storage.",
        "Screenshots are emulated desktop-browser viewports, not physical-device or pixel-baseline certification. Virtual time exercises the deadline, not a performance guarantee.",
      ] };
    const path = join(artifactDirectory, "artifacts.json"); await writeFile(path, `${JSON.stringify(manifest, null, 2)}\n`, { flag: "wx" });
    console.log(`ARTIFACT_JSON ${path}`);
    console.log(JSON.stringify({ status: manifest.status, planned: selected.length, passed, notRun: manifest.notRun.length,
      screenshots: screenshots.length, downloads: downloads.length, artifactDirectory }));
  }
}

await main();