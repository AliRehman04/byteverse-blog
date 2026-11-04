import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";

// Read-only by default. --apply rewrites post 117 once, and only while it still matches the recorded previous version.
const root = fileURLToPath(new URL("../", import.meta.url));
const read = path => readFileSync(resolve(root, path), "utf8").replace(/\r\n?/g, "\n").trim();
const hash = (algorithm, value) => createHash(algorithm).update(value).digest("hex");
const ledger = JSON.parse(read("docs/youtube-video-tools-update-2026-11-04.json"));
assert.equal(ledger.postId, 117);
assert.equal(ledger.slug, "best-ai-tools-for-youtube-creators-2026");
const args = process.argv.slice(2);
assert(args.length <= 1 && args.every(arg => arg === "--apply"), "Read-only by default; --apply updates the article once");
const apply = args.includes("--apply");
const content = read(`scripts/content/${ledger.slug}.md`);
assert.equal(hash("sha256", content), ledger.validation.contentSha256, "Article changed after validation; rerun the test and update the ledger");
const { previous: before, targeting: after } = ledger;
assert.equal(hash("md5", readFileSync(resolve(root, before.backupFile), "utf8")), before.contentMd5, "Backup of the current article is not byte-exact");
const next = {
  title: after.title, meta_title: after.metaTitle, meta_description: after.metaDescription, excerpt: after.excerpt,
  summary: after.summary, keywords: after.keywords, reading_time: after.readingTime, content,
};
const old = {
  title: before.title, meta_title: before.metaTitle, meta_description: before.metaDescription, excerpt: before.excerpt,
  summary: before.summary, keywords: before.keywords, reading_time: before.readingTime, content_md5: before.contentMd5,
};
assert(next.meta_title.length <= 70 && next.meta_description.length <= 160 && next.summary.split("|").length === 3);
const blogTargets = ledger.internalLinks.filter(link => link.startsWith("/blog/")).map(link => link.slice(6));
const columns = sql => sql`SELECT id, slug, published, cover_image, title, meta_title, meta_description, excerpt, summary, keywords,
  reading_time, content, md5(content) AS content_md5, updated_at,
  to_char(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS modified_at_utc,
  md5((to_jsonb(p) - 'views')::text) AS editorial_hash FROM posts p WHERE id = ${ledger.postId}`;
const otherPosts = sql => sql`SELECT count(*)::integer AS total, md5(coalesce(string_agg((to_jsonb(p) - 'views')::text, '' ORDER BY id), '')) AS hash
  FROM posts p WHERE id <> ${ledger.postId}`;

function verify(row, expected) {
  for (const [field, value] of Object.entries(expected)) assert.equal(row[field], value, `Unexpected ${field}`);
}

async function main() {
  nextEnv.loadEnvConfig(root);
  assert(process.env.DATABASE_URL, "Database configuration required");
  const sql = neon(process.env.DATABASE_URL);
  const [rows, targets, others] = await sql.transaction(tx => [
    columns(tx),
    tx`SELECT slug FROM posts WHERE published AND slug = ANY(${blogTargets}::text[])`,
    otherPosts(tx),
  ], { isolationLevel: "RepeatableRead", readOnly: true });
  assert.equal(rows.length, 1);
  const [row] = rows;
  assert(row.slug === ledger.slug && row.published && row.cover_image === before.coverImage, "Unexpected post identity");
  assert.equal(targets.length, blogTargets.length, "An internal link target is missing or unpublished");
  if (row.content === content) {
    verify(row, next);
    console.log("PASS: update already applied; nothing to do.", JSON.stringify({ id: row.id, title: row.title, updatedAt: row.modified_at_utc }));
    return;
  }
  verify(row, old);
  for (const path of ledger.internalLinks) {
    const response = await fetch(ledger.website + path, { signal: AbortSignal.timeout(25000) });
    assert.equal(response.status, 200, `Internal link unavailable: ${path}`);
    await response.body?.cancel();
  }
  console.log(JSON.stringify({ mode: apply ? "apply" : "read-only", id: row.id, currentTitle: row.title, newTitle: next.title, otherPosts: others[0], internalLinks: ledger.internalLinks.length }, null, 2));
  if (!apply) { console.log("PASS preflight: current post matches the backup, links are live; no database writes"); return; }
  const [changed] = await sql.transaction([
    sql`WITH changed AS (
      UPDATE posts AS current_post SET title = ${next.title}, meta_title = ${next.meta_title}, meta_description = ${next.meta_description},
        excerpt = ${next.excerpt}, summary = ${next.summary}, keywords = ${next.keywords}, reading_time = ${next.reading_time},
        content = ${next.content}, updated_at = NOW()
      WHERE id = ${ledger.postId} AND slug = ${ledger.slug} AND published AND md5(content) = ${before.contentMd5}
        AND title = ${before.title} AND meta_title = ${before.metaTitle} AND meta_description = ${before.metaDescription}
        AND md5((to_jsonb(current_post) - 'views')::text) = ${row.editorial_hash}
      RETURNING id
    ) SELECT 1 / count(*)::integer AS updated_once FROM changed`,
  ], { isolationLevel: "Serializable" });
  assert.equal(changed[0].updated_once, 1);
  console.log("COMMITTED: post 117 updated once. Do not rerun --apply.");
  const [[updated], [unchanged]] = await Promise.all([columns(sql), otherPosts(sql)]);
  verify(updated, next);
  assert.deepEqual(unchanged, others[0], "Unrelated posts changed; inspect without overwriting");
  console.log("PASS", JSON.stringify({ id: updated.id, title: updated.title, updatedAt: updated.modified_at_utc, otherPostsUnchanged: unchanged.total, otherPostsHash: unchanged.hash }));
}

try { await main(); }
catch (error) {
  console.error("Update check failed", error.code ?? error.name, error.name === "AssertionError" ? error.message : "Details withheld; inspect read-only before any retry.");
  process.exitCode = 1;
}
