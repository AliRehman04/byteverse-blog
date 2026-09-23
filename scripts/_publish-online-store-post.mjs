import assert from 'node:assert/strict';
import { neon } from '@neondatabase/serverless';
import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd());
const sql = neon(process.env.DATABASE_URL);

// 1) publish (id 226 was inserted as a draft on 2026-09-23; this is a new post, not a refresh)
const pub = await sql`UPDATE posts SET published = true, created_at = NOW(), updated_at = NOW()
  WHERE id = 226 AND slug = 'how-to-start-online-store-with-ai-2026' AND published = false
  RETURNING id, slug, published`;
if (pub.length === 1) console.log('PUBLISHED:', JSON.stringify(pub[0]));
else {
  const [a] = await sql`SELECT published FROM posts WHERE id = 226`;
  if (!a?.published) throw new Error('publish failed');
  console.log('PUBLISH: already published');
}

const target = '/blog/how-to-start-online-store-with-ai-2026';
const link = (t) => `[${t}](${target})`;

// Precise, contextual edits at existing natural mentions (not generic last-H2 dumps).
const edits = [
  {
    slug: 'best-ai-tools-for-ecommerce-2026',
    find: 'This guide covers the tools that work in real store operations, organized by the part of the ecommerce workflow where they deliver the most value.',
    replace: `This guide covers the tools that work in real store operations, organized by the part of the ecommerce workflow where they deliver the most value. If you have not launched the store itself yet, our ${link('step-by-step guide to starting an online store with AI')} covers that first.`,
  },
  {
    slug: 'best-ai-website-builders-2026',
    find: 'Choose Shopify Magic if your website needs product pages, checkout, inventory, and payments.',
    replace: `Choose Shopify Magic if your website needs product pages, checkout, inventory, and payments. Our ${link('step-by-step guide to starting an online store with AI')} walks through that exact setup, from product choice to launch.`,
  },
  {
    slug: 'best-ai-tools-for-small-business-2026',
    find: '**ROI example:** An online store receives 200 customer messages/week. Tidio handles 150 automatically (75%). The remaining 50 get to a human. Saves 15+ hours/week.',
    replace: `**ROI example:** An online store receives 200 customer messages/week. Tidio handles 150 automatically (75%). The remaining 50 get to a human. Saves 15+ hours/week. If you have not launched that store yet, our ${link('guide to starting an online store with AI')} covers the setup, from platform choice to launch.`,
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

const [c] = await sql`SELECT published FROM posts WHERE id = 226`;
const back = await sql`SELECT slug FROM posts WHERE published = true AND content LIKE ${'%' + target + '%'} ORDER BY slug`;
console.log('226 published:', c.published, '| inbound from:', back.map(b => b.slug).join(', '));
