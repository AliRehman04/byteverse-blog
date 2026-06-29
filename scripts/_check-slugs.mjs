import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";

nextEnv.loadEnvConfig(process.cwd());
const sql = neon(process.env.DATABASE_URL);

const rows = await sql`SELECT id, slug FROM posts WHERE slug LIKE ${'%seo-checklist%'} OR slug LIKE ${'%search-console%'}`;
console.log(JSON.stringify(rows, null, 2));
