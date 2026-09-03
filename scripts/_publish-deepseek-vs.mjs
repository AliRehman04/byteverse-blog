import { neon } from '@neondatabase/serverless';
import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd());
const sql = neon(process.env.DATABASE_URL);

// 1) publish draft #214 (fresh dates so it shows as today's post)
const pub = await sql`UPDATE posts SET published = true, created_at = NOW(), updated_at = NOW()
  WHERE id = 214 AND slug = 'deepseek-vs-chatgpt-2026-comparison' AND published = false
  RETURNING id, slug, published`;
if (pub.length !== 1) {
  const [already] = await sql`SELECT published FROM posts WHERE id = 214`;
  if (!already || !already.published) throw new Error('publish failed');
  console.log('PUBLISH: already published, skipping');
} else {
  console.log('PUBLISHED:', JSON.stringify(pub[0]));
}

// 2) backlinks from hub posts to the new comparison
const target = '/blog/deepseek-vs-chatgpt-2026-comparison';
const edits = [
  {
    slug: 'how-to-use-deepseek-2026-complete-guide',
    find: 'For a deeper head-to-head on the two giants, see [Gemini vs ChatGPT](/blog/gemini-vs-chatgpt-2026-comparison) and [Claude vs ChatGPT](/blog/claude-vs-chatgpt-2026-comparison).',
    replace: 'For the full head-to-head with OpenAI\'s flagship, read our [DeepSeek vs ChatGPT comparison](/blog/deepseek-vs-chatgpt-2026-comparison); for the rest of the field, see [Gemini vs ChatGPT](/blog/gemini-vs-chatgpt-2026-comparison) and [Claude vs ChatGPT](/blog/claude-vs-chatgpt-2026-comparison).',
  },
  {
    slug: 'gemini-vs-chatgpt-2026-comparison',
    find: 'covers its free V4 app, privacy considerations, and where it fits best.',
    replace: 'covers its free V4 app, privacy considerations, and where it fits best — and our [DeepSeek vs ChatGPT head-to-head](/blog/deepseek-vs-chatgpt-2026-comparison) settles that matchup directly.',
  },
];
for (const e of edits) {
  const [row] = await sql`SELECT id, content FROM posts WHERE slug = ${e.slug} AND published = true`;
  if (!row) { console.log(e.slug + ': NOT FOUND, skipped'); continue; }
  if (row.content.includes(target)) { console.log(e.slug + ': backlink already present'); continue; }
  const count = row.content.split(e.find).length - 1;
  if (count !== 1) { console.log(e.slug + ': marker found ' + count + 'x, skipped (manual review)'); continue; }
  const updated = row.content.replace(e.find, e.replace);
  await sql`UPDATE posts SET content = ${updated}, updated_at = NOW() WHERE id = ${row.id}`;
  console.log(e.slug + ': backlink added');
}

// 3) verify
const [check] = await sql`SELECT published FROM posts WHERE id = 214`;
const back = await sql`SELECT slug FROM posts WHERE published = true AND content LIKE ${'%' + target + '%'} ORDER BY slug`;
console.log('post 214 published:', check.published);
console.log('posts linking to new comparison:', back.map(b => b.slug).join(', '));
