import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());
import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL);
const r = await sql`SELECT id, title, slug, category_id FROM posts WHERE published=true ORDER BY id`;
console.log(JSON.stringify(r, null, 2));
