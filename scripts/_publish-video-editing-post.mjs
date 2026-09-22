import assert from 'node:assert/strict';
import { neon } from '@neondatabase/serverless';
import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd());
const sql = neon(process.env.DATABASE_URL);

// 1) publish (id 225 was inserted as a draft on 2026-09-21; this is a new post, not a refresh)
const pub = await sql`UPDATE posts SET published = true, created_at = NOW(), updated_at = NOW()
  WHERE id = 225 AND slug = 'how-to-edit-videos-with-ai-2026' AND published = false
  RETURNING id, slug, published`;
if (pub.length === 1) console.log('PUBLISHED:', JSON.stringify(pub[0]));
else {
  const [a] = await sql`SELECT published FROM posts WHERE id = 225`;
  if (!a?.published) throw new Error('publish failed');
  console.log('PUBLISH: already published');
}

const target = '/blog/how-to-edit-videos-with-ai-2026';
const link = (t) => `[${t}](${target})`;

// Precise, contextual edits at existing natural mentions (not generic last-H2 dumps).
const edits = [
  {
    slug: 'best-ai-tools-for-youtube-creators-2026',
    find: 'This text-based editing approach is dramatically faster than timeline editing for talking-head and tutorial content.',
    replace: `This text-based editing approach is dramatically faster than timeline editing for talking-head and tutorial content. Our ${link('step-by-step AI video editing guide')} walks through this exact Descript workflow alongside CapCut and Clipchamp.`,
  },
  {
    slug: 'faceless-youtube-channel-with-ai-2026',
    find: 'CapCut covers most faceless pipelines free; DaVinci Resolve is the free ceiling.',
    replace: `CapCut covers most faceless pipelines free; DaVinci Resolve is the free ceiling. Our ${link('step-by-step AI video editing guide')} covers the captions, cleanup, and clip-extraction workflows this pipeline runs on.`,
  },
  {
    slug: 'best-ai-video-generators-2026',
    find: 'Here are the best AI video generators ranked by quality, features, and value.',
    replace: `Here are the best AI video generators ranked by quality, features, and value. If you already have footage to edit rather than generate from scratch, our ${link('AI video editing guide')} covers captions, cleanup, and Shorts workflows instead.`,
  },
  {
    slug: 'how-to-edit-photos-with-ai-2026',
    find: 'Start tonight with the workflow that pays back instantly — restore one old family photo, or clean the clutter from your favorite shot of this year.',
    replace: `Start tonight with the workflow that pays back instantly — restore one old family photo, or clean the clutter from your favorite shot of this year. If your footage is video rather than stills, our ${link('companion guide to editing video with AI')} carries the same free-tool philosophy forward.`,
  },
  {
    slug: 'how-to-start-youtube-channel-2026',
    find: 'text-to-video tools generate scene footage that used to require stock subscriptions — the [AI video generators guide](/blog/best-ai-video-generators-2026) ranks the current leaders.',
    replace: `text-to-video tools generate scene footage that used to require stock subscriptions — the [AI video generators guide](/blog/best-ai-video-generators-2026) ranks the current leaders. Once you have raw footage, generated or filmed, our ${link('AI video editing guide')} covers captions, cleanup, and cutting it into Shorts.`,
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

const [c] = await sql`SELECT published FROM posts WHERE id = 225`;
const back = await sql`SELECT slug FROM posts WHERE published = true AND content LIKE ${'%' + target + '%'} ORDER BY slug`;
console.log('225 published:', c.published, '| inbound from:', back.map(b => b.slug).join(', '));
