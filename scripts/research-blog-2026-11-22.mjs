import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";

const root = fileURLToPath(new URL("../", import.meta.url));
const out = (name) => resolve(root, `docs/content-research/2026-11-22-${name}.json`);
assert.equal(process.argv.length, 2, "No arguments; collect a new dated research report once");

const seeds = [
  "ollama pull error", "ollama pull model manifest", "ollama error pull model manifest", "ollama pull model manifest file does not exist",
  "ollama max retries exceeded", "ollama pull stuck", "ollama pull slow", "ollama requires a newer version",
  "ollama pull certificate", "ollama pull proxy", "ollama pull unauthorized", "ollama download stuck",
  "ollama model not found", "ollama try pulling it first", "ollama context deadline exceeded", "ollama truncating input prompt",
  "ollama does not support tools", "ollama does not support thinking", "ollama 500 internal server error", "ollama unexpected eof",
  "ollama llama runner process has terminated", "ollama error loading model", "ollama update", "ollama update windows",
  "ollama check version", "ollama rm", "ollama list", "ollama show",
  "ollama create modelfile error", "ollama signin", "ollama cloud models", "ollama no such host",
  "claude code error", "cursor error", "gemini cli error", "copilot chat error",
];
const serpQueries = [
  "ollama error pull model manifest",
  "ollama pull model manifest file does not exist",
  "ollama max retries exceeded",
  "ollama does not support tools",
  "ollama llama runner process has terminated",
  "ollama model not found try pulling it first",
];
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

nextEnv.loadEnvConfig(root);
assert(process.env.DATABASE_URL, "Database configuration is required");
const sql = neon(process.env.DATABASE_URL);
const [inventory, categories, titles] = await sql.transaction((tx) => [
  tx`SELECT count(*)::integer AS total, (count(*) FILTER (WHERE published))::integer AS published,
    md5(coalesce(string_agg((to_jsonb(p) - 'views')::text, '' ORDER BY id), '')) AS hash, sum(views)::integer AS views FROM posts p`,
  tx`SELECT c.id, c.slug, count(p.id)::integer AS posts, round(avg(p.views), 1)::float AS avg_views
    FROM categories c LEFT JOIN posts p ON p.category_id = c.id AND p.published GROUP BY c.id, c.slug ORDER BY posts DESC`,
  tx`SELECT id, slug, title, views, published, category_id, to_char(created_at, 'YYYY-MM-DD') AS created FROM posts ORDER BY id`,
], { isolationLevel: "RepeatableRead", readOnly: true });
await writeFile(out("inventory"), JSON.stringify({ checkedAt: new Date().toISOString(), inventory: inventory[0], categories, titles }, null, 2) + "\n", { flag: "wx" });

const observations = [];
for (let offset = 0; offset < seeds.length; offset += 4) {
  observations.push(...await Promise.all(seeds.slice(offset, offset + 4).map(async (seed) => ({
    seed, google: await suggest(seed, "google"), bing: await suggest(seed, "bing"),
  }))));
  await new Promise((done) => setTimeout(done, 400));
}
await writeFile(out("keywords-candidates"), JSON.stringify({
  checkedAt: new Date().toISOString(), sources: ["Google public autocomplete (hl=en, gl=us)", "Bing public autocomplete (en-US)"],
  context: "Wording evidence only, not measured demand.", observations,
  metrics: { monthlyVolume: null, keywordDifficulty: null, rankingProbability: null, trafficForecast: null },
}, null, 2) + "\n", { flag: "wx" });

const serps = [];
for (const query of serpQueries) {
  serps.push(await serp(query));
  await new Promise((done) => setTimeout(done, 1500));
}
await writeFile(out("ddg-ollama"), JSON.stringify(serps, null, 2) + "\n", { flag: "wx" });

console.log("INVENTORY", JSON.stringify(inventory[0]), JSON.stringify(categories));
console.log("RECENT", titles.slice(-16).map((post) => `${post.id} ${post.created} v${post.views} ${post.slug}`).join("\n"));
console.log("OLLAMA/AI-LOCAL", titles.filter((post) => /ollama|local|lm-studio|webui/.test(post.slug)).map((post) => `${post.id} v${post.views} ${post.published ? "" : "DRAFT "}${post.slug}`).join("\n"));
for (const item of observations) {
  const list = (value) => (Array.isArray(value) ? value.slice(0, 10).join(" | ") : JSON.stringify(value));
  console.log(`\n# ${item.seed}\n  G: ${list(item.google)}\n  B: ${list(item.bing)}`);
}
for (const item of serps) console.log(`\n## ${item.query} (${item.status ?? item.error})\n` + (item.results ?? []).map((result, index) => `  ${index + 1}. ${result.title} <${result.url}>`).join("\n"));
