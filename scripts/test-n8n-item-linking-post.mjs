import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { Socket } from "node:net";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { after, test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { parseDocument, DomUtils } from "htmlparser2";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));
const runtime = resolve(root, "../.byteverse-n8n-item-linking-check");
const runtimeRequire = createRequire(resolve(runtime, "package.json"));
const { Workflow, WorkflowDataProxy } = runtimeRequire("n8n-workflow");
const { version } = runtimeRequire("n8n-workflow/package.json");
assert.equal(version, "2.16.0");

const content = readFileSync(resolve(root, "scripts/content/n8n-cant-determine-which-item-to-use.md"), "utf8").replace(/\r\n?/g, "\n").trim();
const read = path => readFileSync(resolve(root, path), "utf8").replace(/\r\n?/g, "\n").trim();
const ledger = JSON.parse(read("docs/n8n-item-linking-keywords-2026-10-30.json"));
const hash = value => createHash("sha256").update(value).digest("hex");
const prose = content.split("\n## Sources and Further Reading")[0].replace(/\[([^\]]+)\]\([^\n)]+\)/g, (_, label) => label);
const words = (prose.match(/[\p{L}\p{N}]+(?:['.-][\p{L}\p{N}]+)*/gu) ?? []).length;
const metrics = { proseWords: words, contentSha256: hash(content), readingTime: `${Math.ceil(words / 220)} min read`, titleChars: ledger.targeting.title.length, metaDescriptionChars: ledger.targeting.metaDescription.length };
assert(process.argv.length <= 3 && (!process.argv[2] || process.argv[2] === "--metrics"));
if (process.argv[2] === "--metrics") { console.log(JSON.stringify(metrics, null, 2)); process.exit(0); }
const fetchOriginal = globalThis.fetch;
const connectOriginal = Socket.prototype.connect;
const deny = () => { throw new Error("Network disabled during article validation"); };
globalThis.fetch = deny;
Socket.prototype.connect = deny;
after(() => { globalThis.fetch = fetchOriginal; Socket.prototype.connect = connectOriginal; });

function snippet(heading) {
  const section = content.split(`### ${heading}\n`)[1]?.split(/\n#{2,3} /)[0];
  const code = /```n8n\n([\s\S]*?)\n```/.exec(section ?? "")?.[1];
  assert(code, `Missing article code: ${heading}`);
  return code;
}
function runSnippet(heading, inputs = [], selector) {
  return new Function("$input", "$", snippet(heading))({ all: () => structuredClone(inputs) }, selector);
}
const customers = runSnippet("Create three fictional customers");
const project = (input, inputIndex) => ({ json: { customerId: input.json.customerId }, pairedItem: { item: inputIndex } });
const filtered = runSnippet("Filter without losing the input positions", customers);

function expressionData(outputs, itemIndex = 0, sourceItems = customers) {
  const nodes = ["Customers", "Transform", "Inspect"].map((name, index) => ({
    id: name, name, type: "n8n-nodes-base.code", typeVersion: 2, position: [index * 240, 0], parameters: {},
  }));
  const workflow = new Workflow({
    id: "byteverse-item-linking-fixture", name: "Synthetic item linking test", active: false, nodes,
    nodeTypes: { getByNameAndVersion: () => ({ description: { properties: [], inputs: ["main"], outputs: ["main"] } }) },
    connections: {
      Customers: { main: [[{ node: "Transform", type: "main", index: 0 }]] },
      Transform: { main: [[{ node: "Inspect", type: "main", index: 0 }]] },
    },
  });
  const source = previousNode => ({ previousNode, previousNodeOutput: 0, previousNodeRun: 0 });
  const task = (items, previousNode, executionIndex) => ({
    source: previousNode ? [source(previousNode)] : [], executionIndex, startTime: 0, executionTime: 1,
    executionStatus: "success", data: { main: [items] },
  });
  const runData = { Customers: [task(sourceItems, null, 0)], Transform: [task(outputs, "Customers", 1)] };
  const incoming = outputs.map((output, outputIndex) => ({ ...output, pairedItem: { item: outputIndex } }));
  return new WorkflowDataProxy(workflow, { resultData: { runData } }, 0, itemIndex, "Inspect", incoming, {}, "manual", {},
    { source: { main: [source("Transform")] } }).getDataProxy();
}

test("real n8n linking follows original input indexes after filtering", () => {
  assert.deepEqual(filtered.map(item => item.pairedItem.item), [1, 2]);
  assert.equal(expressionData(filtered, 0).$("Customers").item.json.email, "bina@example.com");
  assert.equal(expressionData(filtered, 1).$("Customers").item.json.email, "cora@example.com");
});

test("first and numeric position can succeed while selecting the wrong customer", () => {
  const data = expressionData(filtered);
  assert.equal(data.$json.customerId, "C002");
  assert.equal(data.$("Customers").first().json.customerId, "C001");
  assert.equal(data.$("Customers").all()[0].json.customerId, "C001");
  assert.equal(expressionData(filtered, 1).$("Customers").all()[1].json.customerId, "C002");
});

test("missing pairedItem produces n8n's real missing-information error", () => {
  const broken = filtered.map(item => ({ json: { ...item.json } }));
  assert.throws(() => expressionData(broken).$("Customers").item, error => error.context.type === "paired_item_no_info");
  assert.equal(expressionData(broken).$("Customers").first().json.customerId, "C001");
});

test("assigning new indexes after filtering produces a silent wrong match", () => {
  const broken = runSnippet("The indexing mistake to avoid", customers);
  assert.equal(broken[0].json.customerId, "C002");
  assert.equal(expressionData(broken).$("Customers").item.json.customerId, "C001");
});

test("explicit pairing survives sorting even when the item counts match", () => {
  const reordered = customers.map(project).reverse();
  assert.equal(expressionData(reordered).$("Customers").item.json.customerId, "C003");
  assert.equal(expressionData(reordered).$("Customers").all()[0].json.customerId, "C001");
});

test("itemMatching takes the current node input position, not a source index", () => {
  const data = expressionData(filtered);
  assert.equal(data.$("Customers").itemMatching(0).json.customerId, "C002");
  assert.equal(data.$("Customers").itemMatching(1).json.customerId, "C003");
  assert.throws(() => data.$("Customers").itemMatching(2));
});

test("multiple real ancestors cannot be repaired by itemMatching", () => {
  const aggregate = [{ json: { count: 2 }, pairedItem: [{ item: 1 }, { item: 2 }] }];
  const data = expressionData(aggregate);
  assert.throws(() => data.$("Customers").item, error => error.context.type === "paired_item_multiple_matches");
  assert.throws(() => data.$("Customers").itemMatching(0), error => error.context.type === "paired_item_multiple_matches");
});

test("one-to-many outputs keep the correct source customer for each ticket", () => {
  const tickets = runSnippet("Split a customer's tickets into separate items", customers);
  assert.deepEqual(tickets.map((_, itemIndex) => expressionData(tickets, itemIndex).$("Customers").item.json.email),
    ["ada@example.com", "bina@example.com", "bina@example.com", "cora@example.com"]);
});

test("the article's exact inspection code produces its two-row comparison table", () => {
  const data = expressionData(filtered);
  const output = runSnippet("Compare linked and positional results", filtered, data.$);
  assert.deepEqual(output.map(item => item.json), [
    { currentCustomer: "C002", linkedCustomer: "C002", firstCustomer: "C001", positionalCustomer: "C001" },
    { currentCustomer: "C003", linkedCustomer: "C003", firstCustomer: "C001", positionalCustomer: "C002" },
  ]);
});

test("the exact restoration snippet restores two emails and rejects incorrect identities", () => {
  const restored = runSnippet("Retrieve upstream fields inside a Code node", filtered, expressionData(filtered).$);
  assert.deepEqual(restored.map(item => item.json), [
    { customerId: "C002", email: "bina@example.com" }, { customerId: "C003", email: "cora@example.com" },
  ]);
  const wrong = runSnippet("The indexing mistake to avoid", customers);
  assert.throws(() => runSnippet("Retrieve upstream fields inside a Code node", wrong, expressionData(wrong).$), /identity mismatch/);
});

test("the one-to-one snippet retains binary metadata and handles empty input", () => {
  const inputs = [{ ...customers[0], binary: { data: { fileName: "synthetic.txt", mimeType: "text/plain", data: "" } } }];
  const result = runSnippet("Preserve pairing in a one-to-one transformation", inputs);
  assert.deepEqual(result[0].binary, inputs[0].binary);
  assert.equal(result[0].pairedItem.item, 0);
  assert.deepEqual(runSnippet("Preserve pairing in a one-to-one transformation", []), []);
  assert.deepEqual(runSnippet("Filter without losing the input positions", []), []);
});

test("the exact aggregate snippet represents three ancestors without claiming a single customer", () => {
  const output = runSnippet("Represent a genuinely combined result", customers);
  assert.deepEqual(output[0].json, { customerIds: ["C001", "C002", "C003"], customerCount: 3 });
  assert.deepEqual(output[0].pairedItem, [{ item: 0 }, { item: 1 }, { item: 2 }]);
  assert.throws(() => expressionData(output).$("Customers").item, error => error.context.type === "paired_item_multiple_matches");
});

test("metadata, research evidence and article fingerprint agree without invented ranking metrics", () => {
  assert.equal(ledger.validation.contentSha256, metrics.contentSha256);
  assert.equal(ledger.validation.proseWords, metrics.proseWords);
  assert.equal(ledger.targeting.readingTime, metrics.readingTime);
  assert(ledger.targeting.title.length <= 70 && ledger.targeting.metaTitle.length <= 70);
  assert(ledger.targeting.metaDescription.length >= 120 && ledger.targeting.metaDescription.length <= 160);
  assert(ledger.targeting.excerpt.length >= 120 && ledger.targeting.excerpt.length <= 300);
  assert.equal(ledger.targeting.summary.split("|").length, 3);
  assert(!/^# |\ufffd|\0|<!--|\bTODO\b|\bTBD\b/m.test(content));
  assert(content.includes("not a live n8n Cloud, task-runner or connector test"));
  for (const metric of Object.values(ledger.metrics)) assert.equal(metric, null);
  const research = JSON.parse(read(ledger.research.file));
  assert.equal(research.keywordResearch.observations.length, ledger.research.seedsAttempted);
  assert.equal(research.keywordResearch.observations.filter(item => item.suggestions?.length).length, ledger.research.autocompleteSeedsWithSuggestions);
  assert.equal(research.keywordResearch.observations.filter(item => item.error).length, ledger.research.autocompleteErrors);
  assert(!research.coverage.some(item => /item linking|paireditem|itemmatching/i.test(item.title)));
  for (const draft of ledger.inventory.previousLocalDrafts) assert.equal(hash(read(`scripts/content/${draft.slug}.md`)), draft.contentSha256);
});

function transpile(source, fileName) {
  const compiled = ts.transpileModule(source, { fileName, reportDiagnostics: true, compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } });
  assert.equal(compiled.diagnostics?.length ?? 0, 0);
  return compiled.outputText;
}
const appRequire = createRequire(import.meta.url);
function load(path, overrides = {}) {
  const record = { exports: {} };
  const allowed = new Set(["react", "react/jsx-runtime", "lucide-react", "react-markdown", "remark-gfm", "rehype-raw", "rehype-sanitize", "rehype-slug"]);
  new Function("require", "module", "exports", transpile(read(path), path))(name => {
    if (Object.hasOwn(overrides, name)) return overrides[name];
    assert(allowed.has(name), `Unexpected renderer import: ${name}`);
    return appRequire(name);
  }, record, record.exports);
  return record.exports;
}
const all = (node, predicate) => DomUtils.findAll(predicate, node.children ?? []);
const one = (node, predicate) => { const matches = all(node, predicate); assert.equal(matches.length, 1); return matches[0]; };
const siteConfig = { url: ledger.website, name: "ByteVerse" };
const imageSeo = load("src/lib/image-seo.ts", { "@/lib/config": { siteConfig } });
const copy = load("src/components/copy-button.tsx");
const { MarkdownRenderer } = load("src/components/markdown-renderer.tsx", {
  "@/lib/image-seo": imageSeo, "@/lib/config": { siteConfig }, "@/components/copy-button": copy,
  "@/components/code-playground": { CodePlayground() { throw new Error("n8n code must not run in the browser playground"); } },
});
const html = renderToStaticMarkup(createElement(MarkdownRenderer, { content, currentSlug: ledger.slug }));
const document = parseDocument(html);

test("actual MarkdownRenderer renders complete tables and n8n blocks without a misleading Run button", () => {
  assert.equal(all(document, node => node.name === "table").length, 4);
  assert.equal(all(document, node => node.name === "code" && node.attribs.class === "language-n8n").length, 8);
  assert.equal(all(document, node => ["h1", "iframe", "script"].includes(node.name)).length, 0);
  assert.equal(all(document, node => node.name === "pre").length, 10);
  const ids = all(document, node => /^h[23]$/.test(node.name)).map(node => node.attribs.id);
  assert.equal(new Set(ids).size, ids.length);
  const internal = [...new Set(all(document, node => node.name === "a" && node.attribs.href?.startsWith("/")).map(node => node.attribs.href))].sort();
  assert.deepEqual(internal, [...ledger.internalLinks].sort());
  for (const link of all(document, node => node.name === "a" && node.attribs.href?.startsWith("https://"))) assert(link.attribs.rel.includes("noopener"));
  assert(!html.includes("/tools/csv-repair"), "No link to the unpublished tool");
});

test("all five visible FAQs exactly match the existing blog route's schema extraction", () => {
  const route = read("src/app/blog/[slug]/page.tsx");
  const start = route.indexOf("  const faqRegex =");
  const end = route.indexOf("  // Auto-extract HowTo", start);
  assert(start > 0 && end > start);
  const faqs = new Function("post", `${transpile(route.slice(start, end), "faq.ts")}; return faqs;`)({ content });
  const details = all(document, node => node.name === "details");
  const collapse = value => value.replace(/\s+/g, " ").trim();
  assert.equal(details.length, 5);
  assert.deepEqual(faqs.map(item => item.question), ledger.faq);
  assert.deepEqual(faqs.map(item => item.question), details.map(node => DomUtils.textContent(one(node, child => child.name === "summary"))));
  assert.deepEqual(faqs.map(item => collapse(item.answer)), details.map(node => collapse(DomUtils.textContent(one(node, child => child.name === "p")))));
});

console.log(`Verified runtime: n8n-workflow ${version}; Node ${process.version}. Synthetic execution data; no n8n server or connectors.`);
console.log(JSON.stringify(metrics));