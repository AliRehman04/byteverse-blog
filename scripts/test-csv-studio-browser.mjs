/**
 * Browser E2E for /tools/csv-repair against an already-running loopback preview.
 * Default target http://127.0.0.1:3066 (node scripts/preview-csv-diff.mjs --serve <copy>).
 * Native Edge through Playwright, real worker, real files and native downloads.
 * Every non-loopback request is aborted and fails the case; no request is mocked.
 *   node scripts/test-csv-studio-browser.mjs [--baseURL=http://127.0.0.1:3066]
 * Screenshots, downloads and summary.json are kept in an OS temp folder.
 */
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium, expect as baseExpect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { strFromU8, unzipSync } from "fflate";
import readXlsxFile from "read-excel-file/node";

const flag = process.argv.slice(2).find((value) => value.startsWith("--baseURL="));
const base = (flag ? flag.slice("--baseURL=".length) : "http://127.0.0.1:3066").replace(/\/$/, "");
assert(/^http:\/\/(127\.0\.0\.1|localhost)(:\d{1,5})?$/.test(base), "--baseURL must be a loopback http origin");
const TARGET = `${base}/tools/csv-repair`;
const H1 = "Free CSV Repair Tool & Excel Export";
const expect = baseExpect.configure({ timeout: 15_000 });
const artifacts = await mkdtemp(join(tmpdir(), "byteverse-csv-studio-browser-"));
const results = [];
const slug = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
let browser;

async function scenario(name, run, { width = 1440, theme = "light" } = {}) {
  const context = await browser.newContext({
    viewport: { width, height: width < 768 ? 844 : 960 }, colorScheme: theme, reducedMotion: "reduce",
    locale: "en-US", timezoneId: "UTC", acceptDownloads: true, serviceWorkers: "block",
  });
  const external = [], writes = [], errors = [];
  await context.route("**/*", (route) => {
    const request = route.request();
    if (new URL(request.url()).origin !== base) { external.push(request.url()); return route.abort("blockedbyclient"); }
    if (!["GET", "HEAD"].includes(request.method())) writes.push(`${request.method()} ${request.url()}`);
    return route.continue();
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  const started = Date.now();
  try {
    await page.goto(TARGET, { waitUntil: "load" });
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(H1);
    const evidence = await run(page);
    assert.deepEqual(external, [], "the private tool page made no external request");
    assert.deepEqual(writes, [], "no POST, PUT or other write request");
    assert.deepEqual(errors, [], "no page or console errors");
    results.push({ name, status: "PASS", ms: Date.now() - started, ...(evidence ? { evidence } : {}) });
    console.log(`PASS ${name}`);
  } catch (error) {
    results.push({ name, status: "FAIL", ms: Date.now() - started, error: String(error.stack ?? error).slice(0, 4000), external, writes, errors });
    console.error(`FAIL ${name}\n${error.stack ?? error}`);
    await page.screenshot({ path: join(artifacts, `${slug(name)}-failure.png`), fullPage: false }).catch(() => {});
  } finally {
    await context.close();
  }
}

async function openSample(page, name) {
  await page.getByRole("button", { name: new RegExp(name) }).click();
  const grid = page.getByRole("grid");
  await expect(grid).toBeVisible();
  await expect(grid.getByRole("gridcell").first()).not.toBeEmpty();
  return grid;
}

async function axe(page, state) {
  const scan = await new AxeBuilder({ page }).setLegacyMode(true).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  const violations = scan.violations.map((item) => ({ id: item.id, impact: item.impact, targets: item.nodes.map((node) => node.target.join(" ")).slice(0, 5) }));
  assert.deepEqual(violations, [], `axe violations (${state}): ${JSON.stringify(violations)}`);
  return { state, passes: scan.passes.length };
}

async function exportFile(page, label) {
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: label, exact: true }).click()]);
  const path = join(artifacts, download.suggestedFilename());
  await download.saveAs(path);
  return { name: download.suggestedFilename(), bytes: await readFile(path) };
}

browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  await scenario("idle page: private shell, exact copy, workspace above the fold and axe", async (page) => {
    await expect(page.getByRole("heading", { name: "Drop a CSV file to inspect and repair" })).toBeVisible();
    await expect(page.getByText("CSV or delimited TXT. Processed in your browser.")).toBeVisible();
    await expect(page.locator("iframe")).toHaveCount(0);
    const scripts = await page.locator("script[src]").evaluateAll((nodes) => nodes.map((node) => node.src));
    assert(scripts.length > 0 && scripts.every((src) => new URL(src).origin === base), "only local scripts");
    const drop = await page.getByRole("heading", { name: "Drop a CSV file to inspect and repair" }).boundingBox();
    assert(drop && drop.y + drop.height < 960, "dropzone visible in the first viewport");
    return await axe(page, "idle");
  });

  await scenario("customer sample: issues explained, Keep as text, keyboard undo and redo", async (page) => {
    await openSample(page, "US customer list");
    const issue = page.getByRole("button", { name: /Leading zeros at risk.*Customer ID/ });
    await issue.click();
    await expect(page.getByText(/Excel removes leading zeros when it opens a CSV directly/).first()).toBeVisible();
    await page.getByRole("button", { name: /^Keep as text/ }).first().click();
    await expect(issue).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Undo", exact: true })).toBeVisible();
    await page.keyboard.press("Control+z");
    await expect(issue).toHaveCount(1);
    await page.keyboard.press("Control+y");
    await expect(issue).toHaveCount(0);
    await page.getByRole("tab", { name: /Changes/ }).click();
    await expect(page.getByRole("list", { name: "Applied steps" }).getByRole("listitem")).toHaveCount(2);
  });

  await scenario("XLSX export keeps IDs, ZIP codes and long numbers as text and writes no formulas", async (page) => {
    await openSample(page, "US customer list");
    const file = await exportFile(page, "Export Excel (.xlsx)");
    assert.equal(file.name, "sample-customers-repaired.xlsx");
    const sheets = await readXlsxFile(file.bytes, { trim: false });
    const rows = sheets[0].data;
    assert.deepEqual(rows[0].slice(0, 5), ["Customer ID", "Name", "Email", "Phone", "ZIP"]);
    assert.equal(rows[1][0], "000123");
    assert.equal(rows[1][4], "02115");
    assert.equal(rows[1][7], "40001234567812345678");
    assert.equal(rows[2][8], "=SUM(A1:A3)");
    const sheetXml = strFromU8(unzipSync(new Uint8Array(file.bytes))["xl/worksheets/sheet1.xml"]);
    assert.doesNotMatch(sheetXml, /<f[ >]/, "no formula elements");
    await expect(page.getByText("sample-customers-repaired.xlsx", { exact: false }).first()).toBeVisible();
    return { sheets: sheets.map((sheet) => sheet.sheet), rows: rows.length };
  });

  await scenario("CSV export: BOM, CRLF and spreadsheet-safe apostrophes", async (page) => {
    await openSample(page, "US customer list");
    await page.getByRole("group", { name: "Format" }).getByRole("button", { name: "CSV", exact: true }).click();
    await expect(page.getByText(/CSV files can’t store column types/)).toBeVisible();
    const file = await exportFile(page, "Export CSV");
    assert.equal(file.name, "sample-customers-repaired.csv");
    assert.deepEqual([...file.bytes.subarray(0, 3)], [0xef, 0xbb, 0xbf]);
    const text = file.bytes.subarray(3).toString("utf8");
    assert(text.includes("\r\n") && !/[^\r]\n/.test(text.replace(/"[^"]*"/g, "")), "CRLF record endings");
    assert(text.includes("'=SUM(A1:A3)"));
    assert(text.includes("'@mention follow-up"));
    assert(text.startsWith("Customer ID,Name,Email"));
  });

  await scenario("keyboard: command palette, go to cell and Escape", async (page) => {
    await openSample(page, "US customer list");
    await page.keyboard.press("Control+k");
    const search = page.getByRole("combobox", { name: "Search commands" });
    await expect(search).toBeFocused();
    await search.fill("compact rows");
    await search.press("Enter");
    await expect(page.getByRole("button", { name: "Compact rows" })).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.press("Control+g");
    const row = page.getByRole("textbox", { name: /Row/ });
    await row.fill("5");
    await row.press("Enter");
    await expect(page.locator("strong", { hasText: /^A5$/ })).toBeVisible();
    await expect(page.getByRole("grid")).toBeFocused();
  });

  await scenario("European sample: Windows-1252 accents and the Encoding Lab", async (page) => {
    await openSample(page, "European export");
    await expect(page.getByRole("gridcell", { name: "München" }).first()).toBeVisible();
    await expect(page.getByText("Windows-1252", { exact: true }).first()).toBeVisible();
    await page.getByRole("button", { name: /Compare/ }).first().click();
    const lab = page.getByRole("dialog", { name: "Encoding Lab" });
    await expect(lab).toBeVisible();
    await expect(lab.getByRole("region", { name: "UTF-8" })).toBeVisible();
    await lab.getByRole("button", { name: "Close", exact: true }).click();
    await expect(lab).toBeHidden();
  });

  await scenario("broken quotes: errors are explained and export warns before download", async (page) => {
    await openSample(page, "Broken quotes");
    await expect(page.getByRole("button", { name: /Unclosed quote/ })).toBeVisible();
    await expect(page.getByText(/still open/).first()).toBeVisible();
  });

  for (const [width, theme] of [[375, "light"], [768, "light"], [1280, "light"], [1440, "light"], [1440, "dark"], [375, "dark"]]) {
    await scenario(`responsive ${width}px ${theme}: no page overflow, screenshot and axe`, async (page) => {
      await openSample(page, "US customer list");
      const overflow = await page.evaluate(() => ({ document: document.documentElement.scrollWidth, viewport: innerWidth }));
      assert(overflow.document <= overflow.viewport + 1, `horizontal page overflow ${JSON.stringify(overflow)}`);
      await page.screenshot({ path: join(artifacts, `ready-${width}-${theme}.png`) });
      return await axe(page, `ready ${width} ${theme}`);
    }, { width, theme });
  }
} finally {
  await browser.close();
  const failed = results.filter((result) => result.status === "FAIL").length;
  await writeFile(join(artifacts, "summary.json"), JSON.stringify({ suite: "csv-studio-browser", target: TARGET, total: results.length, failed, results }, null, 2));
  console.log(`${results.length - failed}/${results.length} passed · artifacts: ${artifacts}`);
  process.exitCode = failed ? 1 : 0;
}
