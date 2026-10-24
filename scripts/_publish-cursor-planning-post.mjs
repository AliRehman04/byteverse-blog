import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import nextEnv from '@next/env';
import { neon } from '@neondatabase/serverless';

// Default: read-only preflight/verification. --apply INSERTS the Cursor "Planning next moves" article as
// published in ONE guarded serializable transaction (no backlink edits). No automatic retry; never rerun --apply.
const args = process.argv.slice(2);
assert(args.length <= 1 && args.every(arg => arg === '--apply'), 'Only --apply is supported');
const apply = args.includes('--apply');

const root = fileURLToPath(new URL('../', import.meta.url));
const normalized = path => readFileSync(path, 'utf8').replace(/\r\n?/g, '\n').trim();
const ledger = JSON.parse(normalized(resolve(root, 'docs/cursor-planning-next-moves-keywords-2026-10-24.json')));
const content = normalized(resolve(root, `scripts/content/${ledger.slug}.md`));
const contentSha256 = createHash('sha256').update(content, 'utf8').digest('hex');
assert.equal(ledger.validation.contentSha256, contentSha256, 'Content changed after validation; rerun scripts/test-cursor-planning-post.mjs first');

const prose = content.split('\n## Sources and Further Reading')[0].replace(/\[([^\]]+)\]\([^\n)]+\)/g, (_, label) => label);
const wordCount = (prose.match(/[\p{L}\p{N}]+(?:['’.-][\p{L}\p{N}]+)*/gu) ?? []).length;
assert.equal(wordCount, ledger.validation.proseWords);
const coverPath = resolve(root, 'public/blog/cursor-planning-next-moves/cover.png');
const cover = readFileSync(coverPath);
assert.equal(cover.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', 'Cover must be a PNG');

const article = Object.freeze({
  title: ledger.targeting.title,
  slug: ledger.slug,
  excerpt: ledger.targeting.excerpt,
  content,
  cover_image: `${ledger.website}/blog/cursor-planning-next-moves/cover.png`,
  author: ledger.targeting.author,
  published: true,
  featured: false,
  scheduled_at: null,
  meta_title: ledger.targeting.metaTitle,
  meta_description: ledger.targeting.metaDescription,
  keywords: ledger.targeting.keywords,
  summary: ledger.targeting.summary,
  reading_time: `${Math.ceil(wordCount / 220)} min read`,
});
for (const [field, maximum] of Object.entries({ title: 255, slug: 255, author: 100, meta_title: 70, meta_description: 160, reading_time: 20 })) {
  assert([...article[field]].length <= maximum && article[field].trim(), `Invalid ${field}`);
}
assert.equal(article.reading_time, ledger.targeting.readingTime);
assert.equal(article.summary.split('|').length, 3);
assert.equal(article.slug, 'cursor-agent-stuck-planning-next-moves-2026');
const categoryId = ledger.targeting.categoryId;
assert.equal(categoryId, 4);
const baseline = ledger.inventory;
const protectedSlugs = baseline.protectedDrafts;
const internalSlugs = ledger.internalLinkPlan.filter(url => url.startsWith('/blog/')).map(url => url.slice(6));
const toolPaths = ledger.internalLinkPlan.filter(url => url.startsWith('/tools/'));
for (const path of toolPaths) assert(readFileSync(resolve(root, `src/app${path}/page.tsx`), 'utf8').length > 0, `Tool route missing: ${path}`);

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
  const protectedRows = await sql`SELECT slug, published FROM posts WHERE slug = ANY(${protectedSlugs}::text[]) ORDER BY slug`;
  assert(protectedRows.length === protectedSlugs.length && protectedRows.every(row => row.published === false), 'Protected drafts changed; refusing');
  const targets = await sql`SELECT slug, published FROM posts WHERE slug = ANY(${internalSlugs}::text[])`;
  assert(targets.length === internalSlugs.length && targets.every(row => row.published), 'Internal link targets must be published');
  const categories = await sql`SELECT id, name FROM categories WHERE id = ${categoryId}`;
  assert.deepEqual(categories, [{ id: categoryId, name: ledger.targeting.category }]);
  const inventory = async () => (await sql`
    SELECT count(*)::integer AS total, (count(*) FILTER (WHERE published))::integer AS published,
      md5(coalesce(string_agg((to_jsonb(p) - 'views')::text, '' ORDER BY id), '')) AS hash
    FROM posts p WHERE slug <> ${article.slug}`)[0];
  const inv = await inventory();
  assert.deepEqual(inv, { total: baseline.totalPosts, published: baseline.publishedPosts, hash: baseline.editorialChecksumExcludingViews }, 'Editorial inventory changed since audit; refusing');
  console.log(JSON.stringify({ mode: apply ? 'apply' : 'read-only', articleExists: existing.length === 1, wordCount, readingTime: article.reading_time, inventory: inv, protectedDrafts: protectedSlugs, internalTargets: internalSlugs }, null, 2));

  if (!apply) {
    if (existing.length) { checkArticle(existing[0]); console.log('PASS: published article verified; other records unchanged.'); }
    else console.log('PASS: Publication preflight. No database writes.');
    return;
  }
  assert(existing.length === 0, 'Already exists; use read-only verification, not --apply again');

  // The INSERT ... SELECT re-checks every precondition inside the transaction; the final 1/count fails (rolls back) unless exactly one row was inserted.
  await sql.transaction([
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
          AND inv.total = ${baseline.totalPosts} AND inv.published = ${baseline.publishedPosts} AND inv.hash = ${baseline.editorialChecksumExcludingViews}
          AND (SELECT count(*) FROM posts WHERE slug = ANY(${internalSlugs}::text[]) AND published) = ${internalSlugs.length}
          AND (SELECT count(*) FROM posts WHERE slug = ANY(${protectedSlugs}::text[]) AND NOT published) = ${protectedSlugs.length}
          AND NOT EXISTS (SELECT 1 FROM posts WHERE slug = ${article.slug})
        RETURNING id
      ) SELECT 1 / count(*)::integer AS inserted_once FROM ins`,
  ], { isolationLevel: 'Serializable' });
  console.log('PUBLICATION TRANSACTION COMMITTED: article inserted as published. Do not rerun --apply.');

  const after = await sql`SELECT * FROM posts WHERE slug = ${article.slug}`;
  assert.equal(after.length, 1); checkArticle(after[0]);
  const invAfter = await inventory();
  assert.deepEqual(invAfter, inv, 'Unrelated editorial records changed; inspect without overwriting');
  console.log('PASS:', JSON.stringify({ publishedId: after[0].id, slug: article.slug, createdAt: after[0].created_at, otherPostsUnchanged: invAfter.total }));
}

try {
  await main();
} catch (error) {
  console.error(error instanceof assert.AssertionError ? error.message : `Publication/verification failed (${error.code ?? error.name}). No automatic retry. Check current state with the read-only command before taking further action.`);
  process.exitCode = 1;
}
