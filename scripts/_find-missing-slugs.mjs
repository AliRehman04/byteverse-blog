import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";

nextEnv.loadEnvConfig(process.cwd());
const sql = neon(process.env.DATABASE_URL);

const missing = [
  "90-day-blog-content-plan-new-websites-2026",
  "best-ai-photo-editors-2026",
  "best-ai-social-media-tools-2026",
  "blog-post-ideas-new-bloggers-2026",
  "blog-seo-checklist-before-publishing-2026",
  "build-topical-authority-new-blog-2026",
  "google-search-console-new-blogs-2026",
];

for (const slug of missing) {
  // Check exact match
  const exact = await sql`SELECT id, slug FROM posts WHERE slug = ${slug}`;
  if (exact.length > 0) {
    console.log(`✓ FOUND: ${slug} → [${exact[0].id}]`);
    continue;
  }

  // Find closest match using key words from the slug
  const words = slug.split("-").filter(w => w.length > 3 && w !== "2026" && w !== "best" && w !== "blog" && w !== "new");
  const keyword = words.slice(0, 2).join("%");
  const similar = await sql`SELECT id, slug FROM posts WHERE slug LIKE ${"%" + keyword + "%"} ORDER BY slug`;
  console.log(`✗ MISSING: ${slug}`);
  if (similar.length > 0) {
    for (const s of similar) console.log(`    possible match: [${s.id}] ${s.slug}`);
  } else {
    // Try broader search
    const firstWord = words[0] || slug.split("-")[0];
    const broader = await sql`SELECT id, slug FROM posts WHERE slug LIKE ${"%" + firstWord + "%"} ORDER BY slug`;
    for (const s of broader) console.log(`    broad match: [${s.id}] ${s.slug}`);
  }
}
