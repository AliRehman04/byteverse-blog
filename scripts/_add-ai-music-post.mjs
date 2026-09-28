import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { neon } from '@neondatabase/serverless';
import nextEnv from '@next/env';

// This script can insert a hidden draft, never publish or update an existing post.
const args = process.argv.slice(2);
assert(args.length <= 1 && args.every(arg => arg === '--save-draft'), 'Only --save-draft is supported');
const projectRoot = fileURLToPath(new URL('../', import.meta.url));
nextEnv.loadEnvConfig(projectRoot);
assert(process.env.DATABASE_URL, 'DATABASE_URL must be configured');
const sql = neon(process.env.DATABASE_URL);

const slug = 'how-to-make-ai-music-2026';
const title = 'How to Make AI Music for Free in 2026 (Suno Guide)';
const metaTitle = 'How to Make AI Music for Free in 2026 (Suno Guide)';
const metaDescription = 'Make AI music with vocals or your own lyrics using Suno. Follow practical prompts, check free download limits, and understand commercial-use rights.';
const excerpt = 'Make a song with Suno using a clear brief, original lyrics and practical prompt examples. Learn what free generation includes, why downloads are separate, and which permissions to check before using the music in a video or commercial project.';
const keywords = 'how to make ai music for free, how to use suno ai for free, ai music generator with vocals, ai music generator from lyrics, suno prompt examples, suno free download, suno commercial use, ai music for youtube';
const summary = 'Suno\'s free plan supports limited generation and listening, not unlimited downloads or commercial use.|A short brief, specific prompts and original lyrics make it easier to evaluate and revise candidate songs; results are not guaranteed.|Check download eligibility, commercial-use terms, third-party permissions and human-authored copyright separately before publishing.';
const content = (await readFile(new URL('./content/how-to-make-ai-music-2026.md', import.meta.url), 'utf8')).replace(/\r\n?/g, '\n').trim();
const coverImage = 'https://images.pexels.com/photos/5749192/pexels-photo-5749192.jpeg?auto=compress&cs=tinysrgb&w=1400';

// Exclude photo alt text, destinations, and the credits footer from word count.
const prose = content.split('\n## Sources and Image Credits')[0]
  .replace(/!\[[^\]]*\]\([^\n]+\)/g, '')
  .replace(/\[([^\]]+)\]\([^\n)]+\)/g, '$1');
const wordCount = (prose.match(/[\p{L}\p{N}]+(?:['’.-][\p{L}\p{N}]+)*/gu) || []).length;
const internalSlugs = [...content.matchAll(/(?<!!)\[[^\]]+\]\(\/blog\/([a-z0-9-]+)\)/g)].map(match => match[1]);
const uniqueSlugs = [...new Set(internalSlugs)];
const bodyImages = [...content.matchAll(/!\[([^\]]+)\]\((https:\/\/[^\s)]+)(?:\s+"[^"]*")?\)/g)];
const imageUrls = [coverImage, ...bodyImages.map(match => match[2])];
const faqSection = content.split('\n## Frequently Asked Questions\n')[1]?.split('\n## ')[0] || '';
const faqCount = [...faqSection.matchAll(/^### .+\?$/gm)].length;
const readingTime = `${Math.ceil(wordCount / 220)} min read`;

assert(wordCount >= 1800, `Only ${wordCount} substantive words`);
assert(title.length <= 255 && metaTitle.length <= 70 && metaDescription.length <= 160, 'Metadata exceeds schema limits');
assert(uniqueSlugs.length >= 10, 'Insufficient contextual internal linking');
assert(bodyImages.length === 4 && new Set(imageUrls).size === 5, 'Expected one unique cover and four unique body images');
assert(faqCount === 7, 'Expected seven FAQ questions');
assert(!/^# /m.test(content), 'Article H1 is rendered from the database title');
assert(!/\]\(http:\/\//.test(content), 'Insecure linked URL');

const expectedFields = {
  slug, title, excerpt, content, cover_image: coverImage, author: 'Ali Rehman',
  meta_title: metaTitle, meta_description: metaDescription, keywords, summary,
  reading_time: readingTime, published: false, featured: false, scheduled_at: null,
};
const existing = await sql`SELECT * FROM posts WHERE slug = ${slug}`;
assert(existing.length <= 1, 'Unexpected duplicate slug');
if (existing.length) {
  for (const [key, value] of Object.entries(expectedFields)) {
    assert.equal(existing[0][key], value, `Existing draft differs in ${key}; review manually`);
  }
  assert(!args.includes('--save-draft'), 'Draft already exists; refusing to insert or overwrite');
}

const publishedPosts = await sql`SELECT slug FROM posts WHERE published = true`;
const publishedSlugs = new Set(publishedPosts.map(post => post.slug));
for (const target of uniqueSlugs) assert(publishedSlugs.has(target), `Internal target is missing or unpublished: ${target}`);

const otherImages = await sql`SELECT slug, cover_image, content FROM posts WHERE slug <> ${slug}`;
for (const image of imageUrls) {
  const photoId = new URL(image).pathname.match(/^\/photos\/(\d+)(?:\/|\.)/)?.[1];
  assert(photoId, 'Expected a Pexels photo ID');
  const samePhoto = new RegExp(`images\\.pexels\\.com/photos/${photoId}(?=[/.])`);
  assert(!otherImages.some(post => samePhoto.test(`${post.cover_image || ''}\n${post.content}`)), `Photo is already used: ${photoId}`);
  const response = await fetch(image, { method: 'HEAD', signal: AbortSignal.timeout(20000) });
  assert(response.ok && response.headers.get('content-type')?.startsWith('image/'), `Invalid image response: ${photoId}`);
}

const [category] = await sql`SELECT id FROM categories WHERE name = 'AI Tools'`;
assert(category, 'AI Tools category missing');
console.log(JSON.stringify({
  mode: args.includes('--save-draft') ? 'save-new-draft' : 'read-only-validation',
  slug, wordCount, internalLinks: internalSlugs.length, uniqueInternalLinks: uniqueSlugs.length,
  coverImages: 1, bodyImages: bodyImages.length, faqCount, readingTime, metaTitleLength: metaTitle.length,
  metaDescriptionLength: metaDescription.length, existingDraftId: existing[0]?.id ?? null,
}, null, 2));

if (args.includes('--save-draft')) {
  const [before] = await sql`
    SELECT count(*)::integer AS count,
      md5(coalesce(string_agg((to_jsonb(p) - 'views')::text, '' ORDER BY id), '')) AS hash
    FROM posts p WHERE slug <> ${slug}
  `;
  const [draft] = await sql`INSERT INTO posts (
    title, slug, excerpt, content, cover_image, category_id, author,
    published, featured, scheduled_at, meta_title, meta_description, keywords,
    reading_time, views, created_at, updated_at, summary
  ) VALUES (
    ${title}, ${slug}, ${excerpt}, ${content}, ${coverImage}, ${category.id}, 'Ali Rehman',
    false, false, NULL, ${metaTitle}, ${metaDescription}, ${keywords},
    ${readingTime}, 0, NOW(), NOW(), ${summary}
  ) RETURNING *`;
  for (const [key, value] of Object.entries(expectedFields)) {
    assert.equal(draft[key], value, `Saved draft differs in ${key}`);
  }
  assert.equal(draft.category_id, category.id, 'Unexpected draft category');
  const [after] = await sql`
    SELECT count(*)::integer AS count,
      md5(coalesce(string_agg((to_jsonb(p) - 'views')::text, '' ORDER BY id), '')) AS hash
    FROM posts p WHERE slug <> ${slug}
  `;
  assert.deepEqual(after, before, 'Other posts changed during save; inspect without overwriting them');
  console.log('SAVED UNPUBLISHED DRAFT:', JSON.stringify({
    id: draft.id, slug: draft.slug, published: draft.published,
    featured: draft.featured, scheduled_at: draft.scheduled_at,
    otherPostsUnchanged: after.count, otherPostsChecksum: after.hash,
  }));
} else {
  console.log('Validation passed. No database writes performed.');
}
