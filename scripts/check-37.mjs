import { neon } from "@neondatabase/serverless";
import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());
const sql = neon(process.env.DATABASE_URL);
const r = await sql`SELECT content FROM posts WHERE id = 37`;
// Find last heading
const headings = r[0].content.match(/^## .+$/gm);
headings.forEach(h => console.log(h));
