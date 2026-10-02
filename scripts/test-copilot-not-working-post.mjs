import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { parseDocument, DomUtils } from 'htmlparser2';
import ts from 'typescript';
import { article, root, validateArticle } from './_add-copilot-not-working-post.mjs';

// Actual renderer and metadata function, with synthetic DB records only.
// --preview serves the rendered draft on loopback. No env, DB or external requests.
const args = process.argv.slice(2);
assert(args.length <= 1 && args.every(arg => arg === '--preview'));
const require = createRequire(import.meta.url);
const siteConfig = { url: 'https://www.byteverse.fyi', name: 'ByteVerse' };
function load(path, mocks = {}) {
  const source = readFileSync(resolve(root, path), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    fileName: path,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  });
  const loadedModule = { exports: {} };
  const localRequire = name => {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    assert(!name.startsWith('@/'), `Unexpected app import: ${name}`);
    return require(name);
  };
  new Function('require', 'module', 'exports', outputText)(localRequire, loadedModule, loadedModule.exports);
  return loadedModule.exports;
}

const imageSeo = load('src/lib/image-seo.ts', { '@/lib/config': { siteConfig } });
const copyButton = load('src/components/copy-button.tsx');
const { MarkdownRenderer } = load('src/components/markdown-renderer.tsx', {
  '@/lib/config': { siteConfig }, '@/lib/image-seo': imageSeo,
  '@/components/copy-button': copyButton,
  '@/components/code-playground': { CodePlayground() { throw new Error('This article has no executable browser playground'); } },
});
const findAll = (doc, predicate) => DomUtils.findAll(predicate, doc.children);
const originalFetch = globalThis.fetch;
let rendered;
globalThis.fetch = () => { throw new Error('Unexpected external request in article-rendering tests'); };
try {
  console.log('Content:', JSON.stringify(validateArticle()));
  rendered = renderToStaticMarkup(createElement(MarkdownRenderer, { content: article.content, currentSlug: article.slug }));
  const doc = parseDocument(rendered);
  const headings = findAll(doc, node => /^h[1-6]$/.test(node.name || ''));
  assert(!headings.some(node => node.name === 'h1'));
  const ids = headings.map(node => node.attribs.id);
  assert(ids.every(Boolean) && ids.length === new Set(ids).size, 'Heading IDs must be unique');
  const faqs = findAll(doc, node => node.name === 'details');
  assert.equal(faqs.length, 8);
  const links = findAll(doc, node => node.name === 'a');
  const internal = links.filter(node => node.attribs.href?.startsWith('/'));
  assert.equal(internal.length, 4, 'Rendered internal links must not be duplicated or mangled');
  for (const link of links.filter(node => node.attribs.href?.startsWith('https://'))) {
    assert.equal(link.attribs.target, '_blank');
    assert(link.attribs.rel.includes('noopener') && link.attribs.rel.includes('noreferrer'));
  }
  assert.equal(findAll(doc, node => node.name === 'table').length, 1);
  assert.equal(findAll(doc, node => node.name === 'img').length, 4);
  const figures = findAll(doc, node => node.name === 'figure');
  assert.equal(figures.length, 4);
  for (const figure of figures) {
    assert.equal(figure.attribs.itemtype, 'https://schema.org/ImageObject');
    const props = DomUtils.findAll(node => Boolean(node.attribs?.itemprop), figure.children).map(node => node.attribs.itemprop);
    for (const expected of ['creator', 'creditText', 'copyrightNotice', 'license', 'acquireLicensePage']) assert(props.includes(expected));
  }
  const codeBlocks = findAll(doc, node => node.name === 'pre').map(node => DomUtils.textContent(node).trimEnd());
  const rawBlocks = [...article.content.matchAll(/^```\w+\n([\s\S]*?)^```/gm)].map(match => match[1].trimEnd());
  assert.deepEqual(codeBlocks, rawBlocks, 'Every rendered code sample must preserve exact characters');
  assert(!findAll(doc, node => ['script', 'iframe'].includes(node.name)).length);

  // Extract the actual route's FAQ loop rather than a separate schema algorithm.
  const pageSource = readFileSync(resolve(root, 'src/app/blog/[slug]/page.tsx'), 'utf8');
  const start = pageSource.indexOf('  const faqRegex =');
  const end = pageSource.indexOf('  // Auto-extract HowTo', start);
  assert(start >= 0 && end > start);
  const faqCode = ts.transpileModule(pageSource.slice(start, end), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const faqPairs = new Function('post', `${faqCode}; return faqs;`)({ content: article.content });
  const questions = faqs.map(node => DomUtils.textContent(DomUtils.findOne(child => child.name === 'summary', node.children, true)));
  assert.deepEqual(faqPairs.map(pair => pair.question), questions);
  assert(faqPairs.every(pair => pair.answer.length > 10 && !/https?:\/\//.test(pair.answer)), 'FAQ answer must not contain image/source URLs');

  const tree = ts.createSourceFile('page.tsx', pageSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const metadataNode = tree.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'generateMetadata');
  assert(metadataNode);
  const metadataCode = ts.transpileModule(metadataNode.getText(tree).replace(/^export\s+/, ''), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const post = {
    title: article.title, slug: article.slug, content: article.content, excerpt: article.excerpt,
    published: true, author: article.author, coverImage: article.cover_image,
    metaTitle: article.meta_title, metaDescription: article.meta_description, keywords: article.keywords,
    createdAt: new Date('2026-10-02T00:00:00Z'), updatedAt: new Date('2026-10-02T00:00:00Z'),
  };
  const fakeDb = { select: () => ({ from: () => ({ where: () => ({ limit: async () => [post] }) }) }) };
  const generateMetadata = new Function('db', 'posts', 'eq', 'siteConfig', 'getPostSeoImages', `${metadataCode}; return generateMetadata;`)(fakeDb, { slug: 'slug' }, () => true, siteConfig, imageSeo.getPostSeoImages);
  const metadata = await generateMetadata({ params: Promise.resolve({ slug: article.slug }) });
  assert.equal(metadata.title, article.meta_title);
  assert.equal(metadata.description, article.meta_description);
  assert.deepEqual(metadata.alternates, { canonical: `${siteConfig.url}/blog/${article.slug}` });
  assert.equal(metadata.openGraph.images.length, 4);
  assert.equal(metadata.twitter.card, 'summary_large_image');
  post.published = false;
  const draftMetadata = await generateMetadata({ params: Promise.resolve({ slug: article.slug }) });
  assert.equal(draftMetadata.title, 'Post Not Found');
  assert.equal(draftMetadata.robots.index, false);
  console.log(JSON.stringify({ renderer: 'actual MarkdownRenderer', headings: ids.length, visibleFaqs: faqs.length, extractedFaqs: faqPairs.length, routeEmitsFirstFaqs: 5, exactCodeBlocks: codeBlocks.length, internalLinks: internal.length, imageMetadata: figures.length, publishedAndHiddenMetadata: 'passed' }, null, 2));
  console.log('PASS: Content, actual renderer, FAQ extraction and metadata checks. No DB, app env or external requests.');
} finally {
  globalThis.fetch = originalFetch;
}

if (args.includes('--preview')) {
  const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
  const css = `*{box-sizing:border-box}body{margin:0;background:#f5f7f9;color:#15202b;font:17px/1.8 system-ui,sans-serif}main{max-width:900px;margin:30px auto;padding:clamp(18px,4vw,52px);background:white;border:1px solid #e2e8f0;border-radius:18px;min-width:0}.banner{font-size:13px;color:#795500;background:#fff8db;border:1px solid #edd992;border-radius:8px;padding:12px 16px}.eyebrow{font-size:12px;letter-spacing:2px;color:#087969;font-weight:700;margin-top:32px}h1{font-size:clamp(28px,4vw,43px);line-height:1.18;letter-spacing:-1px;margin:10px 0 16px}h2{font-size:27px;line-height:1.3;letter-spacing:-.45px;margin:46px 0 15px}h3{font-size:21px;line-height:1.4;margin:30px 0 12px}.byline{font-size:14px;color:#617084}.cover{width:100%;height:auto;border-radius:12px;margin:28px 0}.blog-content{min-width:0}p{margin:0 0 22px}a{color:#087b69;text-underline-offset:3px;overflow-wrap:anywhere}a svg{height:12px;width:12px;margin-left:4px}figure{margin:34px 0}figure img{display:block;width:100%;height:auto;border-radius:12px}figcaption{font-size:13px;color:#62717e;line-height:1.6;text-align:center;margin-top:8px}.table-wrap,div:has(>table){overflow-x:auto;margin:24px 0;border:1px solid #dfe6eb;border-radius:10px}table{border-collapse:collapse;width:100%;min-width:590px;font-size:14px}th,td{padding:14px;text-align:left;border-bottom:1px solid #dfe6eb;vertical-align:top}th{background:#eff7f5}td:first-child{font-weight:600}pre{margin:0!important;padding:18px;overflow:auto;background:#101923!important;color:#dfebf2;line-height:1.6;font-size:13px;border-radius:10px;max-width:100%}pre code{padding:0;background:none;color:inherit;white-space:pre}code{font:14px/1.6 ui-monospace,monospace;background:#f0f4f6;padding:2px 5px;border-radius:4px;overflow-wrap:anywhere}.group.relative{position:relative;margin:24px 0;background:#101923;border-radius:10px;overflow:hidden}.group.relative>div:first-child{font:12px/1.4 ui-monospace,monospace;color:#9db1c0;padding:9px 18px;background:#192633}.group.relative>button{display:none}details{border:1px solid #dfe6eb;border-radius:10px;padding:12px 16px;margin:12px 0;background:#fafcfc}summary{cursor:pointer;font-weight:600}details p{margin:12px 0 0}ul,ol{padding-left:24px}li{margin:6px 0}.footer{font-size:13px;color:#62717e;margin-top:40px}`;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Unpublished Copilot article preview</title><style>${css}</style></head><body><main><div class="banner">Unpublished draft · local review only. Actual article renderer; isolated preview styling, not the full production layout. Copy buttons are not hydrated.</div><div class="eyebrow">BYTEVERSE / CODING</div><h1>${escape(article.title)}</h1><p class="byline">${escape(article.author)} · ${escape(article.reading_time)} · Sources checked October 2, 2026</p><img class="cover" src="${escape(article.cover_image)}" alt="Developer typing on a laptop showing code" width="1400" height="788">${rendered}<p class="footer">Preview does not publish the article or change existing content.</p></main></body></html>`;
  const server = createServer((request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Robots-Tag', 'noindex, nofollow');
    response.setHeader('Referrer-Policy', 'no-referrer');
    if (request.method === 'GET' && request.url === '/') {
      response.setHeader('Content-Type', 'text/html; charset=utf-8');
      response.end(html);
    } else response.writeHead(404).end('Not Found');
  });
  server.listen(3034, '127.0.0.1', () => console.log('LOCAL PREVIEW: http://127.0.0.1:3034/ (no environment, database or external access)'));
}
