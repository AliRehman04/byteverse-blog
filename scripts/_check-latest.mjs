import { neon } from "@neondatabase/serverless";
import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());

const sql = neon(process.env.DATABASE_URL);
const r = await sql`SELECT id, title, category_id FROM posts ORDER BY id DESC LIMIT 10`;
console.log(JSON.stringify(r, null, 2));
