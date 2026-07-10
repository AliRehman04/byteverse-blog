import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";
nextEnv.loadEnvConfig(process.cwd());
const sql = neon(process.env.DATABASE_URL);
const r = await sql`
  SELECT p.slug, c.slug AS cat FROM posts p JOIN categories c ON p.category_id = c.id
  WHERE p.slug LIKE '%vscode%' OR p.slug LIKE '%cursor%' OR p.slug LIKE '%copilot-guide%'`;
r.forEach(x => console.log(x.cat, '|', x.slug));
