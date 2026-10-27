import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium, expect } from "@playwright/test";
import { parseDocument, DomUtils } from "htmlparser2";

const base = "http://127.0.0.1:3066";
const slug = "/tools/csv-diff";
const canonical = "https://www.byteverse.fyi" + slug;
const artifacts = await mkdtemp(join(tmpdir(), "byteverse-csv-diff-acceptance-"));
const checks = [];
const all = (dom, predicate) => DomUtils.findAll(predicate, dom.children);
const get = async path => {
  const response = await fetch(base + path, { redirect: "manual", signal: AbortSignal.timeout(30000) });
  assert.equal(response.status, 200, path);
  return { response, text: await response.text() };
};
const { response, text } = await get(slug);
const dom = parseDocument(text);
assert.equal(all(dom, node => node.name === "h1").length, 1);
assert.equal(all(dom, node => node.name === "link" && node.attribs.rel === "canonical")[0].attribs.href, canonical);
assert(!/noindex/.test(response.headers.get("x-robots-tag") ?? ""));
const schemas = all(dom, node => node.name === "script" && node.attribs.type === "application/ld+json").map(node => JSON.parse(DomUtils.textContent(node)));
assert.deepEqual(schemas.map(schema => schema["@type"]), ["WebApplication", "BreadcrumbList"]);
assert(!schemas.some(schema => schema.aggregateRating));
assert(text.includes("/tools/csv-diff/opengraph-image"));
assert.equal(all(dom, node => node.name === "meta" && node.attribs.name === "description").length, 1);
assert.equal(all(dom, node => node.name === "meta" && node.attribs.name === "description")[0].attribs.content.length <= 160, true);
checks.push({ name: "indexable static HTML, one H1, self canonical and truthful schemas", passed: true, htmlBytes: Buffer.byteLength(text) });
for (const path of ["/tools", "/sitemap.xml", "/site-map", "/llms.txt", "/tools/json-to-csv", "/tools/diff-checker"]) {
  const { text } = await get(path);
  assert(text.includes(slug), `Discovery missing: ${path}`);
  checks.push({ name: `discovery from ${path}`, passed: true });
}
const imageResponse = await fetch(base + slug + "/opengraph-image");
assert.equal(imageResponse.status, 200);
assert.match(imageResponse.headers.get("content-type") ?? "", /image\/png/);
const image = Buffer.from(await imageResponse.arrayBuffer());
assert.equal(image.readUInt32BE(16), 1200); assert.equal(image.readUInt32BE(20), 630);
checks.push({ name: "static social image", passed: true, bytes: image.length, cacheControl: imageResponse.headers.get("cache-control") });

const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 }, reducedMotion: "reduce", serviceWorkers: "block" });
  const unexpected = [], errors = [];
  await context.route("**/*", async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin === base && request.method() === "GET" && !url.pathname.startsWith("/api/")) return route.continue();
    unexpected.push(`${request.method()} ${url.origin}${url.pathname}`); return route.abort();
  });
  const page = await context.newPage();
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(base + slug, { waitUntil: "load" });
  await expect(page.locator("[data-csv-diff-workspace] fieldset")).not.toHaveAttribute("disabled");
  await page.screenshot({ path: join(artifacts, "desktop-hero.png") });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: join(artifacts, "mobile-hero.png") });
  await page.setViewportSize({ width: 1440, height: 960 });
  const headers = ["id", ...Array.from({ length: 24 }, (_, index) => `field_${index + 1}`)];
  const line = (number, changed = false) => [String(number).padStart(5, "0"), changed ? "y" : "x", ...Array(23).fill("x")].join(",");
  const original = [headers.join(","), ...Array.from({ length: 20000 }, (_, index) => line(index + 1))].join("\n");
  const updated = [headers.join(","), ...Array.from({ length: 20000 }, (_, index) => line(20100 - index, 20100 - index >= 101 && 20100 - index <= 200))].join("\n");
  await page.locator("#csv-original-file").setInputFiles({ name: "synthetic-original.csv", mimeType: "text/csv", buffer: Buffer.from(original) });
  await page.locator("#csv-updated-file").setInputFiles({ name: "synthetic-updated.csv", mimeType: "text/csv", buffer: Buffer.from(updated) });
  const started = performance.now();
  await page.getByRole("button", { name: "Inspect files", exact: true }).click();
  await expect(page.locator("#csv-setup-title")).toBeVisible({ timeout: 20000 });
  const inspectionMs = Math.round(performance.now() - started);
  await page.getByRole("checkbox", { name: "Use id as a match key", exact: true }).check();
  const comparing = performance.now();
  await page.getByRole("button", { name: "Compare CSV files", exact: true }).click();
  const result = page.locator('section[aria-labelledby="csv-results-title"]');
  await expect(result).toBeVisible({ timeout: 20000 });
  for (const [status, count] of Object.entries({ added: 100, removed: 100, changed: 100, unchanged: 19800 })) {
    await expect(result.locator(`div[data-status="${status}"] > strong`)).toHaveText(count.toLocaleString("en"));
  }
  const comparisonMs = Math.round(performance.now() - comparing);
  await page.getByRole("button", { name: "All rows", exact: true }).click();
  const searching = performance.now();
  await page.getByRole("searchbox", { name: "Search result values", exact: true }).fill("00101");
  await expect(page.locator('table[class*="resultTable"] tbody tr')).toHaveCount(1);
  const searchMs = Math.round(performance.now() - searching);
  const metrics = await page.evaluate(() => ({ resourceCount: performance.getEntriesByType("resource").length,
    transferredBytes: performance.getEntriesByType("resource").reduce((sum, resource) => sum + resource.transferSize, 0),
    approximateJsHeapAfterComparison: performance.memory?.usedJSHeapSize ?? null,
    width: document.documentElement.clientWidth, contentWidth: document.documentElement.scrollWidth }));
  assert(metrics.contentWidth <= metrics.width + 1);
  assert.deepEqual(unexpected, []); assert.deepEqual(errors, []);
  checks.push({ name: "native worker at row and cell limits", passed: true, rowsPerInput: 20000, columns: 25, cellsPerInput: 500000,
    inputBytes: [Buffer.byteLength(original), Buffer.byteLength(updated)], resultRecords: 20100,
    counts: { changed: 100, added: 100, removed: 100, unchanged: 19800 }, inspectionMs, comparisonMs, searchMs, ...metrics,
    limitation: "Single unthrottled desktop Edge run with synthetic repeated values. Includes UI action overhead; not a speed guarantee, peak-memory measurement, physical mobile test or field Core Web Vitals." });
  await result.screenshot({ path: join(artifacts, "large-input-result.png") });
  await context.close();
  const boundary = await browser.newContext({ viewport: { width: 1440, height: 960 }, reducedMotion: "reduce", serviceWorkers: "block" });
  const denied = [], boundaryErrors = [];
  await boundary.route("**/*", async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin === base && request.method() === "GET" && !url.pathname.startsWith("/api/")) return route.continue();
    denied.push(`${request.method()} ${url.origin}${url.pathname}`); return route.abort();
  });
  const boundaryPage = await boundary.newPage();
  boundaryPage.on("pageerror", error => boundaryErrors.push(error.message));
  await boundaryPage.goto(base + slug, { waitUntil: "load" });
  await expect(boundaryPage.locator("[data-csv-diff-workspace] fieldset")).not.toHaveAttribute("disabled");
  await boundaryPage.evaluate(() => { window.__privateBoundaryMarker = "csv-before"; });
  const menu = () => boundaryPage.getByRole("navigation", { name: "Main navigation", exact: true }).getByRole("button", { name: "Tools", exact: true });
  await menu().focus(); await menu().press("Enter");
  const imageLink = boundaryPage.getByRole("link", { name: /ImageFixer Image Compressor/ });
  await imageLink.focus();
  await Promise.all([boundaryPage.waitForEvent("domcontentloaded"), imageLink.press("Enter")]);
  await expect(boundaryPage).toHaveURL(base + "/tools/image-compressor");
  assert.equal(await boundaryPage.evaluate(() => window.__privateBoundaryMarker), undefined, "Changing private tools must replace the document and its CSP");
  await expect(boundaryPage.getByRole("button", { name: "Toggle theme", exact: true })).toBeVisible();
  await boundaryPage.evaluate(() => { window.__privateBoundaryMarker = "image-before"; });
  await menu().focus(); await menu().press("Enter");
  const csvLink = boundaryPage.getByRole("link", { name: /CSV Diff Checker/ });
  await csvLink.focus();
  await Promise.all([boundaryPage.waitForEvent("domcontentloaded"), csvLink.press("Enter")]);
  await expect(boundaryPage).toHaveURL(base + slug);
  assert.equal(await boundaryPage.evaluate(() => window.__privateBoundaryMarker), undefined);
  assert.deepEqual(denied, []); assert.deepEqual(boundaryErrors, []);
  checks.push({ name: "private tool to private tool navigation replaces CSP document both ways", passed: true });
  await boundary.close();
} finally { await browser.close(); }
const report = { suite: "csv-diff-preview-acceptance", checkedAt: new Date().toISOString(), target: base + slug, checks, artifacts, productionChanged: false };
await writeFile(join(artifacts, "acceptance.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));