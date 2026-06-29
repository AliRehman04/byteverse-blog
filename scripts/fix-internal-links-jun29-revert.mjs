import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";

nextEnv.loadEnvConfig(process.cwd());
const sql = neon(process.env.DATABASE_URL);

/**
 * REVERSE the incorrect link replacements made by fix-internal-links-jun29.mjs.
 * The DB slugs ARE the "long" versions — restore them.
 */
const reversals = [
  {
    from: "/blog/blog-seo-checklist-before-publishing-2026",
    to: "/blog/blog-seo-checklist-before-publishing-in-2026",
  },
  {
    from: "/blog/google-search-console-new-blogs-2026",
    to: "/blog/google-search-console-for-new-blogs-2026-beginner-guide",
  },
];

async function main() {
  let totalFixed = 0;

  for (const { from, to } of reversals) {
    const affected = await sql`
      SELECT id, slug FROM posts
      WHERE content LIKE ${"%" + from + "%"}
    `;

    if (affected.length === 0) {
      console.log(`✓ No posts contain "${from}" — already clean.`);
      continue;
    }

    console.log(`\nReverting "${from}" → "${to}"`);
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

    console.log(`  ✓ Reverted ${affected.length} post(s)`);
    totalFixed += affected.length;
  }

  console.log(`\nDone. Reverted internal links in ${totalFixed} post(s).`);
}

main().catch((err) => { console.error(err); process.exit(1); });
