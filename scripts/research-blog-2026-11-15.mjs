import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = resolve(root, "docs/content-research/2026-11-15-keywords-candidates.json");
const seeds = [
  "n8n merge node", "n8n if node", "n8n switch node", "n8n http request pagination", "n8n error handling",
  "n8n error trigger", "n8n retry on fail", "n8n schedule trigger", "n8n cron", "n8n filter node",
  "n8n aggregate node", "n8n remove duplicates", "n8n google sheets", "n8n environment variables",
  "n8n execution timeout", "n8n referenced node is unexecuted", "n8n cannot read properties of undefined",
  "n8n rate limit", "n8n 429", "n8n memory", "n8n execute workflow", "n8n update docker", "n8n openai",
  "n8n form trigger", "n8n telegram bot", "n8n workflow has issues", "n8n problem in node", "n8n edit fields",
  "n8n compare datasets", "n8n html extract", "n8n pdf", "n8n gmail", "n8n notion", "n8n supabase",
  "n8n postgres", "n8n mcp", "n8n ai agent tools", "n8n structured output parser", "n8n vector store",
  "n8n chat trigger", "n8n credentials", "n8n variables", "n8n static data", "n8n execution order",
  "n8n merge node not waiting", "n8n google sheets append", "n8n http request error 400", "n8n http request headers",
];
const request = url => fetch(url, {
  headers: { "user-agent": "ByteVerse-Editorial-Research/1.0", "accept-language": "en-US,en;q=0.9" },
  signal: AbortSignal.timeout(25000),
});
const safeError = error => ({ error: error.code ?? error.name });
assert.equal(process.argv.length, 2, "No arguments; collect a new dated research report once");

async function main() {
  const observations = [];
  for (let offset = 0; offset < seeds.length; offset += 4) {
    observations.push(...await Promise.all(seeds.slice(offset, offset + 4).map(async seed => {
      const url = new URL("https://suggestqueries.google.com/complete/search");
      url.search = new URLSearchParams({ client: "firefox", hl: "en", gl: "us", q: seed });
      try {
        const response = await request(url);
        assert(response.ok);
        const data = await response.json();
        assert(Array.isArray(data[1]));
        return { seed, suggestions: data[1] };
      } catch (error) { return { seed, ...safeError(error) }; }
    })));
    await new Promise(r => setTimeout(r, 400));
  }
  nextEnv.loadEnvConfig(root);
  assert(process.env.DATABASE_URL, "Database configuration required");
  const sql = neon(process.env.DATABASE_URL);
  const [inventory, n8nPosts, drafts] = await sql.transaction(tx => [
    tx`SELECT count(*)::integer AS total, (count(*) FILTER (WHERE published))::integer AS published,
      md5(coalesce(string_agg((to_jsonb(p) - 'views')::text, '' ORDER BY id), '')) AS hash,
      to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS database_date FROM posts p`,
    tx`SELECT id, title, slug, published, views, to_char(created_at, 'YYYY-MM-DD') AS created,
      ARRAY(SELECT heading[1] FROM regexp_matches(content, '(?m)^#{2,3} ([^\n]+)', 'g') AS heading) AS headings
      FROM posts WHERE title ~* 'n8n' OR slug ~* 'n8n' ORDER BY id`,
    tx`SELECT slug, published FROM posts WHERE slug IN ('pdf-to-podcast-notebooklm-2026', 'audacity-noise-reduction-voice-2026') ORDER BY slug`,
  ], { isolationLevel: "RepeatableRead", readOnly: true });
  const report = {
    checkedAt: new Date().toISOString(), inventory: inventory[0], n8nPosts, protectedDrafts: drafts,
    keywordResearch: { source: "Google public autocomplete", context: "English with US request parameters; wording evidence only, not measured demand", observations },
    metrics: { monthlyVolume: null, keywordDifficulty: null, rankingProbability: null, trafficForecast: null },
    limits: "Read-only database inventory. No Search Console or volume dataset.",
  };
  await writeFile(output, JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
  console.log(JSON.stringify({ inventory: report.inventory, n8nPosts: n8nPosts.map(p => ({ id: p.id, slug: p.slug, views: p.views, created: p.created })), observations }, null, 2));
}

try { await main(); }
catch (error) {
  console.error("Research failed", error.code ?? error.name, error.name === "AssertionError" ? error.message : "Details withheld");
  process.exitCode = 1;
}
