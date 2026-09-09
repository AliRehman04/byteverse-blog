import { neon } from '@neondatabase/serverless';
import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd());
const sql = neon(process.env.DATABASE_URL);

// 1) publish
const pub = await sql`UPDATE posts SET published = true, created_at = NOW(), updated_at = NOW()
  WHERE id = 217 AND slug = 'perplexity-vs-chatgpt-2026-comparison' AND published = false
  RETURNING id, slug, published`;
if (pub.length === 1) console.log('PUBLISHED:', JSON.stringify(pub[0]));
else {
  const [a] = await sql`SELECT published FROM posts WHERE id = 217`;
  if (!a?.published) throw new Error('publish failed');
  console.log('PUBLISH: already published');
}

// 2) hub backlinks (generic: insert before the LAST H2, idempotent)
const target = '/blog/perplexity-vs-chatgpt-2026-comparison';
const link = (text) => `[${text}](${target})`;
const edits = [
  {
    slug: 'how-to-use-perplexity-ai-2026-complete-guide',
    insert: `\n\nWeighing it against OpenAI's assistant? Our ${link('Perplexity vs ChatGPT comparison')} runs the full round-by-round breakdown — research, writing, models, and price.\n`,
  },
  {
    slug: 'perplexity-vs-google-gemini-2026-research',
    insert: `\n\nCurious how it stacks up against ChatGPT instead of Gemini? Our ${link('Perplexity vs ChatGPT comparison')} covers that matchup directly.\n`,
  },
  {
    slug: 'deepseek-vs-chatgpt-2026-comparison',
    insert: `\n\nFor the research-and-citations angle instead of raw reasoning, our ${link('Perplexity vs ChatGPT comparison')} compares the answer-engine approach against OpenAI's assistant.\n`,
  },
  {
    slug: 'best-ai-search-engines-2026',
    insert: `\n\nWant the deep dive on the field's two biggest names? Our ${link('Perplexity vs ChatGPT comparison')} breaks down research quality, pricing, and verdicts by user type.\n`,
  },
];
for (const e of edits) {
  const [row] = await sql`SELECT id, content FROM posts WHERE slug = ${e.slug} AND published = true`;
  if (!row) { console.log(e.slug + ': NOT FOUND'); continue; }
  if (row.content.includes(target)) { console.log(e.slug + ': already linked'); continue; }
  const lastH2 = [...row.content.matchAll(/\n## .+/g)].pop();
  if (!lastH2) { console.log(e.slug + ': no H2 found, skipped'); continue; }
  const updated = row.content.slice(0, lastH2.index) + e.insert + row.content.slice(lastH2.index);
  await sql`UPDATE posts SET content = ${updated}, updated_at = NOW() WHERE id = ${row.id}`;
  console.log(e.slug + ': backlink added before "' + lastH2[0].trim() + '"');
}

// 3) verify
const [c] = await sql`SELECT published FROM posts WHERE id = 217`;
const back = await sql`SELECT slug FROM posts WHERE published = true AND content LIKE ${'%' + target + '%'} ORDER BY slug`;
console.log('217 published:', c.published, '| inbound from:', back.map(b => b.slug).join(', '));
