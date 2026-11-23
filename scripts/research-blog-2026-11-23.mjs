import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const out = (name) => resolve(root, `docs/content-research/2026-11-23-${name}.json`);
const [name, kind, ...items] = process.argv.slice(2);
assert(name && ["suggest", "serp"].includes(kind) && items.length > 0, "Usage: <name> <suggest|serp> <seed or query> ...");
const request = (url) => fetch(url, {
  headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ByteVerse-Editorial-Research/1.0", "accept-language": "en-US,en;q=0.9" },
  signal: AbortSignal.timeout(25000),
});
const safeError = (error) => ({ error: error.code ?? error.name });

async function suggest(seed, source) {
  try {
    if (source === "google") {
      const url = new URL("https://suggestqueries.google.com/complete/search");
      url.search = new URLSearchParams({ client: "firefox", hl: "en", gl: "us", q: seed });
      return (await (await request(url)).json())[1];
    }
    const url = new URL("https://api.bing.com/osjson.aspx");
    url.search = new URLSearchParams({ query: seed, market: "en-US" });
    return (await (await request(url)).json())[1];
  } catch (error) { return safeError(error); }
}

async function serp(query) {
  try {
    const url = new URL("https://html.duckduckgo.com/html/");
    url.search = new URLSearchParams({ q: query, kl: "us-en" });
    const response = await request(url);
    const html = await response.text();
    const results = [...html.matchAll(/<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)].slice(0, 10).map((match) => {
      let link = match[1].replace(/&amp;/g, "&");
      const wrapped = /[?&]uddg=([^&]+)/.exec(link);
      if (wrapped) link = decodeURIComponent(wrapped[1]);
      return { title: match[2].replace(/<[^>]+>/g, "").replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").trim(), url: link };
    });
    return { engine: "DuckDuckGo HTML", checkedAt: new Date().toISOString(), query, status: response.status, blocked: results.length === 0, results };
  } catch (error) { return { query, ...safeError(error) }; }
}

if (kind === "suggest") {
  const observations = [];
  for (let offset = 0; offset < items.length; offset += 4) {
    observations.push(...await Promise.all(items.slice(offset, offset + 4).map(async (seed) => ({ seed, google: await suggest(seed, "google"), bing: await suggest(seed, "bing") }))));
    await new Promise((done) => setTimeout(done, 400));
  }
  await writeFile(out(name), JSON.stringify({ checkedAt: new Date().toISOString(), sources: ["Google public autocomplete (hl=en, gl=us)", "Bing public autocomplete (en-US)"], context: "Wording evidence only, not measured demand.", observations, metrics: { monthlyVolume: null, keywordDifficulty: null, rankingProbability: null, trafficForecast: null } }, null, 2) + "\n", { flag: "wx" });
  const list = (value) => (Array.isArray(value) ? value.slice(0, 10).join(" | ") : JSON.stringify(value));
  for (const item of observations) console.log(`\n# ${item.seed}\n  G: ${list(item.google)}\n  B: ${list(item.bing)}`);
} else {
  const serps = [];
  for (const query of items) { serps.push(await serp(query)); await new Promise((done) => setTimeout(done, 1500)); }
  await writeFile(out(name), JSON.stringify(serps, null, 2) + "\n", { flag: "wx" });
  for (const item of serps) console.log(`\n## ${item.query} (${item.status ?? item.error})\n` + (item.results ?? []).map((result, index) => `  ${index + 1}. ${result.title.slice(0, 95)} <${result.url.slice(0, 120)}>`).join("\n"));
}
