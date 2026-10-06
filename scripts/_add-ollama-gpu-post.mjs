import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseDocument, DomUtils } from 'htmlparser2';

export const root = fileURLToPath(new URL('../', import.meta.url));
export const articlePath = resolve(root, 'scripts/content/ollama-not-using-gpu-windows-2026.md');
export const ledgerPath = resolve(root, 'docs/ollama-gpu-keywords-2026-10-06.json');
export const ledger = JSON.parse(readFileSync(ledgerPath, 'utf8'));
export const content = readFileSync(articlePath, 'utf8').replace(/\r\n?/g, '\n').trim();
export const siteUrl = 'https://www.byteverse.fyi';
export const internalLinks = [...content.matchAll(/(?<!!)\[([^\]]+)\]\((\/[^\s)]+)\)/g)].map(match => match[2]);
export const bodyImages = [...content.matchAll(/!\[([^\]]+)\]\((https:\/\/[^\s)]+)\s+"([^"]+)"\)/g)];
export const imageUrls = [`${siteUrl}/blog/ollama-gpu/cover.png`, ...bodyImages.map(match => match[2])];
export const codeBlocks = [...content.matchAll(/^```([\w-]+)\n([\s\S]*?)^```[ \t]*$/gm)];
const prose = content.split('\n## Sources and Image Credits')[0].replace(/```[\s\S]*?```/g, '').replace(/!\[[^\]]*\]\([^\n]+\)/g, '').replace(/\[([^\]]+)\]\([^\n)]+\)/g, '$1');
export const wordCount = (prose.match(/[\p{L}\p{N}]+(?:['’.-][\p{L}\p{N}]+)*/gu) ?? []).length;
export const contentSha256 = createHash('sha256').update(content).digest('hex');
export const article = Object.freeze({
  title: ledger.targeting.title, slug: ledger.slug,
  excerpt: 'Ollama stuck on CPU? Start with the running model and server, separate memory placement from utilization, then check Windows GPU support, drivers, VRAM, context and logs without blindly reinstalling.',
  content, cover_image: imageUrls[0], author: 'Ali Rehman',
  published: false, featured: false, scheduled_at: null,
  meta_title: ledger.targeting.metaTitle, meta_description: ledger.targeting.metaDescription,
  keywords: [ledger.targeting.primary, ...ledger.targeting.secondary].join(', '),
  summary: 'The PROCESSOR column in ollama ps describes model memory placement, not live GPU utilization.|Full CPU placement and a CPU/GPU split require different checks; confirm the server, supported drivers, available VRAM and context.|Native Windows, WSL, containers and remote models are separate environments; keep changes scoped and use redacted server logs.',
  reading_time: `${Math.ceil(wordCount / 220)} min read`,
});

export function validateArticle() {
  for (const [field, max] of Object.entries({ title: 255, slug: 255, author: 100, meta_title: 70, meta_description: 160, reading_time: 20 })) {
    assert.equal(typeof article[field], 'string'); assert(article[field].trim().length > 0 && [...article[field]].length <= max, `Invalid ${field}`);
  }
  assert.match(article.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  assert.equal(article.published, false); assert.equal(article.featured, false); assert.equal(article.scheduled_at, null);
  assert.equal(article.summary.split('|').length, 3);
  assert.deepEqual(internalLinks, ledger.internalLinkPlan); assert.equal(new Set(internalLinks).size, 3);
  assert(!/^#\s/m.test(content) && !/\bTODO\b|\bTBD\b|<!--|<\/?[a-z][^>]*>/i.test(content));
  assert(!content.includes('\r') && !content.includes('\0'));
  assert.equal((content.match(/^## [1-7]\. /gm) ?? []).length, 7);
  const faq = content.split('\n## Frequently Asked Questions\n')[1]?.split('\n## ')[0];
  assert(faq); assert.equal((faq.match(/^### .+\?$/gm) ?? []).length, 5);
  assert.equal(codeBlocks.length, 8); assert.equal(codeBlocks.filter(block => block[1] === 'powershell').length, 7);
  assert.equal(codeBlocks.filter(block => block[1] === 'text').length, 1);
  assert(content.includes('memory placement, not live GPU utilization'));
  assert(content.includes('Placement alone does not prove the cause.'));
  assert(content.includes('documentation-based guide') && content.includes('not hardware benchmarks'));
  assert(content.includes('pages currently disagree about defaults'));
  assert(content.includes('not a universal prerequisite'));
  assert(content.includes('do not run the placeholder literally'));
  for (const source of ledger.primarySources) assert(content.includes(`](${source.url})`), `Missing source ${source.url}`);
  for (const draft of ledger.inventory.protectedDrafts) assert(!content.includes(draft.slug), 'Do not link protected drafts');
  assert.equal(bodyImages.length, 2); assert.equal(imageUrls.length, 3);
  for (const [index, url] of imageUrls.entries()) {
    assert.equal(url, `${siteUrl}/blog/ollama-gpu/${ledger.images[index].file}`);
    const bytes = readFileSync(resolve(root, 'public', new URL(url).pathname.slice(1)));
    assert(bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])));
    assert.equal(bytes.readUInt32BE(16), 1200); assert.equal(bytes.readUInt32BE(20), 675); assert(bytes.length < 350000);
  }
  return { slug: article.slug, wordCountExcludingCodeImagesAndCredits: wordCount, readingTime: article.reading_time,
    metaTitleCharacters: article.meta_title.length, metaDescriptionCharacters: article.meta_description.length,
    contextualInternalLinks: internalLinks.length, originalImages: imageUrls.length, faqs: 5, codeBlocks: codeBlocks.length, contentSha256 };
}

export const snapshotQuery = sql => sql`SELECT count(*)::integer AS total_posts,
  (count(*) FILTER (WHERE published))::integer AS published_posts,
  md5(coalesce(string_agg((to_jsonb(p) - 'views')::text, '' ORDER BY p.id), '')) AS editorial_hash
  FROM posts p WHERE slug <> ${article.slug}`;
export const baseline = Object.freeze({ total_posts: ledger.inventory.totalPosts,
  published_posts: ledger.inventory.publishedPosts, editorial_hash: ledger.inventory.editorialChecksumExcludingViews });

export function readQueries(sql) {
  return [snapshotQuery(sql), sql`SELECT * FROM posts WHERE slug = ${article.slug}`,
    sql`SELECT id, name FROM categories WHERE name = ${ledger.targeting.category}`,
    sql`SELECT id, slug, published FROM posts WHERE slug = ANY(${internalLinks.map(link => link.slice(6))}::text[])`];
}
export function assertSaved(row) {
  assert(row && Number.isInteger(row.id) && row.id > 0);
  for (const [field, value] of Object.entries(article)) assert.equal(row[field], value, `Saved article differs: ${field}`);
  assert.equal(row.category_id, ledger.targeting.categoryId);
}
export function assertState([snapshots, existing, categories, targets]) {
  assert.equal(snapshots.length, 1); assert.deepEqual(snapshots[0], baseline, 'Other editorial rows changed; inspect before any write');
  assert.equal(categories.length, 1); assert.equal(categories[0].id, ledger.targeting.categoryId);
  assert.equal(targets.length, internalLinks.length);
  for (const slug of internalLinks.map(link => link.slice(6))) assert(targets.some(row => row.slug === slug && row.published), 'Internal destination must be published');
  assert(existing.length <= 1); if (existing.length) assertSaved(existing[0]);
  return existing[0] ?? null;
}
export function insertQuery(sql) {
  return sql`WITH inventory AS (${snapshotQuery(sql)})
    INSERT INTO posts (title, slug, excerpt, content, cover_image, category_id, author, published, featured,
      scheduled_at, meta_title, meta_description, keywords, summary, reading_time, views, created_at, updated_at)
    SELECT ${article.title}, ${article.slug}, ${article.excerpt}, ${article.content}, ${article.cover_image}, c.id,
      ${article.author}, false, false, NULL, ${article.meta_title}, ${article.meta_description}, ${article.keywords},
      ${article.summary}, ${article.reading_time}, 0, NOW(), NOW()
    FROM inventory CROSS JOIN categories c
    WHERE c.id = ${ledger.targeting.categoryId} AND c.name = ${ledger.targeting.category}
      AND (SELECT count(*) FROM categories WHERE name = ${ledger.targeting.category}) = 1
      AND inventory.total_posts = ${baseline.total_posts} AND inventory.published_posts = ${baseline.published_posts}
      AND inventory.editorial_hash = ${baseline.editorial_hash}
      AND NOT EXISTS (SELECT 1 FROM posts WHERE slug = ${article.slug})
    RETURNING *`;
}

export async function verifyLinks() {
  for (const path of internalLinks) {
    const response = await fetch(siteUrl + path, { redirect: 'manual', signal: AbortSignal.timeout(20000) });
    assert.equal(response.status, 200, `Internal URL status: ${path}`);
    const dom = parseDocument(await response.text());
    const canonical = DomUtils.findAll(node => node.name === 'link' && node.attribs.rel === 'canonical', dom.children);
    assert.equal(canonical.length, 1); assert.equal(canonical[0].attribs.href, siteUrl + path);
    assert(!/\bnoindex\b/i.test(response.headers.get('x-robots-tag') ?? ''));
    assert(!DomUtils.findAll(node => node.name === 'meta' && /^(robots|googlebot)$/i.test(node.attribs.name ?? '') && /\bnoindex\b/i.test(node.attribs.content ?? ''), dom.children).length);
  }
}
async function verifyHidden() {
  for (const path of [`/blog/${article.slug}`, `/stories/${article.slug}`]) {
    const response = await fetch(siteUrl + path, { redirect: 'manual', signal: AbortSignal.timeout(20000) });
    const body = await response.text();
    assert([200, 404].includes(response.status));
    assert(/\bnoindex\b/i.test(response.headers.get('x-robots-tag') ?? '') || /<meta[^>]+content="[^"]*noindex/i.test(body), 'Draft URL must be noindex');
    if (path.startsWith('/blog/')) assert(/Post Not Found/.test(body)); else assert.equal(response.status, 404);
  }
  for (const path of ['/blog', '/sitemap.xml', '/feed.xml']) {
    const response = await fetch(siteUrl + path, { redirect: 'manual', signal: AbortSignal.timeout(20000) });
    assert.equal(response.status, 200); assert(!(await response.text()).includes(article.slug), 'Hidden draft must not be advertised');
  }
}
export async function run(mode = '--offline') {
  assert(['--offline', '--read-only', '--save-draft'].includes(mode), 'Use --offline, --read-only or --save-draft');
  console.log(JSON.stringify({ mode, ...validateArticle() }, null, 2));
  if (mode === '--offline') return;
  const { default: nextEnv } = await import('@next/env');
  const { neon } = await import('@neondatabase/serverless');
  nextEnv.loadEnvConfig(root); assert(process.env.DATABASE_URL, 'Database configuration missing');
  const sql = neon(process.env.DATABASE_URL);
  const read = () => sql.transaction(readQueries, { isolationLevel: 'RepeatableRead', readOnly: true, fetchOptions: { signal: AbortSignal.timeout(30000) } });
  const existing = assertState(await read());
  console.log('GSC_CONFIGURED:', ['GSC_CLIENT_EMAIL', 'GSC_PRIVATE_KEY', 'GSC_SITE_URL'].every(key => Boolean(process.env[key])));
  await verifyLinks();
  if (mode === '--save-draft') {
    assert(!existing, 'Draft already exists; insert refused, never overwrite or blindly retry');
    console.log('Attempting one hidden INSERT. If interrupted, inspect with --read-only before retrying.');
    const [inserted, snapshots] = await sql.transaction(tx => [insertQuery(tx), snapshotQuery(tx)], {
      isolationLevel: 'Serializable', readOnly: false, fetchOptions: { signal: AbortSignal.timeout(30000) },
    });
    assert.equal(inserted.length, 1, 'Insert guard refused; inspect state before retrying');
    console.log('INSERT COMMITTED — DO NOT RERUN:', JSON.stringify({ id: inserted[0].id, slug: inserted[0].slug, published: inserted[0].published }));
    assertSaved(inserted[0]); assert.deepEqual(snapshots[0], baseline);
    const saved = assertState(await read()); assert(saved && saved.id === inserted[0].id);
    console.log('DRAFT VERIFIED:', JSON.stringify({ id: saved.id, published: false, featured: false, scheduledAt: null, otherPostsUnchanged: true, contentSha256 }));
  } else {
    await verifyHidden();
    console.log('READ-ONLY VERIFIED:', JSON.stringify({ id: existing?.id ?? null, saved: Boolean(existing), hidden: true, otherPostsUnchanged: true, images: 'Local first-party PNGs; deployment still required before publication' }));
  }
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  assert(process.argv.length <= 3);
  await run(process.argv[2]).catch(error => {
    console.error(error instanceof assert.AssertionError ? error.message : 'Article operation failed; live-write result may be uncertain. Inspect with --read-only; do not retry a save blindly.');
    process.exitCode = 1;
  });
}