import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import * as parser from 'htmlparser2';
import ts from 'typescript';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
const modules = new Map();
function load(path) {
  const file = resolve(root, path);
  if (modules.has(file)) return modules.get(file);
  const mod = { exports: {} };
  const code = ts.transpileModule(readFileSync(file, 'utf8'), { fileName: file, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const localRequire = name => {
    if (name === 'htmlparser2') return parser;
    if (name.startsWith('.')) return load(resolve(dirname(file), `${name}.ts`));
    return require(name);
  };
  new Function('require', 'module', 'exports', code)(localRequire, mod, mod.exports);
  modules.set(file, mod.exports);
  return mod.exports;
}
const { EMPTY_META_DRAFT, META_EXAMPLES, buildMetaOutput, parseMetaUrl, isMetaDate, META_IMPORT_LIMIT } = load('src/lib/meta-tags.ts');
const { importMetaHtml } = load('src/lib/meta-tag-import.ts');
const base = { ...EMPTY_META_DRAFT, title: 'A useful title', description: 'A useful summary.', canonical: 'https://example.org/guide', image: 'https://example.org/share.jpg', imageAlt: 'A sample image' };
const build = changes => buildMetaOutput({ ...base, ...changes });
function tags(html) {
  return parser.parseDocument(html).children.filter(n => n.type === 'tag');
}
const find = (html, key, value) => tags(html).find(n => n.attribs[key] === value)?.attribs;

function nextMetadataResolver() {
  const file = require.resolve('next/dist/lib/metadata/resolve-metadata.js');
  const localRequire = createRequire(file);
  const mod = { exports: {} };
  // Next aliases this marker during server compilation; it has no runtime logic.
  new Function('require', 'module', 'exports', readFileSync(file, 'utf8'))(name => name === 'server-only' ? {} : localRequire(name), mod, mod.exports);
  return mod.exports.accumulateMetadata;
}

test('generated Metadata resolves with parent titles and file-based images', async () => {
  const resolveMetadata = nextMetadataResolver();
  const output = build({ image: '', title: 'Exact title' });
  const files = { openGraph: [{ url: 'https://example.org/file-og.png' }], twitter: [{ url: 'https://example.org/file-x.png' }] };
  const parent = { metadataBase: new URL('https://example.org'), title: { default: 'Parent', template: '%s | Parent' } };
  const resolved = await resolveMetadata('/test', [[parent, null], [{}, null], [output.metadata, files]], '/test', { trailingSlash: false, isStaticMetadataRouteFile: false });
  assert.equal(resolved.title.absolute, 'Exact title');
  assert.equal(resolved.openGraph.images[0].url, 'https://example.org/file-og.png');
  assert.equal(resolved.twitter.images[0].url, 'https://example.org/file-x.png');
});

test('Next.js may derive X tags from OG even when explicit Twitter config is disabled', async () => {
  const resolveMetadata = nextMetadataResolver();
  const output = build({ includeTwitter: false });
  assert.equal(output.metadata.twitter, null);
  const resolved = await resolveMetadata('/test', [[output.metadata, null]], '/test', { trailingSlash: false, isStaticMetadataRouteFile: false });
  assert.equal(resolved.twitter.title.absolute, base.title);
  assert.equal(resolved.twitter.images[0].url, base.image);
  assert(readFileSync(resolve(root, 'src/app/tools/meta-tag-generator/meta-tag-generator-tool.tsx'), 'utf8').includes('Next.js can derive X tags'));
});

test('blank fields are omitted, defaults are opt-in, and a real title enables export', () => {
  const empty = buildMetaOutput(EMPTY_META_DRAFT);
  assert.equal(empty.canExport, false);
  assert(!empty.html.includes('<title>'));
  assert(!empty.html.includes('content=""'));
  assert(!empty.html.includes('charset'));
  assert(!empty.html.includes('name="robots"'));
  assert.equal(build().canExport, true);
  const result = build({ includeDefaults: true });
  assert(result.html.includes('<meta charset="UTF-8">'));
  assert(result.html.includes('width=device-width, initial-scale=1'));
  assert.equal(result.tagCount, tags(result.html).length);
});

test('text and URL attributes round-trip special characters without new markup', () => {
  const title = '\"><script>alert(1)</script> & \'quoted\'';
  const result = build({ title, description: title, imageAlt: title, canonical: 'https://example.org/?a=1&b=2' });
  assert.equal(result.errors.length, 0);
  assert(!result.html.includes('<script>'));
  assert.equal(tags(result.html).filter(n => n.name === 'title').length, 1);
  assert.equal(find(result.html, 'name', 'description').content, title);
  assert.equal(find(result.html, 'rel', 'canonical').href, 'https://example.org/?a=1&b=2');
  assert.equal(find(result.html, 'property', 'og:image:alt').content, title);
  assert(!result.next.includes('<script>'));
  assert.equal(result.metadata.title.absolute, title);
});

test('title and description count graphemes and normalize whitespace', () => {
  const result = build({ title: '  👩‍💻  e\u0301\n指南 ', description: 'a\n\tb' });
  assert.equal(result.clean.title, '👩‍💻 e\u0301 指南');
  assert.equal(result.characters.title, 6);
  assert.equal(result.clean.description, 'a b');
  assert.equal(build({ title: 'نیا عنوان' }).canExport, true);
  assert.equal(build({ title: ' ' }).canExport, false);
  assert.equal(build({ title: 'x'.repeat(301) }).canExport, false);
});

test('reject unsafe, incomplete and malformed URLs without fetching them', () => {
  for (const value of ['javascript:alert(1)', 'data:text/html,test', 'file:///etc/passwd', '//example.org', '/relative', 'example.org', 'https://name:pass@example.org', 'https://example.org/a b', 'https://example.org/%XX', 'https://example.org/%2', 'https://example.org/a\\b', 'https://example.org/\npath']) {
    assert(parseMetaUrl(value).error, `Expected invalid: ${value}`);
    const result = build({ canonical: value });
    assert.equal(result.canExport, false);
    assert(!find(result.html, 'rel', 'canonical'));
  }
  assert.equal(parseMetaUrl('https://example.org/%20?q=%F0%9F%92%BB').error, undefined);
  assert.equal(parseMetaUrl('HTTPS://EXAMPLE.ORG/').url, 'https://example.org/');
  assert.equal(parseMetaUrl('').url, '');
  assert(parseMetaUrl('https://example.org/#section', true).error);
  assert.equal(parseMetaUrl('https://example.org/image.svg#view').error, undefined);
  assert.equal(build({ image: 'javascript:alert(1)' }).canExport, false);
  assert.equal(build({ twitterImage: 'https://a:b@example.org/p.png' }).canExport, false);
  assert(build({ canonical: 'http://example.org' }).warnings.some(w => w.field === 'canonical'));
});

test('social defaults, independent overrides and switches are reflected in both exports', () => {
  let result = build();
  assert.equal(result.og.title, base.title);
  assert.equal(result.twitter.description, base.description);
  assert.equal(result.twitter.alt, base.imageAlt);
  result = build({ ogTitle: 'Social title', twitterTitle: 'X title', twitterImage: 'https://example.org/other.jpg' });
  assert.equal(find(result.html, 'property', 'og:title').content, 'Social title');
  assert.equal(find(result.html, 'name', 'twitter:title').content, 'X title');
  assert.equal(result.twitter.alt, '');
  result = build({ includeOpenGraph: false, includeTwitter: false, image: 'bad', twitterImage: 'bad' });
  assert.equal(result.canExport, true);
  assert(!result.html.includes('og:'));
  assert(!result.html.includes('twitter:'));
  assert.equal(result.metadata.openGraph, null);
  assert.equal(result.metadata.twitter, null);
  result = build({ twitterImageAlt: 'Different description', twitterImage: base.image });
  assert.equal(result.twitter.alt, 'Different description');
});

test('dimensions, locale, handles and article dates are validated without inventing values', () => {
  let result = build({ imageWidth: '1200', imageHeight: '630', locale: 'ur_PK', twitterSite: 'my_brand', twitterCreator: '@writer', ogType: 'article', publishedTime: '2026-09-28', modifiedTime: '2026-09-28T09:00:00+05:00' });
  assert.equal(result.errors.length, 0);
  assert.equal(find(result.html, 'property', 'og:image:width').content, '1200');
  assert.equal(find(result.html, 'name', 'twitter:site').content, '@my_brand');
  assert.equal(result.metadata.openGraph.type, 'article');
  assert.equal(result.metadata.openGraph.publishedTime, '2026-09-28');
  assert.equal(result.metadata.openGraph.images[0].width, 1200);
  for (const changes of [{ imageWidth: '1.5' }, { imageHeight: '0' }, { locale: 'en-US' }, { twitterSite: 'https://x.com/name' }, { twitterCreator: 'a'.repeat(16) }, { ogType: 'article', publishedTime: '2026-02-30' }]) {
    assert.equal(build(changes).canExport, false, JSON.stringify(changes));
  }
  assert(isMetaDate('2024-02-29'));
  assert(isMetaDate('2026-09-28T09:00:00.123456Z'));
  assert(!isMetaDate('2025-02-29'));
  assert(!isMetaDate('2026-09-28T12:00:00'));
  result = build({ ogType: 'website', publishedTime: '2026-09-28', modifiedTime: '2026-09-28' });
  assert(!result.html.includes('article:'));
  assert.equal(build({ ogType: 'article' }).metadata.openGraph.publishedTime, undefined);
  assert(!build({ image: '', imageWidth: '1200', imageAlt: 'alt' }).html.includes('og:image:'));
});

test('robots defaults, explicit noindex and snippet controls are not concealed', () => {
  assert.equal(build().robots, '');
  assert.equal(build().metadata.robots, null);
  const result = build({ robots: 'noindex, nofollow', noSnippet: true, maxSnippet: '100', maxImagePreview: 'large' });
  assert.equal(result.robots, 'noindex, nofollow, nosnippet, max-image-preview:large');
  assert(result.warnings.some(w => w.message.includes('NOINDEX')));
  assert.equal(find(result.html, 'name', 'robots').content, result.metadata.robots);
  assert.equal(build({ maxSnippet: '-1' }).robots, 'max-snippet:-1');
  assert.equal(build({ maxSnippet: '0' }).robots, 'max-snippet:0');
  assert.equal(build({ maxSnippet: '-2' }).canExport, false);
  assert.equal(build({ keywords: 'seo, ranking' }).warnings.some(w => w.field === 'keywords'), true);
  assert(build({ maxImagePreview: 'none' }).warnings.some(w => w.field === 'maxImagePreview'));
});

test('empty social image fields do not shadow Next.js file-based images', () => {
  const result = build({ image: '', twitterImage: '' });
  assert(!Object.hasOwn(result.metadata.openGraph, 'images'));
  assert(!Object.hasOwn(result.metadata.twitter, 'images'));
});

test('image-preview restrictions are visible in import review', () => {
  const result = importMetaHtml('<meta name="robots" content="max-image-preview:none">');
  assert.equal(result.draft.maxImagePreview, 'none');
  assert(result.notices.some(n => n.includes('Restrictive')));
  assert.equal(buildMetaOutput(result.draft).robots, 'max-image-preview:none');
});

test('supported HTML export can be imported without changing its metadata', () => {
  const original = build({ includeDefaults: true, ogType: 'article', publishedTime: '2026-09-28', imageWidth: '1200', imageHeight: '630', twitterSite: '@site', noSnippet: true });
  const imported = importMetaHtml(`<html><head>${original.html}</head><body>Ignored</body></html>`);
  assert.equal(imported.draft.title, base.title);
  assert.equal(imported.draft.canonical, base.canonical);
  assert.equal(imported.draft.image, base.image);
  assert.equal(imported.draft.includeDefaults, false);
  assert.equal(imported.draft.noSnippet, true);
  assert.deepEqual(buildMetaOutput(imported.draft).metadata, original.metadata);
});

test('import handles entities, case, attribute order and line endings', () => {
  const result = importMetaHtml('<HEAD>\r\n<TITLE>A &amp; B</TITLE><META content="An &quot;example&quot;" NAME=Description><link HREF="https://example.org/?a=1&amp;b=2" REL="canonical"></HEAD>');
  assert.equal(result.draft.title, 'A & B');
  assert.equal(result.draft.description, 'An "example"');
  assert.equal(result.draft.canonical, 'https://example.org/?a=1&b=2');
  assert.equal(result.draft.includeOpenGraph, false);
  assert.equal(result.draft.includeTwitter, false);
});

test('import ignores executable markup, remote resources, body tags and template tags', () => {
  const result = importMetaHtml('<html><head><title>Safe</title><script>document.title="evil";<meta name="description" content="evil"></script><template><meta name="description" content="template"></template><img src="https://example.net/track"><iframe src="https://example.net/frame"></iframe><meta http-equiv="refresh" content="0;url=https://example.net"><meta name="description" content="head"></head><body><title>body</title></body></html>');
  assert.equal(result.draft.title, 'Safe');
  assert.equal(result.draft.description, 'head');
  assert(result.notices.some(n => n.includes('HTTP-equivalent')));
  const output = buildMetaOutput(result.draft);
  assert.equal(tags(output.html).filter(node => ['script', 'iframe', 'img', 'template'].includes(node.name)).length, 0);
  assert(!output.html.includes('example.net'));
});

test('duplicate tags are reported; the first image keeps only its own properties', () => {
  const result = importMetaHtml('<title>First</title><title>Second</title><meta property="og:image" content="https://example.org/one.jpg"><meta property="og:image:width" content="800"><meta property="og:image" content="https://example.org/two.jpg"><meta property="og:image:width" content="1200"><meta property="og:image:alt" content="second only">');
  assert.equal(result.draft.title, 'First');
  assert.equal(result.draft.imageWidth, '800');
  assert.equal(result.draft.imageAlt, '');
  assert(result.notices.some(n => n.includes('Multiple title')));
  assert(result.notices.some(n => n.includes('Multiple og:image')));
});

test('combined robots import keeps supported restrictions and reports unsupported rules', () => {
  const result = importMetaHtml('<meta name="robots" content="index,follow,max-snippet:100,max-image-preview:large"><meta name="robots" content="none,nosnippet,max-snippet:50,max-image-preview:standard,unavailable_after:2026-10-01"><meta name="googlebot" content="noindex">');
  assert.equal(result.draft.robots, 'noindex, nofollow');
  assert.equal(result.draft.noSnippet, true);
  assert.equal(result.draft.maxSnippet, '50');
  assert.equal(result.draft.maxImagePreview, 'standard');
  assert(result.notices.some(n => n.includes('Crawler-specific')));
  assert(result.notices.some(n => n.includes('unavailable_after')));
  assert(result.notices.some(n => n.includes('stricter')));
});

test('import does not silently resolve relative URLs and reports canonical differences', () => {
  let result = importMetaHtml('<title>Test</title><base href="https://other.example"><link rel="canonical" href="/relative">');
  assert.equal(result.draft.canonical, '/relative');
  assert.equal(buildMetaOutput(result.draft).canExport, false);
  assert(result.notices.some(n => n.includes('Base URLs')));
  result = importMetaHtml('<meta property="og:url" content="https://example.org/a"><meta property="og:type" content="product">');
  assert.equal(result.draft.canonical, 'https://example.org/a');
  assert(result.notices.some(n => n.includes('suggested canonical')));
  assert(result.notices.some(n => n.includes('Unsupported og:type')));
  result = importMetaHtml('<link rel="canonical" href="https://example.org/a"><meta property="og:url" content="https://example.org/b">');
  assert(result.notices.some(n => n.includes('differ')));
});

test('empty, oversized and unrelated import inputs fail without changing editor state', () => {
  assert.throws(() => importMetaHtml(''), /Paste/);
  assert.throws(() => importMetaHtml('<p>Hello</p>'), /No supported/);
  assert.throws(() => importMetaHtml('x'.repeat(META_IMPORT_LIMIT + 1)), /100,000/);
  assert.throws(() => importMetaHtml(`<title>${'x'.repeat(301)}</title>`), /exceeds/);
});

test('Next.js exports type-check against the installed Metadata API', () => {
  const fixturePath = resolve(root, 'meta-tags-generated-test.ts');
  const cases = [...META_EXAMPLES.map(e => e.draft), { ...base, includeOpenGraph: false, includeTwitter: false }, { ...base, ogType: 'article', publishedTime: '2026-09-28', robots: 'noindex, follow', twitterImageAlt: 'Preview' }];
  const source = cases.map((draft, i) => buildMetaOutput(draft).next.replace('export const metadata:', `export const metadata${i}:`).replace(i ? 'import type { Metadata } from "next";\n' : /^$/, '')).join('\n');
  const options = { strict: true, noEmit: true, skipLibCheck: true, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, esModuleInterop: true };
  const host = ts.createCompilerHost(options);
  const oldRead = host.readFile;
  const oldExists = host.fileExists;
  host.readFile = path => resolve(path) === fixturePath ? source : oldRead(path);
  host.fileExists = path => resolve(path) === fixturePath || oldExists(path);
  const program = ts.createProgram([fixturePath], options, host);
  const errors = ts.getPreEmitDiagnostics(program);
  assert.equal(errors.length, 0, ts.formatDiagnosticsWithColorAndContext(errors, { getCanonicalFileName: f => f, getCurrentDirectory: () => root, getNewLine: () => '\n' }));
  assert.equal(existsSync(fixturePath), false, 'Type-check fixtures stay in memory');
});