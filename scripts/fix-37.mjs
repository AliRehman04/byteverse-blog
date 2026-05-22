import { neon } from "@neondatabase/serverless";
import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());
const sql = neon(process.env.DATABASE_URL);
const r = await sql`SELECT content FROM posts WHERE id = 37`;
const content = r[0].content;

const search = "## Final Thoughts";
const replace = `## What to Build Next\n\nCombine TypeScript with [Tailwind CSS 4](/blog/tailwind-css-4-guide-2026) for type-safe, beautifully styled apps. Then show off your TypeScript projects on a [professional portfolio website](/blog/build-portfolio-website-2026).\n\n## Final Thoughts`;

if (!content.includes(search)) { console.log("Search text not found"); process.exit(1); }
if (content.includes("## What to Build Next")) { console.log("Already has cross-links"); process.exit(0); }

const updated = content.replace(search, replace);
await sql`UPDATE posts SET content = ${updated} WHERE id = 37`;
console.log("✅ Post 37 (TypeScript) cross-links added");
