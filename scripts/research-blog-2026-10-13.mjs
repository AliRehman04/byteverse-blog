import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const [mode, file] = process.argv.slice(2);
assert(['--keywords', '--duplicates'].includes(mode));

if (mode === '--keywords') {
  assert(!file);
  const seeds = [
    'png to jpg black background', 'png turns black when converted to jpg',
    'png black background', 'png to jpg white background',
    'why is my png not transparent', 'png black background when copied',
    'webp larger than jpg', 'webp bigger than original',
    'image too large after compression', 'image under 50kb not uploading',
    'chatgpt download file not found', 'chatgpt failed to get upload status',
    'n8n binary data not found', 'n8n expects binary file data',
    'unexpected token less than json', 'unexpected token in json at position 0',
    'png black background photoshop', 'remove black background after converting png to jpg',
  ];
  const observations = [];
  for (let index = 0; index < seeds.length; index += 2) {
    observations.push(...await Promise.all(seeds.slice(index, index + 2).map(async seed => {
      const url = new URL('https://suggestqueries.google.com/complete/search');
      url.search = new URLSearchParams({ client: 'firefox', hl: 'en', gl: 'us', q: seed });
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
        assert(response.ok);
        const data = await response.json();
        assert(Array.isArray(data[1]));
        return { seed, suggestions: data[1], monthlyVolume: null, keywordDifficulty: null };
      } catch (error) { return { seed, error: error.name }; }
    })));
  }
  console.log(JSON.stringify({ checkedAt: new Date().toISOString(), source: 'Google public autocomplete',
    context: 'English, requested US context; no country-specific demand measurement', observations,
    limits: 'Suggestions are wording evidence, not volume, difficulty, trends, competition or ranking probabilities.' }, null, 2));
} else {
  assert(file && basename(file) === file && /^[a-z0-9-]+\.md$/.test(file), 'Pass one article filename from scripts/content');
  const content = readFileSync(resolve(root, 'scripts/content', file), 'utf8').replace(/\r\n?/g, '\n').trim();
  const tokens = text => (text.split(/\n## Sources and Image Credits/)[0]
    .replace(/```[\s\S]*?```/g, '').replace(/!\[[^\]]*\]\([^\n]+\)/g, '')
    .replace(/\[([^\]]+)\]\([^\n)]+\)/g, '$1').toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []);
  const shingles = words => new Set(words.slice(0, Math.max(0, words.length - 4)).map((_, index) => words.slice(index, index + 5).join(' ')));
  const paragraphs = text => new Set(text.split(/\r?\n\s*\r?\n/).map(tokens).filter(words => words.length >= 30).map(words => words.join(' ')));
  const candidate = shingles(tokens(content)), candidateParagraphs = paragraphs(content), matches = [];
  const { default: nextEnv } = await import('@next/env');
  const { neon } = await import('@neondatabase/serverless');
  nextEnv.loadEnvConfig(root);
  assert(process.env.DATABASE_URL, 'Database configuration missing');
  try {
    const sql = neon(process.env.DATABASE_URL);
    const snapshot = async () => (await sql.transaction(tx => [tx`SELECT count(*)::integer AS count,
      md5(coalesce(string_agg((to_jsonb(p) - 'views')::text, '' ORDER BY id), '')) AS hash FROM posts p`],
    { isolationLevel: 'RepeatableRead', readOnly: true }))[0][0];
    const before = await snapshot();
    let lastId = 0;
    for (;;) {
      const [rows] = await sql.transaction(tx => [tx`SELECT id, title, slug, published, content FROM posts WHERE id > ${lastId} ORDER BY id LIMIT 10`],
        { isolationLevel: 'RepeatableRead', readOnly: true });
      if (!rows.length) break;
      for (const row of rows) {
        const words = tokens(row.content), other = shingles(words), otherParagraphs = paragraphs(row.content);
        const common = [...candidate].filter(phrase => other.has(phrase)).length;
        matches.push({ id: row.id, slug: row.slug, published: row.published, sharedFiveWordPhrases: common,
          candidateOverlapPercent: Number((common / candidate.size * 100).toFixed(2)),
          jaccardPercent: Number((common / (candidate.size + other.size - common) * 100).toFixed(2)),
          exactParagraphsAtLeast30Words: [...candidateParagraphs].filter(paragraph => otherParagraphs.has(paragraph)).length,
          exactNormalizedBody: tokens(content).join(' ') === words.join(' ') });
      }
      lastId = rows.at(-1).id;
    }
    assert.deepEqual(await snapshot(), before, 'Inventory changed; repeat the read-only comparison');
    assert.equal(matches.length, before.count);
    console.log(JSON.stringify({ checkedAt: new Date().toISOString(), file, contentSha256: createHash('sha256').update(content).digest('hex'),
      comparedPosts: matches.length, candidateFiveWordPhrases: candidate.size, editorialSnapshot: before,
      exactNormalizedBodyMatches: matches.filter(item => item.exactNormalizedBody).length,
      identicalParagraphMatches: matches.filter(item => item.exactParagraphsAtLeast30Words),
      nearest: matches.sort((a, b) => b.candidateOverlapPercent - a.candidateOverlapPercent).slice(0, 8),
      limits: 'Local lexical overlap is not semantic equivalence or a web-wide originality certificate. Editorial intent reviewed separately. No database writes.' }, null, 2));
  } catch (error) {
    console.error(error instanceof assert.AssertionError ? error.message : 'Read-only comparison failed; database details withheld.');
    process.exitCode = 1;
  }
}