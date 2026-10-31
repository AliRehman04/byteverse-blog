import { readFile, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

// Research helper: tile Openverse thumbnails for shortlisted candidates into labelled contact sheets for visual review.
const files = ["1", "2", "3"].map(n => `docs/content-research/2026-10-24-stock-photo-candidates-${n}.json`);
const records = new Map();
for (const file of files) {
  const data = JSON.parse(await readFile(file, "utf8"));
  for (const list of Object.values(data)) if (Array.isArray(list)) for (const r of list) records.set(r.id, r);
}
const groups = {
  cursor: ["cfb49a30", "63c6c78d", "85cce6a7", "6b6c0aaf", "735840d4", "0a604b7b", "e6da4b88", "6634708b", "b90c1d28", "3ed38842", "b31b13a8", "04faa24c"],
  claude: ["b897b252", "a4d252c0", "3c928305", "f4a0cabe", "a17177a9", "12c32714", "44792dd5", "23ee9cbd"],
  excel: ["edbc60b2", "9b7ef946", "2d3fb7e3", "ed7f2ad9", "7f0cd475", "1ad9a4b4", "248dce0d", "66dc98ae"],
  gemini: ["6719ca0a", "f1fe5f2b", "0fdbd8da", "1fdb9216", "6f2d4ea0", "be2d15cc", "599bbda7", "f628df35"],
  png: ["88568ca9", "284f864b", "b84a44da", "ba46de9b", "4a2ae3ff", "9a2e7d49", "183a1219", "b9dca254", "ff86cff8", "d6b234a1", "2819c0d5", "dc572dcf"],
  gpu: ["459b0036", "d68e6469", "e9f53dd2", "b195cd5a", "49033b0c", "24b91015", "136f9a04", "d5fe9eb1", "f2a4769f", "78af7c36"],
};
const dir = "docs/content-research/photo-review";
await mkdir(dir, { recursive: true });
const index = {};
for (const [group, prefixes] of Object.entries(groups)) {
  const tiles = [];
  for (const [n, prefix] of prefixes.entries()) {
    const record = [...records.values()].find(r => r.id.startsWith(prefix));
    if (!record) { console.log(`${group}: ${prefix} not found`); continue; }
    try {
      const response = await fetch(record.thumb, { signal: AbortSignal.timeout(30000), headers: { "user-agent": "ByteVerse editorial research" } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const buffer = Buffer.from(await response.arrayBuffer());
      const image = await sharp(buffer).resize(400, 260, { fit: "cover" }).png().toBuffer();
      const label = Buffer.from(`<svg width="400" height="40"><rect width="400" height="40" fill="#111"/><text x="8" y="26" font-family="Arial" font-size="18" fill="#fff">${n + 1}. ${prefix} ${(record.creator ?? "").replace(/[<>&]/g, "").slice(0, 22)} ${record.license}</text></svg>`);
      tiles.push(await sharp({ create: { width: 400, height: 300, channels: 3, background: "#111" } }).composite([{ input: image, top: 0, left: 0 }, { input: label, top: 260, left: 0 }]).png().toBuffer());
      index[`${group}:${n + 1}`] = { id: record.id, creator: record.creator, license: record.license, source: record.source, title: record.title, url: record.url, foreign: record.foreign, size: `${record.width}x${record.height}` };
    } catch (error) { console.log(`${group}: ${prefix} thumbnail failed: ${error.message}`); }
  }
  const cols = 4, rows = Math.ceil(tiles.length / cols);
  const sheet = sharp({ create: { width: cols * 410, height: rows * 310, channels: 3, background: "#222" } })
    .composite(tiles.map((input, i) => ({ input, left: (i % cols) * 410, top: Math.floor(i / cols) * 310 })));
  await sheet.png().toFile(join(dir, `${group}.png`));
  console.log(`${group}: ${tiles.length} tiles -> ${join(dir, `${group}.png`)}`);
}
await writeFile(join(dir, "index.json"), JSON.stringify(index, null, 1));
