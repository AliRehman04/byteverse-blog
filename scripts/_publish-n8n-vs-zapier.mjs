import assert from 'node:assert/strict';
import { neon } from '@neondatabase/serverless';
import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd());
const sql = neon(process.env.DATABASE_URL);

// 1) publish (id 221 was inserted as a draft earlier today; this is a new post, not a refresh)
const pub = await sql`UPDATE posts SET published = true, created_at = NOW(), updated_at = NOW()
  WHERE id = 221 AND slug = 'n8n-vs-zapier-2026-comparison' AND published = false
  RETURNING id, slug, published`;
if (pub.length === 1) console.log('PUBLISHED:', JSON.stringify(pub[0]));
else {
  const [a] = await sql`SELECT published FROM posts WHERE id = 221`;
  if (!a?.published) throw new Error('publish failed');
  console.log('PUBLISH: already published');
}

const target = '/blog/n8n-vs-zapier-2026-comparison';
const link = (t) => `[${t}](${target})`;

// Precise, contextual edits at existing natural mentions (not generic last-H2 dumps).
const edits = [
  {
    slug: 'ai-automation-roadmap-2026-what-to-automate-first',
    find: '4. Thursday: Zapier vs Make vs n8n comparison',
    replace: `4. Thursday: ${link('Zapier vs Make vs n8n comparison')}`,
  },
  {
    slug: 'best-ai-agent-builders-2026',
    find: '**Best for:** developers, technical operations teams, and businesses with strict infrastructure or privacy needs.',
    replace: `**Best for:** developers, technical operations teams, and businesses with strict infrastructure or privacy needs.\n\nWeighing n8n against a hosted platform on price? Our ${link('n8n vs Zapier comparison')} breaks down tasks versus executions, real self-hosting costs, and where each one is actually the safer choice.`,
  },
  {
    slug: 'how-to-build-ai-agent-without-coding-2026',
    find: 'The tinkerer\'s choice: free if self-hosted, unlimited customization, and the natural graduation platform when hosted tools feel confining.',
    replace: `The tinkerer's choice: free if self-hosted, unlimited customization, and the natural graduation platform when hosted tools feel confining.\n\nBefore committing to self-hosting, see our ${link('n8n vs Zapier comparison')} for what "free if self-hosted" really costs in server time and maintenance.`,
  },
  {
    slug: 'best-ai-tools-for-small-business-2026',
    find: '**Price:** Free for 100 tasks/month (Starter: $20/month)',
    replace: `**Price:** Free for 100 tasks/month (Starter: $20/month)\n\nConsidering n8n instead? Our ${link('n8n vs Zapier comparison')} compares real pricing, executions versus tasks, and which is actually simpler for a small team.`,
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

const [c] = await sql`SELECT published FROM posts WHERE id = 221`;
const back = await sql`SELECT slug FROM posts WHERE published = true AND content LIKE ${'%' + target + '%'} ORDER BY slug`;
console.log('221 published:', c.published, '| inbound from:', back.map(b => b.slug).join(', '));
