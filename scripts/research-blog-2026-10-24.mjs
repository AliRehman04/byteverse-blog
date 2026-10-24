import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

// Research only: public GETs and an explicitly read-only database transaction.
// No inserts, updates, publishing, credential output or file writes.
const [mode, ...queries] = process.argv.slice(2);
assert(['--keywords', '--serps', '--bing', '--ddg', '--inventory', '--overlap'].includes(mode), 'Use --keywords, --serps [queries], --inventory or --overlap [terms]');
const seeds = [
  // Local AI / developer tooling problems
  'ollama change model location windows', 'ollama models folder windows', 'ollama move models to another drive', 'ollama_models environment variable',
  'cursor ai not working', 'cursor agent stuck', 'claude code rate limit', 'codex cli windows',
  'gemini cli not working', 'gemini cli install windows',
  // Windows / Office problems
  'heic not opening windows 11', 'windows 11 photos app not opening heic', 'excel pdf to excel formatting wrong', 'pdf table to excel columns messed up',
  'convert bank statement pdf to excel', 'excel power query pdf not detecting table',
  // Image / file size problems (tool-aligned)
  'compress image to 100kb', 'reduce image size without losing quality', 'image too large to upload', 'jpg to webp quality loss',
  // JSON / data problems (tool-aligned)
  'unexpected token in json at position 0', 'json parse error unexpected end of input', 'json to excel nested', 'excel json import nested array',
  // Automation
  'n8n webhook not receiving data', 'n8n schedule trigger not working', 'make.com vs n8n',
  // Browser / web
  'chrome memory saver disable', 'edge copilot sidebar remove', 'chatgpt image generation not working',
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
        paa: [...document.querySelectorAll('[data-q], div[role="heading"][aria-level="3"] span')].map(e => e.getAttribute('data-q') || e.textContent).filter(t => t && t.endsWith('?')).slice(0, 12),
        results: [...document.querySelectorAll('a')].filter(a => a.querySelector('h3'))
          .map(a => ({ title: a.querySelector('h3').textContent, url: a.href })).slice(0, 12),
        text: document.body?.innerText.slice(0, 6000) ?? '',
      }));
      const blocked = /\/sorry\/|unusual traffic|not a robot/i.test(result.url + result.text);
      console.log(JSON.stringify({ checkedAt: new Date().toISOString(), query, navigationError, blocked, url: result.url, paa: [...new Set(result.paa)], results: result.results,
        limits: 'Rendered first-page observation in a fresh desktop browser, not a neutral geo-located rank tracker. No CAPTCHA bypass.' }, null, 2));
      if (blocked) break;
    }
  } finally { await browser.close(); }
} else if (mode === '--bing') {
  // Fallback first-page observation when Google serves a CAPTCHA; plain GET of public Bing HTML, no login or bypass.
  assert(queries.length > 0 && queries.length <= 8);
  for (const query of queries) {
    const url = new URL('https://www.bing.com/search');
    url.search = new URLSearchParams({ q: query, setlang: 'en', cc: 'US' });
    try {
      const response = await fetch(url, { headers: { 'accept-language': 'en-US,en;q=0.9', 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36' }, signal: AbortSignal.timeout(20000) });
      const html = await response.text();
      const results = [...html.matchAll(/<li class="b_algo"[\s\S]*?<h2[^>]*><a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)].map(m => ({ url: m[1], title: m[2].replace(/<[^>]+>/g, '').trim() })).slice(0, 10);
      const related = [...html.matchAll(/<div class="b_rs"[\s\S]*?<\/div>\s*<\/div>/g)].flatMap(m => [...m[0].matchAll(/<a[^>]*>([\s\S]*?)<\/a>/g)].map(a => a[1].replace(/<[^>]+>/g, '').trim())).slice(0, 10);
      console.log(JSON.stringify({ checkedAt: new Date().toISOString(), query, status: response.status, results, related, limits: 'Bing HTML first page, en-US request parameters; not Google rank data.' }, null, 2));
    } catch (error) { console.log(JSON.stringify({ query, error: error.name })); }
  }
} else if (mode === '--ddg') {
  // Second fallback: DuckDuckGo's HTML endpoint (public GET, no login, no bypass).
  assert(queries.length > 0 && queries.length <= 8);
  for (const query of queries) {
    const url = new URL('https://html.duckduckgo.com/html/');
    url.search = new URLSearchParams({ q: query, kl: 'us-en' });
    try {
      const response = await fetch(url, { headers: { 'accept-language': 'en-US,en;q=0.9', 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36' }, signal: AbortSignal.timeout(20000) });
      const html = await response.text();
      const decode = s => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
      const results = [...html.matchAll(/<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?(?:<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>)?/g)].map(m => {
        const raw = new URL(m[1], 'https://duckduckgo.com'); const target = raw.searchParams.get('uddg') ?? raw.href;
        return { url: target, title: decode(m[2]), snippet: decode(m[3] ?? '').slice(0, 220) };
      }).slice(0, 10);
      console.log(JSON.stringify({ checkedAt: new Date().toISOString(), query, status: response.status, results, limits: 'DuckDuckGo HTML first page, us-en request parameter; not Google rank data.' }, null, 2));
    } catch (error) { console.log(JSON.stringify({ query, error: error.name })); }
    await new Promise(resolve => setTimeout(resolve, 2500));
  }
} else {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const { default: nextEnv } = await import('@next/env');
  const { neon } = await import('@neondatabase/serverless');
  nextEnv.loadEnvConfig(root);
  assert(process.env.DATABASE_URL, 'Database configuration required');
  const sql = neon(process.env.DATABASE_URL);
  try {
    if (mode === '--inventory') {
      assert.equal(queries.length, 0);
      const [snapshot, rows] = await sql.transaction(tx => [
        tx`SELECT count(*)::integer AS total_posts, (count(*) FILTER (WHERE published))::integer AS published_posts,
          md5(coalesce(string_agg((to_jsonb(p) - 'views')::text, '' ORDER BY id), '')) AS editorial_hash FROM posts p`,
        tx`SELECT p.id, p.slug, p.views, p.category_id, to_char(p.created_at, 'YYYY-MM-DD') AS created, left(p.title, 90) AS title
          FROM posts p WHERE p.published ORDER BY p.views DESC, p.id DESC`,
      ], { isolationLevel: 'RepeatableRead', readOnly: true });
      console.log(JSON.stringify({ checkedAt: new Date().toISOString(), snapshot: snapshot[0], rows, limits: 'Stored view counters only; not analytics or search impressions.' }, null, 1));
    } else {
      assert(queries.length > 0 && queries.length <= 6);
      const pattern = queries.map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
      const rows = await sql.transaction(tx => [
        tx`SELECT id, title, slug, published,
          ARRAY(SELECT heading[1] FROM regexp_matches(content, '(?m)^#{2,3} ([^\n]+)', 'g') AS heading) AS headings,
          ARRAY(SELECT excerpt[1] FROM regexp_matches(content, '(?i)(.{0,70}(?:' || ${pattern} || ').{0,160})', 'g') AS excerpt LIMIT 4) AS mentions
          FROM posts WHERE content ~* ${pattern} OR title ~* ${pattern} ORDER BY id`,
      ], { isolationLevel: 'RepeatableRead', readOnly: true });
      console.log(JSON.stringify({ checkedAt: new Date().toISOString(), terms: queries, rows: rows[0], limits: 'Keyword coverage only.' }, null, 1));
    }
  } catch (error) { console.error('Database read failed', error.code ?? error.name); process.exitCode = 1; }
}
