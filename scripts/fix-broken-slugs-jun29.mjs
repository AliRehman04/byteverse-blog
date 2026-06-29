import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";

nextEnv.loadEnvConfig(process.cwd());
const sql = neon(process.env.DATABASE_URL);

/**
 * Fix internal links pointing to non-existent short slugs.
 * Map each short slug to the actual DB slug.
 */
const replacements = [
  {
    from: "/blog/90-day-blog-content-plan-new-websites-2026",
    to: "/blog/90-day-blog-content-plan-for-new-websites-in-2026",
  },
  {
    from: "/blog/best-ai-photo-editors-2026",
    to: "/blog/9-best-ai-photo-editors-in-2026-free-and-paid",
  },
  {
    from: "/blog/best-ai-social-media-tools-2026",
    to: "/blog/9-best-ai-social-media-tools-in-2026-tested",
  },
  {
    from: "/blog/blog-post-ideas-new-bloggers-2026",
    to: "/blog/50-blog-post-ideas-for-new-bloggers-in-2026",
  },
  {
    from: "/blog/blog-seo-checklist-before-publishing-2026",
    to: "/blog/blog-seo-checklist-before-publishing-in-2026",
  },
  {
    from: "/blog/build-topical-authority-new-blog-2026",
    to: "/blog/how-to-build-topical-authority-for-a-new-blog-in-2026",
  },
  {
    from: "/blog/google-search-console-new-blogs-2026",
    to: "/blog/google-search-console-for-new-blogs-2026-beginner-guide",
  },
];

async function main() {
  let totalFixed = 0;

  for (const { from, to } of replacements) {
    const affected = await sql`
      SELECT id, slug FROM posts
      WHERE content LIKE ${"%" + from + "%"}
    `;

    if (affected.length === 0) {
      console.log(`✓ No posts contain "${from}" — already clean.`);
      continue;
    }

    console.log(`\nFixing "${from}"\n    → "${to}"`);
    console.log(`  Affected posts (${affected.length}):`);
    for (const row of affected) {
      console.log(`    - [${row.id}] ${row.slug}`);
    }

    await sql`
      UPDATE posts
      SET content = REPLACE(content, ${from}, ${to}),
          updated_at = NOW()
      WHERE content LIKE ${"%" + from + "%"}
    `;

    console.log(`  ✓ Updated ${affected.length} post(s)`);
    totalFixed += affected.length;
  }

  console.log(`\nDone. Fixed internal links in ${totalFixed} post(s).`);
}

main().catch((err) => { console.error(err); process.exit(1); });
