import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";
nextEnv.loadEnvConfig(process.cwd());
const sql = neon(process.env.DATABASE_URL);
const rows = await sql`SELECT slug, title, meta_title, meta_description, to_char(updated_at,'YYYY-MM-DD') AS upd FROM posts WHERE slug IN ('best-free-hosting-platforms-2026','best-ai-sales-tools-2026','best-vibe-coding-tools-2026')`;
rows.forEach(r => console.log(JSON.stringify(r, null, 1)));
