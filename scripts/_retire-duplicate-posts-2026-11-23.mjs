import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";

// Owner-approved (23 November 2026): merge three duplicate posts into the stronger article of each pair.
// The weaker post is unpublished (kept in the database) and 308-redirected in src/lib/blog-redirects.ts.
// Internal links to it are repointed to the keeper without touching updated_at (a link change is not a content update).
// "backup" saves every row it will touch once. No argument is a read-only preflight. "--apply" writes once, only while rows match the backups.
const root = fileURLToPath(new URL("../", import.meta.url));
const md5 = (value) => createHash("md5").update(value).digest("hex");
const MAP = new Map([
  ["best-vscode-extensions-2026", "best-vscode-extensions-2026-web-developers"],
  ["docker-for-beginners-complete-guide", "docker-for-beginners-2026-guide"],
  ["how-to-build-portfolio-website-2026", "build-portfolio-website-2026"],
]);
const RETIRED = [...MAP.keys()];
const KEEPERS = [...MAP.values()];
const EXPECTED_OCCURRENCES = 15;
const backupDir = resolve(root, "docs/content-backups");
const retiredBackup = (slug) => resolve(backupDir, `${slug}-before-2026-11-23-duplicate-merge.json`);
const linkBackup = (slug) => resolve(backupDir, `${slug}-before-2026-11-23-duplicate-link-repoint.md`);
const linkRe = (slug) => new RegExp(`/blog/${slug}(?![\\w-])`, "g");

const [action, ...rest] = process.argv.slice(2);
assert(rest.length === 0 && [undefined, "backup", "--apply"].includes(action), "Usage: [backup|--apply]");
nextEnv.loadEnvConfig(root);
const sql = neon(process.env.DATABASE_URL);

const rowsBySlug = async (slugs) => sql`SELECT id, slug, published, content, md5(content) AS content_md5, md5((to_jsonb(p) - 'views')::text) AS editorial_hash,
  to_char(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS modified_at_utc FROM posts p WHERE slug = ANY(${slugs}) ORDER BY id`;
const linkingRows = async () => (await sql`SELECT id, slug, published, content, md5(content) AS content_md5, md5((to_jsonb(p) - 'views')::text) AS editorial_hash,
  to_char(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS modified_at_utc FROM posts p WHERE published AND NOT (slug = ANY(${RETIRED})) ORDER BY id`)
  .filter((row) => RETIRED.some((slug) => linkRe(slug).test(row.content)));
const othersHash = async (ids) => (await sql`SELECT count(*)::integer AS total, md5(coalesce(string_agg((to_jsonb(p) - 'views')::text, '' ORDER BY id), '')) AS hash FROM posts p WHERE NOT (id = ANY(${ids}))`)[0];

function repoint(content) {
  const lines = content.split("\n");
  const out = [];
  const changes = [];
  let occurrences = 0;
  for (const [index, line] of lines.entries()) {
    let next = line;
    for (const [old, keep] of MAP) {
      const found = next.match(linkRe(old))?.length ?? 0;
      occurrences += found;
      if (found) next = next.replace(linkRe(old), `/blog/${keep}`);
    }
    if (next === line) { out.push(line); continue; }
    // A related-links bullet that would become an exact copy of a bullet already in the post is dropped instead.
    if (/^\s*[-*]\s+\[[^\]]+\]\(\/blog\/[^)\s]+\)\s*$/.test(next) && lines.includes(next)) { changes.push({ line: index, removed: line }); continue; }
    changes.push({ line: index, before: line, after: next });
    out.push(next);
  }
  return { content: out.join("\n"), changes, occurrences };
}

const [retired, keepers, linking] = await Promise.all([rowsBySlug(RETIRED), rowsBySlug(KEEPERS), linkingRows()]);
const state = { retired: retired.map(({ id, slug, published }) => ({ id, slug, published })), linkingPosts: linking.length };

if (action === "backup") {
  assert.equal(retired.length, 3); assert(retired.every((row) => row.published), "Every duplicate must still be published");
  assert.equal(keepers.length, 3); assert(keepers.every((row) => row.published), "Every keeper must be published");
  for (const row of retired) {
    const [full] = await sql`SELECT * FROM posts WHERE id = ${row.id}`;
    writeFileSync(retiredBackup(row.slug), JSON.stringify(full, null, 2), { encoding: "utf8", flag: "wx" });
    assert.equal(md5(JSON.parse(readFileSync(retiredBackup(row.slug), "utf8")).content), row.content_md5);
  }
  for (const row of linking) {
    writeFileSync(linkBackup(row.slug), row.content, { encoding: "utf8", flag: "wx" });
    assert.equal(md5(readFileSync(linkBackup(row.slug), "utf8")), row.content_md5);
  }
  console.log("PASS backup", JSON.stringify({ ...state, files: retired.length + linking.length }));
  process.exit(0);
}

const alreadyApplied = retired.every((row) => !row.published) && linking.length === 0;
if (alreadyApplied) { console.log("PASS: duplicates already unpublished and no links remain; nothing to do.", JSON.stringify(state)); process.exit(0); }
assert.equal(retired.length, 3); assert(retired.every((row) => row.published), "Every duplicate must still be published");
assert.equal(keepers.length, 3); assert(keepers.every((row) => row.published), "Every keeper must be published");
for (const row of retired) {
  assert(existsSync(retiredBackup(row.slug)), `Run the backup step first (${row.slug})`);
  assert.equal(md5(JSON.parse(readFileSync(retiredBackup(row.slug), "utf8")).content), row.content_md5, `${row.slug} changed since its backup`);
}
const plans = linking.map((row) => {
  assert(existsSync(linkBackup(row.slug)), `Run the backup step first (${row.slug})`);
  assert.equal(md5(readFileSync(linkBackup(row.slug), "utf8")), row.content_md5, `${row.slug} changed since its backup`);
  const plan = repoint(row.content);
  for (const slug of RETIRED) assert(!linkRe(slug).test(plan.content), `${row.slug} still links to ${slug}`);
  const kept = plan.content.split("\n");
  assert.equal(kept.length, row.content.split("\n").length - plan.changes.filter((change) => change.removed).length, "Only link lines may change");
  return { row, ...plan };
});
const occurrences = plans.reduce((sum, plan) => sum + plan.occurrences, 0);
assert.equal(occurrences, EXPECTED_OCCURRENCES, "Unexpected number of links to the duplicates");
for (const plan of plans) for (const change of plan.changes) {
  console.log(`${plan.row.id} ${plan.row.slug} L${change.line}`);
  if (change.removed) console.log(`   REMOVE (same bullet already in the post): ${change.removed}`);
  else console.log(`   - ${change.before.slice(0, 220)}\n   + ${change.after.slice(0, 220)}`);
}
const touchedIds = [...retired.map((row) => row.id), ...plans.map((plan) => plan.row.id)];
const before = await othersHash(touchedIds);
console.log(JSON.stringify({ mode: action === "--apply" ? "apply" : "read-only", ...state, occurrences, removedBullets: plans.flatMap((plan) => plan.changes.filter((change) => change.removed)).length, otherPosts: before }));
if (action !== "--apply") { console.log("PASS preflight: rows match backups; no database writes"); process.exit(0); }

const statements = [
  ...retired.map((row) => sql`WITH changed AS (
    UPDATE posts AS p SET published = false
    WHERE id = ${row.id} AND slug = ${row.slug} AND published AND md5(content) = ${row.content_md5} AND md5((to_jsonb(p) - 'views')::text) = ${row.editorial_hash}
    RETURNING id) SELECT 1 / count(*)::integer AS updated_once FROM changed`),
  ...plans.map(({ row, content }) => sql`WITH changed AS (
    UPDATE posts AS p SET content = ${content}
    WHERE id = ${row.id} AND slug = ${row.slug} AND published AND md5(content) = ${row.content_md5} AND md5((to_jsonb(p) - 'views')::text) = ${row.editorial_hash}
    RETURNING id) SELECT 1 / count(*)::integer AS updated_once FROM changed`),
];
const results = await sql.transaction(statements, { isolationLevel: "Serializable" });
assert(results.every((result) => result[0].updated_once === 1), "Every guarded update must change exactly one row");

const [afterRetired, afterLinking, afterOthers] = await Promise.all([rowsBySlug(RETIRED), linkingRows(), othersHash(touchedIds)]);
assert(afterRetired.every((row) => !row.published), "Duplicates must be unpublished");
assert.equal(afterLinking.length, 0, "No published post may still link to a duplicate");
assert.deepEqual(afterOthers, before, "Unrelated posts changed; inspect without overwriting");
const afterRows = await sql`SELECT id, md5(content) AS content_md5, to_char(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS modified_at_utc FROM posts WHERE id = ANY(${touchedIds})`;
for (const plan of plans) {
  const after = afterRows.find((row) => row.id === plan.row.id);
  assert.equal(after.content_md5, md5(plan.content));
  assert.equal(after.modified_at_utc, plan.row.modified_at_utc, `updated_at moved for ${plan.row.slug}`);
}
console.log("PASS", JSON.stringify({ unpublished: afterRetired.map((row) => row.slug), repointedPosts: plans.length, occurrences, otherPostsUnchanged: afterOthers.total }));
