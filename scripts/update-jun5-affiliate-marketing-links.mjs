import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";

nextEnv.loadEnvConfig(process.cwd());

const sql = neon(process.env.DATABASE_URL);

const slug = "affiliate-marketing-for-beginners-2026";

const replacements = [
  {
    from:
      "If you are running a content site similar to ByteVerse, you should also create useful free tools. Tools bring backlinks, repeat visits, and extra opportunities for internal linking.",
    to:
      "If you are running a content site similar to ByteVerse, you should also create useful free tools. Tools bring backlinks, repeat visits, and extra opportunities for internal linking. If you are still setting up the site itself, start with a practical launch guide like [How to Start a Tech Blog in 2026](https://www.byteverse.fyi/blog/how-to-start-a-tech-blog-2026-seo-checklist).",
  },
  {
    from: "- Best AI Writing Tools for Bloggers\n- Best Resume Builders for Students",
    to:
      "- [Best AI Writing Tools for Bloggers](https://www.byteverse.fyi/blog/best-ai-writing-tools-2026)\n- [Best Resume Builders for Students](https://www.byteverse.fyi/blog/best-ai-resume-builders-2026)",
  },
  {
    from:
      "Comparison keywords often convert extremely well.",
    to:
      "Comparison keywords often convert extremely well.\n\nIf you cover SEO-heavy software, a roundup like [Best AI SEO Tools in 2026](https://www.byteverse.fyi/blog/best-ai-seo-tools-2026) gives you a strong internal page to support future review and comparison posts.",
  },
  {
    from:
      "These can convert if the tool recommendation naturally helps complete the task.",
    to:
      "These can convert if the tool recommendation naturally helps complete the task. Supporting tutorials such as [SEO Meta Tags Generator Guide 2026](https://www.byteverse.fyi/blog/seo-meta-tags-generator-guide-2026) can also help you build topical depth around commercial keywords.",
  },
  {
    from:
      "- conversion-focused tools",
    to:
      "- conversion-focused tools\n\nFor example, on ByteVerse this article could naturally link to [How to Start a Tech Blog in 2026](https://www.byteverse.fyi/blog/how-to-start-a-tech-blog-2026-seo-checklist), [Best AI Writing Tools in 2026](https://www.byteverse.fyi/blog/best-ai-writing-tools-2026), and [Best AI SEO Tools in 2026](https://www.byteverse.fyi/blog/best-ai-seo-tools-2026) without forcing the reader away from the main topic.",
  },
];

async function main() {
  const rows = await sql`SELECT content FROM posts WHERE slug = ${slug} LIMIT 1`;
  if (!rows.length) {
    throw new Error(`Post not found: ${slug}`);
  }

  let content = rows[0].content;

  for (const replacement of replacements) {
    if (!content.includes(replacement.from)) {
      throw new Error(`Expected text not found: ${replacement.from.slice(0, 80)}...`);
    }
    content = content.replace(replacement.from, replacement.to);
  }

  await sql`UPDATE posts SET content = ${content}, updated_at = NOW() WHERE slug = ${slug}`;
  console.log("Updated internal links for affiliate marketing post.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});