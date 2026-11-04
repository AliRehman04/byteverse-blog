import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseDocument, DomUtils } from "htmlparser2";

const ledger = JSON.parse(readFileSync(fileURLToPath(new URL("../docs/youtube-video-tools-update-2026-11-04.json", import.meta.url)), "utf8"));
assert.equal(process.argv.length, 2, "No options are supported");
const articleUrl = `${ledger.website}/blog/${ledger.slug}`;
const all = (root, predicate) => DomUtils.findAll(predicate, root.children ?? []);
const one = (root, predicate, label) => { const matches = all(root, predicate); assert.equal(matches.length, 1, label); return matches[0]; };
const collapse = value => value.replace(/\s+/g, " ").trim();

const response = await fetch(articleUrl, { signal: AbortSignal.timeout(45000), headers: { "user-agent": "Mozilla/5.0 ByteVerse-article-check" } });
assert.equal(response.status, 200);
const document = parseDocument(await response.text());
const body = one(document, node => node.name === "div" && node.attribs.class?.split(/\s+/).includes("blog-content"), "one rendered article body");
const text = DomUtils.textContent(body);
assert.equal(DomUtils.textContent(one(document, node => node.name === "h1", "one H1")), ledger.targeting.title);
assert.equal(DomUtils.textContent(one(document, node => node.name === "title", "document title")), `${ledger.targeting.metaTitle} | ByteVerse`);
assert.equal(one(document, node => node.name === "meta" && node.attribs.name === "description", "description").attribs.content, ledger.targeting.metaDescription);
assert.equal(one(document, node => node.name === "link" && node.attribs.rel === "canonical", "canonical").attribs.href, articleUrl);
assert(!/noindex/i.test(response.headers.get("x-robots-tag") ?? ""));
assert(all(document, node => node.name === "meta" && node.attribs.name === "robots").every(node => !/noindex/i.test(node.attribs.content)));
assert.equal(all(document, node => node.name === "meta" && node.attribs.property === "og:image")[0]?.attribs.content, ledger.images.cover);
const modified = one(document, node => node.name === "meta" && node.attribs.property === "article:modified_time", "modified time").attribs.content;
assert.equal(modified, ledger.publication.appliedAt, `Stale page: modified ${modified}`);
const published = one(document, node => node.name === "meta" && node.attribs.property === "article:published_time", "published time").attribs.content;
assert.equal(published, ledger.previous.livePublishedAt, "Original publication date must not change");
for (const [attribute, name, expected] of [
  ["property", "og:title", ledger.targeting.metaTitle],
  ["property", "og:description", ledger.targeting.metaDescription],
  ["name", "twitter:title", ledger.targeting.metaTitle],
  ["name", "twitter:description", ledger.targeting.metaDescription],
]) {
  assert.equal(one(document, node => node.name === "meta" && node.attribs[attribute] === name, name).attribs.content, expected);
}

assert(text.includes("November 4, 2026") && !/tested and ranked/i.test(text));
assert.equal(all(body, node => node.name === "table").length, 4);
assert.equal(all(body, node => ["img", "iframe", "script"].includes(node.name)).length, 0);
const firstRowCells = all(all(body, node => node.name === "table")[0], node => node.name === "th").map(node => collapse(DomUtils.textContent(node)));
assert.deepEqual(firstRowCells, ["Tool", "Best for", "Free option?", "Lowest paid plan (checked Nov 4, 2026)"]);
for (const fact of ledger.verifiedFacts) for (const phrase of fact.articlePhrases) assert(text.includes(phrase), `Live page lacks: ${phrase}`);
for (const href of ledger.internalLinks) assert(all(body, node => node.name === "a").some(node => node.attribs.href === href), `Missing internal link: ${href}`);

const schema = all(document, node => node.name === "script" && node.attribs.type === "application/ld+json")
  .flatMap(node => { const value = JSON.parse(DomUtils.textContent(node)); return value["@graph"] ?? [value]; });
assert.equal(schema.find(item => item["@type"] === "BlogPosting")?.headline, ledger.targeting.metaTitle);
assert.equal(schema.find(item => item["@type"] === "BlogPosting")?.datePublished, published);
assert.equal(schema.find(item => item["@type"] === "BlogPosting")?.dateModified, modified);
const faq = schema.find(item => item["@type"] === "FAQPage");
const details = all(body, node => node.name === "details" && node.attribs.class?.includes("faq-item"));
assert(faq && details.length === 5);
assert.deepEqual(details.map(node => DomUtils.textContent(one(node, child => child.name === "summary", "FAQ question"))), ledger.faq);
assert.deepEqual(faq.mainEntity.map(item => collapse(item.acceptedAnswer.text)), details.map(node => collapse(DomUtils.textContent(one(node, child => child.name === "p", "FAQ answer")))));
assert(!schema.some(item => item["@type"] === "HowTo"));
console.log("PASS live article", JSON.stringify({ checkedAt: new Date().toISOString(), url: articleUrl, published, modified, cache: response.headers.get("x-vercel-cache"), tables: 4, faq: 5, internalLinks: ledger.internalLinks.length }));
