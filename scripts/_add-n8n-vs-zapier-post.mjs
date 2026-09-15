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

const slug = 'n8n-vs-zapier-2026-comparison';
const title = 'n8n vs Zapier (2026): Pricing, AI Workflows and Hidden Costs';
const metaTitle = 'n8n vs Zapier (2026): Pricing, AI and Hidden Costs';
const metaDescription = 'Compare n8n vs Zapier with real pricing rules, task vs execution examples, AI workflow guardrails, and self-hosting costs. Choose for your small business.';
const excerpt = 'A practical n8n vs Zapier comparison: tasks versus executions, transparent cost examples, Cloud versus self-hosting, AI approval gates, and a seven-day pilot for small businesses.';
const keywords = 'n8n vs zapier, n8n vs zapier 2026, n8n vs zapier pricing, n8n vs zapier for small business, n8n vs zapier ai, n8n self hosted free, zapier tasks vs n8n executions, can n8n replace zapier';
const summary = 'Choose between Zapier, n8n Cloud, and self-hosted n8n based on supported actions, billing units, and operational ownership—not brand popularity.|Zapier does not bill every visible step. Count successful billable actions; n8n Cloud counts workflow executions, with separate capacity and service costs.|Use a seven-day pilot to validate duplicates, retries, human approvals, real usage, and handover before moving a business workflow into production.';
const content = (await readFile(new URL('./content/n8n-vs-zapier-2026.md', import.meta.url), 'utf8')).trim();
const photoUrl = id => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1400`;
const coverImage = photoUrl('8070723');

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
  const photoPath = new URL(image).pathname;
  assert(!otherImages.some(post => (post.cover_image || '').includes(photoPath) || post.content.includes(photoPath)), `Photo is already used: ${photoPath}`);
  const response = await fetch(image, { method: 'HEAD', signal: AbortSignal.timeout(20000) });
  assert(response.ok && response.headers.get('content-type')?.startsWith('image/'), `Invalid image response: ${photoPath}`);
}

const [category] = await sql`SELECT id FROM categories WHERE name = 'Software Reviews'`;
assert(category, 'Software Reviews category missing');
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