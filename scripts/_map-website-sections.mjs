import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";
nextEnv.loadEnvConfig(process.cwd());
const sql = neon(process.env.DATABASE_URL);
const [r] = await sql`SELECT content FROM posts WHERE slug = 'how-to-build-website-with-ai-2026'`;
const lines = r.content.split('\n');
lines.forEach((l, i) => { if (l.startsWith('## ') || l.startsWith('![')) console.log(i + ': ' + l.substring(0, 80)); });
