import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";

nextEnv.loadEnvConfig(process.cwd());
const sql = neon(process.env.DATABASE_URL);

const rows = await sql`
  SELECT id, slug, title FROM posts 
  WHERE published = true 
  AND (slug LIKE ${'%typescript%'} OR slug LIKE ${'%api%'} OR slug LIKE ${'%json%'} 
       OR slug LIKE ${'%javascript%'} OR slug LIKE ${'%vscode%'} OR slug LIKE ${'%coding%'} 
       OR slug LIKE ${'%programming%'} OR slug LIKE ${'%best-free-apis%'})
  ORDER BY slug
`;
for (const r of rows) console.log(`${r.id} | ${r.slug}`);

// Also check which post already links to the tool
console.log("\n--- Posts already mentioning json-to-typescript ---");
const linked = await sql`SELECT id, slug FROM posts WHERE content LIKE ${'%json-to-typescript%'} OR content LIKE ${'%JSON to TypeScript%'}`;
for (const r of linked) console.log(`${r.id} | ${r.slug}`);
