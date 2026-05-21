import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";
nextEnv.loadEnvConfig(process.cwd());
const sql = neon(process.env.DATABASE_URL);

const posts = await sql`select id, title, slug, content, keywords, meta_title, meta_description, reading_time from posts order by id`;

console.log(`\n${"ID".padEnd(4)} ${"Words".padEnd(7)} ${"Read".padEnd(10)} Title`);
console.log("─".repeat(100));

for (const post of posts) {
  const words = post.content.split(/\s+/).length;
  const status = words < 1500 ? "⚠️ SHORT" : words < 2000 ? "📝 OK" : "✅ LONG";
  console.log(`${String(post.id).padEnd(4)} ${String(words).padEnd(7)} ${(post.reading_time || "").padEnd(10)} ${status} ${post.title}`);
  console.log(`     Keywords: ${post.keywords}`);
  console.log();
}
