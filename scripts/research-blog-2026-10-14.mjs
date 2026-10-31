import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

// Research only: public GETs and explicitly read-only database transactions.
// No inserts, updates, scheduling, publishing, credentials output or file writes.
const [mode, ...queries] = process.argv.slice(2);
assert(['--keywords', '--serps', '--overlap'].includes(mode), 'Use --keywords, --serps [queries], or --overlap');
const seeds = [
  'n8n expects binary file data', 'n8n binary data not found', 'n8n no binary data exists',
  'json parse large numbers', 'json parse loses precision', 'json parse changes numbers',
  'javascript json parse bigint', 'json parse large integer precision',
  'webp larger than jpg', 'webp bigger than original', 'webp quality vs jpeg quality',
  'csv opens in one column excel', 'excel csv semicolon delimiter',
  'excel csv dates wrong format', 'power query csv dates wrong locale',
  'convert nested json arrays to csv', 'json to csv repeat parent fields',
  'unexpected token less than json', 'fetch returns html instead of json',
  'json parse rounding numbers', 'json stringify bigint', 'json large numbers as strings',
];

if (mode === '--keywords') {
  assert.equal(queries.length, 0);
  const observations = [];
  for (let i = 0; i < seeds.length; i += 3) {
    observations.push(...await Promise.all(seeds.slice(i, i + 3).map(async seed => {
      const url = new URL('https://suggestqueries.google.com/complete/search');
      url.search = new URLSearchParams({ client: 'firefox', hl: 'en', gl: 'us', q: seed });
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
        assert(response.ok);
        const data = await response.json();
        assert(Array.isArray(data[1]));
        return { seed, suggestions: data[1], monthlyVolume: null, keywordDifficulty: null };
      } catch (error) { return { seed, error: error.name, monthlyVolume: null, keywordDifficulty: null }; }
    })));
  }
  console.log(JSON.stringify({ checkedAt: new Date().toISOString(), source: 'Google public autocomplete',
    requestedContext: 'English / gl=us; not measured US demand', observations,
    limits: 'Wording evidence only, not volumes, difficulty, trends, rank or traffic predictions.' }, null, 2));
} else if (mode === '--serps') {
  assert(queries.length > 0 && queries.length <= 8);
  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const context = await browser.newContext({ locale: 'en-US' });
    const page = await context.newPage();
    for (const query of queries) {
      const url = new URL('https://www.google.com/search');
      url.search = new URLSearchParams({ q: query, hl: 'en', gl: 'us', pws: '0' });
      let navigationError = null;
      try {
        await page.goto(url.href, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.locator('h3').first().waitFor({ timeout: 12000 });
      } catch (error) { navigationError = error.name; }
      const result = await page.evaluate(() => ({
        url: location.href, title: document.title,
        text: document.body?.innerText.slice(0, 19000) ?? '',
        results: [...document.querySelectorAll('a')].filter(a => a.querySelector('h3'))
          .map(a => ({ title: a.querySelector('h3').textContent, url: a.href })),
      }));
      const blocked = /\/sorry\/|unusual traffic|not a robot/i.test(result.url + result.text);
      console.log(JSON.stringify({ checkedAt: new Date().toISOString(), query, navigationError, blocked, ...result,
        limits: 'Rendered first-page observation in a fresh desktop browser, not a neutral geo-located rank tracker. No CAPTCHA bypass.' }, null, 2));
      if (blocked) break;
    }
  } finally { await browser.close(); }
} else {
  assert.equal(queries.length, 0);
  const root = fileURLToPath(new URL('../', import.meta.url));
  const { default: nextEnv } = await import('@next/env');
  const { neon } = await import('@neondatabase/serverless');
  nextEnv.loadEnvConfig(root);
  assert(process.env.DATABASE_URL, 'Database configuration required');
  try {
    const sql = neon(process.env.DATABASE_URL);
    const [snapshot, rows] = await sql.transaction(tx => [
      tx`SELECT count(*)::integer AS total_posts, (count(*) FILTER (WHERE published))::integer AS published_posts,
        md5(coalesce(string_agg((to_jsonb(p) - 'views')::text, '' ORDER BY id), '')) AS editorial_hash FROM posts p`,
      tx`SELECT id, title, slug, published,
        ARRAY(SELECT heading[1] FROM regexp_matches(content, '(?m)^#{2,3} ([^\n]+)', 'g') AS heading) AS headings,
        ARRAY(SELECT excerpt[1] FROM regexp_matches(content, '(?i)(.{0,70}(?:binary data|binary file|JSON.parse|bigint|safe.integer|precision|one column|semicolon|WebP|locale|nested array).{0,180})', 'g') AS excerpt LIMIT 5) AS mentions
        FROM posts WHERE content ~* 'binary data|binary file|JSON.parse|bigint|safe.integer|precision|one column|semicolon|WebP|locale|nested array'
          OR title ~* 'n8n|json|csv|JavaScript' ORDER BY id`,
    ], { isolationLevel: 'RepeatableRead', readOnly: true, fetchOptions: { signal: AbortSignal.timeout(30000) } });
    console.log(JSON.stringify({ checkedAt: new Date().toISOString(), snapshot: snapshot[0], rows,
      limits: 'Read-only corpus coverage, not keyword rankings or semantic originality certification.' }, null, 2));
  } catch (error) {
    console.error(error instanceof assert.AssertionError ? error.message : 'Read-only research failed; database connection details withheld.');
    process.exitCode = 1;
  }
}