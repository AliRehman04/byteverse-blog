import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";

nextEnv.loadEnvConfig(process.cwd());
const sql = neon(process.env.DATABASE_URL);

const rows = await sql`SELECT slug FROM posts WHERE slug LIKE ANY(ARRAY[
  '%research-tools%','%prompt-engineering%','%tools-for-students%',
  '%tech-blog%','%chatgpt-alternatives%','%gemini%',
  '%coding-assistants%','%free-ai-tools%'
])`;
rows.forEach(r => console.log(r.slug));
