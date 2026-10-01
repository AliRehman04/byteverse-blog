import assert from 'node:assert/strict';
import { parseDocument, DomUtils } from 'htmlparser2';
import { article, imageUrls, ledger } from './_add-n8n-webhook-post.mjs';

// Public HTTP reads only: no application env, DB access or mutations.
const origin = 'https://www.byteverse.fyi';
const articlePath = `/blog/${article.slug}`;
const select = (doc, predicate) => DomUtils.findAll(predicate, doc.children);
const one = (doc, predicate) => DomUtils.findOne(predicate, doc.children, true);
async function get(path) {
  const response = await fetch(origin + path, { redirect: 'manual', signal: AbortSignal.timeout(30000) });
  const text = await response.text();
  return { response, text, doc: parseDocument(text) };
}
function assertIndexable(page) {
  const robots = select(page.doc, node => node.name === 'meta' && ['robots', 'googlebot'].includes(node.attribs.name));
  assert(!robots.some(node => /\bnoindex\b/i.test(node.attribs.content)));
  assert(!/\bnoindex\b/i.test(page.response.headers.get('x-robots-tag') || ''));
}
function imageKey(src) {
  const url = new URL(src, origin);
  const source = url.pathname === '/_next/image' ? new URL(url.searchParams.get('url'), origin) : url;
  return source.origin + source.pathname;
}

const live = await get(articlePath);
assert.equal(live.response.status, 200, 'Article HTTP status');
const title = one(live.doc, node => node.name === 'title');
assert(title && DomUtils.textContent(title).includes(article.meta_title), 'Latest article title not deployed yet');
assertIndexable(live);
assert.equal(one(live.doc, node => node.name === 'link' && node.attribs.rel === 'canonical')?.attribs.href, origin + articlePath);
assert.equal(one(live.doc, node => node.name === 'meta' && node.attribs.name === 'description')?.attribs.content, article.meta_description);
const headings = select(live.doc, node => node.name === 'h1');
assert.equal(headings.length, 1);
assert.equal(DomUtils.textContent(headings[0]), article.title);
assert(!one(live.doc, node => node.name === 'link' && node.attribs.rel === 'amphtml'));
for (const detail of ['Only Run If', 'N8N_WEBHOOK_URL', 'AllowAutoRedirect']) assert(live.text.includes(detail), `Missing article section: ${detail}`);
assert.equal(select(live.doc, node => node.name === 'pre').length, 5);
assert.equal(select(live.doc, node => node.name === 'details' && node.attribs.class?.includes('faq-item')).length, 8);
const renderedImages = new Set(select(live.doc, node => node.name === 'img' && node.attribs.src).map(node => imageKey(node.attribs.src)));
for (const image of imageUrls) assert(renderedImages.has(imageKey(image)), 'An article image is missing from the live markup');

const schemaObjects = [];
function collect(value) {
  if (Array.isArray(value)) value.forEach(collect);
  else if (value && typeof value === 'object') {
    schemaObjects.push(value);
    if (value['@graph']) collect(value['@graph']);
  }
}
for (const node of select(live.doc, node => node.name === 'script' && node.attribs.type === 'application/ld+json')) collect(JSON.parse(DomUtils.textContent(node)));
assert(schemaObjects.some(schema => schema['@type'] === 'BlogPosting' && schema.headline === article.meta_title));
assert(schemaObjects.some(schema => schema['@type'] === 'FAQPage' && schema.mainEntity?.length === 5));
console.log('PASS: Live200/indexable, correct title/description/self-canonical,1H1,5codeblocks,8visibleFAQs,5images and article/FAQ schema.');

for (const source of ['how-to-use-n8n-2026-complete-guide', 'n8n-vs-zapier-2026-comparison']) {
  const page = await get(`/blog/${source}`);
  assert.equal(page.response.status, 200);
  const paragraph = one(page.doc, node => node.name === 'p' && DomUtils.findOne(child => child.name === 'a' && [articlePath, origin + articlePath].includes(child.attribs.href), node.children, true));
  assert(paragraph, `Contextual backlink not deployed: ${source}`);
  console.log('PASS: Contextual backlink', source);
}

const story = await get(`/stories/${article.slug}`);
assert.equal(story.response.status, 308);
assert.equal(story.response.headers.get('location'), origin + articlePath);
console.log('PASS: Story URL308 redirects to the published article.');

for (const path of ['/blog', '/sitemap.xml', '/feed.xml']) {
  const page = await get(path);
  assert.equal(page.response.status, 200);
  assert(page.text.includes(articlePath), `New article not advertised yet: ${path}`);
  for (const draft of ledger.inventory.protectedDrafts) assert(!page.text.includes(draft.slug), `Hidden draft advertised: ${path}`);
}
console.log('PASS: New article appears in blog index, sitemap and feed; protected drafts excluded.');

for (const draft of ledger.inventory.protectedDrafts) {
  const page = await get(`/blog/${draft.slug}`);
  assert([200, 404].includes(page.response.status));
  assert(/Post Not Found/.test(DomUtils.textContent(one(page.doc, node => node.name === 'title'))));
  const robots = select(page.doc, node => node.name === 'meta' && ['robots', 'googlebot'].includes(node.attribs.name));
  assert(robots.some(node => /\bnoindex\b/i.test(node.attribs.content)));
  const hiddenStory = await get(`/stories/${draft.slug}`);
  assert.equal(hiddenStory.response.status, 404);
  assert.equal(hiddenStory.response.headers.get('x-robots-tag'), 'noindex');
  console.log('PASS: Draft remains hidden:', draft.id, draft.slug);
}
console.log('LIVE RELEASE VERIFIED:', origin + articlePath);