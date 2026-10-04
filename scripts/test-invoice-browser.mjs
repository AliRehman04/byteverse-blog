// Uses synthetic PDFs on an existing loopback preview; retained screenshots are not physical-device certification.
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, expect as playwrightExpect } from '@playwright/test';
import { build } from 'esbuild';
import { parseDocument } from 'htmlparser2';
import readExcelFile from 'read-excel-file/node';
import { jsPDF } from 'jspdf';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const TOOL_PATH = '/tools/invoice-pdf-to-excel';
const FRAME_PATH = '/invoice-workspace/frame.html';
const AUTHORIZED_ORIGIN = 'http://127.0.0.1:3036';
const PRODUCTION_ORIGIN = 'https://www.byteverse.fyi';
const FRAME_TIMEOUT = 20_000;
const DOCUMENT_TIMEOUT = 60_000; // Parent Next dev compilation is not the iframe's 20-second readiness budget.
const BATCH_TIMEOUT = 120_000;
const expect = playwrightExpect.configure({ timeout: FRAME_TIMEOUT });
const started = new Date();
const results = [];
const screenshots = [];
const measurements = {};
const archivedProbes = [];
const counts = {
  permittedLoopbackRequests: 0, blockedExternalRequests: 0,
  blockedParentApiOrOtherRequests: 0, blockedWebSockets: 0, permittedLoopbackDevSockets: 0,
  frameDocuments: 0, unexpectedFrameRequests: 0, unexpectedFrameSockets: 0,
  probeRouteCalls: 0, probeResponses: 0, probeFinished: 0,
  downloads: 0, unexpectedDownloads: 0, consumedDownloads: 0, downloadBytes: 0,
  parentKnownConsoleNoise: 0, parentOtherConsoleErrors: 0,
  frameConsoleErrors: 0, expectedProbeConsoleErrors: 0,
  framePageErrors: 0, parentPageErrors: 0, unclassifiedPageErrors: 0,
  playwrightInjectedServiceWorkerErrors: 0,
  unexpectedDialogs: 0, popups: 0,
  nativePointerActions: 0, verifiedNativePointerActions: 0,
};
const diagnosticErrors = [];
let preview;
let browser;
let context;
let page;
let frame;
let frameHeaders;
let screenshotDirectory;
let channel;
let activeGroup = 'setup';
let activeStep = 'validate the authorized preview';
let downloadIntent = null;
let ssr;
let fixture;
let worksheetData;
let templateBytes;
let serviceWorkerBlockerVerified = false;
const PLAYWRIGHT_SW_ERROR = "Failed to read the 'serviceWorker' property from 'Navigator': Service worker is disabled because the context is sandboxed and lacks the 'allow-same-origin' flag.";

function safeError(error) {
  return String(error?.message ?? error).replace(/\u001b\[[0-9;]*m/g, '').slice(0, 2300);
}

function validatePreview(input) {
  let parsed;
  try { parsed = new URL(input); } catch { throw new Error('INVOICE_PREVIEW_URL must be an absolute authorized loopback URL.'); }
  assert(parsed.protocol === 'http:' && parsed.hostname === '127.0.0.1', 'Refusing a non-loopback/non-HTTP preview.');
  assert.equal(parsed.origin, AUTHORIZED_ORIGIN, 'Refusing an origin outside the explicitly authorized loopback port 3036.');
  assert.equal(parsed.pathname, TOOL_PATH, 'Refusing a preview outside the invoice tool path.');
  assert(!parsed.username && !parsed.password && !parsed.search && !parsed.hash, 'Preview credentials, query strings and fragments are not accepted.');
  return parsed;
}

function allNodes(node, predicate, output = []) {
  if (predicate(node)) output.push(node);
  for (const child of node.children ?? []) allNodes(child, predicate, output);
  return output;
}
function nodeText(node) {
  return node.type === 'text' ? node.data : (node.children ?? []).map(nodeText).join('');
}
const normalizedText = node => nodeText(node).replace(/\s+/g, ' ').trim();
const tag = name => node => node.name === name;

function installBrowserProbe({ serviceWorkerBlockerVerified }) {
  const isFrame = location.pathname === '/invoice-workspace/frame.html';
  // Playwright may invoke an init script twice on a reused initial about:blank
  // global. Do not redefine non-configurable properties or duplicate listeners.
  if (window === window.parent && !Object.hasOwn(window, '__invoiceParentProbe')) {
    const messages = { count: 0, invalid: 0, minHeight: null, maxHeight: 0 };
    Object.defineProperty(window, '__invoiceParentProbe', { value: messages });
    window.addEventListener('message', event => {
      const iframe = document.querySelector('#invoice-converter iframe');
      if (!iframe || event.source !== iframe.contentWindow) return;
      messages.count++;
      const value = event.data;
      const valid = event.origin === 'null' && value && typeof value === 'object' && !Array.isArray(value) &&
        Object.keys(value).sort().join(',') === 'height,type' && value.type === 'byteverse-invoice-resize' &&
        Number.isInteger(value.height) && value.height >= 1 && value.height <= 2400;
      if (!valid) { messages.invalid++; return; }
      messages.minHeight = Math.min(messages.minHeight ?? value.height, value.height);
      messages.maxHeight = Math.max(messages.maxHeight, value.height);
    });
  }
  if (!isFrame || Object.hasOwn(window, '__invoiceProbe')) return;
  const stats = {
    workers: [], workerErrors: [], consoleErrors: [], windowErrors: [], rejections: [],
    storageReads: 0, deliberateStorageReads: 0, probingStorage: false, socketAttempts: 0,
    injectedServiceWorkerErrors: 0,
    blobsCreated: 0, blobsRevoked: 0, activeBlobs: new Set(),
    violations: [], gate: { armed: false, holding: 0, held: 0, released: 0, cancelled: 0, expired: 0 },
    releases: new Set(),
  };
  Object.defineProperty(window, '__invoiceProbe', { value: stats });
  const describe = value => value instanceof Error ? `${value.name}: ${value.message}` : String(value).slice(0, 700);
  window.addEventListener('error', event => {
    const error = event.error;
    // The installed Playwright blocker reads a forbidden native getter before
    // application startup. Count that exact injected exception separately; do not
    // suppress a stack originating in the invoice bundle or any other error.
    if (serviceWorkerBlockerVerified && error?.message === "Failed to read the 'serviceWorker' property from 'Navigator': Service worker is disabled because the context is sandboxed and lacks the 'allow-same-origin' flag." &&
        !String(error.stack).includes('/invoice-workspace/') && !String(error.stack).includes('blob:')) stats.injectedServiceWorkerErrors++;
    else stats.windowErrors.push(describe(error ?? event.message));
  });
  window.addEventListener('unhandledrejection', event => stats.rejections.push(describe(event.reason)));
  document.addEventListener('securitypolicyviolation', event => {
    stats.violations.push({ directive: event.effectiveDirective, probe: event.blockedURI.endsWith('/api/invoice-must-not-send') });
  });
  const originalError = console.error;
  console.error = function (...args) {
    stats.consoleErrors.push(args.map(describe).join(' ').slice(0, 1200));
    return Reflect.apply(originalError, this, args);
  };
  for (const key of ['localStorage', 'sessionStorage']) {
    const descriptor = Object.getOwnPropertyDescriptor(window, key);
    if (!descriptor?.get || !descriptor.configurable) continue;
    Object.defineProperty(window, key, { ...descriptor, get() {
      if (stats.probingStorage) stats.deliberateStorageReads++;
      else stats.storageReads++;
      return Reflect.apply(descriptor.get, this, []);
    } });
  }
  const NativeWebSocket = window.WebSocket;
  window.WebSocket = class ObservedNativeWebSocket extends NativeWebSocket {
    constructor(...args) { stats.socketAttempts++; super(...args); }
  };
  const originalCreate = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;
  URL.createObjectURL = function (...args) {
    const url = Reflect.apply(originalCreate, this, args);
    stats.blobsCreated++;
    stats.activeBlobs.add(url);
    return url;
  };
  URL.revokeObjectURL = function (url) {
    if (stats.activeBlobs.delete(url)) stats.blobsRevoked++;
    return Reflect.apply(originalRevoke, this, [url]);
  };
  const NativeWorker = window.Worker;
  window.Worker = class ObservedNativeWorker extends NativeWorker {
    constructor(url, options) {
      super(url, options);
      this.audit = { protocol: new URL(String(url), location.href).protocol, type: options?.type ?? 'classic', kind: 'unknown' };
      stats.workers.push(this.audit);
      this.terminated = false;
      this.pending = [];
      this.held = stats.gate.armed;
      if (this.held) {
        stats.gate.armed = false;
        stats.gate.held++;
        stats.gate.holding++;
        this.release = () => {
          if (!this.held || this.terminated) return;
          this.held = false;
          clearTimeout(this.timer);
          stats.gate.holding--;
          stats.gate.released++;
          stats.releases.delete(this.release);
          for (const args of this.pending.splice(0)) super.postMessage(...args);
        };
        stats.releases.add(this.release);
        this.timer = setTimeout(() => { stats.gate.expired++; this.release(); }, 12_000);
      }
      this.addEventListener('error', event => stats.workerErrors.push(String(event.message ?? 'Worker error').slice(0, 700)));
    }
    postMessage(...args) {
      const operation = args[0]?.operation;
      this.audit.kind = operation === 'group' || operation === 'extract' ? operation : 'pdf';
      if (this.held && !this.terminated) this.pending.push(args);
      else super.postMessage(...args);
    }
    terminate() {
      if (this.held) {
        this.held = false;
        stats.gate.holding--;
        stats.gate.cancelled++;
        stats.releases.delete(this.release);
      }
      clearTimeout(this.timer);
      this.pending.length = 0;
      this.terminated = true;
      super.terminate();
    }
  };
}

function requestIsInvoiceFrame(request) {
  try { return request.frame().url().includes(FRAME_PATH); } catch { return false; }
}
function isProbe(url) { return url.origin === preview.origin && url.pathname === '/api/invoice-must-not-send'; }

async function configureNetworkAndObservers() {
  await context.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.protocol === 'blob:' || url.protocol === 'data:') return route.continue();
    if (isProbe(url)) {
      counts.probeRouteCalls++;
      return route.abort('blockedbyclient'); // Defence in depth: still fails the CSP test if reached.
    }
    const document = request.isNavigationRequest() && url.origin === preview.origin && url.pathname === FRAME_PATH;
    if (requestIsInvoiceFrame(request) && !document) {
      counts.unexpectedFrameRequests++;
      return route.abort('blockedbyclient');
    }
    if (url.origin !== preview.origin) {
      counts.blockedExternalRequests++;
      return route.abort('blockedbyclient');
    }
    // No API calls, remote image proxying, arbitrary route/prefetch, or mutations.
    const asset = url.pathname.startsWith('/_next/static/') ||
      url.pathname === '/logo.png' || url.pathname === '/_next/image' && url.searchParams.get('url') === '/logo.png' ||
      /^\/(?:favicon(?:-\d+x\d+)?\.(?:ico|png)|apple-touch-icon\.png|site\.webmanifest)$/.test(url.pathname);
    if (!['GET', 'HEAD'].includes(request.method()) ||
        !(url.pathname === TOOL_PATH || url.pathname === FRAME_PATH || asset)) {
      counts.blockedParentApiOrOtherRequests++;
      return route.abort('blockedbyclient');
    }
    if (document) counts.frameDocuments++;
    counts.permittedLoopbackRequests++;
    return route.continue();
  });
  // Next 16 dev hydration consumes React debug chunks via its same-loopback HMR
  // socket. Closing that socket stalls hydration before the Open handler exists.
  // Permit ONLY this exact development endpoint, never an external socket. The
  // opaque invoice document still has connect-src 'none' and its own socket audit.
  await context.routeWebSocket('**/*', socket => {
    const url = new URL(socket.url());
    if (url.protocol === 'ws:' && url.host === preview.host && url.pathname === '/_next/webpack-hmr') {
      counts.permittedLoopbackDevSockets++;
      socket.connectToServer();
      return;
    }
    counts.blockedWebSockets++;
    socket.close();
  });
  context.on('response', response => {
    if (isProbe(new URL(response.url()))) counts.probeResponses++;
  });
  context.on('requestfinished', request => {
    if (isProbe(new URL(request.url()))) counts.probeFinished++;
  });
  context.on('page', observed => {
    observed.setDefaultTimeout(FRAME_TIMEOUT);
    observed.setDefaultNavigationTimeout(DOCUMENT_TIMEOUT);
    observed.on('popup', () => { counts.popups++; });
    observed.on('dialog', async dialog => {
      if (dialog.type() !== 'beforeunload') counts.unexpectedDialogs++;
      await dialog.accept();
    });
    observed.on('download', () => {
      counts.downloads++;
      if (downloadIntent?.page !== observed) counts.unexpectedDownloads++;
    });
    observed.on('console', message => {
      if (message.type() !== 'error') return;
      const text = message.text();
      const source = message.location().url;
      if (text.includes('/api/invoice-must-not-send') && /Content Security Policy|connect-src/i.test(text)) {
        counts.expectedProbeConsoleErrors++;
      } else if (source.includes(FRAME_PATH) || source.startsWith('blob:')) {
        counts.frameConsoleErrors++;
        diagnosticErrors.push({ scope: 'iframe-console', message: text.slice(0, 900) });
      } else if (/Content Security Policy|ERR_BLOCKED_BY_CLIENT|Service Worker registration blocked|WebSocket.*(?:failed|closed)/i.test(text)) {
        counts.parentKnownConsoleNoise++;
      } else {
        counts.parentOtherConsoleErrors++;
        diagnosticErrors.push({ scope: 'parent-console', message: text.slice(0, 900) });
      }
    });
    observed.on('pageerror', error => {
      const stack = String(error.stack ?? '');
      if (serviceWorkerBlockerVerified && error.message === PLAYWRIGHT_SW_ERROR && !stack.includes(FRAME_PATH) && !stack.includes('blob:')) {
        counts.playwrightInjectedServiceWorkerErrors++;
        diagnosticErrors.push({ scope: 'verified-playwright-sw-blocker', message: safeError(error), stack: stack.slice(0, 1200) });
        return;
      }
      if (stack.includes(FRAME_PATH) || stack.includes('blob:null/')) counts.framePageErrors++;
      else if (stack.includes('/_next/') || stack.includes(TOOL_PATH)) counts.parentPageErrors++;
      else counts.unclassifiedPageErrors++;
      diagnosticErrors.push({ scope: 'pageerror', message: safeError(error), stack: stack.slice(0, 1200) });
    });
    observed.on('websocket', socket => {
      if (socket.url().startsWith('blob:')) counts.unexpectedFrameSockets++;
    });
  });
  await context.addInitScript(installBrowserProbe, { serviceWorkerBlockerVerified });
}

async function loadFixtures() {
  const bundled = await build({
    absWorkingDir: ROOT, bundle: true, write: false, platform: 'node', format: 'esm', target: 'node20', metafile: true,
    stdin: { contents: 'export * from "./src/lib/invoice/samples.ts"; export * from "./src/lib/invoice/types.ts";', resolveDir: ROOT, loader: 'ts' },
  });
  assert(Object.keys(bundled.metafile.inputs).every(path => path === '<stdin>' || /src[\\/]lib[\\/]invoice[\\/](samples|types)\.ts$/.test(path)), 'Fixture bundle may import only samples and types.');
  fixture = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`);
  assert.equal(fixture.SAMPLE_INVOICES.length, 3);
}

function pdfFile(name, lines = fixture.SAMPLE_INVOICES[0].lines) {
  return { name, mimeType: 'application/pdf', buffer: Buffer.from(fixture.makeSamplePdf(lines)) };
}
function distinctPdf(name, number) {
  return pdfFile(name, fixture.SAMPLE_INVOICES[0].lines.map(line => line.startsWith('Invoice number:') ? `Invoice number: ${number}` : line));
}
function jsonFile(text, name = 'synthetic-template.json') {
  return { name, mimeType: 'application/json', buffer: Buffer.from(text) };
}
function multiPagePdf(pages) {
  const pdf = new jsPDF({ compress: false });
  pdf.setFontSize(12);
  pdf.text(fixture.SAMPLE_INVOICES[0].lines, 20, 20);
  for (let index = 2; index <= pages; index++) {
    pdf.addPage();
    pdf.text(`Synthetic continuation page ${index}`, 20, 20);
  }
  return { name: `synthetic-${pages}-pages.pdf`, mimeType: 'application/pdf', buffer: Buffer.from(pdf.output('arraybuffer')) };
}
function imageOnlyPdf() {
  const pdf = new jsPDF();
  pdf.addImage({ data: new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 255, 70, 70, 70, 255, 200, 200, 200, 255]), width: 2, height: 2 }, 'RGBA', 20, 20, 100, 100);
  return { name: 'synthetic-image-only.pdf', mimeType: 'application/pdf', buffer: Buffer.from(pdf.output('arraybuffer')) };
}

async function step(name, run) { activeStep = name; return run(); }
async function screenshot(name, targetPage = page) {
  if (!targetPage || targetPage.isClosed()) return;
  screenshotDirectory ??= await mkdtemp(join(tmpdir(), 'byteverse-invoice-browser-'));
  const path = join(screenshotDirectory, `${String(screenshots.length + 1).padStart(2, '0')}-${name}.png`);
  await targetPage.screenshot({ path, fullPage: false, timeout: FRAME_TIMEOUT });
  screenshots.push(path);
  console.log(`SCREENSHOT ${path}`);
}
async function group(id, name, run, requires = []) {
  const missing = requires.filter(required => results.find(item => item.id === required)?.status !== 'passed');
  if (missing.length) {
    results.push({ id, name, status: 'skipped', requires: missing });
    console.log(`SKIP ${id} ${name} (dependency: ${missing.join(', ')})`);
    return;
  }
  activeGroup = id;
  activeStep = name;
  const start = Date.now();
  console.log(`RUN  ${id} ${name}`);
  try {
    await run();
    results.push({ id, name, status: 'passed', milliseconds: Date.now() - start });
    console.log(`PASS ${id} ${name}`);
  } catch (error) {
    const failure = { id, name, status: 'failed', step: activeStep, error: safeError(error), milliseconds: Date.now() - start };
    results.push(failure);
    console.error(`FAIL ${id} at ${failure.step}\n${failure.error}`);
    try {
      if (page && !page.isClosed()) {
        console.error(`PARENT_STATE ${JSON.stringify(await page.evaluate(() => {
          const button = [...document.querySelectorAll('button')].find(element => element.textContent.includes('Open private converter'));
          const props = button && Object.keys(button).find(key => key.startsWith('__reactProps$'));
          return { invoiceIframes: document.querySelectorAll('#invoice-converter iframe').length, openHandlerBound: Boolean(props && typeof button[props]?.onClick === 'function') };
        }))}`);
      }
      if (frame && !frame.isDetached()) {
        const state = await frame.evaluate(() => ({
          statuses: Array.from(document.querySelectorAll('.iw-file-tags > .iw-pill:first-child')).reduce((counts, node) => {
            const status = node.textContent.trim(); counts[status] = (counts[status] ?? 0) + 1; return counts;
          }, {}),
          readyToExport: document.querySelector('.iw-export-top > .iw-pill')?.textContent,
          friendlyErrors: Array.from(document.querySelectorAll('.iw-file-error, .iw-preview-message[role="alert"], .iw-fallback')).map(node => node.textContent.trim().slice(0, 260)).slice(0, 4),
        }));
        console.error(`STATE ${JSON.stringify(state)}`);
        await frame.evaluate(() => { for (const release of [...(window.__invoiceProbe?.releases ?? [])]) release(); });
      }
      if (id.startsWith('24-') && page && !page.isClosed()) await page.evaluate(() => window.scrollTo(0, 0));
      await screenshot(`failure-${id}`);
    } catch (captureError) { console.error(`Failure capture unavailable: ${safeError(captureError).slice(0, 250)}`); }
  }
}

const fileInput = () => frame.getByLabel('Invoice PDF files', { exact: true });
const rows = () => frame.locator('.iw-file-list > .iw-file-row');
const review = () => frame.locator('#iw-review-panel');
const field = name => review().locator(`.iw-invoice-fields [id$="-field-${name}"]`);
const ack = () => review().locator('.iw-ack-label input[type="checkbox"]');
const mark = () => review().getByRole('button', { name: 'Mark reviewed', exact: true });
const exportButton = () => frame.locator('.iw-export-button');
function row(name) { return rows().filter({ has: frame.getByText(name, { exact: true }) }); }
function stat(name) {
  return frame.locator('.iw-stats > div').filter({ has: frame.getByText(name, { exact: true }) }).locator('dd');
}
async function waitIdle() {
  await expect(fileInput()).toBeEnabled({ timeout: BATCH_TIMEOUT });
  await expect(frame.locator('.iw-processing')).toHaveCount(0);
  await expect(frame.locator('.iw-file-tags > .iw-pill:first-child').filter({ hasText: /^(Queued|Reading PDF)$/ })).toHaveCount(0);
}

async function waitForPointerStability(target) {
  let previous;
  let unchanged = 0;
  await expect.poll(async () => {
    const geometry = await Promise.all([
      target.evaluate(element => {
        const rect = element.getBoundingClientRect();
        return [scrollX, scrollY, innerWidth, innerHeight, rect.x, rect.y, rect.width, rect.height];
      }),
      target.page().evaluate(() => {
        const rect = document.querySelector('#invoice-converter iframe')?.getBoundingClientRect();
        return [scrollX, scrollY, innerWidth, innerHeight, rect?.x, rect?.y, rect?.width, rect?.height];
      }),
    ]);
    const current = JSON.stringify(geometry);
    unchanged = current === previous ? unchanged + 1 : 0;
    previous = current;
    return unchanged >= 3;
  }, {
    timeout: FRAME_TIMEOUT, intervals: [50],
    message: 'The pointer target and its parent iframe must stop moving before native input.',
  }).toBe(true);
}

async function nativePointer(target, action = 'click') {
  // A child-local stable rectangle is insufficient while the parent smooth-
  // scrolls: observed trusted input landed on the outer iframe, not its button.
  // Finish existing motion, perform Playwright's actionability-only scroll,
  // then observe BOTH documents settling. No CSS overrides or repeated clicks.
  await waitForPointerStability(target);
  await target.click({ trial: true });
  await waitForPointerStability(target);
  const observation = await target.evaluateHandle(element => {
    const events = [];
    const types = ['pointerdown', 'pointerup', 'click'];
    const record = event => events.push({
      type: event.type, trusted: event.isTrusted, hit: event.composedPath().includes(element),
      target: `${event.target?.nodeName}: ${event.target?.textContent?.trim().slice(0, 80) ?? ''}`,
      localDownload: !event.isTrusted && event.type === 'click' && event.target instanceof HTMLAnchorElement &&
        event.target.hasAttribute('download') && event.target.href.startsWith('blob:'),
    });
    for (const type of types) element.ownerDocument.addEventListener(type, record, true);
    return { events, stop() {
      for (const type of types) element.ownerDocument.removeEventListener(type, record, true);
    } };
  });
  counts.nativePointerActions++;
  try {
    let inputError;
    try { await target[action](); } catch (error) { inputError = error; }
    const events = await observation.evaluate(value => value.events);
    // A real export click also makes the application's hidden Blob anchor click.
    // That separate, untrusted event cannot count as native-input proof; allow it
    // only during an explicit download, whose bytes are independently verified.
    assert(events.filter(event => !event.trusted).every(event => event.localDownload && downloadIntent?.page === target.page()),
      `Unexpected synthetic event during native ${action}: ${JSON.stringify(events)}`);
    assert.deepEqual(events.filter(event => event.trusted).map(event => [event.type, event.trusted, event.hit]), [
      ['pointerdown', true, true], ['pointerup', true, true], ['click', true, true],
    ], `Native ${action} must reach the intended control exactly once: ${JSON.stringify(events)}${inputError ? `\n${safeError(inputError)}` : ''}`);
    counts.verifiedNativePointerActions++;
    if (inputError) throw inputError; // Delivered input does not excuse a failed feature/state assertion.
  } finally {
    await observation.evaluate(value => value.stop());
    await observation.dispose();
  }
}

async function upload(files) { await fileInput().setInputFiles(files); await waitIdle(); }
async function selectInvoice(name) {
  const button = row(name).getByRole('button', { name: /^(?:Review|View review)$/ });
  await nativePointer(button);
  await expect(button).toHaveAttribute('aria-pressed', 'true');
  await expect(review().locator('.iw-review-title h3')).toHaveText(name);
  // The heading may already match before openReview's queued rAF has run.
  await expect(review()).toBeFocused();
}
async function edit(name, value) {
  await field(name).fill(value);
  await field(name).press('Tab');
  await expect(field(name)).toHaveValue(value);
}
async function markCurrent({ keyboard = false } = {}) {
  await expect(ack()).toBeEnabled();
  await expect(ack()).not.toBeChecked();
  await expect(mark()).toBeDisabled();
  if (keyboard) {
    await ack().focus();
    await ack().press('Space');
    await expect(ack()).toBeChecked();
    await ack().press('Tab');
    await expect(mark()).toBeFocused();
    await mark().press('Space');
  } else {
    await nativePointer(ack(), 'check');
    await expect(mark()).toBeEnabled();
    await nativePointer(mark());
  }
  await expect(review().locator('.iw-reviewed-message')).toContainText('Reviewed against this exact field and warning snapshot.');
}
async function clearBatch() {
  // Determine the contract before clicking, not from a transient post-click DOM
  // snapshot. Even a filtered batch with no visible rows still needs confirmation.
  const hadFiles = await frame.locator('.iw-stats').count() > 0;
  await nativePointer(frame.getByRole('button', { name: 'Clear workspace', exact: true }));
  const confirm = frame.getByRole('button', { name: 'Clear files, fields & templates', exact: true });
  if (hadFiles) {
    await expect(confirm).toBeVisible();
    await nativePointer(confirm);
  }
  await expect(confirm).toHaveCount(0);
  await expect(frame.locator('.iw-live-region')).toContainText('Files, fields, reviews and templates were removed');
  await expect(rows()).toHaveCount(0);
  await expect(exportButton()).toBeDisabled();
  await expect(fileInput()).toBeEnabled();
}
async function advanced(open = true) {
  const details = frame.locator('.iw-advanced');
  if ((await details.getAttribute('open') !== null) !== open) await nativePointer(details.locator(':scope > summary'));
}
async function currentFields() {
  return review().locator('.iw-invoice-fields input, .iw-invoice-fields select').evaluateAll(elements =>
    Object.fromEntries(elements.map(element => [element.id.split('-field-')[1], element.value])));
}
async function currencyTotals() {
  return frame.locator('.iw-currency-totals > div').evaluateAll(elements => elements.map(element => ({
    currency: element.querySelector('dt').firstChild.textContent.trim(),
    count: Number.parseInt(element.querySelector('dt span').textContent, 10),
    total: element.querySelector('dd').textContent.trim(),
  })));
}
async function readProbe(targetFrame = frame) {
  return targetFrame.evaluate(() => {
    const p = window.__invoiceProbe;
    return {
      workers: p.workers, workerErrors: p.workerErrors, consoleErrors: p.consoleErrors,
      windowErrors: p.windowErrors, rejections: p.rejections, storageReads: p.storageReads,
      socketAttempts: p.socketAttempts,
      injectedServiceWorkerErrors: p.injectedServiceWorkerErrors,
      deliberateStorageReads: p.deliberateStorageReads, activeBlobs: p.activeBlobs.size,
      blobsCreated: p.blobsCreated, blobsRevoked: p.blobsRevoked, violations: p.violations, gate: p.gate,
    };
  });
}
async function pauseNextWorker() {
  await frame.evaluate(() => {
    const p = window.__invoiceProbe;
    if (p.gate.armed || p.gate.holding) throw new Error('The controlled worker gate is already in use.');
    p.gate.armed = true;
  });
}
async function waitForHeldWorker() {
  await expect.poll(async () => (await readProbe()).gate.holding, { timeout: 8000 }).toBe(1);
}
async function releaseWorkers() {
  await frame.evaluate(() => { for (const release of [...window.__invoiceProbe.releases]) release(); });
}
async function drop(files, { text = false, outside = false } = {}) {
  const transfer = await frame.evaluateHandle(({ files, text }) => {
    const data = new DataTransfer();
    for (const file of files) data.items.add(new File([Uint8Array.from(atob(file.base64), char => char.charCodeAt(0))], file.name, { type: file.mimeType }));
    if (text) data.items.add('Synthetic non-file text', 'text/plain');
    return data;
  }, { files: files.map(file => ({ name: file.name, mimeType: file.mimeType, base64: file.buffer.toString('base64') })), text });
  try {
    const target = frame.locator(outside ? '.iw-shell' : '.iw-dropzone');
    await target.dispatchEvent('dragenter', { dataTransfer: transfer });
    await target.dispatchEvent('dragover', { dataTransfer: transfer });
    await target.dispatchEvent('drop', { dataTransfer: transfer });
  } finally { await transfer.dispose(); }
}
async function downloadFrom(button, extension) {
  assert.equal(downloadIntent, null, 'Downloads must be explicit and serial.');
  downloadIntent = { page, group: activeGroup };
  try {
    const [download] = await Promise.all([page.waitForEvent('download', { timeout: FRAME_TIMEOUT }), nativePointer(button)]);
    assert(download.url().startsWith('blob:'), 'Export must be a local Blob download.');
    assert(download.suggestedFilename().endsWith(`.${extension}`), 'Unexpected download extension.');
    const stream = await download.createReadStream();
    assert(stream, 'The real browser download must expose a readable stream.');
    const chunks = [];
    for await (const chunk of stream) chunks.push(Buffer.from(chunk));
    const bytes = Buffer.concat(chunks);
    assert(bytes.length > 0, 'The downloaded file is empty.');
    assert.equal(await download.failure(), null, 'The browser reported a failed download.');
    counts.consumedDownloads++;
    counts.downloadBytes += bytes.length;
    return bytes;
  } finally { downloadIntent = null; }
}

// Independent reader of the actual downloaded CSV, including quoted newlines.
function parseQuotedCsv(bytes, separator) {
  assert.deepEqual([...bytes.subarray(0, 3)], [0xEF, 0xBB, 0xBF], 'CSV requires a UTF-8 BOM.');
  const text = bytes.toString('utf8');
  const records = [];
  let offset = 1;
  while (offset < text.length) {
    const record = [];
    for (;;) {
      assert.equal(text[offset++], '"', 'Every CSV cell must be quoted.');
      let value = '';
      let closed = false;
      while (offset < text.length) {
        const character = text[offset++];
        if (character !== '"') value += character;
        else if (text[offset] === '"') { value += '"'; offset++; }
        else { closed = true; break; }
      }
      assert(closed, 'Unclosed CSV quote.');
      record.push(value);
      if (text[offset] === separator) { offset++; continue; }
      assert.equal(text.slice(offset, offset + 2), '\r\n', 'CSV rows must end in CRLF.');
      offset += 2;
      break;
    }
    records.push(record);
  }
  return records;
}

async function openWorkspace(targetPage = page) {
  const button = targetPage.getByRole('button', { name: 'Open private converter', exact: true });
  // SSR visibility is not hydration readiness. Only observe the real handler;
  // activation below remains a normal, trusted Playwright mouse click.
  await expect.poll(() => button.evaluate(element => {
    const key = Object.keys(element).find(name => name.startsWith('__reactProps$'));
    return Boolean(key && typeof element[key]?.onClick === 'function');
  }), { timeout: FRAME_TIMEOUT, message: 'The SSR Open button must finish real React hydration before clicking.' }).toBe(true);
  const [response] = await Promise.all([
    targetPage.waitForResponse(response => new URL(response.url()).pathname === FRAME_PATH, { timeout: FRAME_TIMEOUT }),
    nativePointer(button),
  ]);
  assert.equal(response.status(), 200, 'The real sandbox document must load.');
  await expect.poll(() => targetPage.frames().some(candidate => candidate.url().includes(FRAME_PATH)), { timeout: FRAME_TIMEOUT }).toBe(true);
  // Use the actual Frame: frameLocator can mis-handle this opaque sandbox.
  const selected = targetPage.frames().find(candidate => candidate.url().includes(FRAME_PATH));
  assert(selected, 'Invoice frame was not attached.');
  await expect(selected.getByRole('heading', { name: 'Your invoice workspace', exact: true })).toBeVisible({ timeout: FRAME_TIMEOUT });
  return { selected, headers: await response.allHeaders() };
}

async function checkCanvas() {
  const canvas = review().locator('.iw-canvas:not(.iw-canvas-hidden)');
  await expect(canvas).toBeVisible({ timeout: FRAME_TIMEOUT });
  const measured = await canvas.evaluate(element => {
    const data = element.getContext('2d').getImageData(0, 0, element.width, element.height).data;
    let nonwhite = 0;
    for (let index = 0; index < data.length; index += 4) {
      if (data[index + 3] > 0 && Math.min(data[index], data[index + 1], data[index + 2]) < 235) nonwhite++;
    }
    return { width: element.width, height: element.height, nonwhite };
  });
  assert(measured.width > 0 && measured.height > 0 && measured.width * measured.height <= 1_510_000, 'Canvas dimensions must be valid and bounded.');
  assert(measured.nonwhite > 100, 'The real PDF canvas must contain rendered ink, not a white/transparent placeholder.');
  return measured;
}

async function setDark(dark) {
  if (await page.locator('html').evaluate(element => element.classList.contains('dark')) !== dark) {
    await nativePointer(page.getByRole('button', { name: 'Toggle theme', exact: true }));
  }
  await expect(frame.locator('html')).toHaveAttribute('data-theme', dark ? 'dark' : 'light');
}

async function contrast() {
  return frame.evaluate(() => {
    function rgb(value) { return (value.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number); }
    function luminance(values) {
      const converted = values.map(value => value / 255).map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
      return converted[0] * 0.2126 + converted[1] * 0.7152 + converted[2] * 0.0722;
    }
    return ['.iw-header h2', '.iw-intro', '.iw-field > label', '.iw-field > input', '.iw-issue-warning', '.iw-export-button'].map(selector => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const style = getComputedStyle(element);
      let background = style.backgroundColor;
      let ancestor = element.parentElement;
      while ((!background || background === 'transparent' || background === 'rgba(0, 0, 0, 0)') && ancestor) {
        background = getComputedStyle(ancestor).backgroundColor;
        ancestor = ancestor.parentElement;
      }
      const a = luminance(rgb(style.color));
      const b = luminance(rgb(background));
      return { selector, ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05), disabled: Boolean(element.disabled) };
    }).filter(Boolean);
  });
}

async function layoutAt(width) {
  await page.setViewportSize({ width, height: 1000 });
  await expect.poll(async () => frame.evaluate(() => document.documentElement.clientWidth), { timeout: FRAME_TIMEOUT }).toBeGreaterThan(0);
  const measure = () => {
    const scroller = document.scrollingElement;
    const previous = scroller.scrollLeft;
    scroller.scrollLeft = scroller.scrollWidth;
    const maximumHorizontalScroll = scroller.scrollLeft;
    scroller.scrollLeft = previous;
    return {
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
      maximumHorizontalScroll, height: innerHeight, scrollHeight: scroller.scrollHeight,
      overflowY: getComputedStyle(scroller).overflowY,
      offenders: [...document.querySelectorAll('body *')].filter(element => {
        const box = element.getBoundingClientRect();
        return box.width > 0 && box.right > document.documentElement.clientWidth + 0.05 && getComputedStyle(element).position !== 'fixed';
      }).slice(0, 8).map(element => ({ tag: element.tagName, class: String(element.className).slice(0, 120), right: element.getBoundingClientRect().right })),
    };
  };
  const outer = await page.evaluate(measure);
  const inner = await frame.evaluate(measure);
  measurements[`viewport${width}`] = { outer, inner };
  const issues = [];
  for (const [name, measurement] of [['Outer', outer], ['Inner', inner]]) {
    if (measurement.clientWidth <= 0 || measurement.maximumHorizontalScroll > 0 || measurement.scrollWidth > measurement.clientWidth + 1) {
      issues.push(`${name} horizontal overflow at ${width}: ${JSON.stringify(measurement)}`);
    }
  }
  const height = await page.locator('#invoice-converter iframe').evaluate(element => element.getBoundingClientRect().height);
  assert(height >= 500 && height <= 2400, `Parent frame height is outside the 500–2400 bound: ${height}`);
  assert(inner.scrollHeight > inner.height, 'The populated capped frame must have scrollable content.');
  assert(!['hidden', 'clip'].includes(inner.overflowY), 'Frame document must not trap its scrollable footer.');
  const licenses = frame.locator('.iw-licenses > summary');
  await licenses.scrollIntoViewIfNeeded();
  await licenses.focus();
  await licenses.press('Space');
  await expect(frame.locator('.iw-licenses')).toHaveAttribute('open', '');
  const bounds = await licenses.evaluate(element => {
    const rect = element.getBoundingClientRect();
    return { top: rect.top, bottom: rect.bottom, height: innerHeight, scroll: document.scrollingElement.scrollTop };
  });
  assert(bounds.top >= -1 && bounds.bottom <= bounds.height + 1 && bounds.scroll > 0, `Footer cannot be reached inside the capped frame: ${JSON.stringify(bounds)}`);
  measurements[`viewport${width}`].footer = bounds;
  await licenses.press('Space');
  await review().locator('.iw-validation').scrollIntoViewIfNeeded();
  assert.equal(issues.length, 0, issues.join('\n'));
}

try {
  preview = validatePreview(process.env.INVOICE_PREVIEW_URL ?? `${AUTHORIZED_ORIGIN}${TOOL_PATH}`);
  await loadFixtures();
  // Verify the exact installed injection before attributing its native sandbox
  // getter error to tooling. Keep serviceWorkers:'block'; never relax the CSP.
  serviceWorkerBlockerVerified = (await readFile(join(ROOT, 'node_modules/playwright-core/lib/coreBundle.js'), 'utf8')).includes("if (navigator.serviceWorker) navigator.serviceWorker.register = async () => { console.warn('Service Worker registration blocked by Playwright'); };");
  for (const requestedChannel of ['msedge', 'chrome']) {
    try {
      browser = await chromium.launch({
        channel: requestedChannel, headless: true,
        args: ['--disable-background-networking', '--disable-component-update', '--disable-sync', '--dns-prefetch-disable', '--no-first-run', '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1'],
      });
      channel = requestedChannel;
      break;
    } catch (error) {
      if (requestedChannel === 'chrome') throw error;
      console.log('Installed Edge could not launch; trying installed Chrome. No browser download/install will be attempted.');
    }
  }
  context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: 'light', serviceWorkers: 'block', acceptDownloads: true, permissions: [] });
  await configureNetworkAndObservers();
  page = await context.newPage();
  console.log(`Invoice browser acceptance: ${preview.href}; ${channel} ${browser.version()}; fresh isolated context; synthetic inputs only.`);

  await group('01', 'SSR metadata, five FAQs, static instructions and unopened boundary', async () => {
    const response = await page.goto(preview.href, { waitUntil: 'domcontentloaded', timeout: DOCUMENT_TIMEOUT });
    assert.equal(response.status(), 200);
    ssr = parseDocument(await response.text());
    const headings = allNodes(ssr, tag('h1'));
    assert.equal(headings.length, 1, 'SSR must have exactly one H1.');
    const title = 'Invoice PDF to Excel, without the busywork.';
    assert.equal(normalizedText(headings[0]), title);
    assert.deepEqual(allNodes(ssr, tag('title')).map(nodeText), [title]);
    const metadata = allNodes(ssr, tag('meta'));
    const meta = (key, value) => metadata.filter(node => node.attribs[key] === value).map(node => node.attribs.content);
    assert.equal(meta('name', 'description').length, 1);
    assert.match(meta('name', 'description')[0], /20 files locally.*No OCR or signup/);
    assert.deepEqual(allNodes(ssr, node => node.name === 'link' && node.attribs.rel === 'canonical').map(node => node.attribs.href), [`${PRODUCTION_ORIGIN}${TOOL_PATH}`]);
    for (const url of [...meta('property', 'og:image'), ...meta('name', 'twitter:image')]) {
      const image = new URL(url);
      assert.equal(image.origin, PRODUCTION_ORIGIN);
      assert.equal(image.pathname, `${TOOL_PATH}/opengraph-image`);
    }
    assert(meta('property', 'og:image').length && meta('name', 'twitter:image').length, 'Both social images must be present.');
    const schemas = allNodes(ssr, node => node.name === 'script' && node.attribs.type === 'application/ld+json').flatMap(node => JSON.parse(nodeText(node)));
    const app = schemas.filter(schema => schema['@type'] === 'WebApplication');
    assert.equal(app.length, 1);
    assert.equal(app[0].url, `${PRODUCTION_ORIGIN}${TOOL_PATH}`);
    assert.equal(app[0].applicationCategory, 'BusinessApplication');
    assert.equal(app[0].offers.price, '0');
    assert.equal(app[0].isAccessibleForFree, true);
    assert(!JSON.stringify(schemas).includes('aggregateRating'), 'No fabricated aggregate rating is allowed.');
    const faq = schemas.filter(schema => schema['@type'] === 'FAQPage');
    assert.equal(faq.length, 1);
    assert.equal(faq[0].mainEntity.length, 5);
    const faqSection = allNodes(ssr, node => node.attribs?.id === 'faqs')[0];
    const visibleFaqs = allNodes(faqSection, tag('details'));
    assert.equal(visibleFaqs.length, 5);
    visibleFaqs.forEach((item, index) => {
      assert.equal(normalizedText(allNodes(item, tag('summary'))[0]), faq[0].mainEntity[index].name);
      assert.equal(normalizedText(allNodes(item, tag('p'))[0]), faq[0].mainEntity[index].acceptedAnswer.text);
    });
    for (const id of ['how-it-works', 'supported-files', 'data-fields', 'privacy-heading']) {
      assert.equal(allNodes(ssr, node => node.attribs?.id === id).length, 1, `Static SSR instructions missing: ${id}`);
    }
    assert.equal(allNodes(ssr, tag('iframe')).length, 0, 'SSR must not eagerly include the sandbox.');
    assert.equal(allNodes(ssr, node => node.name === 'input' && node.attribs.type === 'file').length, 0);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('iframe')).toHaveCount(0);
    await expect(page.locator('input[type="file"]')).toHaveCount(0);
    assert.equal(counts.frameDocuments, 0, 'No sandbox request before the normal Open click.');
  });

  await group('02', 'Normal open, opaque Frame, HTTP/meta CSP and bidirectional isolation', async () => {
    assert.equal(counts.frameDocuments, 0);
    ({ selected: frame, headers: frameHeaders } = await openWorkspace());
    const iframe = page.locator('#invoice-converter iframe');
    assert.deepEqual((await iframe.getAttribute('sandbox')).split(/\s+/).sort(), ['allow-downloads', 'allow-scripts']);
    assert.equal(await iframe.getAttribute('referrerpolicy'), 'no-referrer');
    await expect(page.locator('input[type="file"]')).toHaveCount(0);
    const httpCsp = frameHeaders['content-security-policy'];
    const metaCsp = await frame.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
    for (const policy of [httpCsp, metaCsp]) {
      assert.match(policy, /(?:^|;)\s*connect-src 'none'(?:;|$)/);
      assert.match(policy, /(?:^|;)\s*worker-src blob:(?:;|$)/);
      assert.match(policy, /(?:^|;)\s*default-src 'none'(?:;|$)/);
      assert(!policy.includes('allow-same-origin'));
    }
    assert.match(httpCsp, /sandbox allow-scripts allow-downloads/);
    assert.match(metaCsp, /script-src 'sha256-[A-Za-z0-9+/=]+'/);
    assert(!metaCsp.includes('unsafe-eval') && !metaCsp.includes("script-src 'unsafe-inline'"));
    assert.match(frameHeaders['x-robots-tag'], /noindex.*nofollow/);
    const parentAccess = await iframe.evaluate(element => {
      let blocked = false;
      try { void element.contentWindow.document.body; } catch (error) { blocked = error.name === 'SecurityError'; }
      return { blocked, contentDocumentNull: element.contentDocument === null };
    });
    assert.deepEqual(parentAccess, { blocked: true, contentDocumentNull: true });
    const childAccess = await frame.evaluate(() => {
      const state = { origin: window.origin, parentBlocked: false, localStorageBlocked: false, sessionStorageBlocked: false };
      try { void parent.document.body; } catch (error) { state.parentBlocked = error.name === 'SecurityError'; }
      window.__invoiceProbe.probingStorage = true;
      try { void window.localStorage; } catch (error) { state.localStorageBlocked = error.name === 'SecurityError'; }
      try { void window.sessionStorage; } catch (error) { state.sessionStorageBlocked = error.name === 'SecurityError'; }
      window.__invoiceProbe.probingStorage = false;
      return state;
    });
    assert.deepEqual(childAccess, { origin: 'null', parentBlocked: true, localStorageBlocked: true, sessionStorageBlocked: true });
    await expect.poll(() => page.evaluate(() => window.__invoiceParentProbe.count)).toBeGreaterThan(0);
    assert.equal(await page.evaluate(() => window.__invoiceParentProbe.invalid), 0);
    await expect(exportButton()).toBeDisabled();
    assert.equal(counts.downloads, 0);
  });

  await group('03', 'Synthetic own-loopback fetch rejected by CSP before reaching routing/server', async () => {
    const outcome = await frame.evaluate(async url => {
      try { await fetch(url, { method: 'GET', cache: 'no-store', credentials: 'omit' }); return 'unexpected-success'; }
      catch (error) { return error.name; }
    }, `${preview.origin}/api/invoice-must-not-send`);
    assert.equal(outcome, 'TypeError');
    await expect.poll(async () => (await readProbe()).violations.filter(item => item.probe && item.directive === 'connect-src').length).toBeGreaterThan(0);
    assert.equal(counts.probeRouteCalls, 0, 'CSP must block the probe before the defensive route is invoked.');
    assert.equal(counts.probeResponses, 0);
    assert.equal(counts.probeFinished, 0);
  }, ['02']);

  const secure = ['02', '03'];
  const samples = () => fixture.SAMPLE_INVOICES.map(item => item.name);
  await group('04', 'Three real sample PDFs extract expected fields through native Blob workers', async () => {
    await nativePointer(frame.getByRole('button', { name: /Try sample invoices/ }));
    await waitIdle();
    await expect(rows()).toHaveCount(3);
    await expect(stat('Failed')).toHaveText('0');
    await expect(stat('Needs review')).toHaveText('3');
    await expect(stat('Reviewed & exportable')).toHaveText('0');
    const expected = [
      { vendor: 'Northstar Design Studio', invoiceNumber: 'DEMO-001', invoiceDate: '2026-10-03', currency: 'USD', subtotal: '400', tax: '40', total: '440' },
      { vendor: 'Harbor Office Supplies', invoiceNumber: 'DEMO-002', invoiceDate: '2026-10-02', currency: 'EUR', subtotal: '125.5', tax: '25.1', total: '150.6' },
      { vendor: 'Northstar Design Studio', invoiceNumber: 'DEMO-003', invoiceDate: '2026-10-01', currency: 'USD', subtotal: '200', tax: '20', total: '250' },
    ];
    for (const [index, name] of samples().entries()) {
      await step(`read actual sample ${index + 1} fields`, async () => {
        await selectInvoice(name);
        assert.deepEqual(await currentFields(), { ...expected[index], discount: '', shipping: '' });
        await expect(review().locator('.iw-issue-error')).toHaveCount(0);
        if (index === 2) await expect(review().locator('.iw-issue-warning')).toContainText('220.00 USD');
        else await expect(review().locator('.iw-issue-warning')).toHaveCount(0);
        await expect(mark()).toBeDisabled();
      });
    }
    const probe = await readProbe();
    assert(probe.workers.filter(worker => worker.kind === 'group').length >= 3, 'Token grouping must run in real workers.');
    assert(probe.workers.filter(worker => worker.kind === 'extract').length >= 3, 'Extraction must run in real workers.');
    assert(probe.workers.filter(worker => worker.kind === 'pdf').length >= 3, 'Actual PDF readers must start.');
    assert(probe.workers.every(worker => worker.protocol === 'blob:' && worker.type === 'classic'));
    await expect(exportButton()).toBeDisabled();
    assert.equal(counts.downloads, 0);
  }, secure);

  await group('05', 'Original canvas renders ink and source-text tab exposes actual PDF lines', async () => {
    await selectInvoice(samples()[0]);
    measurements.canvas = await checkCanvas();
    await review().getByRole('tab', { name: 'Original PDF', exact: true }).focus();
    await review().getByRole('tab', { name: 'Original PDF', exact: true }).press('ArrowRight');
    await expect(review().getByRole('tab', { name: 'Source text', exact: true })).toBeFocused();
    await expect(review().locator('.iw-line-text').filter({ hasText: /^Invoice number: DEMO-001$/ })).toHaveCount(1);
    await expect(review().locator('.iw-line-text').filter({ hasText: /^Invoice total: 440\.00$/ })).toHaveCount(1);
    await review().getByRole('tab', { name: 'Source text', exact: true }).press('ArrowLeft');
    await checkCanvas();
    await frame.locator('.iw-header').scrollIntoViewIfNeeded();
    await screenshot('desktop-light-workspace');
  }, ['04']);

  await group('06', 'Invalid/unreviewed fields block export; native keyboard acknowledgement grants first review', async () => {
    await selectInvoice(samples()[0]);
    await edit('total', '-1');
    await expect(review().locator('.iw-issue-error')).toContainText('negative total');
    await expect(ack()).toBeDisabled();
    await expect(mark()).toBeDisabled();
    await expect(exportButton()).toBeDisabled();
    await edit('total', '440');
    await expect(ack()).not.toBeChecked();
    await markCurrent({ keyboard: true });
    await expect(stat('Reviewed & exportable')).toHaveText('1');
    assert.deepEqual(await currencyTotals(), [{ currency: 'USD', count: 1, total: '440.00' }]);
  }, ['04']);

  await group('07', 'Edits revoke review, preserve leading-zero text, and keep two currencies separate', async () => {
    await edit('invoiceNumber', '000042');
    await expect(stat('Reviewed & exportable')).toHaveText('0');
    await expect(ack()).not.toBeChecked();
    await expect(mark()).toBeDisabled();
    await edit('vendor', 'Northstar "Design"; Studio');
    await markCurrent();
    await selectInvoice(samples()[1]);
    await markCurrent();
    await expect(stat('Reviewed & exportable')).toHaveText('2');
    assert.deepEqual(await currencyTotals(), [{ currency: 'EUR', count: 1, total: '150.60' }, { currency: 'USD', count: 1, total: '440.00' }]);
  }, ['06']);

  await group('08', 'Mismatch requires explicit review; correcting 250 to 220 resets it again', async () => {
    await selectInvoice(samples()[2]);
    await expect(review().locator('.iw-issue-warning')).toContainText('220.00 USD');
    await expect(mark()).toBeDisabled();
    await markCurrent();
    await expect(stat('Reviewed & exportable')).toHaveText('3');
    await edit('total', '220');
    await expect(stat('Reviewed & exportable')).toHaveText('2');
    await expect(review().locator('.iw-issue-warning')).toHaveCount(0);
    await expect(ack()).not.toBeChecked();
    await markCurrent();
    assert.deepEqual(await currencyTotals(), [{ currency: 'EUR', count: 1, total: '150.60' }, { currency: 'USD', count: 2, total: '660.00' }]);
  }, ['07']);

  await group('09', 'Real XLSX download: independent reader, three sheets, exact rows and separate totals', async () => {
    await frame.getByLabel('Download format', { exact: true }).selectOption('xlsx');
    const bytes = await downloadFrom(exportButton(), 'xlsx');
    assert.deepEqual([...bytes.subarray(0, 4)], [0x50, 0x4B, 0x03, 0x04]);
    worksheetData = await readExcelFile(bytes, { trim: false });
    assert.deepEqual(worksheetData.map(sheet => sheet.sheet), ['Invoices', 'Currency totals', 'Review notes']);
    const invoices = worksheetData[0].data;
    assert.deepEqual(invoices[0], ['Supplier', 'Invoice number', 'Invoice date', 'Currency', 'Subtotal', 'Tax', 'Discount', 'Shipping', 'Invoice total', 'Source file', 'Source page(s)', 'Review notes']);
    assert.equal(invoices.length, 4);
    assert.equal(invoices[1][0], 'Northstar "Design"; Studio');
    assert.equal(invoices[1][1], '000042');
    assert.equal(typeof invoices[1][1], 'string');
    assert.deepEqual(invoices.slice(1).map(row => row.slice(2, 4)), [['2026-10-03', 'USD'], ['2026-10-02', 'EUR'], ['2026-10-01', 'USD']]);
    assert.deepEqual(invoices.slice(1).map(row => row[8]), [440, 150.6, 220]);
    assert(invoices.slice(1).every(row => row[6] === null && row[7] === null && row[10] === '1'));
    assert.deepEqual(worksheetData[1].data.slice(1).map(row => row.slice(0, 3)), [['EUR', 1, 150.6], ['USD', 2, 660]]);
    assert(invoices.slice(1).every(row => row[11].includes('Synthetic sample invoice; not a real transaction.')));
    assert.equal(worksheetData[2].data.slice(1).filter(row => row[6] === 'synthetic_sample').length, 3);
    await expect(frame.locator('.iw-export > .iw-sample-note')).toContainText('3 fictional sample invoices');
    measurements.xlsx = { bytes: bytes.length, sheets: 3, invoices: 3, currencies: 2 };
  }, ['08']);

  await group('10', 'Real semicolon CSV has BOM, quoted content, three reviewed rows and sample warnings', async () => {
    await frame.getByLabel('Download format', { exact: true }).selectOption('csv-semicolon');
    await expect(frame.getByRole('complementary', { name: 'CSV limitations' })).toContainText('CSV contains only Invoices');
    const bytes = await downloadFrom(exportButton(), 'csv');
    const csv = parseQuotedCsv(bytes, ';');
    assert.equal(csv.length, 4);
    assert.deepEqual(csv, worksheetData[0].data.map(row => row.map(value => value === null ? '' : String(value))));
    assert(bytes.toString('utf8').includes('"Northstar ""Design""; Studio"'));
    assert(!bytes.toString('utf8').includes('sep='));
    measurements.csv = { bytes: bytes.length, rows: csv.length - 1, columns: csv[0].length, delimiter: ';', utf8Bom: true };
  }, ['09']);

  await group('11', 'Excluded and subsequently unreviewed invoices really stay out of the downloaded CSV', async () => {
    await nativePointer(row(samples()[2]).getByRole('checkbox'), 'uncheck');
    await expect(stat('Reviewed & exportable')).toHaveText('2');
    let csv = parseQuotedCsv(await downloadFrom(exportButton(), 'csv'), ';');
    assert.deepEqual(csv.slice(1).map(row => row[1]), ['000042', 'DEMO-002']);
    await nativePointer(row(samples()[2]).getByRole('checkbox'), 'check');
    await expect(stat('Reviewed & exportable')).toHaveText('2');
    csv = parseQuotedCsv(await downloadFrom(exportButton(), 'csv'), ';');
    assert.deepEqual(csv.slice(1).map(row => row[1]), ['000042', 'DEMO-002']);
    await selectInvoice(samples()[2]);
    await markCurrent();
  }, ['10']);

  await group('12', 'Duplicate arrival revokes existing review AND an in-flight warning acknowledgement', async () => {
    await selectInvoice(samples()[0]);
    await nativePointer(review().getByRole('tab', { name: 'Source text', exact: true }));
    await upload([pdfFile('synthetic-duplicate-a.pdf')]);
    await expect(rows()).toHaveCount(4);
    await expect(stat('Reviewed & exportable')).toHaveText('2');
    await selectInvoice(samples()[0]);
    await expect(review().locator('.iw-issue-warning')).toContainText('same file content');
    await expect(ack()).not.toBeChecked();
    await nativePointer(review().getByRole('tab', { name: 'Source text', exact: true }));
    await pauseNextWorker();
    await fileInput().setInputFiles([pdfFile('synthetic-duplicate-b.pdf')]);
    await waitForHeldWorker();
    await selectInvoice(samples()[0]);
    await markCurrent(); // The old duplicate is explicitly acknowledged while the new reader is held.
    await expect(stat('Reviewed & exportable')).toHaveText('3');
    await releaseWorkers();
    await waitIdle();
    await expect(stat('Reviewed & exportable')).toHaveText('2');
    await expect(ack()).not.toBeChecked();
    await expect(mark()).toBeDisabled();
    await expect(review().locator('.iw-review-changed')).toContainText('duplicate checks changed');
    await nativePointer(row('synthetic-duplicate-a.pdf').getByRole('checkbox'), 'uncheck');
    await nativePointer(row('synthetic-duplicate-b.pdf').getByRole('button', { name: 'Remove synthetic-duplicate-b.pdf', exact: true }));
    await expect(review().locator('.iw-issue-warning')).toHaveCount(0);
    await expect(stat('Reviewed & exportable')).toHaveText('2');
    await expect(mark()).toBeDisabled();
    assert.equal((await readProbe()).gate.expired, 0, 'The controlled gate must not expire or fake an outcome.');
  }, ['08']);

  await group('13', 'Template import rejects malformed JSON, prototype keys, unknown keys and invalid sizes', async () => {
    await clearBatch();
    await advanced();
    const imports = frame.getByLabel('Import invoice mapping template', { exact: true });
    const cases = [
      ['{"version":', /not a valid invoice mapping JSON template/],
      ['{"version":1,"name":"Bad","labels":{},"__proto__":{"polluted":true}}', /Invalid template/],
      ['{"version":1,"name":"Bad","labels":{"constructor":"bad"}}', /Invalid template/],
      ['{"version":1,"name":"Bad","labels":{"prototype":"bad"}}', /Invalid template/],
      ['{"version":1,"name":"Bad","labels":{"notAField":"bad"}}', /Invalid template/],
      ['', /non-empty JSON template up to 16 KB/],
      ['x'.repeat(fixture.INVOICE_LIMITS.profileBytes + 1), /non-empty JSON template up to 16 KB/],
    ];
    for (const [index, [text, message]] of cases.entries()) {
      await step(`reject template case ${index + 1}`, async () => {
        await imports.setInputFiles(jsonFile(text));
        await expect(frame.locator('.iw-mapping [role="alert"]')).toContainText(message);
        await expect(frame.locator('.iw-mapping > .iw-note')).toContainText('Selected: Default labels');
        await expect(frame.getByLabel('Template name', { exact: false })).toHaveValue('My invoice template');
      });
    }
    assert.equal(await frame.evaluate(() => Object.prototype.polluted), undefined);
  }, secure);

  await group('14', 'Profile JSON download/import contains literal labels only and does not auto-apply', async () => {
    await upload([distinctPdf('synthetic-profile.pdf', 'PROFILE-ORIGINAL')]);
    await edit('invoiceNumber', '000007');
    await edit('invoiceDate', '2026-09-30');
    await markCurrent();
    await advanced();
    await frame.getByLabel('Template name', { exact: false }).fill('Synthetic literal labels');
    const labels = { vendor: 'Supplier', invoiceNumber: 'Invoice number', invoiceDate: 'Invoice date', currency: 'Currency', total: 'Invoice total' };
    for (const [key, value] of Object.entries(labels)) await frame.getByLabel(`${fixture.FIELD_LABELS[key]} label`, { exact: true }).fill(value);
    templateBytes = await downloadFrom(frame.getByRole('button', { name: 'Save template JSON', exact: true }), 'json');
    const template = JSON.parse(templateBytes.toString('utf8'));
    assert.deepEqual(template, { version: 1, name: 'Synthetic literal labels', labels });
    assert(!/000007|PROFILE-ORIGINAL|Northstar|2026-09-30|440/.test(templateBytes.toString('utf8')), 'Invoice values must not leak into the profile.');
    await nativePointer(frame.getByRole('button', { name: 'Use default labels', exact: true }));
    await frame.getByLabel('Import invoice mapping template', { exact: true }).setInputFiles({ name: 'synthetic-roundtrip.json', mimeType: 'application/json', buffer: templateBytes });
    await expect(frame.locator('.iw-mapping .iw-feedback')).toContainText('Imported into the editor only');
    await expect(frame.locator('.iw-mapping > .iw-note')).toContainText('Selected: Default labels');
    await expect(field('invoiceNumber')).toHaveValue('000007');
    await expect(stat('Reviewed & exportable')).toHaveText('1');
    await nativePointer(frame.getByRole('button', { name: 'Use template for new files', exact: true }));
    await expect(stat('Reviewed & exportable')).toHaveText('0');
    await expect(field('invoiceNumber')).toHaveValue('000007');
    await expect(field('invoiceDate')).toHaveValue('2026-09-30');
  }, ['13']);

  await group('15', 'Date-order change retains manual fields; only confirmed re-extraction replaces them', async () => {
    await markCurrent();
    await frame.getByLabel('Dates in the original PDF', { exact: true }).selectOption('dmy');
    await expect(stat('Reviewed & exportable')).toHaveText('0');
    await expect(field('invoiceDate')).toHaveValue('2026-09-30');
    await expect(field('invoiceNumber')).toHaveValue('000007');
    await markCurrent();
    await nativePointer(review().getByRole('tab', { name: 'Source text', exact: true }));
    const pdfWorkersBefore = (await readProbe()).workers.filter(worker => worker.kind === 'pdf').length;
    await nativePointer(frame.getByRole('button', { name: 'Re-extract included invoices', exact: true }));
    await nativePointer(frame.getByRole('button', { name: 'Keep current fields', exact: true }));
    await expect(field('invoiceNumber')).toHaveValue('000007');
    await expect(stat('Reviewed & exportable')).toHaveText('1');
    await nativePointer(frame.getByRole('button', { name: 'Re-extract included invoices', exact: true }));
    await nativePointer(frame.getByRole('button', { name: 'Replace fields & re-extract', exact: true }));
    await waitIdle();
    await expect(field('invoiceNumber')).toHaveValue('PROFILE-ORIGINAL');
    await expect(field('invoiceDate')).toHaveValue('2026-10-03');
    await expect(stat('Reviewed & exportable')).toHaveText('0');
    await expect(frame.locator('.iw-live-region')).toContainText('Manual edits were replaced and reviews cleared');
    assert.equal((await readProbe()).workers.filter(worker => worker.kind === 'pdf').length, pdfWorkersBefore, 'Re-extraction must use stored text, not reopen PDFs.');
  }, ['14']);

  await group('16', 'Multiple picker rejects empty, oversize, wrong-extension and fake-header files', async () => {
    await clearBatch();
    assert.equal(await fileInput().getAttribute('multiple'), '');
    assert.equal(await fileInput().getAttribute('accept'), '.pdf');
    const over = Buffer.alloc(fixture.INVOICE_LIMITS.fileBytes + 1);
    over.write('%PDF-1.4');
    await upload([
      { ...pdfFile('synthetic-wrong.txt'), mimeType: 'text/plain' },
      { name: 'synthetic-empty.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(0) },
      { name: 'synthetic-oversize.pdf', mimeType: 'application/pdf', buffer: over },
      { name: 'synthetic-fake-header.pdf', mimeType: 'application/pdf', buffer: Buffer.from('This is not a PDF.') },
    ]);
    await expect(rows()).toHaveCount(0);
    await expect(frame.locator('.iw-rejections li')).toHaveCount(4);
    for (const message of ['Only .pdf files are accepted', 'This file is empty', '10 MB per-file limit', 'No PDF header was found']) {
      await expect(frame.locator('.iw-rejections')).toContainText(message);
    }
    await expect(exportButton()).toBeDisabled();
  }, secure);

  await group('17', 'Damaged PDF, blank text and image-only scan fail with actionable, non-raw errors', async () => {
    await clearBatch();
    await upload([
      { name: 'synthetic-damaged.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\nSynthetic damaged structure\n%%EOF') },
      pdfFile('synthetic-blank-text.pdf', [' ', '   ']),
      imageOnlyPdf(),
    ]);
    await expect(rows()).toHaveCount(3);
    await expect(stat('Failed')).toHaveText('3');
    await expect(row('synthetic-damaged.pdf').locator('.iw-file-error')).toContainText('could not be read safely');
    for (const name of ['synthetic-blank-text.pdf', 'synthetic-image-only.pdf']) {
      await expect(row(name).locator('.iw-file-error')).toContainText('No readable digital text was found');
      await expect(row(name).locator('.iw-file-error')).toContainText('OCR is not included');
    }
    const errors = (await frame.locator('.iw-file-error').allTextContents()).join('\n');
    assert(!/TypeError|ReferenceError|InvalidPDFException|\bat \w+\s*\(/.test(errors), 'Raw library errors must not reach the UI.');
    await expect(exportButton()).toBeDisabled();
  }, secure);

  await group('18', '15-page boundary is accepted; a real 16-page PDF is explicitly rejected', async () => {
    await clearBatch();
    await upload([multiPagePdf(15), multiPagePdf(16)]);
    await expect(rows()).toHaveCount(2);
    await expect(stat('Failed')).toHaveText('1');
    await expect(row('synthetic-15-pages.pdf').locator('.iw-file-info')).toContainText('15 pages');
    await expect(row('synthetic-16-pages.pdf').locator('.iw-file-error')).toContainText('more than 15 pages');
    await selectInvoice('synthetic-15-pages.pdf');
    await expect(field('total')).toHaveValue('440');
    await expect(review().locator('.iw-page-controls > span')).toHaveText('1 / 15');
    await expect(review().getByRole('button', { name: 'Next source page', exact: true })).toBeEnabled();
    await expect(review().getByRole('button', { name: 'Previous source page', exact: true })).toBeDisabled();
  }, secure);

  await group('19', 'A genuine synthetic credit note is readable but blocked from review/export', async () => {
    await clearBatch();
    await upload([pdfFile('synthetic-credit-note.pdf', ['CREDIT NOTE', ...fixture.SAMPLE_INVOICES[0].lines])]);
    await expect(stat('Failed')).toHaveText('0');
    await expect(rows().locator('.iw-file-tags')).toContainText('Needs correction');
    await expect(review().locator('.iw-issue-error')).toContainText('Credit notes');
    await expect(ack()).toBeDisabled();
    await expect(mark()).toBeDisabled();
    await expect(exportButton()).toBeDisabled();
  }, secure);

  await group('20', '20 real PDF file limit rejects the 21st without dropping accepted files', async () => {
    await clearBatch();
    await upload(Array.from({ length: 21 }, (_, index) => distinctPdf(`synthetic-limit-${index + 1}.pdf`, `LIMIT-${index + 1}`)));
    await expect(rows()).toHaveCount(20);
    await expect(stat('Total files')).toHaveText('20');
    await expect(stat('Needs review')).toHaveText('20');
    await expect(stat('Failed')).toHaveText('0');
    await expect(frame.locator('.iw-rejections li')).toHaveCount(1);
    await expect(frame.locator('.iw-rejections')).toContainText('synthetic-limit-21.pdf');
    await expect(frame.locator('.iw-rejections')).toContainText('at most 20 files');
    await expect(exportButton()).toBeDisabled();
  }, secure);

  await group('21', 'Mixed DataTransfer drop processes PDFs and reports every rejected item', async () => {
    await clearBatch();
    await drop([distinctPdf('synthetic-drop-a.pdf', 'DROP-A'), distinctPdf('synthetic-drop-b.pdf', 'DROP-B'), { ...pdfFile('synthetic-drop.txt'), mimeType: 'text/plain' }], { text: true });
    await waitIdle();
    await expect(rows()).toHaveCount(2);
    await expect(stat('Failed')).toHaveText('0');
    await expect(frame.locator('.iw-rejections li')).toHaveCount(2);
    await expect(frame.locator('.iw-rejections')).toContainText('dropped link or text item');
    await expect(frame.locator('.iw-rejections')).toContainText('Only .pdf files');
    await drop([distinctPdf('synthetic-outside-drop.pdf', 'OUTSIDE')], { outside: true });
    await expect(frame.locator('.iw-live-region')).toContainText('Drop them in the upload area');
    await expect(rows()).toHaveCount(2);
  }, secure);

  await group('22', 'Cancel native ingestion, reject busy drop, retry all cancelled, preserve prior ready/reviewed file', async () => {
    await clearBatch();
    await upload([distinctPdf('synthetic-preserved.pdf', 'PRESERVED')]);
    await markCurrent();
    const before = await currentFields();
    await nativePointer(review().getByRole('tab', { name: 'Source text', exact: true }));
    await pauseNextWorker();
    await fileInput().setInputFiles([distinctPdf('synthetic-cancel-a.pdf', 'CANCEL-A'), distinctPdf('synthetic-cancel-b.pdf', 'CANCEL-B')]);
    await waitForHeldWorker();
    await drop([distinctPdf('synthetic-busy-drop.pdf', 'BUSY')]);
    await expect(frame.locator('.iw-live-region')).toContainText('Dropped files were not added while the workspace is busy');
    await nativePointer(frame.getByRole('button', { name: 'Cancel processing', exact: true }));
    await waitIdle();
    await expect(rows()).toHaveCount(3);
    await expect(row('synthetic-cancel-a.pdf').locator('.iw-file-tags')).toContainText('Cancelled');
    await expect(row('synthetic-cancel-b.pdf').locator('.iw-file-tags')).toContainText('Cancelled');
    await expect(row('synthetic-preserved.pdf').locator('.iw-file-tags')).toContainText('Reviewed');
    await selectInvoice('synthetic-preserved.pdf');
    assert.deepEqual(await currentFields(), before);
    assert((await readProbe()).gate.cancelled >= 1, 'Cancellation must terminate the actual held worker.');
    await nativePointer(frame.getByRole('button', { name: 'Retry all cancelled (2)', exact: true }));
    await waitIdle();
    await expect(stat('Failed')).toHaveText('0');
    await expect(stat('Needs review')).toHaveText('2');
    await expect(stat('Reviewed & exportable')).toHaveText('1');
    await expect(frame.getByRole('button', { name: /^Retry all cancelled/ })).toHaveCount(0);
    for (const name of ['synthetic-cancel-a.pdf', 'synthetic-cancel-b.pdf']) {
      await selectInvoice(name);
      await expect(field('total')).toHaveValue('440');
    }
    await selectInvoice('synthetic-preserved.pdf');
    assert.deepEqual(await currentFields(), before);
    assert.equal((await readProbe()).gate.expired, 0);
  }, secure);

  await group('23', 'Prepare populated warning/review layout and verify native dark-theme propagation/contrast', async () => {
    await clearBatch();
    await advanced(false);
    await nativePointer(frame.getByRole('button', { name: /Try sample invoices/ }));
    await waitIdle();
    await expect(stat('Failed')).toHaveText('0');
    await selectInvoice(samples()[0]);
    await markCurrent();
    await selectInvoice(samples()[2]);
    await checkCanvas();
    await setDark(false);
    measurements.lightContrast = await contrast();
    assert(measurements.lightContrast.every(item => item.disabled || item.ratio >= 4.5), `Light contrast below 4.5: ${JSON.stringify(measurements.lightContrast)}`);
    await setDark(true);
    measurements.darkContrast = await contrast();
    assert(measurements.darkContrast.every(item => item.disabled || item.ratio >= 4.5), `Dark contrast below 4.5: ${JSON.stringify(measurements.darkContrast)}`);
    await review().locator('.iw-validation').scrollIntoViewIfNeeded();
    await screenshot('desktop-dark-review');
  }, secure);

  for (const width of [320, 390, 768, 1440]) {
    await group(`24-${width}`, `Viewport ${width}: outer/inner overflow, capped iframe and keyboard-accessible footer`, async () => {
      await layoutAt(width);
      if (width === 320 || width === 390) await screenshot(`viewport-${width}-dark-review`);
      if (width === 1440) {
        await setDark(false);
        await review().locator('.iw-source-toolbar').scrollIntoViewIfNeeded();
        await screenshot('desktop-light-pdf');
      }
    }, ['23']);
  }

  await group('25', 'Clear removes rows/files/profile, revokes Blob URLs and disables export', async () => {
    await advanced();
    await frame.getByLabel('Template name', { exact: false }).fill('Synthetic clear test');
    await frame.getByLabel('Supplier label', { exact: true }).fill('Supplier');
    await nativePointer(frame.getByRole('button', { name: 'Use template for new files', exact: true }));
    await clearBatch();
    await expect(frame.locator('#iw-review-panel')).toHaveCount(0);
    await expect(frame.locator('.iw-stats')).toHaveCount(0);
    await expect(frame.locator('.iw-currency-totals')).toHaveCount(0);
    await expect(frame.locator('.iw-live-region')).toContainText('Files, fields, reviews and templates were removed');
    await advanced();
    await expect(frame.locator('.iw-mapping > .iw-note')).toContainText('Selected: Default labels');
    await expect(frame.getByLabel('Template name', { exact: false })).toHaveValue('My invoice template');
    await expect(frame.getByLabel('Supplier label', { exact: true })).toHaveValue('');
    await expect(frame.getByLabel('Dates in the original PDF', { exact: true })).toHaveValue('auto');
    await expect(frame.getByLabel('Download format', { exact: true })).toHaveValue('xlsx');
    assert.equal(await fileInput().evaluate(element => element.files.length), 0);
    await expect.poll(async () => (await readProbe()).activeBlobs).toBe(0);
    await expect(exportButton()).toBeDisabled();
  }, secure);

  await group('26', 'Entire run has resize-only messages, Blob/classic workers, no storage use or functional iframe errors', async () => {
    const probe = await readProbe();
    archivedProbes.push(probe);
    const messages = await page.evaluate(() => window.__invoiceParentProbe);
    assert(messages.count > 0);
    assert.equal(messages.invalid, 0, 'Only exact type/height resize payloads may reach the parent.');
    assert.equal(probe.storageReads, 0, 'Workspace controls must not read browser storage.');
    assert.equal(probe.socketAttempts, 0, 'The invoice frame must not attempt any WebSocket connection.');
    assert.equal(probe.deliberateStorageReads, 2, 'Both intentional storage-denial probes must have run.');
    assert(probe.workers.length > 0 && probe.workers.every(worker => worker.protocol === 'blob:' && worker.type === 'classic'));
    assert.deepEqual(probe.workerErrors, [], 'Functional iframe Worker errors.');
    assert.deepEqual(probe.consoleErrors, [], 'Functional iframe console errors.');
    assert.deepEqual(probe.windowErrors, [], 'Functional iframe window errors.');
    assert.deepEqual(probe.rejections, [], 'Unhandled iframe promise rejections.');
    assert.deepEqual(probe.violations.filter(item => !item.probe), [], 'Unexpected iframe CSP violations.');
    assert.equal(probe.gate.expired, 0);
    assert.equal(counts.unexpectedFrameRequests, 0, 'No HTTP requests may leave the loaded workspace.');
    assert.equal(counts.frameConsoleErrors, 0);
    assert.equal(counts.framePageErrors, 0);
    assert.equal(counts.unclassifiedPageErrors, 0, 'Unclassified page errors are not silently ignored.');
    assert.equal(counts.unexpectedDownloads, 0);
    assert.equal(counts.downloads, counts.consumedDownloads);
    assert.equal(counts.unexpectedDialogs, 0);
    assert.equal(counts.popups, 0);
    const storage = await context.storageState();
    assert.equal(storage.cookies.length, 0, 'Fresh preview must not accumulate cookies from invoice operations.');
    for (const origin of storage.origins) {
      assert.equal(origin.origin, preview.origin);
      assert(origin.localStorage.every(entry => entry.name === 'theme' && ['dark', 'light', 'system'].includes(entry.value)), 'Only the surrounding site theme preference may exist; no invoice/profile values.');
    }
    measurements.privacy = { resizeMessages: messages.count, invalidMessages: messages.invalid, workers: probe.workers.length, storageReads: probe.storageReads, frameHttpRequestsAfterDocument: counts.unexpectedFrameRequests };
  }, secure);

  await group('27', 'Reload an actually populated iframe and open a new page: both start empty', async () => {
    await upload([distinctPdf('synthetic-reload.pdf', 'RELOAD-ONLY')]);
    await markCurrent();
    archivedProbes.push(await readProbe());
    await frame.evaluate(() => location.reload());
    await expect.poll(() => page.frames().some(candidate => candidate.url().includes(FRAME_PATH))).toBe(true);
    frame = page.frames().find(candidate => candidate.url().includes(FRAME_PATH));
    await expect(frame.getByRole('heading', { name: 'Your invoice workspace', exact: true })).toBeVisible();
    await expect(rows()).toHaveCount(0);
    await expect(exportButton()).toBeDisabled();
    await advanced();
    await expect(frame.locator('.iw-mapping > .iw-note')).toContainText('Selected: Default labels');
    const newPage = await context.newPage();
    try {
      const response = await newPage.goto(preview.href, { waitUntil: 'domcontentloaded', timeout: DOCUMENT_TIMEOUT });
      assert.equal(response.status(), 200);
      await expect(newPage.locator('iframe')).toHaveCount(0);
      await expect(newPage.locator('input[type="file"]')).toHaveCount(0);
      const { selected } = await openWorkspace(newPage);
      await expect(selected.locator('.iw-file-row')).toHaveCount(0);
      await expect(selected.locator('.iw-export-button')).toBeDisabled();
      archivedProbes.push(await readProbe(selected));
    } finally { await newPage.close(); }
  }, secure);

  await group('28', 'Final privacy/error audit also includes reload and new-page activity', async () => {
    archivedProbes.push(await readProbe());
    for (const probe of archivedProbes) {
      assert.equal(probe.storageReads, 0);
      assert.equal(probe.socketAttempts, 0);
      assert.deepEqual([...probe.workerErrors, ...probe.consoleErrors, ...probe.windowErrors, ...probe.rejections], []);
      assert.equal(probe.gate.expired, 0);
    }
    assert.equal(counts.probeRouteCalls + counts.probeResponses + counts.probeFinished, 0);
    assert.equal(counts.unexpectedFrameRequests + counts.unexpectedFrameSockets, 0);
    assert.equal(counts.frameConsoleErrors + counts.framePageErrors + counts.unclassifiedPageErrors, 0, JSON.stringify(diagnosticErrors.filter(item => item.scope !== 'parent-console')));
    assert.equal(counts.unexpectedDownloads, 0);
    assert.equal(counts.downloads, counts.consumedDownloads);
    assert.equal(counts.popups + counts.unexpectedDialogs, 0);
    assert.equal(counts.verifiedNativePointerActions, counts.nativePointerActions, 'Every pointer action must deliver exactly one trusted click to its intended control.');
  }, secure);
} catch (error) {
  results.push({ id: 'setup', name: 'Harness setup or fatal browser failure', status: 'failed', step: activeStep, error: safeError(error) });
  console.error(`FATAL ${safeError(error)}`);
} finally {
  try { await context?.close(); } catch (error) { console.error(`Context cleanup: ${safeError(error)}`); }
  try { await browser?.close(); } catch (error) { console.error(`Browser cleanup: ${safeError(error)}`); }
  const summary = {
    started: started.toISOString(), finished: new Date().toISOString(), browserChannel: channel ?? null,
    passed: results.filter(item => item.status === 'passed').length,
    failed: results.filter(item => item.status === 'failed').length,
    skipped: results.filter(item => item.status === 'skipped').length,
    total: results.length, counts, measurements, screenshots, diagnostics: diagnosticErrors,
    scope: 'Synthetic, loopback-only, Chromium desktop channel; viewport emulation, not Safari/mobile-device certification.',
    completedTests: results,
  };
  console.log(`\nINVOICE_BROWSER_SUMMARY ${JSON.stringify(summary, null, 2)}`);
  console.log(`RESULT ${summary.passed}/${summary.total} groups passed; ${summary.failed} failed; ${summary.skipped} skipped.`);
  for (const path of screenshots) console.log(`RETAINED_SCREENSHOT ${path}`);
  if (summary.failed || summary.skipped) process.exitCode = 1;
}