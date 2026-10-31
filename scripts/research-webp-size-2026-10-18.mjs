import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

// Public suggestions or explicit read-only content queries; no publication path.
const mode = process.argv[2];
assert(process.argv.length === 3 && ['--keywords', '--overlap'].includes(mode));
if (mode === '--keywords') {
  const seeds = ['webp larger than jpg', 'webp bigger than original', 'jpg to webp increases file size',
    'why is webp larger than jpeg', 'webp lossless larger than jpg', 'webp quality 100 lossless',
    'webp vs jpg size', 'reduce webp file size', 'webp larger than png',
    'n8n schedule trigger not working', 'excel csv dates wrong format',
    'csv opens in one column excel', 'convert nested json arrays to csv',
    'heic to jpg washed out', 'image dpi vs pixels'];
  const observations = [];
  for (let i = 0; i < seeds.length; i += 3) {
    observations.push(...await Promise.all(seeds.slice(i, i + 3).map(async seed => {
      const url = new URL('https://suggestqueries.google.com/complete/search');
      url.search = new URLSearchParams({ client: 'firefox', hl: 'en', gl: 'us', q: seed });
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(15000) }); assert(response.ok);
        const data = await response.json(); assert(Array.isArray(data[1]));
        return { seed, suggestions: data[1], monthlyVolume: null, keywordDifficulty: null };
      } catch (error) { return { seed, error: error.name, monthlyVolume: null, keywordDifficulty: null }; }
    })));
  }
  console.log(JSON.stringify({ checkedAt: new Date().toISOString(), source: 'Google public autocomplete, en/US request parameters',
    observations, limits: 'Wording evidence only, not volume, trends, competition metrics or ranking probability.' }, null, 2));
} else {
  const { default: nextEnv } = await import('@next/env');
  const { neon } = await import('@neondatabase/serverless');
  nextEnv.loadEnvConfig(fileURLToPath(new URL('../', import.meta.url)));
  assert(process.env.DATABASE_URL, 'Database configuration missing');
  try {
    const sql = neon(process.env.DATABASE_URL);
    const [snapshot, rows] = await sql.transaction(tx => [
      tx`SELECT count(*)::integer AS total_posts, (count(*) FILTER (WHERE published))::integer AS published_posts,
        md5(coalesce(string_agg((to_jsonb(p) - 'views')::text, '' ORDER BY id), '')) AS editorial_hash FROM posts p`,
      tx`SELECT id, title, slug, published,
        ARRAY(SELECT heading[1] FROM regexp_matches(content, '(?m)^#{2,3} ([^\n]+)', 'g') AS heading) AS headings,
        ARRAY(SELECT excerpt[1] FROM regexp_matches(content, '(?i)(.{0,60}(?:WebP|lossless|larger.{0,20}(?:JPG|JPEG)|DPI|HDR).{0,150})', 'g') AS excerpt LIMIT 4) AS mentions
        FROM posts WHERE content ~* 'WebP|lossless|larger.{0,20}(?:JPG|JPEG)|DPI|HDR' ORDER BY id`,
    ], { isolationLevel: 'RepeatableRead', readOnly: true, fetchOptions: { signal: AbortSignal.timeout(30000) } });
    console.log(JSON.stringify({ checkedAt: new Date().toISOString(), snapshot: snapshot[0], rows,
      limits: 'Content coverage only; no ranking or traffic inference.' }, null, 2));
  } catch (error) {
    console.error(error instanceof assert.AssertionError ? error.message : 'Read-only research failed; database details withheld.');
    process.exitCode = 1;
  }
}