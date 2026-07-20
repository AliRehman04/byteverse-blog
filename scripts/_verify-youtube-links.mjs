import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";
nextEnv.loadEnvConfig(process.cwd());
const sql = neon(process.env.DATABASE_URL);

const [row] = await sql`SELECT content, cover_image FROM posts WHERE slug = 'how-to-start-youtube-channel-2026'`;
const blogLinks = [...new Set([...row.content.matchAll(/\]\((\/blog\/[a-z0-9-]+)\)/g)].map(m => m[1].replace('/blog/', '')))];
const toolLinks = [...new Set([...row.content.matchAll(/\]\((\/tools\/[a-z0-9-]+)\)/g)].map(m => m[1]))];
console.log(`Cover: ${row.cover_image}`);
console.log(`Found ${blogLinks.length} blog + ${toolLinks.length} tool links`);
let broken = 0;
for (const s of blogLinks) {
  const [p] = await sql`SELECT id FROM posts WHERE slug = ${s} AND published = true`;
  if (!p) { console.log(`  BROKEN: ${s}`); broken++; }
}
console.log(`Tools: ${toolLinks.join(', ')}`);
console.log(broken === 0 ? "All internal blog links valid ✓" : `${broken} broken`);
