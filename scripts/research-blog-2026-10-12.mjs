import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const mode = process.argv[2];
assert(process.argv.length === 3 && ['--inventory', '--keywords', '--duplicates'].includes(mode), 'Use --inventory, --keywords or --duplicates');

if (mode === '--keywords') {
  const seeds = [
    'image under 50kb not uploading', 'jpg file not supported upload',
    'heic to jpg windows without losing quality', 'avif image not supported upload',
    'excel csv special characters', 'excel csv utf 8 garbled',
    'excel csv accents wrong', 'excel csv utf8 bom',
    'csv opens in one column excel', 'csv excel semicolon delimiter',
    'chatgpt download file not found', 'chatgpt failed to get upload status',
    'convert nested json arrays to csv', 'json to csv repeat parent fields',
    'change image dpi without resizing', '300 dpi photo upload',
  ];
  const observations = [];
  for (let i = 0; i < seeds.length; i += 2) {
    observations.push(...await Promise.all(seeds.slice(i, i + 2).map(async seed => {
      const url = new URL('https://suggestqueries.google.com/complete/search');
      url.search = new URLSearchParams({ client: 'firefox', hl: 'en', gl: 'us', q: seed });
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
        assert(response.ok);
        const data = await response.json(); assert(Array.isArray(data[1]));
        return { seed, suggestions: data[1], checkedAt: new Date().toISOString(), monthlyVolume: null, keywordDifficulty: null };
      } catch (error) { return { seed, error: error.name }; }
    })));
  }
  console.log(JSON.stringify({ source: 'Google public autocomplete, English, requested US context', observations,
    limits: 'Wording only; no measured volume, difficulty, CTR, country-specific demand or ranking probabilities.' }, null, 2));
} else {
  const { default: nextEnv } = await import('@next/env');
  const { neon } = await import('@neondatabase/serverless');
  nextEnv.loadEnvConfig(root); assert(process.env.DATABASE_URL, 'Database configuration missing');
  try {
    const sql = neon(process.env.DATABASE_URL);
    if (mode === '--duplicates') {
      const slug = 'excel-csv-special-characters-utf8';
      const content = readFileSync(resolve(root, 'scripts/content/excel-csv-special-characters-utf8.md'), 'utf8').replace(/\r\n?/g, '\n').trim();
      const tokens = text => (text.split(/\n## Sources and Image Credits/)[0]
        .replace(/```[\s\S]*?```/g, '').replace(/!\[[^\]]*\]\([^\n]+\)/g, '')
        .replace(/\[([^\]]+)\]\([^\n)]+\)/g, '$1').toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []);
      const shingles = words => new Set(words.slice(0, Math.max(0, words.length - 4)).map((_, index) => words.slice(index, index + 5).join(' ')));
      const paragraphs = text => new Set(text.split(/\r?\n\s*\r?\n/).map(part => tokens(part)).filter(words => words.length >= 30).map(words => words.join(' ')));
      const candidate = shingles(tokens(content)), candidateParagraphs = paragraphs(content), matches = [];
      const snapshot = async () => (await sql.transaction(tx => [tx`SELECT count(*)::integer AS count,
        md5(coalesce(string_agg((to_jsonb(p) - 'views')::text, '' ORDER BY p.id), '')) AS hash
        FROM posts p WHERE slug <> ${slug}`], { isolationLevel: 'RepeatableRead', readOnly: true }))[0][0];
      const before = await snapshot();
      let lastId = 0;
      for (;;) {
        const [rows] = await sql.transaction(tx => [tx`SELECT id, title, slug, published, content FROM posts
          WHERE id > ${lastId} AND slug <> ${slug} ORDER BY id LIMIT 10`], { isolationLevel: 'RepeatableRead', readOnly: true });
        if (!rows.length) break;
        for (const row of rows) {
          const other = shingles(tokens(row.content)), common = [...candidate].filter(shingle => other.has(shingle)).length;
          const otherParagraphs = paragraphs(row.content), exactParagraphs = [...candidateParagraphs].filter(paragraph => otherParagraphs.has(paragraph)).length;
          matches.push({ id: row.id, slug: row.slug, published: row.published, sharedFiveWordPhrases: common,
            candidatePhraseOverlapPercent: Number((common / candidate.size * 100).toFixed(2)),
            jaccardPercent: Number((common / (candidate.size + other.size - common) * 100).toFixed(2)),
            identicalNormalizedParagraphsAtLeast30Words: exactParagraphs,
            exactNormalizedBody: tokens(content).join(' ') === tokens(row.content).join(' '),
          });
        }
        lastId = rows.at(-1).id;
      }
      assert.deepEqual(await snapshot(), before, 'Inventory changed during comparison; repeat read-only review');
      assert.equal(matches.length, before.count);
      assert(matches.every(match => !match.exactNormalizedBody), 'An exact normalized body already exists');
      console.log(JSON.stringify({ checkedAt: new Date().toISOString(), comparedPosts: matches.length,
        contentSha256: createHash('sha256').update(content).digest('hex'), candidateFiveWordPhrases: candidate.size,
        exactNormalizedBodyMatches: 0,
        identicalParagraphMatches: matches.filter(match => match.identicalNormalizedParagraphsAtLeast30Words > 0),
        nearest: matches.sort((a, b) => b.candidatePhraseOverlapPercent - a.candidatePhraseOverlapPercent).slice(0, 8),
        editorialSnapshot: before, limitations: 'Local five-word phrase/paragraph similarity is not semantic equivalence, originality certification or a web-wide plagiarism check. Code blocks and credits excluded; editorial intent also reviewed.' }, null, 2));
      process.exit(0);
    }
    const [snapshots, drafts, categories, inventory, overlaps] = await sql.transaction(tx => [
      tx`SELECT count(*)::integer AS total_posts, (count(*) FILTER (WHERE published))::integer AS published_posts,
        md5(coalesce(string_agg((to_jsonb(p) - 'views')::text, '' ORDER BY p.id), '')) AS editorial_hash FROM posts p`,
      tx`SELECT id, title, slug, published, featured, scheduled_at, md5(content) AS content_md5,
        md5((to_jsonb(p) - 'views')::text) AS editorial_hash FROM posts p WHERE NOT published ORDER BY id`,
      tx`SELECT id, name, slug FROM categories ORDER BY id`,
      tx`SELECT id, title, slug, published FROM posts ORDER BY id`,
      tx`SELECT id, title, slug, published,
        ARRAY(SELECT heading[1] FROM regexp_matches(content, '(?m)^#{2,3} ([^\n]+)', 'g') AS heading) AS headings,
        ARRAY(SELECT excerpt[1] FROM regexp_matches(content, '(?i)(.{0,80}(?:UTF.?8|BOM|encod|garbled|special characters|mojibake|upload.{0,30}reject|50.?KB|HEIC|AVIF|file not found).{0,200})', 'g') AS excerpt LIMIT 5) AS mentions
        FROM posts WHERE content ~* 'UTF.?8|BOM|mojibake|garbled|special characters|upload.{0,30}reject|50.?KB|HEIC|AVIF|file not found'
          OR title ~* 'csv|json|compress|photo|image|ChatGPT|Excel' ORDER BY id`,
    ], { isolationLevel: 'RepeatableRead', readOnly: true, fetchOptions: { signal: AbortSignal.timeout(30000) } });
    const focusedOverlaps = overlaps.map(row => ({ id: row.id, slug: row.slug, published: row.published,
      headings: row.headings.filter(heading => /UTF.?8|BOM|csv|encod|decod|character|delimiter|download|HEIC|AVIF|DPI|upload/i.test(heading)),
      mentions: row.mentions.filter(text => /UTF.?8|BOM|garbled|special characters|mojibake|upload.{0,30}reject|50.?KB|HEIC|AVIF|file not found/i.test(text)).slice(0, 2),
    })).filter(row => row.headings.length || row.mentions.length);
    console.log(JSON.stringify({ checkedAt: new Date().toISOString(), gscConfiguredLocally: ['GSC_CLIENT_EMAIL', 'GSC_PRIVATE_KEY', 'GSC_SITE_URL'].every(key => Boolean(process.env[key])), snapshot: snapshots[0], drafts, categories, focusedOverlaps }, null, 2));
    console.log('COMPLETE TITLE INVENTORY:\n' + inventory.map(row => `${row.id} | ${row.published ? 'published' : 'hidden'} | ${row.title}`).join('\n'));
  } catch (error) {
    const code = /^[A-Z0-9]{5}$/.test(error.code ?? '') ? error.code : 'unavailable';
    console.error(`Read-only research failed (SQLSTATE ${code}); database connection details withheld.`);
    process.exitCode = 1;
  }
}