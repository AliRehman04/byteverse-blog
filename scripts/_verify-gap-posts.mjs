import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";
nextEnv.loadEnvConfig(process.cwd());
const sql = neon(process.env.DATABASE_URL);

const newSlugs = [
  "how-to-get-backlinks-2026",
  "how-to-write-blog-posts-with-ai-2026",
  "google-analytics-4-for-bloggers-2026",
  "faceless-youtube-channel-with-ai-2026",
  "how-to-sell-digital-products-2026",
  "how-to-use-midjourney-2026-complete-guide",
  "how-to-spot-ai-scams-deepfakes-2026",
  "how-to-build-ai-agent-without-coding-2026",
  "how-to-start-a-newsletter-2026",
  "how-to-become-data-analyst-2026",
];

const rows = await sql`SELECT slug, published FROM posts`;
const bySlug = new Map(rows.map((r) => [r.slug, r.published]));

let totalLinks = 0, totalBad = 0;
for (const s of newSlugs) {
  const [p] = await sql`SELECT content, published, to_char(created_at, 'YYYY-MM-DD') AS day, meta_title, meta_description FROM posts WHERE slug = ${s}`;
  if (!p) { console.log(`MISSING POST!! ${s}`); totalBad++; continue; }
  const links = [...new Set([...p.content.matchAll(/\]\((\/blog\/[a-z0-9-]+)\)/g)].map((m) => m[1]))];
  const words = p.content.trim().split(/\s+/).length;
  let bad = [];
  for (const l of links) {
    const target = l.replace("/blog/", "");
    if (bySlug.get(target) !== true) bad.push(l);
  }
  totalLinks += links.length;
  totalBad += bad.length;
  const metaOk = p.meta_title.length <= 70 && p.meta_description.length <= 160;
  console.log(`[${p.day}] ${p.published ? "PUB!!" : "draft"} ${s} — ${words}w, ${links.length} links${bad.length ? " BAD: " + bad.join(",") : " all-ok"}${metaOk ? "" : " META-LEN!!"}`);
}
console.log(`\nTotal: ${totalLinks} unique internal links, ${totalBad} broken. ${totalBad === 0 ? "ALL CLEAN ✓" : "FIX NEEDED"}`);
