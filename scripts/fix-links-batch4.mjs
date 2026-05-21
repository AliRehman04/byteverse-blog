import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";

nextEnv.loadEnvConfig(process.cwd());
const sql = neon(process.env.DATABASE_URL);

const crossLinks = [
  {
    slug: "javascript-roadmap-2026-beginner-job-ready",
    find: "## Frequently Asked Questions",
    replace:
      '> **Next step**: Once you\'re comfortable with JavaScript, [learn TypeScript](/blog/typescript-for-beginners-2026-complete-guide) — it adds type safety and is required for most professional projects in 2026.\n\n## Frequently Asked Questions',
    linkCheck: "typescript-for-beginners-2026-complete-guide",
  },
  {
    slug: "react-19-best-practices-2026-faster-apps",
    find: "## Frequently Asked Questions",
    replace:
      'If you haven\'t already, [learn TypeScript basics](/blog/typescript-for-beginners-2026-complete-guide) — React and TypeScript together catch bugs before they reach production.\n\n## Frequently Asked Questions',
    linkCheck: "typescript-for-beginners-2026-complete-guide",
  },
  {
    slug: "docker-for-beginners-2026-guide",
    find: "## Frequently Asked Questions",
    replace:
      'Running Docker on Windows? Set up [WSL 2 first](/blog/linux-wsl-setup-guide-2026-windows-developers) — Docker Desktop uses it as the backend and performance is significantly better.\n\n## Frequently Asked Questions',
    linkCheck: "linux-wsl-setup-guide-2026-windows-developers",
  },
  {
    slug: "git-github-beginners-guide-2026",
    find: "## Frequently Asked Questions",
    replace:
      'If you\'re on Windows, consider [setting up WSL](/blog/linux-wsl-setup-guide-2026-windows-developers) for a proper terminal experience — Git commands feel more natural in a Linux environment.\n\n## Frequently Asked Questions',
    linkCheck: "linux-wsl-setup-guide-2026-windows-developers",
  },
  {
    slug: "best-ai-coding-assistants-2026-copilot-cursor-windsurf",
    find: "## Final recommendation",
    replace:
      'Want to know which hardware runs these AI tools best? Check our [best laptops for coding guide](/blog/best-laptops-for-coding-2026-developers) — we cover what specs actually matter.\n\n## Final recommendation',
    linkCheck: "best-laptops-for-coding-2026-developers",
  },
  {
    slug: "best-vscode-extensions-2026-web-developers",
    find: "## Frequently Asked Questions",
    replace:
      'Pair these extensions with [the right laptop](/blog/best-laptops-for-coding-2026-developers) and your development setup will be unstoppable.\n\n## Frequently Asked Questions',
    linkCheck: "best-laptops-for-coding-2026-developers",
  },
  {
    slug: "how-to-learn-programming-2026-beginner-roadmap",
    find: "## Frequently Asked Questions",
    replace:
      'Once you know JavaScript basics, [learn TypeScript](/blog/typescript-for-beginners-2026-complete-guide) — it\'s the natural next step and most companies require it in 2026.\n\n## Frequently Asked Questions',
    linkCheck: "typescript-for-beginners-2026-complete-guide",
  },
];

console.log("Adding cross-links from existing posts to Batch 4...\n");

for (const link of crossLinks) {
  try {
    const rows = await sql.query(
      "SELECT id, content FROM posts WHERE slug = $1",
      [link.slug]
    );
    if (!rows.length) {
      console.log(`  ⚠ Post not found: ${link.slug}`);
      continue;
    }
    const post = rows[0];

    if (post.content.includes(link.linkCheck)) {
      console.log(`  ⏭ Link already exists in: ${link.slug}`);
      continue;
    }

    if (!post.content.includes(link.find)) {
      console.log(`  ⚠ Pattern "${link.find}" not found in: ${link.slug}`);
      continue;
    }

    const updatedContent = post.content.replace(link.find, link.replace);
    await sql.query(
      "UPDATE posts SET content = $1, updated_at = NOW() WHERE id = $2",
      [updatedContent, post.id]
    );
    console.log(`  ✅ Cross-link added to: ${link.slug}`);
  } catch (err) {
    console.log(`  ❌ Error on ${link.slug}: ${err.message}`);
  }
}

console.log("\n=== All cross-links processed! ===");
