import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { neon } from '@neondatabase/serverless';
import nextEnv from '@next/env';
import { parseDocument, DomUtils } from 'htmlparser2';

// LOCAL HTTP server, but DATABASE_URL may point to the shared production DB.
// Explicit opt-in permits SELECT-only inventory/checksums; never publishes.
assert(process.argv.length === 4 && process.argv[3] === '--read-only', 'Pass a loopback server URL followed by --read-only to authorize configured-DB SELECTs');
const base = new URL(process.argv[2]);
assert(base.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname), 'This check only targets a loopback server');
assert(!base.username && !base.password && base.pathname === '/' && !base.search && !base.hash);
const root = fileURLToPath(new URL('../', import.meta.url));
nextEnv.loadEnvConfig(root);
assert(process.env.DATABASE_URL, 'DATABASE_URL must be configured');
const canonicalOrigin = new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://www.byteverse.fyi').origin;
const sql = neon(process.env.DATABASE_URL);
const aliasSource = await readFile(new URL('../src/lib/blog-redirects.ts', import.meta.url), 'utf8');
const aliasCode = ts.transpileModule(aliasSource, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const aliasModule = { exports: {} };
new Function('module', 'exports', aliasCode)(aliasModule, aliasModule.exports);
const { blogSlugRedirects, resolveBlogSlug } = aliasModule.exports;

const protectedFiles = [
  'scripts/_add-pdf-podcast-post.mjs', 'scripts/content/pdf-to-podcast-notebooklm-2026.md', 'docs/pdf-to-podcast-keywords-2026-09-29.json',
  'scripts/_add-noise-reduction-post.mjs', 'scripts/content/audacity-noise-reduction-voice-2026.md', 'docs/audacity-noise-reduction-keywords-2026-09-30.json',
];
const fileHashes = async () => Promise.all(protectedFiles.map(async path => ({ path, sha256: createHash('sha256').update(await readFile(new URL('../' + path, import.meta.url))).digest('hex') })));
const beforeFiles = await fileHashes();
const snapshot = async () => (await sql`
  SELECT count(*)::integer AS count,
    md5(coalesce(string_agg((to_jsonb(p) - 'views')::text, '' ORDER BY id), '')) AS hash
  FROM posts p
`)[0];
const before = await snapshot();
const posts = await sql`SELECT slug, published FROM posts ORDER BY id`;
const published = posts.filter(post => post.published);
const drafts = posts.filter(post => !post.published);
assert(published.length > 0, 'No published inventory to verify');

const get = (path, method = 'GET') => fetch(new URL(path, base), { method, redirect: 'manual', signal: AbortSignal.timeout(30000) });
const parse = async response => parseDocument(await response.text());
const find = (doc, name, predicate = () => true) => DomUtils.findOne(node => node.name === name && predicate(node), doc.children, true);
const index = await get('/stories?utm_source=legacy');
assert.equal(index.status, 308);
const indexTarget = new URL(index.headers.get('location'), base);
assert.equal(indexTarget.pathname, '/blog');
assert.equal(indexTarget.searchParams.get('utm_source'), 'legacy');
console.log('PASS: /stories index is a server-side 308 to /blog and preserves queries.');

let completed = 0;
const queue = [...published];
await Promise.all(Array.from({ length: Math.min(4, queue.length) }, async () => {
  while (queue.length) {
    const post = queue.shift();
    const story = await get('/stories/' + encodeURIComponent(post.slug));
    assert.equal(story.status, 308, `No permanent redirect for ${post.slug}`);
    const targetSlug = resolveBlogSlug(post.slug);
    assert.equal(story.headers.get('location'), `${canonicalOrigin}/blog/${encodeURIComponent(targetSlug)}`);
    assert.equal(await story.text(), '', `Old AMP body remains at ${post.slug}`);
    assert.equal(story.headers.get('cache-control'), 'no-store');

    // Check the target on the local build instead of following to production.
    const article = await get('/blog/' + encodeURIComponent(targetSlug));
    assert.equal(article.status, 200, `Blog destination is not a direct200: ${post.slug}`);
    const doc = await parse(article);
    const title = find(doc, 'title');
    assert(title && !/Post Not Found/.test(DomUtils.textContent(title)), `Missing article body: ${post.slug}`);
    assert.equal(find(doc, 'link', node => node.attribs.rel === 'canonical')?.attribs.href, `${canonicalOrigin}/blog/${targetSlug}`);
    assert(!find(doc, 'link', node => node.attribs.rel === 'amphtml' || node.attribs.type === 'application/amp+html'));
    assert(!find(doc, 'meta', node => ['robots', 'googlebot'].includes(node.attribs.name) && /\bnoindex\b/i.test(node.attribs.content)));
    completed++;
  }
}));
console.log(`PASS: ${completed}/${published.length} published story URLs -> matching direct200, self-canonical articles; no AMP alternates.`);

for (const [source, target] of blogSlugRedirects) {
  assert(published.some(post => post.slug === target), `Alias destination is not published: ${source}`);
  const response = await get('/stories/' + source);
  assert.equal(response.status, 308);
  assert.equal(response.headers.get('location'), `${canonicalOrigin}/blog/${target}`);
}
console.log(`PASS: ${blogSlugRedirects.length} known historical story aliases reach their final published articles.`);

const first = published[0].slug;
const query = '?utm_source=google&tag=one&tag=two';
for (const method of ['GET', 'HEAD']) {
  const response = await get('/stories/' + encodeURIComponent(first) + query, method);
  assert.equal(response.status, 308);
  assert.equal(response.headers.get('location'), `${canonicalOrigin}/blog/${first}${query}`);
  assert.equal(await response.text(), '');
}
console.log('PASS: GET and HEAD preserve query parameters with empty redirect bodies.');

for (const slug of [...drafts.map(post => post.slug), 'synthetic-never-published-story-404']) {
  const response = await get('/stories/' + encodeURIComponent(slug));
  assert.equal(response.status, 404, `Hidden/unknown story should remain404: ${slug}`);
  assert.equal(response.headers.get('location'), null);
  assert.equal(response.headers.get('x-robots-tag'), 'noindex');
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(await response.text(), 'Not Found');
}
for (const post of drafts) {
  const response = await get('/blog/' + encodeURIComponent(post.slug));
  const doc = await parse(response);
  assert(/Post Not Found/.test(DomUtils.textContent(find(doc, 'title'))), `Draft blog leaked: ${post.slug}`);
  assert(find(doc, 'meta', node => node.attribs.name === 'robots' && /\bnoindex\b/i.test(node.attribs.content)));
}
console.log(`PASS: ${drafts.length} drafts stay private on both route families; unknown stories remain genuine404s.`);

for (const path of ['/sitemap.xml', '/feed.xml', '/site-map']) {
  const response = await get(path);
  assert.equal(response.status, 200);
  const text = await response.text();
  assert(!text.includes('/stories/'), `Retired URLs advertised in ${path}`);
  assert(drafts.every(post => !text.includes(post.slug)), `Draft listed in ${path}`);
}
const robots = await get('/robots.txt');
assert.equal(robots.status, 200);
assert(!/^Disallow:\s*\/stories/im.test(await robots.text()), 'Do not prevent Google from seeing permanent redirects');
assert.deepEqual(await snapshot(), before, 'Post data changed during read-only verification');
assert.deepEqual(await fileHashes(), beforeFiles, 'A protected draft file changed');
console.log('PASS: sitemaps/feed/robots consistent; all draft files and post editorial fields unchanged.');
console.log(JSON.stringify({ localBase: base.origin, publishedRedirects: completed, historicalAliases: blogSlugRedirects.length, draftsProtected: drafts.length, allPostsUnchanged: before.count, editorialChecksumExcludingViews: before.hash }, null, 2));