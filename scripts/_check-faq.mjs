import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';

const envContent = readFileSync('.env.local', 'utf8');
const dbUrl = envContent.match(/DATABASE_URL=(.+)/)?.[1]?.trim();
const sql = neon(dbUrl);

// Fix posts with + prefix in FAQ answers
const slugs = [
  '90-day-blog-content-plan-for-new-websites-in-2026',
  '50-blog-post-ideas-for-new-bloggers-in-2026'
];

for (const slug of slugs) {
  const rows = await sql`SELECT id, content FROM posts WHERE slug = ${slug}`;
  if (!rows.length) continue;
  const { id, content } = rows[0];
  // Replace lines starting with + (FAQ answers)
  const fixed = content.replace(/^\+/gm, '');
  if (fixed !== content) {
    await sql`UPDATE posts SET content = ${fixed} WHERE id = ${id}`;
    console.log(`Fixed ${slug}`);
  }
}
