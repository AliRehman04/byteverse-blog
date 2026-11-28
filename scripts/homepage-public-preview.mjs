import assert from "node:assert/strict";
import { parseDocument } from "htmlparser2";
import { findAll, textContent } from "domutils";

const origin = "https://www.byteverse.fyi";
const named = (root, name) => findAll(node => node.type === "tag" && node.name === name, root.children);
const value = (root, name) => textContent(named(root, name)[0] ?? { children: [] }).trim();

async function publicText(url) {
  const target = new URL(url);
  assert(target.origin === origin && (target.pathname === "/feed.xml" || /^\/blog\/[a-z0-9-]+$/.test(target.pathname)));
  const response = await fetch(target, { method: "GET", redirect: "error", signal: AbortSignal.timeout(20000) });
  assert(response.ok && response.body, `Public preview source unavailable: ${target.pathname}`);
  const reader = response.body.getReader(), chunks = [];
  let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      assert(size <= 2_000_000, "Public preview response exceeds limit");
      chunks.push(value);
    }
  } finally { await reader.cancel(); }
  return Buffer.concat(chunks).toString("utf8");
}

const metaContent = (html, key, name) => findAll(node => node.type === "tag" && node.name === "meta" && node.attribs[key] === name, html.children)[0]?.attribs.content ?? null;
const schemasOf = html => findAll(node => node.type === "script" && node.attribs.type === "application/ld+json", html.children).flatMap(node => {
  const json = JSON.parse(node.children.map(child => child.data ?? "").join(""));
  return json["@graph"] ?? [json];
});
const localCover = cover => cover?.startsWith(`${origin}/`) ? cover.slice(origin.length) : cover;

// A curated guide is read from its own published page, because it may be too old to appear in the feed.
async function publishedGuide(slug, id) {
  assert(/^[a-z0-9-]+$/.test(slug));
  const url = `${origin}/blog/${slug}`;
  const html = parseDocument(await publicText(url));
  const schemas = schemasOf(html);
  const article = schemas.find(schema => schema["@type"] === "BlogPosting");
  assert(article && new URL(article.url).href === url, `Published article schema must match ${slug}`);
  const crumbs = schemas.find(schema => schema["@type"] === "BreadcrumbList")?.itemListElement ?? [];
  const category = crumbs.find(crumb => typeof crumb.item === "string" && crumb.item.startsWith(`${origin}/category/`));
  const createdAt = new Date(article.datePublished);
  assert(Number.isFinite(createdAt.getTime()) && createdAt.getTime() <= Date.now());
  const minutes = /^PT(\d+)M$/.exec(article.timeRequired ?? "");
  const title = textContent(named(html, "h1")[0] ?? { children: [] }).trim();
  assert(title, `Published title missing for ${slug}`);
  return {
    id, title, slug, excerpt: metaContent(html, "name", "description") ?? "",
    coverImage: localCover(metaContent(html, "property", "og:image")),
    author: article.author?.name ?? "", readingTime: minutes ? `${minutes[1]} min read` : null,
    createdAt: createdAt.toISOString(), categoryName: article.articleSection ?? null,
    categorySlug: category ? new URL(category.item).pathname.slice("/category/".length) : null,
  };
}

export async function getPublishedHomepagePreview(featuredSlugs = []) {
  const feed = parseDocument(await publicText(`${origin}/feed.xml`), { xmlMode: true, decodeEntities: true });
  const items = named(feed, "item").slice(0, 9);
  assert.equal(items.length, 9, "Nine published feed entries are required");
  const posts = [];
  for (let start = 0; start < items.length; start += 3) {
    posts.push(...await Promise.all(items.slice(start, start + 3).map(async (item, offset) => {
      const url = new URL(value(item, "link"));
      const html = parseDocument(await publicText(url.href));
      const schemas = schemasOf(html);
      const article = schemas.find(schema => schema["@type"] === "BlogPosting");
      assert(article && new URL(article.url).href === url.href, "Published article schema must match the feed link");
      const crumbs = schemas.find(schema => schema["@type"] === "BreadcrumbList")?.itemListElement ?? [];
      const category = crumbs.find(crumb => typeof crumb.item === "string" && crumb.item.startsWith(`${origin}/category/`));
      const cover = named(item, "enclosure")[0]?.attribs.url ?? null;
      const createdAt = new Date(value(item, "pubDate"));
      assert(Number.isFinite(createdAt.getTime()) && createdAt.getTime() <= Date.now());
      const minutes = /^PT(\d+)M$/.exec(article.timeRequired ?? "");
      return {
        id: 980000 + start + offset,
        title: value(item, "title"), slug: url.pathname.slice("/blog/".length),
        excerpt: value(item, "description"), coverImage: localCover(cover),
        author: value(item, "author"), readingTime: minutes ? `${minutes[1]} min read` : null,
        createdAt: createdAt.toISOString(), categoryName: article.articleSection ?? null,
        categorySlug: category ? new URL(category.item).pathname.slice("/category/".length) : null,
      };
    })));
  }
  assert.equal(new Set(posts.map(post => post.slug)).size, 9);
  const featured = [];
  for (let start = 0; start < featuredSlugs.length; start += 3) {
    featured.push(...await Promise.all(featuredSlugs.slice(start, start + 3).map((slug, offset) => publishedGuide(slug, 985000 + start + offset))));
  }
  return { source: `${origin}/feed.xml`, fetchedAt: new Date().toISOString(), posts, featured };
}