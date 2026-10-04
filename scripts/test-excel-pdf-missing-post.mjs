import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire, registerHooks } from 'node:module';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { parseDocument, DomUtils } from 'htmlparser2';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const siteConfig = { url: 'https://www.byteverse.fyi', name: 'ByteVerse' };
const findAll = (doc, predicate) => DomUtils.findAll(predicate, doc.children);
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

function transpile(source, fileName = 'fixture.ts') {
  const result = ts.transpileModule(source, {
    fileName, reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  });
  assert(!(result.diagnostics || []).some(item => item.category === ts.DiagnosticCategory.Error), `TypeScript transpilation failed: ${fileName}`);
  return result.outputText;
}

function load(root, path, mocks = {}) {
  const source = readFileSync(resolve(root, path), 'utf8');
  const allowed = new Set(['react', 'react/jsx-runtime', 'lucide-react', 'react-markdown', 'remark-gfm', 'rehype-raw', 'rehype-sanitize', 'rehype-slug']);
  const loadedModule = { exports: {} };
  const localRequire = name => {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    assert(allowed.has(name), `Unexpected renderer import, not loaded: ${name}`);
    return require(name);
  };
  new Function('require', 'module', 'exports', transpile(source, path))(localRequire, loadedModule, loadedModule.exports);
  return loadedModule.exports;
}

function checkExamples(codeBlocks) {
  // The current article, not the ledger's earlier sketches, defines these examples.
  const expectedM = String.raw`let
    Source = Pdf.Tables(
        File.Contents("C:\YourFolder\sample.pdf"),
        [StartPage = 1, EndPage = 2, MultiPageTables = false]
    )
in
    Source` + '\n';
  const m = codeBlocks[0][2];
  assert.equal(m, expectedM, 'Power Query sample must round-trip verbatim');
  assert.equal((m.match(/File\.Contents\s*\(/g) || []).length, 1);
  assert.equal((m.match(/Pdf\.Tables\s*\(/g) || []).length, 1);
  assert(!m.includes('\\\\'), 'M Windows paths use single backslashes');
  assert(!/Web\.|https?:\/\//i.test(m), 'The sample must not request a web resource');
  const strings = m.match(/"(?:[^"]|"")*"/g) || [];
  assert.deepEqual(strings, [String.raw`"C:\YourFolder\sample.pdf"`]);
  const stack = [];
  for (const character of m.replace(/"(?:[^"]|"")*"/g, '')) {
    if ('(['.includes(character)) stack.push(character);
    if (character === ')' || character === ']') assert.equal(stack.pop(), character === ')' ? '(' : '[', 'Unbalanced M delimiters');
  }
  assert.equal(stack.length, 0);
  assert.match(m, /\[StartPage = 1, EndPage = 2, MultiPageTables = false\]/);

  const csv = codeBlocks[1][2];
  assert.equal(csv, 'InvoiceID,InvoiceDate,Amount\n000123,03/10/2026,125.50\n000124,04/10/2026,240.00\n');
  assert(!/["\r]/.test(csv), 'This deliberately simple fixture has no quoted fields or CRLF');
  const [header, ...rows] = csv.trimEnd().split('\n').map(line => line.split(','));
  assert.deepEqual(header, ['InvoiceID', 'InvoiceDate', 'Amount']);
  assert.equal(rows.length, 2);
  assert(rows.every(row => row.length === 3));
  assert.deepEqual(rows.map(row => row[0]), ['000123', '000124']);
  assert.deepEqual(rows.map(row => row[1]), ['03/10/2026', '04/10/2026']);
  assert.deepEqual(rows.map(row => row[2]), ['125.50', '240.00']);
  assert.deepEqual(rows.map(row => Number(row[2])), [125.5, 240]);
  assert(rows.every(row => /^\d+\.\d{2}$/.test(row[2])));
  assert.deepEqual(rows.map(row => row[1].split('/').map(Number)), [[3, 10, 2026], [4, 10, 2026]]);
}

function checkDatabaseGuards(task) {
  const { article, ledger } = task;
  const protectedRows = ledger.inventory.protectedDrafts.map(post => ({
    id: post.id, slug: post.slug, published: false, featured: false, scheduled_at: null,
    content_md5: post.contentMd5, editorial_hash: post.editorialHash,
  }));
  const category = { id: 9001, name: 'Tech Guides' };
  const stored = { ...article, id: 99001, category_id: category.id, views: 0 };
  const snapshot = { count: 164, published_count: 162, hash: ledger.inventory.editorialChecksumExcludingViews };
  const state = {
    snapshot, protectedRows, categories: [category], existing: [stored], reusedImages: [],
    targets: task.internalLinks.filter(link => link[2].startsWith('/blog/')).map((link, index) => ({ id: index + 9002, slug: link[2].slice(6), published: true })),
  };
  assert.deepEqual(task.assertDatabaseState(state), category);
  task.assertInventoryBaseline(snapshot);
  task.assertArticleRow({ ...stored, views: 500 }, category.id);
  for (const field of ['content_md5', 'editorial_hash', 'published', 'featured', 'scheduled_at', 'slug']) {
    const changed = structuredClone(protectedRows);
    changed[0][field] = field === 'published' || field === 'featured' ? true : 'changed';
    assert.throws(() => task.assertProtectedDrafts(changed), assert.AssertionError);
  }
  assert.throws(() => task.assertProtectedDrafts(protectedRows.slice(1)), assert.AssertionError);
  assert.throws(() => task.assertInventoryBaseline({ ...snapshot, count: 165 }), assert.AssertionError);
  assert.throws(() => task.assertInventoryBaseline({ ...snapshot, hash: 'changed' }), assert.AssertionError);
  for (const [field, value] of Object.entries(article)) {
    const changed = value === false ? true : value === null ? 'scheduled' : `${value}!`;
    assert.throws(() => task.assertArticleRow({ ...stored, [field]: changed }, category.id), assert.AssertionError);
  }
  assert.throws(() => task.assertArticleRow(stored, category.id + 1), assert.AssertionError);
  assert.throws(() => task.assertDatabaseState({ ...state, categories: [] }), assert.AssertionError);
  assert.throws(() => task.assertDatabaseState({ ...state, existing: [stored, stored] }), assert.AssertionError);
  assert.throws(() => task.assertDatabaseState({ ...state, targets: state.targets.map(post => ({ ...post, published: false })) }), assert.AssertionError);
  assert.throws(() => task.assertDatabaseState({ ...state, reusedImages: [{ slug: 'synthetic-existing-post', photo_id: '8296983' }] }), assert.AssertionError);
  for (const [field, limit] of Object.entries(task.databaseFieldLimits)) {
    task.validateFieldLengths({ ...article, [field]: 'x'.repeat(limit) });
    assert.throws(() => task.validateFieldLengths({ ...article, [field]: 'x'.repeat(limit + 1) }), assert.AssertionError);
  }

  // Record tagged-template structure only; no SQL engine or driver is loaded.
  const record = (parts, ...parameters) => ({ text: parts.join('?'), parameters });
  const reads = task.databaseReadQueries(record);
  assert.equal(reads.length, 6);
  assert(reads.every(query => !/\b(?:INSERT|UPDATE|DELETE|ALTER|DROP|TRUNCATE)\b/i.test(query.text)));
  const imageQuery = task.imageReuseQuery(record);
  assert.match(imageQuery.text, /SELECT p\.id, p\.slug, photo\.id AS photo_id/);
  assert.match(imageQuery.text, /unnest\(/);
  assert.match(imageQuery.text, /p\.cover_image ~\* photo\.pattern OR p\.content ~\* photo\.pattern/);
  assert.deepEqual(imageQuery.parameters[0], task.photoIds);
  for (const [index, pattern] of imageQuery.parameters[1].entries()) {
    const id = task.photoIds[index];
    const regex = new RegExp(pattern);
    assert(regex.test(`https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg`));
    assert(regex.test(`https://images.pexels.com/photos/${id}.jpeg`));
    assert(!regex.test(`https://images.pexels.com/photos/${id}9/pexels-photo-${id}9.jpeg`));
  }
  const transaction = task.draftTransactionQueries(record, category.id);
  assert.equal(transaction.length, 4);
  assert.deepEqual(task.draftTransactionOptions, { isolationLevel: 'Serializable', readOnly: false });
  const insert = transaction[1];
  assert.equal((insert.text.match(/INSERT INTO posts/g) || []).length, 1);
  assert(!/\b(?:UPDATE|DELETE|ALTER|DROP|TRUNCATE|CONFLICT|MERGE)\b/i.test(insert.text));
  assert.match(insert.text, /WITH inventory AS \(\?\)/);
  assert.match(insert.text, /inventory\.count = \?/);
  assert.match(insert.text, /inventory\.published_count = \?/);
  assert.match(insert.text, /inventory\.hash = \?/);
  assert.match(insert.text, /NOT EXISTS \(SELECT 1 FROM posts WHERE slug = \?\)/);
  assert.equal((insert.text.match(/NOW\(\)/g) || []).length, 2);
  for (const value of Object.values(article)) assert(insert.parameters.includes(value), 'Article field must be a bound value');
  assert(insert.parameters.includes(category.id) && insert.parameters.includes(164) && insert.parameters.includes(snapshot.hash));
  assert.match(insert.parameters[0].text, /string_agg\(\(to_jsonb\(p\) - 'views'\)::text, '' ORDER BY p\.id\)/);
  assert.match(insert.parameters[0].text, /p\.slug <> \?/);
  assert.equal(task.parseMode([]), '--offline');
  assert.equal(task.parseMode(['--offline']), '--offline');
  for (const args of [['--publish'], ['--save-draft', '--offline'], ['--read-only', '--save-draft']]) assert.throws(() => task.parseMode(args), assert.AssertionError);
}

function checkHttpGuards(task) {
  const path = '/tools/json-to-csv';
  const response = { status: 200, headers: new Headers() };
  const html = `<html><head><title>JSON to CSV</title><link rel="canonical" href="${siteConfig.url}${path}"></head><body><h1>JSON to CSV</h1></body></html>`;
  task.validatePublicTarget(path, response, html);
  assert.throws(() => task.validatePublicTarget(path, { ...response, status: 308 }, html), assert.AssertionError);
  assert.throws(() => task.validatePublicTarget(path, response, html.replace(path, '/tools/wrong')), assert.AssertionError);
  assert.throws(() => task.validatePublicTarget(path, response, html.replace('</head>', '<meta name="robots" content="noindex,follow"></head>')), assert.AssertionError);
  assert.throws(() => task.validatePublicTarget(path, { status: 200, headers: new Headers({ 'x-robots-tag': 'noindex' }) }, html), assert.AssertionError);
  assert.throws(() => task.validatePublicTarget(path, response, html.replace('<title>JSON to CSV</title>', '<title>Post Not Found</title>')), assert.AssertionError);
  const hidden = '<title>Post Not Found | ByteVerse</title><meta name="robots" content="noindex,follow">';
  for (const status of [200, 404]) task.validateHiddenBlog(task.article.slug, { status, headers: new Headers() }, hidden);
  assert.throws(() => task.validateHiddenBlog(task.article.slug, response, '<title>Post Not Found</title>'), assert.AssertionError);
  assert.throws(() => task.validateHiddenBlog(task.article.slug, response, html), assert.AssertionError);
}

async function checkRoute(root, task, renderedFaqs, imageSeo) {
  const source = readFileSync(resolve(root, 'src/app/blog/[slug]/page.tsx'), 'utf8');
  const start = source.indexOf('  const faqRegex =');
  const end = source.indexOf('  // Auto-extract HowTo', start);
  assert(start >= 0 && end > start, 'Actual route FAQ extraction block moved');
  const faqPairs = new Function('post', `${transpile(source.slice(start, end))}; return faqs;`)({ content: task.article.content });
  const questions = renderedFaqs.map(node => DomUtils.textContent(DomUtils.findOne(child => child.name === 'summary', node.children, true)));
  assert.deepEqual(faqPairs.map(pair => pair.question), questions);
  assert.equal(faqPairs.length, 8);
  assert(faqPairs.every(pair => pair.answer.length > 10 && !/https?:\/\//.test(pair.answer)));

  const tree = ts.createSourceFile('page.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const page = tree.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'BlogPostPage');
  const faqSchemaNode = page?.body?.statements.find(node => ts.isIfStatement(node) && node.expression.getText(tree) === 'faqs.length > 0');
  assert(faqSchemaNode, 'Actual FAQ schema branch moved');
  const graph = [];
  new Function('faqs', 'graphItems', transpile(faqSchemaNode.getText(tree)))(faqPairs, graph);
  assert.equal(graph.length, 1);
  assert.equal(graph[0]['@type'], 'FAQPage');
  assert.equal(graph[0].mainEntity.length, 5, 'The existing route emits only the first five FAQs');
  assert.deepEqual(graph[0].mainEntity.map(item => [item.name, item.acceptedAnswer.text]), faqPairs.slice(0, 5).map(pair => [pair.question, pair.answer]));

  const metadataNode = tree.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'generateMetadata');
  assert(metadataNode, 'Actual metadata function moved');
  const metadataCode = transpile(metadataNode.getText(tree).replace(/^export\s+/, ''));
  const post = {
    title: task.article.title, slug: task.article.slug, content: task.article.content, excerpt: task.article.excerpt,
    published: true, author: task.article.author, coverImage: task.article.cover_image,
    metaTitle: task.article.meta_title, metaDescription: task.article.meta_description, keywords: task.article.keywords,
    createdAt: new Date('2026-10-03T00:00:00Z'), updatedAt: new Date('2026-10-03T00:00:00Z'),
  };
  let rows = [post];
  const posts = { slug: Symbol('synthetic slug column') };
  const fakeDb = { select: () => ({ from: table => {
    assert.equal(table, posts);
    return { where: condition => {
      assert.deepEqual(condition, { field: posts.slug, value: task.article.slug });
      return { limit: async count => { assert.equal(count, 1); return rows; } };
    } };
  } }) };
  const generateMetadata = new Function('db', 'posts', 'eq', 'siteConfig', 'getPostSeoImages', `${metadataCode}; return generateMetadata;`)(
    fakeDb, posts, (field, value) => ({ field, value }), siteConfig, imageSeo.getPostSeoImages,
  );
  const params = () => ({ params: Promise.resolve({ slug: task.article.slug }) });
  const metadata = await generateMetadata(params());
  assert.equal(metadata.title, task.article.meta_title);
  assert.equal(metadata.description, task.article.meta_description);
  assert.equal(metadata.keywords, task.article.keywords);
  assert.deepEqual(metadata.alternates, { canonical: `${siteConfig.url}/blog/${task.article.slug}` });
  assert.notEqual(metadata.robots?.index, false);
  assert.equal(metadata.openGraph.title, task.article.meta_title);
  assert.equal(metadata.openGraph.description, task.article.meta_description);
  assert.equal(metadata.openGraph.type, 'article');
  assert.deepEqual(metadata.openGraph.authors, ['Ali Rehman']);
  assert.deepEqual(metadata.openGraph.images.map(image => image.url), task.imageUrls.slice(0, 4));
  assert.equal(metadata.twitter.card, 'summary_large_image');
  assert.deepEqual(metadata.twitter.images, [task.article.cover_image]);
  post.published = false;
  const hidden = await generateMetadata(params());
  assert.deepEqual(hidden, { title: 'Post Not Found', robots: { index: false, follow: true } });
  rows = [];
  assert.deepEqual(await generateMetadata(params()), hidden);
  return { extractedFaqs: faqPairs.length, routeEmitsFirstFaqs: graph[0].mainEntity.length, publishedAndHiddenMetadata: 'passed with synthetic rows' };
}

export async function runOfflineTests() {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => { throw new Error('Network fetch blocked in offline article tests'); };
  const hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
      assert(!/^(?:@next\/env|@neondatabase\/serverless|dotenv|pg)(?:\/|$)/.test(specifier) && !/^@\/lib\/db(?:\/|$)/.test(specifier), 'Environment/database imports are forbidden in offline tests');
      return nextResolve(specifier, context);
    },
  });
  try {
    const task = await import('./_add-excel-pdf-missing-post.mjs');
    const contentReport = task.validateArticle();
    assert.equal(task.article.content, readFileSync(task.articlePath, 'utf8').replace(/\r\n?/g, '\n').trim());
    const imageSeo = load(task.root, 'src/lib/image-seo.ts', { '@/lib/config': { siteConfig } });
    const copyButton = load(task.root, 'src/components/copy-button.tsx');
    const { MarkdownRenderer } = load(task.root, 'src/components/markdown-renderer.tsx', {
      '@/lib/config': { siteConfig }, '@/lib/image-seo': imageSeo, '@/components/copy-button': copyButton,
      '@/components/code-playground': { CodePlayground() { throw new Error('No executable browser playground is permitted in this article'); } },
    });
    const html = renderToStaticMarkup(createElement(MarkdownRenderer, { content: task.article.content, currentSlug: task.article.slug }));
    const doc = parseDocument(html);
    const headings = findAll(doc, node => /^h[1-6]$/.test(node.name || ''));
    assert(!headings.some(node => node.name === 'h1'));
    const ids = headings.map(node => node.attribs.id);
    assert(ids.every(Boolean) && ids.length === new Set(ids).size, 'All heading IDs must be present and unique');
    const faqs = findAll(doc, node => node.name === 'details');
    assert.equal(faqs.length, 8);
    assert(faqs.every(node => DomUtils.findAll(child => child.name === 'summary', node.children).length === 1));
    const links = findAll(doc, node => node.name === 'a');
    const internal = links.filter(node => node.attribs.href?.startsWith('/'));
    assert.deepEqual(internal.map(node => node.attribs.href), task.ledger.internalLinkPlan);
    for (const link of links.filter(node => node.attribs.href?.startsWith('https://'))) {
      assert.equal(link.attribs.target, '_blank');
      assert(link.attribs.rel?.split(/\s+/).includes('noopener') && link.attribs.rel?.split(/\s+/).includes('noreferrer'));
    }
    const tables = findAll(doc, node => node.name === 'table');
    assert.equal(tables.length, 1);
    assert.equal(tables[0].parent.attribs.class, 'table-wrap comparison-table');
    assert.equal(DomUtils.findAll(node => node.name === 'th', tables[0].children).length, 3);
    assert.equal(DomUtils.findAll(node => node.name === 'tr', tables[0].children).length, 8);
    const figures = findAll(doc, node => node.name === 'figure');
    assert.equal(figures.length, 4);
    assert.equal(findAll(doc, node => node.name === 'img').length, 4);
    const seoImages = imageSeo.getPostSeoImages({ title: task.article.title, coverImage: task.article.cover_image, content: task.article.content });
    assert.deepEqual(seoImages.map(image => image.url), task.imageUrls);
    for (const [index, figure] of figures.entries()) {
      assert.equal(figure.attribs.itemtype, 'https://schema.org/ImageObject');
      assert(Object.hasOwn(figure.attribs, 'itemscope'));
      const img = DomUtils.findOne(node => node.name === 'img', figure.children, true);
      const caption = DomUtils.findOne(node => node.name === 'figcaption', figure.children, true);
      const raw = task.bodyImages[index];
      assert.equal(img?.attribs.src, raw[2]);
      assert.equal(img?.attribs.alt, raw[1]);
      assert.equal(img?.attribs.title, raw[3]);
      assert.equal(img?.attribs.itemprop, 'contentUrl');
      assert.equal(img?.attribs.loading, index === 0 ? 'eager' : 'lazy');
      assert.equal(DomUtils.textContent(caption), raw[3]);
      const props = DomUtils.findAll(node => Boolean(node.attribs?.itemprop), figure.children);
      const prop = name => props.find(node => node.attribs.itemprop === name);
      for (const name of ['creator', 'creditText', 'copyrightNotice', 'license', 'acquireLicensePage', 'description', 'width', 'height', 'caption']) assert(prop(name), `Missing figure metadata: ${name}`);
      assert.equal(prop('creditText').attribs.content, imageSeo.getImageCreditText(raw[2]));
      assert.equal(prop('copyrightNotice').attribs.content, imageSeo.getImageCopyrightNotice(raw[2]));
      assert.equal(prop('license').attribs.href, imageSeo.getImageLicenseUrl(raw[2]));
      assert.equal(prop('acquireLicensePage').attribs.href, imageSeo.getImageAcquireLicensePage(raw[2]));
      const creatorName = DomUtils.findOne(node => node.attribs?.itemprop === 'name', prop('creator').children, true);
      assert.equal(creatorName?.attribs.content, imageSeo.getImageCreator(raw[2]).name);
      assert.equal(prop('width').attribs.content, String(seoImages[index + 1].width));
      assert.equal(prop('height').attribs.content, String(seoImages[index + 1].height));
    }
    const pres = findAll(doc, node => node.name === 'pre');
    assert.deepEqual(pres.map(node => DomUtils.textContent(node)), task.codeBlocks.map(block => block[2]), 'Rendered code must preserve every character, including its final newline');
    assert.deepEqual(pres.map(node => DomUtils.findOne(child => child.name === 'code', node.children, true)?.attribs.class), ['language-powerquery', 'language-csv']);
    assert.equal(findAll(doc, node => node.name === 'button' && node.attribs['aria-label'] === 'Copy code').length, 2);
    assert.equal(findAll(doc, node => ['script', 'iframe', 'object', 'embed', 'form'].includes(node.name)).length, 0);
    assert.equal(findAll(doc, node => Object.keys(node.attribs || {}).some(name => /^on/i.test(name)) || /^(?:javascript|vbscript|data):/i.test(node.attribs?.href || '')).length, 0);
    checkExamples(task.codeBlocks);
    checkDatabaseGuards(task);
    checkHttpGuards(task);
    const route = await checkRoute(task.root, task, faqs, imageSeo);
    const previewHtml = createPreviewHtml(task, html);
    checkPreview(previewHtml);
    const report = {
      ...contentReport, renderer: 'actual MarkdownRenderer and image/copy helpers', headings: ids.length,
      visibleFaqs: faqs.length, ...route, exactCodeBlocks: pres.length, imageMetadataFigures: figures.length,
      syntheticCsv: '2 rows, 3 fields; leading zeros, day/month dates and decimal strings preserved',
      databaseGuards: 'synthetic rows and SQL-template assertions only; no database execution',
      preview: 'offline HTML/header assertions only; no listening socket or browser run',
      limitations: 'No Excel, Mac or M runtime, live HTTP/DB, full production rendering, browser viewport measurements or independent source fact review',
    };
    console.log(JSON.stringify(report, null, 2));
    console.log('PASS: Offline content, actual renderer/helpers, route FAQ/metadata, sample text and guard tests. No application environment, database or network requests.');
    return { html, previewHtml, report };
  } finally {
    hooks.deregister();
    globalThis.fetch = originalFetch;
  }
}

export const previewCss = `
html{color-scheme:light}body{margin:0;background:#f3f6f8;color:#172633;font:17px/1.8 system-ui,sans-serif}
.excel-preview,.excel-preview *{box-sizing:border-box}
.excel-preview{width:calc(100% - 32px);max-width:920px;min-width:0;margin:28px auto;padding:clamp(16px,4vw,48px);background:#fff;border:1px solid #dce5eb;border-radius:16px;overflow-wrap:anywhere}
.excel-preview .preview-banner{padding:12px 16px;background:#fff8df;color:#684d08;border:1px solid #eadb9a;border-radius:9px;font-size:13px;line-height:1.65}
.excel-preview .preview-eyebrow{margin:28px 0 8px;font-size:12px;letter-spacing:1.8px;font-weight:750;color:#096c5f}
.excel-preview h1{font-size:clamp(28px,4vw,43px);line-height:1.18;letter-spacing:-.8px;margin:8px 0 18px}
.excel-preview h2{font-size:clamp(23px,3vw,28px);line-height:1.3;margin:42px 0 16px}
.excel-preview h3{font-size:21px;line-height:1.4;margin:28px 0 12px}
.excel-preview p{margin:0 0 22px}.excel-preview .preview-byline{font-size:14px;color:#586a79}
.excel-preview a{color:#096d60;text-underline-offset:3px;overflow-wrap:anywhere}
.excel-preview a svg{width:12px;height:12px;display:inline-block;margin-left:4px}
.excel-preview .blog-content{min-width:0;max-width:100%}
.excel-preview figure{margin:30px 0}.excel-preview figure img,.excel-preview .preview-cover{display:block;width:100%;height:auto;max-width:100%;border-radius:10px}
.excel-preview .preview-cover{margin:26px 0}.excel-preview figcaption{margin:8px 0 0;font-size:13px;line-height:1.6;color:#566674;text-align:center}
.excel-preview .table-wrap{display:block;width:100%;max-width:100%;min-width:0;overflow-x:auto;margin:26px 0;border:1px solid #dce5eb;border-radius:10px}
.excel-preview table{border-collapse:collapse;width:100%;min-width:640px;font-size:14px;line-height:1.6}
.excel-preview th,.excel-preview td{padding:13px 15px;border-bottom:1px solid #dce5eb;text-align:left;vertical-align:top}
.excel-preview th{background:#eef7f4}.excel-preview td:first-child{font-weight:650}
.excel-preview .group.relative{position:relative;min-width:0;max-width:100%;margin:26px 0;background:#111d29;border-radius:10px;overflow:hidden}
.excel-preview .group.relative>div:first-child{padding:10px 16px;background:#1b2a39;color:#d3dfe9;font:12px/1.5 ui-monospace,monospace}
.excel-preview .group.relative>button{position:absolute;top:7px;right:10px;border:0;border-radius:5px;padding:6px;background:#314254;color:#d9e5ed;opacity:.65;pointer-events:none}
.excel-preview .group.relative>button svg{display:block;width:14px;height:14px}
.excel-preview pre{display:block;max-width:100%;min-width:0;margin:0;padding:18px;overflow-x:auto;background:#111d29;color:#e3edf5;border:0;font:13px/1.65 ui-monospace,monospace;white-space:pre}
.excel-preview code{font-family:ui-monospace,monospace;font-size:.88em;padding:2px 5px;border-radius:4px;background:#eef3f5;color:#174e48}
.excel-preview pre code{padding:0;border-radius:0;background:none;color:inherit;font:inherit;white-space:pre;overflow-wrap:normal;word-break:normal}
.excel-preview details{margin:12px 0;padding:16px 18px;border:1px solid #dce5eb;border-radius:10px;background:#fbfdfe}
.excel-preview summary{cursor:pointer;font-weight:650;line-height:1.5}.excel-preview details[open] summary{margin-bottom:14px}
.excel-preview details p:last-child{margin-bottom:0}.excel-preview .preview-footer{margin:36px 0 0;font-size:13px;color:#647581;border-top:1px solid #dce5eb;padding-top:18px}
@media(max-width:480px){.excel-preview{width:100%;margin:0;padding:18px 14px;border:0;border-radius:0}.excel-preview h2{margin-top:34px}.excel-preview details{padding:14px}.excel-preview pre{font-size:12px;padding:14px}}
`;

function placeholder(image) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="788" viewBox="0 0 1400 788"><rect width="1400" height="788" fill="#e7eff1"/><rect x="80" y="90" width="1240" height="608" rx="28" fill="#d4e3e4"/><text x="700" y="355" text-anchor="middle" font-family="sans-serif" font-size="44" fill="#235951">Offline illustration placeholder</text><text x="700" y="430" text-anchor="middle" font-family="sans-serif" font-size="30" fill="#315760">${escape(image.photographer)} / Pexels ${image.id}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function createPreviewHtml(task, rendered, localPhotos) {
  if (localPhotos) assert(localPhotos.length === 5 && localPhotos.every(src => /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(src)));
  const source = index => localPhotos?.[index] || placeholder(task.ledger.images[index]);
  // React SSR can add remote image preloads even when image sources are replaced.
  let body = rendered.replace(/<link\b(?=[^>]*\brel="preload")(?=[^>]*\bas="image")[^>]*\/?\s*>/gi, '');
  for (const [index, url] of task.imageUrls.entries()) {
    body = body.replaceAll(`src="${escape(url)}"`, `src="${escape(source(index))}" data-source-url="${escape(url)}"`);
  }
  body = body.replaceAll('<button ', '<button disabled title="Copy buttons are unhydrated in this static preview" ');
  const imageNote = localPhotos ? 'Images use the previously downloaded photo crops' : 'Images are offline placeholders';
  const coverAlt = localPhotos ? 'Hands writing beside a laptop displaying a spreadsheet' : 'Offline placeholder for the credited cover illustration';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${escape(task.article.title)} — local hidden draft preview</title><style>${previewCss}</style></head><body><main class="excel-preview"><div class="preview-banner">Unpublished local preview. Actual MarkdownRenderer with isolated light styling, not the full production page. ${imageNote}; Copy buttons are unhydrated. No Excel or Power Query runtime verification.</div><div class="preview-eyebrow">BYTEVERSE / TECH GUIDES</div><h1>${escape(task.article.title)}</h1><p class="preview-byline">${escape(task.article.author)} · ${escape(task.article.reading_time)} · Sources checked October 3, 2026</p><img class="preview-cover" src="${escape(source(0))}" alt="${coverAlt}" width="1400" height="788">${body}<p class="preview-footer">Local review only. Nothing is saved, published, scheduled or changed in existing content.</p></main></body></html>`;
}

export function handlePreviewRequest(request, response, html) {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Robots-Tag', 'noindex, nofollow');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Content-Security-Policy', "default-src 'none'; img-src data:; style-src 'unsafe-inline'; connect-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
  if (request.headers.host !== '127.0.0.1:3037') return response.writeHead(403).end('Forbidden');
  if (!['GET', 'HEAD'].includes(request.method) || request.url !== '/') return response.writeHead(404).end('Not Found');
  response.setHeader('Content-Type', 'text/html; charset=utf-8');
  response.statusCode = 200;
  response.end(request.method === 'HEAD' ? undefined : html);
}

function checkPreview(html) {
  const doc = parseDocument(html);
  assert.equal(findAll(doc, node => node.name === 'meta' && node.attribs.name === 'robots')[0]?.attribs.content, 'noindex,nofollow');
  assert.equal(findAll(doc, node => node.name === 'h1').length, 1);
  const images = findAll(doc, node => node.name === 'img');
  assert.equal(images.length, 5);
  assert(images.every(node => node.attribs.src.startsWith('data:image/svg+xml;')));
  assert(!findAll(doc, node => node.name === 'script' || (node.name === 'link' && /preload|stylesheet/i.test(node.attribs.rel || ''))).length);
  const buttons = findAll(doc, node => node.name === 'button');
  assert.equal(buttons.length, 2);
  assert(buttons.every(node => Object.hasOwn(node.attribs, 'disabled')));
  assert(!html.includes('[truncated]'));
  assert(previewCss.includes('min-width:640px') && previewCss.includes('overflow-x:auto'));
  const respond = overrides => {
    const response = { headers: {}, setHeader(name, value) { this.headers[name] = value; }, writeHead(status) { this.statusCode = status; return this; }, end(body) { this.body = body; } };
    handlePreviewRequest({ method: 'GET', url: '/', headers: { host: '127.0.0.1:3037' }, ...overrides }, response, html);
    return response;
  };
  const normal = respond({});
  assert.equal(normal.statusCode, 200);
  assert.equal(normal.body, html);
  assert.equal(normal.headers['X-Robots-Tag'], 'noindex, nofollow');
  assert.equal(normal.headers['Cache-Control'], 'no-store');
  assert(normal.headers['Content-Security-Policy'].includes("connect-src 'none'"));
  assert.equal(respond({ method: 'HEAD' }).body, undefined);
  assert.equal(respond({ headers: { host: 'external.invalid:3037' } }).statusCode, 403);
  assert.equal(respond({ url: '/.env' }).statusCode, 404);
  assert.equal(respond({ method: 'POST' }).statusCode, 404);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    const args = process.argv.slice(2);
    assert(new Set(args).size === args.length && args.every(arg => ['--preview', '--preview-photos'].includes(arg)), 'Use --preview, optionally --preview-photos for cached local photo crops');
    assert(!args.includes('--preview-photos') || args.includes('--preview'));
    const result = await runOfflineTests();
    if (args.includes('--preview')) {
      let previewHtml = result.previewHtml;
      if (args.includes('--preview-photos')) {
        const task = await import('./_add-excel-pdf-missing-post.mjs');
        const photos = task.photoIds.map(id => `data:image/jpeg;base64,${readFileSync(resolve(tmpdir(), 'byteverse-excel-20261003', `${id}.jpg`)).toString('base64')}`);
        previewHtml = createPreviewHtml(task, result.html, photos);
      }
      const server = createServer((request, response) => handlePreviewRequest(request, response, previewHtml));
      server.on('error', error => {
        console.error(error.code === 'EADDRINUSE' ? 'Preview port 3037 is already in use; no alternate host or port was started.' : 'Local preview failed.');
        process.exitCode = 1;
      });
      server.listen(3037, '127.0.0.1', () => console.log(`LOCAL PREVIEW: http://127.0.0.1:3037/ — static, noindex, ${args.includes('--preview-photos') ? 'cached photo crops' : 'offline placeholders'}; not the production page.`));
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Offline article checks failed.');
    process.exitCode = 1;
  }
}