import { neon } from '@neondatabase/serverless';
import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd());
const sql = neon(process.env.DATABASE_URL);

// 1) publish
const pub = await sql`UPDATE posts SET published = true, created_at = NOW(), updated_at = NOW()
  WHERE id = 218 AND slug = 'how-to-use-grok-2026-complete-guide' AND published = false
  RETURNING id, slug, published`;
if (pub.length === 1) console.log('PUBLISHED:', JSON.stringify(pub[0]));
else {
  const [a] = await sql`SELECT published FROM posts WHERE id = 218`;
  if (!a?.published) throw new Error('publish failed');
  console.log('PUBLISH: already published');
}

const target = '/blog/how-to-use-grok-2026-complete-guide';
const link = (text) => `[${text}](${target})`;

// 2a) special: best-ai-chatbots-2026 has an existing "### Grok (xAI)" section — link right after its intro line
const specialSlug = 'best-ai-chatbots-2026';
{
  const [row] = await sql`SELECT id, content FROM posts WHERE slug = ${specialSlug} AND published = true`;
  if (row && !row.content.includes(target)) {
    const find = 'It excels at mathematical reasoning, programming, and structured analysis.';
    // this string belongs to DeepSeek section in that post; use the actual Grok paragraph instead
    const grokMarker = /### Grok \(xAI\)[\s\S]*?(?=\n### |\n## |$)/;
    const m = row.content.match(grokMarker);
    if (m) {
      const block = m[0];
      const updatedBlock = block.replace(/\n*$/, '') + `\n\nFor the full setup — modes, free video limits, and how it compares to ChatGPT — see our ${link('Grok guide')}.\n`;
      const updated = row.content.replace(block, updatedBlock);
      await sql`UPDATE posts SET content = ${updated}, updated_at = NOW() WHERE id = ${row.id}`;
      console.log(specialSlug + ': backlink added inside Grok section');
    } else {
      console.log(specialSlug + ': Grok section marker not found, skipped');
    }
  } else {
    console.log(specialSlug + ': not found or already linked');
  }
}

// 2b) generic: insert before the LAST H2 for the remaining hub posts
const edits = [
  {
    slug: 'gemini-vs-chatgpt-2026-comparison',
    insert: `\n\nWondering where X's assistant fits into this four-way race? Our ${link('Grok guide')} covers its real-time edge, free video limits, and honest comparison to the others.\n`,
  },
  {
    slug: 'best-chatgpt-alternatives-2026-free-paid',
    insert: `\n\nFor the alternative built around real-time X and web search, our ${link('Grok guide')} covers setup, the four modes, and what's actually free.\n`,
  },
  {
    slug: 'perplexity-vs-chatgpt-2026-comparison',
    insert: `\n\nGrok 4 is one of the models inside Perplexity's buffet — if you want it standalone instead, our ${link('Grok guide')} covers its own app, free video limits, and live X search.\n`,
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
const [c] = await sql`SELECT published FROM posts WHERE id = 218`;
const back = await sql`SELECT slug FROM posts WHERE published = true AND content LIKE ${'%' + target + '%'} ORDER BY slug`;
console.log('218 published:', c.published, '| inbound from:', back.map(b => b.slug).join(', '));
