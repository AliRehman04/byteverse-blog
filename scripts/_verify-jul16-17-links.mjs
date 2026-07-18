import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";
nextEnv.loadEnvConfig(process.cwd());
const sql = neon(process.env.DATABASE_URL);

for (const slug of ['how-to-optimize-images-for-web-2026', 'how-to-monetize-a-blog-2026']) {
  const [row] = await sql`SELECT content, cover_image FROM posts WHERE slug = ${slug}`;
  const blogLinks = [...new Set([...row.content.matchAll(/\]\((\/blog\/[a-z0-9-]+)\)/g)].map(m => m[1].replace('/blog/', '')))];
  const toolLinks = [...new Set([...row.content.matchAll(/\]\((\/tools\/[a-z0-9-]+)\)/g)].map(m => m[1]))];
  let broken = 0;
  for (const s of blogLinks) {
    const [p] = await sql`SELECT id FROM posts WHERE slug = ${s} AND published = true`;
    if (!p) { console.log(`  BROKEN in ${slug}: ${s}`); broken++; }
  }
  console.log(`${slug}: ${blogLinks.length} blog + ${toolLinks.length} tool links | ${broken === 0 ? 'ALL VALID ✓' : broken + ' broken'}`);
  if (toolLinks.length) console.log(`  tools: ${toolLinks.join(', ')}`);
}
