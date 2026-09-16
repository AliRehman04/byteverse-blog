import assert from 'node:assert/strict';
import { neon } from '@neondatabase/serverless';
import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd());
const sql = neon(process.env.DATABASE_URL);

// 1) publish (id 222 was inserted as a draft yesterday; this is a new post, not a refresh)
const pub = await sql`UPDATE posts SET published = true, created_at = NOW(), updated_at = NOW()
  WHERE id = 222 AND slug = 'how-to-use-n8n-2026-complete-guide' AND published = false
  RETURNING id, slug, published`;
if (pub.length === 1) console.log('PUBLISHED:', JSON.stringify(pub[0]));
else {
  const [a] = await sql`SELECT published FROM posts WHERE id = 222`;
  if (!a?.published) throw new Error('publish failed');
  console.log('PUBLISH: already published');
}

const target = '/blog/how-to-use-n8n-2026-complete-guide';
const link = (t) => `[${t}](${target})`;

// Precise, contextual edits at existing natural mentions (not generic last-H2 dumps).
// Avoids double-stacking a second link inside paragraphs that already got the
// n8n-vs-zapier backlink yesterday (small-business tools, no-code-agent guide).
const edits = [
  {
    slug: 'ai-automation-roadmap-2026-what-to-automate-first',
    find: '3. Wednesday: n8n workflow tutorial',
    replace: `3. Wednesday: ${link('n8n workflow tutorial')}`,
  },
  {
    slug: 'n8n-vs-zapier-2026-comparison',
    find: 'Do not choose it merely because the software license is free.',
    replace: `Do not choose it merely because the software license is free. Once you have picked n8n, our ${link('step-by-step n8n tutorial')} walks through your first workflow, templates, and a first AI agent with human approval.`,
  },
  {
    slug: 'best-ai-agent-builders-2026',
    find: '- good for internal tools, backend automation, and sensitive data workflows',
    replace: `- good for internal tools, backend automation, and sensitive data workflows\n- a documented ${link('step-by-step beginner tutorial')} for your first workflow`,
  },
];

for (const e of edits) {
  const [row] = await sql`SELECT id, content FROM posts WHERE slug = ${e.slug} AND published = true`;
  if (!row) { console.log(e.slug + ': NOT FOUND'); continue; }
  if (row.content.includes(target)) { console.log(e.slug + ': already linked'); continue; }
  const count = row.content.split(e.find).length - 1;
  assert.equal(count, 1, `${e.slug}: anchor text not uniquely found (count=${count})`);
  const updated = row.content.replace(e.find, e.replace);
  await sql`UPDATE posts SET content = ${updated}, updated_at = NOW() WHERE id = ${row.id}`;
  console.log(e.slug + ': backlink added at contextual anchor');
}

const [c] = await sql`SELECT published FROM posts WHERE id = 222`;
const back = await sql`SELECT slug FROM posts WHERE published = true AND content LIKE ${'%' + target + '%'} ORDER BY slug`;
console.log('222 published:', c.published, '| inbound from:', back.map(b => b.slug).join(', '));
