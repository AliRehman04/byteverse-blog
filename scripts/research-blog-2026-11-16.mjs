import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = resolve(root, "docs/content-research/2026-11-16-keywords-candidates.json");
const seeds = [
  "n8n schedule trigger", "n8n schedule trigger not working", "n8n schedule trigger timezone", "n8n schedule trigger cron",
  "n8n schedule trigger every", "n8n schedule trigger multiple times", "n8n cron expression", "n8n cron every 5 minutes",
  "n8n cron not working", "n8n workflow not running automatically", "n8n schedule trigger runs twice", "n8n schedule workflow",
  "n8n error handling", "n8n error trigger", "n8n error workflow", "n8n error workflow not triggering", "n8n retry on fail",
  "n8n continue on fail", "n8n stop and error", "n8n on error continue", "n8n error output", "n8n try catch",
  "n8n http request pagination", "n8n http request retry", "n8n http request timeout", "n8n http request 429",
  "n8n if node", "n8n if node not working", "n8n switch node", "n8n filter node", "n8n remove duplicates", "n8n aggregate node",
  "n8n edit fields", "n8n set node", "n8n pin data", "n8n expression", "n8n expression not working", "n8n referenced node is unexecuted",
  "n8n timezone", "n8n set timezone", "n8n generic_timezone", "n8n activate workflow", "n8n workflow not triggering", "n8n publish workflow",
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
  const [inventory, n8nPosts, drafts, coverage] = await sql.transaction(tx => [
    tx`SELECT count(*)::integer AS total, (count(*) FILTER (WHERE published))::integer AS published,
      md5(coalesce(string_agg((to_jsonb(p) - 'views')::text, '' ORDER BY id), '')) AS hash,
      to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS database_date FROM posts p`,
    tx`SELECT id, slug, published, views, cover_image, to_char(created_at, 'YYYY-MM-DD') AS created
      FROM posts WHERE title ~* 'n8n' OR slug ~* 'n8n' ORDER BY id`,
    tx`SELECT slug, published FROM posts WHERE slug IN ('pdf-to-podcast-notebooklm-2026', 'audacity-noise-reduction-voice-2026') ORDER BY slug`,
    tx`SELECT slug,
      (SELECT count(*) FROM regexp_matches(content, 'Schedule Trigger', 'g'))::integer AS schedule_trigger,
      (SELECT count(*) FROM regexp_matches(content, 'Error Trigger|error workflow|Retry On Fail', 'gi'))::integer AS error_handling,
      (SELECT count(*) FROM regexp_matches(content, '[Pp]agination', 'g'))::integer AS pagination,
      ARRAY(SELECT heading[1] FROM regexp_matches(content, '(?m)^#{2,3} ([^\n]*(?:[Ss]chedule|[Cc]ron|[Ee]rror|[Rr]etry|[Pp]aginat)[^\n]*)', 'g') AS heading) AS headings
      FROM posts WHERE content ~* 'Schedule Trigger|Error Trigger|error workflow|Retry On Fail|pagination' AND (title ~* 'n8n' OR slug ~* 'n8n') ORDER BY id`,
  ], { isolationLevel: "RepeatableRead", readOnly: true });
  const report = {
    checkedAt: new Date().toISOString(), inventory: inventory[0], n8nPosts, protectedDrafts: drafts, coverage,
    keywordResearch: { source: "Google public autocomplete", context: "English with US request parameters; wording evidence only, not measured demand", observations },
    metrics: { monthlyVolume: null, keywordDifficulty: null, rankingProbability: null, trafficForecast: null },
    limits: "Read-only database inventory. No Search Console or volume dataset.",
  };
  await writeFile(output, JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
  console.log(JSON.stringify({ inventory: report.inventory, n8nPosts: n8nPosts.map(p => `${p.id} ${p.slug} views=${p.views} cover=${p.cover_image.split("/").slice(-2).join("/")}`), coverage,
    observations: observations.map(o => `${o.seed} => ${(o.suggestions ?? [o.error]).join(" | ")}`) }, null, 1));
}

try { await main(); }
catch (error) {
  console.error("Research failed", error.code ?? error.name, error.name === "AssertionError" ? error.message : "Details withheld");
  process.exitCode = 1;
}
