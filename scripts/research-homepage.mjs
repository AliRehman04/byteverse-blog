import assert from 'node:assert/strict';
import { parseDocument, DomUtils } from 'htmlparser2';

const mode = process.argv[2];
assert(process.argv.length === 3 && ['--keywords', '--live'].includes(mode));
if (mode === '--keywords') {
  const seeds = ['free developer tools', 'online developer tools', 'developer tools online free',
    'free online tools for developers', 'free seo tools', 'seo title checker', 'meta tag generator',
    'json to csv converter', 'json formatter online', 'image compressor online',
    'invoice pdf to excel', 'text similarity checker', 'practical tech guides',
    'ai tools guides', 'coding tutorials for beginners', 'byteverse'];
  const observations = [];
  for (let i = 0; i < seeds.length; i += 3) {
    observations.push(...await Promise.all(seeds.slice(i, i + 3).map(async seed => {
      const url = new URL('https://suggestqueries.google.com/complete/search');
      url.search = new URLSearchParams({ client: 'firefox', hl: 'en', gl: 'us', q: seed });
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(15000) }); assert(response.ok);
        const value = await response.json(); assert(Array.isArray(value[1]));
        return { seed, suggestions: value[1], volume: null, difficulty: null };
      } catch (error) { return { seed, error: error.name, volume: null, difficulty: null }; }
    })));
  }
  console.log(JSON.stringify({ checkedAt: new Date().toISOString(), observations,
    limits: 'Autocomplete wording only. No authenticated GSC, volume, KD, CTR or ranking forecasts.' }, null, 2));
} else {
  const url = 'https://www.byteverse.fyi/';
  const response = await fetch(url, { signal: AbortSignal.timeout(25000), redirect: 'manual' });
  const body = await response.text(), dom = parseDocument(body);
  const all = predicate => DomUtils.findAll(predicate, dom.children);
  const schemas = all(node => node.name === 'script' && node.attribs.type === 'application/ld+json').map(node => JSON.parse(DomUtils.textContent(node)));
  console.log(JSON.stringify({ checkedAt: new Date().toISOString(), url, status: response.status,
    htmlBytes: Buffer.byteLength(body), title: all(node => node.name === 'title').map(DomUtils.textContent),
    h1: all(node => node.name === 'h1').map(DomUtils.textContent),
    description: all(node => node.name === 'meta' && node.attribs.name === 'description').map(node => node.attribs.content),
    canonical: all(node => node.name === 'link' && node.attribs.rel === 'canonical').map(node => node.attribs.href),
    robots: response.headers.get('x-robots-tag'), cache: response.headers.get('cache-control'),
    headings: all(node => /^h[23]$/.test(node.name ?? '')).map(node => DomUtils.textContent(node)),
    schemas, scripts: all(node => node.name === 'script' && node.attribs.src).map(node => node.attribs.src),
    imagePreloads: all(node => node.name === 'link' && node.attribs.rel === 'preload' && node.attribs.as === 'image').map(node => node.attribs),
    limits: 'Public server HTML only, not field performance or proof of Google indexing.' }, null, 2));
}