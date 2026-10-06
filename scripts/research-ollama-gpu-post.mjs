import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const [mode, ids] = process.argv.slice(2);
assert(['--inventory', '--keywords', '--images'].includes(mode), 'Use --inventory, --keywords or --images id,id');

if (mode === '--keywords') {
  const seeds = [
    'ollama not using gpu', 'ollama not using gpu windows', 'ollama using cpu instead of gpu',
    'ollama gpu not detected', 'ollama 100% cpu', 'ollama partial cpu gpu',
    'claude desktop mcp server disconnected', 'docker desktop not starting windows 11',
    'ollama not using amd gpu', 'ollama gpu after sleep',
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
  if (mode === '--images') {
    const photoIds = ids?.split(',') ?? [];
    assert(photoIds.length > 0 && photoIds.every(id => /^[1-9]\d+$/.test(id)));
    const result = await sql.transaction(tx => [tx`
      SELECT p.id, p.slug, photo.id AS photo_id FROM posts p
      CROSS JOIN unnest(${photoIds}::text[]) AS photo(id)
      WHERE coalesce(p.cover_image, '') ~ ('images[.]pexels[.]com/photos/' || photo.id || '([/.]|$)')
        OR p.content ~ ('images[.]pexels[.]com/photos/' || photo.id || '([/.]|$)')
      ORDER BY p.id
    `], { readOnly: true, fetchOptions: { signal: AbortSignal.timeout(25000) } });
    console.log(JSON.stringify(result[0], null, 2));
  } else {
    const [snapshots, drafts, categories, recent, overlap] = await sql.transaction(tx => [
      tx`SELECT count(*)::integer AS total_posts, (count(*) FILTER (WHERE published))::integer AS published_posts,
        md5(coalesce(string_agg((to_jsonb(p) - 'views')::text, '' ORDER BY p.id), '')) AS editorial_hash FROM posts p`,
      tx`SELECT p.id, p.slug, p.published, p.featured, p.scheduled_at, md5(p.content) AS content_md5,
        md5((to_jsonb(p) - 'views')::text) AS editorial_hash FROM posts p WHERE published = false ORDER BY id`,
      tx`SELECT id, name, slug FROM categories ORDER BY id`,
      tx`SELECT id, title, slug, category_id, created_at FROM posts WHERE published = true ORDER BY created_at DESC, id DESC LIMIT 12`,
      tx`SELECT id, title, slug, excerpt, category_id, published FROM posts
        WHERE title ~* 'ollama|local.*ai|ai.*local|llama|mcp|docker|open.source.*ai|gpu|deepseek'
        OR slug ~* 'ollama|local.*ai|ai.*local|llama|mcp|docker|gpu|deepseek' ORDER BY id`,
    ], { isolationLevel: 'RepeatableRead', readOnly: true, fetchOptions: { signal: AbortSignal.timeout(30000) } });
    console.log(JSON.stringify({ checkedAt: new Date().toISOString(), snapshot: snapshots[0], drafts, categories, recent, overlap }, null, 2));
  }
}