import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf8');
const dbUrl = env.match(/DATABASE_URL=(.+)/)[1].trim();
const sql = neon(dbUrl);

// Get all published posts
const rows = await sql`SELECT slug, content FROM posts WHERE published = true ORDER BY slug`;

console.log(`Total posts: ${rows.length}\n`);

let under5 = 0;
for (const row of rows) {
  const internalLinks = [...row.content.matchAll(/\[([^\]]*)\]\((\/[^)]+)\)/g)];
  const blogLinks = internalLinks.filter(m => m[2].startsWith('/blog/'));
  const toolLinks = internalLinks.filter(m => m[2].startsWith('/tools/'));
  const total = internalLinks.length;
  if (total < 5) under5++;
  console.log(`${row.slug} | blog:${blogLinks.length} tool:${toolLinks.length} | total:${total}${total < 5 ? ' ⚠️' : ''}`);
}
console.log(`\n⚠️  Posts with <5 internal links: ${under5}`);
