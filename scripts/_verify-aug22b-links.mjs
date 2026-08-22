import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";
nextEnv.loadEnvConfig(process.cwd());
const sql = neon(process.env.DATABASE_URL);

const slug = "how-to-edit-photos-with-ai-2026";
const [post] = await sql`SELECT content, published, meta_title, meta_description FROM posts WHERE slug = ${slug}`;
const links = [...new Set([...post.content.matchAll(/\]\((\/blog\/[a-z0-9-]+)\)/g)].map((m) => m[1]))];
console.log(`Status: ${post.published ? "PUBLISHED" : "draft"} | Unique internal links: ${links.length}`);

const rows = await sql`SELECT slug, published FROM posts`;
const bySlug = new Map(rows.map((r) => [r.slug, r.published]));

let bad = 0;
for (const l of links) {
  const pub = bySlug.get(l.replace("/blog/", ""));
  if (pub === true) console.log(`  OK   ${l}`);
  else { bad++; console.log(`  ${pub === false ? "DRAFT" : "MISSING"}!! ${l}`); }
}
console.log(`meta_title: ${post.meta_title.length} chars | meta_description: ${post.meta_description.length} chars`);
console.log(bad === 0 ? "All link targets published OK" : `${bad} bad targets!`);
