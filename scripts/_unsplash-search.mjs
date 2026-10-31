import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

// Research helper: list candidate photos (ID, description, photographer) from public Unsplash search pages.
const queries = process.argv.slice(2);
if (!queries.length) { console.error("Usage: node scripts/_unsplash-search.mjs <query> [query...]"); process.exit(1); }
const browser = await chromium.launch({ channel: "msedge", headless: true });
const context = await browser.newContext({ locale: "en-US", viewport: { width: 1400, height: 1000 } });
const page = await context.newPage();
const out = {};
for (const query of queries) {
  const url = `https://unsplash.com/s/photos/${encodeURIComponent(query.replace(/\s+/g, "-"))}`;
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForSelector('a[href*="/photos/"] img', { timeout: 30000 });
    await page.mouse.wheel(0, 2500); await page.waitForTimeout(1500);
    const items = await page.evaluate(() => {
      const seen = new Map();
      for (const a of document.querySelectorAll('a[href*="/photos/"]')) {
        const href = a.getAttribute("href"); const m = href.match(/\/photos\/(?:[^/]*-)?([A-Za-z0-9_-]{11})\/?(?:\?|$)/); if (!m) continue;
        const id = m[1]; const img = a.querySelector("img"); if (!img) continue;
        const figure = a.closest("figure") ?? a.parentElement?.parentElement?.parentElement;
        const photographer = [...(figure?.querySelectorAll('a[href^="/@"]') ?? [])].map(e => e.textContent?.trim()).find(Boolean) ?? null;
        const src = img.getAttribute("src") ?? "";
        const photoId = (src.match(/photo-[0-9a-f-]+/) ?? [null])[0];
        if (!seen.has(id)) seen.set(id, { id, photoId, alt: img.getAttribute("alt") ?? "", photographer, href });
      }
      return [...seen.values()];
    });
    out[query] = items.slice(0, 20);
    console.log(`\n=== ${query} (${items.length} found)`);
    for (const item of out[query]) console.log(`${item.id} | ${item.photoId ?? "?"} | ${item.photographer ?? "?"} | ${item.alt.slice(0, 80)}`);
  } catch (error) {
    out[query] = { error: error.message.split("\n")[0], finalUrl: page.url(), title: await page.title().catch(() => "") };
    console.log(`\n=== ${query}: ${out[query].error} (${out[query].title})`);
  }
}
await browser.close();
await mkdir("docs/content-research", { recursive: true });
await writeFile(join("docs/content-research", "2026-10-24-stock-photo-candidates.json"), JSON.stringify(out, null, 1));
