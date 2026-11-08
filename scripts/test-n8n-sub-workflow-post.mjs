/**
 * Offline tests for the n8n sub-workflow guide. No network, database or n8n instance.
 * The article's behaviour claims are checked against JavaScript ports of the Execute Sub-workflow
 * Trigger's schema trimming, the engine's sub-workflow output merging (sub-workflow-output.ts) and
 * the Execute Sub-workflow node's wait / mode handling; the Code node example runs with emulated globals.
 *   node --test scripts/test-n8n-sub-workflow-post.mjs
 *   node scripts/test-n8n-sub-workflow-post.mjs --metrics
 *   node scripts/test-n8n-sub-workflow-post.mjs --live   (after publication)
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

const content = readFileSync(new URL("content/n8n-sub-workflow-guide.md", import.meta.url), "utf8").replace(/\r\n?/g, "\n").trim();
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
const ledger = JSON.parse(readFileSync(new URL("../docs/n8n-sub-workflow-keywords-2026-11-08.json", import.meta.url), "utf8"));

// ---------------------------------------------------------------- port of ExecuteWorkflowTrigger.execute()
const FALLBACK_DEFAULT_VALUE = null;
function triggerExecute(inputSource, schemaFields, inputData) {
  if (inputSource === "passthrough") return [inputData];
  const keys = new Set(schemaFields.map((field) => field.name));
  return [inputData.map(({ json, binary }, index) => ({
    json: { ...Object.fromEntries(schemaFields.map((field) => [field.name, FALLBACK_DEFAULT_VALUE])), ...Object.fromEntries(Object.entries(json).filter(([key]) => keys.has(key))) },
    index,
    binary,
  }))];
}

// ---------------------------------------------------------------- port of sub-workflow-output.ts + buildSubWorkflowOutput
function getLastExecutedNodeRuns(run) {
  const { runData, lastNodeExecuted } = run.data.resultData;
  if (lastNodeExecuted === undefined) return [];
  return [...(runData[lastNodeExecuted] ?? [])].sort((a, b) => (a.executionIndex ?? 0) - (b.executionIndex ?? 0));
}
function getLastExecutedNodeData(run) {
  const { runData, lastNodeExecuted, pinData = {} } = run.data.resultData;
  if (lastNodeExecuted === undefined || !runData[lastNodeExecuted]?.length) return undefined;
  const last = runData[lastNodeExecuted].at(-1);
  let pinned = pinData[lastNodeExecuted];
  if (pinned && run.mode === "manual") {
    if (!Array.isArray(pinned)) pinned = [pinned];
    return { data: { main: [pinned.map((item, index) => ({ json: item, pairedItem: { item: index } }))] } };
  }
  return last;
}
function mergeRunsPerBranch(runs) {
  const branchCount = runs.reduce((max, run) => Math.max(max, run.data?.main?.length ?? 0), 0);
  return Array.from({ length: branchCount }, (_, branch) => runs.flatMap((run) => run.data?.main?.[branch] ?? []));
}
function triggerReturnsLastRunOnly(trigger) {
  const version = trigger?.typeVersion ?? 1;
  return version < 1.2 && trigger?.parameters?.returnOutput !== "allRuns";
}
// trigger >= 1.3: single flattened output of the last node's main branches (collectSubWorkflowOutput)
// trigger < 1.3: buildSubWorkflowOutput (array of branches; only branch 0 reaches the parent's single output)
function parentOutput(run, trigger, lastNodeMainOutputs) {
  const lastRun = getLastExecutedNodeData(run);
  if (!lastRun?.data?.main) return [null];
  const usePinData = run.mode === "manual" && run.data.resultData.pinData?.[run.data.resultData.lastNodeExecuted] !== undefined;
  if ((trigger?.typeVersion ?? 1) >= 1.3) {
    const branches = usePinData ? lastRun.data.main : mergeRunsPerBranch(getLastExecutedNodeRuns(run));
    return [branches.slice(0, lastNodeMainOutputs).flatMap((branch) => branch ?? [])];
  }
  const runs = getLastExecutedNodeRuns(run);
  if (!triggerReturnsLastRunOnly(trigger) && runs.length > 0 && !usePinData) return mergeRunsPerBranch(runs);
  return lastRun.data.main;
}

// ---------------------------------------------------------------- port of ExecuteWorkflow.execute() wait / mode handling
function executeWorkflowNode({ items, mode = "once", waitForSubWorkflow = true, child }) {
  if (mode === "each") {
    const returnData = [];
    items.forEach((item, i) => {
      if (!waitForSubWorkflow) { (returnData[0] ??= []).push({ ...item, metadata: { subExecution: { executionId: `exec-${i}` } } }); return; }
      const result = child([item]);
      result.forEach((outputData, outputIndex) => { for (const out of outputData) out.pairedItem = { item: i }; (returnData[outputIndex] ??= []).push(...outputData); });
    });
    return returnData;
  }
  if (!waitForSubWorkflow) { child(items); return [items]; }
  const result = child(items);
  for (const output of result) {
    const sameLength = output.length === items.length;
    output.forEach((item, index) => { if (!item.pairedItem) item.pairedItem = sameLength ? { item: index } : items.map((_, i) => ({ item: i })); });
  }
  return result;
}
const items = (count) => Array.from({ length: count }, (_, index) => ({ json: { id: index + 1 } }));
const runWithLastNode = (runs, { mode: runMode = "integrated", pinData, name = "Return" } = {}) => ({
  mode: runMode,
  data: { resultData: { lastNodeExecuted: name, runData: { [name]: runs.map((main, executionIndex) => ({ executionIndex, data: { main } })) }, pinData } },
});

test("the trigger passes everything through in Accept all data mode and trims to the schema otherwise", () => {
  const input = [{ json: { orderId: "ord_1", amount: 5, extra: "dropped" } }, { json: { orderId: "ord_2" } }];
  assert.deepEqual(triggerExecute("passthrough", [], input), [input]);
  const [trimmed] = triggerExecute("workflowInputs", [{ name: "orderId", type: "string" }, { name: "amount", type: "number" }], input);
  assert.deepEqual(trimmed.map((item) => item.json), [{ orderId: "ord_1", amount: 5 }, { orderId: "ord_2", amount: null }]);
  assert(!("extra" in trimmed[0].json), "undeclared fields are dropped by the trigger");
  assert.equal(trimmed[1].json.amount, null, "a declared field the parent did not send is filled with null");
});

test("with a current trigger the parent receives every run of the last node, flattened across If branches", () => {
  const loopRuns = [[items(2)], [items(3)], [items(1)]];
  const current = { typeVersion: 1.3 };
  assert.equal(parentOutput(runWithLastNode(loopRuns), current, 1)[0].length, 6, "three loop runs are concatenated");
  const ifRuns = [[[{ json: { id: 1 } }], [{ json: { id: 2 } }, { json: { id: 3 } }]]];
  const flattened = parentOutput(runWithLastNode(ifRuns), current, 2);
  assert.equal(flattened.length, 1, "a single parent output");
  assert.deepEqual(flattened[0].map((item) => item.json.id), [1, 2, 3], "true and false branch items both return");
  const oldTrigger = parentOutput(runWithLastNode(ifRuns), { typeVersion: 1.2 }, 2);
  assert.equal(oldTrigger.length, 2, "older triggers return branches separately, so only the first reaches the parent's single output");
  assert.deepEqual(oldTrigger[0].map((item) => item.json.id), [1]);
});

test("triggers older than 1.2 return only the last run unless Items to Return is All Items From Every Run", () => {
  const loopRuns = [[items(2)], [items(3)], [items(1)]];
  const lastOnly = parentOutput(runWithLastNode(loopRuns), { typeVersion: 1.1 }, 1);
  assert.equal(lastOnly[0].length, 1, "legacy behaviour reported in n8n-io/n8n#9989");
  const allRuns = parentOutput(runWithLastNode(loopRuns), { typeVersion: 1.1, parameters: { returnOutput: "allRuns" } }, 1);
  assert.equal(allRuns[0].length, 6);
  assert.equal(parentOutput(runWithLastNode(loopRuns), { typeVersion: 1.2 }, 1)[0].length, 6, "1.2 merges runs by default");
});

test("pinned data on the child's last node replaces the real output only in manual runs", () => {
  const real = [[[{ json: { real: true } }]]];
  const pinned = { Return: [{ pinned: true }] };
  const manual = parentOutput(runWithLastNode(real, { mode: "manual", pinData: pinned }), { typeVersion: 1.3 }, 1);
  assert.deepEqual(manual[0].map((item) => item.json), [{ pinned: true }]);
  const production = parentOutput(runWithLastNode(real, { mode: "integrated", pinData: pinned }), { typeVersion: 1.3 }, 1);
  assert.deepEqual(production[0].map((item) => item.json), [{ real: true }]);
});

test("Wait off returns the parent's own input; Run once for each item creates one sub-execution per item with pairedItem", () => {
  const input = items(3);
  let calls = 0;
  const child = (received) => { calls += 1; return [received.map((item) => ({ json: { id: item.json.id, done: true } }))]; };
  const detached = executeWorkflowNode({ items: input, child, waitForSubWorkflow: false });
  assert.deepEqual(detached, [input], "the input items flow on unchanged");
  assert.equal(calls, 1, "the child is still started");
  calls = 0;
  const each = executeWorkflowNode({ items: input, mode: "each", child });
  assert.equal(calls, 3);
  assert.deepEqual(each[0].map((item) => item.pairedItem), [{ item: 0 }, { item: 1 }, { item: 2 }]);
  assert(each[0].every((item) => item.json.done));
  calls = 0;
  const once = executeWorkflowNode({ items: input, child });
  assert.equal(calls, 1);
  assert.deepEqual(once[0].map((item) => item.pairedItem), [{ item: 0 }, { item: 1 }, { item: 2 }], "same item count links by position");
  const filtered = executeWorkflowNode({ items: input, child: (received) => [received.slice(0, 1).map((item) => ({ json: item.json }))] });
  assert.deepEqual(filtered[0][0].pairedItem, [{ item: 0 }, { item: 1 }, { item: 2 }], "a different count links every output to every input");
});

// ---------------------------------------------------------------- article code example
const blocks = [...content.matchAll(/```(mjs|txt|json)\n([\s\S]*?)\n```/g)].map((match) => ({ lang: match[1], code: match[2] }));
test("the child side Return Code node example compiles and summarises a batch", async () => {
  const code = blocks.find((block) => block.lang === "mjs")?.code;
  assert(code);
  const compiled = ts.transpileModule(`async function example() {\n${code}\n}`, { fileName: "example.js", reportDiagnostics: true, compilerOptions: { target: ts.ScriptTarget.ES2022 } });
  assert.equal(compiled.diagnostics?.length ?? 0, 0);
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  const input = [{ json: { id: "a", status: 200 } }, { json: { id: "b", status: 429 } }, { json: { id: "c", status: 500 } }];
  const nodes = { "When Executed by Another Workflow": [{ json: { batchId: "batch-7", rows: 3 } }] };
  const out = await new AsyncFunction("$input", "$", code)({ all: () => input }, (name) => ({ first: () => nodes[name][0], all: () => nodes[name] }));
  assert.deepEqual(out, [{ json: { batchId: "batch-7", processed: 3, failed: 2, failedIds: ["b", "c"] } }]);
  for (const block of blocks.filter((item) => item.lang === "txt")) assert.match(block.code, /^\{\{ .+ \}\}$/m, "expression blocks are n8n expressions");
  const example = JSON.parse(blocks.find((block) => block.lang === "json").code);
  assert.equal(example.customer, null, "null in the JSON example means any type");
  assert(!Array.isArray(example));
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
  assert.equal(ledger.slug, "n8n-sub-workflow-guide");
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
  assert.match(DomUtils.textContent(one(document, (node) => node.name === "figcaption")), /not a screenshot of n8n.*Mikhail Nilov \/ Pexels/);
  for (const path of [ledger.images.coverFile, ledger.images.inlineFile]) {
    const info = await sharp(readFileSync(new URL(`../${path}`, import.meta.url))).metadata();
    assert.equal(info.width, 1200);
    assert.equal(info.height, 675);
    assert.equal(info.format, "jpeg");
  }
  assert(content.includes("not a substitute for running the workflows in your own instance"));
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

console.log(`Runtime: Node ${process.version}; trigger trimming, output merging and wait/mode logic ported from n8n 2.46.6 sources; no n8n instance, network or database.`);
console.log(JSON.stringify(metrics));
