import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { createRequire, registerHooks } from 'node:module';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { parseDocument, DomUtils } from 'htmlparser2';
import ts from 'typescript';
import { previewCss } from './test-copilot-excel-post.mjs';

const require = createRequire(import.meta.url);
const siteConfig = { url: 'https://www.byteverse.fyi', name: 'ByteVerse' };
const checks = [];
const check = (name, operation) => { operation(); checks.push(name); console.log(`PASS: ${name}`); };
const all = (dom, predicate) => DomUtils.findAll(predicate, dom.children);
const one = (dom, predicate) => { const nodes = all(dom, predicate); assert.equal(nodes.length, 1); return nodes[0]; };
const collapse = value => value.replace(/\s+/g, ' ').trim();
const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const transpile = (source, fileName) => ts.transpileModule(source, { fileName, compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
} }).outputText;
function load(root, file, mocks = {}) {
  const allowed = new Set(['react', 'react/jsx-runtime', 'lucide-react', 'react-markdown', 'remark-gfm', 'rehype-raw', 'rehype-sanitize', 'rehype-slug', 'jsonc-parser', 'papaparse']);
  const record = { exports: {} };
  new Function('require', 'module', 'exports', transpile(readFileSync(resolve(root, file), 'utf8'), file))(specifier => {
    if (Object.hasOwn(mocks, specifier)) return mocks[specifier];
    assert(allowed.has(specifier), `Unexpected test dependency: ${specifier}`);
    return require(specifier);
  }, record, record.exports);
  return record.exports;
}

const oldFetch = globalThis.fetch;
globalThis.fetch = () => { throw new Error('Network is blocked in article checks'); };
const hook = registerHooks({ resolve(specifier, context, next) {
  assert(!/^(?:@next\/env|@neondatabase\/serverless|dotenv|pg)(?:\/|$)/.test(specifier));
  return next(specifier, context);
} });
let task, report, preview;
try {
  task = await import('./_add-csv-excel-post.mjs');
  check('metadata, hidden defaults, primary sources, links and image file dimensions', () => { report = task.validateArticle(); });
  const types = load(task.root, 'src/lib/json-csv/types.ts');
  const engine = load(task.root, 'src/lib/json-csv/engine.ts', { './types': types });
  const input = load(task.root, 'src/lib/json-csv/input.ts', { './types': types });
  const papa = require('papaparse');
  const csv = task.codeBlocks[0][2].trimEnd();
  const json = task.codeBlocks[1][2].trim();
  const result = engine.convertJson(json, 'json', types.DEFAULT_CSV_OPTIONS);
  const expected = [
    ['000123', '123456789012345678', '00123', '19.95'],
    ['000007', '987654321098765432', '00501', '7.50'],
  ];
  check('article JSON produces the exact displayed CSV through the real converter', () => {
    assert.equal(result.csv.replace(/\r\n/g, '\n'), csv);
    assert.deepEqual(result.headers, ['customer_id', 'tracking_id', 'postal_code', 'amount']);
    assert.deepEqual(result.rows, expected);
    assert.equal(result.stats.inputRows, 2); assert.equal(result.stats.outputRows, 2);
    assert.equal(result.stats.exportedColumns, 4); assert.equal(result.stats.protectedFields, 0);
    assert.equal(engine.inspectJson(json, 'json').rowPaths[0].pointer, '');
    const parsed = papa.parse(result.csv, { dynamicTyping: false });
    assert.deepEqual(parsed.errors, []); assert.deepEqual(parsed.data, [result.headers, ...expected]);
  });
  check('download BOM and quote-all variants preserve the sample strings', () => {
    const download = input.csvDownloadDetails(result, 'fictional-identifiers');
    assert.equal(download.fileName, 'fictional-identifiers.csv');
    assert.equal(download.mime, 'text/csv;charset=utf-8');
    assert.equal(download.contents, `\ufeff${result.csv}`);
    assert.equal(Buffer.byteLength(download.contents), result.stats.downloadBytes);
    const quoted = engine.convertJson(json, 'json', { ...types.DEFAULT_CSV_OPTIONS, quoteAll: true, bom: false });
    assert(quoted.csv.includes('"000123"')); assert(quoted.csv.includes('"7.50"'));
    assert.deepEqual(papa.parse(quoted.csv, { dynamicTyping: false }).data, [result.headers, ...expected]);
    assert.throws(() => engine.convertJson('[{"id":000123}]', 'json', types.DEFAULT_CSV_OPTIONS));
  });

  const images = load(task.root, 'src/lib/image-seo.ts', { '@/lib/config': { siteConfig } });
  const copy = load(task.root, 'src/components/copy-button.tsx');
  const { MarkdownRenderer } = load(task.root, 'src/components/markdown-renderer.tsx', {
    '@/lib/config': { siteConfig }, '@/lib/image-seo': images, '@/components/copy-button': copy,
    '@/components/code-playground': { CodePlayground() { throw new Error('Unexpected executable playground'); } },
  });
  const rendered = renderToStaticMarkup(createElement(MarkdownRenderer, { content: task.content, currentSlug: task.article.slug }));
  const dom = parseDocument(rendered);
  check('real renderer has unique heading IDs, no extra H1 or executable content', () => {
    const headings = all(dom, node => /^h[1-6]$/.test(node.name ?? ''));
    assert(!headings.some(node => node.name === 'h1'));
    const ids = headings.map(node => node.attribs.id); assert(ids.every(Boolean)); assert.equal(ids.length, new Set(ids).size);
    assert.equal(all(dom, node => ['script', 'iframe', 'object', 'embed', 'form'].includes(node.name)).length, 0);
    assert.equal(all(dom, node => Object.keys(node.attribs ?? {}).some(key => /^on/i.test(key))).length, 0);
  });
  check('contextual internal links and safe external source links render as written', () => {
    const links = all(dom, node => node.name === 'a');
    assert.deepEqual(links.filter(node => node.attribs.href?.startsWith('/')).map(node => node.attribs.href), task.internalLinks);
    for (const link of links.filter(node => node.attribs.href?.startsWith('https://') && !node.attribs.href.startsWith(siteConfig.url))) {
      assert.equal(link.attribs.target, '_blank'); assert(link.attribs.rel.includes('noopener')); assert(link.attribs.rel.includes('noreferrer'));
    }
  });
  check('one diagnostic table and two literal copy-ready code examples', () => {
    const table = one(dom, node => node.name === 'table');
    assert.equal(table.parent.attribs.class, 'table-wrap comparison-table');
    assert.equal(all(dom, node => node.name === 'th').length, 3);
    assert.equal(all(dom, node => node.name === 'tr').length, 6);
    assert.deepEqual(all(dom, node => node.name === 'pre').map(node => DomUtils.textContent(node)), task.codeBlocks.map(block => block[2]));
    assert.equal(all(dom, node => node.name === 'button' && node.attribs['aria-label'] === 'Copy code').length, 2);
  });
  const routeSource = readFileSync(resolve(task.root, 'src/app/blog/[slug]/page.tsx'), 'utf8');
  const routeTree = ts.createSourceFile('page.tsx', routeSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const faqs = all(dom, node => node.name === 'details');
  check('all five visible FAQs match the real route extractor and JSON-LD exactly', () => {
    assert.equal(faqs.length, 5);
    const start = routeSource.indexOf('  const faqRegex ='), end = routeSource.indexOf('  // Auto-extract HowTo', start);
    assert(start > 0 && end > start);
    const pairs = new Function('post', `${transpile(routeSource.slice(start, end), 'faq.ts')}; return faqs;`)({ content: task.content });
    assert.equal(pairs.length, 5);
    assert.deepEqual(pairs.map(pair => pair.question), faqs.map(faq => DomUtils.textContent(one(faq, node => node.name === 'summary'))));
    assert.deepEqual(pairs.map(pair => collapse(pair.answer)), faqs.map(faq => collapse(DomUtils.textContent(one(faq, node => node.name === 'p')))));
    const page = routeTree.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'BlogPostPage');
    const branch = page.body.statements.find(node => ts.isIfStatement(node) && node.expression.getText(routeTree) === 'faqs.length > 0');
    const graph = []; new Function('faqs', 'graphItems', transpile(branch.getText(routeTree), 'schema.ts'))(pairs, graph);
    assert.equal(graph[0]['@type'], 'FAQPage'); assert.equal(graph[0].mainEntity.length, 5);
    assert.deepEqual(graph[0].mainEntity.map(entry => [entry.name, entry.acceptedAnswer.text]), pairs.map(pair => [pair.question, pair.answer]));
  });
  check('body image alt, captions, creator and dimensions use the actual SEO helper', () => {
    const seo = images.getPostSeoImages({ title: task.article.title, content: task.content, coverImage: task.article.cover_image });
    assert.deepEqual(seo.map(image => image.url), task.imageUrls);
    assert(seo.every(image => image.width === 1200 && image.height === 675));
    const figures = all(dom, node => node.name === 'figure'); assert.equal(figures.length, 2);
    for (const [index, figure] of figures.entries()) {
      const img = one(figure, node => node.name === 'img');
      assert.equal(img.attribs.alt, task.bodyImages[index][1]); assert.equal(img.attribs.src, task.bodyImages[index][2]);
      assert.equal(img.attribs.title, task.bodyImages[index][3]);
      assert.equal(images.getImageCreator(img.attribs.src).name, 'ByteVerse');
      assert.equal(images.getImageCreditText(img.attribs.src), 'ByteVerse original illustration');
    }
  });
  check('insert-only SQL guards hidden state, category, absent slug and all other editorial rows', () => {
    const tag = (parts, ...parameters) => ({ text: parts.join('?'), parameters });
    const insert = task.insertQuery(tag), reads = task.readQueries(tag);
    assert.equal(reads.length, 4); assert(reads.every(query => !/\bINSERT|\bUPDATE|\bDELETE/i.test(query.text)));
    assert.equal((insert.text.match(/INSERT INTO posts/g) ?? []).length, 1);
    assert(!/\b(?:UPDATE|DELETE|DROP|TRUNCATE|CONFLICT)\b/i.test(insert.text));
    assert.match(insert.text, /false, false, NULL/); assert.match(insert.text, /inventory\.editorial_hash = \?/);
    assert.match(insert.text, /inventory\.total_posts = \?/); assert.match(insert.text, /NOT EXISTS/);
    for (const value of [task.article.content, task.article.slug, task.baseline.editorial_hash]) assert(insert.parameters.includes(value));
    const category = [{ id: task.ledger.targeting.categoryId, name: task.ledger.targeting.category }];
    const targets = task.blogLinks.map((url, index) => ({ id: index + 1, slug: url.slice(6), published: true }));
    assert.equal(task.assertState([[{ ...task.baseline }], [], category, targets]), null);
    assert.throws(() => task.assertState([[{ ...task.baseline, total_posts: 0 }], [], category, targets]));
    assert.throws(() => task.assertState([[{ ...task.baseline }], [], [], targets]));
    assert.throws(() => task.assertState([[{ ...task.baseline }], [], category, targets.map(row => ({ ...row, published: false }))]));
    const saved = { ...task.article, id: 99001, category_id: task.ledger.targeting.categoryId };
    task.assertSaved(saved); assert.throws(() => task.assertSaved({ ...saved, published: true }));
    assert.throws(() => task.assertSaved({ ...saved, content: 'different' }));
  });
  const metadataNode = routeTree.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'generateMetadata');
  let post = { title: task.article.title, slug: task.article.slug, content: task.content, excerpt: task.article.excerpt,
    published: true, author: task.article.author, coverImage: task.article.cover_image, metaTitle: task.article.meta_title,
    metaDescription: task.article.meta_description, keywords: task.article.keywords,
    createdAt: new Date('2026-10-08T00:00:00Z'), updatedAt: new Date('2026-10-08T00:00:00Z') };
  const fakeDb = { select: () => ({ from: () => ({ where: () => ({ limit: async () => post ? [post] : [] }) }) }) };
  const metadata = new Function('db', 'posts', 'eq', 'siteConfig', 'getPostSeoImages', `${transpile(metadataNode.getText(routeTree).replace(/^export\s+/, ''), 'metadata.ts')}; return generateMetadata;`)(fakeDb, { slug: 'slug' }, () => true, siteConfig, images.getPostSeoImages);
  const publicMetadata = await metadata({ params: Promise.resolve({ slug: task.article.slug }) });
  check('real published route metadata uses the intended title, canonical and share images', () => {
    assert.equal(publicMetadata.title, task.article.meta_title); assert.equal(publicMetadata.description, task.article.meta_description);
    assert.equal(publicMetadata.alternates.canonical, `${siteConfig.url}/blog/${task.article.slug}`);
    assert.equal(publicMetadata.openGraph.type, 'article');
    assert.deepEqual(publicMetadata.openGraph.images.map(image => image.url), task.imageUrls);
    assert.deepEqual(publicMetadata.twitter.images, [task.article.cover_image]);
  });
  post.published = false;
  const hidden = await metadata({ params: Promise.resolve({ slug: task.article.slug }) });
  post = null;
  const absent = await metadata({ params: Promise.resolve({ slug: task.article.slug }) });
  check('hidden and absent route metadata remain noindex', () => {
    assert.deepEqual(hidden, { title: 'Post Not Found', robots: { index: false, follow: true } }); assert.deepEqual(absent, hidden);
  });
  let body = rendered.replace(/<link\b(?=[^>]*\brel="preload")(?=[^>]*\bas="image")[^>]*\/?\s*>/gi, '');
  const localImages = task.imageUrls.map(url => `data:image/png;base64,${readFileSync(resolve(task.root, 'public', new URL(url).pathname.slice(1))).toString('base64')}`);
  for (const [index, url] of task.imageUrls.entries()) body = body.replaceAll(`src="${escape(url)}"`, `src="${localImages[index]}"`);
  body = body.replaceAll('<button ', '<button disabled title="Unhydrated preview control" ');
  preview = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; connect-src 'none'; base-uri 'none'; form-action 'none'"><title>${escape(task.article.title)} — unpublished preview</title><style>${previewCss}</style></head><body><main class="excel-preview"><p class="preview-banner">Unpublished static review using the actual MarkdownRenderer. Not the full Next page; copy buttons are not hydrated.</p><h1>${escape(task.article.title)}</h1><p>Ali Rehman · ${escape(task.article.reading_time)} · October 8, 2026</p><img class="preview-cover" src="${localImages[0]}" width="1200" height="675" alt="Leading zeros disappearing from a CSV: import original IDs as Text">${body}</main></body></html>`;
  check('static preview uses only embedded images and no executable content', () => {
    const parsed = parseDocument(preview);
    assert.equal(all(parsed, node => node.name === 'h1').length, 1);
    assert.equal(all(parsed, node => node.name === 'img').length, 3);
    assert(all(parsed, node => node.name === 'img').every(image => image.attribs.src.startsWith('data:image/png;base64,')));
    assert.equal(all(parsed, node => node.name === 'script' || (node.name === 'link' && /preload|stylesheet|prefetch|preconnect/i.test(node.attribs.rel ?? ''))).length, 0);
  });
} finally { globalThis.fetch = oldFetch; hook.deregister(); }

assert(process.argv.length <= 3 && (!process.argv[2] || process.argv[2] === '--browser'));
if (process.argv[2] === '--browser') {
  const { chromium, expect } = await import('@playwright/test');
  const directory = await mkdtemp(resolve(tmpdir(), 'byteverse-csv-article-'));
  await writeFile(resolve(directory, 'preview.html'), preview, { flag: 'wx' });
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const measurements = [];
  try {
    for (const width of [320, 390, 1280]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
      const requests = [], errors = [];
      await context.route('**/*', async route => { requests.push(route.request().url()); await route.abort(); });
      const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
      await page.setContent(preview, { waitUntil: 'load' });
      await expect(page.locator('h1')).toHaveCount(1);
      for (const image of await page.locator('img').all()) {
        await image.scrollIntoViewIfNeeded();
        await expect.poll(() => image.evaluate(img => img.complete && img.naturalWidth === 1200)).toBe(true);
      }
      for (const detail of await page.locator('details').all()) { await detail.locator('summary').click(); await expect(detail).toHaveAttribute('open', ''); }
      const dimensions = await page.evaluate(() => ({ viewport: innerWidth, page: document.documentElement.scrollWidth, images: document.images.length, faqs: document.querySelectorAll('details[open]').length }));
      assert(dimensions.page <= width + 1); assert.equal(dimensions.faqs, 5);
      assert.deepEqual(requests, []); assert.deepEqual(errors, []);
      await page.locator('h1').scrollIntoViewIfNeeded(); await page.screenshot({ path: resolve(directory, `${width}-article.png`) });
      measurements.push(dimensions); await context.close();
    }
  } finally { await browser.close(); }
  console.log(JSON.stringify({ browserPreview: 'Static actual-renderer preview, not a full Next production page', directory, measurements }, null, 2));
}
console.log(JSON.stringify({ ...report, offlineGroups: checks.length, status: 'passed', testedConverterExample: true, excelExecution: false, databaseOrEnvironmentLoaded: false }, null, 2));