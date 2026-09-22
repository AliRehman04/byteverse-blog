import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { neon } from '@neondatabase/serverless';
import nextEnv from '@next/env';

// Validation is read-only by default. Only --save-draft inserts a NEW hidden row.
// Never publishes, schedules, updates existing posts, or creates live backlinks.
const projectRoot = fileURLToPath(new URL('../', import.meta.url));
nextEnv.loadEnvConfig(projectRoot);
assert(process.env.DATABASE_URL, 'DATABASE_URL must be configured');
const sql = neon(process.env.DATABASE_URL);
const args = process.argv.slice(2);
assert(args.every(arg => arg === '--save-draft'), 'Only --save-draft is supported');

const slug = 'how-to-edit-videos-with-ai-2026';
const title = 'How to Edit Videos with AI in 2026 (Free, Step by Step)';
const metaTitle = 'How to Edit Videos with AI in 2026 (Free, Step by Step)';
const metaDescription = 'Edit videos with AI for free: auto captions, filler-word removal, text-based editing, and phone workflows — step by step with Clipchamp, CapCut, and Descript.';
const excerpt = 'A working method, not a tool list: use free AI features to cut dead air, caption speech, clean audio, and reshape footage for YouTube or Shorts — with verified free limits for Clipchamp, CapCut, and Descript.';
const keywords = 'how to edit videos with ai, how to edit videos with ai for free, ai video editing, best ai video editor free, ai video editor no watermark, how to edit videos with ai on capcut, edit videos with ai on iphone, ai video editing for youtube shorts';
const summary = 'AI reliably handles the mechanical side of editing in 2026 — auto captions, filler-word removal, audio cleanup, background removal, and clip extraction — while story decisions stay yours.|Three free-to-start tools cover the whole beginner pipeline: Clipchamp (watermark-free 1080p, AI captions and voiceovers), Descript ($0 text-based editing for talking-head footage), and CapCut (phone-first editing with a broad listed feature set).|Five step-by-step workflows turn raw footage into publishable video: tighten the talking, caption everything, cut Shorts from long videos, fix or replace audio, and polish frames without over-processing.';
const content = (await readFile(new URL('./content/how-to-edit-videos-with-ai-2026.md', import.meta.url), 'utf8')).trim();
const coverImage = 'https://images.pexels.com/photos/11063289/pexels-photo-11063289.jpeg?auto=compress&cs=tinysrgb&w=1400';

// Exclude photo alt text, destinations, and the credits footer from word count.
const prose = content.split('\n## Sources and Image Credits')[0]
  .replace(/!\[[^\]]*\]\([^\n]+\)/g, '')
  .replace(/\[([^\]]+)\]\([^\n)]+\)/g, '$1');
const wordCount = (prose.match(/[\p{L}\p{N}]+(?:['’.-][\p{L}\p{N}]+)*/gu) || []).length;
const internalSlugs = [...content.matchAll(/(?<!!)\[[^\]]+\]\(\/blog\/([a-z0-9-]+)\)/g)].map(match => match[1]);
const uniqueSlugs = [...new Set(internalSlugs)];
const bodyImages = [...content.matchAll(/!\[([^\]]+)\]\((https:\/\/[^\s)]+)(?:\s+"[^"]*")?\)/g)];
const imageUrls = [coverImage, ...bodyImages.map(match => match[2])];

assert(wordCount >= 1800, `Only ${wordCount} substantive words`);
assert(title.length <= 255 && metaTitle.length <= 70 && metaDescription.length <= 160, 'Metadata exceeds schema limits');
assert(uniqueSlugs.length >= 10, 'Insufficient contextual internal linking');
assert(bodyImages.length === 4 && new Set(imageUrls).size === 5, 'Expected one unique cover and four unique body images');
assert(!/^# /m.test(content), 'Article H1 is rendered from the database title');
assert(!/\]\(http:\/\//.test(content), 'Insecure linked URL');

const existing = await sql`SELECT id, published, scheduled_at, content, cover_image FROM posts WHERE slug = ${slug}`;
assert(existing.length <= 1, 'Unexpected duplicate slug');
if (existing.length) {
  assert(existing[0].published === false && existing[0].scheduled_at === null, 'Existing post is live or scheduled; refusing further action');
  assert(existing[0].content === content && existing[0].cover_image === coverImage, 'Database draft differs from local source; review manually');
  assert(!args.includes('--save-draft'), 'Draft already exists; refusing to insert or overwrite');
}

const publishedPosts = await sql`SELECT slug FROM posts WHERE published = true`;
const publishedSlugs = new Set(publishedPosts.map(post => post.slug));
for (const target of uniqueSlugs) assert(publishedSlugs.has(target), `Internal target is missing or unpublished: ${target}`);

const otherImages = await sql`SELECT slug, cover_image, content FROM posts WHERE slug <> ${slug}`;
for (const image of imageUrls) {
  const photoPath = new URL(image).pathname.split('/pexels-photo-')[0];
  assert(!otherImages.some(post => (post.cover_image || '').includes(photoPath + '/') || post.content.includes(photoPath + '/')), `Photo is already used: ${photoPath}`);
  const response = await fetch(image, { method: 'HEAD', signal: AbortSignal.timeout(20000) });
  assert(response.ok && response.headers.get('content-type')?.startsWith('image/'), `Invalid image response: ${photoPath}`);
}

const [category] = await sql`SELECT id FROM categories WHERE name = 'AI Tools'`;
assert(category, 'AI Tools category missing');
console.log(JSON.stringify({
  mode: args.includes('--save-draft') ? 'save-new-draft' : 'read-only-validation',
  slug, wordCount, internalLinks: internalSlugs.length, uniqueInternalLinks: uniqueSlugs.length,
  coverImages: 1, bodyImages: bodyImages.length, metaTitleLength: metaTitle.length,
  metaDescriptionLength: metaDescription.length, existingDraftId: existing[0]?.id ?? null,
}, null, 2));

if (args.includes('--save-draft')) {
  const [draft] = await sql`INSERT INTO posts (
    title, slug, excerpt, content, cover_image, category_id, author,
    published, featured, scheduled_at, meta_title, meta_description, keywords,
    reading_time, views, created_at, updated_at, summary
  ) VALUES (
    ${title}, ${slug}, ${excerpt}, ${content}, ${coverImage}, ${category.id}, 'Ali Rehman',
    false, false, NULL, ${metaTitle}, ${metaDescription}, ${keywords},
    ${`${Math.ceil(wordCount / 220)} min read`}, 0, NOW(), NOW(), ${summary}
  ) RETURNING id, slug, published, featured, scheduled_at`;
  assert(draft.published === false && draft.scheduled_at === null, 'Unexpected draft state');
  console.log('SAVED UNPUBLISHED DRAFT:', JSON.stringify(draft));
} else {
  console.log('Validation passed. No database writes performed.');
}
