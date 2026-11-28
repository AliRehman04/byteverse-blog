// Synthetic/unit checks only. Never import the real DB module or load .env files.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
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
import { previewFeaturedPosts, previewHomePosts } from "./homepage-fixtures.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = path => readFileSync(join(root, path), "utf8");
const require = createRequire(import.meta.url);
const dbBoundary = { db: null };
const css = new Proxy({}, { get: (_, key) => key === "__esModule" ? false : String(key) });
const revive = posts => posts.map(post => ({ ...post, createdAt: new Date(post.createdAt) }));
let records = { featured: revive(previewFeaturedPosts), latest: revive(previewHomePosts) };
const blocked = () => { throw new Error("Unexpected environment/network/storage access"); };
const sandbox = { URL, Date, Intl, Map, Set, console: { log: blocked, warn: blocked, error: blocked } };
for (const name of ["process", "fetch", "window", "document", "localStorage", "setTimeout"]) Object.defineProperty(sandbox, name, { get: blocked });
const context = vm.createContext(sandbox, { codeGeneration: { strings: false, wasm: false } });
const modules = new Map();
const libs = new Set(["lucide-react", "react/jsx-runtime", "drizzle-orm", "drizzle-orm/pg-core"]);
const owned = new Set(["src/lib/homepage.ts", "src/lib/homepage-data.ts", "src/lib/tool-catalog.ts", "src/lib/tools-hub.ts", "src/lib/db/schema.ts", "src/lib/image-studio/brand.ts", "src/app/page.tsx"]);
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
    if (name === "./tools-hub" || name === "@/lib/tools-hub") return load("src/lib/tools-hub.ts");
    if (name === "@/lib/image-studio/brand") return load("src/lib/image-studio/brand.ts");
    if (name === "./homepage" || name === "@/lib/homepage") return load("src/lib/homepage.ts");
    if (name === "@/lib/homepage-data") return { getHomepagePosts: async () => load("src/lib/homepage.ts").arrangeHomepagePosts(records.featured, records.latest) };
    if (name === "@/lib/config") return { siteConfig: { url: "https://www.byteverse.fyi", name: "ByteVerse", author: "ByteVerse Team" } };
    if (name === "next/link") return function MockLink({ prefetch, ...props }) { return React.createElement("a", { ...props, "data-prefetch": String(prefetch) }); };
    if (name === "next/image") return function MockImage({ fill, ...props }) { return React.createElement("img", { ...props, "data-fill": String(fill) }); };
    if (name === "@/components/homepage-newsletter") return { HomepageNewsletter: () => React.createElement("div", { "data-newsletter-test-stub": true }) };
    if (name === "@/components/homepage-analytics") return { HomepageAnalytics: () => null };
    if (name === "@/components/homepage-tool-finder") return { HomepageToolFinder: ({ tools, placeholder }) => React.createElement("div", { "data-tool-search-count": tools.length, "data-placeholder": placeholder, "data-has-terms": String(tools.every(tool => tool.terms.includes(tool.name.toLowerCase()))) }) };
    if (name === "./home-premium.module.css") return css;
    throw new Error(`Blocked dependency: ${name}`);
  };
  new vm.Script(`(function(exports, require, module) {${compiled.outputText}\n})`, { filename: path }).runInContext(context)(record.exports, resolve, record);
  return record.exports;
}
const home = load("src/lib/homepage.ts"), catalog = load("src/lib/tool-catalog.ts"), hub = load("src/lib/tools-hub.ts"), data = load("src/lib/homepage-data.ts"), page = load("src/app/page.tsx");
const plain = value => JSON.parse(JSON.stringify(value));
const elements = (doc, match) => findAll(node => node.type === "tag" && match(node), doc.children);
const H1 = "Free online developer tools and practical tech guides";

test("featured tools, shortcuts and categories resolve to real catalog destinations", () => {
  assert.equal(home.homepageTools.length, 8);
  assert.equal(new Set(home.homepageTools.map(tool => tool.slug)).size, 8);
  const routes = readdirSync(join(root, "src/app/tools"), { withFileTypes: true })
    .filter(entry => entry.isDirectory() && existsSync(join(root, "src/app/tools", entry.name, "page.tsx")));
  assert.equal(catalog.toolCatalog.length, routes.length);
  for (const tool of home.homepageTools) {
    const entry = catalog.toolCatalog.find(item => item.slug === tool.slug);
    assert.equal(entry.name, tool.name);
    assert.equal(tool.href, `/tools/${entry.slug}`);
    assert(existsSync(join(root, "src/app/tools", entry.slug, "page.tsx")), tool.slug);
    assert(tool.detail.length <= 80, `Card copy stays short: ${tool.slug}`);
  }
  assert.match(home.homepageTools.find(tool => tool.slug === "plagiarism-checker").detail, /Not a web plagiarism scan/);
  assert.equal(home.homepageShortcuts.length, 5);
  for (const shortcut of home.homepageShortcuts) assert(existsSync(join(root, "src/app/tools", shortcut.slug, "page.tsx")) && shortcut.href === `/tools/${shortcut.slug}`);
  // Category cards carry verified counts and link to the anchors the tools page renders.
  assert.equal(home.homepageToolCategories.length, hub.hubCategories.length);
  assert.equal(home.homepageToolCategories.reduce((sum, category) => sum + category.count, 0), catalog.toolCatalog.length);
  const directory = read("src/app/tools/tools-directory.tsx");
  assert(directory.includes("id={entry.id}"), "The tools page must keep a section id per category");
  for (const category of home.homepageToolCategories) {
    assert(category.count > 0, `No empty category: ${category.title}`);
    assert.equal(category.href, `/tools#${hub.hubCategories.find(entry => entry.title === category.title).id}`);
    assert(category.examples.length > 0 && category.examples.every(name => catalog.toolCatalog.some(tool => tool.name === name && tool.category === category.title)));
  }
  for (const guide of home.featuredGuides) if (guide.tool) assert(existsSync(join(root, "src/app/tools", guide.tool, "page.tsx")), guide.tool);
  assert.deepEqual(plain(previewFeaturedPosts.map(post => post.slug).sort()), plain([...home.featuredGuideSlugs].sort()), "Preview fixtures must cover the curated guides");
});

test("homepage copy and schema have accurate scope, stable IDs and no phantom search", () => {
  const schema = home.getHomepageStructuredData("https://www.byteverse.fyi///");
  assert.deepEqual(plain(schema["@graph"].map(entity => entity["@type"])), ["Organization", "WebSite", "WebPage"]);
  for (const entity of schema["@graph"]) assert(entity["@id"].startsWith("https://www.byteverse.fyi/#"));
  assert.equal(schema["@graph"][2].isPartOf["@id"], schema["@graph"][1]["@id"]);
  assert.equal(schema["@graph"][1].publisher["@id"], schema["@graph"][0]["@id"]);
  assert.equal(schema["@graph"][0].founder.url, "https://www.byteverse.fyi/author/ali-rehman");
  assert.equal(schema["@graph"][0].contactPoint.email, "contact@byteverse.fyi");
  assert(!/SearchAction|FAQPage|AggregateRating|Review|search_term_string/.test(JSON.stringify(schema)));
  const copy = JSON.stringify([home.homepageQuestions, home.homepageBenefits, home.homepageHero, home.homepageStandards, home.homepageEditor, home.homepageMeta]);
  assert(!/100%|no usage limits|tested every|tested guides|never sent to a server|most trusted|millions|fastest|#1|number one|guarantee/i.test(copy));
  assert.equal(page.metadata.title.absolute, home.homepageMeta.title);
  assert.equal(home.homepageMeta.title, "Free Online Developer Tools & Tech Guides | ByteVerse");
  assert(home.homepageMeta.title.length <= 60);
  assert.equal(page.metadata.description, home.homepageMeta.description);
  assert.equal(page.metadata.alternates.canonical, "https://www.byteverse.fyi/");
  assert(home.homepageMeta.description.length >= 120 && home.homepageMeta.description.length <= 160);
  assert(home.homepageMeta.description.includes(`${catalog.toolCatalog.length} free online tools`), "The tool count comes from the catalog");
  assert(home.homepageHero.badge.startsWith(`${catalog.toolCatalog.length} free tools`));
  assert.equal(`${home.homepageHero.headingLead} ${home.homepageHero.headingAccent}`, H1);
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

test("two bounded SQL queries select compact fields for published, due posts", () => {
  const now = new Date("2026-10-18T00:00:00Z");
  const latest = data.createHomepagePostQuery(drizzle(blocked), now).toSQL();
  const featured = data.createFeaturedGuideQuery(drizzle(blocked), now).toSQL();
  for (const query of [latest, featured]) {
    assert.match(query.sql, /^select /);
    assert(!/\*|"content"|"views"|"keywords"|"summary"|distinct on/i.test(query.sql));
    assert.match(query.sql, /left join "categories"/);
    assert.match(query.sql, /"posts"\."published" = \$1/);
    assert.match(query.sql, /"posts"\."created_at" <= \$2/);
    assert.match(query.sql, /"posts"\."scheduled_at" is null or "posts"\."scheduled_at" <= \$3/);
    assert.match(query.sql, /"posts"\."author"/);
    assert.equal(query.params[0], true);
  }
  assert.match(latest.sql, /order by "posts"\."created_at" desc, "posts"\."id" desc limit \$4$/);
  assert.equal(latest.params.at(-1), home.LATEST_GUIDE_COUNT + home.featuredGuideSlugs.length);
  assert.match(featured.sql, /"posts"\."slug" in \(\$4, \$5, \$6, \$7, \$8, \$9\)/);
  assert.deepEqual(plain(featured.params.slice(3, 9)), plain(home.featuredGuideSlugs));
  assert.equal(featured.params.at(-1), home.featuredGuideSlugs.length);
});

test("curated guides keep editorial order and never repeat in the latest list", () => {
  const featured = revive(previewFeaturedPosts), newest = revive(previewHomePosts);
  const arranged = home.arrangeHomepagePosts(featured, [featured[2], ...newest, { ...newest[0], id: 1, slug: "not-curated" }]);
  assert.deepEqual(plain(arranged.featured.map(post => post.slug)), plain(home.featuredGuideSlugs));
  assert.equal(arranged.latest.length, home.LATEST_GUIDE_COUNT);
  assert(arranged.latest.every(post => !home.featuredGuideSlugs.includes(post.slug)));
  assert.deepEqual(plain(arranged.latest.map(post => post.slug)), plain(newest.slice(0, 6).map(post => post.slug)));
  const partial = home.arrangeHomepagePosts([featured[4], { ...featured[0], slug: "unknown-guide" }], newest);
  assert.deepEqual(plain(partial.featured.map(post => post.slug)), [featured[4].slug], "Only curated slugs are featured");
  assert.equal(home.getGuideTool("excel-csv-leading-zeros-2026").href, "/tools/csv-repair");
  assert.equal(home.getGuideTool("gemini-not-showing-google-docs-gmail-2026"), null);
});

test("DB missing/empty returns no fictional records; query failures are sanitized and propagate for ISR", async () => {
  assert.deepEqual(plain(await data.getHomepagePosts()), { featured: [], latest: [] });
  let calls = 0;
  dbBoundary.db = drizzle(async () => { calls++; return { rows: [] }; });
  assert.deepEqual(plain(await data.getHomepagePosts()), { featured: [], latest: [] });
  assert.equal(calls, 2);
  dbBoundary.db = drizzle(async () => { throw new Error("synthetic-sensitive-connection-detail"); });
  await assert.rejects(data.getHomepagePosts(), /^Error: Homepage articles could not be loaded\.$/);
  dbBoundary.db = null;
});

test("server-rendered homepage has a single H1, ordered sections, real anchors, lazy covers and no nested links", async () => {
  const html = renderToStaticMarkup(await page.default());
  const doc = parseDocument(html);
  assert.equal(elements(doc, node => node.name === "h1").length, 1);
  assert.equal(textContent(elements(doc, node => node.name === "h1")[0]), H1);
  assert.deepEqual(elements(doc, node => node.name === "h2").map(node => textContent(node)), [
    "Free tools to start with", "Browse tools by the job to be done", "Small tools that are honest about what they do", "Fix the problem in front of you",
    "Pick a topic and keep reading", "Latest guides", "New tools. Useful reads.", "A small, independent site", "Before you dive in", "Pick a tool, or find the fix.",
  ]);
  // Headings never skip a level: every h3 sits inside a section that has its own h2.
  for (const heading of elements(doc, node => node.name === "h3")) {
    let parent = heading.parent;
    while (parent && parent.name !== "section") parent = parent.parent;
    assert(parent && elements(parent, node => node.name === "h2").length > 0, textContent(heading));
  }
  assert.equal(elements(doc, node => node.name === "article").length, 12);
  assert.equal(elements(doc, node => node.name === "details").length, 4);
  assert.equal(elements(doc, node => node.name === "a" && elements(node, child => ["button", "a", "input"].includes(child.name)).length > 0).length, 0);
  const images = elements(doc, node => node.name === "img");
  assert.equal(images.length, 5, "Five of the six curated fixtures have a cover");
  for (const img of images) {
    assert.equal(img.attribs.loading, "lazy", "No image is above the fold, so none is eager");
    assert(img.attribs.sizes); assert.equal(img.attribs.alt, ""); assert.equal(img.attribs.fetchpriority, undefined);
  }
  for (const link of elements(doc, node => node.name === "a")) {
    assert.equal(link.attribs["data-prefetch"], "false");
    assert(link.attribs.href && !/^(javascript:|#$)/.test(link.attribs.href));
    if (link.attribs.href.startsWith("#")) assert.equal(elements(doc, node => node.attribs.id === link.attribs.href.slice(1)).length, 1);
  }
  assert(!/100%|55\+|tested every|100% Client-Side|no usage limits|Popular Articles|SearchAction|Most popular|most used/i.test(html));
  assert(!/json-parse-large-numbers-precision|n8n-binary-data-not-found|webp-larger-than-jpg/.test(html));
  const featured = elements(doc, node => node.attribs.id === "featured-stories")[0];
  assert(featured);
  assert.deepEqual(elements(featured, node => node.name === "article").map(article => elements(article, node => node.name === "a")[0].attribs.href.slice("/blog/".length)), plain(home.featuredGuideSlugs));
  assert.deepEqual(elements(featured, node => node.name === "a" && node.attribs.href.startsWith("/tools/")).map(node => node.attribs.href), ["/tools/csv-repair", "/tools/json-formatter"]);
  const latest = elements(doc, node => node.attribs.id === "latest-guides")[0];
  assert.equal(elements(latest, node => node.name === "article").length, 6);
  const articlePaths = elements(doc, node => node.name === "a" && node.attribs.href.startsWith("/blog/"));
  assert.equal(new Set(articlePaths.map(node => node.attribs.href)).size, 12);
  assert(!/canvas|<video|home-orbit|creative-orbit/.test(html));
  assert.equal(elements(doc, node => node.attribs["data-home-tool"]).length, 8);
  assert.equal(elements(doc, node => node.attribs["data-home-shortcut"]).length, 5);
  const categories = elements(doc, node => node.attribs["data-home-category"]);
  assert.equal(categories.length, 6);
  for (const category of categories) assert.equal(category.attribs.href, `/tools#${category.attribs["data-home-category"]}`);
  assert(textContent(categories[0]).includes("10 tools"));
  assert.equal(elements(doc, node => node.attribs["data-tool-search-count"] === String(catalog.toolCatalog.length) && node.attribs["data-has-terms"] === "true").length, 1);
  const order = ["home-title", "featured-tools", "tool-categories", "why-byteverse", "featured-stories", "topics", "latest-guides", "newsletter", "about-byteverse", "questions", "final-title"].map(id => html.indexOf(`id="${id}"`));
  assert(order.every((position, index) => position > 0 && (index === 0 || position > order[index - 1])), "Tools come before guides, trust and the closing call to action");
  // Every tracked link names its event and item, and the hero carries both calls to action.
  for (const node of elements(doc, node => "data-home-event" in node.attribs)) assert(node.name === "a" && node.attribs["data-home-label"], textContent(node));
  const hero = elements(doc, node => node.name === "section" && node.attribs["aria-labelledby"] === "home-title")[0];
  assert.deepEqual(elements(hero, node => node.attribs["data-home-event"] === "cta_click").map(node => [textContent(node).trim(), node.attribs.href]), [["Explore free tools", "/tools"], ["Browse tech guides", "/blog"]]);
  // The hero illustration is decoration: hidden from assistive technology, never translated, and without links or controls.
  const stage = elements(hero, node => node.attribs.translate === "no")[0];
  assert.equal(stage.attribs["aria-hidden"], "true");
  assert.equal(elements(stage, node => ["a", "button", "input", "img"].includes(node.name)).length, 0);
  assert(textContent(stage).includes(home.homepageMeta.title), "The title-checker card shows the real page title");
  for (const href of ["/about", "/contact", "/privacy", "/disclaimer", "/author/ali-rehman"]) assert(elements(doc, node => node.name === "a" && node.attribs.href === href).length >= 1, href);
  for (const topic of home.homepageTopics) assert.equal(elements(doc, node => node.name === "a" && node.attribs.href === `/category/${topic.slug}`).length, 1);
});

test("empty and missing-cover rendering keep useful navigation without invented posts", async () => {
  const saved = records;
  records = { featured: [], latest: [] };
  let doc = parseDocument(renderToStaticMarkup(await page.default()));
  assert.equal(elements(doc, node => node.name === "article").length, 0);
  assert.equal(elements(doc, node => node.attribs.id === "featured-stories").length, 0, "No empty featured section");
  assert(textContent(doc).includes("Explore the blog"));
  assert.equal(elements(doc, node => node.attribs["data-home-tool"]).length, 8, "Tools do not depend on the database");
  records = { featured: [{ ...saved.featured[0], coverImage: null, categoryName: null, readingTime: null }], latest: [] };
  doc = parseDocument(renderToStaticMarkup(await page.default()));
  assert.equal(elements(doc, node => node.name === "img").length, 0);
  assert(textContent(doc).includes("Tech guides"));
  records = saved;
});

test("private image-tool isolation and analytics configuration remain present", () => {
  const shell = read("src/components/site-shell.tsx");
  assert.match(shell, /initialStudio !== studio\) location\.reload\(\)/);
  assert.match(shell, /nextStudio !== studio/);
  assert.match(shell, /if \(initialStudio !== studio\) return null/);
  assert.match(shell, /if \(studio\) return[^\n]*<Header localTool[^\n]*<Footer localTool/);
  assert.match(shell, /<Chatbot \/><ServiceWorkerRegister \/><AdSense \/><GoogleAnalytics \/>/);
  // Homepage events reuse the existing tag; they never add a second analytics script or send form contents.
  const events = read("src/lib/homepage-events.ts") + read("src/components/homepage-analytics.tsx");
  assert(!/<Script|googletagmanager|createElement\("script"|localStorage|cookie|email/i.test(events));
  assert.match(read("src/components/homepage-tool-finder.tsx"), /search_term: term\.slice\(0, 40\)/);
});

test("homepage colors derive from the shared site theme instead of a separate palette", () => {
  const styles = read("src/app/home-premium.module.css");
  const global = read("src/app/globals.css");
  const newsletter = read("src/components/homepage-newsletter.module.css");
  const finder = read("src/components/homepage-tool-finder.module.css");
  for (const [local, shared] of [["accent", "accent"], ["ink", "foreground"], ["muted", "muted-foreground"], ["panel", "muted"], ["card", "card"], ["edge", "border"]]) {
    assert(styles.includes(`--home-${local}: var(--${shared});`));
  }
  assert.match(global, /--brand-violet: #8b5cf6/);
  assert.match(global, /--brand-pink: #ec4899/);
  assert.match(styles, /max-width: 72rem/);
  assert.match(styles, /forced-colors: active/);
  assert.match(styles, /prefers-reduced-motion: reduce/);
  assert.match(newsletter, /background: var\(--home-action\)/);
  assert(!/#[0-9a-f]{3,8}\b/i.test(finder.replace(/#000\b/g, "")), "The search box uses theme tokens only");
  assert(!/#(?:234cdb|121d32|1d2c29|c6dfb5|a3bcff|adb9cf)/i.test(styles + newsletter));
});

test("guide covers keep a fixed 16:9 frame without a percentage min-height", () => {
  const styles = read("src/app/home-premium.module.css");
  const media = /\.guideMedia \{([^}]*)\}/.exec(styles)?.[1] ?? "";
  assert.match(media, /aspect-ratio: 16 \/ 9/);
  assert(!/min-height/.test(media), "min-height with aspect-ratio transfers to width and once overflowed the text column");
  assert(!/line-clamp/.test(/\.guideTitle \{([^}]*)\}/.exec(styles)[1]), "Guide titles are never cut off");
});

test("existing article drafts retain their recorded LF-normalized content hashes", () => {
  for (const [slug, hash] of [
    ["json-parse-large-numbers-precision", "99ed536da2af89e7a8e6bc344939dcf70809f61a661be1004a8a648e0d33bef3"],
    ["n8n-binary-data-not-found", "381203d55c390b19595262e41dda6e2716b84f3d335ae38efb85d7baf12dfb66"],
    ["webp-larger-than-jpg", "fb0cce2e06e6393e3cb4805a231b6aaab65b4691c9440e8770800e496f45454e"],
  ]) assert.equal(createHash("sha256").update(read(`scripts/content/${slug}.md`).replace(/\r\n?/g, "\n").trim()).digest("hex"), hash, slug);
});
