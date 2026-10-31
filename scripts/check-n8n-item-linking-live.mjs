import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseDocument, DomUtils } from "htmlparser2";

const ledger = JSON.parse(readFileSync(fileURLToPath(new URL("../docs/n8n-item-linking-keywords-2026-10-30.json", import.meta.url)), "utf8"));
const content = readFileSync(fileURLToPath(new URL(`content/${ledger.slug}.md`, import.meta.url)), "utf8").replace(/\r\n?/g, "\n").trim();
const args = process.argv.slice(2);
assert(args.length <= 1 && args.every(arg => arg === "--strict-index"), "Only --strict-index is supported");
const base = ledger.website;
const articlePath = `/blog/${ledger.slug}`;
const articleUrl = base + articlePath;
const all = (root, predicate) => DomUtils.findAll(predicate, root.children ?? []);
const one = (root, predicate, label) => { const matches = all(root, predicate); assert.equal(matches.length, 1, label); return matches[0]; };
const collapse = value => value.replace(/\s+/g, " ").trim();
const get = async url => {
  const response = await fetch(url, { signal: AbortSignal.timeout(45000), headers: { "user-agent": "Mozilla/5.0 ByteVerse-article-check" } });
  assert.equal(response.status, 200, url);
  return { response, text: await response.text() };
};

const { response, text } = await get(articleUrl);
const document = parseDocument(text);
const body = one(document, node => node.name === "div" && node.attribs.class?.split(/\s+/).includes("blog-content"), "one rendered article body");
assert.equal(DomUtils.textContent(one(document, node => node.name === "h1", "one H1")), ledger.targeting.title);
assert.equal(one(document, node => node.name === "link" && node.attribs.rel === "canonical", "canonical").attribs.href, articleUrl);
assert.equal(one(document, node => node.name === "meta" && node.attribs.name === "description", "description").attribs.content, ledger.targeting.metaDescription);
assert(!/noindex/i.test(response.headers.get("x-robots-tag") ?? ""));
assert(all(document, node => node.name === "meta" && node.attribs.name === "robots").every(node => !/noindex/i.test(node.attribs.content)));
assert.equal(all(document, node => node.name === "meta" && node.attribs.property === "og:image")[0]?.attribs.content, ledger.images.cover);
const publicationTime = one(document, node => node.name === "meta" && node.attribs.property === "article:published_time", "publication time").attribs.content;
assert(publicationTime.startsWith(ledger.publication.date));

const expectedBlocks = [...content.matchAll(/```(?:n8n|text)\n([\s\S]*?)\n```/g)].map(match => match[1].trim());
const actualBlocks = all(body, node => node.name === "pre").map(node => DomUtils.textContent(one(node, child => child.name === "code", "code block")).trim());
assert.deepEqual(actualBlocks, expectedBlocks, "Live code must exactly match the tested snippets");
assert.equal(all(body, node => node.name === "table").length, 4);
assert.equal(all(body, node => node.name === "code" && node.attribs.class === "language-n8n").length, 8);
assert.equal(all(body, node => node.name === "iframe" || node.name === "script").length, 0);
const schema = all(document, node => node.name === "script" && node.attribs.type === "application/ld+json")
  .flatMap(node => { const value = JSON.parse(DomUtils.textContent(node)); return value["@graph"] ?? [value]; });
const faq = schema.find(item => item["@type"] === "FAQPage");
assert(faq, "FAQPage schema missing");
const details = all(body, node => node.name === "details" && node.attribs.class?.includes("faq-item"));
assert.equal(details.length, 5);
assert.deepEqual(details.map(node => DomUtils.textContent(one(node, child => child.name === "summary", "FAQ question"))), ledger.faq);
assert.deepEqual(faq.mainEntity.map(item => collapse(item.acceptedAnswer.text)), details.map(node => collapse(DomUtils.textContent(one(node, child => child.name === "p", "FAQ answer")))));
for (const href of ledger.internalLinks) assert(all(body, node => node.name === "a").some(node => node.attribs.href === href), `Missing internal link: ${href}`);
assert(!DomUtils.textContent(body).includes("TODO"));
assert(DomUtils.textContent(body).includes("Christina Morillo / Pexels"));
assert(!all(body, node => node.name === "a").some(node => node.attribs.href === "/tools/csv-repair"), "Do not link the unpublished tool");
const covers = all(document, node => node.name === "img" && ((node.attribs.src ?? "").includes(ledger.images.cover) || (node.attribs.src ?? "").includes(encodeURIComponent(ledger.images.cover))));
assert(covers.length > 0, "Rendered cover missing");
const image = await fetch(new URL(covers[0].attribs.src, articleUrl), { signal: AbortSignal.timeout(45000) });
assert.equal(image.status, 200, "Actual displayed cover URL");
assert.match(image.headers.get("content-type") ?? "", /^image\//);
await image.body?.cancel();
console.log("PASS live article", JSON.stringify({ url: articleUrl, publicationTime, tables: 4, codeBlocks: actualBlocks.length, n8nBlocks: 8, faqCount: 5, canonical: true, description: true, renderedCover: true }));

const discovery = [];
for (const path of ["/", "/blog", "/sitemap.xml", "/feed.xml", `/blog/${ledger.backlink.host}`]) {
  const { response: indexResponse, text: indexHtml } = await get(base + path);
  const linked = path.endsWith(".xml") ? indexHtml.includes(articleUrl)
    : all(parseDocument(indexHtml), node => node.name === "a").some(node => node.attribs.href === articlePath || node.attribs.href === articleUrl);
  discovery.push({ path, linked, cache: indexResponse.headers.get("x-vercel-cache") });
  console.log(`${linked ? "PASS" : "PENDING ISR"} discovery ${path}`);
}
console.log(JSON.stringify({ checkedAt: new Date().toISOString(), discovery }, null, 2));
if (args.includes("--strict-index")) assert(discovery.every(item => item.linked), "Some index pages still await ISR refresh");