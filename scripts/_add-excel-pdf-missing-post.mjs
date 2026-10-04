import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseDocument, DomUtils } from 'htmlparser2';

// Environment and database imports stay behind an explicit live-operation flag.
export const root = fileURLToPath(new URL('../', import.meta.url));
export const ledgerPath = resolve(root, 'docs/excel-pdf-missing-keywords-2026-10-03.json');
export const articlePath = resolve(root, 'scripts/content/excel-get-data-from-pdf-missing-2026.md');
export const ledger = JSON.parse(readFileSync(ledgerPath, 'utf8'));
export const content = readFileSync(articlePath, 'utf8').replace(/\r\n?/g, '\n').trim();
export const siteUrl = 'https://www.byteverse.fyi';
export const categoryName = ledger.targeting.category;
export const countWords = text => (text.match(/[\p{L}\p{N}]+(?:['’.-][\p{L}\p{N}]+)*/gu) || []).length;
export const prose = content.split('\n## Sources and Image Credits')[0]
  .replace(/```[\s\S]*?```/g, '')
  .replace(/!\[[^\]]*\]\([^\n]+\)/g, '')
  .replace(/\[([^\]]+)\]\([^\n)]+\)/g, '$1')
  .replace(/https?:\/\/[^\s)]+/g, '');
export const wordCount = countWords(prose);
export const contentSha256 = createHash('sha256').update(content).digest('hex');
export const article = Object.freeze({
  slug: 'excel-get-data-from-pdf-missing-2026',
  title: ledger.targeting.title,
  excerpt: "Missing Excel's From PDF option? Separate Windows and Mac support from component errors, check edition limits, and use approved alternatives while preserving identifiers, dates and amounts after conversion.",
  content,
  cover_image: 'https://images.pexels.com/photos/8296983/pexels-photo-8296983.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1400&h=788',
  author: 'Ali Rehman',
  meta_title: ledger.targeting.metaTitle,
  meta_description: ledger.targeting.metaDescription,
  keywords: [ledger.targeting.primary, ...ledger.targeting.secondary].join(', '),
  summary: 'Check the exact Excel platform, product and build before treating a missing PDF connector as an installation fault.|Separate Mac and edition limitations from Windows component errors; an update, .NET installation or M formula is not a universal fix.|Use approved source CSV/XLSX or conversion workflows and verify identifiers, dates, rows and amounts against the original.',
  reading_time: `${Math.ceil(wordCount / 220)} min read`,
  published: false,
  featured: false,
  scheduled_at: null,
});
export const internalLinks = [...content.matchAll(/(?<!!)\[([^\]]+)\]\((\/[^\s)]+)\)/g)];
export const bodyImages = [...content.matchAll(/!\[([^\]]+)\]\((https:\/\/[^\s)]+)(?:\s+"([^"]*)")?\)/g)];
export const imageUrls = [article.cover_image, ...bodyImages.map(match => match[2])];
export const photoIds = imageUrls.map(url => new URL(url).pathname.match(/^\/photos\/([1-9]\d*)\/pexels-photo-\1\.jpeg$/)?.[1]);
export const codeBlocks = [...content.matchAll(/^```([\w-]+)\n([\s\S]*?)^```[ \t]*$/gm)];
export const databaseFieldLimits = Object.freeze({ title: 255, slug: 255, author: 100, meta_title: 70, meta_description: 160, reading_time: 20 });
export const requiredPhrases = [
  "Microsoft's published Windows comparison marks PDF as included for its Microsoft 365 columns, while its Mac connector list does not include PDF.",
  'This is a documentation-based troubleshooting guide, checked on **October 3, 2026**, not a hands-on test of every Excel edition.',
  'The cited Windows matrix does not provide separate columns for these editions',
  '**version 16.69 (23010700) or later**',
  'That version requirement is for the editor—not a statement that a From PDF connector was added.',
  'The reviewed primary sources do not justify turning those claims into a universal compatibility promise here.',
  '**.NET Framework 4.5 or higher**',
  '**“Prerequisites: None.”**',
  'The sources are not perfectly aligned.',
  'Most importantly, do not treat this component guidance as proof that .NET will create an absent PDF menu.',
  '**not runtime-tested in Excel**',
  'not a workaround for an unsupported Mac connector.',
  'including nested **Data** tables',
  '**synthetic CSV**',
  '**Text before numeric conversion**',
  '**English (United Kingdom)**',
  'No Windows/Mac compatibility or extraction benchmark was performed for this article.',
];

export function validateFieldLengths(value) {
  for (const [field, limit] of Object.entries(databaseFieldLimits)) {
    assert.equal(typeof value[field], 'string', `${field} must be text`);
    assert(value[field].trim().length > 0 && [...value[field]].length <= limit, `${field} exceeds its database field bounds`);
  }
}

export function validateArticle() {
  assert.equal(ledger.slug, article.slug);
  assert.equal(categoryName, 'Tech Guides');
  assert.equal(article.title, ledger.targeting.title);
  assert.equal(article.meta_title, ledger.targeting.metaTitle);
  assert.equal(article.meta_description, ledger.targeting.metaDescription);
  assert.equal(article.author, 'Ali Rehman');
  assert.equal(article.published, false);
  assert.equal(article.featured, false);
  assert.equal(article.scheduled_at, null);
  assert.equal(article.content, content.replace(/\r\n?/g, '\n').trim());
  assert(!content.includes('\r') && !content.includes('\0'));
  validateFieldLengths(article);
  assert(article.excerpt.length >= 180 && article.excerpt.length <= 240, 'Keep the original excerpt approximately 200 characters');
  assert.notEqual(article.excerpt, article.meta_description);
  assert.equal(article.summary.split('|').length, 3);
  assert(article.summary.split('|').every(clause => clause.trim().length > 30));
  assert.deepEqual(article.keywords.split(', '), [ledger.targeting.primary, ...ledger.targeting.secondary]);
  assert.equal(article.reading_time, `${Math.ceil(wordCount / 220)} min read`);
  assert(wordCount > 0);
  assert.equal(ledger.inventory.totalPosts, 164);
  assert.equal(ledger.inventory.publishedPosts, 162);
  assert.equal(ledger.inventory.editorialChecksumExcludingViews, '99c33b5dd2d53059f21e3ae253d531ac');
  assert.deepEqual(ledger.inventory.protectedDrafts.map(post => post.id), [229, 230]);
  assert.equal(ledger.autocomplete.results.filter(seed => seed.status === 'ok').length, ledger.autocomplete.successfulSeeds);
  assert.equal(ledger.autocomplete.results.filter(seed => seed.suggestions.length).length, ledger.autocomplete.nonemptySeeds);

  assert.equal(internalLinks.length, 4);
  assert.deepEqual(internalLinks.map(match => match[2]), ledger.internalLinkPlan);
  assert.equal(new Set(internalLinks.map(match => match[2])).size, 4);
  for (const link of internalLinks) {
    const prefix = content.slice(content.lastIndexOf('\n', link.index) + 1, link.index);
    assert(!/^\s*(?:#|\||>|[-*] |\d+\. )/.test(prefix), 'Internal links must be in contextual prose');
    assert(link.index < content.indexOf('\n## Frequently Asked Questions'), 'Keep contextual links outside FAQ answers and credits');
  }
  const publicText = Object.values(article).filter(value => typeof value === 'string').join('\n');
  for (const draft of ledger.inventory.protectedDrafts) assert(!publicText.includes(draft.slug), `Hidden draft must not be linked or promoted: ${draft.id}`);
  assert(!publicText.includes(ledger.excludedLocalTool.path));
  assert(!/invoice[- ]pdf[- ]to[- ]excel/i.test(publicText), 'Do not link or promote the local-only invoice tool');

  assert.equal(bodyImages.length, 4);
  assert.equal(ledger.images.length, 5);
  assert.equal(ledger.images[0].role, 'cover');
  assert.equal(new Set(photoIds).size, 5);
  assert(photoIds.every(Boolean));
  assert.deepEqual(photoIds, ledger.images.map(image => String(image.id)));
  for (const [index, imageUrl] of imageUrls.entries()) {
    const url = new URL(imageUrl);
    const credit = ledger.images[index];
    assert.equal(url.origin, 'https://images.pexels.com');
    assert.equal(url.username, '');
    assert.equal(url.password, '');
    assert.equal(url.hash, '');
    assert.deepEqual([...url.searchParams], [['auto', 'compress'], ['cs', 'tinysrgb'], ['fit', 'crop'], ['w', '1400'], ['h', '788']]);
    assert.equal(credit.cropWidth, 1400);
    assert.equal(credit.cropHeight, 788);
    assert(content.includes(`[${credit.photographer}](${credit.source})`), 'Every illustration needs its source-page credit');
    if (index > 0) {
      assert.equal(credit.role, 'body');
      assert(bodyImages[index - 1][1].length > 20, 'Descriptive image alt required');
      assert(bodyImages[index - 1][3]?.includes(`${credit.photographer} / Pexels`), 'Credited figure caption required');
    }
  }
  const faqSection = content.split('\n## Frequently Asked Questions\n')[1]?.split('\n## ')[0] || '';
  const faqCount = [...faqSection.matchAll(/^### .+\?$/gm)].length;
  assert.equal(faqCount, 8);
  assert.equal((faqSection.match(/^### /gm) || []).length, 8);
  assert.deepEqual([...content.matchAll(/^```.*$/gm)].map(match => match[0]), ['```powerquery', '```', '```csv', '```']);
  assert.deepEqual(codeBlocks.map(block => block[1]), ['powerquery', 'csv']);
  const tableCount = [...content.matchAll(/^\|(?:[ \t]*:?-{3,}:?[ \t]*\|){3}[ \t]*$/gm)].length;
  assert.equal(tableCount, 1);
  assert(!/^\s{0,3}#(?:\s|$)/m.test(content), 'The application supplies the only H1');
  assert(!/<!--|<!doctype|<\/?[a-z][^>]*>/i.test(content), 'Use Markdown, not raw or unsafe HTML');
  assert(!/\]\((?:http:|javascript:|data:|\/\/)/i.test(content), 'Unsafe or non-HTTPS destination');
  assert(!/\b(?:TODO|TBD|lorem ipsum)\b/i.test(content));
  for (const phrase of requiredPhrases) assert(content.includes(phrase), `Required documented limitation missing: ${phrase}`);
  for (const source of ledger.primarySources) assert(content.includes(`](${source.url})`), 'A reviewed primary-source credit is missing');
  return {
    slug: article.slug,
    wordCountExcludingCodeImagesUrlsAndCredits: wordCount,
    paragraphWords: countWords(prose.split('\n').filter(line => !/^\s*(?:#|\||>|[-*] |\d+\. )/.test(line)).join('\n')),
    readingTime: article.reading_time,
    titleCharacters: article.title.length,
    metaTitleCharacters: article.meta_title.length,
    metaDescriptionCharacters: article.meta_description.length,
    excerptCharacters: article.excerpt.length,
    internalLinks: internalLinks.length, bodyImages: bodyImages.length, coverImages: 1,
    faqCount, tableCount, codeBlocks: codeBlocks.length, contentSha256,
    metadataLimits: 'Database field bounds only; not SEO or ranking guarantees',
  };
}

export function snapshotQuery(sql) {
  return sql`
    SELECT count(*)::integer AS count,
      (count(*) FILTER (WHERE p.published))::integer AS published_count,
      md5(coalesce(string_agg((to_jsonb(p) - 'views')::text, '' ORDER BY p.id), '')) AS hash
    FROM posts p WHERE p.slug <> ${article.slug}
  `;
}

export function protectedDraftsQuery(sql) {
  return sql`
    SELECT p.id, p.slug, p.published, p.featured, p.scheduled_at,
      md5(p.content) AS content_md5, md5((to_jsonb(p) - 'views')::text) AS editorial_hash
    FROM posts p
    WHERE p.id = ANY(${ledger.inventory.protectedDrafts.map(post => post.id)}::integer[])
      OR p.slug = ANY(${ledger.inventory.protectedDrafts.map(post => post.slug)}::text[])
    ORDER BY p.id
  `;
}

export function imageReuseQuery(sql) {
  // Keep large post bodies in PostgreSQL; match both Pexels path layouts by ID.
  const patterns = photoIds.map(id => `images[.]pexels[.]com/photos/${id}([/.]|$)`);
  return sql`
    SELECT p.id, p.slug, photo.id AS photo_id
    FROM posts p CROSS JOIN unnest(${photoIds}::text[], ${patterns}::text[]) AS photo(id, pattern)
    WHERE p.slug <> ${article.slug}
      AND (p.cover_image ~* photo.pattern OR p.content ~* photo.pattern)
    ORDER BY p.id, photo.id
  `;
}

export function databaseReadQueries(sql) {
  const blogSlugs = internalLinks.map(link => link[2]).filter(path => path.startsWith('/blog/')).map(path => path.slice(6));
  return [
    snapshotQuery(sql), protectedDraftsQuery(sql),
    sql`SELECT p.*, md5((to_jsonb(p) - 'views')::text) AS editorial_hash FROM posts p WHERE p.slug = ${article.slug}`,
    sql`SELECT id, name FROM categories WHERE name = ${categoryName}`,
    sql`SELECT id, slug, published FROM posts WHERE slug = ANY(${blogSlugs}::text[])`,
    imageReuseQuery(sql),
  ];
}

async function readDatabaseState(sql) {
  const [snapshots, protectedRows, existing, categories, targets, reusedImages] = await sql.transaction(databaseReadQueries, {
    isolationLevel: 'RepeatableRead', readOnly: true, fetchOptions: { signal: AbortSignal.timeout(30000) },
  });
  assert.equal(snapshots.length, 1, 'Missing inventory snapshot');
  return { snapshot: snapshots[0], protectedRows, existing, categories, targets, reusedImages };
}

export function assertProtectedDrafts(rows) {
  assert.equal(rows.length, 2, 'Protected draft identity/count changed');
  for (const expected of ledger.inventory.protectedDrafts) {
    const actual = rows.find(row => row.id === expected.id);
    assert(actual, `Missing protected draft ${expected.id}`);
    assert.equal(actual.slug, expected.slug, `Protected draft ${expected.id} slug changed`);
    assert.equal(actual.published, false, `Protected draft ${expected.id} was published`);
    assert.equal(actual.featured, false, `Protected draft ${expected.id} was featured`);
    assert.equal(actual.scheduled_at, null, `Protected draft ${expected.id} was scheduled`);
    assert.equal(actual.content_md5, expected.contentMd5, `Protected draft ${expected.id} content changed`);
    assert.equal(actual.editorial_hash, expected.editorialHash, `Protected draft ${expected.id} editorial fields changed`);
  }
}

export function assertArticleRow(row, categoryId) {
  assert(row && Number.isInteger(row.id) && row.id > 0, 'Missing saved draft identity');
  for (const [field, expected] of Object.entries(article)) assert.equal(row[field], expected, `Draft differs in ${field}; never overwrite`);
  assert.equal(row.category_id, categoryId, 'Draft category differs; never overwrite');
}

export function assertDatabaseState(state) {
  assertProtectedDrafts(state.protectedRows);
  assert.equal(state.categories.length, 1, 'Exactly one Tech Guides category is required');
  const category = state.categories[0];
  assert(Number.isInteger(category.id) && category.id > 0 && category.name === categoryName, 'Category identity/name mismatch');
  assert(state.existing.length <= 1, 'Duplicate article slugs; stop');
  if (state.existing.length) assertArticleRow(state.existing[0], category.id);
  const blogs = internalLinks.map(link => link[2]).filter(path => path.startsWith('/blog/'));
  assert.equal(state.targets.length, blogs.length, 'Internal blog target count changed');
  for (const path of blogs) assert(state.targets.some(post => post.slug === path.slice(6) && post.published === true), `Internal blog target is not published: ${path}`);
  assert.equal(state.reusedImages.length, 0, `Pexels reuse detected: ${state.reusedImages.map(row => `${row.slug}:${row.photo_id}`).join(', ')}`);
  return category;
}

export function assertInventoryBaseline(snapshot) {
  assert.deepEqual(snapshot, {
    count: ledger.inventory.totalPosts, published_count: ledger.inventory.publishedPosts,
    hash: ledger.inventory.editorialChecksumExcludingViews,
  }, 'Inventory changed since research; inspect before any INSERT');
}

export function guardedInsertQuery(sql, categoryId) {
  return sql`
    WITH inventory AS (${snapshotQuery(sql)})
    INSERT INTO posts (
      title, slug, excerpt, content, cover_image, category_id, author,
      published, featured, scheduled_at, meta_title, meta_description,
      keywords, summary, reading_time, views, created_at, updated_at
    )
    SELECT ${article.title}, ${article.slug}, ${article.excerpt}, ${article.content},
      ${article.cover_image}, c.id, ${article.author}, ${article.published}, ${article.featured},
      ${article.scheduled_at}, ${article.meta_title}, ${article.meta_description},
      ${article.keywords}, ${article.summary}, ${article.reading_time}, ${0}, NOW(), NOW()
    FROM inventory CROSS JOIN categories c
    WHERE c.id = ${categoryId} AND c.name = ${categoryName}
      AND (SELECT count(*) FROM categories WHERE name = ${categoryName}) = 1
      AND inventory.count = ${ledger.inventory.totalPosts}
      AND inventory.published_count = ${ledger.inventory.publishedPosts}
      AND inventory.hash = ${ledger.inventory.editorialChecksumExcludingViews}
      AND NOT EXISTS (SELECT 1 FROM posts WHERE slug = ${article.slug})
    RETURNING *
  `;
}

export function draftTransactionQueries(sql, categoryId) {
  return [snapshotQuery(sql), guardedInsertQuery(sql, categoryId), snapshotQuery(sql), protectedDraftsQuery(sql)];
}
export const draftTransactionOptions = Object.freeze({ isolationLevel: 'Serializable', readOnly: false });

function pageDetails(body, headers) {
  const doc = parseDocument(body);
  const titles = DomUtils.findAll(node => node.name === 'title', doc.children);
  const canonicals = DomUtils.findAll(node => node.name === 'link' && (node.attribs.rel || '').toLowerCase().split(/\s+/).includes('canonical'), doc.children);
  const robots = DomUtils.findAll(node => node.name === 'meta' && /^(?:robots|googlebot|googlebot-news|bingbot)$/i.test(node.attribs.name || ''), doc.children);
  const headings = DomUtils.findAll(node => /^(?:h1|h2)$/.test(node.name || ''), doc.children);
  return {
    title: titles.length === 1 ? DomUtils.textContent(titles[0]) : '',
    headings: headings.map(node => DomUtils.textContent(node)).join(' '),
    canonicals: canonicals.map(node => node.attribs.href),
    noindex: robots.some(node => /\b(?:noindex|none)\b/i.test(node.attribs.content || '')) || /\b(?:noindex|none)\b/i.test(headers.get('x-robots-tag') || ''),
  };
}

export function validatePublicTarget(path, response, body) {
  const details = pageDetails(body, response.headers);
  assert.equal(response.status, 200, `Internal destination status: ${path}`);
  assert(details.title && !/Post\s*Not\s*Found/i.test(`${details.title} ${details.headings}`), `Missing internal destination: ${path}`);
  assert.deepEqual(details.canonicals, [`${siteUrl}${path}`], `Self-canonical mismatch: ${path}`);
  assert(!details.noindex, `Noindex internal destination: ${path}`);
}

export function validateHiddenBlog(slug, response, body) {
  const details = pageDetails(body, response.headers);
  assert([200, 404].includes(response.status) && /Post\s*Not\s*Found/i.test(details.title), `Hidden blog unexpectedly exposed: ${slug}`);
  assert(details.noindex, `Hidden blog lacks noindex: ${slug}`);
  return { slug, blogStatus: response.status, blogTitle: details.title };
}

const request = (url, method = 'GET') => fetch(url, { method, redirect: 'manual', signal: AbortSignal.timeout(25000) });

async function inspectDestinations() {
  for (const [, , path] of internalLinks) {
    const response = await request(`${siteUrl}${path}`);
    validatePublicTarget(path, response, await response.text());
  }
  for (const [index, url] of imageUrls.entries()) {
    const response = await request(url, 'HEAD');
    assert.equal(response.status, 200, `Image unavailable: ${photoIds[index]}`);
    assert(/^image\//i.test(response.headers.get('content-type') || ''), `Image MIME mismatch: ${photoIds[index]}`);
  }
}

async function inspectHiddenVisibility() {
  const hiddenSlugs = [article.slug, ...ledger.inventory.protectedDrafts.map(post => post.slug)];
  for (const slug of hiddenSlugs) {
    const response = await request(`${siteUrl}/blog/${slug}`);
    const result = validateHiddenBlog(slug, response, await response.text());
    const story = await request(`${siteUrl}/stories/${slug}`);
    assert.equal(story.status, 404, `Hidden story must remain unavailable: ${slug}`);
    assert(/\bnoindex\b/i.test(story.headers.get('x-robots-tag') || ''), `Hidden story lacks a noindex header: ${slug}`);
    await story.body?.cancel();
    console.log('HIDDEN:', JSON.stringify({ ...result, storyStatus: story.status }));
  }
  for (const path of ['/blog', '/sitemap.xml', '/feed.xml']) {
    const response = await request(`${siteUrl}${path}`);
    assert.equal(response.status, 200, `Public collection unavailable: ${path}`);
    const body = await response.text();
    assert(hiddenSlugs.every(slug => !body.includes(slug)), `Hidden slug advertised in ${path}`);
  }
}

export function parseMode(args) {
  assert(args.length <= 1 && args.every(arg => ['--offline', '--read-only', '--save-draft'].includes(arg)), 'Use no argument, --offline, --read-only or --save-draft exclusively');
  return args[0] || '--offline';
}

export async function runArticleTask(args = []) {
  const mode = parseMode(args);
  const report = validateArticle();
  console.log(JSON.stringify({ mode, ...report }, null, 2));
  if (mode === '--offline') {
    console.log('PASS: Offline article checks only. No environment files, database or network; source facts and Excel/M examples still need independent review.');
    return report;
  }

  const { default: nextEnv } = await import('@next/env');
  const { neon } = await import('@neondatabase/serverless');
  nextEnv.loadEnvConfig(root);
  assert(process.env.DATABASE_URL, 'Database configuration is required for this explicit live mode');
  const sql = neon(process.env.DATABASE_URL);
  const before = await readDatabaseState(sql);
  const category = assertDatabaseState(before);
  if (mode === '--save-draft') {
    assert.equal(before.existing.length, 0, 'Draft already exists; INSERT refused, never update or retry');
    assertInventoryBaseline(before.snapshot);
  }
  await inspectDestinations();
  console.log('PASS: Four published/self-canonical destinations; five unused photo IDs with HTTP 200 image HEAD responses.');

  if (mode === '--save-draft') {
    // Neon batches are non-interactive: the fingerprint gate must be inside INSERT.
    console.log('Attempting one hidden INSERT. If the result is uncertain, inspect with --read-only; never retry automatically.');
    const [transactionBefore, inserted, transactionAfter, protectedRows] = await sql.transaction(tx => draftTransactionQueries(tx, category.id), {
      ...draftTransactionOptions, fetchOptions: { signal: AbortSignal.timeout(30000) },
    });
    assert.equal(inserted.length, 1, 'INSERT refused by the inventory/category/slug guard; no new row returned, inspect before proceeding');
    const saved = inserted[0];
    console.log('INSERT COMMITTED — DO NOT RERUN:', JSON.stringify({
      id: saved.id, slug: saved.slug, published: saved.published, featured: saved.featured,
      scheduledAt: saved.scheduled_at, contentSha256,
    }));
    assertArticleRow(saved, category.id);
    assert.equal(saved.views, 0);
    assert(Number.isFinite(new Date(saved.created_at).getTime()), 'Saved creation timestamp missing');
    assert.equal(new Date(saved.created_at).getTime(), new Date(saved.updated_at).getTime(), 'INSERT timestamps must both use NOW()');
    assert.equal(transactionBefore.length, 1);
    assert.equal(transactionAfter.length, 1);
    assertInventoryBaseline(transactionBefore[0]);
    assert.deepEqual(transactionBefore[0], before.snapshot, 'Inventory changed before the transaction');
    assert.deepEqual(transactionAfter[0], transactionBefore[0], 'Other editorial rows changed inside the transaction');
    assertProtectedDrafts(protectedRows);
    const after = await readDatabaseState(sql);
    assertDatabaseState(after);
    assert.equal(after.existing.length, 1);
    assert.equal(after.existing[0].id, saved.id);
    assert.deepEqual(after.snapshot, before.snapshot, 'Other editorial rows changed after commit; inspect, do not overwrite');
    console.log('SAVED HIDDEN DRAFT:', JSON.stringify({
      id: saved.id, published: false, featured: false, scheduledAt: null,
      otherPostsUnchanged: after.snapshot, protectedDrafts: [229, 230], contentSha256,
      publicVisibility: 'Not asserted by save; run the separate --read-only review',
    }));
  } else {
    await inspectHiddenVisibility();
    const after = await readDatabaseState(sql);
    assertDatabaseState(after);
    assert.deepEqual(after.snapshot, before.snapshot, 'Other editorial rows changed during read-only validation');
    assert.equal(after.existing.length, before.existing.length, 'Draft existence changed during validation');
    assert.equal(after.existing[0]?.editorial_hash, before.existing[0]?.editorial_hash, 'Draft editorial fields changed during validation');
    console.log('PASS: Read-only DB/HTTP checks; all three slugs remain unavailable on blog/story routes and absent from the checked blog index, sitemap and feed.');
    console.log(JSON.stringify({ draftId: after.existing[0]?.id ?? null, otherEditorialSnapshot: after.snapshot, protectedDrafts: [229, 230], contentSha256 }));
  }
  return report;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    await runArticleTask(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof assert.AssertionError ? error.message : 'Article operation failed; inspect configuration/connectivity without exposing secrets.');
    console.error('No automatic retry or overwrite. A failed/uncertain save requires a separate read-only inspection.');
    process.exitCode = 1;
  }
}