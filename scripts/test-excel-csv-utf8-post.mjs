import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { createRequire, registerHooks } from 'node:module';
import { Socket } from 'node:net';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { TextDecoder } from 'node:util';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { parseDocument, DomUtils } from 'htmlparser2';
import ts from 'typescript';
import { previewCss as basePreviewCss } from './test-copilot-excel-post.mjs';

const require = createRequire(import.meta.url), siteConfig = { url: 'https://www.byteverse.fyi', name: 'ByteVerse' };
const checks = [], check = (name, operation) => { operation(); checks.push(name); console.log(`PASS: ${name}`); };
const all = (dom, predicate) => DomUtils.findAll(predicate, dom.children);
const one = (dom, predicate) => { const nodes = all(dom, predicate); assert.equal(nodes.length, 1); return nodes[0]; };
const collapse = value => value.replace(/\s+/g, ' ').trim();
const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const previewCss = `${basePreviewCss}
body{background:#f8fafc;color:#0f172a}.excel-preview{border-color:#e2e8f0}.excel-preview a,.excel-preview .preview-eyebrow{color:#2563eb}
.excel-preview th,.excel-preview code{background:#eff6ff}.excel-preview code{color:#1e40af}.excel-preview pre code{color:inherit;background:none}
.excel-preview .preview-banner{background:#eff6ff;color:#1e40af;border-color:#bfdbfe}`;
function transpile(source, fileName) {
  const result = ts.transpileModule(source, { fileName, reportDiagnostics: true, compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } });
  assert(!result.diagnostics?.some(item => item.category === ts.DiagnosticCategory.Error), `Cannot transpile ${fileName}`); return result.outputText;
}
function load(root, file, dependencies = {}) {
  const allowed = new Set(['react', 'react/jsx-runtime', 'lucide-react', 'react-markdown', 'remark-gfm', 'rehype-raw', 'rehype-sanitize', 'rehype-slug', 'jsonc-parser', 'papaparse']);
  const record = { exports: {} };
  new Function('require', 'module', 'exports', transpile(readFileSync(resolve(root, file), 'utf8'), file))(specifier => {
    if (Object.hasOwn(dependencies, specifier)) return dependencies[specifier];
    assert(allowed.has(specifier), `Unexpected test dependency: ${specifier}`); return require(specifier);
  }, record, record.exports); return record.exports;
}
assert(process.argv.length <= 3 && (!process.argv[2] || process.argv[2] === '--browser'), 'Use no flag or --browser');
const oldFetch = globalThis.fetch, oldConnect = Socket.prototype.connect;
const blocked = () => { throw new Error('Network blocked in offline article checks'); };
globalThis.fetch = blocked; Socket.prototype.connect = blocked;
const hook = registerHooks({ resolve(specifier, context, next) {
  assert(!/^(?:(?:@next\/env|@neondatabase\/serverless|dotenv|pg)(?:\/|$)|@\/lib\/db(?:\/|$))/.test(specifier), 'Environment/database import forbidden');
  return next(specifier, context);
} });
let task, report, preview;
try {
  task = await import('./_add-excel-csv-utf8-post.mjs');
  check('hidden metadata, required sections, exact links/sources and three real PNGs', () => { report = task.validateArticle(); });
  check('LF-normalized content/ledger hashes and reported reading time', () => {
    const text = path => readFileSync(path, 'utf8').replace(/\r\n?/g, '\n').trim(), hash = value => createHash('sha256').update(value, 'utf8').digest('hex');
    assert.equal(task.content, text(task.articlePath)); assert.deepEqual(task.ledger, JSON.parse(text(task.ledgerPath)));
    assert.equal(task.contentSha256, hash(text(task.articlePath))); assert.equal(task.ledgerSha256, hash(text(task.ledgerPath)));
    assert.equal(task.article.reading_time, `${Math.ceil(task.wordCount / 220)} min read`); assert.throws(() => globalThis.fetch('https://example.invalid'), /Network blocked/);
  });
  for (const dependency of ['@next/env', '@neondatabase/serverless']) await assert.rejects(import(dependency), /Environment\/database import forbidden/);
  const types = load(task.root, 'src/lib/json-csv/types.ts');
  const engine = load(task.root, 'src/lib/json-csv/engine.ts', { './types': types }), input = load(task.root, 'src/lib/json-csv/input.ts', { './types': types });
  const papa = require('papaparse'), headers = ['name', 'city', 'note'];
  const rows = [['Zoë', 'München', 'Café €'], ['李雷', '東京', '東京支店'], ['علی', 'لاہور', 'اردو متن']];
  const json = JSON.stringify(rows.map(row => Object.fromEntries(headers.map((header, index) => [header, row[index]]))));
  const result = engine.convertJson(json, 'json', types.DEFAULT_CSV_OPTIONS), utf8 = new TextDecoder('utf-8', { fatal: true });
  check('real JSON-to-CSV engine reproduces the exact three multilingual records', () => {
    assert.equal(result.csv.replace(/\r\n/g, '\n'), task.codeBlocks[0][2].trimEnd()); assert.deepEqual(result.headers, headers); assert.deepEqual(result.rows, rows);
    assert.equal(result.stats.inputRows, 3); assert.equal(result.stats.outputRows, 3); assert.equal(result.stats.exportedColumns, 3); assert.equal(result.stats.protectedFields, 0);
    assert.deepEqual(papa.parse(result.csv, { dynamicTyping: false }).data, [headers, ...rows]); assert.deepEqual(papa.parse(result.csv).errors, []);
  });
  check('actual download helper defaults to BOM; both byte variants parse identically', () => {
    assert.equal(types.DEFAULT_CSV_OPTIONS.bom, true);
    for (const bom of [false, true]) {
      const variant = engine.convertJson(json, 'json', { ...types.DEFAULT_CSV_OPTIONS, bom }), download = input.csvDownloadDetails(variant, 'fictional-unicode');
      const bytes = Buffer.from(download.contents, 'utf8'); assert.equal(download.fileName, 'fictional-unicode.csv'); assert.equal(download.mime, 'text/csv;charset=utf-8');
      assert.equal(variant.csv, result.csv); assert.equal(download.contents, `${bom ? '\ufeff' : ''}${result.csv}`); assert.equal(bytes.length, variant.stats.downloadBytes);
      if (bom) assert.equal(bytes.subarray(0, 3).toString('hex'), 'efbbbf'); else assert(bytes.equals(Buffer.from(result.csv, 'utf8')));
      assert.equal(utf8.decode(bytes), result.csv); const parsed = papa.parse(utf8.decode(bytes), { dynamicTyping: false }); assert.deepEqual(parsed.errors, []); assert.deepEqual(parsed.data, [headers, ...rows]);
    }
    assert(task.content.includes('ads and analytics') && task.content.includes('fictional or approved data'), 'Local conversion is not a site-wide secrecy guarantee');
  });
  check('real decoders distinguish original bytes, saved mojibake and replacement loss', () => {
    const legacy = new TextDecoder('windows-1252'), original = Buffer.from('c3a9', 'hex'), bom = Buffer.from('efbbbf', 'hex');
    assert.equal(utf8.decode(original), 'é'); assert.equal(legacy.decode(original), 'Ã©');
    const saved = Buffer.from(legacy.decode(original), 'utf8'); assert.equal(saved.toString('hex'), 'c383c2a9'); assert.equal(utf8.decode(saved), 'Ã©');
    assert.equal(utf8.decode(Buffer.concat([bom, saved])), 'Ã©'); assert.notEqual(utf8.decode(saved), 'é');
    const single = Buffer.from('e9', 'hex'); assert.equal(legacy.decode(single), 'é'); assert.throws(() => utf8.decode(single), TypeError);
    assert.equal(new TextDecoder('utf-8').decode(single), '\ufffd'); assert.equal(single.toString('hex'), 'e9', 'A display replacement does not mutate the source');
    for (const [text, hex] of [['?', '3f'], ['\ufffd', 'efbfbd']]) {
      const bytes = Buffer.from(text, 'utf8'); assert.equal(bytes.toString('hex'), hex); assert.equal(utf8.decode(bytes), text);
      assert.equal(utf8.decode(Buffer.concat([bom, bytes])), text); assert.notEqual(text, 'é');
    }
  });
  const images = load(task.root, 'src/lib/image-seo.ts', { '@/lib/config': { siteConfig } }), copy = load(task.root, 'src/components/copy-button.tsx');
  const { MarkdownRenderer } = load(task.root, 'src/components/markdown-renderer.tsx', { '@/lib/config': { siteConfig }, '@/lib/image-seo': images,
    '@/components/copy-button': copy, '@/components/code-playground': { CodePlayground() { throw new Error('Article examples must not execute'); } } });
  const rendered = renderToStaticMarkup(createElement(MarkdownRenderer, { content: task.content, currentSlug: task.article.slug })), dom = parseDocument(rendered);
  check('actual renderer preserves Unicode, links, tables and the literal CSV without executable content', () => {
    const headings = all(dom, node => /^h[1-6]$/.test(node.name ?? '')), ids = headings.map(node => node.attribs.id);
    assert(!headings.some(node => node.name === 'h1')); assert(ids.every(Boolean)); assert.equal(new Set(ids).size, ids.length); assert(DomUtils.textContent(dom).includes('\ufffd'));
    assert(!all(dom, node => ['script', 'iframe', 'object', 'embed', 'form'].includes(node.name) || Object.keys(node.attribs ?? {}).some(key => /^on/i.test(key)) || /^(javascript|vbscript|data):/i.test(node.attribs?.href ?? '')).length);
    const links = all(dom, node => node.name === 'a'); assert.deepEqual(links.filter(node => node.attribs.href.startsWith('/')).map(node => node.attribs.href), task.internalLinks);
    const external = links.filter(node => node.attribs.href.startsWith('https://')); assert.deepEqual([...new Set(external.map(node => node.attribs.href))].sort(), task.ledger.primarySources.map(source => source.url).sort());
    for (const link of external) { assert.equal(link.attribs.target, '_blank'); assert(link.attribs.rel.includes('noopener') && link.attribs.rel.includes('noreferrer')); }
    const tables = all(dom, node => node.name === 'table'); assert.equal(tables.length, 2); assert.deepEqual(tables.map(table => all(table, node => node.name === 'tr').length), [7, 6]);
    for (const table of tables) { assert.equal(table.parent.attribs.class, 'table-wrap comparison-table'); assert.equal(all(table, node => node.name === 'th').length, 3); }
    const pre = one(dom, node => node.name === 'pre'); assert.equal(DomUtils.textContent(pre), task.codeBlocks[0][2]); assert.equal(one(pre, node => node.name === 'code').attribs.class, 'language-csv');
    one(dom, node => node.name === 'button' && node.attribs['aria-label'] === 'Copy code');
  });
  const routeSource = readFileSync(resolve(task.root, 'src/app/blog/[slug]/page.tsx'), 'utf8'), tree = ts.createSourceFile('page.tsx', routeSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  check('all five real FAQ questions and answers match visible text and FAQPage exactly', () => {
    const faqs = all(dom, node => node.name === 'details'); assert.equal(faqs.length, 5);
    const start = routeSource.indexOf('  const faqRegex ='), end = routeSource.indexOf('  // Auto-extract HowTo', start); assert(start > 0 && end > start);
    const pairs = new Function('post', `${transpile(routeSource.slice(start, end), 'faq.ts')}; return faqs;`)({ content: task.content }); assert.equal(pairs.length, 5);
    assert.deepEqual(pairs.map(pair => pair.question), faqs.map(faq => DomUtils.textContent(one(faq, node => node.name === 'summary'))));
    assert.deepEqual(pairs.map(pair => collapse(pair.answer)), faqs.map(faq => collapse(DomUtils.textContent(one(faq, node => node.name === 'p')))), 'Route FAQ extraction changed visible answer text; do not mask punctuation differences');
    const page = tree.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'BlogPostPage');
    const branch = page?.body?.statements.find(node => ts.isIfStatement(node) && node.expression.getText(tree) === 'faqs.length > 0'); assert(branch);
    const graph = []; new Function('faqs', 'graphItems', transpile(branch.getText(tree), 'schema.ts'))(pairs, graph); assert.equal(graph.length, 1); assert.equal(graph[0]['@type'], 'FAQPage');
    assert.deepEqual(graph[0].mainEntity.map(entry => [entry.name, entry.acceptedAnswer.text]), pairs.map(pair => [pair.question, pair.answer]));
  });
  check('actual image SEO helper and rendered captions, credits and dimensions', () => {
    const seo = images.getPostSeoImages({ title: task.article.title, content: task.content, coverImage: task.article.cover_image }); assert.deepEqual(seo.map(image => image.url), task.imageUrls); assert(seo.every(image => image.width === 1200 && image.height === 675));
    const figures = all(dom, node => node.name === 'figure'); assert.equal(figures.length, 2);
    for (const [index, figure] of figures.entries()) {
      const img = one(figure, node => node.name === 'img'), raw = task.bodyImages[index]; assert.equal(img.attribs.src, raw[2]); assert.equal(img.attribs.alt, raw[1]); assert.equal(img.attribs.title, raw[3]);
      assert.equal(DomUtils.textContent(one(figure, node => node.name === 'figcaption')), raw[3]); assert.equal(img.attribs.width, '1200'); assert.equal(img.attribs.height, '675');
      assert.equal(images.getImageCreator(raw[2]).name, 'ByteVerse'); assert.equal(one(figure, node => node.attribs?.itemprop === 'creditText').attribs.content, 'ByteVerse original illustration');
    }
  });
  check('insert-only SQL, exact baseline, all three protected drafts, full rows and validation gate', () => {
    const tag = (parts, ...parameters) => ({ text: parts.join('?'), parameters }), insert = task.insertQuery(tag), reads = task.readQueries(tag);
    assert.equal(reads.length, 5); assert(reads.every(query => !/\b(?:INSERT|UPDATE|DELETE|ALTER|DROP|TRUNCATE)\b/i.test(query.text))); assert.match(reads[1].text, /SELECT \*/);
    assert.equal((insert.text.match(/INSERT INTO posts/g) ?? []).length, 1); assert(!/\b(?:UPDATE|DELETE|DROP|TRUNCATE|ALTER|CONFLICT|MERGE)\b/i.test(insert.text));
    for (const pattern of [/false, false, NULL/, /inventory\.total_posts = \?/, /inventory\.published_posts = \?/, /inventory\.editorial_hash = \?/, /c\.id = \? AND c\.name = \?/, /count\(\*\) FROM categories WHERE name = \?\) = 1/, /AND published\) = \?/, /NOT EXISTS \(SELECT 1 FROM posts WHERE slug = \?\)/]) assert.match(insert.text, pattern);
    assert.equal((insert.text.match(/NOW\(\)/g) ?? []).length, 2); assert.match(insert.parameters[0].text, /to_jsonb\(p\) - 'views'/); assert.match(insert.parameters[0].text, /WHERE slug <> \?/);
    for (const value of [task.content, task.article.slug, 170, 167, task.baseline.editorial_hash, 2, 'Tech Guides']) assert(insert.parameters.includes(value));
    assert.deepEqual(reads[4].parameters[0], [229, 230, 238]); assert.match(reads[4].text, /AS editorial_hash/);
    const category = [{ id: 2, name: 'Tech Guides' }], targets = task.blogLinks.map((url, index) => ({ id: index + 1, slug: url.slice(6), published: true }));
    const protectedRows = task.ledger.inventory.protectedDrafts.map(row => ({ id: row.id, slug: row.slug, published: false, featured: false, scheduled_at: null, content_md5: row.contentMd5, editorial_hash: row.editorialHash }));
    const state = [[{ ...task.baseline }], [], category, targets, protectedRows]; assert.equal(task.assertState(state), null);
    for (const field of Object.keys(task.baseline)) assert.throws(() => task.assertState([[{ ...task.baseline, [field]: 'changed' }], ...state.slice(1)]));
    for (const invalid of [[], [{ id: 3, name: 'Tech Guides' }], [{ id: 2, name: 'Other' }], [...category, ...category]]) assert.throws(() => task.assertState([state[0], [], invalid, targets, protectedRows]));
    for (const invalid of [targets.slice(1), targets.map(row => ({ ...row, published: false }))]) assert.throws(() => task.assertState([state[0], [], category, invalid, protectedRows]));
    for (let index = 0; index < 3; index++) for (const field of Object.keys(protectedRows[index])) {
      const changed = structuredClone(protectedRows); changed[index][field] = ['published', 'featured'].includes(field) ? true : 'changed'; assert.throws(() => task.assertState([...state.slice(0, 4), changed]));
    }
    assert.throws(() => task.assertState([...state.slice(0, 4), protectedRows.slice(1)]));
    const saved = { ...task.article, id: 99001, category_id: 2, views: 0, created_at: '2026-10-12T00:00:00Z', updated_at: '2026-10-12T00:00:00Z' };
    task.assertSaved(saved); task.assertSaved({ ...saved, views: 50 }); assert.equal(task.assertState([state[0], [saved], ...state.slice(2)]), saved);
    for (const [field, value] of Object.entries(saved)) assert.throws(() => task.assertSaved({ ...saved, [field]: value === false ? true : value === null ? 'scheduled' : `${value}!` }));
    assert.throws(() => task.assertState([state[0], [saved, saved], ...state.slice(2)]));
    task.assertValidated({ status: 'passed', contentSha256: task.contentSha256 });
    for (const invalid of [{ status: 'pending', contentSha256: task.contentSha256 }, { status: 'passed' }, { status: 'passed', contentSha256: 'wrong' }]) assert.throws(() => task.assertValidated(invalid));
    const run = task.run.toString(); assert.match(run, /mode = '--offline'/); assert.match(run, /isolationLevel: 'Serializable', readOnly: false/); assert(run.indexOf('assertValidated();') < run.indexOf("import('@next/env')"));
  });
  const metadataNode = tree.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'generateMetadata'); assert(metadataNode);
  let post = { title: task.article.title, slug: task.article.slug, content: task.content, excerpt: task.article.excerpt, published: true, author: task.article.author,
    coverImage: task.article.cover_image, metaTitle: task.article.meta_title, metaDescription: task.article.meta_description, keywords: task.article.keywords, createdAt: new Date('2026-10-12'), updatedAt: new Date('2026-10-12') };
  const fakeDb = { select: () => ({ from: () => ({ where: () => ({ limit: async () => post ? [post] : [] }) }) }) };
  const metadata = new Function('db', 'posts', 'eq', 'siteConfig', 'getPostSeoImages', `${transpile(metadataNode.getText(tree).replace(/^export\s+/, ''), 'metadata.ts')}; return generateMetadata;`)(fakeDb, { slug: 'slug' }, () => true, siteConfig, images.getPostSeoImages);
  const publicMetadata = await metadata({ params: Promise.resolve({ slug: task.article.slug }) });
  check('actual public route metadata uses intended title, canonical and all three share images', () => {
    assert.equal(publicMetadata.title, task.article.meta_title); assert.equal(publicMetadata.description, task.article.meta_description); assert.equal(publicMetadata.keywords, task.article.keywords);
    assert.equal(publicMetadata.alternates.canonical, `${siteConfig.url}/blog/${task.article.slug}`); assert.equal(publicMetadata.openGraph.type, 'article');
    assert.deepEqual(publicMetadata.openGraph.images.map(image => image.url), task.imageUrls); assert.deepEqual(publicMetadata.twitter.images, [task.article.cover_image]);
  });
  post.published = false; const hidden = await metadata({ params: Promise.resolve({ slug: task.article.slug }) }); post = null; const absent = await metadata({ params: Promise.resolve({ slug: task.article.slug }) });
  check('hidden and absent route metadata stay noindex', () => { assert.deepEqual(hidden, { title: 'Post Not Found', robots: { index: false, follow: true } }); assert.deepEqual(absent, hidden); });
  let body = rendered.replace(/<link\b(?=[^>]*\brel="preload")(?=[^>]*\bas="image")[^>]*\/?\s*>/gi, '');
  const embedded = task.imageUrls.map(url => `data:image/png;base64,${readFileSync(resolve(task.root, 'public', new URL(url).pathname.slice(1))).toString('base64')}`);
  for (const [index, url] of task.imageUrls.entries()) body = body.replaceAll(`src="${escape(url)}"`, `src="${embedded[index]}"`);
  body = body.replaceAll('<button ', '<button disabled title="Unhydrated preview control" ');
  preview = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; connect-src 'none'; base-uri 'none'; form-action 'none'"><title>${escape(task.article.title)} — unpublished preview</title><style>${previewCss}</style></head><body><main class="excel-preview"><p class="preview-banner">Unpublished static review with the actual MarkdownRenderer, not the full Next page. Copy controls are not hydrated; no Excel session is claimed.</p><p class="preview-eyebrow">BYTEVERSE / TECH GUIDES</p><h1>${escape(task.article.title)}</h1><p>Ali Rehman · ${escape(task.article.reading_time)} · October 12, 2026</p><img class="preview-cover" src="${embedded[0]}" width="1200" height="675" alt="${escape(task.ledger.images[0].alt)}">${body}</main></body></html>`;
  check('default preview is in-memory only, embeds three PNGs, and has one title H1', () => {
    const parsed = parseDocument(preview); assert.equal(DomUtils.textContent(one(parsed, node => node.name === 'h1')), task.article.title);
    const imgs = all(parsed, node => node.name === 'img'); assert.equal(imgs.length, 3); assert(imgs.every(node => node.attribs.src.startsWith('data:image/png;base64,')));
    assert(!all(parsed, node => node.name === 'script' || (node.name === 'link' && /preload|stylesheet|prefetch|preconnect/i.test(node.attribs.rel ?? ''))).length);
  });
} finally { globalThis.fetch = oldFetch; Socket.prototype.connect = oldConnect; hook.deregister(); }
if (process.argv[2] === '--browser') {
  const { chromium, expect } = await import('@playwright/test'), directory = await mkdtemp(resolve(tmpdir(), 'byteverse-csv-utf8-'));
  await writeFile(resolve(directory, 'preview.html'), preview, { flag: 'wx' }); const browser = await chromium.launch({ channel: 'msedge', headless: true }), measurements = [];
  try {
    for (const width of [320, 390, 1280]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce', serviceWorkers: 'block', offline: true }), requests = [], errors = [];
      await context.route('**/*', async route => { requests.push(route.request().url()); await route.abort(); }); const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
      await page.setContent(preview, { waitUntil: 'load' }); await expect(page.locator('h1')).toHaveCount(1);
      for (const image of await page.locator('img').all()) { await image.scrollIntoViewIfNeeded(); await expect.poll(() => image.evaluate(img => img.complete && img.naturalWidth === 1200 && img.naturalHeight === 675)).toBe(true); }
      for (const detail of await page.locator('details').all()) { await detail.locator('summary').click(); await expect(detail).toHaveAttribute('open', ''); await detail.locator('summary').click(); await expect(detail).not.toHaveAttribute('open', ''); await detail.locator('summary').click(); }
      const dimensions = await page.evaluate(() => ({ viewport: innerWidth, page: document.documentElement.scrollWidth, images: document.images.length, faqs: document.querySelectorAll('details[open]').length, tables: document.querySelectorAll('table').length, examples: document.querySelectorAll('pre').length }));
      assert(dimensions.page <= width + 1); assert.equal(dimensions.images, 3); assert.equal(dimensions.faqs, 5); assert.equal(dimensions.tables, 2); assert.equal(dimensions.examples, 1);
      for (const scrollbox of await page.locator('.table-wrap, pre').all()) assert((await scrollbox.boundingBox()).width <= width);
      assert.deepEqual(requests, []); assert.deepEqual(errors, []); await page.locator('h1').scrollIntoViewIfNeeded(); await page.screenshot({ path: resolve(directory, `${width}-article.png`) });
      await page.getByRole('heading', { name: 'Why the same bytes can display two different ways' }).scrollIntoViewIfNeeded(); await page.screenshot({ path: resolve(directory, `${width}-bytes.png`) }); measurements.push(dimensions); await context.close();
    }
  } finally { await browser.close(); }
  console.log(JSON.stringify({ browserPreview: 'Static actual-renderer preview, not the full Next page', directory, measurements }, null, 2));
}
console.log(JSON.stringify({ ...report, status: 'passed', offlineGroups: checks.length, realConverterAndByteChecks: true, excelExecution: false, databaseOrEnvironmentLoaded: false, liveHttpVerified: false }, null, 2));