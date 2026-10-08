import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const mode = process.argv[2];
assert(process.argv.length === 3 && ['--keywords', '--inventory'].includes(mode), 'Use --keywords or --inventory');

if (mode === '--keywords') {
  const seeds = [
    'excel removes leading zeros csv', 'keep leading zeros csv excel',
    'excel csv long numbers scientific notation', 'excel automatic data conversion csv',
    'csv opens in one column excel', 'excel csv semicolon delimiter',
    'convert nested json to csv', 'json to csv keep leading zeros',
    'claude code not recognized windows', 'claude code command not found windows',
    'chatgpt download file not found', 'chatgpt file link expired',
  ];
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
        return { seed, source: url.href, checkedAt: new Date().toISOString(), suggestions: data[1], monthlyVolume: null, keywordDifficulty: null };
      } catch (error) {
        return { seed, source: url.href, error: error.name };
      }
    })));
  }
  console.log(JSON.stringify({ observations, limits: 'Autocomplete records wording, not search volume, keyword difficulty or rankings.' }, null, 2));
} else {
  const { default: nextEnv } = await import('@next/env');
  const { neon } = await import('@neondatabase/serverless');
  nextEnv.loadEnvConfig(root);
  assert(process.env.DATABASE_URL, 'Database configuration missing');
  try {
    const sql = neon(process.env.DATABASE_URL);
    const [snapshots, drafts, categories, overlap, mentions] = await sql.transaction(tx => [
      tx`SELECT count(*)::integer AS total_posts, (count(*) FILTER (WHERE published))::integer AS published_posts,
        md5(coalesce(string_agg((to_jsonb(p) - 'views')::text, '' ORDER BY p.id), '')) AS editorial_hash FROM posts p`,
      tx`SELECT id, slug, published, featured, scheduled_at, md5(content) AS content_md5,
        md5((to_jsonb(p) - 'views')::text) AS editorial_hash FROM posts p WHERE NOT published ORDER BY id`,
      tx`SELECT id, name, slug FROM categories ORDER BY id`,
      tx`SELECT id, title, slug, excerpt, published FROM posts
        WHERE title ~* 'csv|json|excel|claude.*code|data analyst' OR slug ~* 'csv|json|excel|claude.*code|data-analyst' ORDER BY id`,
      tx`SELECT id, slug, published, substring(content from '(?i).{0,120}(leading zeros|scientific notation|one column).{0,240}') AS excerpt
        FROM posts WHERE content ~* 'leading zeros|scientific notation|one column' ORDER BY id`,
    ], { isolationLevel: 'RepeatableRead', readOnly: true, fetchOptions: { signal: AbortSignal.timeout(30000) } });
    console.log(JSON.stringify({ checkedAt: new Date().toISOString(), gscConfigured: ['GSC_CLIENT_EMAIL', 'GSC_PRIVATE_KEY', 'GSC_SITE_URL'].every(key => Boolean(process.env[key])), snapshot: snapshots[0], drafts, categories, overlap, mentions }, null, 2));
  } catch (error) {
    const code = /^[A-Z0-9]{5}$/.test(error.code ?? '') ? error.code : 'unavailable';
    console.error(`Read-only inventory failed (SQLSTATE ${code}); connection details withheld.`);
    process.exitCode = 1;
  }
}