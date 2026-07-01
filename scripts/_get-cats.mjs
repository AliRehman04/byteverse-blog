import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";
nextEnv.loadEnvConfig(process.cwd());
const sql = neon(process.env.DATABASE_URL);
const r = await sql`SELECT id, slug FROM categories ORDER BY id`;
r.forEach(c => console.log(c.id, c.slug));
