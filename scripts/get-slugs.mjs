import { neon } from "@neondatabase/serverless";
import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());
const sql = neon(process.env.DATABASE_URL);
const r = await sql`SELECT id, slug FROM posts WHERE published = true ORDER BY id`;
r.forEach(p => console.log(p.id, p.slug));
