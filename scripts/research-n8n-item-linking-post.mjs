import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseDocument, DomUtils } from "htmlparser2";
import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = resolve(root, "docs/content-research/2026-10-30-n8n-item-linking-research.json");
const seeds = [
  "n8n can't determine which item to use", "n8n paired item data is unavailable",
  "n8n paireditem", "n8n item linking", "n8n itemmatching", "n8n first vs item",
  "n8n multiple matching items for expression", "n8n code node paireditem",
  "n8n item index after filter", "n8n code node filter items",
  "n8n referenced node is unexecuted", "n8n all itemindex",
  "n8n run once for all items vs each item", "n8n merge matching fields",
];
const queries = [
  "n8n can't determine which item to use",
  'n8n "pairedItem" filter sort index',
  'n8n "itemMatching" ".item"',
  'n8n "Multiple matching items for expression"',
];
const sourcePages = [
  "https://docs.n8n.io/build/work-with-data/reference-data/link-data-items/item-linking-errors.md",
  "https://docs.n8n.io/build/work-with-data/reference-data/link-data-items/preserving-linking-in-the-code-node.md",
  "https://docs.n8n.io/build/work-with-data/reference-data/link-data-items/accessing-linked-items-in-the-code-node.md",
  "https://docs.n8n.io/build/work-with-data/reference-data/link-data-items/how-items-link-through-workflows.md",
  "https://docs.n8n.io/build/work-with-data/reference-data/reference-previous-nodes.md",
  "https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.code/common-issues/",
  "https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.merge/",
  "https://community.n8n.io/t/how-to-solve-cant-determine-what-item-to-use/65663",
  "https://community.n8n.io/t/cant-determine-which-item-to-use-problem/195215",
  "https://www.n8ndevelopers.com/blogs/n8n-cant-determine-which-item-to-use-paired-items-fixed",
  "https://netlintech.com/blog/paireditem-problem-in-n8n-workflows-guide",
];
const sha = value => createHash("sha256").update(value).digest("hex");
const request = url => fetch(url, {
  headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)", "accept-language": "en-US,en;q=0.9" },
  signal: AbortSignal.timeout(25000),
});

assert.equal(process.argv.length, 2, "No arguments; creates a dated research report once");
try {
  const observations = [];
  for (const seed of seeds) {
    const url = new URL("https://suggestqueries.google.com/complete/search");
    url.search = new URLSearchParams({ client: "firefox", hl: "en", gl: "us", q: seed });
    try {
      const response = await request(url);
      assert(response.ok);
      const data = await response.json();
      assert(Array.isArray(data[1]));
      observations.push({ seed, suggestions: data[1] });
    } catch (error) { observations.push({ seed, error: error.name }); }
  }
  const searchResults = [];
  for (const query of queries) {
    const url = new URL("https://html.duckduckgo.com/html/");
    url.search = new URLSearchParams({ q: query, kl: "us-en" });
    try {
      const response = await request(url);
      const html = await response.text();
      const blocked = /anomaly-modal|anomaly\.js|unusual traffic|not a robot/i.test(html);
      const document = parseDocument(html);
      const results = DomUtils.findAll(node => node.name === "a" && (node.attribs.class ?? "").split(/\s+/).includes("result__a"), document.children)
        .slice(0, 10).map(node => {
          const link = new URL(node.attribs.href, url);
          return { title: DomUtils.textContent(node), url: link.searchParams.get("uddg") ?? link.href };
        });
      searchResults.push({ query, status: response.status, blocked, results });
      if (blocked) break;
    } catch (error) { searchResults.push({ query, error: error.name }); }
  }
  const sources = [];
  for (const url of sourcePages) {
    try {
      const response = await request(url);
      const body = await response.text();
      const markdown = (response.headers.get("content-type") ?? "").includes("text/markdown") || !body.trimStart().startsWith("<");
      const document = markdown ? null : parseDocument(body);
      const titles = document ? DomUtils.findAll(node => ["title", "h1", "h2", "h3"].includes(node.name), document.children).map(DomUtils.textContent).slice(0, 32)
        : [...body.matchAll(/^#{1,3}\s+(.+)$/gm)].map(match => match[1]);
      sources.push({ url, finalUrl: response.url, status: response.status, contentSha256: sha(body), chars: body.length, headings: titles });
    } catch (error) { sources.push({ url, error: error.name }); }
  }
  const packageResponse = await request("https://registry.npmjs.org/n8n-workflow/latest");
  assert(packageResponse.ok);
  const packageInfo = await packageResponse.json();
  const priorDrafts = [];
  for (const slug of ["json-parse-large-numbers-precision", "n8n-binary-data-not-found", "webp-larger-than-jpg"]) {
    const content = (await readFile(resolve(root, `scripts/content/${slug}.md`), "utf8")).replace(/\r\n?/g, "\n").trim();
    priorDrafts.push({ slug, contentSha256: sha(content) });
  }
  nextEnv.loadEnvConfig(root);
  assert(process.env.DATABASE_URL, "Database configuration required");
  const sql = neon(process.env.DATABASE_URL);
  const [inventory, coverage, categories, drafts, host] = await sql.transaction(tx => [
    tx`SELECT count(*)::integer AS total, (count(*) FILTER (WHERE published))::integer AS published,
      md5(coalesce(string_agg((to_jsonb(p) - 'views')::text, '' ORDER BY id), '')) AS hash,
      to_char(NOW(), 'YYYY-MM-DD') AS database_date FROM posts p`,
    tx`SELECT id, title, slug, published,
      ARRAY(SELECT heading[1] FROM regexp_matches(content, '(?m)^#{2,3} ([^\n]+)', 'g') AS heading) AS headings
      FROM posts WHERE title ~* 'n8n' OR content ~* 'pairedItem|itemMatching|item linking' ORDER BY id`,
    tx`SELECT id, name FROM categories WHERE id IN (2, 4) ORDER BY id`,
    tx`SELECT slug, published FROM posts WHERE slug IN ('pdf-to-podcast-notebooklm-2026', 'audacity-noise-reduction-voice-2026') ORDER BY slug`,
    tx`SELECT id, slug, content FROM posts WHERE slug = 'how-to-use-n8n-2026-complete-guide' AND published`,
  ], { isolationLevel: "RepeatableRead", readOnly: true });
  const report = {
    checkedAt: new Date().toISOString(), inventory: inventory[0], coverage, categories, protectedDrafts: drafts, previousLocalDrafts: priorDrafts,
    host: host.map(row => ({ id: row.id, slug: row.slug, contentSha256: sha(row.content), dataSection: row.content.split(/\r?\n## /).find(section => section.startsWith("The Five Concepts")) ?? null })),
    keywordResearch: { source: "Google public autocomplete", context: "English with US request parameters, not measured US demand", observations },
    searchResults: { source: "DuckDuckGo HTML first-page observations, not Google rankings", observations: searchResults },
    sources,
    runtimeCandidate: { name: packageInfo.name, version: packageInfo.version, engines: packageInfo.engines, integrity: packageInfo.dist.integrity, tarball: packageInfo.dist.tarball },
    metrics: { monthlyVolume: null, keywordDifficulty: null, rankingProbability: null, trafficForecast: null },
    limits: "No authenticated Search Console or volume dataset. Autocomplete is wording evidence only. Search results are an observed sample, not a ranking promise. All database reads are read-only; no production workflows used.",
  };
  await writeFile(output, JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
  console.log(JSON.stringify({ output, inventory: report.inventory, coverage: coverage.map(({ id, title, slug }) => ({ id, title, slug })),
    observations, searchResults, sourceStatus: sources.map(({ url, status, finalUrl }) => ({ url, status, finalUrl })), runtimeCandidate: report.runtimeCandidate }, null, 2));
} catch (error) {
  console.error("Research failed", error.code ?? error.name, error.name === "AssertionError" ? error.message : "Details withheld");
  process.exitCode = 1;
}