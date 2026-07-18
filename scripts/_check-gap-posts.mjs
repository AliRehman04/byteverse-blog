import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";
nextEnv.loadEnvConfig(process.cwd());
const sql = neon(process.env.DATABASE_URL);
const r = await sql`SELECT id, slug, published, created_at FROM posts WHERE created_at >= '2026-07-15T12:00:00Z' ORDER BY created_at DESC`;
r.forEach(x => console.log(x.id, x.slug, x.published, x.created_at));
if (!r.length) console.log('No new posts since Jul 15.');
