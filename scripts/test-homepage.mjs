// Synthetic/unit checks only. Never import the real DB module or load .env files.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import vm from "node:vm";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { drizzle } from "drizzle-orm/pg-proxy";
import { parseDocument } from "htmlparser2";
import { findAll, textContent } from "domutils";
import ts from "typescript";
import { previewHomePosts } from "./homepage-fixtures.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = path => readFileSync(join(root, path), "utf8");
const require = createRequire(import.meta.url);
const dbBoundary = { db: null };
const css = new Proxy({}, { get: (_, key) => key === "__esModule" ? false : String(key) });
let records = previewHomePosts.map(post => ({ ...post, createdAt: new Date(post.createdAt) }));
const blocked = () => { throw new Error("Unexpected environment/network/storage access"); };
const sandbox = { URL, Date, Intl, console: { log: blocked, warn: blocked, error: blocked } };
for (const name of ["process", "fetch", "window", "document", "localStorage", "setTimeout"]) Object.defineProperty(sandbox, name, { get: blocked });
const context = vm.createContext(sandbox, { codeGeneration: { strings: false, wasm: false } });
const modules = new Map();
const libs = new Set(["lucide-react", "react/jsx-runtime", "drizzle-orm", "drizzle-orm/pg-core"]);
const owned = new Set(["src/lib/homepage.ts", "src/lib/homepage-data.ts", "src/lib/tool-catalog.ts", "src/lib/db/schema.ts", "src/lib/image-studio/brand.ts", "src/app/page.tsx"]);
function load(path) {
  assert(owned.has(path), `Unexpected application import: ${path}`);
  if (modules.has(path)) return modules.get(path).exports;
  const compiled = ts.transpileModule(read(path), { fileName: path, reportDiagnostics: true, compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, isolatedModules: true,
  } });
  assert.equal(compiled.diagnostics?.length ?? 0, 0);
  const record = { exports: {} }; modules.set(path, record);
  const resolve = name => {
    if (libs.has(name)) return require(name);
    if (name === "./db") return dbBoundary;
    if (name === "./db/schema") return load("src/lib/db/schema.ts");
    if (name === "./tool-catalog" || name === "@/lib/tool-catalog") return load("src/lib/tool-catalog.ts");
    if (name === "@/lib/image-studio/brand") return load("src/lib/image-studio/brand.ts");
    if (name === "@/lib/homepage") return load("src/lib/homepage.ts");
    if (name === "@/lib/homepage-data") return { getHomepagePosts: async () => records };
    if (name === "@/lib/config") return { siteConfig: { url: "https://www.byteverse.fyi", name: "ByteVerse" } };
    if (name === "next/link") return function MockLink({ prefetch, ...props }) { return React.createElement("a", { ...props, "data-prefetch": String(prefetch) }); };
    if (name === "next/image") return function MockImage({ fill, ...props }) { return React.createElement("img", { ...props, "data-fill": String(fill) }); };
    if (name === "@/components/homepage-newsletter") return { HomepageNewsletter: () => React.createElement("div", { "data-newsletter-test-stub": true }) };
    if (name === "./home.module.css") return css;
    throw new Error(`Blocked dependency: ${name}`);
  };
  new vm.Script(`(function(exports, require, module) {${compiled.outputText}\n})`, { filename: path }).runInContext(context)(record.exports, resolve, record);
  return record.exports;
}
const home = load("src/lib/homepage.ts"), catalog = load("src/lib/tool-catalog.ts"), data = load("src/lib/homepage-data.ts"), page = load("src/app/page.tsx");
const plain = value => JSON.parse(JSON.stringify(value));
const elements = (doc, match) => findAll(node => node.type === "tag" && match(node), doc.children);

test("curated tools resolve to unique, real catalog destinations", () => {
  assert.equal(home.homepageTools.length, 8);
  assert.equal(new Set(home.homepageTools.map(tool => tool.slug)).size, 8);
  assert.equal(catalog.toolCatalog.length, 42);
  for (const tool of home.homepageTools) {
    const entry = catalog.toolCatalog.find(item => item.slug === tool.slug);
    assert.equal(entry.name, tool.name);
    assert.equal(tool.href, `/tools/${entry.slug}`);
    assert(existsSync(join(root, "src/app/tools", entry.slug, "page.tsx")), tool.slug);
  }
  assert.match(home.homepageTools.find(tool => tool.slug === "invoice-pdf-to-excel").detail, /No OCR/);
  assert.match(home.homepageTools.find(tool => tool.slug === "plagiarism-checker").detail, /Not a web plagiarism scan/);
});

test("homepage copy and schema have accurate scope, stable IDs and no phantom search", () => {
  const schema = home.getHomepageStructuredData("https://www.byteverse.fyi///");
  assert.deepEqual(plain(schema["@graph"].map(entity => entity["@type"])), ["Organization", "WebSite", "WebPage"]);
  for (const entity of schema["@graph"]) assert(entity["@id"].startsWith("https://www.byteverse.fyi/#"));
  assert.equal(schema["@graph"][2].isPartOf["@id"], schema["@graph"][1]["@id"]);
  assert.equal(schema["@graph"][1].publisher["@id"], schema["@graph"][0]["@id"]);
  assert(!/SearchAction|FAQPage|AggregateRating|Review|search_term_string/.test(JSON.stringify(schema)));
  assert(!/100%|no usage limits|tested every|tested guides|never sent to a server/i.test(JSON.stringify(home.homepageQuestions)));
  assert.equal(page.metadata.title.absolute, home.homepageMeta.title);
  assert.equal(page.metadata.description, home.homepageMeta.description);
  assert.equal(page.metadata.alternates.canonical, "https://www.byteverse.fyi/");
  assert(home.homepageMeta.description.length < 170);
});

test("JSON-LD serializer prevents script termination", () => {
  const schema = home.getHomepageStructuredData("https://www.byteverse.fyi");
  schema["@graph"][0].name = "</script><script>alert('test')</script>";
  const serialized = home.serializeHomepageJsonLd(schema);
  assert(!serialized.includes("<"));
  assert.equal(JSON.parse(serialized)["@graph"][0].name, schema["@graph"][0].name);
});

test("covers accept configured HTTPS hosts and reject unsafe or unsupported sources", () => {
  for (const input of ["/blog/sample.png", "https://res.cloudinary.com/demo/image/upload/image.webp", "https://images.unsplash.com/test?w=640"]) assert.equal(home.getHomepageCover(input), input);
  for (const input of [null, "", "relative.png", "//example.com/a.png", "https://evil.example/a.png", "javascript:alert(1)", "data:image/png;base64,x", "http://www.byteverse.fyi/a.png", "https://user@www.byteverse.fyi/a.png", "/image.svg", "/\\evil.example/a.png", "https://www.byteverse.fyi:3000/a.png"]) assert.equal(home.getHomepageCover(input), null, input);
  assert.equal(home.formatHomepageDate(new Date("2026-10-18T00:00:00Z")), "Oct 18, 2026");
});

test("one bounded SQL query selects compact fields, published/due posts and global newest ordering", () => {
  const query = data.createHomepagePostQuery(drizzle(blocked), new Date("2026-10-18T00:00:00Z")).toSQL();
  assert.match(query.sql, /^select /);
  assert(!/\*|"content"|"views"|"keywords"|"summary"|distinct on/i.test(query.sql));
  assert.match(query.sql, /left join "categories"/);
  assert.match(query.sql, /"posts"\."published" = \$1/);
  assert.match(query.sql, /"posts"\."created_at" <= \$2/);
  assert.match(query.sql, /"posts"\."scheduled_at" is null or "posts"\."scheduled_at" <= \$3/);
  assert.match(query.sql, /order by "posts"\."created_at" desc, "posts"\."id" desc limit \$4$/);
  assert.equal(query.params[0], true);
  assert.equal(query.params.at(-1), 6);
});

test("DB missing/empty returns no fictional records; query failures are sanitized and propagate for ISR", async () => {
  assert.deepEqual(plain(await data.getHomepagePosts()), []);
  let calls = 0;
  dbBoundary.db = drizzle(async () => { calls++; return { rows: [] }; });
  assert.deepEqual(plain(await data.getHomepagePosts()), []);
  assert.equal(calls, 1);
  dbBoundary.db = drizzle(async () => { throw new Error("synthetic-sensitive-connection-detail"); });
  await assert.rejects(data.getHomepagePosts(), /^Error: Homepage articles could not be loaded\.$/);
  dbBoundary.db = null;
});

test("server-rendered homepage has a single H1, real anchors, lazy covers, non-nested article links", async () => {
  const html = renderToStaticMarkup(await page.default());
  const doc = parseDocument(html);
  assert.equal(elements(doc, node => node.name === "h1").length, 1);
  assert.equal(textContent(elements(doc, node => node.name === "h1")[0]), "Free developer tools. Practical tech guides.");
  assert.equal(elements(doc, node => node.name === "article").length, 6);
  assert.equal(elements(doc, node => node.name === "details").length, 3);
  assert.equal(elements(doc, node => node.name === "a" && elements(node, child => ["button", "a", "input"].includes(child.name)).length > 0).length, 0);
  for (const img of elements(doc, node => node.name === "img")) {
    assert.equal(img.attribs.loading, "lazy"); assert(img.attribs.sizes); assert.equal(img.attribs.alt, "");
  }
  for (const link of elements(doc, node => node.name === "a")) {
    assert.equal(link.attribs["data-prefetch"], "false");
    if (link.attribs.href.startsWith("#")) assert.equal(elements(doc, node => node.attribs.id === link.attribs.href.slice(1)).length, 1);
  }
  assert(!/100%|55\+|tested every|100% Client-Side|no usage limits|Popular Articles|SearchAction/i.test(html));
  assert(!/json-parse-large-numbers-precision|n8n-binary-data-not-found|webp-larger-than-jpg/.test(html));
  assert.equal(elements(doc, node => node.name === "figure")[0].children[0].name, "figcaption");
});

test("empty and missing-cover rendering keep useful navigation without invented posts", async () => {
  const saved = records;
  records = [];
  let doc = parseDocument(renderToStaticMarkup(await page.default()));
  assert.equal(elements(doc, node => node.name === "article").length, 0);
  assert(textContent(doc).includes("Explore the blog"));
  records = [{ ...saved[0], coverImage: null, categoryName: null, readingTime: null }];
  doc = parseDocument(renderToStaticMarkup(await page.default()));
  assert.equal(elements(doc, node => node.name === "img").length, 0);
  assert(textContent(doc).includes("Tech guide"));
  records = saved;
});

test("private image-tool isolation and analytics configuration remain present", () => {
  const shell = read("src/components/site-shell.tsx");
  assert.match(shell, /initialStudio !== studio\) location\.reload\(\)/);
  assert.match(shell, /nextStudio !== studio/);
  assert.match(shell, /if \(initialStudio !== studio\) return null/);
  assert.match(shell, /if \(studio\) return[^\n]*<Header localTool[^\n]*<Footer localTool/);
  assert.match(shell, /<Chatbot \/><ServiceWorkerRegister \/><AdSense \/><GoogleAnalytics \/>/);
});

test("homepage colors derive from the shared site theme instead of a separate palette", () => {
  const styles = read("src/app/home.module.css");
  const global = read("src/app/globals.css");
  const newsletter = read("src/components/homepage-newsletter.module.css");
  for (const [local, shared] of [["accent", "accent"], ["ink", "foreground"], ["muted", "muted-foreground"], ["panel", "muted"]]) {
    assert(styles.includes(`--home-${local}: var(--${shared});`));
  }
  assert.match(global, /--brand-violet: #8b5cf6/);
  assert.match(global, /--brand-pink: #ec4899/);
  assert.match(styles, /max-width: 72rem/);
  assert.match(styles, /forced-colors: active/);
  assert.match(newsletter, /background: var\(--home-action\)/);
  assert(!/#(?:234cdb|121d32|1d2c29|c6dfb5|a3bcff|adb9cf)/i.test(styles + newsletter));
});

test("existing article drafts retain their recorded LF-normalized content hashes", () => {
  for (const [slug, hash] of [
    ["json-parse-large-numbers-precision", "99ed536da2af89e7a8e6bc344939dcf70809f61a661be1004a8a648e0d33bef3"],
    ["n8n-binary-data-not-found", "381203d55c390b19595262e41dda6e2716b84f3d335ae38efb85d7baf12dfb66"],
    ["webp-larger-than-jpg", "fb0cce2e06e6393e3cb4805a231b6aaab65b4691c9440e8770800e496f45454e"],
  ]) assert.equal(createHash("sha256").update(read(`scripts/content/${slug}.md`).replace(/\r\n?/g, "\n").trim()).digest("hex"), hash, slug);
});