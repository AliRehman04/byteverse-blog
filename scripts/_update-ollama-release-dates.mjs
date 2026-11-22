import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";

// Removes pre-release dates that were presented as release dates from posts 256 and 257 (owner-approved, 22 November 2026).
// Read-only by default. "<connect|ps> --apply" rewrites the body of one post once, and only while it still matches its backup.
const root = fileURLToPath(new URL("../", import.meta.url));
const hash = (algorithm, value) => createHash(algorithm).update(value).digest("hex");
const targets = {
  connect: { postId: 256, ledger: "docs/ollama-could-not-connect-keywords-2026-11-17.json", removed: ["21 May 2025", "3 February 2026"], added: "Version 0.7.1, the next release, kept the real cause" },
  ps: { postId: 257, ledger: "docs/ollama-ps-keywords-2026-11-19.json", removed: ["15 May 2024", "18 July 2025", "25 September 2026"], added: "The command first shipped in release 0.1.38. CONTEXT arrived with 0.10.0, and RUNNER with 0.40.0." },
};
const [which, flag, ...rest] = process.argv.slice(2);
assert(Object.hasOwn(targets, which ?? "") && rest.length === 0 && (flag === undefined || flag === "--apply"), "Usage: <connect|ps> [--apply]");
const apply = flag === "--apply";
const target = targets[which];
const ledger = JSON.parse(readFileSync(resolve(root, target.ledger), "utf8"));
assert.equal(ledger.publication.postId, target.postId);
const content = readFileSync(resolve(root, `scripts/content/${ledger.slug}.md`), "utf8").replace(/\r\n?/g, "\n").trim();
assert.equal(hash("sha256", content), ledger.validation.contentSha256, "Article changed after validation; rerun the test and update the ledger");
const before = ledger.revision.previous;
const backup = readFileSync(resolve(root, before.backupFile), "utf8");
assert.equal(hash("md5", backup), before.contentMd5, "Backup of the current article is not byte-exact");
// The correction touches exactly one paragraph.
const oldParagraphs = backup.split("\n\n");
const newParagraphs = content.split("\n\n");
assert.equal(oldParagraphs.length, newParagraphs.length);
const changedParagraphs = newParagraphs.map((paragraph, index) => (paragraph === oldParagraphs[index] ? null : index)).filter((index) => index !== null);
assert.equal(changedParagraphs.length, 1, "Exactly one paragraph may change");
assert(newParagraphs[changedParagraphs[0]].includes(target.added));
for (const date of target.removed) assert(backup.includes(date) && !content.includes(date), date);

const postId = target.postId;
const columns = (sql) => sql`SELECT id, slug, published, title, meta_title, meta_description, excerpt, summary, keywords, cover_image, reading_time, content,
  md5(content) AS content_md5, to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS published_at_utc,
  to_char(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS modified_at_utc,
  md5((to_jsonb(p) - 'views')::text) AS editorial_hash FROM posts p WHERE id = ${postId}`;
const otherPosts = (sql) => sql`SELECT count(*)::integer AS total, md5(coalesce(string_agg((to_jsonb(p) - 'views')::text, '' ORDER BY id), '')) AS hash
  FROM posts p WHERE id <> ${postId}`;
const fixed = ["title", "meta_title", "meta_description", "excerpt", "summary", "keywords", "cover_image", "reading_time", "published_at_utc"];

async function main() {
  nextEnv.loadEnvConfig(root);
  assert(process.env.DATABASE_URL, "Database configuration required");
  const sql = neon(process.env.DATABASE_URL);
  const [rows, others] = await sql.transaction((tx) => [columns(tx), otherPosts(tx)], { isolationLevel: "RepeatableRead", readOnly: true });
  assert.equal(rows.length, 1);
  const [row] = rows;
  assert(row.slug === ledger.slug && row.published, "Unexpected post identity");
  assert.equal(row.reading_time, ledger.targeting.readingTime, "Reading time does not change in this correction");
  assert.equal(row.published_at_utc, ledger.publication.publishedAt);
  if (row.content === content) {
    console.log("PASS: correction already applied; nothing to do.", JSON.stringify({ id: row.id, updatedAt: row.modified_at_utc, otherPosts: others[0] }));
    return;
  }
  assert.equal(row.content_md5, before.contentMd5, `Post ${postId} body differs from the backup`);
  assert.equal(row.editorial_hash, before.editorialHash, `Post ${postId} changed since the backup; inspect before overwriting`);
  console.log(JSON.stringify({ mode: apply ? "apply" : "read-only", id: row.id, currentModifiedAt: row.modified_at_utc, otherPosts: others[0], changedParagraph: changedParagraphs[0] }, null, 2));
  if (!apply) { console.log("PASS preflight: current post matches the backup; no database writes"); return; }
  const [changed] = await sql.transaction([
    sql`WITH changed AS (
      UPDATE posts AS current_post SET content = ${content}, updated_at = NOW()
      WHERE id = ${postId} AND slug = ${ledger.slug} AND published AND md5(content) = ${before.contentMd5}
        AND md5((to_jsonb(current_post) - 'views')::text) = ${before.editorialHash}
      RETURNING id
    ) SELECT 1 / count(*)::integer AS updated_once FROM changed`,
  ], { isolationLevel: "Serializable" });
  assert.equal(changed[0].updated_once, 1);
  console.log(`COMMITTED: post ${postId} updated once. Do not rerun --apply.`);
  const [[updated], [stillUnchanged]] = await Promise.all([columns(sql), otherPosts(sql)]);
  assert.equal(updated.content, content);
  for (const field of fixed) assert.equal(updated[field], row[field], `Unexpected change in ${field}`);
  assert.deepEqual(stillUnchanged, others[0], "Unrelated posts changed; inspect without overwriting");
  console.log("PASS", JSON.stringify({ id: updated.id, publishedAt: updated.published_at_utc, updatedAt: updated.modified_at_utc, otherPostsUnchanged: stillUnchanged.total, otherPostsHash: stillUnchanged.hash }));
}

try { await main(); }
catch (error) {
  console.error("Update check failed", error.code ?? error.name, error.name === "AssertionError" ? error.message : "Details withheld; inspect read-only before any retry.");
  process.exitCode = 1;
}
