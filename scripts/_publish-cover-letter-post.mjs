import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { neon } from '@neondatabase/serverless';
import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd());
const sql = neon(process.env.DATABASE_URL);

const ID = 227;
const SLUG = 'how-to-write-cover-letter-with-ai-2026';
const target = `/blog/${SLUG}`;
const link = (t) => `[${t}](${target})`;

const edits = [
  {
    slug: 'how-to-write-resume-with-ai-2026',
    find: 'Then personalize the first line with something true about the company that is not on their homepage banner.',
    replace: `Then personalize the first line with something true about the company that is not on their homepage banner. Our ${link('complete guide to writing a cover letter with AI')} covers the full prompt set, structure, and final editing checks.`,
  },
  {
    slug: 'best-ai-resume-builders-2026',
    find: 'ChatGPT and Claude are not resume builders, but they are very strong at rewriting bullet points, quantifying achievements, and helping you tailor language to a specific job description.',
    replace: `ChatGPT and Claude are not resume builders, but they are very strong at rewriting bullet points, quantifying achievements, and helping you tailor language to a specific job description. The same approach works for the letter that goes with it — see our ${link('guide to writing a cover letter with AI')}.`,
  },
  {
    slug: 'how-to-get-first-tech-job-2026',
    find: '- **Tier 1 (10 to 15 companies):** genuinely tailored applications, referrals hunted, hiring manager researched',
    replace: `- **Tier 1 (10 to 15 companies):** genuinely tailored applications, referrals hunted, hiring manager researched, and a short role-specific cover letter (our ${link('guide to writing a cover letter with AI')} shows how to draft one in minutes)`,
  },
];

const hostSlugs = edits.map((e) => e.slug);
async function snapshot() {
  const rows = await sql`SELECT id, content FROM posts WHERE id <> ${ID} AND NOT (slug = ANY(${hostSlugs})) ORDER BY id`;
  const h = createHash('md5');
  for (const r of rows) h.update(`${r.id}:${r.content}\n`);
  return `${rows.length}:${h.digest('hex')}`;
}
const before = await snapshot();

// 1) publish the draft
const pub = await sql`UPDATE posts SET published = true, created_at = NOW(), updated_at = NOW()
  WHERE id = ${ID} AND slug = ${SLUG} AND published = false
  RETURNING id, slug, published`;
if (pub.length === 1) console.log('PUBLISHED:', JSON.stringify(pub[0]));
else {
  const [a] = await sql`SELECT published FROM posts WHERE id = ${ID}`;
  if (!a?.published) throw new Error('publish failed');
  console.log('PUBLISH: already published');
}

// 2) contextual backlinks
for (const e of edits) {
  const [row] = await sql`SELECT id, content FROM posts WHERE slug = ${e.slug} AND published = true`;
  if (!row) { console.log(e.slug + ': NOT FOUND'); continue; }
  if (row.content.includes(target)) { console.log(e.slug + ': already linked'); continue; }
  const count = row.content.split(e.find).length - 1;
  assert.equal(count, 1, `${e.slug}: anchor text not uniquely found (count=${count})`);
  const updated = row.content.replace(e.find, e.replace);
  await sql`UPDATE posts SET content = ${updated}, updated_at = NOW() WHERE id = ${row.id}`;
  console.log(e.slug + ': backlink added');
}

const after = await snapshot();
assert.equal(after, before, 'unrelated posts changed!');
console.log('unrelated posts unchanged:', after);

const back = await sql`SELECT slug FROM posts WHERE published = true AND content LIKE ${'%' + target + '%'} ORDER BY slug`;
console.log('inbound from:', back.map((b) => b.slug).join(', '));
