import assert from 'node:assert/strict';
import nextEnv from '@next/env';
import { neon } from '@neondatabase/serverless';
import { article, ledger, root, validateArticle } from './_add-csv-excel-post.mjs';

// Default: read-only preflight/verification. --apply publishes only post 237 and
// adds one exact contextual links in the same transaction. No automatic retry.
const args = process.argv.slice(2);
assert(args.length <= 1 && args.every(arg => arg === '--apply'), 'Only --apply is supported');
const apply = args.includes('--apply');
const id = 237;
const categoryId = 2;
const destination = `/blog/${article.slug}`;
const edits = [
  {
    id: 233,
    slug: 'excel-get-data-from-pdf-missing-2026',
    anchor: 'The missing digits cannot be recovered reliably from that converted value alone.',
    addition: ` For a step-by-step explanation of why the zeros disappear and how to import the file correctly, see our guide to [keeping leading zeros when opening CSV files in Excel](${destination}).`,
  },
];const touchedIds = [id, ...edits.map(edit => edit.id)];
const protectedIds = ledger.inventory.protectedDrafts.map(draft => draft.id);

function checkArticle(row, published) {
  assert(row && row.id === id && row.slug === article.slug, 'Expected article 237 not found');
  for (const [key, value] of Object.entries(article)) {
    assert.ok(row[key] === (key === 'published' ? published : value), `Article differs in ${key}; do not overwrite`);
  }
  assert.equal(row.category_id, categoryId, 'Expected Tech Guides category');
}

function checkProtected(rows) {
  for (const expected of ledger.inventory.protectedDrafts) {
    const row = rows.find(post => post.id === expected.id);
    assert(row && row.slug === expected.slug && row.published === false && row.featured === false && row.scheduled_at === null && row.content_md5 === expected.contentMd5, `Protected draft ${expected.id} changed; refusing publication`);
  }
}

async function main() {
  validateArticle();
  nextEnv.loadEnvConfig(root);
  assert(process.env.DATABASE_URL, 'Database configuration is required');
  const sql = neon(process.env.DATABASE_URL);
  const rows = await sql`
    SELECT p.*, md5((to_jsonb(p) - 'views')::text) AS editorial_hash, md5(content) AS content_md5
    FROM posts p WHERE id = ANY(${[...touchedIds, ...protectedIds]}) ORDER BY id
  `;
  const post = rows.find(row => row.id === id);
  assert(post, 'Draft 237 not found');
  checkArticle(post, post.published);
  checkProtected(rows);
  const changes = edits.map(edit => {
    const row = rows.find(item => item.id === edit.id);
    assert(row && row.slug === edit.slug && row.published, `Published link source missing: ${edit.slug}`);
    if (row.content.includes(destination)) {
      assert(row.content.includes(edit.anchor + edit.addition), `Unexpected existing backlink: ${edit.slug}`);
      return { ...edit, row, content: row.content, needsEdit: false };
    }
    assert.equal(row.content.split(edit.anchor).length - 1, 1, `Anchor not found exactly once: ${edit.slug}`);
    return { ...edit, row, content: row.content.replace(edit.anchor, edit.anchor + edit.addition), needsEdit: true };
  });
  const snapshot = async () => (await sql`
    SELECT count(*)::integer AS count,
      md5(coalesce(string_agg((to_jsonb(p) - 'views')::text, '' ORDER BY id), '')) AS hash
    FROM posts p WHERE NOT (id = ANY(${touchedIds}))
  `)[0];
  const before = await snapshot();
  console.log(JSON.stringify({ mode: apply ? 'apply' : 'read-only', id, slug: article.slug, published: post.published, backlinks: changes.map(change => ({ slug: change.slug, needsEdit: change.needsEdit })), protectedDrafts: protectedIds, unrelatedEditorialSnapshot: before }, null, 2));

  if (!apply) {
    if (post.published) assert(changes.every(change => !change.needsEdit), 'Published article is missing the expected contextual backlink');
    console.log(post.published ? 'PASS: Article published, exact fields and backlink verified; protected drafts untouched.' : 'PASS: Publication preflight. No database writes.');
    return;
  }
  assert.equal(post.published, false, 'Already published; use read-only verification, not --apply again');
  assert(changes.every(change => change.needsEdit), 'Unexpected partial state; inspect before retrying');

  // A zero-row update divides by zero, rolling back ALL changes rather than a partial publication.
  const checks = rows.map(row => ({ id: row.id, hash: row.editorial_hash }));
  const queryList = [
    sql`SELECT id FROM posts WHERE id = ANY(${[...touchedIds, ...protectedIds]}) ORDER BY id FOR UPDATE`,
    ...checks.map(check => sql`
      SELECT 1 / count(*)::integer AS guarded
      FROM posts p WHERE id = ${check.id} AND md5((to_jsonb(p) - 'views')::text) = ${check.hash}
    `),
    sql`
      WITH changed AS (
        UPDATE posts SET published = true, created_at = NOW(), updated_at = NOW()
        WHERE id = ${id} AND slug = ${article.slug} AND published = false AND scheduled_at IS NULL
        RETURNING id
      ) SELECT 1 / count(*)::integer AS published_once FROM changed
    `,
    ...changes.map(change => sql`
      WITH changed AS (
        UPDATE posts SET content = ${change.content}, updated_at = NOW()
        WHERE id = ${change.id} AND slug = ${change.slug} AND published = true AND content = ${change.row.content}
        RETURNING id
      ) SELECT 1 / count(*)::integer AS linked_once FROM changed
    `),
  ];
  await sql.transaction(queryList, { isolationLevel: 'Serializable' });
  console.log('PUBLICATION TRANSACTION COMMITTED: article 237 and one contextual link. Do not rerun --apply.');

  const afterRows = await sql`
    SELECT p.*, md5(content) AS content_md5 FROM posts p
    WHERE id = ANY(${[...touchedIds, ...protectedIds]}) ORDER BY id
  `;
  checkArticle(afterRows.find(row => row.id === id), true);
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
  console.log('PASS:', JSON.stringify({ publishedId: id, slug: article.slug, contextualBacklinks: changes.length, protectedDrafts: protectedIds, unrelatedPostsUnchanged: after.count, checksumExcludingViews: after.hash }));
}

try {
  await main();
} catch (error) {
  console.error(error instanceof assert.AssertionError ? error.message : 'Publication/verification failed. No automatic retry. Check current state with the read-only command before taking further action; do not expose connection details.');
  process.exitCode = 1;
}

