import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseDocument, DomUtils } from 'htmlparser2';

// No args / --offline: no app env, network or DB. --read-only checks DB/HTTP.
// --save-draft can INSERT only this new hidden row. Never updates or publishes.
export const root = fileURLToPath(new URL('../', import.meta.url));
export const ledger = JSON.parse(readFileSync(new URL('../docs/github-copilot-not-working-keywords-2026-10-02.json', import.meta.url), 'utf8'));
const content = readFileSync(new URL('./content/github-copilot-not-working-vscode-2026.md', import.meta.url), 'utf8').replace(/\r\n?/g, '\n').trim();
const prose = content.split('\n## Sources and Image Credits')[0]
  .replace(/```[\s\S]*?```/g, '')
  .replace(/!\[[^\]]*\]\([^\n]+\)/g, '')
  .replace(/\[([^\]]+)\]\([^\n)]+\)/g, '$1');
const countWords = text => (text.match(/[\p{L}\p{N}]+(?:['’.-][\p{L}\p{N}]+)*/gu) || []).length;
export const wordCount = countWords(prose);
export const categoryName = 'Coding';
export const article = {
  slug: 'github-copilot-not-working-vscode-2026',
  title: 'GitHub Copilot Not Working in VS Code? 9 Checks That Fix It',
  excerpt: 'Nine ordered checks for GitHub Copilot not working in VS Code: status bar state, Free plan and rate limits, per-language settings, sign-in loops, version pairing, proxy and certificate errors, content exclusions and the official diagnostics.',
  content,
  cover_image: 'https://images.pexels.com/photos/4974912/pexels-photo-4974912.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1400&h=788',
  author: 'Ali Rehman',
  meta_title: 'GitHub Copilot Not Working in VS Code? 9 Fixes (2026)',
  meta_description: 'Fix GitHub Copilot not working in VS Code: no inline suggestions, sign-in loops, Free plan and rate limits, proxy and firewall errors, official diagnostics.',
  keywords: 'github copilot not working vscode, copilot suggestions not showing vscode, github copilot chat not working vscode, github copilot sign in not working, copilot extension activation failed, copilot free limit vscode',
  summary: 'Identify which Copilot feature stopped (completions, chat, sign-in, connection) before changing anything.|Rule out Free plan completion allowance, AI credits and service rate limits, then per-language settings, snooze and metered connections.|Use the documented ping endpoints, Chat Diagnostics Reachability and Output logs instead of reinstalling or disabling certificate checks.',
  reading_time: `${Math.ceil(wordCount / 220)} min read`,
  published: false,
  featured: false,
  scheduled_at: null,
};
export const internalLinks = [...content.matchAll(/(?<!!)\[([^\]]+)\]\((\/(?:blog|tools)\/[a-z0-9-]+)\)/g)];
export const bodyImages = [...content.matchAll(/!\[([^\]]+)\]\((https:\/\/[^\s)]+)(?:\s+"([^"]*)")?\)/g)];
export const imageUrls = [article.cover_image, ...bodyImages.map(match => match[2])];
const photoIds = imageUrls.map(image => new URL(image).pathname.match(/^\/photos\/(\d+)(?:\/|\.)/)?.[1]);

export function validateArticle() {
  assert.equal(ledger.slug, article.slug);
  assert.equal(ledger.targeting.title, article.title);
  assert.equal(ledger.targeting.metaTitle, article.meta_title);
  assert.equal(ledger.targeting.metaDescription, article.meta_description);
  assert.equal(ledger.targeting.category, categoryName);
  assert(article.title.length <= 255 && article.meta_title.length <= 70 && article.meta_description.length <= 160, 'Metadata exceeds DB field bounds');
  assert.equal(ledger.autocomplete.results.length, ledger.autocomplete.successfulSeeds);
  assert.equal(ledger.autocomplete.results.filter(item => item.suggestions.length).length, ledger.autocomplete.nonemptySeeds);
  assert.deepEqual(internalLinks.map(match => match[2]).sort(), [...ledger.internalLinkPlan].sort());
  assert.equal(new Set(internalLinks.map(match => match[2])).size, internalLinks.length, 'No repeated internal targets');
  for (const link of internalLinks) {
    const lineStart = content.slice(0, link.index).split('\n').at(-1);
    assert(!/^\s*(?:#|\||>|[-*] |\d+\. )/.test(lineStart), 'Internal links should be contextual prose');
  }
  assert.equal(bodyImages.length, 4);
  assert.equal(new Set(photoIds).size, 5);
  assert(photoIds.every(Boolean));
  assert.deepEqual([...photoIds].sort(), ledger.images.map(image => String(image.id)).sort());
  assert(bodyImages.every(image => image[1].length > 15 && image[3]?.includes('Pexels')), 'Meaningful image alt and credit captions required');
  const faqSection = content.split('\n## Frequently Asked Questions\n')[1]?.split('\n## ')[0] || '';
  const faqCount = [...faqSection.matchAll(/^### .+\?$/gm)].length;
  assert.equal(faqCount, 8);
  assert.equal((content.match(/^```/gm) || []).length, 10, 'All five code blocks must be closed');
  assert(!/^# /m.test(content), 'The app renders the title as H1');
  assert(!/<\/?(?:script|iframe)\b/i.test(content));
  assert(!/\]\(http:\/\//.test(content));
  assert(!/\b(TODO|TBD|lorem ipsum)\b/i.test(content));
  assert(content.includes('documentation-based troubleshooting guide, not a hands-on test'));
  assert(content.includes('October 2, 2026'));
  for (const draft of ledger.inventory.protectedDrafts) assert(!content.includes(`/blog/${draft.slug}`), 'Never link a hidden draft');
  for (const required of ['2000 completions', 'Developer: Reload Window', 'Developer: Chat Diagnostics', 'github.copilot.enable', 'example.invalid', '_ping', 'Proxy Strict SSL', 'diagonal line', 'Trigger Inline Suggestion', '30 minutes']) {
    assert(content.includes(required), `Reviewed detail missing: ${required}`);
  }
  return {
    slug: article.slug, wordCountExcludingCodeImagesUrlsAndCredits: wordCount,
    paragraphWords: countWords(prose.split('\n').filter(line => !/^\s*(?:#|\||>|[-*] |\d+\. )/.test(line)).join('\n')),
    internalLinks: internalLinks.length, bodyImages: bodyImages.length, coverImages: 1,
    faqCount, codeBlocks: 5, metaTitleCharacters: article.meta_title.length,
    metaDescriptionCharacters: article.meta_description.length,
  };
}

async function inspectPublicTarget(path) {
  const url = `https://www.byteverse.fyi${path}`;
  const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(25000) });
  const doc = parseDocument(await response.text());
  const title = DomUtils.findOne(node => node.name === 'title', doc.children, true);
  const canonical = DomUtils.findOne(node => node.name === 'link' && node.attribs.rel === 'canonical', doc.children, true);
  const robots = DomUtils.findAll(node => node.name === 'meta' && ['robots', 'googlebot'].includes(node.attribs.name), doc.children);
  assert.equal(response.status, 200, `Internal destination status: ${path}`);
  assert(title && !/Post Not Found/i.test(DomUtils.textContent(title)), `Missing internal destination: ${path}`);
  assert.equal(canonical?.attribs.href, url, `Canonical mismatch: ${path}`);
  assert(!robots.some(node => /\bnoindex\b/i.test(node.attribs.content)) && !/\bnoindex\b/i.test(response.headers.get('x-robots-tag') || ''), `Noindex internal destination: ${path}`);
}

export async function runArticleTask(args) {
  assert(args.length <= 1 && args.every(arg => ['--offline', '--read-only', '--save-draft'].includes(arg)), 'Use --offline, --read-only or --save-draft');
  const mode = args[0] || '--offline';
  console.log(JSON.stringify({ mode, ...validateArticle() }, null, 2));
  if (mode === '--offline') {
    console.log('PASS: Offline content checks. No environment loading, network or DB access.');
    return;
  }

  const { default: nextEnv } = await import('@next/env');
  const { neon } = await import('@neondatabase/serverless');
  nextEnv.loadEnvConfig(root);
  assert(process.env.DATABASE_URL, 'Database configuration is required');
  const sql = neon(process.env.DATABASE_URL);
  const protectedRows = await sql`
    SELECT id, slug, published, featured, scheduled_at, md5(content) AS content_md5
    FROM posts WHERE id IN (229, 230) ORDER BY id
  `;
  for (const expected of ledger.inventory.protectedDrafts) {
    const actual = protectedRows.find(post => post.id === expected.id);
    assert(actual && actual.slug === expected.slug && actual.published === false && actual.featured === false && actual.scheduled_at === null && actual.content_md5 === expected.contentMd5, `Protected draft ${expected.id} changed; stop and inspect`);
  }
  const existing = await sql`SELECT * FROM posts WHERE slug = ${article.slug}`;
  assert(existing.length <= 1);
  if (existing.length) {
    for (const [key, value] of Object.entries(article)) assert.ok(existing[0][key] === value, `Existing draft differs in ${key}; no overwrite`);
    assert(mode !== '--save-draft', 'Draft already exists; insertion refused');
  }

  const published = await sql`SELECT slug FROM posts WHERE published = true`;
  const publishedSlugs = new Set(published.map(post => post.slug));
  for (const [, , path] of internalLinks) {
    if (path.startsWith('/blog/')) assert(publishedSlugs.has(path.slice('/blog/'.length)), `Unpublished link: ${path}`);
    await inspectPublicTarget(path);
  }
  const others = await sql`SELECT cover_image, content FROM posts WHERE slug <> ${article.slug}`;
  for (const [index, image] of imageUrls.entries()) {
    const pattern = new RegExp(`images\\.pexels\\.com/photos/${photoIds[index]}(?=[/.])`);
    assert(!others.some(post => pattern.test(`${post.cover_image || ''}\n${post.content}`)), `Photo already used: ${photoIds[index]}`);
    const response = await fetch(image, { method: 'HEAD', signal: AbortSignal.timeout(25000) });
    assert(response.ok && response.headers.get('content-type')?.startsWith('image/'), `Image unavailable: ${photoIds[index]}`);
  }
  const [category] = await sql`SELECT id FROM categories WHERE name = ${categoryName}`;
  assert(category, `${categoryName} category is required`);
  if (existing.length) assert.equal(existing[0].category_id, category.id);
  console.log(`PASS: ${internalLinks.length} published/self-canonical destinations and ${imageUrls.length} unused, available photos.`);

  const snapshot = async () => (await sql`
    SELECT count(*)::integer AS count,
      md5(coalesce(string_agg((to_jsonb(p) - 'views')::text, '' ORDER BY id), '')) AS hash
    FROM posts p WHERE slug <> ${article.slug}
  `)[0];
  const before = await snapshot();
  if (mode === '--save-draft') {
    assert(before.count === ledger.inventory.totalPosts && before.hash === ledger.inventory.editorialChecksumExcludingViews, 'Inventory changed since research; inspect before adding the draft');
    const [saved] = await sql`INSERT INTO posts (
      title, slug, excerpt, content, cover_image, category_id, author,
      published, featured, scheduled_at, meta_title, meta_description, keywords,
      reading_time, views, created_at, updated_at, summary
    ) VALUES (
      ${article.title}, ${article.slug}, ${article.excerpt}, ${article.content}, ${article.cover_image}, ${category.id}, ${article.author},
      false, false, NULL, ${article.meta_title}, ${article.meta_description}, ${article.keywords},
      ${article.reading_time}, 0, NOW(), NOW(), ${article.summary}
    ) RETURNING *`;
    assert(saved, 'No draft returned; do not retry automatically');
    console.log('Draft insert committed, verifying saved fields. ID:', saved.id, 'Do not rerun --save-draft if verification fails.');
    for (const [key, value] of Object.entries(article)) assert.ok(saved[key] === value, `Saved field mismatch: ${key}`);
    assert.equal(saved.category_id, category.id);
    const after = await snapshot();
    assert.deepEqual(after, before, 'Other editorial data changed; inspect without overwriting');
    console.log('SAVED HIDDEN DRAFT:', JSON.stringify({ id: saved.id, slug: saved.slug, published: saved.published, featured: saved.featured, scheduledAt: saved.scheduled_at, otherPostsUnchanged: after.count, checksumExcludingViews: after.hash, contentSha256: createHash('sha256').update(article.content).digest('hex') }));
  } else {
    if (existing.length) {
      const hiddenSlugs = [article.slug, ...ledger.inventory.protectedDrafts.map(draft => draft.slug)];
      for (const slug of hiddenSlugs) {
        const response = await fetch(`https://www.byteverse.fyi/blog/${slug}`, { redirect: 'manual', signal: AbortSignal.timeout(25000) });
        const doc = parseDocument(await response.text());
        const title = DomUtils.findOne(node => node.name === 'title', doc.children, true);
        const robots = DomUtils.findAll(node => node.name === 'meta' && ['robots', 'googlebot'].includes(node.attribs.name), doc.children);
        assert([200, 404].includes(response.status) && title && /Post Not Found/i.test(DomUtils.textContent(title)), `Draft unexpectedly exposed: ${slug}`);
        assert(robots.some(node => /\bnoindex\b/i.test(node.attribs.content)), `Hidden draft lacks noindex: ${slug}`);
        const story = await fetch(`https://www.byteverse.fyi/stories/${slug}`, { redirect: 'manual', signal: AbortSignal.timeout(25000) });
        assert.equal(story.status, 404, `Draft story must stay unavailable: ${slug}`);
        assert.equal(story.headers.get('x-robots-tag'), 'noindex');
        console.log('HIDDEN:', JSON.stringify({ slug, blogStatus: response.status, blogTitle: DomUtils.textContent(title), storyStatus: story.status }));
      }
      for (const path of ['/blog', '/sitemap.xml', '/feed.xml']) {
        const response = await fetch(`https://www.byteverse.fyi${path}`, { signal: AbortSignal.timeout(25000) });
        assert(response.ok, `Public collection unavailable: ${path}`);
        const body = await response.text();
        assert(hiddenSlugs.every(slug => !body.includes(slug)), `Draft advertised in ${path}`);
      }
      console.log('PASS: All three drafts hidden on blog/story routes and absent from blog index, sitemap and feed.');
    }
    assert.deepEqual(await snapshot(), before, 'Editorial data changed during validation');
    console.log('PASS: Read-only checks. Draft ID:', existing[0]?.id ?? 'not saved', 'Other editorial snapshot:', JSON.stringify(before));
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    await runArticleTask(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof assert.AssertionError ? error.message : 'Article operation failed; no automatic retry. Inspect configuration or connectivity without exposing secrets.');
    process.exitCode = 1;
  }
}
