import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";

const root = fileURLToPath(new URL("../", import.meta.url));
const ledger = JSON.parse(readFileSync(new URL("../docs/fetch-html-json-keywords-2026-11-05.json", import.meta.url), "utf8"));
const content = readFileSync(new URL(`content/${ledger.slug}.md`, import.meta.url), "utf8").replace(/\r\n?/g, "\n").trim();
const args = process.argv.slice(2);
assert(args.length <= 1 && args.every(value => value === "--apply"), "Read-only by default; --apply publishes only this article");
assert.equal(ledger.slug, "unexpected-token-html-not-valid-json");
assert.equal(createHash("sha256").update(content).digest("hex"), ledger.validation.contentSha256);
const apply = args.includes("--apply");
const article = {
  title: ledger.targeting.title, slug: ledger.slug, excerpt: ledger.targeting.excerpt, content,
  meta_title: ledger.targeting.metaTitle, meta_description: ledger.targeting.metaDescription,
  keywords: ledger.targeting.keywords, summary: ledger.targeting.summary, reading_time: ledger.targeting.readingTime,
  cover_image: ledger.images.cover, category_id: ledger.targeting.categoryId, author: ledger.targeting.author,
  published: true, featured: false, scheduled_at: null,
};
const targets = ledger.internalLinks.filter(path => path.startsWith("/blog/")).map(path => path.slice(6));
const drafts = ledger.inventory.protectedDrafts;
const snapshot = sql => sql`SELECT count(*)::integer AS total, (count(*) FILTER (WHERE published))::integer AS published,
  md5(coalesce(string_agg((to_jsonb(p) - 'views')::text, '' ORDER BY id), '')) AS hash
  FROM posts p WHERE slug <> ${article.slug}`;

async function main() {
  nextEnv.loadEnvConfig(root);
  assert(process.env.DATABASE_URL, "Database configuration is required");
  const sql = neon(process.env.DATABASE_URL);
  const [existing, inventory, category, author, links, protectedRows] = await sql.transaction(tx => [
    tx`SELECT * FROM posts WHERE slug = ${article.slug}`,
    snapshot(tx),
    tx`SELECT id, slug FROM categories WHERE id = ${article.category_id}`,
    tx`SELECT name, slug FROM authors WHERE name = ${article.author} AND slug = ${ledger.targeting.authorSlug}`,
    tx`SELECT slug FROM posts WHERE published AND slug = ANY(${targets}::text[])`,
    tx`SELECT slug FROM posts WHERE NOT published AND slug = ANY(${drafts}::text[])`,
  ], { isolationLevel: "RepeatableRead", readOnly: true });
  assert.deepEqual(category, [{ id: article.category_id, slug: ledger.targeting.categorySlug }]);
  assert.deepEqual(author, [{ name: article.author, slug: ledger.targeting.authorSlug }]);
  assert.equal(links.length, targets.length);
  assert.equal(protectedRows.length, drafts.length);
  if (existing.length) {
    assert.equal(existing.length, 1);
    for (const [field, value] of Object.entries(article)) assert.equal(existing[0][field], value, `Published article differs: ${field}`);
    console.log("PASS: article already exists exactly; no writes.", JSON.stringify({ id: existing[0].id, slug: article.slug }));
    return;
  }
  const expected = { total: ledger.inventory.total, published: ledger.inventory.published, hash: ledger.inventory.hash };
  assert.deepEqual(inventory[0], expected, "Editorial inventory changed; review before publication");
  const urls = [
    ...ledger.internalLinks.map(path => ledger.website + path),
    `${ledger.website}/author/${ledger.targeting.authorSlug}`,
    ledger.images.cover, ledger.images.inline,
  ];
  for (let offset = 0; offset < urls.length; offset += 3) {
    await Promise.all(urls.slice(offset, offset + 3).map(async url => {
      const response = await fetch(url, { signal: AbortSignal.timeout(25000) });
      assert.equal(response.status, 200, `Required link or image unavailable: ${url}`);
      if ([ledger.images.cover, ledger.images.inline].includes(url)) assert.match(response.headers.get("content-type") ?? "", /^image\//);
      await response.body?.cancel();
    }));
  }
  console.log(JSON.stringify({ mode: apply ? "apply" : "read-only", slug: article.slug, inventory: inventory[0], internalLinks: ledger.internalLinks.length, author: article.author }, null, 2));
  if (!apply) { console.log("PASS preflight: draft, author, category, links and existing images verified; zero database writes."); return; }
  await sql.transaction([
    sql`WITH inventory AS (
      SELECT count(*)::integer AS total, (count(*) FILTER (WHERE published))::integer AS published,
        md5(coalesce(string_agg((to_jsonb(p) - 'views')::text, '' ORDER BY id), '')) AS hash FROM posts p
    ), inserted AS (
      INSERT INTO posts (title, slug, excerpt, content, cover_image, category_id, author, published, featured, scheduled_at,
        meta_title, meta_description, keywords, summary, reading_time, views, created_at, updated_at)
      SELECT ${article.title}, ${article.slug}, ${article.excerpt}, ${article.content}, ${article.cover_image}, ${article.category_id},
        ${article.author}, true, false, NULL, ${article.meta_title}, ${article.meta_description}, ${article.keywords},
        ${article.summary}, ${article.reading_time}, 0, NOW(), NOW()
      FROM inventory
      WHERE total = ${expected.total} AND published = ${expected.published} AND hash = ${expected.hash}
        AND NOT EXISTS (SELECT 1 FROM posts WHERE slug = ${article.slug})
        AND EXISTS (SELECT 1 FROM authors WHERE name = ${article.author} AND slug = ${ledger.targeting.authorSlug})
        AND EXISTS (SELECT 1 FROM categories WHERE id = ${article.category_id} AND slug = ${ledger.targeting.categorySlug})
        AND (SELECT count(*) FROM posts WHERE published AND slug = ANY(${targets}::text[])) = ${targets.length}
        AND (SELECT count(*) FROM posts WHERE NOT published AND slug = ANY(${drafts}::text[])) = ${drafts.length}
      RETURNING id
    ) SELECT 1 / count(*)::integer AS inserted_once FROM inserted`,
  ], { isolationLevel: "Serializable" });
  const [published] = await sql`SELECT *, to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS published_at_utc FROM posts WHERE slug = ${article.slug}`;
  for (const [field, value] of Object.entries(article)) assert.equal(published[field], value, `Unexpected published field: ${field}`);
  assert.deepEqual((await snapshot(sql))[0], expected, "Unrelated posts changed; inspect without overwriting");
  console.log("PASS published once", JSON.stringify({ id: published.id, slug: article.slug, publishedAt: published.published_at_utc, otherPostsUnchanged: expected.total }));
}

try { await main(); }
catch (error) {
  console.error("Article preflight/publication failed", error.code ?? error.name, error.name === "AssertionError" ? error.message : "Details withheld; inspect configuration without exposing credentials.");
  process.exitCode = 1;
}