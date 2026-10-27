/**
 * Offline contracts for the ACTUAL page, initial client SSR, catalogue and shell.
 * Run directly with Node; no build/server, environment files, DB or HTTP needed.
 * TypeScript transpiles an explicit module allowlist in memory. Next Link/Image,
 * CSS modules and public-only shell islands have small, labelled substitutes;
 * CsvDiffPage, CsvDiffTool, its client module and the CSV engine are NOT mocked.
 * Effects/interactions/CSS layout belong to test-csv-diff-browser.mjs, not SSR.
 * The optional-looking social-image contract is a real, offline PNG assertion:
 * installed next/og may decode its embedded data: WASM, never fetch HTTP/fonts.
 * Trusted installed libraries run in Node; this is not a hostile-code sandbox.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import tls from "node:tls";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import vm from "node:vm";
import { parseDocument } from "htmlparser2";
import * as icons from "lucide-react";
import * as React from "react";
import * as jsx from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server.node";
import sharp from "sharp";
import ts from "typescript";

const require = createRequire(import.meta.url);
const papa = require("papaparse");
const ROOT = fileURLToPath(new URL("../", import.meta.url));
const PATH = "/tools/csv-diff";
const ORIGIN = "https://www.byteverse.fyi";
const TITLE = "CSV Diff Checker: Compare Two CSV Files by Key";
const DESCRIPTION = "Compare two CSV files by ID or composite key. Find added, removed and changed rows, inspect duplicate keys, and export reports locally with no uploads.";
const files = Object.freeze({
  page: "src/app/tools/csv-diff/page.tsx", ui: "src/app/tools/csv-diff/csv-diff-tool.tsx",
  client: "src/lib/csv-diff/client.ts", types: "src/lib/csv-diff/types.ts",
  samples: "src/lib/csv-diff/samples.ts", engine: "src/lib/csv-diff/engine.ts",
  seo: "src/lib/tool-seo.tsx", catalog: "src/lib/tool-catalog.ts", brand: "src/lib/image-studio/brand.ts",
  related: "src/components/related-tools.tsx", toolsLayout: "src/app/tools/layout.tsx",
  toolsPage: "src/app/tools/page.tsx", shell: "src/components/site-shell.tsx",
  header: "src/components/header.tsx", footer: "src/components/footer.tsx",
  config: "src/lib/config.ts", nextConfig: "next.config.ts", sw: "public/sw.js",
  llms: "src/app/llms.txt/route.ts", chat: "src/app/api/chat/route.ts",
  image: "src/app/tools/csv-diff/opengraph-image.tsx",
});
const executable = new Set(["page", "ui", "client", "types", "samples", "engine", "seo", "catalog", "brand",
  "related", "toolsLayout", "toolsPage", "shell", "header", "footer", "image"]);
const sources = new Map(), trees = new Map(), compiled = new Map(), runtimes = [], results = [];
const plain = value => JSON.parse(JSON.stringify(value));
const collapse = value => value.replace(/\s+/g, " ").trim();

function source(name) {
  assert(Object.hasOwn(files, name), `Unapproved source: ${name}`);
  if (!sources.has(name)) sources.set(name, readFileSync(join(ROOT, files[name]), "utf8"));
  return sources.get(name);
}
function tree(name) {
  if (!trees.has(name)) {
    const parsed = ts.createSourceFile(files[name], source(name), ts.ScriptTarget.Latest, true);
    assert.equal(parsed.parseDiagnostics.length, 0, `${name}: source syntax`);
    trees.set(name, parsed);
  }
  return trees.get(name);
}
function find(root, predicate) {
  const found = [];
  function visit(node) { if (predicate(node)) found.push(node); ts.forEachChild(node, visit); }
  visit(root); return found;
}
function only(items, message) { assert.equal(items.length, 1, message); return items[0]; }
function property(object, name) {
  assert(ts.isObjectLiteralExpression(object), "Expected a literal object");
  return object.properties.find(p => ts.isPropertyAssignment(p) && p.name.text === name)?.initializer;
}
function initializer(name, symbol) {
  return only(find(tree(name), n => ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === symbol), `${name}: ${symbol}`).initializer;
}
function literal(node) {
  assert(node, "Missing literal");
  if (ts.isAsExpression(node) || ts.isSatisfiesExpression(node) || ts.isParenthesizedExpression(node)) return literal(node.expression);
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (node.kind === ts.SyntaxKind.NullKeyword) return null;
  if (ts.isArrayLiteralExpression(node)) return node.elements.map(literal);
  assert(ts.isObjectLiteralExpression(node), "Only data literals may be extracted; no code/config evaluation");
  const entries = node.properties.map(p => {
    assert(ts.isPropertyAssignment(p) && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)), "No spreads/computed properties");
    return [p.name.text, literal(p.initializer)];
  });
  assert.equal(new Set(entries.map(([key]) => key)).size, entries.length);
  return Object.fromEntries(entries);
}
function compile(name) {
  assert(executable.has(name), `Unapproved executable: ${name}`);
  if (!compiled.has(name)) {
    let replacements = 0;
    const output = ts.transpileModule(source(name), {
      fileName: files[name], reportDiagnostics: true,
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, isolatedModules: true },
      transformers: { before: [context => {
        function visit(node) {
          if (name === "client" && ts.isPropertyAccessExpression(node) && node.name.text === "url"
            && ts.isMetaProperty(node.expression) && node.expression.keywordToken === ts.SyntaxKind.ImportKeyword) {
            replacements++;
            // Syntax-only substitution: SSR must never construct the Worker.
            return context.factory.createStringLiteral(pathToFileURL(join(ROOT, files.client)).href);
          }
          return ts.visitEachChild(node, visit, context);
        }
        return node => ts.visitNode(node, visit);
      }] },
    });
    assert.equal(output.diagnostics?.length ?? 0, 0, `${name}: transpilation`);
    assert.equal(replacements, name === "client" ? 1 : 0);
    compiled.set(name, output.outputText);
  }
  return compiled.get(name);
}

function runtime(pathname = PATH, imageResponse) {
  const violations = [], links = [], islands = [], cache = new Map();
  const deny = name => () => { violations.push(name); throw new Error(`Forbidden test capability: ${name}`); };
  const sandbox = { URL, TextEncoder, TextDecoder };
  for (const name of ["process", "fetch", "window", "document", "navigator", "location", "Worker", "SharedWorker",
    "XMLHttpRequest", "WebSocket", "EventSource", "localStorage", "sessionStorage", "indexedDB", "caches", "console",
    "setTimeout", "clearTimeout", "setInterval", "requestAnimationFrame", "Blob", "File"]) {
    Object.defineProperty(sandbox, name, { get: deny(name) });
  }
  const context = vm.createContext(sandbox, { codeGeneration: { strings: false, wasm: false } });
  const configObject = initializer("config", "siteConfig");
  const knownConfig = Object.freeze({ url: ORIGIN, ...Object.fromEntries(["name", "email", "nav", "categories", "description"]
    .map(name => [name, literal(property(configObject, name))])) });
  const NativeLink = ({ prefetch, ...props }) => {
    links.push({ href: props.href, prefetch });
    return React.createElement("a", { ...props, "data-test-prefetch": prefetch === undefined ? undefined : String(prefetch) });
  };
  const NativeImage = ({ unoptimized, ...props }) => React.createElement("img", { ...props, "data-test-unoptimized": String(unoptimized) });
  const island = name => function PublicOnlyIsland() { islands.push(name); return React.createElement("span", { "data-test-island": name }); };
  let dynamicNumber = 0;
  const Dynamic = () => island(`dynamic-${++dynamicNumber}`); // Never invoke import callbacks.
  const css = { __esModule: true, default: new Proxy({}, { get: (_, name) => `test-css-${String(name)}` }) };
  const shared = { react: React, "react/jsx-runtime": jsx, "lucide-react": icons,
    "next/link": { __esModule: true, default: NativeLink }, "next/image": { __esModule: true, default: NativeImage },
    "next/navigation": { usePathname: () => pathname }, "next/dynamic": { __esModule: true, default: Dynamic },
    "@/lib/config": { siteConfig: knownConfig } };
  const imports = {
    types: {}, samples: {}, engine: { "./types": "types", papaparse: papa }, client: { "./types": "types" },
    ui: { "@/lib/csv-diff/client": "client", "@/lib/csv-diff/types": "types", "@/lib/csv-diff/samples": "samples", "./csv-diff-workspace.module.css": css },
    page: { "@/lib/tool-seo": "seo", "@/app/tools/csv-diff/csv-diff-tool": "ui", "./csv-diff-page.module.css": css },
    seo: {}, brand: {}, catalog: { "@/lib/image-studio/brand": "brand" },
    related: { "@/lib/tool-catalog": "catalog" }, toolsLayout: { "@/components/related-tools": "related" },
    toolsPage: { "@/lib/tool-catalog": "catalog" },
    shell: { "./header": "header", "./footer": "footer", "./sw-register": { ServiceWorkerRegister: island("root-service-worker") } },
    header: { "@/lib/tool-catalog": "catalog", "@/components/theme-toggle": { ThemeToggle: () => React.createElement("button", { "aria-label": "Toggle theme" }) },
      "@/components/bookmark": { ReadingList: island("reading-list") }, "@/components/language-selector": { LanguageSelector: island("translation") } },
    footer: {}, image: { "next/og": { ImageResponse: imageResponse ?? deny("ImageResponse outside PNG test") } },
  };
  function resolveImport(parent, specifier) {
    const map = imports[parent];
    if (!map) return deny(`module:${parent}`)();
    const dependency = Object.hasOwn(map, specifier) ? map[specifier] : Object.hasOwn(shared, specifier) ? shared[specifier] : deny(`import:${specifier}`)();
    return typeof dependency === "string" ? load(dependency) : dependency;
  }
  function load(name) {
    if (!Object.hasOwn(imports, name)) return deny(`module:${name}`)();
    if (cache.has(name)) return cache.get(name).exports;
    const record = { exports: {} }; cache.set(name, record);
    const wrapper = new vm.Script(`(function(exports,require,module){\n${compile(name)}\n})`, { filename: files[name] }).runInContext(context);
    wrapper(record.exports, specifier => resolveImport(name, specifier), record);
    return record.exports;
  }
  const rt = { load, resolveImport, context, violations, links, islands, cache };
  runtimes.push(rt); return rt;
}
function elements(root, predicate = () => true) {
  const found = [];
  function visit(node) { if (node.name && predicate(node)) found.push(node); for (const child of node.children ?? []) visit(child); }
  visit(root); return found;
}
function text(node, visible = false) {
  if (visible && (["script", "style"].includes(node.name) || node.attribs?.["aria-hidden"] === "true")) return "";
  if (node.type === "text") return node.data;
  if (node.name === "br") return "\n";
  return (node.children ?? []).map(child => text(child, visible)).join("");
}
const byId = (dom, id) => only(elements(dom, node => node.attribs.id === id), `One #${id}`);
const markup = component => renderToStaticMarkup(React.createElement(component));
const pageDom = rt => parseDocument(markup(rt.load("page").default));
const schemas = dom => elements(dom, n => n.name === "script" && n.attribs.type === "application/ld+json").map(n => JSON.parse(text(n)));

async function check(name, body) {
  const first = runtimes.length;
  try {
    const evidence = await body();
    for (const rt of runtimes.slice(first)) assert.deepEqual(rt.violations, [], "App attempted a forbidden capability, even if caught");
    results.push({ name, status: "PASS", ...(evidence ? { evidence } : {}) }); console.log(`PASS ${name}`);
  } catch (error) {
    results.push({ name, status: "FAIL", error: String(error.stack ?? error).slice(0, 5000) });
    console.error(`FAIL ${name}\n${results.at(-1).error}`);
  }
}

await check("Harness rejects app environment, DB/route imports, network and browser execution", () => {
  const rt = runtime();
  for (const expression of ["process.env", "fetch", "Worker", "window", "localStorage", "indexedDB"]) {
    assert.throws(() => vm.runInContext(expression, rt.context));
    assert.equal(rt.violations.pop(), expression.split(".")[0]);
  }
  for (const name of ["config", "chat", "llms", "nextConfig"]) {
    assert.throws(() => rt.load(name), /Forbidden test capability/); assert.equal(rt.violations.pop(), `module:${name}`);
  }
  for (const name of ["node:fs", "node:http", "@/lib/db", "dotenv"]) {
    assert.throws(() => rt.resolveImport("page", name), /Forbidden test capability/); assert.equal(rt.violations.pop(), `import:${name}`);
  }
  assert.throws(() => source(".env.local"), /Unapproved source/);
  assert.throws(() => literal(property(initializer("config", "siteConfig"), "url")), /Only data literals/);
  assert.throws(() => vm.runInContext("new Function('return 1')()", rt.context), /Code generation/);
});

await check("Actual page embeds actual initial client SSR, with exactly one H1 and workspace", () => {
  const rt = runtime(), dom = pageDom(rt);
  assert.match(text(only(elements(dom, n => n.name === "h1"), "One H1")), /CSV diff checker.*Less noise\.[\s\S]*Clearer changes\./);
  const workspace = byId(dom, "csv-diff-workspace");
  assert.match(text(workspace), /What changed between exports\?/);
  for (const name of ["page", "ui", "client", "types", "samples", "seo"]) assert(rt.cache.has(name), `Actual ${name} executed`);
  const standalone = parseDocument(markup(rt.load("ui").CsvDiffTool));
  assert.equal(text(byId(standalone, "csv-diff-workspace")), text(workspace));
  assert.equal(elements(dom, n => n.attribs["data-test-island"]).length, 0);
  const ids = elements(dom, n => n.attribs.id).map(n => n.attribs.id);
  assert.equal(new Set(ids).size, ids.length, "No duplicate SSR IDs");
  return { h1: 1, workspaces: 1, actualClientSSR: true };
});

await check("Metadata has the production canonical, exact absolute title/description and route social image", () => {
  const page = runtime().load("page"), metadata = plain(page.metadata);
  assert.equal(page.dynamic, "force-static");
  assert.deepEqual(metadata.title, { absolute: TITLE });
  assert.equal(metadata.description, DESCRIPTION);
  assert.equal(metadata.alternates.canonical, ORIGIN + PATH);
  assert.equal(metadata.openGraph.url, ORIGIN + PATH);
  assert.equal(metadata.openGraph.title, TITLE);
  assert.equal(metadata.openGraph.description, DESCRIPTION);
  assert.equal(metadata.twitter.title, TITLE);
  assert.equal(metadata.twitter.card, "summary_large_image");
  assert.deepEqual(metadata.twitter.images, metadata.openGraph.images);
  const image = only(metadata.openGraph.images, "One social image");
  assert.equal(image.url, `${PATH}/opengraph-image`);
  assert.equal(image.width, 1200); assert.equal(image.height, 630); assert.match(image.alt, /illustrative inventory/i);
  const configuredUrl = property(initializer("config", "siteConfig"), "url");
  assert(ts.isBinaryExpression(configuredUrl) && configuredUrl.operatorToken.kind === ts.SyntaxKind.BarBarToken);
  assert.equal(literal(configuredUrl.right), ORIGIN, "Known config matches the static production default; env not evaluated");
});

await check("SSR JSON-LD is WebApplication + BreadcrumbList, free offer and no fabricated ratings", () => {
  const documents = schemas(pageDom(runtime()));
  assert.deepEqual(documents.map(item => item["@type"]), ["WebApplication", "BreadcrumbList"]);
  const [app, crumb] = documents;
  assert.equal(app.name, "CSV Diff Checker"); assert.equal(app.url, ORIGIN + PATH);
  assert.equal(app.description, DESCRIPTION); assert.equal(app.applicationCategory, "DeveloperApplication");
  assert.equal(app.isAccessibleForFree, true); assert.equal(app.offers.price, "0");
  assert.equal(app.offers.priceCurrency, "USD"); assert.equal(app.featureList.length, 6);
  assert.deepEqual(crumb.itemListElement.map(item => [item.position, item.item]), [[1, ORIGIN], [2, `${ORIGIN}/tools`], [3, ORIGIN + PATH]]);
  function noRatings(value) {
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      assert(!/^(aggregateRating|ratingValue|ratingCount|reviewCount|review|reviews)$/i.test(key), `No ${key}`); noRatings(child);
    }
  }
  noRatings(documents);
});

await check("Five native FAQ disclosures contain visible summaries and complete SSR answers", () => {
  const dom = pageDom(runtime()), faqs = literal(initializer("page", "faqs"));
  const section = only(elements(dom, n => n.name === "section" && n.attribs["aria-labelledby"] === "csv-diff-faq-title"), "FAQ section");
  const details = elements(section, n => n.name === "details");
  assert.equal(details.length, 5); assert.equal(faqs.length, 5);
  for (const [index, detail] of details.entries()) {
    const summary = only(elements(detail, n => n.name === "summary"), "Native FAQ summary");
    assert.equal(collapse(text(summary, true)), faqs[index].question);
    assert.equal(text(only(elements(detail, n => n.name === "p"), "SSR answer")), faqs[index].answer);
    for (const node of [detail, summary]) { assert(!Object.hasOwn(node.attribs, "hidden")); assert.notEqual(node.attribs["aria-hidden"], "true"); }
  }
  assert.match(text(section), /20,000 data records/); assert.match(text(section), /no upload API, AI call or automatic data storage/);
  return { disclosures: 5, evidence: "SSR markup; painted visibility is a browser check" };
});

await check("SSR disables the complete fieldset, exposes a no-JS note and never submits files", () => {
  const rt = runtime(), dom = pageDom(rt), workspace = byId(dom, "csv-diff-workspace");
  const fieldset = only(elements(workspace, n => n.name === "fieldset"), "One controls fieldset");
  assert(Object.hasOwn(fieldset.attribs, "disabled"));
  const controls = elements(workspace, n => ["button", "input", "select", "textarea"].includes(n.name));
  assert(controls.length >= 12);
  assert(controls.every(control => elements(fieldset).includes(control)), "Every SSR control is disabled through its fieldset");
  assert.equal(elements(workspace, n => n.name === "form").length, 0);
  const note = only(elements(workspace, n => n.name === "noscript"), "No-JS note");
  assert.match(text(note), /JavaScript is needed to compare files locally/); assert.match(text(note), /No file is sent/);
  const buttons = elements(workspace, n => n.name === "button");
  for (const label of rt.load("samples").CSV_DIFF_SAMPLES.map(sample => sample.label)) assert(buttons.some(n => text(n) === label));
  for (const label of ["Inspect files", "Swap sides"]) assert(Object.hasOwn(only(buttons.filter(n => text(n).trim() === label), label).attribs, "disabled"));
  assert.equal(elements(workspace, n => n.attribs.id === "csv-results-title").length, 0);
  assert.equal(elements(workspace, n => n.attribs.download !== undefined).length, 0);
  for (const side of ["original", "updated"]) {
    assert.equal(byId(dom, `csv-${side}-file`).attribs.type, "file");
    assert.match(byId(dom, `csv-${side}-file`).attribs.accept, /\.csv,\.tsv,\.txt/);
    for (const [suffix, value] of [["delimiter", "auto"], ["encoding", "utf-8"]]) {
      const selected = only(elements(byId(dom, `csv-${side}-${suffix}`), n => n.name === "option" && Object.hasOwn(n.attribs, "selected")), "Selected default");
      assert.equal(selected.attribs.value, value);
    }
  }
});

await check("Actual inventory core counts and exact 8→7 stock values match the illustrative SSR table", () => {
  const rt = runtime(), engine = rt.load("engine"), sample = rt.load("samples").CSV_DIFF_SAMPLES.find(s => s.id === "inventory");
  const a = engine.parseCsv(sample.original), b = engine.parseCsv(sample.updated);
  assert.equal(a.rows.length, 3); assert.equal(b.rows.length, 3);
  const result = engine.compareTables(a, b, { keys: sample.keys, columns: engine.sharedHeaders(a, b), trimValues: false, ignoreCase: false });
  assert.deepEqual(plain(result.counts), { added: 1, removed: 1, changed: 1, unchanged: 1 });
  const expected = result.rows.map(row => [row.key[0], `${row.before?.values[a.headers.indexOf("stock")] ?? "—"} → ${row.after?.values[b.headers.indexOf("stock")] ?? "—"}`, row.status]);
  const dom = pageDom(rt), figure = only(elements(dom, n => n.name === "figure"), "Illustrative figure");
  assert.match(text(figure), /Illustrative example/);
  const body = only(elements(figure, n => n.name === "tbody"), "Demo table body");
  const actual = elements(body, n => n.name === "tr").map(row => elements(row, n => n.name === "td").map(n => collapse(text(n)).toLowerCase()));
  assert.deepEqual(actual, plain(expected));
  assert.match(text(dom), /stock from 8 to 7/);
  return { original: 3, updated: 3, resultRows: 4, counts: plain(result.counts) };
});

await check("Actual composite/duplicate examples reject ambiguous identities instead of inventing matches", () => {
  const rt = runtime(), engine = rt.load("engine"), { CsvDiffError } = rt.load("types"), samples = rt.load("samples").CSV_DIFF_SAMPLES;
  assert.deepEqual(Array.from(samples, sample => sample.id), ["inventory", "composite", "duplicate-keys"]);
  const compare = (sample, keys) => {
    const a = engine.parseCsv(sample.original), b = engine.parseCsv(sample.updated);
    return engine.compareTables(a, b, { keys, columns: engine.sharedHeaders(a, b), trimValues: false, ignoreCase: false });
  };
  const composite = samples.find(sample => sample.id === "composite");
  assert.throws(() => compare(composite, ["sku"]), error => error instanceof CsvDiffError && error.code === "INVALID_KEYS" && error.issues.length === 2);
  assert.deepEqual(plain(compare(composite, composite.keys).counts), { added: 1, removed: 1, changed: 1, unchanged: 1 });
  assert.throws(() => compare(samples.find(sample => sample.id === "duplicate-keys"), ["sku"]), error => {
    assert.equal(error.code, "INVALID_KEYS"); assert.deepEqual(plain(error.issues[0].records), [2, 3]); return true;
  });
});

await check("Page links point at real workflow routes and all Next links explicitly disable prefetch", () => {
  const rt = runtime(), dom = pageDom(rt), hrefs = elements(dom, n => n.name === "a").map(n => n.attribs.href);
  for (const href of ["/", "/tools", "/tools/diff-checker", "/tools/json-to-csv", "/tools/invoice-pdf-to-excel", "/privacy",
    "/blog/excel-csv-leading-zeros-2026", "/blog/excel-csv-special-characters-utf8"]) assert(hrefs.includes(href), href);
  for (const href of ["#csv-diff-workspace", "#csv-diff-how"]) { assert(hrefs.includes(href)); byId(dom, href.slice(1)); }
  assert.deepEqual(rt.links.map(link => link.href).sort(), hrefs.filter(href => href.startsWith("/")).sort());
  assert(rt.links.every(link => link.prefetch === false));
  assert.equal(elements(dom, n => n.name === "script" && n.attribs.src).length, 0);
  for (const anchor of elements(dom, n => n.name === "a" && /^https:/.test(n.attribs.href))) {
    assert.equal(anchor.attribs.target, "_blank"); assert.match(anchor.attribs.rel, /noopener/); assert.match(anchor.attribs.rel, /noreferrer/);
  }
});

await check("Actual catalogue, tools page and related cards expose CSV Diff with four meaningful peers", () => {
  const rt = runtime(), catalog = rt.load("catalog"), entry = only(catalog.toolCatalog.filter(t => t.slug === "csv-diff"), "CSV catalogue entry");
  assert.equal(entry.name, "CSV Diff Checker"); assert.equal(entry.category, "Formatters & Dev");
  assert.match(entry.description, /composite key/); assert.match(entry.description, /without uploads/);
  const peers = ["json-to-csv", "diff-checker", "invoice-pdf-to-excel", "json-formatter"];
  assert.deepEqual(Array.from(catalog.getRelatedTools("csv-diff"), t => t.slug), peers);
  for (const slug of ["json-to-csv", "diff-checker"]) assert(catalog.getRelatedTools(slug).some(t => t.slug === "csv-diff"));
  const related = parseDocument(markup(rt.load("related").RelatedTools));
  assert.deepEqual(elements(related, n => n.name === "a").map(n => n.attribs.href), ["/tools", ...peers.map(slug => `/tools/${slug}`)]);
  assert(rt.links.every(link => link.prefetch === false));
  const directory = parseDocument(markup(rt.load("toolsPage").default));
  const card = only(elements(directory, n => n.name === "a" && n.attribs.href === PATH), "Tools directory card");
  assert.match(text(card), /CSV Diff Checker/);
  const collection = only(schemas(directory), "Tools CollectionPage");
  assert(collection.mainEntity.itemListElement.some(t => t.url === ORIGIN + PATH));
});

await check("Manual llms.txt and chat catalogues include the link and direct data entry away from chat (AST only)", () => {
  function entry(name, field, value) {
    return literal(only(find(tree(name), node => ts.isObjectLiteralExpression(node)
      && ts.isStringLiteral(property(node, field) ?? {}) && property(node, field).text === value), `${name} entry`));
  }
  const llms = entry("llms", "href", PATH), chat = entry("chat", "slug", "csv-diff");
  assert.equal(llms.name, "CSV Diff Checker"); assert.match(llms.desc, /composite keys locally/); assert.match(llms.desc, /No uploads or AI/);
  assert.equal(chat.name, llms.name); assert.match(chat.desc, /private tool page, not this chat/);
  for (const key of ["csv", "diff", "key", "sku", "duplicate"]) assert(chat.keywords.includes(key));
  assert(source("llms").includes("${base}${tool.href}")); assert(source("chat").includes("Link: /tools/${t.slug}"));
  return { mode: "static data/link contract only; no GET/POST route or DB module executed" };
});

await check("CSV-specific CSP overrides the public policy and grants no external script/connect source", () => {
  const nodes = find(tree("nextConfig"), node => ts.isObjectLiteralExpression(node)
    && ts.isStringLiteral(property(node, "source") ?? {}));
  const specific = only(nodes.filter(n => property(n, "source").text === PATH), "CSV route policy");
  const global = only(nodes.filter(n => property(n, "source").text === "/(.*)"), "Public policy");
  assert(specific.pos > global.pos, "Later matching Next header wins");
  const headers = Object.fromEntries(literal(property(specific, "headers")).map(h => [h.key.toLowerCase(), h.value]));
  assert.equal(headers["referrer-policy"], "no-referrer");
  const entries = headers["content-security-policy"].split(";").map(v => v.trim().split(/\s+/));
  assert.equal(new Set(entries.map(([key]) => key)).size, entries.length);
  const policy = Object.fromEntries(entries.map(([key, ...values]) => [key, values]));
  assert.deepEqual(policy["script-src"], ["'self'", "'unsafe-inline'"]);
  for (const key of ["default-src", "connect-src", "font-src", "base-uri", "frame-ancestors"]) assert.deepEqual(policy[key], ["'self'"]);
  for (const key of ["frame-src", "object-src", "form-action"]) assert.deepEqual(policy[key], ["'none'"]);
  assert.deepEqual(policy["worker-src"], ["'self'", "blob:"]);
  assert.doesNotMatch(headers["content-security-policy"], /https?:|unsafe-eval|\*|goog|analytics/i);
  assert.match(headers["permissions-policy"], /camera=\(\).*microphone=\(\).*geolocation=\(\).*payment=\(\)/);
});

await check("Actual private shell SSR excludes public islands, root SW, translation and prefetched links", () => {
  for (const pathname of [PATH, `${PATH}/`]) {
    const rt = runtime(pathname);
    const body = React.createElement(rt.load("toolsLayout").default, null, React.createElement(rt.load("page").default));
    const dom = parseDocument(renderToStaticMarkup(React.createElement(rt.load("shell").SiteShell, null, body)));
    assert.deepEqual(rt.islands, []);
    assert.equal(elements(dom, n => n.name === "h1").length, 1);
    assert.equal(elements(dom, n => n.name === "main").length, 1);
    assert.equal(byId(dom, "main-content").attribs.tabindex, "-1");
    assert.equal(elements(dom, n => n.name === "header").length, 2, "Site header plus editorial hero");
    assert.equal(elements(dom, n => n.name === "footer").length, 1);
    assert(rt.links.length > 20); assert(rt.links.every(link => link.prefetch === false));
    assert(elements(dom, n => n.name === "img").every(n => n.attribs.src === "/logo.png" && n.attribs["data-test-unoptimized"] === "true"));
  }
  const publicRuntime = runtime("/tools");
  markup(publicRuntime.load("shell").SiteShell);
  for (const marker of ["root-service-worker", "translation", "reading-list"]) assert(publicRuntime.islands.includes(marker), `Positive public control: ${marker}`);
  assert(publicRuntime.islands.filter(name => name.startsWith("dynamic-")).length >= 3);
});

await check("Shell has capture-phase entry/exit navigation and history reload guards (source contract)", () => {
  const code = source("shell");
  assert.match(code, /privateToolPaths\s*=\s*new Set\([^;]*["']\/tools\/csv-diff["']/);
  assert.match(code, /document\.addEventListener\("click", navigate, true\)/);
  assert.match(code, /document\.removeEventListener\("click", navigate, true\)/);
  assert.match(code, /nextStudio !== studio[\s\S]*?event\.preventDefault\(\); event\.stopPropagation\(\); location\.assign\(url\.href\)/);
  assert.match(code, /if \(initialStudio !== studio\) location\.reload\(\)/);
  assert.match(code, /if \(initialStudio !== studio\) return null/);
  assert.match(code, /anchor\.hasAttribute\("download"\)/);
  return { evidence: "source guards; fresh browser documents are asserted separately" };
});

function serviceWorker({ clientUrl = `${ORIGIN}/tools`, offline = false } = {}) {
  const listeners = new Map(), calls = [];
  const response = { ok: true, clone() { return this; } };
  const context = vm.createContext({ URL,
    self: { location: { origin: ORIGIN }, clients: { get: async () => ({ url: clientUrl }) }, addEventListener: (name, fn) => listeners.set(name, fn) },
    caches: { open: async name => { calls.push(["open", name]); return {
      match: async request => { calls.push(["match", typeof request === "string" ? request : request.url]); return undefined; },
      put: async request => { calls.push(["put", request.url]); },
    }; } },
    fetch: async request => { calls.push(["fetch", request.url]); if (offline) throw new Error("Synthetic offline"); return response; },
    Response: { error: () => { calls.push(["fallback"]); return {}; } },
  }, { codeGeneration: { strings: false, wasm: false } });
  vm.runInContext(source("sw"), context, { filename: files.sw, timeout: 5000 });
  async function dispatch(path, referrer = "", clientId = "synthetic-client") {
    let reply;
    listeners.get("fetch")({ clientId, request: { method: "GET", url: ORIGIN + path, referrer,
      headers: { get: () => path.endsWith(".js") ? "*/*" : "text/html" } }, respondWith: value => { reply = value; } });
    return reply === undefined ? { intercepted: false } : { intercepted: true, response: await reply };
  }
  return { dispatch, calls, response };
}

await check("Actual root SW never intercepts CSV navigation or its route resources, even offline", async () => {
  for (const offline of [false, true]) {
    const sw = serviceWorker({ offline });
    for (const path of [PATH, `${PATH}/`, `${PATH}/opengraph-image`]) assert.deepEqual(await sw.dispatch(path), { intercepted: false });
    assert.deepEqual(sw.calls, [], "No cache read/write, fetch substitution or homepage fallback");
  }
});

await check("Actual root SW bypasses caches for private-client/referrer assets and cannot fall back to HOME", async () => {
  const asset = "/_next/static/chunks/csv-worker.js";
  for (const byReferrer of [false, true]) {
    const options = { clientUrl: byReferrer ? `${ORIGIN}/tools` : ORIGIN + PATH };
    const sw = serviceWorker(options), referrer = byReferrer ? ORIGIN + PATH : "";
    const result = await sw.dispatch(asset, referrer);
    assert.equal(result.intercepted, true); assert.strictEqual(result.response, sw.response);
    assert.deepEqual(sw.calls, [["fetch", ORIGIN + asset]]);
    const failed = serviceWorker({ ...options, offline: true });
    await assert.rejects(failed.dispatch(asset, referrer), /Synthetic offline/);
    assert.deepEqual(failed.calls, [["fetch", ORIGIN + asset]]);
  }
  const publicSw = serviceWorker(); await publicSw.dispatch(asset);
  assert.deepEqual(publicSw.calls.map(([operation]) => operation), ["open", "match", "fetch", "put"], "Public positive control exercises the real handler");
});

await check("Actual next/og rasterizes the social image to a nonempty 1200×630 PNG without HTTP", async () => {
  const restores = [], attempts = [], embedded = [];
  function replace(object, key, value) { const original = object[key]; object[key] = value; restores.push(() => { object[key] = original; }); }
  const deny = name => () => { attempts.push(name); throw new Error(`Offline PNG blocked ${name}`); };
  for (const [object, names] of [[http, ["request", "get"]], [https, ["request", "get"]], [net, ["connect", "createConnection"]],
    [net.Socket.prototype, ["connect"]], [tls, ["connect"]]]) for (const name of names) replace(object, name, deny(name));
  replace(globalThis, "fetch", async resource => {
    const url = typeof resource === "string" ? resource : resource.url ?? String(resource);
    if (/^data:application\/octet-stream;base64,[A-Za-z0-9+/=]+$/.test(url)) {
      const bytes = Buffer.from(url.slice(url.indexOf(",") + 1), "base64"); embedded.push(bytes.length);
      return new Response(bytes, { headers: { "content-type": "application/octet-stream" } });
    }
    return deny("non-embedded fetch")();
  });
  let timer;
  try {
    const { ImageResponse } = require("next/og");
    const image = runtime(PATH, ImageResponse).load("image");
    assert.deepEqual(plain(image.size), { width: 1200, height: 630 }); assert.equal(image.contentType, "image/png");
    const response = image.default(); assert.equal(response.status, 200); assert.match(response.headers.get("content-type"), /^image\/png/);
    const buffer = Buffer.from(await Promise.race([response.arrayBuffer(), new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error("Offline PNG rendering exceeded 30 seconds")), 30_000);
    })]));
    assert.deepEqual([...buffer.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
    const dimensions = await sharp(buffer).metadata();
    assert.equal(dimensions.format, "png"); assert.equal(dimensions.width, 1200); assert.equal(dimensions.height, 630);
    assert(buffer.length > 10_000); assert((await sharp(buffer).stats()).channels.some(channel => channel.stdev > 10));
    assert.deepEqual(attempts, []);
    return { format: "png", width: dimensions.width, height: dimensions.height, bytes: buffer.length, embeddedWasmDecodes: embedded.length, outboundAttempts: attempts.length };
  } finally { clearTimeout(timer); for (const restore of restores.reverse()) restore(); }
});

const failed = results.filter(result => result.status === "FAIL").length;
console.log(JSON.stringify({ suite: "csv-diff-offline-ui", total: results.length, passed: results.length - failed, failed,
  browserRun: false, environmentFilesRead: false, databaseAccess: false, results }, null, 2));
if (failed) process.exitCode = 1;