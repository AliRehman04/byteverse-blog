/**
 * Offline tests for the n8n Code node guide. No network, database or n8n instance.
 * Code examples run in Node with an emulation of the Code node globals; the return
 * value and error tables are checked against a port of n8n's published validation
 * functions (packages/nodes-base/nodes/Code/result-validation.ts). Python examples
 * run with the local CPython against the same sample items.
 *   node --test scripts/test-n8n-code-node-post.mjs
 *   node scripts/test-n8n-code-node-post.mjs --metrics
 *   node scripts/test-n8n-code-node-post.mjs --live   (after publication)
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { parseDocument, DomUtils } from "htmlparser2";
import sharp from "sharp";
import ts from "typescript";

const content = readFileSync(new URL("content/n8n-code-node-guide.md", import.meta.url), "utf8").replace(/\r\n?/g, "\n").trim();
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
const ledger = JSON.parse(readFileSync(new URL("../docs/n8n-code-node-keywords-2026-11-06.json", import.meta.url), "utf8"));

// ---------------------------------------------------------------- n8n validation port
// Port of validateItem / validateTopLevelKeys / validateRunCodeAllItems / validateRunCodeEachItem
// plus n8n-core's normalizeItems behaviour for the Code node (json wrapping).
const REQUIRED_N8N_ITEM_KEYS = new Set(["json", "binary", "pairedItem", "error", "index"]);
const isObject = (maybe) => typeof maybe === "object" && maybe !== null && !Array.isArray(maybe) && !(maybe instanceof Date);
class ValidationError extends Error { constructor({ message, description, itemIndex }) { super(message); this.description = description; this.itemIndex = itemIndex; } }
function normalizeItems(executionData) {
  if (typeof executionData === "object" && !Array.isArray(executionData)) {
    executionData = executionData.json !== undefined ? [executionData] : [{ json: executionData }];
  }
  if (executionData.every((item) => typeof item === "object" && item !== null && "json" in item)) return executionData;
  if (executionData.some((item) => typeof item === "object" && item !== null && "json" in item)) throw new ValidationError({ message: "Inconsistent item format" });
  if (executionData.every((item) => typeof item === "object" && item !== null && "binary" in item)) return executionData.map((item) => ({ json: {}, binary: item.binary }));
  return executionData.map((item) => ({ json: item }));
}
function validateItem({ json, binary }, itemIndex) {
  if (json === undefined || !isObject(json)) throw new ValidationError({ message: "A 'json' property isn't an object", itemIndex });
  if (binary !== undefined && !isObject(binary)) throw new ValidationError({ message: "A 'binary' property isn't an object", itemIndex });
}
function validateTopLevelKeys(item, itemIndex) {
  let reserved = null; const unknown = [];
  for (const key of Object.keys(item)) { if (REQUIRED_N8N_ITEM_KEYS.has(key)) reserved ??= key; else unknown.push(key); }
  if (unknown.length > 0) {
    if (reserved) throw new ValidationError({ message: `Unknown top-level item key: ${unknown[0]}`, itemIndex });
    throw new ValidationError({ message: `Unknown top-level item key: ${unknown[0]}`, itemIndex });
  }
}
function validateRunCodeEachItem(result, itemIndex = 0) {
  if (typeof result !== "object") throw new ValidationError({ message: "Code doesn't return an object", description: `('${result}' was returned instead.)`, itemIndex });
  if (Array.isArray(result)) throw new ValidationError({ message: "Code doesn't return a single object", itemIndex });
  const [item] = normalizeItems([result]);
  validateItem(item, itemIndex);
  validateTopLevelKeys(item, itemIndex);
  return item;
}
function validateRunCodeAllItems(result) {
  if (typeof result !== "object") throw new ValidationError({ message: "Code doesn't return items properly" });
  if (Array.isArray(result)) {
    for (const item of result) if (!isObject(item)) throw new ValidationError({ message: "Code doesn't return items properly" });
    if (result.some((item) => Object.keys(item).some((key) => REQUIRED_N8N_ITEM_KEYS.has(key)))) result.forEach((item, index) => validateTopLevelKeys(item, index));
  }
  const items = normalizeItems(result);
  items.forEach((item, index) => validateItem(item, index));
  return items;
}
// Code.node.ts: `null` means no output in all-items mode and a dropped item in each-item mode.
const runAll = (result) => (result === null ? [] : validateRunCodeAllItems(result));
const runEach = (result, index = 0) => (result === null ? undefined : validateRunCodeEachItem(result, index));
const outcome = (fn) => { try { const value = fn(); return Array.isArray(value) ? `${value.length} item(s)` : value === undefined ? "dropped" : "1 item"; } catch (error) { return `Error: ${error.message}`; } };

test("the return value table matches n8n's validation rules for all items mode", () => {
  assert.equal(outcome(() => runAll([{ json: { a: 1 } }])), "1 item(s)");
  assert.deepEqual(runAll([{ a: 1 }, { a: 2 }]), [{ json: { a: 1 } }, { json: { a: 2 } }]);
  assert.deepEqual(runAll({ json: { a: 1 } }), [{ json: { a: 1 } }]);
  assert.equal(outcome(() => runAll(null)), "0 item(s)");
  assert.equal(outcome(() => runAll(undefined)), "Error: Code doesn't return items properly");
  assert.equal(outcome(() => runAll("done")), "Error: Code doesn't return items properly");
  assert.equal(outcome(() => runAll(42)), "Error: Code doesn't return items properly");
  assert.equal(outcome(() => runAll([1, 2, 3])), "Error: Code doesn't return items properly");
  assert.equal(outcome(() => runAll(["a", "b"])), "Error: Code doesn't return items properly");
  assert.equal(outcome(() => runAll([{ json: [1, 2] }])), "Error: A 'json' property isn't an object");
  assert.equal(outcome(() => runAll([{ json: { a: 1 }, name: "x" }])), "Error: Unknown top-level item key: name");
  assert.equal(outcome(() => runAll([{ json: { a: 1 }, binary: "file" }])), "Error: A 'binary' property isn't an object");
  assert.equal(outcome(() => runAll([{ json: { when: new Date("2026-11-06T00:00:00Z") } }])), "1 item(s)");
  assert.equal(outcome(() => runAll([{ json: null }])), "Error: A 'json' property isn't an object");
  for (const row of ledger.validation.returnValueTable) assert.equal(outcome(() => runAll(new Function(`return (${row.value});`)())), row.result, row.value);
});

test("the return value table matches n8n's validation rules for each item mode", () => {
  assert.equal(outcome(() => runEach({ json: { a: 1 } })), "1 item");
  assert.deepEqual(runEach({ a: 1 }), { json: { a: 1 } });
  assert.equal(outcome(() => runEach(null)), "dropped");
  assert.equal(outcome(() => runEach(undefined)), "Error: Code doesn't return an object");
  assert.equal(outcome(() => runEach([{ json: { a: 1 } }])), "Error: Code doesn't return a single object");
  assert.equal(outcome(() => runEach([])), "Error: Code doesn't return a single object");
  assert.equal(outcome(() => runEach({ json: { a: 1 }, extra: 1 })), "Error: Unknown top-level item key: extra");
});

// ---------------------------------------------------------------- article examples
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const blocks = [...content.matchAll(/```(mjs|json|python|bash)\n([\s\S]*?)\n```/g)].map((match) => ({ lang: match[1], code: match[2] }));
const js = blocks.filter((block) => block.lang === "mjs").map((block) => block.code);
const sample = () => [
  { json: { id: "A-1001", email: "Ava@Example.com", status: "active", amount: 120.5 } },
  { json: { id: "A-1002", email: "Liam@Example.com", status: "inactive", amount: 80 } },
  { json: { id: "A-1003", email: "Mia@Example.com", status: "active", amount: 42.25 } },
];
const luxonPath = new URL("../../.byteverse-n8n-item-linking-check/node_modules/luxon/package.json", import.meta.url);
const appRequire = createRequire(import.meta.url);
const luxon = existsSync(luxonPath) ? createRequire(luxonPath)("luxon") : null;

function codeNode(code, { mode = "all", items = sample(), nodes = {}, helpers = {}, now } = {}) {
  const input = { all: () => items, first: () => items[0], last: () => items[items.length - 1], item: null };
  const refs = (name) => {
    const data = nodes[name];
    assert(data, `Unknown node reference ${name}`);
    return { all: () => data, first: () => data[0], last: () => data[data.length - 1], itemMatching: (index) => data[index], get item() { return data[input.index]; } };
  };
  const globals = { $input: input, $: refs, DateTime: luxon?.DateTime, $now: now ?? luxon?.DateTime.now(), Buffer, console };
  const context = { helpers: { getBinaryDataBuffer: async (index, property = "data") => Buffer.from(items[index].binary[property].data, "base64"), prepareBinaryData: async (buffer, fileName, mimeType) => ({ data: buffer.toString("base64"), fileName, mimeType, fileSize: `${buffer.length} B` }), ...helpers } };
  const fn = new AsyncFunction(...Object.keys(globals), "$json", code);
  const call = async (item) => fn.call(context, ...Object.values(globals), item?.json);
  if (mode === "all") return call().then(runAll);
  return Promise.all(items.map(async (item, index) => { input.item = item; input.index = index; return runEach(await call(item), index); })).then((out) => out.filter((item) => item !== undefined));
}
const example = (needle) => { const code = js.find((block) => block.includes(needle)); assert(code, `Missing example containing ${needle}`); return code; };

test("every JavaScript example compiles as ES2022 inside an async function", () => {
  assert.equal(js.length, 12);
  for (const code of js) {
    const compiled = ts.transpileModule(`async function example() {\n${code}\n}`, { fileName: "example.js", reportDiagnostics: true, compilerOptions: { target: ts.ScriptTarget.ES2022 } });
    assert.equal(compiled.diagnostics?.length ?? 0, 0, code.slice(0, 60));
  }
  for (const block of blocks.filter((item) => item.lang === "json")) JSON.parse(block.code);
});

test("filter and reshape keeps only active customers with pairedItem indexes", async () => {
  const out = await codeNode(example("item.json.status !== 'active'"));
  assert.deepEqual(out, [{ json: { id: "A-1001", email: "ava@example.com" }, pairedItem: 0 }, { json: { id: "A-1003", email: "mia@example.com" }, pairedItem: 2 }]);
});

test("each item transform returns one object per input with a rounded total", async () => {
  const out = await codeNode(example("totalWithTax"), { mode: "each" });
  assert.deepEqual(out.map((item) => item.json.totalWithTax), [140.98, 93.6, 49.43]);
  assert.equal(out[0].json.id, "A-1001");
});

test("split and aggregate examples produce the documented item counts", async () => {
  const split = await codeNode(example("json.rows ?? []"), { items: [{ json: { rows: [{ n: 1 }, { n: 2 }, { n: 3 }] } }] });
  assert.deepEqual(split, [{ json: { n: 1 }, pairedItem: 0 }, { json: { n: 2 }, pairedItem: 0 }, { json: { n: 3 }, pairedItem: 0 }]);
  await assert.rejects(codeNode(example("json.rows ?? []"), { mode: "each", items: [{ json: { rows: [{ n: 1 }, { n: 2 }] } }] }), /Code doesn't return a single object/);
  const aggregate = await codeNode(example("totalAmount"));
  assert.deepEqual(aggregate, [{ json: { count: 3, totalAmount: 242.75 } }]);
});

test("array of values example yields one item per email and the JSON parsing example handles both shapes", async () => {
  const emails = await codeNode(example("const emails = $input.all()"));
  assert.deepEqual(emails.map((item) => item.json.email), ["Ava@Example.com", "Liam@Example.com", "Mia@Example.com"]);
  assert.deepEqual(emails.map((item) => item.pairedItem), [0, 1, 2]);
  const parse = example("Body is not valid JSON");
  assert.deepEqual(await codeNode(parse, { items: [{ json: { body: '[{"a":1},{"a":2}]' } }] }), [{ json: { a: 1 } }, { json: { a: 2 } }]);
  assert.deepEqual(await codeNode(parse, { items: [{ json: { body: { a: 1 } } }] }), [{ json: { a: 1 } }]);
  await assert.rejects(codeNode(parse, { items: [{ json: { body: "<!DOCTYPE html>" } }] }), /Body is not valid JSON/);
});

test("itemMatching, two source join and routing examples keep item links", async () => {
  const customers = [{ json: { id: "A-1001", email: "ava@example.com" } }, { json: { id: "A-1002", email: "liam@example.com" } }, { json: { id: "A-1003", email: "mia@example.com" } }];
  const enriched = await codeNode(example("itemMatching(i)"), { items: sample().map((item) => ({ json: { id: item.json.id } })), nodes: { "Get customers": customers } });
  assert.deepEqual(enriched.map((item) => item.json.customerEmail), ["ava@example.com", "liam@example.com", "mia@example.com"]);
  const orders = [{ json: { orderId: 1, customerId: "A-1001" } }, { json: { orderId: 2, customerId: "A-9999" } }];
  const joined = await codeNode(example("customersById"), { items: orders, nodes: { "Get orders": orders, "Get customers": customers } });
  assert.equal(joined[0].json.customer.email, "ava@example.com");
  assert.equal(joined[1].json.customer, null);
  assert.deepEqual(joined.map((item) => item.pairedItem), [0, 1]);
  const routed = await codeNode(example("'review' : 'auto'"));
  assert.deepEqual(routed.map((item) => item.json.route), ["review", "auto", "auto"]);
});

test("the Luxon example uses native methods and returns strings and numbers only", async (t) => {
  if (!luxon) { t.skip("luxon not available in the sibling n8n check folder"); return; }
  const now = luxon.DateTime.fromISO("2026-11-06T12:00:00Z", { zone: "utc" });
  const out = await codeNode(example("DateTime.fromISO"), { mode: "each", items: [{ json: { createdAt: "2026-11-01T09:30:00Z" } }], now });
  assert.deepEqual(out[0].json, { createdAt: "2026-11-01T09:30:00Z", createdLocal: "2026-11-01 14:30", dueDate: "2026-11-08", ageDays: 5 });
  await assert.rejects(codeNode(example("DateTime.fromISO"), { mode: "each", items: [{ json: { createdAt: "yesterday" } }], now }), /not an ISO date/);
  assert.equal(typeof luxon.DateTime.now().format, "undefined", "native Luxon has no format() method, as the article states");
});

test("binary examples read a buffer and create a CSV file item", async () => {
  const csv = Buffer.from("id,email\nA-1,a@example.com\nA-2,b@example.com\n", "utf8").toString("base64");
  const read = await codeNode(example("getBinaryDataBuffer(0, 'data')"), { items: [{ json: {}, binary: { data: { data: csv, mimeType: "text/csv" } } }] });
  assert.deepEqual(read[0].json.lines, 3);
  const created = await codeNode(example("prepareBinaryData"));
  assert.equal(created[0].json.rows, 3);
  assert.equal(created[0].binary.data.fileName, "contacts.csv");
  assert.equal(Buffer.from(created[0].binary.data.data, "base64").toString("utf8").split("\n")[1], "A-1001,Ava@Example.com");
});

test("the Python examples run with CPython against the same sample", async () => {
  const python = blocks.filter((block) => block.lang === "python").map((block) => block.code);
  assert.equal(python.length, 2);
  const items = JSON.stringify(sample());
  const script = [
    "import json, sys",
    `_items = json.loads(${JSON.stringify(items)})`,
    "def per_item(_item):",
    ...python[0].split("\n").map((line) => `    ${line}`),
    "def all_items(_items):",
    ...python[1].split("\n").map((line) => `    ${line}`),
    "print(json.dumps({'each': [per_item(i) for i in _items], 'all': all_items(_items)}))",
  ].join("\n");
  const { stdout } = await promisify(execFile)("python", ["-c", script], { windowsHide: true });
  const result = JSON.parse(stdout);
  assert.deepEqual(result.each.map((item) => item.json.totalWithTax), [140.98, 93.6, 49.43]);
  assert.deepEqual(result.all, [{ json: { id: "A-1001", email: "ava@example.com" } }, { json: { id: "A-1003", email: "mia@example.com" } }]);
});

// ---------------------------------------------------------------- renderer parity
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
  "@/components/code-playground": { CodePlayground() { throw new Error("Code node examples must not show a browser Run button"); } },
});
const rendered = renderToStaticMarkup(createElement(MarkdownRenderer, { content, currentSlug: ledger.slug }));
const document = parseDocument(rendered);
const all = (root, predicate) => DomUtils.findAll(predicate, root.children ?? []);
const one = (root, predicate) => { const matches = all(root, predicate); assert.equal(matches.length, 1); return matches[0]; };

test("metadata, slug and ledger figures match the article without invented SEO metrics", () => {
  assert.equal(ledger.slug, "n8n-code-node-guide");
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
  const headings = content.match(/^#{2,3} .+$/gm);
  assert(headings.filter((heading) => heading.startsWith("## ")).every((heading) => !heading.endsWith("?")));
});

test("real MarkdownRenderer preserves all code examples, tables and links", () => {
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
  assert.match(DomUtils.textContent(one(document, (node) => node.name === "figcaption")), /not a screenshot of n8n.*cottonbro studio \/ Pexels/);
  for (const path of [ledger.images.coverFile, ledger.images.inlineFile]) {
    const info = await sharp(readFileSync(new URL(`../${path}`, import.meta.url))).metadata();
    assert.equal(info.width, 1200);
    assert.equal(info.height, 675);
    assert.equal(info.format, "jpeg");
  }
  assert(content.includes("not a substitute for running the nodes in your own n8n instance"));
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
    const faqSchema = schemas.find((schema) => schema["@type"] === "FAQPage");
    assert.deepEqual(faqSchema?.mainEntity.map((entity) => entity.name), ledger.faq);
    const article = schemas.find((schema) => schema["@type"] === "BlogPosting");
    assert.equal(article?.datePublished, ledger.publication.publishedAt);
    assert.equal(article?.author?.name, ledger.targeting.author);
    assert.equal(all(live, (node) => node.name === "details").length, 5);
    assert.equal(all(live, (node) => node.name === "pre").length, metrics.codeBlocks);
    assert.equal(all(live, (node) => node.name === "table").length, metrics.tables);
  });
}

console.log(`Runtime: Node ${process.version}; Code node globals emulated; validation ported from n8n source; no n8n instance, network or database.`);
console.log(JSON.stringify(metrics));
