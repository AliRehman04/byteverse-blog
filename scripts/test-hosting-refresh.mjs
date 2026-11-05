import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { parseDocument, DomUtils } from "htmlparser2";
import ts from "typescript";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8").replace(/\r\n?/g, "\n").trim();
const content = read("scripts/content/best-free-hosting-platforms-2026-refresh.md");
const record = JSON.parse(read("docs/hosting-audience-update-2026-11-05.json"));
const providers = ["WordPress.com", "InfinityFree", "GoogieHost", "Cloudflare Pages", "GitHub Pages", "Vercel", "Netlify"];
const prose = content.split("\n## Sources and Image Credits")[0].replace(/!\[[^\]]*\]\([^\n]+\)/g, "").replace(/\[([^\]]+)\]\([^\n)]+\)/g, (_, label) => label);
const words = (prose.match(/[\p{L}\p{N}]+(?:['.-][\p{L}\p{N}]+)*/gu) ?? []).length;
const metrics = { words, readingTime: `${Math.ceil(words / 220)} min read`, sha256: createHash("sha256").update(content).digest("hex") };
const mode = process.argv[2];
assert(process.argv.length <= 3 && (!mode || ["--metrics", "--preview", "--live"].includes(mode)));
if (mode === "--metrics") { console.log(JSON.stringify(metrics, null, 2)); process.exit(0); }

test("the seven primary sections and comparison rows agree with the preserved title", () => {
  assert.equal(record.previous.post.title, "Best Free Web Hosting in 2026: 7 Plans and Their Limits");
  assert.equal(record.previous.post.meta_title, "Best Free Web Hosting 2026: 7 Plans & Real Limits");
  assert.equal(record.slug, "best-free-hosting-platforms-2026");
  const headings = [...content.matchAll(/^## ([1-7])\. (.+)$/gm)];
  assert.deepEqual(headings.map(match => Number(match[1])), [1, 2, 3, 4, 5, 6, 7]);
  assert(headings.every((match, index) => match[2].startsWith(providers[index])));
  const rows = content.split("| --- | --- | --- | --- |\n")[1].split("\n\n")[0].split("\n");
  assert.equal(rows.length, 7);
  assert(rows.every((row, index) => row.split("|")[1].trim().startsWith(providers[index])));
  assert(content.includes("## Alternatives: Backend Demos and Plans With Extra Costs"));
  for (const provider of ["Render Free", "Railway Free", "AwardSpace", "FreeHosting.com"]) assert(new RegExp(`^### ${provider.replaceAll(".", "\\.")}:`, "m").test(content));
});

test("cost and resource examples remain arithmetic rather than performance claims", () => {
  assert.equal(8 * 15 + 4 * 20 + 100000 / 10000 * 2, 220);
  assert(content.includes("**220 credits**"));
  assert.equal(Math.floor(50000 / 11), 4545);
  assert(content.includes("**4,545 complete page loads**"));
  assert(content.includes("A hit is a request for a file, not a visitor"));
  assert(content.includes("PostgreSQL, not SQLite"));
  assert(content.includes("USD 29.95 one-time add-on"));
  assert(content.includes("certificate installation is not available on free hosting"));
  assert(content.includes("automatic file backups are not provided"));
  assert(content.includes("We have not measured these hosts' uptime"));
  assert(!/^# |\ufffd|\0|\bTODO\b|\bTBD\b/m.test(content));
});

test("metadata preserves the approved headline and the record matches the article", () => {
  assert.equal(record.targeting.title, record.previous.post.title);
  assert.equal(record.targeting.metaTitle, record.previous.post.meta_title);
  assert(record.targeting.metaTitle.length <= 70);
  assert(record.targeting.metaDescription.length >= 120 && record.targeting.metaDescription.length <= 160);
  assert(record.targeting.excerpt.length >= 120 && record.targeting.excerpt.length <= 300);
  assert.equal(record.targeting.summary.split("|").length, 3);
  assert.equal(record.validation.sha256, metrics.sha256);
  assert.equal(record.validation.words, metrics.words);
  assert.equal(record.targeting.readingTime, metrics.readingTime);
  for (const source of record.research.sourceChecks) assert(content.includes(`](${source.url})`), `Source missing: ${source.url}`);
  assert.equal(record.research.searchConsole.queries[0].averagePosition, 74.7);
  assert.equal(record.research.searchConsole.queries[1].averagePosition, 71.1);
});

function transpile(source, fileName) {
  const result = ts.transpileModule(source, { fileName, reportDiagnostics: true, compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } });
  assert.equal(result.diagnostics?.length ?? 0, 0);
  return result.outputText;
}
const require = createRequire(import.meta.url);
function load(path, overrides = {}) {
  const record = { exports: {} };
  const allowed = new Set(["react", "react/jsx-runtime", "lucide-react", "react-markdown", "remark-gfm", "rehype-raw", "rehype-sanitize", "rehype-slug"]);
  new Function("require", "module", "exports", transpile(read(path), path))(name => {
    if (Object.hasOwn(overrides, name)) return overrides[name];
    assert(allowed.has(name), `Unexpected renderer dependency ${name}`);
    return require(name);
  }, record, record.exports);
  return record.exports;
}
const siteConfig = { url: record.website, name: "ByteVerse" };
const imageSeo = load("src/lib/image-seo.ts", { "@/lib/config": { siteConfig } });
const { MarkdownRenderer } = load("src/components/markdown-renderer.tsx", {
  "@/lib/config": { siteConfig }, "@/lib/image-seo": imageSeo,
  "@/components/copy-button": load("src/components/copy-button.tsx"),
  "@/components/code-playground": { CodePlayground() { throw new Error("No executable code expected"); } },
});
const rendered = renderToStaticMarkup(createElement(MarkdownRenderer, { content, currentSlug: record.slug }));
const document = parseDocument(rendered);
const all = (root, predicate) => DomUtils.findAll(predicate, root.children ?? []);
const one = (root, predicate) => { const matches = all(root, predicate); assert.equal(matches.length, 1); return matches[0]; };
const internalLinks = [...new Set([...content.matchAll(/(?<!!)\[[^\]]+\]\((\/(?:blog|tools)\/[a-z0-9-]+)\)/g)].map(match => match[1]))].sort();
const imageUrls = value => [...value.matchAll(/!\[[^\]]*\]\((https:\/\/[^\s)]+)/g)].map(match => match[1]);

test("all contextual links and original image URLs survive the actual renderer", () => {
  const renderedLinks = [...new Set(all(document, node => node.name === "a" && node.attribs.href?.startsWith("/")).map(node => node.attribs.href))].sort();
  assert.deepEqual(renderedLinks, internalLinks);
  assert.equal(internalLinks.length, 12);
  assert.deepEqual(imageUrls(content), imageUrls(record.previous.post.content));
  const external = all(document, node => node.name === "a" && node.attribs.href?.startsWith("https://"));
  assert(external.every(node => node.attribs.rel?.includes("noopener")));
});

test("the real article renderer preserves tables, photographs and unique headings", () => {
  assert.equal(all(document, node => node.name === "table").length, 2);
  assert.equal(all(document, node => node.name === "img").length, 4);
  assert.equal(all(document, node => ["h1", "iframe", "script"].includes(node.name)).length, 0);
  const headings = all(document, node => /^h[23]$/.test(node.name));
  assert.equal(new Set(headings.map(node => node.attribs.id)).size, headings.length);
  for (const image of all(document, node => node.name === "img")) {
    assert.equal(image.attribs.width, "1200");
    assert.equal(image.attribs.height, "675");
  }
});

test("only five FAQ questions are extracted and every answer matches visible text", () => {
  const source = read("src/app/blog/[slug]/page.tsx");
  const start = source.indexOf("  const faqRegex =");
  const end = source.indexOf("  // Auto-extract HowTo", start);
  assert(start > 0 && end > start);
  const faqs = new Function("post", `${transpile(source.slice(start, end), "faq.ts")}; return faqs;`)({ content });
  const details = all(document, node => node.name === "details");
  const collapse = value => value.replace(/\s+/g, " ").trim();
  assert.equal(faqs.length, 5);
  assert.equal(details.length, 5);
  assert.deepEqual(faqs.map(faq => faq.question), details.map(node => DomUtils.textContent(one(node, child => child.name === "summary"))));
  assert.deepEqual(faqs.map(faq => collapse(faq.answer)), details.map(node => collapse(DomUtils.textContent(one(node, child => child.name === "p")))));
  assert(!/^#{2,3} How to /mi.test(content));
});

console.log(JSON.stringify(metrics));

if (mode === "--preview") {
  const response = await fetch(`${record.website}/blog/${record.slug}`, { signal: AbortSignal.timeout(30000) });
  assert.equal(response.status, 200);
  const current = parseDocument(await response.text());
  const styles = all(current, node => node.name === "link" && node.attribs.rel === "stylesheet").map(node => new URL(node.attribs.href, record.website).href);
  assert(styles.length > 0);
  const bodyClass = one(current, node => node.name === "body").attribs.class ?? "";
  const element = createElement;
  const page = element("html", { lang: "en" },
    element("head", null,
      element("meta", { charSet: "utf-8" }),
      element("meta", { name: "viewport", content: "width=device-width, initial-scale=1" }),
      element("meta", { name: "robots", content: "noindex,nofollow" }),
      element("meta", { name: "description", content: record.targeting.metaDescription }),
      element("base", { href: `${record.website}/` }),
      element("title", null, `${record.targeting.metaTitle} | ByteVerse Preview`),
      ...styles.map(href => element("link", { key: href, rel: "stylesheet", href })),
      element("style", null, "html{scroll-behavior:auto}main{width:100%;min-width:0}h1{overflow-wrap:anywhere;letter-spacing:0}.preview-cover{width:100%;height:auto;aspect-ratio:16/9;object-fit:contain}"),
    ),
    element("body", { className: bodyClass },
      element("header", { className: "border-b border-border" },
        element("nav", { className: "mx-auto max-w-4xl px-4 py-4 flex justify-between gap-4", "aria-label": "Preview navigation" },
          element("a", { href: record.website, className: "font-bold text-xl" }, "ByteVerse"),
          element("span", { className: "text-sm text-muted-foreground" }, "Local preview"),
        ),
      ),
      element("main", { className: "mx-auto max-w-3xl px-4 sm:px-6 py-8" },
        element("article", null,
          element("p", { className: "text-sm text-primary mb-4" }, "Tech Guides"),
          element("h1", { className: "text-3xl sm:text-4xl font-extrabold leading-tight mb-6" }, record.targeting.title),
          element("p", { className: "text-lg text-muted-foreground mb-6" }, record.targeting.excerpt),
          element("p", { className: "text-sm text-muted-foreground mb-8" }, `${record.previous.post.author} | Updated November 5, 2026 | ${metrics.readingTime}`),
          element("img", { src: record.previous.post.cover_image, alt: "Rows of server racks in a data center", width: 1200, height: 675, className: "preview-cover rounded-lg mb-10" }),
          element("div", { dangerouslySetInnerHTML: { __html: rendered } }),
        ),
      ),
    ),
  );
  const directory = new URL("../../.byteverse-hosting-preview/", import.meta.url);
  mkdirSync(directory, { recursive: true });
  const output = new URL("index.html", directory);
  writeFileSync(output, `<!DOCTYPE html>${renderToStaticMarkup(page)}`, "utf8");
  console.log(`PREVIEW ${output.href}`);
}

if (mode === "--live") {
  assert(record.publication.modifiedAt, "Record the successful database update before live verification");
  const url = `${record.website}/blog/${record.slug}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(45000) });
  assert.equal(response.status, 200);
  const live = parseDocument(await response.text());
  const body = one(live, node => node.name === "div" && node.attribs.class?.split(/\s+/).includes("blog-content"));
  const meta = (attribute, name) => one(live, node => node.name === "meta" && node.attribs[attribute] === name).attribs.content;
  const collapse = value => value.replace(/\s+/g, " ").trim();
  assert.equal(DomUtils.textContent(one(live, node => node.name === "h1")), record.previous.post.title);
  assert.equal(DomUtils.textContent(one(live, node => node.name === "title")), `${record.previous.post.meta_title} | ByteVerse`);
  assert.equal(one(live, node => node.name === "link" && node.attribs.rel === "canonical").attribs.href, url);
  assert.equal(meta("name", "description"), record.targeting.metaDescription);
  assert.equal(meta("property", "og:title"), record.previous.post.meta_title);
  assert.equal(meta("property", "og:description"), record.targeting.metaDescription);
  assert.equal(meta("name", "twitter:title"), record.previous.post.meta_title);
  assert.equal(meta("property", "article:published_time"), record.publication.originalPublishedAt);
  assert.equal(meta("property", "article:modified_time"), record.publication.modifiedAt);
  assert(!/noindex/i.test(response.headers.get("x-robots-tag") ?? ""));
  assert(all(live, node => node.name === "meta" && node.attribs.name === "robots").every(node => !/noindex/i.test(node.attribs.content)));
  assert.equal(collapse(DomUtils.textContent(body)), collapse(DomUtils.textContent(document)), "Live article text must equal the validated renderer output");
  assert.equal(all(body, node => node.name === "table").length, 2);
  assert.equal(all(body, node => node.name === "img").length, 4);
  for (const href of internalLinks) assert(all(body, node => node.name === "a").some(node => node.attribs.href === href), href);
  const schema = all(live, node => node.name === "script" && node.attribs.type === "application/ld+json")
    .flatMap(node => { const data = JSON.parse(DomUtils.textContent(node)); return data["@graph"] ?? [data]; });
  assert.equal(schema.find(item => item["@type"] === "BlogPosting")?.datePublished, record.publication.originalPublishedAt);
  assert.equal(schema.find(item => item["@type"] === "BlogPosting")?.dateModified, record.publication.modifiedAt);
  const faqs = schema.find(item => item["@type"] === "FAQPage");
  const details = all(body, node => node.name === "details");
  assert.equal(details.length, 5);
  assert.deepEqual(faqs?.mainEntity.map(item => item.name), details.map(node => DomUtils.textContent(one(node, child => child.name === "summary"))));
  assert.deepEqual(faqs?.mainEntity.map(item => collapse(item.acceptedAnswer.text)), details.map(node => collapse(DomUtils.textContent(one(node, child => child.name === "p")))));
  const sitemapResponse = await fetch(`${record.website}/sitemap.xml`, { signal: AbortSignal.timeout(30000) });
  assert.equal(sitemapResponse.status, 200);
  const sitemap = parseDocument(await sitemapResponse.text(), { xmlMode: true });
  const entry = one(sitemap, node => node.name === "url" && all(node, child => child.name === "loc").some(child => DomUtils.textContent(child) === url));
  const lastmod = DomUtils.textContent(one(entry, node => node.name === "lastmod"));
  assert(lastmod.startsWith(record.publication.modifiedAt.slice(0, 10)), "Sitemap still has the old modification date");
  console.log("PASS live hosting update", JSON.stringify({ checkedAt: new Date().toISOString(), url, originalPublishedAt: record.publication.originalPublishedAt,
    modifiedAt: record.publication.modifiedAt, titlePreserved: true, primaryProviders: 7, faqs: 5, tables: 2, internalLinks: internalLinks.length, sitemapLastmod: lastmod }));
}