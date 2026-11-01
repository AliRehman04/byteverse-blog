import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseDocument, DomUtils } from "htmlparser2";
import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = resolve(root, "docs/content-research/2026-11-01-n8n-json-body-research.json");
const seeds = [
  "n8n json parameter needs to be valid json", "n8n json parameter needs to be valid json item 0",
  "n8n http request json parameter needs to be valid json", "n8n json parameter need to be an valid json",
  "n8n http request invalid json", "n8n json body expression", "n8n json stringify",
  "n8n http request newline", "n8n json special characters", "n8n json body array",
  "n8n object object http request", "n8n json parse ai output", "n8n tojsonstring",
  "n8n using fields below vs using json", "n8n raw body json", "n8n json parameter item 1",
  "compare two csv files by key", "compare csv files different row order",
  "ollama model requires more system memory", "ollama out of memory windows",
];
const queries = [
  'n8n "JSON parameter needs to be valid JSON"',
  'n8n "JSON parameter" "newline"',
  'n8n "JSON.stringify" "HTTP Request"',
  'n8n "JSON parameter" "item 0"',
  'ollama "model requires more system memory"',
];
const sourcePages = [
  "https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/common-issues.md",
  "https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest.md",
  "https://docs.n8n.io/build/work-with-data/expressions-versus-data-nodes.md",
  "https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.code.md",
  "https://docs.n8n.io/code/builtin/data-transformation-functions/strings/",
  "https://docs.n8n.io/data/data-pinning/",
  "https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.outputparserstructured/",
  "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify",
  "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse",
  "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/JSON_bad_parse",
  "https://www.rfc-editor.org/rfc/rfc8259.html",
];
const sha = value => createHash("sha256").update(value).digest("hex");
const request = url => fetch(url, {
  headers: { "user-agent": "ByteVerse-Editorial-Research/1.0", "accept-language": "en-US,en;q=0.9" },
  signal: AbortSignal.timeout(25000),
});
const safeError = error => ({ error: error.code ?? error.name });

assert.equal(process.argv.length, 2, "No arguments; collect a new dated research report once");

async function main() {
  const observations = [];
  for (let offset = 0; offset < seeds.length; offset += 3) {
    observations.push(...await Promise.all(seeds.slice(offset, offset + 3).map(async seed => {
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
    } catch (error) { searchResults.push({ query, ...safeError(error) }); }
  }
  const sources = await Promise.all(sourcePages.map(async url => {
    try {
      const response = await request(url);
      const body = await response.text();
      const markdown = /text\/markdown/.test(response.headers.get("content-type") ?? "") || !body.trimStart().startsWith("<");
      const document = markdown ? null : parseDocument(body);
      const headings = document ? DomUtils.findAll(node => ["title", "h1", "h2", "h3"].includes(node.name), document.children).map(DomUtils.textContent).slice(0, 32)
        : [...body.matchAll(/^#{1,3}\s+(.+)$/gm)].map(match => match[1]);
      return { url, finalUrl: response.url, status: response.status, contentSha256: sha(body), chars: body.length, headings };
    } catch (error) { return { url, ...safeError(error) }; }
  }));
  const packageResponse = await request("https://registry.npmjs.org/n8n-workflow/latest");
  assert(packageResponse.ok);
  const packageInfo = await packageResponse.json();
  const commitResponse = await request("https://api.github.com/repos/n8n-io/n8n/commits/master");
  assert(commitResponse.ok);
  const commit = await commitResponse.json();
  assert.match(commit.sha, /^[a-f0-9]{40}$/);
  const sourcePath = "packages/nodes-base/nodes/HttpRequest/V3/HttpRequestV3.node.ts";
  const rawUrl = `https://raw.githubusercontent.com/n8n-io/n8n/${commit.sha}/${sourcePath}`;
  const nodeResponse = await request(rawUrl);
  assert(nodeResponse.ok);
  const nodeSource = await nodeResponse.text();
  const validationOffset = nodeSource.indexOf("// body is specified using JSON");
  assert(validationOffset >= 0);
  const httpRequestSource = {
    commit: commit.sha, commitDate: commit.commit.committer.date,
    url: `https://github.com/n8n-io/n8n/blob/${commit.sha}/${sourcePath}`, rawUrl,
    contentSha256: sha(nodeSource),
    validationExcerpt: nodeSource.slice(validationOffset, validationOffset + 800),
  };
  const previousLocalDrafts = [];
  for (const slug of ["json-parse-large-numbers-precision", "n8n-binary-data-not-found", "webp-larger-than-jpg"]) {
    const content = (await readFile(resolve(root, `scripts/content/${slug}.md`), "utf8")).replace(/\r\n?/g, "\n").trim();
    previousLocalDrafts.push({ slug, contentSha256: sha(content) });
  }
  nextEnv.loadEnvConfig(root);
  assert(process.env.DATABASE_URL, "Database configuration required");
  const sql = neon(process.env.DATABASE_URL);
  const [inventory, coverage, categories, drafts, hosts] = await sql.transaction(transaction => [
    transaction`SELECT count(*)::integer AS total, (count(*) FILTER (WHERE published))::integer AS published,
      md5(coalesce(string_agg((to_jsonb(p) - 'views')::text, '' ORDER BY id), '')) AS hash,
      to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS database_date FROM posts p`,
    transaction`SELECT id, title, slug, published,
      ARRAY(SELECT heading[1] FROM regexp_matches(content, '(?m)^#{2,3} ([^\n]+)', 'g') AS heading) AS headings
      FROM posts WHERE title ~* 'n8n' OR content ~* 'JSON parameter|HTTP Request.*JSON|model requires more system memory' ORDER BY id`,
    transaction`SELECT id, name FROM categories WHERE id = 2`,
    transaction`SELECT slug, published FROM posts WHERE slug IN ('pdf-to-podcast-notebooklm-2026', 'audacity-noise-reduction-voice-2026') ORDER BY slug`,
    transaction`SELECT id, slug, content FROM posts WHERE slug = 'how-to-use-n8n-2026-complete-guide' AND published`,
  ], { isolationLevel: "RepeatableRead", readOnly: true });
  const report = {
    checkedAt: new Date().toISOString(), inventory: inventory[0], coverage, categories, protectedDrafts: drafts, previousLocalDrafts,
    host: hosts.map(row => ({ id: row.id, slug: row.slug, contentSha256: sha(row.content),
      relevantParagraphs: row.content.split(/\r?\n\r?\n/).filter(paragraph => /HTTP Request|JSON/.test(paragraph)).slice(0, 12) })),
    keywordResearch: { source: "Google public autocomplete", context: "English with US request parameters; not measured US demand", observations },
    searchResults: { source: "DuckDuckGo HTML first-page observations, not Google rankings", observations: searchResults },
    searchConsole: { configured: ["GSC_CLIENT_EMAIL", "GSC_PRIVATE_KEY", "GSC_SITE_URL"].every(name => Boolean(process.env[name])), queried: false },
    sources, httpRequestSource,
    runtimeCandidate: { name: packageInfo.name, version: packageInfo.version, engines: packageInfo.engines, integrity: packageInfo.dist.integrity },
    metrics: { monthlyVolume: null, keywordDifficulty: null, rankingProbability: null, trafficForecast: null },
    limits: "No authenticated Search Console or volume dataset. Autocomplete provides query wording, not demand or ranking guarantees. Public result samples do not establish low competition. Database access was read-only; no n8n workflows or external connectors were run.",
  };
  await writeFile(output, JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
  console.log(JSON.stringify({ output, inventory: report.inventory, observations,
    searchResults, sourceStatus: sources.map(({ url, status, finalUrl }) => ({ url, status, finalUrl })),
    httpRequestSource, host: report.host, runtimeCandidate: report.runtimeCandidate }, null, 2));
}

try { await main(); }
catch (error) {
  console.error("Research failed", error.code ?? error.name, error.name === "AssertionError" ? error.message : "Details withheld");
  process.exitCode = 1;
}