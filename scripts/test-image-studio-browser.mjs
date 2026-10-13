// Existing production preview only. No server startup, builds, installs, Git, DB or env-file access.
// node scripts/test-image-studio-browser.mjs --full --baseURL http://127.0.0.1:3051
// Default --smoke: pristine/SEO, WebP download, 50 KB target. --full adds the matrix,
// geometry, cancellation, duplicate ZIP, offline and axe checks. --offline: pristine + offline.
// --headed is optional. Fixtures/downloads/failure artifacts use TEMP, never the repository.
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { chromium, expect as playwrightExpect } from "@playwright/test";
import sharp from "sharp";
import { unzipSync } from "fflate";
import exifr from "exifr";
import axe from "axe-core";

const args = process.argv.slice(2);
let mode = "smoke", baseURL = "http://127.0.0.1:3051", headed = false, screenshots = false, selectedMode = false;
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (["--smoke", "--full", "--offline", "--matrix", "--accessibility"].includes(arg)) {
    assert(!selectedMode, "Choose exactly one mode"); selectedMode = true; mode = arg.slice(2);
  } else if (arg === "--baseURL" || arg === "--base-url") baseURL = args[++i];
  else if (arg.startsWith("--baseURL=")) baseURL = arg.slice(10);
  else if (arg === "--headed") headed = true;
  else if (arg === "--screenshots") screenshots = true;
  else if (/^https?:\/\//.test(arg)) baseURL = arg;
  else throw new Error(`Unknown argument: ${arg}`);
}
const TOOL = "/tools/image-compressor", CANONICAL = `https://www.byteverse.fyi${TOOL}`;
const HERO = "/images/tools/image-compressor/hero-moraine-lake.webp";
const base = new URL(baseURL);
assert(base.protocol === "http:" && ["127.0.0.1", "localhost", "[::1]"].includes(base.hostname), "Loopback HTTP preview required");
assert(!base.username && !base.password && !base.search && !base.hash && ["/", TOOL, `${TOOL}/`].includes(base.pathname), "Origin or exact tool URL only");
const URL_TOOL = new URL(TOOL, base).href, JOB = 130_000;
const expect = playwrightExpect.configure({ timeout: 15_000 });
const formats = ["jpeg", "png", "webp", "avif"], extensions = { jpeg: "jpg", png: "png", webp: "webp", avif: "avif" };
const DOWNLOAD_UI = /^(?:edge|chrome):\/\/(?:downloads|downloads-hub)(?:[/?#]|$)/;
// Explicit protocol snapshot: intentionally no compilation/import of application TS or server code.
const settings = { mode: "quality", format: "webp", targetValue: 100, unit: "KB", quality: 75, minQuality: 40,
  preserveDimensions: true, resizeMode: "none", width: 1920, height: 1920, percent: 100, longestSide: 1920,
  lockAspect: true, allowUpscale: false, background: "#ffffff", allowJpegTransparency: false,
  pngLevel: 0, paletteColors: 0, crop: null, autoPreference: "balanced" };
const results = [];
let temp, browser, fixtures;
const button = (page, name) => page.getByRole("button", { name, exact: true });
const badges = page => page.locator(".studio-queue-badges > .studio-badge:first-child");
const formatLabels = { jpeg: "JPG", png: "PNG", webp: "WebP", avif: "AVIF", auto: "Auto" };
const chooseFormat = (page, format) => page.getByRole("group", { name: "Convert to" }).getByRole("button", { name: new RegExp(`^${formatLabels[format]}`) }).click();
const shortError = error => String(error?.stack ?? error).slice(0, 4000);

function pixels(width, height, alpha = false, noisy = false) {
  const channels = alpha ? 4 : 3, data = Buffer.alloc(width * height * channels);
  const colors = [[215, 25, 20], [15, 175, 60], [20, 45, 210], [225, 185, 15]];
  let seed = 0x5eed1234;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const offset = (y * width + x) * channels, color = colors[Number(x >= width / 2) + 2 * Number(y >= height / 2)];
    for (let c = 0; c < 3; c++) {
      seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
      data[offset + c] = noisy ? seed & 255 : color[c] + (x + y) % 17;
    }
    if (alpha) data[offset + 3] = x < width / 3 ? 0 : x < width * 2 / 3 ? 128 : 255;
  }
  return sharp(data, { raw: { width, height, channels } });
}
async function makeFixtures() {
  const put = async (name, bytes, width, height, alpha = false) => {
    const path = join(temp, name); await mkdir(dirname(path), { recursive: true }); await writeFile(path, bytes);
    return { path, bytes, width, height, alpha };
  };
  const jpeg = await put("photo.jpg", await pixels(640, 480).jpeg({ quality: 93, chromaSubsampling: "4:4:4" }).toBuffer(), 640, 480);
  const alpha = await put("alpha.png", await pixels(320, 240, true).png().toBuffer(), 320, 240, true);
  const noise = await put("noise.png", await pixels(768, 512, false, true).png().toBuffer(), 768, 512);
  const cancel = await put("cancel.png", await pixels(1024, 768, false, true).png().toBuffer(), 1024, 768);
  const twins = [await put("one/same.jpg", jpeg.bytes, 640, 480),
    await put("two/same.jpg", await sharp(jpeg.bytes).flop().jpeg({ quality: 93 }).toBuffer(), 640, 480)];
  let gps = null;
  if (typeof sharp(jpeg.bytes).withExif === "function") {
    const bytes = await sharp(jpeg.bytes).withMetadata({ orientation: 6 }).withExif({
      IFD0: { Make: "Synthetic fixture", Model: "Not a real camera" },
      IFD3: { GPSLatitudeRef: "N", GPSLatitude: "51/1 30/1 0/1", GPSLongitudeRef: "W", GPSLongitude: "0/1 7/1 30/1" },
    }).jpeg({ quality: 93 }).toBuffer();
    assert.equal((await sharp(bytes).metadata()).orientation, 6);
    const tags = await exifr.parse(bytes); assert(Number.isFinite(tags?.latitude) && Number.isFinite(tags?.longitude), "Fixture GPS was not written");
    gps = await put("rotated-gps.jpg", bytes, 480, 640);
  } else results.push({ name: "EXIF/GPS fixture", status: "SKIP", reason: "Installed sharp has no withExif" });
  return { jpeg, alpha, noise, cancel, twins, gps };
}
async function verifyImage(bytes, format, dimensions, alpha = false) {
  assert(bytes.length > 50, "Empty/trivial download");
  const meta = await sharp(bytes, { failOn: "warning" }).metadata();
  assert.equal(meta.format, format === "avif" ? "heif" : format, "Decoded format differs from extension/MIME");
  if (format === "avif") assert.equal(meta.compression, "av1");
  if (dimensions) assert.deepEqual([meta.width, meta.height], dimensions);
  assert(!meta.exif && !meta.xmp && !meta.iptc && (!meta.orientation || meta.orientation === 1), "Source metadata survived export");
  const decoded = await sharp(bytes, { failOn: "warning" }).ensureAlpha().raw().toBuffer();
  assert.equal(decoded.length, meta.width * meta.height * 4, "Full pixel decode failed");
  assert(decoded.some((v, i) => i % 4 !== 3 && v > 30), "No synthetic image pixels");
  if (alpha) assert(meta.hasAlpha && decoded.some((v, i) => i % 4 === 3 && v < 250), "Transparency was flattened");
  return { meta, decoded };
}

async function run(name, body, options = {}) {
  const s = { audit: { denied: [], earlyWasm: [], errors: [], console: [], workers: [], requestFailures: [] }, cold: true, offline: false, intent: false, downloads: 0, notes: [] };
  let context;
  try {
    context = await browser.newContext({ acceptDownloads: true, serviceWorkers: "allow", viewport: { width: 1440, height: 1000 },
      colorScheme: "light", reducedMotion: "reduce", ...options });
    s.context = context;
    const permitted = request => {
      const u = new URL(request.url());
      if (["blob:", "data:", "edge:", "chrome:"].includes(u.protocol)) return true; // Browser UI schemes are not website network requests.
      return u.origin === base.origin && ["GET", "HEAD"].includes(request.method()) &&
        (u.pathname === TOOL || u.pathname === `${TOOL}/` || u.pathname.startsWith("/_next/static/") || u.pathname.startsWith("/image-studio/") ||
          u.pathname === "/logo.png" || u.pathname === HERO ||
          /^\/(?:image-studio-sw\.js|favicon(?:-\d+x\d+)?\.(?:ico|png)|apple-touch-icon\.png|android-chrome-(?:192x192|512x512)\.png|(?:site|image-studio)\.webmanifest)$/.test(u.pathname));
    };
    context.on("request", request => {
      if (!permitted(request)) s.audit.denied.push(`${request.method()} ${request.url()}`);
      if (s.cold && new URL(request.url()).pathname.endsWith(".wasm")) s.audit.earlyWasm.push(request.url());
      if (s.offline && request.serviceWorker()) s.audit.errors.push(`Offline service worker attempted network: ${request.url()}`);
    });
    // SW-served requests can bypass routing; context request observation also covers its fetches.
    await context.route("**/*", route => !permitted(route.request()) ? route.abort("blockedbyclient")
      : s.offline && /^https?:/.test(route.request().url()) ? route.abort("internetdisconnected") : route.continue());
    await context.routeWebSocket("**/*", socket => { s.audit.denied.push(socket.url()); socket.close(); });
    context.on("response", response => { if (response.status() >= 400) s.audit.errors.push(`HTTP ${response.status()}: ${response.url()}`); });
    context.on("requestfailed", request => s.audit.requestFailures.push({ url: request.url(), failure: request.failure()?.errorText }));
    const page = await context.newPage(); s.page = page;
    page.setDefaultTimeout(15_000); page.setDefaultNavigationTimeout(45_000);
    page.on("pageerror", error => s.audit.errors.push(shortError(error)));
    page.on("console", message => {
      if (message.type() !== "error") return;
      const text = message.text(), source = message.location().url;
      if (s.offline && /^Failed to load resource: net::ERR_INTERNET_DISCONNECTED$/.test(text) &&
        /^\/(?:favicon(?:-\d+x\d+)?\.(?:ico|png)|apple-touch-icon\.png|site\.webmanifest)$/.test(new URL(source || URL_TOOL, URL_TOOL).pathname)) s.notes.push("Uncached offline browser icon request");
      else s.audit.console.push(`${source}: ${text.slice(0, 1000)}`);
    });
    page.on("worker", worker => s.audit.workers.push(worker.url()));
    page.on("download", () => { s.downloads++; if (!s.intent) s.audit.errors.push("Unrequested automatic download"); });
    page.on("dialog", dialog => { s.audit.errors.push(`Unexpected ${dialog.type()} dialog`); void dialog.dismiss(); });
    context.on("page", extra => {
      // Keep the original page reference: Edge's downloads hub is browser UI, not the site.
      const classify = () => {
        const url = extra.url();
        if (!url || url === "about:blank") return; // Edge creates its download hub before assigning its internal URL.
        if (DOWNLOAD_UI.test(url)) void extra.close().catch(() => {});
        else if (url !== "about:blank") s.audit.errors.push(`Unexpected popup: ${url}`);
      };
      extra.on("framenavigated", frame => { if (frame === extra.mainFrame()) classify(); }); classify();
    });
    const response = await page.goto(URL_TOOL, { waitUntil: "load" }); assert.equal(response.status(), 200);
    await expect(button(page, "Download offline pack")).toBeEnabled({ timeout: 90_000 });
    await expect(page.getByRole("checkbox", { name: "Live size estimate" })).toBeEnabled();
    await page.getByRole("checkbox", { name: "Live size estimate" }).uncheck();
    const outcome = await body(s);
    assert.equal(new URL(page.url()).origin, base.origin); assert.equal(new URL(page.url()).pathname, TOOL);
    assert.deepEqual(s.audit.denied, [], "Non-static/cross-origin/model request attempted");
    assert.deepEqual(s.audit.earlyWasm, [], "Codec WASM requested before image import or explicit offline-pack action");
    assert.deepEqual(s.audit.errors, [], "Browser/runtime errors");
    assert.deepEqual(s.audit.console, [], "Unexpected browser console errors");
    assert(context.pages().every(p => p === page || DOWNLOAD_UI.test(p.url())), "Unexpected extra page");
    results.push({ name, status: outcome?.skip ? "SKIP" : "PASS", ...outcome, downloads: s.downloads, notes: s.notes });
    console.log(`[${outcome?.skip ? "SKIP" : "PASS"}] ${name}${outcome?.skip ? `: ${outcome.skip}` : ""}`);
  } catch (error) {
    const failure = { name, status: "FAIL", error: shortError(error), audit: s.audit };
    results.push(failure); console.error(`[FAIL] ${name}\n${failure.error}`);
    const stem = name.replace(/[^a-z0-9]+/gi, "-");
    await writeFile(join(temp, `${stem}.json`), JSON.stringify(failure, null, 2));
    if (s.page && !s.page.isClosed()) await s.page.screenshot({ path: join(temp, `${stem}.png`), fullPage: true, timeout: 10_000 }).catch(() => {});
  } finally { await context?.close(); }
}
async function importFiles(s, files) {
  const old = await badges(s.page).count();
  const [chooser] = await Promise.all([s.page.waitForEvent("filechooser"), button(s.page, /Drop images here, or browse files/).click()]);
  s.cold = false; await chooser.setFiles(files.map(file => file.path));
  await expect.poll(async () => (await badges(s.page).allTextContents()).filter(status => status === "Inspecting").length, { timeout: JOB }).toBe(0);
  assert.deepEqual(await badges(s.page).allTextContents(), Array(old + files.length).fill("Ready"), `Inspection failed: ${(await s.page.locator(".studio-queue-card > .studio-field-error").allTextContents()).join("; ")}`);
  assert(s.audit.workers.some(url => url === `${base.origin}/image-studio/worker.js`), "UI did not start the real worker");
}
async function quality(s, format) {
  await button(s.page, "Quality").click(); await chooseFormat(s.page, format);
  if (format !== "png") await s.page.getByLabel("Quality (1–100)", { exact: true }).fill("75");
  else await s.page.getByLabel("Optimization effort (0–6)").selectOption("0");
}
async function compress(s, count = 1) {
  await expect(button(s.page, "Compress images")).toBeEnabled(); await button(s.page, "Compress images").click();
  await expect(s.page.locator(".studio-live-message")).toContainText("Batch finished:", { timeout: JOB });
  await expect(badges(s.page)).toHaveText(Array(count).fill("Complete"));
  await expect(s.page.locator(".studio-result-facts")).toContainText("WASM");
}
async function download(s, label, extension) {
  s.intent = true;
  try {
    const [item] = await Promise.all([s.page.waitForEvent("download", { timeout: 30_000 }), button(s.page, label).click()]);
    let completed = null;
    void item.path().then(path => { completed = { path }; }, error => { completed = { error: shortError(error) }; });
    await expect.poll(() => completed, { timeout: 30_000 }).not.toBeNull();
    assert(!completed.error && completed.path, completed.error || "Download did not finish");
    assert.equal(await item.failure(), null); assert(item.suggestedFilename().endsWith(`.${extension}`));
    const bytes = await readFile(completed.path);
    await s.page.bringToFront(); await s.page.keyboard.press("Escape");
    if (label === "Download image") await expect(s.page.locator(".studio-result-download")).toContainText(`${bytes.length.toLocaleString("en-US")} bytes`);
    return bytes;
  } finally { s.intent = false; }
}
async function verifyZip(s, format = "webp") {
  const entries = Object.entries(unzipSync(await download(s, "Download ZIP", "zip")));
  assert.equal(entries.length, 2, "Duplicate source basenames overwrote a ZIP entry");
  assert.equal(new Set(entries.map(([name]) => name.normalize("NFC").toLowerCase())).size, 2);
  assert.equal(new Set(entries.map(([, bytes]) => Buffer.from(bytes).toString("base64"))).size, 2, "Different sources produced duplicate ZIP payloads");
  for (const [name, bytes] of entries) {
    assert(!/[\\/]/.test(name) && !name.startsWith(".") && name.endsWith(`.${extensions[format]}`), `Unsafe/wrong ZIP filename: ${name}`);
    await verifyImage(Buffer.from(bytes), format, [640, 480]);
  }
}
async function worker(s, fixture, action, patch = {}) {
  await s.page.evaluate(({ bytes, action, settings }) => {
    const state = { worker: new Worker("/image-studio/worker.js", { type: "module" }), reply: null };
    window.__imageHarness = state;
    state.worker.onmessage = ({ data }) => { if (data.id === "browser-harness" && data.kind !== "progress") state.reply = data; };
    state.worker.onerror = event => { state.reply = { kind: "error", message: event.message }; };
    state.worker.onmessageerror = () => { state.reply = { kind: "error", message: "Worker message could not be decoded" }; };
    state.worker.postMessage({ id: "browser-harness", action, file: new Blob([Uint8Array.from(atob(bytes), c => c.charCodeAt(0))]),
      maxPixels: 12_000_000, ...(action === "process" ? { settings } : {}) });
  }, { bytes: fixture.bytes.toString("base64"), action, settings: { ...settings, ...patch } });
  try {
    await expect.poll(() => s.page.evaluate(() => window.__imageHarness.reply?.kind ?? "pending"), { timeout: JOB }).not.toBe("pending");
    return await s.page.evaluate(async () => {
      const reply = window.__imageHarness.reply;
      if (reply.kind === "error") return reply;
      const value = { ...reply.value }, output = value.blob ?? value.preview;
      delete value.blob; delete value.preview; delete value.reference;
      const bytes = new Uint8Array(await output.arrayBuffer()); let binary = "";
      for (let i = 0; i < bytes.length; i += 32768) binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
      return { kind: reply.kind, ...value, mime: output.type, bytes: btoa(binary) };
    });
  } finally { await s.page.evaluate(() => { window.__imageHarness?.worker.terminate(); delete window.__imageHarness; }); }
}
async function axeCheck(s) {
  await s.page.evaluate(() => document.fonts.ready.then(() => true));
  await s.page.addScriptTag({ content: axe.source });
  const audit = await s.page.evaluate(async () => {
    const result = await window.axe.run(document, { resultTypes: ["violations", "incomplete"] });
    return { incomplete: result.incomplete.length, violations: result.violations.filter(v => ["serious", "critical"].includes(v.impact))
      .map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })) };
  });
  s.notes.push(`axe incomplete/manual-review rules: ${audit.incomplete}`); assert.deepEqual(audit.violations, []);
}

try {
  temp = await mkdtemp(join(tmpdir(), "image-studio-browser-")); fixtures = await makeFixtures();
  browser = await chromium.launch({ channel: "msedge", headless: !headed, downloadsPath: join(temp, "downloads") });
  await run("pristine privacy and SEO", async s => {
    const p = s.page; await expect(p.locator("h1")).toHaveCount(1); await expect(p).toHaveTitle(/ImageFixer/);
    await expect(p.getByRole("banner")).toHaveCount(1);
    await expect(p.getByRole("contentinfo")).toHaveCount(1);
    await expect(p.getByRole("banner").getByRole("img", { name: "ByteVerse", exact: true })).toHaveAttribute("src", "/logo.png");
    await expect(p.getByRole("contentinfo").getByRole("img", { name: "ByteVerse", exact: true })).toHaveAttribute("src", "/logo.png");
    await expect(p.getByRole("contentinfo")).toContainText("Quick Links");
    await expect(p.locator(".isp-header, .isp-footer, .isp-landscape")).toHaveCount(0);
    await expect(p.locator(".isp-hero-photo")).toHaveAttribute("src", HERO);
    await expect.poll(() => p.locator(".isp-hero-photo").evaluate(image => image.complete && image.naturalWidth === 1200)).toBe(true);
    await expect(p.locator(".studio-advanced-settings")).not.toHaveAttribute("open");
    await expect(p.getByRole("group", { name: "Convert to" }).getByRole("button")).toHaveText([/^JPG/, /^PNG/, /^WebP/, /^AVIF/, /^Auto/]);
    await expect(p.getByRole("group", { name: "Quick resize sizes" }).getByRole("button")).toHaveCount(9);
    await expect(p.locator("#convert h2")).toContainText("Convert images"); await expect(p.locator("#resize h2")).toContainText("Resize images");
    assert.deepEqual(await p.locator(".studio-layout > .studio-card").evaluateAll(cards => cards.map(card => card.getAttribute("aria-labelledby"))),
      ["studio-import-title", "studio-settings-title", "studio-queue-title", "studio-results-title"]);
    await expect(p.locator('link[rel="canonical"]')).toHaveAttribute("href", CANONICAL);
    await expect(p.locator('meta[property="og:url"]')).toHaveAttribute("content", CANONICAL);
    const schemas = (await p.locator('script[type="application/ld+json"]').allTextContents()).map(JSON.parse).flatMap(v => v["@graph"] ?? v);
    const faq = schemas.find(v => v["@type"] === "FAQPage"); assert.equal(faq?.mainEntity.length, 27);
    assert.deepEqual(await p.locator("#faq summary").allTextContents(), faq.mainEntity.map(v => v.name));
    assert.deepEqual(await p.locator("#faq details > p").allTextContents(), faq.mainEntity.map(v => v.acceptedAnswer.text));
    await expect(p.locator('iframe, ins.adsbygoogle, script[src*="googletag"], script[src*="analytics"], script[src*="tawk"], script[src*="translate.google"]')).toHaveCount(0);
    assert.equal(s.audit.workers.length, 0); assert.equal(s.downloads, 0);
  });
  if (mode === "smoke" || mode === "full") {
    for (const format of mode === "full" ? formats : ["webp"]) await run(`UI quality ${format} download`, async s => {
      const fixture = format === "jpeg" ? fixtures.jpeg : fixtures.alpha;
      await quality(s, format); await importFiles(s, [fixture]); await compress(s);
      await verifyImage(await download(s, "Download image", extensions[format]), format, [fixture.width, fixture.height], fixture.alpha);
    });
    await run("measured 50 KB target", async s => {
      await importFiles(s, [fixtures.noise]); await button(s.page, "50 KB").click(); await compress(s);
      const bytes = await download(s, "Download image", "webp"); const { meta } = await verifyImage(bytes, "webp");
      assert(bytes.length <= 50_000 && meta.width <= 768 && meta.height <= 512);
      await expect(s.page.locator(".studio-target-result")).toContainText("Target met");
    });
  }
  if (mode === "full") {
    await run("unreachable 5 KB preserves noisy PNG dimensions", async s => {
      await chooseFormat(s.page, "png");
      await s.page.getByLabel("Maximum file size").fill("5"); await s.page.getByLabel("Preserve dimensions during target search").check();
      await s.page.getByLabel("Optimization effort (0–6)").selectOption("0"); await importFiles(s, [fixtures.noise]); await compress(s);
      const bytes = await download(s, "Download image", "png"); assert(bytes.length > 5_000);
      await verifyImage(bytes, "png", [768, 512]); await expect(s.page.locator(".studio-target-result")).toContainText("target not reached");
    });
    await run("resize crop and keyboard comparison", async s => {
      const p = s.page; await quality(s, "webp"); await importFiles(s, [fixtures.jpeg]);
      await button(p, "Resize").click(); await p.getByLabel("Resize method").selectOption("dimensions");
      await p.getByLabel("Width (px)").fill("320"); await p.getByLabel("Height (px)").fill("320"); await compress(s);
      await verifyImage(await download(s, "Download image", "webp"), "webp", [320, 240]);
      const divider = p.getByRole("slider", { name: "Before and after comparison divider" });
      await divider.press("ArrowRight"); await expect(divider).toHaveValue("51"); await divider.press("Shift+ArrowLeft"); await expect(divider).toHaveValue("41");
      await button(p, "Side by side").click(); await button(p, "200%").click();
      const pan = p.getByRole("region", { name: /^After output\./ }); await pan.press("ArrowRight");
      await expect.poll(() => pan.evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
      await button(p, "Crop").click(); const dialog = p.getByRole("dialog", { name: "Crop this image" });
      await dialog.getByLabel("Crop width (%)", { exact: true }).fill("50"); await dialog.getByLabel("Crop height (%)", { exact: true }).fill("50");
      await dialog.getByRole("button", { name: /^Move crop selection/ }).press("Shift+ArrowRight");
      await expect(dialog.getByLabel("Left position (%)", { exact: true })).toHaveValue("1.5625");
      await button(dialog, "Apply to this image").click(); await expect(dialog).toBeHidden();
      await p.getByLabel("Resize method").selectOption("percent"); await p.getByLabel("Scale (%)").fill("50"); await compress(s);
      await verifyImage(await download(s, "Download image", "webp"), "webp", [160, 120]);
    });
    await run("visible convert and resize controls", async s => {
      const p = s.page; await importFiles(s, [fixtures.jpeg]); await button(p, "Quality").click(); await chooseFormat(p, "png");
      await button(p, "50%").click(); await expect(button(p, "50%")).toHaveAttribute("aria-pressed", "true"); await compress(s);
      await verifyImage(await download(s, "Download image", "png"), "png", [320, 240]);
    });
    await run("same filename ZIP entries", async s => { await quality(s, "webp"); await importFiles(s, fixtures.twins); await compress(s, 2); await verifyZip(s); });
    await run("native cancel then retry", async s => {
      await quality(s, "avif"); await importFiles(s, [fixtures.cancel]);
      let cancelled = false;
      for (let attempt = 0; attempt < 2 && !cancelled; attempt++) {
        await button(s.page, "Compress images").press("Enter");
        try {
          await button(s.page, "Cancel all").click({ timeout: 2500 });
          await expect(badges(s.page)).toHaveText([/^(Cancelled|Complete)$/]);
          cancelled = (await badges(s.page).allTextContents()).join() === "Cancelled";
        } catch (error) { if (error.name !== "TimeoutError" || (await badges(s.page).allTextContents()).join() !== "Complete") throw error; }
      }
      if (!cancelled) return { skip: "Two real encodes completed before cancellation could be exercised" };
      await expect(badges(s.page)).toHaveText(["Cancelled"]); await expect(button(s.page, "Download image")).toHaveCount(0);
      await quality(s, "webp"); await button(s.page, "Compress again").click();
      await expect(s.page.locator(".studio-live-message")).toContainText("Batch finished:", { timeout: JOB });
      await expect(badges(s.page)).toHaveText(["Complete"]);
      await verifyImage(await download(s, "Download image", "webp"), "webp", [1024, 768]);
    });
  }
  if (mode === "full" || mode === "matrix") {
    await run("real ESM worker fixture codec matrix", async s => {
      await importFiles(s, [fixtures.jpeg]);
      for (const fixture of [fixtures.jpeg, fixtures.alpha, fixtures.noise, fixtures.gps].filter(Boolean)) {
        const inspection = await worker(s, fixture, "inspect"); assert.equal(inspection.kind, "inspection", inspection.message);
        assert.deepEqual([inspection.width, inspection.height], [fixture.width, fixture.height]); assert.equal(inspection.hasAlpha, fixture.alpha);
        await verifyImage(Buffer.from(inspection.bytes, "base64"), "png", [fixture.width, fixture.height], fixture.alpha);
        if (fixture === fixtures.gps) { assert.equal(inspection.gps, true); assert.equal(inspection.orientation, 6); }
        for (const format of formats) {
          console.log(`  codec ${fixture.path.split(/[\\/]/).at(-1)} -> ${format}`);
          const result = await worker(s, fixture, "process", { format, allowJpegTransparency: fixture.alpha && format === "jpeg" });
          assert.equal(result.kind, "result", `${fixture.path.split(/[\\/]/).at(-1)} -> ${format}: ${JSON.stringify(result)}`); assert.equal(result.mime, `image/${format}`); assert.match(result.codec, /WASM/);
          assert.equal(result.targetBytes, null); assert.equal(result.targetMet, null); assert.equal(result.attempts, 1);
          const { decoded } = await verifyImage(Buffer.from(result.bytes, "base64"), format, [fixture.width, fixture.height], fixture.alpha && format !== "jpeg");
          if (fixture === fixtures.gps && format === "png") {
            const golden = await sharp(fixture.bytes).rotate().ensureAlpha().raw().toBuffer();
            for (const [x, y] of [[40, 40], [400, 40], [40, 580], [400, 580]]) for (let c = 0; c < 3; c++) {
              const i = (y * fixture.width + x) * 4 + c; assert(Math.abs(decoded[i] - golden[i]) < 12, "EXIF orientation/color mismatch");
            }
          }
        }
      }
    });
  }
  if (mode === "full" || mode === "offline") await run("complete offline pack reload encode and ZIP", async s => {
    s.cold = false; await button(s.page, "Download offline pack").click();
    await expect(s.page.locator(".image-offline")).toHaveAttribute("data-ready", "true", { timeout: 210_000 });
    await expect(s.page.locator(".image-offline__status")).toContainText("Complete pack verified");
    s.offline = true;
    await s.context.setOffline(true); const response = await s.page.reload({ waitUntil: "load" });
    assert(response.ok() && response.fromServiceWorker(), "Reload was not served by the installed offline worker");
    assert.equal(await s.page.evaluate(() => navigator.onLine), false);
    await expect(s.page.locator(".image-offline")).toHaveAttribute("data-ready", "true", { timeout: 90_000 });
    for (const selector of [".isp-hero-photo", 'header img[alt="ByteVerse"]', 'footer img[alt="ByteVerse"]']) {
      await s.page.locator(selector).scrollIntoViewIfNeeded();
      await expect.poll(() => s.page.locator(selector).evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
    }
    await s.page.getByRole("checkbox", { name: "Live size estimate" }).uncheck(); await importFiles(s, fixtures.twins);
    for (const format of formats) {
      await quality(s, format); await compress(s, 2);
      await verifyImage(await download(s, "Download image", extensions[format]), format, [640, 480]);
    }
    await verifyZip(s, "avif");
  });
  if (mode === "full" || mode === "accessibility") for (const width of [320, 390, 1440]) for (const theme of ["light", "dark"]) await run(`axe ${width} ${theme}`, async s => {
    const p = s.page, opposite = theme === "light" ? "dark" : "light";
    await expect(p.locator("html")).toHaveClass(new RegExp(`\\b${theme}\\b`));
    await button(p, "Toggle theme").click();
    await expect(p.locator("html")).toHaveClass(new RegExp(`\\b${opposite}\\b`));
    await button(p, "Toggle theme").click();
    await expect(p.locator("html")).toHaveClass(new RegExp(`\\b${theme}\\b`));
    if (width < 960) {
      const open = button(p, "Toggle menu"); await open.click();
      const menu = p.getByRole("navigation", { name: "Mobile navigation" });
      await expect(menu).toBeVisible(); await expect(open).toHaveAttribute("aria-expanded", "true");
      await menu.getByRole("link", { name: "Home", exact: true }).focus(); await p.keyboard.press("Escape");
      await expect(menu).toBeHidden(); await expect(open).toBeFocused();
      await p.getByRole("link", { name: "Start compressing", exact: true }).click();
      await expect(button(p, /Drop images here, or browse files/)).toBeFocused();
      const importBox = await p.locator(".studio-import-card").boundingBox(), settingsBox = await p.locator(".studio-controls").boundingBox(), resultsBox = await p.locator(".studio-results-card").boundingBox();
      assert(importBox.y < settingsBox.y && settingsBox.y < resultsBox.y, "Mobile steps are not in upload/settings/results order");
    }
    await expect.poll(() => p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
    await axeCheck(s);
    if (screenshots) {
      await p.evaluate(() => window.scrollTo(0, 0));
      await p.screenshot({ path: join(temp, `hero-${width}-${theme}.png`) });
      await p.locator(".studio-layout").screenshot({ path: join(temp, `workspace-${width}-${theme}.png`) });
      await p.getByRole("contentinfo").screenshot({ path: join(temp, `footer-${width}-${theme}.png`) });
    }
  }, { viewport: { width, height: 900 }, colorScheme: theme, isMobile: width < 960, hasTouch: width < 960 });
} catch (error) { results.push({ name: "harness setup/cleanup", status: "FAIL", error: shortError(error) }); console.error(shortError(error)); }
finally {
  await browser?.close().catch(error => results.push({ name: "browser cleanup", status: "FAIL", error: shortError(error) }));
  const failed = results.some(result => result.status === "FAIL"); process.exitCode = failed ? 1 : 0;
  console.log(JSON.stringify({ mode, baseURL: URL_TOOL, results, ...(failed || screenshots ? { artifacts: temp } : {}) }, null, 2));
  if (temp) { if (failed || screenshots) await writeFile(join(temp, "report.json"), JSON.stringify(results, null, 2)); else await rm(temp, { recursive: true, force: true }); }
}