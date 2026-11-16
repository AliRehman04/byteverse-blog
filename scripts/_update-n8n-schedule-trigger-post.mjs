import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";

// Read-only by default. --apply rewrites the body of post 255 once, and only while it still matches the recorded first version.
const root = fileURLToPath(new URL("../", import.meta.url));
const hash = (algorithm, value) => createHash(algorithm).update(value).digest("hex");
const ledger = JSON.parse(readFileSync(resolve(root, "docs/n8n-schedule-trigger-keywords-2026-11-16.json"), "utf8"));
assert.equal(ledger.slug, "n8n-schedule-trigger-guide");
assert.equal(ledger.publication.postId, 255);
const args = process.argv.slice(2);
assert(args.length <= 1 && args.every((arg) => arg === "--apply"), "Read-only by default; --apply updates the article once");
const apply = args.includes("--apply");
const content = readFileSync(resolve(root, `scripts/content/${ledger.slug}.md`), "utf8").replace(/\r\n?/g, "\n").trim();
assert.equal(hash("sha256", content), ledger.validation.contentSha256, "Article changed after validation; rerun the test and update the ledger");
const { previous: before } = ledger.revision;
const after = ledger.targeting;
assert.equal(hash("md5", readFileSync(resolve(root, before.backupFile), "utf8")), before.contentMd5, "Backup of the current article is not byte-exact");
// Only the body and reading time change in this revision; every other field must already match the ledger.
const unchanged = {
  title: after.title, meta_title: after.metaTitle, meta_description: after.metaDescription, excerpt: after.excerpt,
  summary: after.summary, keywords: after.keywords, cover_image: before.coverImage,
};
assert.deepEqual([before.title, before.metaTitle, before.metaDescription], [after.title, after.metaTitle, after.metaDescription]);
const postId = ledger.publication.postId;
const columns = (sql) => sql`SELECT id, slug, published, cover_image, title, meta_title, meta_description, excerpt, summary, keywords,
  reading_time, content, md5(content) AS content_md5,
  to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS published_at_utc,
  to_char(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS modified_at_utc,
  md5((to_jsonb(p) - 'views')::text) AS editorial_hash FROM posts p WHERE id = ${postId}`;
const otherPosts = (sql) => sql`SELECT count(*)::integer AS total, md5(coalesce(string_agg((to_jsonb(p) - 'views')::text, '' ORDER BY id), '')) AS hash
  FROM posts p WHERE id <> ${postId}`;

function verify(row, expected) {
  for (const [field, value] of Object.entries(expected)) assert.equal(row[field], value, `Unexpected ${field}`);
}

async function main() {
  nextEnv.loadEnvConfig(root);
  assert(process.env.DATABASE_URL, "Database configuration required");
  const sql = neon(process.env.DATABASE_URL);
  const [rows, others] = await sql.transaction((tx) => [columns(tx), otherPosts(tx)], { isolationLevel: "RepeatableRead", readOnly: true });
  assert.equal(rows.length, 1);
  const [row] = rows;
  assert(row.slug === ledger.slug && row.published, "Unexpected post identity");
  verify(row, unchanged);
  assert.equal(row.published_at_utc, ledger.publication.publishedAt);
  assert.deepEqual(others[0], { total: ledger.publication.otherPostsUnchanged, hash: ledger.publication.otherPostsHash }, "Other posts changed since publication");
  if (row.content === content) {
    assert.equal(row.reading_time, after.readingTime);
    console.log("PASS: rewording already applied; nothing to do.", JSON.stringify({ id: row.id, updatedAt: row.modified_at_utc }));
    return;
  }
  assert.equal(row.content_md5, before.contentMd5, "Post 255 body differs from the backup");
  assert.equal(row.editorial_hash, before.editorialHash, "Post 255 changed since the backup; inspect before overwriting");
  console.log(JSON.stringify({ mode: apply ? "apply" : "read-only", id: row.id, currentModifiedAt: row.modified_at_utc, otherPosts: others[0], readingTime: after.readingTime }, null, 2));
  if (!apply) { console.log("PASS preflight: current post matches the backup; no database writes"); return; }
  const [changed] = await sql.transaction([
    sql`WITH changed AS (
      UPDATE posts AS current_post SET reading_time = ${after.readingTime}, content = ${content}, updated_at = NOW()
      WHERE id = ${postId} AND slug = ${ledger.slug} AND published AND md5(content) = ${before.contentMd5}
        AND md5((to_jsonb(current_post) - 'views')::text) = ${before.editorialHash}
      RETURNING id
    ) SELECT 1 / count(*)::integer AS updated_once FROM changed`,
  ], { isolationLevel: "Serializable" });
  assert.equal(changed[0].updated_once, 1);
  console.log(`COMMITTED: post ${postId} updated once. Do not rerun --apply.`);
  const [[updated], [stillUnchanged]] = await Promise.all([columns(sql), otherPosts(sql)]);
  verify(updated, { ...unchanged, content, reading_time: after.readingTime, published_at_utc: ledger.publication.publishedAt });
  assert.deepEqual(stillUnchanged, others[0], "Unrelated posts changed; inspect without overwriting");
  console.log("PASS", JSON.stringify({ id: updated.id, publishedAt: updated.published_at_utc, updatedAt: updated.modified_at_utc, otherPostsUnchanged: stillUnchanged.total, otherPostsHash: stillUnchanged.hash }));
}

try { await main(); }
catch (error) {
  console.error("Update check failed", error.code ?? error.name, error.name === "AssertionError" ? error.message : "Details withheld; inspect read-only before any retry.");
  process.exitCode = 1;
}
