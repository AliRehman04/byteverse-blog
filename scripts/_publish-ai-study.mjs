import { neon } from '@neondatabase/serverless';
import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd());
const sql = neon(process.env.DATABASE_URL);

// 1) publish
const pub = await sql`UPDATE posts SET published = true, created_at = NOW(), updated_at = NOW()
  WHERE id = 219 AND slug = 'how-to-use-ai-to-study-2026' AND published = false
  RETURNING id, slug, published`;
if (pub.length === 1) console.log('PUBLISHED:', JSON.stringify(pub[0]));
else {
  const [a] = await sql`SELECT published FROM posts WHERE id = 219`;
  if (!a?.published) throw new Error('publish failed');
  console.log('PUBLISH: already published');
}

const target = '/blog/how-to-use-ai-to-study-2026';
const link = (t) => `[${t}](${target})`;
const edits = [
  {
    slug: 'best-ai-tools-for-students-2026-free-study-apps',
    insert: `\n\nHave the tools but not the method? Our guide on ${link('how to use AI to study')} covers the workflows that actually move grades — Socratic study modes, active recall, and spaced repetition.\n`,
  },
  {
    slug: 'time-blocking-for-students-2026-ai-study-planner',
    insert: `\n\nOnce your schedule is set, fill those blocks properly: our guide on ${link('how to use AI to study')} walks through the active-recall and spaced-repetition workflows to run inside each session.\n`,
  },
  {
    slug: 'how-to-use-notebooklm-2026-complete-guide',
    insert: `\n\nStudying for exams specifically? See how NotebookLM fits into a full study system in our guide on ${link('how to use AI to study')}.\n`,
  },
  {
    slug: 'how-to-use-ai-for-interview-prep-2026',
    insert: `\n\nThe same rehearse-and-review loop works for exams — our guide on ${link('how to use AI to study')} applies it to coursework and past papers.\n`,
  },
];
for (const e of edits) {
  const [row] = await sql`SELECT id, content FROM posts WHERE slug = ${e.slug} AND published = true`;
  if (!row) { console.log(e.slug + ': NOT FOUND'); continue; }
  if (row.content.includes(target)) { console.log(e.slug + ': already linked'); continue; }
  const lastH2 = [...row.content.matchAll(/\n## .+/g)].pop();
  if (!lastH2) { console.log(e.slug + ': no H2, skipped'); continue; }
  const updated = row.content.slice(0, lastH2.index) + e.insert + row.content.slice(lastH2.index);
  await sql`UPDATE posts SET content = ${updated}, updated_at = NOW() WHERE id = ${row.id}`;
  console.log(e.slug + ': backlink added before "' + lastH2[0].trim() + '"');
}

const [c] = await sql`SELECT published FROM posts WHERE id = 219`;
const back = await sql`SELECT slug FROM posts WHERE published = true AND content LIKE ${'%' + target + '%'} ORDER BY slug`;
console.log('219 published:', c.published, '| inbound from:', back.map(b => b.slug).join(', '));
