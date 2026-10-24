import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

// Research helper: list candidate stock photos (ID, alt, photographer) from public Pexels search pages. No login, no API key.
const queries = process.argv.slice(2);
if (!queries.length) { console.error("Usage: node scripts/_pexels-search.mjs <query> [query...]"); process.exit(1); }
const browser = await chromium.launch({ channel: "msedge", headless: false });
const context = await browser.newContext({ locale: "en-US", viewport: { width: 1400, height: 1000 } });
const page = await context.newPage();
const out = {};
for (const query of queries) {
  const url = `https://www.pexels.com/search/${encodeURIComponent(query)}/`;
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForSelector('a[href*="/photo/"]', { timeout: 90000 });
    await page.mouse.wheel(0, 2500); await page.waitForTimeout(1500);
    const items = await page.evaluate(() => {
      const seen = new Map();
      for (const a of document.querySelectorAll('a[href*="/photo/"]')) {
        const m = a.getAttribute("href").match(/\/photo\/(?:[^/]*-)?(\d+)\/?$/); if (!m) continue;
        const id = m[1]; const img = a.querySelector("img");
        const card = a.closest("article") ?? a.parentElement?.parentElement;
        const photographer = card?.querySelector('a[href^="/@"]')?.textContent?.trim() ?? null;
        if (!seen.has(id)) seen.set(id, { id, alt: img?.getAttribute("alt") ?? "", photographer, src: img?.getAttribute("src") ?? null });
        else if (photographer && !seen.get(id).photographer) seen.get(id).photographer = photographer;
      }
      return [...seen.values()];
    });
    out[query] = items.slice(0, 18);
    console.log(`\n=== ${query} (${items.length} found)`);
    for (const item of out[query]) console.log(`${item.id} | ${item.photographer ?? "?"} | ${item.alt.slice(0, 90)}`);
  } catch (error) {
    out[query] = { error: error.message.split("\n")[0], finalUrl: page.url(), title: await page.title().catch(() => "") };
    console.log(`\n=== ${query}: ${out[query].error} (${out[query].title})`);
  }
}
await browser.close();
await mkdir("docs/content-research", { recursive: true });
await writeFile(join("docs/content-research", "2026-10-24-stock-photo-candidates.json"), JSON.stringify(out, null, 1));
