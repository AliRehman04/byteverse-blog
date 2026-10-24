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

// Editorial validation for the Cursor "Planning next moves" article. Offline by default; --links performs public GETs only.
const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
const read = path => readFileSync(resolve(root, path), 'utf8').replace(/\r\n?/g, '\n').trim();
const ledger = JSON.parse(read('docs/cursor-planning-next-moves-keywords-2026-10-24.json'));
const article = read(`scripts/content/${ledger.slug}.md`);
const mode = process.argv[2] ?? '--offline';
assert(process.argv.length <= 3 && ['--offline', '--links'].includes(mode));
const all = (dom, predicate) => DomUtils.findAll(predicate, dom.children);
const one = (dom, predicate) => { const found = all(dom, predicate); assert.equal(found.length, 1); return found[0]; };
const collapse = text => text.replace(/\s+/g, ' ').trim();
const links = [...article.matchAll(/(?<!!)\[([^\]]+)\]\(([^\s)]+)\)/g)].map(match => match[2]);
const contentSha256 = createHash('sha256').update(article).digest('hex');
const prose = article.split('\n## Sources and Further Reading')[0].replace(/\[([^\]]+)\]\([^\n)]+\)/g, '$1');
const words = (prose.match(/[\p{L}\p{N}]+(?:['’.-][\p{L}\p{N}]+)*/gu) ?? []).length;
function check(name, fn) { fn(); console.log(`PASS: ${name}`); }
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
try {
  check('metadata lengths, body format and evidence limits', () => {
    assert.equal(ledger.slug, 'cursor-agent-stuck-planning-next-moves-2026');
    assert(ledger.targeting.title.length <= 70, 'title');
    assert(ledger.targeting.metaTitle.length <= 70, 'metaTitle');
    assert(ledger.targeting.metaDescription.length <= 160 && ledger.targeting.metaDescription.length >= 120, 'metaDescription');
    assert(ledger.targeting.excerpt.length <= 300 && ledger.targeting.excerpt.length >= 120, 'excerpt');
    assert(!/^# /m.test(article), 'No body H1');
    assert(!/\ufffd|\0|<!--|\bTODO\b|\bTBD\b|!\[/.test(article));
    for (const term of ['No fix here is guaranteed', 'single accounts, not measurements', 'Menu locations change between releases']) assert(article.includes(term), `Missing limit: ${term}`);
    assert(!/100%|guaranteed fix|always works|every user/i.test(prose));
    for (const key of ['monthlyVolume', 'keywordDifficulty', 'rankingProbability', 'trafficForecast']) assert.equal(ledger.metrics[key], null);
    const autocomplete = JSON.parse(read('docs/content-research/2026-10-24-autocomplete.json'));
    assert.equal(autocomplete.observations.length, ledger.keywordResearch.seedsChecked);
    assert.equal(autocomplete.observations.filter(row => row.suggestions?.length).length, ledger.keywordResearch.nonemptySeeds);
    assert.equal(words, ledger.validation.proseWords, `prose words ${words}`);
    assert.equal(`${Math.ceil(words / 220)} min read`, ledger.targeting.readingTime);
    assert.equal(contentSha256, ledger.validation.contentSha256);
    for (const draft of ledger.inventory.previousLocalDrafts) assert.equal(createHash('sha256').update(read(`scripts/content/${draft.slug}.md`)).digest('hex'), draft.contentSha256, draft.slug);
  });
  const siteConfig = { url: ledger.website, name: 'ByteVerse' };
  const images = load('src/lib/image-seo.ts', { '@/lib/config': { siteConfig } });
  const copy = load('src/components/copy-button.tsx');
  const { MarkdownRenderer } = load('src/components/markdown-renderer.tsx', { '@/lib/config': { siteConfig },
    '@/lib/image-seo': images, '@/components/copy-button': copy,
    '@/components/code-playground': { CodePlayground() { throw new Error('No runnable article examples expected'); } } });
  const html = renderToStaticMarkup(createElement(MarkdownRenderer, { content: article, currentSlug: ledger.slug }));
  const dom = parseDocument(html);
  check('actual renderer output: one table, safe links, exact internal/external destinations', () => {
    assert.equal(all(dom, node => node.name === 'table').length, 1);
    assert.equal(all(dom, node => ['h1', 'img', 'iframe', 'script'].includes(node.name)).length, 0);
    assert.equal(all(dom, node => node.name === 'h2').length, [...article.matchAll(/^## /gm)].length);
    const internal = [...new Set(links.filter(url => url.startsWith('/')))].sort();
    assert.deepEqual(internal, [...ledger.internalLinkPlan].sort());
    const renderedInternal = [...new Set(all(dom, node => node.name === 'a' && node.attribs.href.startsWith('/')).map(node => node.attribs.href))].sort();
    for (const href of internal) assert(renderedInternal.includes(href), href);
    const external = [...new Set(links.filter(url => url.startsWith('https://')))].sort();
    assert.deepEqual(external, [...ledger.primarySources.map(source => source.url)].sort());
    for (const link of all(dom, node => node.name === 'a' && node.attribs.href.startsWith('https://'))) assert(link.attribs.rel.includes('noopener'));
    assert(!/javascript:|<script/i.test(html));
  });
  check('five visible FAQs exactly match the current route extraction', () => {
    const route = read('src/app/blog/[slug]/page.tsx');
    const start = route.indexOf('  const faqRegex ='), end = route.indexOf('  // Auto-extract HowTo', start);
    assert(start > 0 && end > start);
    const faqs = new Function('post', `${transpile(route.slice(start, end), 'faq.ts')}; return faqs;`)({ content: article });
    const details = all(dom, node => node.name === 'details'); assert.equal(faqs.length, 5); assert.equal(details.length, 5);
    assert.deepEqual(faqs.map(row => row.question), details.map(node => DomUtils.textContent(one(node, child => child.name === 'summary'))));
    assert.deepEqual(faqs.map(row => collapse(row.answer)), details.map(node => collapse(DomUtils.textContent(one(node, child => child.name === 'p')))));
    assert.deepEqual(faqs.map(row => row.question), ledger.faq);
  });
  console.log(JSON.stringify({ words, readingTime: `${Math.ceil(words / 220)} min read`, contentSha256, titleChars: ledger.targeting.title.length, metaTitleChars: ledger.targeting.metaTitle.length, metaDescriptionChars: ledger.targeting.metaDescription.length }));
} finally { globalThis.fetch = oldFetch; Socket.prototype.connect = oldConnect; hook.deregister(); }

if (mode === '--links') {
  const results = [];
  for (const url of [...ledger.internalLinkPlan.map(path => ledger.website + path), ...ledger.primarySources.map(row => row.url)]) {
    const internal = url.startsWith(ledger.website);
    try {
      const response = await fetch(url, { redirect: internal ? 'manual' : 'follow', headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ByteVerse-link-check' }, signal: AbortSignal.timeout(25000) });
      if (internal) {
        assert.equal(response.status, 200, `HTTP ${response.status}: ${url}`);
        const dom = parseDocument(await response.text());
        assert.equal(one(dom, node => node.name === 'link' && node.attribs.rel === 'canonical').attribs.href, url);
        assert(!/noindex|none/i.test(response.headers.get('x-robots-tag') ?? ''));
        assert(!DomUtils.textContent(dom).includes('Post Not Found'));
      } else await response.body?.cancel();
      results.push({ url, httpStatus: response.status, status: response.status === 200 ? 'passed' : 'non-200; reviewed manually' });
      console.log(`${response.status === 200 ? 'PASS' : 'LIMIT'}: HTTP ${response.status} ${url}`);
    } catch (error) { results.push({ url, status: `failed: ${error.message}` }); console.log(`FAIL: ${url} ${error.message}`); }
  }
  console.log(JSON.stringify(results));
  assert(results.every(row => row.status === 'passed' || row.status.startsWith('non-200')), 'Link failures above');
}
