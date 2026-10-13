import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { createRequire, registerHooks } from 'node:module';
import { Socket } from 'node:net';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { parseDocument, DomUtils } from 'htmlparser2';
import ts from 'typescript';
import sharp from 'sharp';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
const ledger = JSON.parse(readFileSync(resolve(root, 'docs/png-to-jpg-black-background-keywords-2026-10-13.json'), 'utf8'));
const content = readFileSync(resolve(root, 'scripts/content/png-to-jpg-black-background.md'), 'utf8').replace(/\r\n?/g, '\n').trim();
const all = (dom, predicate) => DomUtils.findAll(predicate, dom.children);
const one = (dom, predicate) => { const values = all(dom, predicate); assert.equal(values.length, 1); return values[0]; };
const collapse = value => value.replace(/\s+/g, ' ').trim();
const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const checks = [];
const check = (name, fn) => { fn(); checks.push(name); console.log(`PASS: ${name}`); };
const transpile = (source, fileName) => {
  const result = ts.transpileModule(source, { fileName, reportDiagnostics: true, compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } });
  assert(!result.diagnostics?.some(item => item.category === ts.DiagnosticCategory.Error));
  return result.outputText;
};
function load(file, dependencies = {}) {
  const allowed = new Set(['react', 'react/jsx-runtime', 'lucide-react', 'react-markdown', 'remark-gfm', 'rehype-raw', 'rehype-sanitize', 'rehype-slug']);
  const record = { exports: {} };
  new Function('require', 'module', 'exports', transpile(readFileSync(resolve(root, file), 'utf8'), file))(name => {
    if (Object.hasOwn(dependencies, name)) return dependencies[name];
    assert(allowed.has(name), `Unexpected renderer dependency: ${name}`);
    return require(name);
  }, record, record.exports);
  return record.exports;
}
const mode = process.argv[2] ?? '--offline';
assert(process.argv.length <= 3 && ['--offline', '--browser', '--links'].includes(mode));
const links = [...content.matchAll(/(?<!!)\[([^\]]+)\]\(([^\s)]+)\)/g)].map(match => match[2]);
const imageUrls = [`${ledger.website}/blog/png-jpg-background/cover.png`, ...[...content.matchAll(/!\[[^\]]+\]\((https:\/\/[^\s)]+)\s+"[^"]+"\)/g)].map(match => match[1])];
const contentSha256 = createHash('sha256').update(content).digest('hex');
const prose = content.split('\n## Sources and Image Credits')[0].replace(/!\[[^\]]*\]\([^\n]+\)/g, '').replace(/\[([^\]]+)\]\([^\n)]+\)/g, '$1');
const words = (prose.match(/[\p{L}\p{N}]+(?:['’.-][\p{L}\p{N}]+)*/gu) ?? []).length;
const oldFetch = globalThis.fetch, oldConnect = Socket.prototype.connect;
const blocked = () => { throw new Error('Network forbidden during offline article validation'); };
globalThis.fetch = blocked; Socket.prototype.connect = blocked;
const hook = registerHooks({ resolve(specifier, context, next) {
  assert(!/^(?:@next\/env|@neondatabase\/serverless|dotenv|pg|@\/lib\/db)(?:\/|$)/.test(specifier), 'Environment/database import forbidden');
  return next(specifier, context);
} });
let preview;
try {
  check('complete article, bounded metadata and source-backed technical distinctions', () => {
    assert(!/^#\s/m.test(content));
    assert(!/\bTODO\b|\bTBD\b|\ufffd|\0|<!--/.test(content));
    assert.equal(ledger.slug, 'png-to-jpg-black-background');
    assert(ledger.targeting.metaTitle.length <= 70 && ledger.targeting.metaDescription.length <= 160);
    for (const term of ['checkerboard', 'opaque', 'Alpha thumbnail', 'Windows > Dockable Dialogs > Channels', 'background-colour swatch', 'Quality mode', 'I allow transparent pixels to be flattened for JPG', 'CSS background', 'no general lossless recovery', 'documentation-checked', 'physical phones were not tested']) assert(content.includes(term), `Missing necessary distinction: ${term}`);
    for (const draft of ledger.inventory.protectedDrafts) assert(!content.includes(draft.slug));
    assert.deepEqual(links.filter(url => url.startsWith('/')), ledger.internalLinkPlan);
    assert.deepEqual([...new Set(links.filter(url => url.startsWith('https://')))].sort(), ledger.primarySources.map(source => source.url).sort());
    assert.equal(imageUrls.length, 3);
  });
  check('all 14 deliverables in order with an identical complete article', () => {
    const report = readFileSync(resolve(root, 'docs/content-research/2026-10-13-png-jpg-background-seo-package.md'), 'utf8').replace(/\r\n?/g, '\n');
    assert.deepEqual([...report.matchAll(/^## (\d+)\. /gm)].map(match => Number(match[1])), Array.from({ length: 14 }, (_, index) => index + 1));
    const articleStart = report.indexOf(`\n# ${ledger.targeting.title}\n`);
    const articleEnd = report.indexOf('\n## 11. Internal linking recommendations', articleStart);
    assert(articleStart > 0 && articleEnd > articleStart);
    assert.equal(report.slice(articleStart + `\n# ${ledger.targeting.title}\n`.length, articleEnd).trim(), content);
    assert.equal(ledger.validation.contentSha256, contentSha256);
    assert.equal(ledger.inventory.duplicateAudit.contentSha256, contentSha256);
    assert.equal(ledger.keywordResearch.observations.filter(item => item.suggestions.length).length, ledger.keywordResearch.nonemptySeeds);
  });
  const source = readFileSync(resolve(root, 'src/app/blog/[slug]/page.tsx'), 'utf8');
  const siteConfig = { url: ledger.website, name: 'ByteVerse' };
  const images = load('src/lib/image-seo.ts', { '@/lib/config': { siteConfig } });
  const copy = load('src/components/copy-button.tsx');
  const { MarkdownRenderer } = load('src/components/markdown-renderer.tsx', { '@/lib/config': { siteConfig }, '@/lib/image-seo': images,
    '@/components/copy-button': copy, '@/components/code-playground': { CodePlayground() { throw new Error('No executable examples'); } } });
  const html = renderToStaticMarkup(createElement(MarkdownRenderer, { content, currentSlug: ledger.slug }));
  const dom = parseDocument(html);
  check('actual renderer preserves tables, internal links and safe external links', () => {
    assert.equal(all(dom, node => node.name === 'h1').length, 0);
    const headings = all(dom, node => /^h[23]$/.test(node.name ?? ''));
    assert.equal(new Set(headings.map(node => node.attribs.id)).size, headings.length);
    assert.equal(all(dom, node => node.name === 'table').length, 2);
    assert.deepEqual(all(dom, node => node.name === 'a' && node.attribs.href.startsWith('/')).map(node => node.attribs.href), ledger.internalLinkPlan);
    for (const link of all(dom, node => node.name === 'a' && node.attribs.href.startsWith('https://'))) {
      assert.equal(link.attribs.target, '_blank'); assert(link.attribs.rel.includes('noopener'));
    }
    assert.equal(all(dom, node => ['script', 'iframe', 'object', 'embed', 'form'].includes(node.name)).length, 0);
  });
  check('five visible FAQ answers match the actual route schema extraction', () => {
    const start = source.indexOf('  const faqRegex ='), end = source.indexOf('  // Auto-extract HowTo', start);
    assert(start > 0 && end > start);
    const faqs = new Function('post', `${transpile(source.slice(start, end), 'faq.ts')}; return faqs;`)({ content });
    const details = all(dom, node => node.name === 'details');
    assert.equal(faqs.length, 5); assert.equal(details.length, 5);
    assert.deepEqual(faqs.map(item => item.question), details.map(item => DomUtils.textContent(one(item, node => node.name === 'summary'))));
    assert.deepEqual(faqs.map(item => collapse(item.answer)), details.map(item => collapse(DomUtils.textContent(one(item, node => node.name === 'p')))));
  });
  const encoded = [];
  for (const url of imageUrls) {
    const bytes = readFileSync(resolve(root, 'public', new URL(url).pathname.slice(1)));
    const meta = await sharp(bytes).metadata();
    assert.equal(meta.format, 'png'); assert.equal(meta.width, 1200); assert.equal(meta.height, 675); assert(bytes.length < 350000);
    encoded.push(`data:image/png;base64,${bytes.toString('base64')}`);
  }
  check('three original images with exact SEO dimensions and visible captions', () => {
    const seo = images.getPostSeoImages({ title: ledger.targeting.title, content, coverImage: imageUrls[0] });
    assert.deepEqual(seo.map(item => item.url), imageUrls);
    assert.equal(all(dom, node => node.name === 'figure').length, 2);
    assert.equal(all(dom, node => node.name === 'figcaption').length, 2);
  });
  let body = html.replace(/<link\b(?=[^>]*\brel="preload")(?=[^>]*\bas="image")[^>]*\/?\s*>/gi, '');
  for (const [index, url] of imageUrls.entries()) body = body.replaceAll(`src="${escape(url)}"`, `src="${encoded[index]}"`);
  preview = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; connect-src 'none'; base-uri 'none'"><title>${escape(ledger.targeting.title)}</title><style>body{margin:0;background:#f8fafc;color:#0f172a;font:17px/1.75 system-ui}main{max-width:860px;margin:32px auto;padding:28px;background:white;border:1px solid #e2e8f0;border-radius:16px}h1{font-size:clamp(1.8rem,4vw,2.6rem);line-height:1.2}h2{margin-top:2.2em;line-height:1.3;font-size:1.5rem}h3{line-height:1.4}p,li{overflow-wrap:anywhere}a{color:#1d4ed8}img{display:block;width:100%;height:auto;border-radius:12px}figure{margin:28px 0}figcaption{font-size:.83rem;color:#475569;text-align:center}table{border-collapse:collapse;width:100%;min-width:580px}th,td{border:1px solid #cbd5e1;padding:12px;text-align:left}th{background:#eff6ff}.table-wrap{overflow:auto;max-width:100%}details{border:1px solid #cbd5e1;border-radius:8px;padding:12px;margin:10px 0}summary{cursor:pointer;font-weight:650}code{font-size:.9em;background:#eff6ff;color:#1e40af;padding:2px 4px}.note{background:#eff6ff;padding:12px;color:#1e40af;font-size:.85rem}svg{max-width:24px;max-height:24px}@media(max-width:600px){main{margin:0;border:0;border-radius:0;padding:18px}body{font-size:16px}h2{font-size:1.3rem}}</style></head><body><main><p class="note">Unpublished editorial preview — actual article renderer, not the full hydrated site.</p><h1>${escape(ledger.targeting.title)}</h1><p>Ali Rehman · ${Math.ceil(words / 220)} min read</p><img src="${encoded[0]}" width="1200" height="675" alt="${escape(ledger.images[0].alt)}">${body}</main></body></html>`;
} finally { globalThis.fetch = oldFetch; Socket.prototype.connect = oldConnect; hook.deregister(); }

if (mode === '--links') {
  for (const url of [...ledger.internalLinkPlan.map(path => ledger.website + path), ...ledger.primarySources.map(source => source.url)]) {
    const internal = url.startsWith(ledger.website);
    const response = await fetch(url, { redirect: internal ? 'manual' : 'follow', signal: AbortSignal.timeout(20000) });
    assert.equal(response.status, 200, `Link failed: ${url}`);
    if (internal) {
      const dom = parseDocument(await response.text());
      assert.equal(one(dom, node => node.name === 'link' && node.attribs.rel === 'canonical').attribs.href, url);
      assert(!all(dom, node => node.name === 'meta' && /robots|googlebot/.test(node.attribs.name ?? '') && /noindex/.test(node.attribs.content ?? '')).length);
      assert(!DomUtils.textContent(dom).includes('Post Not Found'));
    } else await response.body?.cancel();
    console.log(`PASS: HTTP ${response.status} ${url}`);
  }
}

if (mode === '--browser') {
  const { chromium, expect } = await import('@playwright/test');
  const directory = await mkdtemp(resolve(tmpdir(), 'byteverse-png-article-'));
  await writeFile(resolve(directory, 'preview.html'), preview);
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const width of [320, 390, 1280]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, offline: true, reducedMotion: 'reduce' });
      const page = await context.newPage(), requests = [], errors = [];
      await context.route('**/*', route => { requests.push(route.request().url()); return route.abort(); });
      page.on('pageerror', error => errors.push(error.message));
      await page.setContent(preview);
      await expect(page.locator('h1')).toHaveCount(1);
      for (const image of await page.locator('img').all()) {
        await image.scrollIntoViewIfNeeded();
        await expect.poll(() => image.evaluate(el => el.complete && el.naturalWidth === 1200)).toBe(true);
      }
      for (const item of await page.locator('details').all()) { await item.locator('summary').click(); await expect(item).toHaveAttribute('open'); }
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      assert.deepEqual(requests, []); assert.deepEqual(errors, []);
      await page.locator('h1').scrollIntoViewIfNeeded();
      await page.screenshot({ path: resolve(directory, `${width}-article.png`) });
      await page.getByRole('heading', { name: 'Why PNG-to-JPG export changes the background', exact: true }).scrollIntoViewIfNeeded();
      await page.screenshot({ path: resolve(directory, `${width}-example.png`) });
      console.log(`PASS: responsive article ${width}px, 3 images, 5 working FAQs, no network`);
      await context.close();
    }
  } finally { await browser.close(); }
  console.log(`PREVIEW: ${directory}`);
}
console.log(JSON.stringify({ status: 'passed', mode, groups: checks.length, words, readingMinutes: Math.ceil(words / 220),
  titleCharacters: ledger.targeting.metaTitle.length, descriptionCharacters: ledger.targeting.metaDescription.length,
  faqs: 5, images: 3, internalLinks: 3, primarySources: ledger.primarySources.length, contentSha256,
  databaseLoaded: false, publication: false }, null, 2));