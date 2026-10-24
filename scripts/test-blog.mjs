// Synthetic/unit checks for the blog index. Never import the real DB module or load .env files.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
const blocked = () => { throw new Error("Unexpected environment/network/storage access"); };
const sandbox = { URL, Date, Intl, console: { log: blocked, warn: blocked, error: blocked } };
for (const name of ["process", "fetch", "window", "document", "localStorage", "setTimeout"]) Object.defineProperty(sandbox, name, { get: blocked });
const context = vm.createContext(sandbox, { codeGeneration: { strings: false, wasm: false } });
const modules = new Map();
const libs = new Set(["lucide-react", "react/jsx-runtime", "drizzle-orm", "drizzle-orm/pg-core"]);
const owned = new Set(["src/lib/blog.ts", "src/lib/blog-data.ts", "src/lib/homepage.ts", "src/lib/tool-catalog.ts", "src/lib/db/schema.ts", "src/lib/image-studio/brand.ts", "src/app/blog/page.tsx"]);

const categories = [
  { id: 1, name: "AI Tools", slug: "ai-tools", color: "#8b5cf6", count: 12 },
  { id: 2, name: "Coding", slug: "coding", color: "#f59e0b", count: 9 },
  { id: 3, name: "Tech Guides", slug: "tech-guides", color: "#3b82f6", count: 7 },
  { id: 4, name: "Productivity", slug: "productivity", color: "javascript:alert(1)", count: 3 },
  { id: 5, name: "Software Reviews", slug: "software-reviews", color: "#ef4444", count: 2 },
  { id: 6, name: "Cybersecurity", slug: "cybersecurity", color: "#06b6d4", count: 1 },
  { id: 7, name: "Archive", slug: "archive", color: "#111111", count: 0 },
];
const basePosts = previewHomePosts.map(post => ({ ...post, createdAt: new Date(post.createdAt) }));
const makePosts = size => Array.from({ length: size }, (_, index) => {
  const source = basePosts[index % basePosts.length];
  return { ...source, id: 990000 + index, slug: `${source.slug}-${index}`, categorySlug: categories[index % 6].slug, categoryName: categories[index % 6].name };
});
let index = null;
const setIndex = (posts, page, total, extra = {}) => {
  index = { posts, page, total, totalPages: Math.ceil(total / 30), popular: posts.slice(0, 5).map(({ id, title, slug, readingTime, createdAt }) => ({ id, title, slug, readingTime, createdAt })), categories, ...extra };
};

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
    if (name === "./blog" || name === "@/lib/blog") return load("src/lib/blog.ts");
    if (name === "./homepage" || name === "@/lib/homepage") return load("src/lib/homepage.ts");
    if (name === "./tool-catalog" || name === "@/lib/tool-catalog") return load("src/lib/tool-catalog.ts");
    if (name === "@/lib/image-studio/brand") return load("src/lib/image-studio/brand.ts");
    if (name === "@/lib/blog-data") return { getBlogIndex: async page => { assert.equal(page, index.page); return index; } };
    if (name === "@/lib/config") return { siteConfig: { url: "https://www.byteverse.fyi", name: "ByteVerse", author: "ByteVerse Team" } };
    if (name === "next/link") return function MockLink({ prefetch, ...props }) { return React.createElement("a", { ...props, "data-prefetch": String(prefetch) }); };
    if (name === "next/image") return function MockImage({ fill, ...props }) { return React.createElement("img", { ...props, "data-fill": String(fill) }); };
    if (name === "@/components/homepage-newsletter") return { HomepageNewsletter: () => React.createElement("div", { "data-newsletter-test-stub": true }) };
    if (name === "./blog-premium.module.css") return css;
    throw new Error(`Blocked dependency: ${name}`);
  };
  new vm.Script(`(function(exports, require, module) {${compiled.outputText}\n})`, { filename: path }).runInContext(context)(record.exports, resolve, record);
  return record.exports;
}
const blog = load("src/lib/blog.ts"), data = load("src/lib/blog-data.ts"), page = load("src/app/blog/page.tsx");
const plain = value => JSON.parse(JSON.stringify(value));
const elements = (doc, match) => findAll(node => node.type === "tag" && match(node), doc.children);
const render = async currentPage => parseDocument(renderToStaticMarkup(await page.default({ searchParams: Promise.resolve({ page: currentPage }) })));

test("page parsing, paths and pagination windows are bounded and canonical", () => {
  for (const [input, expected] of [[undefined, 1], ["", 1], ["0", 1], ["-3", 1], ["abc", 1], ["2", 2], [["4", "9"], 4], ["1e3", 1], ["00012", 12], ["999999", 1], ["5000", 5000]]) assert.equal(blog.parseBlogPage(input), expected, String(input));
  assert.equal(blog.blogPath(1), "/blog");
  assert.equal(blog.blogPath(0), "/blog");
  assert.equal(blog.blogPath(3), "/blog?page=3");
  assert.deepEqual(plain(blog.blogPageWindow(1, 1)), [1]);
  assert.deepEqual(plain(blog.blogPageWindow(2, 7)), [1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(plain(blog.blogPageWindow(1, 12)), [1, 2, "gap", 12]);
  assert.deepEqual(plain(blog.blogPageWindow(6, 12)), [1, "gap", 5, 6, 7, "gap", 12]);
  assert.deepEqual(plain(blog.blogPageWindow(12, 12)), [1, "gap", 11, 12]);
  assert.deepEqual(plain(blog.blogPageWindow(1, 0)), []);
  assert.equal(blog.safeCategoryColor("#8B5CF6", "#000000"), "#8B5CF6");
  for (const bad of ["javascript:alert(1)", "red", "#fff", "#12345g", "", null, undefined, "#8b5cf6; background: url(x)"]) assert.equal(blog.safeCategoryColor(bad, "#2563eb"), "#2563eb", String(bad));
});

test("metadata and structured data describe the archive page accurately", () => {
  assert.equal(blog.getBlogMeta(1).title, "Blog: AI, Coding & Tech Guides | ByteVerse");
  assert.match(blog.getBlogMeta(4).title, /page 4/);
  assert(blog.getBlogMeta(1).description.length < 170);
  setIndex(makePosts(30), 2, 70);
  const schema = blog.getBlogStructuredData("https://www.byteverse.fyi///", index);
  assert.equal(schema["@type"], "CollectionPage");
  assert.equal(schema.url, "https://www.byteverse.fyi/blog?page=2");
  assert.equal(schema.isPartOf["@id"], "https://www.byteverse.fyi/#website");
  assert.equal(schema.mainEntity.numberOfItems, 70);
  assert.equal(schema.mainEntity.itemListElement.length, 10);
  assert.equal(schema.mainEntity.itemListElement[0].position, 31);
  assert.equal(schema.mainEntity.itemListElement[0].url, `https://www.byteverse.fyi/blog/${index.posts[0].slug}`);
  assert(!/SearchAction|FAQPage|AggregateRating/.test(JSON.stringify(schema)));
  index.posts[0].title = "</script><script>alert('x')</script>";
  const serialized = blog.serializeJsonLd(blog.getBlogStructuredData("https://www.byteverse.fyi", index));
  assert(!serialized.includes("<"));
  assert.equal(JSON.parse(serialized).mainEntity.itemListElement[0].name, index.posts[0].title);
});

test("archive queries are bounded, compact and share the homepage publication rule", () => {
  const now = new Date("2026-10-22T00:00:00Z");
  const queries = data.createBlogIndexQueries(drizzle(blocked), 3, now);
  const list = queries.list.toSQL();
  assert.match(list.sql, /^select /);
  assert(!/\*|"content"|"keywords"|"summary"/i.test(list.sql));
  assert.match(list.sql, /left join "categories"/);
  assert.match(list.sql, /"posts"\."published" = \$1/);
  assert.match(list.sql, /"posts"\."created_at" <= \$2/);
  assert.match(list.sql, /"posts"\."scheduled_at" is null or "posts"\."scheduled_at" <= \$3/);
  assert.match(list.sql, /order by "posts"\."created_at" desc, "posts"\."id" desc limit \$4 offset \$5$/);
  assert.deepEqual(list.params.slice(3), [30, 60]);
  const total = queries.total.toSQL();
  assert.match(total.sql, /^select count\(\*\)/);
  assert.match(total.sql, /"posts"\."published" = \$1/);
  assert.match(total.sql, /"posts"\."scheduled_at" is null/);
  const popular = queries.popular.toSQL();
  assert(!/"content"|"excerpt"/.test(popular.sql));
  assert.match(popular.sql, /order by "posts"\."views" desc, "posts"\."created_at" desc, "posts"\."id" desc limit \$4$/);
  assert.equal(popular.params.at(-1), 5);
  const counts = queries.categoryCounts.toSQL();
  assert.match(counts.sql, /from "categories" left join "posts" on \("posts"\."category_id" = "categories"\."id" and \("posts"\."published" = \$1/);
  assert.match(counts.sql, /group by "categories"\."id"/);
  assert.match(counts.sql, /order by count\("posts"\."id"\) desc, "categories"\."name"$/);
});

test("DB missing/empty returns no fictional records; query failures are sanitized and propagate for ISR", async () => {
  assert.deepEqual(plain(await data.getBlogIndex(2)), { posts: [], popular: [], categories: [], total: 0, page: 2, totalPages: 0 });
  let calls = 0;
  dbBoundary.db = drizzle(async () => { calls++; return { rows: [] }; });
  const empty = plain(await data.getBlogIndex(1));
  assert.deepEqual(empty, { posts: [], popular: [], categories: [], total: 0, page: 1, totalPages: 0 });
  assert.equal(calls, 4);
  dbBoundary.db = drizzle(async () => { throw new Error("synthetic-sensitive-connection-detail"); });
  await assert.rejects(data.getBlogIndex(1), /^Error: Blog articles could not be loaded\.$/);
  dbBoundary.db = null;
});

test("first archive page renders one H1, a lead story, 29 feed cards, safe category colours and pagination", async () => {
  setIndex(makePosts(30), 1, 170);
  const doc = await render(undefined);
  const html = renderToStaticMarkup(await page.default({ searchParams: Promise.resolve({}) }));
  assert.equal(elements(doc, node => node.name === "h1").length, 1);
  assert.equal(textContent(elements(doc, node => node.name === "h1")[0]), "Guides that fix real problems.");
  assert.equal(elements(doc, node => node.name === "article").length, 30);
  assert.equal(elements(elements(doc, node => node.attribs.id === "featured-story")[0], node => node.name === "article").length, 1);
  assert.equal(elements(doc, node => node.name === "aside").length, 1);
  assert.equal(elements(doc, node => node.name === "a" && elements(node, child => ["button", "a", "input"].includes(child.name)).length > 0).length, 0);
  for (const [position, img] of elements(doc, node => node.name === "img").entries()) {
    assert.equal(img.attribs.loading, position === 0 ? "eager" : "lazy"); assert(img.attribs.sizes); assert.equal(img.attribs.alt, "");
    assert.equal(img.attribs.fetchpriority, position === 0 ? "high" : undefined);
  }
  for (const link of elements(doc, node => node.name === "a")) {
    assert.equal(link.attribs["data-prefetch"], "false");
    if (link.attribs.href.startsWith("#")) assert.equal(elements(doc, node => node.attribs.id === link.attribs.href.slice(1)).length, 1);
  }
  assert.equal(new Set(elements(doc, node => node.name === "a" && node.attribs.href.startsWith("/blog/")).map(node => node.attribs.href)).size, 30);
  assert.equal(elements(doc, node => node.attribs["data-blog-tool"]).length, 3);
  assert.equal(elements(doc, node => node.attribs["aria-label"] === "Browse by category").length, 1);
  assert.equal(elements(doc, node => node.attribs.href === "/category/archive").length, 1, "Empty categories stay in the directory but not the tiles");
  assert(!html.includes("javascript:"), "Unsafe category colour must not reach a style attribute");
  assert(html.includes("--tile-color:#2563eb"));
  assert(html.includes("--tile-color:#8b5cf6"));
  const pagination = elements(doc, node => node.attribs["aria-label"] === "Pagination")[0];
  assert(pagination);
  assert.equal(elements(pagination, node => node.attribs["aria-current"] === "page").length, 1);
  assert.equal(elements(pagination, node => node.attribs.rel === "next")[0].attribs.href, "/blog?page=2");
  assert.equal(elements(pagination, node => node.attribs.rel === "prev").length, 0);
  assert.deepEqual(elements(pagination, node => node.name === "a" && /^\d+$/.test(textContent(node))).map(node => node.attribs.href), [2, 3, 4, 5, 6].map(entry => `/blog?page=${entry}`));
  assert.equal(elements(doc, node => node.name === "ol").length, 1);
  assert(!/Popular Articles|FolderOpen|100%|tested, verified/i.test(html));
  assert(html.indexOf('id="trending"') < html.indexOf('id="articles"'));
});

test("later archive pages, out-of-range pages and missing data stay honest and navigable", async () => {
  setIndex(makePosts(30), 3, 170);
  let doc = await render("3");
  assert.equal(elements(doc, node => node.name === "article").length, 30);
  assert.equal(elements(doc, node => node.attribs.id === "featured-story").length, 0);
  assert(textContent(doc).includes("Archive, page 3."));
  const pagination = elements(doc, node => node.attribs["aria-label"] === "Pagination")[0];
  assert.equal(elements(pagination, node => node.attribs.rel === "prev")[0].attribs.href, "/blog?page=2");
  assert.equal(elements(pagination, node => node.attribs.rel === "next")[0].attribs.href, "/blog?page=4");
  assert.equal(textContent(elements(pagination, node => node.attribs["aria-current"] === "page")[0]), "3");
  setIndex([], 9, 170);
  doc = await render("9");
  assert.equal(elements(doc, node => node.name === "article").length, 0);
  assert(textContent(doc).includes("Nothing on this page."));
  assert.equal(elements(doc, node => node.attribs.href === "/blog").length >= 1, true);
  setIndex([], 1, 0, { popular: [], categories: [] });
  doc = await render(undefined);
  assert.equal(elements(doc, node => node.name === "article").length, 0);
  assert.equal(elements(doc, node => node.name === "img").length, 0);
  assert(textContent(doc).includes("New guides are on the way."));
  assert(textContent(doc).includes("Popular guides appear here as readers find them."));
  assert.equal(elements(doc, node => node.attribs["aria-label"] === "Pagination").length, 0);
  assert.equal(elements(doc, node => node.attribs["aria-label"] === "Browse by category").length, 0);
  const single = { ...makePosts(1)[0], coverImage: null, categoryName: null, categorySlug: null, readingTime: null };
  setIndex([single], 1, 1);
  doc = await render(undefined);
  assert.equal(elements(doc, node => node.name === "img").length, 0);
  assert(textContent(doc).includes("Tech guides"));
});

test("blog metadata matches the shared site identity and pagination canonicals", async () => {
  const first = await page.generateMetadata({ searchParams: Promise.resolve({}) });
  assert.equal(first.title.absolute, blog.getBlogMeta(1).title);
  assert.equal(first.alternates.canonical, "https://www.byteverse.fyi/blog");
  assert.equal(first.openGraph.images[0].url, "https://www.byteverse.fyi/opengraph-image");
  const later = await page.generateMetadata({ searchParams: Promise.resolve({ page: "7" }) });
  assert.equal(later.alternates.canonical, "https://www.byteverse.fyi/blog?page=7");
  assert.match(later.description, /Page 7/);
  assert.equal(page.revalidate, 21600);
});

test("blog colours derive from the shared site theme and reuse the homepage design tokens", () => {
  const styles = read("src/app/blog/blog-premium.module.css");
  const home = read("src/app/home-premium.module.css");
  for (const [local, shared] of [["accent", "accent"], ["ink", "foreground"], ["muted", "muted-foreground"], ["panel", "muted"], ["card", "card"], ["edge", "border"]]) {
    assert(styles.includes(`--home-${local}: var(--${shared});`));
    assert(home.includes(`--home-${local}: var(--${shared});`));
  }
  assert.match(styles, /max-width: 72rem/);
  assert.match(styles, /padding-inline: 1rem/);
  assert.match(styles, /forced-colors: active/);
  assert.match(styles, /prefers-reduced-motion: reduce/);
  assert.match(styles, /background: var\(--background\)/);
  assert.match(styles, /\.page :where\(a\)/);
  assert(!/#(?:234cdb|121d32|1d2c29|c6dfb5|a3bcff|adb9cf|0f172a(?![0-9a-f])|1e293b)/i.test(styles.replace(/color: #0f172a;/g, "")));
  const loading = read("src/app/blog/loading.tsx");
  assert(!/#0f172a|#1e293b|text-white/.test(loading));
});
