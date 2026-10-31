import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire, registerHooks } from 'node:module';
import { Socket } from 'node:net';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { parseDocument, DomUtils } from 'htmlparser2';
import ts from 'typescript';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
const read = path => readFileSync(resolve(root, path), 'utf8').replace(/\r\n?/g, '\n').trim();
const content = read('scripts/content/json-parse-large-numbers-precision.md');
const report = read('docs/content-research/2026-10-14-json-precision-seo-package.md');
const prompts = read('docs/content-research/2026-10-14-json-precision-image-prompts.md');
const ledger = JSON.parse(read('docs/json-precision-keywords-2026-10-14.json'));
const mode = process.argv[2] ?? '--offline';
assert(process.argv.length <= 3 && ['--offline', '--links', '--browser'].includes(mode));
const all = (dom, predicate) => DomUtils.findAll(predicate, dom.children);
const one = (dom, predicate) => { const rows = all(dom, predicate); assert.equal(rows.length, 1); return rows[0]; };
const collapse = text => text.replace(/\s+/g, ' ').trim();
const links = [...content.matchAll(/(?<!!)\[([^\]]+)\]\(([^\s)]+)\)/g)].map(match => match[2]);
const blocks = [...content.matchAll(/^```([a-z]+)\n([\s\S]*?)^```$/gm)];
const code = blocks.filter(block => block[1] === 'javascript').map(block => block[2]);
const prose = content.split('\n## Sources and Further Reading')[0].replace(/```[\s\S]*?```/g, '').replace(/\[([^\]]+)\]\([^\n)]+\)/g, '$1');
const words = (prose.match(/[\p{L}\p{N}]+(?:['’.-][\p{L}\p{N}]+)*/gu) ?? []).length;
const contentSha256 = createHash('sha256').update(content).digest('hex');
const checks = [];
function check(name, fn) { fn(); checks.push(name); console.log(`PASS: ${name}`); }
function transpile(source, fileName) {
  const result = ts.transpileModule(source, { fileName, reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } });
  assert(!result.diagnostics?.length, `Transpile errors: ${fileName}`);
  return result.outputText;
}
const requireAllowed = new Set(['react', 'react/jsx-runtime', 'lucide-react', 'react-markdown', 'remark-gfm', 'rehype-raw', 'rehype-sanitize', 'rehype-slug']);
function load(path, overrides = {}) {
  const record = { exports: {} };
  new Function('require', 'module', 'exports', transpile(read(path), path))(name => {
    if (Object.hasOwn(overrides, name)) return overrides[name];
    assert(requireAllowed.has(name), `Unexpected renderer dependency: ${name}`);
    return require(name);
  }, record, record.exports);
  return record.exports;
}
const oldFetch = globalThis.fetch, oldConnect = Socket.prototype.connect;
const blocked = () => { throw new Error('Network forbidden during offline editorial validation'); };
globalThis.fetch = blocked; Socket.prototype.connect = blocked;
const hook = registerHooks({ resolve(specifier, context, next) {
  assert(!/^(?:@next\/env|@neondatabase\/serverless|dotenv|pg|@\/lib\/db)(?:\/|$)/.test(specifier), 'Database/environment imports forbidden');
  return next(specifier, context);
} });
let html;
try {
  check('14 deliverables in order and exact full-article copy', () => {
    assert.deepEqual([...report.matchAll(/^## (\d+)\. /gm)].map(match => Number(match[1])), Array.from({ length: 14 }, (_, i) => i + 1));
    const marker = `\n# ${ledger.targeting.title}\n`;
    const start = report.indexOf(marker), end = report.indexOf('\n## 11. Internal linking recommendations', start);
    assert(start >= 0 && end > start);
    assert.equal(report.slice(start + marker.length, end).trim(), content);
  });
  check('metadata, six-topic comparison and transparent research limits', () => {
    assert.equal(ledger.slug, 'json-parse-large-numbers-precision');
    assert(ledger.targeting.metaTitle.length <= 70 && ledger.targeting.metaDescription.length <= 160);
    assert.equal(ledger.candidateComparison.alternatives.length, 5);
    assert.equal(ledger.keywordResearch.observations.length, ledger.keywordResearch.seedsChecked);
    assert.equal(ledger.keywordResearch.observations.filter(row => row.suggestions.length).length, ledger.keywordResearch.nonemptySeeds);
    for (const key of ['monthlyVolume', 'keywordDifficulty', 'rankingProbability', 'trafficForecast']) assert.equal(ledger.performanceData[key], null);
    assert(ledger.searchResults.google.includes('unverified'));
    assert.equal(ledger.searchResults.fallbackEngine, 'Bing');
    assert(!/^# /m.test(content));
    assert(!/\bTODO\b|\bTBD\b|\ufffd|\0|<!--/.test(content));
    for (const hidden of ledger.inventory.protectedDrafts) assert(!content.includes(hidden.slug));
    if (ledger.validation.contentSha256) assert.equal(ledger.validation.contentSha256, contentSha256);
    if (ledger.inventory.duplicateAudit) assert.equal(ledger.inventory.duplicateAudit.contentSha256, contentSha256);
  });
  check('three image prompts without fictional image assets', () => {
    assert.equal([...prompts.matchAll(/^## [123]\. /gm)].length, 3);
    assert.equal([...prompts.matchAll(/^\*\*Prompt:\*\*/gm)].length, 3);
    for (const file of ledger.images.proposedFilenames) assert(prompts.includes(file));
    assert(!/!\[/.test(content));
    assert(prompts.includes('No images generated') && prompts.includes('Do not trust generated digits'));
  });
  const expectedLogs = [
    ['9007199254740992', 'false'],
    ['9007199254740992', '{"order_id":9007199254740993}'],
    ['9007199254740994'],
    ['9007199254740993', '2', '7.50'],
    ['9007199254740992'],
    ['{"order_id":"9007199254740993","count":2}'],
  ];
  assert.equal(code.length, expectedLogs.length);
  for (const [index, snippet] of code.entries()) {
    const logs = [];
    const context = vm.createContext({ console: { log: (...values) => logs.push(values.map(String).join(' ')) },
      Response, fetch: blocked, process: undefined, require: undefined }, { codeGeneration: { strings: false, wasm: false } });
    const result = new vm.Script(snippet, { filename: `article-example-${index + 1}` }).runInContext(context, { timeout: 2000 });
    if (result && typeof result.then === 'function') await result;
    assert.deepEqual(logs, expectedLogs[index], `Article example ${index + 1} output differs`);
  }
  check('all six actual JavaScript article snippets produce exact outputs', () => {
    const verifier = read('scripts/verify-json-precision-example.mjs');
    const sourceStart = verifier.indexOf('export function parseNumbersAsText');
    const sourceEnd = verifier.indexOf('export async function exerciseNative', sourceStart);
    assert(code[3].includes(verifier.slice(sourceStart, sourceEnd).trim().replace(/^export /, '')));
    assert.equal(blocks.filter(block => block[1] === 'json').length, 2);
  });
  const siteConfig = { url: ledger.website, name: 'ByteVerse' };
  const imageHelpers = load('src/lib/image-seo.ts', { '@/lib/config': { siteConfig } });
  const copy = load('src/components/copy-button.tsx');
  const playground = load('src/components/code-playground.tsx');
  const { MarkdownRenderer } = load('src/components/markdown-renderer.tsx', { '@/lib/config': { siteConfig },
    '@/lib/image-seo': imageHelpers, '@/components/copy-button': copy, '@/components/code-playground': playground });
  html = renderToStaticMarkup(createElement(MarkdownRenderer, { content, currentSlug: ledger.slug }));
  const dom = parseDocument(html);
  check('actual static renderer preserves links, two tables and eight code blocks', () => {
    assert.equal(all(dom, node => node.name === 'h1').length, 0);
    assert.equal(all(dom, node => node.name === 'table').length, 2);
    assert.equal(all(dom, node => node.name === 'pre').length, 8);
    assert.deepEqual(links.filter(link => link.startsWith('/')), ledger.internalLinkPlan);
    assert.deepEqual(all(dom, node => node.name === 'a' && node.attribs.href.startsWith('/')).map(node => node.attribs.href), ledger.internalLinkPlan);
    assert.deepEqual([...new Set(links.filter(link => link.startsWith('https://')))].sort(), ledger.primarySources.map(row => row.url).sort());
    for (const link of all(dom, node => node.name === 'a' && node.attribs.href.startsWith('https://'))) assert(link.attribs.rel.includes('noopener'));
    assert.equal(all(dom, node => node.name === 'script').length, 0);
    assert.equal(all(dom, node => node.name === 'img').length, 0);
  });
  check('five visible FAQs exactly match current route extraction', () => {
    const route = read('src/app/blog/[slug]/page.tsx');
    const start = route.indexOf('  const faqRegex ='), end = route.indexOf('  // Auto-extract HowTo', start);
    assert(start > 0 && end > start);
    const faqs = new Function('post', `${transpile(route.slice(start, end), 'faq.ts')}; return faqs;`)({ content });
    const details = all(dom, node => node.name === 'details');
    assert.equal(faqs.length, 5); assert.equal(details.length, 5);
    assert.deepEqual(faqs.map(row => row.question), details.map(node => DomUtils.textContent(one(node, child => child.name === 'summary'))));
    assert.deepEqual(faqs.map(row => collapse(row.answer)), details.map(node => collapse(DomUtils.textContent(one(node, child => child.name === 'p')))));
  });
} finally { globalThis.fetch = oldFetch; Socket.prototype.connect = oldConnect; hook.deregister(); }

if (mode === '--links') {
  for (const url of [...ledger.internalLinkPlan.map(path => ledger.website + path), ...ledger.primarySources.map(row => row.url)]) {
    const internal = url.startsWith(ledger.website);
    const response = await fetch(url, { redirect: internal ? 'manual' : 'follow', signal: AbortSignal.timeout(20000) });
    assert.equal(response.status, 200, `HTTP failure: ${url}`);
    if (internal) {
      const dom = parseDocument(await response.text());
      assert.equal(one(dom, node => node.name === 'link' && node.attribs.rel === 'canonical').attribs.href, url);
      assert(!/noindex|none/i.test(response.headers.get('x-robots-tag') ?? ''));
      assert(!all(dom, node => node.name === 'meta' && /robots|googlebot/.test(node.attribs.name ?? '') && /noindex|none/i.test(node.attribs.content ?? '')).length);
      assert(!DomUtils.textContent(dom).includes('Post Not Found'));
    } else await response.body?.cancel();
    console.log(`PASS: HTTP 200 ${url}`);
  }
}
if (mode === '--browser') {
  const { chromium, expect } = await import('@playwright/test');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const safeTitle = ledger.targeting.title.replaceAll('&', '&amp;').replaceAll('<', '&lt;');
    const preview = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'"><title>${safeTitle}</title><style>body{margin:0;background:#f8fafc;color:#0f172a;font:17px/1.7 system-ui}main{max-width:860px;margin:auto;background:white;padding:24px}h1{font-size:clamp(1.8rem,4vw,2.5rem);line-height:1.2}h2{font-size:1.45rem;margin-top:2em;line-height:1.3}h3{font-size:1.1rem}p,li{overflow-wrap:anywhere}a{color:#1d4ed8}.table-wrap{overflow:auto}table{min-width:560px;border-collapse:collapse}th,td{padding:10px;border:1px solid #cbd5e1;text-align:left}pre{overflow-x:auto;background:#0f172a;color:#e2e8f0;padding:16px;max-width:100%;font:13px/1.6 monospace}code{font-family:monospace}svg{max-width:20px;max-height:20px}iframe{display:none}button{display:none}details{margin:12px 0;border:1px solid #cbd5e1;padding:12px;border-radius:8px}summary{cursor:pointer;font-weight:600}@media(max-width:600px){main{padding:16px}body{font-size:16px}}</style></head><body><main><p>Private static editorial preview; not full site hydration.</p><h1>${safeTitle}</h1>${html}</main></body></html>`;
    for (const width of [320, 390, 1280]) {
      const context = await browser.newContext({ offline: true, viewport: { width, height: 900 }, reducedMotion: 'reduce' });
      const page = await context.newPage(), requests = [];
      await context.route('**/*', route => { requests.push(route.request().url()); return route.abort(); });
      await page.setContent(preview);
      await expect(page.locator('h1')).toHaveCount(1);
      for (const item of await page.locator('details').all()) { await item.locator('summary').click(); await expect(item).toHaveAttribute('open'); }
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      assert.deepEqual(requests, []);
      console.log(`PASS: ${width}px static article layout, scrollable tables/code, five FAQs, no external requests`);
      await context.close();
    }
  } finally { await browser.close(); }
}
console.log(JSON.stringify({ status: 'passed', mode, groups: checks.length, words, readingMinutes: Math.ceil(words / 220),
  titleCharacters: ledger.targeting.metaTitle.length, descriptionCharacters: ledger.targeting.metaDescription.length,
  codeBlocks: blocks.length, tables: 2, faqs: 5, imagePrompts: 3, generatedImages: 0, contentSha256,
  databaseLoaded: false, publication: false, limits: 'Static renderer and standalone snippets, not full Next hydration or the live Run button.' }, null, 2));