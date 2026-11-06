import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";

// Adds one contextual CSV Repair Tool paragraph to each published CSV guide. Read-only unless --apply.
const root = fileURLToPath(new URL("../", import.meta.url));
const args = process.argv.slice(2);
assert(args.length <= 1 && args.every((arg) => arg === "--apply"), "Read-only by default; only --apply is supported");
const apply = args.includes("--apply");
const TOOL = "/tools/csv-repair";

const links = [
  {
    id: 237, slug: "excel-csv-leading-zeros-2026",
    anchor: "- Amounts can be calculated after applying the intended numeric type; identifiers remain Text.",
    paragraph: `To run the same checks on a whole file before Excel opens it, the [CSV Repair Tool](${TOOL}) flags ID columns with leading zeros and numbers longer than Excel's 15-digit precision, then exports an XLSX that stores those columns as text. It runs in your browser, but it cannot bring back zeros that were already removed, so start from the original export.`,
  },
  {
    id: 239, slug: "excel-csv-special-characters-utf8",
    anchor: "Use only fictional or approved data; the converter's local processing is separate from the site's ads and analytics.",
    paragraph: `If you already have the CSV file, the [CSV Repair Tool](${TOOL}) can show how the same bytes read as UTF-8 and Windows-1252 side by side, so you can choose the reading where names look right before exporting a UTF-8 copy. It runs in your browser; like any converter, it cannot restore characters that were replaced before the file reached you.`,
  },
  {
    id: 243, slug: "csv-opens-in-one-column-excel",
    anchor: "It does not repair digits or characters already damaged in the source.",
    paragraph: `For a CSV file you already have, the [CSV Repair Tool](${TOOL}) detects the delimiter, warns when everything lands in one column, and previews the first rows with another separator before it re-reads the file. It runs in your browser and can export an XLSX that keeps ID columns as text.`,
  },
];
const ids = links.map((link) => link.id);
const count = (text, part) => text.split(part).length - 1;
const othersQuery = (sql) => sql`SELECT count(*)::integer AS total, md5(coalesce(string_agg((to_jsonb(p) - 'views')::text, '' ORDER BY id), '')) AS hash
  FROM posts p WHERE NOT (id = ANY(${ids}::int[]))`;

nextEnv.loadEnvConfig(root);
assert(process.env.DATABASE_URL, "Database configuration required");
const sql = neon(process.env.DATABASE_URL);
const [rows, others] = await sql.transaction((tx) => [
  tx`SELECT id, slug, published, content FROM posts WHERE id = ANY(${ids}::int[]) ORDER BY id`,
  othersQuery(tx),
], { isolationLevel: "RepeatableRead", readOnly: true });

assert.equal(rows.length, links.length, "Every target guide must exist");
const plan = links.map((link) => {
  const row = rows.find((item) => item.id === link.id);
  assert(row && row.slug === link.slug && row.published, `${link.slug}: must be the published guide`);
  if (row.content.includes(`](${TOOL})`)) {
    assert.equal(count(row.content, link.paragraph), 1, `${link.slug}: links to the tool but not with the expected paragraph`);
    return { ...link, done: true };
  }
  assert(!row.content.includes("\r"), `${link.slug}: unexpected CR line endings`);
  assert.equal(count(row.content, link.anchor), 1, `${link.slug}: anchor must occur exactly once`);
  return { ...link, done: false, before: row.content, after: row.content.replace(link.anchor, `${link.anchor}\n\n${link.paragraph}`) };
});
console.log(JSON.stringify({ mode: apply ? "apply" : "read-only", otherPosts: others[0], targets: plan.map(({ id, slug, done }) => ({ id, slug, alreadyLinked: done })) }, null, 2));

const pending = plan.filter((item) => !item.done);
if (!pending.length) { console.log("PASS all guides already link to the tool"); process.exit(0); }
if (!apply) { console.log("PASS preflight: no database writes"); process.exit(0); }

const tool = await fetch(`https://www.byteverse.fyi${TOOL}`, { signal: AbortSignal.timeout(25_000) });
assert.equal(tool.status, 200, "Tool page must be live before linking to it");
await tool.body?.cancel();

// Each update is guarded by the exact content read above; no automatic retry after an uncertain write.
await sql.transaction(pending.map((item) => sql`WITH updated AS (
  UPDATE posts SET content = ${item.after}, updated_at = NOW()
  WHERE id = ${item.id} AND slug = ${item.slug} AND published AND content = ${item.before}
  RETURNING id
) SELECT 1 / count(*)::integer AS updated_once FROM updated`), { isolationLevel: "Serializable" });
console.log(`COMMITTED: ${pending.length} guide(s) now link to ${TOOL}. Do not rerun --apply.`);

const after = await sql`SELECT id, content FROM posts WHERE id = ANY(${ids}::int[]) ORDER BY id`;
for (const item of pending) assert.equal(after.find((row) => row.id === item.id).content, item.after, `${item.slug}: stored content differs`);
const [unchanged] = await othersQuery(sql);
assert.deepEqual(unchanged, others[0], "Unrelated posts changed; inspect without overwriting");
console.log("PASS", JSON.stringify({ updated: pending.map((item) => item.slug), otherPostsUnchanged: unchanged.total }));
