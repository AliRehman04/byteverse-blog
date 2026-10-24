import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import sharp from "sharp";

// Real photographs (Pexels licence: free to use and modify, attribution appreciated) for six articles.
// --meta reads photographer/title from the public photo pages (headed browser; Pexels challenges headless clients).
// --write downloads the CDN originals, crops to 1200x675 JPEGs under public/blog/<dir>/ and builds a review sheet.
export const root = fileURLToPath(new URL("../", import.meta.url));
export const ledgerPath = resolve(root, "docs/real-photos-2026-10-24.json");
export const plan = [
  { slug: "cursor-agent-stuck-planning-next-moves-2026", dir: "cursor-planning-next-moves", cover: { id: 4974912, position: "attention" }, body: { id: 5473309, position: "attention" } },
  // region = fractions of the source (left, top, width); height follows 16:9. Set from visual review of the first crops.
  { slug: "claude-code-not-recognized-windows-2026", dir: "claude-code-windows", cover: { id: 34803969, position: "top" }, body: { id: 5473892, position: "attention" } },
  { slug: "png-to-jpg-black-background", dir: "png-jpg-background", cover: { id: 16313513, position: "attention" }, body: { id: 7971542, position: "attention" } },
  { slug: "excel-csv-leading-zeros-2026", dir: "csv-excel", cover: { id: 8297058, position: "attention" }, body: { id: 34639577, region: { left: 0, top: 0.42, width: 1 } } },
  { slug: "gemini-not-showing-google-docs-gmail-2026", dir: "gemini-workspace", cover: { id: 7439136, position: "attention" }, body: { id: 20716656, position: "centre" } },
  { slug: "ollama-not-using-gpu-windows-2026", dir: "ollama-gpu", cover: { id: 17576302, position: "attention" }, body: { id: 33693626, position: "attention" } },
  { slug: "excel-csv-special-characters-utf8", dir: "csv-utf8", cover: { id: 6779570, position: "attention" }, body: { id: 7735769, position: "attention" } },
];
const cdn = id => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=2400`;
const headers = { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36", accept: "image/*" };

async function readMeta() {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ channel: "msedge", headless: false });
  const page = await (await browser.newContext({ locale: "en-US" })).newPage();
  const meta = {};
  try {
    for (const entry of plan) for (const role of ["cover", "body"]) {
      const id = entry[role].id;
      await page.goto(`https://www.pexels.com/photo/${id}/`, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForSelector('a[href^="/@"], a[href*="pexels.com/@"]', { timeout: 90000 });
      meta[id] = await page.evaluate(() => {
        const links = [...document.querySelectorAll('a[href^="/@"], a[href*="pexels.com/@"]')];
        const named = links.find(a => /[A-Za-z]{2,}/.test(a.textContent ?? "") && !/follow|donate/i.test(a.textContent ?? "")) ?? links[0];
        return { title: document.title.replace(/\s*·\s*Free Stock Photo.*$/i, "").trim(), photographer: named?.textContent?.trim() ?? null, photographerUrl: named?.href ?? null, pageUrl: location.href };
      });
      console.log(id, JSON.stringify(meta[id]));
    }
  } finally { await browser.close(); }
  return meta;
}

export async function buildPhotos(write = false) {
  const ledger = JSON.parse(await readFile(ledgerPath, "utf8"));
  const tiles = [];
  const output = [];
  for (const entry of plan) {
    const directory = resolve(root, "public/blog", entry.dir);
    if (write) await mkdir(directory, { recursive: true });
    for (const role of ["cover", "body"]) {
      const { id, position, region } = entry[role];
      assert(ledger.photos[id]?.photographer, `Missing photographer for ${id}`);
      const response = await fetch(cdn(id), { headers, signal: AbortSignal.timeout(60000) });
      assert(response.ok, `CDN ${response.status} for ${id}`);
      const source = Buffer.from(await response.arrayBuffer());
      const sourceMeta = await sharp(source).metadata();
      let pipeline = sharp(source).rotate();
      if (region) {
        const width = Math.round(sourceMeta.width * region.width), height = Math.round(width * 9 / 16);
        const left = Math.round(sourceMeta.width * region.left), top = Math.min(Math.round(sourceMeta.height * region.top), sourceMeta.height - height);
        assert(top >= 0 && left + width <= sourceMeta.width, `Region out of bounds for ${id}`);
        pipeline = pipeline.extract({ left, top, width, height });
      }
      const image = await pipeline.resize(1200, 675, { fit: "cover", position: position === "attention" ? sharp.strategy.attention : (position ?? "centre") }).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
      const meta = await sharp(image).metadata();
      assert.equal(meta.width, 1200); assert.equal(meta.height, 675);
      assert(image.length < 400000, `Image too large: ${id} (${image.length})`);
      const file = role === "cover" ? "photo-cover.jpg" : "photo-inline.jpg";
      if (write) await writeFile(resolve(directory, file), image);
      output.push({ slug: entry.slug, role, id, file: `public/blog/${entry.dir}/${file}`, url: `https://www.byteverse.fyi/blog/${entry.dir}/${file}`, bytes: image.length, source: `${sourceMeta.width}x${sourceMeta.height}`, photographer: ledger.photos[id].photographer });
      const label = Buffer.from(`<svg width="600" height="36"><rect width="600" height="36" fill="#111"/><text x="8" y="24" font-family="Arial" font-size="17" fill="#fff">${entry.dir} ${role} ${id}</text></svg>`);
      tiles.push(await sharp({ create: { width: 600, height: 374, channels: 3, background: "#111" } }).composite([{ input: await sharp(image).resize(600, 338).png().toBuffer(), top: 0, left: 0 }, { input: label, top: 338, left: 0 }]).png().toBuffer());
    }
  }
  const sheetDir = resolve(root, "docs/content-research/photo-review-final");
  await mkdir(sheetDir, { recursive: true });
  await sharp({ create: { width: 2 * 610, height: Math.ceil(tiles.length / 2) * 384, channels: 3, background: "#222" } })
    .composite(tiles.map((input, i) => ({ input, left: (i % 2) * 610, top: Math.floor(i / 2) * 384 }))).png().toFile(resolve(sheetDir, "finals.png"));
  return output;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const mode = process.argv[2];
  assert(process.argv.length === 3 && ["--meta", "--preview", "--write"].includes(mode), "Use --meta, --preview or --write");
  if (mode === "--meta") {
    const photos = await readMeta();
    await writeFile(ledgerPath, JSON.stringify({ date: "2026-10-24", licence: "Pexels licence (https://www.pexels.com/license/): free to use and modify; attribution appreciated and given in each article's credits section.", photos, plan }, null, 1));
    console.log(`Ledger written: ${ledgerPath}`);
  } else {
    console.log(JSON.stringify(await buildPhotos(mode === "--write"), null, 1));
  }
}
