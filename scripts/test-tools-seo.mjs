import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
const cache = new Map();

function load(relativePath) {
  const absolutePath = resolve(root, relativePath);
  if (cache.has(absolutePath)) return cache.get(absolutePath);
  const loadedModule = { exports: {} };
  const source = readFileSync(absolutePath, 'utf8');
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    fileName: absolutePath,
  }).outputText;
  function localRequire(specifier) {
    if (specifier.startsWith('@/') || specifier.startsWith('.')) {
      const base = specifier.startsWith('@/') ? resolve(root, 'src', specifier.slice(2)) : resolve(dirname(absolutePath), specifier);
      const file = [base, `${base}.ts`, `${base}.tsx`].find(path => existsSync(path));
      assert(file, `Cannot resolve ${specifier}`);
      return load(file);
    }
    return require(specifier);
  }
  // Execute only trusted local modules; no network or database access is used.
  new Function('require', 'module', 'exports', code)(localRequire, loadedModule, loadedModule.exports);
  cache.set(absolutePath, loadedModule.exports);
  return loadedModule.exports;
}

const { toolCatalog, toolCategories, relatedToolSlugs, getRelatedTools } = load('src/lib/tool-catalog.ts');
const routes = readdirSync(resolve(root, 'src/app/tools'), { withFileTypes: true })
  .filter(item => item.isDirectory() && existsSync(resolve(root, 'src/app/tools', item.name, 'page.tsx')))
  .map(item => item.name).sort();
const slugs = toolCatalog.map(tool => tool.slug);
assert.equal(new Set(slugs).size, slugs.length, 'Duplicate catalogue slug');
assert.deepEqual([...slugs].sort(), routes, 'Every tool route must be represented exactly once');
assert.deepEqual(Object.keys(relatedToolSlugs).sort(), routes, 'Every tool needs a related-link mapping');
for (const tool of toolCatalog) {
  assert(toolCategories.some(category => category.title === tool.category), `Uncategorized tool: ${tool.slug}`);
  const targets = relatedToolSlugs[tool.slug];
  assert(targets.length >= 2 && targets.length <= 4, `Unexpected related-link count: ${tool.slug}`);
  assert.equal(new Set(targets).size, targets.length);
  assert(!targets.includes(tool.slug), `Self-link: ${tool.slug}`);
  assert(targets.every(slug => slugs.includes(slug)), `Broken related link: ${tool.slug}`);
  assert.equal(getRelatedTools(tool.slug).length, targets.length);
}
assert.deepEqual(getRelatedTools('not-a-tool'), []);

const { generateToolJsonLd, generateToolMetadata, ToolJsonLd } = load('src/lib/tool-seo.tsx');
const config = { name: '</script><b>Example</b>', title: 'Example', description: 'Example tool', slug: 'json-formatter', keywords: [], faqs: [{ question: 'Is it free?', answer: 'Yes.' }] };
const schemas = generateToolJsonLd(config);
const application = schemas.find(schema => schema['@type'] === 'WebApplication');
assert(application && !Object.hasOwn(application, 'aggregateRating'), 'Do not invent review data');
assert(schemas.some(schema => schema['@type'] === 'BreadcrumbList'));
assert(schemas.some(schema => schema['@type'] === 'FAQPage'));
assert.equal(generateToolMetadata(config).alternates.canonical, `${(process.env.NEXT_PUBLIC_SITE_URL || 'https://www.byteverse.fyi').replace(/\/$/, '')}/tools/json-formatter`);
const schemaHtml = renderToStaticMarkup(createElement(ToolJsonLd, { config }));
assert(!schemaHtml.includes('</script><b>'), 'JSON-LD must escape closing-script text');
assert(schemaHtml.includes('\\u003c/script>'));

for (const path of ['src/app/tools/page.tsx', 'src/app/sitemap.ts', 'src/app/site-map/page.tsx', 'src/components/header.tsx']) {
  assert(readFileSync(resolve(root, path), 'utf8').includes('toolCatalog'), `${path} must use the shared catalogue`);
}
const layout = readFileSync(resolve(root, 'src/app/tools/layout.tsx'), 'utf8');
assert(layout.includes('<RelatedTools />') && !layout.includes('LazyRelatedTools'));
assert(!existsSync(resolve(root, 'src/components/lazy-related-tools.tsx')));
for (const path of ['src/components/header.tsx', 'src/components/footer.tsx', 'src/app/tools/page.tsx']) {
  assert(!/100% client-side|Every tool runs entirely|All tools run/.test(readFileSync(resolve(root, path), 'utf8')), `Blanket processing claim: ${path}`);
}

const { SafeHtmlPreview } = load('src/components/safe-html-preview.tsx');
const preview = renderToStaticMarkup(createElement(SafeHtmlPreview, { title: 'Test preview', html: '<img src=x onerror="parent.alert(1)"><script>parent.alert(2)</script>' }));
assert(preview.includes('sandbox=""'), 'Untrusted HTML must have an opaque, script-disabled sandbox');
assert(!preview.includes('allow-scripts') && !preview.includes('allow-same-origin'));
assert(preview.includes('Content-Security-Policy') && preview.includes('script-src'));
assert(!preview.includes('<script>parent.alert'), 'Untrusted HTML must not render in the parent document');
for (const path of [
  'src/app/tools/markdown-to-html/markdown-to-html-tool.tsx',
  'src/app/tools/html-tag-generator/html-tag-tool.tsx',
  'src/app/tools/privacy-policy-generator/privacy-policy-tool.tsx',
]) {
  const source = readFileSync(resolve(root, path), 'utf8');
  assert(source.includes('SafeHtmlPreview') && !source.includes('dangerouslySetInnerHTML'), `Unsafe main-document preview: ${path}`);
}

console.log(`PASS: ${routes.length} routes, categories, complete related links, truthful schema, escaped JSON-LD and isolated HTML previews.`);