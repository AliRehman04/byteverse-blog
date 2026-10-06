/**
 * Standalone Node runner; supply the ALREADY BUILT, credential-free preview.
 * No server/build management, installs, env/config/DB reads, application-module
 * imports, API calls, external navigation, or workspace output. Artifacts use OS temp.
 * No arguments = all 40 cases. --case 7, --case "worker", or repeated --case
 * filters select case numbers / case-insensitive name substrings (OR semantics).
 * Any filtered invocation is reported as PARTIAL, even if it selects every case.
 * Normal inference uses the native bundled Worker. Turbopack may compile the
 * source module Worker into its same-origin classic bootstrap. Explicit fault tests
 * hold/replay its REAL messages; they never replace the inference engine.
 * Clipboard writes are captured in memory, never sent to the system clipboard.
 * Only explicitly armed 15s watchdog / 30s Blob-cleanup timers are advanced;
 * there are no sleeps, blanket fake clocks, or timing/performance claims.
 * The future title and route-specific social image are intentional requirements.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { chromium, expect as playwrightExpect } from "@playwright/test";
import { parseDocument } from "htmlparser2";
import ts from "typescript";

const ORIGIN = "http://127.0.0.1:3044";
const PATH = "/tools/json-to-typescript";
const TARGET = ORIGIN + PATH;
const PRODUCTION = "https://www.byteverse.fyi";
const CANONICAL = PRODUCTION + PATH;
const IMAGE_PATH = `${PATH}/opengraph-image`;
const TITLE = "Free JSON to TypeScript Converter - Interfaces & Types";
const LIMITS = { chars: 1_000_000, bytes: 2 * 1024 * 1024, output: 400_000, deadline: 15_000 };
const DEFAULTS = { rootName: "Root", declarationStyle: "interface", rootMode: "value", pointer: "",
  optionalProperties: "inferred", readonly: false, exportDeclarations: true, stringLiterals: false, sortProperties: false, indent: "2" };
const OPTION_IDS = { rootName: "root-name", declarationStyle: "declaration-style", rootMode: "root-mode", pointer: "pointer",
  optionalProperties: "optionality", readonly: "readonly", exportDeclarations: "export-declarations",
  stringLiterals: "string-literals", sortProperties: "sort-properties", indent: "indent" };
const SAMPLES = [
  { id: "nested-api", label: "Nested API response", root: "ObservatoryResponse", mode: "value", format: "json", selected: 1, declarations: 5, properties: 13 },
  { id: "record-array", label: "Optional fields and mixed IDs", root: "DemoAccount", mode: "array-items", format: "json", selected: 3, declarations: 2, properties: 7 },
  { id: "jsonl-events", label: "JSON Lines examples", root: "DemoEvent", mode: "value", format: "jsonl", selected: 3, declarations: 2, properties: 6 },
  { id: "unusual-keys", label: "Unusual property names", root: "UnusualRecord", mode: "value", format: "json", selected: 1, declarations: 3, properties: 13 },
];
const expect = playwrightExpect.configure({ timeout: 12_000 });
const cases = [], results = [], screenshots = [], downloads = [];
let browser, artifactDirectory;
const hash = (text) => createHash("sha256").update(text).digest("hex");
const normalize = (text) => text.replace(/\r\n?/g, "\n");
const collapse = (text) => text.replace(/\s+/g, " ").trim();
const count = (value) => value.toLocaleString("en-US");
const isHub = (url) => /^edge:\/\/downloads-hub\/?$/.test(url);
function scenario(name, run, options = {}) { cases.push({ number: cases.length + 1, name, run, options }); }
function safeError(error) {
  return String(error?.stack ?? error).replace(/\u001b\[[0-9;]*m/g, "").split("\n").slice(0, 16)
    .map((line) => line.length > 300 ? `${line.slice(0, 150)} [long diagnostic omitted]` : line).join("\n").slice(0, 3_500);
}
function equalText(actual, expected, label = "Exact text") {
  assert.ok(actual === expected, `${label}: lengths ${actual.length}/${expected.length}, SHA256 ${hash(actual)}/${hash(expected)}`);
}
async function sameValue(locator, value) {
  await expect.poll(async () => (await locator.inputValue()) === value, { message: "Exact editor value (contents not logged)" }).toBe(true);
}

// A real strict TypeScript program, not transpileModule. Virtual sources and the
// installed standard libraries are the ONLY readable compiler inputs. No emit.
const canonicalFile = (file) => resolve(file).replace(/\\/g, "/").toLowerCase();
const libDirectory = dirname(ts.getDefaultLibFilePath({}));
const libCache = new Map();
const PROOF = `
type __JtsEqual<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type __JtsExpect<T extends true> = T;
type __JtsOptional<T> = { [K in keyof T]-?: {} extends Pick<T, K> ? K : never }[keyof T];
`;
function compileMemory(entries) {
  const directory = join(artifactDirectory, "virtual-types-not-written");
  const files = new Map(entries.map((entry, index) => [join(directory, `fixture-${index}.${entry.extension ?? "ts"}`), entry.code]));
  const memory = new Map([...files].map(([file, text]) => [canonicalFile(file), text]));
  const options = { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler,
    lib: ["lib.es2022.d.ts", "lib.dom.d.ts"], types: [], strict: true, exactOptionalPropertyTypes: true,
    isolatedModules: true, noEmit: true, skipLibCheck: false, incremental: false };
  const host = ts.createCompilerHost(options, true);
  const isLib = (file) => canonicalFile(dirname(file)) === canonicalFile(libDirectory) && /^lib\..+\.d\.ts$/i.test(basename(file));
  host.getCurrentDirectory = () => directory;
  host.writeFile = () => { throw new Error("Compiler writes are forbidden"); };
  host.readDirectory = host.getDirectories = () => [];
  host.directoryExists = (file) => [directory, libDirectory].some((allowed) => canonicalFile(file) === canonicalFile(allowed));
  host.readFile = (file) => {
    if (memory.has(canonicalFile(file))) return memory.get(canonicalFile(file));
    if (!isLib(file)) return undefined;
    try { return readFileSync(file, "utf8"); } catch { return undefined; }
  };
  host.fileExists = (file) => host.readFile(file) !== undefined;
  host.resolveModuleNames = (names) => names.map(() => undefined);
  host.getSourceFile = (file, languageVersion) => {
    const key = canonicalFile(file);
    if (isLib(file) && libCache.has(key)) return libCache.get(key);
    const text = host.readFile(file);
    if (text === undefined) return undefined;
    const source = ts.createSourceFile(file, text, languageVersion, true);
    if (isLib(file)) libCache.set(key, source);
    return source;
  };
  const program = ts.createProgram([...files.keys()], options, host);
  assert.ok(program.getSourceFiles().some((file) => /lib\.es5\.d\.ts$/.test(file.fileName)), "Real standard library loaded");
  return ts.getPreEmitDiagnostics(program);
}
function codeTree(code) {
  const tree = ts.createSourceFile("captured.ts", code, ts.ScriptTarget.Latest, true);
  assert.equal(tree.parseDiagnostics.length, 0, "Captured code parses");
  assert.ok(ts.isExternalModule(tree), "Generated code stays module-scoped");
  for (const node of tree.statements) assert.ok(ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)
    || (ts.isExportDeclaration(node) && !node.moduleSpecifier && node.exportClause && ts.isNamedExports(node.exportClause) && !node.exportClause.elements.length), "Only type declarations and export {} are allowed");
  function visit(node) { assert.notEqual(node.kind, ts.SyntaxKind.AnyKeyword, "Never infer any"); ts.forEachChild(node, visit); }
  visit(tree); return tree;
}
function definitions(code) { return [...codeTree(code).statements].filter((node) => ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)); }
function properties(code, name) {
  const tree = codeTree(code), node = tree.statements.find((entry) => entry.name?.text === name);
  assert.ok(node, `Missing declaration ${name}`);
  const body = ts.isInterfaceDeclaration(node) ? node : ts.isTypeLiteralNode(node.type) ? node.type : null;
  return body ? [...body.members].filter(ts.isPropertySignature).map((member) => ({ key: member.name.text,
    type: member.type.getText(tree), optional: !!member.questionToken, readonly: !!member.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ReadonlyKeyword) })) : [];
}

// Observation plus explicit, individually armed failure gates. Native reads and
// real Worker responses still happen; released callbacks also exercise stale IDs.
function installProbe() {
  // Edge can re-run an init script in the same global during a native download.
  // Keep the original observations and wrappers; do not install them twice.
  if (Object.hasOwn(window, "__jtsBrowserProbe")) return;
  const p = { workers: [], reads: [], copies: [], clipboardMode: "capture", clipboardPending: 0, blobs: [], timers: [], now: 0,
    holdMessages: false, holdReads: false, captureDeadline: false, captureDownload: false, nextWorkerFault: null,
    constructorFailures: 0, injectedErrors: 0, preventedErrors: 0, released: 0, outputs: [] };
  Object.defineProperty(window, "__jtsBrowserProbe", { value: p });
  let messages = [];
  const reads = [], copies = [], controls = [], timers = new Map();
  p.releaseMessages = (index) => {
    if (index === undefined) p.holdMessages = false;
    const selected = messages.filter((item) => index === undefined || item.index === index);
    messages = messages.filter((item) => !selected.includes(item));
    selected.forEach((item) => { p.released++; item.callback.call(item.worker, item.event); });
  };
  p.releaseReads = () => reads.splice(0).forEach((release) => release());
  p.releaseClipboard = (reject = false) => copies.splice(0).forEach((entry) => reject ? entry.reject(new Error("SYNTHETIC_CLIPBOARD_REJECTION")) : entry.resolve());
  p.inject = (index, kind, data) => {
    const entry = controls[index];
    if (kind === "error") {
      const event = new ErrorEvent("error", { cancelable: true, message: "SYNTHETIC_WORKER_PRIVATE_FAILURE" });
      p.injectedErrors++; entry.error.call(entry.worker, event);
      if (event.defaultPrevented) p.preventedErrors++;
    } else if (kind === "messageerror") entry.messageerror.call(entry.worker, new MessageEvent("messageerror"));
    else entry.message.call(entry.worker, new MessageEvent("message", { data }));
  };
  const nativeSet = window.setTimeout, nativeClear = window.clearTimeout;
  window.setTimeout = function (callback, delay, ...args) {
    // The UI arms its watchdog between constructing and posting to its Worker,
    // and its download cleanup immediately after creating a text/plain Blob.
    const watchdog = (p.captureDeadline || p.holdMessages) && delay === 15_000 && p.workers.at(-1)?.posted.length === 0;
    const download = p.captureDownload && delay === 30_000 && p.blobs.at(-1)?.mime === "text/plain;charset=utf-8" && !p.blobs.at(-1).revoked;
    if (typeof callback === "function" && (watchdog || download)) {
      const id = -1 - p.timers.length, record = { id, delay, kind: watchdog ? "worker-watchdog" : "download-cleanup",
        due: p.now + delay, active: true, fired: false, cleared: false };
      p.timers.push(record); timers.set(id, { record, callback, args }); return id;
    }
    return Reflect.apply(nativeSet, window, [callback, delay, ...args]);
  };
  window.clearTimeout = function (id) {
    const timer = timers.get(id);
    if (timer) { timer.record.active = false; timer.record.cleared = true; }
    else Reflect.apply(nativeClear, window, [id]);
  };
  p.advanceTimers = (milliseconds) => {
    if (!Number.isSafeInteger(milliseconds) || milliseconds < 0) throw new Error("Invalid injected timing");
    p.now += milliseconds;
    for (const timer of timers.values()) if (timer.record.active && timer.record.due <= p.now) {
      timer.record.active = false; timer.record.fired = true; timer.callback(...timer.args);
    }
  };
  const nativeRead = File.prototype.arrayBuffer;
  File.prototype.arrayBuffer = async function () {
    const record = { bytes: this.size, pending: true, completed: false, held: p.holdReads };
    p.reads.push(record);
    try {
      if (record.held) await new Promise((release) => reads.push(release));
      const value = await Reflect.apply(nativeRead, this, []); record.completed = true; return value;
    } finally { record.pending = false; }
  };
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: {
    async writeText(text) {
      p.copies.push(String(text)); p.clipboardPending++;
      try {
        if (p.clipboardMode === "reject") throw new Error("SYNTHETIC_CLIPBOARD_REJECTION");
        if (p.clipboardMode === "hold") await new Promise((resolve, reject) => copies.push({ resolve, reject }));
      } finally { p.clipboardPending--; }
    },
  } });
  const create = URL.createObjectURL, revoke = URL.revokeObjectURL;
  URL.createObjectURL = function (blob) {
    const url = Reflect.apply(create, URL, [blob]); p.blobs.push({ url, bytes: blob.size, mime: blob.type, revoked: false }); return url;
  };
  URL.revokeObjectURL = function (url) {
    const record = p.blobs.find((entry) => entry.url === url); if (record) record.revoked = true;
    return Reflect.apply(revoke, URL, [url]);
  };
  const NativeWorker = window.Worker;
  window.Worker = class extends NativeWorker {
    constructor(url, options) {
      if (p.nextWorkerFault === "constructor") {
        p.nextWorkerFault = null; p.constructorFailures++; throw new Error("SYNTHETIC_WORKER_PRIVATE_FAILURE");
      }
      super(url, options);
      const index = p.workers.length;
      this.audit = { url: new URL(String(url), location.href).href, type: options?.type ?? "classic", posted: [], received: [], terminated: 0 };
      p.workers.push(this.audit); this.probeIndex = index;
      this.addEventListener("message", (event) => {
        const data = event.data;
        this.audit.received.push({ id: data.id, kind: data.kind, keys: Object.keys(data).sort(), codeChars: data.result?.code.length,
          declarations: data.result?.declarations.length, properties: data.result?.stats.properties, selected: data.result?.stats.selectedValues });
        if (data.kind === "generate") p.outputs[index] = data.result.code;
        if (p.holdMessages) {
          if (typeof this.onmessage !== "function") throw new Error("Missing real client Worker callback");
          event.stopImmediatePropagation(); messages.push({ index, worker: this, callback: this.onmessage, event });
        }
      });
    }
    postMessage(request, ...rest) {
      this.audit.posted.push({ id: request.id, kind: request.kind, format: request.format, keys: Object.keys(request).sort(),
        chars: request.input.length, bytes: new TextEncoder().encode(request.input).length, optionKeys: Object.keys(request.options ?? {}).sort() });
      controls[this.probeIndex] = { worker: this, message: this.onmessage, error: this.onerror, messageerror: this.onmessageerror };
      return super.postMessage(request, ...rest);
    }
    terminate() { this.audit.terminated++; return super.terminate(); }
  };
  p.snapshot = () => ({ workers: p.workers, reads: p.reads, copyLengths: p.copies.map((text) => text.length), clipboardPending: p.clipboardPending,
    blobs: p.blobs, timers: p.timers, heldMessages: messages.length, released: p.released, constructorFailures: p.constructorFailures,
    injectedErrors: p.injectedErrors, preventedErrors: p.preventedErrors });
}

const ASSETS = new Set(["/logo.png", "/favicon.ico", "/favicon-16x16.png", "/favicon-32x32.png", "/apple-icon.png",
  "/apple-touch-icon.png", "/android-chrome-192x192.png", "/android-chrome-512x512.png", "/site.webmanifest"]);
const SITE_HOSTS = new Set(["translate.googleapis.com", "translate.google.com", "translate.gstatic.com", "res.cloudinary.com",
  "images.unsplash.com", "fonts.googleapis.com", "fonts.gstatic.com", "www.googletagmanager.com", "www.google-analytics.com",
  "region1.google-analytics.com", "pagead2.googlesyndication.com", "googleads.g.doubleclick.net", "tpc.googlesyndication.com"]);
const onlyKeys = (url, keys) => [...url.searchParams.keys()].every((key) => keys.includes(key));
function siteImage(url) {
  try {
    const source = new URL(url.searchParams.get("url"));
    return url.origin === ORIGIN && url.pathname === "/_next/image" && /^https?:$/.test(source.protocol)
      && !source.username && !source.password && SITE_HOSTS.has(source.hostname);
  } catch { return false; }
}
function allowedGet(url, method) {
  if (method !== "GET" || url.origin !== ORIGIN || url.username || url.password) return false;
  if (url.pathname.startsWith("/_next/static/")) return onlyKeys(url, ["dpl", "v"]);
  if (url.pathname === PATH) return onlyKeys(url, ["_rsc"]);
  if (ASSETS.has(url.pathname)) return !url.search || /^\?[\w.-]{1,160}(?:=[\w.-]{1,160})?$/.test(url.search);
  return url.pathname === "/_next/image" && url.searchParams.get("url") === "/logo.png" && onlyKeys(url, ["url", "w", "q"])
    && /^\d+$/.test(url.searchParams.get("w") ?? "") && /^\d+$/.test(url.searchParams.get("q") ?? "");
}
function classification(h, record) {
  if (record.inputMatches.length) return "input-bearing:FAIL";
  if (record.allowed) return record.blob ? "native-blob-download" : "loopback-GET";
  if (record.path.startsWith("/api/")) return "API-attempt:FAIL";
  if (record.method !== "GET" || record.bodyBytes) return "mutation-or-payload:FAIL";
  if (record.siteResource) return "blocked-sitewide-resource";
  if (record.remoteImage) return "blocked-sitewide-image-proxy";
  if (record.prefetch && h.references.has(record.path)) return "blocked-link-prefetch";
  return "unexpected-request:FAIL";
}
async function createHarness(entry) {
  const h = { entry, js: entry.options.js !== false, source: "", phase: "load", generation: 0, closing: false, inputs: [], needles: [],
    requests: [], console: [], pageErrors: [], guardErrors: [], nativeWorkers: [], archives: [], references: new Set(), hints: [],
    secondaryPages: [], popupChecks: [], sockets: [], dialogs: 0, chooserEvents: 0, downloadEvents: 0, unexpectedDownloads: 0,
    downloadIntent: false, httpGets: [], captures: [], layouts: [] };
  try {
    h.context = await browser.newContext({ viewport: { width: entry.options.width ?? 1440, height: 960 }, deviceScaleFactor: 1,
      colorScheme: "light", reducedMotion: "reduce", locale: "en-US", timezoneId: "UTC", serviceWorkers: "block", acceptDownloads: true, javaScriptEnabled: h.js });
    h.context.setDefaultTimeout(12_000); h.context.setDefaultNavigationTimeout(30_000);
    h.track = (text, kind = "input") => {
      h.inputs.push({ kind, chars: text.length, bytes: Buffer.byteLength(text), sha256: hash(text) });
      const strings = [...new Set([...(text.length >= 16 ? [text.slice(0, 96)] : []), ...(text.match(/BV_JTS_[A-Z0-9_]+/g) ?? [])])];
      for (const text of strings) {
        const safe = text.toWellFormed();
        h.needles.push({ id: `${kind}-${h.needles.length + 1}`, variants: [text, collapse(text), JSON.stringify(text).slice(1, -1),
          encodeURIComponent(safe), new URLSearchParams({ q: safe }).toString().slice(2), Buffer.from(text).toString("base64").replace(/=+$/, "")] });
      }
    };
    const seen = new WeakMap(), byUrl = new Map();
    function observe(request) {
      if (seen.has(request)) return seen.get(request);
      const url = new URL(request.url()), headers = request.headers();
      const raw = [request.url(), request.postData() ?? "", ...Object.values(headers)].join("\n");
      let decoded = raw; try { decoded = decodeURIComponent(raw.replace(/\+/g, " ")); } catch { /* Raw form still checked. */ }
      const inputMatches = h.needles.filter((needle) => needle.variants.some((value) => value && [raw, decoded, collapse(decoded)].some((form) => form.includes(value)))).map((needle) => needle.id);
      const blob = url.protocol === "blob:" && url.origin === ORIGIN && h.downloadIntent && request.method() === "GET";
      const record = { phase: h.phase, method: request.method(), type: request.resourceType(), origin: url.origin,
        path: inputMatches.length ? "[input redacted]" : url.pathname.slice(0, 250), queryKeys: inputMatches.length ? ["[redacted]"] : [...url.searchParams.keys()].map((key) => key.slice(0, 60)),
        bodyBytes: request.postDataBuffer()?.length ?? 0, inputMatches, blob, allowed: !inputMatches.length && !request.postDataBuffer()?.length && (blob || allowedGet(url, request.method())),
        siteResource: !url.username && !url.password && SITE_HOSTS.has(url.hostname) && ["script", "stylesheet", "font", "image"].includes(request.resourceType()),
        remoteImage: siteImage(url),
        prefetch: url.origin === ORIGIN && onlyKeys(url, ["_rsc"]) && (headers.rsc === "1" || headers["next-router-prefetch"] === "1" || url.searchParams.has("_rsc")) };
      seen.set(request, record); byUrl.set(request.url(), record); h.requests.push(record); return record;
    }
    h.context.on("request", observe);
    h.context.on("response", (response) => { observe(response.request()).status = response.status(); });
    h.context.on("requestfailed", (request) => { observe(request).failure = request.failure()?.errorText ?? "unknown"; });
    await h.context.route("**/*", async (route) => {
      try {
        const record = observe(route.request());
        if (record.allowed) await route.continue();
        else { record.blocked = true; await route.abort("blockedbyclient"); }
      } catch (error) { if (!h.closing) h.guardErrors.push(safeError(error)); }
    });
    await h.context.routeWebSocket("**/*", (socket) => { h.sockets.push("Blocked unexpected WebSocket"); socket.close(); });
    if (h.js) await h.context.addInitScript(installProbe);
    let pageCount = 0;
    h.context.on("page", (page) => {
      if (++pageCount > 1) {
        const record = { initial: page.url(), final: "", allowed: false }; h.secondaryPages.push(record);
        h.popupChecks.push((async () => {
          try {
            // Edge initially reports an empty URL. Only its internal hub plus
            // an observed native download is exempt; NEVER call page.close().
            await expect.poll(() => isHub(page.url()) && h.downloadEvents > 0, { timeout: 5_000 }).toBe(true);
            record.allowed = true;
          } catch { /* verifyHealthy reports the unexpected page. */ }
          finally { record.final = page.url().slice(0, 250); }
        })());
      }
      page.on("pageerror", (error) => h.pageErrors.push(safeError(error)));
      page.on("console", (message) => { if (message.type() === "error") h.console.push({ text: message.text(), url: message.location().url }); });
      page.on("dialog", async (dialog) => { h.dialogs++; await dialog.dismiss().catch((error) => h.guardErrors.push(safeError(error))); });
      page.on("filechooser", () => { h.chooserEvents++; });
      page.on("download", () => { h.downloadEvents++; if (!h.downloadIntent) h.unexpectedDownloads++; });
      page.on("worker", (worker) => {
        const record = { url: worker.url(), generation: h.generation, closed: false }; h.nativeWorkers.push(record);
        worker.on("close", () => { record.closed = true; });
      });
    });
    h.page = await h.context.newPage(); h.workspace = h.page.locator("#json-ts-workspace");
    h.id = (suffix) => h.workspace.locator(`#jts-${suffix}`);
    h.input = h.id("input"); h.output = h.id("output"); h.result = h.workspace.getByTestId("json-ts-result");
    h.confirmation = h.workspace.getByRole("group", { name: "Confirm input replacement", exact: true });
    h.probe = () => h.js ? h.page.evaluate(() => window.__jtsBrowserProbe.snapshot()) : Promise.resolve(null);
    h.control = (values) => h.page.evaluate((values) => { Object.assign(window.__jtsBrowserProbe, values); }, values);
    h.call = (method, ...args) => h.page.evaluate(({ method, args }) => window.__jtsBrowserProbe[method](...args), { method, args });
    h.click = (suffix) => (typeof suffix === "string" ? h.id(suffix) : suffix).click();
    h.select = async (suffix, value) => { await h.id(suffix).selectOption(String(value)); await expect(h.id(suffix)).toHaveValue(String(value)); };
    h.open = async (suffix) => { if (await h.id(suffix).getAttribute("open") === null) await h.click(h.id(suffix).locator(":scope > summary")); };
    h.option = async (key, value) => {
      if (["readonly", "exportDeclarations", "stringLiterals", "sortProperties", "indent"].includes(key)) await h.open("more-settings");
      if (key === "pointer") await h.open("nested-settings");
      const id = OPTION_IDS[key]; assert.ok(id, `Unknown option ${key}`);
      if (typeof value === "boolean") await h.id(id).setChecked(value);
      else if (["rootName", "pointer"].includes(key)) { h.track(value, key); await h.id(id).fill(value); }
      else await h.select(id, value);
    };
    h.setInput = async (text, format = "json") => {
      h.track(text); if (await h.id("format").inputValue() !== format) await h.select("format", format);
      await h.input.fill(text); h.source = normalize(text); await sameValue(h.input, h.source); await noResult(h);
    };
    h.referencesNow = async () => {
      for (const href of await h.page.locator("a[href]").evaluateAll((elements) => elements.map((element) => element.href))) {
        const url = new URL(href); if (url.origin === ORIGIN) h.references.add(url.pathname);
      }
      h.hints = await h.page.locator('link[rel="preconnect"], link[rel="dns-prefetch"]').evaluateAll((elements) => elements.map((element) => ({ rel: element.rel, href: element.href })));
    };
    h.ready = async () => {
      await expect(h.workspace).toBeVisible();
      if (h.js) await expect.poll(() => h.id("load-example").evaluate((element) => Object.keys(element)
        .some((key) => key.startsWith("__reactProps$") && typeof element[key]?.onClick === "function")), { message: "Observe hydration; never invoke a React handler" }).toBe(true);
      await h.referencesNow(); h.phase = "workflow";
    };
    h.http = async (path) => {
      const url = new URL(path, ORIGIN);
      assert.ok(url.origin === ORIGIN && url.pathname === IMAGE_PATH && !url.search && !url.hash && !url.username && !url.password);
      // APIRequestContext bypasses route interception: this separately guarded
      // GET is ONLY the local social image, without redirects or retries.
      const response = await h.context.request.get(url.href, { maxRedirects: 0, maxRetries: 0, timeout: 30_000 });
      h.httpGets.push({ path, status: response.status() }); assert.equal(response.status(), 200); return response;
    };
    h.consoleAudit = () => h.console.map((message) => {
      const request = byUrl.get(message.url), category = request ? classification(h, request) : "unmatched";
      const expected = /^Failed to load resource: net::ERR_BLOCKED_BY_CLIENT(?:\.Inspector)?(?:\s.*)?$/.test(message.text)
        && request?.blocked && category.startsWith("blocked-");
      return { category: expected ? category : "console-error:FAIL", text: safeError(message.text), path: request?.path };
    });
    h.initialResponse = await h.page.goto(TARGET, { waitUntil: "load" });
    assert.equal(h.initialResponse?.status(), 200); await expect(h.page).toHaveURL(TARGET); await h.ready(); return h;
  } catch (error) { error.harness = h; throw error; }
}

async function noResult(h) {
  await expect(h.result).toHaveCount(0); await expect(h.output).toHaveCount(0); await expect(h.id("empty-result")).toBeVisible();
  for (const id of ["copy", "download", "download-extension", "fields-view", "code-view"]) await expect(h.id(id)).toBeDisabled();
}
async function errorIs(h, pattern) {
  await expect(h.id("error")).toBeVisible(); await expect(h.id("error")).toContainText(pattern);
  const text = await h.id("error").innerText(); assert.ok(text.length <= 650); assert.doesNotMatch(text, /BV_JTS_|SYNTHETIC_|<script>/);
}
async function settledWorkers(h) {
  if (!h.js) return;
  await expect.poll(async () => (await h.probe()).workers.every((worker) => worker.terminated === 1), { message: "Each client Worker terminated exactly once" }).toBe(true);
  const probe = await h.probe();
  await expect.poll(() => h.nativeWorkers.filter((worker) => worker.generation === h.generation).length).toBe(probe.workers.length);
  await expect.poll(() => h.nativeWorkers.every((worker) => worker.closed), { message: "Independent native Worker close events" }).toBe(true);
  for (const worker of probe.workers) {
    const url = new URL(worker.url); assert.equal(url.origin, ORIGIN); assert.match(url.pathname, /^\/_next\/static\/.+\.js$/);
    if (worker.type !== "module") {
      // Verified Next 16.2.6 production bootstrap uses importScripts internally.
      // Accept only that built same-origin worker, not arbitrary classic code.
      assert.equal(worker.type, "classic");
      assert.match(url.pathname, /^\/_next\/static\/chunks\/turbopack-worker-[\w~.-]+\.js$/);
      assert.ok(url.hash.startsWith("#params="));
      const [chunks] = JSON.parse(decodeURIComponent(url.hash.slice(8)));
      assert.ok(Array.isArray(chunks) && chunks.length > 0);
      for (const chunk of chunks) {
        const asset = new URL(chunk, ORIGIN);
        assert.equal(asset.origin, ORIGIN);
        assert.match(asset.pathname, /^\/_next\/static\/chunks\/[\w~.-]+\.js$/);
      }
    }
    assert.equal(worker.posted.length, 1);
    const request = worker.posted[0]; assert.ok(Number.isSafeInteger(request.id) && request.id >= 0);
    assert.ok(["inspect", "generate"].includes(request.kind)); assert.ok(["json", "jsonl"].includes(request.format));
    assert.ok(request.chars > 0 && request.chars <= LIMITS.chars && request.bytes <= LIMITS.bytes);
    assert.deepEqual(request.keys, ["id", "kind", "input", "format", ...(request.kind === "generate" ? ["options"] : [])].sort());
    assert.deepEqual(request.optionKeys, request.kind === "generate" ? Object.keys(DEFAULTS).sort() : []);
    for (const response of worker.received) {
      assert.equal(response.id, request.id); assert.ok(response.kind === request.kind || response.kind === "error");
      assert.deepEqual(response.keys, ["id", "kind", response.kind === "error" ? "error" : response.kind === "inspect" ? "inspection" : "result"].sort());
    }
  }
}
async function takeResult(h, index, checks = "") {
  await expect.poll(async () => (await h.probe()).workers[index]?.terminated, { message: "The NEW worker, not a retained result, completed", timeout: 20_000 }).toBe(1);
  await expect(h.output).toBeVisible({ timeout: 20_000 }); await expect(h.result).toBeVisible(); await expect(h.id("error")).toHaveCount(0);
  await expect(h.id("cancel-operation")).toHaveCount(0); await expect(h.id("copy")).toBeEnabled();
  await expect(h.id("code-declaration")).toHaveValue("-1");
  const code = await h.output.inputValue(); assert.ok(code.length > 0 && code.length <= LIMITS.output);
  assert.ok(code.endsWith("\n")); assert.ok(!code.includes("\r"));
  equalText(code, await h.page.evaluate((index) => window.__jtsBrowserProbe.outputs[index], index), "UI equals real Worker output");
  const defs = definitions(code), root = await h.id("root-name").inputValue(); assert.equal(defs[0].name.text, root);
  assert.equal(new Set(defs.map((node) => node.name.text.toLowerCase())).size, defs.length);
  const worker = (await h.probe()).workers[index]; assert.equal(worker.posted[0].kind, "generate");
  assert.equal(worker.received.length, 1); assert.equal(worker.received[0].kind, "generate");
  assert.equal(worker.posted[0].chars, h.source.length); assert.equal(worker.posted[0].bytes, Buffer.byteLength(h.source));
  await expect(h.workspace.getByTestId("json-ts-declaration-count")).toHaveText(count(defs.length));
  await expect(h.workspace.getByTestId("json-ts-property-count")).toHaveText(count(defs.reduce((sum, node) => sum + properties(code, node.name.text).length, 0)));
  await expect(h.id("status")).toContainText("No TypeScript compiler was run"); // Browser claim; Node checking is separate.
  h.captures.push({ code, checks, root }); await settledWorkers(h); return code;
}
async function generate(h, checks = "", keyboard = false) {
  const index = (await h.probe()).workers.length;
  if (keyboard) await h.input.press("Control+Enter"); else await h.click("generate");
  const code = await takeResult(h, index, checks); assert.equal((await h.probe()).workers.length, index + 1); return code;
}
async function generateError(h, pattern) {
  await h.click("generate"); await errorIs(h, pattern); await noResult(h); await settledWorkers(h);
}
async function loadSample(h, id) {
  const sample = SAMPLES.find((entry) => entry.id === id); assert.ok(sample);
  await h.select("example", id); await h.click("load-example");
  // This helper is deliberately for fresh workspaces, not auto-accepting dialogs.
  await expect(h.confirmation).toHaveCount(0); h.source = await h.input.inputValue(); h.track(h.source, "sample");
  await expect(h.id("format")).toHaveValue(sample.format); await expect(h.id("root-name")).toHaveValue(sample.root);
  await expect(h.id("root-mode")).toHaveValue(sample.mode); await expect(h.id("pointer")).toHaveValue("");
  await expect(h.id("sample-hint")).toBeVisible(); await noResult(h); assert.equal((await h.probe()).workers.length, 0);
}
async function rows(h, name) {
  await h.click("fields-view");
  const options = await h.id("review-declaration").locator("option").evaluateAll((elements) => elements.map((element) => ({ value: element.value, text: element.textContent })));
  const option = options.find((entry) => entry.text.includes(`. ${name} ·`)); assert.ok(option, `Field-review declaration ${name}`);
  await h.select("review-declaration", option.value);
  return h.workspace.locator(".jts-field-table tbody tr").evaluateAll((elements) => elements.map((element) => [...element.children].map((cell) => cell.textContent.trim())));
}
async function fullCode(h) { await h.click("code-view"); await h.select("code-declaration", "-1"); return h.output.inputValue(); }
async function upload(h, name, contents) {
  const buffer = Buffer.isBuffer(contents) ? contents : Buffer.from(contents, "utf8");
  h.track(name, "filename"); h.track(buffer.toString("utf8"), "file");
  const [chooser] = await Promise.all([h.page.waitForEvent("filechooser"), h.click("import")]);
  assert.equal(chooser.isMultiple(), false); assert.equal(await chooser.element().getAttribute("id"), "jts-file");
  await chooser.setFiles({ name, mimeType: "text/plain", buffer }); await expect(h.id("file")).toHaveValue("");
}
async function settings(h) {
  return h.workspace.evaluate((element, ids) => Object.fromEntries(Object.entries(ids).map(([key, id]) => {
    const control = element.querySelector(`#jts-${id}`); return [key, control.type === "checkbox" ? control.checked : control.value];
  })), OPTION_IDS);
}
async function snapshotWork(h) {
  return { source: h.source, code: await fullCode(h), options: await settings(h), format: await h.id("format").inputValue() };
}
async function kept(h, prior, held = false) {
  await sameValue(h.input, normalize(prior.source)); assert.deepEqual(await settings(h), prior.options);
  await expect(h.id("format")).toHaveValue(prior.format); await expect(h.result).toBeVisible();
  if (held) {
    await expect(h.id("held-result")).toBeVisible(); await expect(h.output).toHaveCount(0);
    for (const id of ["copy", "download", "generate", "code-view", "fields-view"]) await expect(h.id(id)).toBeDisabled();
  } else {
    // snapshotWork selected full Code before the operation. Inspect retention
    // without clicking a selector and stealing focus from the restored input.
    await expect(h.id("code-declaration")).toHaveValue("-1");
    await sameValue(h.output, prior.code); await expect(h.id("copy")).toBeEnabled();
  }
}
async function baseline(h) {
  await h.setInput('{"keep":{"value":"BV_JTS_RETAINED_WORK"},"id":1}');
  await h.option("readonly", true); await h.option("rootName", "KeptRecord"); await generate(h); return snapshotWork(h);
}
async function heldGeneration(h) {
  await h.control({ holdMessages: true }); const before = await h.probe(); await h.click("generate");
  await expect(h.id("cancel-operation")).toBeVisible();
  await expect.poll(async () => (await h.probe()).heldMessages, { timeout: 30_000 }).toBe(before.heldMessages + 1);
  await noResult(h); return before.workers.length;
}
async function nativeDownload(h, extension, code, filename) {
  await h.select("download-extension", extension); await h.control({ captureDownload: true }); h.downloadIntent = true;
  try {
    const [download] = await Promise.all([h.page.waitForEvent("download"), h.click("download")]);
    assert.equal(download.suggestedFilename(), filename); assert.equal(await download.failure(), null);
    const path = join(artifactDirectory, `${h.entry.number}-download-${downloads.length + 1}.${extension}`);
    await download.saveAs(path); const bytes = await readFile(path);
    assert.ok(bytes.equals(Buffer.from(code, "utf8")), "Native download contains ALL declarations and guard, not the selected preview");
    equalText(new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes), code, "Downloaded UTF-8 (no BOM)");
    const blob = (await h.probe()).blobs.at(-1); assert.equal(blob.bytes, bytes.length); assert.equal(blob.mime, "text/plain;charset=utf-8");
    assert.ok((await h.probe()).timers.some((timer) => timer.delay === 30_000 && timer.active), "Capture the real Blob cleanup callback");
    await h.call("advanceTimers", 30_000);
    assert.equal((await h.probe()).blobs.at(-1).revoked, true, "Real revokeObjectURL called without a 30s sleep");
    h.captures.push({ code: bytes.toString("utf8"), extension });
    downloads.push({ case: h.entry.number, path, filename, bytes: bytes.length, sha256: hash(bytes) });
  } finally { h.downloadIntent = false; await h.control({ captureDownload: false }); }
}

function nodes(root, predicate) {
  const found = [];
  function visit(node) { if (predicate(node)) found.push(node); for (const child of node.children ?? []) visit(child); }
  visit(root); return found;
}
const nodeText = (node) => node.type === "text" ? node.data : (node.children ?? []).map(nodeText).join("");
function one(root, predicate, label) { const found = nodes(root, predicate); assert.equal(found.length, 1, `Exactly one ${label}`); return found[0]; }
function meta(root, name, attribute = "name") { return one(root, (node) => node.name === "meta" && node.attribs[attribute] === name, name).attribs.content; }
function schemaObjects(value) {
  if (Array.isArray(value)) return value.flatMap(schemaObjects);
  return value && typeof value === "object" ? [value, ...schemaObjects(value["@graph"])] : [];
}
async function layout(h, state) {
  await expect.poll(() => h.page.evaluate(() => document.fonts.status)).toBe("loaded");
  let measurement, prior, stable = 0;
  await expect.poll(async () => {
    measurement = await h.workspace.evaluate((workspace) => {
      const outer = workspace.getBoundingClientRect();
      const boxes = [...workspace.querySelectorAll(".jts-settings-grid, .jts-editor-panel, .jts-confirmation, .jts-export-actions, .jts-pagination, textarea, select, input:not([type=file])")];
      const outside = boxes.filter((element) => {
        const box = element.getBoundingClientRect(); return box.width > 0 && (box.left < outer.left - 1 || box.right > outer.right + 1);
      }).map((element) => element.id || element.className);
      return { viewport: innerWidth, documentWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
        workspaceWidth: outer.width, outside, overflow: workspace.scrollWidth > workspace.clientWidth + 1,
        controlsOverflow: [...workspace.querySelectorAll(".jts-toolbar, .jts-examples, .jts-settings-grid, .jts-export-actions, .jts-page-controls")]
          .some((element) => element.clientWidth > 0 && element.scrollWidth > element.clientWidth + 1) };
    });
    const signature = JSON.stringify(measurement); stable = signature === prior ? stable + 1 : 0; prior = signature;
    return stable >= 2 && measurement.documentWidth <= measurement.viewport + 1 && !measurement.overflow && !measurement.controlsOverflow && !measurement.outside.length;
  }, { message: `${state}: document/control widths; scrolling INSIDE code editors and tables is allowed` }).toBe(true);
  h.layouts.push({ state, ...measurement });
}
async function screenshot(h, suffix, locator) {
  await locator.scrollIntoViewIfNeeded(); const path = join(artifactDirectory, `${h.entry.number}-${suffix}.png`);
  await h.page.screenshot({ path, fullPage: false, caret: "hide" }); screenshots.push({ case: h.entry.number, suffix, path });
}
async function theme(h, value) {
  const toggle = h.page.getByRole("button", { name: "Toggle theme", exact: true });
  await toggle.click(); await expect(h.page.locator("html")).toHaveClass(/(?:^|\s)dark(?:\s|$)/);
  if (value === "light") await toggle.click();
  await expect.poll(() => h.page.locator("html").evaluate((element) => ({ dark: element.classList.contains("dark"), scheme: getComputedStyle(element).colorScheme })))
    .toEqual({ dark: value === "dark", scheme: value });
}

scenario("SEO / actual SSR, future title, canonical, one H1, five FAQ parity, free schema and PNG", async (h) => {
  const root = parseDocument(await h.initialResponse.text());
  assert.equal(nodeText(one(root, (node) => node.name === "title", "SSR title")), TITLE); await expect(h.page).toHaveTitle(TITLE);
  assert.equal(one(root, (node) => node.name === "link" && node.attribs.rel === "canonical", "canonical").attribs.href, CANONICAL);
  assert.match(nodeText(one(root, (node) => node.name === "h1", "SSR H1")), /JSON to TypeScript/i);
  await expect(h.page.getByRole("heading", { level: 1 })).toHaveCount(1);
  const description = meta(root, "description");
  assert.equal(description, "Generate TypeScript interfaces or types from JSON and JSON Lines. Infer optional fields, review mixed arrays, select nested data, and download your types locally.");
  for (const [key, attribute] of [["og:title", "property"], ["twitter:title", "name"]]) assert.ok([TITLE, `${TITLE} | ByteVerse`].includes(meta(root, key, attribute)));
  assert.equal(meta(root, "og:description", "property"), description); assert.equal(meta(root, "twitter:description"), description);
  assert.equal(meta(root, "og:url", "property"), CANONICAL); assert.equal(meta(root, "twitter:card"), "summary_large_image");
  for (const [key, attribute] of [["og:image", "property"], ["twitter:image", "name"]]) {
    const image = new URL(meta(root, key, attribute)); assert.equal(image.origin, PRODUCTION); assert.equal(image.pathname, IMAGE_PATH);
    assert.equal(image.username + image.password + image.hash, "");
  }
  assert.equal(meta(root, "og:image:width", "property"), "1200"); assert.equal(meta(root, "og:image:height", "property"), "630");
  assert.ok(meta(root, "og:image:alt", "property").trim());
  assert.equal(meta(root, "twitter:image:alt"), meta(root, "og:image:alt", "property"));
  const data = nodes(root, (node) => node.name === "script" && node.attribs.type === "application/ld+json").flatMap((node) => schemaObjects(JSON.parse(nodeText(node))));
  const apps = data.filter((entry) => entry["@type"] === "WebApplication"); assert.equal(apps.length, 1);
  assert.equal(apps[0].url, CANONICAL); assert.equal(apps[0].description, description); assert.equal(apps[0].applicationCategory, "DeveloperApplication");
  assert.equal(apps[0].isAccessibleForFree, true); assert.deepEqual(apps[0].offers, { "@type": "Offer", price: "0", priceCurrency: "USD" });
  assert.doesNotMatch(JSON.stringify(data), /aggregateRating|ratingValue|ratingCount|reviewCount/);
  const faqs = data.filter((entry) => entry["@type"] === "FAQPage"); assert.equal(faqs.length, 1); assert.equal(faqs[0].mainEntity.length, 5);
  const questions = faqs[0].mainEntity; assert.equal(new Set(questions.map((question) => question.name)).size, 5);
  const faqSection = one(root, (node) => node.name === "section" && node.attribs.id === "jts-faq", "SSR FAQ section");
  const faqDetails = nodes(faqSection, (node) => node.name === "details");
  assert.equal(faqDetails.length, 5);
  for (const question of questions) {
    assert.equal(question["@type"], "Question"); assert.equal(question.acceptedAnswer["@type"], "Answer");
    const answer = question.acceptedAnswer.text; assert.ok(question.name.trim() && answer.trim());
    const heading = one(faqSection, (node) => node.name === "summary" && collapse(nodeText(node)) === collapse(question.name), "SSR FAQ summary matching schema");
    one(heading.parent, (node) => node.name === "p" && collapse(nodeText(node)) === collapse(answer), "SSR FAQ answer matching schema");
    const summary = h.page.locator("#jts-faq summary").filter({ hasText: question.name });
    await expect(summary).toHaveText(question.name);
    await summary.click(); // Native disclosure also works with JavaScript disabled.
    await expect(h.page.getByText(answer, { exact: true })).toBeVisible();
  }
  assert.deepEqual(faqDetails.map((detail) => collapse(nodeText(one(detail, (node) => node.name === "summary", "FAQ summary")))), questions.map((question) => collapse(question.name)));
  assert.deepEqual(faqDetails.map((detail) => collapse(nodeText(one(detail, (node) => node.name === "p", "FAQ answer")))), questions.map((question) => collapse(question.acceptedAnswer.text)));
  const response = await h.http(IMAGE_PATH); assert.match(response.headers()["content-type"], /^image\/png(?:;|$)/);
  const png = await response.body(); assert.ok(png.length >= 33 && png.length <= 8 * 1024 * 1024);
  assert.ok(png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])));
  assert.equal(png.toString("ascii", 12, 16), "IHDR"); assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [1200, 630]);
  const path = join(artifactDirectory, "social-1200x630.png"); await writeFile(path, png, { flag: "wx" }); h.socialImage = { path, sha256: hash(png) };
}, { js: false });

scenario("initial / empty, whitespace, disabled exports and accessible native controls", async (h) => {
  await sameValue(h.input, ""); assert.deepEqual(await settings(h), DEFAULTS); await noResult(h);
  for (const id of ["generate", "clear"]) await expect(h.id(id)).toBeDisabled();
  await expect(h.id("import")).toBeEnabled(); await expect(h.id("file")).toHaveAttribute("accept", ".json,.jsonl,.ndjson,.txt");
  // The native file input is intentionally hidden; the visible button is the
  // accessible entry point. Hidden controls have no computed accessible name.
  await expect(h.id("file")).toHaveAttribute("aria-label", "Import JSON or JSON Lines file");
  await expect(h.id("import")).toHaveAccessibleName("Import file");
  await expect(h.input).toHaveAccessibleName("Your JSON"); await expect(h.input).toHaveAttribute("aria-keyshortcuts", "Control+Enter Meta+Enter");
  await expect(h.id("example").locator("option")).toHaveText(SAMPLES.map((sample) => sample.label));
  await expect(h.workspace).toHaveAttribute("translate", "no"); await expect(h.workspace).toHaveAttribute("dir", "ltr");
  await expect(h.workspace.locator("form, input[type=url]")).toHaveCount(0);
  await h.setInput(" \n\t "); await expect(h.id("generate")).toBeDisabled(); await h.input.press("Control+Enter");
  assert.equal((await h.probe()).workers.length, 0); await noResult(h);
});

for (const sample of SAMPLES) scenario(`sample / ${sample.id}, real module Worker and complete declarations`, async (h) => {
  await loadSample(h, sample.id);
  const checks = sample.id === "record-array" ? 'type Check = __JtsExpect<__JtsEqual<DemoAccount["id"], number | string>>;'
    : sample.id === "jsonl-events" ? 'type Check = __JtsExpect<__JtsEqual<DemoEvent["id"], number | string>>;'
      : sample.id === "nested-api" ? 'type Check = __JtsExpect<__JtsEqual<ObservatoryResponse["nextCursor"], null>>;' : "";
  const code = await generate(h, checks, sample.id === "nested-api");
  assert.equal(definitions(code).length, sample.declarations);
  await expect(h.workspace.getByTestId("json-ts-property-count")).toHaveText(String(sample.properties));
  await expect(h.workspace.getByTestId("json-ts-selected-count")).toHaveText(String(sample.selected));
  assert.match(code, new RegExp(`^export interface ${sample.root} \\{`));
  assert.doesNotMatch(code, /demo-request-42|finch@example\.invalid|Fictional account|Paper comet|not HTML/);
  await expect(h.workspace.locator('[data-notice-code="sample-based"]')).toBeVisible();
  if (sample.id === "jsonl-events") {
    assert.equal(h.source.trim().split("\n").length, 3); assert.doesNotMatch(code, /type DemoEvent = .*\[\]/);
    await expect(h.workspace.locator('[data-notice-code="merged-objects"]')).toContainText("not tagged-union inference");
  }
});

scenario("fields / optional versus null, mixed IDs, nested presence and all-optional counts", async (h) => {
  await loadSample(h, "record-array"); await generate(h, `
type Email = __JtsExpect<__JtsEqual<DemoAccount["email"], string | null | undefined>>;
type Optional = __JtsExpect<__JtsEqual<__JtsOptional<DemoAccount>, "email" | "active">>;
// @ts-expect-error Required ID cannot be missing.
const missing: DemoAccount = { name: "demo", profile: {} };
`);
  const expected = [['"id"', "number | string", "Required", "3 of 3 objects"], ['"name"', "string", "Required", "3 of 3 objects"],
    ['"email"', "string | null", "Optional", "2 of 3 objects"], ['"profile"', "DemoAccountProfile", "Required", "3 of 3 objects"],
    ['"active"', "boolean", "Optional", "2 of 3 objects"]];
  assert.deepEqual(await rows(h, "DemoAccount"), expected);
  assert.deepEqual(await rows(h, "DemoAccountProfile"), [['"bio"', "string | null", "Optional", "2 of 3 objects"], ['"timezone"', "string", "Optional", "1 of 3 objects"]]);
  await h.option("optionalProperties", "all"); await noResult(h); await generate(h, 'const empty: DemoAccount = {};');
  assert.deepEqual(await rows(h, "DemoAccount"), expected.map((row) => row.map((cell, index) => index === 2 ? "Optional" : cell)));
  await expect(h.workspace.getByTestId("json-ts-optional-count")).toHaveText("4");
  await expect(h.workspace.getByTestId("json-ts-optional-count").locator("..")).toContainText("7 optional in this output");
});

scenario("pointer / RFC6901 escapes, empty key, indexed selection, array-items and value", async (h) => {
  await h.setInput('{"":true,"a/b":{"~rows":[{"id":1},{"id":"two","extra":null}]}}');
  await h.option("pointer", "/a~1b/~0rows");
  let code = await generate(h, 'type Check = __JtsExpect<__JtsEqual<Root[number]["id"], number | string>>;');
  assert.match(code, /^export type Root = RootItem\[\];/);
  await h.option("rootMode", "array-items"); code = await generate(h, 'type Check = __JtsExpect<__JtsEqual<Root["extra"], null | undefined>>;');
  assert.match(code, /^export interface Root \{/); await expect(h.workspace.getByTestId("json-ts-selected-count")).toHaveText("2");
  await h.option("rootMode", "value"); await h.option("pointer", "/a~1b/~0rows/0/id");
  equalText(await generate(h), "export type Root = number;\n");
  await h.option("pointer", "/"); equalText(await generate(h), "export type Root = boolean;\n");
  await h.option("pointer", ""); assert.match(await generate(h), /"": boolean;/);
});

scenario("pointer errors / strict escapes and resolution in EVERY JSONL sample", async (h) => {
  await h.setInput('{"rows":[{"id":1}]}\n{"rows":[{"id":2}]}\n', "jsonl");
  for (const pointer of ["rows", "/rows/~2", "/rows/~"]) {
    await h.option("pointer", pointer); await generateError(h, /Invalid JSON Pointer/);
  }
  for (const pointer of ["/missing", "/rows/01", "/rows/-", "/rows/2", "/toString"]) {
    await h.option("pointer", pointer); await generateError(h, /does not resolve in every sample/);
  }
  await h.option("pointer", "/rows"); await h.setInput('{"rows":[1]}\n{"other":2}\n', "jsonl");
  await generateError(h, /does not resolve in every sample.*line 2/);
  await h.option("pointer", ""); await h.option("rootMode", "array-items"); await generateError(h, /requires an array in every selected sample/);
});

scenario("style / interface, recursive type aliases and readonly arrays/properties", async (h) => {
  await h.setInput('{"rows":[{"flags":[[true]],"meta":{}}]}');
  const original = await generate(h); assert.ok(definitions(original).every(ts.isInterfaceDeclaration));
  await h.option("declarationStyle", "type"); await h.option("readonly", true);
  const code = await generate(h, `
declare const root: Root;
type Flags = __JtsExpect<__JtsEqual<Root["rows"][number]["flags"], ReadonlyArray<ReadonlyArray<boolean>>>>;
// @ts-expect-error Root properties are readonly.
root.rows = [];
// @ts-expect-error Nested arrays are readonly.
root.rows[0].flags[0].push(true);
// @ts-expect-error Empty object index signatures are readonly.
root.rows[0].meta["new"] = 1;
`);
  assert.ok(definitions(code).every(ts.isTypeAliasDeclaration)); assert.match(code, /readonly \[key: string\]: unknown;/);
  assert.ok(definitions(code).flatMap((node) => properties(code, node.name.text)).every((property) => property.readonly));
  await expect(h.workspace.locator('[data-notice-code="readonly-types"]')).toBeVisible();
});

scenario("literals / explicit opt-in, 20-value and 120-character bounds widen safely", async (h) => {
  await h.setInput('[{"state":"BV_JTS_OPEN"},{"state":"BV_JTS_CLOSED"}]'); await h.option("rootMode", "array-items");
  assert.doesNotMatch(await generate(h), /BV_JTS_/); await h.option("stringLiterals", true);
  await expect(h.id("literal-caution")).toContainText("Source string values will appear");
  assert.match(await generate(h, 'type Check = __JtsExpect<__JtsEqual<Root["state"], "BV_JTS_OPEN" | "BV_JTS_CLOSED">>;'), /"BV_JTS_OPEN" \| "BV_JTS_CLOSED"/);
  for (const [values, widened] of [[Array.from({ length: 20 }, (_, index) => `state-${index}`), false],
    [Array.from({ length: 21 }, (_, index) => `state-${index}`), true], [["x".repeat(120)], false], [["x".repeat(121)], true]]) {
    await h.setInput(JSON.stringify(values)); const code = await generate(h);
    if (widened) { equalText(code, "export type Root = string;\n"); await expect(h.workspace.locator('[data-notice-code="literal-widened"]')).toBeVisible(); }
    else { assert.doesNotMatch(code, / = string;/); await expect(h.workspace.locator('[data-notice-code="literal-widened"]')).toHaveCount(0); }
  }
});

scenario("formatting / first-observed order, sort, all indent modes and exports-off guard", async (h) => {
  await h.setInput('{"z":1,"a":true,"middle":"demo"}');
  assert.deepEqual(properties(await generate(h), "Root").map((property) => property.key), ["z", "a", "middle"]);
  await h.option("sortProperties", true); await h.option("exportDeclarations", false);
  for (const [indent, prefix] of [["2", "  "], ["4", "    "], ["tab", "\t"]]) {
    await h.option("indent", indent); const code = await generate(h);
    equalText(code, `export {};\n\ninterface Root {\n${prefix}a: boolean;\n${prefix}middle: string;\n${prefix}z: number;\n}\n`);
    await expect(h.workspace.locator('[data-notice-code="module-guard"]')).toBeVisible();
  }
});

scenario("strict input / malformed JSON, comments, duplicate decoded keys and JSONL blanks", async (h) => {
  for (const [text, format, pattern] of [['{\n "bad":\n}', "json", /line 3, column 1/], ['{"a":1,}', "json", /strict JSON/],
    ['/* comment */{}', "json", /comments/], ['{"a":1,"a":1}', "json", /Duplicate decoded object keys/],
    ['{"a":1,"\\u0061":2}', "json", /Duplicate decoded object keys/], ['{}\n\n{}', "jsonl", /Blank JSON Lines.*line 2/],
    ['{}\n \t\n', "jsonl", /Blank JSON Lines.*line 2/], ['{}\n\n', "jsonl", /Blank JSON Lines/],
    ['{}\n{"bad":}\n', "jsonl", /strict JSON.*line 2/], ['\ufeff{}\n', "jsonl", /BOM is not allowed/]]) {
    await h.setInput(text, format); await generateError(h, pattern);
  }
  await h.setInput('{"id":1}\n{"id":2}\n', "jsonl"); await generate(h);
  await expect(h.workspace.getByTestId("json-ts-selected-count")).toHaveText("2");
});

scenario("roots / empty objects/arrays, scalar aliases, null and mixed unions", async (h) => {
  for (const [input, expected, note] of [["{}", "export interface Root {\n  [key: string]: unknown;\n}\n", "empty-object"],
    ["[]", "export type Root = unknown[];\n", "empty-array"], ["null", "export type Root = null;\n", "null-only"],
    ['"2026-10-05"', "export type Root = string;\n", "alias-fallback"], ["true", "export type Root = boolean;\n", "alias-fallback"],
    ["9123372036854000123", "export type Root = number;\n", "alias-fallback"], ["1e999", "export type Root = number;\n", "alias-fallback"]]) {
    await h.setInput(input); equalText(await generate(h), expected); await expect(h.workspace.locator(`[data-notice-code="${note}"]`)).toBeVisible();
  }
  await h.setInput('[1,"x",false,null,{"id":1},{"id":"two"}]'); await h.option("rootMode", "array-items");
  await generate(h, 'type Check = __JtsExpect<__JtsEqual<Root, number | string | boolean | RootObject | null>>;');
  assert.deepEqual(await rows(h, "RootObject"), [['"id"', "number | string", "Required", "2 of 2 objects"]]);
  await h.setInput("[]"); await generateError(h, /No array items were found/);
});

scenario("names / invalid ASCII identifiers, reserved names, exact case and collision-free children", async (h) => {
  await h.setInput('{"a-b":{"v":1},"a b":{"v":true},"A-B":{"v":"demo"}}');
  for (const name of ["", "1Root", "has space", "x-y", "\u6839", "interface", "Array", "Record", "constructor", "x".repeat(65)]) {
    await h.option("rootName", name); await expect(h.id("root-name")).toHaveAttribute("aria-invalid", "true");
    await expect(h.id("root-name-error")).toBeVisible(); await expect(h.id("generate")).toBeDisabled();
    await h.input.press("Control+Enter"); assert.equal((await h.probe()).workers.length, 0); await noResult(h);
  }
  await h.option("rootName", "mixedCase"); const code = await generate(h);
  assert.deepEqual(definitions(code).map((node) => node.name.text), ["mixedCase", "mixedCaseAB", "mixedCaseAB2", "mixedCaseAB3"]);
  await h.option("rootName", "R".repeat(64)); assert.equal(definitions(await generate(h))[0].name.text.length, 64);
});

scenario("Unicode / prototype keys, controls and markup remain inert lossless TypeScript text", async (h) => {
  const marker = "BV_JTS_MARKUP_CANARY", markup = `<script>window.${marker}=true</script><img src="https://example.invalid/${marker}">`;
  const pairs = [["__proto__", { polluted: true }], ["constructor", 1], ["toString", null], ["", true], ["a/b", markup],
    ['quote"key', "Café العربية 漢字 😀 e\u0301"], ["line\nkey", "\ud800"], ["\u202ekey", "<>&"]];
  await h.setInput(JSON.stringify(Object.fromEntries(pairs))); await h.option("stringLiterals", true);
  const code = await generate(h); assert.deepEqual(properties(code, "Root").map((property) => property.key), pairs.map(([key]) => key));
  assert.doesNotMatch(code, /<script>|<img|\u202e|[\ud800-\udfff]/); assert.match(code, /\\ud800/); assert.match(code, /\\u003c/);
  const tree = codeTree(code), root = tree.statements.find((node) => node.name?.text === "Root");
  assert.equal(root.members.find((member) => member.name?.text === "a/b").type.literal.text, markup);
  assert.equal(await h.page.evaluate(() => Object.prototype.polluted), undefined);
  assert.equal(await h.page.evaluate((marker) => Object.hasOwn(window, marker), marker), false);
  await rows(h, "Root"); await expect(h.result.locator("script, img, iframe, a")).toHaveCount(0);
  const tableText = await h.workspace.locator(".jts-field-table").innerText(); assert.ok(!tableText.includes("\u202e")); assert.match(tableText, /\\u202e/);
});

scenario("paste limits / UTF-16 and UTF-8 oversize edits preserve the entire prior result", async (h) => {
  const prior = await baseline(h), before = (await h.probe()).workers.length;
  for (const [text, pattern] of [[`"${"x".repeat(LIMITS.chars)}"`, /1,000,000 UTF-16 characters/], [`"${"漢".repeat(699_051)}"`, /2 MiB of UTF-8/]]) {
    // Transporting and laying out a synthetic 2 MiB paste can exceed the
    // normal 12s action deadline under load. Product limits stay unchanged.
    h.track(text, "oversized-edit"); await h.input.fill(text, { timeout: 45_000 }); await errorIs(h, pattern); await kept(h, prior);
  }
  assert.equal((await h.probe()).workers.length, before);
});

scenario("file formats / native chooser for JSON, JSONL, NDJSON and TXT-selected format", async (h) => {
  for (const [name, selected, expected, text] of [["example.JSON", "jsonl", "json", '\ufeff{"id":1,"name":"Café 😀"}\r\n'],
    ["example.jsonl", "json", "jsonl", '{"id":1}\r\n{"id":"two"}\n'], ["example.ndjson", "json", "jsonl", '{"id":1}\n{"id":"two"}\n'],
    ["example.txt", "jsonl", "jsonl", '{"id":1}\n{"id":"two"}\n'], ["single.txt", "json", "json", '{"id":1}']]) {
    await h.select("format", selected); const before = (await h.probe()).workers.length; await upload(h, name, text);
    // Changed format or existing work both legitimately require review.
    await expect.poll(async () => (await h.confirmation.count()) > 0 || (await h.id("imported-file").count()) > 0, { timeout: 20_000 }).toBe(true);
    if (await h.confirmation.count()) await h.click("confirm-replace");
    h.source = text; await sameValue(h.input, normalize(text)); await expect(h.id("format")).toHaveValue(expected); await noResult(h);
    await expect(h.id("imported-file")).toContainText(name); await expect(h.id("status")).toContainText("File checked and imported locally");
    assert.equal((await h.probe()).workers.length, before + 1); assert.equal((await h.probe()).workers.at(-1).posted[0].kind, "inspect");
    const code = await generate(h); assert.match(code, expected === "jsonl" ? /id: number \| string;/ : /id: number;/);
    if (name.endsWith("JSON")) await expect(h.workspace.locator('[data-notice-code="bom-ignored"]')).toBeVisible();
    await h.click("clear"); await h.click("confirm-replace"); h.source = "";
  }
  assert.equal(h.chooserEvents, 5);
});

scenario("file rejection / extension, UTF-8, bytes, chars, syntax and blanks preserve work", async (h) => {
  const prior = await baseline(h);
  for (const [name, contents, pattern, reads, workers] of [["unsupported.csv", "demo", /Choose a UTF-8 JSON/, 0, 0],
    ["invalid.json", Buffer.from([0xc3, 0x28]), /could not be read as UTF-8/, 1, 0],
    ["large.json", Buffer.alloc(LIMITS.bytes + 1, 97), /exceeds the 2 MiB limit/, 0, 0],
    ["characters.json", `"${"x".repeat(LIMITS.chars)}"`, /1,000,000 UTF-16 characters/, 1, 0],
    ["syntax.json", '{"bad":}', /strict JSON/, 1, 1], ["duplicate.json", '{"a":1,"\\u0061":2}', /Duplicate decoded/, 1, 1],
    ["empty.txt", " \r\n", /selected file is empty/, 1, 0], ["blank.jsonl", '{}\n\n{}', /Blank JSON Lines/, 1, 1],
    ["bom.ndjson", '\ufeff{}\n', /BOM is not allowed/, 1, 1]]) {
    const before = await h.probe(); await upload(h, name, contents); await errorIs(h, pattern); await kept(h, prior);
    await expect(h.confirmation).toHaveCount(0); await expect(h.id("cancel-operation")).toHaveCount(0);
    const after = await h.probe(); assert.equal(after.reads.length - before.reads.length, reads); assert.equal(after.workers.length - before.workers.length, workers);
  }
});

scenario("sample confirmation / cancel keeps work, accept resets settings without auto-generation", async (h) => {
  const prior = await baseline(h); await h.select("example", "record-array"); await h.click("load-example");
  await expect(h.confirmation).toBeFocused(); await kept(h, prior, true);
  await h.click("keep-current"); await kept(h, prior); await expect(h.input).toBeFocused();
  await h.click("load-example"); await h.click("confirm-replace"); h.source = await h.input.inputValue(); h.track(h.source, "sample");
  await noResult(h); assert.deepEqual(await settings(h), { ...DEFAULTS, rootName: "DemoAccount", rootMode: "array-items" });
  const before = (await h.probe()).workers.length; assert.equal(before, 1); await generate(h);
});

scenario("clear confirmation / cancel preserves result; accept resets options, format and pagination", async (h) => {
  await baseline(h); await h.select("format", "jsonl"); await generate(h); await h.select("download-extension", "d.ts");
  await rows(h, "KeptRecord"); await h.select("field-page-size", "50"); const prior = await snapshotWork(h);
  await h.click("clear"); await kept(h, prior, true); await h.click("keep-current"); await kept(h, prior);
  await h.click("clear"); await h.click("confirm-replace"); h.source = "";
  await sameValue(h.input, ""); await noResult(h); assert.deepEqual(await settings(h), DEFAULTS);
  await expect(h.id("format")).toHaveValue("json"); await expect(h.id("download-extension")).toHaveValue("ts");
  await expect(h.id("status")).toContainText("Clipboard contents and downloaded files are unchanged");
  await h.setInput('{"a":1}'); await generate(h); await rows(h, "Root"); await expect(h.id("field-page-size")).toHaveValue("25");
});

scenario("file confirmation / inspected candidate is held; accept retains settings but resets selection", async (h) => {
  await h.setInput('{"data":[{"old":1}]}'); await h.option("pointer", "/data"); await h.option("rootMode", "array-items");
  await h.option("rootName", "ImportedRecord"); await h.option("readonly", true); await h.option("indent", "4"); await generate(h);
  const prior = await snapshotWork(h), text = '{"new":"BV_JTS_FILE_REPLACEMENT","child":{"ok":true}}';
  await upload(h, "replacement.json", text); await expect(h.confirmation).toBeVisible(); await kept(h, prior, true);
  await h.click("keep-current"); await kept(h, prior);
  await upload(h, "replacement.json", text); await expect(h.confirmation).toBeVisible(); await h.click("confirm-replace");
  h.source = text; await sameValue(h.input, text); await noResult(h);
  assert.deepEqual(await settings(h), { ...prior.options, pointer: "", rootMode: "value" });
  const code = await generate(h); assert.match(code, /readonly new: string;/); assert.doesNotMatch(code, /old:/);
});

scenario("invalidation / every input, format and inference option disables stale exports", async (h) => {
  await h.setInput('{"records":[{"id":1,"name":"BV_JTS_INVALIDATION"}]}'); await generate(h);
  const changes = [["rootName", "UpdatedRoot"], ["declarationStyle", "type"], ["optionalProperties", "all"], ["readonly", true],
    ["stringLiterals", true], ["sortProperties", true], ["indent", "tab"], ["exportDeclarations", false], ["pointer", "/records"], ["rootMode", "array-items"]];
  for (const [key, value] of changes) {
    const before = (await h.probe()).workers.length; await h.option(key, value); await noResult(h);
    assert.equal((await h.probe()).workers.length, before, "Changing settings does not silently generate"); await generate(h);
  }
  await h.select("format", "jsonl"); await noResult(h); await generate(h);
  await h.setInput('{"records":[{"id":2,"name":"BV_JTS_NEW_INPUT"}]}', "jsonl"); await generate(h);
  await h.click("clear"); await h.input.fill('{"records":[{"id":3}]}'); h.source = await h.input.inputValue();
  await expect(h.confirmation).toHaveCount(0); await noResult(h); await generate(h);
});

scenario("exports / native .ts AND .d.ts and captured copy are full despite one-declaration preview", async (h) => {
  await h.setInput('{"rows":[{"id":1,"meta":{"active":true}}],"tail":"BV_JTS_EXPORT_TAIL"}');
  await h.option("rootName", "CON"); await h.option("exportDeclarations", false); const code = await generate(h);
  await h.select("code-declaration", "1"); const partial = await h.output.inputValue(); assert.ok(partial.length < code.length);
  await expect(h.id("preview-description")).toContainText("Partial preview: one declaration only"); assert.ok(!partial.includes("export {};"));
  await h.click("copy"); await expect(h.id("copy-status")).toContainText("All declarations copied");
  equalText(await h.page.evaluate(() => window.__jtsBrowserProbe.copies[0]), code, "Captured clipboard receives full code");
  for (const extension of ["ts", "d.ts"]) {
    await nativeDownload(h, extension, code, `CON-types.${extension}`); await sameValue(h.output, partial);
    await expect(h.id("code-declaration")).toHaveValue("1");
  }
  assert.equal(h.downloadEvents, 2);
});

scenario("clipboard rejection / full manual fallback replaces a selected partial preview or field view", async (h) => {
  await baseline(h); const code = await fullCode(h); await h.control({ clipboardMode: "reject" });
  for (const view of ["partial", "fields"]) {
    if (view === "partial") await h.select("code-declaration", "1"); else await rows(h, "KeptRecord");
    await h.click("copy"); await expect(h.id("copy-status")).toContainText("Copy the full code manually");
    await expect(h.id("code-declaration")).toHaveValue("-1"); await sameValue(h.output, code); await expect(h.output).toBeFocused();
    await expect.poll(() => h.output.evaluate((element) => [element.selectionStart, element.selectionEnd])).toEqual([0, code.length]);
    await expect(h.id("download")).toBeEnabled();
  }
});

scenario("clipboard delay / single flight blocks generation and warns on stale success AND rejection", async (h) => {
  await h.setInput('{"old":"BV_JTS_CLIPBOARD_OLD"}'); const old = await generate(h); await h.control({ clipboardMode: "hold" });
  await h.click("copy"); await expect.poll(async () => (await h.probe()).clipboardPending).toBe(1);
  for (const id of ["copy", "download", "generate"]) await expect(h.id(id)).toBeDisabled();
  await h.setInput('{"new":"BV_JTS_CLIPBOARD_NEW"}'); await h.input.press("Control+Enter");
  assert.equal((await h.probe()).workers.length, 1); await h.call("releaseClipboard", false);
  await expect(h.id("copy-status")).toContainText("An earlier result was copied");
  equalText(await h.page.evaluate(() => window.__jtsBrowserProbe.copies[0]), old); await generate(h);
  await h.click("copy"); await expect.poll(async () => (await h.probe()).clipboardPending).toBe(1);
  await h.option("readonly", true); await h.input.focus(); await h.call("releaseClipboard", true);
  await expect(h.id("copy-status")).toContainText("earlier clipboard attempt failed"); await noResult(h);
  await expect(h.input).toBeFocused(); await h.control({ clipboardMode: "capture" }); await generate(h);
  assert.equal((await h.probe()).copyLengths.length, 2);
});

scenario("file read cancellation / held native arrayBuffer and an edit cannot replace newer work", async (h) => {
  const prior = await baseline(h); await h.control({ holdReads: true });
  await upload(h, "delayed.json", '{"late":"BV_JTS_LATE_FILE"}'); await expect(h.id("cancel-operation")).toBeVisible();
  await kept(h, prior, true); await h.click("cancel-operation"); await h.call("releaseReads");
  await expect.poll(async () => (await h.probe()).reads.every((read) => !read.pending)).toBe(true); await kept(h, prior);
  const before = (await h.probe()).workers.length;
  await upload(h, "edited.json", '{"stale":"BV_JTS_STALE_FILE"}');
  await expect.poll(async () => (await h.probe()).reads.some((read) => read.pending)).toBe(true);
  await h.setInput('{"current":"BV_JTS_CURRENT_FILE"}'); await h.call("releaseReads");
  await expect.poll(async () => (await h.probe()).reads.every((read) => !read.pending)).toBe(true);
  await expect(h.confirmation).toHaveCount(0); assert.equal((await h.probe()).workers.length, before); await noResult(h); await generate(h);
});

scenario("worker faults / constructor, native error, messageerror and unexpected matching response", async (h) => {
  await h.setInput('{"safe":"BV_JTS_WORKER_FAULT"}'); await h.control({ nextWorkerFault: "constructor" });
  await generateError(h, /local worker support is required/); assert.equal((await h.probe()).constructorFailures, 1);
  for (const fault of ["error", "messageerror", "response"]) {
    const index = await heldGeneration(h), request = (await h.probe()).workers[index].posted[0];
    if (fault === "response") {
      await h.call("inject", index, "message", { id: request.id + 999, kind: "error", error: "SYNTHETIC_WRONG_ID" });
      await expect(h.id("error")).toHaveCount(0); await expect(h.id("cancel-operation")).toBeVisible();
      await h.call("inject", index, "message", { id: request.id, kind: "inspect", inspection: { format: "json", sampleCount: 1 } });
    } else await h.call("inject", index, fault);
    await errorIs(h, fault === "response" ? /unexpected response/ : /local worker could not complete/); await noResult(h);
    await h.call("releaseMessages"); await noResult(h); await settledWorkers(h);
  }
  await generate(h); assert.equal((await h.probe()).preventedErrors, 1);
});

scenario("worker cancellation / discard late output and prevent old callbacks stopping a newer worker", async (h) => {
  await h.setInput('{"old":"BV_JTS_CANCEL_OLD"}'); const old = await heldGeneration(h);
  await h.click("cancel-operation"); await expect(h.id("status")).toContainText("Generation cancelled"); await noResult(h);
  await h.setInput('{"current":"BV_JTS_CANCEL_CURRENT"}'); const current = await heldGeneration(h);
  await h.call("inject", old, "error"); await h.call("releaseMessages", old);
  await expect(h.id("cancel-operation")).toBeVisible(); await expect(h.id("error")).toHaveCount(0);
  assert.equal((await h.probe()).workers[current].terminated, 0); await noResult(h);
  await h.call("releaseMessages"); const code = await takeResult(h, current); assert.match(code, /current: string;/); assert.doesNotMatch(code, /old:/);
  await h.call("inject", old, "error"); await sameValue(h.output, code); await expect(h.id("error")).toHaveCount(0);
});

scenario("worker deadline / explicit 14999+1ms callback injection for generation AND import", async (h) => {
  await h.setInput('{"safe":"BV_JTS_DEADLINE"}'); await h.control({ captureDeadline: true });
  await heldGeneration(h); assert.equal((await h.probe()).timers.at(-1).delay, LIMITS.deadline);
  await h.call("advanceTimers", LIMITS.deadline - 1); await expect(h.id("cancel-operation")).toBeVisible(); await expect(h.id("error")).toHaveCount(0);
  await h.call("advanceTimers", 1); await errorIs(h, /15-second processing limit/); await noResult(h);
  await h.call("releaseMessages"); await noResult(h); await generate(h); const prior = await snapshotWork(h);
  await h.control({ holdMessages: true }); const held = (await h.probe()).heldMessages;
  await upload(h, "timeout.json", '{"replacement":"BV_JTS_TIMEOUT_IMPORT"}');
  await expect.poll(async () => (await h.probe()).heldMessages).toBe(held + 1); await kept(h, prior, true);
  await h.call("advanceTimers", LIMITS.deadline); await errorIs(h, /15-second processing limit/); await kept(h, prior);
  await h.call("releaseMessages"); await expect(h.confirmation).toHaveCount(0); await kept(h, prior);
  assert.equal((await h.probe()).timers.filter((timer) => timer.delay === LIMITS.deadline && timer.fired).length, 2);
  await h.control({ captureDeadline: false });
});

scenario("pagination / 63 fields, 25/50-page sizes, declaration reset and unchanged full code", async (h) => {
  const input = Object.fromEntries([...Array.from({ length: 62 }, (_, index) => [`field${String(index).padStart(2, "0")}`, index]), ["nested", { one: true, two: false }]]);
  await h.setInput(JSON.stringify(input)); const code = await generate(h); await rows(h, "Root");
  const body = h.workspace.locator(".jts-field-table tbody tr"), pager = h.workspace.locator(".jts-pagination");
  await expect(body).toHaveCount(25); await expect(pager).toContainText("Fields 1–25 of 63"); await expect(h.id("fields-previous")).toBeDisabled();
  await h.click("fields-next"); await expect(body).toHaveCount(25); await expect(pager).toContainText("Fields 26–50 of 63");
  await h.click("fields-next"); await expect(body).toHaveCount(13); await expect(h.id("fields-next")).toBeDisabled();
  await h.select("field-page-size", "50"); await expect(body).toHaveCount(50); await expect(pager).toContainText("Fields 1–50 of 63");
  await h.click("fields-next"); await expect(body).toHaveCount(13); await h.click("fields-previous"); await expect(body).toHaveCount(50);
  await rows(h, "RootNested"); await expect(body).toHaveCount(2); await expect(h.id("fields-previous")).toBeDisabled();
  await rows(h, "Root"); await expect(pager).toContainText("Fields 1–50 of 63"); equalText(await fullCode(h), code);
  await h.setInput("42"); await generate(h); await rows(h, "Root"); await expect(h.workspace.locator(".jts-no-fields")).toBeVisible();
});

scenario("privacy / memory-only reload, inert URL data, no input-bearing network or persistent payload", async (h) => {
  const marker = "BV_JTS_STORAGE_CANARY"; h.track(marker, "canary"); await theme(h, "dark");
  const storage = () => h.page.evaluate(async (marker) => {
    const read = (store) => Array.from({ length: store.length }, (_, index) => { const key = store.key(index); return [key, store.getItem(key)]; });
    const local = read(localStorage), session = read(sessionStorage), cookies = document.cookie;
    return { localKeys: local.map(([key]) => key), sessionKeys: session.map(([key]) => key),
      containsInput: [marker, "BV_JTS_STORAGE_TYPE"].some((value) => JSON.stringify([local, session, cookies]).includes(value)), theme: localStorage.getItem("theme"),
      databases: (await indexedDB.databases()).map((entry) => entry.name).sort(), caches: (await caches.keys()).sort() };
  }, marker);
  const before = await storage();
  await h.setInput(JSON.stringify({ marker, url: `https://example.invalid/${marker}`, nested: { ok: true } }));
  await h.option("rootName", "BV_JTS_STORAGE_TYPE"); await h.option("stringLiterals", true); await generate(h); await rows(h, "BV_JTS_STORAGE_TYPE");
  await expect(h.workspace.getByRole("button", { name: /Fetch URL|Import URL|Ask AI/i })).toHaveCount(0);
  const after = await storage(); assert.equal(after.containsInput, false); assert.equal(after.theme, "dark");
  assert.deepEqual(after.databases, before.databases); assert.deepEqual(after.caches, before.caches); h.storage = { before, after };
  await settledWorkers(h); h.archives.push(await h.probe()); h.generation++; h.phase = "reload";
  const response = await h.page.reload({ waitUntil: "load" }); assert.equal(response.status(), 200); await h.ready();
  await sameValue(h.input, ""); await noResult(h); assert.deepEqual(await settings(h), DEFAULTS); await expect(h.id("generate")).toBeDisabled();
  await expect(h.id("sample-hint")).toHaveCount(0); await expect(h.id("imported-file")).toHaveCount(0); await expect(h.page).toHaveURL(TARGET);
  await expect(h.page.locator("html")).toHaveClass(/(?:^|\s)dark(?:\s|$)/); assert.equal((await h.probe()).workers.length, 0);
});

for (const width of [320, 390, 768, 1440]) for (const color of ["light", "dark"]) scenario(`responsive / ${width}px ${color}, settings, field review and code screenshots`, async (h) => {
  await theme(h, color); await layout(h, "empty"); await h.open("nested-settings"); await h.open("more-settings");
  await h.setInput(JSON.stringify({ data: [{ id: 1, ["long-property-".repeat(12)]: "BV_JTS_LAYOUT_VALUE", nested: { value: true } }, { id: "two", nested: {} }] }));
  await h.option("pointer", "/data"); await h.option("rootMode", "array-items"); await h.option("readonly", true);
  await h.option("stringLiterals", true); await h.option("exportDeclarations", false);
  await layout(h, "open settings"); await screenshot(h, `${width}-${color}-settings`, h.id("settings-heading"));
  const code = await generate(h); await rows(h, "Root"); await layout(h, "field table and inference notes");
  await screenshot(h, `${width}-${color}-fields`, h.id("review-declaration"));
  equalText(await fullCode(h), code); await h.select("code-declaration", "1"); await layout(h, "partial code preview");
  await screenshot(h, `${width}-${color}-code`, h.id("code-declaration"));
  await h.click("clear"); await layout(h, "replacement confirmation"); await h.click("keep-current");
  await expect(h.id("download")).toBeEnabled();
}, { width });

async function verifyHealthy(h) {
  await settledWorkers(h);
  if (h.captures.length) {
    const unique = [...new Map(h.captures.map((entry) => [`${entry.extension ?? "ts"}:${hash(entry.code)}:${hash(entry.checks ?? "")}`, entry])).values()];
    const diagnostics = compileMemory(unique.map((entry) => ({ extension: entry.extension, code: entry.code + (entry.extension === "d.ts" ? "" : PROOF + (entry.checks ?? "")) })));
    h.compiler = { version: ts.version, strict: true, exactOptionalPropertyTypes: true, noEmit: true, skipLibCheck: false,
      files: unique.length, diagnosticCodes: diagnostics.map((entry) => entry.code) };
    assert.equal(diagnostics.length, 0, diagnostics.slice(0, 10).map((entry) => `${entry.file ? basename(entry.file.fileName) : "compiler"} TS${entry.code}: ${ts.flattenDiagnosticMessageText(entry.messageText, " ")}`).join("\n"));
  }
  // A browser round trip after the synchronous compiler lets queued browser
  // events arrive BEFORE the final network/error audit, not after a PASS.
  await h.referencesNow();
  if (!h.js) for (const record of h.requests.filter((entry) => entry.allowed && entry.type === "script" && entry.failure === "csp")) {
    // Edge with JS disabled may cancel a script preload as "csp". Verify ONLY
    // that precise local static script, never excuse arbitrary failed requests.
    assert.match(record.path, /^\/_next\/static\/chunks\/[\w.~%-]+\.js$/);
    const response = await h.context.request.get(ORIGIN + record.path, { maxRedirects: 0, maxRetries: 0, timeout: 15_000 });
    assert.equal(response.status(), 200); assert.match(response.headers()["content-type"], /javascript/);
    assert.ok((await response.body()).length); record.disabledScriptVerified = true;
  }
  if (h.js) {
    const probe = await h.probe(); assert.equal(probe.heldMessages, 0); assert.equal(probe.clipboardPending, 0);
    assert.ok(probe.reads.every((read) => !read.pending)); assert.equal(probe.injectedErrors, probe.preventedErrors);
    assert.ok(probe.blobs.every((blob) => blob.revoked)); assert.ok(probe.timers.every((timer) => !timer.active));
  }
  for (let offset = 0; offset < h.popupChecks.length;) { const end = h.popupChecks.length; await Promise.all(h.popupChecks.slice(offset, end)); offset = end; }
  assert.ok(h.secondaryPages.every((page) => page.allowed), "Only internal edge://downloads-hub after real downloads is exempt");
  assert.deepEqual(h.pageErrors, []); assert.deepEqual(h.guardErrors, []); assert.deepEqual(h.sockets, []);
  assert.equal(h.dialogs, 0); assert.equal(h.unexpectedDownloads, 0);
  assert.deepEqual(h.consoleAudit().filter((entry) => entry.category.endsWith(":FAIL")), [], "No hidden application, hydration or framework errors");
  assert.deepEqual(h.requests.filter((record) => classification(h, record).endsWith(":FAIL")), [], "No input-bearing/API/unexpected requests, even when blocked");
  assert.deepEqual(h.requests.filter((record) => record.allowed && !record.blob && (record.status >= 400 || (record.failure && !record.disabledScriptVerified))), [], "Approved local resources must succeed");
}
async function audit(h) {
  const probe = h.page && !h.page.isClosed() && h.probe ? await h.probe().catch(() => null) : null;
  return { inputs: h.inputs, requests: h.requests.map((record) => ({ ...record, classification: classification(h, record) })),
    console: h.consoleAudit?.(), pageErrors: h.pageErrors, guardErrors: h.guardErrors, nativeWorkers: h.nativeWorkers,
    probeGenerations: [...h.archives, ...(probe ? [probe] : [])], secondaryPages: h.secondaryPages, hints: h.hints,
    httpGets: h.httpGets, layouts: h.layouts, storage: h.storage, socialImage: h.socialImage, compiler: h.compiler,
    generated: h.captures.map((entry) => ({ chars: entry.code.length, sha256: hash(entry.code), extension: entry.extension ?? "ts", proof: !!entry.checks })),
    chooserEvents: h.chooserEvents, downloadEvents: h.downloadEvents, unexpectedDownloads: h.unexpectedDownloads, dialogs: h.dialogs, sockets: h.sockets };
}
async function firstFailure(h, result) {
  if (!h?.page || h.page.isClosed()) return;
  try {
    result.dom = await h.page.evaluate(() => ({ url: location.href, title: document.title, active: document.activeElement?.id,
      inputChars: document.querySelector("#jts-input")?.value.length, outputChars: document.querySelector("#jts-output")?.value.length,
      alert: document.querySelector("#jts-error")?.textContent.slice(0, 650), status: document.querySelector("#jts-status")?.textContent,
      copyStatus: document.querySelector("#jts-copy-status")?.textContent,
      controls: [...document.querySelectorAll("#json-ts-workspace button, #json-ts-workspace select")].map((element) => ({ id: element.id, disabled: element.disabled, value: element.value })) }));
    const path = join(artifactDirectory, `${h.entry.number}-FIRST-FAILURE.png`);
    await h.page.screenshot({ path, fullPage: false, caret: "hide", timeout: 5_000 });
    screenshots.push({ case: h.entry.number, suffix: "FIRST-FAILURE", path });
  } catch (error) { result.diagnosticError = safeError(error); }
}
async function main() {
  const args = process.argv.slice(2), filters = [];
  for (let index = 0; index < args.length; index += 2) {
    assert.ok(args[index] === "--case" && args[index + 1]?.trim(), 'Use no arguments or --case NUMBER/NAME (repeatable); no URL/env overrides');
    filters.push(args[index + 1].trim());
  }
  assert.equal(cases.length, 40, "Registered case count, including the eight viewport/theme cases");
  const matches = (entry, filter) => /^\d+$/.test(filter) ? entry.number === Number(filter) : entry.name.toLowerCase().includes(filter.toLowerCase());
  for (const filter of filters) assert.ok(cases.some((entry) => matches(entry, filter)), `No case matches ${JSON.stringify(filter)}`);
  const partial = filters.length > 0, selected = cases.filter((entry) => !partial || filters.some((filter) => matches(entry, filter)));
  artifactDirectory = await mkdtemp(join(tmpdir(), "byteverse-json-typescript-browser-"));
  const startedAt = new Date().toISOString(); let failure, version, oracleCodes;
  console.log(`ARTIFACT_DIRECTORY ${artifactDirectory}\nEXISTING PREVIEW ONLY ${TARGET}`);
  console.log(`${partial ? "PARTIAL / NOT FULL VALIDATION" : "FULL SUITE"}: ${selected.length}/${cases.length} sequential cases. No server management.`);
  try {
    oracleCodes = compileMemory([{ code: "export {}; const n: string = 42; const x: { a?: number } = { a: undefined };" }]).map((entry) => entry.code);
    assert.ok(oracleCodes.includes(2322) && oracleCodes.includes(2375), "Negative oracle proves real semantic and exact-optional checking");
    browser = await chromium.launch({ channel: "msedge", headless: true, downloadsPath: artifactDirectory,
      args: ["--disable-background-networking", "--disable-component-update", "--disable-domain-reliability", "--no-pings",
        "--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1"] });
    version = browser.version();
    for (const entry of selected) {
      const result = { number: entry.number, name: entry.name, status: "running", options: entry.options }; results.push(result);
      let h, caseFailure;
      try {
        h = await createHarness(entry); await entry.run(h); await verifyHealthy(h); result.status = "passed";
      } catch (error) {
        h ??= error.harness; caseFailure = error; result.status = "failed"; result.error = safeError(error);
        await firstFailure(h, result);
      } finally {
        if (h) {
          try { result.audit = await audit(h); } catch (error) { result.auditError = safeError(error); caseFailure ??= error; }
          try { h.closing = true; await h.context?.close(); } // Context owns hubs; NEVER close an individual downloads-hub page.
          catch (error) { result.cleanupError = safeError(error); caseFailure ??= error; }
        }
      }
      if (caseFailure) {
        result.status = "failed"; result.error ??= safeError(caseFailure);
        console.error(`FAIL ${entry.number}/${cases.length} ${entry.name}\n${result.error}`);
        failure ??= result.error;
        process.exitCode = 1;
        // Each case has a fresh context. Collect independent failures in one
        // full run instead of hiding them behind the first failed assertion.
        continue;
      }
      console.log(`PASS ${entry.number}/${cases.length} ${entry.name}`);
    }
    if (!partial && !failure) { assert.equal(downloads.length, 2); assert.equal(screenshots.length, 24); assert.equal(results.length, 40); }
  } catch (error) { failure = safeError(error); process.exitCode = 1; if (!results.some((entry) => entry.status === "failed")) console.error(`SETUP/CLEANUP FAILURE\n${failure}`); }
  finally {
    try { await browser?.close(); } catch (error) { failure ??= safeError(error); process.exitCode = 1; }
    const passed = results.filter((entry) => entry.status === "passed").length;
    const manifest = { status: failure ? "failed" : partial ? "partial-passed" : "full-passed", partial, filters, startedAt, finishedAt: new Date().toISOString(),
      target: TARGET, canonical: CANONICAL, expectedTitle: TITLE, browser: { channel: "msedge", headless: true, version },
      compiler: { version: ts.version, negativeOracleCodes: oracleCodes }, totalCases: cases.length, planned: selected.length, executed: results.length, passed, failure,
      notRun: selected.slice(results.length).map(({ number, name }) => ({ number, name })),
      notSelected: cases.filter((entry) => !selected.includes(entry)).map(({ number, name }) => ({ number, name })),
      screenshots, downloads, cases: results, limitations: [
        "A credential-free production preview must already exist at the fixed loopback URL. This script neither starts nor builds it; no installs, env/config/application-module imports, DB access or API calls.",
        "Normal cases use native bundled Workers and the real engine. The source requests a module Worker; Next 16.2.6 Turbopack emits a verified same-origin classic bootstrap. Injected constructor/errors/late delivery test lifecycle handling, not naturally failing hardware or engine CPU-time performance.",
        "15-second watchdog and 30-second download cleanup use explicitly captured callbacks, not elapsed wall time. No sleeps or blanket fake clocks.",
        "Clipboard is a controlled in-memory shim (success/reject/delay), not OS permission certification. File chooser events and both saved TypeScript downloads are native Playwright/Edge operations with byte read-back.",
        "External resources, nonapproved local routes, mutations and sockets are blocked. Canary checks cover literal/JSON/URL/base64 forms of synthetic inputs, not every encoding or covert channel.",
        "Memory-only checks inspect local/session storage and cookies plus IndexedDB/cache names in a fresh context; they do not exhaustively decode arbitrary existing database/cache bodies or certify sitewide zero storage/network.",
        "Screenshots and width assertions cover emulated Edge viewports, not physical-device, cross-browser, pixel-baseline or full accessibility certification.",
        "The future title, five visible/schema-matched FAQs and route-specific 1200x630 social PNG are required. An older build is expected to fail, never silently skip these checks.",
        "Captured generated code is strictly typechecked in memory against installed TypeScript libraries, with no emit or execution. Successful compilation is not runtime validation or proof of a complete API contract.",
      ] };
    const path = join(artifactDirectory, "results.json"); await writeFile(path, `${JSON.stringify(manifest, null, 2)}\n`, { flag: "wx" });
    console.log(`RESULTS_JSON ${path}`); console.log(JSON.stringify({ status: manifest.status, planned: selected.length, total: cases.length, passed,
      notRun: manifest.notRun.length, notSelected: manifest.notSelected.length, screenshots: screenshots.length, downloads: downloads.length, artifactDirectory }));
  }
}

await main().catch((error) => { console.error(safeError(error)); process.exitCode = 1; });