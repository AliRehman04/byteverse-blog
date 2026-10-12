import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseDocument, DomUtils } from 'htmlparser2';

export const root = fileURLToPath(new URL('../', import.meta.url));
export const articlePath = resolve(root, 'scripts/content/excel-csv-special-characters-utf8.md');
export const ledgerPath = resolve(root, 'docs/excel-csv-utf8-keywords-2026-10-12.json');
const normalized = path => readFileSync(path, 'utf8').replace(/\r\n?/g, '\n').trim();
const sha256 = text => createHash('sha256').update(text, 'utf8').digest('hex');
const ledgerText = normalized(ledgerPath);
export const ledger = JSON.parse(ledgerText);
export const ledgerSha256 = sha256(ledgerText);
export const content = normalized(articlePath);
export const contentSha256 = sha256(content);
export const siteUrl = 'https://www.byteverse.fyi';
const links = [...content.matchAll(/(?<!!)\[([^\]]+)\]\(([^\s)]+)\)/g)];
export const internalLinks = links.filter(match => match[2].startsWith('/')).map(match => match[2]);
export const blogLinks = internalLinks.filter(url => url.startsWith('/blog/'));
export const bodyImages = [...content.matchAll(/!\[([^\]]+)\]\((https:\/\/[^\s)]+)\s+"([^"]+)"\)/g)];
export const imageUrls = [`${siteUrl}/blog/csv-utf8/cover.png`, ...bodyImages.map(match => match[2])];
export const codeBlocks = [...content.matchAll(/^```([\w-]+)\n([\s\S]*?)^```[ \t]*$/gm)];
const prose = content.split('\n## Sources and Image Credits')[0].replace(/```[\s\S]*?```/g, '').replace(/!\[[^\]]*\]\([^\n]+\)/g, '').replace(/\[([^\]]+)\]\([^\n)]+\)/g, '$1');
export const wordCount = (prose.match(/[\p{L}\p{N}]+(?:['’.-][\p{L}\p{N}]+)*/gu) ?? []).length;
export const article = Object.freeze({
  title: ledger.targeting.title, slug: ledger.slug,
  excerpt: 'Import CSV characters with the right encoding, distinguish a bad decode from saved corruption, and check UTF-8 and BOM without overwriting the original.',
  content, cover_image: imageUrls[0], author: 'Ali Rehman', published: false, featured: false, scheduled_at: null,
  meta_title: ledger.targeting.metaTitle, meta_description: ledger.targeting.metaDescription,
  keywords: [ledger.targeting.primary, ...ledger.targeting.secondary].join(', '),
  summary: 'Preserve the original bytes and choose the documented File Origin before loading a CSV.|A UTF-8 BOM helps detection; it cannot repair saved mojibake, lost characters, delimiters or inferred types.|Check representative multilingual records after import and after exporting a new copy.',
  reading_time: `${Math.ceil(wordCount / 220)} min read`,
});
export const baseline = Object.freeze({ total_posts: 170, published_posts: 167, editorial_hash: '07dc3c6f38db09f0721cb9e30fe8fe98' });

export function validateArticle() {
  assert.deepEqual({ total_posts: ledger.inventory.totalPosts, published_posts: ledger.inventory.publishedPosts, editorial_hash: ledger.inventory.editorialChecksumExcludingViews }, baseline);
  assert.deepEqual(ledger.inventory.protectedDrafts.map(row => row.id), [229, 230, 238]);
  assert.equal(article.slug, 'excel-csv-special-characters-utf8');
  assert.equal(ledger.targeting.categoryId, 2); assert.equal(ledger.targeting.category, 'Tech Guides');
  for (const [field, maximum] of Object.entries({ title: 255, slug: 255, author: 100, meta_title: 70, meta_description: 160, reading_time: 20 })) {
    assert.equal(typeof article[field], 'string'); assert(article[field].trim() && [...article[field]].length <= maximum, `Invalid ${field}`);
  }
  assert.equal(article.published, false); assert.equal(article.featured, false); assert.equal(article.scheduled_at, null);
  assert.equal(article.summary.split('|').length, 3);
  assert.deepEqual(internalLinks, ledger.internalLinkPlan);
  assert.deepEqual(internalLinks, ['/blog/excel-csv-leading-zeros-2026', '/tools/json-to-csv', '/blog/vscode-tips-and-tricks-2026']);
  assert(links.filter(match => match[2].startsWith('/')).every(match => match.index < content.indexOf('\n## Frequently Asked Questions')));
  assert(!/^#\s/m.test(content) && !/\bTODO\b|\bTBD\b|<!--|<\/?[a-z][^>]*>/i.test(content));
  assert(!content.includes('\r') && !content.includes('\0'));
  // U+FFFD and mojibake are intentional teaching examples, not blanket corruption failures.
  assert(content.includes('\ufffd') && content.includes('U+FFFD') && content.includes('EF BF BD'));
  const sections = {
    'First, identify what is actually wrong': ['untouched copy', 'File Origin', 'Delimiter', 'Data Type Detection'],
    'Import a known UTF-8 CSV without guessing': ['65001: Unicode (UTF-8)', 'Windows-1252', 'Do not detect data types', 'Transform Data', 'approved local software'],
    'A small multilingual sample to check your import': ['fictional', 'three data rows and three columns', 'ads and analytics', 'does **not** repair'],
    'Why the same bytes can display two different ways': ['C3 A9', 'C3 83 C2 A9', 'E9', 'Valid encoding and correct text are different tests'],
    'What a UTF-8 BOM fixes—and what it cannot fix': ['EF BB BF', 'little-endian', 'Convert Windows-1252', 'Restore letters'],
    'When choosing UTF-8 still does not fix the text': ['### Case A:', '### Case B:', '### Case C:', 'Reopen with Encoding', 'Save with Encoding', 'fully reversible', '3F', 'original byte remains unchanged'],
    'Export a clean copy without repeating the problem': ['CSV UTF-8 (Comma delimited)', 'active worksheet', 'new file', 'Csv.Document', 'not a promise'],
    'Common false fixes to avoid': ['font', 'source data', 'row count'],
    'Verification Notes': ['October 12, 2026', 'fictional', 'no hands-on Excel'],
  };
  for (const [heading, terms] of Object.entries(sections)) {
    const section = content.split(`\n## ${heading}\n`)[1]?.split('\n## ')[0];
    assert(section, `Missing necessary section: ${heading}`);
    for (const term of terms) assert(section.includes(term), `Missing distinction: ${term}`);
  }
  const faq = content.split('\n## Frequently Asked Questions\n')[1]?.split('\n## ')[0]; assert(faq);
  const questions = faq.match(/^### .+\?$/gm) ?? []; assert.equal(questions.length, 5);
  assert.deepEqual(content.match(/^#{1,6} .+\?$/gm), questions, 'Only the five FAQ headings may be questions');
  assert.equal((content.match(/^\| --- /gm) ?? []).length, 2);
  assert.deepEqual(codeBlocks.map(block => block[1]), ['csv']); assert.equal((content.match(/^```/gm) ?? []).length, 2);
  const records = codeBlocks[0][2].trimEnd().split('\n').map(line => line.split(','));
  assert.deepEqual(records[0], ['name', 'city', 'note']); assert.equal(records.length, 4); assert(records.every(row => row.length === 3));
  const sources = ledger.primarySources.map(source => source.url); assert.equal(sources.length, 8); assert.equal(new Set(sources).size, 8);
  assert.deepEqual([...new Set(links.map(match => match[2]).filter(url => !url.startsWith('/')))].sort(), [...sources].sort());
  const credits = content.split('\n## Sources and Image Credits\n')[1]; assert(credits);
  assert.deepEqual([...credits.matchAll(/\]\((https:\/\/[^\s)]+)\)/g)].map(match => match[1]), sources);
  for (const draft of ledger.inventory.protectedDrafts) {
    assert(!content.includes(draft.slug)); assert.match(draft.contentMd5, /^[a-f0-9]{32}$/); assert.match(draft.editorialHash, /^[a-f0-9]{32}$/);
  }
  assert.equal(bodyImages.length, 2); assert.equal((content.match(/!\[/g) ?? []).length, 2);
  assert.deepEqual(ledger.images.map(image => image.file), ['cover.png', 'decode-vs-save.png', 'recovery-map.png']);
  for (const [index, url] of imageUrls.entries()) {
    assert.equal(url, `${siteUrl}/blog/csv-utf8/${ledger.images[index].file}`);
    assert.equal(ledger.images[index].width, 1200); assert.equal(ledger.images[index].height, 675);
    const path = resolve(root, 'public', new URL(url).pathname.slice(1)); assert(existsSync(path), `Parent image asset not ready: ${ledger.images[index].file}`);
    const bytes = readFileSync(path); assert(bytes.length >= 33 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])));
    assert.equal(bytes.toString('ascii', 12, 16), 'IHDR'); assert.equal(bytes.readUInt32BE(16), 1200); assert.equal(bytes.readUInt32BE(20), 675);
  }
  return { slug: article.slug, wordCountExcludingCodeImagesAndCredits: wordCount, readingTime: article.reading_time,
    metaTitleCharacters: [...article.meta_title].length, metaDescriptionCharacters: [...article.meta_description].length,
    contextualInternalLinks: 3, originalImages: 3, faqs: 5, tables: 2, codeBlocks: 1, contentSha256, ledgerSha256 };
}
export function assertValidated(validation = ledger.validation) {
  assert.equal(validation?.status, 'passed', 'Finish and record parent validation before saving');
  assert.equal(validation?.contentSha256, contentSha256, 'Content hash changed or missing; revalidate before saving');
}
export const snapshotQuery = sql => sql`SELECT count(*)::integer AS total_posts,
  (count(*) FILTER (WHERE published))::integer AS published_posts,
  md5(coalesce(string_agg((to_jsonb(p) - 'views')::text, '' ORDER BY p.id), '')) AS editorial_hash
  FROM posts p WHERE slug <> ${article.slug}`;
export function readQueries(sql) {
  return [snapshotQuery(sql), sql`SELECT * FROM posts WHERE slug = ${article.slug}`,
    sql`SELECT id, name FROM categories WHERE name = ${ledger.targeting.category}`,
    sql`SELECT id, slug, published FROM posts WHERE slug = ANY(${blogLinks.map(link => link.slice(6))}::text[])`,
    sql`SELECT id, slug, published, featured, scheduled_at, md5(content) AS content_md5,
      md5((to_jsonb(p) - 'views')::text) AS editorial_hash FROM posts p WHERE id = ANY(${ledger.inventory.protectedDrafts.map(row => row.id)}::integer[])`];
}
export function assertSaved(row) {
  assert(row && Number.isSafeInteger(row.id) && row.id > 0);
  for (const [field, value] of Object.entries(article)) assert.ok(row[field] === value, `Saved article differs: ${field}`);
  assert.equal(row.category_id, ledger.targeting.categoryId);
  assert(Number.isSafeInteger(row.views) && row.views >= 0, 'Invalid generated views field');
  for (const field of ['created_at', 'updated_at']) assert(row[field] && Number.isFinite(new Date(row[field]).getTime()), `Invalid generated ${field}`);
}
export function assertState([snapshots, existing, categories, targets, protectedRows]) {
  assert.equal(snapshots.length, 1); assert.deepEqual(snapshots[0], baseline, 'Existing editorial inventory changed; refuse any insert');
  assert.deepEqual(categories, [{ id: ledger.targeting.categoryId, name: ledger.targeting.category }]);
  assert.equal(targets.length, blogLinks.length);
  for (const slug of blogLinks.map(link => link.slice(6))) assert(targets.some(row => row.slug === slug && row.published === true), 'Internal article must be published');
  assert.equal(protectedRows.length, 3);
  for (const expected of ledger.inventory.protectedDrafts) {
    const row = protectedRows.find(item => item.id === expected.id);
    assert(row && row.slug === expected.slug && row.published === false && row.featured === false && row.scheduled_at === null
      && row.content_md5 === expected.contentMd5 && row.editorial_hash === expected.editorialHash, `Protected draft ${expected.id} changed`);
  }
  assert(existing.length <= 1); if (existing.length) assertSaved(existing[0]); return existing[0] ?? null;
}
export function insertQuery(sql) {
  return sql`WITH inventory AS (${snapshotQuery(sql)})
    INSERT INTO posts (title, slug, excerpt, content, cover_image, category_id, author, published, featured,
      scheduled_at, meta_title, meta_description, keywords, summary, reading_time, views, created_at, updated_at)
    SELECT ${article.title}, ${article.slug}, ${article.excerpt}, ${article.content}, ${article.cover_image}, c.id,
      ${article.author}, false, false, NULL, ${article.meta_title}, ${article.meta_description}, ${article.keywords},
      ${article.summary}, ${article.reading_time}, 0, NOW(), NOW()
    FROM inventory CROSS JOIN categories c
    WHERE c.id = ${ledger.targeting.categoryId} AND c.name = ${ledger.targeting.category}
      AND (SELECT count(*) FROM categories WHERE name = ${ledger.targeting.category}) = 1
      AND inventory.total_posts = ${baseline.total_posts} AND inventory.published_posts = ${baseline.published_posts}
      AND inventory.editorial_hash = ${baseline.editorial_hash}
      AND (SELECT count(*) FROM posts WHERE slug = ANY(${blogLinks.map(link => link.slice(6))}::text[]) AND published) = ${blogLinks.length}
      AND NOT EXISTS (SELECT 1 FROM posts WHERE slug = ${article.slug}) RETURNING *`;
}
const nodes = (dom, predicate) => DomUtils.findAll(predicate, dom.children);
const noindex = (response, dom) => /\b(?:noindex|none)\b/i.test(response.headers.get('x-robots-tag') ?? '')
  || nodes(dom, node => node.name === 'meta' && /^(robots|googlebot)$/i.test(node.attribs?.name ?? '') && /\b(?:noindex|none)\b/i.test(node.attribs?.content ?? '')).length > 0;
export async function verifyLinks() {
  for (const path of internalLinks) {
    const response = await fetch(siteUrl + path, { redirect: 'manual', signal: AbortSignal.timeout(20000) });
    assert.equal(response.status, 200, `Internal HTTP status: ${path}`); const dom = parseDocument(await response.text());
    const canonical = nodes(dom, node => node.name === 'link' && /(?:^|\s)canonical(?:\s|$)/i.test(node.attribs?.rel ?? ''));
    assert.equal(canonical.length, 1); assert.equal(canonical[0].attribs.href, siteUrl + path); assert(!noindex(response, dom));
    assert(!/Post Not Found/.test(DomUtils.textContent(dom)), `Internal target is missing: ${path}`);
  }
}
async function verifyHidden() {
  for (const path of [`/blog/${article.slug}`, `/stories/${article.slug}`]) {
    const response = await fetch(siteUrl + path, { redirect: 'manual', signal: AbortSignal.timeout(20000) });
    const dom = parseDocument(await response.text()); assert([200, 404].includes(response.status)); assert(noindex(response, dom), 'Draft must be noindex');
    if (path.startsWith('/blog/')) assert(/Post Not Found/.test(DomUtils.textContent(dom))); else assert.equal(response.status, 404);
  }
  for (const path of ['/blog', '/sitemap.xml', '/feed.xml']) {
    const response = await fetch(siteUrl + path, { redirect: 'manual', signal: AbortSignal.timeout(20000) });
    assert.equal(response.status, 200); assert(!(await response.text()).includes(article.slug), 'Hidden draft must not be advertised');
  }
}
export async function run(mode = '--offline') {
  assert(['--offline', '--links', '--read-only', '--save-draft'].includes(mode), 'Use --offline, --links, --read-only or --save-draft');
  console.log(JSON.stringify({ mode, ...validateArticle() }, null, 2)); if (mode === '--offline') return;
  if (mode === '--links') {
    await verifyLinks();
    for (const source of ledger.primarySources) {
      const response = await fetch(source.url, { signal: AbortSignal.timeout(20000) });
      assert.equal(response.status, 200, `Source HTTP status: ${source.url}`); await response.body?.cancel();
    }
    console.log('PASS: three internal self-canonicals and eight source URLs.'); return;
  }
  if (mode === '--save-draft') assertValidated();
  const { default: nextEnv } = await import('@next/env'); const { neon } = await import('@neondatabase/serverless');
  nextEnv.loadEnvConfig(root); assert(process.env.DATABASE_URL, 'Database configuration missing'); const sql = neon(process.env.DATABASE_URL);
  const read = () => sql.transaction(readQueries, { isolationLevel: 'RepeatableRead', readOnly: true, fetchOptions: { signal: AbortSignal.timeout(30000) } });
  const existing = assertState(await read()); await verifyLinks();
  if (mode === '--read-only') {
    await verifyHidden(); console.log(JSON.stringify({ id: existing?.id ?? null, saved: Boolean(existing), hidden: true, otherPostsUnchanged: true })); return;
  }
  assert(!existing, 'Draft already exists; never overwrite or blindly retry');
  console.log('Attempting ONE hidden INSERT; inspect with --read-only after any interruption.');
  const [inserted, snapshots] = await sql.transaction(tx => [insertQuery(tx), snapshotQuery(tx)], {
    isolationLevel: 'Serializable', readOnly: false, fetchOptions: { signal: AbortSignal.timeout(30000) },
  });
  assert.equal(inserted.length, 1, 'Insert guard refused; inspect before retrying');
  console.log('INSERT COMMITTED - DO NOT RERUN:', JSON.stringify({ id: inserted[0].id, slug: inserted[0].slug }));
  assertSaved(inserted[0]); assert.deepEqual(snapshots, [baseline]); const saved = assertState(await read()); assert.equal(saved?.id, inserted[0].id);
  console.log(JSON.stringify({ id: saved.id, published: false, featured: false, scheduledAt: null, otherPostsUnchanged: true, contentSha256 }));
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  assert(process.argv.length <= 3);
  await run(process.argv[2]).catch(error => {
    console.error(error instanceof assert.AssertionError && !error.generatedMessage ? error.message : 'Article operation failed; outcome may be uncertain. Connection details withheld. Inspect --read-only before retrying.');
    process.exitCode = 1;
  });
}