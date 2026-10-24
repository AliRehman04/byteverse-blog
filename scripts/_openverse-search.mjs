import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

// Research helper: candidate photos from the Openverse API (CC-licensed, commercial-use filter). Anonymous, rate-limited.
const queries = process.argv.slice(2);
if (!queries.length) { console.error("Usage: node scripts/_openverse-search.mjs <query> [query...]"); process.exit(1); }
const out = {};
for (const query of queries) {
  const url = new URL("https://api.openverse.org/v1/images/");
  url.search = new URLSearchParams({ q: query, license_type: "commercial,modification", source: process.env.OPENVERSE_SOURCES ?? "stocksnap,rawpixel", size: "large", page_size: "20", mature: "false" });
  const response = await fetch(url, { headers: { "user-agent": "ByteVerse editorial research (contact: hello@byteverse.fyi)", accept: "application/json" }, signal: AbortSignal.timeout(30000) });
  if (!response.ok) { out[query] = { error: response.status }; console.log(`\n=== ${query}: HTTP ${response.status}`); await response.text(); await new Promise(r => setTimeout(r, 3000)); continue; }
  const data = await response.json();
  out[query] = data.results.map(r => ({ id: r.id, title: r.title, creator: r.creator, license: `${r.license} ${r.license_version}`, source: r.source, provider: r.provider, width: r.width, height: r.height, url: r.url, foreign: r.foreign_landing_url, thumb: r.thumbnail }));
  console.log(`\n=== ${query} (${data.result_count} total)`);
  for (const r of out[query]) console.log(`${r.id.slice(0, 8)} | ${r.source} | ${r.license} | ${r.creator} | ${r.width}x${r.height} | ${(r.title ?? "").slice(0, 70)}`);
  await new Promise(r => setTimeout(r, 2500));
}
await mkdir("docs/content-research", { recursive: true });
await writeFile(join("docs/content-research", "2026-10-24-stock-photo-candidates.json"), JSON.stringify(out, null, 1));
