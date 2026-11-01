/**
 * Native Edge browser checks for the /tools hub against a running server.
 * Usage: node scripts/test-tools-hub-browser.mjs [baseUrl]   (default http://localhost:3055)
 * Verifies layout at 320/390/768/1440 in light and dark, axe WCAG AA, search filtering,
 * category chips, keyboard shortcut, FAQ toggling and saves screenshots to a temp dir.
 */
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const base = (process.argv[2] ?? "http://localhost:3055").replace(/\/$/, "");
const temp = await mkdtemp(join(tmpdir(), "byteverse-tools-hub-"));
const browser = await chromium.launch({ channel: "msedge", headless: true });
const results = [];
const check = async (name, run) => {
  try { await run(); results.push({ name, ok: true }); console.log(`PASS ${name}`); }
  catch (error) { results.push({ name, ok: false, error: String(error?.message ?? error) }); console.error(`FAIL ${name}\n${error?.stack ?? error}`); }
};

try {
  const context = await browser.newContext({ locale: "en-US", colorScheme: "light", viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const errors = [];
  // Third-party ad/analytics scripts raise their own promise rejections; only first-party errors fail the run.
  page.on("pageerror", (error) => { const stack = String(error?.stack ?? error); if (!/googlesyndication|google-analytics|googletagmanager|adtrafficquality/.test(stack)) errors.push(stack); });
  await page.goto(`${base}/tools`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForSelector("#directory a[data-tool]", { timeout: 120000 });
  await page.waitForSelector("input[type=search]:not([disabled])", { timeout: 60000 });

  const total = await page.locator("#directory a[data-tool]").count();

  await check("structure: single H1, no nested main, all tool cards, six category sections", async () => {
    assert.equal(await page.locator("h1").count(), 1);
    assert.equal(await page.locator("main").count(), 1);
    assert.equal(await page.locator("#directory section").count(), 6);
    assert(total >= 40, `expected the full catalogue, found ${total}`);
    assert.equal(await page.locator("a[data-upgraded-tool]").count(), 6);
  });

  for (const [width, height] of [[320, 740], [390, 844], [768, 1024], [1440, 1000]]) {
    for (const scheme of ["light", "dark"]) {
      await check(`layout ${width}x${height} ${scheme}: no horizontal overflow`, async () => {
        await page.emulateMedia({ colorScheme: scheme });
        if (scheme === "dark") await page.evaluate(() => document.documentElement.classList.add("dark"));
        else await page.evaluate(() => document.documentElement.classList.remove("dark"));
        await page.setViewportSize({ width, height });
        await page.waitForTimeout(250);
        const overflow = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, win: innerWidth, body: document.body.scrollWidth }));
        assert(overflow.doc <= overflow.win && overflow.body <= overflow.win, JSON.stringify(overflow));
        await page.screenshot({ path: join(temp, `tools-${width}-${scheme}.png`), fullPage: width === 1440 });
      });
    }
  }
  await page.evaluate(() => document.documentElement.classList.remove("dark"));
  await page.emulateMedia({ colorScheme: "light" });
  await page.setViewportSize({ width: 1440, height: 1000 });

  await check("axe: no WCAG A/AA violations on the initial hub", async () => {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(150);
    const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    await writeFile(join(temp, "axe-initial.json"), JSON.stringify(result, null, 2));
    assert.deepEqual(result.violations.map((item) => `${item.id}: ${item.nodes.length}`), []);
  });

  await check("search: typing filters the grid and announces the count; clear restores categories", async () => {
    const input = page.locator("input[type=search]");
    await input.fill("csv");
    await page.waitForFunction(() => document.querySelectorAll("#directory section").length === 1);
    const slugs = await page.locator("#directory a[data-tool]").evaluateAll((nodes) => nodes.map((node) => node.dataset.tool));
    assert(slugs.includes("csv-repair") && slugs.includes("csv-diff") && slugs.includes("json-to-csv"), slugs.join(","));
    assert(!slugs.includes("password-generator"));
    const status = await page.locator("[role=status]").textContent();
    assert.match(status ?? "", new RegExp(`${slugs.length} of ${total} tools match`));
    assert.equal(await page.locator("a[data-upgraded-tool]").count(), 0, "upgraded strip hides while filtering");
    await page.screenshot({ path: join(temp, "tools-search-csv.png") });
    await page.getByRole("button", { name: "Clear search" }).click();
    await page.waitForFunction(() => document.querySelectorAll("#directory section").length === 6);
    assert.equal(await page.locator("#directory a[data-tool]").count(), total);
  });

  await check("search: empty result shows recovery actions and a category chip restores the grid", async () => {
    await page.locator("input[type=search]").fill("zzzz-nothing");
    await page.waitForSelector("text=No tool matches that search.");
    await page.locator("#directory a[href='#security-crypto']").click();
    await page.waitForFunction(() => document.querySelectorAll("#directory a[data-tool]").length > 0);
    const categories = await page.locator("#directory a[data-tool] .toolFoot span, #directory a[data-tool] span > span").allTextContents();
    assert(categories.length > 0);
    await page.getByRole("button", { name: /Show all/ }).click();
    await page.waitForFunction(() => document.querySelectorAll("#directory section").length === 6);
  });

  await check("chips: category chip filters client-side without navigating and marks aria-current", async () => {
    const before = page.url();
    await page.locator("[role=search] a[href='#seo-web']").click();
    await page.waitForFunction(() => document.querySelectorAll("#directory section").length === 1);
    assert.equal(page.url(), before, "chip click must not change the URL when hydrated");
    assert.equal(await page.locator("[role=search] a[href='#seo-web']").getAttribute("aria-current"), "true");
    const slugs = await page.locator("#directory a[data-tool]").evaluateAll((nodes) => nodes.map((node) => node.dataset.tool));
    assert(slugs.includes("meta-tag-generator") && !slugs.includes("json-formatter"));
    await page.locator("[role=search] a[href='#directory']").click();
    await page.waitForFunction(() => document.querySelectorAll("#directory section").length === 6);
  });

  await check("keyboard: slash focuses search, Escape clears it", async () => {
    await page.locator("h1").click();
    await page.keyboard.press("/");
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("type")), "search");
    await page.keyboard.type("hash");
    await page.waitForFunction(() => document.querySelectorAll("#directory section").length === 1);
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => document.querySelectorAll("#directory section").length === 6);
  });

  await check("faq: details toggle open and FAQPage schema matches visible questions", async () => {
    const first = page.locator("details").first();
    await first.locator("summary").click();
    assert.equal(await first.evaluate((node) => node.open), true);
    const schema = await page.evaluate(() => JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent));
    const faq = schema["@graph"].find((item) => item["@type"] === "FAQPage");
    const visible = await page.locator("details summary").allTextContents();
    assert.deepEqual(faq.mainEntity.map((item) => item.name), visible.map((value) => value.trim()));
  });

  await check("og route: static image responds with PNG", async () => {
    const response = await page.request.get(`${base}/api/og/tools`);
    assert.equal(response.status(), 200);
    assert.match(response.headers()["content-type"] ?? "", /image\/png/);
  });

  await check("runtime: no page errors", async () => {
    assert.deepEqual(errors, []);
  });
} finally {
  await browser.close();
}
await writeFile(join(temp, "results.json"), JSON.stringify({ base, checkedAt: new Date().toISOString(), results }, null, 2));
const failed = results.filter((item) => !item.ok).length;
console.log(`${results.length - failed}/${results.length} browser checks passed. Artifacts: ${temp}`);
process.exitCode = failed ? 1 : 0;
