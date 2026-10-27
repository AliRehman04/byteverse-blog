import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseDocument, DomUtils } from "htmlparser2";

const ledger = JSON.parse(readFileSync(fileURLToPath(new URL("../docs/csv-one-column-keywords-2026-10-27.json", import.meta.url)), "utf8"));
const base = ledger.website, articleUrl = `${base}/blog/${ledger.slug}`;
const all = (root, predicate) => DomUtils.findAll(predicate, root.children ?? []);
const one = (root, predicate) => { const matches = all(root, predicate); assert.equal(matches.length, 1); return matches[0]; };
const get = async url => {
  const response = await fetch(url, { signal: AbortSignal.timeout(45000), headers: { "user-agent": "Mozilla/5.0 ByteVerse-release-check" } });
  assert.equal(response.status, 200, url);
  return { response, text: await response.text() };
};
const { response, text } = await get(articleUrl);
const dom = parseDocument(text);
assert.equal(DomUtils.textContent(one(dom, node => node.name === "h1")), ledger.targeting.title);
assert.equal(one(dom, node => node.name === "link" && node.attribs.rel === "canonical").attribs.href, articleUrl);
assert.equal(one(dom, node => node.name === "meta" && node.attribs.name === "description").attribs.content, ledger.targeting.metaDescription);
assert(!/noindex/i.test(response.headers.get("x-robots-tag") ?? ""));
const socialImages = all(dom, node => node.name === "meta" && node.attribs.property === "og:image");
assert.equal(socialImages[0]?.attribs.content, ledger.images.cover);
const details = all(dom, node => node.name === "details" && node.attribs.class?.includes("faq-item"));
assert.equal(details.length, 5);
assert.deepEqual(details.map(node => DomUtils.textContent(one(node, child => child.name === "summary"))), ledger.faq);
const images = all(dom, node => node.name === "img");
assert(images.some(node => node.attribs.src === ledger.images.inline));
assert(images.some(node => (node.attribs.src ?? "").includes(ledger.images.cover) || (node.attribs.src ?? "").includes(encodeURIComponent(ledger.images.cover))));
assert(text.includes("Wolf Art") && text.includes("Artem Podrez"));
assert(!all(dom, node => node.name === "a").some(node => node.attribs.href === "/tools/csv-diff"), "Unpublished tool linked");
const publishedTime = one(dom, node => node.name === "meta" && node.attribs.property === "article:published_time").attribs.content;
assert(publishedTime.startsWith(ledger.date), "Publication date mismatch");
console.log("PASS live article", JSON.stringify({ url: articleUrl, date: ledger.date, h1: 1, visibleFaqs: 5, canonical: true, description: true, cover: true, inline: true }));
for (const url of [ledger.images.cover, ledger.images.inline]) {
  const image = await fetch(url, { signal: AbortSignal.timeout(20000) });
  assert.equal(image.status, 200); assert.match(image.headers.get("content-type") ?? "", /image\/jpeg/);
  await image.body?.cancel();
}
const discovery = [];
for (const path of ["/", "/blog", "/sitemap.xml", "/feed.xml", `/blog/${ledger.backlink.host}`]) {
  const { text } = await get(base + path);
  const linked = text.includes(ledger.slug);
  discovery.push({ path, linked });
  console.log(`${linked ? "PASS" : "PENDING ISR"} discovery ${path}`);
}
console.log(JSON.stringify({ checkedAt: new Date().toISOString(), discovery }, null, 2));
if (process.argv.includes("--strict-index")) assert(discovery.every(item => item.linked), "Some index pages still await ISR refresh");