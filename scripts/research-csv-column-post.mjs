import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseDocument, DomUtils } from "htmlparser2";
import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";

const root = fileURLToPath(new URL("../", import.meta.url));
const seeds = ["csv opens in one column excel", "excel csv not separating columns", "csv semicolon excel", "excel text to columns csv"];
const observations = [];
for (const seed of seeds) {
  const url = new URL("https://suggestqueries.google.com/complete/search");
  url.search = new URLSearchParams({ client: "firefox", hl: "en", gl: "us", q: seed });
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    assert(response.ok);
    const data = await response.json();
    observations.push({ seed, suggestions: data[1] });
  } catch (error) { observations.push({ seed, error: error.name }); }
}
const search = new URL("https://html.duckduckgo.com/html/");
search.search = new URLSearchParams({ q: seeds[0], kl: "us-en" });
let serp;
try {
  const response = await fetch(search, { headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)", "accept-language": "en-US,en;q=0.9" }, signal: AbortSignal.timeout(20000) });
  const html = await response.text();
  const doc = parseDocument(html);
  const results = DomUtils.findAll(node => node.name === "a" && (node.attribs.class ?? "").split(/\s+/).includes("result__a"), doc.children).slice(0, 8).map(node => {
    const link = new URL(node.attribs.href, search);
    return { title: DomUtils.textContent(node), url: link.searchParams.get("uddg") ?? link.href };
  });
  serp = { query: seeds[0], status: response.status, blocked: /anomaly-modal|anomaly\.js/.test(html), results };
} catch (error) { serp = { query: seeds[0], error: error.name }; }
nextEnv.loadEnvConfig(root);
assert(process.env.DATABASE_URL, "Database configuration required");
const sql = neon(process.env.DATABASE_URL);
try {
  const [inventory, overlap, categories] = await sql.transaction(tx => [
    tx`SELECT count(*)::integer AS total, (count(*) FILTER (WHERE published))::integer AS published,
      md5(coalesce(string_agg((to_jsonb(p) - 'views')::text, '' ORDER BY id), '')) AS hash,
      to_char(NOW(), 'YYYY-MM-DD') AS database_date FROM posts p`,
    tx`SELECT id, title, slug, published,
      ARRAY(SELECT heading[1] FROM regexp_matches(content, '(?m)^#{2,3} ([^\n]+)', 'g') AS heading) AS headings
      FROM posts WHERE title ~* 'csv|spreadsheet|one column|single column' ORDER BY id`,
    tx`SELECT id, name FROM categories WHERE id = 2`,
  ], { isolationLevel: "RepeatableRead", readOnly: true });
  const report = { checkedAt: new Date().toISOString(), inventory: inventory[0], overlap, categories,
    keywordResearch: { source: "Google public autocomplete; en/US request parameters, wording evidence only", observations },
    serp: { ...serp, source: "DuckDuckGo HTML; not Google ranking or difficulty data" },
    limits: "No authenticated Search Console, search volume, keyword difficulty or traffic forecast. All database queries read-only." };
  const path = resolve(root, "docs/content-research/2026-10-27-csv-one-column-research.json");
  await writeFile(path, JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
  console.log(JSON.stringify(report, null, 2));
} catch (error) { console.error("Research failed", error.code ?? error.name); process.exitCode = 1; }