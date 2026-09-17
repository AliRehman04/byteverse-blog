import assert from 'node:assert/strict';
import { neon } from '@neondatabase/serverless';
import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd());
const sql = neon(process.env.DATABASE_URL);

// 1) publish (id 223 was inserted as a draft yesterday; this is a new post, not a refresh)
const pub = await sql`UPDATE posts SET published = true, created_at = NOW(), updated_at = NOW()
  WHERE id = 223 AND slug = 'perplexity-vs-claude-2026-comparison' AND published = false
  RETURNING id, slug, published`;
if (pub.length === 1) console.log('PUBLISHED:', JSON.stringify(pub[0]));
else {
  const [a] = await sql`SELECT published FROM posts WHERE id = 223`;
  if (!a?.published) throw new Error('publish failed');
  console.log('PUBLISH: already published');
}

const target = '/blog/perplexity-vs-claude-2026-comparison';
const link = (t) => `[${t}](${target})`;

// Precise, contextual edits at existing natural mentions (not generic last-H2 dumps).
const edits = [
  {
    slug: 'perplexity-vs-chatgpt-2026-comparison',
    find: 'Partly — Perplexity Pro includes OpenAI models (like GPT-5.2) alongside Claude Sonnet 4.6, Gemini 3.1 Pro, Grok 4, and its own Sonar model. You pick the model per query, which is Perplexity\'s structural advantage: one subscription, every major vendor.',
    replace: `Partly — Perplexity Pro includes OpenAI models (like GPT-5.2) alongside Claude Sonnet 4.6, Gemini 3.1 Pro, Grok 4, and its own Sonar model. You pick the model per query, which is Perplexity's structural advantage: one subscription, every major vendor. For how that Claude access compares to using Claude's own apps directly, see our ${link('Perplexity vs Claude comparison')}.`,
  },
  {
    slug: 'claude-vs-chatgpt-2026-comparison',
    find: 'No. Claude does not have web browsing capability. It only knows information from its training data. For current events and real-time information, use ChatGPT or Perplexity.',
    replace: `No. Claude does not have web browsing capability. It only knows information from its training data. For current events and real-time information, use ChatGPT or Perplexity. Our ${link('Perplexity vs Claude comparison')} breaks down exactly when each one wins.`,
  },
  {
    slug: 'how-to-use-claude-ai-2026-complete-guide',
    find: 'For research that needs current web information and citations, it is worth comparing Claude against dedicated research tools. Our breakdown of [Perplexity vs Google Gemini](/blog/perplexity-vs-google-gemini-2026-research) and the guide to [best AI search engines](/blog/best-ai-search-engines-2026) explain which tools handle live data and sources best.',
    replace: `For research that needs current web information and citations, it is worth comparing Claude against dedicated research tools. Our ${link('Perplexity vs Claude comparison')}, breakdown of [Perplexity vs Google Gemini](/blog/perplexity-vs-google-gemini-2026-research), and guide to [best AI search engines](/blog/best-ai-search-engines-2026) explain which tools handle live data and sources best.`,
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

const [c] = await sql`SELECT published FROM posts WHERE id = 223`;
const back = await sql`SELECT slug FROM posts WHERE published = true AND content LIKE ${'%' + target + '%'} ORDER BY slug`;
console.log('223 published:', c.published, '| inbound from:', back.map(b => b.slug).join(', '));
