import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const [mode] = process.argv.slice(2);
assert(['--inventory', '--keywords'].includes(mode), 'Use --inventory or --keywords');

if (mode === '--keywords') {
  const seeds = [
    'gemini not showing in google docs', 'gemini not showing in gmail', 'gemini in google sheets not working', 'gemini not available in workspace',
    'how to enable gemini in google docs', 'ask gemini missing google docs',
    'copilot not showing in word', 'claude code not working', 'cursor ai not working', 'docker desktop not starting windows 11',
    'notebooklm audio overview not working', 'zapier zap not triggering',
  ];
  const results = [];
  for (let start = 0; start < seeds.length; start += 3) {
    results.push(...await Promise.all(seeds.slice(start, start + 3).map(async seed => {
      const url = new URL('https://suggestqueries.google.com/complete/search');
      url.search = new URLSearchParams({ client: 'firefox', hl: 'en', gl: 'us', q: seed });
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
        assert(response.ok, `HTTP ${response.status}`);
        const data = await response.json();
        return { seed, source: url.href, checkedAt: new Date().toISOString(), suggestions: data[1], monthlyVolume: null, keywordDifficulty: null };
      } catch (error) { return { seed, source: url.href, error: error.name }; }
    })));
  }
  console.log(JSON.stringify({ mode, observations: results, limits: 'Autocomplete wording, not volume, difficulty, rankings or demand measurements.' }, null, 2));
} else {
  const { default: nextEnv } = await import('@next/env');
  const { neon } = await import('@neondatabase/serverless');
  nextEnv.loadEnvConfig(root);
  assert(process.env.DATABASE_URL, 'Database configuration missing');
  const sql = neon(process.env.DATABASE_URL);
  const [snapshots, drafts, categories, recent, overlap] = await sql.transaction(tx => [
    tx`SELECT count(*)::integer AS total_posts, (count(*) FILTER (WHERE published))::integer AS published_posts,
      md5(coalesce(string_agg((to_jsonb(p) - 'views')::text, '' ORDER BY p.id), '')) AS editorial_hash FROM posts p`,
    tx`SELECT p.id, p.slug, p.published, p.featured, p.scheduled_at, md5(p.content) AS content_md5,
      md5((to_jsonb(p) - 'views')::text) AS editorial_hash FROM posts p WHERE published = false ORDER BY id`,
    tx`SELECT id, name, slug FROM categories ORDER BY id`,
    tx`SELECT id, title, slug, category_id, created_at FROM posts WHERE published = true ORDER BY created_at DESC, id DESC LIMIT 12`,
    tx`SELECT id, title, slug, excerpt, category_id, published FROM posts
      WHERE title ~* 'gemini|workspace|google docs|sheets|gmail|copilot' OR slug ~* 'gemini|workspace|google-docs|sheets|gmail|copilot' ORDER BY id`,
  ], { isolationLevel: 'RepeatableRead', readOnly: true, fetchOptions: { signal: AbortSignal.timeout(30000) } });
  console.log(JSON.stringify({ checkedAt: new Date().toISOString(), snapshot: snapshots[0], drafts, categories, recent, overlap }, null, 2));
}
