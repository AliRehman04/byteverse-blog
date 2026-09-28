import assert from 'node:assert/strict';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import ts from 'typescript';

const root = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
const options = new Map(args.map(arg => {
  const index = arg.indexOf('=');
  return index === -1 ? [arg, true] : [arg.slice(0, index), arg.slice(index + 1)];
}));
assert([...options.keys()].every(key => ['--live', '--keywords', '--db-links', '--base-url', '--output'].includes(key)), 'Unknown option');
const baseUrl = String(options.get('--base-url') || 'https://www.byteverse.fyi').replace(/\/$/, '');

const seeds = {
  'json-formatter': ['json formatter', 'json formatter online'],
  'password-generator': ['password generator', 'passphrase generator'],
  'meta-tag-generator': ['meta tag generator', 'open graph meta tag generator'],
  'seo-title-analyzer': ['seo title checker', 'title length checker'],
  'base64-encoder-decoder': ['base64 decoder', 'base64 decode utf8'],
  'word-counter': ['word counter', 'word counter characters'],
  'readability-checker': ['readability checker', 'flesch reading ease checker'],
  'llms-txt-generator-validator': ['llms.txt generator', 'llms.txt validator'],
  'regex-tester': ['regex tester', 'javascript regex tester'],
  'jwt-decoder': ['jwt decoder', 'jwt token expiry checker'],
  'hash-generator': ['sha256 generator', 'file hash checker'],
  'uuid-generator': ['uuid generator', 'uuid v7 generator'],
  'timestamp-converter': ['timestamp converter', 'unix timestamp milliseconds converter'],
  'url-encoder-decoder': ['url decoder', 'url encode query parameters'],
  'diff-checker': ['diff checker', 'compare two texts'],
  'og-preview': ['open graph preview', 'open graph checker'],
  'robots-txt-generator': ['robots.txt generator', 'robots.txt tester'],
  'schema-markup-generator': ['schema markup generator', 'json ld generator'],
  'slug-generator': ['slug generator', 'url slug generator'],
  'css-gradient-generator': ['css gradient generator', 'css radial gradient generator'],
  'color-converter': ['hex to rgb', 'rgb to hsl converter'],
  'box-shadow-generator': ['box shadow generator', 'css inset shadow generator'],
  'ai-content-detector': ['ai content detector', 'ai detector false positive'],
  'plagiarism-checker': ['plagiarism checker', 'compare two documents similarity'],
  'html-editor': ['html editor online', 'html css javascript playground'],
  'html-tag-generator': ['html tag remover', 'text to html converter'],
  'plagiarism-remover': ['paraphrasing tool', 'plagiarism remover'],
  'code-formatter': ['code formatter', 'javascript formatter online'],
  'youtube-tag-generator': ['youtube tag generator', 'youtube tags from title'],
  'text-to-speech': ['text to speech', 'text to speech mp3 download'],
  'qr-code-generator': ['qr code generator', 'wifi qr code generator'],
  'image-compressor': ['image compressor', 'compress image to 100kb'],
  'cron-expression-generator': ['cron expression generator', 'cron expression next run'],
  'ai-prompt-generator': ['ai prompt generator', 'chatgpt prompt generator'],
  'ai-cv-builder': ['free resume builder', 'resume builder free pdf download'],
  'lorem-ipsum-generator': ['lorem ipsum generator', 'placeholder text generator'],
  'markdown-to-html': ['markdown to html', 'markdown table to html'],
  'json-to-csv': ['json to csv', 'nested json to csv'],
  'privacy-policy-generator': ['privacy policy generator', 'privacy policy for website'],
  'json-to-typescript': ['json to typescript', 'json to typescript interface'],
  'flexbox-generator': ['flexbox generator', 'css flexbox playground'],
};

function configFromSource(source) {
  const file = ts.createSourceFile('page.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const result = {};
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(file) === 'toolConfig' && node.initializer && ts.isObjectLiteralExpression(node.initializer)) {
      for (const prop of node.initializer.properties) {
        if (!ts.isPropertyAssignment(prop)) continue;
        if (ts.isStringLiteral(prop.initializer)) result[prop.name.getText(file)] = prop.initializer.text;
        if (ts.isArrayLiteralExpression(prop.initializer)) result[prop.name.getText(file)] = prop.initializer.elements.filter(ts.isStringLiteral).map(item => item.text);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  return result;
}

function attrs(tag) {
  return Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*["']([^"']*)["']/g)].map(match => [match[1].toLowerCase(), match[2]]));
}

function plain(html) {
  return html.replace(/<(script|style|svg)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

async function request(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(25000), headers: { 'User-Agent': 'ByteVerseToolsAudit/1.0 (site-owner read-only audit)' } });
  return { status: response.status, finalUrl: response.url, headers: response.headers, text: await response.text() };
}

async function pool(items, work) {
  const results = new Array(items.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: 2 }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await work(items[index]);
    }
  }));
  return results;
}

const dirs = (await readdir(resolve(root, 'src/app/tools'), { withFileTypes: true })).filter(dir => dir.isDirectory());
const tools = [];
for (const dir of dirs) {
  let source;
  try { source = await readFile(resolve(root, 'src/app/tools', dir.name, 'page.tsx'), 'utf8'); }
  catch (error) { if (error.code === 'ENOENT') continue; throw error; }
  const config = configFromSource(source);
  assert(config.slug === dir.name && config.name, `Missing static tool config: ${dir.name}`);
  assert(seeds[dir.name], `Add research seeds for ${dir.name}`);
  tools.push({ slug: dir.name, name: config.name, url: `${baseUrl}/tools/${dir.name}`, sourceTitle: config.title, sourceDescription: config.description, sourceKeywords: config.keywords, seeds: seeds[dir.name] });
}
tools.sort((a, b) => a.slug.localeCompare(b.slug));

let sitemap;
let directory;
let robots;
if (options.has('--live')) {
  [sitemap, directory, robots] = await Promise.all(['/sitemap.xml', '/tools', '/robots.txt'].map(path => request(`${baseUrl}${path}`)));
  assert(sitemap.status === 200 && directory.status === 200, 'Cannot audit discovery without a working sitemap and tools directory');
  await pool(tools, async tool => {
    try {
      const page = await request(tool.url);
      const meta = [...page.text.matchAll(/<meta\b[^>]*>/gi)].map(match => attrs(match[0]));
      const links = [...page.text.matchAll(/<link\b[^>]*>/gi)].map(match => attrs(match[0]));
      const schemas = [...page.text.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].flatMap(match => { try { return [JSON.parse(match[1])]; } catch { return []; } });
      const main = page.text.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] || page.text.replace(/<(header|footer)\b[^>]*>[\s\S]*?<\/\1>/gi, '');
      tool.live = {
        status: page.status,
        finalUrl: page.finalUrl,
        title: plain(page.text.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || ''),
        description: meta.find(item => item.name === 'description')?.content || null,
        canonical: links.find(item => item.rel === 'canonical')?.href || null,
        robots: meta.filter(item => ['robots', 'googlebot'].includes(item.name)).map(item => item.content),
        xRobotsTag: page.headers.get('x-robots-tag'),
        h1: [...page.text.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map(match => plain(match[1])),
        htmlBytes: Buffer.byteLength(page.text),
        approximateMainWords: plain(main).split(/\s+/).length,
        inSitemap: sitemap.text.includes(`<loc>${tool.url}</loc>`),
        linkedFromDirectory: directory.text.includes(`href="/tools/${tool.slug}"`),
        mainBlogLinks: [...new Set([...main.matchAll(/<a\b[^>]*href=["']([^"']+)["']/gi)].map(match => match[1]).filter(href => href.startsWith('/blog/')))],
        relatedToolsInInitialHtml: [...page.text.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi)].some(match => plain(match[1]) === 'Related Tools'),
        applicationRatings: schemas.flatMap(schema => schema['@type'] === 'WebApplication' && schema.aggregateRating ? [schema.aggregateRating] : []),
        gaScriptReferencePresent: page.text.includes('googletagmanager.com/gtag/js'),
      };
      console.error(`LIVE ${page.status} ${tool.slug} sitemap=${tool.live.inSitemap}`);
    } catch (error) { tool.live = { error: error.message }; console.error(`LIVE ERROR ${tool.slug}: ${error.message}`); }
  });
}

if (options.has('--keywords')) {
  let rateLimited = false;
  await pool(tools, async tool => {
    tool.keywordResearch = [];
    for (const seed of tool.seeds) {
      const url = new URL('https://suggestqueries.google.com/complete/search');
      url.search = new URLSearchParams({ client: 'firefox', hl: 'en', gl: 'us', q: seed }).toString();
      if (rateLimited) { tool.keywordResearch.push({ seed, error: 'Stopped after rate limit' }); continue; }
      try {
        const response = await request(url);
        if (response.status === 429) rateLimited = true;
        assert(response.status === 200, `HTTP ${response.status}`);
        const data = JSON.parse(response.text);
        assert(Array.isArray(data[1]), 'Unexpected suggestion response');
        tool.keywordResearch.push({ seed, source: url.href, checkedAt: new Date().toISOString(), suggestions: data[1], monthlySearchVolume: null, keywordDifficulty: null });
      } catch (error) { tool.keywordResearch.push({ seed, error: error.message }); }
    }
    console.error(`KEYWORDS ${tool.slug}`);
  });
}

if (options.has('--db-links')) {
  const { default: nextEnv } = await import('@next/env');
  nextEnv.loadEnvConfig(root);
  assert(process.env.DATABASE_URL, 'DATABASE_URL unavailable for read-only backlink audit');
  const { neon } = await import('@neondatabase/serverless');
  const sql = neon(process.env.DATABASE_URL);
  const posts = await sql`SELECT slug, content FROM posts WHERE published = true`;
  for (const tool of tools) {
    const path = `/tools/${tool.slug}`;
    tool.explicitBlogLinkSources = posts.filter(post => [...post.content.matchAll(/(?<!!)\[[^\]]+\]\(([^\s)]+)/g)].some(match => {
      try { return new URL(match[1], baseUrl).origin === new URL(baseUrl).origin && new URL(match[1], baseUrl).pathname === path; } catch { return false; }
    })).map(post => post.slug);
  }
}

const report = {
  checkedAt: new Date().toISOString(),
  baseUrl,
  limits: [
    'Autocomplete documents suggested phrases, NOT monthly volume, demand size, Google position or difficulty.',
    'hl=en/gl=us are requested parameters, not guaranteed audience-location measurement.',
    'HTTP/canonical/robots checks do not prove Google indexing. No Search Console property data was available to this audit.',
    'Word estimates include tool UI; neither HTML-to-text ratio nor word count is used as a ranking score.',
    'Explicit stored blog links exclude renderer-inserted links, recommendations and navigation.',
    'A GA script reference does not prove that events are collected correctly.',
  ],
  summary: {
    toolCount: tools.length,
    liveOk: options.has('--live') ? tools.filter(tool => tool.live?.status === 200).length : null,
    missingFromSitemap: options.has('--live') ? tools.filter(tool => tool.live?.inSitemap === false).map(tool => tool.slug) : null,
    nonSelfCanonical: options.has('--live') ? tools.filter(tool => tool.live?.canonical && tool.live.canonical !== tool.url).map(tool => tool.slug) : null,
    noindex: options.has('--live') ? tools.filter(tool => /noindex/i.test([...(tool.live?.robots || []), tool.live?.xRobotsTag].join(' '))).map(tool => tool.slug) : null,
    withApplicationRatings: options.has('--live') ? tools.filter(tool => tool.live?.applicationRatings?.length).length : null,
    keywordRequestsSucceeded: tools.reduce((sum, tool) => sum + (tool.keywordResearch?.filter(item => item.suggestions).length || 0), 0),
    robotsText: robots?.text || null,
  },
  tools,
};

if (options.has('--output')) {
  const output = resolve(root, String(options.get('--output')));
  await writeFile(output, `${JSON.stringify(report, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
  console.log(`Saved new audit artifact: ${output}`);
  console.log(JSON.stringify(report.summary, null, 2));
} else {
  console.log(JSON.stringify(report, null, 2));
}