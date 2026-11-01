import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = path => readFileSync(resolve(root, path), "utf8").replace(/\r\n?/g, "\n").trim();
const ledger = JSON.parse(read("docs/n8n-json-body-keywords-2026-11-01.json"));
const args = process.argv.slice(2);
assert(args.length <= 1 && args.every(arg => ["--apply", "--repair-author"].includes(arg)), "Read-only by default; --apply publishes once; --repair-author corrects only this article's byline");
const apply = args.includes("--apply");
const repairAuthor = args.includes("--repair-author");
const content = read(`scripts/content/${ledger.slug}.md`);
const sha = value => createHash("sha256").update(value).digest("hex");
assert.equal(ledger.slug, "n8n-json-parameter-needs-to-be-valid-json");
assert.equal(sha(content), ledger.validation.contentSha256);
for (const draft of ledger.inventory.previousLocalDrafts) assert.equal(sha(read(`scripts/content/${draft.slug}.md`)), draft.contentSha256);
const article = {
  title: ledger.targeting.title, slug: ledger.slug, excerpt: ledger.targeting.excerpt, content,
  cover_image: ledger.images.cover, category_id: ledger.targeting.categoryId, author: ledger.targeting.author,
  published: true, featured: false, scheduled_at: null,
  meta_title: ledger.targeting.metaTitle, meta_description: ledger.targeting.metaDescription,
  keywords: ledger.targeting.keywords, summary: ledger.targeting.summary, reading_time: ledger.targeting.readingTime,
};
assert.equal(article.category_id, 2);
assert(article.meta_title.length <= 70 && article.meta_description.length <= 160 && article.excerpt.length <= 300);
assert.equal(article.summary.split("|").length, 3);
const { total, published, hash, protectedDrafts } = ledger.inventory;
const hostSlug = ledger.backlink.host;
const anchor = ledger.backlink.anchor;
const replacement = `${anchor} ${ledger.backlink.sentence}`;
const targetSlugs = ledger.internalLinks.filter(link => link.startsWith("/blog/")).map(link => link.slice(6));
const matches = (text, part) => text.split(part).length - 1;

function verify(row) {
  assert(row, "New article missing");
  for (const [field, expected] of Object.entries(article)) assert.equal(row[field], expected, `Unexpected article field: ${field}`);
}

async function main() {
  nextEnv.loadEnvConfig(root);
  assert(process.env.DATABASE_URL, "Database configuration required");
  const sql = neon(process.env.DATABASE_URL);
  const [existing, category, drafts, targets, hosts, baseline, others, author] = await sql.transaction(transaction => [
    transaction`SELECT * FROM posts WHERE slug = ${article.slug}`,
    transaction`SELECT id, name FROM categories WHERE id = ${article.category_id}`,
    transaction`SELECT slug, published FROM posts WHERE slug = ANY(${protectedDrafts}::text[])`,
    transaction`SELECT slug, published FROM posts WHERE slug = ANY(${targetSlugs}::text[])`,
    transaction`SELECT id, content FROM posts WHERE slug = ${hostSlug} AND published`,
    transaction`SELECT count(*)::integer AS total, (count(*) FILTER (WHERE published))::integer AS published,
      md5(coalesce(string_agg((to_jsonb(p) - 'views')::text, '' ORDER BY id), '')) AS hash,
      to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS database_date FROM posts p`,
    transaction`SELECT count(*)::integer AS total, md5(coalesce(string_agg((to_jsonb(p) - 'views')::text, '' ORDER BY id), '')) AS hash
      FROM posts p WHERE slug <> ${article.slug} AND slug <> ${hostSlug}`,
    transaction`SELECT name, slug FROM authors WHERE name = ${article.author} AND slug = ${ledger.targeting.authorSlug}`,
  ], { isolationLevel: "RepeatableRead", readOnly: true });
  assert.deepEqual(category, [{ id: 2, name: "Tech Guides" }]);
  assert.deepEqual(author, [{ name: article.author, slug: ledger.targeting.authorSlug }], "An existing author profile is required");
  const authorResponse = await fetch(`${ledger.website}/author/${ledger.targeting.authorSlug}`, { signal: AbortSignal.timeout(25000) });
  assert.equal(authorResponse.status, 200, "Author profile must be publicly available");
  await authorResponse.body?.cancel();
  assert.equal(drafts.length, protectedDrafts.length);
  assert(drafts.every(row => !row.published));
  assert.equal(targets.length, targetSlugs.length);
  assert(targets.every(row => row.published));
  assert.equal(hosts.length, 1);
  const host = hosts[0];
  if (existing.length) {
    assert(!apply, "Already published. Do not rerun --apply; use read-only verification.");
    assert.equal(existing.length, 1);
    assert.equal(matches(host.content, replacement), 1);
    if (repairAuthor) {
      assert.equal(existing[0].author, "ByteVerse Team", "Byline already corrected or changed; inspect before retrying");
      verify({ ...existing[0], author: article.author });
      const [repaired] = await sql.transaction([
        sql`UPDATE posts SET author = ${article.author}, updated_at = NOW()
          WHERE id = ${existing[0].id} AND slug = ${article.slug} AND author = 'ByteVerse Team' AND published
            AND content = ${content}
            AND (SELECT md5(coalesce(string_agg((to_jsonb(p) - 'views')::text, '' ORDER BY id), '')) FROM posts p) = ${baseline[0].hash}
            AND EXISTS (SELECT 1 FROM authors WHERE name = ${article.author} AND slug = ${ledger.targeting.authorSlug})
          RETURNING *`,
      ], { isolationLevel: "Serializable" });
      assert.equal(repaired.length, 1, "Author repair did not update exactly one unchanged article");
      verify(repaired[0]);
      const [unchanged] = await sql`SELECT count(*)::integer AS total, md5(coalesce(string_agg((to_jsonb(p) - 'views')::text, '' ORDER BY id), '')) AS hash
        FROM posts p WHERE slug <> ${article.slug} AND slug <> ${hostSlug}`;
      assert.deepEqual(unchanged, others[0]);
      console.log("PASS author correction", JSON.stringify({ id: repaired[0].id, author: article.author, authorUrl: `${ledger.website}/author/${ledger.targeting.authorSlug}`, otherPostsUnchanged: unchanged.total }));
      return;
    }
    verify(existing[0]);
    console.log("PASS published article and contextual link", JSON.stringify({ id: existing[0].id, slug: article.slug }));
    return;
  }
  assert(!repairAuthor, "Author repair cannot create a post");
  const { database_date: databaseDate, ...inventory } = baseline[0];
  assert.deepEqual(inventory, { total, published, hash }, "Editorial inventory changed since research; refusing to publish");
  assert.equal(matches(host.content, anchor), 1, "Contextual-link anchor must occur exactly once");
  assert(!host.content.includes(`/blog/${article.slug}`));
  console.log(JSON.stringify({ mode: apply ? "apply" : "read-only", databaseDate, inventory, otherPosts: others[0], hostId: host.id, protectedDrafts }, null, 2));
  const images = [ledger.images.cover, ledger.images.inline];
  for (const url of [...images, ...ledger.internalLinks.map(path => ledger.website + path)]) {
    const response = await fetch(url, { signal: AbortSignal.timeout(25000) });
    assert.equal(response.status, 200, `Required live asset or link unavailable: ${url}`);
    if (images.includes(url)) assert.match(response.headers.get("content-type") ?? "", /^image\//);
    await response.body?.cancel();
  }
  if (!apply) { console.log("PASS preflight: article, metadata, inventory, live images and internal links; no database writes"); return; }
  assert.equal(ledger.publication.date, databaseDate, "Set the verified publication date before applying");
  await sql.transaction([
    sql`WITH inv AS (
      SELECT count(*)::integer AS total, (count(*) FILTER (WHERE published))::integer AS published,
        md5(coalesce(string_agg((to_jsonb(p) - 'views')::text, '' ORDER BY id), '')) AS hash FROM posts p
    ), inserted AS (
      INSERT INTO posts (title, slug, excerpt, content, cover_image, category_id, author, published, featured, scheduled_at,
        meta_title, meta_description, keywords, summary, reading_time, views, created_at, updated_at)
      SELECT ${article.title}, ${article.slug}, ${article.excerpt}, ${article.content}, ${article.cover_image}, category.id,
        ${article.author}, true, false, NULL, ${article.meta_title}, ${article.meta_description}, ${article.keywords},
        ${article.summary}, ${article.reading_time}, 0, NOW(), NOW()
      FROM inv CROSS JOIN categories category
      WHERE category.id = 2 AND category.name = 'Tech Guides' AND inv.total = ${total} AND inv.published = ${published} AND inv.hash = ${hash}
        AND to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD') = ${ledger.publication.date}
        AND NOT EXISTS (SELECT 1 FROM posts WHERE slug = ${article.slug})
        AND (SELECT count(*) FROM posts WHERE slug = ANY(${protectedDrafts}::text[]) AND NOT published) = ${protectedDrafts.length}
        AND (SELECT count(*) FROM posts WHERE slug = ANY(${targetSlugs}::text[]) AND published) = ${targetSlugs.length}
        AND EXISTS (SELECT 1 FROM authors WHERE name = ${article.author} AND slug = ${ledger.targeting.authorSlug})
      RETURNING id
    ) SELECT 1 / count(*)::integer AS inserted_once FROM inserted`,
    sql`WITH updated AS (
      UPDATE posts SET content = replace(content, ${anchor}, ${replacement}), updated_at = NOW()
      WHERE slug = ${hostSlug} AND published AND content = ${host.content}
        AND EXISTS (SELECT 1 FROM posts WHERE slug = ${article.slug} AND published)
      RETURNING id
    ) SELECT 1 / count(*)::integer AS updated_once FROM updated`,
  ], { isolationLevel: "Serializable" });
  console.log("COMMITTED: one article and one contextual internal link. Do not rerun --apply.");
  const [after] = await sql`SELECT *, to_char(created_at, 'YYYY-MM-DD') AS publication_date FROM posts WHERE slug = ${article.slug}`;
  verify(after);
  const [updatedHost] = await sql`SELECT content FROM posts WHERE slug = ${hostSlug}`;
  assert.equal(updatedHost.content, host.content.replace(anchor, replacement));
  const [unchanged] = await sql`SELECT count(*)::integer AS total, md5(coalesce(string_agg((to_jsonb(p) - 'views')::text, '' ORDER BY id), '')) AS hash
    FROM posts p WHERE slug <> ${article.slug} AND slug <> ${hostSlug}`;
  assert.deepEqual(unchanged, others[0], "Unrelated editorial records changed; inspect without overwriting");
  console.log("PASS", JSON.stringify({ postId: after.id, slug: after.slug, date: after.publication_date, otherPostsUnchanged: unchanged.total, otherPostsHash: unchanged.hash, hostId: host.id }));
}

try { await main(); }
catch (error) {
  console.error("Publication check failed", error.code ?? error.name, error.name === "AssertionError" ? error.message : "Details withheld; inspect read-only before any retry.");
  process.exitCode = 1;
}