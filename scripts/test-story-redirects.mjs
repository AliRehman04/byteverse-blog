import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

// Synthetic tests only: no app env, database connection, API or model calls.
const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
// The Next test utilities expect the same AsyncLocalStorage global as its server.
require('next/dist/server/node-environment-baseline');
const { NextRequest } = require('next/server');
const { PgDialect } = require('drizzle-orm/pg-core');
const { eq } = require('drizzle-orm');
const { unstable_getResponseFromNextConfig, getRedirectUrl } = require('next/experimental/testing/server');
const siteConfig = { url: 'https://www.byteverse.fyi' };

function load(path, mocks = {}) {
  const source = readFileSync(resolve(root, path), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    fileName: path,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  });
  const loadedModule = { exports: {} };
  const localRequire = name => {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    assert(!name.startsWith('@/'), `Unmocked workspace import: ${name}`);
    return require(name);
  };
  new Function('require', 'module', 'exports', outputText)(localRequire, loadedModule, loadedModule.exports);
  return loadedModule.exports;
}

const schema = load('src/lib/db/schema.ts');
const blogRedirects = load('src/lib/blog-redirects.ts');
const nextConfig = load('next.config.ts', { './src/lib/blog-redirects': blogRedirects }).default;
const dialect = new PgDialect();
const date = new Date('2026-06-11T05:28:47Z');
const fixtures = [
  { slug: 'published-guide', title: 'Published guide', content: '## One\n\nFirst section.\n\n## Two\n\nSecond section.', published: true, createdAt: date, updatedAt: date, author: 'Test Author', excerpt: 'A public guide.' },
  { slug: 'short-post', title: '', content: 'No story slides.', published: true, createdAt: date, updatedAt: date },
  { slug: 'hidden-draft', title: 'PRIVATE DRAFT', content: 'DO NOT EXPOSE', published: false, scheduledAt: null },
  { slug: 'scheduled-draft', title: 'PRIVATE SCHEDULE', content: 'DO NOT EXPOSE', published: false, scheduledAt: date },
];

function fakeDb(records = fixtures, requirePublished = true) {
  return {
    select(projection) {
      if (requirePublished) assert.deepEqual(projection, { slug: schema.posts.slug }, 'Redirect must not load full article bodies');
      return {
        from(table) {
          assert.equal(table, schema.posts);
          return {
            where(condition) {
              const query = dialect.sqlToQuery(condition);
              assert(query.sql.includes('"slug"'));
              if (requirePublished) {
                assert(query.sql.includes('"published"') && query.sql.includes(' and '), 'Publication must be part of the exact-slug query');
                assert.deepEqual(query.params, [query.params[0], true]);
              }
              return {
                async limit(count) {
                  assert.equal(count, 1);
                  return records.filter(post => post.slug === query.params[0] && (!requirePublished || post.published)).slice(0, count)
                    .map(post => projection ? { slug: post.slug } : post);
                },
              };
            },
          };
        },
      };
    },
  };
}

function handler(db = fakeDb()) {
  return load('src/app/stories/[slug]/route.ts', {
    '@/lib/db': { db }, '@/lib/db/schema': schema, '@/lib/config': { siteConfig }, '@/lib/blog-redirects': blogRedirects,
  });
}
const { GET, dynamic } = handler();
const requestFor = (slug, query = '', method = 'GET', headers) => new NextRequest(`https://www.byteverse.fyi/stories/${encodeURIComponent(slug)}${query}`, { method, headers });
const call = (slug, query = '', method = 'GET', headers) => GET(requestFor(slug, query, method, headers), { params: Promise.resolve({ slug }) });
let passed = 0;
async function test(name, run) {
  await run();
  passed++;
  console.log('PASS:', name);
}

const originalFetch = globalThis.fetch;
globalThis.fetch = () => { throw new Error('Unexpected network call in synthetic redirect tests'); };
try {
  await test('Stories index returns a real 308 to the blog index', async () => {
    const response = await unstable_getResponseFromNextConfig({ url: `${siteConfig.url}/stories`, nextConfig });
    assert.equal(response.status, 308);
    assert.equal(getRedirectUrl(response), `${siteConfig.url}/blog`);
    assert(!existsSync(resolve(root, 'src/app/stories/page.tsx')), 'Do not keep generating a competing story listing');
  });
  await test('Index redirect preserves query values', async () => {
    const response = await unstable_getResponseFromNextConfig({ url: `${siteConfig.url}/stories?utm_source=search&page=2`, nextConfig });
    assert.equal(response.status, 308);
    const target = new URL(getRedirectUrl(response));
    assert.equal(target.pathname, '/blog');
    assert.equal(target.searchParams.get('utm_source'), 'search');
    assert.equal(target.searchParams.get('page'), '2');
  });
  await test('Config does not bypass individual publication checks', async () => {
    for (const path of ['/stories/published-guide', '/stories/hidden-draft', '/stories/no/such/nested/path']) {
      const response = await unstable_getResponseFromNextConfig({ url: siteConfig.url + path, nextConfig });
      assert.equal(getRedirectUrl(response), null);
    }
  });
  await test('Published story permanently redirects to its own article', async () => {
    const response = await call('published-guide');
    assert.equal(response.status, 308);
    assert.equal(response.headers.get('location'), `${siteConfig.url}/blog/published-guide`);
    assert.equal(await response.text(), '');
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(dynamic, 'force-dynamic');
  });
  await test('Redirect does not require a title, two headings or usable slides', async () => {
    const response = await call('short-post');
    assert.equal(response.status, 308);
    assert.equal(response.headers.get('location'), `${siteConfig.url}/blog/short-post`);
  });
  await test('Story query values and repeated keys survive the migration', async () => {
    const query = '?utm_source=google&tag=one&tag=two&name=hello%20world';
    const response = await call('published-guide', query);
    assert.equal(response.headers.get('location'), `${siteConfig.url}/blog/published-guide${query}`);
  });
  await test('Different requests cannot reuse a cached visitor query', async () => {
    const first = await call('published-guide', '?utm_source=first');
    const second = await call('published-guide', '?utm_source=second');
    assert.notEqual(first.headers.get('location'), second.headers.get('location'));
    assert.equal(second.headers.get('cache-control'), 'no-store');
  });
  await test('Host headers and next/redirect queries cannot choose an external origin', async () => {
    const response = await call('published-guide', '?next=https%3A%2F%2Foutside.example&redirect=//outside.example', 'GET', { host: 'outside.example', 'x-forwarded-host': 'outside.example' });
    const target = new URL(response.headers.get('location'));
    assert.equal(target.origin, siteConfig.url);
    assert.equal(target.pathname, '/blog/published-guide');
    assert(!response.headers.has('set-cookie'));
  });
  await test('Unpublished and scheduled drafts stay 404/noindex without disclosure', async () => {
    for (const slug of ['hidden-draft', 'scheduled-draft']) {
      const response = await call(slug);
      assert.equal(response.status, 404);
      assert.equal(response.headers.get('location'), null);
      assert.equal(response.headers.get('x-robots-tag'), 'noindex');
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.equal(await response.text(), 'Not Found');
    }
  });
  await test('Unknown slugs are not redirected to the homepage or unrelated posts', async () => {
    const response = await call('not-a-real-post');
    assert.equal(response.status, 404);
    assert.equal(response.headers.get('location'), null);
  });
  await test('Missing database returns retryable 503, not a permanent 404', async () => {
    const response = await handler(null).GET(requestFor('published-guide'), { params: Promise.resolve({ slug: 'published-guide' }) });
    assert.equal(response.status, 503);
    assert.equal(response.headers.get('retry-after'), '300');
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(response.headers.get('location'), null);
  });
  await test('Database failures do not disclose details or erase indexed URLs', async () => {
    const db = { select() { throw new Error('private connection information'); } };
    const response = await handler(db).GET(requestFor('published-guide'), { params: Promise.resolve({ slug: 'published-guide' }) });
    assert.equal(response.status, 503);
    assert.equal(await response.text(), 'Service Unavailable');
    assert.equal(response.headers.get('retry-after'), '300');
  });
  await test('HEAD inputs preserve the same redirect destination', async () => {
    const response = await call('published-guide', '?ref=head', 'HEAD');
    assert.equal(response.status, 308);
    assert.equal(response.headers.get('location'), `${siteConfig.url}/blog/published-guide?ref=head`);
    assert.equal(await response.text(), '');
  });
  await test('Existing blog redirects remain unchanged', async () => {
    assert.equal(blogRedirects.blogSlugRedirects.length, 9);
    const sources = new Set(blogRedirects.blogSlugRedirects.map(([source]) => source));
    assert.equal(sources.size, 9);
    for (const [source, target] of blogRedirects.blogSlugRedirects) {
      assert(!sources.has(target), 'Aliases must resolve directly, without a loop or redirect chain');
      const response = await unstable_getResponseFromNextConfig({ url: `${siteConfig.url}/blog/${source}`, nextConfig });
      assert.equal(response.status, 308);
      assert.equal(getRedirectUrl(response), `${siteConfig.url}/blog/${target}`);
    }
  });
  await test('Known old story aliases reach the final published article in one hop', async () => {
    const records = blogRedirects.blogSlugRedirects.map(([, slug]) => ({ slug, published: true }));
    const route = handler(fakeDb(records));
    for (const [slug, target] of blogRedirects.blogSlugRedirects) {
      const response = await route.GET(requestFor(slug, '?utm_source=old'), { params: Promise.resolve({ slug }) });
      assert.equal(response.status, 308);
      assert.equal(response.headers.get('location'), `${siteConfig.url}/blog/${target}?utm_source=old`);
    }
  });
  await test('An alias does not expose an unpublished or missing destination', async () => {
    const [slug, target] = blogRedirects.blogSlugRedirects[0];
    for (const records of [[], [{ slug: target, published: false }]]) {
      const response = await handler(fakeDb(records)).GET(requestFor(slug), { params: Promise.resolve({ slug }) });
      assert.equal(response.status, 404);
      assert.equal(response.headers.get('location'), null);
    }
    assert.equal(blogRedirects.resolveBlogSlug('__proto__'), '__proto__');
  });
  await test('Canonical blog metadata no longer advertises the retired AMP page', async () => {
    const source = readFileSync(resolve(root, 'src/app/blog/[slug]/page.tsx'), 'utf8');
    const tree = ts.createSourceFile('page.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const node = tree.statements.find(statement => ts.isFunctionDeclaration(statement) && statement.name?.text === 'generateMetadata');
    assert(node);
    const code = ts.transpileModule(node.getText(tree).replace(/^export\s+/, ''), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
    const generate = new Function('db', 'posts', 'eq', 'siteConfig', 'getPostSeoImages', `${code}; return generateMetadata;`)(fakeDb(fixtures, false), schema.posts, eq, siteConfig, () => []);
    const metadata = await generate({ params: Promise.resolve({ slug: 'published-guide' }) });
    assert.deepEqual(metadata.alternates, { canonical: `${siteConfig.url}/blog/published-guide` });
    assert.equal(metadata.openGraph.type, 'article');
    const hidden = await generate({ params: Promise.resolve({ slug: 'hidden-draft' }) });
    assert.equal(hidden.robots.index, false);
    assert.equal(hidden.title, 'Post Not Found');
  });
  await test('Application contains no AMP story runtime or alternate references', async () => {
    function walk(dir) {
      return readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(resolve(dir, entry.name)) : [resolve(dir, entry.name)]);
    }
    for (const path of walk(resolve(root, 'src')).filter(path => /\.[tj]sx?$/.test(path))) {
      assert(!/application\/amp\+html|cdn\.ampproject\.org|<amp-story\b/.test(readFileSync(path, 'utf8')), `Retired AMP reference: ${path}`);
    }
    for (const path of ['src/app/sitemap.ts', 'src/app/site-map/page.tsx', 'src/app/feed.xml/route.ts', 'src/app/image-sitemap.xml/route.ts']) {
      assert(!readFileSync(resolve(root, path), 'utf8').includes('/stories'), `Do not advertise redirected story URLs in ${path}`);
    }
  });
  await test('Security policy is not weakened to revive the AMP runtime', async () => {
    const rules = await nextConfig.headers();
    const csp = rules.flatMap(rule => rule.headers).find(header => header.key === 'Content-Security-Policy')?.value;
    assert(csp?.includes("object-src 'none'"));
    assert(!csp.includes('cdn.ampproject.org'));
  });
  await test('Global robots headers cannot override a hidden story response', async () => {
    for (const path of ['/stories', '/stories/published-guide', '/stories/hidden-draft']) {
      const response = await unstable_getResponseFromNextConfig({ url: siteConfig.url + path, nextConfig });
      assert.equal(response.headers.get('x-robots-tag'), null, `Global robots override at ${path}`);
    }
    for (const path of ['/', '/blog/published-guide', '/tools', '/stories-about-development']) {
      const response = await unstable_getResponseFromNextConfig({ url: siteConfig.url + path, nextConfig });
      assert(response.headers.get('x-robots-tag')?.startsWith('index, follow'), `Unrelated header changed at ${path}`);
    }
  });
} finally {
  globalThis.fetch = originalFetch;
}
console.log(`PASS: ${passed} synthetic story-migration checks; no environment loading, database or network calls.`);