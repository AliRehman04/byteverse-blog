import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";
nextEnv.loadEnvConfig(process.cwd());
const sql = neon(process.env.DATABASE_URL);
const rows = await sql`SELECT slug, published, created_at FROM posts WHERE created_at >= '2026-07-20' ORDER BY created_at`;
rows.forEach(r => console.log(String(r.created_at).slice(0,24), r.published ? "PUB " : "DRAFT", r.slug));
