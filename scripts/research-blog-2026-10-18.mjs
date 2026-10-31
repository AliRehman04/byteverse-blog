import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

// Research only. Public GETs or read-only database queries; no writes or publishing.
const mode = process.argv[2];
assert(process.argv.length === 3 && ['--keywords', '--overlap'].includes(mode));
if (mode === '--keywords') {
  const seeds = [
    'n8n binary data not found', 'n8n expects binary file data',
    'n8n no binary data exists', 'n8n input binary field',
    'n8n binary data lost after code node', 'n8n binary data after merge',
    'n8n object object binary file', 'n8n http request binary file',
    'n8n schedule trigger not working', 'n8n schedule trigger timezone',
    'cron job runs at wrong time', 'cron timezone daylight saving',
    'webp larger than jpg', 'webp bigger than original',
    'csv opens in one column excel', 'excel csv semicolon delimiter',
    'json to csv nested arrays duplicate rows', 'convert nested json arrays to csv',
  ];
  const observations = [];
  for (let index = 0; index < seeds.length; index += 3) {
    observations.push(...await Promise.all(seeds.slice(index, index + 3).map(async seed => {
      const url = new URL('https://suggestqueries.google.com/complete/search');
      url.search = new URLSearchParams({ client: 'firefox', hl: 'en', gl: 'us', q: seed });
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
        assert(response.ok);
        const result = await response.json(); assert(Array.isArray(result[1]));
        return { seed, suggestions: result[1], monthlyVolume: null, keywordDifficulty: null };
      } catch (error) { return { seed, error: error.name, monthlyVolume: null, keywordDifficulty: null }; }
    })));
  }
  console.log(JSON.stringify({ checkedAt: new Date().toISOString(), source: 'Google autocomplete, en/US request context',
    observations, limits: 'Wording only; not measured US demand, volume, difficulty, trend or ranking probability.' }, null, 2));
} else {
  const { default: nextEnv } = await import('@next/env');
  const { neon } = await import('@neondatabase/serverless');
  nextEnv.loadEnvConfig(fileURLToPath(new URL('../', import.meta.url)));
  assert(process.env.DATABASE_URL, 'Database configuration required');
  try {
    const sql = neon(process.env.DATABASE_URL);
    const [snapshot, rows] = await sql.transaction(tx => [
      tx`SELECT count(*)::integer AS total_posts, (count(*) FILTER (WHERE published))::integer AS published_posts,
        md5(coalesce(string_agg((to_jsonb(p) - 'views')::text, '' ORDER BY id), '')) AS editorial_hash FROM posts p`,
      tx`SELECT id, title, slug, published,
        ARRAY(SELECT heading[1] FROM regexp_matches(content, '(?m)^#{2,3} ([^\n]+)', 'g') AS heading) AS headings,
        ARRAY(SELECT excerpt[1] FROM regexp_matches(content, '(?i)(.{0,50}(?:binary data|binary file|schedule trigger|cron|timezone|cartesian|nested array).{0,170})', 'g') AS excerpt LIMIT 4) AS mentions
        FROM posts WHERE title ~* 'n8n|json|csv|automation' OR content ~* 'binary data|binary file|schedule trigger|cron expression|cartesian|nested array' ORDER BY id`,
    ], { isolationLevel: 'RepeatableRead', readOnly: true, fetchOptions: { signal: AbortSignal.timeout(30000) } });
    console.log(JSON.stringify({ checkedAt: new Date().toISOString(), snapshot: snapshot[0], rows,
      limits: 'Read-only topic coverage; not evidence of live keyword rankings or cannibalization.' }, null, 2));
  } catch (error) {
    console.error(error instanceof assert.AssertionError ? error.message : 'Read-only research failed; database connection details withheld.');
    process.exitCode = 1;
  }
}