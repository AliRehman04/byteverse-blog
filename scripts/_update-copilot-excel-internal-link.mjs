import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";

// Adds one sentence with an internal link to post 260 near the top of post 234 (owner-approved, 25 November 2026).
// "backup" saves the live body once. No argument is a read-only preflight. "--apply" updates the body once, and only while it still matches the backup.
const root = fileURLToPath(new URL("../", import.meta.url));
const hash = (algorithm, value) => createHash(algorithm).update(value).digest("hex");
const POST_ID = 234;
const SLUG = "copilot-in-excel-not-showing-2026";
const TARGET = "/blog/copilot-not-showing-in-outlook";
const backupFile = resolve(root, `docs/content-backups/${SLUG}-before-2026-11-25-internal-link.md`);
const ANCHOR = "This is a documentation-based troubleshooting guide";
const SENTENCE = "If the Copilot you are missing is in Outlook rather than Excel, see [Copilot not showing in Outlook](/blog/copilot-not-showing-in-outlook). Outlook has its own rules for licenses, mailboxes and the classic app.";
const [action, ...rest] = process.argv.slice(2);
assert(rest.length === 0 && [undefined, "backup", "--apply"].includes(action), "Usage: [backup|--apply]");
nextEnv.loadEnvConfig(root);
const sql = neon(process.env.DATABASE_URL);
const columns = () => sql`SELECT id, slug, published, title, meta_title, meta_description, excerpt, summary, keywords, cover_image, reading_time, content,
  md5(content) AS content_md5, md5((to_jsonb(p) - 'views')::text) AS editorial_hash,
  to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS published_at_utc, to_char(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS modified_at_utc FROM posts p WHERE id = ${POST_ID}`;
const others = () => sql`SELECT count(*)::integer AS total, md5(coalesce(string_agg((to_jsonb(p) - 'views')::text, '' ORDER BY id), '')) AS hash FROM posts p WHERE id <> ${POST_ID}`;
const [[row], [target]] = await Promise.all([columns(), sql`SELECT id, published FROM posts WHERE slug = ${TARGET.slice(6)}`]);
assert(row.slug === SLUG && row.published, "Unexpected post identity");
assert(target?.published && target.id === 260, "The link target must be the published post 260");

if (action === "backup") {
  assert(!row.content.includes(TARGET), "The post already links to the new article");
  writeFileSync(backupFile, row.content, { encoding: "utf8", flag: "wx" });
  assert.equal(hash("md5", readFileSync(backupFile, "utf8")), row.content_md5);
  const paragraphs = row.content.split("\n\n");
  console.log(JSON.stringify({ backupFile: backupFile.replace(root, ""), contentMd5: row.content_md5, editorialHash: row.editorial_hash, modifiedAt: row.modified_at_utc, readingTime: row.reading_time, paragraphs: paragraphs.length, anchorParagraphs: paragraphs.filter((paragraph) => paragraph.startsWith(ANCHOR)).length }));
  console.log(paragraphs.slice(0, 4).map((paragraph, index) => `[${index}] ${paragraph}`).join("\n\n"));
} else {
  assert(existsSync(backupFile), "Run the backup step first");
  const backup = readFileSync(backupFile, "utf8");
  const paragraphs = backup.split("\n\n");
  const index = paragraphs.findIndex((paragraph) => paragraph.startsWith(ANCHOR));
  assert(index > 0 && paragraphs.filter((paragraph) => paragraph.startsWith(ANCHOR)).length === 1, "Exactly one anchor paragraph expected");
  const updated = [...paragraphs.slice(0, index + 1), SENTENCE, ...paragraphs.slice(index + 1)].join("\n\n");
  assert.equal(updated.length, backup.length + SENTENCE.length + 2);
  assert.equal(updated.replace(`\n\n${SENTENCE}`, ""), backup, "Only the new sentence may differ");
  assert.equal((updated.match(/\/blog\/copilot-not-showing-in-outlook/g) ?? []).length, 1, "Exactly one link to the new article");
  assert(SENTENCE.split(/\s+/).length <= 75 && !/[\u2013\u2014]/.test(SENTENCE));
  await addLink(backup, index, updated);
}

async function addLink(backup, index, updated) {
  if (row.content === updated) { console.log("PASS: link already added; nothing to do.", JSON.stringify({ updatedAt: row.modified_at_utc })); return; }
  assert.equal(row.content_md5, hash("md5", backup), "Post 234 body differs from the backup");
  const before = { editorialHash: row.editorial_hash, other: (await others())[0] };
  console.log(JSON.stringify({ mode: action === "--apply" ? "apply" : "read-only", insertAfterParagraph: index, currentModifiedAt: row.modified_at_utc, otherPosts: before.other }));
  if (action !== "--apply") { console.log("PASS preflight: live post matches the backup; one sentence will be added; no database writes"); return; }
  const [changed] = await sql.transaction([
    sql`WITH changed AS (
      UPDATE posts AS current_post SET content = ${updated}, updated_at = NOW()
      WHERE id = ${POST_ID} AND slug = ${SLUG} AND published AND md5(content) = ${row.content_md5}
        AND md5((to_jsonb(current_post) - 'views')::text) = ${before.editorialHash}
      RETURNING id
    ) SELECT 1 / count(*)::integer AS updated_once FROM changed`,
  ], { isolationLevel: "Serializable" });
  assert.equal(changed[0].updated_once, 1);
  const [[after], [stillUnchanged]] = await Promise.all([columns(), others()]);
  assert.equal(after.content, updated);
  for (const field of ["title", "meta_title", "meta_description", "excerpt", "summary", "keywords", "cover_image", "reading_time", "published_at_utc"]) assert.equal(after[field], row[field], `Unexpected change in ${field}`);
  assert.deepEqual(stillUnchanged, before.other, "Unrelated posts changed; inspect without overwriting");
  console.log("PASS", JSON.stringify({ id: after.id, updatedAt: after.modified_at_utc, contentMd5: after.content_md5, otherPostsUnchanged: stillUnchanged.total }));
}
