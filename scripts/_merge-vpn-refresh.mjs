import { neon } from '@neondatabase/serverless';
import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd());
const sql = neon(process.env.DATABASE_URL);

const [staged] = await sql`SELECT * FROM posts WHERE slug = 'best-free-vpn-2026-refresh-staging' AND published = false`;
if (!staged) throw new Error('staging draft not found or already published');

const [live] = await sql`SELECT id, slug, created_at FROM posts WHERE slug = 'best-free-vpn-2026'`;
if (!live) throw new Error('live post id 58 not found');

const merged = await sql`UPDATE posts SET
  title = ${staged.title},
  excerpt = ${staged.excerpt},
  content = ${staged.content},
  cover_image = ${staged.cover_image},
  meta_title = ${staged.meta_title},
  meta_description = ${staged.meta_description},
  keywords = ${staged.keywords},
  summary = ${staged.summary},
  reading_time = ${staged.reading_time},
  updated_at = NOW()
  WHERE id = ${live.id}
  RETURNING id, slug, title, published, created_at, updated_at`;

if (merged.length !== 1) throw new Error('merge update failed');

await sql`DELETE FROM posts WHERE id = ${staged.id}`;

const [check] = await sql`SELECT id, slug, published, LENGTH(content) AS len, content LIKE '%Atlas VPN Free%' AS still_has_atlas, cover_image FROM posts WHERE slug = 'best-free-vpn-2026'`;
const stagingGone = await sql`SELECT id FROM posts WHERE slug = 'best-free-vpn-2026-refresh-staging'`;

console.log('MERGED:', JSON.stringify(merged[0]));
console.log('VERIFY:', JSON.stringify(check));
console.log('staging row deleted:', stagingGone.length === 0);
