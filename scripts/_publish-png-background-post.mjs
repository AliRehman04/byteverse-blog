import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import nextEnv from '@next/env';
import { neon } from '@neondatabase/serverless';

// Default: read-only preflight/verification. --apply INSERTS the PNG-to-JPG black-background article
// as published and adds one contextual link to post 150, in ONE serializable transaction.
// No automatic retry; never rerun --apply.
const args = process.argv.slice(2);
assert(args.length <= 1 && args.every(arg => arg === '--apply'), 'Only --apply is supported');
const apply = args.includes('--apply');

const root = fileURLToPath(new URL('../', import.meta.url));
const normalized = path => readFileSync(path, 'utf8').replace(/\r\n?/g, '\n').trim();
const ledger = JSON.parse(normalized(resolve(root, 'docs/png-to-jpg-black-background-keywords-2026-10-13.json')));
const content = normalized(resolve(root, 'scripts/content/png-to-jpg-black-background.md'));
const contentSha256 = createHash('sha256').update(content, 'utf8').digest('hex');
assert.equal(ledger.validation.status, 'passed');
assert.equal(ledger.validation.contentSha256, contentSha256, 'Content changed after validation; revalidate first');

const prose = content.split('\n## Sources and Image Credits')[0].replace(/```[\s\S]*?```/g, '').replace(/!\[[^\]]*\]\([^\n]+\)/g, '').replace(/\[([^\]]+)\]\([^\n)]+\)/g, '$1');
const wordCount = (prose.match(/[\p{L}\p{N}]+(?:['’.-][\p{L}\p{N}]+)*/gu) ?? []).length;
const siteUrl = ledger.website;
const article = Object.freeze({
  title: ledger.targeting.title,
  slug: ledger.slug,
  excerpt: 'Fix a black background after PNG to JPG conversion: check transparency, pick a white or custom background, and learn what a saved JPG cannot restore.',
  content,
  cover_image: `${siteUrl}/blog/png-jpg-background/cover.png`,
  author: 'Ali Rehman',
  published: true,
  featured: false,
  scheduled_at: null,
  meta_title: ledger.targeting.metaTitle,
  meta_description: ledger.targeting.metaDescription,
  keywords: [ledger.targeting.primary, ...ledger.targeting.secondary].join(', '),
  summary: 'JPEG has no transparency, so a PNG must be flattened onto a chosen background colour during conversion.|Check whether the black is a preview artifact, a saved opaque pixel, or real image content before changing anything.|Re-export from the original transparent PNG with a white or custom background; a JPG that already saved black pixels cannot be fully restored.',
  reading_time: `${Math.ceil(wordCount / 220)} min read`,
});
for (const [field, maximum] of Object.entries({ title: 255, slug: 255, author: 100, meta_title: 70, meta_description: 160, reading_time: 20 })) {
  assert([...article[field]].length <= maximum && article[field].trim(), `Invalid ${field}`);
}
assert.equal(article.summary.split('|').length, 3);
assert.equal(article.slug, 'png-to-jpg-black-background');
assert.equal(ledger.targeting.categoryId, 2);

const categoryId = 2;
const baseline = ledger.inventory;
assert.deepEqual(baseline.protectedDrafts.map(draft => draft.id), [229, 230]);
const protectedIds = [229, 230];
const articleUrl = `/blog/${article.slug}`;
const internalSlugs = ledger.internalLinkPlan.filter(url => url.startsWith('/blog/')).map(url => url.slice(6));
const edit = {
  id: 150,
  slug: 'how-to-optimize-images-for-web-2026',
  anchor: 'Practical default: **photos in WebP or AVIF, graphics in SVG, screenshots in PNG only when text sharpness demands it.**',
  replacement: `Practical default: **photos in WebP or AVIF, graphics in SVG, screenshots in PNG only when text sharpness demands it.** If a transparent PNG turns black after JPG conversion, see how to [fix a black background after PNG-to-JPG conversion](${articleUrl}).`,
};

function checkProtected(rows) {
  for (const expected of baseline.protectedDrafts) {
    const row = rows.find(post => post.id === expected.id);
    assert(row && row.slug === expected.slug && row.published === false && row.featured === false && row.scheduled_at === null && row.content_md5 === expected.contentMd5, `Protected draft ${expected.id} changed; refusing`);
  }
}

function checkArticle(row) {
  assert(row && row.slug === article.slug, 'Article row missing');
  for (const [key, value] of Object.entries(article)) assert.ok(row[key] === value, `Article differs in ${key}; do not overwrite`);
  assert.equal(row.category_id, categoryId);
}

async function main() {
  nextEnv.loadEnvConfig(root);
  assert(process.env.DATABASE_URL, 'Database configuration is required');
  const sql = neon(process.env.DATABASE_URL);

  const existing = await sql`SELECT * FROM posts WHERE slug = ${article.slug}`;
  const source = (await sql`SELECT p.*, md5((to_jsonb(p) - 'views')::text) AS editorial_hash FROM posts p WHERE id = ${edit.id}`)[0];
  assert(source && source.slug === edit.slug && source.published, 'Backlink source post missing');
  const protectedRows = await sql`SELECT id, slug, published, featured, scheduled_at, md5(content) AS content_md5 FROM posts WHERE id = ANY(${protectedIds}) ORDER BY id`;
  checkProtected(protectedRows);
  const targets = await sql`SELECT slug, published FROM posts WHERE slug = ANY(${internalSlugs}::text[])`;
  assert(targets.length === internalSlugs.length && targets.every(row => row.published), 'Internal link targets must be published');
  const categories = await sql`SELECT id, name FROM categories WHERE id = ${categoryId}`;
  assert.deepEqual(categories, [{ id: categoryId, name: ledger.targeting.category }]);

  const inventory = async () => (await sql`
    SELECT count(*)::integer AS total, (count(*) FILTER (WHERE published))::integer AS published,
      md5(coalesce(string_agg((to_jsonb(p) - 'views')::text, '' ORDER BY id), '')) AS hash
    FROM posts p WHERE slug <> ${article.slug}`)[0];
  const unrelated = async () => (await sql`
    SELECT count(*)::integer AS count,
      md5(coalesce(string_agg((to_jsonb(p) - 'views')::text, '' ORDER BY id), '')) AS hash
    FROM posts p WHERE slug <> ${article.slug} AND id <> ${edit.id}`)[0];
  const inv = await inventory();
  assert.deepEqual(inv, { total: baseline.totalPosts, published: baseline.publishedPosts, hash: baseline.editorialChecksumExcludingViews }, 'Editorial inventory changed since audit; refusing');
  const before = await unrelated();

  const hasLink = source.content.includes(articleUrl);
  if (!hasLink) assert.equal(source.content.split(edit.anchor).length - 1, 1, 'Anchor not found exactly once in post 150');
  console.log(JSON.stringify({ mode: apply ? 'apply' : 'read-only', articleExists: existing.length === 1, backlinkPresent: hasLink, wordCount, readingTime: article.reading_time, inventory: inv, protectedDrafts: protectedIds }, null, 2));

  if (!apply) {
    if (existing.length) { checkArticle(existing[0]); assert(hasLink, 'Article published without the backlink'); console.log('PASS: article and backlink verified; protected drafts untouched.'); }
    else console.log('PASS: Publication preflight. No database writes.');
    return;
  }
  assert(existing.length === 0, 'Already exists; use read-only verification, not --apply again');
  assert(!hasLink, 'Unexpected partial state; inspect before retrying');
  const newContent = source.content.replace(edit.anchor, () => edit.replacement);

  // Guards divide by zero when a precondition fails, rolling back the whole transaction.
  await sql.transaction([
    sql`SELECT id FROM posts WHERE id = ANY(${[edit.id, ...protectedIds]}) ORDER BY id FOR UPDATE`,
    sql`SELECT 1 / count(*)::integer AS guarded FROM posts p WHERE id = ${edit.id} AND md5((to_jsonb(p) - 'views')::text) = ${source.editorial_hash}`,
    sql`WITH inv AS (
        SELECT count(*)::integer AS total, (count(*) FILTER (WHERE published))::integer AS published,
          md5(coalesce(string_agg((to_jsonb(p) - 'views')::text, '' ORDER BY id), '')) AS hash FROM posts p
      ), ins AS (
        INSERT INTO posts (title, slug, excerpt, content, cover_image, category_id, author, published, featured,
          scheduled_at, meta_title, meta_description, keywords, summary, reading_time, views, created_at, updated_at)
        SELECT ${article.title}, ${article.slug}, ${article.excerpt}, ${article.content}, ${article.cover_image}, c.id,
          ${article.author}, true, false, NULL, ${article.meta_title}, ${article.meta_description}, ${article.keywords},
          ${article.summary}, ${article.reading_time}, 0, NOW(), NOW()
        FROM inv CROSS JOIN categories c
        WHERE c.id = ${categoryId} AND c.name = ${ledger.targeting.category}
          AND inv.total = ${baseline.totalPosts} AND inv.published = ${baseline.publishedPosts}
          AND (SELECT md5(coalesce(string_agg((to_jsonb(q) - 'views')::text, '' ORDER BY id), '')) FROM posts q) = ${baseline.editorialChecksumExcludingViews}
          AND (SELECT count(*) FROM posts WHERE slug = ANY(${internalSlugs}::text[]) AND published) = ${internalSlugs.length}
          AND NOT EXISTS (SELECT 1 FROM posts WHERE slug = ${article.slug})
        RETURNING id
      ) SELECT 1 / count(*)::integer AS inserted_once FROM ins`,
    sql`WITH changed AS (
        UPDATE posts SET content = ${newContent}, updated_at = NOW()
        WHERE id = ${edit.id} AND slug = ${edit.slug} AND published = true AND content = ${source.content}
        RETURNING id
      ) SELECT 1 / count(*)::integer AS linked_once FROM changed`,
  ], { isolationLevel: 'Serializable' });
  console.log('PUBLICATION TRANSACTION COMMITTED: article inserted as published and one backlink added. Do not rerun --apply.');

  const after = await sql`SELECT * FROM posts WHERE slug = ${article.slug}`;
  assert.equal(after.length, 1); checkArticle(after[0]);
  const sourceAfter = (await sql`SELECT * FROM posts WHERE id = ${edit.id}`)[0];
  assert.equal(sourceAfter.content, newContent, 'Backlink verification failed');
  for (const key of Object.keys(source).filter(key => !['content', 'updated_at', 'views', 'editorial_hash'].includes(key))) {
    const o = source[key], c = sourceAfter[key];
    assert.ok(o instanceof Date ? c instanceof Date && c.getTime() === o.getTime() : o === c, `Unexpected source field change: ${key}`);
  }
  checkProtected(await sql`SELECT id, slug, published, featured, scheduled_at, md5(content) AS content_md5 FROM posts WHERE id = ANY(${protectedIds}) ORDER BY id`);
  const unrelatedAfter = await unrelated();
  assert.deepEqual(unrelatedAfter, before, 'Unrelated editorial records changed; inspect without overwriting');
  console.log('PASS:', JSON.stringify({ publishedId: after[0].id, slug: article.slug, backlinkPost: edit.id, protectedDrafts: protectedIds, unrelatedPostsUnchanged: unrelatedAfter.count }));
}

try {
  await main();
} catch (error) {
  console.error(error instanceof assert.AssertionError ? error.message : 'Publication/verification failed. No automatic retry. Check current state with the read-only command before taking further action; do not expose connection details.');
  process.exitCode = 1;
}
