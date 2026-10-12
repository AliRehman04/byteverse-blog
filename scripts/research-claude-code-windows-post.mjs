import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { parseDocument, DomUtils } from 'htmlparser2';

const root = fileURLToPath(new URL('../', import.meta.url));
const mode = process.argv[2];
assert(process.argv.length === 3 && ['--keywords', '--inventory', '--competitors'].includes(mode), 'Use --keywords, --inventory or --competitors');

if (mode === '--keywords') {
  const seeds = [
    'claude code command not found windows', 'claude code not recognized windows',
    'claude is not recognized powershell', 'claude code installed but command not found',
    'claude code vscode terminal not found', 'claude code requires git bash windows',
    'claude code local bin path windows', 'claude code winget not recognized',
    'codex command not found windows', 'codex not recognized powershell',
    'cursor connection error agent', 'cursor agent connection failed',
    'chatgpt download file not found', 'chatgpt failed to get upload status',
    'csv opens in one column excel', 'convert nested json to csv',
  ];
  const observations = [];
  for (let index = 0; index < seeds.length; index += 3) {
    observations.push(...await Promise.all(seeds.slice(index, index + 3).map(async seed => {
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
  console.log(JSON.stringify({ observations, limits: 'Autocomplete is a wording signal, not volume, keyword difficulty, traffic or a ranking forecast.' }, null, 2));
} else if (mode === '--competitors') {
  for (const url of [
    'https://smartscope.blog/en/generative-ai/claude/claude-code-not-recognized-error-fix/',
    'https://ccforeveryone.com/guides/claude-code-installation-problems',
  ]) {
    const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
    assert(response.ok, `Competitor HTTP status: ${response.status}`);
    const dom = parseDocument(await response.text());
    const text = node => DomUtils.textContent(node).replace(/\s+/g, ' ').trim();
    const headings = DomUtils.findAll(node => /^h[1-3]$/.test(node.name ?? ''), dom.children).map(text);
    const paragraphs = DomUtils.findAll(node => node.name === 'p' || node.name === 'li', dom.children).map(text);
    console.log(JSON.stringify({ url: response.url, checkedAt: new Date().toISOString(), headings,
      coverage: paragraphs.filter(value => /setx|Git Bash|PowerShell|native|WinGet|VS Code|extension|Node.js|\.local|npm|PATH/.test(value) && value.length < 550).slice(0, 24),
      limits: 'Coverage comparison only; third-party advice is not a substitute for current primary documentation.' }, null, 2));
  }
} else {
  const { default: nextEnv } = await import('@next/env');
  const { neon } = await import('@neondatabase/serverless');
  nextEnv.loadEnvConfig(root);
  assert(process.env.DATABASE_URL, 'Database configuration missing');
  try {
    const sql = neon(process.env.DATABASE_URL);
    const [snapshots, drafts, categories, inventory, mentions] = await sql.transaction(tx => [
      tx`SELECT count(*)::integer AS total_posts, (count(*) FILTER (WHERE published))::integer AS published_posts,
        md5(coalesce(string_agg((to_jsonb(p) - 'views')::text, '' ORDER BY p.id), '')) AS editorial_hash FROM posts p`,
      tx`SELECT id, slug, published, featured, scheduled_at, md5(content) AS content_md5,
        md5((to_jsonb(p) - 'views')::text) AS editorial_hash FROM posts p WHERE NOT published ORDER BY id`,
      tx`SELECT id, name, slug FROM categories ORDER BY id`,
      tx`SELECT id, title, slug, published FROM posts ORDER BY id`,
      tx`SELECT id, slug, published, substring(content from '(?i).{0,100}(command not found|not recognized|CLAUDE_CODE_GIT_BASH_PATH|Git Bash|install.ps1|local.bin).{0,240}') AS excerpt
        FROM posts WHERE content ~* 'command not found|not recognized|CLAUDE_CODE_GIT_BASH_PATH|Git Bash|install.ps1|local.bin' ORDER BY id`,
    ], { isolationLevel: 'RepeatableRead', readOnly: true, fetchOptions: { signal: AbortSignal.timeout(30000) } });
    console.log(JSON.stringify({ checkedAt: new Date().toISOString(), gscConfigured: ['GSC_CLIENT_EMAIL', 'GSC_PRIVATE_KEY', 'GSC_SITE_URL'].every(key => Boolean(process.env[key])), snapshot: snapshots[0], drafts, categories, related: inventory.filter(row => [38, 52, 139, 232].includes(row.id)), mentions }, null, 2));
    console.log('COMPLETE TITLE INVENTORY:\n' + inventory.map(row => `${row.id} | ${row.published ? 'published' : 'hidden'} | ${row.title}`).join('\n'));
  } catch (error) {
    const code = /^[A-Z0-9]{5}$/.test(error.code ?? '') ? error.code : 'unavailable';
    console.error(`Read-only inventory failed (SQLSTATE ${code}); connection details withheld.`);
    process.exitCode = 1;
  }
}