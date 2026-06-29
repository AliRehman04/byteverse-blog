import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";

nextEnv.loadEnvConfig(process.cwd());
const sql = neon(process.env.DATABASE_URL);

// Remaining 12 unresolved links → correct slugs
const fixMap = {
  "https://byteverse.blog/blog/best-ai-research-tools-2026": "/blog/best-ai-research-tools-in-2026-ranked-by-workflow",
  "https://byteverse.blog/blog/prompt-engineering-guide-2026": "/blog/prompt-engineering-guide-2026-write-better-ai-prompts",
  "https://byteverse.blog/blog/best-ai-tools-for-students-2026": "/blog/best-ai-tools-for-students-2026-free-study-apps",
  "https://byteverse.blog/blog/how-to-start-a-tech-blog-2026": "/blog/how-to-start-a-tech-blog-2026-seo-checklist",
  "https://byteverse.blog/blog/best-chatgpt-alternatives-2026": "/blog/best-chatgpt-alternatives-2026-free-paid",
  "https://byteverse.blog/blog/perplexity-vs-google-gemini-2026-comparison": "/blog/perplexity-vs-google-gemini-2026-research",
  "https://byteverse.blog/blog/best-ai-coding-assistants-2026": "/blog/best-ai-coding-assistants-2026-copilot-cursor-windsurf",
  "https://byteverse.blog/blog/10-best-free-ai-tools-2026": "/blog/10-best-free-ai-tools-in-2026-that-will-blow-your-mind",
};

async function main() {
  const affectedSlugs = ["best-ai-tools-for-teachers-2026", "best-ai-chatbots-2026"];
  const posts = await sql`SELECT id, slug, content FROM posts WHERE slug = ANY(${affectedSlugs})`;

  let totalFixed = 0;
  for (const post of posts) {
    let content = post.content;
    let count = 0;
    for (const [from, to] of Object.entries(fixMap)) {
      if (content.includes(from)) {
        content = content.split(from).join(to);
        count++;
      }
    }
    if (count > 0) {
      await sql`UPDATE posts SET content = ${content}, updated_at = NOW() WHERE id = ${post.id}`;
      console.log(`✅ ${post.slug} — fixed ${count} remaining links`);
      totalFixed += count;
    }
  }
  console.log(`\nDone. Fixed ${totalFixed} remaining links.`);
}

main().catch((err) => { console.error(err); process.exit(1); });
