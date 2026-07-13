import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";
nextEnv.loadEnvConfig(process.cwd());
const sql = neon(process.env.DATABASE_URL);

const [row] = await sql`SELECT content, cover_image FROM posts WHERE slug = 'how-to-write-seo-titles-2026'`;
const blogLinks = [...row.content.matchAll(/\]\((\/blog\/[a-z0-9-]+)\)/g)].map(m => m[1].replace('/blog/', ''));
const toolLinks = [...row.content.matchAll(/\]\((\/tools\/[a-z0-9-]+)\)/g)].map(m => m[1]);
const unique = [...new Set(blogLinks)];
console.log(`Cover: ${row.cover_image}`);
console.log(`Found ${unique.length} unique /blog/ links, ${new Set(toolLinks).size} unique /tools/ links`);
let broken = 0;
for (const slug of unique) {
  const [p] = await sql`SELECT id FROM posts WHERE slug = ${slug} AND published = true`;
  if (!p) { console.log(`  BROKEN blog: ${slug}`); broken++; }
}
console.log(`Tool links: ${[...new Set(toolLinks)].join(', ')}`);
console.log(broken === 0 ? "All internal blog links valid ✓" : `${broken} broken link(s)`);
