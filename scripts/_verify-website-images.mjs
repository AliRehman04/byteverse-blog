import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";
nextEnv.loadEnvConfig(process.cwd());
const sql = neon(process.env.DATABASE_URL);
const [r] = await sql`SELECT content FROM posts WHERE slug = 'how-to-build-website-with-ai-2026'`;
const imgs = [...r.content.matchAll(/!\[([^\]]*)\]\(([^)\s]+)/g)];
console.log('Total images:', imgs.length);
imgs.forEach((m, i) => console.log(`${i + 1}. ${m[2].substring(0, 62)}\n   alt: ${m[1]}`));
