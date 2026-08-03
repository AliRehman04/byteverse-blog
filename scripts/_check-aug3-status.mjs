import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";
nextEnv.loadEnvConfig(process.cwd());
const sql = neon(process.env.DATABASE_URL);
const [p] = await sql`SELECT p.title, p.slug, c.slug AS category, p.published, p.created_at, p.reading_time FROM posts p LEFT JOIN categories c ON c.id = p.category_id WHERE p.slug = 'how-to-rank-in-ai-search-2026'`;
const words = p ? (await sql`SELECT content FROM posts WHERE slug = 'how-to-rank-in-ai-search-2026'`)[0].content.split(/\s+/).length : 0;
console.log({ title: p?.title, slug: p?.slug, category: p?.category, published: p?.published, date: p?.date, words });
