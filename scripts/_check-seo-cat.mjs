import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";
nextEnv.loadEnvConfig(process.cwd());
const sql = neon(process.env.DATABASE_URL);
const r = await sql`
  SELECT p.slug, c.slug AS cat FROM posts p JOIN categories c ON p.category_id = c.id
  WHERE p.slug IN (
    'low-competition-keywords-for-new-blogs-2026',
    'blog-seo-checklist-before-publishing-in-2026',
    'how-to-get-traffic-to-a-new-blog-2026',
    'free-seo-audit-website-2026-step-by-step'
  )`;
r.forEach(x => console.log(x.cat, '|', x.slug));
