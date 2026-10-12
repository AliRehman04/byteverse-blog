import assert from 'node:assert/strict';
import nextEnv from '@next/env';
import { neon } from '@neondatabase/serverless';
import * as claude from './_add-claude-code-windows-post.mjs';
import * as csv from './_add-excel-csv-utf8-post.mjs';

// Default: read-only preflight/verification. --apply publishes ONLY posts 238 and 239
// and adds two exact contextual links (posts 52 and 237) in one serializable transaction.
// No automatic retry; never rerun --apply.
const args = process.argv.slice(2);
assert(args.length <= 1 && args.every(arg => arg === '--apply'), 'Only --apply is supported');
const apply = args.includes('--apply');
const articles = [
  { id: 238, article: claude.article, validate: claude.validateArticle },
  { id: 239, article: csv.article, validate: csv.validateArticle },
];
const categoryId = 2;
const claudeUrl = `/blog/${claude.article.slug}`;
const csvUrl = `/blog/${csv.article.slug}`;
const edits = [
  {
    id: 52,
    slug: 'what-is-claude-code-guide-2026',
    destination: claudeUrl,
    anchor: 'del install.cmd\n```\n\nAfter installation, navigate to your project and run:',
    replacement: `del install.cmd\n\`\`\`\n\nIf Windows says \`claude\` is not recognized after installation, follow our guide to [fixing Claude Code not recognized on Windows](${claudeUrl}) before changing PATH or reinstalling.\n\nAfter installation, navigate to your project and run:`,
  },
  {
    id: 237,
    slug: 'excel-csv-leading-zeros-2026',
    destination: csvUrl,
    anchor: 'Check the file encoding too if names contain accented or non-Latin characters.',
    replacement: `Check the file encoding too if names contain accented or non-Latin characters. If those characters already look wrong, see our guide to [CSV character encoding and UTF-8 import](${csvUrl}).`,
  },
];
const touchedIds = [...articles.map(item => item.id), ...edits.map(edit => edit.id)];
const protectedDrafts = claude.ledger.inventory.protectedDrafts;
const protectedIds = protectedDrafts.map(draft => draft.id);
assert.deepEqual(protectedIds, [229, 230]);

function checkArticle(row, item, published) {
  assert(row && row.id === item.id && row.slug === item.article.slug, `Expected article ${item.id} not found`);
  for (const [key, value] of Object.entries(item.article)) {
    assert.ok(row[key] === (key === 'published' ? published : value), `Article ${item.id} differs in ${key}; do not overwrite`);
  }
  assert.equal(row.category_id, categoryId, 'Expected Tech Guides category');
}

function checkProtected(rows) {
  for (const expected of protectedDrafts) {
    const row = rows.find(post => post.id === expected.id);
    assert(row && row.slug === expected.slug && row.published === false && row.featured === false && row.scheduled_at === null && row.content_md5 === expected.contentMd5, `Protected draft ${expected.id} changed; refusing publication`);
  }
}

async function main() {
  for (const item of articles) item.validate();
  nextEnv.loadEnvConfig(claude.root);
  assert(process.env.DATABASE_URL, 'Database configuration is required');
  const sql = neon(process.env.DATABASE_URL);
  const rows = await sql`
    SELECT p.*, md5((to_jsonb(p) - 'views')::text) AS editorial_hash, md5(content) AS content_md5
    FROM posts p WHERE id = ANY(${[...touchedIds, ...protectedIds]}) ORDER BY id
  `;
  const states = articles.map(item => {
    const row = rows.find(post => post.id === item.id);
    assert(row, `Draft ${item.id} not found`);
    checkArticle(row, item, row.published);
    return { ...item, row };
  });
  checkProtected(rows);
  const changes = edits.map(edit => {
    const row = rows.find(item => item.id === edit.id);
    assert(row && row.slug === edit.slug && row.published, `Published link source missing: ${edit.slug}`);
    if (row.content.includes(edit.destination)) {
      assert(row.content.includes(edit.replacement), `Unexpected existing backlink: ${edit.slug}`);
      return { ...edit, row, content: row.content, needsEdit: false };
    }
    assert.equal(row.content.split(edit.anchor).length - 1, 1, `Anchor not found exactly once: ${edit.slug}`);
    return { ...edit, row, content: row.content.replace(edit.anchor, () => edit.replacement), needsEdit: true };
  });
  const snapshot = async () => (await sql`
    SELECT count(*)::integer AS count,
      md5(coalesce(string_agg((to_jsonb(p) - 'views')::text, '' ORDER BY id), '')) AS hash
    FROM posts p WHERE NOT (id = ANY(${touchedIds}))
  `)[0];
  const before = await snapshot();
  console.log(JSON.stringify({ mode: apply ? 'apply' : 'read-only', articles: states.map(state => ({ id: state.id, slug: state.article.slug, published: state.row.published })), backlinks: changes.map(change => ({ slug: change.slug, needsEdit: change.needsEdit })), protectedDrafts: protectedIds, unrelatedEditorialSnapshot: before }, null, 2));

  if (!apply) {
    if (states.every(state => state.row.published)) assert(changes.every(change => !change.needsEdit), 'Published articles are missing the expected contextual backlinks');
    console.log(states.every(state => state.row.published) ? 'PASS: Articles published, exact fields and backlinks verified; protected drafts untouched.' : 'PASS: Publication preflight. No database writes.');
    return;
  }
  assert(states.every(state => state.row.published === false), 'Already published; use read-only verification, not --apply again');
  assert(changes.every(change => change.needsEdit), 'Unexpected partial state; inspect before retrying');

  // A zero-row update divides by zero, rolling back ALL changes rather than a partial publication.
  const checks = rows.map(row => ({ id: row.id, hash: row.editorial_hash }));
  const queryList = [
    sql`SELECT id FROM posts WHERE id = ANY(${[...touchedIds, ...protectedIds]}) ORDER BY id FOR UPDATE`,
    ...checks.map(check => sql`
      SELECT 1 / count(*)::integer AS guarded
      FROM posts p WHERE id = ${check.id} AND md5((to_jsonb(p) - 'views')::text) = ${check.hash}
    `),
    ...articles.map((item, index) => sql`
      WITH changed AS (
        UPDATE posts SET published = true, created_at = NOW() - ${(articles.length - 1 - index) * 5} * interval '1 second', updated_at = NOW()
        WHERE id = ${item.id} AND slug = ${item.article.slug} AND published = false AND scheduled_at IS NULL
        RETURNING id
      ) SELECT 1 / count(*)::integer AS published_once FROM changed
    `),
    ...changes.map(change => sql`
      WITH changed AS (
        UPDATE posts SET content = ${change.content}, updated_at = NOW()
        WHERE id = ${change.id} AND slug = ${change.slug} AND published = true AND content = ${change.row.content}
        RETURNING id
      ) SELECT 1 / count(*)::integer AS linked_once FROM changed
    `),
  ];
  await sql.transaction(queryList, { isolationLevel: 'Serializable' });
  console.log('PUBLICATION TRANSACTION COMMITTED: articles 238 and 239 and two contextual links. Do not rerun --apply.');

  const afterRows = await sql`
    SELECT p.*, md5(content) AS content_md5 FROM posts p
    WHERE id = ANY(${[...touchedIds, ...protectedIds]}) ORDER BY id
  `;
  for (const item of articles) checkArticle(afterRows.find(row => row.id === item.id), item, true);
  checkProtected(afterRows);
  for (const change of changes) {
    const row = afterRows.find(item => item.id === change.id);
    assert.ok(row && row.content === change.content, `Backlink verification failed: ${change.slug}`);
    for (const key of Object.keys(change.row).filter(key => !['content', 'updated_at', 'views', 'editorial_hash', 'content_md5'].includes(key))) {
      const original = change.row[key];
      const current = row[key];
      assert.ok(original instanceof Date ? current instanceof Date && current.getTime() === original.getTime() : original === current, `Unexpected source field change: ${change.slug}/${key}`);
    }
  }
  const after = await snapshot();
  assert.deepEqual(after, before, 'Unrelated editorial records changed; inspect without overwriting');
  console.log('PASS:', JSON.stringify({ publishedIds: articles.map(item => item.id), contextualBacklinks: changes.length, protectedDrafts: protectedIds, unrelatedPostsUnchanged: after.count, checksumExcludingViews: after.hash }));
}

try {
  await main();
} catch (error) {
  console.error(error instanceof assert.AssertionError ? error.message : 'Publication/verification failed. No automatic retry. Check current state with the read-only command before taking further action; do not expose connection details.');
  process.exitCode = 1;
}
