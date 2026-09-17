import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { access, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { neon } from '@neondatabase/serverless';
import nextEnv from '@next/env';

// This script can only insert an unpublished staging row, never replace the live article.
const root = fileURLToPath(new URL('../', import.meta.url));
nextEnv.loadEnvConfig(root);
assert(process.env.DATABASE_URL, 'DATABASE_URL is required');
const sql = neon(process.env.DATABASE_URL);
const args = process.argv.slice(2);
assert(args.length <= 1 && args.every(arg => arg === '--save-draft'), 'Only --save-draft is supported');

const sourceId = 45;
const sourceSlug = 'best-free-hosting-platforms-2026';
const stagingSlug = `${sourceSlug}-refresh-staging`;
const title = 'Best Free Web Hosting in 2026: 7 Plans and Their Limits';
const metaTitle = 'Best Free Web Hosting 2026: 7 Plans & Real Limits';
const metaDescription = 'Compare 7 free web hosting plans for static sites, Next.js, WordPress and APIs. See current limits, ads, custom domains, sleep rules and trial restrictions.';
const excerpt = 'Choose free hosting by workload, not a headline: compare Cloudflare Pages, GitHub Pages, Vercel, Netlify, Render, WordPress.com, and Railway with current plan limits and upgrade triggers.';
const keywords = 'best free web hosting 2026, best free hosting 2026, free hosting for developers, free static website hosting, free hosting for nextjs, free wordpress hosting, free hosting custom domain, vercel hobby limits, netlify free credits, render free limits, railway free plan';
const summary = 'Compare seven hosting options by runtime, recurring allowances, and use restrictions rather than claiming they are unlimited.|Netlify uses shared credits; Vercel Hobby is non-commercial; Render free PostgreSQL expires after 30 days; Railway separates a $5 trial from $1 monthly credit.|Keep the domain, database, email, backup, and crawl-access requirements in the budget, and verify the deployed site before relying on any free plan.';
const coverImage = 'https://images.pexels.com/photos/4508751/pexels-photo-4508751.jpeg?auto=compress&cs=tinysrgb&w=1600';
const content = (await readFile(new URL('./content/best-free-hosting-platforms-2026-refresh.md', import.meta.url), 'utf8')).trim();
const hash = value => createHash('sha256').update(value).digest('hex');
const countWords = value => {
  const prose = value.split('\n## Sources and Image Credits')[0]
    .replace(/!\[[^\]]*\]\([^\n]+\)/g, '')
    .replace(/\[([^\]]+)\]\([^\n)]+\)/g, '$1');
  return (prose.match(/[\p{L}\p{N}]+(?:['’.-][\p{L}\p{N}]+)*/gu) || []).length;
};
const wordCount = countWords(content);
const readingTime = `${Math.ceil(wordCount / 220)} min read`;
const internalPaths = [...content.matchAll(/(?<!!)\[[^\]]+\]\((\/(?:blog|tools)\/[a-z0-9-]+)\)/g)].map(match => match[1]);
const uniquePaths = [...new Set(internalPaths)];
const bodyImages = [...content.matchAll(/!\[([^\]]+)\]\((https:\/\/[^\s)]+)(?:\s+"[^"]*")?\)/g)];
const imageUrls = [coverImage, ...bodyImages.map(match => match[2])];

assert(wordCount >= 1800, `Insufficient substantive words: ${wordCount}`);
assert(metaTitle.length <= 70 && metaDescription.length <= 160 && title.length <= 255, 'Metadata exceeds column limits');
assert.equal([...content.matchAll(/^## [1-7]\. /gm)].length, 7, 'Title must match seven actual platform sections');
assert(uniquePaths.length >= 10, 'Expected useful contextual links');
assert.equal(bodyImages.length, 4, 'Expected four body photos');
assert.equal(new Set(imageUrls).size, 5, 'Cover must not be duplicated inside the body');
assert(!/^# /m.test(content), 'The page supplies the H1');
assert(!content.includes(stagingSlug), 'Reader links must never point to the staging URL');

const [source] = await sql`SELECT * FROM posts WHERE id = ${sourceId} AND slug = ${sourceSlug}`;
assert(source?.published === true, 'The existing live hosting article must remain published');
const [existing] = await sql`SELECT * FROM posts WHERE slug = ${stagingSlug}`;
if (existing) {
  assert(existing.published === false && existing.featured === false && existing.scheduled_at === null, 'Staging row is public or scheduled; stop');
  for (const [field, expected] of Object.entries({
    title, content, excerpt, cover_image: coverImage, meta_title: metaTitle,
    meta_description: metaDescription, keywords, summary, reading_time: readingTime,
    category_id: source.category_id, author: source.author,
  })) assert.equal(existing[field], expected, `Staging ${field} differs from the source file; review without overwriting`);
}

const published = await sql`SELECT slug FROM posts WHERE published = true`;
const publishedSlugs = new Set(published.map(row => row.slug));
for (const path of uniquePaths) {
  if (path.startsWith('/blog/')) assert(publishedSlugs.has(path.slice('/blog/'.length)), `Unpublished internal target: ${path}`);
  else await access(new URL(`../src/app${path}/page.tsx`, import.meta.url));
}
const others = await sql`SELECT id,cover_image,content FROM posts WHERE slug <> ${stagingSlug}`;
for (const url of imageUrls) {
  const photoId = new URL(url).pathname.match(/\/photos\/(\d+)\//)?.[1];
  assert(photoId, 'Unexpected photo URL');
  assert(!others.some(row => (row.cover_image || '').includes(`/photos/${photoId}/`) || row.content.includes(`/photos/${photoId}/`)), `Photo is already used: ${photoId}`);
  const response = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(20000) });
  assert(response.ok && response.headers.get('content-type')?.startsWith('image/'), `Image unavailable: ${photoId}`);
}

// Ignore view counters so unrelated visitors do not produce a false editorial-change alert.
const snapshot = () => sql`SELECT count(*)::int AS count,
  md5(string_agg((to_jsonb(p) - 'views')::text, '|' ORDER BY p.id)) AS checksum
  FROM posts p WHERE slug <> ${stagingSlug}`;
const before = await snapshot();
let draft = existing;
if (args.includes('--save-draft') && !existing) {
  [draft] = await sql`INSERT INTO posts (
    title,slug,excerpt,content,cover_image,category_id,author,published,featured,scheduled_at,
    meta_title,meta_description,keywords,summary,reading_time,views,created_at,updated_at
  ) VALUES (
    ${title},${stagingSlug},${excerpt},${content},${coverImage},${source.category_id},${source.author},false,false,NULL,
    ${metaTitle},${metaDescription},${keywords},${summary},${readingTime},0,NOW(),NOW()
  ) ON CONFLICT (slug) DO NOTHING RETURNING id,slug,published,featured,scheduled_at`;
  assert(draft, 'A concurrent staging row exists; rerun read-only validation');
}
assert.deepEqual(await snapshot(), before, 'Editorial data outside staging changed during the operation; inspect before continuing');
const [after] = await sql`SELECT content,published,created_at,updated_at FROM posts WHERE id = ${sourceId} AND slug = ${sourceSlug}`;
assert(after?.published === true && hash(after.content) === hash(source.content), 'Live source changed');
assert.equal(String(after.created_at), String(source.created_at), 'Live creation date changed');
assert.equal(String(after.updated_at), String(source.updated_at), 'Live update date changed');
console.log(JSON.stringify({
  mode: args.includes('--save-draft') ? 'save-hidden-refresh' : 'read-only-validation',
  sourceId, sourceSlug, sourceContentSha256: hash(source.content),
  sourceCreatedAt: source.created_at, sourceUpdatedAt: source.updated_at,
  originalWords: countWords(source.content), refreshWords: wordCount,
  internalLinks: internalPaths.length, uniqueInternalLinks: uniquePaths.length,
  images: imageUrls.length, metaTitleLength: metaTitle.length, metaDescriptionLength: metaDescription.length,
  existingPostsUnchanged: before[0].count,
  draft: draft ? { id: draft.id, slug: draft.slug, published: draft.published, scheduledAt: draft.scheduled_at } : null,
}, null, 2));
console.log('Live article preserved. This script contains no publication or live-update path.');