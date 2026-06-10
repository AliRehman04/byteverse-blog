import { neon } from '@neondatabase/serverless';
import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd());
const sql = neon(process.env.DATABASE_URL);
const posts = await sql`SELECT id, slug, title, category_id FROM posts WHERE published = true ORDER BY id`;
posts.forEach(p => console.log(p.id + '|' + p.category_id + '|' + p.slug + '|' + p.title));
