import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";

// Refreshes post 235 (Ollama not using GPU on Windows) with the 23 November 2026 rewrite, approved by the owner that day.
// Read-only by default. --snapshot backs up the live row into the record once; --apply rewrites post 235 once, only while it still matches that backup.
const root = fileURLToPath(new URL("../", import.meta.url));
const recordUrl = new URL("../docs/ollama-gpu-update-2026-11-23.json", import.meta.url);
const args = process.argv.slice(2);
assert(args.length <= 1 && args.every((value) => ["--snapshot", "--apply"].includes(value)), "Read-only by default; --snapshot backs up locally; --apply updates only post 235");
const postId = 235;
const slug = "ollama-not-using-gpu-windows-2026";
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8").replace(/\r\n?/g, "\n").trim();
const selectPost = (sql) => sql`SELECT to_jsonb(p) - 'views' AS post, md5((to_jsonb(p) - 'views')::text) AS hash,
  to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS published_at,
  to_char(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS modified_at
  FROM posts p WHERE id = ${postId} AND slug = ${slug}`;
const selectOthers = (sql) => sql`SELECT count(*)::integer AS total, md5(coalesce(string_agg((to_jsonb(p) - 'views')::text, '' ORDER BY id), '')) AS hash
  FROM posts p WHERE id <> ${postId}`;

function nextFields(record) {
  const content = read(record.contentFile);
  assert.equal(createHash("sha256").update(content).digest("hex"), record.validation.sha256, "Article changed after validation; rerun the test and update the record");
  const { targeting } = record;
  return {
    title: targeting.title, meta_title: targeting.metaTitle, meta_description: targeting.metaDescription, excerpt: targeting.excerpt,
    summary: targeting.summary, keywords: targeting.keywords, reading_time: targeting.readingTime, content,
  };
}

function verifyUpdated(row, record, next) {
  for (const [field, value] of Object.entries(next)) assert.equal(row.post[field], value, `Unexpected updated field ${field}`);
  for (const [field, value] of Object.entries(record.previous.post)) {
    if (Object.hasOwn(next, field) || field === "updated_at") continue;
    assert.deepEqual(row.post[field], value, `Protected field changed: ${field}`);
  }
}

async function main() {
  nextEnv.loadEnvConfig(root);
  assert(process.env.DATABASE_URL, "Database configuration is required");
  const sql = neon(process.env.DATABASE_URL);
  const [rows, otherRows] = await sql.transaction((tx) => [selectPost(tx), selectOthers(tx)], { isolationLevel: "RepeatableRead", readOnly: true });
  assert.equal(rows.length, 1);
  const snapshot = rows[0];
  assert.equal(snapshot.post.published, true);
  if (args.includes("--snapshot")) {
    assert.equal(snapshot.post.title, "Ollama Not Using GPU on Windows? 7 Checks Before Reinstalling", "The live title is not the one this refresh replaces");
    const record = {
      slug, postId, website: "https://www.byteverse.fyi", checkedAt: new Date().toISOString(),
      previous: snapshot, otherPosts: otherRows[0],
      publication: { status: "snapshot-only-not-applied", databaseWrites: 0, pushed: false },
    };
    writeFileSync(recordUrl, `${JSON.stringify(record, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
    console.log("PASS read-only snapshot", JSON.stringify({ id: postId, slug, hash: snapshot.hash, otherPosts: otherRows[0], databaseWrites: 0 }));
    return;
  }
  const record = JSON.parse(readFileSync(recordUrl, "utf8"));
  assert.equal(record.postId, postId);
  assert.equal(record.slug, slug);
  const next = nextFields(record);
  assert([...next.title].length <= 60 && [...`${next.meta_title} | ByteVerse`].length <= 60, "Title or meta title too long");
  assert(next.meta_description.length >= 120 && next.meta_description.length <= 160 && next.summary.split("|").length === 3);
  assert.deepEqual(otherRows[0], record.otherPosts, "Other editorial records changed since the snapshot");
  if (snapshot.post.content === next.content) {
    verifyUpdated(snapshot, record, next);
    console.log("PASS already applied; no writes", JSON.stringify({ id: postId, slug, publishedAt: snapshot.published_at, modifiedAt: snapshot.modified_at }));
    return;
  }
  assert.equal(snapshot.hash, record.previous.hash, "Live article changed since the snapshot");
  const paths = [...new Set([...next.content.matchAll(/(?<!!)\[[^\]]+\]\((\/(?:blog|tools)\/[a-z0-9-]+)\)/g)].map((match) => match[1]))];
  const slugs = paths.filter((path) => path.startsWith("/blog/")).map((path) => path.slice(6));
  const targets = await sql`SELECT slug FROM posts WHERE published AND slug = ANY(${slugs}::text[])`;
  assert.equal(targets.length, slugs.length, "An internal link target is missing or unpublished");
  const images = [record.previous.post.cover_image, ...[...next.content.matchAll(/!\[[^\]]*\]\((https:\/\/[^\s)]+)/g)].map((match) => match[1])];
  const urls = [...paths.map((path) => record.website + path), ...images];
  for (let offset = 0; offset < urls.length; offset += 3) {
    await Promise.all(urls.slice(offset, offset + 3).map(async (url) => {
      const response = await fetch(url, { signal: AbortSignal.timeout(25000) });
      assert.equal(response.status, 200, `Required link/image unavailable: ${url}`);
      if (images.includes(url)) assert.match(response.headers.get("content-type") ?? "", /^image\//);
      await response.body?.cancel();
    }));
  }
  if (!args.includes("--apply")) {
    console.log("PASS read-only preflight", JSON.stringify({ id: postId, slug, currentTitle: snapshot.post.title, newTitle: next.title, publishedAt: snapshot.published_at, links: paths.length, images: images.length, otherPosts: otherRows[0], databaseWrites: 0 }));
    return;
  }
  await sql.transaction([
    sql`WITH changed AS (
      UPDATE posts AS current_post SET title = ${next.title}, meta_title = ${next.meta_title}, meta_description = ${next.meta_description},
        excerpt = ${next.excerpt}, summary = ${next.summary}, keywords = ${next.keywords}, reading_time = ${next.reading_time},
        content = ${next.content}, updated_at = NOW()
      WHERE id = ${postId} AND slug = ${slug} AND published
        AND md5((to_jsonb(current_post) - 'views')::text) = ${record.previous.hash}
      RETURNING id
    ) SELECT 1 / count(*)::integer AS changed_once FROM changed`,
  ], { isolationLevel: "Serializable" });
  console.log(`COMMITTED: post ${postId} updated once. Do not rerun --apply.`);
  const [updated, others] = await sql.transaction((tx) => [selectPost(tx), selectOthers(tx)], { isolationLevel: "RepeatableRead", readOnly: true });
  verifyUpdated(updated[0], record, next);
  assert.deepEqual(others[0], record.otherPosts, "Unrelated editorial records changed; inspect without overwriting");
  console.log("PASS applied once", JSON.stringify({ id: postId, slug, publishedAt: updated[0].published_at, modifiedAt: updated[0].modified_at, otherPostsUnchanged: others[0].total }));
}

try { await main(); }
catch (error) {
  console.error("Ollama GPU update failed", error.code ?? error.name, error.name === "AssertionError" ? error.message : "Details withheld to avoid exposing credentials.");
  process.exitCode = 1;
}
