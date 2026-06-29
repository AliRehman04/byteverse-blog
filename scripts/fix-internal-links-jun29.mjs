import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";

nextEnv.loadEnvConfig(process.cwd());

const sql = neon(process.env.DATABASE_URL);

/**
 * Fix broken internal links in published blog posts.
 * 
 * Two slug mismatches found via Google Search Console:
 * 1. blog-seo-checklist-before-publishing-in-2026 → blog-seo-checklist-before-publishing-2026
 * 2. google-search-console-for-new-blogs-2026-beginner-guide → google-search-console-new-blogs-2026
 */

const replacements = [
  // Fix slug: blog-seo-checklist (wrong has extra "in-")
  {
    from: "/blog/blog-seo-checklist-before-publishing-in-2026",
    to: "/blog/blog-seo-checklist-before-publishing-2026",
  },
  // Fix slug: google-search-console (wrong has "for-" and "-beginner-guide")
  {
    from: "/blog/google-search-console-for-new-blogs-2026-beginner-guide",
    to: "/blog/google-search-console-new-blogs-2026",
  },
  // Also fix full-URL variants with old domain
  {
    from: "https://byteverse.blog/blog/blog-seo-checklist-before-publishing-in-2026",
    to: "/blog/blog-seo-checklist-before-publishing-2026",
  },
  {
    from: "https://byteverse.blog/blog/google-search-console-for-new-blogs-2026-beginner-guide",
    to: "/blog/google-search-console-new-blogs-2026",
  },
  // Full-URL variants with current domain
  {
    from: "https://www.byteverse.fyi/blog/blog-seo-checklist-before-publishing-in-2026",
    to: "/blog/blog-seo-checklist-before-publishing-2026",
  },
  {
    from: "https://www.byteverse.fyi/blog/google-search-console-for-new-blogs-2026-beginner-guide",
    to: "/blog/google-search-console-new-blogs-2026",
  },
];

async function main() {
  let totalFixed = 0;

  for (const { from, to } of replacements) {
    // Find posts containing the broken link
    const affected = await sql`
      SELECT id, slug FROM posts
      WHERE content LIKE ${"%" + from + "%"}
    `;

    if (affected.length === 0) {
      console.log(`✓ No posts contain "${from}" — already clean.`);
      continue;
    }

    console.log(`\nFixing "${from}" → "${to}"`);
    console.log(`  Affected posts (${affected.length}):`);
    for (const row of affected) {
      console.log(`    - [${row.id}] ${row.slug}`);
    }

    // Replace in content
    const result = await sql`
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
