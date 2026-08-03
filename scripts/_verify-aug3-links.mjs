import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";
nextEnv.loadEnvConfig(process.cwd());
const sql = neon(process.env.DATABASE_URL);

const [post] = await sql`SELECT content FROM posts WHERE slug = 'how-to-rank-in-ai-search-2026'`;
const links = [...post.content.matchAll(/\]\((\/blog\/[a-z0-9-]+)\)/g)].map((m) => m[1]);
const unique = [...new Set(links)];
console.log(`Internal links found: ${links.length} (${unique.length} unique)`);

const rows = await sql`SELECT slug, published FROM posts`;
const bySlug = new Map(rows.map((r) => [r.slug, r.published]));

let ok = 0, bad = 0;
for (const l of unique) {
  const slug = l.replace("/blog/", "");
  const pub = bySlug.get(slug);
  if (pub === true) { ok++; console.log(`  OK   ${l}`); }
  else if (pub === false) { bad++; console.log(`  DRAFT!! ${l}`); }
  else { bad++; console.log(`  MISSING!! ${l}`); }
}
console.log(bad === 0 ? `All ${ok} link targets exist & are published.` : `${bad} broken targets!`);
