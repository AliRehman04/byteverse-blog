import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";

nextEnv.loadEnvConfig(process.cwd());
const sql = neon(process.env.DATABASE_URL);

const rows = await sql`SELECT id, slug, content FROM posts WHERE content LIKE ${'%nofollow%'}`;
console.log(`Posts with nofollow: ${rows.length}`);
for (const r of rows) {
  // Find all nofollow occurrences with context
  const lines = r.content.split('\n');
  const matches = lines.filter(l => l.toLowerCase().includes('nofollow'));
  console.log(`\n[${r.id}] ${r.slug} (${matches.length} lines):`);
  for (const m of matches) {
    // Show trimmed line
    console.log(`  ${m.trim().substring(0, 200)}`);
  }
}
