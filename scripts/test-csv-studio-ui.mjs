/**
 * Offline SSR, SEO and integration contracts for the ACTUAL /tools/csv-repair page.
 * No build, server, env file, database or network: TypeScript modules are transpiled
 * in memory and rendered with react-dom/server. Only Next Link, next/navigation and
 * CSS modules are substituted; the page, CSV Studio component and engine are real.
 *   node scripts/test-csv-studio-ui.mjs
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseDocument } from "htmlparser2";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
const PATH = "/tools/csv-repair";
const ORIGIN = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.byteverse.fyi").replace(/\/$/, "");
const TITLE = "CSV Repair Tool — Preserve IDs & Export Excel | ByteVerse";
const H1 = "Free CSV Repair Tool & Excel Export";
const LEAD = "Fix CSV formatting issues, preserve leading zeros and IDs, preview repairs, and export Excel-ready XLSX files.";
const PRIVACY = "Files are processed in your browser. ByteVerse does not receive your spreadsheet contents in this tool's normal workflow.";
const LIMITATION = "If leading zeros are already missing from the file you uploaded, this tool cannot invent them.";
const FAQ_SEEDS = [
  "Why did Excel remove the zeros from my ZIP codes?",
  "Why does my CSV open in one column?",
  "Can this tool recover zeros that are already gone?",
  "Are my files uploaded to ByteVerse?",
  "What is the largest file I can use?",
  "Why should I export XLSX instead of CSV?",
  "What is formula injection in a spreadsheet?",
  "Why is a 16-digit ID showing up as 5.43E+15?",
];
const GUIDES = ["/blog/excel-csv-leading-zeros-2026", "/blog/csv-opens-in-one-column-excel", "/blog/excel-csv-special-characters-utf8"];

const links = [];
const cache = new Map();
const css = { __esModule: true, default: new Proxy({}, { get: (_, key) => (typeof key === "string" ? key : undefined) }) };
const substitutes = {
  "next/link": { __esModule: true, default: ({ prefetch, ...props }) => { links.push({ href: props.href, prefetch }); return React.createElement("a", props); } },
  "next/navigation": { usePathname: () => PATH },
};

function transpile(path) {
  const output = ts.transpileModule(readFileSync(path, "utf8"), {
    fileName: path, reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, isolatedModules: true },
    transformers: { before: [(context) => {
      const visit = (node) => (ts.isPropertyAccessExpression(node) && node.name.text === "url" && ts.isMetaProperty(node.expression)
        ? context.factory.createStringLiteral(pathToFileURL(path).href)
        : ts.visitEachChild(node, visit, context));
      return (node) => ts.visitNode(node, visit);
    }] },
  });
  assert.equal(output.diagnostics?.length ?? 0, 0, `${path}: transpilation`);
  return output.outputText;
}

function resolveLocal(parent, specifier) {
  const base = specifier.startsWith("@/") ? resolve(root, "src", specifier.slice(2)) : resolve(dirname(parent), specifier);
  const file = [base, `${base}.ts`, `${base}.tsx`].find((candidate) => existsSync(candidate) && statSync(candidate).isFile());
  assert(file, `Cannot resolve ${specifier} from ${parent}`);
  return file;
}

function load(path) {
  if (path.endsWith(".css")) return css;
  if (cache.has(path)) return cache.get(path).exports;
  const record = { exports: {} };
  cache.set(path, record);
  const localRequire = (specifier) => {
    if (Object.hasOwn(substitutes, specifier)) return substitutes[specifier];
    if (specifier.startsWith("@/") || specifier.startsWith(".")) return load(resolveLocal(path, specifier));
    assert(!/^(node:|fs$|http|https|net|child_process)/.test(specifier), `Unexpected runtime import ${specifier}`);
    return require(specifier);
  };
  new Function("require", "module", "exports", transpile(path))(localRequire, record, record.exports);
  return record.exports;
}

const source = (relative) => readFileSync(resolve(root, relative), "utf8");
const page = load(resolve(root, "src/app/tools/csv-repair/page.tsx"));
const dom = parseDocument(renderToStaticMarkup(React.createElement(page.default)));

function elements(node, predicate = () => true, found = []) {
  if (node.name && predicate(node)) found.push(node);
  for (const child of node.children ?? []) elements(child, predicate, found);
  return found;
}
function text(node, visible = true) {
  if (node.type === "text") return node.data;
  if (visible && (node.name === "script" || node.attribs?.["aria-hidden"] === "true")) return "";
  return (node.children ?? []).map((child) => text(child, visible)).join("");
}
const clean = (value) => value.replace(/[\u2018\u2019]/g, "'").replace(/\s+/g, " ").trim();
const only = (items, message) => { assert.equal(items.length, 1, message); return items[0]; };
const byId = (id) => only(elements(dom, (node) => node.attribs.id === id), `one #${id}`);
const schemas = elements(dom, (node) => node.name === "script" && node.attribs.type === "application/ld+json").map((node) => JSON.parse(text(node, false)));
const pageText = clean(text(dom));

test("metadata: absolute title, description, canonical and social image", () => {
  const { metadata } = page;
  assert.equal(metadata.title.absolute, TITLE);
  assert(metadata.description.length >= 120 && metadata.description.length <= 160, `description length ${metadata.description.length}`);
  assert.equal(metadata.alternates.canonical, `${ORIGIN}${PATH}`);
  assert.equal(metadata.openGraph.url, `${ORIGIN}${PATH}`);
  assert.equal(metadata.openGraph.images[0].url, `${PATH}/opengraph-image`);
  assert.equal(metadata.twitter.images[0].url, `${PATH}/opengraph-image`);
  assert.equal(page.dynamic, "force-static");
});

test("identity row: breadcrumb, one exact H1, value line, privacy chip and command hint", () => {
  assert.equal(clean(text(only(elements(dom, (node) => node.name === "h1"), "exactly one H1"))), H1);
  const crumbs = only(elements(dom, (node) => node.name === "nav" && node.attribs["aria-label"] === "Breadcrumb"), "breadcrumb");
  assert.deepEqual(elements(crumbs, (node) => node.name === "a" || node.attribs["aria-current"] === "page").map((node) => clean(text(node))), ["Home", "Tools", "CSV Repair Tool"]);
  assert(pageText.includes(LEAD));
  const chip = only(elements(dom, (node) => node.name === "a" && node.attribs.href === "#csv-studio-privacy"), "privacy chip");
  assert.equal(clean(text(chip)), "Processed in your browser");
  byId("csv-studio-privacy");
  assert.match(pageText, /Press Ctrl K \(⌘ K on Mac\) for commands/);
});

test("workspace is SSR'd before every education section with the exact dropzone copy", () => {
  const workspace = byId("csv-repair-workspace");
  const workspaceText = clean(text(workspace));
  assert(workspaceText.includes("Drop a CSV file to inspect and repair"));
  assert(workspaceText.includes("CSV or delimited TXT. Processed in your browser."));
  assert(workspaceText.includes(PRIVACY));
  assert(workspaceText.includes(LIMITATION));
  for (const label of ["Choose a file", "Paste data", "US customer list", "European export", "Inventory TSV", "Broken quotes"]) assert(workspaceText.includes(label), label);
  const order = elements(dom, (node) => node.attribs.id === "csv-repair-workspace" || node.attribs.id === "csv-repair-how-title");
  assert.deepEqual(order.map((node) => node.attribs.id), ["csv-repair-workspace", "csv-repair-how-title"]);
  assert.equal(elements(workspace, (node) => node.name === "dialog" && "open" in node.attribs).length, 0, "no dialog is open on first paint");
  const buttons = elements(workspace, (node) => node.name === "button");
  assert(buttons.every((node) => node.attribs.type === "button"), "every studio button declares type=button");
});

test("schema is truthful: WebApplication (Web Browser), visible breadcrumb and all on-page FAQs", () => {
  assert.deepEqual(schemas.map((schema) => schema["@type"]), ["WebApplication", "BreadcrumbList", "FAQPage"]);
  const [app, breadcrumb, faq] = schemas;
  assert.equal(app.operatingSystem, "Web Browser");
  assert.equal(app.url, `${ORIGIN}${PATH}`);
  assert.equal(app.offers.price, "0");
  assert(!/aggregateRating|"review"|ratingValue/i.test(JSON.stringify(schemas)), "no invented ratings or reviews");
  assert.deepEqual(breadcrumb.itemListElement.map((item) => item.name), ["Home", "Tools", "CSV Repair Tool"]);
  const details = elements(byId("csv-repair-faq-title").parent, (node) => node.name === "details");
  const visible = details.map((node) => ({
    question: clean(text(only(elements(node, (child) => child.name === "summary"), "summary"))),
    answer: clean(text(only(elements(node, (child) => child.name === "p"), "answer"))),
  }));
  assert.deepEqual(visible.map((item) => item.question), FAQ_SEEDS);
  assert.deepEqual(faq.mainEntity.map((item) => ({ question: clean(item.name), answer: clean(item.acceptedAnswer.text) })), visible);
  const scripts = elements(dom, (node) => node.name === "script").map((node) => text(node, false));
  assert(scripts.every((value) => !value.includes("</")), "JSON-LD escapes closing tags");
});

test("links: verified guides, prefetch disabled, safe external links", () => {
  const hrefs = elements(dom, (node) => node.name === "a").map((node) => node.attribs.href);
  for (const href of [...GUIDES, "/tools/csv-diff", "/tools/json-to-csv", "/privacy"]) assert(hrefs.includes(href), href);
  assert(links.length > 0 && links.every((link) => link.prefetch === false), "internal links never prefetch from the private page");
  for (const anchor of elements(dom, (node) => node.name === "a" && /^https?:/.test(node.attribs.href))) {
    assert.equal(anchor.attribs.target, "_blank");
    assert.match(anchor.attribs.rel, /noopener/);
    assert.match(anchor.attribs.rel, /noreferrer/);
  }
});

test("visual rules: no gradients, glass effects or emoji in the page and studio", () => {
  const styles = ["src/components/csv-studio/studio.module.css", "src/app/tools/csv-repair/csv-repair-page.module.css"].map(source).join("\n");
  assert.doesNotMatch(styles, /gradient\(|backdrop-filter/);
  assert.doesNotMatch(pageText, /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
});

test("catalog, related links and discovery entries include the tool", () => {
  const catalog = load(resolve(root, "src/lib/tool-catalog.ts"));
  const entry = only(catalog.toolCatalog.filter((tool) => tool.slug === "csv-repair"), "catalog entry");
  assert.equal(entry.name, "CSV Repair Tool");
  assert.deepEqual(catalog.relatedToolSlugs["csv-repair"], ["csv-diff", "json-to-csv", "invoice-pdf-to-excel", "json-formatter"]);
  assert(catalog.relatedToolSlugs["invoice-pdf-to-excel"].includes("csv-repair"));
  assert(source("src/app/llms.txt/route.ts").includes('href: "/tools/csv-repair"'));
  assert(source("src/app/api/chat/route.ts").includes('slug: "csv-repair"'));
});

test("private-tool boundaries: shell, related prefetch, root service worker and route CSP", () => {
  assert.match(source("src/components/site-shell.tsx"), /privateToolPaths\s*=\s*new Set\([^;]*"\/tools\/csv-repair"/);
  assert.match(source("src/components/related-tools.tsx"), /"\/tools\/csv-repair"\]\.includes/);
  assert.match(source("public/sw.js"), /path === "\/tools\/csv-repair" \|\| path\.startsWith\("\/tools\/csv-repair\/"\)/);
  const config = source("next.config.ts");
  const block = /source: "\/tools\/csv-repair",\s*headers: \[([\s\S]*?)\],\s*\}/.exec(config);
  assert(block, "csv-repair header block");
  assert(config.indexOf('source: "/tools/csv-repair"') > config.indexOf('source: "/(.*)"'), "route policy follows the public policy");
  assert.match(block[1], /Referrer-Policy", value: "no-referrer"/);
  const csp = /Content-Security-Policy", value: "([^"]+)"/.exec(block[1])[1];
  const policy = Object.fromEntries(csp.split(";").map((part) => part.trim().split(/\s+/)).map(([key, ...values]) => [key, values]));
  assert.deepEqual(policy["script-src"], ["'self'", "'unsafe-inline'"]);
  assert.deepEqual(policy["connect-src"], ["'self'"]);
  assert.deepEqual(policy["worker-src"], ["'self'", "blob:"]);
  for (const key of ["frame-src", "object-src", "form-action"]) assert.deepEqual(policy[key], ["'none'"]);
  assert.doesNotMatch(csp, /https?:|unsafe-eval|\*/);
});

test("bundled samples are fictional and non-empty", () => {
  const { STUDIO_SAMPLES } = load(resolve(root, "src/lib/csv-studio/samples.ts"));
  assert.equal(STUDIO_SAMPLES.length, 4);
  for (const sample of STUDIO_SAMPLES) {
    const bytes = sample.bytes();
    assert(bytes.length > 50, sample.id);
    const decoded = Buffer.from(bytes).toString("latin1");
    assert.doesNotMatch(decoded, /@(?!example\.com|mention)[a-z0-9-]+\.[a-z]/i, `${sample.id}: example.com addresses only`);
  }
  assert.deepEqual([...STUDIO_SAMPLES[0].bytes().slice(0, 3)], [0xef, 0xbb, 0xbf], "customer sample carries a UTF-8 BOM");
});
