/**
 * Offline tests for the /tools hub: SSR structure, SEO metadata, structured data,
 * search filtering helpers and the OG route contract. No network, DB, env or build.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { parseDocument, DomUtils } from "htmlparser2";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = (path) => readFileSync(resolve(root, path), "utf8").replace(/\r\n?/g, "\n");
const appRequire = createRequire(import.meta.url);
const siteConfig = { name: "ByteVerse", url: "https://www.byteverse.fyi", description: "ByteVerse", author: "ByteVerse" };
const cssModule = new Proxy({}, { get: (target, name) => (typeof name === "string" ? name : undefined) });
const MockIcon = () => null;
const icons = new Proxy({ __esModule: true }, { get: (target, name) => (Object.hasOwn(target, name) ? target[name] : MockIcon) });
function MockLink({ href, children, className, ...rest }) {
  assert.equal(typeof href, "string");
  const attributes = Object.fromEntries(Object.entries(rest).filter(([name]) => name.startsWith("data-") || name.startsWith("aria-") || name === "style"));
  return React.createElement("a", { href, className, ...attributes }, children);
}

function transpile(source, fileName) {
  const compiled = ts.transpileModule(source, { fileName, reportDiagnostics: true, compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } });
  assert.equal(compiled.diagnostics?.length ?? 0, 0, `transpile diagnostics: ${fileName}`);
  return compiled.outputText;
}
const cache = new Map();
function load(path) {
  if (cache.has(path)) return cache.get(path).exports;
  const record = { exports: {} };
  cache.set(path, record);
  new Function("require", "module", "exports", transpile(read(path), path))((specifier) => {
    switch (specifier) {
      case "react": return React;
      case "react/jsx-runtime": return appRequire("react/jsx-runtime");
      case "next/link": return { __esModule: true, default: MockLink };
      case "lucide-react": return icons;
      case "@/lib/config": return { siteConfig };
      case "@/lib/tool-catalog": return load("src/lib/tool-catalog.ts");
      case "@/lib/tools-hub": return load("src/lib/tools-hub.ts");
      case "@/lib/image-studio/brand": return load("src/lib/image-studio/brand.ts");
      case "./tools-directory": return load("src/app/tools/tools-directory.tsx");
      case "./tools-hub.module.css": return cssModule;
      default: assert.fail(`Unexpected import in ${path}: ${specifier}`);
    }
  }, record, record.exports);
  return record.exports;
}

const { toolCatalog, toolCategories } = load("src/lib/tool-catalog.ts");
const hub = load("src/lib/tools-hub.ts");
const page = load("src/app/tools/page.tsx");
const html = renderToStaticMarkup(React.createElement(page.default));
const document = parseDocument(html);
const all = (node, predicate) => DomUtils.findAll(predicate, node.children ?? []);
const one = (items, label) => { assert.equal(items.length, 1, `Expected one ${label}, found ${items.length}`); return items[0]; };
const text = (node) => DomUtils.textContent(node).replace(/\s+/g, " ").trim();
const schemas = all(document, (node) => node.name === "script" && node.attribs.type === "application/ld+json");
const graph = JSON.parse(DomUtils.textContent(one(schemas, "JSON-LD script")))["@graph"];
const byType = (type) => one(graph.filter((item) => item["@type"] === type), `${type} schema`);

test("hub metadata stays within search snippet limits and points at the canonical URL and social image", () => {
  const { metadata } = page;
  assert.equal(metadata.title, hub.toolsHubMeta.title);
  assert(metadata.title.length <= 60, `title ${metadata.title.length} chars`);
  assert(metadata.description.length >= 120 && metadata.description.length <= 160, `description ${metadata.description.length} chars`);
  assert(metadata.description.includes(`${toolCatalog.length} free online tools`));
  assert.equal(metadata.alternates.canonical, `${siteConfig.url}/tools`);
  assert.equal(metadata.openGraph.url, `${siteConfig.url}/tools`);
  assert.deepEqual(metadata.openGraph.images.map(({ url, width, height }) => ({ url, width, height })), [{ url: `${siteConfig.url}/api/og/tools`, width: 1200, height: 630 }]);
  assert.equal(metadata.twitter.card, "summary_large_image");
  assert(!/100% client-side|Every tool runs entirely|All tools run|unlimited|guarantee/i.test(html));
});

test("SSR renders one H1, breadcrumb, stats and no nested main landmark", () => {
  const h1 = one(all(document, (node) => node.name === "h1"), "H1");
  assert.equal(text(h1), "Free online tools for developers, writers and SEO");
  assert.equal(all(document, (node) => node.name === "main").length, 0, "the site shell provides <main>");
  const crumbs = one(all(document, (node) => node.name === "nav" && node.attribs["aria-label"] === "Breadcrumb"), "breadcrumb");
  assert.deepEqual(all(crumbs, (node) => node.name === "a").map((node) => node.attribs.href), ["/"]);
  assert(text(document).includes(`${toolCatalog.length} free tools`));
  assert(text(document).includes(`${toolCategories.length}`));
});

test("every tool is linked exactly once in the directory, grouped into every category with correct counts", () => {
  const directory = one(all(document, (node) => node.attribs?.id === "directory"), "directory container");
  const cards = all(directory, (node) => node.name === "a" && node.attribs["data-tool"]);
  assert.deepEqual(cards.map((node) => node.attribs.href).sort(), toolCatalog.map((tool) => `/tools/${tool.slug}`).sort());
  const sections = all(directory, (node) => node.name === "section");
  assert.equal(sections.length, toolCategories.length);
  for (const category of hub.hubCategories) {
    const section = one(sections.filter((node) => node.attribs.id === category.id), `section ${category.id}`);
    const expected = toolCatalog.filter((tool) => tool.category === category.title);
    assert.equal(all(section, (node) => node.name === "a" && node.attribs["data-tool"]).length, expected.length);
    assert(text(one(all(section, (node) => node.name === "h2"), "category heading")).includes(`${expected.length} tool`));
    assert(text(section).includes(category.blurb));
  }
  const allLinks = all(document, (node) => node.name === "a").map((node) => node.attribs.href);
  assert(allLinks.every((href) => href.startsWith("/") || href.startsWith("#")), "hub links stay internal");
  for (const href of allLinks.filter((value) => value.startsWith("#"))) {
    assert(all(document, (node) => node.attribs?.id === href.slice(1)).length === 1, `anchor target ${href}`);
  }
});

test("search field is hydration-gated, chips cover every category and a noscript fallback exists", () => {
  const search = one(all(document, (node) => node.attribs?.role === "search"), "search region");
  const input = one(all(search, (node) => node.name === "input"), "search input");
  assert.equal(input.attribs.type, "search");
  assert("disabled" in input.attribs);
  const label = one(all(search, (node) => node.name === "label"), "search label");
  assert.equal(label.attribs.for, input.attribs.id);
  const chips = all(search, (node) => node.name === "a");
  assert.equal(chips.length, toolCategories.length + 1);
  assert.equal(chips[0].attribs["aria-current"], "true");
  assert.deepEqual(chips.slice(1).map((node) => node.attribs.href), hub.hubCategories.map((category) => `#${category.id}`));
  assert(all(search, (node) => node.name === "noscript").length === 1);
  assert(one(all(search, (node) => node.attribs?.role === "status"), "live status").attribs["aria-live"] === "polite");
});

test("upgraded strip, processing notes, FAQ accordion and guide links are present and truthful", () => {
  const upgraded = all(document, (node) => node.name === "a" && node.attribs["data-upgraded-tool"]);
  assert.equal(upgraded.length, hub.upgradedToolHighlights.length);
  for (const link of upgraded) assert(toolCatalog.some((tool) => `/tools/${tool.slug}` === link.attribs.href));
  const details = all(document, (node) => node.name === "details");
  assert.equal(details.length, hub.toolsHubFaqs.length);
  assert.deepEqual(details.map((node) => text(one(all(node, (child) => child.name === "summary"), "summary"))), hub.toolsHubFaqs.map((faq) => faq.question));
  assert.deepEqual(details.map((node) => text(one(all(node, (child) => child.name === "p"), "answer"))), hub.toolsHubFaqs.map((faq) => faq.answer));
  const hrefs = new Set(all(document, (node) => node.name === "a").map((node) => node.attribs.href));
  for (const href of ["/privacy", "/contact", "/category/tech-guides", "/blog", "/"]) assert(hrefs.has(href), `missing ${href}`);
  assert(text(document).includes("Labeled server features"));
});

test("single JSON-LD graph describes the collection, breadcrumb and visible FAQs", () => {
  const collection = byType("CollectionPage");
  assert.equal(collection.url, `${siteConfig.url}/tools`);
  assert.equal(collection.mainEntity.numberOfItems, toolCatalog.length);
  assert.deepEqual(collection.mainEntity.itemListElement.map((item) => item.url).sort(), toolCatalog.map((tool) => `${siteConfig.url}/tools/${tool.slug}`).sort());
  assert.deepEqual(collection.mainEntity.itemListElement.map((item) => item.position), toolCatalog.map((_, index) => index + 1));
  const breadcrumb = byType("BreadcrumbList");
  assert.deepEqual(breadcrumb.itemListElement.map((item) => [item.position, item.name, item.item]), [[1, "Home", `${siteConfig.url}/`], [2, "Tools", `${siteConfig.url}/tools`]]);
  const faq = byType("FAQPage");
  assert.deepEqual(faq.mainEntity.map((item) => [item.name, item.acceptedAnswer.text]), hub.toolsHubFaqs.map((item) => [item.question, item.answer]));
  assert(!graph.some((item) => Object.hasOwn(item, "aggregateRating")));
  assert(hub.serializeToolsHubJsonLd({ "@graph": [{ name: "</script><b>x</b>" }] }).includes("\\u003c/script>"));
});

test("directory filtering matches tasks, aliases and categories without false positives", () => {
  const tools = hub.toDirectoryTools(toolCatalog);
  const slugs = (query, category = "all") => hub.filterDirectoryTools(tools, query, category).map((tool) => tool.slug).sort();
  assert.equal(slugs("").length, toolCatalog.length);
  assert.deepEqual(slugs("", "Security & Crypto"), toolCatalog.filter((tool) => tool.category === "Security & Crypto").map((tool) => tool.slug).sort());
  assert(slugs("csv").includes("csv-repair") && slugs("csv").includes("csv-diff") && slugs("csv").includes("json-to-csv"));
  assert(slugs("epoch").includes("timestamp-converter"));
  assert(slugs("sha256").includes("hash-generator"));
  assert(slugs("plagiarism").includes("plagiarism-checker") && slugs("plagiarism").includes("plagiarism-remover"));
  assert.deepEqual(slugs("json typescript"), ["json-to-typescript"]);
  assert.deepEqual(slugs("hash", "SEO & Web"), []);
  assert.deepEqual(slugs("zzzz-no-such-tool"), []);
  assert.equal(hub.getUpgradedTools(toolCatalog).length, hub.upgradedToolHighlights.length);
  assert.equal(hub.getUpgradedTools(toolCatalog.filter((tool) => tool.slug !== "csv-repair")).length, hub.upgradedToolHighlights.length - 1);
});

test("OG route is static, cached and derived from the shared catalogue", () => {
  const source = read("src/app/api/og/tools/route.tsx");
  assert.match(source, /export const dynamic = "force-static"/);
  assert.match(source, /from "@\/lib\/tool-catalog"/);
  assert.match(source, /width: 1200, height: 630/);
  assert.match(source, /Cache-Control/);
  const layout = read("src/app/tools/layout.tsx");
  assert(layout.includes("<RelatedTools />"));
  assert(!read("src/app/tools/page.tsx").includes("<main"));
});
