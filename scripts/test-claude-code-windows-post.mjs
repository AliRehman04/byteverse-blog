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
import { previewCss as basePreviewCss } from './test-copilot-excel-post.mjs';

const require = createRequire(import.meta.url);
const siteConfig = { url: 'https://www.byteverse.fyi', name: 'ByteVerse' };
const checks = [];
const check = (name, operation) => { operation(); checks.push(name); console.log(`PASS: ${name}`); };
const all = (dom, predicate) => DomUtils.findAll(predicate, dom.children);
const one = (dom, predicate) => { const nodes = all(dom, predicate); assert.equal(nodes.length, 1); return nodes[0]; };
const collapse = value => value.replace(/\s+/g, ' ').trim();
const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const previewCss = `${basePreviewCss}
body{background:#f8fafc;color:#0f172a}.excel-preview{border-color:#e2e8f0}
.excel-preview a{color:#2563eb}.excel-preview th{background:#eff6ff}
.excel-preview code{color:#1e40af;background:#eff6ff}.excel-preview pre code{color:inherit;background:none}
.excel-preview .preview-eyebrow{color:#2563eb}.excel-preview .preview-banner{background:#eff6ff;color:#1e40af;border-color:#bfdbfe}
`;
const transpile = (source, fileName) => ts.transpileModule(source, { fileName, compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
} }).outputText;
function load(root, file, mocks = {}) {
  const allowed = new Set(['react', 'react/jsx-runtime', 'lucide-react', 'react-markdown', 'remark-gfm', 'rehype-raw', 'rehype-sanitize', 'rehype-slug']);
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
  task = await import('./_add-claude-code-windows-post.mjs');
  check('metadata, hidden defaults, primary sources, links and original image dimensions', () => { report = task.validateArticle(); });
  check('exact shell-labeled snippets and installer/security boundaries', () => {
    assert.equal(task.codeBlocks.filter(block => block[1] === 'powershell').length, 9);
    assert.equal(task.codeBlocks.filter(block => block[1] === 'bash').length, 1);
    assert.equal(task.codeBlocks[8][2].trim(), 'irm https://claude.ai/install.ps1 | iex');
    for (const block of task.codeBlocks) assert(!/Set-ExecutionPolicy|setx\s|Remove-Item|Rename-Item|SetEnvironmentVariable|ANTHROPIC_API_KEY|dangerously|\b(?:sudo|curl)\b/.test(block[2]));
    assert(task.codeBlocks[0][2].includes('where.exe claude'));
    assert(task.codeBlocks[1][2].startsWith('& "'));
    assert(task.codeBlocks[3][2].includes('$env:Path = $previousPath'));
    assert(task.codeBlocks[5][2].includes('$LASTEXITCODE -ne 0'));
    assert(task.content.includes('alternative invocation') && task.content.includes('missing link alone'));
  });
  const images = load(task.root, 'src/lib/image-seo.ts', { '@/lib/config': { siteConfig } });
  const copy = load(task.root, 'src/components/copy-button.tsx');
  const { MarkdownRenderer } = load(task.root, 'src/components/markdown-renderer.tsx', {
    '@/lib/config': { siteConfig }, '@/lib/image-seo': images, '@/components/copy-button': copy,
    '@/components/code-playground': { CodePlayground() { throw new Error('Shell examples must not become executable playgrounds'); } },
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
  check('four contextual internal links and safe external sources render unchanged', () => {
    const links = all(dom, node => node.name === 'a');
    assert.deepEqual(links.filter(node => node.attribs.href?.startsWith('/')).map(node => node.attribs.href), task.internalLinks);
    for (const link of links.filter(node => node.attribs.href?.startsWith('https://') && !node.attribs.href.startsWith(siteConfig.url))) {
      assert.equal(link.attribs.target, '_blank'); assert(link.attribs.rel.includes('noopener')); assert(link.attribs.rel.includes('noreferrer'));
    }
  });
  check('two diagnostic tables and ten literal copy-ready shell examples', () => {
    const tables = all(dom, node => node.name === 'table'); assert.equal(tables.length, 2);
    for (const table of tables) assert.equal(table.parent.attribs.class, 'table-wrap comparison-table');
    assert.equal(all(dom, node => node.name === 'th').length, 6);
    assert.equal(all(dom, node => node.name === 'tr').length, 16);
    assert.deepEqual(all(dom, node => node.name === 'pre').map(node => DomUtils.textContent(node)), task.codeBlocks.map(block => block[2]));
    assert.equal(all(dom, node => node.name === 'button' && node.attribs['aria-label'] === 'Copy code').length, 10);
  });
  const routeSource = readFileSync(resolve(task.root, 'src/app/blog/[slug]/page.tsx'), 'utf8');
  const routeTree = ts.createSourceFile('page.tsx', routeSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const faqs = all(dom, node => node.name === 'details');
  check('five visible FAQs exactly match the real route extractor and FAQPage schema', () => {
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
  check('SQL is insert-only and guards hidden state, category, absent slug and all prior editorial rows', () => {
    const tag = (parts, ...parameters) => ({ text: parts.join('?'), parameters });
    const insert = task.insertQuery(tag), reads = task.readQueries(tag);
    assert.equal(reads.length, 5); assert(reads.every(query => !/\bINSERT|\bUPDATE|\bDELETE/i.test(query.text)));
    assert.equal((insert.text.match(/INSERT INTO posts/g) ?? []).length, 1);
    assert(!/\b(?:UPDATE|DELETE|DROP|TRUNCATE|CONFLICT)\b/i.test(insert.text));
    assert.match(insert.text, /false, false, NULL/); assert.match(insert.text, /inventory\.editorial_hash = \?/);
    assert.match(insert.text, /inventory\.total_posts = \?/); assert.match(insert.text, /NOT EXISTS/);
    assert.match(insert.text, /AND published\) = \?/);
    for (const value of [task.article.content, task.article.slug, task.baseline.editorial_hash]) assert(insert.parameters.includes(value));
    const category = [{ id: task.ledger.targeting.categoryId, name: task.ledger.targeting.category }];
    const targets = task.blogLinks.map((url, index) => ({ id: index + 1, slug: url.slice(6), published: true }));
    const protectedRows = task.ledger.inventory.protectedDrafts.map(draft => ({ id: draft.id, slug: draft.slug, published: false, featured: false, scheduled_at: null, content_md5: draft.contentMd5 }));
    const state = [[{ ...task.baseline }], [], category, targets, protectedRows];
    assert.equal(task.assertState(state), null);
    assert.throws(() => task.assertState([[{ ...task.baseline, total_posts: 0 }], ...state.slice(1)]));
    assert.throws(() => task.assertState([state[0], [], [], targets, protectedRows]));
    assert.throws(() => task.assertState([state[0], [], category, targets.map(row => ({ ...row, published: false })), protectedRows]));
    assert.throws(() => task.assertState([state[0], [], category, targets, protectedRows.map(row => ({ ...row, published: true }))]));
    const saved = { ...task.article, id: 99001, category_id: task.ledger.targeting.categoryId };
    task.assertSaved(saved); assert.throws(() => task.assertSaved({ ...saved, published: true }));
    assert.throws(() => task.assertSaved({ ...saved, content: 'different' }));
    assert.throws(() => task.assertSaved({ ...saved, scheduled_at: new Date() }));
  });
  const metadataNode = routeTree.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'generateMetadata');
  let post = { title: task.article.title, slug: task.article.slug, content: task.content, excerpt: task.article.excerpt,
    published: true, author: task.article.author, coverImage: task.article.cover_image, metaTitle: task.article.meta_title,
    metaDescription: task.article.meta_description, keywords: task.article.keywords,
    createdAt: new Date('2026-10-09T00:00:00Z'), updatedAt: new Date('2026-10-09T00:00:00Z') };
  const fakeDb = { select: () => ({ from: () => ({ where: () => ({ limit: async () => post ? [post] : [] }) }) }) };
  const metadata = new Function('db', 'posts', 'eq', 'siteConfig', 'getPostSeoImages', `${transpile(metadataNode.getText(routeTree).replace(/^export\s+/, ''), 'metadata.ts')}; return generateMetadata;`)(fakeDb, { slug: 'slug' }, () => true, siteConfig, images.getPostSeoImages);
  const publicMetadata = await metadata({ params: Promise.resolve({ slug: task.article.slug }) });
  check('published metadata uses intended title, canonical and original share images', () => {
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
  check('hidden and absent article metadata are noindex', () => {
    assert.deepEqual(hidden, { title: 'Post Not Found', robots: { index: false, follow: true } }); assert.deepEqual(absent, hidden);
  });
  let body = rendered.replace(/<link\b(?=[^>]*\brel="preload")(?=[^>]*\bas="image")[^>]*\/?\s*>/gi, '');
  const localImages = task.imageUrls.map(url => `data:image/png;base64,${readFileSync(resolve(task.root, 'public', new URL(url).pathname.slice(1))).toString('base64')}`);
  for (const [index, url] of task.imageUrls.entries()) body = body.replaceAll(`src="${escape(url)}"`, `src="${localImages[index]}"`);
  body = body.replaceAll('<button ', '<button disabled title="Unhydrated preview control" ');
  preview = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; connect-src 'none'; base-uri 'none'; form-action 'none'"><title>${escape(task.article.title)} — unpublished preview</title><style>${previewCss}</style></head><body><main class="excel-preview"><p class="preview-banner">Unpublished static review with the actual MarkdownRenderer. Not the full Next page; copy controls are not hydrated.</p><p class="preview-eyebrow">BYTEVERSE / TECH GUIDES</p><h1>${escape(task.article.title)}</h1><p>Ali Rehman · ${escape(task.article.reading_time)} · October 9, 2026</p><img class="preview-cover" src="${localImages[0]}" width="1200" height="675" alt="Claude Code not recognized on Windows: check the file, then PATH">${body}</main></body></html>`;
  check('static preview embeds all three images without executable content or remote resources', () => {
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
  const directory = await mkdtemp(resolve(tmpdir(), 'byteverse-claude-windows-article-'));
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
      const dimensions = await page.evaluate(() => ({ viewport: innerWidth, page: document.documentElement.scrollWidth, images: document.images.length, faqs: document.querySelectorAll('details[open]').length, tables: document.querySelectorAll('table').length, examples: document.querySelectorAll('pre').length }));
      assert(dimensions.page <= width + 1); assert.equal(dimensions.faqs, 5); assert.equal(dimensions.tables, 2); assert.equal(dimensions.examples, 10);
      assert.deepEqual(requests, []); assert.deepEqual(errors, []);
      for (const table of await page.locator('.table-wrap').all()) {
        assert((await table.boundingBox()).width <= width);
        assert(await table.evaluate(node => node.scrollWidth >= node.clientWidth));
      }
      await page.locator('h1').scrollIntoViewIfNeeded(); await page.screenshot({ path: resolve(directory, `${width}-article.png`) });
      await page.getByRole('heading', { name: '1. Check the file and the command separately' }).scrollIntoViewIfNeeded();
      await page.screenshot({ path: resolve(directory, `${width}-commands.png`) });
      measurements.push(dimensions); await context.close();
    }
  } finally { await browser.close(); }
  console.log(JSON.stringify({ browserPreview: 'Static actual-renderer preview, not a full Next production page', directory, measurements }, null, 2));
}
console.log(JSON.stringify({ ...report, offlineGroups: checks.length, status: 'passed', actualClaudeExecution: false, databaseOrEnvironmentLoaded: false }, null, 2));