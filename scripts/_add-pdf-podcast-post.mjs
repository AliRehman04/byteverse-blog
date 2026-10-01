import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { neon } from '@neondatabase/serverless';
import nextEnv from '@next/env';

// Default: read-only validation. --offline: local checks only.
// --save-draft can only insert this NEW hidden draft; never publish or update a post.
const args = process.argv.slice(2);
assert(args.length <= 1 && args.every(arg => ['--offline', '--save-draft'].includes(arg)), 'Use --offline or --save-draft, not both');
const slug = 'pdf-to-podcast-notebooklm-2026';
const title = 'PDF to Podcast Free: NotebookLM Step-by-Step Guide (2026)';
const metaTitle = 'PDF to Podcast Free: NotebookLM Guide (2026)';
const metaDescription = 'Turn a PDF into a podcast with NotebookLM, now Gemini Notebook. Follow free steps, useful prompts, current limits, download options and accuracy checks.';
const excerpt = 'Turn your own notes or a permitted PDF into a podcast-style Audio Overview. Follow a focused NotebookLM workflow with original prompts, a checkable practice example, current free-usage limits, web downloads and mobile offline-listening guidance.';
const keywords = 'pdf to podcast free, pdf to podcast notebooklm, how to turn a pdf into a podcast, notebooklm podcast from pdf, notebooklm audio overview prompt, notebooklm audio overview limit, notebooklm podcast download, notebooklm download audio iphone, gemini notebook podcast';
const summary = 'NotebookLM, now Gemini Notebook, can turn an uploaded PDF into an Audio Overview; it is a summary or discussion, not a complete audiobook.|Check Settings > Usage for current free limits, and distinguish a web audio-file download from offline playback inside the mobile app.|Use a focused source and prompt, verify important claims against the PDF, and review privacy and source rights before sharing.';
const content = (await readFile(new URL('./content/pdf-to-podcast-notebooklm-2026.md', import.meta.url), 'utf8')).replace(/\r\n?/g, '\n').trim();
const coverImage = 'https://images.pexels.com/photos/6958509/pexels-photo-6958509.jpeg?auto=compress&cs=tinysrgb&w=1400';

// Count useful prose, not image alt text, URL destinations or the sources/credits footer.
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
const faqSection = content.split('\n## Frequently Asked Questions\n')[1]?.split('\n## ')[0] || '';
const faqCount = [...faqSection.matchAll(/^### .+\?$/gm)].length;
const tableCount = [...content.matchAll(/^\|(?:\s*:?-{3,}:?\s*\|)+\s*$/gm)].length;
const readingTime = `${Math.ceil(wordCount / 220)} min read`;
const expectedFields = {
  slug, title, excerpt, content, cover_image: coverImage, author: 'Ali Rehman',
  meta_title: metaTitle, meta_description: metaDescription, keywords, summary,
  reading_time: readingTime, published: false, featured: false, scheduled_at: null,
};

assert(wordCount >= 1800, `Only ${wordCount} substantive words`);
assert(paragraphWordCount >= 1800, `Only ${paragraphWordCount} paragraph words excluding headings, tables, lists and prompts`);
assert(title.length <= 255 && metaTitle.length <= 70 && metaDescription.length <= 160, 'Metadata exceeds schema limits');
assert(uniqueSlugs.length >= 10, 'Insufficient relevant contextual links');
assert(internalLinks.length === uniqueSlugs.length, 'Avoid redundant internal links');
for (const link of internalLinks) {
  const line = content.slice(0, link.index).split('\n').at(-1);
  assert(!/^\s*(?:#|\||>|[-*] |\d+\. )/.test(line), 'Internal links must be in prose paragraphs, not a link dump');
}
assert(bodyImages.length === 4 && new Set(imageUrls).size === 5, 'Expected one cover plus four distinct body images');
assert(faqCount === 8, 'Expected eight FAQ questions');
assert(tableCount === 2, 'Expected the formats and troubleshooting tables');
assert(!/^# /m.test(content), 'The article H1 comes from its database title');
assert(!/\]\(http:\/\//.test(content), 'Use secure linked URLs');
assert(!/<\/?(?:script|iframe)\b/i.test(content), 'Unexpected executable/embed markup');
assert(content.includes('fictional practice brief') && content.includes('not results from an audio-quality test'), 'Keep methodology and example disclosures');
const report = {
  mode: args[0] || 'read-only-validation', slug, title, wordCount, paragraphWordCount,
  contextualParagraphLinks: internalLinks.length, uniqueInternalLinks: uniqueSlugs.length,
  coverImages: 1, bodyImages: bodyImages.length, faqCount, tableCount, readingTime,
  metaTitleCharacters: metaTitle.length, metaDescriptionCharacters: metaDescription.length,
};
console.log(JSON.stringify(report, null, 2));

if (args.includes('--offline')) {
  console.log('Local content checks passed. No environment loading, network calls or database access.');
} else {
  const projectRoot = fileURLToPath(new URL('../', import.meta.url));
  nextEnv.loadEnvConfig(projectRoot);
  assert(process.env.DATABASE_URL, 'DATABASE_URL must be configured');
  const sql = neon(process.env.DATABASE_URL);
  const existing = await sql`SELECT * FROM posts WHERE slug = ${slug}`;
  assert(existing.length <= 1, 'Unexpected duplicate slug');
  if (existing.length) {
    for (const [key, value] of Object.entries(expectedFields)) {
      assert.ok(existing[0][key] === value, `Existing row differs in ${key}; review manually, no overwrite`);
    }
    assert(!args.includes('--save-draft'), 'Draft already exists; refusing to insert or overwrite');
  }

  const published = await sql`SELECT slug FROM posts WHERE published = true`;
  const publishedSlugs = new Set(published.map(post => post.slug));
  for (const target of uniqueSlugs) {
    assert(publishedSlugs.has(target), `Internal target missing or unpublished: ${target}`);
    const response = await fetch(`https://www.byteverse.fyi/blog/${target}`, { signal: AbortSignal.timeout(25000) });
    const html = await response.text();
    assert(response.ok && !/<title>Post Not Found/i.test(html), `Public internal target failed: ${target}`);
  }
  console.log(`Verified ${uniqueSlugs.length} published internal destinations on the live site.`);

  const otherImages = await sql`SELECT cover_image, content FROM posts WHERE slug <> ${slug}`;
  for (const image of imageUrls) {
    const photoId = new URL(image).pathname.match(/^\/photos\/(\d+)(?:\/|\.)/)?.[1];
    assert(photoId, 'Expected a Pexels photo ID');
    const samePhoto = new RegExp(`images\\.pexels\\.com/photos/${photoId}(?=[/.])`);
    assert(!otherImages.some(post => samePhoto.test(`${post.cover_image || ''}\n${post.content}`)), `Photo reused: ${photoId}`);
    const response = await fetch(image, { method: 'HEAD', signal: AbortSignal.timeout(25000) });
    assert(response.ok && response.headers.get('content-type')?.startsWith('image/'), `Invalid image: ${photoId}`);
  }

  const [category] = await sql`SELECT id FROM categories WHERE name = 'AI Tools'`;
  assert(category, 'AI Tools category missing');
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
    for (const [key, value] of Object.entries(expectedFields)) {
      assert.ok(draft[key] === value, `Saved draft differs in ${key}`);
    }
    assert.equal(draft.category_id, category.id);
    const [after] = await sql`
      SELECT count(*)::integer AS count,
        md5(coalesce(string_agg((to_jsonb(p) - 'views')::text, '' ORDER BY id), '')) AS hash
      FROM posts p WHERE slug <> ${slug}
    `;
    assert.deepEqual(after, before, 'Other posts changed during save; inspect without overwriting');
    console.log('SAVED HIDDEN DRAFT:', JSON.stringify({
      id: draft.id, slug: draft.slug, published: draft.published, featured: draft.featured,
      scheduled_at: draft.scheduled_at, otherPostsUnchanged: after.count,
      otherPostsChecksumExcludingViews: after.hash,
    }));
  } else {
    console.log('Read-only validation passed. Existing draft:', existing[0]?.id ?? 'not saved', '. No database writes.');
  }
}