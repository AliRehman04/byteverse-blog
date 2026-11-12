import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { parseDocument, DomUtils } from "htmlparser2";
import sharp from "sharp";
import ts from "typescript";

const require = createRequire(import.meta.url);
const sourceUrl = "https://raw.githubusercontent.com/n8n-io/n8n/n8n%402.47.4/packages/nodes-base/nodes/Transform/SplitOut/SplitOut.node.ts";
const verifySource = process.argv.includes("--verify-source");
const mode = process.argv[2];
assert(process.argv.length <= 3 && (!mode || ["--verify-source", "--metrics", "--preview", "--live"].includes(mode)));
const content = readFileSync(new URL("content/n8n-split-out-node-guide.md", import.meta.url), "utf8").replace(/\r\n?/g, "\n").trim();
const blocks = [...content.matchAll(/^```([^\n]+)\n([\s\S]*?)\n```/gm)].map((match) => ({ language: match[1], code: match[2] }));
const prose = content.split("\n## Sources and Further Reading")[0].replace(/\[([^\]]+)\]\([^\n)]+\)/g, (_, label) => label);
const wordCount = (prose.match(/[\p{L}\p{N}]+(?:['.-][\p{L}\p{N}]+)*/gu) ?? []).length;
const metrics = {
  proseWords: wordCount,
  contentSha256: createHash("sha256").update(content).digest("hex"),
  readingTime: `${Math.ceil(wordCount / 220)} min read`,
  codeBlocks: blocks.length,
  tables: (content.match(/^\|---/gm) ?? []).length,
};
const ledger = JSON.parse(readFileSync(new URL("../docs/n8n-split-out-keywords-2026-11-12.json", import.meta.url), "utf8"));
const jsonExamples = blocks.filter((block) => block.language === "json").map((block) => JSON.parse(block.code));
const codeExamples = blocks.filter((block) => block.language === "mjs");
const executeExample = (index, input) => new Function("$input", codeExamples[index].code)({ all: () => structuredClone(input) });

test("article uses valid JSON, compilable workflow examples and exactly five FAQ questions", () => {
  assert.equal(content.split("\n## Frequently Asked Questions")[1]?.split("\n## ")[0].match(/^### /gm)?.length, 5);
  assert(!/^# /m.test(content));
  assert(content.match(/^## .+$/gm).every((heading) => !heading.endsWith("?")));
  for (const block of blocks) {
    assert(["json", "mjs", "txt"].includes(block.language));
    if (block.language === "json") JSON.parse(block.code);
    if (block.language === "mjs") {
      const compiled = ts.transpileModule(`function example() {\n${block.code}\n}`, { fileName: "example.js", reportDiagnostics: true });
      assert.equal(compiled.diagnostics?.length ?? 0, 0);
    }
  }
});

if (process.argv.includes("--metrics")) console.log(JSON.stringify(metrics, null, 2));

test("the normalization example parses strings, preserves context and rejects wrong types", () => {
  const binary = { attachment: { data: "YQ==", mimeType: "text/plain" } };
  const output = executeExample(0, [
    { json: { orderId: "one", rows: '[{"sku":"A"},{"sku":"B"}]' }, binary },
    { json: { orderId: "two", rows: [{ sku: "C" }] } },
  ]);
  assert.deepEqual(output, [
    { json: { orderId: "one", rows: [{ sku: "A" }, { sku: "B" }] }, binary, pairedItem: { item: 0 } },
    { json: { orderId: "two", rows: [{ sku: "C" }] }, pairedItem: { item: 1 } },
  ]);
  assert.deepEqual(executeExample(0, [{ json: { rows: "[]" } }])[0].json.rows, []);
  assert.throws(() => executeExample(0, [{ json: { rows: "not-json" } }]), /rows is not valid JSON/);
  for (const rows of [null, {}, 5, undefined, "{}", "null"]) {
    assert.throws(() => executeExample(0, [{ json: { rows } }]), /rows must be an array/);
  }
});

test("the object-key example keeps identifiers and pairings for every input", () => {
  assert.deepEqual(executeExample(1, [{ json: jsonExamples[5] }]), [
    { json: { customerId: "C-10", customer: { name: "Amina" } }, pairedItem: { item: 0 } },
    { json: { customerId: "C-11", customer: { name: "Bilal" } }, pairedItem: { item: 0 } },
  ]);
  const output = executeExample(1, [
    { json: jsonExamples[5] },
    { json: { customers: { "C-12": { name: "Chen", customerId: "not-the-key" } } } },
  ]);
  assert.equal(output.length, 3);
  assert.equal(output[2].json.customerId, "C-12");
  assert.deepEqual(output[2].pairedItem, { item: 1 });
  assert.deepEqual(executeExample(1, [{ json: { customers: {} } }]), []);
  assert.throws(() => executeExample(1, [{ json: { customers: [] } }]), /customers must be an object/);
  assert.throws(() => executeExample(1, [{ json: { customers: { invalid: null } } }]), /customer invalid must be an object/);
});

test("the binary field expression returns the retained attachment name", () => {
  const expression = blocks.find((block) => block.language === "txt").code;
  assert.match(expression, /^\{\{ .+ \}\}$/);
  const evaluate = new Function("$binary", `return ${expression.slice(3, -3)};`);
  assert.equal(evaluate({ invoice: { data: "YQ==" } }), "invoice");
  assert.equal(evaluate({ receipt: { data: "Yg==" } }), "receipt");
  assert.equal(evaluate({}), undefined);
});

function loadLocal(path, overrides = {}) {
  const source = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    fileName: path, reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  });
  assert.equal(compiled.diagnostics?.length ?? 0, 0);
  const record = { exports: {} };
  const allowed = new Set(["react", "react/jsx-runtime", "lucide-react", "react-markdown", "remark-gfm", "rehype-raw", "rehype-sanitize", "rehype-slug"]);
  new Function("require", "module", "exports", compiled.outputText)((name) => {
    if (Object.hasOwn(overrides, name)) return overrides[name];
    assert(allowed.has(name), `Unexpected renderer dependency ${name}`);
    return require(name);
  }, record, record.exports);
  return record.exports;
}
const siteConfig = { url: ledger.website, name: "ByteVerse" };
const imageSeo = loadLocal("src/lib/image-seo.ts", { "@/lib/config": { siteConfig } });
const { MarkdownRenderer } = loadLocal("src/components/markdown-renderer.tsx", {
  "@/lib/image-seo": imageSeo,
  "@/lib/config": { siteConfig },
  "@/components/copy-button": loadLocal("src/components/copy-button.tsx"),
  "@/components/code-playground": { CodePlayground() { throw new Error("n8n examples must not show a browser Run button"); } },
});
const rendered = renderToStaticMarkup(createElement(MarkdownRenderer, { content, currentSlug: ledger.slug }));
const document = parseDocument(rendered);
const all = (root, predicate) => DomUtils.findAll(predicate, root.children ?? []);
const one = (root, predicate) => { const matches = all(root, predicate); assert.equal(matches.length, 1); return matches[0]; };

test("metadata, slug and measured figures match the finished article", () => {
  assert.equal(ledger.slug, "n8n-split-out-node-guide");
  assert.match(ledger.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  assert.equal(ledger.targeting.author, "Ali Rehman");
  assert(ledger.targeting.title.length <= 70);
  assert(`${ledger.targeting.metaTitle} | ByteVerse`.length <= 60);
  assert(ledger.targeting.metaDescription.length >= 120 && ledger.targeting.metaDescription.length <= 160);
  assert(ledger.targeting.excerpt.length <= 300);
  assert.equal(ledger.targeting.summary.split("|").length, 3);
  for (const [key, value] of Object.entries(metrics)) assert.equal(ledger.validation[key], value, key);
  assert.equal(ledger.targeting.readingTime, metrics.readingTime);
  assert.equal(ledger.research.observations.length, 12);
  for (const value of Object.values(ledger.metrics)) assert.equal(value, null);
  assert(!/\ufffd|\0|\bTODO\b|\bTBD\b/.test(content));
});

test("the actual MarkdownRenderer preserves the code, tables, links and headings", () => {
  const actual = all(document, (node) => node.name === "pre").map((node) => DomUtils.textContent(one(node, (child) => child.name === "code")).trim());
  assert.deepEqual(actual, blocks.map((block) => block.code.trim()));
  assert.equal(all(document, (node) => node.name === "table").length, metrics.tables);
  assert.equal(all(document, (node) => ["h1", "script", "iframe"].includes(node.name)).length, 0);
  const ids = all(document, (node) => /^h[23]$/.test(node.name)).map((node) => node.attribs.id);
  assert.equal(new Set(ids).size, ids.length);
  const links = all(document, (node) => node.name === "a");
  const internal = [...new Set(links.filter((node) => node.attribs.href?.startsWith("/")).map((node) => node.attribs.href))].sort();
  assert.deepEqual(internal, [...ledger.internalLinks].sort());
  const external = links.filter((node) => node.attribs.href?.startsWith("https://"));
  assert.deepEqual([...new Set(external.map((node) => node.attribs.href))].sort(), [...ledger.sources.map((source) => source.url), ledger.images.coverCredit, ledger.images.inlineCredit].sort());
  assert(external.every((node) => node.attribs.rel.includes("noopener")));
});

test("five visible FAQ answers match the existing schema extractor exactly", () => {
  const source = readFileSync(new URL("../src/app/blog/[slug]/page.tsx", import.meta.url), "utf8");
  const start = source.indexOf("  const faqRegex =");
  const end = source.indexOf("  // Auto-extract HowTo", start);
  assert(start > 0 && end > start);
  const compiled = ts.transpileModule(source.slice(start, end), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const faqs = new Function("post", `${compiled}; return faqs;`)({ content });
  const details = all(document, (node) => node.name === "details");
  const collapse = (text) => text.replace(/\s+/g, " ").trim();
  assert.equal(details.length, 5);
  assert.deepEqual(faqs.map((faq) => faq.question), ledger.faq);
  assert.deepEqual(details.map((node) => DomUtils.textContent(one(node, (child) => child.name === "summary"))), ledger.faq);
  assert.deepEqual(faqs.map((faq) => collapse(faq.answer)), details.map((node) => collapse(DomUtils.textContent(one(node, (child) => child.name === "p")))));
});

test("images are valid licensed photo assets with an honest caption and test scope", async () => {
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

if (verifySource) {
  const response = await fetch(sourceUrl, { signal: AbortSignal.timeout(30000) });
  assert.equal(response.status, 200);
  const source = await response.text();
  assert.equal(createHash("sha256").update(source).digest("hex"), ledger.validation.sourceSha256);
  const compiled = ts.transpileModule(source, {
    fileName: "SplitOut.node.ts",
    reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  });
  assert.equal(compiled.diagnostics?.length ?? 0, 0);
  const record = { exports: {} };
  class NodeOperationError extends Error {
    constructor(node, message) { super(message); this.node = node; }
  }
  const safe = (key) => !["__proto__", "prototype", "constructor"].includes(key);
  const modules = {
    "n8n-workflow": {
      NodeOperationError,
      deepCopy: structuredClone,
      isSafeObjectProperty: safe,
      setSafeObjectProperty(target, key, value) { assert(safe(key)); target[key] = value; },
      NodeConnectionTypes: { Main: "main" },
    },
    "../utils/utils": {
      prepareFieldsArray: (value) => (Array.isArray(value) ? value : value.split(",")).map((field) => field.trim()).filter(Boolean),
    },
    "./utils": { FieldsTracker: class { add() {} update() {} getHints() { return []; } } },
  };
  new Function("require", "module", "exports", compiled.outputText)((name) => {
    if (Object.hasOwn(modules, name)) return modules[name];
    assert(["lodash/get", "lodash/set", "lodash/toPath", "lodash/unset"].includes(name), `Unexpected dependency: ${name}`);
    return require(name);
  }, record, record.exports);
  const node = new record.exports.SplitOut();
  async function split(items, parameters = {}, version = 1.1) {
    const config = { fieldToSplitOut: "rows", include: "noOtherFields", options: {}, ...parameters };
    const context = {
      getInputData: () => structuredClone(items),
      getNode: () => ({ name: "Split Out", typeVersion: version }),
      getNodeParameter: (name, index, fallback) => config[name] ?? fallback,
      addExecutionHints() {},
    };
    const [output] = await node.execute.call(context);
    return output;
  }
  const json = (items) => items.map((item) => item.json);

  test("pinned node reproduces the article's complete order and nested-customer examples", async () => {
    const output = await split([{ json: jsonExamples[0] }], {
      include: "selectedOtherFields", fieldsToInclude: "orderId, customerEmail", options: { destinationFieldName: "line" },
    });
    assert.deepEqual(json(output), jsonExamples[1]);
    const nested = await split([{ json: jsonExamples[2] }], {
      fieldToSplitOut: "body.data.customers", include: "selectedOtherFields", fieldsToInclude: "requestId", options: { destinationFieldName: "customer" },
    });
    assert.deepEqual(json(nested), [
      { requestId: "REQ-17", customer: { id: "C-10", name: "Amina" } },
      { requestId: "REQ-17", customer: { id: "C-11", name: "Bilal" } },
    ]);
    assert.deepEqual(json(await split([{ json: jsonExamples[3] }], { fieldToSplitOut: "names, scores" })), jsonExamples[4]);
  });

  test("pinned node: successive splits expand children, and retained independent lists multiply", async () => {
    const orders = [{ orderId: "one", lines: [1, 2] }, { orderId: "two", lines: [3, 4, 5] }];
    const parents = await split([{ json: { orders } }], { fieldToSplitOut: "orders", options: { destinationFieldName: "order" } });
    assert.equal(parents.length, 2);
    const withId = parents.map((item) => ({ ...item, json: { ...item.json, orderId: item.json.order.orderId } }));
    const children = await split(withId, { fieldToSplitOut: "order.lines", include: "selectedOtherFields", fieldsToInclude: "orderId", options: { destinationFieldName: "line" } });
    assert.deepEqual(json(children), [
      { orderId: "one", line: 1 }, { orderId: "one", line: 2 },
      { orderId: "two", line: 3 }, { orderId: "two", line: 4 }, { orderId: "two", line: 5 },
    ]);
    const first = await split([{ json: jsonExamples[3] }], { fieldToSplitOut: "names", include: "allOtherFields" });
    const second = await split(first, { fieldToSplitOut: "scores", include: "allOtherFields" });
    assert.equal(second.length, 6);
  });

  test("pinned node: selected nested parent keys stay literal and an empty selection fails", async () => {
    const input = [{ json: { account: { id: 7 }, rows: ["red"] } }];
    const output = await split(input, { include: "selectedOtherFields", fieldsToInclude: "account.id", options: { destinationFieldName: "tag" } });
    assert.deepEqual(json(output), [{ "account.id": 7, tag: "red" }]);
    await assert.rejects(split(input, { include: "selectedOtherFields", fieldsToInclude: "" }), /No fields specified/);
  });

  test("pinned node: object arrays expand and keep parent item links", async () => {
    const output = await split([
      { json: { orderId: "ORD-1042", rows: [{ sku: "A", qty: 2 }, { sku: "B", qty: 1 }] } },
      { json: { orderId: "ORD-1043", rows: [{ sku: "C", qty: 3 }] } },
    ]);
    assert.deepEqual(json(output), [{ sku: "A", qty: 2 }, { sku: "B", qty: 1 }, { sku: "C", qty: 3 }]);
    assert.deepEqual(output.map((item) => item.pairedItem), [{ item: 0 }, { item: 0 }, { item: 1 }]);
  });

  test("pinned node: selected parent fields plus a destination keep the output shape explicit", async () => {
    const output = await split([{ json: { orderId: "ORD-1042", secretNote: "omit", rows: [{ sku: "A", qty: 2 }] } }], {
      include: "selectedOtherFields", fieldsToInclude: "orderId", options: { destinationFieldName: "line" },
    });
    assert.deepEqual(json(output), [{ orderId: "ORD-1042", line: { sku: "A", qty: 2 } }]);
    const all = await split([{ json: { orderId: "ORD-1042", rows: [{ sku: "A" }] } }], { include: "allOtherFields" });
    assert.deepEqual(json(all), [{ orderId: "ORD-1042", rows: { sku: "A" } }]);
  });

  test("pinned node: primitive, null, empty, missing, object and JSON string inputs differ", async () => {
    assert.deepEqual(json(await split([{ json: { rows: ["red", "blue"] } }])), [{ rows: "red" }, { rows: "blue" }]);
    assert.deepEqual(json(await split([{ json: { rows: null } }])), [{ rows: null }]);
    assert.deepEqual(await split([{ json: { rows: [] } }, { json: {} }]), []);
    assert.deepEqual(json(await split([{ json: { rows: { first: "red", second: "blue" } } }])), [{ rows: "red" }, { rows: "blue" }]);
    assert.deepEqual(json(await split([{ json: { rows: '["red","blue"]' } }])), [{ rows: '["red","blue"]' }]);
  });

  test("pinned node: simultaneous fields align by position, keeping unmatched tails", async () => {
    const output = await split([{ json: { names: ["Amina", "Bilal"], scores: [91, 82, 70] } }], { fieldToSplitOut: "names, scores" });
    assert.deepEqual(json(output), [{ names: "Amina", scores: 91 }, { names: "Bilal", scores: 82 }, { scores: 70 }]);
    await assert.rejects(split([{ json: { names: ["Amina"], scores: [91] } }], {
      fieldToSplitOut: "names, scores", options: { destinationFieldName: "person" },
    }), /same number of destination fields/);
  });

  test("pinned node: nested source paths and versioned destination paths", async () => {
    const input = [{ json: { data: { rows: ["nested"] }, "data.rows": ["literal"] } }];
    assert.deepEqual(json(await split(input, { fieldToSplitOut: "data.rows" })), [{ "data.rows": "literal" }]);
    const nestedOnly = [{ json: { data: { rows: ["nested"] } } }];
    assert.deepEqual(json(await split(nestedOnly, { fieldToSplitOut: "data.rows", options: { destinationFieldName: "record.value" } })), [{ record: { value: "nested" } }]);
    assert.deepEqual(json(await split(nestedOnly, { fieldToSplitOut: "data.rows", options: { destinationFieldName: "record.value" } }, 1)), [{ "record.value": "nested" }]);
    assert.deepEqual(json(await split(input, { fieldToSplitOut: "data.rows", options: { disableDotNotation: true, destinationFieldName: "record.value" } })), [{ "record.value": "literal" }]);
  });

  test("pinned node: binary splitting keeps one attachment and its original key", async () => {
    const binary = {
      invoice: { data: "YQ==", mimeType: "application/pdf", fileName: "invoice.pdf" },
      receipt: { data: "Yg==", mimeType: "application/pdf", fileName: "receipt.pdf" },
    };
    const output = await split([{ json: { orderId: "ORD-1042" }, binary }], { fieldToSplitOut: "$binary", include: "allOtherFields" });
    assert.deepEqual(output.map((item) => Object.keys(item.binary)), [["invoice"], ["receipt"]]);
    assert.deepEqual(json(output), [{ orderId: "ORD-1042" }, { orderId: "ORD-1042" }]);
    const repeated = await split([{ json: { rows: [1, 2] }, binary }], { options: { includeBinary: true } });
    assert.deepEqual(repeated.map((item) => Object.keys(item.binary)), [["invoice", "receipt"], ["invoice", "receipt"]]);
  });
  console.log(JSON.stringify({ sourceUrl, sourceSha256: createHash("sha256").update(source).digest("hex"), scope: "Actual tagged execute method with mocked node context, field-list parser and hint tracker; real lodash path helpers. No n8n server or external actions." }));
}

if (mode === "--preview") {
  const response = await fetch(`${ledger.website}/blog/n8n-code-node-guide`, { signal: AbortSignal.timeout(30000) });
  assert.equal(response.status, 200);
  const liveDocument = parseDocument(await response.text());
  const styles = all(liveDocument, (node) => node.name === "link" && node.attribs.rel === "stylesheet")
    .map((node) => new URL(node.attribs.href, ledger.website).href);
  assert(styles.length > 0);
  const bodyClass = one(liveDocument, (node) => node.name === "body").attribs.class ?? "";
  const element = createElement;
  const page = element("html", { lang: "en" },
    element("head", null,
      element("meta", { charSet: "utf-8" }),
      element("meta", { name: "viewport", content: "width=device-width, initial-scale=1" }),
      element("meta", { name: "robots", content: "noindex,nofollow" }),
      element("meta", { name: "description", content: ledger.targeting.metaDescription }),
      element("base", { href: `${ledger.website}/` }),
      element("title", null, `${ledger.targeting.metaTitle} | ByteVerse Draft`),
      ...styles.map((href) => element("link", { key: href, rel: "stylesheet", href })),
      element("style", null, "html{scroll-behavior:auto}main{width:100%;min-width:0}h1{overflow-wrap:anywhere;letter-spacing:0}.preview-cover{width:100%;height:auto;aspect-ratio:16/9;object-fit:contain}"),
    ),
    element("body", { className: bodyClass },
      element("header", { className: "border-b border-border" },
        element("nav", { className: "mx-auto max-w-4xl px-4 py-4 flex items-center justify-between gap-4", "aria-label": "Preview navigation" },
          element("a", { href: ledger.website, className: "font-bold text-xl" }, "ByteVerse"),
          element("span", { className: "text-sm text-muted-foreground" }, "Local draft"),
        ),
      ),
      element("main", { className: "mx-auto max-w-3xl px-4 sm:px-6 py-8" },
        element("article", null,
          element("p", { className: "text-sm text-primary mb-4" }, "Tech Guides"),
          element("h1", { className: "text-3xl sm:text-4xl font-extrabold leading-tight mb-6" }, ledger.targeting.title),
          element("p", { className: "text-lg text-muted-foreground leading-relaxed mb-6" }, ledger.targeting.excerpt),
          element("p", { className: "text-sm text-muted-foreground mb-8" }, `${ledger.targeting.author} | November 12, 2026 | ${ledger.targeting.readingTime}`),
          element("figure", { className: "mb-10" },
            element("img", { src: ledger.images.cover, alt: "Two people reviewing data on laptops and taking notes beside a calculator", width: 1200, height: 675, className: "preview-cover rounded-lg" }),
            element("figcaption", { className: "text-sm text-muted-foreground mt-3" }, `Photo: ${ledger.images.coverPhotographer} / Pexels`),
          ),
          element("div", { dangerouslySetInnerHTML: { __html: rendered } }),
        ),
      ),
    ),
  );
  const directory = new URL("../../.byteverse-split-out-preview/", import.meta.url);
  mkdirSync(directory, { recursive: true });
  const output = new URL("index.html", directory);
  writeFileSync(output, `<!DOCTYPE html>${renderToStaticMarkup(page)}`, "utf8");
  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch({ channel: "msedge", headless: true, ignoreDefaultArgs: ["--hide-scrollbars"] });
  const results = [];
  try {
    for (const [width, theme] of [[320, "light"], [375, "light"], [375, "dark"], [768, "light"], [1440, "light"]]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme, reducedMotion: "reduce", serviceWorkers: "block" });
      try {
        await context.route("**/*", (route) => {
          const requestUrl = new URL(route.request().url());
          const local = requestUrl.protocol === "file:";
          const asset = requestUrl.origin === ledger.website && /\.(css|woff2?|jpg|png|webp)$/.test(requestUrl.pathname);
          return local || asset ? route.continue() : route.abort("blockedbyclient");
        });
        const preview = await context.newPage();
        const pageErrors = [];
        preview.on("pageerror", (error) => pageErrors.push(error.message));
        await preview.goto(output.href, { waitUntil: "load" });
        await preview.evaluate((dark) => document.documentElement.classList.toggle("dark", dark), theme === "dark");
        const geometry = await preview.evaluate(async () => {
          await document.fonts.ready;
          const images = [...document.querySelectorAll("img")];
          await Promise.all(images.map((image) => image.decode()));
          const bounds = ["main", "article", "h1", ".blog-content"].map((selector) => {
            const rect = document.querySelector(selector).getBoundingClientRect();
            return { selector, left: rect.left, right: rect.right, width: rect.width, height: rect.height };
          });
          const scrollers = [...document.querySelectorAll("table")].map((table) => {
            const parent = table.parentElement;
            parent.scrollLeft = parent.scrollWidth;
            const result = { width: parent.clientWidth, content: parent.scrollWidth, scroll: parent.scrollLeft };
            parent.scrollLeft = 0;
            return result;
          });
          return { width: innerWidth, overflow: document.documentElement.scrollWidth - innerWidth, bounds, images: images.length, scrollers };
        });
        assert(geometry.overflow <= 1, `${width}: horizontal page overflow`);
        assert.equal(geometry.images, 2);
        for (const bound of geometry.bounds) assert(bound.width > 0 && bound.height > 0 && bound.left >= -1 && bound.right <= width + 1, `${width}: ${bound.selector} is hidden or overflows`);
        assert.equal(geometry.scrollers.length, 4);
        for (const scroll of geometry.scrollers) if (scroll.content > scroll.width + 1) assert(scroll.scroll > 0, "An overflowing table must scroll");
        assert.equal(await preview.locator("pre").count(), metrics.codeBlocks);
        const question = preview.locator("details").first().locator("summary");
        await question.focus();
        await preview.keyboard.press("Enter");
        assert.equal(await preview.locator("details").first().evaluate((node) => node.open), true);
        await preview.evaluate(() => window.scrollTo(0, 0));
        await preview.screenshot({ path: fileURLToPath(new URL(`preview-${width}-${theme}.png`, directory)) });
        assert.deepEqual(pageErrors, []);
        results.push({ width, theme, overflow: geometry.overflow, images: geometry.images, tables: geometry.scrollers.length, faqKeyboard: "pass" });
      } finally { await context.close(); }
    }
  } finally { await browser.close(); }
  console.log(JSON.stringify({ preview: output.href, results, scope: "Static draft rendered with existing site CSS. No production client scripts, analytics, publishing or database writes. Copy buttons are inert in this static preview." }));
}

if (mode === "--live") {
  assert(ledger.publication.publishedAt, "Record an approved publication before live verification");
  const articleUrl = `${ledger.website}/blog/${ledger.slug}`;
  test("live article metadata, schema and body match the approved draft", async () => {
    const response = await fetch(articleUrl, { signal: AbortSignal.timeout(30000) });
    assert.equal(response.status, 200);
    const live = parseDocument(await response.text());
    const meta = (attribute, value) => all(live, (node) => node.name === "meta" && node.attribs[attribute] === value)[0]?.attribs.content;
    assert.equal(DomUtils.textContent(one(live, (node) => node.name === "h1")), ledger.targeting.title);
    assert.equal(DomUtils.textContent(one(live, (node) => node.name === "title")), `${ledger.targeting.metaTitle} | ByteVerse`);
    assert.equal(meta("name", "description"), ledger.targeting.metaDescription);
    assert.equal(all(live, (node) => node.name === "link" && node.attribs.rel === "canonical")[0]?.attribs.href, articleUrl);
    assert.equal(meta("property", "article:published_time"), ledger.publication.publishedAt);
    const schemas = all(live, (node) => node.name === "script" && node.attribs.type === "application/ld+json").flatMap((node) => {
      const schema = JSON.parse(DomUtils.textContent(node));
      return schema["@graph"] ?? [schema];
    });
    assert.deepEqual(schemas.find((schema) => schema["@type"] === "FAQPage")?.mainEntity.map((entity) => entity.name), ledger.faq);
    const article = schemas.find((schema) => schema["@type"] === "BlogPosting");
    assert.equal(article?.author?.name, ledger.targeting.author);
    assert.equal(article?.datePublished, ledger.publication.publishedAt);
    const actualCode = all(live, (node) => node.name === "pre").map((node) => DomUtils.textContent(one(node, (child) => child.name === "code")).trim());
    assert.deepEqual(actualCode, blocks.map((block) => block.code.trim()));
    assert.equal(all(live, (node) => node.name === "table").length, metrics.tables);
    assert.equal(all(live, (node) => node.name === "details").length, 5);
    for (const href of ledger.internalLinks) assert(all(live, (node) => node.name === "a" && node.attribs.href === href).length > 0);
  });
}