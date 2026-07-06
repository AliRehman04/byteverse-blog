import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";
nextEnv.loadEnvConfig(process.cwd());
const sql = neon(process.env.DATABASE_URL);

const [row] = await sql`SELECT content FROM posts WHERE slug = 'how-to-do-keyword-research-free-2026'`;
const links = [...row.content.matchAll(/\]\((\/blog\/[a-z0-9-]+)\)/g)].map(m => m[1].replace('/blog/', ''));
const unique = [...new Set(links)];
console.log(`Found ${unique.length} unique /blog/ internal links`);
let broken = 0;
for (const slug of unique) {
  const [p] = await sql`SELECT id FROM posts WHERE slug = ${slug} AND published = true`;
  if (!p) { console.log(`  BROKEN: ${slug}`); broken++; }
}
console.log(broken === 0 ? "All internal blog links valid ✓" : `${broken} broken link(s)`);
