/**
 * Offline tests for the n8n Loop Over Items guide. No network, database or n8n instance.
 * The node's behaviour table is checked against a JavaScript port of SplitInBatchesV3.execute()
 * driven by a tiny loop simulator; the article's Code node example runs with emulated globals.
 *   node --test scripts/test-n8n-loop-post.mjs
 *   node scripts/test-n8n-loop-post.mjs --metrics
 *   node scripts/test-n8n-loop-post.mjs --live   (after publication)
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { parseDocument, DomUtils } from "htmlparser2";
import sharp from "sharp";
import ts from "typescript";

const content = readFileSync(new URL("content/n8n-loop-over-items-guide.md", import.meta.url), "utf8").replace(/\r\n?/g, "\n").trim();
const prose = content.split("\n## Sources and Further Reading")[0].replace(/\[([^\]]+)\]\([^\n)]+\)/g, (_, label) => label);
const words = (prose.match(/[\p{L}\p{N}]+(?:['.-][\p{L}\p{N}]+)*/gu) ?? []).length;
const metrics = {
  proseWords: words,
  contentSha256: createHash("sha256").update(content).digest("hex"),
  readingTime: `${Math.ceil(words / 220)} min read`,
  codeBlocks: (content.match(/^```[^\n]+$/gm) ?? []).length,
  tables: (content.match(/^\|---/gm) ?? []).length,
};
const mode = process.argv[2];
assert(process.argv.length <= 3 && (!mode || ["--metrics", "--live"].includes(mode)));
if (mode === "--metrics") { console.log(JSON.stringify(metrics, null, 2)); process.exit(0); }
const ledger = JSON.parse(readFileSync(new URL("../docs/n8n-loop-over-items-keywords-2026-11-07.json", import.meta.url), "utf8"));

// ---------------------------------------------------------------- port of SplitInBatchesV3.execute()
function splitInBatches(context, inputItems, batchSize, options = {}) {
  const items = inputItems.slice();
  const returnItems = [];
  if (context.items === undefined || options.reset === true) {
    context.currentRunIndex = 0;
    context.maxRunIndex = Math.ceil(items.length / batchSize);
    returnItems.push(...items.splice(0, batchSize));
    context.items = [...items];
    context.processedItems = [];
  } else {
    context.currentRunIndex += 1;
    returnItems.push(...context.items.splice(0, batchSize));
    context.processedItems = [...context.processedItems, ...items];
  }
  context.noItemsLeft = context.items.length === 0;
  if (returnItems.length === 0) { context.done = true; return [context.processedItems, []]; }
  context.done = false;
  return [[], returnItems];
}

// Simulates a loop: body(batch, context) returns the items that flow back into the node (null = no loop-back connection).
function runLoop(inputItems, batchSize, body, { reset = () => false, maxRuns = 50 } = {}) {
  const context = {};
  const trace = [];
  let incoming = inputItems;
  for (let run = 0; run < maxRuns; run++) {
    const [done, loop] = splitInBatches(context, incoming, batchSize, { reset: reset(run, context) });
    trace.push({ run, runIndex: context.currentRunIndex, loop: loop.length, noItemsLeft: context.noItemsLeft, done: context.done });
    if (context.done) return { done, trace, runs: run + 1, terminated: true };
    const back = body(loop, context);
    if (back === null) return { done: null, trace, runs: run + 1, terminated: false };
    incoming = back;
  }
  return { done: null, trace, runs: maxRuns, terminated: false };
}
const items = (count) => Array.from({ length: count }, (_, index) => ({ json: { id: index + 1 } }));

test("7 items with batch size 3 run four times and the done output holds the processed items", () => {
  const seen = [];
  const result = runLoop(items(7), 3, (batch) => { seen.push(batch.map((item) => item.json.id)); return batch.map((item) => ({ json: { id: item.json.id, ok: true } })); });
  assert.deepEqual(seen, [[1, 2, 3], [4, 5, 6], [7]]);
  assert.equal(result.runs, 4);
  assert.deepEqual(result.trace.map((row) => [row.runIndex, row.loop, row.noItemsLeft]), [[0, 3, false], [1, 3, false], [2, 1, true], [3, 0, true]]);
  assert.deepEqual(result.done.map((item) => item.json.id), [1, 2, 3, 4, 5, 6, 7]);
  assert(result.done.every((item) => item.json.ok === true), "done carries the transformed items, not the originals");
  assert.equal(result.trace.at(-1).runIndex, 3, "the final run is a real run with index 3");
});

test("noItemsLeft is already true while the last batch is being processed", () => {
  const flags = [];
  runLoop(items(7), 3, (batch, context) => { flags.push(context.noItemsLeft); return batch; });
  assert.deepEqual(flags, [false, false, true]);
});

test("a body that filters items removes them from done, and a missing loop-back never reaches done", () => {
  const filtered = runLoop(items(6), 2, (batch) => batch.filter((item) => item.json.id % 2 === 0));
  assert.deepEqual(filtered.done.map((item) => item.json.id), [2, 4, 6]);
  const broken = runLoop(items(6), 2, () => null);
  assert.equal(broken.terminated, false);
  assert.equal(broken.runs, 1, "only the first batch is ever sent");
  assert.equal(broken.done, null);
});

test("empty input finishes immediately with zero processed items", () => {
  const result = runLoop([], 3, () => { throw new Error("body must not run"); });
  assert.equal(result.runs, 1);
  assert.deepEqual(result.done, []);
  assert.equal(result.trace[0].runIndex, 0);
});

test("Reset makes every run start again, so the loop only ends when the body stops sending items", () => {
  let page = 0;
  const result = runLoop([{ json: { page: 1 } }], 1, (batch) => { page = batch[0].json.page; return page >= 3 ? [] : [{ json: { page: page + 1 } }]; }, { reset: () => true });
  assert.equal(page, 3);
  assert.equal(result.terminated, true);
  const endless = runLoop([{ json: { page: 1 } }], 1, (batch) => [{ json: { page: batch[0].json.page + 1 } }], { reset: () => true, maxRuns: 20 });
  assert.equal(endless.terminated, false, "without an exit condition a reset loop never finishes");
});

test("the inner loop of a nested loop keeps stale state unless reset", () => {
  const inner = {};
  const first = splitInBatches(inner, items(2), 1);
  assert.equal(first[1].length, 1);
  splitInBatches(inner, first[1], 1);
  const stale = splitInBatches(inner, items(3), 1);
  assert.equal(stale[0].length, 4, "new outer items are treated as loop-back results and the inner loop reports done at once with old and new items mixed");
  const fresh = splitInBatches(inner, items(3), 1, { reset: true });
  assert.equal(fresh[1].length, 1);
  assert.equal(inner.maxRunIndex, 3);
});

test("the ledger's behaviour table rows match the port", () => {
  for (const row of ledger.validation.behaviourTable) {
    const result = runLoop(items(row.items), row.batchSize, (batch) => batch, { maxRuns: row.runs + 5 });
    assert.equal(result.runs, row.runs, JSON.stringify(row));
    assert.equal(result.done.length, row.items, JSON.stringify(row));
  }
});

// ---------------------------------------------------------------- article code example
const blocks = [...content.matchAll(/```(mjs|txt)\n([\s\S]*?)\n```/g)].map((match) => ({ lang: match[1], code: match[2] }));
test("the Code node summary example compiles and summarises done output items", async () => {
  const code = blocks.find((block) => block.lang === "mjs")?.code;
  assert(code);
  const compiled = ts.transpileModule(`async function example() {\n${code}\n}`, { fileName: "example.js", reportDiagnostics: true, compilerOptions: { target: ts.ScriptTarget.ES2022 } });
  assert.equal(compiled.diagnostics?.length ?? 0, 0);
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  const input = [{ json: { id: "a", status: 200 } }, { json: { id: "b", status: 429 } }, { json: { id: "c", status: 500 } }];
  const out = await new AsyncFunction("$input", code)({ all: () => input });
  assert.deepEqual(out, [{ json: { processed: 3, failed: 2, failedIds: ["b", "c"] } }]);
  for (const block of blocks.filter((item) => item.lang === "txt")) assert.match(block.code, /^\{\{ .+ \}\}$/m, "expression blocks are n8n expressions");
});

// ---------------------------------------------------------------- renderer parity
const appRequire = createRequire(import.meta.url);
function loadLocal(path, overrides = {}) {
  const source = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { fileName: path, reportDiagnostics: true, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } });
  assert.equal(compiled.diagnostics?.length ?? 0, 0);
  const record = { exports: {} };
  const allowed = new Set(["react", "react/jsx-runtime", "lucide-react", "react-markdown", "remark-gfm", "rehype-raw", "rehype-sanitize", "rehype-slug"]);
  new Function("require", "module", "exports", compiled.outputText)((name) => {
    if (Object.hasOwn(overrides, name)) return overrides[name];
    assert(allowed.has(name), `Unexpected renderer dependency ${name}`);
    return appRequire(name);
  }, record, record.exports);
  return record.exports;
}
const siteConfig = { url: ledger.website, name: "ByteVerse" };
const imageSeo = loadLocal("src/lib/image-seo.ts", { "@/lib/config": { siteConfig } });
const { MarkdownRenderer } = loadLocal("src/components/markdown-renderer.tsx", {
  "@/lib/image-seo": imageSeo,
  "@/lib/config": { siteConfig },
  "@/components/copy-button": loadLocal("src/components/copy-button.tsx"),
  "@/components/code-playground": { CodePlayground() { throw new Error("Workflow examples must not show a browser Run button"); } },
});
const rendered = renderToStaticMarkup(createElement(MarkdownRenderer, { content, currentSlug: ledger.slug }));
const document = parseDocument(rendered);
const all = (root, predicate) => DomUtils.findAll(predicate, root.children ?? []);
const one = (root, predicate) => { const matches = all(root, predicate); assert.equal(matches.length, 1); return matches[0]; };

test("metadata, slug and ledger figures match the article without invented SEO metrics", () => {
  assert.equal(ledger.slug, "n8n-loop-over-items-guide");
  assert.match(ledger.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  assert.equal(ledger.targeting.author, "Ali Rehman");
  assert(ledger.targeting.title.length <= 70);
  assert(`${ledger.targeting.metaTitle} | ByteVerse`.length <= 60);
  assert(ledger.targeting.metaDescription.length >= 120 && ledger.targeting.metaDescription.length <= 160);
  assert(ledger.targeting.excerpt.length <= 300);
  assert.equal(ledger.targeting.summary.split("|").length, 3);
  assert.equal(ledger.validation.contentSha256, metrics.contentSha256);
  assert.equal(ledger.validation.proseWords, metrics.proseWords);
  assert.equal(ledger.validation.codeBlocks, metrics.codeBlocks);
  assert.equal(ledger.validation.tables, metrics.tables);
  assert.equal(ledger.targeting.readingTime, metrics.readingTime);
  assert.equal(ledger.research.observations.length, 30);
  for (const value of Object.values(ledger.metrics)) assert.equal(value, null);
  assert(!/^# |\ufffd|\0|\bTODO\b|\bTBD\b/m.test(content));
  assert(content.match(/^## .+$/gm).every((heading) => !heading.endsWith("?")));
});

test("real MarkdownRenderer preserves code blocks, tables and links", () => {
  const actual = all(document, (node) => node.name === "pre").map((node) => DomUtils.textContent(one(node, (child) => child.name === "code")).trim());
  assert.equal(actual.length, metrics.codeBlocks);
  assert.deepEqual(actual, blocks.map((block) => block.code.trim()));
  assert.equal(all(document, (node) => node.name === "table").length, metrics.tables);
  assert.equal(all(document, (node) => ["h1", "script", "iframe"].includes(node.name)).length, 0);
  const ids = all(document, (node) => /^h[23]$/.test(node.name)).map((node) => node.attribs.id);
  assert.equal(new Set(ids).size, ids.length);
  const internal = [...new Set(all(document, (node) => node.name === "a" && node.attribs.href?.startsWith("/")).map((node) => node.attribs.href))].sort();
  assert.deepEqual(internal, [...ledger.internalLinks].sort());
  const external = all(document, (node) => node.name === "a" && node.attribs.href?.startsWith("https://"));
  assert.deepEqual([...new Set(external.map((node) => node.attribs.href))].sort(), [...ledger.sources.map((source) => source.url), ledger.images.coverCredit, ledger.images.inlineCredit].sort());
  assert(external.every((node) => node.attribs.rel.includes("noopener")));
});

test("five visible FAQs exactly match the existing blog schema extractor", () => {
  const source = readFileSync(new URL("../src/app/blog/[slug]/page.tsx", import.meta.url), "utf8");
  const start = source.indexOf("  const faqRegex =");
  const end = source.indexOf("  // Auto-extract HowTo", start);
  assert(start > 0 && end > start);
  const compiled = ts.transpileModule(source.slice(start, end), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const faqs = new Function("post", `${compiled}; return faqs;`)({ content });
  const details = all(document, (node) => node.name === "details");
  const collapse = (value) => value.replace(/\s+/g, " ").trim();
  assert.equal(details.length, 5);
  assert.deepEqual(faqs.map((faq) => faq.question), ledger.faq);
  assert.deepEqual(details.map((node) => DomUtils.textContent(one(node, (child) => child.name === "summary"))), ledger.faq);
  assert.deepEqual(faqs.map((faq) => collapse(faq.answer)), details.map((node) => collapse(DomUtils.textContent(one(node, (child) => child.name === "p")))));
});

test("real photographs have valid files, accurate captions and an explicit testing boundary", async () => {
  const image = one(document, (node) => node.name === "img");
  assert.equal(image.attribs.src, ledger.images.inline);
  assert.equal(image.attribs.width, "1200");
  assert.equal(image.attribs.height, "675");
  assert.equal(image.attribs.loading, "eager");
  assert.match(DomUtils.textContent(one(document, (node) => node.name === "figcaption")), /not a screenshot of n8n.*Daniil Komov \/ Pexels/);
  for (const path of [ledger.images.coverFile, ledger.images.inlineFile]) {
    const info = await sharp(readFileSync(new URL(`../${path}`, import.meta.url))).metadata();
    assert.equal(info.width, 1200);
    assert.equal(info.height, 675);
    assert.equal(info.format, "jpeg");
  }
  assert(content.includes("not a substitute for running the workflow in your own instance"));
});

if (mode === "--live") {
  assert(ledger.publication.publishedAt, "Record the actual publication receipt before live verification");
  const articleUrl = `${ledger.website}/blog/${ledger.slug}`;
  test("the live article serves the exact metadata, schema, links and FAQs", async () => {
    const response = await fetch(articleUrl, { headers: { "user-agent": "Mozilla/5.0 ByteVerse live check" }, signal: AbortSignal.timeout(30000) });
    assert.equal(response.status, 200);
    const live = parseDocument(await response.text());
    const meta = (attribute, value) => all(live, (node) => node.name === "meta" && node.attribs[attribute] === value)[0]?.attribs.content;
    assert.equal(DomUtils.textContent(one(live, (node) => node.name === "h1")), ledger.targeting.title);
    assert.equal(DomUtils.textContent(one(live, (node) => node.name === "title")), `${ledger.targeting.metaTitle} | ByteVerse`);
    assert.equal(meta("name", "description"), ledger.targeting.metaDescription);
    assert.equal(all(live, (node) => node.name === "link" && node.attribs.rel === "canonical")[0]?.attribs.href, articleUrl);
    assert.equal(meta("property", "article:published_time"), ledger.publication.publishedAt);
    for (const href of ledger.internalLinks) assert(all(live, (node) => node.name === "a" && node.attribs.href === href).length > 0, `Missing live internal link: ${href}`);
    const schemas = all(live, (node) => node.name === "script" && node.attribs.type === "application/ld+json").flatMap((node) => { const parsed = JSON.parse(DomUtils.textContent(node)); return parsed["@graph"] ?? [parsed]; });
    assert.deepEqual(schemas.find((schema) => schema["@type"] === "FAQPage")?.mainEntity.map((entity) => entity.name), ledger.faq);
    const article = schemas.find((schema) => schema["@type"] === "BlogPosting");
    assert.equal(article?.datePublished, ledger.publication.publishedAt);
    assert.equal(article?.author?.name, ledger.targeting.author);
    assert.equal(all(live, (node) => node.name === "details").length, 5);
    assert.equal(all(live, (node) => node.name === "pre").length, metrics.codeBlocks);
    assert.equal(all(live, (node) => node.name === "table").length, metrics.tables);
  });
}

console.log(`Runtime: Node ${process.version}; SplitInBatchesV3 logic ported and simulated; no n8n instance, network or database.`);
console.log(JSON.stringify(metrics));
