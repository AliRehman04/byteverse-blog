import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire, registerHooks } from "node:module";
import { Socket } from "node:net";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { parseDocument, DomUtils } from "htmlparser2";
import Papa from "papaparse";
import sharp from "sharp";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
const read = path => readFileSync(resolve(root, path), "utf8").replace(/\r\n?/g, "\n").trim();
const ledger = JSON.parse(read("docs/csv-one-column-keywords-2026-10-27.json"));
const content = read(`scripts/content/${ledger.slug}.md`);
const mode = process.argv[2] ?? "--offline";
assert(process.argv.length <= 3 && ["--offline", "--metrics", "--links"].includes(mode));
const hash = text => createHash("sha256").update(text).digest("hex");
const prose = content.split("\n## Sources and Further Reading")[0].replace(/\[([^\]]+)\]\([^\n)]+\)/g, (_, label) => label);
const words = (prose.match(/[\p{L}\p{N}]+(?:['’.-][\p{L}\p{N}]+)*/gu) ?? []).length;
const metrics = { proseWords: words, contentSha256: hash(content), readingTime: `${Math.ceil(words / 220)} min read`, titleChars: ledger.targeting.title.length, metaDescriptionChars: ledger.targeting.metaDescription.length };
if (mode === "--metrics") { console.log(JSON.stringify(metrics, null, 2)); process.exit(0); }
const all = (root, predicate) => DomUtils.findAll(predicate, root.children ?? []);
const one = (root, predicate) => { const matches = all(root, predicate); assert.equal(matches.length, 1); return matches[0]; };
const collapse = text => text.replace(/\s+/g, " ").trim();
const links = [...content.matchAll(/(?<!!)\[([^\]]+)\]\(([^\s)]+)\)/g)].map(match => match[2]);
const credits = [ledger.images.coverCredit, ledger.images.inlineCredit];
const fetchOriginal = globalThis.fetch, connectOriginal = Socket.prototype.connect;
const deny = () => { throw new Error("Network disabled during offline editorial validation"); };
globalThis.fetch = deny; Socket.prototype.connect = deny;
const hook = registerHooks({ resolve(specifier, context, next) {
  assert(!/^(?:@next\/env|@neondatabase\/serverless|dotenv|pg|@\/lib\/db)(?:\/|$)/.test(specifier), "Environment or DB import forbidden");
  return next(specifier, context);
} });
function transpile(source, fileName) {
  const compiled = ts.transpileModule(source, { fileName, reportDiagnostics: true, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } });
  assert.equal(compiled.diagnostics?.length ?? 0, 0); return compiled.outputText;
}
function load(path, overrides = {}) {
  const record = { exports: {} };
  const allowed = new Set(["react", "react/jsx-runtime", "lucide-react", "react-markdown", "remark-gfm", "rehype-raw", "rehype-sanitize", "rehype-slug"]);
  new Function("require", "module", "exports", transpile(read(path), path))(name => {
    if (Object.hasOwn(overrides, name)) return overrides[name];
    assert(allowed.has(name), name); return require(name);
  }, record, record.exports);
  return record.exports;
}
try {
  assert.equal(ledger.slug, "csv-opens-in-one-column-excel");
  for (const field of ["title", "metaTitle"]) assert(ledger.targeting[field].length <= 70);
  assert(ledger.targeting.metaDescription.length >= 120 && ledger.targeting.metaDescription.length <= 160);
  assert(ledger.targeting.excerpt.length >= 120 && ledger.targeting.excerpt.length <= 300);
  assert.equal(ledger.targeting.summary.split("|").length, 3);
  assert(!/^# |\ufffd|\0|<!--|\bTODO\b|\bTBD\b/m.test(content));
  assert(!content.includes("/tools/csv-diff"), "Unpublished tool must not be linked");
  assert(content.includes("No hands-on Excel installation test"));
  assert.equal(ledger.validation.proseWords, words);
  assert.equal(ledger.validation.contentSha256, hash(content));
  assert.equal(ledger.targeting.readingTime, metrics.readingTime);
  for (const metric of ["monthlyVolume", "keywordDifficulty", "rankingProbability", "trafficForecast"]) assert.equal(ledger.metrics[metric], null);
  for (const draft of ledger.inventory.previousLocalDrafts) assert.equal(hash(read(`scripts/content/${draft.slug}.md`)), draft.contentSha256);
  const research = JSON.parse(read(ledger.research.file));
  assert.equal(research.keywordResearch.observations.filter(row => row.suggestions?.length).length, 4);
  assert(!research.overlap.some(row => /csv.*(?:one|single) column/i.test(row.title)));
  console.log("PASS metadata, evidence limits, topic scope and unchanged previous drafts");

  const blocks = [...content.matchAll(/```(?:csv|text)\n([\s\S]*?)\n```/g)].map(match => match[1]);
  assert.equal(blocks.length, 4);
  const parse = (text, delimiter) => { const result = Papa.parse(text, { delimiter, dynamicTyping: false }); assert.deepEqual(result.errors, []); return result.data; };
  assert.deepEqual(parse(blocks[0], ","), [["id", "name", "amount"], ["00123", "Acme, Ltd", "19.95"], ["00456", "Northwind", "24.50"]]);
  assert.deepEqual(parse(blocks[1], ";"), [["id", "name", "amount"], ["00123", "Acme, Ltd", "19,95"], ["00456", "Northwind", "24,50"]]);
  assert.deepEqual(parse(blocks[2], ","), [["id", "company", "note"], ["00123", "Acme, Ltd", 'Said "ready"']]);
  assert.deepEqual(parse(blocks[3], ","), [["00123,Acme,19.95"]]);
  assert.deepEqual(parse("00123,,19.95", ","), [["00123", "", "19.95"]]);
  console.log("PASS all four article samples, escaped quotes and empty fields (not an Excel installation test)");

  const siteConfig = { url: ledger.website, name: "ByteVerse" };
  const imageSeo = load("src/lib/image-seo.ts", { "@/lib/config": { siteConfig } });
  const copy = load("src/components/copy-button.tsx");
  const { MarkdownRenderer } = load("src/components/markdown-renderer.tsx", { "@/lib/config": { siteConfig }, "@/lib/image-seo": imageSeo, "@/components/copy-button": copy,
    "@/components/code-playground": { CodePlayground() { throw new Error("No runnable example expected"); } } });
  const html = renderToStaticMarkup(createElement(MarkdownRenderer, { content, currentSlug: ledger.slug }));
  const dom = parseDocument(html);
  assert.equal(all(dom, node => node.name === "table").length, 1);
  assert.equal(all(dom, node => ["h1", "iframe", "script"].includes(node.name)).length, 0);
  const image = one(dom, node => node.name === "img");
  assert.equal(image.attribs.src, ledger.images.inline);
  assert.equal(image.attribs.width, "1200"); assert.equal(image.attribs.height, "675");
  assert(image.attribs.alt.length >= 25);
  assert(DomUtils.textContent(one(dom, node => node.name === "figcaption")).includes("Artem Podrez / Pexels"));
  for (const path of [ledger.images.coverFile, ledger.images.inlineFile]) {
    const meta = await sharp(resolve(root, path)).metadata();
    assert.equal(meta.width, 1200); assert.equal(meta.height, 675); assert.equal(meta.format, "jpeg");
  }
  const unique = values => [...new Set(values)].sort();
  assert.deepEqual(unique(links.filter(url => url.startsWith("/"))), [...ledger.internalLinks].sort());
  assert.deepEqual(unique(links.filter(url => url.startsWith("https://"))), unique([...ledger.sources, ...credits]));
  for (const node of all(dom, node => node.name === "a" && node.attribs.href?.startsWith("https://"))) assert(node.attribs.rel.includes("noopener"));
  console.log("PASS real renderer, table, full-size real photographs and link destinations");

  const route = read("src/app/blog/[slug]/page.tsx");
  const start = route.indexOf("  const faqRegex ="), end = route.indexOf("  // Auto-extract HowTo", start);
  assert(start > 0 && end > start);
  const faqs = new Function("post", `${transpile(route.slice(start, end), "faq.ts")}; return faqs;`)({ content });
  const details = all(dom, node => node.name === "details");
  assert.equal(faqs.length, 5); assert.equal(details.length, 5);
  assert.deepEqual(faqs.map(faq => faq.question), ledger.faq);
  assert.deepEqual(faqs.map(faq => faq.question), details.map(node => DomUtils.textContent(one(node, child => child.name === "summary"))));
  assert.deepEqual(faqs.map(faq => collapse(faq.answer)), details.map(node => collapse(DomUtils.textContent(one(node, child => child.name === "p")))));
  console.log("PASS five visible FAQs exactly match existing route extraction");
  console.log(JSON.stringify(metrics));
} finally { globalThis.fetch = fetchOriginal; Socket.prototype.connect = connectOriginal; hook.deregister(); }

if (mode === "--links") {
  for (const url of [...ledger.internalLinks.map(path => ledger.website + path), ...ledger.sources, ledger.images.cover, ledger.images.inline]) {
    const response = await fetch(url, { signal: AbortSignal.timeout(30000), headers: { "user-agent": "Mozilla/5.0 ByteVerse-editorial-link-check" } });
    assert.equal(response.status, 200, url);
    if (url.endsWith(".jpg")) assert.match(response.headers.get("content-type") ?? "", /image\/jpeg/);
    await response.body?.cancel(); console.log(`PASS HTTP 200 ${url}`);
  }
}