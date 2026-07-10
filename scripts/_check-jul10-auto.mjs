import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";
nextEnv.loadEnvConfig(process.cwd());
const sql = neon(process.env.DATABASE_URL);

// Posts created/scheduled/published around Jul 9-10
const rows = await sql`
  SELECT id, slug, published, scheduled_at, created_at, 
         LENGTH(content) AS content_len,
         (SELECT COUNT(*) FROM regexp_matches(content, '\\]\\(/blog/', 'g')) AS internal_links
  FROM posts
  WHERE created_at >= '2026-07-09T00:00:00Z' OR scheduled_at >= '2026-07-09T00:00:00Z'
  ORDER BY created_at DESC
`;
for (const r of rows) {
  const words = Math.round(r.content_len / 6);
  console.log(`[${r.id}] ${r.slug}`);
  console.log(`    published: ${r.published} | scheduled: ${r.scheduled_at || '-'} | created: ${r.created_at}`);
  console.log(`    approx content chars: ${r.content_len} | internal /blog/ links: ${r.internal_links}`);
}
if (rows.length === 0) console.log("No posts created/scheduled on Jul 9-10.");
