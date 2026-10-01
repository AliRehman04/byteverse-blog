import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { neon } from '@neondatabase/serverless';
import nextEnv from '@next/env';
import { parseDocument, DomUtils } from 'htmlparser2';

// Default is read-only DB/HTTP validation. --offline does not even load app env.
// --save-draft inserts only this NEW hidden, unscheduled post. No update/publish path.
const args = process.argv.slice(2);
assert(args.length <= 1 && args.every(arg => ['--offline', '--save-draft'].includes(arg)), 'Use --offline or --save-draft, not both');
const slug = 'audacity-noise-reduction-voice-2026';
const title = 'How to Remove Background Noise in Audacity: Voice Guide (2026)';
const metaTitle = 'How to Remove Background Noise in Audacity (2026)';
const metaDescription = 'Reduce background noise in Audacity with a noise profile, voice-friendly settings and a repeatable listening check. Fix muffled results and export cleanly.';
const excerpt = 'Clean steady hiss and fan noise from a spoken recording using Audacity 4. Learn what each setting does, check Noise only safely, compare short samples, preserve video sync, and understand when another method is needed.';
const keywords = 'how to remove background noise in audacity, audacity noise reduction settings, audacity noise reduction reduce vs residue, audacity noise reduction sensitivity, audacity noise reduction frequency smoothing, audacity noise reduction not working, audacity remove fan noise, adobe podcast enhance speech free';
const summary = 'Audacity\'s built-in Noise Reduction targets steady noise using a representative noise-only profile; it is not a general remover for echo or overlapping voices.|Start with a short voice sample, inspect Noise only, undo that diagnostic output, and compare gentler settings before treating the full recording.|Keep the original, preserve timing when returning audio to video, and export the chosen voice version rather than a project or mixed comparison tracks.';
const coverImage = 'https://images.pexels.com/photos/19537510/pexels-photo-19537510.jpeg?auto=compress&cs=tinysrgb&w=1400';
const content = (await readFile(new URL('./content/audacity-noise-reduction-voice-2026.md', import.meta.url), 'utf8')).replace(/\r\n?/g, '\n').trim();
const ledger = JSON.parse(await readFile(new URL('../docs/audacity-noise-reduction-keywords-2026-09-30.json', import.meta.url), 'utf8'));
assert.equal(ledger.slug, slug);

const prose = content.split('\n## Sources and Image Credits')[0]
  .replace(/!\[[^\]]*\]\([^\n]+\)/g, '')
  .replace(/\[([^\]]+)\]\([^\n)]+\)/g, '$1');
const countWords = text => (text.match(/[\p{L}\p{N}]+(?:['’.-][\p{L}\p{N}]+)*/gu) || []).length;
const wordCount = countWords(prose);
const paragraphWordCount = countWords(prose.split('\n').filter(line => !/^\s*(?:#|\||>|[-*] |\d+\. )/.test(line)).join('\n'));
const internalLinks = [...content.matchAll(/(?<!!)\[([^\]]+)\]\(\/blog\/([a-z0-9-]+)\)/g)];
const uniqueSlugs = [...new Set(internalLinks.map(match => match[2]))];
const bodyImages = [...content.matchAll(/!\[([^\]]+)\]\((https:\/\/[^\s)]+)(?:\s+"[^"]*")?\)/g)];
const imageUrls = [coverImage, ...bodyImages.map(match => match[2])];
const photoIds = imageUrls.map(image => new URL(image).pathname.match(/^\/photos\/(\d+)(?:\/|\.)/)?.[1]);
const faqSection = content.split('\n## Frequently Asked Questions\n')[1]?.split('\n## ')[0] || '';
const faqCount = [...faqSection.matchAll(/^### .+\?$/gm)].length;
const tableCount = [...content.matchAll(/^\|(?:\s*:?-{3,}:?\s*\|)+\s*$/gm)].length;
const readingTime = `${Math.ceil(wordCount / 220)} min read`;

assert(wordCount >= 1800 && paragraphWordCount >= 1800, 'Need 1800+ words even without headings, tables, lists or the practice script');
assert(title.length <= 255 && metaTitle.length <= 70 && metaDescription.length <= 160, 'Metadata exceeds schema limits');
assert.deepEqual([...uniqueSlugs].sort(), [...ledger.internalLinkPlan].sort(), 'Contextual destinations differ from reviewed plan');
assert.equal(internalLinks.length, uniqueSlugs.length, 'Avoid redundant internal links');
for (const link of internalLinks) {
  const line = content.slice(0, link.index).split('\n').at(-1);
  assert(!/^\s*(?:#|\||>|[-*] |\d+\. )/.test(line), 'Expected contextual links in prose paragraphs');
}
assert.equal(bodyImages.length, 4);
assert.equal(new Set(photoIds).size, 5);
assert(photoIds.every(Boolean), 'Expected known Pexels photo IDs');
assert.deepEqual([...photoIds].sort(), ledger.images.map(image => String(image.id)).sort(), 'Image IDs differ from reviewed sources');
assert.equal(faqCount, 8);
assert.equal(tableCount, 2);
assert(!/^# /m.test(content), 'Article H1 comes from its database title');
assert(!/\]\(http:\/\//.test(content), 'Use secure destinations');
assert(!/<\/?(?:script|iframe)\b/i.test(content), 'Unexpected executable or embedded markup');
assert(content.includes('documentation-based guide, not a hands-on audio-quality benchmark'));
assert(!content.includes('/blog/pdf-to-podcast-notebooklm-2026'), 'Never link the other hidden draft');
const expectedFields = {
  slug, title, excerpt, content, cover_image: coverImage, author: 'Ali Rehman',
  meta_title: metaTitle, meta_description: metaDescription, keywords, summary,
  reading_time: readingTime, published: false, featured: false, scheduled_at: null,
};
console.log(JSON.stringify({ mode: args[0] || 'read-only-validation', slug, title, wordCount, paragraphWordCount, contextualParagraphLinks: internalLinks.length, uniqueInternalLinks: uniqueSlugs.length, coverImages: 1, bodyImages: bodyImages.length, faqCount, tableCount, readingTime, metaTitleCharacters: metaTitle.length, metaDescriptionCharacters: metaDescription.length }, null, 2));

if (args.includes('--offline')) {
  console.log('Offline content checks passed. No env loading, network or database access.');
} else {
  nextEnv.loadEnvConfig(fileURLToPath(new URL('../', import.meta.url)));
  assert(process.env.DATABASE_URL, 'DATABASE_URL must be configured');
  const sql = neon(process.env.DATABASE_URL);
  const existing = await sql`SELECT * FROM posts WHERE slug = ${slug}`;
  assert(existing.length <= 1, 'Unexpected duplicate slug');
  if (existing.length) {
    for (const [key, value] of Object.entries(expectedFields)) {
      assert.ok(existing[0][key] === value, `Existing row differs in ${key}; no automatic overwrite`);
    }
    assert(!args.includes('--save-draft'), 'Draft exists; refusing to insert or overwrite');
  }

  const published = await sql`SELECT slug FROM posts WHERE published = true`;
  const publishedSlugs = new Set(published.map(post => post.slug));
  for (const target of uniqueSlugs) {
    assert(publishedSlugs.has(target), `Target missing or unpublished: ${target}`);
    const url = `https://www.byteverse.fyi/blog/${target}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(25000) });
    const doc = parseDocument(await response.text());
    const pageTitle = DomUtils.findOne(node => node.name === 'title', doc.children, true);
    const canonical = DomUtils.findOne(node => node.name === 'link' && node.attribs.rel === 'canonical', doc.children, true);
    const robots = DomUtils.findAll(node => node.name === 'meta' && ['robots', 'googlebot'].includes(node.attribs.name), doc.children);
    assert(response.ok && pageTitle && !/Post Not Found/i.test(DomUtils.textContent(pageTitle)), `Public target failed: ${target}`);
    assert.equal(canonical?.attribs.href, url, `Canonical mismatch: ${target}`);
    assert(!robots.some(node => /\bnoindex\b/i.test(node.attribs.content)), `Target has noindex: ${target}`);
  }
  console.log(`Verified ${uniqueSlugs.length} published, self-canonical internal destinations.`);

  const others = await sql`SELECT cover_image, content FROM posts WHERE slug <> ${slug}`;
  for (const [index, image] of imageUrls.entries()) {
    const pattern = new RegExp(`images\\.pexels\\.com/photos/${photoIds[index]}(?=[/.])`);
    assert(!others.some(post => pattern.test(`${post.cover_image || ''}\n${post.content}`)), `Photo already used: ${photoIds[index]}`);
    const response = await fetch(image, { method: 'HEAD', signal: AbortSignal.timeout(25000) });
    assert(response.ok && response.headers.get('content-type')?.startsWith('image/'), `Invalid image ${photoIds[index]}`);
  }
  const [category] = await sql`SELECT id FROM categories WHERE name = 'Tech Guides'`;
  assert(category, 'Tech Guides category missing');
  if (existing.length) assert.equal(existing[0].category_id, category.id);

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
    for (const [key, value] of Object.entries(expectedFields)) assert.ok(draft[key] === value, `Saved draft differs in ${key}`);
    assert.equal(draft.category_id, category.id);
    const [after] = await sql`
      SELECT count(*)::integer AS count,
        md5(coalesce(string_agg((to_jsonb(p) - 'views')::text, '' ORDER BY id), '')) AS hash
      FROM posts p WHERE slug <> ${slug}
    `;
    assert.deepEqual(after, before, 'Other posts changed during save; inspect without overwriting');
    console.log('SAVED HIDDEN DRAFT:', JSON.stringify({ id: draft.id, slug, published: draft.published, featured: draft.featured, scheduled_at: draft.scheduled_at, otherPostsUnchanged: after.count, otherPostsChecksumExcludingViews: after.hash }));
  } else {
    console.log('Read-only validation passed. Existing draft:', existing[0]?.id ?? 'not saved', '. No database writes.');
  }
}