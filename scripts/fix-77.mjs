import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";
nextEnv.loadEnvConfig(process.cwd());
const sql = neon(process.env.DATABASE_URL);

const rows = await sql`select id, title, content from posts where id = 77`;
const post = rows[0];
const slug = "best-ai-customer-service-chatbots-2026";
if (post.content.includes(slug)) {
  console.log("Already has link");
  process.exit(0);
}
const lastBullet = "- [Best AI Agent Builders](/blog/best-ai-agent-builders-2026)";
const newLink = `[Best AI Customer Service Chatbots](/blog/${slug})`;
const newContent = post.content.replace(lastBullet, lastBullet + "\n- " + newLink);
await sql`update posts set content = ${newContent}, updated_at = now() where id = 77`;
console.log("✅ [77] Added link to /" + slug);
