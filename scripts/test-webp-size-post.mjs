import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire, registerHooks } from 'node:module';
import { Socket } from 'node:net';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { parseDocument, DomUtils } from 'htmlparser2';
import ts from 'typescript';
import { verifyExperiment } from './verify-webp-size-example.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
const read = path => readFileSync(resolve(root, path), 'utf8').replace(/\r\n?/g, '\n').trim();
const article = read('scripts/content/webp-larger-than-jpg.md');
const report = read('docs/content-research/2026-10-18-webp-size-seo-package.md');
const prompts = read('docs/content-research/2026-10-18-webp-size-image-prompts.md');
const ledger = JSON.parse(read('docs/webp-size-keywords-2026-10-18.json'));
const mode = process.argv[2] ?? '--offline';
assert(process.argv.length <= 3 && ['--offline', '--links', '--browser'].includes(mode));
const all = (dom, predicate) => DomUtils.findAll(predicate, dom.children);
const one = (dom, predicate) => { const found = all(dom, predicate); assert.equal(found.length, 1); return found[0]; };
const collapse = text => text.replace(/\s+/g, ' ').trim();
const links = [...article.matchAll(/(?<!!)\[([^\]]+)\]\(([^\s)]+)\)/g)].map(match => match[2]);
const contentSha256 = createHash('sha256').update(article).digest('hex');
const prose = article.split('\n## Sources and Further Reading')[0].replace(/\[([^\]]+)\]\([^\n)]+\)/g, '$1');
const words = (prose.match(/[\p{L}\p{N}]+(?:['’.-][\p{L}\p{N}]+)*/gu) ?? []).length;
const checks = [];
const linkResults = [];
function check(name, fn) { fn(); checks.push(name); console.log(`PASS: ${name}`); }
function transpile(source, fileName) {
  const result = ts.transpileModule(source, { fileName, reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } });
  assert(!result.diagnostics?.length);
  return result.outputText;
}
function load(path, overrides = {}) {
  const allowed = new Set(['react', 'react/jsx-runtime', 'lucide-react', 'react-markdown', 'remark-gfm', 'rehype-raw', 'rehype-sanitize', 'rehype-slug']);
  const record = { exports: {} };
  new Function('require', 'module', 'exports', transpile(read(path), path))(name => {
    if (Object.hasOwn(overrides, name)) return overrides[name];
    assert(allowed.has(name), `Unexpected renderer dependency: ${name}`);
    return require(name);
  }, record, record.exports);
  return record.exports;
}

const oldFetch = globalThis.fetch, oldConnect = Socket.prototype.connect;
const blocked = () => { throw new Error('Network forbidden during offline editorial validation'); };
globalThis.fetch = blocked; Socket.prototype.connect = blocked;
const hook = registerHooks({ resolve(specifier, context, next) {
  assert(!/^(?:@next\/env|@neondatabase\/serverless|dotenv|pg|@\/lib\/db)(?:\/|$)/.test(specifier), 'Environment/database imports forbidden');
  return next(specifier, context);
} });
let html;
try {
  check('14 ordered deliverables with the identical complete article', () => {
    assert.deepEqual([...report.matchAll(/^## (\d+)\. /gm)].map(match => Number(match[1])), Array.from({ length: 14 }, (_, index) => index + 1));
    const marker = `\n# ${ledger.targeting.title}\n`;
    const start = report.indexOf(marker), end = report.indexOf('\n## 11. Internal linking recommendations', start);
    assert(start > 0 && end > start);
    assert.equal(report.slice(start + marker.length, end).trim(), article);
    assert.equal(ledger.candidateComparison.alternatives.length, 4);
  });
  check('metadata, evidence limits and previous drafts unchanged', () => {
    assert.equal(ledger.slug, 'webp-larger-than-jpg');
    assert(ledger.targeting.metaTitle.length <= 70 && ledger.targeting.metaDescription.length <= 160);
    assert.equal(ledger.keywordResearch.observations.length, ledger.keywordResearch.seedsChecked);
    assert.equal(ledger.keywordResearch.observations.filter(row => row.suggestions?.length).length, ledger.keywordResearch.nonemptySeeds);
    for (const key of ['monthlyVolume', 'keywordDifficulty', 'rankingProbability', 'trafficForecast']) assert.equal(ledger.metrics[key], null);
    assert(!/^# /m.test(article));
    assert(!/\ufffd|\0|<!--|\bTODO\b|\bTBD\b/.test(article));
    for (const term of ['not a representative image benchmark', 'not a camera original', 'does not expose a lossless WebP switch', 'not a live-tool performance test']) assert(article.includes(term), `Missing limit: ${term}`);
    for (const draft of ledger.inventory.protectedDrafts) assert(!article.includes(draft.slug));
    for (const draft of ledger.inventory.previousLocalDrafts) {
      assert.equal(createHash('sha256').update(read(`scripts/content/${draft.slug}.md`)).digest('hex'), draft.contentSha256);
    }
    if (ledger.validation.contentSha256) assert.equal(contentSha256, ledger.validation.contentSha256);
    if (ledger.inventory.duplicateAudit) assert.equal(contentSha256, ledger.inventory.duplicateAudit.contentSha256);
  });
  check('three image prompts without published or broken image assets', () => {
    assert.equal([...prompts.matchAll(/^## [123]\. /gm)].length, 3);
    assert.equal([...prompts.matchAll(/^\*\*Prompt:\*\*/gm)].length, 3);
    for (const name of ledger.images.proposedFilenames) assert(prompts.includes(name));
    assert(prompts.includes('Prompts only: no illustration files generated or uploaded'));
    assert(prompts.includes('must not invent, round or interpolate'));
    assert(!/!\[/.test(article));
  });
  const measured = await verifyExperiment();
  check('all 18 encodes reproduce the recorded six-input measurement matrix', () => {
    assert.equal(measured.decodedOutputs, 18); assert.equal(measured.exactLosslessChecks, 6);
    assert.equal(measured.imageFilesWritten, 0); assert(measured.originalsUnchanged);
    assert.equal(measured.existingAssetSha256, ledger.experiment.existingAssetSha256);
    const rows = measured.records.map(row => ({ fixture: row.fixture, jpegQuality: row.jpegQuality, jpeg: row.sourceBytes,
      ...Object.fromEntries(row.results.map(output => [output.setting, output.bytes])) }));
    assert.deepEqual(rows, ledger.experiment.measurements);
    assert.equal(measured.sharp, ledger.experiment.sharp); assert.equal(measured.libwebp, ledger.experiment.libwebp);
  });
  const siteConfig = { url: ledger.website, name: 'ByteVerse' };
  const images = load('src/lib/image-seo.ts', { '@/lib/config': { siteConfig } });
  const copy = load('src/components/copy-button.tsx');
  const { MarkdownRenderer } = load('src/components/markdown-renderer.tsx', { '@/lib/config': { siteConfig },
    '@/lib/image-seo': images, '@/components/copy-button': copy,
    '@/components/code-playground': { CodePlayground() { throw new Error('No runnable article examples expected'); } } });
  html = renderToStaticMarkup(createElement(MarkdownRenderer, { content: article, currentSlug: ledger.slug }));
  const dom = parseDocument(html);
  check('actual renderer preserves both tables, exact sizes and safe links', () => {
    const tables = all(dom, node => node.name === 'table'); assert.equal(tables.length, 2);
    const cells = all(tables[1], node => node.name === 'tr').slice(1).map(row => all(row, node => node.name === 'td').slice(1).map(node => Number(DomUtils.textContent(node).replaceAll(',', ''))));
    assert.deepEqual(cells, ledger.experiment.measurements.map(row => [row.jpeg, row.lossy80, row.lossy95, row.lossless]));
    assert.equal(all(dom, node => ['h1', 'img', 'iframe', 'script', 'pre'].includes(node.name)).length, 0);
    assert.deepEqual(links.filter(url => url.startsWith('/')), ledger.internalLinkPlan);
    assert.deepEqual(all(dom, node => node.name === 'a' && node.attribs.href.startsWith('/')).map(node => node.attribs.href), ledger.internalLinkPlan);
    assert.deepEqual([...new Set(links.filter(url => url.startsWith('https://')))].sort(), [...ledger.primarySources.map(source => source.url), ...ledger.provenanceSources].sort());
    for (const link of all(dom, node => node.name === 'a' && node.attribs.href.startsWith('https://'))) assert(link.attribs.rel.includes('noopener'));
  });
  check('five visible FAQs exactly match the current route extraction', () => {
    const route = read('src/app/blog/[slug]/page.tsx');
    const start = route.indexOf('  const faqRegex ='), end = route.indexOf('  // Auto-extract HowTo', start);
    assert(start > 0 && end > start);
    const faqs = new Function('post', `${transpile(route.slice(start, end), 'faq.ts')}; return faqs;`)({ content: article });
    const details = all(dom, node => node.name === 'details'); assert.equal(faqs.length, 5); assert.equal(details.length, 5);
    assert.deepEqual(faqs.map(row => row.question), details.map(node => DomUtils.textContent(one(node, child => child.name === 'summary'))));
    assert.deepEqual(faqs.map(row => collapse(row.answer)), details.map(node => collapse(DomUtils.textContent(one(node, child => child.name === 'p')))));
  });
} finally { globalThis.fetch = oldFetch; Socket.prototype.connect = oldConnect; hook.deregister(); }

if (mode === '--links') {
  for (const url of [...ledger.internalLinkPlan.map(path => ledger.website + path), ...ledger.primarySources.map(row => row.url), ...ledger.provenanceSources]) {
    const internal = url.startsWith(ledger.website);
    const response = await fetch(url, { redirect: internal ? 'manual' : 'follow', signal: AbortSignal.timeout(20000) });
    if (ledger.provenanceSources.includes(url) && response.status === 403) {
      await response.body?.cancel();
      linkResults.push({ url, httpStatus: 403, status: 'blocked; page provenance requires separate review' });
      console.log(`LIMIT: provenance page blocked this HTTP client (403): ${url}`);
      continue;
    }
    assert.equal(response.status, 200, `HTTP failure: ${url}`);
    if (internal) {
      const dom = parseDocument(await response.text());
      assert.equal(one(dom, node => node.name === 'link' && node.attribs.rel === 'canonical').attribs.href, url);
      assert(!/noindex|none/i.test(response.headers.get('x-robots-tag') ?? ''));
      assert(!all(dom, node => node.name === 'meta' && /robots|googlebot/.test(node.attribs.name ?? '') && /noindex|none/i.test(node.attribs.content ?? '')).length);
      assert(!DomUtils.textContent(dom).includes('Post Not Found'));
    } else await response.body?.cancel();
    linkResults.push({ url, httpStatus: 200, status: 'passed' });
    console.log(`PASS: HTTP 200 ${url}`);
  }
}
if (mode === '--browser') {
  const { chromium, expect } = await import('@playwright/test');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const title = ledger.targeting.title.replaceAll('&', '&amp;').replaceAll('<', '&lt;');
    const preview = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta http-equiv="Content-Security-Policy" content="default-src 'none';style-src 'unsafe-inline';base-uri 'none'"><title>${title}</title><style>body{margin:0;font:17px/1.7 system-ui;color:#0f172a;background:#f8fafc}main{max-width:860px;margin:auto;background:white;padding:24px}h1{font-size:clamp(1.8rem,4vw,2.5rem);line-height:1.2}h2{font-size:1.45rem;margin-top:2em;line-height:1.3}h3{font-size:1.1rem}p,li{overflow-wrap:anywhere}a{color:#1d4ed8}.table-wrap{overflow:auto}table{min-width:620px;border-collapse:collapse}th,td{border:1px solid #cbd5e1;padding:10px;text-align:left}svg{max-width:20px;max-height:20px}details{border:1px solid #cbd5e1;margin:12px 0;padding:12px;border-radius:8px}summary{font-weight:600;cursor:pointer}@media(max-width:600px){body{font-size:16px}main{padding:16px}}</style></head><body><main><p>Private static editorial preview, not full website hydration.</p><h1>${title}</h1>${html}</main></body></html>`;
    for (const width of [320, 390, 1280]) {
      const context = await browser.newContext({ offline: true, viewport: { width, height: 900 }, reducedMotion: 'reduce' });
      const page = await context.newPage(), requests = [];
      await context.route('**/*', route => { requests.push(route.request().url()); return route.abort(); });
      await page.setContent(preview);
      await expect(page.locator('h1')).toHaveCount(1);
      for (const details of await page.locator('details').all()) { await details.locator('summary').click(); await expect(details).toHaveAttribute('open'); }
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      assert.deepEqual(requests, []);
      console.log(`PASS: ${width}px static article, readable scrollable tables, five working FAQs, no network`);
      await context.close();
    }
  } finally { await browser.close(); }
}
console.log(JSON.stringify({ status: linkResults.some(result => result.httpStatus !== 200) ? 'passed-with-provenance-http-limits' : 'passed', mode, groups: checks.length, words, readingMinutes: Math.ceil(words / 220),
  titleCharacters: ledger.targeting.metaTitle.length, descriptionCharacters: ledger.targeting.metaDescription.length,
  tables: 2, faqs: 5, measuredEncodes: 18, losslessChecks: 6, imagePrompts: 3, generatedIllustrations: 0, contentSha256,
  linkResults,
  databaseLoaded: false, publication: false, limits: 'Controlled encodes and static rendering, not a representative/perceptual benchmark or full Next hydration.' }, null, 2));