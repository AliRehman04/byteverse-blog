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
const { Expression } = runtimeRequire("n8n-workflow");
const { version } = runtimeRequire("n8n-workflow/package.json");
assert.equal(version, "2.16.0");
const expression = new Expression("UTC");
const content = readFileSync(resolve(root, "scripts/content/n8n-json-parameter-needs-to-be-valid-json.md"), "utf8").replace(/\r\n?/g, "\n").trim();
const prose = content.split("\n## Sources and Further Reading")[0].replace(/\[([^\]]+)\]\([^\n)]+\)/g, (_, label) => label);
const words = (prose.match(/[\p{L}\p{N}]+(?:['.-][\p{L}\p{N}]+)*/gu) ?? []).length;
const metrics = {
  proseWords: words,
  contentSha256: createHash("sha256").update(content).digest("hex"),
  readingTime: `${Math.ceil(words / 220)} min read`,
  codeBlocks: (content.match(/^```[^\n]+$/gm) ?? []).length,
  tableCount: (content.match(/^\|---/gm) ?? []).length,
};
assert(process.argv.length <= 3 && (!process.argv[2] || process.argv[2] === "--metrics"));
if (process.argv[2] === "--metrics") { console.log(JSON.stringify(metrics, null, 2)); process.exit(0); }
const fetchOriginal = globalThis.fetch;
const connectOriginal = Socket.prototype.connect;
const deny = () => { throw new Error("Network disabled during article validation"); };
globalThis.fetch = deny;
Socket.prototype.connect = deny;
after(() => { globalThis.fetch = fetchOriginal; Socket.prototype.connect = connectOriginal; });

function evaluate(template, input) {
  return expression.resolveSimpleParameterValue(`=${template}`, { $json: structuredClone(input) });
}
function snippet(heading, language = "n8n") {
  const section = content.split(`### ${heading}\n`)[1]?.split(/\n#{2,3} /)[0];
  const code = new RegExp("```" + language + "\\n([\\s\\S]*?)\\n```").exec(section ?? "")?.[1];
  assert(code, `Missing article code: ${heading}`);
  return code;
}
const plain = value => JSON.parse(JSON.stringify(value));
const fixture = {
  message: 'Use the "Pro" plan.\nKeep C:\\temp\\notes.txt unchanged.',
  active: false,
  count: 0,
  tags: ["billing", "review"],
  customer: { id: "00123" },
  note: null,
};
const objectBody = snippet("Typed Object Body");
const unsafeBody = snippet("Fragile Quoted Interpolation");
const escapedBody = snippet("Safe Serialized Value in a Template");

test("real n8n expression returns an object and preserves nested JSON types", () => {
  const result = evaluate(objectBody, fixture);
  assert.equal(typeof result, "object");
  assert.deepEqual(plain(result), fixture);
});

test("ordinary interpolation succeeds for plain text but fails with quotes and newlines", () => {
  assert.deepEqual(JSON.parse(evaluate(unsafeBody, { message: "Plain text" })), { message: "Plain text" });
  assert.throws(() => JSON.parse(evaluate(unsafeBody, fixture)), SyntaxError);
});

test("JSON.stringify inserted without extra quotes preserves the complete string", () => {
  assert.deepEqual(JSON.parse(evaluate(escapedBody, fixture)), { message: fixture.message });
});

test("n8n toJsonString matches the standard serializer for string values", () => {
  const template = snippet("Equivalent n8n String Helper");
  assert.deepEqual(JSON.parse(evaluate(template, fixture)), { message: fixture.message });
});

test("extra quotes around JSON.stringify produce malformed JSON", () => {
  const template = snippet("Incorrect Extra Quotes Around a Serialized Value");
  assert.throws(() => JSON.parse(evaluate(template, fixture)), SyntaxError);
});

test("whole-body serialization produces text suitable for Raw application/json", () => {
  const template = snippet("Serialized Raw Body");
  const result = evaluate(template, fixture);
  assert.equal(typeof result, "string");
  assert.deepEqual(JSON.parse(result), { message: fixture.message, active: false });
});

test("missing object properties disappear while explicit null, false and zero survive", () => {
  const result = evaluate("{{ { optional: $json.missing, note: $json.note, active: $json.active, count: $json.count } }}", fixture);
  assert.deepEqual(plain(result), { note: null, active: false, count: 0 });
});

const cases = new Function(snippet("Create the Test Inputs"))();
test("the exact article dataset reproduces all eight reported outcomes", () => {
  assert.equal(cases.length, 8);
  const outcome = input => {
    try {
      const parsed = JSON.parse(evaluate(unsafeBody, input));
      return parsed.message === input.message ? "preserved" : "changed";
    } catch { return "invalid"; }
  };
  assert.deepEqual(cases.map(item => [item.json.label, outcome(item.json)]), [
    ["plain", "preserved"], ["quotes", "invalid"], ["newline", "invalid"], ["backslash", "changed"],
    ["tab", "invalid"], ["unicode", "preserved"], ["empty", "preserved"], ["html", "invalid"],
  ]);
  for (const { json } of cases) {
    assert.deepEqual(plain(evaluate(snippet("Object Body for a Message"), json)), { message: json.message });
    assert.deepEqual(JSON.parse(evaluate(escapedBody, json)), { message: json.message });
    assert.deepEqual(JSON.parse(evaluate(snippet("Equivalent n8n String Helper"), json)), { message: json.message });
  }
});

test("the expected typed JSON is the actual serialization of the article expression", () => {
  assert.deepEqual(plain(evaluate(objectBody, fixture)), JSON.parse(snippet("Expected Typed Payload", "json")));
  assert.deepEqual(plain(evaluate(objectBody, { ...fixture, note: undefined })), fixture);
});

test("a deliberately serialized nested value is a string inside an object", () => {
  const result = plain(evaluate(snippet("Deliberately Serialized Nested Value"), fixture));
  assert.equal(typeof result.value, "string");
  assert.deepEqual(JSON.parse(result.value), fixture.customer);
});

test("the article's exported parameter fragment resolves to the intended object", () => {
  const exported = JSON.parse(snippet("Expression Inside a Workflow Export", "json"));
  assert.deepEqual(plain(expression.resolveSimpleParameterValue(exported.jsonBody, { $json: fixture })), { message: fixture.message });
});

const parsePayload = new Function("$json", snippet("Parse and Validate a Message Payload"));
test("the exact per-item validation code accepts objects and serialized objects", () => {
  const expected = { json: { message: fixture.message } };
  assert.deepEqual(parsePayload({ payload: { message: fixture.message, unrelated: "discarded" } }), expected);
  assert.deepEqual(parsePayload({ payload: JSON.stringify({ message: fixture.message }) }), expected);
});

test("the per-item validation rejects missing, malformed, fenced and non-object data", () => {
  for (const payload of [undefined, null, [], 2, true, "null", "[]", '"a string"']) {
    assert.throws(() => parsePayload({ payload }), /must be a JSON object/);
  }
  for (const payload of ["", "{", '```json\n{"message":"hello"}\n```']) {
    assert.throws(() => parsePayload({ payload }), /must contain valid JSON text/);
  }
  for (const payload of [{}, { message: " " }, { message: 4 }, { message: false }]) {
    assert.throws(() => parsePayload({ payload }), /must be a nonempty string/);
  }
});

test("the examples use no live endpoints, workflow credentials or unsupported execution claims", () => {
  assert(!/^# |\ufffd|\0|<!--|\bTODO\b|\bTBD\b/m.test(content));
  assert(content.includes("not a live n8n Cloud, task-runner, HTTP transport, or external API test"));
  assert.equal(metrics.codeBlocks, 12);
  assert.equal(metrics.tableCount, 4);
  assert.equal((content.split("## Frequently Asked Questions")[1]?.match(/^### /gm) ?? []).length, 5);
});

const read = path => readFileSync(resolve(root, path), "utf8").replace(/\r\n?/g, "\n").trim();
const ledger = JSON.parse(read("docs/n8n-json-body-keywords-2026-11-01.json"));
const hash = value => createHash("sha256").update(value).digest("hex");

test("metadata and article fingerprints match the research record without invented metrics", () => {
  assert.equal(ledger.validation.contentSha256, metrics.contentSha256);
  assert.equal(ledger.validation.proseWords, metrics.proseWords);
  assert.equal(ledger.targeting.readingTime, metrics.readingTime);
  assert(ledger.targeting.title.length <= 70 && ledger.targeting.metaTitle.length <= 70);
  assert(ledger.targeting.metaDescription.length >= 120 && ledger.targeting.metaDescription.length <= 160);
  assert(ledger.targeting.excerpt.length >= 120 && ledger.targeting.excerpt.length <= 300);
  assert.equal(ledger.targeting.summary.split("|").length, 3);
  for (const metric of Object.values(ledger.metrics)) assert.equal(metric, null);
  const research = JSON.parse(read(ledger.research.file));
  assert.equal(research.keywordResearch.observations.length, ledger.research.seedsAttempted);
  assert.equal(research.keywordResearch.observations.filter(item => item.suggestions?.length).length, ledger.research.autocompleteSeedsWithSuggestions);
  assert.equal(research.keywordResearch.observations.filter(item => item.error).length, ledger.research.autocompleteErrors);
  assert.equal(research.sources.filter(item => item.status === 200).length, ledger.research.primaryDocumentationPages);
  assert(!research.coverage.some(item => item.slug === ledger.slug));
  assert.equal(research.searchConsole.queried, false);
  assert.match(research.httpRequestSource.validationExcerpt, /typeof jsonBodyParameter/);
  assert.match(research.httpRequestSource.validationExcerpt, /parseJsonParameter/);
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
  "@/components/code-playground": { CodePlayground() { throw new Error("n8n code cannot run in the browser playground"); } },
});
const html = renderToStaticMarkup(createElement(MarkdownRenderer, { content, currentSlug: ledger.slug }));
const document = parseDocument(html);

test("actual MarkdownRenderer preserves every article block and table without a misleading Run button", () => {
  const expected = [...content.matchAll(/```(?:n8n|json)\n([\s\S]*?)\n```/g)].map(match => match[1].trim());
  const actual = all(document, node => node.name === "pre").map(node => DomUtils.textContent(one(node, child => child.name === "code")).trim());
  assert.deepEqual(actual, expected);
  assert.equal(all(document, node => node.name === "table").length, 4);
  assert.equal(all(document, node => node.name === "code" && node.attribs.class === "language-n8n").length, 10);
  assert.equal(all(document, node => ["h1", "iframe", "script"].includes(node.name)).length, 0);
  const ids = all(document, node => /^h[23]$/.test(node.name)).map(node => node.attribs.id);
  assert.equal(new Set(ids).size, ids.length);
  const internal = [...new Set(all(document, node => node.name === "a" && node.attribs.href?.startsWith("/")).map(node => node.attribs.href))].sort();
  assert.deepEqual(internal, [...ledger.internalLinks].sort());
  for (const link of all(document, node => node.name === "a" && node.attribs.href?.startsWith("https://") && !node.attribs.href.startsWith(ledger.website))) {
    assert(link.attribs.rel.includes("noopener"));
  }
  assert(!html.includes("/tools/plagiarism-checker"));
});

test("all five visible FAQ answers exactly match the existing blog route's schema extractor", () => {
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

test("the illustrative photo retains real attribution and stable dimensions", () => {
  const image = one(document, node => node.name === "img");
  assert.equal(image.attribs.src, ledger.images.inline);
  assert.equal(image.attribs.width, "1200");
  assert.equal(image.attribs.height, "675");
  assert.equal(image.attribs.loading, "eager");
  assert.match(DomUtils.textContent(one(document, node => node.name === "figcaption")), /olia danilevich \/ Pexels/);
  assert.equal(imageSeo.getImageLicenseUrl(ledger.images.cover), ledger.images.license);
  assert.equal(imageSeo.getImageLicenseUrl(ledger.images.inline), ledger.images.license);
});

console.log(`Verified runtime: n8n-workflow ${version}; Node ${process.version}. Synthetic inputs; no n8n server or external API execution.`);
console.log(JSON.stringify(metrics));