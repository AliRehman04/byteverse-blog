import { neon } from '@neondatabase/serverless';
import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd());
const sql = neon(process.env.DATABASE_URL);

// 1) publish
const pub = await sql`UPDATE posts SET published = true, created_at = NOW(), updated_at = NOW()
  WHERE id = 216 AND slug = 'claude-vs-gemini-2026-comparison' AND published = false
  RETURNING id, slug, published`;
if (pub.length === 1) console.log('PUBLISHED:', JSON.stringify(pub[0]));
else {
  const [a] = await sql`SELECT published FROM posts WHERE id = 216`;
  if (!a?.published) throw new Error('publish failed');
  console.log('PUBLISH: already published');
}

// 2) hub backlinks (exact-marker, idempotent)
const target = '/blog/claude-vs-gemini-2026-comparison';
const link = (text) => `[${text}](${target})`;
const edits = [
  {
    slug: 'gemini-vs-chatgpt-2026-comparison',
    find: 'settles that matchup directly.',
    replace: `settles that matchup directly. Weighing Google against Anthropic instead? Our ${link('Claude vs Gemini comparison')} covers that pairing round by round.`,
  },
  {
    slug: 'claude-vs-chatgpt-2026-comparison',
    findRegex: /\n## (Bottom Line|Final Verdict|Verdict|Conclusion)/,
    insert: `\n\nIf Google's assistant is your other candidate, our ${link('Claude vs Gemini comparison')} runs the same honest round-by-round analysis against Gemini.\n`,
  },
  {
    slug: 'how-to-use-claude-ai-2026-complete-guide',
    findRegex: /\n## (Bottom Line|Final Verdict|Verdict|Conclusion|Final Recommendation)/,
    insert: `\n\nStill deciding between Claude and Google's assistant? Our ${link('Claude vs Gemini comparison')} settles it by use case — writing, coding, multimodal, and price.\n`,
  },
  {
    slug: 'how-to-use-google-gemini-2026-complete-guide',
    findRegex: /\n## (Bottom Line|Final Verdict|Verdict|Conclusion|Final Recommendation)/,
    insert: `\n\nComparing Gemini with Anthropic's Claude? Our ${link('Claude vs Gemini comparison')} shows where each one wins — Gemini for ecosystem and multimodal, Claude for writing and coding judgment.\n`,
  },
];
for (const e of edits) {
  const [row] = await sql`SELECT id, content FROM posts WHERE slug = ${e.slug} AND published = true`;
  if (!row) { console.log(e.slug + ': NOT FOUND'); continue; }
  if (row.content.includes(target)) { console.log(e.slug + ': already linked'); continue; }
  let updated = null;
  if (e.find) {
    if (row.content.split(e.find).length - 1 !== 1) { console.log(e.slug + ': marker not unique, skipped'); continue; }
    updated = row.content.replace(e.find, e.replace);
  } else {
    const m = row.content.match(e.findRegex);
    if (!m) { console.log(e.slug + ': no closing H2 found, skipped'); continue; }
    updated = row.content.slice(0, m.index) + e.insert + row.content.slice(m.index);
  }
  await sql`UPDATE posts SET content = ${updated}, updated_at = NOW() WHERE id = ${row.id}`;
  console.log(e.slug + ': backlink added');
}

// 3) verify
const [c] = await sql`SELECT published FROM posts WHERE id = 216`;
const back = await sql`SELECT slug FROM posts WHERE published = true AND content LIKE ${'%' + target + '%'} ORDER BY slug`;
console.log('216 published:', c.published, '| inbound from:', back.map(b => b.slug).join(', '));
