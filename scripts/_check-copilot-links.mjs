import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";

nextEnv.loadEnvConfig(process.cwd());
const sql = neon(process.env.DATABASE_URL);

const rows = await sql`SELECT id, slug, content FROM posts WHERE content LIKE ${'%github.com/features/copilot%'}`;
console.log(`Posts with copilot link: ${rows.length}`);
for (const r of rows) {
  const lines = r.content.split('\n').filter(l => l.includes('github.com/features/copilot'));
  console.log(`\n[${r.id}] ${r.slug}:`);
  for (const l of lines) {
    const idx = l.indexOf('github.com/features/copilot');
    const start = Math.max(0, idx - 100);
    const end = Math.min(l.length, idx + 80);
    console.log(`  ...${l.substring(start, end)}...`);
  }
}
