import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { neon } from '@neondatabase/serverless';
import nextEnv from '@next/env';

// Merges the hidden refresh (id 224) INTO the existing live post (id 45), preserving
// slug/id/created_at/views so its URL and publication history do not change. Deletes
// the staging row afterward. No new article is published; #45 was already live.
nextEnv.loadEnvConfig(process.cwd());
assert(process.env.DATABASE_URL, 'DATABASE_URL is required');
const sql = neon(process.env.DATABASE_URL);

const liveId = 45;
const liveSlug = 'best-free-hosting-platforms-2026';
const stagingSlug = `${liveSlug}-refresh-staging`;
const expectedSourceHash = '3fbfad253a3e5e59a867cdcc86489041b08da729f3b37bce6b2f96061bb8a846';

const [live] = await sql`SELECT * FROM posts WHERE id = ${liveId} AND slug = ${liveSlug}`;
assert(live?.published === true, 'Live hosting post not found or not published');
assert.equal(createHash('sha256').update(live.content).digest('hex'), expectedSourceHash, 'Live content changed since validation; re-check before merging');

const [staging] = await sql`SELECT * FROM posts WHERE slug = ${stagingSlug}`;
assert(staging?.id === 224 && staging.published === false, 'Staging refresh row missing or already public');

const [merged] = await sql`UPDATE posts SET
  title = ${staging.title},
  excerpt = ${staging.excerpt},
  content = ${staging.content},
  cover_image = ${staging.cover_image},
  meta_title = ${staging.meta_title},
  meta_description = ${staging.meta_description},
  keywords = ${staging.keywords},
  summary = ${staging.summary},
  reading_time = ${staging.reading_time},
  updated_at = NOW()
  WHERE id = ${liveId} AND slug = ${liveSlug} AND published = true
  RETURNING id, slug, title, published, created_at, updated_at`;
assert(merged, 'Merge update did not affect the live row');
assert.equal(merged.slug, liveSlug, 'Slug must not change');

const [deleted] = await sql`DELETE FROM posts WHERE id = 224 AND slug = ${stagingSlug} RETURNING id`;
assert(deleted, 'Staging row was not deleted');

console.log('MERGED:', JSON.stringify(merged));
console.log('STAGING ROW DELETED:', deleted.id);
