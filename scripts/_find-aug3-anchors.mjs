import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";
nextEnv.loadEnvConfig(process.cwd());
const sql = neon(process.env.DATABASE_URL);

const slugs = [
  "website-not-showing-on-google-fixes-2026",
  "best-ai-seo-tools-2026",
  "how-to-write-seo-friendly-blog-posts-2026",
  "best-ai-search-engines-2026",
  "how-to-build-topical-authority-for-a-new-blog-in-2026",
];

for (const s of slugs) {
  const [p] = await sql`SELECT content FROM posts WHERE slug = ${s}`;
  const c = p.content;
  console.log("=".repeat(25) + " " + s);
  const matches = [...c.matchAll(/AI Overviews|AI search|ChatGPT search|answer engine|generative/gi)];
  if (matches.length) {
    matches.slice(0, 3).forEach((m) =>
      console.log("..." + c.slice(Math.max(0, m.index - 300), m.index + 300).replace(/\n/g, " ¶ ") + "...\n")
    );
  } else {
    console.log("(no AI-search mentions) — final section:");
    console.log(c.slice(-500).replace(/\n/g, " ¶ "));
  }
  console.log();
}
