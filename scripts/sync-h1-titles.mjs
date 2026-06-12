import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';

const envContent = readFileSync('.env.local', 'utf8');
const dbUrl = envContent.match(/DATABASE_URL=(.+)/)?.[1]?.trim();
const sql = neon(dbUrl);

// Update H1 in content to match the new title for each fixed post
const rows = await sql`SELECT slug, title, content FROM posts WHERE published = true`;

let fixed = 0;
for (const r of rows) {
  const h1Match = r.content.match(/^# (.+)$/m);
  if (!h1Match) continue;

  const currentH1 = h1Match[1].trim();
  const newTitle = r.title.trim();

  // If H1 differs from title, update it
  if (currentH1 !== newTitle) {
    const updatedContent = r.content.replace(/^# .+$/m, `# ${newTitle}`);
    await sql`UPDATE posts SET content = ${updatedContent} WHERE slug = ${r.slug}`;
    fixed++;
  }
}

console.log(`✅ Synced H1 headings with titles for ${fixed} posts`);
