/**
 * Run with Node against the PARENT'S already-built, credential-free preview.
 * Default: http://127.0.0.1:3066/tools/csv-diff
 * Options ONLY: --baseURL=<loopback-origin> and --filter=<case-name-substring>.
 * A filter is always reported as PARTIAL. Unknown/duplicate/non-loopback args fail
 * before launching Edge. No build/start/install, env/DB reads, or external APIs.
 *
 * 18 cases / 24 isolated contexts: the two responsive cases each cover four sizes.
 * Normal flows use native Edge, real File inputs, actual Next workers and native
 * Blob downloads. Only three explicitly labelled Worker fault cases differ:
 * unavailable constructor; held REAL message delivery for cancel/late response;
 * and an isolated clock for the exact 15,000-ms production watchdog. The latter
 * never changes the delay or other clocks/timers and makes no wall-time claim.
 *
 * Every request is observed. External requests, all APIs and writes are aborted.
 * Public-shell script attempts and public link-prefetch aborts are logged apart
 * from PRIVATE failures. No normal request/response is replaced with test data.
 * Screenshots use unchanged DOM and synthetic inputs, never forced clicks.
 * Contexts/Edge and volatile fixture files are cleaned in finally; screenshots,
 * independently checked report downloads and summary.json remain in OS temp.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, expect as playwrightExpect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import ts from "typescript";

const TOOL_PATH = "/tools/csv-diff";
const CANONICAL = `https://www.byteverse.fyi${TOOL_PATH}`;
const TITLE = "CSV Diff Checker: Compare Two CSV Files by Key";
const flags = new Map();
for (const arg of process.argv.slice(2)) {
  const match = /^--(baseURL|filter)=(.+)$/.exec(arg);
  assert(match && !flags.has(match[1]), "Only one --baseURL=<loopback-origin> and/or --filter=<name> is allowed");
  flags.set(match[1], match[2]);
}
const base = flags.get("baseURL") ?? "http://127.0.0.1:3066";
assert(/^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(?::\d{1,5})?\/?$/i.test(base), "baseURL must be an explicit loopback origin, without credentials, path, query or fragment");
const parsedBase = new URL(base);
assert(!parsedBase.port || (Number(parsedBase.port) >= 1 && Number(parsedBase.port) <= 65535), "Invalid loopback port");
const ORIGIN = parsedBase.origin, TARGET = ORIGIN + TOOL_PATH;
const filter = flags.get("filter")?.trim().toLowerCase();
assert(filter === undefined || (filter.length > 0 && filter.length <= 160), "A nonempty case-name filter is required");
const expect = playwrightExpect.configure({ timeout: 12_000 });
const cases = [], results = [];
let browser, artifacts, fixtureDirectory;
const hash = value => createHash("sha256").update(value).digest("hex");
const slug = value => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const isHub = value => /^edge:\/\/downloads-hub\/?$/.test(value);
const errorText = error => String(error.stack ?? error).replace(/\u001b\[[0-9;]*m/g, "").slice(0, 6500);
function scenario(name, run, options = {}) { cases.push({ name, run, options }); }

// Read ONLY actual sample data literals, never import any app/config/DB module.
function literal(node) {
  if (ts.isStringLiteral(node)) return node.text;
  if (ts.isArrayLiteralExpression(node)) return node.elements.map(literal);
  assert(ts.isObjectLiteralExpression(node), "Samples must remain static data");
  return Object.fromEntries(node.properties.map(p => {
    assert(ts.isPropertyAssignment(p) && ts.isIdentifier(p.name), "No executable sample properties");
    return [p.name.text, literal(p.initializer)];
  }));
}
const sampleSource = ts.createSourceFile("samples.ts", readFileSync(fileURLToPath(new URL("../src/lib/csv-diff/samples.ts", import.meta.url)), "utf8"), ts.ScriptTarget.Latest, true);
assert.equal(sampleSource.parseDiagnostics.length, 0);
const sampleDeclaration = sampleSource.statements.filter(ts.isVariableStatement).flatMap(s => [...s.declarationList.declarations])
  .filter(d => d.name.text === "CSV_DIFF_SAMPLES");
assert.equal(sampleDeclaration.length, 1);
const SAMPLES = literal(sampleDeclaration[0].initializer);
const sample = id => { const value = SAMPLES.find(s => s.id === id); assert(value, `Missing actual sample ${id}`); return value; };

// Independent fixture writer and strict report reader: neither calls the app's
// parser/exporter or Papa Parse. Quoted multiline cells are logical records.
const csv = (matrix, delimiter = ",") => matrix.map(row => row.map(value => `"${value.replace(/"/g, '""')}"`).join(delimiter)).join("\r\n");
function csvReport(text) {
  assert.equal(text[0], "\ufeff", "CSV report must carry its UTF-8 BOM");
  const rows = []; let index = 1;
  while (index < text.length) {
    const row = [];
    for (;;) {
      assert.equal(text[index++], '"', "Report quotes every field");
      let value = "", closed = false;
      while (index < text.length) {
        const char = text[index++];
        if (char !== '"') value += char;
        else if (text[index] === '"') { value += '"'; index++; }
        else { closed = true; break; }
      }
      assert(closed, "Quoted report field must close"); row.push(value);
      if (text[index] === ",") { index++; continue; }
      assert.equal(text.slice(index, index + 2), "\r\n", "Actual CRLF logical-record terminator");
      index += 2; rows.push(row); break;
    }
  }
  assert.equal(index, text.length); assert(rows.length > 0);
  assert(rows.every(row => row.length === rows[0].length), "Consistent independently parsed report width");
  return rows;
}

// Transparent observation in normal cases. No parsing/comparison/export mock.
function installProbe({ origin, privatePath, fault }) {
  if (location.origin !== origin) return; // Do not instrument Edge's internal download hub / initial blank page.
  if (Object.hasOwn(window, "__csvDiffTestProbe")) return; // Edge download-hub reinitialization.
  const p = { documentId: crypto.randomUUID(), path: location.pathname, workers: [], blobs: [], storageWrites: [],
    databaseCalls: [], cacheCalls: [], serviceWorkerCalls: [], cookieWrites: [], urlWrites: [],
    holdKind: null, held: [], released: 0, clock: 0, timers: [], fault };
  Object.defineProperty(window, "__csvDiffTestProbe", { value: p });
  const privateNow = () => location.pathname.replace(/\/$/, "") === privatePath;
  const storageSet = Storage.prototype.setItem;
  Storage.prototype.setItem = function (key, value) {
    if (privateNow()) p.storageWrites.push({ storage: this === localStorage ? "local" : "session", key: String(key), value: String(value) });
    return Reflect.apply(storageSet, this, [key, value]);
  };
  const cookie = Object.getOwnPropertyDescriptor(Document.prototype, "cookie");
  if (cookie?.set) Object.defineProperty(Document.prototype, "cookie", { ...cookie, set(value) {
    if (privateNow()) p.cookieWrites.push(String(value)); return cookie.set.call(this, value);
  } });
  for (const [prototype, names, list] of [
    [globalThis.IDBFactory?.prototype, ["open", "deleteDatabase"], p.databaseCalls],
    [globalThis.IDBObjectStore?.prototype, ["add", "put"], p.databaseCalls],
    [globalThis.CacheStorage?.prototype, ["open", "delete"], p.cacheCalls],
    [globalThis.Cache?.prototype, ["put", "add", "addAll"], p.cacheCalls],
    [globalThis.ServiceWorkerContainer?.prototype, ["register"], p.serviceWorkerCalls],
  ]) for (const name of names) {
    if (!prototype?.[name]) continue;
    const native = prototype[name];
    prototype[name] = function (...args) { if (privateNow()) list.push(name); return Reflect.apply(native, this, args); };
  }
  for (const name of ["pushState", "replaceState"]) {
    const native = history[name];
    history[name] = function (state, unused, url) {
      if (privateNow()) p.urlWrites.push({ method: name, url: url === undefined ? null : String(url), state: JSON.stringify(state) });
      return Reflect.apply(native, this, [state, unused, url]);
    };
  }
  const create = URL.createObjectURL, revoke = URL.revokeObjectURL;
  URL.createObjectURL = function (blob) {
    const url = Reflect.apply(create, URL, [blob]); p.blobs.push({ url, bytes: blob.size, type: blob.type, revoked: false }); return url;
  };
  URL.revokeObjectURL = function (url) {
    const record = p.blobs.find(item => item.url === url); if (record) record.revoked = true;
    return Reflect.apply(revoke, URL, [url]);
  };
  // ONLY the timeout case captures the exact production watchdog. Native RAF,
  // Date, other timers, UI actions, file IO and real worker computation continue.
  if (fault === "deadline") {
    const nativeSet = window.setTimeout, nativeClear = window.clearTimeout;
    const callbacks = new Map();
    window.setTimeout = function (callback, delay, ...args) {
      if (delay === 15_000 && typeof callback === "function" && p.workers.at(-1)?.posted.length === 0) {
        const id = -1 - p.timers.length;
        const record = { id, delay, due: p.clock + delay, active: true, fired: false, cleared: false };
        p.timers.push(record); callbacks.set(id, { callback, args, record }); return id;
      }
      return Reflect.apply(nativeSet, window, [callback, delay, ...args]);
    };
    window.clearTimeout = function (id) {
      const timer = callbacks.get(id);
      if (timer) { timer.record.active = false; timer.record.cleared = true; }
      else Reflect.apply(nativeClear, window, [id]);
    };
    p.advanceWatchdog = amount => {
      if (!Number.isSafeInteger(amount) || amount < 0) throw new Error("Invalid synthetic watchdog clock advance");
      p.clock += amount;
      for (const { record, callback, args } of callbacks.values()) if (record.active && record.due <= p.clock) {
        record.active = false; record.fired = true; callback(...args);
      }
    };
  }
  const NativeWorker = window.Worker;
  if (fault === "unsupported") window.Worker = undefined;
  else window.Worker = class extends NativeWorker {
    constructor(url, options) {
      super(url, options);
      this.audit = { url: new URL(String(url), location.href).href, type: options?.type ?? "classic", posted: [], received: [], terminated: 0 };
      p.workers.push(this.audit);
      this.addEventListener("message", event => {
        const response = event.data;
        this.audit.received.push({ id: response.id, ok: response.ok, kind: response.kind, code: response.code });
        if (["hold", "deadline"].includes(fault) && p.holdKind === response.kind) {
          const callback = this.onmessage;
          if (typeof callback !== "function") throw new Error("Missing actual client worker callback");
          event.stopImmediatePropagation(); p.held.push({ worker: this, callback, event });
        }
      });
    }
    postMessage(request, ...rest) {
      this.audit.posted.push({ id: request.id, kind: request.kind, format: request.format,
        sources: request.inputs?.map(input => ({ delimiter: input.delimiter, encoding: input.encoding,
          nativeFile: input.source.file instanceof File, bytes: input.source.file?.size, textChars: input.source.text?.length })) });
      return super.postMessage(request, ...rest);
    }
    terminate() { this.audit.terminated++; return super.terminate(); }
  };
  p.release = () => {
    if (!["hold", "deadline"].includes(fault)) throw new Error("Delivery faults are not available in normal cases");
    p.holdKind = null;
    for (const item of p.held.splice(0)) { p.released++; item.callback.call(item.worker, item.event); }
  };
  p.snapshot = () => ({ documentId: p.documentId, path: p.path, workers: p.workers, blobs: p.blobs,
    storageWrites: p.storageWrites, databaseCalls: p.databaseCalls, cacheCalls: p.cacheCalls, serviceWorkerCalls: p.serviceWorkerCalls,
    cookieWrites: p.cookieWrites, urlWrites: p.urlWrites, held: p.held.length, released: p.released, timers: p.timers, clock: p.clock });
}

const ASSETS = new Set(["/logo.png", "/favicon.ico", "/favicon-16x16.png", "/favicon-32x32.png", "/apple-touch-icon.png",
  "/android-chrome-192x192.png", "/android-chrome-512x512.png", "/site.webmanifest", "/apple-icon.png"]);
const PUBLIC_HOSTS = new Set(["www.googletagmanager.com", "www.google-analytics.com", "region1.google-analytics.com",
  "pagead2.googlesyndication.com", "googleads.g.doubleclick.net", "translate.google.com", "translate.googleapis.com",
  "translate.gstatic.com", "fonts.googleapis.com", "fonts.gstatic.com"]);
const onlyQuery = (url, keys) => [...url.searchParams.keys()].every(key => keys.includes(key));
function allowedLocal(url, request, boundary) {
  if (url.origin !== ORIGIN || !["GET", "HEAD"].includes(request.method()) || request.postDataBuffer()?.length || url.username || url.password) return false;
  if (url.pathname.startsWith("/_next/static/")) return onlyQuery(url, ["dpl", "v"]);
  if (url.pathname === TOOL_PATH || (boundary && url.pathname === "/tools")) return onlyQuery(url, ["_rsc"]);
  if (ASSETS.has(url.pathname)) return !url.search || /^\?[\w.-]{1,160}(?:=[\w.-]{1,160})?$/.test(url.search);
  return url.pathname === "/_next/image" && url.searchParams.get("url") === "/logo.png"
    && onlyQuery(url, ["url", "w", "q"]) && /^\d+$/.test(url.searchParams.get("w") ?? "") && /^\d+$/.test(url.searchParams.get("q") ?? "");
}
async function harness(entry, variant, index) {
  const h = { name: entry.name, label: `${slug(entry.name)}${variant.width ? `-${variant.width}` : ""}`, index,
    evidence: [], requests: [], console: [], errors: [], guardErrors: [], workers: [], popups: [], popupChecks: [], snapshots: [],
    sockets: [], downloads: [], reportUrls: new Set(), chooserCount: 0, dialogs: [], needles: [], js: entry.options.js !== false,
    boundary: !!entry.options.boundary, start: entry.options.start ?? TOOL_PATH, closing: false, expectedDialog: null, downloadIntent: false };
  h.context = await browser.newContext({ viewport: { width: variant.width ?? 1440, height: (variant.width ?? 1440) < 768 ? 844 : 960 },
    deviceScaleFactor: 1, colorScheme: variant.theme ?? "light", reducedMotion: "reduce", locale: "en-US", timezoneId: "UTC",
    acceptDownloads: true, serviceWorkers: "block", javaScriptEnabled: h.js });
  try {
    h.context.setDefaultTimeout(12_000); h.context.setDefaultNavigationTimeout(45_000);
    const seen = new WeakMap(), byUrl = new Map();
    h.track = value => {
      const parts = [...new Set([...(value.length >= 16 ? [value.slice(0, 96)] : []), ...(value.match(/BV_CSV_[A-Z0-9_]+/g) ?? [])])];
      for (const part of parts) h.needles.push(...[part, encodeURIComponent(part), new URLSearchParams({ q: part }).toString().slice(2),
        JSON.stringify(part).slice(1, -1), Buffer.from(part).toString("base64").replace(/=+$/, "")]);
    };
    function observe(request) {
      if (seen.has(request)) return seen.get(request);
      const url = new URL(request.url()), headers = request.headers();
      let documentPath = h.page?.url().startsWith(ORIGIN) ? new URL(h.page.url()).pathname : h.start;
      try { const document = new URL(request.frame().url()); if (document.origin === ORIGIN) documentPath = document.pathname; } catch { /* Worker/initial document: use the known private start. */ }
      if (request.isNavigationRequest() && request.resourceType() === "document") documentPath = url.pathname;
      const isPrivate = documentPath.replace(/\/$/, "") === TOOL_PATH;
      const raw = [request.url(), request.postData() ?? "", ...Object.values(headers)].join("\n");
      let decoded = raw; try { decoded = decodeURIComponent(raw); } catch { /* Check original as well. */ }
      const inputBearing = h.needles.some(needle => raw.includes(needle) || decoded.includes(needle));
      const safeRead = ["GET", "HEAD"].includes(request.method()) && !request.postDataBuffer()?.length;
      const api = url.origin === ORIGIN && /^\/api(?:\/|$)/.test(url.pathname);
      const publicExternal = h.boundary && !isPrivate && safeRead && !inputBearing && PUBLIC_HOSTS.has(url.hostname)
        && ["script", "image", "stylesheet", "font"].includes(request.resourceType());
      const publicPrefetch = h.boundary && !isPrivate && safeRead && !api && !inputBearing && url.origin === ORIGIN
        && onlyQuery(url, ["_rsc"]) && (headers["next-router-prefetch"] === "1" || headers.rsc === "1" || url.searchParams.has("_rsc"));
      const localBlob = h.downloadIntent && url.protocol === "blob:" && url.origin === ORIGIN
        && h.reportUrls.has(url.href) && request.method() === "GET" && !request.postDataBuffer()?.length;
      const allowed = !inputBearing && !api && (localBlob || allowedLocal(url, request, h.boundary));
      const benign = !allowed && (publicExternal || publicPrefetch);
      const record = { document: isPrivate ? "private" : "public", method: request.method(), type: request.resourceType(),
        url: inputBearing ? "[input-bearing URL redacted]" : url.href, bodyBytes: request.postDataBuffer()?.length ?? 0,
        inputBearing, allowed, benign, category: localBlob ? "native-local-blob" : allowed ? "local-read" : publicExternal ? "public-external-blocked"
          : publicPrefetch ? "public-prefetch-blocked" : "unexpected-blocked" };
      seen.set(request, record); byUrl.set(request.url(), record); h.requests.push(record); return record;
    }
    h.context.on("request", observe);
    h.context.on("response", response => { observe(response.request()).status = response.status(); });
    h.context.on("requestfailed", request => { observe(request).failure = request.failure()?.errorText; });
    await h.context.route("**/*", async route => {
      const record = observe(route.request());
      try { if (record.allowed) await route.continue(); else { record.blocked = true; await route.abort("blockedbyclient"); } }
      catch (error) { if (!h.closing) h.guardErrors.push(errorText(error)); }
    });
    await h.context.routeWebSocket("**/*", socket => { h.sockets.push(socket.url()); socket.close(); });
    if (h.js) await h.context.addInitScript(installProbe, { origin: ORIGIN, privatePath: TOOL_PATH, fault: entry.options.fault ?? "native" });
    let pageNumber = 0;
    h.context.on("page", page => {
      if (++pageNumber > 1) {
        const record = { initial: page.url(), final: "", allowed: false }; h.popups.push(record);
        page.on("framenavigated", () => { record.final = page.url(); });
        h.popupChecks.push((async () => {
          try { await expect.poll(() => isHub(page.url()) && h.downloads.length > 0, { timeout: 5000 }).toBe(true); record.allowed = true; }
          catch { /* Fail at the final audit, rather than blanket-ignoring popups. */ }
          finally { record.final = page.url(); }
        })());
      }
      page.on("pageerror", error => h.errors.push(errorText(error)));
      page.on("console", message => {
        if (message.type() !== "error" && message.type() !== "warning") return;
        const record = byUrl.get(message.location().url);
        const expectedBlocked = record?.benign && record.blocked && /^Failed to load resource: net::ERR_BLOCKED_BY_CLIENT/.test(message.text());
        const blockedSW = h.boundary && page.url().startsWith(`${ORIGIN}/tools`) && !page.url().startsWith(TARGET)
          && /Service Worker registration blocked by Playwright/i.test(message.text());
        h.console.push({ type: message.type(), text: message.text(), expected: !!(expectedBlocked || blockedSW) });
      });
      page.on("dialog", async dialog => {
        const answer = h.expectedDialog;
        try {
          assert(answer, "Unexpected browser dialog"); assert.equal(dialog.type(), "confirm"); assert.match(dialog.message(), answer.pattern);
          h.dialogs.push({ message: dialog.message(), accepted: answer.accept });
          if (answer.accept) await dialog.accept(); else await dialog.dismiss();
        } catch (error) { h.guardErrors.push(errorText(error)); await dialog.dismiss().catch(() => {}); }
        finally { h.expectedDialog = null; }
      });
      page.on("filechooser", () => { h.chooserCount++; });
      page.on("download", download => {
        if (!h.downloadIntent) h.guardErrors.push("Unexpected automatic download");
        h.downloads.push({ suggestedFilename: download.suggestedFilename(), url: download.url() });
      });
      page.on("worker", worker => {
        const record = { url: worker.url(), closed: false }; h.workers.push(record);
        worker.on("close", () => { record.closed = true; });
      });
    });
    h.page = await h.context.newPage();
    h.workspace = h.page.locator("#csv-diff-workspace");
    h.results = h.workspace.locator('section[aria-labelledby="csv-results-title"]');
    h.setup = h.workspace.locator('section[aria-labelledby="csv-setup-title"]');
    h.review = h.workspace.locator('section[aria-labelledby="csv-review-title"]');
    h.rows = h.workspace.getByRole("region", { name: "CSV comparison results", exact: true }).locator("tbody > tr");
    h.alert = h.workspace.getByRole("alert");
    h.button = name => h.workspace.getByRole("button", { name, exact: true });
    h.field = (side, suffix) => h.workspace.locator(`#csv-${side}-${suffix}`);
    h.probe = () => h.page.evaluate(() => window.__csvDiffTestProbe.snapshot());
    h.control = values => h.page.evaluate(values => { Object.assign(window.__csvDiffTestProbe, values); }, values);
    h.call = (method, ...args) => h.page.evaluate(({ method, args }) => window.__csvDiffTestProbe[method](...args), { method, args });
    h.response = await h.page.goto(ORIGIN + h.start, { waitUntil: "load" });
    assert.equal(h.response?.status(), 200);
    if (h.start === TOOL_PATH) await ready(h);
    else {
      await expect(h.page.getByRole("button", { name: /Change language/ })).toBeVisible();
      await expect.poll(() => h.page.getByRole("button", { name: "Toggle theme", exact: true }).evaluate(node => Object.keys(node)
        .some(key => key.startsWith("__reactProps$") && typeof node[key]?.onClick === "function")),
      { message: "Observe public-shell hydration; never invoke React handlers" }).toBe(true);
    }
    return h;
  } catch (error) { error.harness = h; throw error; }
}

async function ready(h) {
  await expect(h.workspace).toBeVisible();
  if (h.js) {
    await expect(h.workspace.locator("fieldset")).toBeEnabled();
    await expect.poll(() => h.page.evaluate(() => document.fonts.status), { message: "Local fonts finish loading", timeout: 12_000 }).toBe("loaded");
  }
}
async function noResult(h, setupGone = false) {
  await expect(h.results).toHaveCount(0); await expect(h.workspace.locator("a[download]")).toHaveCount(0);
  await expect(h.button("Prepare CSV report")).toHaveCount(0); await expect(h.button("Prepare JSON report")).toHaveCount(0);
  if (setupGone) await expect(h.setup).toHaveCount(0);
}
async function example(h, id = "inventory") {
  const data = sample(id); h.track(data.original); h.track(data.updated);
  await h.button(data.label).click();
  await expect(h.field("original", "text")).toHaveValue(data.original);
  await expect(h.field("updated", "text")).toHaveValue(data.updated);
}
async function paste(h, original, updated, delimiters = [",", ","]) {
  for (const [index, side] of ["original", "updated"].entries()) {
    const region = h.workspace.locator(`section[aria-labelledby="csv-${side}-heading"]`);
    await region.getByRole("button", { name: "Paste", exact: true }).click();
    h.track([original, updated][index]); await h.field(side, "text").fill([original, updated][index]);
    await h.field(side, "delimiter").selectOption(delimiters[index]);
  }
  await noResult(h, true);
}
async function inspect(h, originalCount, updatedCount) {
  await h.button("Inspect files").click(); await expect(h.setup).toBeVisible(); await expect(h.alert).toHaveCount(0);
  await expect(h.workspace.locator('p[role="status"]')).toContainText(`${originalCount} original and ${updatedCount} updated records inspected`);
  await expect(h.setup.locator('input[aria-label^="Use "]:checked')).toHaveCount(0);
  await expect(h.button("Compare CSV files")).toBeDisabled();
}
const key = (h, name) => h.setup.getByRole("checkbox", { name: `Use ${name} as a match key`, exact: true });
async function counts(h, expected) {
  await expect(h.results).toBeVisible(); await expect(h.alert).toHaveCount(0);
  for (const [status, value] of Object.entries(expected)) await expect(h.results.locator(`div[data-status="${status}"] > strong`)).toHaveText(String(value));
  await expect(h.button("Cancel operation")).toHaveCount(0);
  h.evidence.push({ counts: expected });
}
async function compare(h, expected) { await h.button("Compare CSV files").click(); await counts(h, expected); }
async function inventory(h) { await example(h); await inspect(h, 3, 3); await key(h, "sku").check(); await compare(h, { changed: 1, added: 1, removed: 1, unchanged: 1 }); }
const rowFor = (h, value) => h.rows.filter({ has: h.page.locator("bdi").filter({ hasText: new RegExp(`^${escapeRegex(value)}$`) }) });
async function review(h, value) {
  const button = rowFor(h, value).getByRole("button", { name: /^Review result \d+$/ });
  // Mobile tables deliberately scroll internally. Scroll the action into view
  // before the normal trusted click; never use force or invoke a React handler.
  await button.scrollIntoViewIfNeeded(); await button.click(); await expect(h.review).toBeVisible();
}
async function values(h, field, original, updated) {
  const row = h.review.locator("tbody > tr").filter({ has: h.page.locator("th bdi").filter({ hasText: new RegExp(`^${escapeRegex(field)}$`) }) });
  const cells = row.locator("td"); await expect(cells).toHaveCount(2);
  assert.equal(await cells.nth(0).textContent(), original); assert.equal(await cells.nth(1).textContent(), updated);
}
async function errorIs(h, pattern) { await expect(h.alert).toBeVisible(); await expect(h.alert).toContainText(pattern); await noResult(h); }
async function chooseFile(h, side, name, bytes) {
  const filename = join(fixtureDirectory, `${h.index}-${side}-${name}`); await writeFile(filename, bytes);
  const [chooser] = await Promise.all([h.page.waitForEvent("filechooser"), h.field(side, "file").click()]);
  await chooser.setFiles(filename);
  await expect(h.workspace.locator(`label[for="csv-${side}-file"]`)).toContainText(name);
}
async function prepare(h, format) {
  await h.button(`Prepare ${format.toUpperCase()} report`).click();
  const anchor = h.workspace.getByRole("link", { name: `Save ${format.toUpperCase()} report`, exact: true });
  await expect(anchor).toBeVisible(); await expect(anchor).toHaveAttribute("download", `csv-comparison.${format}`);
  const url = new URL(await anchor.getAttribute("href"));
  assert.equal(url.protocol, "blob:"); assert.equal(url.origin, ORIGIN); h.reportUrls.add(url.href); return anchor;
}
async function download(h, format) {
  const anchor = await prepare(h, format); h.downloadIntent = true;
  try {
    const [item] = await Promise.all([h.page.waitForEvent("download"), anchor.click()]);
    assert.equal(item.suggestedFilename(), `csv-comparison.${format}`); assert.equal(await item.failure(), null);
    assert(item.url().startsWith(`blob:${ORIGIN}/`), "Native download uses the actual local Blob");
    const filename = `${h.index}-${h.downloads.length}-${format}.${format}`;
    await item.saveAs(join(artifacts, filename));
    const bytes = await readFile(join(artifacts, filename)); assert(bytes.length > 0);
    h.evidence.push({ nativeDownload: filename, bytes: bytes.length, sha256: hash(bytes), independentlyParsed: format });
    return format === "json" ? JSON.parse(bytes.toString("utf8")) : csvReport(bytes.toString("utf8"));
  } finally { h.downloadIntent = false; }
}
async function confirm(h, button, accept, pattern) {
  h.expectedDialog = { accept, pattern };
  await Promise.all([h.page.waitForEvent("dialog"), button.click()]);
  await expect.poll(() => h.expectedDialog === null).toBe(true);
}
async function screenshot(h, state) {
  const filename = `${h.index}-${h.label}-${state}.png`;
  await h.page.screenshot({ path: join(artifacts, filename), fullPage: false }); h.evidence.push({ screenshot: filename });
}
async function noOverflow(h) {
  const measured = await h.page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    const roots = [...document.querySelectorAll("[data-csv-diff-page],[data-csv-diff-workspace],body > header,footer")];
    const outside = element => { const r = element.getBoundingClientRect(); return r.width > 0 && (r.left < -1 || r.right > width + 1); };
    const containers = [...document.querySelectorAll('[data-csv-diff-workspace] [role="region"]')].filter(el => el.getClientRects().length);
    const bad = [...document.querySelectorAll("[data-csv-diff-page] :is(h1,h2,h3,p,a,button,input,select,textarea,summary)")].filter(el => {
      if (!el.checkVisibility() || !outside(el)) return false;
      const box = el.getBoundingClientRect(); if (box.width <= 1 && box.height <= 1) return false; // SR-only text, not clipped descenders.
      const scroll = el.closest('[role="region"]');
      return !scroll || !/^(auto|scroll)$/.test(getComputedStyle(scroll).overflowX) || outside(scroll);
    }).map(el => ({ tag: el.tagName, label: (el.getAttribute("aria-label") ?? el.textContent).slice(0, 90) }));
    return { width, documentWidth: document.documentElement.scrollWidth, bodyWidth: document.body.scrollWidth,
      badRoots: roots.filter(outside).map(el => el.tagName), bad,
      internalScrollers: containers.filter(el => el.scrollWidth > el.clientWidth + 1).map(el => el.getAttribute("aria-label")) };
  });
  assert(measured.documentWidth <= measured.width + 1 && measured.bodyWidth <= measured.width + 1, `Root overflow: ${JSON.stringify(measured)}`);
  assert.deepEqual(measured.badRoots, []); assert.deepEqual(measured.bad, [], "Only bounded internal table scrolling is allowed");
  h.evidence.push({ layout: measured });
}
async function axe(h, state) {
  await expect(h.page.locator("iframe")).toHaveCount(0);
  // Default axe.finishRun creates a blank helper page. This documented mode
  // runs the same rules directly, without weakening the strict popup guard;
  // its cross-origin-frame limitation is irrelevant after asserting no frames.
  const scan = await new AxeBuilder({ page: h.page }).setLegacyMode(true)
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  const violations = scan.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) }));
  h.evidence.push({ axe: state, passes: scan.passes.length, incomplete: scan.incomplete.length, violations });
  assert.deepEqual(violations, [], `Actual axe violations in ${state}`);
}
async function privateDocument(h) {
  await expect(h.page).toHaveURL(new RegExp(`^${escapeRegex(TARGET)}(?:#main-content)?$`));
  for (const name of [/Change language/, /Open chat/i, /^Search articles/]) await expect(h.page.getByRole("button", { name })).toHaveCount(0);
  await expect(h.page.locator("iframe")).toHaveCount(0);
  const sources = await h.page.locator('script[src],link[rel="preconnect"],link[rel="dns-prefetch"]').evaluateAll(nodes => nodes.map(node => node.src || node.href));
  assert(sources.every(value => new URL(value).origin === ORIGIN), "Private scripts/resource hints must all be local");
  h.evidence.push({ privateScriptAndHintCount: sources.length, allLocal: true });
}
async function privateStorage(h) {
  const state = await h.page.evaluate(async () => ({ local: { ...localStorage }, session: { ...sessionStorage }, cookie: document.cookie,
    databases: typeof indexedDB.databases === "function" ? await indexedDB.databases() : [], cacheNames: await caches.keys(),
    url: location.href, history: JSON.stringify(history.state), name: window.name }));
  assert(Object.keys(state.local).every(key => key === "theme"), "Only theme localStorage is allowed");
  if (state.local.theme !== undefined) assert(["light", "dark", "system"].includes(state.local.theme));
  assert.deepEqual(state.session, {}); assert.equal(state.cookie, ""); assert.deepEqual(state.databases, []); assert.deepEqual(state.cacheNames, []);
  assert([TARGET, `${TARGET}#main-content`].includes(state.url)); assert.equal(state.name, "");
  assert(!h.needles.some(needle => JSON.stringify(state).includes(needle)), "No inputs in storage, URL or history state");
  const p = await h.probe();
  assert(p.storageWrites.every(write => write.storage === "local" && write.key === "theme" && ["light", "dark", "system"].includes(write.value)));
  for (const key of ["databaseCalls", "cacheCalls", "serviceWorkerCalls", "cookieWrites"]) assert.deepEqual(p[key], [], `No automatic ${key}`);
  assert(!h.needles.some(needle => JSON.stringify(p.urlWrites).includes(needle)));
  assert.deepEqual(await h.context.cookies(), []);
  h.evidence.push({ privateStorage: { localKeys: Object.keys(state.local), sessionKeys: [], databases: 0, caches: 0, inputBearing: false } });
}
async function workerAudit(h) {
  if (!h.js) return;
  const p = await h.probe();
  for (const worker of [...h.snapshots, p].flatMap(snapshot => snapshot.workers)) {
    assert.equal(new URL(worker.url).origin, ORIGIN); assert.match(new URL(worker.url).pathname, /^\/_next\/static\/.+\.js$/);
    assert.equal(worker.posted.length, 1); assert.equal(worker.terminated, 1, "Every actual client job terminates its Worker exactly once");
  }
  await expect.poll(() => h.workers.every(worker => worker.closed), { message: "Native Worker close events" }).toBe(true);
  const total = [...h.snapshots, p].reduce((sum, snapshot) => sum + snapshot.workers.length, 0);
  await expect.poll(() => h.workers.length, { message: "Native Worker events independently agree with observed jobs" }).toBe(total);
  assert(h.workers.every(worker => new URL(worker.url).origin === ORIGIN), "Native workers are independently confirmed same-origin");
  h.evidence.push({ nativeWorkers: h.workers.length, observedJobs: total });
}
async function healthy(h) {
  await Promise.all(h.popupChecks);
  assert.deepEqual(h.popups.filter(popup => !popup.allowed || !isHub(popup.final)), [], "Only Edge's exact native download hub is exempt");
  assert.deepEqual(h.requests.filter(request => !request.allowed && !request.benign), [], "Private external/API/write/unexpected requests are failures");
  assert.deepEqual(h.requests.filter(request => request.inputBearing), [], "Input-bearing network attempt");
  // Chromium can report disabled-script preload cancellation as "csp" in a no-JS context.
  const disabledScripts = h.requests.filter(request => !h.js && request.allowed && request.type === "script"
    && request.failure === "csp" && new URL(request.url).pathname.startsWith("/_next/static/chunks/"));
  if (disabledScripts.length) h.evidence.push({ scriptsCancelledBecauseJavaScriptIsDisabled: disabledScripts.map(request => request.url) });
  assert.deepEqual(h.requests.filter(request => request.allowed && (request.status >= 400 || request.failure)
    && !disabledScripts.includes(request)), [], "Local assets must actually load");
  assert.deepEqual(h.errors, [], "Browser runtime errors"); assert.deepEqual(h.guardErrors, [], "Harness/side-effect guard errors");
  assert.deepEqual(h.console.filter(message => message.type === "error" && !message.expected), [], "Unexpected console errors");
  assert.deepEqual(h.sockets, [], "No WebSockets in the production private tool");
  assert.equal(h.expectedDialog, null);
  if (new URL(h.page.url()).pathname === TOOL_PATH) {
    await privateDocument(h);
    if (h.js) await privateStorage(h);
  }
  await workerAudit(h);
}

scenario("inventory", async h => {
  await expect(h.page).toHaveTitle(TITLE); await expect(h.page.locator("h1")).toHaveCount(1);
  await expect(h.page.locator('link[rel="canonical"]')).toHaveAttribute("href", CANONICAL);
  await expect(h.page.locator('meta[name="description"]')).toHaveAttribute("content", /Compare two CSV files by ID or composite key/);
  const policy = h.response.headers()["content-security-policy"];
  assert(policy); assert.doesNotMatch(policy, /https?:|unsafe-eval|googletag/i);
  assert.match(policy, /worker-src 'self' blob:/); assert.equal(h.response.headers()["referrer-policy"], "no-referrer");
  await inventory(h);
  await expect(h.rows).toHaveCount(3); await expect(h.results.getByRole("button", { name: "Differences", exact: true })).toHaveAttribute("aria-pressed", "true");
  await h.button("All rows").click(); await expect(h.rows).toHaveCount(4);
  await review(h, "003"); await values(h, "stock", "8", "7"); await values(h, "sku", "003", "003");
  await expect(h.review).toContainText("Original record 4 · Updated record 2");
  await privateDocument(h); await screenshot(h, "inventory-review");
});

scenario("composite-key", async h => {
  await example(h, "composite"); await inspect(h, 3, 3); await key(h, "sku").check();
  await h.button("Compare CSV files").click(); await errorIs(h, /Keys must be nonblank and unique/);
  await expect(h.alert.locator("li")).toHaveCount(2); await expect(h.alert).toContainText("Original · Duplicate key");
  await expect(h.alert).toContainText("Updated · Duplicate key"); await expect(h.alert).toContainText("records 2, 3");
  await key(h, "warehouse").check(); await compare(h, { changed: 1, added: 1, removed: 1, unchanged: 1 });
  await expect(h.results).toContainText("Composite key");
  const south = h.rows.filter({ has: h.page.getByText("South", { exact: true }) });
  await south.getByRole("button", { name: /^Review result/ }).click(); await values(h, "stock", "20", "18");
  await values(h, "warehouse", "South", "South");
});

scenario("native-utf8-files", async h => {
  const longId = "900719925474099312345678901234567890";
  const beforeNote = 'Café, "quoted"\r\nnext line', afterNote = 'Café, "quoted"\r\nchanged line';
  const a = csv([["id", "code", "note", "stamp"], [longId, "00123", beforeNote, "2026-01-02"], ["00001", "0007", "kept", "0000123"], ["1", "7", "one", "10.00"]]);
  const b = csv([["note", "stamp", "id", "code"], ["one", "10.00", "1", "7"], [afterNote, "2026-01-02", longId, "00123"], ["kept", "0000123", "00001", "0007"]]);
  h.track(a); h.track(b);
  const bytes = [Buffer.from(`\ufeff${a}`), Buffer.from(`\ufeff${b}`)];
  await chooseFile(h, "original", "utf8-original.csv", bytes[0]); await chooseFile(h, "updated", "utf8-updated.csv", bytes[1]);
  await inspect(h, 3, 3);
  const inputPreview = h.workspace.locator('section[aria-labelledby="csv-original-heading"] details');
  await inputPreview.locator("summary").click();
  await expect(inputPreview.getByRole("region", { name: "Original input preview", exact: true }).locator("tbody > tr")).toHaveCount(3);
  await expect(inputPreview).toContainText(longId);
  await key(h, "id").check(); await compare(h, { changed: 1, added: 0, removed: 0, unchanged: 2 });
  await review(h, longId); await values(h, "id", longId, longId); await values(h, "code", "00123", "00123");
  await values(h, "note", beforeNote, afterNote);
  await h.button("All rows").click(); const report = await download(h, "json");
  assert.deepEqual(report.rows.map(row => row.key), [[longId], ["00001"], ["1"]]);
  assert.equal(report.rows[0].before.values[2], beforeNote); assert.equal(report.rows[0].after.values[0], afterNote);
  assert.equal(report.rows[0].before.record, 2); assert.equal(report.rows[0].after.record, 3);
  const inputSources = (await h.probe()).workers[0].posted[0].sources;
  assert(inputSources.every(input => input.nativeFile)); assert.deepEqual(inputSources.map(input => input.bytes), bytes.map(value => value.length));
  assert.equal(h.chooserCount, 2);
});

scenario("per-file-delimiter-encoding", async h => {
  const a = csv([["id", "name", "stock"], ["0002", "Café", "8"]], ";");
  const b = csv([["stock", "id", "name"], ["7", "0002", "Café"]]); h.track(a); h.track(b);
  await chooseFile(h, "original", "utf16le.csv", Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(a, "utf16le")]));
  await chooseFile(h, "updated", "utf8.csv", Buffer.from(`\ufeff${b}`));
  await h.field("original", "delimiter").selectOption(";"); await h.field("updated", "delimiter").selectOption(",");
  await h.button("Inspect files").click(); await errorIs(h, /BOM does not match the selected encoding/); await expect(h.setup).toHaveCount(0);
  await h.field("original", "encoding").selectOption("utf-16le"); await inspect(h, 1, 1); await key(h, "id").check();
  await compare(h, { changed: 1, added: 0, removed: 0, unchanged: 0 }); await review(h, "0002");
  await values(h, "name", "Café", "Café"); await values(h, "stock", "8", "7");
  const inputs = (await h.probe()).workers.filter(worker => worker.posted[0].kind === "inspect").at(-1).posted[0].sources;
  assert.deepEqual(inputs.map(input => [input.delimiter, input.encoding]), [[";", "utf-16le"], [",", "utf-8"]]);
});

scenario("invalid-csv", async h => {
  for (const [text, pattern, code] of [
    ['id,value\n1,"broken', /unterminated quoted field/, "INVALID_QUOTES"],
    ["id,value\n1,a,extra", /Record 2 has 3 fields; the header has 2/, "RAGGED_ROWS"],
    ["id,id\n1,2", /duplicate exact headers/, "DUPLICATE_HEADER"],
  ]) {
    await paste(h, text, "id,value\n1,ok"); await h.button("Inspect files").click(); await errorIs(h, pattern);
    await expect(h.setup).toHaveCount(0); await expect(h.workspace.locator('summary:has-text("Preview")')).toHaveCount(0);
    assert.equal((await h.probe()).workers.at(-1).received[0].code, code);
  }
  await paste(h, "id,value\n1,ok", "id,value\n1,ok"); await inspect(h, 1, 1); await key(h, "id").check();
  await compare(h, { changed: 0, added: 0, removed: 0, unchanged: 1 });
});

scenario("normalization-and-exclusions", async h => {
  await paste(h, csv([["id", "value", "ignored", "only_original"], [" A ", " Alpha ", "old", "left1"], ["B", " Beta ", "old", "left2"]]),
    csv([["id", "value", "ignored", "only_updated"], ["a", "alpha", "new", "right1"], ["B", "beta", "new", "right2"]]));
  await inspect(h, 2, 2); await key(h, "id").check(); await h.setup.getByRole("checkbox", { name: "Compare ignored values", exact: true }).uncheck();
  await expect(h.setup).toContainText("Original: ignored, only_original. Updated: ignored, only_updated.");
  await compare(h, { changed: 1, added: 1, removed: 1, unchanged: 0 });
  await h.setup.getByRole("checkbox", { name: "Ignore outer whitespace in values", exact: true }).check(); await noResult(h);
  await compare(h, { changed: 1, added: 1, removed: 1, unchanged: 0 });
  await h.setup.getByRole("checkbox", { name: "Ignore letter case in values", exact: true }).check();
  await compare(h, { changed: 0, added: 1, removed: 1, unchanged: 1 });
  await expect(h.results).toContainText("1 raw-different cell pairs were treated as equal");
  await h.button("All rows").click(); await review(h, "B"); await values(h, "value", " Beta ", "beta");
  await expect(h.review.locator("tbody th bdi")).toHaveText(["id", "value"]);
  const report = await download(h, "json");
  assert.deepEqual(report.rows.map(row => [row.key, row.status]), [[[" A "], "removed"], [["B"], "unchanged"], [["a"], "added"]]);
  assert.deepEqual(report.ignoredColumns, { original: ["ignored", "only_original"], updated: ["ignored", "only_updated"] });
});

scenario("pagination-filter-search", async h => {
  const id = number => String(number).padStart(3, "0");
  const original = Array.from({ length: 32 }, (_, index) => [id(index + 1), `old-${id(index + 1)}`]);
  const updated = Array.from({ length: 30 }, (_, index) => [id(index + 1), index === 6 ? "BV_CSV_TARGET_007" : `${index < 28 ? "new" : "old"}-${id(index + 1)}`]);
  updated.push(...[33, 34, 35].map(number => [id(number), `added-${number}`]));
  await paste(h, csv([["id", "value"], ...original]), csv([["id", "value"], ...updated]));
  await inspect(h, 32, 33);
  const preview = h.workspace.locator('section[aria-labelledby="csv-original-heading"] details');
  await preview.locator("summary").click(); await expect(preview).toContainText("First 3 records, 2 columns");
  await expect(preview.locator("tbody > tr")).toHaveCount(3);
  await key(h, "id").check(); await compare(h, { changed: 28, added: 3, removed: 2, unchanged: 2 });
  const pagination = h.results.getByRole("navigation", { name: "Result pagination", exact: true });
  await expect(h.rows).toHaveCount(25); await expect(pagination).toContainText("Page 1 of 2");
  await h.button("Next result page").click(); await expect(h.rows).toHaveCount(8); await expect(pagination).toContainText("Page 2 of 2");
  await expect(h.button("Next result page")).toBeDisabled();
  await h.button("Changed").scrollIntoViewIfNeeded();
  await h.button("Changed").click(); await expect(h.rows).toHaveCount(25); await expect(pagination).toContainText("Page 1 of 2");
  const search = h.results.getByRole("searchbox", { name: "Search result values", exact: true });
  await search.fill("BV_CSV_TARGET_007"); await expect(h.rows).toHaveCount(1); await expect(rowFor(h, "007")).toBeVisible();
  const report = await download(h, "json");
  assert.equal(report.filter, "changed"); assert.equal(report.exportedRows, 28); assert.equal(report.rows.length, 28);
  assert.deepEqual(report.rows.map(row => row.key[0]), Array.from({ length: 28 }, (_, index) => id(index + 1)));
  await search.fill("NO_SUCH_SYNTHETIC_VALUE"); await expect(h.rows).toHaveCount(0); await expect(h.results).toContainText("No records match this filter");
  await h.button("All rows").click(); await search.fill(""); await expect(h.rows).toHaveCount(25);
  await h.button("Next result page").click(); await expect(h.rows).toHaveCount(10);
});

scenario("native-csv-json-reports", async h => {
  const a = [["001", "=1+1", "before-note"], ["002", 'quote "before", and comma', "kept-note"], ["003", "+5", "removed-note"]];
  const b = [["new-note", "@SUM(1,2)", "001"], ["kept-note", 'quote "after", and comma', "002"], ["added-note", "-10", "004"]];
  await paste(h, csv([["id", "value", "ignored"], ...a]), csv([["ignored", "value", "id"], ...b]));
  await inspect(h, 3, 3); await key(h, "id").check(); await h.setup.getByRole("checkbox", { name: "Compare ignored values", exact: true }).uncheck();
  await compare(h, { changed: 2, added: 1, removed: 1, unchanged: 0 }); await h.button("All rows").click();
  const matrix = await download(h, "csv");
  assert.deepEqual(matrix, [
    ["status", "key:id", "original_record", "updated_record", "before:id", "after:id", "before:value", "after:value"],
    ["changed", "001", "2", "2", "001", "001", "\t=1+1", "\t@SUM(1,2)"],
    ["changed", "002", "3", "3", "002", "002", 'quote "before", and comma', 'quote "after", and comma'],
    ["removed", "003", "4", "", "003", "", "\t+5", ""],
    ["added", "004", "", "4", "", "004", "", "\t-10"],
  ]);
  await expect(h.results).toContainText("4 cells prefixed for spreadsheet-oriented protection");
  const exact = await download(h, "json");
  const record = (values, number) => ({ record: number, values });
  assert.deepEqual(exact, { version: 1, filter: "all", options: { keys: ["id"], columns: ["id", "value"], trimValues: false, ignoreCase: false },
    headers: { original: ["id", "value", "ignored"], updated: ["ignored", "value", "id"] }, counts: { added: 1, removed: 1, changed: 2, unchanged: 0 },
    ignoredColumns: { original: ["ignored"], updated: ["ignored"] }, normalizedCells: 0, exportedRows: 4,
    rows: [
      { id: 1, status: "changed", key: ["001"], before: record(a[0], 2), after: record(b[0], 2), changedColumns: ["value"] },
      { id: 2, status: "changed", key: ["002"], before: record(a[1], 3), after: record(b[1], 3), changedColumns: ["value"] },
      { id: 3, status: "removed", key: ["003"], before: record(a[2], 4), after: null, changedColumns: [] },
      { id: 4, status: "added", key: ["004"], before: null, after: record(b[2], 4), changedColumns: [] },
    ] });
  assert.equal(h.downloads.length, 2);
  await paste(h, csv([["id", "value"], ["001", "before\ncontinued, quoted"]]), csv([["id", "value"], ["001", "after\ncontinued, quoted"]]));
  await inspect(h, 1, 1); await key(h, "id").check(); await compare(h, { changed: 1, added: 0, removed: 0, unchanged: 0 });
  const multiline = await download(h, "csv");
  assert.equal(multiline.length, 2, "Multiline report has one logical data record, not one per physical line");
  assert.deepEqual(multiline[1].slice(-2), ["before\ncontinued, quoted", "after\ncontinued, quoted"]);
});

scenario("clear-confirm-and-swap", async h => {
  await inventory(h); const anchor = await prepare(h, "json"), href = await anchor.getAttribute("href");
  await confirm(h, h.button("Clear all"), false, /Clear both inputs and all results\?/);
  await expect(anchor).toHaveAttribute("href", href); await expect(h.field("original", "text")).toHaveValue(sample("inventory").original);
  await h.button("Swap sides").click(); await noResult(h, true);
  await expect(h.field("original", "text")).toHaveValue(sample("inventory").updated);
  await expect(h.field("updated", "text")).toHaveValue(sample("inventory").original);
  await inspect(h, 3, 3); await key(h, "sku").check(); await compare(h, { changed: 1, added: 1, removed: 1, unchanged: 1 });
  await expect(rowFor(h, "002")).toContainText("added"); await expect(rowFor(h, "004")).toContainText("removed");
  await review(h, "003"); await values(h, "stock", "7", "8");
  await confirm(h, h.button("Clear all"), true, /Downloaded files are not deleted/); await noResult(h, true);
  await expect(h.field("original", "file")).toBeVisible(); await expect(h.button("Inspect files")).toBeDisabled();
  await expect(h.button("Swap sides")).toBeDisabled(); await expect(h.workspace).toContainText("Workspace cleared. Downloaded files and clipboard data are not deleted.");
  assert.deepEqual(h.dialogs.map(dialog => dialog.accepted), [false, true]);
});

scenario("stale-results-and-downloads", async h => {
  await inventory(h); const originalUrl = await (await prepare(h, "json")).getAttribute("href");
  await h.field("original", "text").fill(`${sample("inventory").original}\n`); await noResult(h, true);
  await expect.poll(async () => (await h.probe()).blobs.find(blob => blob.url === originalUrl)?.revoked).toBe(true);
  await inspect(h, 3, 3); await key(h, "sku").check(); await compare(h, { changed: 1, added: 1, removed: 1, unchanged: 1 });
  await prepare(h, "csv"); await h.setup.getByRole("checkbox", { name: "Ignore outer whitespace in values", exact: true }).check();
  await noResult(h); await expect(h.setup).toBeVisible(); await expect(h.button("Compare CSV files")).toBeEnabled();
  await compare(h, { changed: 1, added: 1, removed: 1, unchanged: 1 }); await prepare(h, "json");
  await h.button("Added").click(); await expect(h.results).toBeVisible(); await expect(h.workspace.locator("a[download]")).toHaveCount(0);
  await prepare(h, "json"); await h.field("updated", "delimiter").selectOption(","); await noResult(h, true);
});

scenario("cancel-real-worker-late-delivery", async h => {
  await example(h); await inspect(h, 3, 3); await key(h, "sku").check();
  await h.control({ holdKind: "compare" }); await h.button("Compare CSV files").click();
  await expect.poll(async () => (await h.probe()).held).toBe(1); await expect(h.button("Cancel operation")).toBeVisible();
  await noResult(h); await h.button("Cancel operation").click();
  await expect(h.workspace).toContainText("Operation cancelled. Your inputs were kept; no partial result is shown.");
  await expect(h.field("original", "text")).toHaveValue(sample("inventory").original);
  const cancelled = (await h.probe()).workers.at(-1); assert.equal(cancelled.received[0].ok, true); assert.equal(cancelled.terminated, 1);
  await h.call("release"); await noResult(h); assert.equal((await h.probe()).released, 1);
  await compare(h, { changed: 1, added: 1, removed: 1, unchanged: 1 });
  h.evidence.push({ fault: "Real native compare response held then delivered after cancellation; no engine mock" });
}, { fault: "hold" });

scenario("worker-unavailable", async h => {
  await example(h); await h.button("Inspect files").click();
  await errorIs(h, /local worker could not start.*current browser and reload/);
  await expect(h.setup).toHaveCount(0); await expect(h.field("original", "text")).toHaveValue(sample("inventory").original);
  assert.equal((await h.probe()).workers.length, 0); assert.equal(h.workers.length, 0);
}, { fault: "unsupported" });

scenario("worker-production-watchdog", async h => {
  await example(h); await h.control({ holdKind: "inspect" }); await h.button("Inspect files").click();
  await expect.poll(async () => (await h.probe()).held).toBe(1);
  assert.deepEqual((await h.probe()).timers.map(timer => timer.delay), [15_000], "Captured the production delay, not a shorter test constant");
  await h.call("advanceWatchdog", 14_999); await expect(h.alert).toHaveCount(0); await expect(h.button("Cancel operation")).toBeVisible();
  await h.call("advanceWatchdog", 1); await errorIs(h, /exceeded 15 seconds and was stopped/); await expect(h.setup).toHaveCount(0);
  const timed = await h.probe(); assert(timed.timers[0].fired); assert.equal(timed.workers[0].terminated, 1);
  await h.call("release"); await expect(h.setup).toHaveCount(0); await noResult(h);
  await expect(h.field("original", "text")).toHaveValue(sample("inventory").original);
  await inspect(h, 3, 3);
  h.evidence.push({ fault: "Only exact 15000-ms watchdog clock advanced 14999+1 ms; real native response delivered late", wallClockTimingClaim: false });
}, { fault: "deadline" });

for (const theme of ["light", "dark"]) scenario(`responsive-keyboard-axe-${theme}`, async (h, variant) => {
  await expect(h.page.locator("html")).toHaveClass(new RegExp(`(?:^|\\s)${theme}(?:\\s|$)`));
  await h.page.keyboard.press("Tab"); await expect(h.page.getByRole("link", { name: "Skip to content", exact: true })).toBeFocused();
  await h.page.keyboard.press("Enter"); await expect(h.page.locator("#main-content")).toBeFocused();
  const faq = h.page.locator('section[aria-labelledby="csv-diff-faq-title"] details').first();
  await faq.locator("summary").focus(); await h.page.keyboard.press("Enter"); await expect(faq).toHaveAttribute("open", "");
  await noOverflow(h); await axe(h, `${variant.width}-${theme}-empty`);
  await h.workspace.scrollIntoViewIfNeeded(); await screenshot(h, "empty-workspace"); await faq.locator("summary").focus();
  await h.page.keyboard.press("Space"); await expect(faq).not.toHaveAttribute("open", "");
  const data = sample("inventory"); h.track(data.original); h.track(data.updated);
  await h.button(data.label).focus(); await h.page.keyboard.press("Enter");
  await expect(h.field("original", "text")).toHaveValue(data.original);
  await h.button("Inspect files").focus(); await h.page.keyboard.press("Enter"); await expect(h.setup).toBeVisible();
  await expect(h.button("Compare CSV files")).toBeDisabled(); await key(h, "sku").focus(); await h.page.keyboard.press("Space");
  await expect(key(h, "sku")).toBeChecked(); await h.button("Compare CSV files").focus(); await h.page.keyboard.press("Enter");
  await counts(h, { changed: 1, added: 1, removed: 1, unchanged: 1 }); await expect(h.results).toBeFocused();
  const table = h.workspace.getByRole("region", { name: "CSV comparison results", exact: true });
  await table.focus();
  if (await table.evaluate(node => node.scrollWidth > node.clientWidth + 1)) {
    await h.page.keyboard.press("ArrowRight"); await expect.poll(() => table.evaluate(node => node.scrollLeft)).toBeGreaterThan(0);
  }
  await review(h, "003"); await values(h, "stock", "8", "7");
  await noOverflow(h); await axe(h, `${variant.width}-${theme}-populated`);
  await h.review.scrollIntoViewIfNeeded(); await screenshot(h, "populated-review");
}, { variants: [320, 390, 768, 1440].map(width => ({ width, theme })) });

scenario("private-storage-and-network", async h => {
  await privateDocument(h); await privateStorage(h);
  const marker = "BV_CSV_PRIVATE_SENTINEL_817263";
  await paste(h, csv([["id", "value"], ["001", `${marker} https://example.invalid/never-fetch`]]), csv([["id", "value"], ["001", `${marker} updated`]]));
  await inspect(h, 1, 1); await key(h, "id").check(); await compare(h, { changed: 1, added: 0, removed: 0, unchanged: 0 });
  await review(h, "001"); await prepare(h, "json"); await privateStorage(h); await workerAudit(h);
  await h.page.getByRole("button", { name: "Toggle theme", exact: true }).click(); await expect(h.page.locator("html")).toHaveClass(/dark/);
  await privateStorage(h); h.snapshots.push(await h.probe());
  const response = await h.page.reload({ waitUntil: "load" }); assert.equal(response.status(), 200); await ready(h);
  await noResult(h, true); await expect(h.button("Inspect files")).toBeDisabled(); await expect(h.field("original", "file")).toBeVisible();
  await expect(h.page.locator("html")).toHaveClass(/dark/); await privateStorage(h); await privateDocument(h);
});

scenario("public-private-document-boundary", async h => {
  const before = await h.probe(); await h.page.evaluate(() => { window.__csvDocumentMarker = "public-before"; });
  await Promise.all([h.page.waitForEvent("domcontentloaded"), h.page.locator(`main a[href="${TOOL_PATH}"]`).click()]);
  await h.page.waitForURL(TARGET, { waitUntil: "load" }); await ready(h);
  assert.equal(await h.page.evaluate(() => window.__csvDocumentMarker), undefined, "Entering private route replaced the document");
  assert.notEqual((await h.probe()).documentId, before.documentId); await privateDocument(h); await privateStorage(h);
  await inventory(h); await workerAudit(h); h.snapshots.push(await h.probe());
  const privateId = (await h.probe()).documentId; await h.page.evaluate(() => { window.__csvDocumentMarker = "private-before"; });
  await Promise.all([h.page.waitForEvent("domcontentloaded"), h.page.getByRole("navigation", { name: "Breadcrumb", exact: true }).getByRole("link", { name: "Tools", exact: true }).click()]);
  await h.page.waitForURL(`${ORIGIN}/tools`, { waitUntil: "load" });
  assert.equal(await h.page.evaluate(() => window.__csvDocumentMarker), undefined, "Leaving private route replaced the document");
  assert.notEqual((await h.probe()).documentId, privateId);
  await expect(h.page.getByRole("button", { name: /Change language/ })).toBeVisible(); await expect(h.workspace).toHaveCount(0);
  h.evidence.push({ freshDocuments: { entering: true, leaving: true }, publicExternalAttemptsBlocked: h.requests.filter(r => r.category === "public-external-blocked").length });
}, { boundary: true, start: "/tools" });

scenario("no-javascript", async h => {
  await expect(h.page.locator("h1")).toHaveCount(1); await expect(h.workspace.locator("fieldset")).toHaveAttribute("disabled", "");
  for (const control of await h.workspace.locator("button,input,select,textarea").all()) await expect(control).toBeDisabled();
  const note = h.workspace.locator("noscript p"); await expect(note).toBeVisible();
  assert.match(await note.textContent(), /JavaScript is needed to compare files locally.*No file is sent/);
  await expect(h.workspace.locator("form")).toHaveCount(0); await noResult(h, true);
  const faqs = h.page.locator('section[aria-labelledby="csv-diff-faq-title"] details'); await expect(faqs).toHaveCount(5);
  await faqs.first().locator("summary").click(); await expect(faqs.first()).toHaveAttribute("open", "");
  await expect(faqs.first().locator("p")).toBeVisible(); await noOverflow(h); await privateDocument(h); await screenshot(h, "no-js");
}, { js: false });

const selected = cases.filter(entry => filter === undefined || entry.name.includes(filter));
assert(selected.length > 0, `No case matched --filter=${filter}; names: ${cases.map(entry => entry.name).join(", ")}`);
let fatal;
try {
  artifacts = await mkdtemp(join(tmpdir(), "byteverse-csv-diff-browser-"));
  fixtureDirectory = join(artifacts, "volatile-inputs"); await mkdir(fixtureDirectory);
  browser = await chromium.launch({ channel: "msedge", headless: true });
  let execution = 0;
  for (const entry of selected) for (const variant of entry.options.variants ?? [{}]) {
    let h, failure;
    const started = Date.now();
    const label = `${entry.name}${variant.width ? ` ${variant.width}px` : ""}`;
    try {
      h = await harness(entry, variant, ++execution); await entry.run(h, variant); await healthy(h);
    } catch (error) {
      h ??= error.harness; failure = errorText(error);
      if (h?.page && !h.page.isClosed()) await screenshot(h, "failure").catch(() => {});
    } finally {
      if (h?.context) {
        h.closing = true;
        try { await h.context.close(); } catch (error) { failure = `${failure ?? ""}\nContext cleanup: ${errorText(error)}`; }
      }
    }
    const result = { case: entry.name, variant, status: failure ? "FAIL" : "PASS", durationMs: Date.now() - started,
      ...(failure ? { error: failure } : {}), evidence: h?.evidence ?? [],
      audit: h ? { requests: h.requests, runtimeErrors: h.errors, guardErrors: h.guardErrors, console: h.console,
        nativeWorkers: h.workers, downloads: h.downloads, fileChoosers: h.chooserCount, dialogs: h.dialogs, secondaryPages: h.popups } : {} };
    results.push(result);
    if (failure) console.error(`FAIL ${label}\n${failure}`); else console.log(`PASS ${label}`);
  }
} catch (error) { fatal = errorText(error); console.error(`FAIL browser harness\n${fatal}`); }
finally {
  if (browser) try { await browser.close(); } catch (error) { fatal = `${fatal ?? ""}\nBrowser cleanup: ${errorText(error)}`; }
  if (fixtureDirectory) try { await rm(fixtureDirectory, { recursive: true, force: true }); } catch (error) { fatal = `${fatal ?? ""}\nFixture cleanup: ${errorText(error)}`; }
  const failures = results.filter(result => result.status === "FAIL").length;
  const summary = { suite: "csv-diff-browser", target: TARGET, browser: "native Microsoft Edge", partial: filter !== undefined,
    filter: filter ?? null, casesAvailable: cases.length, casesSelected: selected.map(entry => entry.name),
    casesNotSelected: cases.filter(entry => !selected.includes(entry)).map(entry => entry.name),
    executionsExpected: selected.reduce((total, entry) => total + (entry.options.variants?.length ?? 1), 0),
    executionsRun: results.length, passed: results.length - failures, failed: failures, fatal: fatal ?? null,
    apiPolicy: "Browser-only loopback GET/HEAD assets/documents; every API, write, socket and external request blocked",
    noBuildOrServerManagement: true, artifacts, results };
  if (artifacts) await writeFile(join(artifacts, "summary.json"), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify({ ...summary, results: undefined }, null, 2));
  if (fatal || failures || results.length !== summary.executionsExpected) process.exitCode = 1;
}