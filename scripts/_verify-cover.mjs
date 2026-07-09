import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";
nextEnv.loadEnvConfig(process.cwd());
const sql = neon(process.env.DATABASE_URL);

const [r] = await sql`SELECT slug, cover_image, content FROM posts WHERE slug = 'how-to-build-website-with-ai-2026'`;
console.log("cover_image:", r.cover_image);
const firstImg = r.content.match(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/);
console.log("hero alt:", firstImg?.[1]);
console.log("hero url:", firstImg?.[2]);
console.log("hero title:", firstImg?.[3]);
const totalImgs = [...r.content.matchAll(/!\[/g)].length;
console.log("total inline images:", totalImgs);
