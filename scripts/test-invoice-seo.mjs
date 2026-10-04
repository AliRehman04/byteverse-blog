/**
 * Read-only, offline invoice SEO/discovery/build-contract regression tests.
 * Uses installed packages and the existing generated frame; never rebuilds it.
 * No env files/values, DB, HTTP, browser, server, installs or emitted files.
 *
 * Only explicitly allowlisted pure TS/TSX is evaluated in an I/O-free context.
 * The page's client host and next/link are mocks. Routes with DB/AI imports,
 * Next config, the build script and the generated bundle are inspected, NOT run.
 * These are source/artifact contracts, not deployed-head, browser-enforcement,
 * accounting-accuracy, search-ranking or bundle-freshness guarantees. Existing
 * shared tests remain responsible for adversarial JSON-LD escaping fixtures.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import { parseDocument } from 'htmlparser2';
import { createElement } from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const root = fileURLToPath(new URL('../', import.meta.url));
const slug = 'invoice-pdf-to-excel';
const toolPath = `/tools/${slug}`;
const pagePath = `src/app/tools/${slug}/page.tsx`;
const hostPath = `src/app/tools/${slug}/invoice-workspace-host.tsx`;
const imagePath = `src/app/tools/${slug}/opengraph-image.tsx`;
const framePath = 'public/invoice-workspace/frame.html';
const buildPath = 'scripts/build-invoice-workspace.mjs';
const sourceCache = new Map();
const astCache = new Map();
let passed = 0;
let failed = 0;

function test(name, run) {
  try { run(); passed++; console.log(`PASS: ${name}`); }
  catch (error) { failed++; console.error(`FAIL: ${name}\n${error.stack ?? error}`); }
}

function read(path) {
  if (!sourceCache.has(path)) sourceCache.set(path, readFileSync(resolve(root, path), 'utf8'));
  return sourceCache.get(path);
}
function parse(source, path) {
  const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true,
    path.endsWith('.tsx') ? ts.ScriptKind.TSX : /\.m?js$/.test(path) ? ts.ScriptKind.JS : ts.ScriptKind.TS);
  assert.equal(file.parseDiagnostics.length, 0, `Invalid source syntax: ${path}`);
  return file;
}
function ast(path) {
  if (!astCache.has(path)) astCache.set(path, parse(read(path), path));
  return astCache.get(path);
}
function find(node, predicate, output = []) {
  if (predicate(node)) output.push(node);
  ts.forEachChild(node, child => { find(child, predicate, output); });
  return output;
}
function one(items, label) {
  assert.equal(items.length, 1, `Expected exactly one ${label}; found ${items.length}`);
  return items[0];
}
function unwrap(node) {
  assert(node, 'Missing expression');
  while (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isTypeAssertionExpression(node) || ts.isSatisfiesExpression(node)) node = node.expression;
  return node;
}
function key(node) { return node && (ts.isIdentifier(node) || ts.isStringLiteralLike(node)) ? node.text : undefined; }
function property(object, name) {
  object = unwrap(object);
  assert(ts.isObjectLiteralExpression(object), `Expected an object for ${name}`);
  return one(object.properties.filter(item => ts.isPropertyAssignment(item) && key(item.name) === name), `property ${name}`).initializer;
}
function initializer(file, name) {
  return unwrap(one(find(file, node => ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === name), `declaration ${name}`).initializer);
}

// Strict literal extraction, including nested FAQs. Never eval a toolConfig or
// silently ignore spreads/computed properties/calls. Only headers may join a
// literal string array; no Next config imports (including redirects) execute.
function literal(input, allowJoin = false) {
  const node = unwrap(input);
  if (ts.isStringLiteralLike(node)) return node.text;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (node.kind === ts.SyntaxKind.NullKeyword) return null;
  if (ts.isArrayLiteralExpression(node)) return node.elements.map(item => literal(item, allowJoin));
  if (ts.isObjectLiteralExpression(node)) {
    const entries = node.properties.map(item => {
      assert(ts.isPropertyAssignment(item) && key(item.name) !== undefined, 'Expected a literal property, not a spread/computed key');
      return [key(item.name), literal(item.initializer, allowJoin)];
    });
    assert.equal(new Set(entries.map(([name]) => name)).size, entries.length, 'Duplicate literal property');
    return Object.fromEntries(entries);
  }
  if (allowJoin && ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'join') {
    assert.equal(node.arguments.length, 1);
    const parts = literal(node.expression.expression);
    const separator = literal(node.arguments[0]);
    assert(Array.isArray(parts) && parts.every(part => typeof part === 'string') && typeof separator === 'string');
    return parts.join(separator);
  }
  assert.fail(`Expected static literal; found ${ts.SyntaxKind[node.kind]}`);
}
const compact = node => node.getText().replace(/\s+/g, '');
const plain = value => JSON.parse(JSON.stringify(value)); // Normalize cross-context data, not React components.
const calls = (file, name) => find(file, node => ts.isCallExpression(node) && node.expression.getText() === name);
const jsxTags = file => find(file, node => ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node));
function attribute(element, name) {
  const attr = one(element.attributes.properties.filter(item => ts.isJsxAttribute(item) && key(item.name) === name), `JSX attribute ${name}`);
  return literal(ts.isJsxExpression(attr.initializer) ? attr.initializer.expression : attr.initializer);
}

function elements(node, name, output = []) {
  if (node.name && node.attribs && (!name || node.name === name)) output.push(node);
  // Script/style text and iframe attributes are not parsed as child documents.
  for (const child of node.children ?? []) elements(child, name, output);
  return output;
}
function rawText(node) { return node.type === 'text' ? node.data : (node.children ?? []).map(rawText).join(''); }
function visibleText(node) {
  if (['script', 'style', 'svg'].includes(node.name)) return '';
  return node.type === 'text' ? node.data : (node.children ?? []).map(visibleText).join(' ');
}
const text = node => visibleText(node).replace(/\s+/g, ' ').trim();
const schemasIn = document => elements(document, 'script').filter(node => node.attribs.type === 'application/ld+json').map(node => JSON.parse(rawText(node)));
const toolLinks = document => elements(document, 'a').map(node => node.attribs.href).filter(href => href?.startsWith('/tools/')).sort();

const config = literal(initializer(ast(pagePath), 'toolConfig'));
const siteObject = initializer(ast('src/lib/config.ts'), 'siteConfig');
const siteUrl = unwrap(property(siteObject, 'url'));
assert(ts.isBinaryExpression(siteUrl) && siteUrl.operatorToken.kind === ts.SyntaxKind.BarBarToken &&
  compact(siteUrl.left) === 'process.env.NEXT_PUBLIC_SITE_URL', 'Inspect the real site URL fallback without accessing the environment');
const defaultSite = literal(siteUrl.right);
assert.equal(defaultSite, 'https://www.byteverse.fyi', 'The default canonical must remain the real public site');
const siteConfig = Object.fromEntries(siteObject.properties.map(item => {
  assert(ts.isPropertyAssignment(item));
  return [key(item.name), key(item.name) === 'url' ? defaultSite : literal(item.initializer)];
}));
const canonical = `${defaultSite}${toolPath}`;

function MockLink({ href, children, className, rel }) {
  assert.equal(typeof href, 'string');
  return createElement('a', { href, className, rel }, children);
}
function MockInvoiceWorkspaceHost() {
  return createElement('section', { id: 'invoice-converter', 'data-offline-host': 'true' });
}
function MockIcon() { return null; }
const mockIcons = new Proxy({ __esModule: true }, {
  get(target, name) { return Object.hasOwn(target, name) ? target[name] : MockIcon; },
});

function evaluate(source, path, globals = {}, requireModule = name => { assert.fail(`Disallowed import: ${name}`); }) {
  const compiled = ts.transpileModule(source, {
    fileName: path, reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  });
  assert.equal(compiled.diagnostics.filter(item => item.category === ts.DiagnosticCategory.Error).length, 0, `Transpile failed: ${path}`);
  const loadedModule = { exports: {} };
  // No ambient process, fetch, browser APIs or general-purpose Node require.
  // This is an accidental-I/O guard for trusted code, not a hostile-code sandbox.
  runInNewContext(compiled.outputText, { ...globals, module: loadedModule, exports: loadedModule.exports, require: requireModule },
    { filename: path, timeout: 5000, contextCodeGeneration: { strings: false, wasm: false } });
  return loadedModule.exports;
}
function makeLoader(catalogOverride) {
  const allowed = new Set([pagePath, 'src/lib/tool-seo.tsx', 'src/lib/tool-catalog.ts', 'src/app/tools/page.tsx']);
  const cache = new Map();
  return function load(path) {
    assert(allowed.has(path), `Refusing to execute non-pure/unapproved module: ${path}`);
    if (cache.has(path)) return cache.get(path);
    const loaded = evaluate(read(path), path, {}, specifier => {
      if (specifier === 'react/jsx-runtime') return jsxRuntime;
      if (specifier === 'next/link') return { __esModule: true, default: MockLink };
      if (specifier === 'lucide-react') return mockIcons;
      if (specifier === '@/lib/config') return { siteConfig };
      if (specifier === './invoice-workspace-host') return { InvoiceWorkspaceHost: MockInvoiceWorkspaceHost };
      if (specifier === '@/lib/tool-seo') return load('src/lib/tool-seo.tsx');
      if (specifier === '@/lib/tool-catalog') return catalogOverride ?? load('src/lib/tool-catalog.ts');
      assert.fail(`Unexpected runtime import in ${path}: ${specifier}`);
    });
    cache.set(path, loaded);
    return loaded;
  };
}
const load = makeLoader();
const seo = load('src/lib/tool-seo.tsx');
const page = load(pagePath);
const catalogue = load('src/lib/tool-catalog.ts');
const catalog = catalogue.toolCatalog;
const routes = readdirSync(resolve(root, 'src/app/tools'), { withFileTypes: true })
  .filter(item => item.isDirectory() && existsSync(resolve(root, 'src/app/tools', item.name, 'page.tsx')))
  .map(item => item.name).sort();
// A synthetic layout main surrounds ONLY the landing page, never frame.html.
const landing = parseDocument(renderToStaticMarkup(createElement('main', null, createElement(page.default))));
assert(existsSync(resolve(root, framePath)), 'Required generated frame is missing; this test deliberately does not build it');
const frame = parseDocument(read(framePath));
const inlineScript = rawText(one(elements(frame, 'script'), 'frame script'));
const buildFile = ast(buildPath);

test('literal config, bounded editorial metadata and real default canonical', () => {
  assert.equal(config.slug, slug);
  assert.equal(config.name, 'Invoice PDF to Excel');
  // Generous copy sanity budgets, not Google truncation/ranking limits. In
  // particular, a description exceeding 160 characters is not itself a defect.
  for (const [name, value, maximum] of [['title', config.title, 80], ['description', config.description, 200]]) {
    assert.equal(typeof value, 'string');
    assert(value.trim() === value && value.length > 0 && [...value].length <= maximum, `${name} exceeds the local copy budget (${maximum})`);
  }
  assert(config.keywords.includes('invoice pdf to excel'));
  assert(config.keywords.includes('extract invoice data from pdf to excel'));
  assert.equal(new Set(config.keywords).size, config.keywords.length);
  assert.equal(config.faqs.length, 5);
  assert.equal(new Set(config.faqs.map(faq => faq.question)).size, 5);
  assert(config.faqs.every(faq => faq.question.trim() && faq.answer.trim()));
  const metadata = plain(page.metadata);
  assert.deepEqual(metadata.title, { absolute: config.title });
  assert.equal(metadata.description, config.description);
  assert.deepEqual(metadata.keywords, config.keywords);
  assert.equal(metadata.alternates.canonical, canonical);
  assert.equal(metadata.openGraph.url, canonical);
  assert.equal(metadata.openGraph.title, config.title);
  assert.equal(metadata.twitter.title, config.title);
  assert.equal(metadata.openGraph.description, config.description);
  assert.equal(metadata.twitter.description, config.description);
  assert.equal(metadata.twitter.card, 'summary_large_image');
  assert.equal(seo.generateToolMetadata(config).alternates.canonical, canonical);
});

test('Business WebApplication, free offers, truthful FAQs and no invented ratings', () => {
  const schemas = plain(seo.generateToolJsonLd(config));
  const application = one(schemas.filter(schema => schema['@type'] === 'WebApplication'), 'WebApplication');
  assert.equal(application.name, config.name);
  assert.equal(application.url, canonical);
  assert.equal(application.applicationCategory, 'BusinessApplication');
  assert.deepEqual(application.offers, { '@type': 'Offer', price: '0', priceCurrency: 'USD' });
  assert.equal(application.isAccessibleForFree, true);
  assert.deepEqual(application.featureList, config.featureList);
  assert.equal(application.audience.audienceType, config.audience);
  assert.equal(application.provider.url, defaultSite);
  assert.doesNotMatch(JSON.stringify(schemas), /"(?:aggregateRating|ratingValue|ratingCount|reviewCount|review)"\s*:/);
  const breadcrumbs = one(schemas.filter(schema => schema['@type'] === 'BreadcrumbList'), 'breadcrumb schema');
  assert.deepEqual(breadcrumbs.itemListElement.map(item => item.item), [defaultSite, `${defaultSite}/tools`, canonical]);
  const faq = one(schemas.filter(schema => schema['@type'] === 'FAQPage'), 'FAQ schema');
  assert.deepEqual(faq.mainEntity, config.faqs.map(item => ({ '@type': 'Question', name: item.question, acceptedAnswer: { '@type': 'Answer', text: item.answer } })));
  assert.deepEqual(schemasIn(landing), schemas, 'SSR must emit the actual helper output');
});

test('outer SSR: one H1, no nested main/upload form, five matching visible FAQs', () => {
  assert.equal(elements(landing, 'main').length, 1, 'Landing page must not nest a main inside its layout main');
  assert.equal(text(one(elements(landing, 'h1'), 'landing H1')), config.title);
  assert.equal(elements(landing, 'form').length, 0);
  assert.equal(elements(landing, 'input').filter(node => node.attribs.type?.toLowerCase() === 'file').length, 0);
  assert.equal(elements(landing, 'iframe').length, 0, 'The mock host must not load/embed the generated document');
  assert.equal(elements(landing).filter(node => node.attribs['data-offline-host'] === 'true').length, 1);
  assert(elements(landing, 'a').some(node => node.attribs.href === '#invoice-converter'));
  const faqSection = one(elements(landing, 'section').filter(node => node.attribs.id === 'faqs'), 'visible FAQ section');
  assert.deepEqual(elements(faqSection, 'details').map(detail => ({
    question: text(one(elements(detail, 'summary'), 'FAQ question')),
    answer: text(one(elements(detail, 'p'), 'FAQ answer')),
  })), config.faqs);
  const copy = text(landing);
  assert.match(copy, /There is no OCR, AI or line-item extraction\./);
  assert.match(copy, /Scans, handwriting, password-protected or copy-restricted files, credit notes and multi-invoice PDFs are unsupported\./);
  assert.match(copy, /No accuracy score is assigned\./);
  assert.match(copy, /fictional demo data/i);
  assert.match(copy, /Passing checks is not proof of accounting accuracy\./);
  assert.match(copy, /not an absolute privacy guarantee/i);
  assert.doesNotMatch(copy, /\b(?:BPS|accuracy|confidence)\s*(?:score|rating)?\s*[:=]?\s*\d+(?:\.\d+)?/i);
  assert.doesNotMatch(copy, /\b\d+(?:\.\d+)?\s*%\s*(?:accurate|accuracy|confidence|private|secure)\b/i);
});

test('public 1200x630 OG/Twitter image metadata matches literal image-route exports', () => {
  const imageFile = ast(imagePath);
  const alt = literal(initializer(imageFile, 'alt'));
  const size = literal(initializer(imageFile, 'size'));
  assert.deepEqual(size, { width: 1200, height: 630 });
  assert.equal(literal(initializer(imageFile, 'contentType')), 'image/png');
  assert.match(alt, /^Invoice PDF to Excel by ByteVerse: three fictional USD and EUR invoices, one flagged total,/);
  const expected = { url: `${toolPath}/opengraph-image`, ...size, alt };
  assert.deepEqual(plain(page.metadata.openGraph.images), [expected]);
  assert.deepEqual(plain(page.metadata.twitter.images), [expected]);
  assert.equal(new URL(expected.url, defaultSite).href, `${canonical}/opengraph-image`);
  one(find(imageFile, node => ts.isImportDeclaration(node) && node.moduleSpecifier.text === 'next/og'), 'next/og import');
  one(find(imageFile, node => ts.isNewExpression(node) && node.expression.getText() === 'ImageResponse'), 'ImageResponse construction');
  // The image function is intentionally not called; this is not an image-render test.
});

test('catalogue covers current routes and related links; hub count changes with the catalogue', () => {
  const slugs = Array.from(catalog, tool => tool.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  assert.deepEqual([...slugs].sort(), routes, 'Every real tool route must be mapped; no hardcoded historical total');
  assert.deepEqual(Object.keys(catalogue.relatedToolSlugs).sort(), routes);
  const invoice = one(Array.from(catalog).filter(tool => tool.slug === slug), 'invoice catalogue entry');
  assert.equal(invoice.name, config.name);
  assert.match(invoice.description, /selectable-text.*review.*XLSX or CSV locally\. No OCR\./);
  for (const tool of catalog) {
    assert(catalogue.toolCategories.some(category => category.title === tool.category));
    const related = catalogue.getRelatedTools(tool.slug);
    const targets = catalogue.relatedToolSlugs[tool.slug];
    assert(targets.length >= 2 && targets.length <= 4);
    assert.equal(new Set(targets).size, targets.length);
    assert(!targets.includes(tool.slug) && targets.every(target => slugs.includes(target)));
    assert.deepEqual(Array.from(related, item => item.slug), Array.from(targets));
  }
  assert(catalogue.relatedToolSlugs['json-to-csv'].includes(slug));
  assert(catalogue.relatedToolSlugs[slug].includes('json-to-csv'));
  // A second, shorter synthetic catalogue catches a hardcoded count even if it
  // accidentally equals today's route count. No fake tool/identity is created.
  for (const entries of [catalog, catalog.slice(0, -1)]) {
    const hub = makeLoader({ ...catalogue, toolCatalog: entries })('src/app/tools/page.tsx');
    const document = parseDocument(renderToStaticMarkup(createElement(hub.default)));
    const schema = one(schemasIn(document), 'hub schema');
    assert.equal(schema.mainEntity.numberOfItems, entries.length);
    assert.equal(schema.mainEntity.itemListElement.length, entries.length);
    assert.deepEqual(schema.mainEntity.itemListElement.map(item => item.url).sort(), Array.from(entries, tool => `${defaultSite}/tools/${tool.slug}`).sort());
    assert.deepEqual(toolLinks(document), Array.from(entries, tool => `/tools/${tool.slug}`).sort());
    assert(text(document).includes(`${entries.length} utilities for coding, content and everyday web tasks.`));
  }
});

test('homepage, JSON-to-CSV, llms.txt and chat contain connected invoice discovery entries', () => {
  const home = ast('src/app/page.tsx');
  const card = one(find(home, node => ts.isObjectLiteralExpression(node) && node.properties.some(item =>
    ts.isPropertyAssignment(item) && key(item.name) === 'href' && ts.isStringLiteral(item.initializer) && item.initializer.text === toolPath)), 'homepage invoice card');
  assert.equal(literal(property(card, 'title')), config.name);
  assert(ts.isArrayLiteralExpression(card.parent) && ts.isPropertyAccessExpression(card.parent.parent) && card.parent.parent.name.text === 'map');
  assert(jsxTags(card.parent.parent.parent).some(node => node.tagName.getText() === 'Link' && node.attributes.properties.some(item =>
    ts.isJsxAttribute(item) && key(item.name) === 'href' && compact(item.initializer) === '{tool.href}')));
  const csv = ast('src/app/tools/json-to-csv/page.tsx');
  assert(jsxTags(csv).some(node => node.tagName.getText() === 'Link' && node.attributes.properties.some(item =>
    ts.isJsxAttribute(item) && key(item.name) === 'href' && ts.isStringLiteral(item.initializer) && item.initializer.text === toolPath)));

  // Extract literal entries ONLY; neither server route nor its imports is loaded.
  const llms = ast('src/app/llms.txt/route.ts');
  const llmsEntry = one(literal(initializer(llms, 'tools')).filter(tool => tool.href === toolPath), 'llms.txt invoice entry');
  assert.equal(llmsEntry.name, config.name);
  assert.match(llmsEntry.desc, /Free local batch.*review.*No OCR or AI/);
  const loop = one(find(llms, node => ts.isForOfStatement(node) && node.expression.getText() === 'tools'), 'llms tool loop');
  assert(calls(loop, 'lines.push').some(node => node.arguments.some(argument =>
    ts.isTemplateExpression(argument) && argument.getText().includes('${base}${tool.href}'))));
  const chat = ast('src/app/api/chat/route.ts');
  const chatEntry = one(literal(initializer(chat, 'TOOLS')).filter(tool => tool.slug === slug), 'chat invoice entry');
  assert.equal(chatEntry.name, config.name);
  assert(['invoice', 'pdf', 'excel', 'xlsx', 'csv'].every(word => chatEntry.keywords.includes(word)));
  assert.match(chatEntry.desc, /No OCR or AI; select files in the isolated converter, not this chat\./);
  const resultMapping = initializer(chat, 'toolResults');
  assert(ts.isCallExpression(resultMapping) && resultMapping.expression.getText() === 'toolMatches.map');
  assert(find(resultMapping, node => ts.isPropertyAssignment(node) && key(node.name) === 'slug' &&
    node.initializer.getText() === '`tools/${t.slug}`').length === 1);
});

test('both sitemap tool projections use the shared catalogue without loading DB routes', () => {
  for (const path of ['src/app/sitemap.ts', 'src/app/site-map/page.tsx']) {
    const file = ast(path);
    assert(find(file, node => ts.isImportDeclaration(node) && node.moduleSpecifier.text === '@/lib/tool-catalog').length === 1);
    const mapping = one(calls(file, 'toolCatalog.map'), `catalogue mapping in ${path}`);
    // Execute only the extracted map expression, with synthetic bindings and no
    // require/DB/environment capability, NOT the module or sitemap handler.
    for (const entries of [catalog, catalog.slice(0, -1)]) {
      const projected = plain(evaluate(`export const value = ${mapping.getText()};`, 'offline-projection.ts',
        { toolCatalog: entries, baseUrl: defaultSite }).value);
      if (path === 'src/app/sitemap.ts') {
        assert.deepEqual(projected.map(item => item.url).sort(), Array.from(entries, tool => `${defaultSite}/tools/${tool.slug}`).sort());
        assert(projected.every(item => !Object.hasOwn(item, 'lastModified')), 'Do not fabricate fresh tool modification dates');
        assert(ts.isSpreadElement(mapping.parent), 'XML sitemap must include, not just declare, the mapped tools');
      } else {
        assert.deepEqual(projected, Array.from(entries, tool => [tool.name, `/tools/${tool.slug}`]));
        assert(jsxTags(file).some(node => node.tagName.getText() === 'LinkList' && node.attributes.properties.some(item =>
          ts.isJsxAttribute(item) && key(item.name) === 'items' && compact(item.initializer) === '{tools}')));
      }
    }
  }
});

test('client host stays closed initially and uses the exact opaque download sandbox', () => {
  const host = ast(hostPath);
  const iframe = one(jsxTags(host).filter(node => node.tagName.getText() === 'iframe'), 'host iframe');
  assert.equal(attribute(iframe, 'src'), '/invoice-workspace/frame.html');
  assert.equal(attribute(iframe, 'sandbox'), 'allow-scripts allow-downloads');
  assert.equal(attribute(iframe, 'referrerPolicy'), 'no-referrer');
  assert.equal(attribute(iframe, 'title'), 'Private invoice PDF to Excel workspace');
  assert(!iframe.attributes.properties.some(item => ts.isJsxSpreadAttribute(item) || key(item.name) === 'srcDoc'));
  const opened = one(find(host, node => ts.isVariableDeclaration(node) && ts.isArrayBindingPattern(node.name) &&
    node.name.elements[0]?.name?.getText() === 'opened'), 'opened state');
  assert(ts.isCallExpression(opened.initializer) && opened.initializer.expression.getText() === 'useState');
  assert.equal(literal(opened.initializer.arguments[0]), false);
  assert(!jsxTags(host).some(node => ['form', 'input'].includes(node.tagName.getText())), 'Files must be chosen inside the frame, not the host');
});

function policyDirectives(policy) {
  const result = {};
  for (const part of policy.split(';').map(value => value.trim()).filter(Boolean)) {
    const [name, ...values] = part.split(/\s+/);
    assert(!Object.hasOwn(result, name), `Duplicate CSP directive: ${name}`);
    result[name] = values;
  }
  return result;
}
function assertPrivatePolicy(policy) {
  for (const name of ['default-src', 'connect-src', 'frame-src', 'object-src', 'base-uri', 'form-action']) assert.deepEqual(policy[name], ["'none'"], name);
  assert.deepEqual(policy['worker-src'], ['blob:']);
  assert.deepEqual(policy['img-src'], ['data:', 'blob:']);
  assert.deepEqual(policy['font-src'], ['data:', 'blob:']);
  assert.deepEqual(policy['style-src'], ["'unsafe-inline'"]);
}

test('private headers override global indexable headers and retain no-store/CSP restrictions', () => {
  const headersFunction = unwrap(property(initializer(ast('next.config.ts'), 'nextConfig'), 'headers'));
  assert(ts.isArrowFunction(headersFunction) && headersFunction.parameters.length === 0 && ts.isArrayLiteralExpression(headersFunction.body));
  const rules = literal(headersFunction.body, true);
  const privateRule = one(rules.filter(rule => rule.source === '/invoice-workspace/:path*'), 'private workspace header rule');
  const privateIndex = rules.indexOf(privateRule);
  const header = (rule, name) => rule.headers.find(item => item.key.toLowerCase() === name)?.value;
  const globalIndex = rules.findIndex(rule => rule.source === '/(.*)');
  const botIndices = rules.flatMap((rule, index) => /(?:^|,)\s*index\s*(?:,|$)/i.test(header(rule, 'x-robots-tag') ?? '') ? [index] : []);
  assert(globalIndex >= 0 && privateIndex > globalIndex && botIndices.length > 0 && botIndices.every(index => privateIndex > index), 'Private overrides must follow global CSP and index/follow headers');
  assert.equal(header(privateRule, 'x-robots-tag'), 'noindex, nofollow, noarchive');
  assert.equal(header(privateRule, 'cache-control'), 'no-store');
  assert.equal(header(privateRule, 'referrer-policy'), 'no-referrer');
  const policy = policyDirectives(header(privateRule, 'content-security-policy'));
  assertPrivatePolicy(policy);
  assert.deepEqual(policy.sandbox, ['allow-scripts', 'allow-downloads']);
  assert.deepEqual(policy['frame-ancestors'], ["'self'"]);
  // HTTP permits the inline bundle; the separate HTML meta policy pins its hash.
  assert.deepEqual(policy['script-src'], ["'unsafe-inline'"]);
});

test('generated frame DOM is an empty static shell with one SHA-256-pinned inline script', () => {
  const nodes = elements(frame);
  const script = one(elements(frame, 'script'), 'inline script');
  const style = one(elements(frame, 'style'), 'inline stylesheet');
  assert.deepEqual(script.attribs, {});
  assert.deepEqual(style.attribs, {});
  assert(inlineScript.length > 0 && rawText(style).length > 0);
  const csp = one(elements(frame, 'meta').filter(node => node.attribs['http-equiv']?.toLowerCase() === 'content-security-policy'), 'meta CSP');
  assert(nodes.indexOf(csp) < nodes.indexOf(style) && nodes.indexOf(csp) < nodes.indexOf(script), 'CSP must precede inline assets');
  const policy = policyDirectives(csp.attribs.content);
  assertPrivatePolicy(policy);
  const hash = createHash('sha256').update(inlineScript, 'utf8').digest('base64');
  assert.deepEqual(policy['script-src'], [`'sha256-${hash}'`], 'Hash the exact parsed script bytes, not the full HTML or source bundle');
  assert.equal(one(elements(frame, 'meta').filter(node => node.attribs.name === 'robots'), 'frame robots').attribs.content, 'noindex,nofollow');
  assert.equal(one(elements(frame, 'meta').filter(node => node.attribs.name === 'referrer'), 'frame referrer').attribs.content, 'no-referrer');
  const allowedTags = new Set(['html', 'head', 'meta', 'title', 'style', 'body', 'div', 'noscript', 'script']);
  for (const node of nodes) {
    assert(allowedTags.has(node.name), `Unexpected frame DOM element/resource: ${node.name}`);
    for (const name of Object.keys(node.attribs)) {
      assert(!/^(?:src|srcset|srcdoc|href|xlink:href|action|formaction|poster|data|background|hidden|on.*)$/i.test(name), `Unexpected frame resource/event/hidden attribute: ${node.name}.${name}`);
    }
    assert(node.attribs['http-equiv']?.toLowerCase() !== 'refresh');
  }
  // In particular: no script src, stylesheet link, iframe/form/img/object or
  // serialized invoice inputs. URLs inside JS strings/licenses are NOT resources.
  const mount = one(elements(frame, 'div').filter(node => node.attribs.id === 'invoice-app'), 'empty app mount');
  assert.equal(mount.children.length, 0);
  const body = one(elements(frame, 'body'), 'frame body');
  assert.deepEqual(body.children.filter(node => node.name).map(node => node.name), ['div', 'noscript', 'script']);
  assert.equal(text(body), text(one(elements(body, 'noscript'), 'noscript fallback')), 'Even a cached shell contains no rendered invoices; bundled fictional samples are code, not saved records');
  const css = rawText(style).replace(/\/\*[\s\S]*?\*\//g, '');
  assert.doesNotMatch(css, /@import\b/i, 'No stylesheet imports');
  for (const match of css.matchAll(/\burl\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)/gi)) {
    assert(/^(?:data:|blob:|#)/i.test((match[1] ?? match[2] ?? match[3]).trim()), 'No external CSS resource URL');
  }
});

test('build options preserve classic workers, production IIFE and no external chunk output', () => {
  for (const [name, entry] of [['workerBuild', 'node_modules/pdfjs-dist/build/pdf.worker.mjs'], ['coreBuild', 'src/lib/invoice/core-worker.ts'], ['result', 'src/components/invoice-workspace/entry.tsx']]) {
    const awaited = initializer(buildFile, name);
    assert(ts.isAwaitExpression(awaited) && ts.isCallExpression(awaited.expression) && awaited.expression.expression.getText() === 'build');
    const options = awaited.expression.arguments[0];
    assert.deepEqual(literal(property(options, 'entryPoints')), [entry]);
    for (const [option, expected] of [['bundle', true], ['write', false], ['platform', 'browser'], ['format', 'iife']]) assert.equal(literal(property(options, option)), expected, `${name}.${option}`);
    assert(!options.properties.some(item => key(item.name) === 'external'), 'Do not externalize private-workspace modules');
    if (name === 'workerBuild') {
      assert.deepEqual(literal(property(options, 'define')), { 'import.meta.url': '"about:blank"' });
      assert.equal(literal(property(options, 'legalComments')), 'inline');
    }
    if (name === 'result') {
      assert.equal(literal(property(options, 'splitting')), false);
      assert.equal(literal(property(options, 'metafile')), true);
      assert.deepEqual(literal(property(options, 'define')), { 'process.env.NODE_ENV': '"production"' });
      assert.equal(literal(property(options, 'legalComments')), 'inline');
    }
  }
  assert(calls(buildFile, 'assert').some(node => compact(node.arguments[0]) === 'Object.values(result.metafile.outputs).every(file=>file.imports.length===0)'), 'Build must assert esbuild metafile output imports are empty');
  const bundle = parse(inlineScript, 'generated-invoice-inline.js');
  astCache.set('generated-invoice-inline.js', bundle);
  assert.equal(find(bundle, node => ts.isImportDeclaration(node) || ts.isExportDeclaration(node) || ts.isExportAssignment(node) ||
    (ts.isMetaProperty(node) && node.keywordToken === ts.SyntaxKind.ImportKeyword)).length, 0, 'The executable bundle must remain a classic script');
  // PDF.js retains its generic fake-worker fallback. It is not an esbuild
  // chunk import: our separately checked consumer supplies a classic Blob port.
  // Allow only that exact vendor getter, not arbitrary variable/literal imports.
  const dynamicImports = find(bundle, node => ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword);
  assert(dynamicImports.length <= 1, 'Unexpected additional runtime imports');
  for (const node of dynamicImports) {
    assert.equal(compact(node), 'import(this.workerSrc)', 'Unexpected module/chunk import');
    let owner = node.parent;
    while (owner && !ts.isGetAccessorDeclaration(owner)) owner = owner.parent;
    assert(owner && key(owner.name) === '_setupFakeWorkerGlobal', 'Runtime import must be scoped to the known PDF.js fallback');
  }
});

test('both worker consumers use bundled JavaScript Blob sources and PDF reads use bundled fonts', () => {
  for (const [path, asset] of [['src/lib/invoice/pdf-client.ts', 'invoice:pdf-worker'], ['src/lib/invoice/core-client.ts', 'invoice:core-worker']]) {
    const file = ast(path);
    const imported = one(find(file, node => ts.isImportDeclaration(node) && node.moduleSpecifier.text === asset), asset);
    const sourceName = imported.importClause.name.text;
    const workerUrl = one(calls(file, 'URL.createObjectURL'), 'worker Blob URL');
    const blob = workerUrl.arguments[0];
    assert(ts.isNewExpression(blob) && blob.expression.getText() === 'Blob');
    assert(ts.isArrayLiteralExpression(blob.arguments[0]) && blob.arguments[0].elements.length === 1 && blob.arguments[0].elements[0].getText() === sourceName);
    assert.equal(literal(property(blob.arguments[1], 'type')), 'text/javascript');
    assert(ts.isVariableDeclaration(workerUrl.parent));
    const worker = one(find(file, node => ts.isNewExpression(node) && node.expression.getText() === 'Worker'), 'classic Worker');
    assert.equal(worker.arguments.length, 1, 'No module worker option in the opaque sandbox');
    assert.equal(worker.arguments[0].getText(), workerUrl.parent.name.getText());
    assert.equal(calls(file, 'URL.revokeObjectURL').length, 1);
  }
  const pdfFile = ast('src/lib/invoice/pdf-client.ts');
  const workerCreation = one(calls(pdfFile, 'PDFWorker.create'), 'explicit PDF worker port');
  assert(workerCreation.arguments[0].properties.some(item => ts.isShorthandPropertyAssignment(item) && item.name.text === 'port'));
  assert(ts.isBinaryExpression(workerCreation.parent) && workerCreation.parent.left.getText() === 'pdfWorker');
  const documentOptions = one(calls(pdfFile, 'getDocument'), 'PDF document options').arguments[0];
  assert.equal(property(documentOptions, 'worker').getText(), 'pdfWorker', 'Use the supplied Blob port, not PDF.js worker URL discovery');
  for (const [name, value] of [['useWorkerFetch', false], ['useWasm', false], ['useSystemFonts', false], ['enableXfa', false], ['disableAutoFetch', true], ['disableRange', true], ['disableStream', true]]) {
    assert.equal(literal(property(documentOptions, name)), value, name);
  }
  assert.equal(property(documentOptions, 'BinaryDataFactory').getText(), 'BundledFontFactory');
  assert(!documentOptions.properties.some(item => key(item.name) === 'url'), 'Read supplied bytes, not a remote PDF URL');
});

test('four virtual assets, installed PDF fonts and required license texts are bundled locally', () => {
  const expectedAssets = ['invoice:core-worker', 'invoice:licenses', 'invoice:pdf-fonts', 'invoice:pdf-worker'];
  const virtual = initializer(buildFile, 'virtual');
  assert.deepEqual(virtual.properties.map(item => key(item.name)).sort(), expectedAssets);
  assert.equal(property(virtual, 'invoice:pdf-worker').getText(), 'worker');
  assert.equal(property(virtual, 'invoice:core-worker').getText(), 'coreBuild.outputFiles[0].text');
  assert.equal(property(virtual, 'invoice:pdf-fonts').getText(), 'fonts');
  assert.equal(property(virtual, 'invoice:licenses').getText(), 'licenses');
  assert.deepEqual(find(ast('src/lib/invoice/assets.d.ts'), ts.isModuleDeclaration).map(node => node.name.text).sort(), expectedAssets);
  assert(find(ast('src/components/invoice-workspace/app.tsx'), node => ts.isImportDeclaration(node) && node.moduleSpecifier.text === 'invoice:licenses').length === 1);
  assert(find(ast('src/components/invoice-workspace/app.tsx'), node => ts.isJsxElement(node) && node.openingElement.tagName.getText() === 'pre' &&
    node.children.some(child => ts.isJsxExpression(child) && child.expression?.getText() === 'licenses')).length === 1);
  const bundle = astCache.get('generated-invoice-inline.js') ?? parse(inlineScript, 'generated-invoice-inline.js');
  const strings = find(bundle, ts.isStringLiteralLike).map(node => node.text);
  const licensePaths = literal(initializer(buildFile, 'licensePaths'));
  for (const path of ['pdfjs-dist/LICENSE', 'pdfjs-dist/standard_fonts/LICENSE_FOXIT', 'pdfjs-dist/standard_fonts/LICENSE_LIBERATION',
    'write-excel-file/LICENSE', 'fflate/LICENSE', 'react/LICENSE', 'react-dom/LICENSE', 'scheduler/LICENSE', 'lucide-react/LICENSE']) {
    assert(licensePaths.includes(path), `Missing bundled license: ${path}`);
    const license = `${path}\n${read(`node_modules/${path}`)}`;
    assert(strings.some(value => value.includes(license)), `Generated bundle must retain the installed license text: ${path}`);
  }
  const fontPath = 'node_modules/pdfjs-dist/standard_fonts';
  const fonts = readdirSync(resolve(root, fontPath)).filter(name => /\.(?:pfb|ttf)$/.test(name)).sort();
  assert(fonts.length > 0);
  const bundledFonts = one(find(bundle, node => ts.isObjectLiteralExpression(node) && fonts.every(name => node.properties.some(item =>
    ts.isPropertyAssignment(item) && key(item.name) === name))), 'bundled standard-font map');
  const fontData = literal(bundledFonts);
  for (const name of fonts) assert.equal(fontData[name], readFileSync(resolve(root, fontPath, name)).toString('base64'), `Bundled font differs: ${name}`);
});

test('first-party workspace remains memory-only with a height-only parent bridge', () => {
  const folders = ['src/lib/invoice', 'src/components/invoice-workspace'];
  const external = new Set(['react', 'react-dom', 'react-dom/client', 'lucide-react', 'pdfjs-dist', 'write-excel-file/universal',
    'invoice:pdf-worker', 'invoice:core-worker', 'invoice:pdf-fonts', 'invoice:licenses']);
  const forbidden = new Set(['process', 'localStorage', 'sessionStorage', 'indexedDB', 'caches', 'serviceWorker', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'sendBeacon']);
  for (const folder of folders) {
    for (const item of readdirSync(resolve(root, folder), { withFileTypes: true }).filter(item => item.isFile() && /\.tsx?$/.test(item.name) && !item.name.endsWith('.d.ts'))) {
      const path = `${folder}/${item.name}`;
      const file = ast(path);
      assert.equal(find(file, node => ts.isIdentifier(node) && forbidden.has(node.text)).length, 0, `Unexpected persistence/network/env API in ${path}`);
      assert.equal(find(file, node => (ts.isCallExpression(node) && (node.expression.getText() === 'fetch' ||
        (ts.isPropertyAccessExpression(node.expression) && ['fetch', 'sendBeacon'].includes(node.expression.name.text)))) ||
        (ts.isPropertyAccessExpression(node) && node.name.text === 'cookie')).length, 0, `Unexpected request/cookie access in ${path}`);
      for (const specifier of find(file, node => ts.isImportDeclaration(node) || (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword))) {
        const name = literal(ts.isImportDeclaration(specifier) ? specifier.moduleSpecifier : specifier.arguments[0]);
        if (!name.startsWith('.')) assert(external.has(name), `Review new workspace dependency: ${name}`);
        else {
          const target = resolve(dirname(resolve(root, path)), name);
          assert(folders.some(directory => target.startsWith(`${resolve(root, directory)}${sep}`)), `Import leaves the isolated workspace: ${name}`);
        }
      }
    }
  }
  const app = ast('src/components/invoice-workspace/app.tsx');
  const state = one(find(app, node => ts.isVariableDeclaration(node) && ts.isArrayBindingPattern(node.name) &&
    node.name.elements[0]?.name?.getText() === 'records'), 'initial invoice records');
  assert(ts.isCallExpression(state.initializer) && state.initializer.expression.getText() === 'useState');
  assert.deepEqual(literal(state.initializer.arguments[0]), [], 'Do not preload invoices into a static/cached shell');
  const cleanup = initializer(app, 'disposeWorkspace');
  assert(calls(cleanup, 'filesRef.current.clear').length === 1 && calls(cleanup, 'revokeAll').length === 1);
  assert(find(cleanup, node => ts.isBinaryExpression(node) && compact(node) === 'recordsRef.current=[]').length === 1);
  const entry = ast('src/components/invoice-workspace/entry.tsx');
  const message = one(calls(entry, 'window.parent.postMessage'), 'parent bridge message');
  assert.deepEqual(message.arguments[0].properties.map(item => key(item.name)).sort(), ['height', 'type']);
  assert.equal(literal(property(message.arguments[0], 'type')), 'byteverse-invoice-resize');
  const host = ast(hostPath);
  const hostMessages = find(host, node => ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'postMessage');
  assert.equal(hostMessages.length, 1);
  assert.deepEqual(hostMessages[0].arguments[0].properties.map(item => key(item.name)).sort(), ['dark', 'type']);
  assert.equal(literal(property(hostMessages[0].arguments[0], 'type')), 'byteverse-invoice-theme');
  const receive = initializer(host, 'receive');
  for (const guard of ['event.source!==frame.current?.contentWindow', 'event.origin!=="null"', 'Object.keys(message).length!==2', '!Number.isInteger(message.height)']) {
    assert(compact(receive).includes(guard), `Missing source/origin/shape guard: ${guard}`);
  }
  // This source scan recognizes known APIs; actual runtime privacy/cleanup is
  // covered by the separate browser suite, not proved by absence of identifiers.
});

console.log(`\n${failed ? 'FAIL' : 'PASS'}: ${passed} invoice SEO/discovery/privacy-build groups passed, ${failed} failed; ${routes.length} tool routes checked dynamically.`);
console.log('Offline only: mocked landing SSR + source/current-artifact checks; no Next build, image generation, live headers, network, DB or file writes.');
process.exitCode = failed ? 1 : 0;