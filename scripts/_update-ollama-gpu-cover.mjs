import assert from 'node:assert/strict';
import nextEnv from '@next/env';
import { neon } from '@neondatabase/serverless';
import { article, root, siteUrl } from './_add-ollama-gpu-post.mjs';

// Default read-only. --apply swaps only post 235's cover_image from the old PNG to cover-v2 once.
const args = process.argv.slice(2);
assert(args.length <= 1 && args.every(arg => arg === '--apply'), 'Only --apply is supported');
const apply = args.includes('--apply');
const id = 235;
const oldCover = `${siteUrl}/blog/ollama-gpu/cover.png`;
const newCover = article.cover_image;
assert.equal(newCover, `${siteUrl}/blog/ollama-gpu/cover-v2.png`);

nextEnv.loadEnvConfig(root);
assert(process.env.DATABASE_URL, 'Database configuration is required');
const sql = neon(process.env.DATABASE_URL);
const live = await fetch(`${newCover}?v=${Date.now()}`);
assert(live.ok && live.headers.get('content-type')?.startsWith('image/png'), 'New cover is not deployed yet; push and wait first');

const snapshot = async () => (await sql`
  SELECT count(*)::integer AS count, md5(coalesce(string_agg((to_jsonb(p) - 'views')::text, '' ORDER BY id), '')) AS hash
  FROM posts p WHERE id <> ${id}
`)[0];
const [row] = await sql`SELECT id, slug, published, cover_image FROM posts WHERE id = ${id}`;
assert(row && row.slug === article.slug && row.published === true, 'Expected published post 235');
console.log(JSON.stringify({ mode: apply ? 'apply' : 'read-only', id, cover: row.cover_image }));

if (row.cover_image === newCover) {
  console.log('PASS: cover-v2 already set.');
} else {
  assert.equal(row.cover_image, oldCover, 'Unexpected cover_image; refusing to overwrite');
  if (!apply) {
    console.log('PASS: preflight. No database writes.');
  } else {
    const before = await snapshot();
    const [changed] = await sql`
      WITH changed AS (
        UPDATE posts SET cover_image = ${newCover}
        WHERE id = ${id} AND slug = ${article.slug} AND cover_image = ${oldCover}
        RETURNING id
      ) SELECT 1 / count(*)::integer AS updated_once FROM changed
    `;
    assert.equal(changed.updated_once, 1);
    assert.deepEqual(await snapshot(), before, 'Unrelated posts changed; inspect');
    console.log('PASS: cover_image updated to cover-v2; other posts unchanged.');
  }
}
