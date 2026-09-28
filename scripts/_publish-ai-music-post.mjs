import assert from 'node:assert/strict';
import { neon } from '@neondatabase/serverless';
import nextEnv from '@next/env';

nextEnv.loadEnvConfig(process.cwd());
assert(process.env.DATABASE_URL, 'DATABASE_URL must be configured');
const sql = neon(process.env.DATABASE_URL);

const draftId = 228;
const slug = 'how-to-make-ai-music-2026';
const backlinks = [
  {
    id: 119,
    slug: 'best-ai-tools-for-podcasters-2026',
    from: 'Because the music is AI-generated, there are no licensing fees or copyright issues.',
    to: 'AI-generated does not automatically mean copyright-free, though: commercial use depends on your plan and download eligibility. Our [step-by-step AI music guide](/blog/how-to-make-ai-music-2026) explains the free limits, downloads, and rights to check before using a track in a monetized show.',
  },
  {
    id: 117,
    slug: 'best-ai-tools-for-youtube-creators-2026',
    from: "Because the music is AI-generated, there are no copyright claims or licensing fees, which solves one of YouTube's biggest headaches.",
    to: 'AI-generated does not automatically mean copyright-free, though: commercial use depends on your plan and whether the track was downloaded under eligible terms. Our [guide to making AI music for free](/blog/how-to-make-ai-music-2026) covers the limits and rights to check before monetizing a video.',
  },
];
const touchedIds = [draftId, ...backlinks.map(b => b.id)];

const snapshot = async () => (await sql`
  SELECT count(*)::integer AS count,
    md5(coalesce(string_agg((to_jsonb(p) - 'views')::text, '' ORDER BY id), '')) AS hash
  FROM posts p WHERE NOT (id = ANY(${touchedIds}))
`)[0];

const [draft] = await sql`SELECT id, slug, published, scheduled_at FROM posts WHERE id = ${draftId}`;
assert(draft && draft.slug === slug, 'Draft row not found');
const before = await snapshot();

if (!draft.published) {
  assert(draft.scheduled_at === null, 'Draft is scheduled; refusing');
  await sql`UPDATE posts SET published = true, created_at = NOW(), updated_at = NOW() WHERE id = ${draftId} AND published = false`;
  console.log('PUBLISHED', slug);
} else {
  console.log('ALREADY PUBLISHED', slug);
}

for (const link of backlinks) {
  const [host] = await sql`SELECT id, slug, content, published FROM posts WHERE id = ${link.id}`;
  assert(host && host.slug === link.slug && host.published, `Host missing: ${link.slug}`);
  if (host.content.includes(`/blog/${slug}`)) {
    console.log('ALREADY LINKED', link.slug);
    continue;
  }
  const occurrences = host.content.split(link.from).length - 1;
  assert.equal(occurrences, 1, `Anchor sentence not found exactly once in ${link.slug}`);
  const content = host.content.replace(link.from, link.to);
  await sql`UPDATE posts SET content = ${content}, updated_at = NOW() WHERE id = ${link.id} AND content = ${host.content}`;
  console.log('BACKLINK ADDED', link.slug);
}

const after = await snapshot();
assert.deepEqual(after, before, 'Unrelated posts changed; inspect immediately');
const [final] = await sql`SELECT published, featured, scheduled_at FROM posts WHERE id = ${draftId}`;
assert(final.published === true, 'Publish did not persist');
console.log(JSON.stringify({ unrelatedPostsUnchanged: after.count, checksum: after.hash }));
