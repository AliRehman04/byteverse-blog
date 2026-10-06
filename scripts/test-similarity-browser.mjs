/**
 * Run directly with Node AFTER the parent refreshes its credential-free Next
 * production preview. This script never starts, builds, refreshes or polls a
 * server, installs a browser, loads application credentials, or imports a seed.
 *
 * Normal checks exercise the real hydrated client and Next-built native Worker.
 * Explicit fault cases gate native worker deliveries / File.arrayBuffer or
 * replace clipboard writes. Those cases are not evidence of real clipboard I/O,
 * slow disks, physical-device coverage, or a timing/performance guarantee.
 * All retained output lives in one unique OS temporary directory.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { chromium, expect as playwrightExpect } from "@playwright/test";
import { parseDocument } from "htmlparser2";
import ts from "typescript";

const ORIGIN = "http://127.0.0.1:3040";
const TOOL_PATH = "/tools/plagiarism-checker";
const TARGET = `${ORIGIN}${TOOL_PATH}`;
const PRODUCTION = "https://www.byteverse.fyi";
const CANONICAL = `${PRODUCTION}${TOOL_PATH}`;
const IMAGE_PATH = `${TOOL_PATH}/opengraph-image`;
const RETIRED_API = "/api/ai-plagiarism-check";
const TITLE = "Free Text Similarity Checker - Compare Sources";
const DESCRIPTION = "Compare a draft with up to five supplied sources, review matching phrases and save a report. Free text similarity checker with on-device matching; no web scan.";
const IMAGE_ALT = "ByteVerse Text Similarity Checker: a fictional draft and supplied source with a shared phrase highlighted, not a plagiarism verdict.";
const UI_TIMEOUT = 12_000;
const CHECK_TIMEOUT = 20_000;
const expect = playwrightExpect.configure({ timeout: UI_TIMEOUT });
const ROOT = fileURLToPath(new URL("../", import.meta.url));
const TEN = "alpha beta gamma delta epsilon zeta eta theta iota kappa";
const FOUR = "gamma delta epsilon zeta";
const EIGHT = "alpha beta gamma delta epsilon zeta eta theta";
const UNRELATED = "orange violet copper silver meadow ocean lantern planet";
const REVIEW_NOTE = "ReviewerOnly_Fictional984: check page nine — Café 🧪.";
const PRIVATE_LABEL = "FictionalArchive_984 — editor-only label";
const SAMPLE_PASSAGES = [
  "Volunteers share seeds and tools with their neighbors every spring",
  "The library opens its reading room to local groups on Saturday mornings",
];
const cases = [];
const caseResults = [];
const screenshots = [];
const downloads = [];
let artifactDirectory;
let browser;

// In-memory, allowlisted loading of TRUSTED pure modules only. In particular,
// neither a Next entry point, app config, report renderer nor dotenv is executed
// to manufacture browser expectations. Coverage fixtures below use hand-counted
// denominators; the pure tokenizer is used only to check live input counters.
function loadPureContracts() {
  const allowlist = Object.freeze({
    types: { path: "src/lib/similarity/types.ts", imports: {} },
    samples: { path: "src/lib/similarity/samples.ts", imports: {} },
    engine: { path: "src/lib/similarity/engine.ts", imports: { "./types": "types" } },
  });
  const sandbox = {};
  for (const capability of ["process", "fetch", "window", "document", "navigator", "console", "XMLHttpRequest", "WebSocket", "Worker", "localStorage", "sessionStorage", "setTimeout"]) {
    Object.defineProperty(sandbox, capability, { get() { throw new Error(`Forbidden pure-module capability: ${capability}`); } });
  }
  const context = vm.createContext(sandbox, { codeGeneration: { strings: false, wasm: false } });
  const cache = new Map();
  function load(name) {
    assert.ok(Object.hasOwn(allowlist, name), "Unapproved pure-module import");
    if (cache.has(name)) return cache.get(name).exports;
    const entry = allowlist[name];
    const output = ts.transpileModule(readFileSync(join(ROOT, entry.path), "utf8"), {
      fileName: entry.path,
      reportDiagnostics: true,
      compilerOptions: { target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.CommonJS, isolatedModules: true, strict: true },
    });
    assert.equal(output.diagnostics?.length ?? 0, 0, `${name}: transpilation diagnostics`);
    const record = { exports: {} };
    cache.set(name, record);
    const wrapper = new vm.Script(`(function(exports, require, module) {\n${output.outputText}\n})`, { filename: entry.path }).runInContext(context);
    wrapper(record.exports, (specifier) => {
      assert.ok(Object.hasOwn(entry.imports, specifier), "Unapproved pure-module dependency");
      return load(entry.imports[specifier]);
    }, record);
    return record.exports;
  }
  return { ...load("samples"), getInputStats: load("engine").getInputStats };
}

const { COMPARISON_SAMPLE, REPETITION_SAMPLE, getInputStats } = loadPureContracts();
const collapse = (value) => value.replace(/\s+/g, " ").trim();
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const formatted = (value) => value.toLocaleString("en-US");
function scenario(name, run, options = {}) { cases.push({ name, run, options }); }

function safeError(error) {
  // Playwright can include the entire textarea in an assertion diff. Keep the
  // useful assertion/stack lines, not a 60 KB synthetic input or report dump.
  return String(error?.stack ?? error).replace(/\u001b\[[0-9;]*m/g, "")
    .split("\n").slice(0, 24).map((line) => line.length > 260 ? `${line.slice(0, 260)} … [line truncated]` : line).join("\n").slice(0, 4_500);
}

function nodes(root, predicate) {
  const found = [];
  function visit(node) {
    if (predicate(node)) found.push(node);
    for (const child of node.children ?? []) visit(child);
  }
  visit(root);
  return found;
}
function nodeText(node) { return node.type === "text" ? node.data : (node.children ?? []).map(nodeText).join(""); }
function oneNode(root, predicate, description) {
  const found = nodes(root, predicate);
  assert.equal(found.length, 1, `Expected exactly one SSR ${description}`);
  return found[0];
}
function meta(root, key, attribute = "name") {
  return oneNode(root, (node) => node.name === "meta" && node.attribs[attribute] === key, key).attribs.content;
}
function schemasFrom(root) {
  const output = [];
  function add(value) {
    if (Array.isArray(value)) value.forEach(add);
    else if (value && typeof value === "object") {
      output.push(value);
      if (value["@graph"]) add(value["@graph"]);
    }
  }
  for (const node of nodes(root, (entry) => entry.name === "script" && entry.attribs.type === "application/ld+json")) add(JSON.parse(nodeText(node)));
  return output;
}

// This init script observes normal browser primitives without replacing their
// normal work. Only a scenario explicitly requesting a fault changes delivery.
// Exposed methods release test gates / inject errors; tests never call a React
// handler to click a control or manufacture a File/change event themselves.
function installProbe({ workerMode = "native", fileMode = "native", clipboardMode = "native" }) {
  if (Object.hasOwn(window, "__similarityBrowserProbe")) return;
  const probe = {
    workers: [], files: [], clipboardCopies: [], clipboardPending: 0,
    constructorFailures: 0, holdMessages: workerMode === "hold", heldMessages: 0,
    releasedMessages: 0, injectedErrors: 0, preventedErrors: 0,
  };
  const workerReleases = [];
  const fileReleases = [];
  const clipboardReleases = [];
  const workerErrors = [];
  Object.defineProperty(window, "__similarityBrowserProbe", { value: probe });
  probe.releaseMessages = () => {
    probe.holdMessages = false;
    for (const deliver of workerReleases.splice(0)) deliver();
    return probe.releasedMessages;
  };
  probe.releaseImports = () => {
    for (const release of fileReleases.splice(0)) release();
  };
  probe.releaseClipboard = () => {
    for (const release of clipboardReleases.splice(0)) release();
  };
  probe.injectWorkerError = (index) => {
    if (!workerErrors[index]) throw new Error("No native worker exists for the requested fault");
    workerErrors[index]();
  };

  const nativeArrayBuffer = File.prototype.arrayBuffer;
  Object.defineProperty(File.prototype, "arrayBuffer", {
    configurable: true,
    writable: true,
    value: async function () {
      const record = { size: this.size, pending: true, held: fileMode === "hold", completed: false, injectedFailure: fileMode === "reject" };
      probe.files.push(record);
      try {
        if (fileMode === "hold") await new Promise((resolve) => fileReleases.push(resolve));
        if (fileMode === "reject") throw new Error("SYNTHETIC_READER_INTERNAL_DETAIL");
        const bytes = await Reflect.apply(nativeArrayBuffer, this, []);
        record.completed = true;
        return bytes;
      } finally { record.pending = false; }
    },
  });

  if (clipboardMode !== "native") {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        async writeText(value) {
          probe.clipboardCopies.push(String(value));
          probe.clipboardPending++;
          try {
            if (clipboardMode === "reject") throw new Error("Synthetic clipboard permission rejection");
            if (clipboardMode === "hold") await new Promise((resolve) => clipboardReleases.push(resolve));
          } finally { probe.clipboardPending--; }
        },
      },
    });
  }

  const NativeWorker = window.Worker;
  if (workerMode === "unsupported") {
    Object.defineProperty(window, "Worker", { configurable: true, writable: true, value: undefined });
  } else if (workerMode === "constructor-error") {
    window.Worker = class UnavailableWorker {
      constructor() { probe.constructorFailures++; throw new Error("SYNTHETIC_WORKER_START_DETAIL"); }
    };
  } else {
    window.Worker = class ObservedNativeWorker extends NativeWorker {
      constructor(url, options) {
        super(url, options);
        const record = {
          url: new URL(String(url), location.href).href, type: options?.type ?? "classic",
          posted: [], received: 0, held: 0, released: 0, terminateCalls: 0,
        };
        this.auditRecord = record;
        probe.workers.push(record);
        // Registered before the application's onmessage handler. Normal events
        // pass untouched; held events keep their real native-worker response.
        this.addEventListener("message", (event) => {
          record.received++;
          if (!probe.holdMessages) return;
          const callback = this.onmessage;
          if (typeof callback !== "function") throw new Error("Worker response arrived without the client listener");
          event.stopImmediatePropagation();
          record.held++;
          probe.heldMessages++;
          workerReleases.push(() => {
            record.released++;
            probe.releasedMessages++;
            // Deliberately deliver even after terminate to test revision guards.
            // This is a fault injection, not normal Worker scheduling behavior.
            callback.call(this, event);
          });
        });
        workerErrors.push(() => {
          const event = new ErrorEvent("error", { message: "SYNTHETIC_WORKER_INTERNAL_DETAIL", cancelable: true });
          probe.injectedErrors++;
          this.onerror?.call(this, event);
          if (event.defaultPrevented) probe.preventedErrors++;
        });
      }
      postMessage(value, ...rest) {
        this.auditRecord.posted.push({
          id: value.id, mode: value.mode, draftCharacters: value.draft.length,
          sourceCharacters: value.sources.map((source) => source.text.length),
          sourceLabelCharacters: value.sources.map((source) => source.label.length),
          options: { ...value.options },
        });
        return super.postMessage(value, ...rest);
      }
      terminate() { this.auditRecord.terminateCalls++; return super.terminate(); }
    };
  }
}

function isStaticChunk(url) { return url.origin === ORIGIN && url.pathname.startsWith("/_next/static/"); }
const documentPaths = new Set([TOOL_PATH, "/", "/tools", "/site-map"]);
const httpPaths = new Set([...documentPaths, "/llms.txt", "/sitemap.xml", IMAGE_PATH]);
const publicAssets = new Set(["/logo.png", "/favicon.ico", "/favicon-16x16.png", "/favicon-32x32.png", "/apple-icon.png", "/apple-touch-icon.png", "/android-chrome-192x192.png", "/android-chrome-512x512.png", "/site.webmanifest"]);
function queryKeysAllowed(url, allowed) { return [...url.searchParams.keys()].every((key) => allowed.includes(key)); }
function permittedBrowserGet(url, method) {
  if (url.origin !== ORIGIN || method !== "GET" || url.username || url.password) return false;
  if (isStaticChunk(url)) return queryKeysAllowed(url, ["dpl", "v"]);
  if (documentPaths.has(url.pathname)) return queryKeysAllowed(url, ["_rsc"]);
  // Next's file-based icon metadata can add a content-hash query, for example
  // /favicon.ico?favicon.<hash>.ico. It is still an inert local static GET.
  if (publicAssets.has(url.pathname)) return !url.search || /^\?[a-zA-Z0-9_.-]{1,160}(?:=[a-zA-Z0-9_.-]{1,160})?$/.test(url.search);
  // Never let Next's image optimizer proxy a remote URL from the test server.
  return url.pathname === "/_next/image" && url.searchParams.get("url") === "/logo.png"
    && queryKeysAllowed(url, ["url", "w", "q"])
    && /^\d+$/.test(url.searchParams.get("w") ?? "") && /^\d+$/.test(url.searchParams.get("q") ?? "");
}

async function createHarness(entry, index) {
  const h = {
    name: entry.name, index, phase: "baseline", generation: 0, closing: false,
    requests: [], apiRequests: [], pageErrors: [], consoleErrors: [], networkErrors: [],
    violations: [], sockets: [], nativeWorkers: [], probeArchives: [], inputLengths: [],
    layoutMeasurements: [], needles: [], dialogs: 0, popups: 0, downloadEvents: 0,
    expectedDownload: false, unexpectedDownloads: 0, pointerActions: 0,
    javaScriptEnabled: entry.options.javaScriptEnabled !== false,
  };
  const width = entry.options.width ?? 1440;
  h.context = await browser.newContext({
    viewport: { width, height: width <= 390 ? 844 : 1000 },
    deviceScaleFactor: 1, colorScheme: "light", reducedMotion: "reduce",
    locale: "en-US", timezoneId: "UTC", serviceWorkers: "block",
    javaScriptEnabled: h.javaScriptEnabled, acceptDownloads: true,
  });
  h.context.setDefaultTimeout(UI_TIMEOUT);
  h.context.setDefaultNavigationTimeout(30_000);
  h.track = (text, kind = "fixture") => {
    const value = String(text);
    h.inputLengths.push({ kind, characters: value.length });
    if (value.length < 8) return; // Tiny/common strings are not useful leak canaries.
    const prefix = value.slice(0, 96);
    const variants = [prefix, collapse(value).slice(0, 96), JSON.stringify(prefix).slice(1, -1), encodeURIComponent(prefix), new URLSearchParams({ q: prefix }).toString().slice(2)];
    if (prefix.length >= 24) variants.push(Buffer.from(prefix, "utf8").toString("base64").replace(/=+$/, ""));
    h.needles.push({ id: `${kind}-${h.needles.length + 1}`, variants });
  };
  function inputMatches(request) {
    const raw = [request.url(), request.postData() ?? "", ...Object.values(request.headers())].join("\n");
    let decoded = raw;
    try { decoded = decodeURIComponent(raw.replace(/\+/g, " ")); } catch { /* Raw/binary data is still checked. */ }
    const forms = [raw, decoded, collapse(decoded)];
    return h.needles.filter((needle) => needle.variants.some((value) => forms.some((form) => form.includes(value)))).map((needle) => needle.id);
  }
  const requestsByObject = new WeakMap();
  function observe(request) {
    if (requestsByObject.has(request)) return requestsByObject.get(request);
    const url = new URL(request.url());
    const matches = inputMatches(request);
    const localBlobDownload = url.protocol === "blob:" && url.origin === ORIGIN && request.method() === "GET" && h.expectedDownload;
    const record = {
      phase: h.phase, method: request.method(), type: request.resourceType(),
      origin: url.origin, path: matches.length ? "[synthetic-input path redacted]" : url.pathname.slice(0, 240),
      queryKeys: matches.length ? ["[redacted]"] : [...url.searchParams.keys()].map((key) => key.slice(0, 60)),
      bodyBytes: request.postDataBuffer()?.length ?? 0, inputMatches: matches,
      expectedGetChunk: request.method() === "GET" && isStaticChunk(url),
      localBlobDownload,
      allowed: matches.length === 0 && (permittedBrowserGet(url, request.method()) || localBlobDownload),
    };
    const headers = request.headers();
    record.frameworkPrefetch = request.method() === "GET" && (headers.rsc === "1" || headers["next-router-prefetch"] === "1" || url.searchParams.has("_rsc"));
    record.blockedImageProxy = url.origin === ORIGIN && url.pathname === "/_next/image" && url.searchParams.get("url") !== "/logo.png";
    requestsByObject.set(request, record);
    h.requests.push(record);
    return record;
  }
  h.context.on("request", observe);
  h.context.on("response", (response) => { observe(response.request()).status = response.status(); });
  h.context.on("requestfailed", (request) => { observe(request).failed = true; });
  await h.context.route("**/*", async (route) => {
    const request = route.request();
    const record = observe(request);
    if (!record.allowed && record.origin === ORIGIN && !record.frameworkPrefetch && !record.blockedImageProxy) {
      h.violations.push(`Unexpected local request: ${record.method} ${record.path}`);
    }
    try {
      if (record.allowed) await route.continue();
      else await route.abort("blockedbyclient");
    } catch (error) {
      if (!h.closing) h.networkErrors.push(safeError(error));
    }
  });
  await h.context.routeWebSocket("**/*", (socket) => {
    h.sockets.push({ phase: h.phase, origin: new URL(socket.url()).origin });
    socket.close(); // A production preview needs no HMR or external socket.
  });
  if (h.javaScriptEnabled) await h.context.addInitScript(installProbe, {
    workerMode: entry.options.workerMode ?? "native",
    fileMode: entry.options.fileMode ?? "native",
    clipboardMode: entry.options.clipboardMode ?? "native",
  });
  let pageCount = 0;
  h.downloadHubs = 0;
  h.popupChecks = [];
  h.secondaryPages = [];
  h.context.on("page", (page) => {
    pageCount++;
    if (pageCount > 1) {
      const secondary = { initialUrl: page.url(), finalUrl: "", downloadObserved: h.expectedDownload || h.downloadEvents > 0 };
      h.secondaryPages.push(secondary);
      h.popupChecks.push((async () => {
        try {
          // Edge creates an internal downloads hub after a real file download.
          assert(secondary.downloadObserved);
          await expect.poll(() => page.url(), { timeout: 5_000 }).toBe("edge://downloads-hub/");
          h.downloadHubs++;
        } catch { h.popups++; }
        finally { secondary.finalUrl = page.url(); }
      })());
    }
    page.on("pageerror", (error) => h.pageErrors.push(safeError(error)));
    page.on("console", (message) => {
      if (message.type() === "error") h.consoleErrors.push({ blockedResource: /ERR_BLOCKED_BY_CLIENT|Failed to load resource/.test(message.text()), message: message.text().slice(0, 500) });
    });
    page.on("dialog", async (dialog) => {
      h.dialogs++;
      await dialog.dismiss().catch(() => {});
    });
    page.on("download", () => {
      h.downloadEvents++;
      if (!h.expectedDownload) h.unexpectedDownloads++;
    });
    page.on("worker", (worker) => {
      const record = { url: worker.url(), generation: h.generation, closed: false };
      h.nativeWorkers.push(record);
      worker.on("close", () => { record.closed = true; });
    });
  });
  h.page = await h.context.newPage();
  h.workspace = h.page.locator("#similarity-workspace");
  h.result = h.workspace.getByTestId("similarity-results");
  h.coverage = h.workspace.getByTestId("similarity-coverage");
  h.document = h.workspace.getByRole("textbox", { name: "Document text", exact: true });
  h.source = h.workspace.getByRole("textbox", { name: "Source text", exact: true });
  h.sourceLabel = h.workspace.getByRole("textbox", { name: "Source label", exact: true });
  h.report = h.workspace.getByRole("region", { name: "Comparison report", exact: true });
  h.reportText = h.report.getByRole("textbox", { name: "Report text", exact: true });
  h.status = h.workspace.locator(".sim-status");
  h.confirmation = h.workspace.getByRole("group", { name: "Confirm replacement", exact: true });
  h.cards = h.result.locator(".sim-passage-card");
  h.button = (name) => h.workspace.getByRole("button", { name, exact: true });
  h.click = async (locator) => {
    await expect(locator).toBeVisible();
    await expect(locator).toBeEnabled();
    await locator.scrollIntoViewIfNeeded();
    await locator.click({ trial: true });
    await stableBox(locator);
    await locator.click(); // One real pointer action; no force, DOM click, or retry.
    h.pointerActions++;
  };
  h.checkbox = async (name, checked) => {
    const locator = h.workspace.getByRole("checkbox", { name, exact: true });
    await expect(locator).toBeVisible();
    await locator.scrollIntoViewIfNeeded();
    await stableBox(locator);
    await locator.setChecked(checked);
    if (checked) await expect(locator).toBeChecked();
    else await expect(locator).not.toBeChecked();
  };
  h.select = async (label, value) => {
    const locator = h.workspace.getByRole("combobox", { name: label, exact: true });
    await expect(locator).toBeVisible();
    await locator.selectOption(String(value));
    await expect(locator).toHaveValue(String(value));
  };
  h.fill = async (locator, value, kind) => {
    h.track(value, kind);
    await expect(locator).toBeVisible();
    await expect(locator).toBeEditable();
    await locator.fill(value);
    await sameValue(locator, value, `${kind}: exact input round trip`);
  };
  h.text = async (kind, value) => {
    const locator = kind === "document" ? h.document : h.source;
    await h.fill(locator, value, kind);
    const id = await locator.getAttribute("aria-describedby");
    const stats = getInputStats(value);
    const counter = h.workspace.locator(`[id="${id}"]`);
    await visibleText(counter.locator("span").nth(0), `${formatted(stats.words)} / 10,000 words`);
    await visibleText(counter.locator("span").nth(1), `${formatted(value.length)} / 60,000 chars`);
  };
  h.readProbe = async () => h.javaScriptEnabled ? h.page.evaluate(() => {
    const probe = window.__similarityBrowserProbe;
    if (!probe) return null;
    return {
      workers: probe.workers, files: probe.files,
      clipboardLengths: probe.clipboardCopies.map((text) => text.length), clipboardPending: probe.clipboardPending,
      constructorFailures: probe.constructorFailures, heldMessages: probe.heldMessages,
      releasedMessages: probe.releasedMessages, injectedErrors: probe.injectedErrors, preventedErrors: probe.preventedErrors,
    };
  }) : null;
  h.allWorkersTerminated = async (minimum = 0) => {
    if (!h.javaScriptEnabled) return;
    await expect.poll(async () => {
      const probe = await h.readProbe();
      return Boolean(probe && probe.workers.length >= minimum && probe.workers.every((worker) => worker.terminateCalls === 1));
    }, { message: "Every instantiated tool Worker must be terminated", timeout: CHECK_TIMEOUT }).toBe(true);
    const probe = await h.readProbe();
    for (const worker of probe.workers) {
      const url = new URL(worker.url);
      expect(url.origin, "Worker must load from the authorized Next preview").toBe(ORIGIN);
      expect(url.pathname, "Worker must be a real Next-built static JS module").toMatch(/^\/_next\/static\/.+\.js$/);
      // Bundlers may compile the source module worker into a classic JS chunk.
      // The independently observed native worker and real results are the proof,
      // not an assumption about Next's emitted constructor options.
      expect(["classic", "module"]).toContain(worker.type);
      expect(worker.posted.length).toBe(1);
    }
    await expect.poll(() => h.nativeWorkers.filter((worker) => worker.generation === h.generation).length,
      { message: "Playwright must independently observe every native Worker" }).toBe(probe.workers.length);
    await expect.poll(() => h.nativeWorkers.every((worker) => worker.closed),
      { message: "Native Worker close events must follow client termination" }).toBe(true);
  };
  h.http = async (pathname, method = "GET") => {
    const url = new URL(pathname, ORIGIN);
    assert.equal(url.origin, ORIGIN, "HTTP probes are loopback-only");
    assert.ok(!url.username && !url.password && !url.search && !url.hash, "HTTP probes do not accept credentials or queries");
    assert.ok(method === "GET" ? httpPaths.has(url.pathname) : method === "POST" && url.pathname === RETIRED_API, "Unapproved HTTP probe");
    const options = { timeout: 30_000, maxRedirects: 0, maxRetries: 0, failOnStatusCode: false };
    // APIRequestContext requests do not use browser routes. The guard above and
    // maxRedirects:0 are therefore mandatory, not an assumed routing protection.
    const response = method === "GET"
      ? await h.context.request.get(url.href, options)
      : await h.context.request.post(url.href, { ...options, data: { probe: "synthetic-retired-api-contract" } });
    h.apiRequests.push({ method, path: url.pathname, status: response.status(), toolInputs: false, explicitProbePayload: method === "POST" });
    return response;
  };
  h.goto = async (pathname = TOOL_PATH) => {
    assert.ok(documentPaths.has(pathname), "Unapproved browser navigation");
    const response = await h.page.goto(`${ORIGIN}${pathname}`, { waitUntil: "load" });
    expect(response?.status(), `HTTP document status for ${pathname}`).toBe(200);
    await expect(h.page).toHaveURL(`${ORIGIN}${pathname}`);
    return response;
  };
  h.ready = async () => {
    await expect(h.workspace).toBeVisible();
    if (h.javaScriptEnabled) {
      // Read-only hydration observation; this NEVER invokes the React handler.
      // Visibility of an SSR button alone cannot establish that it is hydrated.
      await expect.poll(() => h.button("Try an example").evaluate((element) => Object.keys(element).some((key) => key.startsWith("__reactProps$") && typeof element[key]?.onClick === "function")),
        { message: "Wait for the Next client to attach the sample button handler" }).toBe(true);
    }
    h.phase = "workflow";
  };
  try {
    if (entry.options.open !== false) { h.initialResponse = await h.goto(); await h.ready(); }
    return h;
  } catch (error) {
    if (error && typeof error === "object") error.similarityAudit = await archiveHarness(h);
    h.closing = true;
    await h.context.close();
    throw error;
  }
}

async function stableBox(locator) {
  let previous;
  let stable = 0;
  await expect.poll(async () => {
    const box = await locator.boundingBox();
    if (!box) return false;
    const current = [box.x, box.y, box.width, box.height];
    stable = previous && current.every((value, index) => Math.abs(value - previous[index]) < 0.5) ? stable + 1 : 0;
    previous = current;
    return stable >= 2;
  }, { message: "Native action target must settle after scrolling", intervals: [100, 150, 250] }).toBe(true);
}

async function visibleText(locator, text) {
  await expect(locator).toBeVisible();
  await expect(locator).toHaveText(text);
}
async function sameValue(locator, value, message = "Exact textarea value") {
  await expect(locator).toBeVisible();
  await expect.poll(async () => (await locator.inputValue()) === value, { message }).toBe(true);
}
async function literalText(locator, value) {
  await expect(locator).toBeVisible();
  // textContent, not innerText/toHaveText normalization: retain all whitespace.
  await expect.poll(async () => (await locator.textContent()) === value, { message: "Highlighted text must round-trip the original UTF-16 string" }).toBe(true);
  await expect(locator.locator("script, img, iframe, style, a, input")).toHaveCount(0);
}
async function absentResults(h) {
  await expect(h.result).toHaveCount(0);
  await expect(h.report).toHaveCount(0);
  await expect(h.workspace.getByRole("group", { name: "Manual search preview", exact: true })).toHaveCount(0);
  await expect(h.button("Cancel")).toHaveCount(0);
}
async function summaryValue(h, label, value) {
  const row = h.result.locator(".sim-summary-secondary dl > div").filter({ has: h.page.getByText(label, { exact: true }) });
  await visibleText(row.locator("dt"), label);
  await visibleText(row.locator("dd"), String(value));
}
async function check(h, coverage, { repeat = false, matched, eligible, sourceCharacters } = {}) {
  const before = (await h.readProbe()).workers.length;
  const documentCharacters = (await h.document.inputValue()).length;
  await h.click(h.button(repeat ? "Find repeated sentences" : "Compare texts"));
  await expect(h.result).toBeVisible({ timeout: CHECK_TIMEOUT });
  await visibleText(h.result.getByRole("heading", { level: 2, name: repeat ? "Your repetition review." : "Your comparison, explained.", exact: true }), repeat ? "Your repetition review." : "Your comparison, explained.");
  await visibleText(h.coverage, coverage);
  await visibleText(h.status, "Check complete. Review the evidence; matching text is not a plagiarism verdict.");
  await expect(h.workspace.getByRole("alert")).toHaveCount(0);
  if (matched !== undefined) await visibleText(h.result.locator(".sim-summary-primary > p"), `${formatted(matched)} of ${formatted(eligible)} eligible document words`);
  await h.allWorkersTerminated(before + 1);
  const probe = await h.readProbe();
  expect(probe.workers.length).toBe(before + 1);
  expect(probe.workers.at(-1).received).toBe(1);
  expect(probe.workers.at(-1).posted[0].draftCharacters).toBe(documentCharacters);
  if (sourceCharacters) expect(probe.workers.at(-1).posted[0].sourceCharacters).toEqual(sourceCharacters);
  if (repeat) expect(probe.workers.at(-1).posted[0].sourceCharacters).toEqual([]);
}
async function example(h, { repeat = false, replace = false } = {}) {
  h.track(repeat ? REPETITION_SAMPLE : COMPARISON_SAMPLE.draft, "sample-document");
  if (!repeat) for (const source of COMPARISON_SAMPLE.sources) { h.track(source.text, "sample-source"); h.track(source.label, "sample-label"); }
  await h.click(h.button("Try an example"));
  if (replace) {
    await expect(h.confirmation).toBeVisible();
    await h.click(h.confirmation.getByRole("button", { name: "Replace text", exact: true }));
  }
  await expect(h.confirmation).toHaveCount(0);
  await sameValue(h.document, repeat ? REPETITION_SAMPLE : COMPARISON_SAMPLE.draft);
  await visibleText(h.status, "Fictional example loaded. Run the check to explore the results.");
}
async function fixture(h, { draft = TEN, source = TEN, label = PRIVATE_LABEL, extra = false } = {}) {
  await h.text("document", draft);
  await h.text("source", source);
  await h.fill(h.sourceLabel, label, "source-label");
  await h.select("Minimum match", 4);
  if (extra) {
    await h.click(h.workspace.getByRole("button", { name: /^Add \(1\/5\)$/ }));
    await h.text("source", source);
    await h.click(h.workspace.locator(".sim-source-tabs").getByRole("button", { name: /^Source 1(?:\s|$)/ }));
  }
}
async function annotate(h, note = REVIEW_NOTE) {
  const card = h.cards.first();
  await expect(card).toBeVisible();
  const review = card.getByRole("combobox", { name: "Your review", exact: true });
  await review.selectOption("cited");
  await expect(review).toHaveValue("cited");
  await h.fill(card.getByRole("textbox", { name: /^Note/ }), note, "review-note");
}
async function openReport(h) {
  await h.click(h.button("Review report"));
  await expect(h.report).toBeVisible();
  await expect(h.reportText).toBeVisible();
  await expect(h.reportText).toHaveAttribute("readonly", "");
  return h.reportText.inputValue();
}
async function reviewedFixture(h, options = {}) {
  await fixture(h, options);
  await check(h, "100%", { matched: 10, eligible: 10 });
  await annotate(h);
  return openReport(h);
}
async function upload(h, file, target = "Document text") {
  h.track(file.name, "import-filename");
  h.track(file.buffer.toString("utf8"), "import-content");
  const input = h.workspace.getByLabel(`Import ${target}`, { exact: true });
  await expect(input).toHaveAttribute("type", "file");
  // Native Playwright upload API: no constructed File, DataTransfer or event.
  await input.setInputFiles(file);
  await expect(input).toHaveValue("");
}
async function keptReview(h, report, { source = TEN, draft = TEN } = {}) {
  await sameValue(h.document, draft);
  await sameValue(h.source, source);
  await visibleText(h.coverage, "100%");
  await sameValue(h.cards.first().getByRole("textbox", { name: /^Note/ }), REVIEW_NOTE);
  await expect(h.cards.first().getByRole("combobox", { name: "Your review", exact: true })).toHaveValue("cited");
  await sameValue(h.reportText, report, "The completed report must remain byte-for-byte unchanged");
}
async function heldCheck(h) {
  const before = (await h.readProbe()).heldMessages;
  await h.click(h.button("Compare texts"));
  await visibleText(h.button("Comparing locally…"), "Comparing locally…");
  await expect(h.button("Comparing locally…")).toBeDisabled();
  await expect(h.button("Cancel")).toBeVisible();
  await expect.poll(async () => (await h.readProbe()).heldMessages, { message: "Fault gate must capture a real Next worker response" }).toBe(before + 1);
  await expect(h.result).toHaveCount(0);
}
async function releaseMessages(h) {
  await h.page.evaluate(() => window.__similarityBrowserProbe.releaseMessages());
  await expect.poll(async () => {
    const probe = await h.readProbe();
    return probe.releasedMessages === probe.heldMessages;
  }, { message: "All held native responses must be delivered by the explicit test gate" }).toBe(true);
}
async function showMethod(h) {
  const details = h.result.locator(".sim-method-notes");
  const summary = details.locator("summary");
  await h.click(summary);
  await expect(details).toHaveAttribute("open", "");
  await expect(details.locator("ul")).toBeVisible();
  return { details, summary };
}

async function assertLayout(h, state) {
  await expect.poll(() => h.page.evaluate(() => document.fonts.status), { message: "Local font loading must settle before layout inspection" }).toBe("loaded");
  let previous;
  let stable = 0;
  let measurement;
  await expect.poll(async () => {
    measurement = await h.page.evaluate(() => {
      const workspace = document.querySelector("#similarity-workspace");
      const rect = workspace.getBoundingClientRect();
      const constrained = [...workspace.querySelectorAll(".sim-source-tabs, .sim-source-label, .sim-input-card, .sim-evidence-toolbar, .sim-report, textarea, select, input:not([type=file])")];
      const outside = constrained.filter((element) => {
        const box = element.getBoundingClientRect();
        return box.width > 0 && (box.left < rect.left - 1 || box.right > rect.right + 1);
      }).map((element) => element.id || element.className || element.tagName);
      const sourceOverflow = [...workspace.querySelectorAll(".sim-source-tabs, .sim-source-label")].some((element) => element.scrollWidth > element.clientWidth + 1);
      return {
        viewport: innerWidth, documentWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
        workspaceWidth: rect.width, workspaceHeight: rect.height,
        workspaceOverflow: workspace.scrollWidth > workspace.clientWidth + 1,
        sourceOverflow, outside,
      };
    });
    const signature = JSON.stringify(measurement);
    stable = signature === previous ? stable + 1 : 0;
    previous = signature;
    return stable >= 2 && measurement.documentWidth <= measurement.viewport + 1
      && !measurement.workspaceOverflow && !measurement.sourceOverflow && measurement.outside.length === 0;
  }, { message: `Settled ${state}: no viewport/workspace/source-control horizontal overflow`, intervals: [100, 150, 250] }).toBe(true);
  h.layoutMeasurements.push({ state, ...measurement });
}
async function screenshot(h, suffix, locator) {
  await expect(locator).toBeVisible();
  await locator.scrollIntoViewIfNeeded();
  await stableBox(locator);
  const path = join(artifactDirectory, `${String(h.index + 1).padStart(2, "0")}-${suffix}.png`);
  await locator.screenshot({ path, caret: "hide" });
  screenshots.push({ case: h.name, portion: suffix, path });
}
async function downloadReport(h, kind) {
  const preview = await h.reportText.inputValue();
  h.expectedDownload = true;
  try {
    const pending = h.page.waitForEvent("download");
    const [, file] = await Promise.all([h.click(h.report.getByRole("button", { name: "Download TXT", exact: true })), pending]);
    expect(file.suggestedFilename()).toBe("byteverse-text-comparison-report.txt");
    expect(await file.failure()).toBeNull();
    const path = join(artifactDirectory, `${String(h.index + 1).padStart(2, "0")}-report-${kind}.txt`);
    await file.saveAs(path);
    const bytes = await readFile(path);
    expect(bytes.equals(Buffer.from(preview, "utf8")), "Downloaded bytes must independently equal the visible report's UTF-8 encoding").toBe(true);
    expect(new TextDecoder("utf-8", { fatal: true }).decode(bytes) === preview, "The saved file must decode losslessly").toBe(true);
    downloads.push({ case: h.name, kind, path, bytes: bytes.length, sha256: sha256(bytes) });
  } finally { h.expectedDownload = false; }
}

scenario("seo / actual HTTP SSR, production metadata, visible FAQs and generated PNG", async (h) => {
  const html = await h.initialResponse.text();
  const root = parseDocument(html);
  const canonical = oneNode(root, (node) => node.name === "link" && node.attribs.rel === "canonical", "canonical").attribs.href;
  expect(canonical).toBe(CANONICAL);
  expect(nodeText(oneNode(root, (node) => node.name === "title", "title"))).toBe(TITLE);
  expect(TITLE.length).toBe(46);
  expect(meta(root, "description")).toBe(DESCRIPTION);
  expect(DESCRIPTION.length).toBe(159);
  await expect(h.page).toHaveTitle(TITLE);
  await expect(h.page.locator("main")).toHaveCount(1);
  await expect(h.page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await visibleText(h.page.getByRole("heading", { level: 1 }), "Text similarity checker");
  expect(nodes(root, (node) => node.name === "main").length).toBe(1);
  expect(nodes(root, (node) => node.name === "h1").length).toBe(1);
  expect(meta(root, "og:title", "property")).toBe(TITLE);
  expect(meta(root, "og:description", "property")).toBe(DESCRIPTION);
  expect(meta(root, "og:url", "property")).toBe(CANONICAL);
  expect(meta(root, "twitter:title")).toBe(TITLE);
  expect(meta(root, "twitter:description")).toBe(DESCRIPTION);
  expect(meta(root, "twitter:card")).toBe("summary_large_image");
  for (const [key, attribute] of [["og:image", "property"], ["twitter:image", "name"]]) {
    const image = new URL(meta(root, key, attribute));
    expect(image.origin).toBe(PRODUCTION);
    expect(image.pathname).toBe(IMAGE_PATH);
    expect(image.username + image.password + image.hash).toBe("");
  }
  expect(meta(root, "og:image:width", "property")).toBe("1200");
  expect(meta(root, "og:image:height", "property")).toBe("630");
  expect(meta(root, "og:image:alt", "property")).toBe(IMAGE_ALT);
  const schemas = schemasFrom(root);
  const applications = schemas.filter((value) => value["@type"] === "WebApplication");
  expect(applications).toHaveLength(1);
  expect(applications[0].url).toBe(CANONICAL);
  expect(applications[0].description).toBe(DESCRIPTION);
  expect(applications[0].offers.price).toBe("0");
  expect(applications[0].isAccessibleForFree).toBe(true);
  expect(JSON.stringify(applications[0])).not.toContain("aggregateRating");
  const faqs = schemas.filter((value) => value["@type"] === "FAQPage");
  expect(faqs).toHaveLength(1);
  expect(faqs[0].mainEntity).toHaveLength(5);
  const faq = h.page.locator("#similarity-faq");
  await expect(faq.locator("dt")).toHaveCount(5);
  await expect(faq.locator("dd")).toHaveCount(5);
  await expect(faq.locator("details, summary, button")).toHaveCount(0);
  for (const [index, item] of faqs[0].mainEntity.entries()) {
    await visibleText(faq.locator("dt").nth(index), item.name);
    await visibleText(faq.locator("dd").nth(index), item.acceptedAnswer.text);
  }
  await expect(h.button("Compare texts")).toBeDisabled();
  expect(h.nativeWorkers).toHaveLength(0);
  const image = await h.http(IMAGE_PATH);
  expect(image.status()).toBe(200);
  expect(image.headers()["content-type"]).toMatch(/^image\/png(?:;|$)/);
  const png = await image.body();
  expect(png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))).toBe(true);
  expect(png.toString("ascii", 12, 16)).toBe("IHDR");
  expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 630]);
}, { javaScriptEnabled: false });

scenario("seo / local discovery pages, llms and sitemap describe supplied-source matching", async (h) => {
  for (const [pathname, description] of [
    ["/tools", "Compare a draft with up to five supplied sources, review matching phrases or repeated sentences locally. No web scan or originality verdict."],
    ["/", "Compare your draft with supplied sources locally—not a web scan"],
    ["/site-map", null],
  ]) {
    await h.goto(pathname);
    const link = h.page.locator(`main a[href="${TOOL_PATH}"]`).filter({ hasText: "Text Similarity Checker" }).first();
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", TOOL_PATH);
    if (description) await expect(link).toContainText(description);
  }
  const llms = await h.http("/llms.txt");
  expect(llms.status()).toBe(200);
  const line = (await llms.text()).split(/\r?\n/).filter((value) => value.startsWith(`- [Text Similarity Checker](${CANONICAL}): `));
  expect(line).toHaveLength(1);
  expect(line[0]).toContain("1–5 supplied sources locally");
  expect(line[0]).toContain("No web scan, AI or originality verdict");
  const sitemap = await h.http("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  const locations = nodes(parseDocument(await sitemap.text(), { xmlMode: true }), (node) => node.name === "loc").map(nodeText);
  expect(locations.filter((value) => value === CANONICAL)).toHaveLength(1);
  expect(locations.some((value) => value.startsWith(ORIGIN))).toBe(false);
}, { javaScriptEnabled: false, open: false });

scenario("seo / the one explicit retired-API POST returns 410 without any tool input", async (h) => {
  const response = await h.http(RETIRED_API, "POST");
  expect(response.status()).toBe(410);
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect(response.headers()["x-robots-tag"]).toBe("noindex");
  const json = await response.json();
  expect(Object.keys(json).sort()).toEqual(["error", "toolPath"]);
  expect(json.toolPath).toBe(TOOL_PATH);
  expect(json.error).toContain("AI originality estimates have been retired");
  expect(json.error).toContain("compare supplied sources locally");
}, { javaScriptEnabled: false, open: false });

scenario("workspace / empty controls, accessible input labels and no AI-check action", async (h) => {
  await expect(h.button("Compare sources")).toHaveAttribute("aria-pressed", "true");
  await expect(h.button("Repeated sentences")).toHaveAttribute("aria-pressed", "false");
  await sameValue(h.document, "");
  await sameValue(h.source, "");
  await sameValue(h.sourceLabel, "Source 1");
  await expect(h.button("Compare texts")).toBeDisabled();
  await expect(h.button("Clear all text and review notes")).toBeDisabled();
  await expect(h.button("Remove Source 1")).toBeDisabled();
  await expect(h.workspace.getByRole("combobox", { name: "Minimum match", exact: true })).toHaveValue("6");
  await expect(h.workspace.getByRole("checkbox", { name: "Ignore case", exact: true })).toBeChecked();
  await expect(h.workspace.getByRole("checkbox", { name: "Exclude quotes", exact: true })).not.toBeChecked();
  await expect(h.workspace.getByRole("checkbox", { name: "Exclude references", exact: true })).not.toBeChecked();
  await expect(h.workspace.getByRole("button", { name: /AI check|check with AI|detect AI|originality score/i })).toHaveCount(0);
  await visibleText(h.workspace.getByText("On-device matching. No AI upload.", { exact: true }), "On-device matching. No AI upload.");
  await h.text("document", TEN);
  await h.click(h.button("Compare texts"));
  await expect(h.workspace.getByRole("alert")).toBeVisible();
  await expect(h.workspace.getByRole("alert")).toContainText("Source 1: Add text containing words, not just punctuation.");
  await absentResults(h);
  expect((await h.readProbe()).workers).toHaveLength(0);
});

scenario("compare / real sample worker, independent 22/70 counts, both sources and review filters", async (h) => {
  await example(h);
  await check(h, "31.4%", { matched: 22, eligible: 70, sourceCharacters: COMPARISON_SAMPLE.sources.map((source) => source.text.length) });
  await summaryValue(h, "Words in your document", 70);
  await summaryValue(h, "Supplied sources checked", 2);
  await summaryValue(h, "Evidence reviewed", "0 / 2");
  await expect(h.cards).toHaveCount(2);
  const documentHighlights = h.workspace.getByLabel("Document matching highlights", { exact: true });
  const sourceHighlights = h.workspace.getByLabel("Source matching highlights", { exact: true });
  await literalText(documentHighlights, COMPARISON_SAMPLE.draft);
  await literalText(sourceHighlights, COMPARISON_SAMPLE.sources[0].text);
  await visibleText(h.page.locator("#sim-draft-current"), SAMPLE_PASSAGES[0]);
  await h.click(h.button("Next matching passage"));
  await visibleText(h.page.locator("#sim-draft-current"), SAMPLE_PASSAGES[1]);
  await visibleText(h.page.locator("#sim-source-current"), SAMPLE_PASSAGES[1]);
  await literalText(sourceHighlights, COMPARISON_SAMPLE.sources[1].text);
  await h.click(h.button("Previous matching passage"));
  await visibleText(h.page.locator("#sim-draft-current"), SAMPLE_PASSAGES[0]);
  for (const [index, source] of COMPARISON_SAMPLE.sources.entries()) {
    await h.select("Filter matching source", source.id);
    await literalText(documentHighlights, COMPARISON_SAMPLE.draft);
    await literalText(sourceHighlights, source.text);
    await expect(h.cards).toHaveCount(1);
    await literalText(h.cards.first().locator(":scope > .sim-passage-text"), SAMPLE_PASSAGES[index]);
    const sourceWording = h.cards.first().locator("details");
    await h.click(sourceWording.locator("summary"));
    await literalText(sourceWording.locator(".sim-passage-text"), SAMPLE_PASSAGES[index]);
  }
  await h.select("Filter matching source", "source-1");
  await annotate(h);
  await visibleText(h.coverage, "31.4%");
  await summaryValue(h, "Evidence reviewed", "1 / 2");
  await h.select("Filter review status", "unreviewed");
  await expect(h.cards).toHaveCount(0);
  await visibleText(h.result.locator(".sim-no-matches"), "No unreviewed evidence in this filter. Your review labels did not change the coverage.");
  await visibleText(h.coverage, "31.4%");
  await h.select("Filter matching source", "all");
  await expect(h.cards).toHaveCount(1);
  await literalText(h.cards.first().locator(":scope > .sim-passage-text"), SAMPLE_PASSAGES[1]);
  await h.select("Filter review status", "all");
  await expect(h.cards).toHaveCount(2);
  await sameValue(h.cards.first().getByRole("textbox", { name: /^Note/ }), REVIEW_NOTE);
});

scenario("compare / selecting a zero-match Source 2 clears document highlights, not overall coverage", async (h) => {
  await fixture(h, { source: EIGHT, label: "Source 1" });
  await h.click(h.workspace.getByRole("button", { name: /^Add \(1\/5\)$/ }));
  await h.text("source", UNRELATED);
  await check(h, "80%", { matched: 8, eligible: 10, sourceCharacters: [EIGHT.length, UNRELATED.length] });
  await h.select("Filter matching source", "source-2");
  const left = h.workspace.getByLabel("Document matching highlights", { exact: true });
  const right = h.workspace.getByLabel("Source matching highlights", { exact: true });
  await literalText(left, TEN);
  await literalText(right, UNRELATED);
  await expect(left.locator("mark")).toHaveCount(0);
  await expect(right.locator("mark")).toHaveCount(0);
  await expect(h.page.locator("#sim-draft-current, #sim-source-current")).toHaveCount(0);
  await expect(h.cards).toHaveCount(0);
  await expect(h.result.locator(".sim-no-matches")).toContainText("This does not establish originality");
  await visibleText(h.coverage, "80%");
  await h.select("Filter matching source", "all");
  await expect(left.locator("mark")).toHaveCount(1);
  await visibleText(h.coverage, "80%");
});

scenario("compare / ten-word draft versus four-word source is 40%, reversed is 100%", async (h) => {
  await fixture(h, { source: FOUR });
  await check(h, "40%", { matched: 4, eligible: 10, sourceCharacters: [FOUR.length] });
  await expect(h.result.locator(".sim-evidence-pane").nth(1)).toContainText("100% of this source matched");
  await h.click(h.button("Swap texts"));
  await absentResults(h);
  await sameValue(h.document, FOUR);
  await sameValue(h.source, TEN);
  await check(h, "100%", { matched: 4, eligible: 4, sourceCharacters: [TEN.length] });
  await expect(h.result.locator(".sim-evidence-pane").nth(1)).toContainText("40% of this source matched");
});

scenario("compare / duplicate sources retain separate evidence without inflating the union", async (h) => {
  await fixture(h, { source: FOUR, extra: true });
  await check(h, "40%", { matched: 4, eligible: 10, sourceCharacters: [FOUR.length, FOUR.length] });
  await summaryValue(h, "Supplied sources checked", 2);
  await expect(h.cards).toHaveCount(2);
  await expect(h.result.locator(".sim-source-results b")).toHaveText(["40%", "40%"]);
  await visibleText(h.result.locator(".sim-explain-line"), "Source percentages can overlap; they are not added together.");
});

scenario("compare / Unicode, punctuation, apostrophes and case controls keep original text", async (h) => {
  const draft = "🙂 CAFÉ, ＦＯＯ don’t １２３.\n";
  const source = "cafe\u0301 foo don't 123";
  await fixture(h, { draft, source });
  await check(h, "100%", { matched: 4, eligible: 4 });
  await literalText(h.workspace.getByLabel("Document matching highlights", { exact: true }), draft);
  await literalText(h.workspace.getByLabel("Source matching highlights", { exact: true }), source);
  await h.checkbox("Ignore case", false);
  await absentResults(h);
  await check(h, "0%", { matched: 0, eligible: 4 });
  await h.checkbox("Ignore case", true);
  await h.text("document", "café beta gamma delta");
  await h.text("source", "cafe beta gamma delta");
  await check(h, "0%", { matched: 0, eligible: 4 });
  await expect(h.result.locator(".sim-no-matches")).toContainText("does not establish originality");
});

scenario("compare / markup-like input is inert and both highlight panes round-trip exactly", async (h) => {
  const text = '  alpha beta gamma delta\n<img src="https://example.invalid/SyntheticMarkup984">\n<script>window.SyntheticMarkup984=true</script>\n<iframe src="https://example.invalid/frame984"></iframe>  ';
  await fixture(h, { draft: text, source: text });
  await check(h, "100%");
  for (const name of ["Document matching highlights", "Source matching highlights"]) await literalText(h.workspace.getByLabel(name, { exact: true }), text);
  expect(await h.page.evaluate(() => Object.hasOwn(window, "SyntheticMarkup984"))).toBe(false);
  expect(h.requests.some((request) => request.origin === "https://example.invalid")).toBe(false);
});

scenario("compare / paired quotes plus trailing references can leave N/A, never an originality score", async (h) => {
  const text = '"alpha beta gamma delta"\nReferences\nepsilon zeta eta theta';
  await fixture(h, { draft: text, source: text });
  await check(h, "100%", { matched: 9, eligible: 9 });
  await h.checkbox("Exclude quotes", true);
  await h.checkbox("Exclude references", true);
  await check(h, "N/A", { matched: 0, eligible: 0 });
  await summaryValue(h, "Excluded by your rules", 9);
  const highlights = h.workspace.getByLabel("Document matching highlights", { exact: true });
  await literalText(highlights, text);
  await expect(highlights.locator("mark")).toHaveCount(0);
  await expect(highlights.locator(".sim-excluded")).toHaveCount(2);
  const { details } = await showMethod(h);
  await expect(details).toContainText("no eligible words remain after exclusions");
  await expect(details).toContainText("Coverage is unavailable, not a uniqueness score");
});

scenario("repeat / fictional example has two exact groups and two copies beyond first occurrences", async (h) => {
  await h.click(h.button("Repeated sentences"));
  await example(h, { repeat: true });
  await check(h, "2", { repeat: true });
  await visibleText(h.result.locator(".sim-summary-primary > p"), "2 copies beyond the first occurrences");
  await expect(h.cards).toHaveCount(2);
  await literalText(h.workspace.getByLabel("Repeated sentence highlights", { exact: true }), REPETITION_SAMPLE);
  const before = await h.page.locator("#sim-repeat-current").evaluate((element) => {
    const range = document.createRange();
    range.selectNodeContents(element.parentElement);
    range.setEndBefore(element);
    return range.toString().length;
  });
  await h.click(h.cards.first().getByRole("button", { name: "Go to 2", exact: true }));
  const after = await h.page.locator("#sim-repeat-current").evaluate((element) => {
    const range = document.createRange();
    range.selectNodeContents(element.parentElement);
    range.setEndBefore(element);
    return range.toString().length;
  });
  expect(after).toBeGreaterThan(before);
  await visibleText(h.page.locator("#sim-repeat-current"), "The project team checks every reference before sharing the final report.");
  await h.click(h.cards.nth(1).getByRole("button", { name: "Go to 2", exact: true }));
  await visibleText(h.page.locator("#sim-repeat-current"), "Clear source notes make it easier for an editor to follow the argument.");
});

scenario("repeat / quoted exclusions lower group counts and a unique sentence reports zero, not originality", async (h) => {
  await h.click(h.button("Repeated sentences"));
  await h.select("Minimum match", 4);
  const text = '"Alpha beta gamma delta."\n"Alpha beta gamma delta."\nOrange violet copper silver.\nOrange violet copper silver.';
  await h.text("document", text);
  await check(h, "2", { repeat: true });
  await h.checkbox("Exclude quotes", true);
  await check(h, "1", { repeat: true });
  await visibleText(h.result.locator(".sim-summary-primary > p"), "1 copies beyond the first occurrences");
  await h.text("document", "A unique fictional sentence keeps careful source notes.");
  await check(h, "0", { repeat: true });
  await expect(h.cards).toHaveCount(0);
  await visibleText(h.result.locator(".sim-no-matches"), "No repeated sentences met your settings. This says nothing about whether the wording appears in an external source.");
  await visibleText(h.result.locator(".sim-summary-primary small"), "No originality or authorship score is assigned.");
});

const invalidations = [
  ["document edit", async (h) => h.text("document", `${TEN}!`)],
  ["source edit", async (h) => h.text("source", `${TEN}!`)],
  ["source label edit", async (h) => h.fill(h.sourceLabel, "ChangedFictionalLabel984", "changed-label")],
  ["minimum match change", async (h) => h.select("Minimum match", 6)],
  ["case option", async (h) => h.checkbox("Ignore case", false)],
  ["quote option", async (h) => h.checkbox("Exclude quotes", true)],
  ["reference option", async (h) => h.checkbox("Exclude references", true)],
  ["source removal", async (h) => {
    await h.click(h.workspace.locator(".sim-source-tabs").getByRole("button", { name: /^Source 2(?:\s|$)/ }));
    await h.click(h.button("Remove Source 2"));
  }],
  ["swap", async (h) => h.click(h.button("Swap texts"))],
  ["mode changes in both directions", async (h) => {
    await h.click(h.button("Repeated sentences"));
    await absentResults(h);
    await check(h, "0", { repeat: true });
    await h.click(h.button("Compare sources"));
  }],
  ["add source", async (h) => {
    await h.click(h.workspace.getByRole("button", { name: /^Add \(1\/5\)$/ }));
  }],
];
for (const [name, action] of invalidations) scenario(`state / ${name} invalidates the result, report and reviews`, async (h) => {
  await reviewedFixture(h, { extra: name === "source removal" });
  await action(h);
  await absentResults(h);
  await expect(h.workspace.getByRole("textbox", { name: /^Note/ })).toHaveCount(0);
  if (name === "add source") await h.text("source", TEN);
  await check(h, "100%");
  await expect(h.cards.first().getByRole("combobox", { name: "Your review", exact: true })).toHaveValue("unreviewed");
  await sameValue(h.cards.first().getByRole("textbox", { name: /^Note/ }), "");
  await expect(h.report).toHaveCount(0);
});

scenario("state / cancelling Clear keeps the completed draft and reviews; confirming removes them", async (h) => {
  const report = await reviewedFixture(h);
  await h.click(h.button("Clear all text and review notes"));
  await expect(h.confirmation).toContainText("Clear this workspace?");
  await h.click(h.confirmation.getByRole("button", { name: "Keep current text", exact: true }));
  await keptReview(h, report);
  await h.click(h.button("Clear all text and review notes"));
  await h.click(h.confirmation.getByRole("button", { name: "Yes, clear all", exact: true }));
  await absentResults(h);
  await sameValue(h.document, "");
  await sameValue(h.source, "");
  await sameValue(h.sourceLabel, "Source 1");
  await expect(h.button("Compare texts")).toBeDisabled();
  await visibleText(h.status, "All text and review notes cleared from this workspace.");
});

scenario("state / cancelling Example keeps reviews; accepting replaces text and clears the old report", async (h) => {
  const report = await reviewedFixture(h);
  await h.click(h.button("Try an example"));
  await expect(h.confirmation).toContainText("Replace your text with an example?");
  await h.click(h.confirmation.getByRole("button", { name: "Keep current text", exact: true }));
  await keptReview(h, report);
  await example(h, { replace: true });
  await absentResults(h);
  await check(h, "31.4%", { matched: 22, eligible: 70 });
  await summaryValue(h, "Evidence reviewed", "0 / 2");
});

const rejectedImports = [
  { name: "unsupported PDF", file: "unsupported984.pdf", bytes: Buffer.from("%PDF-1.7\nSynthetic text only"), error: /PDF and Word files are not supported/, reads: 0 },
  { name: "invalid UTF-8", file: "invalid-utf8984.txt", bytes: Buffer.from([0xc3, 0x28]), error: /could not be read as UTF-8/, reads: 1 },
  { name: "NUL", file: "nul984.txt", bytes: Buffer.from("before\u0000after"), error: /binary data/, reads: 1 },
  { name: "binary control", file: "binary984.txt", bytes: Buffer.from("before\u0007after"), error: /binary data/, reads: 1 },
  { name: "over 256 KB", file: "bytes984.txt", bytes: Buffer.alloc(256 * 1024 + 1, 97), error: /exceeds 256 KB/, reads: 0 },
  { name: "over 60,000 characters", file: "characters984.md", bytes: Buffer.from("x".repeat(60_001)), error: /at most 60,000 characters/, reads: 1 },
  { name: "over 10,000 words", file: "words984.txt", bytes: Buffer.from(Array(10_100).fill("a").join(" ")), error: /at most 10,000 words/, reads: 1 },
];
for (const [index, entry] of rejectedImports.entries()) scenario(`import / ${entry.name} preserves inputs, completed report and reviewer notes`, async (h) => {
  const report = await reviewedFixture(h);
  const before = await h.readProbe();
  await upload(h, { name: entry.file, mimeType: entry.file.endsWith(".pdf") ? "application/pdf" : "text/plain", buffer: entry.bytes }, index % 2 ? "Source text" : "Document text");
  const alert = h.workspace.getByRole("alert");
  await expect(alert).toBeVisible();
  await expect(alert).toContainText(entry.error);
  await keptReview(h, report);
  await expect(h.confirmation).toHaveCount(0);
  await expect(h.button("Compare texts")).toBeEnabled();
  const after = await h.readProbe();
  expect(after.workers.length).toBe(before.workers.length);
  expect(after.files.length - before.files.length).toBe(entry.reads);
});

scenario("import / valid native Markdown replacement needs confirmation; Cancel keeps the report", async (h) => {
  const report = await reviewedFixture(h);
  const imported = "# alpha beta gamma delta\n\nCafé e\u0301 🧪\n";
  const file = { name: "fictional-notes984.md", mimeType: "text/markdown", buffer: Buffer.from(imported, "utf8") };
  await upload(h, file);
  await expect(h.confirmation).toBeVisible();
  await expect(h.confirmation).toContainText(`Replace text with ${file.name}?`);
  await keptReview(h, report);
  await h.click(h.confirmation.getByRole("button", { name: "Keep current text", exact: true }));
  await keptReview(h, report);
  // Selecting the same file again must still trigger the native change handler.
  await upload(h, file);
  await expect(h.confirmation).toBeVisible();
  await h.click(h.confirmation.getByRole("button", { name: "Replace text", exact: true }));
  await sameValue(h.document, imported);
  await sameValue(h.source, TEN);
  await absentResults(h);
  await visibleText(h.status, "Text replaced with your local file. Run a new check.");
  await check(h, "66.7%", { matched: 4, eligible: 6 });
  await summaryValue(h, "Evidence reviewed", "0 / 1");
});

scenario("import / native UTF-8 Markdown into blank inputs is local and preserves exact characters", async (h) => {
  const text = "# Café writers keep careful source notes.\n\n🙂\n";
  const file = { name: "blank-draft984.md", mimeType: "text/markdown", buffer: Buffer.from(text, "utf8") };
  await upload(h, file);
  await sameValue(h.document, text);
  await expect(h.confirmation).toHaveCount(0);
  await visibleText(h.status, "Text imported locally. No file was uploaded.");
  await upload(h, { ...file, name: "blank-source984.md" }, "Source text");
  await sameValue(h.source, text);
  await expect(h.confirmation).toHaveCount(0);
  await check(h, "100%", { sourceCharacters: [text.length] });
});

scenario("import fault / delayed native arrayBuffer cannot overwrite a newer edit", async (h) => {
  await reviewedFixture(h);
  await upload(h, { name: "delayed-import984.md", mimeType: "text/markdown", buffer: Buffer.from("This pending import must never replace the newer draft.") });
  await visibleText(h.button("Reading local file…"), "Reading local file…");
  await expect(h.button("Reading local file…")).toBeDisabled();
  await expect.poll(async () => (await h.readProbe()).files.filter((file) => file.pending && file.held).length).toBe(1);
  await expect(h.result).toBeVisible();
  const newer = `${TEN} newer`;
  await h.text("document", newer);
  await absentResults(h);
  await expect(h.button("Compare texts")).toBeEnabled();
  await h.page.evaluate(() => window.__similarityBrowserProbe.releaseImports());
  await expect.poll(async () => (await h.readProbe()).files.filter((file) => file.pending).length).toBe(0);
  await sameValue(h.document, newer);
  await absentResults(h);
  await expect(h.confirmation).toHaveCount(0);
  await expect(h.status).not.toContainText("imported");
  await check(h, "90.9%", { matched: 10, eligible: 11 });
}, { fileMode: "hold" });

scenario("import fault / a read rejection is sanitized and preserves the completed review", async (h) => {
  const report = await reviewedFixture(h);
  await upload(h, { name: "read-error984.txt", mimeType: "text/plain", buffer: Buffer.from("Fictional text that the injected read error will reject.") });
  const alert = h.workspace.getByRole("alert");
  await expect(alert).toBeVisible();
  await expect(alert).toContainText("could not be read as UTF-8");
  await expect(alert).not.toContainText("SYNTHETIC_READER_INTERNAL_DETAIL");
  await keptReview(h, report);
}, { fileMode: "reject" });

scenario("limits / a typed 60,001-character replacement keeps the prior text and completed review", async (h) => {
  const report = await reviewedFixture(h);
  const oversized = "x".repeat(60_001);
  h.track(oversized, "over-character-limit");
  await h.document.fill(oversized);
  await expect(h.workspace.getByRole("alert")).toBeVisible();
  await expect(h.workspace.getByRole("alert")).toContainText("The previous text was kept; paste a smaller section.");
  await keptReview(h, report);
  await visibleText(h.workspace.locator("#similarity-draft-count span").nth(1), `${TEN.length} / 60,000 chars`);
});

scenario("limits / 10,100 words and punctuation-only input show errors without a worker or result", async (h) => {
  await fixture(h);
  await h.text("document", Array(10_100).fill("a").join(" "));
  await expect(h.document).toHaveAttribute("aria-invalid", "true");
  await h.click(h.button("Compare texts"));
  await expect(h.workspace.getByRole("alert")).toBeVisible();
  await expect(h.workspace.getByRole("alert")).toContainText("Your document: Use at most 10,000 words");
  await absentResults(h);
  await h.text("document", "!?…—_ 🙂");
  await h.click(h.button("Compare texts"));
  await expect(h.workspace.getByRole("alert")).toContainText("Your document: Add text containing words, not just punctuation.");
  await absentResults(h);
  expect((await h.readProbe()).workers).toHaveLength(0);
});

scenario("limits / CJK segmentation warning is visible and method details support click and Space", async (h) => {
  await fixture(h, { draft: "中文文本没有空格。日本語も空白なし。" });
  await check(h, "0%", { matched: 0, eligible: 2 });
  const { details, summary } = await showMethod(h);
  await expect(details.locator("ul")).toContainText("Chinese and Japanese may be under-segmented");
  await summary.press("Space");
  await expect(details).not.toHaveAttribute("open");
  await expect(details.locator("ul")).not.toBeVisible();
  await summary.press("Space");
  await expect(details).toHaveAttribute("open", "");
  await expect(details.locator("ul")).toBeVisible();
});

scenario("sources / limit is five, native tabs retain exact texts, removing activates the first remaining source", async (h) => {
  await fixture(h, { label: "Source 1" });
  for (let count = 1; count < 5; count++) {
    await h.click(h.workspace.getByRole("button", { name: new RegExp(`^Add \\(${count}\\/5\\)$`) }));
    await sameValue(h.sourceLabel, `Source ${count + 1}`);
    await h.text("source", `${TEN}${"!".repeat(count)}`);
  }
  await expect(h.workspace.locator(".sim-source-tabs button")).toHaveCount(5);
  await expect(h.workspace.getByRole("button", { name: /^Add \(5\/5\)$/ })).toBeDisabled();
  for (let index = 0; index < 5; index++) {
    const tab = h.workspace.locator(".sim-source-tabs button").nth(index);
    await h.click(tab);
    await expect(tab).toHaveAttribute("aria-pressed", "true");
    await sameValue(h.source, `${TEN}${"!".repeat(index)}`);
  }
  await check(h, "100%", { sourceCharacters: Array.from({ length: 5 }, (_, index) => TEN.length + index) });
  await summaryValue(h, "Supplied sources checked", 5);
  await h.click(h.workspace.locator(".sim-source-tabs button").nth(2));
  await h.click(h.button("Remove Source 3"));
  await absentResults(h);
  await expect(h.workspace.locator(".sim-source-tabs button")).toHaveCount(4);
  await expect(h.workspace.locator(".sim-source-tabs button").first()).toHaveAttribute("aria-pressed", "true");
  await sameValue(h.sourceLabel, "Source 1");
  await sameValue(h.source, TEN);
  await expect(h.workspace.getByRole("button", { name: /^Add \(4\/5\)$/ })).toBeEnabled();
});

scenario("search / only explicit preview constructs one quoted Google query; cancel and edit remove it", async (h) => {
  await h.click(h.button("Repeated sentences"));
  const text = "Café writers keep careful notes about alpha & beta + gamma #50% in this entirely fictional draft.";
  await h.text("document", text);
  await check(h, "0", { repeat: true });
  const google = h.workspace.getByRole("link", { name: "Open Google search", exact: true });
  await expect(google).toHaveCount(0);
  const preview = h.workspace.getByRole("group", { name: "Manual search preview", exact: true });
  await h.click(h.button("Preview search").first());
  await expect(preview).toBeVisible();
  await expect(preview).toContainText("This sends the query to Google.");
  await expect(preview).toContainText("Do not send confidential text");
  await expect(google).toBeVisible();
  const query = await preview.locator("blockquote").textContent();
  const url = new URL(await google.getAttribute("href"));
  expect(url.origin).toBe("https://www.google.com");
  expect(url.pathname).toBe("/search");
  expect(url.username + url.password + url.hash).toBe("");
  expect([...url.searchParams.keys()]).toEqual(["q"]);
  expect(url.searchParams.get("q")).toBe(query);
  expect(query.startsWith('"') && query.endsWith('"')).toBe(true);
  expect(Array.from(query.slice(1, -1)).length).toBeLessThanOrEqual(180);
  await expect(google).toHaveAttribute("target", "_blank");
  await expect(google).toHaveAttribute("rel", "noopener noreferrer");
  await expect(google).toHaveAttribute("referrerpolicy", "no-referrer");
  // Deliberately inspect href only. Never click the external search link.
  await h.click(h.button("Cancel search"));
  await expect(preview).toHaveCount(0);
  await expect(google).toHaveCount(0);
  await h.click(h.button("Preview search").first());
  await expect(preview).toBeVisible();
  await h.text("document", `${text} Newer text cancels that query.`);
  await absentResults(h);
  await expect(google).toHaveCount(0);
  expect(h.requests.filter((request) => request.origin === "https://www.google.com" && request.path === "/search")).toHaveLength(0);
});

scenario("report / full versus stats-only privacy and two native UTF-8 TXT downloads", async (h) => {
  const full = await reviewedFixture(h);
  for (const line of [`SOURCE 1: ${PRIVATE_LABEL}`, `Document: ${TEN}`, `Source: ${TEN}`, `Reviewer note: ${REVIEW_NOTE}`, "Reviewer status: Citation checked", "Matched passages included: yes"]) {
    expect(full.split("\n").includes(line), `Full report must include ${line.split(":")[0]}`).toBe(true);
  }
  await downloadReport(h, "full");
  await h.checkbox("Include matched passages, source labels and notes", false);
  const stats = await h.reportText.inputValue();
  expect(stats).toContain("Matched passages included: no (notes and text omitted)");
  expect(stats).toContain("SOURCE 1: Label omitted");
  expect(stats).toContain("Reviewer status: Citation checked");
  for (const forbidden of [PRIVATE_LABEL, TEN, REVIEW_NOTE, "Reviewer note:", "\nDocument:", "\nSource:"]) expect(stats.includes(forbidden), "Stats-only output must omit labels, source/draft passages and notes").toBe(false);
  await downloadReport(h, "stats-only");
  expect(h.downloadEvents).toBe(2);
  await h.click(h.report.getByRole("button", { name: "Close report", exact: true }));
  await expect(h.report).toHaveCount(0);
  await visibleText(h.coverage, "100%");
});

scenario("clipboard injected success / native Copy button sends the exact preview, not the system clipboard", async (h) => {
  const report = await reviewedFixture(h);
  await h.click(h.report.getByRole("button", { name: "Copy report", exact: true }));
  await visibleText(h.report.locator(".sim-copy-notice"), "Report with passages and notes copied. Review it before sharing.");
  expect(await h.page.evaluate((expected) => window.__similarityBrowserProbe.clipboardCopies[0] === expected, report)).toBe(true);
  expect((await h.readProbe()).clipboardLengths).toEqual([report.length]);
}, { clipboardMode: "capture" });

scenario("clipboard fault / rejected access selects the exact report for manual copy", async (h) => {
  const report = await reviewedFixture(h);
  await h.click(h.report.getByRole("button", { name: "Copy report", exact: true }));
  await visibleText(h.report.locator(".sim-copy-notice"), "Clipboard access was blocked. Select the report below and copy it manually.");
  await expect(h.reportText).toBeFocused();
  expect(await h.reportText.evaluate((element) => [element.selectionStart, element.selectionEnd])).toEqual([0, report.length]);
  await sameValue(h.reportText, report);
  await expect(h.report.getByRole("button", { name: "Copy report", exact: true })).toBeEnabled();
}, { clipboardMode: "reject" });

scenario("clipboard fault / pending copy is single-flight and warns when the preview revision changed", async (h) => {
  const original = await reviewedFixture(h);
  await h.click(h.report.getByRole("button", { name: "Copy report", exact: true }));
  await expect(h.report.getByRole("button", { name: "Copying…", exact: true })).toBeDisabled();
  await expect.poll(async () => (await h.readProbe()).clipboardPending).toBe(1);
  await h.click(h.button("Compare texts"));
  await expect(h.workspace.getByRole("alert")).toBeVisible();
  await expect(h.workspace.getByRole("alert")).toContainText("Wait for the pending clipboard copy to finish");
  await sameValue(h.reportText, original);
  await h.checkbox("Include matched passages, source labels and notes", false);
  const changed = await h.reportText.inputValue();
  expect(changed === original).toBe(false);
  await expect(h.report.getByRole("button", { name: "Copying…", exact: true })).toBeDisabled();
  expect((await h.readProbe()).clipboardLengths).toEqual([original.length]);
  await h.page.evaluate(() => window.__similarityBrowserProbe.releaseClipboard());
  await visibleText(h.report.locator(".sim-copy-notice"), "An earlier report was copied, not the changed preview. Copy the current report again before sharing.");
  expect(await h.page.evaluate((expected) => window.__similarityBrowserProbe.clipboardCopies[0] === expected, original)).toBe(true);
  await sameValue(h.reportText, changed);
  await h.click(h.report.getByRole("button", { name: "Copy report", exact: true }));
  await expect.poll(async () => (await h.readProbe()).clipboardLengths.length).toBe(2);
  await h.page.evaluate(() => window.__similarityBrowserProbe.releaseClipboard());
  await visibleText(h.report.locator(".sim-copy-notice"), "Stats-only report copied. Review it before sharing.");
  expect(await h.page.evaluate((expected) => window.__similarityBrowserProbe.clipboardCopies[1] === expected, changed)).toBe(true);
  expect((await h.readProbe()).workers).toHaveLength(1);
}, { clipboardMode: "hold" });

scenario("worker fault / unsupported Worker reports a clear local error and retains inputs", async (h) => {
  await fixture(h);
  await h.click(h.button("Compare texts"));
  await expect(h.workspace.getByRole("alert")).toBeVisible();
  await expect(h.workspace.getByRole("alert")).toContainText("does not support background workers");
  await sameValue(h.document, TEN);
  await sameValue(h.source, TEN);
  await absentResults(h);
  expect((await h.readProbe()).workers).toHaveLength(0);
}, { workerMode: "unsupported" });

scenario("worker fault / constructor failure uses a fixed error and keeps editable inputs", async (h) => {
  await fixture(h);
  await h.click(h.button("Compare texts"));
  await expect(h.workspace.getByRole("alert")).toBeVisible();
  await expect(h.workspace.getByRole("alert")).toContainText("The local worker could not start. Your inputs were kept");
  await expect(h.workspace.getByRole("alert")).not.toContainText("SYNTHETIC_WORKER_START_DETAIL");
  await sameValue(h.document, TEN);
  await expect(h.document).toBeEditable();
  await absentResults(h);
  expect((await h.readProbe()).constructorFailures).toBe(1);
}, { workerMode: "constructor-error" });

scenario("worker fault / native-worker error is prevented and a retry accepts only its new result", async (h) => {
  await fixture(h);
  await heldCheck(h);
  await h.page.evaluate(() => window.__similarityBrowserProbe.injectWorkerError(0));
  await expect(h.workspace.getByRole("alert")).toBeVisible();
  await expect(h.workspace.getByRole("alert")).toContainText("The local comparison worker could not run");
  await absentResults(h);
  await h.allWorkersTerminated(1);
  await h.text("source", FOUR);
  await heldCheck(h);
  await releaseMessages(h);
  await visibleText(h.coverage, "40%");
  await expect(h.workspace.getByRole("alert")).toHaveCount(0);
  await h.allWorkersTerminated(2);
  expect((await h.readProbe()).preventedErrors).toBe(1);
}, { workerMode: "hold" });

scenario("worker fault / Cancel terminates the native worker and ignores its late response", async (h) => {
  await fixture(h);
  await heldCheck(h);
  await h.click(h.button("Cancel"));
  await absentResults(h);
  await visibleText(h.status, "Check cancelled. Your text was kept and no partial result was used.");
  await sameValue(h.document, TEN);
  await sameValue(h.source, TEN);
  await h.allWorkersTerminated(1);
  await releaseMessages(h);
  await absentResults(h);
  await visibleText(h.status, "Check cancelled. Your text was kept and no partial result was used.");
}, { workerMode: "hold" });

scenario("worker fault / editing in flight stops busy state and discards the late native response", async (h) => {
  await fixture(h);
  await heldCheck(h);
  const newer = `${TEN} lambda`;
  await h.text("document", newer);
  await absentResults(h);
  await expect(h.button("Compare texts")).toBeEnabled();
  await h.allWorkersTerminated(1);
  await releaseMessages(h);
  await absentResults(h);
  await sameValue(h.document, newer);
  await check(h, "90.9%", { matched: 10, eligible: 11 });
}, { workerMode: "hold" });

scenario("worker fault / virtual 15-second deadline shows no partial score and rejects late delivery", async (h) => {
  await fixture(h);
  // Fake timers only in this fault context; the Worker still executes natively.
  await h.page.clock.install();
  await heldCheck(h);
  await h.page.clock.fastForward(15_001);
  await expect(h.workspace.getByRole("alert")).toBeVisible();
  await expect(h.workspace.getByRole("alert")).toContainText("15-second limit. Compare a smaller section; no partial score is shown.");
  await absentResults(h);
  await h.allWorkersTerminated(1);
  await releaseMessages(h);
  await absentResults(h);
  await expect(h.workspace.getByRole("alert")).toContainText("15-second limit");
  await sameValue(h.document, TEN);
  await check(h, "100%", { matched: 10, eligible: 10 });
}, { workerMode: "hold" });

scenario("worker fault / an old worker error cannot erase a newer completed comparison", async (h) => {
  await fixture(h);
  await heldCheck(h);
  await h.text("source", EIGHT);
  await absentResults(h);
  await heldCheck(h);
  await releaseMessages(h);
  await visibleText(h.coverage, "80%");
  await h.allWorkersTerminated(2);
  await annotate(h);
  const report = await openReport(h);
  await h.page.evaluate(() => window.__similarityBrowserProbe.injectWorkerError(0));
  await visibleText(h.coverage, "80%");
  await sameValue(h.reportText, report);
  await sameValue(h.cards.first().getByRole("textbox", { name: /^Note/ }), REVIEW_NOTE);
  await expect(h.workspace.getByRole("alert")).toHaveCount(0);
}, { workerMode: "hold" });

scenario("privacy / reload clears draft, sources and notes without requiring all site storage to be empty", async (h) => {
  await reviewedFixture(h, { extra: true });
  const storage = await h.page.evaluate(() => {
    const read = (store) => Array.from({ length: store.length }, (_, index) => {
      const key = store.key(index);
      return [key, store.getItem(key)];
    });
    return { local: read(localStorage), session: read(sessionStorage) };
  });
  for (const entries of Object.values(storage)) {
    for (const [key, value] of entries) {
      for (const text of [TEN, PRIVATE_LABEL, REVIEW_NOTE]) expect(`${key}\n${value}`.includes(text), "Tool text must not be automatically stored; theme keys are allowed").toBe(false);
    }
  }
  h.storageKeys = { local: storage.local.map(([key]) => key), session: storage.session.map(([key]) => key) };
  await h.allWorkersTerminated(1);
  h.probeArchives.push(await h.readProbe());
  h.generation++;
  h.phase = "reload-baseline";
  const response = await h.page.reload({ waitUntil: "load" });
  expect(response.status()).toBe(200);
  await h.ready();
  await sameValue(h.document, "");
  await sameValue(h.source, "");
  await sameValue(h.sourceLabel, "Source 1");
  await expect(h.workspace.locator(".sim-source-tabs button")).toHaveCount(1);
  await absentResults(h);
  await expect(h.button("Compare texts")).toBeDisabled();
  await expect(h.workspace.getByRole("textbox", { name: /^Note/ })).toHaveCount(0);
});

for (const width of [1440, 390, 768, 320]) for (const theme of ["light", "dark"]) {
  scenario(`responsive / ${width}px ${theme}, initial inputs, five tabs, compare/report and repeat/report`, async (h) => {
    const currentlyDark = await h.page.locator("html").evaluate((element) => element.classList.contains("dark"));
    if (currentlyDark !== (theme === "dark")) await h.click(h.page.getByRole("button", { name: "Toggle theme", exact: true }));
    if (theme === "dark") await expect(h.page.locator("html")).toHaveClass(/(?:^|\s)dark(?:\s|$)/);
    else await expect(h.page.locator("html")).not.toHaveClass(/(?:^|\s)dark(?:\s|$)/);
    await expect(h.document).toBeVisible();
    await expect(h.source).toBeVisible();
    await expect(h.sourceLabel).toBeVisible();
    await expect(h.workspace.getByLabel("Minimum match", { exact: true })).toBeVisible();
    await assertLayout(h, "initial");
    const capture = width === 1440 || width === 390;
    if (capture) {
      await screenshot(h, `${width}-${theme}-top-hero`, h.page.locator(".sim-hero"));
      await screenshot(h, `${width}-${theme}-workspace-inputs`, h.workspace.locator(".sim-input-grid"));
    }
    for (let count = 1; count < 5; count++) await h.click(h.workspace.getByRole("button", { name: new RegExp(`^Add \\(${count}\\/5\\)$`) }));
    await h.fill(h.sourceLabel, `Fictional_${"L".repeat(90)}`, "long-label");
    await expect(h.workspace.getByRole("button", { name: /^Add \(5\/5\)$/ })).toBeDisabled();
    await assertLayout(h, "five source tabs and 100-character source label");
    await example(h); // Empty text, despite five labeled source slots: no prompt.
    await check(h, "31.4%", { matched: 22, eligible: 70 });
    await annotate(h);
    await assertLayout(h, "comparison results");
    if (capture) {
      await screenshot(h, `${width}-${theme}-results-summary`, h.result.locator(".sim-summary-grid"));
      await screenshot(h, `${width}-${theme}-results-evidence`, h.result.locator(".sim-evidence-grid"));
    }
    await openReport(h);
    await assertLayout(h, "comparison report");
    if (capture) await screenshot(h, `${width}-${theme}-comparison-report`, h.report);
    await h.click(h.button("Repeated sentences"));
    await absentResults(h);
    await expect(h.source).toHaveCount(0);
    await example(h, { repeat: true, replace: true });
    await check(h, "2", { repeat: true });
    await openReport(h);
    await assertLayout(h, "single-text repetition report");
    if (capture) await screenshot(h, `${width}-${theme}-repetition-report`, h.report);
    await expect(h.page.locator("#similarity-faq dd")).toHaveCount(5);
    for (const answer of await h.page.locator("#similarity-faq dd").all()) await expect(answer).toBeVisible();
  }, { width });
}

async function verifyHealthy(h) {
  await Promise.all(h.popupChecks);
  await h.allWorkersTerminated();
  expect(h.pageErrors, "All browser pageerrors fail, including unhandled application exceptions").toEqual([]);
  expect(h.networkErrors, "The network guard must not silently fail").toEqual([]);
  expect(h.violations, "Unexpected local mutations/routes are blocked and fail the case").toEqual([]);
  expect(h.sockets, "No websocket is needed by the production tool").toEqual([]);
  expect(h.dialogs, "App confirmations must be native accessible in-page controls, not unexpected dialogs").toBe(0);
  expect(h.popups, "Manual external links must never actually be opened").toBe(0);
  expect(h.unexpectedDownloads).toBe(0);
  expect(h.requests.filter((request) => request.inputMatches.length).map((request) => ({ method: request.method, type: request.type, origin: request.origin, inputMatches: request.inputMatches })),
    "No request may contain tested synthetic inputs, even if the guard blocked it").toEqual([]);
  expect(h.requests.filter((request) => request.allowed && (request.origin !== ORIGIN || request.method !== "GET"))).toEqual([]);
  if (h.javaScriptEnabled) {
    const probe = await h.readProbe();
    expect(probe.files.some((file) => file.pending), "Import test gates must not remain pending").toBe(false);
    expect(probe.clipboardPending, "Clipboard test gates must not remain pending").toBe(0);
  }
}

async function archiveHarness(h) {
  let finalProbe = null;
  if (!h.page.isClosed()) finalProbe = await h.readProbe().catch(() => null);
  const phases = {};
  for (const request of h.requests) {
    const phase = phases[request.phase] ??= { allowedLoopbackGets: 0, localBlobDownloads: 0, blockedExternal: 0, blockedFrameworkPrefetch: 0, blockedRemoteImageProxy: 0, otherBlockedLocal: 0, inputBearingRequests: 0, fetchOrXHR: 0 };
    if (request.allowed && request.localBlobDownload) phase.localBlobDownloads++;
    else if (request.allowed) phase.allowedLoopbackGets++;
    else if (request.origin !== ORIGIN) phase.blockedExternal++;
    else if (request.blockedImageProxy) phase.blockedRemoteImageProxy++;
    else if (request.frameworkPrefetch) phase.blockedFrameworkPrefetch++;
    else phase.otherBlockedLocal++;
    if (request.inputMatches.length) phase.inputBearingRequests++;
    if (["fetch", "xhr", "ping"].includes(request.type)) phase.fetchOrXHR++;
  }
  return {
    networkByPhase: phases, requests: h.requests, explicitHttpProbes: h.apiRequests,
    pageErrors: h.pageErrors, consoleErrors: h.consoleErrors, networkGuardErrors: h.networkErrors,
    violations: h.violations, webSockets: h.sockets, dialogs: h.dialogs, popups: h.popups,
    internalEdgeDownloadHubs: h.downloadHubs, secondaryPages: h.secondaryPages,
    nativeWorkers: h.nativeWorkers, probeGenerations: [...h.probeArchives, ...(finalProbe ? [finalProbe] : [])],
    inputLengths: h.inputLengths, storageKeys: h.storageKeys,
    layouts: h.layoutMeasurements, pointerActions: h.pointerActions, downloadEvents: h.downloadEvents,
  };
}

async function main() {
  const args = process.argv.slice(2);
  assert(args.length === 0 || (args.length === 2 && args[0] === "--from" && /^[1-9]\d*$/.test(args[1])), "Use no arguments for all cases, or --from <case> for explicit focused debugging. No URL/env overrides.");
  const firstCase = args.length ? Number(args[1]) : 1;
  assert(firstCase <= cases.length);
  const selectedCases = cases.slice(firstCase - 1);
  const startedAt = new Date().toISOString();
  let failure;
  let browserVersion;
  artifactDirectory = await mkdtemp(join(tmpdir(), "byteverse-similarity-browser-"));
  console.log(`ARTIFACT_DIRECTORY ${artifactDirectory}`);
  console.log(`Existing production preview only: ${TARGET}`);
  console.log(`${selectedCases.length} sequential cases${firstCase > 1 ? ` starting at ${firstCase} (focused run, not full validation)` : ""}; no server management, installs, external clicks or retries.`);
  try {
    browser = await chromium.launch({
      channel: "msedge", headless: true, downloadsPath: artifactDirectory,
      args: [
        "--disable-background-networking", "--disable-component-update", "--disable-domain-reliability", "--no-pings",
        // Routes block requests; DNS rules also prevent speculative external
        // preconnect/DNS work advertised by the site's original HTML head.
        "--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1, EXCLUDE localhost",
      ],
    });
    browserVersion = browser.version();
    for (const [selectedIndex, entry] of selectedCases.entries()) {
      const index = selectedIndex + firstCase - 1;
      let h;
      const result = { name: entry.name, status: "running", faultInjection: Object.fromEntries(Object.entries(entry.options).filter(([key]) => key.endsWith("Mode"))) };
      caseResults.push(result);
      try {
        h = await createHarness(entry, index);
        await entry.run(h);
        await verifyHealthy(h);
        result.status = "passed";
        console.log(`PASS ${index + 1}/${cases.length} ${entry.name}`);
      } catch (error) {
        result.status = "failed";
        result.error = safeError(error);
        if (error?.similarityAudit) result.audit = error.similarityAudit;
        if (h && !h.page.isClosed()) {
          const path = join(artifactDirectory, `${String(index + 1).padStart(2, "0")}-failure-viewport.png`);
          try {
            await h.page.screenshot({ path, fullPage: false, caret: "hide", timeout: 5_000 });
            screenshots.push({ case: entry.name, portion: "failure-viewport", path });
          } catch (captureError) { result.screenshotError = safeError(captureError); }
        }
        console.error(`FAIL ${index + 1}/${cases.length} ${entry.name}\n${result.error}`);
        throw error; // Fail fast. Never retry a click or case to conceal a failure.
      } finally {
        if (h) {
          try { result.audit = await archiveHarness(h); }
          finally { h.closing = true; await h.context.close(); }
        }
      }
    }
  } catch (error) {
    failure = safeError(error);
    process.exitCode = 1;
    if (!caseResults.some((result) => result.status === "failed")) console.error(`SETUP/CLEANUP FAILURE\n${failure}`);
  } finally {
    try { await browser?.close(); }
    catch (error) { failure ??= safeError(error); process.exitCode = 1; }
    const passed = caseResults.filter((result) => result.status === "passed").length;
    const manifest = {
      status: failure ? "failed" : "passed", startedAt, finishedAt: new Date().toISOString(),
      target: TARGET, productionCanonical: CANONICAL, browser: { channel: "msedge", headless: true, version: browserVersion },
      planned: selectedCases.length, passed, failed: caseResults.filter((result) => result.status === "failed").length,
      focusedRunStartsAt: firstCase,
      intentionallyNotSelected: cases.slice(0, firstCase - 1).map((entry) => entry.name),
      notRun: selectedCases.slice(caseResults.length).map((entry) => entry.name), failure,
      artifactDirectory, screenshots, downloads, cases: caseResults,
      limitations: [
        "The parent must refresh and serve its credential-free production copy before execution. This suite does not inspect environment files, provision a DB or start/refresh a server.",
        "Normal matching uses the real client and Next-built native Workers. Explicit delayed-delivery, Worker-error, File.arrayBuffer and clipboard cases inject faults.",
        "Clipboard success is captured in the isolated page; the system clipboard is never read or overwritten. TXT downloads are real native browser downloads, read back as UTF-8 bytes.",
        "External Google/manual guidance links are inspected only, never opened. All browser non-origin requests, websockets and remote Next image-proxy requests are blocked.",
        "Sitewide external fonts/images/analytics and Next prefetch attempts are counted separately from input-bearing requests. Passing is not a claim that the whole site emits zero HTTP or uses no storage.",
        "Synthetic-input matching checks tested literal/normalized/URL/JSON/base64 canaries, not every possible encoding or covert channel. Strict origin/method/path blocking supplies the primary network boundary.",
        "Viewport screenshots and virtual-clock fault tests are not physical-device certification, visual pixel baselines, or timing/performance guarantees. Large report text-budget and exhaustive engine edge cases remain in the separate core/UI suites.",
      ],
    };
    const artifactJson = join(artifactDirectory, "artifacts.json");
    await writeFile(artifactJson, `${JSON.stringify(manifest, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
    console.log(`ARTIFACT_JSON ${artifactJson}`);
    console.log(JSON.stringify({ status: manifest.status, planned: selectedCases.length, firstCase, passed, failed: manifest.failed, notRun: manifest.notRun.length, screenshots: screenshots.length, downloads: downloads.length, artifactDirectory, artifactJson }, null, 2));
  }
}

await main();