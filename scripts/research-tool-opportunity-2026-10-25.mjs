import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseDocument, DomUtils } from 'htmlparser2';

const root = fileURLToPath(new URL('../', import.meta.url));
const [mode, ...queries] = process.argv.slice(2);
assert(['--keywords', '--serps'].includes(mode));
const groups = {
  csvCompare: ['compare two csv files online', 'csv diff', 'csv compare by key', 'compare csv files ignore row order', 'compare two csv files and find differences', 'csv comparison tool'],
  csvToJson: ['csv to json converter', 'csv to json nested', 'csv to json online', 'convert csv to json array', 'csv to json preserve leading zeros'],
  csvToExcel: ['csv to excel converter', 'csv to xlsx keep leading zeros', 'csv to excel without losing formatting', 'convert csv to excel utf8', 'csv to xlsx online'],
  favicon: ['favicon generator', 'favicon generator svg', 'favicon generator from image', 'favicon generator no background', 'favicon generator dark mode'],
  contrast: ['color contrast checker', 'wcag contrast checker', 'color contrast checker transparent background', 'contrast checker image', 'accessible color palette generator'],
  robots: ['robots txt tester', 'robots txt validator', 'robots txt test url', 'robots txt checker googlebot', 'robots txt wildcard tester'],
};
const headers = { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0 Safari/537.36', 'accept-language': 'en-US,en;q=0.9' };
const text = element => DomUtils.textContent(element).replace(/\s+/g, ' ').trim();
const classIs = (element, name) => (element.attribs?.class ?? '').split(/\s+/).includes(name);
const nodes = (root, predicate) => DomUtils.findAll(predicate, root.children ?? []);

let report;
if (mode === '--keywords') {
  assert.equal(queries.length, 0);
  const observations = [];
  const seeds = Object.entries(groups).flatMap(([candidate, values]) => values.map(seed => ({ candidate, seed })));
  for (let i = 0; i < seeds.length; i += 3) {
    observations.push(...await Promise.all(seeds.slice(i, i + 3).map(async item => {
      const url = new URL('https://suggestqueries.google.com/complete/search');
      url.search = new URLSearchParams({ client: 'firefox', hl: 'en', gl: 'us', q: item.seed });
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
        assert(response.ok, `HTTP ${response.status}`);
        const body = await response.json();
        assert(Array.isArray(body[1]));
        return { ...item, suggestions: body[1], monthlyVolume: null, keywordDifficulty: null };
      } catch (error) { return { ...item, error: error.message, monthlyVolume: null, keywordDifficulty: null }; }
    })));
  }
  report = { checkedAt: new Date().toISOString(), source: 'Google public autocomplete', context: 'hl=en, gl=us parameters; not measured US demand', observations,
    limits: 'Autocomplete validates phrasing only. No volume, difficulty, trend, conversion, ranking or traffic forecast is available.' };
} else {
  assert(queries.length > 0 && queries.length <= 10);
  const observations = [];
  for (const query of queries) {
    const url = new URL('https://html.duckduckgo.com/html/');
    url.search = new URLSearchParams({ q: query, kl: 'us-en' });
    try {
      const response = await fetch(url, { headers, signal: AbortSignal.timeout(25000) });
      const body = await response.text(), dom = parseDocument(body);
      const results = nodes(dom, el => classIs(el, 'result')).flatMap(el => {
        const anchor = nodes(el, node => node.name === 'a' && classIs(node, 'result__a'))[0];
        if (!anchor) return [];
        const raw = new URL(anchor.attribs.href, url);
        return [{ title: text(anchor), url: raw.searchParams.get('uddg') ?? raw.href, snippet: nodes(el, node => classIs(node, 'result__snippet')).map(text).join(' ').slice(0, 600) }];
      }).slice(0, 10);
      observations.push({ query, status: response.status, blocked: /anomaly\.js|unfortunately, bots|anomaly-modal/i.test(body), results });
    } catch (error) { observations.push({ query, error: error.message }); }
  }
  report = { checkedAt: new Date().toISOString(), source: 'DuckDuckGo HTML first page', context: 'us-en request parameter; not neutral ranking data', observations,
    limits: 'Observed results are not Google rankings or keyword difficulty. No CAPTCHA bypass and no authenticated analytics.' };
}
const suffix = mode === '--keywords' ? 'autocomplete' : `serps-${Date.now()}`;
const path = resolve(root, `docs/content-research/2026-10-25-new-tool-${suffix}.json`);
await writeFile(path, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(report, null, 2));
console.log(`REPORT: ${path}`);